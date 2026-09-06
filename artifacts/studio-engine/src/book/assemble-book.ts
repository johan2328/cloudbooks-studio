import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFImage } from "pdf-lib";
import fs from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir } from "../config.js";
import { getSeed } from "../seeds.js";
import { getApprovals } from "../infographic-approvals.js";
import { getProvenance } from "../page-store.js";
import { listSources } from "../grounding/source-store.js";
import { getOutline, totalUnits } from "../skills/ai-200-outline.js";
import type { SourceKind } from "../types.js";
import { getBookConfig, saveBookConfig, type BookConfig, type BookStyle } from "./book-config.js";
import { certMetaByEngineId } from "../certifications.js";
import { getMatterContract, type MatterContract } from "./matter-contract.js";
import { buildSheet, SHEET_CSS, laminaImage } from "../export-pdf.js";
import { frameTheme } from "../render/render-infographic-page.js";

/** Variables de marco POR LIBRO (topbar/badge de las láminas): el ensamblado, a diferencia del export granular,
 *  no pasa por wrapDoc → hay que inyectar las :root acá o el `.top` cae al fallback navy #061B49. */
function frameVars(): string {
  const t = frameTheme();
  return `:root{--frame-bg:${t.frameBg};--badge-bg:${t.badgeBg};--badge-fg:${t.badgeFg}}`;
}

/**
 * ENSAMBLAR LIBRO: compone el libro completo desde el BookConfig (gobierno +
 * determinismo de todo lo que no es atlas) + las LÁMINAS APROBADAS. Front/back
 * matter = HTML editable; láminas = infografías image-2. → PDF tamaño libro.
 */

/** E3: identidad del libro parametrizada por cert activo (AI-200 conserva su título curado). */
function BOOK(): { cert: string; title: string; series: string; tagline: string; brand: string; year: string } {
  const m = certMetaByEngineId(CONFIG.certId);
  const title = m.code === "AI-200" ? "Desarrollo en Azure de Soluciones de IA" : m.title;
  return { cert: m.code, title, series: "Visual Atlas", tagline: `El atlas visual de la certificación ${m.code}`, brand: "CloudBooks", year: "2026" };
}
const BOOK_DIR = (): string => path.join(CONFIG.outputRoot, "_book");

function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function certSlug(): string { return CONFIG.certId.replace(/[^a-z0-9]/gi, "").toUpperCase(); }

/** Garantiza que un color sea legible como TEXTO sobre blanco: lo oscurece si es muy claro. */
function readable(hex: string, maxLum = 85): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  let r = parseInt(m[1]!.slice(0, 2), 16), g = parseInt(m[1]!.slice(2, 4), 16), b = parseInt(m[1]!.slice(4, 6), 16);
  const lum = (): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let guard = 0;
  while (lum() > maxLum && guard++ < 24) { r *= 0.86; g *= 0.86; b *= 0.86; }
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Inline de un asset subido (tapa, contraportada, portada de colección) como data URL. */
function inlineAsset(url: string | null): string {
  if (!url) return "";
  // Resolver la URL pública a su ruta en disco. IMPORTANTE: soportar assets NAMESPACEADOS por cert/format
  // (p.ej. /assets/cloudbooks-engine/ai-200/visual-atlas/_book/cover.png), no solo el `_book` GLOBAL —
  // si no, una tapa regenerada por libro se resolvía al upload global viejo.
  let file = url.startsWith(CONFIG.publicAssetsBase)
    ? path.join(CONFIG.outputRoot, url.slice(CONFIG.publicAssetsBase.length))
    : path.join(BOOK_DIR(), path.basename(url));
  if (!existsSync(file)) file = path.join(BOOK_DIR(), path.basename(url));   // fallback al _book global
  if (!existsSync(file)) return "";
  const ext = path.extname(file).slice(1).toLowerCase() || "png";
  return `data:image/${ext === "jpg" ? "jpeg" : ext};base64,${readFileSync(file).toString("base64")}`;
}

