import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";

/**
 * GOLDEN MASTER v24 — renderVisualAtlasPage(data)
 * Plantilla cerrada 768×1152 · light editorial · estructura fija bloqueada.
 * La IA NO diseña layout. Solo aporta la imagen del bloque visual superior.
 * DOM: main.page > topbar / hero / guide / body(upper+exam) / footer
 *
 * Renderer determinístico — único punto de ensamblado para page.html.
 */
export function renderVisualAtlasPage(data: VisualAtlasPageData): string {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];
  const contract = VISUAL_ATLAS_V24_CONTRACT;

  /* ── Icono de título ─────────────────────────────────────────────────── */
  const titleIconSvg = `<svg class="title-icon" width="${contract.hero.iconWidth}" height="${contract.hero.iconHeight}" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Soluciones contenerizadas en Azure">
    <ellipse cx="104" cy="62" rx="48" ry="43" fill="#F7FBFF" stroke="#D5E6F7" stroke-width="2.5"/>
    <path d="M66 91h78c15 0 27-10 27-24 0-12-10-22-23-23-5-14-18-22-33-20-12 2-21 10-25 22-13-2-25 8-25 21 0 9 3 16 1 24Z" fill="#FCFEFF" stroke="#4F8FE8" stroke-width="4.5" stroke-linejoin="round"/>
    <g transform="translate(78 42)">
      <path d="M8 12 39 1l31 11v42L39 67 8 54Z" fill="#ECF5FF" stroke="#526E97" stroke-width="3.5" stroke-linejoin="round"/>
      <path d="M39 1v66M8 12l31 11 31-11" stroke="#526E97" stroke-width="2.6"/>
      <rect x="21" y="24" width="35" height="22" rx="2.5" fill="#2F86E8" stroke="#526E97" stroke-width="2.5"/>
      <path d="M28 27v16M39 26v18M49 27v16" stroke="#C9E5FF" stroke-width="2.3"/>
    </g>
    <path d="M45 31c13-12 29-18 49-18" stroke="#0E7490" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 7"/>
    <path d="M47 102c11 7 22 11 39 13" stroke="#0E7490" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 7"/>
  </svg>`;

  /* ── Upper visual — imagen real o placeholder claro ──────────────────── */
  const upperVisualHtml = data.upperVisualSrc === "placeholder"
    ? `<div class="upper-placeholder">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="12" width="36" height="26" rx="3" fill="#E2E8F0"/>
          <rect x="4" y="12" width="36" height="9" rx="3" fill="#CBD5E1"/>
          <rect x="8" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
          <rect x="18" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
          <rect x="28" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
        </svg>
        <div class="upper-placeholder-label">Visual superior pendiente</div>
        <div class="upper-placeholder-sub">Se insertará upper-art generado con gpt-image-2 medium</div>
      </div>`
    : `<img src="${data.upperVisualSrc}" alt="${data.upperVisualAlt}">`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=${contract.page.width}">
<title>Pág. ${data.pageNumber}/${data.totalPages} — ${data.title} · AI-200 Visual Study Atlas</title>
<style>
/* ── GOLDEN MASTER v24 · LIGHT EDITORIAL · LOCKED ─────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: ${contract.page.background};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
}

/* ── .page — contenedor libro 768×1152 ──────────────────────────────────── */
.page {
  width: ${contract.page.width}px;
  height: ${contract.page.height}px;
  background: #ffffff;
  display: grid;
  grid-template-rows: ${contract.page.gridRows};
  overflow: hidden;
  box-shadow: 0 4px 32px rgba(0,0,0,0.12);
}

/* ── TOPBAR ─────────────────────────────────────────────────────────────── */
.topbar {
  background: ${contract.chrome.topbar.background};
  color: ${contract.chrome.topbar.color};
  font-size: ${contract.chrome.topbar.fontSize}px;
  font-weight: ${contract.chrome.topbar.fontWeight};
  letter-spacing: ${contract.chrome.topbar.letterSpacing};
  text-transform: ${contract.chrome.topbar.textTransform};
  display: flex;
  align-items: center;
  padding: 0 ${contract.chrome.topbar.paddingX}px;
}
.tb-spacer { flex: 1; }

