import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { getEditorialContract } from "../book/editorial-contract.js";
import { certDomain } from "../cert-domain.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import { stripCitationMarkers } from "./author-page.js";
import { verifyChapterClaims } from "./verify-chapter.js";
import { scopedCorpus } from "./module-sources.js";
import type { ChapterSeed, GroundingResult, Source, PracticeItem } from "../types.js";

/** Valida y normaliza la práctica ESTRUCTURADA multi-formato (single/multi/order/build) que devuelve el modelo.
 *  Sanea por kind y DESCARTA los ítems mal formados (p.ej. order con <3 pasos, build con huecos incoherentes). */
export function normalizePractice(raw: unknown): PracticeItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const clean = (v: unknown): string => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const cleanOpts = (arr: unknown, max: number): string[] =>
    Array.isArray(arr) ? arr.map((v) => clean(v).replace(/^[A-Ea-e0-9][.)]\s*/, "")).filter(Boolean).slice(0, max) : [];
  const clampIdx = (n: unknown, len: number): number => Math.max(0, Math.min(Math.max(0, len - 1), Math.round(Number(n ?? 0)) || 0));
  const items: PracticeItem[] = [];
  for (const o of raw) {
    const x = (o ?? {}) as Record<string, unknown>;
    const question = clean(x.question);
    const explanation = clean(x.explanation);
    if (question.length < 8 || !explanation) continue;
    const kind = (["single", "multi", "order", "build"].includes(String(x.kind)) ? String(x.kind) : "single") as PracticeItem["kind"];
    if (kind === "order") {
      const steps = (Array.isArray(x.steps) ? x.steps.map(clean).filter(Boolean) : []).slice(0, 6);
      if (steps.length < 3) continue;   // ordenar exige ≥3 pasos
      items.push({ kind, question, options: [], correctIndex: 0, steps, explanation });
    } else if (kind === "build") {
      const template = String(x.template ?? "").replace(/\r/g, "").replace(/<[^>]+>/g, "").trim();
      const blanks = (Array.isArray(x.blanks) ? x.blanks : []).map((b) => {
        const y = (b ?? {}) as Record<string, unknown>;
        const options = cleanOpts(y.options, 4);
        return { options, correctIndex: clampIdx(y.correctIndex, options.length) };
      }).filter((b) => b.options.length >= 2);
      const markers = (template.match(/\[\[\d+\]\]/g) || []).length;
      if (!template || blanks.length < 1 || markers !== blanks.length) continue;   // template y huecos deben coincidir
      items.push({ kind, question, options: [], correctIndex: 0, template, blanks, explanation });
    } else if (kind === "multi") {
      const options = cleanOpts(x.options, 5);
      const correctIndices = Array.from(new Set((Array.isArray(x.correctIndices) ? x.correctIndices : []).map((n) => Math.round(Number(n))).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length)));
      if (options.length < 3 || correctIndices.length < 2) continue;   // multi exige ≥3 opciones y ≥2 correctas
      items.push({ kind, question, options, correctIndex: correctIndices[0]!, correctIndices, explanation });
    } else {
      const options = cleanOpts(x.options, 4);
      if (options.length < 2) continue;
      items.push({ kind: "single", question, options, correctIndex: clampIdx(x.correctIndex, options.length), explanation });
    }
  }
  return items.length ? items.slice(0, 4) : undefined;
}

/**
 * ENRIQUECEDOR GATEADO del Master Book. Toma un capítulo "todo prosa" (del autor) y le suma los
 * recursos de estudio (código real de Azure, tablas de decisión, callouts con mesura, práctica tipo
 * examen) MANTENIENDO la voz del contrato editorial. El código que agrega es la parte que MÁS
 * alucina detalles de CLI → por eso el resultado pasa por el MISMO verificador honesto que el autor
 * y, si el experto marca algo, se REPARA con su corrección (loop) antes de aceptarlo. Si tras los
 * reintentos sigue contradicho, `ok=false` → el caller cae al capítulo sin enriquecer (prosa correcta).
 * Idempotente: cachea por (capítulo + versión + firma de prosa + modelo).
 */