/** CSS del front/back matter: tipografía/estructura del CONTRATO DE MATTER (colección) + color del estilo (por libro). */
function matterCss(s: BookStyle, m: MatterContract): string {
  return `
.cv,.bc,.pg{font-family:${m.fontFamily}}
.cv,.bc,.cover-img{background:${s.bg};color:${s.onDark}}
.cover-img{padding:0}.cover-img img{width:100%;height:100%;object-fit:cover}
.bc-tpl{position:relative}
.bc-overlay{position:absolute;line-height:1.45}
.bc-overlay p{font-size:12px;line-height:1.45;margin-bottom:6px}
.bc-overlay .bc-blurb{font-size:14px;line-height:1.45;font-weight:600;margin-bottom:9px}
.bc-overlay .bc-lead{font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:6px 0 4px}
.bc-overlay .bc-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:5px}
.bc-overlay .bc-list li{font-size:11.5px;padding-left:13px;position:relative;opacity:1}
.bc-overlay .bc-list li:before{content:"\\203A";position:absolute;left:0;font-weight:800;color:currentColor}
.cv,.bc{padding:.5in .45in;justify-content:space-between}
.cv-brand{font-size:11px;letter-spacing:.22em;text-transform:uppercase;opacity:.8;font-weight:700}
.cv-center{flex:1;display:flex;flex-direction:column;justify-content:center;gap:9px}
.badge{align-self:flex-start;background:linear-gradient(135deg,${s.accent},${s.accent2});padding:5px 12px;border-radius:7px;font-size:13px;font-weight:800;letter-spacing:.05em;color:#fff}
.cv-title{font-size:${m.titleSize}px;font-weight:800;line-height:1.05}
.cv-series{font-size:${Math.round(m.titleSize * 0.65)}px;font-weight:600;color:${s.accent}}
.cv-tag{font-size:13px;opacity:.85;margin-top:6px;max-width:82%;line-height:1.5}
.cv-foot{font-size:11px;opacity:.7}
.pg{padding:.5in .5in;color:${s.text};background:#fff}
/* Tamaño del cuerpo AL NIVEL DEL CONTENEDOR (deriva de matter-contract.bodySize): la prosa hereda 13px aunque
   el LLM no la envuelva en <p> — evita la fuga al default 16px del navegador y el tamaño variable entre párrafos. */
.pg-body{font-size:${m.bodySize}px;line-height:${m.lineHeight}}
.pg-k{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${readable(s.accent)};font-weight:700;margin-bottom:6px}
.pg-body h1{font-size:${m.h1Size}px;font-weight:800;color:${s.accent};margin:.34in 0 16px}
.pg-body h2{font-size:${m.h2Size}px;font-weight:700;color:${s.accent};margin:14px 0 8px}
.pg-body p{font-size:${m.bodySize}px;line-height:${m.lineHeight};color:#44505F;margin-bottom:10px;text-align:justify;text-align-last:left;hyphens:auto;hyphenate-limit-chars:6 3 2;overflow-wrap:break-word;orphans:2;widows:2}
.pg-body ul{margin:6px 0 10px 18px}.pg-body li{font-size:${m.bodySize - 0.5}px;line-height:1.65;color:#44505F;margin-bottom:4px}
.pg-body ul.feat{list-style:none;margin-left:0;display:flex;flex-direction:column;gap:8px}
.pg-body ul.feat li{padding-left:14px;border-left:3px solid ${s.accent};color:#44505F}
.pg-body strong{color:${s.text}}
/* Divisor de ruta (texto): compacto para que entre en 1 página sin recorte (~2.500 chars). */
.ri .pg-body h1{font-size:${m.h1Size - 3}px;margin:.08in 0 11px}
.ri .pg-body p{font-size:${m.bodySize - 1.5}px;line-height:1.42;margin-bottom:7px}
.ri .pg-body ul{margin:5px 0 8px 16px}.ri .pg-body li{font-size:${m.bodySize - 2}px;line-height:1.4;margin-bottom:3px}
/* CUERPO de prosa en SERIF editorial (Georgia, del sistema → embebe; identidad de marca de CloudBooks); títulos/estructura quedan en sans. */
.pg-body p,.pg-body li,.bib li,.gloss dd,.dmap td{font-family:Georgia,"Times New Roman",serif}
/* PAGINACIÓN de las páginas de TEXTO: fluyen y SALTAN de página (no se cortan). El margen lo da el padding de .pg (.5in en los 4 lados). Las láminas (.atlas) quedan de altura fija. */
.sheet.pg{height:auto;min-height:9.3in;overflow:visible}
.copyr{display:flex;flex-direction:column;justify-content:flex-end;padding:.5in .55in .55in}
.copyr-box{background:#F1F4F9;border:1px solid #D7DEEA;border-radius:12px;padding:24px 28px;text-align:center}
.copyr-box p{color:#1C2330;font-size:11px;line-height:1.7;margin-bottom:7px}
.copyr-box .cp-brand{font-size:18px;font-weight:800;color:#0F1B3D;letter-spacing:.01em;margin-bottom:1px}
.copyr-box .cp-sub{font-size:11.5px;font-weight:600;color:#3A4453;margin-bottom:13px}
.toc{display:flex;flex-direction:column;gap:5px;margin-top:6px}
.toc-dom{font-size:11px;font-weight:700;color:${s.accent};text-transform:uppercase;letter-spacing:.05em;margin-top:13px}
.toc-row{display:flex;align-items:baseline;gap:8px;font-size:${m.tocSize}px}
.toc-row .t{color:${s.text}}.toc-row .dots{flex:1}.toc-row .n{font-variant-numeric:tabular-nums;color:#6B7480}
.bidx{display:flex;flex-direction:column;margin-top:8px}
.bidx-row{display:flex;flex-direction:column;gap:1px;padding:9px 0;border-bottom:1px solid #EAEEF4}
.bidx-t{font-size:14px;font-weight:700;color:${s.text}}
.bidx-d{font-size:11.5px;color:#6B7480}
/* Tabla editorial (escenario→recomendación). HOMOLOGADA POR POSICIÓN (no por clase): así se ve IGUAL aunque el
   modelo NO etiquete td.s/td.d. Cabecera navy en negrita; zebra sutil; CUERPO en peso regular (sin negrita); primera col al 38%.
   Sin box-shadow de contorno: al partirse entre páginas dejaba una raya de 1px al pie del fragmento anterior. */
.dmap{width:100%;table-layout:fixed;border-collapse:collapse;margin:11px 0;font-size:${m.tableSize}px;break-inside:auto;border-radius:9px}
.dmap thead{display:table-header-group}
.dmap tr{break-inside:avoid}
.dmap th{text-align:left;padding:8px 9px;background:${s.text};color:#fff;font-weight:700;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em}
.dmap td{padding:8px 9px;border-bottom:1px solid #EDF0F5;color:${s.text};vertical-align:top;line-height:1.5;text-align:left;overflow-wrap:break-word}
.dmap tr:nth-child(even) td{background:#F6F8FB}
.dmap tr:last-child td{border-bottom:none}
.dmap th:first-child,.dmap tbody td:first-child,.dmap td.s{width:38%}
/* peso/color por POSICIÓN — gana sobre td.s/td.d (va después) → homologación real; TODO el cuerpo en peso regular (400): solo la cabecera (th) va en negrita. */
.dmap tbody td:first-child{color:${s.text};font-weight:400}
.dmap tbody td:last-child{color:${s.text};font-weight:400}
.dmap td.s .dm-r{display:block;font-size:9.5px;font-weight:700;color:#8A94A6;text-transform:uppercase;letter-spacing:.04em;margin-bottom:1px}
.coll{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:8px}
.coll-it{display:flex;gap:10px;align-items:flex-start}
.coll-it .cv-thumb{width:62px;height:84px;border-radius:6px;object-fit:cover;background:${s.bg};flex:0 0 auto;border:1px solid #E3E8F0}
.coll-it .ph{width:62px;height:84px;border-radius:6px;background:${s.bg};flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:700}
.coll-it .t{font-size:12.5px;font-weight:700;color:${s.text};line-height:1.3}
.coll-it a{font-size:11px;color:${s.accent};text-decoration:none;word-break:break-all}
/* BIBLIOGRAFÍA = CANONICAL del Visual Atlas: color FIJO (#2563EB, acento del Atlas), NO el acento por libro.
   Excepción explícita a "la paleta fluye aguas abajo": la bibliografía se ve IGUAL en toda la familia, un solo color. */
.bib-grp{font-size:10.5px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.05em;margin:11px 0 5px;column-span:all;break-after:avoid}
.bib{list-style:none;margin:0;padding:0;column-count:2;column-gap:18px}
.bib li{font-size:10px;line-height:1.34;color:#44505F;padding-left:12px;position:relative;margin-bottom:5px;break-inside:avoid}
.bib li:before{content:"\\203A";position:absolute;left:0;font-weight:800;color:#2563EB}
.bib .bt{font-weight:700;color:${s.text}}
.bib a{color:#2563EB;text-decoration:none;word-break:break-all}
.gloss{margin-top:8px}
.scns{margin-top:6px}
.scn{break-inside:auto;orphans:3;widows:3;border:1px solid #E3E8F0;border-radius:10px;padding:9px 12px;margin:9px 0}
.scn-h{display:flex;align-items:center;gap:7px;margin-bottom:5px}
.scn-n{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:19px;height:19px;background:#0F1B3D;color:#fff;font-weight:700;font-size:11px;border-radius:50%}
.scn-r{color:${s.accent};font-weight:700;font-size:10.5px;text-transform:uppercase;letter-spacing:.3px}
/* CÓDIGO: una sola CAJA CERRADA uniforme (borde completo), sin cromo de terminal ni filetes-parche. Formato único para TODO el código del libro. */
.scn-code{background:#F6F8FB;border:1px solid #DBE2EC;border-radius:8px;padding:10px 13px;font-family:Consolas,"Cascadia Mono","Courier New",monospace;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;font-size:10px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:#26303F;margin:9px 0;orphans:2;widows:2;break-inside:auto}
.scn-q{font-weight:700;font-size:12px;margin:2px 0 6px;color:${s.text};orphans:2;widows:2;text-align:left;break-after:avoid;break-inside:avoid}
.scn-opts{list-style:none;padding:0;margin:0}
.scn-opt{font-size:11.5px;padding:3px 0 3px 1.7em;color:#44505F;text-align:left;position:relative;break-inside:avoid}
.scn-let{position:absolute;left:0;top:3px;font-weight:700;color:${s.text}}
.scn-x{font-size:10.5px;color:#44505F;margin-top:5px;orphans:2;widows:2;text-align:left}
.scn-dom{font-size:14px;font-weight:800;color:#0F1B3D;margin:16px 0 8px;padding-bottom:4px;border-bottom:2px solid #E3E8F0;break-after:avoid;break-inside:avoid}
.scn-key-h{font-size:15px;font-weight:800;color:#0F1B3D;margin:18px 0 9px;padding-top:11px;border-top:2px solid #0F1B3D;break-after:avoid}
.scn-key{column-count:2;column-gap:16px}
.scn-key-row{break-inside:avoid;font-size:10.5px;line-height:1.45;color:#44505F;margin-bottom:5px;text-align:justify;hyphens:auto}
.scn-key-a{display:inline-block;min-width:15px;color:#1A7A37;font-weight:700}
.gloss dt{font-size:12.5px;font-weight:700;color:${readable(s.accent)};break-after:avoid;margin-top:11px}
.gloss dt:first-child{margin-top:0}
.gloss dt::first-letter{text-transform:uppercase}
.gloss dd{font-size:12px;line-height:1.55;color:#44505F;margin:2px 0 0 0;break-inside:avoid;text-align:justify;hyphens:auto}
/* Master Book: índice agrupado por parte + referencias — CANÓNICO (accent por libro). */
.mb-toc{list-style:none;padding:0}.mb-part{margin:.16in 0}
.mb-part>b{color:${s.accent};font-weight:700;font-size:11.5px;letter-spacing:.02em;text-transform:uppercase}
.mb-part ul{list-style:none;padding-left:.18in;margin:.06in 0}
.mb-part ul li{margin:.05in 0;border-bottom:1px solid #EEEEEE;padding-bottom:.04in;color:${s.text}}
.ref-list{list-style:none;padding:0}
.ref-list li{font-size:10px;line-height:1.34;color:#44505F;padding-left:12px;position:relative;margin-bottom:5px}
.ref-list li:before{content:"\\203A";position:absolute;left:0;font-weight:800;color:${s.accent}}
.ref-url{color:${s.accent};word-break:break-all}
.bc-top{flex:1;display:flex;flex-direction:column;gap:11px;padding-top:.12in}
.bc-head{display:flex;align-items:center;gap:10px;margin-bottom:2px}
.bc-series{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;opacity:.85;font-weight:700}
.bc-blurb{font-size:15px;line-height:1.55;font-weight:500}
.bc-lead{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;opacity:.95;margin-top:2px}
.bc-list{list-style:none;display:flex;flex-direction:column;gap:6px}
.bc-list li{font-size:12px;opacity:.92;padding-left:16px;position:relative;line-height:1.4}
.bc-list li:before{content:"\\203A";position:absolute;left:0;color:${s.accent};font-weight:800}
.bc-tag{font-size:10.5px;opacity:.75;margin-top:4px;font-style:italic}
.bc-strip{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-top:14px}
.bc-code{background:#fff;border-radius:5px;padding:7px 9px 4px;width:1.75in}
.bc-bars{height:34px;line-height:0}
.bc-isbn{display:block;font-size:8.5px;color:#111;letter-spacing:.04em;text-align:center;margin-top:3px;font-variant-numeric:tabular-nums}
.bc-end{display:flex;flex-direction:column;align-items:flex-end;gap:4px;color:#fff;padding-bottom:2px}
.bc-price{font-size:16px;font-weight:800}
.bc-pub{font-size:11px;font-weight:800;letter-spacing:.12em;opacity:.9}`;
}

