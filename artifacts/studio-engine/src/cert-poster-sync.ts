import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pdf } from "pdf-to-img";
import { CONFIG } from "./config.js";
import { getOpenAI, hasOpenAIKey } from "./openai-client.js";
import { recordTextSpend, wouldExceedCap } from "./cost.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import { rawCanonicalCerts, saveCanonicalCerts, type CanonCert, type CanonArea, type CanonLevel } from "./certifications.js";

/**
 * SYNC MENSUAL con el póster oficial de Microsoft (fuente de altas/bajas de certs).
 * El póster es un PDF GRÁFICO → se rasteriza (pdf-to-img) y se lee con VISIÓN (gpt-4.1-mini).
 *
 * SALVAGUARDA (clave): la lectura por visión es RUIDOSA (alucina codes, omite otros). Por eso:
 *  - 3 PASADAS + voto por MAYORÍA (≥2/3) para "confirmar" que un code está en el póster.
 *  - AUTO-AGREGA solo codes confirmados, con formato válido y que no colisionan → status "Nuevo".
 *  - PROPONE RETIRO (reversible): un canónico vigente ausente del póster se marca como CANDIDATO a "Retirada";
 *    NO se retira solo (default) — el humano confirma con botón desde la UI (o "Retirar todas"). La baja es un
 *    estado suave y se revierte por-cert (setCanonicalCertStatus → "Activo"). No toca los ya Retira/Sustituida.
 * Todo queda auditado en `_cert-sync-log.json` (últimas 12 corridas).
 */

const POSTER_URL = "https://arch-center.azureedge.net/Credentials/Certification-Poster_en-us.pdf";
const PASSES = 3;
const MAJORITY = Math.ceil(PASSES / 2);                 // 2 de 3
const CODE_RE = /^[A-Z]{2}-\d{3}(?:\/[A-Z]{2}-\d{3})?$/; // AZ-900 · AI-200 · AZ-800/AZ-801
const HISTORY_CAP = 12;

interface PosterCert { code: string; title: string; level: string }
export interface SyncChange { code: string; title?: string; level?: string; note: string }
export interface SyncLog {
  ranAt: string;
  trigger: "manual" | "scheduler";
  ok: boolean;
  passes: number;
  extractedUnion: number;    // codes vistos en al menos 1 pasada
  confirmed: number;         // codes con ≥ mayoría
  added: SyncChange[];       // APLICADOS (altas nuevas, status "Nuevo")
  retired: SyncChange[];     // APLICADOS (bajas suaves: status "Retirada", reversible por-cert)
  reviewMissing: SyncChange[]; // (legacy) ausentes del póster → ahora se auto-retiran; queda vacío
  unconfirmed: SyncChange[]; // vistos en 1 sola pasada, ignorados (probable ruido de visión)
  suspectMisread: SyncChange[]; // confirmados pero adyacentes a un code existente (probable mala lectura) → NO agregados
  error?: string;
}
interface SyncStore { runs: SyncLog[] }

function storePath(): string { return path.join(CONFIG.outputRoot, "_cert-sync-log.json"); }
function readStore(): SyncStore {
  try {
    if (existsSync(storePath())) {
      const s = JSON.parse(readFileSync(storePath(), "utf8")) as SyncStore;
      if (Array.isArray(s?.runs)) return s;
    }
  } catch { /* corrupto → vacío */ }
  return { runs: [] };
}
function pushLog(log: SyncLog): void {
  const store = readStore();
  store.runs.unshift(log);
  store.runs = store.runs.slice(0, HISTORY_CAP);
  atomicWriteFileSync(storePath(), JSON.stringify(store, null, 2), "cert-sync-log");
}

/** Último log (para la UI / badge "última sync"). */
export function lastSyncLog(): SyncLog | null { return readStore().runs[0] ?? null; }
export function syncHistory(): SyncLog[] { return readStore().runs; }

