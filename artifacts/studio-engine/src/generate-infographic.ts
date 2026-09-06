import fs from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG, pageOutputDir, pagePublicBase } from "./config.js";
import type { PageSeed } from "./types.js";
import { getSeed } from "./seeds.js";
import { atomicWriteFile } from "./fs-safe.js";
import { recordSpend } from "./cost.js";
import { buildInfographicPrompt, isSpread, type InfographicPart } from "./image/build-infographic-prompt.js";
import { generateUpperVisual } from "./image/generate-upper-visual.js";
import { infographicQa, type InfographicQa } from "./image/infographic-qa.js";
import { renderInfographicPage, renderInfographicSpread } from "./render/render-infographic-page.js";
import { writeThumb } from "./image/thumb.js";

// Ancla de estilo PER-CERT+FORMATO (no global). Antes vivía en CONFIG.outputRoot y era
// compartida por todos los libros → el master del AB-620 se filtró al AI-300 (láminas con
// estilo ajeno + página 01 fría). Ahora cada libro tiene su propia ancla bajo su carpeta.
const bookRoot = (): string => path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format);
const anchorImgPath = (): string => path.join(bookRoot(), "_style-anchor.png");
const anchorMetaPath = (): string => path.join(bookRoot(), "_style-anchor.json");

/** Fija una página aprobada como MASTER de estilo (ancla). Las demás heredan su look. */
export async function setStyleAnchor(pageId: string): Promise<{ ok: boolean; masterPageId?: string }> {
  const src = path.join(pageOutputDir(pageId), "infographic.png");
  if (!existsSync(src)) return { ok: false };
  await fs.mkdir(bookRoot(), { recursive: true });
  await fs.copyFile(src, anchorImgPath());
  await atomicWriteFile(anchorMetaPath(), JSON.stringify({ masterPageId: pageId, at: new Date().toISOString() }, null, 2), "style-anchor");
  return { ok: true, masterPageId: pageId };
}

function loadAnchor(): { buffer: Buffer; masterPageId: string } | null {
  if (!CONFIG.styleAnchorEnabled) return null;
  try {
    if (!existsSync(anchorImgPath()) || !existsSync(anchorMetaPath())) return null;
    const meta = JSON.parse(readFileSync(anchorMetaPath(), "utf8")) as { masterPageId?: string };
    return { buffer: readFileSync(anchorImgPath()), masterPageId: String(meta.masterPageId ?? "") };
  } catch { return null; }
}

export interface InfographicResult {
  pageId: string;
  mode: "infographic";
  outcome: "real" | "reused" | "needs_review" | "no_key" | "capped" | "failed";
  imageUrl: string | null;
  htmlPath: string | null;
  attempts: number;
  reused: boolean;
  costUsd: number;
  qa: InfographicQa | null;
  contentHash: string;
  error: string | null;
}

/**
 * MOTOR DE INFOGRAFÍA (image-2 dibuja el cuerpo, HTML el header/footer):
 * grounding(verdad) → contrato+contenido → image-2 → QA de visión a ciegas vs
 * verdad → (re-roll si falla) → render HTML → persiste imagen + page.html +
 * MANIFIESTO (reproducibilidad). La aprobación humana sigue siendo el gate final.
 */
/** Resultado de generar UNA imagen (single, o una parte A/B de un spread). */
type PartResult = {
  part: InfographicPart; outcome: InfographicResult["outcome"]; attempts: number; costUsd: number;
  qa: InfographicQa | null; reused: boolean; imageUrl: string; contentHash: string; error: string | null;
};