function block(title: string, html: string): string {
  // Quita un <h1>…</h1> inicial que algunos bloques generados (intro/conclusions) ya traen → no duplica el rótulo.
  const body = html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, "");
  return `<div class="sheet pg"><div class="pg-body"><h1>${esc(title)}</h1>${body}</div></div>`;
}

/** Página de copyright: sin rótulo, info en gris suave al pie, centrada y enmarcada. */
function copyrightSheet(cfg: BookConfig): string {
  // ANTI-SANGRADO CROSS-CERT: la sub-línea de identidad ("Visual Atlas — <CERT> · <título>") SIEMPRE
  // se deriva del cert activo, no del string persistido (que por diseño nunca se regenera y puede
  // quedar con el default de otro libro). Reemplaza cualquier <p class="cp-sub">…</p> guardado.
  const b = BOOK();
  const html = cfg.blocks.copyright.replace(
    /<p class="cp-sub">[\s\S]*?<\/p>/i,
    `<p class="cp-sub">${esc(b.series)} — ${esc(b.cert)} · ${esc(b.title)}</p>`,
  );
  return `<div class="sheet pg copyr"><div class="copyr-box">${html}</div></div>`;
}

function coverSheet(cfg: BookConfig, laminas: number, dominios: number): string {
  // Usa la imagen de tapa si existe (subida O generada con image-2); si no, la portada HTML de respaldo.
  if (cfg.cover.imageUrl) {
    const data = inlineAsset(cfg.cover.imageUrl);
    if (data) return `<div class="sheet cover-img"><img src="${data}"/></div>`;
  }
  return `<div class="sheet cv">
    <div class="cv-brand">${BOOK().brand}</div>
    <div class="cv-center"><div class="badge">${BOOK().cert}</div><div class="cv-title">${BOOK().title}</div><div class="cv-series">${BOOK().series}</div><div class="cv-tag">${BOOK().tagline}</div></div>
    <div class="cv-foot">${laminas} láminas · ${dominios} dominio${dominios === 1 ? "" : "s"} · ${BOOK().year}</div>
  </div>`;
}

function tocSheet(rows: { pageNumber: string; title: string; domain: string }[]): string {
  let body = ""; let last = "";
  for (const r of rows) {
    if (r.domain !== last) { body += `<div class="toc-dom">${esc(r.domain || "—")}</div>`; last = r.domain; }
    body += `<div class="toc-row"><span class="t">${esc(r.title)}</span><span class="dots"></span><span class="n">${esc(r.pageNumber)}</span></div>`;
  }
  return `<div class="sheet pg"><div class="pg-body"><h1>Atlas por dominio</h1><div class="toc">${body}</div></div></div>`;
}