/* ── HERO ───────────────────────────────────────────────────────────────── */
.hero {
  background: #ffffff;
  border-bottom: 1px solid #dde3ed;
  display: grid;
  grid-template-columns: 1fr 108px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "title icon"
    "deck  icon";
  padding: 16px 20px 16px 22px;
  gap: 6px 14px;
  overflow: hidden;
}
h1 {
  grid-area: title;
  font-size: ${contract.hero.titleFontSize}px;
  font-weight: 900;
  color: #06133E;
  line-height: ${contract.hero.titleLineHeight};
  letter-spacing: -0.022em;
  align-self: end;
}
.deck {
  grid-area: deck;
  font-size: ${contract.hero.deckFontSize}px;
  color: #2d3a5c;
  line-height: ${contract.hero.deckLineHeight};
  align-self: start;
}
.icon-slot {
  grid-area: icon;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.72;
}

/* ── GUIDE ──────────────────────────────────────────────────────────────── */
.guide {
  background: #f0f7ff;
  border-bottom: 2px solid ${contract.page.guideColor};
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 9px;
  overflow: hidden;
}
.guide-mark {
  width: ${contract.guide.markerSize}px; height: ${contract.guide.markerSize}px;
  background: ${contract.page.guideColor};
  color: #ffffff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guide > span {
  font-size: ${contract.guide.fontSize}px;
  color: #0d2260;
  line-height: 1.28;
  white-space: normal;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.guide strong {
  font-weight: 800;
  color: ${contract.page.guideColor};
  letter-spacing: 0.06em;
  margin-right: 5px;
}

/* ── BODY (main content area) ───────────────────────────────────────────── */
section.body {
  display: grid;
  grid-template-rows: ${contract.page.bodyRows};
  overflow: hidden;
}

/* ── UPPER VISUAL ───────────────────────────────────────────────────────── */
.upper {
  background: #ffffff;
  border-bottom: 1px solid #dde3ed;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${(contract.page.width - contract.upperVisual.slotWidth) / 2}px;
}
.upper img {
  width: ${contract.upperVisual.slotWidth}px;
  height: ${contract.upperVisual.slotHeight}px;
  object-fit: contain;
  display: block;
}
.upper-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% - 40px);
  height: calc(100% - 40px);
  border: 2px dashed #c8d6e8;
  border-radius: 8px;
  background: #f8fafd;
}
.upper-placeholder-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7a99;
}
.upper-placeholder-sub { font-size: 10px; color: #9ca3af; }

/* ── EXAM (trampas + autocheck) ─────────────────────────────────────────── */
.exam {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
}

/* ── MODULE ─────────────────────────────────────────────────────────────── */
.mod {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mod.traps { border-right: 1px solid #dde3ed; }
.mod-header {
  padding: ${contract.exam.headerPaddingY}px 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.mod.traps .mod-header { background: ${contract.page.trapColor}; }
.mod.check .mod-header { background: ${contract.chrome.footer.background}; }
.mod-header-label {
  font-size: ${contract.exam.headerFontSize}px;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #ffffff;
}
.mod-body {
  flex: 1;
  padding: ${contract.exam.bodyPaddingY}px 14px;
  display: flex;
  flex-direction: column;
  gap: ${contract.exam.bodyGap}px;
  overflow: hidden;
}
.mod.traps .mod-body { background: #fff9f9; }
.mod.check .mod-body { background: #f8faff; }
.mod.traps .mod-body,
.mod.check .mod-body { justify-content: space-between; }

/* Trap items */
.trap-item { display: flex; gap: 8px; align-items: flex-start; }
.trap-num {
  flex-shrink: 0;
  width: 17px; height: 17px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 800;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
}
.trap-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.trap-wrong {
  font-size: ${contract.exam.trapWrongFontSize}px;
  font-weight: 700;
  color: #7f1d1d;
  text-decoration: ${contract.exam.trapWrongTextDecoration};
}
.trap-wrong::before {
  content: "${contract.exam.trapWrongLabel}: ";
  color: #dc2626;
  font-weight: 900;
}
.trap-arrow { display: none; }
.trap-correction { font-size: ${contract.exam.trapCorrectionFontSize}px; color: #1f2937; line-height: 1.42; }
.trap-correction::before {
  content: "${contract.exam.trapCorrectionLabel}: ";
  color: #047857;
  font-weight: 900;
}

/* Autocheck items */
.autocheck-question { font-size: ${contract.exam.autocheckQuestionFontSize}px; font-weight: 700; color: #06133E; line-height: 1.34; }
.autocheck-options { display: flex; flex-direction: column; gap: 4px; }
.option-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: ${contract.exam.optionPaddingY}px 8px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
  font-size: ${contract.exam.optionFontSize}px;
}
.option-row.correct { background: #d1fae5; border-color: #6ee7b7; color: #065f46; font-weight: 700; }
.option-row.wrong-opt { background: #f9fafb; color: #6b7280; }
.option-badge {
  flex-shrink: 0;
  width: 16px; height: 16px;
  border-radius: 50%;
  font-size: 8px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.option-row.correct .option-badge { background: #a7f3d0; color: #065f46; }
.option-row.wrong-opt .option-badge { background: #e5e7eb; color: #6b7280; }
.autocheck-explanation {
  font-size: ${contract.exam.explanationFontSize}px;
  color: #1f2937;
  line-height: 1.45;
  padding: 6px 8px;
  background: #ecfdf5;
  border-left: 2px solid #34d399;
  border-radius: 0 3px 3px 0;
}
.discard-notes { display: flex; flex-direction: column; gap: 2px; }
.discard-note { font-size: ${contract.exam.discardFontSize}px; color: #9ca3af; line-height: 1.32; }

/* ── FOOTER ─────────────────────────────────────────────────────────────── */
.footer {
  background: ${contract.chrome.footer.background};
  color: ${contract.chrome.footer.color};
  font-size: ${contract.chrome.footer.fontSize}px;
  font-weight: ${contract.chrome.footer.fontWeight};
  display: flex;
  align-items: center;
  padding: 0 ${contract.chrome.footer.paddingX}px;
  justify-content: space-between;
}
.page-no { font-weight: ${contract.chrome.footer.fontWeight}; }
</style>
</head>
<body>

<main class="page">

  <div class="topbar">
    ${data.domainLabel}
  </div>

  <section class="hero">
    <h1>${data.title} — ${data.subtitle}</h1>
    <div class="deck">${data.context}</div>
    <div class="icon-slot">${titleIconSvg}</div>
  </section>

  <section class="guide">
    <span class="guide-mark"><svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true"><rect x="2" y="5" width="5" height="7" rx="2" stroke="white" stroke-width="2"/><rect x="11" y="5" width="5" height="7" rx="2" stroke="white" stroke-width="2"/><path d="M7 8.5h4M4.5 12.5l-1.2 2M13.5 12.5l1.2 2" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></span>
    <span><strong>PREGUNTA GUÍA:</strong>${data.guideQuestion}</span>
  </section>

  <section class="body">
    <div class="upper">
      ${upperVisualHtml}
    </div>
    <div class="exam">

      <section class="mod traps">
        <div class="mod-header">
          <span class="mod-header-label">⚠ Trampas del examen</span>
        </div>
        <div class="mod-body">
          ${data.traps.map((t, i) => `<div class="trap-item">
            <div class="trap-num">${i + 1}</div>
            <div class="trap-content">
              <div class="trap-wrong">${t.wrong}</div>
              <div class="trap-arrow">→</div>
              <div class="trap-correction">${t.correction}</div>
            </div>
          </div>`).join("\n          ")}
        </div>
      </section>

      <section class="mod check">
        <div class="mod-header">
          <span class="mod-header-label">✓ Verificación autocheck</span>
        </div>
        <div class="mod-body">
          <div class="autocheck-question">${data.autocheck.question}</div>
          <div class="autocheck-options">
            ${data.autocheck.options.map((opt, i) => `<div class="option-row ${i === data.autocheck.correctOption ? "correct" : "wrong-opt"}">
              <span class="option-badge">${optionLetters[i]}</span>
              <span>${opt.replace(/^[A-D]\.\s*/, "")}</span>
              ${i === data.autocheck.correctOption ? '<span style="margin-left:auto;font-size:10px;">✓</span>' : ""}
            </div>`).join("\n            ")}
          </div>
          <div class="autocheck-explanation">${data.autocheck.explanation}</div>
          <div class="discard-notes">
            ${data.autocheck.discardNotes.map(n => `<div class="discard-note">• ${n}</div>`).join("\n            ")}
          </div>
        </div>
      </section>

    </div>
  </section>

  <footer class="footer">
    <span>${contract.chrome.footer.brandText}</span>
    <span class="page-no">${data.pageNumber}/${data.totalPages}</span>
  </footer>

</main>
</body>
</html>`;
}