/** Genera UNA imagen (single | A | B): prompt por parte, idempotencia/manifest/thumb por parte. */
async function generateImagePart(seed: PageSeed, pageId: string, dir: string, publicBase: string, part: InfographicPart, force: boolean, extraRefs?: Buffer[]): Promise<PartResult> {
  const suffix = part === "single" ? "" : `-${part}`;
  const imgFile = path.join(dir, `infographic${suffix}.png`);
  const imageUrl = `${publicBase}/infographic${suffix}.png`;
  const manifestFile = path.join(dir, `infographic${suffix}.json`);
  const thumbName = `thumb${suffix}.webp`;

  const anchor = loadAnchor();
  const useAnchor = !!anchor && anchor.masterPageId !== pageId;
  const hasPageRef = (extraRefs?.length ?? 0) > 0; // ref extra = página A de ESTE spread (para que B copie su título/encuadre exacto)
  const { prompt: basePrompt, promptVersion } = buildInfographicPrompt(seed, part);
  // Orden de imágenes adjuntas = [anchor?, ...extraRefs]. El prompt las nombra por ese orden.
  const refClauses: string[] = [];
  if (useAnchor) refClauses.push(`The ${hasPageRef ? "FIRST" : ""} attached image is a STYLE SAMPLE ONLY. COPY its visual style — palette, icon style and stroke weight, numbered badges, card borders and corner radius, title color, band header icons, guide pin and typography. But IGNORE its text, tables and specific content ENTIRELY: do NOT reproduce, copy or carry over ANY table, label, number or data from it. Render ONLY the content specified in the page spec above. If a section is not a comparison, do NOT add a table just because it had one.`);
  if (hasPageRef) refClauses.push(`The ${useAnchor ? "SECOND" : ""} attached image is PAGE 1 of THIS SAME two-page spread. Reproduce its TITLE BAR EXACTLY — same font family, same WEIGHT (do NOT render it bolder, heavier or larger), same size and cap-height, same deep-navy color, same badge style. Match its overall container treatment: if page 1 has NO outer frame/border enclosing the cards, do NOT draw one either. Copy ONLY its title bar and framing — NOT its specific card content.`);
  const prompt = refClauses.length ? `${basePrompt}\n\nREFERENCE IMAGES (CRITICAL): ${refClauses.join(" ")}` : basePrompt;
  const refBuffers = [...(useAnchor ? [anchor!.buffer] : []), ...(extraRefs ?? [])];
  const pageRefHash = hasPageRef ? crypto.createHash("sha256").update(Buffer.concat(extraRefs!)).digest("hex").slice(0, 8) : "";
  const contentHash = crypto.createHash("sha256").update(prompt + (useAnchor ? `|anchor:${anchor!.masterPageId}` : "") + (hasPageRef ? `|pref:${pageRefHash}` : "")).digest("hex").slice(0, 16);

  // Idempotencia POR PARTE: misma verdad + mismo contrato + imagen en disco → reusar (sin gasto).
  if (!force && existsSync(imgFile) && existsSync(manifestFile)) {
    try {
      const prev = JSON.parse(readFileSync(manifestFile, "utf8")) as { contentHash?: string; qa?: InfographicQa };
      if (prev.contentHash === contentHash) {
        return { part, outcome: "reused", attempts: 0, costUsd: 0, qa: prev.qa ?? null, reused: true, imageUrl, contentHash, error: null };
      }
    } catch { /* manifiesto ilegible → regenerar */ }
  }

  const maxRolls = Math.max(0, CONFIG.infographicMaxRerolls) + 1;
  let buffer: Buffer | null = null;
  let qa: InfographicQa | null = null;
  let attempts = 0;
  let costUsd = 0;
  let currentPrompt = prompt;
  for (let roll = 0; roll < maxRolls; roll++) {
    const res = await generateUpperVisual(currentPrompt, { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, refImages: refBuffers.length ? refBuffers : undefined });
    attempts++;
    if (res.outcome !== "real" || !res.buffer) {
      if (res.outcome === "no_key" || res.outcome === "capped") return { part, outcome: res.outcome, attempts, costUsd, qa: null, reused: false, imageUrl: "", contentHash, error: res.error };
      if (!buffer) return { part, outcome: "failed", attempts, costUsd, qa: null, reused: false, imageUrl: "", contentHash, error: res.error };
      break;
    }
    costUsd += res.costUsd;
    recordSpend({ kind: "image", model: CONFIG.imageModel, costUsd: res.costUsd, pageId, label: `infographic${suffix}` });
    const q = await infographicQa(res.buffer, seed, part);
    buffer = res.buffer; qa = q;
    if (!q.ran || q.ok) break;
    currentPrompt = `${prompt}\n\n${q.correctiveHint}`;
  }
  if (!buffer) return { part, outcome: "failed", attempts, costUsd, qa, reused: false, imageUrl: "", contentHash, error: "sin imagen" };
  const stillCritical = !!qa && qa.criticalFailures.length > 0;
  const outcome: InfographicResult["outcome"] = stillCritical ? "needs_review" : "real";

  await fs.writeFile(imgFile, buffer);
  await writeThumb(dir, buffer, thumbName);
  const manifest = {
    pageId, part, mode: "infographic", outcome, generatedAt: new Date().toISOString(),
    promptVersion, model: CONFIG.imageModel, size: CONFIG.infographicSize, quality: CONFIG.infographicQuality,
    anchored: useAnchor, anchorMaster: useAnchor ? anchor!.masterPageId : null,
    contentHash, attempts, costUsd, qa, prompt,
  };
  await atomicWriteFile(manifestFile, JSON.stringify(manifest, null, 2), `infographic-manifest${suffix}`);
  return { part, outcome, attempts, costUsd, qa, reused: false, imageUrl, contentHash, error: null };
}

