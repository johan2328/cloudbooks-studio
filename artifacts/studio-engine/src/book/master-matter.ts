import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { CONFIG } from "../config.js";
import { certMetaByEngineId } from "../certifications.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { listPersistedChapters } from "../chapter-store.js";
import { listSources } from "../grounding/source-store.js";
import { saveBookConfig, getBookConfig } from "./book-config.js";
import { timeAgent } from "../agents/agent-runtime.js";

/**
 * FRONT/BACK MATTER del Master Book (copyright/disclaimer + glosario + referencias),
 * en el MISMO lenguaje editorial que el Atlas pero con contenido PROPIO del libro
 * (glosario y referencias derivados de los CAPÍTULOS, no de las láminas). El copyright
 * reusa el disclaimer de marca del Atlas, adaptado al Master Book.
 */
/** Copyright del Master POR CERT: el subtítulo = `${code} · ${title}` (AI-200 queda byte-idéntico con
 *  code="AI-200"/title="Desarrollo en Azure de Soluciones de IA"). Ver barrido cross-cert (#3). */
export function masterCopyright(code: string, title: string): string {
  return `<p class="cp-brand">CloudBooks</p>
<p class="cp-sub">Master Book — ${esc(code)} · ${esc(title)}</p>
<p>© 2026 CloudBooks. Todos los derechos reservados. Ninguna parte de esta obra puede reproducirse sin autorización escrita del editor.</p>
<p>Microsoft, Azure y los nombres de servicios son marcas de Microsoft Corporation. Esta obra es material de estudio independiente; no es un producto oficial de Microsoft ni está avalada por Microsoft.</p>
<p>Primera edición · 2026.</p>`;
}

const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const strip = (h: string): string => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export interface MatterResult { ok: boolean; count?: number; error?: string }

/** GLOSARIO del Master Book: términos clave extraídos del RELATO de los capítulos. Guarda en el config del libro. */
export async function generateMasterGlossary(): Promise<MatterResult> {
  return timeAgent("glosario", "master-glossary", () => generateMasterGlossaryInner());
}
async function generateMasterGlossaryInner(): Promise<MatterResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.03)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  const chapters = listPersistedChapters();
  if (chapters.length === 0) return { ok: false, error: "No hay capítulos todavía." };
  const corpus = chapters.map((c) => {
    const secs = c.seed.sections.map((s) => `${s.heading}: ${strip(s.prose).slice(0, 500)}`).join(" | ");
    return `[${c.seed.title}] ${secs}`;
  }).join("\n").slice(0, 18000);
  const code = certMetaByEngineId(CONFIG.certId).code;
  const user = `Contenido del LIBRO MAESTRO ${code} (capítulos y sus secciones):\n${corpus}\n\nExtraé entre 40 y 70 TÉRMINOS TÉCNICOS CLAVE que aparecen en este contenido (servicios de Azure, conceptos, siglas) y definí cada uno en 1-2 frases claras a nivel examen ${code}, en ESPAÑOL NEUTRO sin voseo. Sin repetir NINGÚN término. Devolvé SOLO JSON: {"terms":[{"term":"...","definition":"..."}]} — ordenados alfabéticamente, SIN duplicados.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Sos editor técnico. Devolvés SOLO JSON válido y COMPLETO." }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.3, max_tokens: 9000 });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "master-glossary" });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { terms?: any[] };
    const seen = new Set<string>();
    const terms = (Array.isArray(raw.terms) ? raw.terms : [])
      .map((t) => ({ term: String(t?.term ?? "").trim(), definition: String(t?.definition ?? "").trim() }))
      .filter((t) => t.term && t.definition)
      .filter((t) => { const k = t.term.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim(); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.term.localeCompare(b.term, "es"));
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (terms.length === 0) return { ok: false, error: "El modelo no devolvió términos." };
    // El LLM devuelve los términos en minúscula ("agent card"); un glosario lee mejor con inicial mayúscula.
    // Guard: NO tocar identificadores/comandos lowercase (un token con dígito o . - _ /): "gpt-image", "az-104".
    const capTerm = (t: string): string => (!/\s/.test(t) && /[\d._/-]/.test(t)) ? t : t.charAt(0).toUpperCase() + t.slice(1);
    const html = `<dl class="gloss">${terms.map((t) => `<dt>${esc(capTerm(t.term))}</dt><dd>${esc(t.definition)}</dd>`).join("")}</dl>`;
    await saveBookConfig({ blocks: { ...getBookConfig().blocks, glossary: html } });
    return { ok: true, count: terms.length };
  } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
}

/** REFERENCIAS del Master Book: fuentes citadas por los capítulos (dedupe, alfabético). Sin LLM. */
export function masterReferencesHtml(): string {
  const byId = new Map(listSources().map((s) => [s.id, s] as const));
  const ids = new Set<string>();
  for (const ch of listPersistedChapters()) for (const sid of ch.provenance.sourceIds) ids.add(sid);
  const sources = [...ids].map((id) => byId.get(id)).filter((s): s is NonNullable<typeof s> => !!s)
    .sort((a, b) => (a.title || "").localeCompare(b.title || "", "es"));
  if (sources.length === 0) return "";
  // 2 columnas, clase `.bib` canónica del Atlas + MISMO intro y color (fijado en el contrato: Visual Atlas = canonical de bibliografía).
  return `<p>Fuentes oficiales consultadas para fundamentar y dar estructura al contenido del libro.</p><ul class="bib">${sources.map((s) => `<li><span class="bt">${esc(s.title)}</span>${s.url ? ` — <a href="${esc(s.url)}">${esc(s.url)}</a>` : ""}</li>`).join("")}</ul>`;
}
