import type { FitParams, PageSeed, Recipe, StructuralCheck } from "../types.js";
import { PAGE_W, PAGE_H, TOPBAR_H, HERO_H, GUIDE_H, FOOTER_H, railTokens } from "./layout-constants.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Ícono editorial que acompaña el contexto en el hero (como el golden master).
 * Inferimos la familia del tema desde título/subtítulo/contexto y devolvemos un
 * SVG plano estilo Azure. Sin texto, sin marcas: solo composición.
 */
function heroIcon(seed: PageSeed): string {
  const t = `${seed.title} ${seed.subtitle} ${seed.context}`.toLowerCase();
  const fam =
    /identidad|managed identity|rbac|\brole\b|\brol\b|permiso|token|acrpush|acrpull|auth/.test(t) ? "identity"
    : /\bred\b|network|endpoint|\bdns\b|firewall|private link|private endpoint|vnet/.test(t) ? "network"
    : /seguridad|defender|\bcve\b|vulnerab|riesgo|amenaza|scan/.test(t) ? "security"
    : /registry|imagen|container|\bacr\b|build|docker|\btag\b|digest|push|repositorio/.test(t) ? "containers"
    : "generic";
  const svg = (inner: string) => `<svg class="ticon" viewBox="0 0 120 84" fill="none" aria-hidden="true">${inner}</svg>`;
  if (fam === "containers") {
    return svg(`<rect x="22" y="12" width="76" height="18" rx="4" fill="#e8f0fe" stroke="#2f86e8" stroke-width="1.5"/><rect x="22" y="34" width="76" height="18" rx="4" fill="#eafaf6" stroke="#14b8a6" stroke-width="1.5"/><rect x="22" y="56" width="76" height="16" rx="4" fill="#eef2f8" stroke="#5e7497" stroke-width="1.5"/><circle cx="34" cy="21" r="3" fill="#2f86e8"/><circle cx="34" cy="43" r="3" fill="#14b8a6"/><circle cx="34" cy="64" r="3" fill="#5e7497"/><path d="M60 21h28M60 43h28M60 64h22" stroke="#c9d6ea" stroke-width="2" stroke-linecap="round"/>`);
  }
  if (fam === "network") {
    return svg(`<circle cx="60" cy="20" r="9" fill="#e8f0fe" stroke="#2f86e8" stroke-width="1.5"/><circle cx="26" cy="62" r="9" fill="#eafaf6" stroke="#14b8a6" stroke-width="1.5"/><circle cx="94" cy="62" r="9" fill="#eafaf6" stroke="#14b8a6" stroke-width="1.5"/><circle cx="60" cy="62" r="9" fill="#eef2f8" stroke="#5e7497" stroke-width="1.5"/><path d="M60 29v24M55 27 31 55M65 27l24 28" stroke="#9db8e0" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round"/>`);
  }
  if (fam === "identity") {
    return svg(`<circle cx="60" cy="30" r="14" fill="#e8f0fe" stroke="#2f86e8" stroke-width="1.5"/><circle cx="60" cy="25" r="5" fill="#2f86e8"/><path d="M52 36c2-4 14-4 16 0" stroke="#2f86e8" stroke-width="2" stroke-linecap="round"/><rect x="40" y="52" width="40" height="22" rx="5" fill="#eafaf6" stroke="#14b8a6" stroke-width="1.5"/><circle cx="60" cy="61" r="3.5" fill="#14b8a6"/><path d="M60 64v5" stroke="#14b8a6" stroke-width="2" stroke-linecap="round"/>`);
  }
  if (fam === "security") {
    return svg(`<path d="M60 10l30 10v22c0 18-13 28-30 32-17-4-30-14-30-32V20z" fill="#e8f0fe" stroke="#2f86e8" stroke-width="1.5"/><path d="M48 42l9 9 17-18" stroke="#14b8a6" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  return svg(`<rect x="30" y="14" width="60" height="56" rx="6" fill="#e8f0fe" stroke="#2f86e8" stroke-width="1.5"/><path d="M42 30h36M42 42h36M42 54h24" stroke="#9db8e0" stroke-width="2.5" stroke-linecap="round"/><circle cx="78" cy="58" r="10" fill="#eafaf6" stroke="#14b8a6" stroke-width="1.5"/>`);
}

/**
 * Render determinista PARAMETRIZADO por receta, alineado al golden master v24
 * del repo: cintillos navy (#061B49), hero amplio con bajada y contexto, guía,
 * cuerpo (bloque visual superior + rail de examen) y footer de marca. La imagen
 * es SOLO el bloque superior (object-fit: contain, nunca recorta); el HTML es
 * dueño de todo lo demás. La receta cambia el split, las tarjetas, los extras y
 * la densidad del rail.
 */
export function renderComposerPage(
  seed: PageSeed,
  recipe: Recipe,
  opts: { imageUrl?: string; fit?: FitParams; synthesisText?: string } = {},
): { html: string; structural: { passed: boolean; score: number; checks: StructuralCheck[] } } {
  const rt = railTokens(recipe.railMode);

  // Auto-fit: parámetros que el motor ajusta para que el contenido entre.
  const fit = opts.fit ?? {};
  const deckFontPx = fit.deckFontPx ?? 14;
  const deckLines = fit.deckLines ?? 3;
  const expLines = fit.expLines ?? 4;
  const railFont = Math.max(10, rt.font + (fit.railFontDelta ?? 0));
  // Compresión vertical del rail (cierra desbordes de trampas/autocheck SIN bajar
  // la fuente de su piso de 10px, que protege el contrato de legibilidad).
  const railLead = Math.max(1.12, rt.lead + (fit.railLeadDelta ?? 0));
  const railGap = Math.max(2, rt.gap + (fit.railGapDelta ?? 0));
  const railPad = Math.max(7, rt.pad + (fit.railGapDelta ?? 0));
  const optPadY = Math.max(2, 5 + (fit.railGapDelta ?? 0));     // padding vertical de cada opción
  const ulGap = Math.max(2, railGap - 2);

  // Subtítulo: lo omitimos en el hero si es redundante con el dominio (el topbar
  // ya muestra el módulo/dominio); evita repetir "Cómputo contenerizado…" dos veces.
  const subT = seed.subtitle.trim();
  const titleLow = seed.title.toLowerCase();
  const subWords = subT.toLowerCase().split(/[\s,·—-]+/).filter((w) => w.length > 5);
  const subRedundant = !subT
    || subT.length > 36
    || seed.domainLabel.toLowerCase().includes(subT.toLowerCase())
    || subWords.some((w) => titleLow.includes(w));   // subtítulo repite una palabra clave del título

  const cards = seed.visualModules.slice(0, recipe.cards);
  const cardsHtml = cards
    .map(
      (m) => `
      <div class="card">
        <span class="cnum">${esc(m.num)}</span>
        <span class="ctit">${esc(m.title)}</span>
        <span class="cdesc">${esc(m.description)}</span>
      </div>`,
    )
    .join("");

  // Párrafo de SÍNTESIS: lo REDACTA el director de maquetación (agente), no la
  // regla. La regla solo decide cuántas líneas caben (synthLines, vía escalera) y
  // lo coloca. Sin texto del agente → no hay síntesis (la geometría manda igual).
  const synthLines = fit.synthLines ?? 0;
  const synthText = (opts.synthesisText ?? "").trim();
  const synthHtml = synthLines > 0 && synthText
    ? `<p class="synth">${esc(synthText)}</p>`
    : "";
  // Cap de imagen que decide el director (achicar para hacer lugar a la síntesis).
  const imgStyle = fit.imageMaxH ? ` style="height:${fit.imageMaxH}px;width:auto;max-width:100%;aspect-ratio:1536/1024;margin-inline:auto"` : "";


  const trapsShown = recipe.railMode === "compact" ? seed.traps.slice(0, 2) : seed.traps;
  const trapsHtml = trapsShown
    .map(
      (t, i) => `
      <div class="trap">
        <span class="tn">${i + 1}</span>
        <span class="tw"><b>Mito:</b> ${esc(t.wrong)}</span>
        <span class="tc"><b>Corrección:</b> ${esc(t.correction)}</span>
      </div>`,
    )
    .join("");

  const ac = seed.autocheck;
  const optsHtml = ac.options
    .map((o, i) => `<li class="${i === ac.correctOption ? "ok" : ""}"><span class="ol">${String.fromCharCode(65 + i)}</span>${esc(o)}</li>`)
    .join("");

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=${PAGE_W}">
<title>${esc(seed.title)} — ${esc(recipe.label)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#dfe4ec;display:flex;justify-content:center;font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif;color:#0d1320}
  .page{width:${PAGE_W}px;height:${PAGE_H}px;background:#edf2f8;display:flex;flex-direction:column;overflow:hidden}

  .topbar{height:${TOPBAR_H}px;display:flex;align-items:center;gap:11px;padding:0 18px 0 16px;background:#061B49;color:#fff;font-size:13px;letter-spacing:.01em}
  .topbar .badge{display:inline-flex;align-items:center;height:21px;padding:0 9px;border-radius:6px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;font-size:11px;font-weight:800;letter-spacing:.04em;flex:0 0 auto;box-shadow:0 1px 3px rgba(0,0,0,.35)}
  .topbar .dom{font-weight:600;opacity:.95;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .hero{height:${HERO_H}px;padding:18px 24px 14px;background:#fff;border-bottom:1px solid #d7deea;display:grid;grid-template-columns:1fr 112px;grid-template-areas:"title icon" "deck icon";column-gap:14px;row-gap:6px;align-items:start;overflow:hidden}
  .hero h1{grid-area:title;font-size:33px;font-weight:900;letter-spacing:-.022em;line-height:1.04;color:#06133E}
  .hero h1 .sd{color:#06133E;font-weight:800}
  .hero .ctx{grid-area:deck;font-size:${deckFontPx}px;color:#2d3a5c;line-height:1.3;display:-webkit-box;-webkit-line-clamp:${deckLines};-webkit-box-orient:vertical;overflow:hidden}
  .hero .ticon-slot{grid-area:icon;align-self:center;display:flex;align-items:center;justify-content:center;opacity:.96}
  .ticon{width:132px;height:96px}

  /* Barra de guía Azure: ícono + label azul + pregunta en ink; composición clara. */
  .guide{height:${GUIDE_H}px;display:flex;align-items:center;gap:10px;padding:0 24px;background:#eaf1ff;border-bottom:1px solid #cfe0ff;color:#1e3a6e}
  .guide .gi{flex:0 0 auto;width:16px;height:16px}
  .guide .lbl{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:#2563eb;flex:0 0 auto}
  .guide .gq{font-size:13px;font-weight:600;color:#1e3a6e;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  .body{flex:1;display:flex;flex-direction:column;padding:12px 16px;gap:10px;min-height:0}
  .upper{flex:0 0 auto;display:flex;flex-direction:column;gap:9px}
  .slotlabel{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#9aa3b2}
  .visual{width:100%;aspect-ratio:1536/1024;object-fit:contain;border-radius:10px;background:#fff;border:1px solid #d7deea;display:block}
  .cards{display:grid;grid-template-columns:repeat(${recipe.cols},1fr);gap:10px;aspect-ratio:1536/1024}
  .card{border:1px solid #d7deea;border-radius:10px;padding:11px;display:flex;flex-direction:column;gap:3px;background:#fff;overflow:hidden}
  .cnum{font-size:10px;font-weight:800;color:#2563eb}
  .ctit{font-size:13px;font-weight:700}
  .cdesc{font-size:10.5px;color:#5b6472;line-height:1.35;overflow:hidden}
  /* Síntesis: párrafo que explica las tarjetas, sin borde azul (gris neutro). */
  .synth{flex:0 0 auto;font-size:11px;line-height:1.42;color:#46505f;background:#fff;border:1px solid #e6e8ec;border-radius:10px;padding:9px 13px;display:-webkit-box;-webkit-line-clamp:${synthLines};-webkit-box-orient:vertical;overflow:hidden}
  .synth b{color:#0d1320;font-weight:700}
  .rail{flex:1;display:grid;grid-template-columns:1.08fr 1fr;gap:12px;min-height:0}
  /* ítems COMPACTOS arriba (flex-start) con gap uniforme: lectura apretada y
     prolija, sin los huecos grandes que repartía el space-evenly. */
  .traps,.auto{border:1px solid #e6e8ec;border-radius:12px;padding:${railPad}px;overflow:hidden;display:flex;flex-direction:column;gap:${railGap}px;justify-content:flex-start}
  .traps{background:#fef6f4;border-color:#f6d9d4}   /* tinte rojo suave (advertencia) */
  .auto{background:#f3f8ff;border-color:#d4e4fb}    /* tinte azul suave (verificación) */
  /* Rótulos del rail: mismo tamaño/tracking (familia) pero con COLOR semántico. */
  .rhead{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;display:flex;align-items:center;gap:7px}
  .rhead::before{content:"";width:10px;height:10px;border-radius:3px;background:currentColor}
  .traps .rhead{color:#D92D20}
  .auto .rhead{color:#1565D8}
  .trap{display:grid;grid-template-columns:16px 1fr;column-gap:7px;row-gap:1px;font-size:${railFont}px;line-height:${railLead}}
  .trap .tn{grid-row:span 2;width:15px;height:15px;border-radius:4px;background:#fbded9;color:#D92D20;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:9px}
  .trap .tw{color:#7f1d1d;font-weight:600}
  .trap .tw b{color:#D92D20;font-weight:800}
  .trap .tc{color:#3a4456}
  .trap .tc b{color:#1a7a37;font-weight:800}
  .auto .q{font-size:${railFont + 0.5}px;font-weight:700;line-height:${railLead};color:#0d2a5e}
  .auto ul{list-style:none;display:flex;flex-direction:column;gap:${ulGap}px}
  .auto li{font-size:${railFont}px;border:1px solid #d4e4fb;border-radius:7px;padding:${optPadY}px 8px;color:#3a4456;background:#fff;display:flex;align-items:center;gap:7px}
  .auto li .ol{width:16px;height:16px;border-radius:4px;background:#e7eefb;color:#2563eb;font-weight:800;font-size:9px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}
  .auto li.ok{border-color:#1a7a37;background:#eafaef;color:#1a7a37;font-weight:700}
  .auto li.ok .ol{background:#1a7a37;color:#fff}
  .auto .exp{font-size:10.5px;color:#5b6472;line-height:1.4;padding-top:8px;border-top:1px solid #d9e6fb;display:-webkit-box;-webkit-line-clamp:${expLines};-webkit-box-orient:vertical;overflow:hidden}
  .auto .exp b{color:#1a7a37}

  .footer{height:${FOOTER_H}px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;background:#061B49;color:#fff;font-size:14px;letter-spacing:.04em;font-weight:750}
  .footer .brand{justify-self:start;font-weight:800;letter-spacing:.01em}
  .footer .series{justify-self:center;opacity:.94;font-weight:600}
  .footer .pg{justify-self:end;opacity:.82;font-variant-numeric:tabular-nums}
</style></head>
<body><div class="page">
  <div class="topbar"><span class="badge">AI-200</span><span class="dom">${esc(seed.domainLabel)}</span></div>
  <div class="hero">
    <h1>${esc(seed.title)}${subRedundant ? "" : ` <span class="sd">— ${esc(seed.subtitle)}</span>`}</h1>
    <p class="ctx">${esc(seed.context)}</p>
    <div class="ticon-slot">${heroIcon(seed)}</div>
  </div>
  <div class="guide"><svg class="gi" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9.2" stroke="#2563eb" stroke-width="1.5"/><path d="M9.4 9.3a2.6 2.6 0 0 1 4.8 1.3c0 1.7-2.1 1.9-2.1 3.3" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/><circle cx="12.1" cy="16.8" r="1" fill="#2563eb"/></svg><span class="lbl">Pregunta guía</span><span class="gq">${esc(seed.guideQuestion)}</span></div>
  <div class="body">
    <div class="upper">
      ${opts.imageUrl
        ? `<img class="visual"${imgStyle} src="${esc(opts.imageUrl)}" alt="${esc(seed.upperVisualAlt)}">`
        : `<span class="slotlabel">Bloque visual · ${esc(recipe.label)} · placeholder (sin imagen)</span><div class="cards">${cardsHtml}</div>`}
    </div>
    ${synthHtml}
    <div class="rail">
      <div class="traps"><span class="rhead">Trampas del examen</span>${trapsHtml}</div>
      <div class="auto"><span class="rhead">Verificación autocheck</span><div class="q">${esc(ac.question)}</div><ul>${optsHtml}</ul><p class="exp"><b>Por qué:</b> ${esc(ac.explanation)}</p></div>
    </div>
  </div>
  <div class="footer"><span class="brand">CloudBooks</span><span class="series">Visual Atlas</span><span class="pg">${esc(seed.pageNumber)}/${seed.totalPages}</span></div>
</div></body></html>`;

  const checks: StructuralCheck[] = [
    { name: "Hero con título", ok: seed.title.trim().length > 0 },
    { name: "Bajada + contexto en hero", ok: seed.subtitle.trim().length > 0 && seed.context.trim().length > 0 },
    { name: "Pregunta guía única", ok: seed.guideQuestion.trim().length > 0 },
    { name: "Bloque visual ≥ 3 tarjetas", ok: cards.length >= 3 },
    { name: "Rail con ≥ 2 trampas", ok: trapsShown.length >= 2 },
    { name: "Autocheck (pregunta + ≥3 opciones + explicación)", ok: ac.question.trim().length > 0 && ac.options.length >= 3 && ac.explanation.trim().length > 0 },
    { name: "Cintillos de marca (topbar + footer)", ok: true },
    { name: `Lienzo ${PAGE_W}×${PAGE_H}`, ok: true },
  ];
  const passedCount = checks.filter((c) => c.ok).length;

  return {
    html,
    structural: {
      passed: passedCount === checks.length,
      score: Math.round((passedCount / checks.length) * 100) / 10,
      checks,
    },
  };
}
