import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getOutline, getSkill } from "../skills/ai-200-outline.js";
import { curatedSourcesFor } from "../skills/skill-sources.js";
import { ingestUrl } from "./ingest.js";
import { listSources, getSource, removeSource } from "./source-store.js";
import type { SearchResult, SourceCandidate } from "../types.js";

/**
 * AGENTE BUSCADOR (Searcher) — la pieza que faltaba en el grounding.
 *
 * Recuperación HÍBRIDA con validación REAL: junta candidatas de 3 orígenes
 * (curadas de alta confianza + URLs oficiales propuestas por LLM + opcional MS
 * Learn search), las pasa a TODAS por fetch real (`ingestUrl` descarta 404/vacías)
 * y por un paso LLM que lee el texto y CONFIRMA relevancia. Nada entra al corpus
 * sin fetch OK + relevante. Robusto: degrada con gracia (si la propuesta LLM o la
 * confirmación fallan, las curadas igual entran; si una URL inventada 404ea, se
 * descarta en el fetch). gpt-4o-mini (barato). Serializado por skill.
 *
 * MS Learn search: no hay API pública robusta → off por default; cuando exista,
 * entra como tercer origen "mslearn-search" sin cambios aguas abajo (mismo gate).
 */

function domainLabelFor(skillId: string): string {
  for (const d of getOutline().domains) if (d.skills.some((s) => s.id === skillId)) return d.label;
  return "";
}