const ENRICH_VERSION = "enrich-v8-dedup";
const strip = (h: unknown): string => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Los pases LLM a veces emiten "\n" LITERAL (dos chars) como separador dentro de <pre> en vez de un salto
 *  real → en el PDF se ven "\n". Se convierten a saltos reales SOLO dentro de bloques <pre> (código). */
function fixPreNewlines(html: string): string {
  return String(html ?? "").replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (block) => block.replace(/\\n/g, "\n").replace(/\\t/g, "  "));
}
const cleanProse = (h: unknown): string => fixPreNewlines(stripCitationMarkers(String(h ?? "")));

export interface EnrichResult { ok: boolean; seed: ChapterSeed; grounding: GroundingResult | null; repairs: number; enriched: boolean; model: string | null; escalated: boolean; error: string | null }

function cachePath(): string { return path.join(CONFIG.outputRoot, `_enriched-chapters.${CONFIG.certId}.${CONFIG.format}.json`); }
function readCache(): Record<string, ChapterSeed> { try { return JSON.parse(fs.readFileSync(cachePath(), "utf8")) as Record<string, ChapterSeed>; } catch { return {}; } }
function writeCache(c: Record<string, ChapterSeed>): void { atomicWriteFileSync(cachePath(), JSON.stringify(c, null, 2), "enrich-cache"); }
function proseSig(seed: ChapterSeed): string {
  return crypto.createHash("sha256").update(seed.sections.map((s) => `${s.id}:${strip(s.prose)}`).join("|")).digest("hex").slice(0, 12);
}

/** Fuentes MS Learn del módulo (helper UNIFICADO `scopedCorpus`): canónicas + hoja de datos duros antepuesta.
 *  El enrich escribe el CÓDIGO desde la doc real, no de memoria → menos alucinación de CLI → más pasa el gate. */
export async function moduleSourcesFor(skillIds: string[]): Promise<Source[]> {
  return scopedCorpus(skillIds, { limit: 8 });
}

