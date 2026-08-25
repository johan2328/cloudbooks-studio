import { getOutline } from "../skills/ai-200-outline.js";
import { ensureDomainSources } from "../skills/skill-sources.js";
import { searchSkillSources } from "./search-sources.js";
import { authorSkill } from "./author-page.js";
import { verifyGrounding } from "./verify-grounding.js";
import { superviseRelevance } from "./relevance-supervisor.js";
import { saveRelevance } from "./relevance-store.js";
import { persistAuthored } from "./persist-page.js";
import { costStatus } from "../cost.js";
import type { GroundDomainResult, GroundSkillResult } from "../types.js";

/**
 * ORQUESTADOR POR DOMINIO (4 agentes). Resuelve las skills del dominio desde el
 * outline y corre cada una por el pipeline EN SU PROPIO CONTEXTO ACOTADO (nunca
 * carga todas las skills/páginas en una ventana):
 *
 *   Buscador → Autor → Verificador (fidelidad) → Supervisor (relevancia) → (Persistir)
 *
 * El Buscador corre PRIMERO y asienta el corpus → el Autor (cacheado por
 * corpusHash) y el re-autor interno de persistAuthored pegan cache: sin doble
 * gasto. Secuencial por skill: costo predecible y cap-aware. Escala a d2–d5 sin
 * cambios (las URLs propuestas+validadas cubren los dominios aún no curados).
 */
export async function groundDomain(
  domainId: string,
  opts: { persist?: boolean; skillIds?: string[]; allowMsLearnSearch?: boolean } = {},
): Promise<GroundDomainResult> {
  const domain = getOutline().domains.find((d) => d.id === domainId);
  if (!domain) throw new Error(`dominio_desconocido:${domainId}`);
  const persist = opts.persist !== false;
  let skills = domain.skills;
  if (opts.skillIds && opts.skillIds.length) skills = skills.filter((s) => opts.skillIds!.includes(s.id));

  const spentBeforeUsd = costStatus().spentUsd;
  const results: GroundSkillResult[] = [];

  // Pre-poblar el corpus con las canónicas de TODO el dominio antes de autorar:
  // así el filtro por módulo del autor siempre tiene los hermanos del módulo
  // (evita la fuga al corpus global / contaminación cruzada de servicios).
  await ensureDomainSources(domainId);

  for (const skill of skills) {
    const r: GroundSkillResult = {
      skillId: skill.id, skillTitle: skill.title,
      search: null, author: null, grounding: null, relevance: null,
      pageId: null, persisted: false, step: "search", error: null,
    };
    try {
      // 1) BUSCADOR — descubre + valida + ingiere fuentes (asienta el corpus primero).
      const search = await searchSkillSources(skill.id, { allowMsLearnSearch: opts.allowMsLearnSearch });
      r.search = { ingested: search.ingested.length, found: search.found.length, rejected: search.rejected.length, coverageNote: search.coverageNote };

      // 2) AUTOR — redacta anclado al corpus ya asentado (cacheado si no cambió).
      r.step = "author";
      const authored = await authorSkill(skill.id);
      r.author = { outcome: authored.outcome, citedClaims: authored.citedClaims, modelClaims: authored.modelClaims, cached: authored.cached };
      if (authored.outcome !== "real" || !authored.draft) {
        r.error = authored.error ?? "el autor no produjo borrador";
        results.push(r); continue;
      }

      // 3) VERIFICADOR DE FIDELIDAD — ¿cada afirmación citada y respaldada?
      r.step = "verify";
      const grounding = await verifyGrounding(authored);
      r.grounding = { status: grounding.groundingStatus, score: grounding.score, blocked: grounding.blocked, reason: grounding.reason };

      // 4) SUPERVISOR DE RELEVANCIA — ¿suficiente y pertinente? (distinto de fidelidad)
      r.step = "supervise";
      const rel = await superviseRelevance(skill.id, authored);
      saveRelevance(skill.id, rel);
      r.relevance = { status: rel.relevanceStatus, score: rel.score, gaps: rel.gaps };

      // 5) POBLAR CONTENIDO — persistAuthored re-corre autor (cacheado) + verify y crea la página.
      if (persist) {
        r.step = "persist";
        const p = await persistAuthored(skill.id);
        r.pageId = p.pageId;
        r.persisted = p.ok;
        if (!p.ok && !r.error) r.error = p.error ?? (p.blocked ? p.reason : null);
      }
      r.step = "done";
    } catch (err) {
      r.error = String((err as Error)?.message ?? err);
    }
    results.push(r);
  }

  const spentAfterUsd = costStatus().spentUsd;
  const count = (pred: (r: GroundSkillResult) => boolean) => results.filter(pred).length;
  return {
    domainId, domainLabel: domain.label, total: results.length,
    searched: count((r) => (r.search?.found ?? 0) > 0),
    authored: count((r) => r.author?.outcome === "real"),
    verified: count((r) => r.grounding?.status === "verified"),
    relevant: count((r) => r.relevance?.status === "sufficient"),
    persisted: count((r) => r.persisted),
    blocked: count((r) => r.grounding?.blocked === true),
    failed: count((r) => !!r.error),
    spentBeforeUsd, spentAfterUsd, skills: results,
  };
}
