import { existsSync } from "node:fs";
import path from "node:path";
import { getSeed, listSeeds } from "./seeds.js";
import { pageOutputDir } from "./config.js";
import { premiumVerdict } from "./premium-verdict.js";
import { getProvenance } from "./page-store.js";
import { getEditorial } from "./editorial-store.js";
import { getRelevanceForPage } from "./grounding/relevance-store.js";
import { getBookIssues } from "./book/book-review-store.js";
import { getInfographicManifest, getInfographicStats } from "./generate-infographic.js";
import { getApprovals } from "./infographic-approvals.js";
import type { PremiumVerdictKind } from "./types.js";

/**
 * COCKPIT DE QA: TODA señal de los agentes converge acá, agrupada en 4 dimensiones
 * (Fidelidad, Calidad, Consistencia, Reproducibilidad) + un ESTADO OPERATIVO y una
 * PRÓXIMA ACCIÓN que guían la operatoria. Es 100% read-only (no gasta LLM): solo
 * agrega lo que ya calcularon `premiumVerdict`, los manifests y los stores.
 */

export type DimStatus = "ok" | "warn" | "bad" | "pending";
export type OperationalStatus =
  | "lista" | "por_aprobar" | "regenerar" | "generar" | "revisar_contenido" | "bloqueada" | "reaprobar";
export type ActionTarget = "grounding" | "contenido" | "generar" | "qa" | "aprobaciones";
export interface NextAction { label: string; target: ActionTarget }
export interface QaDimension { score: number | null; status: DimStatus; label: string; detail: string[] }

export interface QaDossier {
  pageId: string; pageNumber: string; title: string;
  operationalStatus: OperationalStatus;
  nextAction: NextAction;
  verdict: PremiumVerdictKind; combinedScore: number;
  hasImage: boolean; imageQaOk: boolean | null; needsRegen: boolean;
  approved: boolean; approvalStale: boolean;
  cost: { attempts: number | null; costUsd: number | null };
  dimensions: { fidelidad: QaDimension; calidad: QaDimension; consistencia: QaDimension; reproducibilidad: QaDimension };
}

const STATUS_LABEL: Record<OperationalStatus, string> = {
  lista: "Lista para el libro", por_aprobar: "Por aprobar", regenerar: "Regenerar imagen",
  generar: "Generar imagen", revisar_contenido: "Revisar contenido", bloqueada: "Bloqueada", reaprobar: "Reaprobar",
};

/** ¿`a` posterior a `b`? (ISO; falta alguna → false). */
function isAfter(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ta = Date.parse(a), tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta > tb;
}
function clamp10(n: number): number { return Math.max(0, Math.min(10, Math.round(n * 10) / 10)); }

