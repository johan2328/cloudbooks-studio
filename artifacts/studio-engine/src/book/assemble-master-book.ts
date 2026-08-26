import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CONFIG, pageOutputDir, domainOutputDir } from "../config.js";
import { getBookConfig, saveBookConfig } from "./book-config.js";
import { renderToPdf, TEXT_OVERRIDE, balanceFigures } from "./assemble-book.js";
import { buildChapterBody, chapterCss } from "./render-chapter.js";
import { generateChapterDivider } from "./chapter-divider-gen.js";
import { generatePartOpener } from "./part-opener-gen.js";
import { listPersistedChapters } from "../chapter-store.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { masterCopyright, masterReferencesHtml, generateMasterGlossary } from "./master-matter.js";
import { masterBlocksForCert, masterContentIndexHtml, masterDomainMapHtml } from "./master-front-matter.js";
import { bookCoverFileForActive, bookBackCoverFileForActive } from "./cover-gen.js";
import { chapterHeading } from "./chapter-heading.js";
import { renderPortadilla, ensurePortadillaArt } from "./chapter-portadilla.js";
import { certMetaByEngineId } from "../certifications.js";

// E3: identidad del Master parametrizada por cert activo (AI-200 conserva su título curado).
const mCode = (): string => certMetaByEngineId(CONFIG.certId).code;
const mTitle = (): string => { const m = certMetaByEngineId(CONFIG.certId); return m.code === "AI-200" ? "Desarrollo en Azure de Soluciones de IA" : m.title; };

/**
 * ENSAMBLAJE DEL MASTER BOOK (Frente E-full). Concatena los capítulos en UN PDF, emulando
 * el libro del Atlas: portada + índice de capítulos + [divisor de imagen + relato] por
 * capítulo, con FOLIOS CONTINUOS (los divisores sin folio). Reusa renderToPdf/matterCss
 * (mismo estilo) + buildChapterBody (relato con figuras numeradas + puntos a la izquierda)
 * + pdf-lib (páginas de imagen full-bleed + folios), igual que el Atlas.
 */
const PAGE_W = 6 * 72;
const PAGE_H = 9.3 * 72;
// Folio en GRIS CLARO como el Atlas (canonical). Antes navy oscuro; unificado con assemble-book (rgb .55/.6/.66, size 8.5, y 21).
const FOLIO_RGB = rgb(0.55, 0.6, 0.66);
const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface AssembleMasterResult { ok: boolean; url?: string; path?: string; pages?: number; chapters?: number; error?: string }

