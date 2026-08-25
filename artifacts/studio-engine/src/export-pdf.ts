import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "./render/browser-util.js";
import sharp from "sharp";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir } from "./config.js";
import { getSeed } from "./seeds.js";
import { domainIdForSeed } from "./contract/design-contract.js";
import { frameTheme } from "./render/render-infographic-page.js";
import { certMetaByEngineId } from "./certifications.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Nombre de archivo: CERT_moduloN_titulo(.ext) — legible y ordenable ──
function certSlug(): string { return CONFIG.certId.replace(/[^a-z0-9]/gi, "").toUpperCase(); }
function slug(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 44) || "pagina";
}
function moduleOf(pageId: string): string {
  const seed = getSeed(pageId);
  return seed ? `modulo${domainIdForSeed(seed).replace(/^d/, "")}` : "modulo";
}
/** Base por página: AI200_modulo1_Tags_y_digest_SHA256 */
function pageBase(pageId: string): string {
  const seed = getSeed(pageId);
  return `${certSlug()}_${moduleOf(pageId)}_${slug(seed?.title ?? pageId)}`;
}
/** Nombre del PDF ensamblado según alcance: 1 pág → base; mismo módulo → CERT_moduloN; rango → CERT_ini-fin. */
function pdfBaseName(ids: string[]): string {
  if (ids.length === 1) return pageBase(ids[0]!);
  const mods = new Set(ids.map(moduleOf));
  if (mods.size === 1) return `${certSlug()}_${[...mods][0]}`;
  const sorted = [...ids].sort();
  return `${certSlug()}_${sorted[0]}-${sorted[sorted.length - 1]}`;
}

export const SHEET_CSS = `*{margin:0;box-sizing:border-box}
body{font-family:"Segoe UI",system-ui,-apple-system,sans-serif}
.sheet{width:6in;height:9.3in;display:flex;flex-direction:column;overflow:hidden;page-break-after:always;background:#fff}
.sheet:last-child{page-break-after:auto}
/* Lámina del atlas: posicionamiento ABSOLUTO (robusto en print) — el footer va pegado al fondo, imposible de tapar. */
.sheet.atlas{position:relative;display:block}
.sheet.atlas .top{position:absolute;top:0;left:0;right:0;height:.3in;display:flex;align-items:center;gap:9px;padding:0 .18in;background:var(--frame-bg,#061B49);color:#fff;font-size:9px}
.sheet.atlas .b{background:var(--badge-bg,linear-gradient(135deg,#2563eb,#7c3aed));color:var(--badge-fg,#fff);padding:2px 6px;border-radius:4px;font-size:8px;font-weight:800;letter-spacing:.04em}
.sheet.atlas .d{font-weight:600;opacity:.95}
.sheet.atlas .bodywrap{position:absolute;top:.3in;left:0;right:0;height:8.7in;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#fff}
.sheet.atlas .bodywrap img{display:block;filter:saturate(0.85)}
.sheet.atlas .ft{position:absolute;bottom:0;left:0;right:0;height:.3in;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 .2in;background:var(--frame-bg,#061B49);color:#fff;font-size:11px;font-weight:750;z-index:2}
.sheet.atlas .ft .brand{justify-self:start;font-weight:800}.sheet.atlas .ft .series{justify-self:center;opacity:.92;font-weight:600}.sheet.atlas .ft .pgn{justify-self:end;opacity:.82;font-variant-numeric:tabular-nums}
.sheet.atlas.light .ft{display:flex;justify-content:flex-end;padding:0 .24in;background:#fff;color:#9AA3AF;font-size:9.5px;font-weight:600}
.sheet.atlas.light .ft .pgn{opacity:1;color:#9AA3AF;font-variant-numeric:tabular-nums}`;

/** Dimensiones del PNG desde el IHDR (width @16, height @20, big-endian). */
function pngSize(buf: Buffer): { w: number; h: number } {
  return { w: buf.readUInt32BE(16) || 1024, h: buf.readUInt32BE(20) || 1536 };
}

/**
 * Upscale 2× (Lanczos) + unsharp suave para des-pixelar la infografía SIN tocar
 * la calidad del modelo ni el tamaño en pulgadas: gpt-image-2 entrega 1024×1536
 * (máximo del API); a 5.8in eso es ~177 ppi y se ve pixelado al hacer zoom. Subir
 * los píxeles de la MISMA imagen a 2048×3072 (~353 ppi) la deja nítida y zoomeable.
 * El <img> sigue mostrándose a las mismas pulgadas → layout idéntico, sin cortes.
 * Si sharp fallara, devuelve el original (no rompe el ensamblado).
 */
async function upscaleSharp(buf: Buffer): Promise<Buffer> {
  try {
    const { w, h } = pngSize(buf);
    return await sharp(buf)
      .resize(w * 2, h * 2, { kernel: "lanczos3" })
      .sharpen({ sigma: 0.8, m1: 0.4, m2: 1.1 })   // unsharp suave: nitidez sin halos/ruido
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return buf;
  }
}