/** Escribe el manifiesto COMBINADO (infographic.json) de un spread, leyendo el resultado de A y B. */
async function writeCombinedManifest(pageId: string, dir: string, publicBase: string, a: { outcome: string; qa: InfographicQa | null; costUsd: number; attempts: number; contentHash: string }, b: { outcome: string; qa: InfographicQa | null; costUsd: number; attempts: number; contentHash: string }): Promise<InfographicResult> {
  const failed = a.outcome === "failed" || b.outcome === "failed";
  const review = a.outcome === "needs_review" || b.outcome === "needs_review";
  const outcome: InfographicResult["outcome"] = failed ? "failed" : review ? "needs_review" : (a.outcome === "reused" && b.outcome === "reused" ? "reused" : "real");
  const qaOk = (a.qa?.ok ?? false) && (b.qa?.ok ?? false);
  const critical = [...(a.qa?.criticalFailures ?? []), ...(b.qa?.criticalFailures ?? [])];
  const combinedQa = (a.qa || b.qa) ? ({ ...(a.qa ?? b.qa), ok: qaOk, criticalFailures: critical } as InfographicQa) : null;
  const costUsd = Math.round((a.costUsd + b.costUsd) * 100) / 100;
  const attempts = a.attempts + b.attempts;
  const contentHash = crypto.createHash("sha256").update(`${a.contentHash}|${b.contentHash}`).digest("hex").slice(0, 16);
  const imageUrl = `${publicBase}/infographic-A.png`;
  const manifest = {
    pageId, mode: "infographic", spread: true, outcome, generatedAt: new Date().toISOString(),
    promptVersion: CONFIG.infographicPromptVersion, model: CONFIG.imageModel,
    contentHash, attempts, costUsd, qa: combinedQa, imageUrl, parts: { A: a.contentHash, B: b.contentHash },
  };
  await atomicWriteFile(path.join(dir, "infographic.json"), JSON.stringify(manifest, null, 2), "infographic-manifest");
  return { pageId, mode: "infographic", outcome, imageUrl, htmlPath: `${publicBase}/page.html`, attempts, reused: outcome === "reused", costUsd, qa: combinedQa, contentHash, error: failed ? "spread incompleto" : null };
}

/** Reconstruye infographic.json (combinado) leyendo los manifiestos -A/-B del disco (tras regenerar una sola parte). */
async function rebuildSpreadManifest(pageId: string, dir: string, publicBase: string): Promise<void> {
  const read = (p: string) => { try { return JSON.parse(readFileSync(path.join(dir, p), "utf8")) as PartResult & { outcome: string }; } catch { return null; } };
  const ma = read("infographic-A.json"); const mb = read("infographic-B.json");
  if (!ma || !mb) return;
  await writeCombinedManifest(pageId, dir, publicBase, ma, mb);
}

/**
 * MOTOR DE INFOGRAFÍA. Una unidad NORMAL (≤6 ejes) → 1 imagen (infographic.png). Una unidad
 * DENSA (spread, ≥CONFIG.spreadMinModules ejes) → 2 imágenes (infographic-A/-B.png) + page.html
 * apilado + manifiesto combinado infographic.json. `part` fuerza generar solo una parte.
 */
export async function generateInfographicPage(pageId: string, force = false, part?: InfographicPart): Promise<InfographicResult> {
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);
  const dir = pageOutputDir(pageId);
  await fs.mkdir(dir, { recursive: true });
  const publicBase = pagePublicBase(pageId);

  // SPREAD (unidad densa) sin parte explícita → generar A y B.
  if (!part && isSpread(seed)) {
    const a = await generateImagePart(seed, pageId, dir, publicBase, "A", force);
    // B usa la imagen de A como 2ª referencia → título con el MISMO peso/tamaño y sin marco distinto.
    let pageARef: Buffer[] | undefined;
    try { const aFile = path.join(dir, "infographic-A.png"); if (existsSync(aFile)) pageARef = [readFileSync(aFile)]; } catch { /* sin ref de A → B cae al comportamiento previo */ }
    const b = await generateImagePart(seed, pageId, dir, publicBase, "B", force, pageARef);
    const urlA = `${publicBase}/infographic-A.png`, urlB = `${publicBase}/infographic-B.png`;
    await atomicWriteFile(path.join(dir, "page.html"), renderInfographicSpread(seed, urlA, urlB), "page.html");
    return writeCombinedManifest(pageId, dir, publicBase, a, b);
  }

  const which: InfographicPart = part ?? (isSpread(seed) ? "A" : "single");
  const r = await generateImagePart(seed, pageId, dir, publicBase, which, force);
  if (which === "single") {
    await atomicWriteFile(path.join(dir, "page.html"), renderInfographicPage(seed, `${publicBase}/infographic.png`), "page.html");
  } else {
    await atomicWriteFile(path.join(dir, "page.html"), renderInfographicSpread(seed, `${publicBase}/infographic-A.png`, `${publicBase}/infographic-B.png`), "page.html");
    await rebuildSpreadManifest(pageId, dir, publicBase);
  }
  return { pageId, mode: "infographic", outcome: r.outcome, imageUrl: r.imageUrl || null, htmlPath: `${publicBase}/page.html`, attempts: r.attempts, reused: r.reused, costUsd: r.costUsd, qa: r.qa, contentHash: r.contentHash, error: r.error };
}

