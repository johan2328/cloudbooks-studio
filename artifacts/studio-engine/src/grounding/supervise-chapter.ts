import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import type { ChapterSeed, RelevanceResult } from "../types.js";

/**
 * SUPERVISOR del Master Book (extiende el de relevancia del Atlas). Además de
 * cobertura/pertinencia del relato, juzga la ALINEACIÓN PSICOMÉTRICA: ¿el capítulo
 * construye el razonamiento que el examen evalúa (el PsychoProfile)? Advisory —
 * no bloquea; alimenta la dimensión psicométrica del cockpit de QA.
 */
export async function superviseChapter(seed: ChapterSeed): Promise<RelevanceResult> {
  const base = (extra: Partial<RelevanceResult>): RelevanceResult => ({
    outcome: "failed", model: null, skillId: seed.chapterId, relevanceStatus: "thin", score: 0,
    coverageScore: 0, contentScore: 0, gaps: [], note: "", psychoAlignment: 0, psychoGaps: [], error: null, ...extra,
  });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });
  const openai = getOpenAI();
  if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
  if (wouldExceedCap(0.02)) return base({ outcome: "failed", model: CONFIG.qaModel, error: "Tope mensual de costo alcanzado." });

  const outline = seed.sections.map((s) => `## ${s.heading}\n${s.prose.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)}`).join("\n").slice(0, 6000);
  const p = seed.psychometrics;
  const sys = "Sos supervisor editorial de un libro DOCUMENTAL de certificación cloud. NO reescribís: juzgás (a) cobertura/pertinencia del relato y (b) ALINEACIÓN con el perfil psicométrico (¿el relato construye el razonamiento que el examen evalúa?). Respondés SOLO JSON.";
  const user = `Capítulo: ${seed.title} (${seed.domainLabel}).
PERFIL PSICOMÉTRICO: verbos=${p.measuredVerbs.join(", ") || "—"}; arquetipos=${p.questionArchetypes.join(", ") || "—"}; razonamiento=${p.reasoningGoal || "—"}
RELATO (headings + extracto):
${outline}

Devolvé EXACTAMENTE: {"coverageScore":0-10,"contentScore":0-10,"psychoAlignment":0-10,"gaps":["hueco de cobertura"],"psychoGaps":["desalineación con lo que evalúa el examen"],"note":"1 frase"}`;
  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.qaModel, messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" }, temperature: 0.2, max_tokens: 700,
    });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: seed.chapterId, label: "supervise-chapter" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const num = (v: unknown): number => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(10, n)) : 0; };
    const arr = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
    const coverageScore = num(raw.coverageScore), contentScore = num(raw.contentScore), psychoAlignment = num(raw.psychoAlignment);
    const score = Math.round(((coverageScore + contentScore) / 2) * 10) / 10;
    const relevanceStatus: RelevanceResult["relevanceStatus"] = score >= 7 && psychoAlignment >= 6 ? "sufficient" : score >= 4 ? "thin" : "off_topic";
    return { outcome: "real", model: CONFIG.qaModel, skillId: seed.chapterId, relevanceStatus, score, coverageScore, contentScore, gaps: arr(raw.gaps), note: String(raw.note ?? ""), psychoAlignment, psychoGaps: arr(raw.psychoGaps), error: null };
  } catch (err) {
    return base({ outcome: "failed", model: CONFIG.qaModel, error: String((err as Error)?.message ?? err) });
  }
}