/** Pase LLM que agrega código/tablas/callouts/práctica a cada sección (voz editorial), GROUNDEADO en el corpus. */
async function enrichPass(seed: ChapterSeed, sources: Source[], model: string): Promise<ChapterSeed> {
  const openai = getOpenAI();
  if (!openai) throw new Error("Sin cliente OpenAI");
  const ed = getEditorialContract();
  const dp = certDomain();
  const secs = seed.sections.map((s) => `[${s.id}] ${strip(s.heading)}\n${strip(s.prose)}`).join("\n\n").slice(0, 60000);
  const corpusText = sources.length
    ? sources.map((s) => `[${s.id}] ${s.title}${s.url ? ` — ${s.url}` : ""}\n${s.text ?? ""}`).join("\n\n---\n\n")
    : "";
  const sys = `Eres editor técnico SENIOR de un LIBRO de certificación ${dp.platformShort} ${CONFIG.certId.toUpperCase()}. Te doy un capítulo "todo prosa"; enriquécelo a nivel producto de estudio MANTENIENDO el rigor y la voz de LIBRO (no ficha técnica, no output de IA). ${ed.voice} ${ed.paragraphs} ${ed.practice} ${ed.pedagogy}
Aplica:
1) En CADA sección REESCRIBE la enseñanza en PÁRRAFOS CORTOS separados en <p> (nunca un muro de texto), y AGREGA SOLO donde aporte código real de ${dp.platformShort} en UN SOLO bloque <pre class="scn-code">…</pre> por sección (agrupa los comandos relacionados en ese único bloque; NO lo fragmentes en varios <pre> chicos). ${dp.codeKinds} pertinente y CORRECTO, basado en la DOCUMENTACIÓN OFICIAL de abajo: sintaxis, nombres de comando, flags y parámetros EXACTOS como aparecen en las fuentes; si un comando/flag no está en las fuentes ni lo conoces con certeza, NO lo inventes (usa uno más simple que sí figure, o deja la sección sin código). WORKED EXAMPLE: junto al código crítico, ANOTA en la prosa el PORQUÉ de los pasos clave (por qué ese scope, por qué ese rol/valor), no solo el "qué". Para habilidades DIAGNÓSTICAS (troubleshooting), en vez de solo enunciar la regla, DEMUESTRA con un ejemplo real —una salida de log (stdout/stderr) o un código de salida— y razona paso a paso hasta la causa. PRESERVACIÓN DE PROFUNDIDAD: mantén (o AMPLÍA) el desarrollo y la cobertura del autor; reescribe para claridad y agrega código, pero NO resumas ni acortes la prosa explicativa ni elimines aspectos que el autor ya cubrió — el enriquecido suma, no recorta.
2) Con MESURA (0-1 por sección, no en todas): una TABLA DE DECISIÓN <table class="dmap"><thead><tr><th>Escenario</th><th>Opción recomendada</th></tr></thead><tbody><tr><td class="s">…</td><td class="d">…</td></tr></tbody></table> donde haya un "cuándo usar qué", y/o UN callout — varía entre trampa <div class="exam-trap"><p class="lab">Trampa del examen</p><p>…</p></div> y consejo <div class="tip"><p class="lab">En el laboratorio</p><p>…</p></div>. No abuses: el texto manda.
3) La PRÁCTICA va APARTE (NO como sección de prosa): devuélvela en el campo 'practice' = arreglo de 3-4 ejercicios ESTRUCTURADOS con FORMATOS VARIADOS (usa AL MENOS 2 'kind' distintos e incluí SIEMPRE uno de 'order' o 'build') que cubran habilidades ENFATIZADAS DISTINTAS del capítulo, siguiendo el FORMATO DE PRÁCTICA y el DISEÑO DE ÍTEMS de arriba.
REGLAS DURAS: (a) NO reincluyas el título/heading de la sección dentro de la prosa —el sistema ya lo pone—; arranca directo con un párrafo. (b) Los comandos de varias líneas o largos van SIEMPRE en <pre class="scn-code">, nunca como <code> inline (el inline solo para tokens cortos). (c) En los comandos multilínea NO uses barras invertidas de continuación (\\) al final de las líneas: pon cada flag en su renglón, SIN la barra final. ${dp.security} HTML válido. Responde SOLO JSON.`;
  const user = `TÍTULO: ${seed.title}\nRUTA: ${seed.domainLabel}\n\nSECCIONES:\n${secs}\n\n${corpusText ? `DOCUMENTACIÓN OFICIAL (base para TODO el código que agregues — sintaxis exacta):\n${corpusText}\n\n` : ""}Devuelve {"sections":[{"id":"s1","prose":"HTML con varios <p> cortos"}],"practice":[{"kind":"single","question":"escenario 2-3 frases con una decisión","options":["texto plano","texto plano","texto plano"],"correctIndex":1,"explanation":"por qué la correcta lo es y por qué las otras no"},{"kind":"order","question":"ordene los pasos para lograr X","steps":["primer paso o comando","segundo paso","tercer paso"],"explanation":"por qué ese orden"},${dp.buildFewShot}]}`;
  const res = await openai.chat.completions.create({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, ...chatModelParams(model, 12000, 0.4) });
  recordTextSpend(model, res.usage, { kind: "text", pageId: seed.chapterId, label: "enrich-chapter" });
  if (res.choices[0]?.finish_reason === "length") throw new Error("enrich truncado (finish_reason=length)");   // no usar contenido cortado
  const raw = JSON.parse(res.choices[0]?.message?.content || "{}") as { sections?: { id: string; prose: string }[]; practice?: unknown };
  const byId = new Map((raw.sections ?? []).map((s) => [s.id, s.prose] as const));
  const after: ChapterSeed = JSON.parse(JSON.stringify(seed));
  after.sections = after.sections.map((s) => byId.has(s.id) ? { ...s, prose: cleanProse(byId.get(s.id)!) } : s);
  after.sections = after.sections.filter((s) => s.id !== "practice");   // por si venía embebida de una versión previa
  after.practice = normalizePractice(raw.practice) ?? seed.practice;
  return after;
}