// ── rasterizado ──
async function rasterizePoster(): Promise<Buffer> {
  const res = await fetch(POSTER_URL);
  if (!res.ok) throw new Error(`descarga_poster_${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const doc = await pdf(buf, { scale: 3 });
  for await (const page of doc) return page as Buffer;   // el póster es 1 página
  throw new Error("poster_vacio");
}

// ── extracción por visión (1 pasada) ──
const SYS = "Extraés el catálogo de certificaciones de un póster oficial de Microsoft. Respondés SOLO JSON.";
const PROMPT =
  "Este es el póster OFICIAL de certificaciones de Microsoft. Extraé TODAS las certificaciones visibles, sin omitir ninguna. " +
  "Para cada una devolvé { code, title, level }. `code` = código tipo AZ-900 / AI-200 / AB-100 (respetá guiones; si son dos exámenes juntos usá la barra, ej AZ-800/AZ-801). " +
  "`level` = uno de: Fundamentals, Associate, Expert, Specialty, Business (según la sección/columna del póster). " +
  'Devolvé {"certs":[{"code","title","level"}, ...]}. Sé exhaustivo: es mejor incluir de más que omitir.';

async function extractOnce(dataUrl: string, i: number): Promise<PosterCert[]> {
  const openai = getOpenAI();
  if (!openai) return [];
  const res = await openai.chat.completions.create({
    model: CONFIG.visionModel,
    messages: [
      { role: "system", content: SYS },
      { role: "user", content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
      ] },
    ],
    response_format: { type: "json_object" },
    temperature: 0,
    max_tokens: 4000,
  });
  recordTextSpend(CONFIG.visionModel, res.usage, { kind: "vision", label: `cert-poster-sync-p${i + 1}` });
  const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { certs?: unknown };
  const out: PosterCert[] = [];
  if (Array.isArray(parsed.certs)) {
    for (const c of parsed.certs as Array<Record<string, unknown>>) {
      const code = normalizeCode(String(c.code ?? ""));
      if (!code || !CODE_RE.test(code)) continue;
      out.push({ code, title: String(c.title ?? "").trim(), level: String(c.level ?? "").trim() });
    }
  }
  return out;
}

function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").replace(/–|—/g, "-").trim();
}
function normalizeLevel(raw: string): CanonLevel {
  const l = raw.toLowerCase();
  if (l.startsWith("fund")) return "Fundamentals";
  if (l.startsWith("assoc")) return "Associate";
  if (l.startsWith("exp")) return "Expert";
  if (l.startsWith("spec")) return "Specialty";
  if (l.startsWith("bus")) return "Business";
  return "Associate";
}
/** Área best-effort por prefijo (para un cert NUEVO; el humano la revisa). */
function inferArea(code: string): CanonArea {
  const p = (code.split(/[-/]/)[0] ?? "").toUpperCase();
  if (p === "GH") return "GitHub";
  if (p === "SC" || code.startsWith("AZ-500")) return "Security";
  if (p === "AB" || p === "MB" || p === "PL" || p === "MS" || p === "MD") return "AI Business Solutions";
  return "Cloud & AI Platforms";
}

/** Todos los codes componentes de un cert canónico (desdobla los combinados tipo AZ-800/AZ-801). */
function componentsOf(code: string): string[] { return normalizeCode(code).split("/").filter(Boolean); }

/** "Familia" de un code simple de 3 dígitos = prefijo + centena + decena (AZ-802 → "AZ-80"). null si es combinado/atípico. */
function familyKey(code: string): string | null {
  const m = normalizeCode(code).match(/^([A-Z]{2})-(\d\d)\d$/);
  return m ? `${m[1]}-${m[2]}` : null;
}
/**
 * ¿El code nuevo es probablemente un MISREAD de uno existente? Lo es si comparte familia
 * (prefijo+centena+decena) con un code conocido y solo difiere en la unidad —el caso AZ-802
 * vs AZ-800/AZ-801—. NO marca AB-650 (no hay AB-65x) ni AI-500 (no hay AI-50x). El voto
 * unánime no alcanza (AZ-802 salió 3/3): este guard es estructural.
 */
function isMisreadNeighbor(code: string, knownFamilies: Map<string, Set<string>>): string | null {
  const fk = familyKey(code);
  if (!fk) return null;
  const fam = knownFamilies.get(fk);
  if (!fam) return null;
  for (const existing of fam) if (existing !== normalizeCode(code)) return existing; // vecino real (distinto code, misma familia)
  return null;
}

/**
 * Corre el sync completo. `apply` = escribir el canónico con las ALTAS (default true).
 * `applyRetirements` = aplicar también los RETIROS (default false → los PROPONE en `base.retired`;
 * el humano los confirma con botón desde la UI). Devuelve el log (persistido en `_cert-sync-log.json`).
 */
export async function runCertPosterSync(opts: { trigger?: "manual" | "scheduler"; apply?: boolean; applyRetirements?: boolean } = {}): Promise<SyncLog> {
  const trigger = opts.trigger ?? "manual";
  const apply = opts.apply !== false;
  const applyRetirements = opts.applyRetirements === true;   // default: PROPONER retiros (no auto-retirar); el humano confirma con botón
  const base: SyncLog = {
    ranAt: new Date().toISOString(), trigger, ok: false, passes: PASSES,
    extractedUnion: 0, confirmed: 0, added: [], retired: [], reviewMissing: [], unconfirmed: [], suspectMisread: [],
  };

  if (!hasOpenAIKey()) { base.error = "sin llave OpenAI (visión deshabilitada)"; pushLog(base); return base; }
  if (wouldExceedCap(0.05)) { base.error = "tope de costo alcanzado"; pushLog(base); return base; }

  let png: Buffer;
  try { png = await rasterizePoster(); }
  catch (err) { base.error = `rasterizado/descarga falló: ${String((err as Error)?.message ?? err)}`; pushLog(base); return base; }

  const dataUrl = `data:image/png;base64,${png.toString("base64")}`;

  // ── N pasadas de visión + conteo de ocurrencias por code ──
  const counts = new Map<string, number>();
  const seenMeta = new Map<string, PosterCert>();  // primera vez que vemos cada code (title/level)
  let passesOk = 0;
  for (let i = 0; i < PASSES; i++) {
    let certs: PosterCert[] = [];
    try { certs = await extractOnce(dataUrl, i); passesOk++; }
    catch { /* una pasada que falla no aborta: el voto por mayoría lo tolera */ continue; }
    const uniqueThisPass = new Set<string>();
    for (const c of certs) {
      if (uniqueThisPass.has(c.code)) continue;   // no contar dos veces en la misma pasada
      uniqueThisPass.add(c.code);
      counts.set(c.code, (counts.get(c.code) ?? 0) + 1);
      if (!seenMeta.has(c.code)) seenMeta.set(c.code, c);
    }
  }
  if (passesOk === 0) { base.error = "todas las pasadas de visión fallaron"; pushLog(base); return base; }

  base.extractedUnion = counts.size;
  const posterUnion = new Set(counts.keys());
  const confirmed = new Set([...counts.entries()].filter(([, n]) => n >= MAJORITY).map(([c]) => c));
  base.confirmed = confirmed.size;

  // ── canónico actual: set de codes conocidos (incluye componentes de combinados) ──
  const canon = rawCanonicalCerts();
  const known = new Set<string>();
  const knownFamilies = new Map<string, Set<string>>();   // familia (AZ-80) → codes existentes de esa familia
  for (const c of canon) for (const comp of componentsOf(c.code)) {
    known.add(comp); known.add(normalizeCode(c.code));
    const fk = familyKey(comp);
    if (fk) { const s = knownFamilies.get(fk) ?? new Set<string>(); s.add(comp); knownFamilies.set(fk, s); }
  }

  // ── ALTAS: confirmados, válidos, no conocidos → agregar como "Nuevo" ──
  const additions: CanonCert[] = [];
  for (const code of confirmed) {
    const comps = componentsOf(code);
    if (comps.some((c) => known.has(c)) || known.has(code)) continue;   // ya existe (o es componente de un combinado)
    // Guard anti-misread: adyacente a un code existente (misma familia, distinta unidad) → NO agregar.
    const neighbor = isMisreadNeighbor(code, knownFamilies);
    if (neighbor) {
      base.suspectMisread.push({ code, title: seenMeta.get(code)?.title, note: `Muy parecido a ${neighbor} (misma familia, difiere en la unidad). Probable mala lectura del póster → NO agregado. Si es real, agregalo a mano.` });
      continue;
    }
    const meta = seenMeta.get(code)!;
    const cert: CanonCert = {
      code,
      title: meta.title || code,
      cloud: "Microsoft",
      area: inferArea(code),
      level: normalizeLevel(meta.level),
      status: "Nuevo",
      note: `Detectada por el sync del póster (${base.ranAt.slice(0, 10)}). Confirmada en ${counts.get(code)}/${PASSES} lecturas. Área/nivel inferidos: revisar.`,
    };
    additions.push(cert);
    base.added.push({ code, title: cert.title, level: cert.level, note: cert.note! });
    // registrar sus componentes como conocidos para no re-agregar en la misma corrida
    for (const comp of componentsOf(code)) known.add(comp);
    known.add(code);
  }

  // ── PROPONE RETIRO (reversible): canónico vigente (Activo/Nuevo/Beta) ausente del póster → candidato a "Retirada" ──
  const retirements = new Set<string>();   // normalizeCode de los candidatos; se aplican abajo solo si `applyRetirements`
  for (const c of canon) {
    const comps = componentsOf(c.code);
    const seen = comps.every((comp) => posterUnion.has(comp)) || posterUnion.has(normalizeCode(c.code));
    if (seen) continue;
    // los ya Retira/Retirada/Sustituida NO se re-marcan (el guard /retir/ cubre "Retirada" → idempotente)
    if (/retir|sustitu/i.test(c.status)) continue;
    retirements.add(normalizeCode(c.code));
    base.retired.push({
      code: c.code, title: c.title, level: String(c.level),
      note: `No aparece en el póster de esta corrida (${base.ranAt.slice(0, 10)}). Retirala con el botón si corresponde (o dejala si fue un fallo de lectura del póster).`,
    });
  }

  // ── NO confirmados (vistos 1 sola vez y desconocidos): ruido probable, solo log ──
  for (const [code, n] of counts) {
    if (n >= MAJORITY) continue;
    if (known.has(code) || componentsOf(code).some((c) => known.has(c))) continue;
    base.unconfirmed.push({ code, title: seenMeta.get(code)?.title, note: `Visto ${n}/${PASSES} lecturas — bajo umbral, ignorado (probable ruido de visión).` });
  }

  // ── aplicar SIEMPRE las altas (status "Nuevo"); los retiros solo si applyRetirements (default: propone, humano confirma) ──
  if (apply && (additions.length || (applyRetirements && retirements.size))) {
    let next: CanonCert[] = additions.length ? [...canon, ...additions] : canon;
    if (applyRetirements && retirements.size) next = next.map((c) => (retirements.has(normalizeCode(c.code)) ? { ...c, status: "Retirada" } : c));
    saveCanonicalCerts(next);
  }

  base.ok = true;
  pushLog(base);
  return base;
}
