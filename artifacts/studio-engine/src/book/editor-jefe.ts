import { CONFIG } from "../config.js";
import { certMetaByEngineId } from "../certifications.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { getSeed } from "../seeds.js";

export interface BookIssue {
  pageId: string;
  type: "terminologia" | "tono" | "estructura" | "duplicado" | "otro";
  detail: string;
  suggestion: string;
}
export interface BookReview {
  outcome: "real" | "no_key" | "no_pages" | "failed";
  pages: string[];
  consistent: boolean;
  issues: BookIssue[];
  summary: string;
  error: string | null;
}

/**
 * EDITOR-JEFE DE LIBRO (#6, gestor anticipatorio): revisa el CONJUNTO de páginas
 * como un libro, no aisladas — consistencia de terminología (mismo término para
 * el mismo concepto), tono, estructura y solapamientos. Marca cada problema con
 * su página y una sugerencia accionable, para que el humano apruebe la corrección
 * (o un loop la aplique). Una sola llamada LLM (barato). No reescribe: anticipa.
 */
export async function reviewBookConsistency(pageIds: string[]): Promise<BookReview> {
  const seeds = pageIds.map((id) => getSeed(id)).filter((s): s is NonNullable<typeof s> => !!s);
  if (seeds.length < 2) return { outcome: "no_pages", pages: pageIds, consistent: true, issues: [], summary: "Se necesitan ≥2 páginas para revisar consistencia.", error: null };
  if (!hasOpenAIKey()) return { outcome: "no_key", pages: pageIds, consistent: true, issues: [], summary: "Sin llave OpenAI.", error: null };
  const openai = getOpenAI();
  if (!openai) return { outcome: "no_key", pages: pageIds, consistent: true, issues: [], summary: "Cliente OpenAI no disponible.", error: null };
  if (wouldExceedCap(0.01)) return { outcome: "failed", pages: pageIds, consistent: true, issues: [], summary: "Tope de costo alcanzado.", error: "cost_cap" };

  const block = seeds.map((s) => `# Página ${s.pageId} — ${s.title}${s.subtitle ? ` (${s.subtitle})` : ""}\nDominio: ${s.domainLabel}\nContexto: ${s.context}\nTrampas: ${s.traps.map((t) => t.correction).join(" | ")}\nAutocheck: ${s.autocheck.question} → ${s.autocheck.explanation}`).join("\n\n");
  const sys =
    `Sos editor jefe de un libro de estudio para la certificación cloud ${certMetaByEngineId(CONFIG.certId).code}. ` +
    "Revisás un CONJUNTO de páginas COMO LIBRO (no aisladas): consistencia de terminología (mismo término para el mismo concepto en todas), tono uniforme, estructura pareja y que no se solapen/dupliquen. Respondés SOLO JSON.";
  const user =
`Revisá la consistencia editorial de estas ${seeds.length} páginas del MISMO libro.

${block}

Devolvé EXACTAMENTE: {"issues":[{"pageId":"..","type":"terminologia|tono|estructura|duplicado|otro","detail":"qué es inconsistente vs las demás","suggestion":"fix concreto"}],"summary":"1-2 frases"}
Reglas: máximo 8 issues, los más importantes. Si hay un término escrito de formas distintas entre páginas (p.ej. "ACR" vs "Azure Container Registry"), marcá terminologia. Si todo es consistente, issues vacío.`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.qaModel,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 900,
    });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", label: "book-review" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { issues?: unknown; summary?: unknown };
    const issues: BookIssue[] = Array.isArray(raw.issues)
      ? (raw.issues as Record<string, unknown>[]).slice(0, 8).map((i) => ({
          pageId: String(i.pageId ?? ""),
          type: (["terminologia", "tono", "estructura", "duplicado", "otro"].includes(String(i.type)) ? String(i.type) : "otro") as BookIssue["type"],
          detail: String(i.detail ?? ""),
          suggestion: String(i.suggestion ?? ""),
        }))
      : [];
    return { outcome: "real", pages: seeds.map((s) => s.pageId), consistent: issues.length === 0, issues, summary: typeof raw.summary === "string" ? raw.summary : "", error: null };
  } catch (err) {
    return { outcome: "failed", pages: pageIds, consistent: true, issues: [], summary: "La revisión de libro falló.", error: String((err as Error)?.message ?? err) };
  }
}