export async function assembleMasterBook(chapterIds?: string[]): Promise<AssembleMasterResult> {
  if (!CONFIG.chromePath) return { ok: false, error: "Sin Chrome headless: no se puede ensamblar." };
  let chapters = listPersistedChapters();
  if (chapterIds && chapterIds.length) { const set = new Set(chapterIds); chapters = chapters.filter((c) => set.has(c.seed.chapterId)); }
  if (chapters.length === 0) return { ok: false, error: "No hay capítulos persistidos para ensamblar." };

  const cfg = getBookConfig();
  const mb = masterBlocksForCert(mCode());   // bloques front-matter por cert (AI-200 = curado byte-idéntico)
  const accent = cfg.style.accent || "#2563EB";
  // El índice de capítulos usa la estructura `.toc` del Atlas (canonical); la bibliografía usa `.bib` con color fijo del Atlas. Todo vive en matterCss.
  const CH_CSS = chapterCss(accent)
    + `.mb-title{display:flex;flex-direction:column;justify-content:center;min-height:6.6in;text-align:center}`
    + `.mb-title h1{font-size:30pt;line-height:1.1}`;

  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);

  // ── Agrupar capítulos por RUTA (= PARTE), en orden del temario — estructura híbrida ──
  const groups = getOutline().domains
    .map((d) => ({ domainId: d.id, num: Number(d.id.slice(1)), label: (d.label ?? d.id).replace(/^Ruta \d+\s*[—–-]\s*/, "").trim(), chapters: chapters.filter((c) => c.seed.domainId === d.id) }))
    .filter((g) => g.chapters.length > 0);
  // Guard "nunca recurra en silencio": si algún capítulo persistido NO cayó en ningún grupo (drift de `seed.domainId`
  // vs los ids del outline), avisar con sus ids en vez de dejarlo caer callado (y el conteo del return miente).
  const groupedCount = groups.reduce((n, g) => n + g.chapters.length, 0);
  if (groupedCount !== chapters.length) {
    const inGroup = new Set(groups.flatMap((g) => g.chapters.map((c) => c.seed.chapterId)));
    const orphans = chapters.filter((c) => !inGroup.has(c.seed.chapterId)).map((c) => `${c.seed.chapterId}(domainId=${c.seed.domainId})`);
    console.warn(`[assemble-master] ${chapters.length - groupedCount} capítulo(s) SIN ruta (domainId no matchea el outline) → NO se ensamblan: ${orphans.join(", ")}`);
  }

  const sec = (title: string, html: string): string => `<div class="sheet pg"><div class="pg-body"><h1>${esc(title)}</h1>${html}</div></div>`;
  const raw = (html: string): string => `<div class="sheet pg"><div class="pg-body">${html}</div></div>`;
  const hasStudyGuide = !!cfg.blocks.studyGuide?.trim();
  const hasCasos = !!cfg.blocks.scenarioReview?.trim();
  const hasDomainMap = (cfg.domainMap?.rows?.length ?? 0) > 0;
  // Guard de homologación: si el glosario está vacío, generarlo (términos del relato) antes de ensamblar.
  let glossary = cfg.blocks.glossary?.trim();
  if (!glossary) { try { await generateMasterGlossary(); glossary = getBookConfig().blocks.glossary?.trim(); } catch { /* sigue sin glosario */ } }
  const refs = masterReferencesHtml();
  const fmt = (f: number): string => String(f).padStart(2, "0");   // "01".."NN" (índice y folio comparten formato → coinciden).

  const secEntries = [
    { label: "Prefacio", sub: "Por qué este libro" },
    ...(hasDomainMap ? [{ label: "Mapeo de dominios", sub: "Dónde hacer foco por ruta" }] : []),
    { label: "Cómo usar este libro", sub: "El método de estudio" },
    ...(hasStudyGuide ? [{ label: "Guía de estudio", sub: "Cómo se comporta el examen" }] : []),
    { label: "Índice de capítulos", sub: "Las rutas y sus capítulos" },
    { label: "La exposición", sub: `${chapters.length} capítulos en ${groups.length} rutas` },
    { label: "Conclusiones", sub: "Antes del examen" },
    ...(hasCasos ? [{ label: "Casos de examen", sub: "Casos tipo examen + respuestas" }] : []),
    { label: "Glosario", sub: "Términos clave del libro" },
    { label: "Bibliografía", sub: "Fuentes citadas" },
  ];

  // Índice de capítulos EN EL ESTILO DEL ATLAS (`.toc`: parte en acento, título + dot-leader + FOLIO gris).
  const chapterTocSheet = (folioOf: (id: string) => string): string => {
    let body = "";
    for (const g of groups) {
      body += `<div class="toc-dom">Ruta ${g.num} · ${esc(g.label)}</div>`;
      for (const c of g.chapters) {
        body += `<div class="toc-row"><span class="t">${esc(chapterHeading(c.seed).tocLabel)}</span><span class="dots"></span><span class="n">${esc(folioOf(c.seed.chapterId))}</span></div>`;
      }
    }
    return `<div class="sheet pg"><div class="pg-body"><h1>Contenido</h1><div class="toc">${body}</div></div></div>`;
  };

  // Segmentos ordenados del libro. El TOC de capítulos necesita los FOLIOS (que sólo se saben tras rasterizar
  // todo) → 2 pasadas: (1) se pre-renderiza todo con un TOC placeholder y se cuentan páginas; (2) se re-renderiza
  // el TOC con los folios reales (mismas filas → mismas páginas) y se ensambla. Así el índice del Master lleva
  // número de página, como el del Atlas.
  interface Seg { folio: boolean; pages: number; buf?: Buffer; img?: string; chapterId?: string }
  const segs: Seg[] = [];
  const isText: boolean[] = [];   // paralelo a las páginas de `out`: true = lleva folio

  const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath ?? undefined, headless: true, args: ["--no-sandbox", "--disable-gpu"], protocolTimeout: 300000 });
  try {
    const render = (html: string, margin = ".6in .55in"): Promise<Buffer> => renderToPdf(browser, html, margin, `${TEXT_OVERRIDE}${CH_CSS}`, cfg);
    const addText = async (html: string, folio: boolean, margin = ".6in .55in"): Promise<void> => {
      const buf = await render(html, margin);
      segs.push({ folio, pages: (await PDFDocument.load(buf)).getPageCount(), buf });
    };
    const addImg = (img: string): void => { segs.push({ folio: false, pages: 1, img }); };

    // Portada (pág 1, sin folio): imagen generada con image-2 (anclada a la tapa del Atlas) si existe; si no, título de texto.
    const coverImg = bookCoverFileForActive();
    if (coverImg) addImg(coverImg);
    else await addText(`<div class="sheet pg"><div class="pg-body mb-title"><p class="ch-kicker">${mCode()} · Master Book</p><h1>${mTitle()}</h1><p class="ch-sub">Master Book · edición documental — CloudBooks</p></div></div>`, false, ".8in .6in");
    // Copyright/disclaimer (pág 2, .copyr-box) — sin folio.
    await addText(`<div class="sheet pg copyr"><div class="copyr-box">${masterCopyright(mCode(), mTitle())}</div></div>`, false);

    // Front matter documental (mismas secciones que el Atlas) — con folio.
    await addText(sec("Contenido del libro", masterContentIndexHtml(secEntries)), true);
    await addText(sec("Prefacio", mb.preface), true);
    if (hasDomainMap) await addText(sec("Mapeo de dominios", masterDomainMapHtml(cfg.domainMap!.rows, mCode())), true);
    await addText(sec("Cómo usar este libro", mb.howto), true);
    if (hasStudyGuide) await addText(raw(cfg.blocks.studyGuide), true);

    // TOC de capítulos (placeholder; se re-renderiza con los folios reales tras contar páginas).
    const tocBuf0 = await render(chapterTocSheet(() => ""));
    const tocIdx = segs.length;
    segs.push({ folio: true, pages: (await PDFDocument.load(tocBuf0)).getPageCount(), buf: tocBuf0 });

    // Partes y capítulos: abre-parte (img) + divisor de imagen (portadilla AI-pintada, sin folio) + cuerpo (folio).
    for (const g of groups) {
      const popath = path.join(domainOutputDir(g.domainId), "part-opener.png");
      // Guard de homologación: generar la hoja de ruta (abre-parte) si falta, para que la parte no arranque sin arte.
      if (!existsSync(popath)) { try { await generatePartOpener(g.domainId); } catch { /* best-effort */ } }
      if (existsSync(popath)) addImg(popath);
      for (const ch of g.chapters) {
        const c = ch.seed;
        const dpath = path.join(pageOutputDir(c.chapterId), "divider.png");
        // Divisor de imagen (portadilla AI-pintada, 4 párrafos): generar si falta (anclado a cap-01). Idempotente.
        if (!existsSync(dpath)) { try { await generateChapterDivider(c.chapterId); } catch { /* best-effort */ } }
        if (existsSync(dpath)) addImg(dpath);
        else await addText(`<div class="sheet pg"><div class="pg-body ch-open"><div class="ch-wm">${mCode()}</div><p class="ch-kicker">${esc(chapterHeading(c).label)} · ${esc(c.domainLabel)}</p><h1>${esc(c.title)}</h1><p class="ch-sub">${esc(c.subtitle)}</p>${c.intro}</div></div>`, false);
        const rawBody = await buildChapterBody(c.chapterId, c);
        const bodyBuf = await render(await balanceFigures(browser, rawBody, ".6in .55in", `${TEXT_OVERRIDE}${CH_CSS}`, cfg));
        segs.push({ folio: true, pages: (await PDFDocument.load(bodyBuf)).getPageCount(), buf: bodyBuf, chapterId: c.chapterId });
      }
    }

    // Back matter documental.
    await addText(sec("Antes del examen", mb.conclusions), true);
    if (hasCasos) await addText(sec("Casos de examen", cfg.blocks.scenarioReview), true);
    if (glossary) await addText(sec("Glosario", glossary), true);
    if (refs) await addText(sec("Bibliografía", refs), true);

    // Contraportada (ÚLTIMA página, sin folio) — imagen generada con image-2 anclada a la del Atlas.
    const backImg = bookBackCoverFileForActive();
    if (backImg) addImg(backImg);

    // ── Pasada de folios: recorrer los segmentos y capturar el folio inicial del cuerpo de cada capítulo ──
    const chapterStartFolio = new Map<string, number>();
    let counter = 0;
    for (const s of segs) {
      if (!s.folio) continue;
      if (s.chapterId) chapterStartFolio.set(s.chapterId, counter + 1);
      counter += s.pages;
    }
    // Re-render del TOC con folios reales (mismas filas → mismas páginas que el placeholder).
    segs[tocIdx]!.buf = await render(chapterTocSheet((id) => { const f = chapterStartFolio.get(id); return f ? fmt(f) : ""; }));

    // ── Ensamblar el PDF final desde los segmentos ──
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
  } finally {
    await closeBrowserHard(browser);
  }

  // Folios continuos (GRIS Atlas) en las páginas de texto; el índice usó el mismo recuento → coincide.
  const pages = out.getPages();
  let folio = 0;
  for (let i = 0; i < pages.length; i++) {
    if (!isText[i]) continue;
    folio++;
    const t = fmt(folio);
    const w = font.widthOfTextAtSize(t, 8.5);
    pages[i]!.drawText(t, { x: (PAGE_W - w) / 2, y: 21, size: 8.5, font, color: FOLIO_RGB });
  }

  const exportDir = path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_export");
  await mkdir(exportDir, { recursive: true });
  const fname = `${CONFIG.certId.replace(/[^a-z0-9]/gi, "").toUpperCase()}_master_book.pdf`;   // E3: filename por cert
  const outPath = path.join(exportDir, fname);
  await writeFile(outPath, await out.save());
  const url = `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/_export/${fname}`;
  // Persistir el conteo REAL de páginas en la ficha → el storefront (/libro) muestra páginas reales, no el estático de catalog.ts.
  await saveBookConfig({ ficha: { ...getBookConfig().ficha, pages: pages.length } });
  return { ok: true, url, path: outPath, pages: pages.length, chapters: groupedCount };   // conteo REAL ensamblado (no el persistido crudo)
}