/** Repara SOLO las afirmaciones/código marcados como incorrectos por el experto, usando su corrección. */
async function repairPass(seed: ChapterSeed, fixes: { wrong: string; correction: string }[], sources: Source[], model: string): Promise<ChapterSeed> {
  const openai = getOpenAI();
  if (!openai || fixes.length === 0) return seed;
  const dp = certDomain();
  const secs = seed.sections.map((s) => `[${s.id}] ${strip(s.heading)}\n${s.prose}`).join("\n\n").slice(0, 60000);
  const fixList = fixes.map((f, i) => `${i + 1}. INCORRECTO: "${f.wrong}"\n   CORRECCIÓN (${dp.repairPersona}): ${f.correction}`).join("\n");
  const corpusText = sources.length ? `\n\nDOCUMENTACIÓN OFICIAL (usá la sintaxis exacta para corregir):\n${sources.map((s) => `[${s.id}] ${s.title}\n${s.text ?? ""}`).join("\n---\n")}` : "";
  const sys = dp.repairSys;
  const user = `ERRORES A CORREGIR:\n${fixList}${corpusText}\n\nSECCIONES (id + HTML actual):\n${secs}\n\nDevuelve {"sections":[{"id":"s1","prose":"HTML corregido"}]} — incluye TODAS las secciones (corrige las afectadas, deja el resto igual).`;
  const res = await openai.chat.completions.create({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, ...chatModelParams(model, 12000, 0.2) });
  recordTextSpend(model, res.usage, { kind: "text", pageId: seed.chapterId, label: "enrich-repair" });
  if (res.choices[0]?.finish_reason === "length") throw new Error("repair truncado (finish_reason=length)");   // descartar reparación cortada
  const raw = JSON.parse(res.choices[0]?.message?.content || "{}") as { sections?: { id: string; prose: string }[] };
  const byId = new Map((raw.sections ?? []).map((s) => [s.id, s.prose] as const));
  const after: ChapterSeed = JSON.parse(JSON.stringify(seed));
  after.sections = after.sections.map((s) => byId.has(s.id) ? { ...s, prose: cleanProse(byId.get(s.id)!) } : s);
  return after;
}

/** UN intento completo con un modelo: enrich → verify → (reparar → verify)×maxRepairs. */
async function attemptWithModel(seed: ChapterSeed, sources: Source[], model: string, maxRepairs: number): Promise<{ enriched: ChapterSeed; grounding: GroundingResult; repairs: number }> {
  let enriched = await enrichPass(seed, sources, model);
  let grounding = await verifyChapterClaims(enriched.chapterId, enriched);
  let repairs = 0;
  let prevBad = new Set(grounding.checks.filter((c) => c.verdict === "contradicted").map((c) => c.text));
  while (grounding.blocked && repairs < maxRepairs) {
    const fixes = grounding.checks
      .filter((c) => c.verdict === "contradicted")
      .map((c) => ({ wrong: c.text, correction: (c.note || "").replace(/^\[(experto|error)\]\s*/, "") }));
    if (fixes.length === 0) break;
    try { enriched = await repairPass(enriched, fixes, sources, model); } catch { break; }
    repairs++;
    grounding = await verifyChapterClaims(enriched.chapterId, enriched);
    const nowBad = new Set(grounding.checks.filter((c) => c.verdict === "contradicted").map((c) => c.text));
    // ANTI-CHURN por IDENTIDAD (no por conteo): se PROGRESA mientras la reparación resuelva AL MENOS uno de
    // SUS blancos (aunque el verificador extraiga otro claim distinto después). Si NINGÚN claim antes-contradicho
    // se resolvió, el repair no tocó lo suyo → está oscilando (whack-a-mole) → cortar. Acotado por maxRepairs.
    const resolvedSome = [...prevBad].some((t) => !nowBad.has(t));
    if (!resolvedSome) break;
    prevBad = nowBad;
  }
  return { enriched, grounding, repairs };
}