/** Dossier de UNA página: las 4 dimensiones + estado + próxima acción (read-only). */
export async function pageQaDossier(pageId: string): Promise<QaDossier> {
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);
  const v = await premiumVerdict(pageId);
  const prov = getProvenance(pageId);
  const rel = prov ? getRelevanceForPage(prov.skillIds) : null;
  const ed = getEditorial(pageId);
  const bookIssues = getBookIssues(pageId);
  const manifest = getInfographicManifest(pageId);
  const qa = manifest?.qa ?? null;
  const hasImage = existsSync(path.join(pageOutputDir(pageId), "infographic.png"));
  const imageQaOk = qa ? qa.ok : null;
  const contentUpdatedAt = prov?.updatedAt ?? null;
  const imageGeneratedAt = manifest?.generatedAt ?? null;
  const appr = getApprovals().pages[pageId];
  const approved = appr?.approved ?? false;
  const needsRegen = hasImage && isAfter(contentUpdatedAt, imageGeneratedAt);
  const approvalStale = approved && isAfter(contentUpdatedAt, appr?.at ?? null);

  // ── FIDELIDAD: grounding (verdad) + fidelidad de imagen (dibuja lo que dice el texto) ──
  const g = v.groundingStatus;
  const groundingScore = g === "verified" ? 10 : g === "partial" || g === "authored" ? 7 : g === "unverified" ? 3 : 6;
  const fidelityIssues: string[] = Array.isArray(qa?.fidelityIssues) ? qa!.fidelityIssues : [];
  const contentBleed = qa?.contentBleed === true;
  const byZone: Record<string, { sup: number; tot: number }> = {};
  for (const c of prov?.checks ?? []) { const k = c.field; (byZone[k] ??= { sup: 0, tot: 0 }).tot++; if (c.verdict === "supported") byZone[k]!.sup++; }
  const citedClaims = (prov?.claims ?? []).filter((c) => c.citation.kind === "source").length;
  const fidStatus: DimStatus = g === "unverified" || contentBleed ? "bad"
    : g === "verified" && fidelityIssues.length === 0 ? "ok" : "warn";
  const fidScore = clamp10(groundingScore - (contentBleed ? 6 : 0) - (fidelityIssues.length ? 2 : 0));
  const fidelidad: QaDimension = {
    score: fidScore, status: fidStatus,
    label: g === "verified" ? (fidelityIssues.length ? "Verificado, pero la imagen agrega elementos" : "Verificado y fiel") : `Grounding ${g ?? "seeded"}`,
    detail: [
      `Grounding: ${g ?? "seeded"} · ${citedClaims} claim(s) de fuente`,
      ...Object.entries(byZone).map(([k, x]) => `Zona ${k}: ${x.sup}/${x.tot} verificada(s)`),
      contentBleed ? "⚠ Imagen con contenido de otra página (bleed)" : "",
      ...fidelityIssues.map((f) => `⚠ Imagen infiel — ${f}`),
    ].filter(Boolean),
  };

  // ── CALIDAD: QA editorial (5 sub-scores) + relevancia/cobertura ──
  const relStatus = rel?.status ?? null;
  const calStatus: DimStatus = !ed ? "pending"
    : ed.verdict === "revise" || relStatus === "off_topic" ? "bad"
    : relStatus === "thin" || !relStatus ? "warn"
    : ed.verdict === "approve" && relStatus === "sufficient" ? "ok" : "warn";
  const calidad: QaDimension = {
    score: ed?.overall ?? null, status: calStatus,
    label: !ed ? "Editorial pendiente" : ed.verdict === "approve" ? `Editorial aprobado (${ed.overall}/10)` : `Editorial pide revisión (${ed.overall}/10)`,
    detail: [
      ed ? `Editorial: ${ed.verdict} · overall ${ed.overall}/10` : "Editorial: sin evaluar (corré 'Evaluar editorial')",
      ...(ed?.scores ? Object.entries(ed.scores).map(([k, val]) => `· ${k}: ${val}/10`) : []),
      ...(ed?.findings ?? []).map((f) => `⚠ ${f}`),
      rel ? `Relevancia: ${rel.status} · score ${rel.score ?? "?"}/10` : "Relevancia: sin evaluar",
      ...((rel?.gaps ?? []).map((gp) => `· brecha: ${gp}`)),
    ].filter(Boolean),
  };

  // ── CONSISTENCIA: conformidad de la imagen (estilo/contrato visual) + libro ──
  const critical: string[] = Array.isArray(qa?.criticalFailures) ? qa!.criticalFailures.filter((x: string) => !/filtrad|bleed/i.test(x)) : [];
  const styleF: string[] = Array.isArray(qa?.styleFailures) ? qa!.styleFailures.filter((x: string) => !/infidelidad/i.test(x)) : [];
  const advisory: string[] = Array.isArray(qa?.advisory) ? qa!.advisory : [];
  const conStatus: DimStatus = !hasImage ? "pending"
    : critical.length > 0 ? "bad"
    : styleF.length > 0 || advisory.length > 0 || bookIssues.length > 0 ? "warn" : "ok";
  const conScore = !hasImage ? null : clamp10(10 - critical.length * 4 - styleF.length * 1.5 - advisory.length * 0.5 - bookIssues.length);
  const consistencia: QaDimension = {
    score: conScore, status: conStatus,
    label: !hasImage ? "Sin imagen" : conStatus === "ok" ? "Imagen conforme al contrato" : critical.length ? "Falla crítica de imagen" : "Desvíos de estilo",
    detail: [
      ...critical.map((x) => `⚠ crítico: ${x}`),
      ...styleF.map((x) => `· estilo: ${x}`),
      ...advisory.map((x) => `· menor: ${x}`),
      ...bookIssues.map((b) => `· libro (${b.type}): ${b.detail}`),
      !hasImage ? "La página todavía no se generó." : (critical.length + styleF.length + advisory.length + bookIssues.length === 0 ? "Sin desvíos." : ""),
    ].filter(Boolean),
  };

  // ── REPRODUCIBILIDAD: manifest (auditable) + frescura (imagen vs contenido/aprobación) ──
  const repStatus: DimStatus = !manifest ? "pending" : needsRegen || approvalStale ? "warn" : "ok";
  const repScore = !manifest ? null : clamp10(needsRegen ? 5 : approvalStale ? 7 : 10);
  const reproducibilidad: QaDimension = {
    score: repScore, status: repStatus,
    label: !manifest ? "Sin manifest (no generada)" : needsRegen ? "Imagen desactualizada" : approvalStale ? "Aprobación anterior a la imagen" : "Reproducible y al día",
    detail: manifest ? [
      `Generada: ${manifest.generatedAt ?? "?"} · ${manifest.attempts ?? 0} intento(s)`,
      `Modelo: ${manifest.model ?? "?"} · prompt ${manifest.promptVersion ?? "?"}`,
      `contentHash: ${(manifest.contentHash ?? "").slice(0, 12)}${manifest.anchored ? ` · ancla: ${manifest.anchorMaster}` : ""}`,
      needsRegen ? "⚠ El contenido cambió tras generar la imagen → regenerar" : "",
      approvalStale ? "⚠ Aprobada sobre contenido viejo → reaprobar" : "",
    ].filter(Boolean) : ["Todavía no se generó la infografía."],
  };

  // ── ESTADO OPERATIVO + PRÓXIMA ACCIÓN (precedencia: contenido → imagen → aprobación) ──
  let operationalStatus: OperationalStatus;
  let nextAction: NextAction;
  if (v.verdict === "blocked") { operationalStatus = "bloqueada"; nextAction = { label: "Re-groundear / curar fuente", target: "grounding" }; }
  else if (v.verdict === "needs_human_art") {
    operationalStatus = "revisar_contenido";
    if (g !== "verified") nextAction = { label: "Re-groundear", target: "grounding" };
    else if (relStatus !== "sufficient") nextAction = { label: "Mejorar relevancia", target: "grounding" };
    else nextAction = { label: ed ? "Auto-revisar editorial" : "Evaluar editorial", target: "qa" };
  }
  else if (!hasImage) { operationalStatus = "generar"; nextAction = { label: "Generar imagen", target: "generar" }; }
  else if (needsRegen || imageQaOk === false) { operationalStatus = "regenerar"; nextAction = { label: "Regenerar imagen", target: "generar" }; }
  else if (approved && approvalStale) { operationalStatus = "reaprobar"; nextAction = { label: "Reaprobar", target: "aprobaciones" }; }
  else if (!approved) { operationalStatus = "por_aprobar"; nextAction = { label: "Aprobar", target: "aprobaciones" }; }
  else { operationalStatus = "lista"; nextAction = { label: "Lista ✓", target: "qa" }; }

  return {
    pageId, pageNumber: seed.pageNumber, title: seed.title,
    operationalStatus, nextAction, verdict: v.verdict, combinedScore: v.combinedScore,
    hasImage, imageQaOk, needsRegen, approved, approvalStale,
    cost: { attempts: manifest?.attempts ?? null, costUsd: manifest?.costUsd ?? null },
    dimensions: { fidelidad, calidad, consistencia, reproducibilidad },
  };
}

