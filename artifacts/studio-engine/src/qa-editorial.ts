import { CONFIG } from "./config.js";
import { getOpenAI, hasOpenAIKey } from "./openai-client.js";
import { recordTextSpend, wouldExceedCap } from "./cost.js";
import { getProvenance } from "./page-store.js";
import { listSources } from "./grounding/source-store.js";
import type { EditorialQa, EditorialScores, PageSeed } from "./types.js";

function clamp10(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v * 10) / 10));
}

function normalizeScores(raw: Record<string, unknown>): EditorialScores {
  const s = (raw?.["scores"] ?? {}) as Record<string, unknown>;
  return {
    claridad: clamp10(s["claridad"]),
    fidelidadExamen: clamp10(s["fidelidadExamen"]),
    coherencia: clamp10(s["coherencia"]),
    autocheckCorrecto: clamp10(s["autocheckCorrecto"]),
    trampasValidas: clamp10(s["trampasValidas"]),
  };
}

/**
 * QA EDITORIAL: un revisor LLM (gpt-4o-mini) puntúa la página contra criterios
 * editoriales y de fidelidad de examen, devolviendo JSON estructurado con
 * dimensiones, veredicto y hallazgos accionables. Texto: costo despreciable.
 * Graceful: sin llave → outcome no_key (no rompe el flujo).
 */
/** Contexto de grounding opcional: fuentes del corpus para chequear técnica. */
export interface EditorialContext {
  sources: { id: string; title: string; text: string }[];
}

/** Arma el contexto editorial (fuentes ligadas a la página) desde la procedencia. */
export function buildEditorialContext(pageId: string): EditorialContext | undefined {
  const prov = getProvenance(pageId);
  if (!prov || prov.sourceIds.length === 0) return undefined;
  const byId = new Map(listSources().map((s) => [s.id, s] as const));
  const sources = prov.sourceIds
    .map((id) => byId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s && !!s.text)
    .map((s) => ({ id: s.id, title: s.title, text: s.text ?? "" }));
  return sources.length ? { sources } : undefined;
}

export async function editorialQa(seed: PageSeed, ctx?: EditorialContext): Promise<EditorialQa> {
  if (!hasOpenAIKey()) {
    return { outcome: "no_key", model: null, scores: null, overall: null, verdict: null, findings: [], summary: "Sin llave OpenAI: el QA editorial requiere modelo de texto.", error: null };
  }
  const openai = getOpenAI();
  if (!openai) {
    return { outcome: "no_key", model: null, scores: null, overall: null, verdict: null, findings: [], summary: "Cliente OpenAI no disponible.", error: null };
  }
  if (wouldExceedCap(0.005)) {
    return { outcome: "failed", model: CONFIG.qaModel, scores: null, overall: null, verdict: null, findings: [], summary: "Tope mensual de costo alcanzado.", error: "cost_cap" };
  }

  const ac = seed.autocheck;
  const hasSources = !!ctx && ctx.sources.length > 0;
  const sys =
    "Sos editor jefe de una colección de estudio para certificaciones cloud (Microsoft Azure AI-200). " +
    "Evaluás UNA página de estudio del 'Visual Atlas' por rigor editorial y fidelidad de examen. " +
    (hasSources
      ? "Tenés FUENTES del corpus: chequeá la CORRECCIÓN TÉCNICA contra ellas. IMPORTANTE: las trampas son pares Mito→Corrección; el 'Mito' es FALSO A PROPÓSITO (es el distractor que la página desmiente), NUNCA lo marques como error. Una página está MAL solo si la CORRECCIÓN, el CONTEXTO, la EXPLICACIÓN o la opción correcta del autocheck contradicen las fuentes. Si todo eso es correcto, aprobá. "
      : "No tenés fuentes; juzgá con tu conocimiento técnico de Azure. Las trampas son Mito→Corrección: el Mito es falso a propósito, no lo marques como error; juzgá solo que la Corrección y el autocheck sean correctos. ") +
    "Sos exigente pero justo y SOLO respondés JSON válido.";
  const sourcesBlock = hasSources
    ? `\nFUENTES DEL CORPUS (única verdad para verificar técnica):\n${ctx!.sources.map((s) => `[${s.id}] ${s.title}\n${(s.text ?? "").slice(0, 2500)}`).join("\n---\n")}\n`
    : "";
  const user =
`Evaluá esta página de estudio (el layout y la imagen ya están validados aparte; juzgá el CONTENIDO${hasSources ? " y su CORRECCIÓN TÉCNICA contra las fuentes" : ""}).
${sourcesBlock}

Dominio: ${seed.domainLabel}
Título: ${seed.title} — ${seed.subtitle}
Contexto: ${seed.context}
Pregunta guía: ${seed.guideQuestion}

Trampas de examen (pares Mito→Corrección; el MITO es un distractor FALSO a propósito — NO es una afirmación de la página):
${seed.traps.map((t) => `- MITO (falso, distractor): "${t.wrong}"  ·  CORRECCIÓN (debe ser verdadera): "${t.correction}"`).join("\n")}

Autocheck:
Pregunta: ${ac.question}
Opciones: ${ac.options.join(" | ")}
Marcada correcta: ${ac.options[ac.correctOption] ?? "(?)"}
Explicación: ${ac.explanation}
Notas de descarte: ${ac.discardNotes.join(" / ")}

Devolvé EXACTAMENTE este JSON:
{
  "scores": {
    "claridad": 0-10,
    "fidelidadExamen": 0-10,
    "coherencia": 0-10,
    "autocheckCorrecto": 0-10,
    "trampasValidas": 0-10
  },
  "overall": 0-10,
  "verdict": "approve" | "revise",
  "findings": ["hallazgo accionable y concreto", "..."],
  "summary": "1-2 frases en español"
}
Reglas: 'autocheckCorrecto' bajo si la opción marcada NO es técnicamente la correcta. 'trampasValidas' bajo SOLO si alguna CORRECCIÓN es errónea o el Mito no es realmente un error (NO bajes por el Mito ser falso: eso es correcto por diseño). NUNCA pongas en findings que el Mito es falso. 'findings' máximo 5 (vacío si todo correcto), solo sobre Corrección/Contexto/Explicación/autocheck que contradigan las fuentes. 'verdict' = 'approve' solo si overall >= 8 y el autocheck es correcto.`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.qaModel,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 700,
    });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: seed.pageId, label: "qa-editorial" });
    const rawText = res.choices[0]?.message?.content ?? "{}";
    const raw = JSON.parse(rawText) as Record<string, unknown>;
    const scores = normalizeScores(raw);
    const overall = raw["overall"] != null ? clamp10(raw["overall"]) : clamp10(
      (scores.claridad + scores.fidelidadExamen + scores.coherencia + scores.autocheckCorrecto + scores.trampasValidas) / 5,
    );
    const verdict: EditorialQa["verdict"] = raw["verdict"] === "approve" && overall >= 8 ? "approve" : "revise";
    const findings = Array.isArray(raw["findings"]) ? (raw["findings"] as unknown[]).map(String).slice(0, 5) : [];
    const summary = typeof raw["summary"] === "string" ? (raw["summary"] as string) : "";
    return { outcome: "real", model: CONFIG.qaModel, scores, overall, verdict, findings, summary, error: null };
  } catch (err) {
    return { outcome: "failed", model: CONFIG.qaModel, scores: null, overall: null, verdict: null, findings: [], summary: "El QA editorial falló.", error: String((err as Error)?.message ?? err) };
  }
}