/** Índice del LIBRO (general): todas las secciones, no las láminas. */
function bookIndexSheet(cfg: BookConfig, laminas: number): string {
  const rows: { t: string; d: string }[] = [];
  if (cfg.sections.preface) rows.push({ t: "Prefacio", d: "Por qué un atlas visual" });
  if (cfg.sections.collection) rows.push({ t: `La colección ${BOOK().cert}`, d: "Los otros libros de la serie" });
  rows.push({ t: "Índice del atlas", d: `Las ${laminas} láminas por dominio` });
  if (cfg.sections.domainMap) rows.push({ t: "Mapeo de dominios", d: "Dónde hacer foco al estudiar" });
  if (cfg.sections.intro) rows.push({ t: "Cómo usar este atlas", d: "El método de estudio" });
  if (cfg.sections.studyGuide && cfg.blocks.studyGuide.trim()) rows.push({ t: "Guía de estudio", d: "Cómo se comporta el examen" });
  rows.push({ t: "Atlas visual", d: `${laminas} skills, una por lámina${cfg.sections.routeIntros ? " · con una introducción por ruta" : ""}` });
  if (cfg.sections.conclusions) rows.push({ t: "Antes del examen", d: "Repaso final" });
  if (cfg.sections.scenarioReview && cfg.blocks.scenarioReview.trim()) rows.push({ t: "Casos de examen", d: "Casos tipo examen + hoja de respuestas" });
  if (cfg.sections.bibliography) rows.push({ t: "Bibliografía", d: "Fuentes citadas en el atlas" });
  if (cfg.sections.glossary && cfg.blocks.glossary.trim()) rows.push({ t: "Glosario", d: "Términos clave del atlas" });
  const body = rows.map((r) => `<div class="bidx-row"><span class="bidx-t">${esc(r.t)}</span><span class="bidx-d">${esc(r.d)}</span></div>`).join("");
  return `<div class="sheet pg"><div class="pg-body"><h1>Contenido del libro</h1><div class="bidx">${body}</div></div></div>`;
}

export function domainMapSheet(cfg: BookConfig): string {
  const rows = cfg.domainMap.rows.map((r) => {
    const m = /^(Ruta\s+\d+)\s*[—–-]\s*(.+)$/.exec(r.skill.trim());   // "Ruta N — Título" → etiqueta + título en líneas separadas
    const skillHtml = m ? `<span class="dm-r">${esc(m[1] ?? "")}</span>${esc(m[2] ?? "")}` : esc(r.skill);
    return `<tr><td class="s">${skillHtml}</td><td class="d">${esc(r.domain)}</td><td>${esc(r.notes)}</td></tr>`;
  }).join("");
  return `<div class="sheet pg"><div class="pg-body">
    <h1>Plan de estudio por dominio</h1>
    <table class="dmap"><thead><tr><th>Ruta del atlas</th><th>Láminas</th><th>Dónde hacer foco</th></tr></thead><tbody>${rows}</tbody></table>
    <p style="margin-top:14px">${esc(cfg.domainMap.note)}</p>
  </div></div>`;
}

function collectionSheet(cfg: BookConfig): string {
  const items = cfg.collection.items.map((it) => {
    const data = inlineAsset(it.coverUrl);
    const thumb = data ? `<img class="cv-thumb" src="${data}"/>` : `<div class="ph">PORTADA</div>`;
    return `<div class="coll-it">${thumb}<div><div class="t">${esc(it.title)}</div>${it.buyUrl ? `<a href="${esc(it.buyUrl)}">${esc(it.buyUrl)}</a>` : ""}</div></div>`;
  }).join("");
  return `<div class="sheet pg"><div class="pg-body">
    <h1>Conocé la colección ${BOOK().cert}</h1>
    <p>${esc(cfg.collection.note)}</p>
    <div class="coll">${items || `<p style="color:#6B7480">Aún no cargaste libros de la colección.</p>`}</div>
  </div></div>`;
}