export interface DimHealth { ok: number; warn: number; bad: number; pending: number }
export interface WorklistItem { pageId: string; pageNumber: string; title: string; operationalStatus: OperationalStatus; statusLabel: string; nextAction: NextAction; combinedScore: number }
export interface QaRollup {
  total: number;
  byStatus: Record<OperationalStatus, number>;
  dimensions: { fidelidad: DimHealth; calidad: DimHealth; consistencia: DimHealth; reproducibilidad: DimHealth };
  cost: { totalUsd: number; rerolls: number };
  worklist: WorklistItem[];
}

const STATUS_SEVERITY: OperationalStatus[] = ["bloqueada", "revisar_contenido", "generar", "regenerar", "reaprobar", "por_aprobar", "lista"];

/** Rollup operativo sobre TODAS las páginas persistidas: estados + salud por dimensión + worklist. */
// Cache TTL + dedupe de promesa en vuelo: el rollup recorre las 98 páginas y por cada una
// corre premiumVerdict + re-lee varios stores (~16s con el libro completo). El estudio lo
// pide al abrir; cachear hace que cargas concurrentes compartan un cómputo y las repetidas
// sean instantáneas; se refresca tras unos segundos (y el frontend recarga tras cada acción).
let _rollupCache: { p: Promise<QaRollup>; exp: number } | null = null;
const ROLLUP_TTL_MS = 30000;  // > tiempo de build (~10s) para que cargas seguidas peguen cache
export function qaCockpitRollup(): Promise<QaRollup> {
  const now = Date.now();
  if (_rollupCache && now < _rollupCache.exp) return _rollupCache.p;
  const p = qaCockpitRollupUncached();
  _rollupCache = { p, exp: now + ROLLUP_TTL_MS };
  p.catch(() => { if (_rollupCache?.p === p) _rollupCache = null; });
  return p;
}
async function qaCockpitRollupUncached(): Promise<QaRollup> {
  const seeds = listSeeds();
  const byStatus: Record<OperationalStatus, number> = { lista: 0, por_aprobar: 0, regenerar: 0, generar: 0, revisar_contenido: 0, bloqueada: 0, reaprobar: 0 };
  const dims = { fidelidad: blankHealth(), calidad: blankHealth(), consistencia: blankHealth(), reproducibilidad: blankHealth() };
  const worklist: WorklistItem[] = [];
  for (const seed of seeds) {
    const d = await pageQaDossier(seed.pageId);
    byStatus[d.operationalStatus]++;
    dims.fidelidad[d.dimensions.fidelidad.status]++;
    dims.calidad[d.dimensions.calidad.status]++;
    dims.consistencia[d.dimensions.consistencia.status]++;
    dims.reproducibilidad[d.dimensions.reproducibilidad.status]++;
    if (d.operationalStatus !== "lista") {
      worklist.push({ pageId: d.pageId, pageNumber: d.pageNumber, title: d.title, operationalStatus: d.operationalStatus, statusLabel: STATUS_LABEL[d.operationalStatus], nextAction: d.nextAction, combinedScore: d.combinedScore });
    }
  }
  worklist.sort((a, b) => STATUS_SEVERITY.indexOf(a.operationalStatus) - STATUS_SEVERITY.indexOf(b.operationalStatus) || a.pageNumber.localeCompare(b.pageNumber));
  const stats = getInfographicStats();
  return { total: seeds.length, byStatus, dimensions: dims, cost: { totalUsd: stats.totalCostUsd, rerolls: stats.rerolls }, worklist };
}
function blankHealth(): DimHealth { return { ok: 0, warn: 0, bad: 0, pending: 0 }; }
