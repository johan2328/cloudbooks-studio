import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CONFIG, pageOutputDir, domainOutputDir } from "../config.js";
import { getBookConfig } from "./book-config.js";
import { renderToPdf, TEXT_OVERRIDE, balanceFigures } from "./assemble-book.js";
import { buildChapterBody, chapterCss, solutionRows } from "./render-chapter.js";
import { generateChapterDivider } from "./chapter-divider-gen.js";
import { generatePartOpener } from "./part-opener-gen.js";
import { listPersistedChapters } from "../chapter-store.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { certMetaByEngineId } from "../certifications.js";
import { chapterHeading } from "./chapter-heading.js";

/**
 * ENSAMBLAJE POR RUTA (net-new). Renderiza UNA ruta completa como un cuadernillo: hoja de ruta
 * (abre-parte) + [divisor de imagen | opener de texto] + cuerpo por cada capítulo de la ruta, con
 * FOLIOS CONTINUOS (los divisores/aperturas sin folio). El CAPSTONE (chapterNumber "99") queda
 * ÚLTIMO. NO lleva front/back matter ni índice — es la ruta sola, para revisarla como unidad.
 * Reusa los mismos helpers que el libro completo (mismo estilo, mismos folios) → cero drift visual.
 */
const PAGE_W = 6 * 72;
const PAGE_H = 9.3 * 72;
const FOLIO_RGB = rgb(0.55, 0.6, 0.66);
const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface AssembleRouteResult { ok: boolean; url?: string; path?: string; pages?: number; chapters?: number; error?: string }

export async function assembleRoutePdf(domainId: string): Promise<AssembleRouteResult> {
  if (!CONFIG.chromePath) return { ok: false, error: "Sin Chrome headless: no se puede ensamblar." };
  const dom = getOutline().domains.find((d) => d.id === domainId);
  if (!dom) return { ok: false, error: `ruta_desconocida:${domainId}` };

  // Capítulos de la ruta, ordenados por chapterNumber; el CAPSTONE siempre queda ÚLTIMO (no por su número,
  // que ahora es el siguiente de la ruta —06—, sino por ser capstone), vía el comparador.
  const isCap = (c: { seed: { moduleId: string } }): boolean => c.seed.moduleId.startsWith("capstone-");
  const chapters = listPersistedChapters()
    .filter((c) => c.seed.domainId === domainId)
    .sort((a, b) => (isCap(a) ? 1 : 0) - (isCap(b) ? 1 : 0) || (a.seed.chapterNumber || "").localeCompare(b.seed.chapterNumber || "", undefined, { numeric: true }));
  if (chapters.length === 0) return { ok: false, error: "La ruta no tiene capítulos persistidos." };

  const cfg = getBookConfig();
  const accent = cfg.style.accent || "#2563EB";
  const CH_CSS = chapterCss(accent);
  const mCode = certMetaByEngineId(CONFIG.certId).code;

  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);

  interface Seg { folio: boolean; buf?: Buffer; img?: string }
  const segs: Seg[] = [];

  const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath ?? undefined, headless: true, args: ["--no-sandbox", "--disable-gpu"], protocolTimeout: 300000 });
  try {
    const render = (html: string, margin = ".6in .55in"): Promise<Buffer> => renderToPdf(browser, html, margin, `${TEXT_OVERRIDE}${CH_CSS}`, cfg);

    // Hoja de ruta (abre-parte) — imagen; se genera si falta (best-effort).
    const popath = path.join(domainOutputDir(domainId), "part-opener.png");
    if (!existsSync(popath)) { try { await generatePartOpener(domainId); } catch { /* best-effort */ } }
    if (existsSync(popath)) segs.push({ folio: false, img: popath });

    for (const ch of chapters) {
      const c = ch.seed;
      // Portadilla = MISMO divisor de imagen AI del master (olas + badge/título/regla/intro pintados por el
      // modelo), unificado con assemble-master-book → portadilla idéntica en el cuadernillo de ruta y en el libro.
      // (Se retiró renderPortadilla: la portadilla CSS quedó descartada por diseño.)
      const dpath = path.join(pageOutputDir(c.chapterId), "divider.png");
      if (!existsSync(dpath)) { try { await generateChapterDivider(c.chapterId); } catch { /* best-effort: cae al opener de texto */ } }
      if (existsSync(dpath)) segs.push({ folio: false, img: dpath });
      else segs.push({ folio: false, buf: await render(`<div class="sheet pg"><div class="pg-body ch-open"><div class="ch-wm">${esc(mCode)}</div><p class="ch-kicker">${esc(chapterHeading(c).label)} · ${esc(c.domainLabel)}</p><h1>${esc(c.title)}</h1><p class="ch-sub">${esc(c.subtitle)}</p>${c.intro}</div></div>`) });
      const rawBody = await buildChapterBody(c.chapterId, c, { solutions: false });   // Soluciones → apéndice (no spoilear)
      segs.push({ folio: true, buf: await render(await balanceFigures(browser, rawBody, ".6in .55in", `${TEXT_OVERRIDE}${CH_CSS}`, cfg)) });
    }

    // APÉNDICE "Soluciones" al final de la ruta (clave de respuestas) → el lector razona la práctica antes de verla.
    const solById = chapters.filter((ch) => ch.seed.practice?.length)
      .map((ch) => `<div class="ch-sol-box"><h2 class="ch-h2 ch-sol-h">${esc(chapterHeading(ch.seed).tocLabel)}</h2>${solutionRows(ch.seed.practice!)}</div>`).join("");
    if (solById) {
      const body = `<div class="sheet pg"><div class="pg-body ch-body"><h2 class="ch-h2">Soluciones</h2><p>Clave de respuestas de la práctica de cada capítulo. Resuelva los escenarios antes de consultarla.</p>${solById}</div></div>`;
      segs.push({ folio: true, buf: await render(body) });
    }

    // Ensamblar.
    const isText: boolean[] = [];
    for (const s of segs) {
      if (s.img) {
        const png = await out.embedPng(await readFile(s.img));
        const pg = out.addPage([PAGE_W, PAGE_H]);
        pg.drawImage(png, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
        isText.push(false);
      } else if (s.buf) {
        const doc = await PDFDocument.load(s.buf);
        const cp = await out.copyPages(doc, doc.getPageIndices());
        cp.forEach((p) => { out.addPage(p); isText.push(s.folio); });
      }
    }

    // Folios continuos (gris), SOLO el número centrado — como el libro vivo (sin rótulos de ruta).
    const pages = out.getPages();
    let folio = 0;
    for (let i = 0; i < pages.length; i++) {
      if (!isText[i]) continue;
      folio++;
      const t = String(folio).padStart(2, "0");
      const w = font.widthOfTextAtSize(t, 8.5);
      pages[i]!.drawText(t, { x: (PAGE_W - w) / 2, y: 21, size: 8.5, font, color: FOLIO_RGB });
    }
  } finally {
    await closeBrowserHard(browser);
  }

  const exportDir = path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_export");
  await mkdir(exportDir, { recursive: true });
  const fname = `${CONFIG.certId.replace(/[^a-z0-9]/gi, "").toUpperCase()}_ruta_${domainId}.pdf`;
  const outPath = path.join(exportDir, fname);
  await writeFile(outPath, await out.save());
  const url = `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/_export/${fname}`;
  return { ok: true, url, path: outPath, pages: out.getPageCount(), chapters: chapters.length };
}