/** Código de barras decorativo a partir del ISBN (no EAN-13 escaneable; para impresión real, reemplazar por el oficial). */
function barcodeSvg(code: string): string {
  const digits = (code.replace(/\D/g, "") || "9789870000000").padEnd(13, "0").slice(0, 13);
  let x = 0; const bars: string[] = [];
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i]!, 10);
    const w = 1.0 + (d % 4) * 0.7;
    bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="34" fill="#0b0b0b"/>`);
    x += w + 1.1 + (i % 3 === 0 ? 0.7 : 0);
  }
  return `<svg viewBox="0 0 ${x.toFixed(1)} 34" width="100%" height="34" preserveAspectRatio="none">${bars.join("")}</svg>`;
}

function backCoverSheet(cfg: BookConfig, laminas: number): string {
  if (cfg.backCover.mode === "template" && cfg.backCover.imageUrl) {
    const data = inlineAsset(cfg.backCover.imageUrl);
    if (data) return `<div class="sheet cover-img"><img src="${data}"/></div>`;   // template tal cual, sin overlay
  }
  const inner = cfg.backCover.html?.trim() || `<p class="bc-blurb">Domina la certificación ${BOOK().cert} (${BOOK().title}) con un atlas visual: cada skill del examen condensada en una lámina, con su trampa y un autocheck tipo examen.</p>
      <p class="bc-lead">Qué vas a dominar</p>
      <ul class="bc-list"><li>Cada skill del examen condensada en una lámina visual.</li><li>Las trampas frecuentes del examen, explicadas: mito vs corrección.</li><li>Autochecks para medir tu avance real antes de rendir.</li><li>Una referencia visual que sirve en el examen y en el trabajo.</li></ul>`;
  const price = cfg.backCover.price?.trim();
  return `<div class="sheet bc">
    <div class="bc-top">
      <div class="bc-head"><div class="badge">${BOOK().cert}</div><span class="bc-series">${BOOK().series} · ${BOOK().brand}</span></div>
      ${inner}
      <div class="bc-tag">${laminas} láminas · una skill por lámina · fiel al temario de Microsoft</div>
    </div>
    <div class="bc-strip">
      <div class="bc-code"><div class="bc-bars">${barcodeSvg(cfg.backCover.isbn)}</div><span class="bc-isbn">ISBN ${esc(cfg.backCover.isbn || "—")}</span></div>
      <div class="bc-end">${price ? `<span class="bc-price">${esc(price)}</span>` : ""}<span class="bc-pub">${BOOK().brand}</span></div>
    </div>
  </div>`;
}

interface BibEntry { title: string; url: string | null; kind: SourceKind }

/** Etiqueta de grupo de la bibliografía por tipo de fuente. */
const BIB_GROUPS: { kind: SourceKind; label: string }[] = [
  { kind: "mslearn", label: "Microsoft Learn" },
  { kind: "doc", label: "Documentación oficial" },
  { kind: "web", label: "Web" },
  { kind: "sheet", label: "Material propio" },
  { kind: "manual", label: "Fuentes manuales" },
];

/**
 * Roll-up de la BIBLIOGRAFÍA: recorre las láminas aprobadas, junta las fuentes
 * REALMENTE citadas por su procedencia (sourceIds + URLs de citas web), las
 * deduplica y resuelve título+URL contra el corpus. Las láminas sin procedencia
 * (seeds estáticas) simplemente no aportan, no rompen.
 */
function citedSources(ids: string[]): BibEntry[] {
  const byKey = new Map<string, BibEntry>();
  const sourceById = new Map(listSources().map((s) => [s.id, s]));   // leer el source-store UNA sola vez (getSource lo releía por cada fuente → O(n²) y colgaba book-outline)
  for (const id of ids) {
    const prov = getProvenance(id);
    if (!prov) continue;
    const sourceIds = new Set<string>(prov.sourceIds ?? []);
    for (const c of prov.claims) if (c.citation.kind === "source" && c.citation.sourceId) sourceIds.add(c.citation.sourceId);
    for (const sid of sourceIds) {
      const s = sourceById.get(sid);
      if (!s) continue;
      const key = (s.url ?? "").replace(/\/+$/, "") || s.id;
      if (!byKey.has(key)) byKey.set(key, { title: s.title, url: s.url, kind: s.kind });
    }
    // Citas web sin fuente en el corpus (sourceId null) → entran por su URL.
    for (const c of prov.claims) {
      if (c.citation.kind === "web" && !c.citation.sourceId && c.citation.url) {
        const key = c.citation.url.replace(/\/+$/, "");
        if (!byKey.has(key)) byKey.set(key, { title: c.citation.url, url: c.citation.url, kind: "web" });
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Cuántas fuentes citadas tiene el libro (para el detalle del outline). */
function bibliographyCount(ids: string[]): number {
  return citedSources(ids).length;
}

/** Hoja de Bibliografía: fuentes citadas por las láminas, agrupadas por tipo. */
function bibliographySheet(ids: string[]): string {
  const entries = citedSources(ids);
  if (entries.length === 0) {
    return `<div class="sheet pg"><div class="pg-body"><h1>Bibliografía</h1><p style="color:#6B7480">Las láminas aprobadas aún no registran fuentes de procedencia. La bibliografía se completa automáticamente a medida que las páginas se anclan a fuentes (grounding).</p></div></div>`;
  }
  // Lista PLANA alfabética (entries ya viene ordenado por título), sin agrupar por origen.
  const lis = entries.map((e) => `<li><span class="bt">${esc(e.title)}</span>${e.url ? ` — <a href="${esc(e.url)}">${esc(e.url)}</a>` : ""}</li>`).join("");
  return `<div class="sheet pg"><div class="pg-body"><h1>Bibliografía</h1><p>Fuentes oficiales consultadas para fundamentar y dar estructura al contenido del libro.</p><ul class="bib">${lis}</ul></div></div>`;
}

/** Una unidad es SPREAD (2 páginas físicas) si tiene infographic-A.png en su carpeta. */
function isSpreadLamina(id: string): boolean {
  return existsSync(path.join(pageOutputDir(id), "infographic-A.png"));
}

function approvedLaminaIds(): string[] {
  const appr = getApprovals();
  return Object.entries(appr.pages).filter(([, v]) => v.approved).map(([k]) => k).sort()
    // single (infographic.png) O spread (infographic-A.png) en disco.
    .filter((id) => existsSync(path.join(pageOutputDir(id), "infographic.png")) || isSpreadLamina(id));
}

/** skillId → domainId (para ubicar cada lámina en su ruta). */
const SKILL_DOMAIN: Map<string, string> = (() => { const m = new Map<string, string>(); for (const d of getOutline().domains) for (const s of d.skills) m.set(s.id, d.id); return m; })();
function domainOfLamina(id: string): { id: string; label: string } | null {
  const skillId = getProvenance(id)?.skillIds?.[0];
  const did = skillId ? SKILL_DOMAIN.get(skillId) : undefined;
  const d = did ? getOutline().domains.find((x) => x.id === did) : undefined;
  return d ? { id: d.id, label: d.label } : null;
}

/** Hoja de página con HTML ya armado (sin h1 inyectado — el contenido trae el suyo). */
function rawPgSheet(html: string): string { return `<div class="sheet pg"><div class="pg-body">${html}</div></div>`; }

/** Divisor de intro de ruta: imagen formateada subida, o el texto-síntesis (fallback). */
function routeIntroSheet(cfg: BookConfig, domainId: string): string | null {
  const ri = cfg.routeIntros[domainId];
  if (!ri) return null;
  if (ri.imageUrl) { const data = inlineAsset(ri.imageUrl); if (data) return `<div class="sheet cover-img"><img src="${data}"/></div>`; }
  // Divisor de TEXTO: clase `.ri` = fuente/interlínea compactas → ~2.500 chars entran en 1 página sin recorte.
  if (ri.text?.trim()) return `<div class="sheet pg ri"><div class="pg-body">${ri.text}</div></div>`;
  return null;
}

/** Hoja de Glosario: términos clave del corpus (generados), antes de la contraportada. */
function scenarioReviewSheet(cfg: BookConfig): string {
  return `<div class="sheet pg"><div class="pg-body"><h1>Casos de examen</h1>${cfg.blocks.scenarioReview}</div></div>`;
}

function glossarySheet(cfg: BookConfig): string {
  return `<div class="sheet pg"><div class="pg-body"><h1>Glosario</h1><p>Términos técnicos clave del atlas, para reorientarte cuando una lámina se vuelva abstracta.</p>${cfg.blocks.glossary}</div></div>`;
}

interface AtlasItem { html: string; lamina?: { pageId: string; part: "" | "A" | "B" } }

/** Arma los GRUPOS de hojas por régimen de margen: portada y contraportada full-bleed; el texto
 *  (front/back matter) con margen de @page (fluye → margen en TODAS las páginas, incl. continuación);
 *  el atlas = divisores + MARCOS de lámina (sin imagen; pdf-lib incrusta la imagen full-res). */
async function buildSheetGroups(cfg: BookConfig): Promise<{ cover: string; frontText: string[]; atlas: AtlasItem[]; backText: string[]; backCover: string | null; sections: string[]; laminas: number }> {
  const ids = approvedLaminaIds();
  const toc = ids.map((id) => { const s = getSeed(id); return { pageNumber: s?.pageNumber ?? id, title: s?.title ?? id, domain: s?.domainLabel ?? "" }; });
  const dominios = new Set(toc.map((t) => t.domain)).size;
  const sections: string[] = [];
  const cover = coverSheet(cfg, ids.length, dominios); sections.push("Portada");
  const frontText: string[] = [];
  if (cfg.sections.copyright) { frontText.push(copyrightSheet(cfg)); sections.push("Copyright"); }
  if (cfg.sections.preface) { frontText.push(block("Prefacio", cfg.blocks.preface)); sections.push("Prefacio"); }
  if (cfg.sections.collection) { frontText.push(collectionSheet(cfg)); sections.push("Colección"); }
  frontText.push(bookIndexSheet(cfg, ids.length)); sections.push("Índice del libro");
  if (cfg.sections.domainMap) { frontText.push(domainMapSheet(cfg)); sections.push("Mapeo de dominios"); }
  if (cfg.sections.intro) { frontText.push(block("Cómo usar este atlas", cfg.blocks.intro)); sections.push("Introducción"); }
  if (cfg.sections.studyGuide && cfg.blocks.studyGuide.trim()) { frontText.push(rawPgSheet(cfg.blocks.studyGuide)); sections.push("Guía de estudio"); }
  frontText.push(tocSheet(toc)); sections.push("Índice del atlas");
  // Atlas: DIVISOR de ruta antes de la primera lámina de cada ruta + marcos de lámina (1 página c/u).
  const atlas: AtlasItem[] = [];
  let curDomain = ""; let routeIntrosUsed = 0;
  for (const id of ids) {
    if (cfg.sections.routeIntros) {
      const dom = domainOfLamina(id);
      if (dom && dom.id !== curDomain) { curDomain = dom.id; const ri = routeIntroSheet(cfg, dom.id); if (ri) { atlas.push({ html: ri }); routeIntrosUsed++; } }
    }
    if (isSpreadLamina(id)) {
      const a = await buildSheet(id, true, "A", false); if (a) atlas.push({ html: a, lamina: { pageId: id, part: "A" } });
      const b = await buildSheet(id, true, "B", false); if (b) atlas.push({ html: b, lamina: { pageId: id, part: "B" } });
    } else {
      const s = await buildSheet(id, true, "", false); if (s) atlas.push({ html: s, lamina: { pageId: id, part: "" } });
    }
  }
  const spreadCount = ids.filter(isSpreadLamina).length;
  sections.push(`${ids.length} láminas (${spreadCount} en spread de 2 págs)${routeIntrosUsed ? ` · ${routeIntrosUsed} intros de ruta` : ""}`);
  const backText: string[] = [];
  if (cfg.sections.conclusions) { backText.push(block("Antes del examen", cfg.blocks.conclusions)); sections.push("Conclusiones"); }
  if (cfg.sections.scenarioReview && cfg.blocks.scenarioReview.trim()) { backText.push(scenarioReviewSheet(cfg)); sections.push("Casos de examen"); }
  if (cfg.sections.bibliography) { backText.push(bibliographySheet(ids)); sections.push("Bibliografía"); }
  if (cfg.sections.glossary && cfg.blocks.glossary.trim()) { backText.push(glossarySheet(cfg)); sections.push("Glosario"); }
  const backCover = cfg.sections.backCover ? backCoverSheet(cfg, ids.length) : null;
  if (backCover) sections.push("Contraportada");
  return { cover, frontText, atlas, backText, backCover, sections, laminas: ids.length };
}

/** Override de CSS por pasada. TEXTO: ancho/alto auto + sin padding de .pg (el margen lo da @page →
 *  margen en cada página, también las de continuación). ATLAS: divisores .pg a 1 página con su padding. */
export const TEXT_OVERRIDE = `.sheet{width:auto;height:auto;min-height:0;overflow:visible}.sheet.pg{height:auto;min-height:0;overflow:visible}.pg{padding:0}.copyr{padding:0}`;
const ATLAS_OVERRIDE = `.pg{padding:.5in .5in}.sheet.pg{height:9.3in;min-height:9.3in;overflow:hidden}`;

/** Renderiza un grupo de hojas a un PDF (Buffer) con el margen de @page indicado. */
export async function renderToPdf(browser: Awaited<ReturnType<typeof puppeteer.launch>>, bodyHtml: string, margin: string, override: string, cfg: BookConfig): Promise<Buffer> {
  const css = `@page{size:6in 9.3in;margin:${margin}}${frameVars()}${SHEET_CSS}${matterCss(cfg.style, getMatterContract())}${override}`;
  // lang="es" → Blink carga el diccionario de separación silábica en español y `hyphens:auto` funciona
  // (sin esto el justificado hace ríos). Aplica a libro/capítulo/ruta (todos pasan por acá).
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${css}</style></head><body>${bodyHtml}</body></html>`;
  const p = await browser.newPage();
  p.setDefaultTimeout(0);
  await p.setContent(html, { waitUntil: "load", timeout: 90000 });
  const buf = await p.pdf({ width: "6in", height: "9.3in", printBackground: true, preferCSSPageSize: true, timeout: 0 });
  await p.close();
  return Buffer.from(buf);
}