export interface InfographicManifest {
  pageId: string; outcome?: string; attempts?: number; costUsd?: number;
  qa?: InfographicQa | null; generatedAt?: string; anchored?: boolean; anchorMaster?: string | null;
  promptVersion?: string; imageUrl?: string; model?: string; contentHash?: string;
  spread?: boolean; parts?: { A: string; B: string };
}

/** Lee el manifiesto de reproducibilidad de una página (o null si no existe). Spread → infographic.json combinado. */
export function getInfographicManifest(pageId: string): InfographicManifest | null {
  try {
    const f = path.join(pageOutputDir(pageId), "infographic.json");
    if (!existsSync(f)) return null;
    const m = JSON.parse(readFileSync(f, "utf8")) as InfographicManifest;
    // Inferir outcome para manifiestos antiguos que no lo guardaban.
    const outcome = m.outcome ?? (m.qa ? (m.qa.criticalFailures?.length ? "needs_review" : "real") : "real");
    const imageUrl = m.spread ? `${pagePublicBase(pageId)}/infographic-A.png` : `${pagePublicBase(pageId)}/infographic.png`;
    return { ...m, outcome, pageId, imageUrl };
  } catch { return null; }
}

export interface InfographicBatchResult {
  pages: { pageId: string; outcome: string; attempts: number; costUsd: number; ok: boolean }[];
  totalCostUsd: number; ready: number; needsReview: number; failed: number;
}

/** Corre el motor de infografía sobre una lista de páginas (Runs/lote). */
export async function runInfographicBatch(pageIds: string[], force = false): Promise<InfographicBatchResult> {
  const pages: InfographicBatchResult["pages"] = [];
  for (const id of pageIds) {
    try {
      const r = await generateInfographicPage(id, force);
      pages.push({ pageId: id, outcome: r.outcome, attempts: r.attempts, costUsd: r.costUsd, ok: r.qa?.ok ?? false });
    } catch (err) {
      pages.push({ pageId: id, outcome: "failed", attempts: 0, costUsd: 0, ok: false });
      void err;
    }
  }
  const totalCostUsd = Math.round(pages.reduce((s, p) => s + p.costUsd, 0) * 100) / 100;
  const ready = pages.filter((p) => p.outcome === "real" || p.outcome === "reused").length;
  const needsReview = pages.filter((p) => p.outcome === "needs_review").length;
  const failed = pages.filter((p) => p.outcome === "failed").length;
  return { pages, totalCostUsd, ready, needsReview, failed };
}

export interface InfographicStats {
  total: number; ready: number; needsReview: number; reused: number;
  avgAttempts: number; rerolls: number; totalCostUsd: number;
  pages: { pageId: string; outcome?: string; attempts?: number; costUsd?: number; ok?: boolean }[];
}

/** Agrega los manifiestos de todas las páginas con infografía (para el dashboard). */
export function getInfographicStats(): InfographicStats {
  const pagesRoot = path.dirname(pageOutputDir("01"));
  let ids: string[] = [];
  try { ids = readdirSync(pagesRoot).filter((d) => existsSync(path.join(pagesRoot, d, "infographic.json"))); } catch { /* sin dir */ }
  const mans = ids.map(getInfographicManifest).filter((m): m is InfographicManifest => !!m);
  const total = mans.length;
  const ready = mans.filter((m) => m.outcome === "real" || m.outcome === "reused").length;
  const needsReview = mans.filter((m) => m.outcome === "needs_review").length;
  const reused = mans.filter((m) => m.outcome === "reused").length;
  const totalAttempts = mans.reduce((s, m) => s + (m.attempts ?? 0), 0);
  const avgAttempts = total ? Math.round((totalAttempts / total) * 10) / 10 : 0;
  const rerolls = mans.reduce((s, m) => s + Math.max(0, (m.attempts ?? 1) - 1), 0);
  const totalCostUsd = Math.round(mans.reduce((s, m) => s + (m.costUsd ?? 0), 0) * 100) / 100;
  const pages = mans.map((m) => ({ pageId: m.pageId, outcome: m.outcome, attempts: m.attempts, costUsd: m.costUsd, ok: m.qa?.ok }))
    .sort((a, b) => a.pageId.localeCompare(b.pageId));
  return { total, ready, needsReview, reused, avgAttempts, rerolls, totalCostUsd, pages };
}
