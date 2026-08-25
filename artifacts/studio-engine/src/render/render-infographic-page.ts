import { PAGE_W, PAGE_H } from "./layout-constants.js";
import { CONFIG } from "../config.js";
import { certMetaByEngineId } from "../certifications.js";
import { getBookConfig } from "../book/book-config.js";
import type { PageSeed } from "../types.js";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Tema del MARCO (badge del cert + bandas header/footer) POR LIBRO ACTIVO. AI-200 conserva su identidad
 * navy exacta (independiente de su palette); el resto deriva del palette del libro (bg oscuro + chip claro
 * accent2). Así el Atlas AB-620 sale vino y con badge "AB-620" sin tocar el look de AI-200.
 */
export function frameTheme(): { code: string; frameBg: string; badgeBg: string; badgeFg: string } {
  const code = certMetaByEngineId(CONFIG.certId).code;
  if (CONFIG.certId === "ai-200") return { code, frameBg: "#061B49", badgeBg: "linear-gradient(135deg,#2563eb,#7c3aed)", badgeFg: "#fff" };
  const s = getBookConfig().style;
  return { code, frameBg: s.bg, badgeBg: s.accent2, badgeFg: s.bg };
}

/**
 * Render de página INFOGRÁFICA: el cuerpo es la imagen de image-2 (toda la
 * pantalla) y el HTML solo aporta el HEADER y el FOOTER de marca — nítidos,
 * exactos e idénticos en las 61 páginas. Es lo que pidió el usuario: "que
 * aproveche el generador toda la pantalla a excepción del header y footer".
 */
export function renderInfographicPage(seed: PageSeed, imageUrl: string): string {
  const th = frameTheme();
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${PAGE_W}">
<title>${esc(seed.title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:${PAGE_W}px ${PAGE_H}px;margin:0}
  body{background:#dfe4ec;display:flex;justify-content:center;font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif}
  /* Página ACOTADA al tamaño de hoja (2:3) → no crece infinita; la imagen encaja sin recorte. */
  .page{width:${PAGE_W}px;height:${PAGE_H}px;background:#fff;display:flex;flex-direction:column;overflow:hidden}
  .topbar{height:34px;flex:0 0 auto;display:flex;align-items:center;gap:11px;padding:0 18px 0 16px;background:${th.frameBg};color:#fff;font-size:13px;letter-spacing:.01em}
  .topbar .badge{display:inline-flex;align-items:center;height:21px;padding:0 9px;border-radius:6px;background:${th.badgeBg};color:${th.badgeFg};font-size:11px;font-weight:800;letter-spacing:.04em;flex:0 0 auto;box-shadow:0 1px 3px rgba(0,0,0,.35)}
  .topbar .dom{font-weight:600;opacity:.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  /* Saturación -15% (determinista, sin regenerar la imagen). */
  .infographic{flex:1 1 auto;width:100%;min-height:0;object-fit:contain;background:#fff;display:block;filter:saturate(0.85)}
  .footer{height:34px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;background:${th.frameBg};color:#fff;font-size:14px;letter-spacing:.04em;font-weight:750}
  .footer .brand{justify-self:start;font-weight:800;letter-spacing:.01em}
  .footer .series{justify-self:center;opacity:.94;font-weight:600}
  .footer .pg{justify-self:end;opacity:.82;font-variant-numeric:tabular-nums}
</style></head>
<body><div class="page">
  <div class="topbar"><span class="badge">${esc(th.code)}</span><span class="dom">${esc(seed.domainLabel)}</span></div>
  <img class="infographic" src="${esc(imageUrl)}" alt="${esc(seed.upperVisualAlt)}">
  <div class="footer"><span class="brand">CloudBooks</span><span class="series">Visual Atlas</span><span class="pg">${esc(seed.pageNumber)}/${seed.totalPages}</span></div>
</div></body></html>`;
}

/**
 * Render de un SPREAD (unidad densa): dos páginas apiladas — A (módulos) sobre B
 * (trampas + autocheck). Es la vista "Página" de la galería; en el libro irán enfrentadas.
 */
export function renderInfographicSpread(seed: PageSeed, urlA: string, urlB: string): string {
  const th = frameTheme();
  const page = (url: string, part: string) => `  <div class="page">
    <div class="topbar"><span class="badge">${esc(th.code)}</span><span class="dom">${esc(seed.domainLabel)}</span></div>
    <img class="infographic" src="${esc(url)}" alt="${esc(seed.upperVisualAlt)}">
    <div class="footer"><span class="brand">CloudBooks</span><span class="series">Visual Atlas · ${part}</span><span class="pg">${esc(seed.pageNumber)}/${seed.totalPages}</span></div>
  </div>`;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${PAGE_W}">
<title>${esc(seed.title)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  @page{size:${PAGE_W}px ${PAGE_H}px;margin:0}
  body{background:#dfe4ec;display:flex;flex-direction:column;align-items:center;gap:14px;padding:14px 0;font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif}
  .page{width:${PAGE_W}px;height:${PAGE_H}px;background:#fff;display:flex;flex-direction:column;overflow:hidden}
  .topbar{height:34px;flex:0 0 auto;display:flex;align-items:center;gap:11px;padding:0 18px 0 16px;background:${th.frameBg};color:#fff;font-size:13px;letter-spacing:.01em}
  .topbar .badge{display:inline-flex;align-items:center;height:21px;padding:0 9px;border-radius:6px;background:${th.badgeBg};color:${th.badgeFg};font-size:11px;font-weight:800;letter-spacing:.04em;flex:0 0 auto;box-shadow:0 1px 3px rgba(0,0,0,.35)}
  .topbar .dom{font-weight:600;opacity:.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .infographic{flex:1 1 auto;width:100%;min-height:0;object-fit:contain;background:#fff;display:block;filter:saturate(0.85)}
  .footer{height:34px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;background:${th.frameBg};color:#fff;font-size:14px;letter-spacing:.04em;font-weight:750}
  .footer .brand{justify-self:start;font-weight:800;letter-spacing:.01em}
  .footer .series{justify-self:center;opacity:.94;font-weight:600}
  .footer .pg{justify-self:end;opacity:.82;font-variant-numeric:tabular-nums}
</style></head>
<body>
${page(urlA, "1 / 2")}
${page(urlB, "2 / 2")}
</body></html>`;
}