export async function searchSkillSources(
  skillId: string,
  opts: { maxCandidates?: number; allowMsLearnSearch?: boolean } = {},
): Promise<SearchResult> {
  const skill = getSkill(skillId);
  const base = (extra: Partial<SearchResult>): SearchResult => ({
    outcome: "failed", skillId, skillTitle: skill?.title ?? skillId, queryTerms: [],
    candidates: [], found: [], ingested: [], rejected: [], coverageNote: "", error: null, ...extra,
  });
  if (!skill) return base({ error: `skill_desconocida:${skillId}` });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });

  // Serializa por skill: dos búsquedas de la misma skill no se pisan el corpus.
  return withLock(`search:${skillId}`, async (): Promise<SearchResult> => {
    const openai = getOpenAI();
    if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });

    const domainLabel = domainLabelFor(skillId);
    const norm = (u: string) => u.trim().replace(/\/+$/, "");
    const isLearn = (u: string) => /^https?:\/\/learn\.microsoft\.com\//i.test(u);

    // ── 1) Candidatas CURADAS (alta confianza) ──
    const candMap = new Map<string, SourceCandidate>();
    for (const u of curatedSourcesFor(skillId)) {
      candMap.set(norm(u), { url: u, origin: "curated", fetched: false, relevant: null, sourceId: null, title: null, reason: "" });
    }

    // ── 2) URLs propuestas por LLM (+ query terms) ──
    let queryTerms: string[] = [];
    if (!wouldExceedCap(0.01)) {
      try {
        const sys =
          "Sos un bibliotecario técnico de Microsoft Learn. Para un skill de certificación cloud, proponés URLs de documentación OFICIAL de learn.microsoft.com (en-us) que cubran el tema. " +
          "SOLO páginas de documentación reales y específicas (no páginas de búsqueda, no marketing, no blogs). Respondés SOLO JSON.";
        const user =
`Skill: ${skill.title} (${skillId})
Objetivos: ${skill.objectives.join("; ")}
Dominio: ${domainLabel}

Devolvé EXACTAMENTE: {"queryTerms":["..."],"urls":["https://learn.microsoft.com/en-us/..."]}
Reglas: 4-8 URLs candidatas de learn.microsoft.com/en-us, lo más específicas al skill; queryTerms = 2-4 términos de búsqueda.`;
        const res = await openai.chat.completions.create({
          model: CONFIG.qaModel,
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 500,
        });
        recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: skillId, label: "search-query" });
        const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { queryTerms?: string[]; urls?: string[] };
        queryTerms = Array.isArray(raw.queryTerms) ? raw.queryTerms.map(String).slice(0, 4) : [];
        for (const u of (raw.urls ?? []).map(String)) {
          if (!isLearn(u)) continue;             // robustez: solo dominio oficial
          const k = norm(u);
          if (!candMap.has(k)) candMap.set(k, { url: u, origin: "llm", fetched: false, relevant: null, sourceId: null, title: null, reason: "" });
        }
      } catch { /* propuesta opcional: si falla, seguimos con las curadas */ }
    }

    // ── 3) (opcional) MS Learn search — sin API pública robusta: off por default ──
    void opts.allowMsLearnSearch;

    const max = opts.maxCandidates ?? 10;
    const candidates = Array.from(candMap.values()).slice(0, max);
    if (candidates.length === 0) return base({ outcome: "no_candidates", queryTerms, coverageNote: "Sin candidatas para esta skill." });

    // ── 4) Fetch-valida cada candidata (reusa si ya está en el corpus) ──
    const have = new Map(listSources().map((s) => [norm(s.url ?? ""), s] as const));
    const freshlyIngested: SourceCandidate[] = [];   // las que ESTE run trajo al corpus
    for (const c of candidates) {
      const existing = have.get(norm(c.url));
      if (existing) { c.fetched = true; c.sourceId = existing.id; c.title = existing.title; c.reason = "ya en el corpus"; continue; }
      const r = await ingestUrl(c.url, "mslearn");
      if (r.ok) { c.fetched = true; c.sourceId = r.source.id; c.title = r.source.title; c.reason = "fetch OK"; freshlyIngested.push(c); }
      else { c.fetched = false; c.reason = `descartada: ${r.error}`; }
    }

    const found = candidates.filter((c) => c.fetched);
    if (found.length === 0) {
      return base({ outcome: "real", queryTerms, candidates, rejected: candidates.filter((c) => !c.fetched), coverageNote: "Ninguna candidata fetcheó OK." });
    }

    // ── 5) Confirma RELEVANCIA (1 call) sobre las fetcheadas ──
    if (!wouldExceedCap(0.01)) {
      try {
        const docs = found.map((c) => {
          const src = c.sourceId ? getSource(c.sourceId) : null;
          return { id: c.sourceId ?? c.url, title: c.title ?? "", snippet: (src?.text ?? "").slice(0, 1500) };
        });
        const sys =
          "Sos un curador de fuentes para certificación cloud. Para un skill, decidís si cada documento es RELEVANTE para cubrirlo " +
          "(específico al tema, no tangencial ni genérico). Respondés SOLO JSON.";
        const user =
`Skill: ${skill.title}
Objetivos: ${skill.objectives.join("; ")}

DOCUMENTOS:
${docs.map((d, i) => `${i + 1}. (id ${d.id}) ${d.title}\n${d.snippet}`).join("\n---\n")}

Devolvé EXACTAMENTE: {"verdicts":[{"id":"<id>","relevant":true,"reason":"1 frase"}]}`;
        const res = await openai.chat.completions.create({
          model: CONFIG.qaModel,
          messages: [{ role: "system", content: sys }, { role: "user", content: user }],
          response_format: { type: "json_object" }, temperature: 0.1, max_tokens: 600,
        });
        recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: skillId, label: "search-relevance" });
        const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { verdicts?: { id?: string; relevant?: boolean; reason?: string }[] };
        const byId = new Map((raw.verdicts ?? []).map((v) => [String(v.id), v] as const));
        for (const c of found) {
          const v = byId.get(c.sourceId ?? c.url);
          c.relevant = v ? v.relevant !== false : true;   // sin veredicto → conservador: relevante
          if (v?.reason) c.reason = String(v.reason);
        }
      } catch { for (const c of found) c.relevant = true; }   // si falla la confirmación, no descartamos
    } else {
      for (const c of found) c.relevant = true;
    }

    // ── 6) Descarta off-topic SOLO de lo que ESTE run ingirió (no tocamos fuentes previas/humanas) ──
    for (const c of freshlyIngested) {
      if (c.relevant === false && c.sourceId) { removeSource(c.sourceId); c.reason = `off-topic: ${c.reason}`; }
    }
    const ingested = found.filter((c) => c.relevant !== false);
    const rejected = candidates.filter((c) => !c.fetched || c.relevant === false);
    const coverageNote = `${ingested.length}/${candidates.length} fuentes confirmadas relevantes`;
    return base({ outcome: "real", queryTerms, candidates, found, ingested, rejected, coverageNote });
  });
}
