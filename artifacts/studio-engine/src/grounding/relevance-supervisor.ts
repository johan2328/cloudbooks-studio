import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { getOutline, getSkill } from "../skills/ai-200-outline.js";
import { listSources } from "./source-store.js";
import type { AuthoredPage, RelevanceResult, RelevanceStatus, Source } from "../types.js";

/**
 * AGENTE SUPERVISOR DE RELEVANCIA / COBERTURA (nuevo).
 *
 * DISTINTO del verificador de fidelidad: NO juzga si las afirmaciones son
 * verdaderas (eso lo hace verify-grounding). Juzga (a) si las FUENTES cubren el
 * alcance del skill y (b) si el CONTENIDO es relevante, específico y completo
 * para el examen (no genérico/tangencial). Una página puede ser 100% fiel a sus
 * fuentes y aún así pobre o incompleta — eso es lo que este agente atrapa.
 * gpt-4o-mini (barato). Advisory: el gate de bloqueo vive en premium-verdict.
 */

function domainLabelFor(skillId: string): string {
  for (const d of getOutline().domains) if (d.skills.some((s) => s.id === skillId)) return d.label;
  return "";
}
function clamp10(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(10, Math.round(v * 10) / 10)) : 0;
}

export async function superviseRelevance(
  skillId: string,
  authored: AuthoredPage,
  sources?: Source[],
): Promise<RelevanceResult> {
  const skill = getSkill(skillId);
  const base = (extra: Partial<RelevanceResult>): RelevanceResult => ({
    outcome: "failed", model: null, skillId, relevanceStatus: "thin", score: 0,
    coverageScore: 0, contentScore: 0, gaps: [], note: "", error: null, ...extra,
  });
  if (!skill) return base({ error: `skill_desconocida:${skillId}` });
  const d = authored?.draft;
  if (!d) return base({ outcome: "no_draft", relevanceStatus: "thin", note: "Sin borrador para evaluar relevancia." });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });
  const openai = getOpenAI();
  if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
  if (wouldExceedCap(0.01)) return base({ outcome: "failed", model: CONFIG.qaModel, error: "Tope mensual de costo alcanzado." });

  const srcs = (sources ?? listSources()).slice(0, 8);
  const srcBlock = srcs.map((s) => `- ${s.title}${s.url ? ` (${s.url})` : ""}: ${(s.text ?? "").slice(0, 400)}`).join("\n");
  const draftBlock =
`Título: ${d.title}
Subtítulo: ${d.subtitle}
Contexto: ${d.context}
Pregunta guía: ${d.guideQuestion}
Módulos:
${d.visualModules.map((m) => `- ${m.title}: ${m.description}`).join("\n")}`;

  const sys =
    "Sos un editor de COBERTURA y RELEVANCIA para libros de certificación cloud. " +
    "NO juzgás si las afirmaciones son verdaderas (de eso se encarga otro agente, el verificador de fidelidad). " +
    "Juzgás SOLO dos cosas: (a) ¿las FUENTES recolectadas cubren el alcance del skill?; " +
    "(b) ¿el CONTENIDO redactado es relevante, específico y completo para el examen, o genérico/tangencial/incompleto? Respondés SOLO JSON.";
  const user =
`Skill: ${skill.title} (${skillId})
Objetivos del skill: ${skill.objectives.join("; ")}
Dominio: ${domainLabelFor(skillId)}

FUENTES RECOLECTADAS (${srcs.length}):
${srcBlock || "(ninguna)"}

CONTENIDO REDACTADO:
${draftBlock}

Devolvé EXACTAMENTE: {"coverageScore":0-10,"contentScore":0-10,"relevanceStatus":"sufficient|thin|off_topic","gaps":["qué falta o sobra"],"note":"1-2 frases"}
Criterio: sufficient = cubre bien el skill y el contenido es específico; thin = le faltan aspectos o es genérico; off_topic = no corresponde al skill.`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.qaModel,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" }, temperature: 0.1, max_tokens: 700,
    });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: skillId, label: "relevance-supervise" });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as any;
    const coverageScore = clamp10(raw.coverageScore);
    const contentScore = clamp10(raw.contentScore);
    const score = Math.round(((coverageScore + contentScore) / 2) * 10) / 10;
    const declared = raw.relevanceStatus;
    const relevanceStatus: RelevanceStatus =
      declared === "sufficient" ? "sufficient"
      : declared === "off_topic" ? "off_topic"
      : declared === "thin" ? "thin"
      : coverageScore >= 7 && contentScore >= 7 ? "sufficient"
      : coverageScore < 4 || contentScore < 4 ? "off_topic"
      : "thin";
    const gaps = Array.isArray(raw.gaps) ? raw.gaps.map(String).slice(0, 6) : [];
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return base({ outcome: "real", model: CONFIG.qaModel, relevanceStatus, score, coverageScore, contentScore, gaps, note: String(raw.note ?? "") });
  } catch (err) {
    return base({ outcome: "failed", model: CONFIG.qaModel, error: String((err as Error)?.message ?? err) });
  }
}