/**
 * Enriquece un capítulo y lo GATEA con ESCALADA por costo: primero el modelo barato (`enrichModel`);
 * si NO pasa el gate tras reparar, reintenta con el modelo fuerte (`enrichEscalateModel`) —así se paga
 * el caro SOLO en los capítulos que el barato no pudo. Si ninguno pasa, `ok=false` → el caller cae a la
 * prosa del autor (correcta, sin código). Verifica el resultado y exige cita/experto (mismo gate del autor).
 */
export async function enrichAndGate(seed: ChapterSeed, opts: { maxRepairs?: number; force?: boolean } = {}): Promise<EnrichResult> {
  const maxRepairs = opts.maxRepairs ?? 3;   // el anti-churn por IDENTIDAD corta apenas deja de resolver blancos; 3 da margen a converger con la hoja de datos duros
  const fail = (extra: Partial<EnrichResult>): EnrichResult => ({ ok: false, seed, grounding: null, repairs: 0, enriched: false, model: null, escalated: false, error: null, ...extra });
  if (!hasOpenAIKey()) return fail({ error: "Sin llave OpenAI." });
  if (wouldExceedCap(0.05)) return fail({ error: "Tope mensual de costo alcanzado." });

  const sources = await moduleSourcesFor(seed.skillIds ?? []);
  const corpusSig = crypto.createHash("sha256").update(sources.map((s) => `${s.id}:${s.hash ?? ""}`).sort().join("|")).digest("hex").slice(0, 8);
  const escalate = CONFIG.enrichEscalateModel && CONFIG.enrichEscalateModel !== CONFIG.enrichModel ? CONFIG.enrichEscalateModel : "";
  // Hash del contrato editorial en la cache-key → un cambio de voice/paragraphs/practice/pedagogy invalida lo cacheado.
  const edHash = crypto.createHash("sha256").update(JSON.stringify(getEditorialContract())).digest("hex").slice(0, 8);
  const key = crypto.createHash("sha256").update(`${seed.chapterId}|${ENRICH_VERSION}|${CONFIG.enrichModel}>${escalate}|${proseSig(seed)}|${corpusSig}|${edHash}`).digest("hex").slice(0, 16);

  const cache = readCache();
  if (!opts.force && cache[key]) {
    const cached = cache[key]!;
    const grounding = await verifyChapterClaims(cached.chapterId, cached);
    return { ok: !grounding.blocked, seed: cached, grounding, repairs: 0, enriched: true, model: null, escalated: false, error: null };
  }

  // 1) Intento BARATO. Si LANZA (p.ej. truncado por length) → best=null y se escala igual (no falla directo).
  let best: { enriched: ChapterSeed; grounding: GroundingResult; repairs: number } | null = null;
  let usedModel = CONFIG.enrichModel;
  let escalated = false;
  let lastErr = "";
  try { best = await attemptWithModel(seed, sources, CONFIG.enrichModel, maxRepairs); }
  catch (err) { lastErr = String((err as Error)?.message ?? err); }

  // 2) ESCALADA: si el barato NO pasó el gate O truncó/falló, y hay modelo fuerte configurado.
  if ((!best || best.grounding.blocked) && escalate) {
    try {
      const strong = await attemptWithModel(seed, sources, escalate, maxRepairs);
      if (!best || !strong.grounding.blocked || strong.grounding.contradicted <= best.grounding.contradicted) best = strong;
      usedModel = escalate; escalated = true;
    } catch (err) { lastErr = String((err as Error)?.message ?? err); /* el fuerte también falló → queda best (puede ser null) */ }
  }

  if (!best) return fail({ model: usedModel, escalated, error: `Enriquecido falló en ambos modelos (truncado/parse): ${lastErr}` });

  const ok = !best.grounding.blocked;
  if (ok) { const fresh = readCache(); fresh[key] = best.enriched; writeCache(fresh); }
  return { ok, seed: best.enriched, grounding: best.grounding, repairs: best.repairs, enriched: true, model: usedModel, escalated, error: ok ? null : `Enriquecido rechazado por el gate${escalated ? " (incl. escalada)" : ""} tras reparar: ${best.grounding.reason}` };
}