/**
 * Encode PNG INDEXADO/optimizado para INCRUSTAR en el PDF. Las infografías son ARTE PLANO
 * (colores sólidos, líneas, texto) → una paleta de 256 colores las representa casi sin pérdida
 * y pesa ~5-10× menos que el PNG full-color crudo. Chrome embebe el PNG tal cual (no lo
 * re-rasteriza como al JPEG) → el PDF queda chico (~30-50MB) y nítido. (Los @types de sharp
 * del proyecto no traen palette/effort → cast a any; sharp sí lo soporta en runtime.)
 */
async function inlineImageB64(buf: Buffer): Promise<string> {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Conservar la resolución NATIVA (1024px de ancho ≈ 170 ppi a 6in) + JPEG q92: el downscale a 720
  // (~120 ppi) borroneaba el PDF granular por debajo de la fuente. JPEG = render estable (el PNG palette
  // tumbaba Chrome). El libro ensamblado ya usa full-res (laminaImage); el export granual ahora también.
  try {
    const out = await (sharp(buf) as any).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
    return (out as Buffer).toString("base64");
  } catch {
    try { return (await (sharp(buf) as any).jpeg({ quality: 92 }).toBuffer()).toString("base64"); } catch { return buf.toString("base64"); }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** HTML de UNA página self-contained (header HTML + infografía inline + footer).
 *  light=true → footer fino (solo número de página, sin barra navy) para el LIBRO.
 *  withImage=false → emite SOLO el marco (banda navy + footer) con el cuerpo en BLANCO;
 *  la imagen full-res la incrusta pdf-lib en el ensamblado del libro (ver laminaImage). */
export async function buildSheet(pageId: string, light = false, part: "" | "A" | "B" = "", withImage = true): Promise<string | null> {
  const seed = getSeed(pageId);
  // Spread: una unidad densa emite 2 hojas (A = primeras 6 tarjetas; B = resto + trampas + autocheck).
  const img = path.join(pageOutputDir(pageId), `infographic${part ? `-${part}` : ""}.png`);
  if (!seed || !existsSync(img)) return null;
  let bodyInner = "";
  if (withImage) {
    const raw = await fs.readFile(img);
    const b64 = await inlineImageB64(raw);
    // Ancho/alto EXACTO en pulgadas, computado de la imagen (preserva el aspect; sin object-fit que recorta).
    const { w, h } = pngSize(raw);
    const BOX_W = 6, BOX_H = 8.7;
    const r = w / h || BOX_W / BOX_H;
    let dw = BOX_W, dh = BOX_W / r;
    if (dh > BOX_H) { dh = BOX_H; dw = BOX_H * r; }
    bodyInner = `<img style="width:${dw.toFixed(3)}in;height:${dh.toFixed(3)}in" src="data:image/jpeg;base64,${b64}"/>`;
  }
  const ft = light
    ? `<div class="ft"><span class="pgn">${esc(seed.pageNumber)}/${seed.totalPages}</span></div>`
    : `<div class="ft"><span class="brand">CloudBooks</span><span class="series">Visual Atlas</span><span class="pgn">${esc(seed.pageNumber)}/${seed.totalPages}</span></div>`;
  return `<div class="sheet atlas${light ? " light" : ""}">
    <div class="top"><span class="b">${esc(certMetaByEngineId(CONFIG.certId).code)}</span><span class="d">${esc(seed.domainLabel)}</span></div>
    <div class="bodywrap">${bodyInner}</div>
    ${ft}
  </div>`;
}

/** JPEG full-res (q88) + dimensiones nativas de una lámina, para INCRUSTAR con pdf-lib en el
 *  ensamblado del libro — sin la recompresión que hace Chrome al imprimir (nítido + liviano). */
export async function laminaImage(pageId: string, part: "" | "A" | "B" = ""): Promise<{ jpeg: Buffer; w: number; h: number } | null> {
  const img = path.join(pageOutputDir(pageId), `infographic${part ? `-${part}` : ""}.png`);
  if (!existsSync(img)) return null;
  const raw = await fs.readFile(img);
  const { w, h } = pngSize(raw);
  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const jpeg = (await (sharp(raw) as any).jpeg({ quality: 88, mozjpeg: true }).toBuffer()) as Buffer;
    return { jpeg, w, h };
  } catch { return null; }
}

function wrapDoc(sheets: string, page = true): string {
  const th = frameTheme();
  const rootVars = `:root{--frame-bg:${th.frameBg};--badge-bg:${th.badgeBg};--badge-fg:${th.badgeFg}}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>${page ? `@page{size:6in 9.3in;margin:0}` : ""}${rootVars}${SHEET_CSS}</style></head><body>${sheets}</body></html>`;
}

export type ExportFormat = "pdf" | "png" | "html";
export interface ExportResult {
  ok: boolean; format: ExportFormat; pages: number;
  pdfUrl?: string;                                // para format=pdf (un solo archivo)
  files?: { pageId: string; url: string }[];     // para png/html (uno por página)
  error?: string;
}

const EXPORT_BASE = "/assets/cloudbooks-engine/_export";

/**
 * Export granular: PDF (un archivo ensamblado), o PNG/HTML página por página
 * (self-contained, saturación -15%). Cualquier alcance de páginas (lista/tanda/todo).
 */
/** Hojas de UNA página: 1 (simple) o 2 (spread A/B, unidad densa) según lo que exista en disco. */
async function sheetsFor(id: string, light = false): Promise<{ sheet: string; suffix: string }[]> {
  if (existsSync(path.join(pageOutputDir(id), "infographic-A.png"))) {
    const [a, b] = await Promise.all([buildSheet(id, light, "A"), buildSheet(id, light, "B")]);
    return [a ? { sheet: a, suffix: "-A" } : null, b ? { sheet: b, suffix: "-B" } : null].filter((x): x is { sheet: string; suffix: string } => !!x);
  }
  const s = await buildSheet(id, light);
  return s ? [{ sheet: s, suffix: "" }] : [];
}

export async function exportBook(pageIds: string[], format: ExportFormat): Promise<ExportResult> {
  if (!CONFIG.chromePath && format !== "html") return { ok: false, format, pages: 0, error: "Sin Chrome headless." };
  // Válida = tiene infografía simple O spread (infographic-A.png). Antes filtraba solo por infographic.png → dropeaba spreads.
  const valid = pageIds.filter((id) => existsSync(path.join(pageOutputDir(id), "infographic.png")) || existsSync(path.join(pageOutputDir(id), "infographic-A.png")));
  if (!valid.length) return { ok: false, format, pages: 0, error: "No hay páginas con infografía en ese alcance." };
  const outDir = path.join(CONFIG.outputRoot, "_export");
  await fs.mkdir(outDir, { recursive: true });

  // ── HTML: un archivo self-contained por página ──
  if (format === "html") {
    const dir = path.join(outDir, "html");
    await fs.mkdir(dir, { recursive: true });
    const files: ExportResult["files"] = [];
    for (const id of valid) {
      for (const { sheet, suffix } of await sheetsFor(id)) {
        const name = pageBase(id) + suffix;
        await fs.writeFile(path.join(dir, `${name}.html`), wrapDoc(sheet, false), "utf8");
        files.push({ pageId: id, url: `${EXPORT_BASE}/html/${name}.html` });
      }
    }
    return { ok: true, format, pages: files.length, files };
  }

  const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath ?? undefined, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    // ── PDF: un solo archivo ensamblado ──
    if (format === "pdf") {
      const sheets: string[] = [];
      for (const id of valid) { for (const { sheet } of await sheetsFor(id)) sheets.push(sheet); }
      const p = await browser.newPage();
      await p.setContent(wrapDoc(sheets.join("\n")), { waitUntil: "load", timeout: 40000 });
      const name = pdfBaseName(valid);
      const file = path.join(outDir, `${name}.pdf`);
      await p.pdf({ path: file, width: "6in", height: "9.3in", printBackground: true, preferCSSPageSize: true });
      return { ok: true, format, pages: sheets.length, pdfUrl: `${EXPORT_BASE}/${name}.pdf` };
    }
    // ── PNG: un archivo por página (screenshot del sheet) ──
    const dir = path.join(outDir, "png");
    await fs.mkdir(dir, { recursive: true });
    const files: ExportResult["files"] = [];
    for (const id of valid) {
      for (const { sheet, suffix } of await sheetsFor(id)) {
        const p = await browser.newPage();
        await p.setViewport({ width: 576, height: 893, deviceScaleFactor: 2 });   // 6×9.3in @96dpi
        await p.setContent(wrapDoc(sheet, false), { waitUntil: "load", timeout: 30000 });
        const el = await p.$(".sheet");
        const name = pageBase(id) + suffix;
        if (el) { await el.screenshot({ path: path.join(dir, `${name}.png`), type: "png" }); files.push({ pageId: id, url: `${EXPORT_BASE}/png/${name}.png` }); }
        await p.close();
      }
    }
    return { ok: true, format, pages: files.length, files };
  } catch (err) {
    return { ok: false, format, pages: 0, error: String((err as Error)?.message ?? err) };
  } finally {
    await closeBrowserHard(browser);
  }
}

/** Atajo para Ensamblar libro: PDF completo. */
export async function exportBookPdf(pageIds: string[]): Promise<{ ok: boolean; url?: string; pages: number; error?: string }> {
  const r = await exportBook(pageIds, "pdf");
  return { ok: r.ok, url: r.pdfUrl, pages: r.pages, error: r.error };
}