/**
 * RELLENO DINÁMICO de figuras. Mide el cuerpo en FLUJO CONTINUO (mismo ancho que el print) y,
 * para cada figura que quedaría SALTANDO a la página siguiente (dejando hueco al pie), le fija
 * un `max-height` para que ENTRE en el espacio libre — sin encogerla más de lo necesario y solo
 * si el hueco es grande (si es chico, la deja saltar). Simula la paginación: como el resto del
 * cuerpo es prosa que fluye/parte libremente, SOLO las figuras (break-inside:avoid) generan huecos.
 * Robusto: ante cualquier fallo de medición devuelve el cuerpo intacto (no rompe el ensamblado).
 */
export async function balanceFigures(
  browser: Awaited<ReturnType<typeof puppeteer.launch>>,
  bodyHtml: string, margin: string, override: string, cfg: BookConfig,
): Promise<string> {
  if (!/data-fig=/.test(bodyHtml)) return bodyHtml;   // sin figuras marcadas → nada que balancear
  try {
    const mp = margin.trim().split(/\s+/);
    const mv = parseFloat(mp[0] ?? "0.6");                       // margen vertical (in)
    const mh = parseFloat(mp[1] ?? mp[0] ?? "0.55");            // margen horizontal (in)
    const contentWin = 6 - 2 * mh;                              // ancho de contenido (in)
    const PC = (9.3 - 2 * mv) * 96;                             // alto de contenido por página (px @96dpi)
    const css = `${frameVars()}${SHEET_CSS}${matterCss(cfg.style, getMatterContract())}${override}`;
    const measHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${css}#__meas{width:${contentWin}in}</style></head><body><div id="__meas">${bodyHtml}</div></body></html>`;
    const p = await browser.newPage();
    await p.setViewport({ width: 900, height: 1400 });
    await p.setContent(measHtml, { waitUntil: "load", timeout: 90000 });
    // Esperar a que las imágenes (data URIs) tengan alto real ANTES de medir (si no, la figura mide ~0 → no se balancea).
    await p.evaluate(async () => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const imgs: any[] = Array.from((globalThis as any).document.images);
      await Promise.all(imgs.map((img) => (img.complete && img.naturalHeight) ? null : new Promise((res) => { img.onload = img.onerror = () => res(null); })));
      /* eslint-enable @typescript-eslint/no-explicit-any */
    });
    const figs = (await p.evaluate(() => {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const doc = (globalThis as any).document;
      const root = doc.getElementById("__meas");
      if (!root) return [];
      const base = root.getBoundingClientRect().top;
      return Array.from(root.querySelectorAll("figure.ch-fig")).map((f: any) => {
        const r = f.getBoundingClientRect();
        const img = f.querySelector("img");
        const imgH = img ? img.getBoundingClientRect().height : 0;
        return { id: f.getAttribute("data-fig") || "", top: r.top - base, h: r.height, imgH };
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */
    })) as { id: string; top: number; h: number; imgH: number }[];
    await p.close();
    if (!figs.length) return bodyHtml;

    const MARGINS = 42;           // .ch-fig margin .22in arriba+abajo (getBoundingClientRect NO incluye márgenes)
    const SAFE = 30;              // colchón por diferencias de medición (widows/orphans, break-after de h2, colapso de márgenes)
    const WIDTH_FLOOR = 0.8;      // NUNCA encoger una figura por debajo del 80% de su ancho pleno: debe SEGUIR cubriendo el ancho de página (pedido del usuario). Si no cabe así en el hueco, que SALTE a la próxima a ancho pleno.
    let shift = 0;                // corrimiento acumulado por figuras que saltaron (↓) o se encogieron (↑)
    const adj: Record<string, number> = {};
    for (const f of figs) {
      const printTop = f.top + shift;
      const remaining = PC - (((printTop % PC) + PC) % PC);      // espacio libre hasta el fin de página
      const blockH = f.h + MARGINS;                              // caja de MARGEN de la figura (lo que ocupa en el flujo)
      if (blockH <= remaining - SAFE) continue;                  // entra tal cual a ancho pleno
      const nonImg = (f.h - f.imgH) + MARGINS;                   // caption + borde (medido) + márgenes
      const targetImg = (remaining - SAFE) - nonImg;             // altura de imagen que cabría en el hueco (proporcional al ancho)
      if (targetImg >= WIDTH_FLOOR * f.imgH) {                    // cabe encogiendo pero SIGUE cubriendo el ancho → encoger para llenar el hueco
        adj[f.id] = Math.round(targetImg);                       // → max-height de la IMAGEN
        shift -= (blockH - (remaining - SAFE));
      } else {                                                   // encogerla la dejaría angosta → que SALTE (ancho pleno en la próxima página)
        shift += remaining;
      }
    }
    if (!Object.keys(adj).length) return bodyHtml;
    let out = bodyHtml;
    for (const [id, px] of Object.entries(adj)) {
      out = out.replace(`<figure class="ch-fig" data-fig="${id}"><img`, `<figure class="ch-fig" data-fig="${id}"><img style="max-height:${px}px"`);
    }
    return out;
  } catch {
    return bodyHtml;
  }
}

/** Dibuja la imagen full-res de una lámina en el cuerpo de la página (entre la banda navy y el footer),
 *  centrada, respetando el aspect real (sin estirar) y con un pequeño marco blanco (sin tocar el footer → sin raya). */
function drawLamina(page: PDFPage, jpg: PDFImage, w: number, h: number): void {
  const IN = 72, pageW = 6;
  const y0 = 0.36, y1 = 8.94;                 // cuerpo entre footer (.3in) y banda (.3in), con gap → sin costura
  const boxH = y1 - y0, boxW = pageW;
  const r = w / h || boxW / boxH;
  let dw = boxW, dh = boxW / r;
  if (dh > boxH) { dh = boxH; dw = boxH * r; }
  const x = (pageW - dw) / 2, y = y0 + (boxH - dh) / 2;
  page.drawImage(jpg, { x: x * IN, y: y * IN, width: dw * IN, height: dh * IN });
}

export interface AssembleResult { ok: boolean; url?: string; pages: number; laminas: number; sections: string[]; error?: string; warnings?: string[] }

/**
 * ENSAMBLA el libro en 5 pasadas de Chrome (solo texto/marcos, sin imágenes pesadas → estable y liviano)
 * y luego, con pdf-lib, INCRUSTA las láminas full-res en sus marcos + dibuja los FOLIOS de las páginas de
 * texto. Resultado: nítido, liviano (~40MB), con margen en todas las páginas y sin la raya inferior.
 */
export async function assembleBook(): Promise<AssembleResult> {
  if (!CONFIG.chromePath) return { ok: false, pages: 0, laminas: 0, sections: [], error: "Sin Chrome headless: no se puede ensamblar." };
  const cfg = getBookConfig();
  const g = await buildSheetGroups(cfg);
  if (!g.laminas) return { ok: false, pages: 0, laminas: 0, sections: [], error: "No hay páginas aprobadas con infografía. Aprobá páginas en la sección Aprobaciones." };
  const outDir = path.join(CONFIG.outputRoot, "_export");
  await fs.mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${certSlug()}_libro.pdf`);

  // Retry: el 1er intento tras un arranque en frío de Chrome falla intermitente (race del proceso).
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath ?? undefined, headless: true, args: ["--no-sandbox", "--disable-gpu"], protocolTimeout: 300000 });
    try {
      // 5 pasadas: portada (full-bleed) · front matter (con margen) · atlas (marcos, full-bleed) · back matter (con margen) · contraportada (full-bleed).
      const coverPdf = await renderToPdf(browser, g.cover, "0", ATLAS_OVERRIDE, cfg);
      const frontPdf = g.frontText.length ? await renderToPdf(browser, g.frontText.join("\n"), ".55in .5in", TEXT_OVERRIDE, cfg) : null;
      const atlasPdf = g.atlas.length ? await renderToPdf(browser, g.atlas.map((a) => a.html).join("\n"), "0", ATLAS_OVERRIDE, cfg) : null;
      const backPdf = g.backText.length ? await renderToPdf(browser, g.backText.join("\n"), ".55in .5in", TEXT_OVERRIDE, cfg) : null;
      const backCoverPdf = g.backCover ? await renderToPdf(browser, g.backCover, "0", ATLAS_OVERRIDE, cfg) : null;
      await closeBrowserHard(browser);

      // MERGE + overlay de imágenes full-res + folios.
      const out = await PDFDocument.create();
      const font = await out.embedFont(StandardFonts.Helvetica);
      const kinds: ("cover" | "matter" | "lamina" | "divider")[] = [];
      const warnings: string[] = [];
      const append = async (buf: Buffer | null, kind: "cover" | "matter", items?: AtlasItem[]): Promise<void> => {
        if (!buf) return;
        const src = await PDFDocument.load(buf);
        const copied = await out.copyPages(src, src.getPageIndices());
        if (items && copied.length !== items.length) { const w = `atlas: ${copied.length} páginas vs ${items.length} ítems — posible desalineo (láminas cruzadas)`; console.warn(`[assemble] ${w}`); warnings.push(w); }
        for (let i = 0; i < copied.length; i++) {
          const page = out.addPage(copied[i]);
          const item = items?.[i];
          if (items) {
            if (item?.lamina) {
              const im = await laminaImage(item.lamina.pageId, item.lamina.part);
              if (im) {
                try { const jpg = await out.embedJpg(im.jpeg); drawLamina(page, jpg, im.w, im.h); }
                catch { warnings.push(`lámina ${item.lamina.pageId}${item.lamina.part}: no se pudo incrustar la imagen (marco vacío)`); }   // NO abortar todo el libro por una lámina mala
              } else { warnings.push(`lámina ${item.lamina.pageId}${item.lamina.part}: imagen faltante o ilegible`); }
              kinds.push("lamina");
            } else { kinds.push("divider"); }   // divisor de ruta → SIN folio (apertura de ruta)
          } else { kinds.push(kind); }
        }
      };
      await append(coverPdf, "cover");
      await append(frontPdf, "matter");
      await append(atlasPdf, "matter", g.atlas);
      await append(backPdf, "matter");
      await append(backCoverPdf, "cover");

      // FOLIOS en las páginas de texto (las láminas ya muestran su número de unidad en el footer).
      const pages = out.getPages();
      for (let i = 0; i < pages.length; i++) {
        if (kinds[i] !== "matter") continue;
        const pg = pages[i]!; const num = String(i + 1); const size = 8.5;
        const tw = font.widthOfTextAtSize(num, size);
        pg.drawText(num, { x: (pg.getWidth() - tw) / 2, y: 21, size, font, color: rgb(0.55, 0.6, 0.66) });
      }
      const bytes = await out.save();
      await fs.writeFile(file, bytes);
      const expected = totalUnits();
      if (g.laminas < expected) warnings.unshift(`el libro tiene ${g.laminas} de ${expected} skills aprobadas — faltan ${expected - g.laminas} (no entran las no aprobadas o las que fallaron al regenerar)`);
      // Persistir el conteo REAL de páginas en la ficha → el storefront (/libro) muestra páginas reales, no el estático de catalog.ts.
      await saveBookConfig({ ficha: { ...getBookConfig().ficha, pages: pages.length } });
      return { ok: true, url: `/assets/cloudbooks-engine/_export/${certSlug()}_libro.pdf`, pages: pages.length, laminas: g.laminas, sections: g.sections, warnings: warnings.length ? warnings : undefined };
    } catch (err) {
      lastErr = err;
      try { await closeBrowserHard(browser); } catch { /* noop */ }
    }
  }
  return { ok: false, pages: 0, laminas: 0, sections: [], error: String((lastErr as Error)?.message ?? lastErr) };
}

/** HTML solo del front/back matter (sin láminas) — para previsualizar el diseño. */
export function frontMatterPreviewHtml(): string {
  const cfg = getBookConfig();
  const ids = approvedLaminaIds();
  const toc = ids.map((id) => { const s = getSeed(id); return { pageNumber: s?.pageNumber ?? id, title: s?.title ?? id, domain: s?.domainLabel ?? "" }; });
  const dominios = new Set(toc.map((t) => t.domain)).size || 1;
  const matter = [
    coverSheet(cfg, ids.length || 8, dominios),
    cfg.sections.copyright ? copyrightSheet(cfg) : "",
    cfg.sections.preface ? block("Prefacio", cfg.blocks.preface) : "",
    cfg.sections.collection ? collectionSheet(cfg) : "",
    bookIndexSheet(cfg, ids.length || 8),
    cfg.sections.domainMap ? domainMapSheet(cfg) : "",
    cfg.sections.intro ? block("Cómo usar este atlas", cfg.blocks.intro) : "",
    cfg.sections.studyGuide && cfg.blocks.studyGuide.trim() ? rawPgSheet(cfg.blocks.studyGuide) : "",
    tocSheet(toc),
    // intros de ruta (las que ya tienen contenido), para previsualizar el divisor
    ...(cfg.sections.routeIntros ? getOutline().domains.map((d) => routeIntroSheet(cfg, d.id)).filter((x): x is string => !!x) : []),
    cfg.sections.conclusions ? block("Antes del examen", cfg.blocks.conclusions) : "",
    cfg.sections.scenarioReview && cfg.blocks.scenarioReview.trim() ? scenarioReviewSheet(cfg) : "",
    cfg.sections.bibliography ? bibliographySheet(ids) : "",
    cfg.sections.glossary && cfg.blocks.glossary.trim() ? glossarySheet(cfg) : "",
    cfg.sections.backCover ? backCoverSheet(cfg, ids.length || 8) : "",
  ].filter(Boolean);
  return `<!doctype html><html><head><meta charset="utf-8"><style>${frameVars()}${SHEET_CSS}${matterCss(cfg.style, getMatterContract())}</style></head><body style="display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#0b0f17">${matter.join("\n")}</body></html>`;
}

/** Estructura del libro (para el preview en la UI), sin renderizar el PDF. */
export function bookOutline(): { laminas: number; dominios: number; bookApproved: boolean; sections: { key: string; label: string; detail: string }[]; toc: { pageNumber: string; title: string; domain: string }[] } {
  const cfg = getBookConfig();
  const appr = getApprovals();
  const ids = approvedLaminaIds();
  const toc = ids.map((id) => { const s = getSeed(id); return { pageNumber: s?.pageNumber ?? id, title: s?.title ?? id, domain: s?.domainLabel ?? "" }; });
  const dominios = new Set(toc.map((t) => t.domain)).size;
  const sec = [{ key: "cover", label: "Portada", detail: cfg.cover.mode === "uploaded" ? "Tapa subida" : `${BOOK().cert} · ${BOOK().title}` }];
  if (cfg.sections.copyright) sec.push({ key: "copyright", label: "Copyright", detail: "Créditos editables" });
  if (cfg.sections.preface) sec.push({ key: "preface", label: "Prefacio", detail: "Bloque editable" });
  if (cfg.sections.collection) sec.push({ key: "collection", label: "Colección", detail: `${cfg.collection.items.length} libro(s) + enlaces` });
  sec.push({ key: "bookindex", label: "Índice del libro", detail: "Todas las secciones" });
  if (cfg.sections.domainMap) sec.push({ key: "domainMap", label: "Mapeo de dominios", detail: `${cfg.domainMap.rows.length} fila(s)` });
  if (cfg.sections.intro) sec.push({ key: "intro", label: "Introducción", detail: "Bloque editable" });
  if (cfg.sections.studyGuide) sec.push({ key: "studyGuide", label: "Guía de estudio", detail: cfg.blocks.studyGuide.trim() ? "Cómo se comporta el examen" : "pendiente · generá en Grounding" });
  sec.push({ key: "toc", label: "Índice del atlas", detail: `${ids.length} láminas en ${dominios} dominio(s)` });
  if (cfg.sections.routeIntros) { const n = Object.values(cfg.routeIntros).filter((r) => r.imageUrl || r.text?.trim()).length; const nr = getOutline().domains.length || 9; sec.push({ key: "routeIntros", label: "Introducciones por ruta", detail: `${n}/${nr} ruta(s) con introducción (divisor antes de cada ruta)` }); }
  sec.push({ key: "laminas", label: `${ids.length} láminas aprobadas`, detail: "El bloque firmado en Aprobaciones" });
  if (cfg.sections.conclusions) sec.push({ key: "conclusions", label: "Conclusiones", detail: "Bloque editable" });
  if (cfg.sections.scenarioReview) sec.push({ key: "scenarioReview", label: "Casos de examen", detail: cfg.blocks.scenarioReview.trim() ? "~30 casos por dominio + hoja de respuestas" : "pendiente · generá en Ensamblar" });
  if (cfg.sections.bibliography) sec.push({ key: "bibliography", label: "Bibliografía", detail: `${bibliographyCount(ids)} fuente(s) citada(s)` });
  if (cfg.sections.glossary) sec.push({ key: "glossary", label: "Glosario", detail: cfg.blocks.glossary.trim() ? "Términos clave del atlas" : "pendiente · generá en Ensamblar" });
  if (cfg.sections.backCover) sec.push({ key: "backcover", label: "Contraportada", detail: cfg.backCover.mode === "template" ? "Template subido" : "Autogenerada" });
  return { laminas: ids.length, dominios, bookApproved: appr.book.approved, sections: sec, toc };
}
