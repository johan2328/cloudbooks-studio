import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { listPersistedPages } from "../page-store.js";
import { getSkill } from "../skills/ai-200-outline.js";
import { certDomain } from "../cert-domain.js";

/**
 * GATE DE CORRECTITUD TEMÁTICA (autónomo): valida que el CONTENIDO de cada lámina
 * trate el TEMA OFICIAL de su unidad. Cierra el punto ciego del QA de imagen (que
 * solo valida imagen↔texto, no texto↔unidad) — ahí se colaba la contaminación
 * cruzada de servicios (ej: unidad de AKS con contenido de Azure Container Registry).
 * Una sola llamada LLM (authorModel = gpt-4.1-mini) sobre todo el corpus. Read-only.
 */

export interface TopicMismatch { pageId: string; skillId: string; official: string; detected: string; why: string }
export interface TopicAuditResult { ok: boolean; audited: number; mismatches: TopicMismatch[]; error?: string }

// Grupos de servicios/temas POR DOMINIO (cert-domain): AI-200 = servicios Azure; agnóstico = vacío (no afirma
// contaminación → sin falsos positivos hasta que el cert defina los suyos). Barrido cross-cert Fase 2.
function servicesIn(text: string): Set<number> {
  const t = (text || "").toLowerCase();
  const out = new Set<number>();
  certDomain().serviceGroups.forEach((g, i) => { if (g.some((k) => t.includes(k))) out.add(i); });
  return out;
}
/** Mismatch REAL = el contenido nombra un servicio que NO es el de la unidad (contaminación cruzada).
 *  Si comparten servicio (ej. AKS oficial + AKS detectado) es falso positivo del LLM → se descarta. */
function isCrossService(official: string, detected: string): boolean {
  const off = servicesIn(official), det = servicesIn(detected);
  if (off.size === 0 || det.size === 0) return false;           // sin servicio claro → no afirmar mismatch
  for (const s of det) if (off.has(s)) return false;            // comparten servicio → mismo tema
  return true;                                                   // detecta un servicio ajeno → contaminación
}

export async function auditTopics(): Promise<TopicAuditResult> {
  if (!hasOpenAIKey()) return { ok: false, audited: 0, mismatches: [], error: "Sin llave OpenAI." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, audited: 0, mismatches: [], error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.03)) return { ok: false, audited: 0, mismatches: [], error: "Tope mensual de costo alcanzado." };

  const rows = listPersistedPages().map((p) => {
    const skill = getSkill((p.provenance.skillIds ?? [])[0] ?? "");
    const mods = (p.seed.visualModules ?? []).map((m) => m.title).join(" / ");
    return { id: p.seed.pageId, skillId: (p.provenance.skillIds ?? [])[0] ?? "", official: skill?.title ?? "", content: `${p.seed.title} :: ${mods}` };
  }).filter((r) => r.official);
  if (rows.length === 0) return { ok: true, audited: 0, mismatches: [] };

  const dp = certDomain();
  const sys = dp.auditorSys;
  const user = `Para cada lámina, decidí si el contenido corresponde al tema oficial. MISMATCH = el contenido trata de OTRO SERVICIO de ${dp.platformShort} que el de la unidad (${dp.auditorMismatchEg}).
REGLA CLAVE: si el contenido es del MISMO servicio que la unidad (aunque sea un sub-tema distinto), NO es mismatch. Solo marcá contaminación de SERVICIO CRUZADO.
Devolvé JSON {"mismatches":[{"id":"NN","detected":"servicio/tema real del contenido","why":"breve"}]} SOLO las que NO coinciden (lista vacía si todas ok).
LÁMINAS:
${rows.map((r) => `${r.id} | OFICIAL: ${r.official} | CONTENIDO: ${r.content}`).join("\n")}`;

  try {
    // Modelo de calidad (authorModel = gpt-4.1-mini): nano es flojo para este juicio y truncaba el JSON.
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0, max_tokens: 4000 });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "topic-audit" });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { mismatches?: any[] };
    const byId = new Map(rows.map((r) => [r.id, r]));
    const mismatches: TopicMismatch[] = (Array.isArray(raw.mismatches) ? raw.mismatches : [])
      .map((m) => { const r = byId.get(String(m?.id ?? "")); return r ? { pageId: r.id, skillId: r.skillId, official: r.official, detected: String(m?.detected ?? ""), why: String(m?.why ?? "") } : null; })
      .filter((x): x is TopicMismatch => x !== null)
      // Post-filtro determinista: quedarse SOLO con contaminación de servicio CRUZADO real;
      // descarta los falsos positivos donde el LLM flaggea pero el servicio detectado = el oficial.
      .filter((x) => isCrossService(x.official, x.detected));
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return { ok: true, audited: rows.length, mismatches };
  } catch (err) { return { ok: false, audited: rows.length, mismatches: [], error: String((err as Error)?.message ?? err) }; }
}
