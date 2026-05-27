import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";

function inferTopicFamily(data: VisualAtlasPageData): "containers" | "identity" | "networking" | "security" | "lifecycle" | "generic" {
  const text = `${data.title} ${data.subtitle} ${data.context}`.toLowerCase();
  if (/(acr|container|registry|docker|imagen)/.test(text)) return "containers";
  if (/(identity|identidad|token|rol|managed identity|service principal)/.test(text)) return "identity";
  if (/(network|dns|firewall|private endpoint|endpoint|vnet|red)/.test(text)) return "networking";
  if (/(security|vulnerab|defender|cve|secure|seguridad)/.test(text)) return "security";
  if (/(retention|cleanup|lifecycle|tasks|task|policy|limpieza|ciclo)/.test(text)) return "lifecycle";
  return "generic";
}

function renderHeroIcon(data: VisualAtlasPageData): string {
  const family = inferTopicFamily(data);

  if (family === "containers") {
    return `<svg class="title-icon" width="${VISUAL_ATLAS_V24_CONTRACT.hero.iconWidth}" height="${VISUAL_ATLAS_V24_CONTRACT.hero.iconHeight}" viewBox="0 0 196 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Registro de contenedores">
      <ellipse cx="118" cy="69" rx="56" ry="49" fill="#F8FBFF" stroke="#D6E5F6" stroke-width="2.5"/>
      <path d="M64 99h88c18 0 31-12 31-27 0-14-10-25-24-27-4-18-20-30-38-30-15 0-29 9-35 23-16-1-29 11-29 26 0 13 3 23 7 35Z" fill="#FCFEFF" stroke="#74A6F2" stroke-width="4.5" stroke-linejoin="round"/>
      <g transform="translate(81 34)">
        <path d="M11 14 49 1l38 13v50L49 78 11 64Z" fill="#EFF6FF" stroke="#5E7497" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M49 1v77M11 14l38 13 38-13" stroke="#5E7497" stroke-width="2.6"/>
        <rect x="27" y="28" width="44" height="25" rx="3" fill="#2F86E8" stroke="#5E7497" stroke-width="2.4"/>
        <path d="M35 31v19M48 30v21M60 31v19" stroke="#CBE6FF" stroke-width="2.2"/>
      </g>
      <circle cx="54" cy="92" r="11" fill="#F0FDFA" stroke="#14B8A6" stroke-width="3"/>
      <path d="M54 86v12M48 92h12" stroke="#0F766E" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M38 34c15-13 32-19 54-19" stroke="#0891B2" stroke-width="3.1" stroke-linecap="round" stroke-dasharray="2 7"/>
      <path d="M42 113c12 8 28 12 46 14" stroke="#0891B2" stroke-width="3.1" stroke-linecap="round" stroke-dasharray="2 7"/>
    </svg>`;
  }

  if (family === "networking") {
    return `<svg class="title-icon" width="${VISUAL_ATLAS_V24_CONTRACT.hero.iconWidth}" height="${VISUAL_ATLAS_V24_CONTRACT.hero.iconHeight}" viewBox="0 0 196 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Red y acceso privado">
      <circle cx="126" cy="67" r="46" fill="#F8FBFF" stroke="#D6E5F6" stroke-width="2.5"/>
      <circle cx="126" cy="67" r="28" stroke="#74A6F2" stroke-width="4"/>
      <path d="M80 67h92M126 21v92M98 39c8 7 18 11 28 11 10 0 20-4 28-11M98 95c8-7 18-11 28-11 10 0 20 4 28 11" stroke="#74A6F2" stroke-width="3"/>
      <rect x="26" y="56" width="30" height="20" rx="3" fill="#EFF6FF" stroke="#2F86E8" stroke-width="3"/>
      <path d="M56 66h26" stroke="#2F86E8" stroke-width="3" stroke-linecap="round"/>
      <path d="M78 50h42v34H78z" stroke="#14B8A6" stroke-width="3" stroke-dasharray="5 4"/>
      <path d="M94 67c0-8 7-15 15-15 8 0 15 7 15 15" stroke="#0F766E" stroke-width="3"/>
      <rect x="101" y="67" width="16" height="16" rx="3" fill="#E0F2FE" stroke="#0F766E" stroke-width="3"/>
    </svg>`;
  }

  if (family === "identity") {
    return `<svg class="title-icon" width="${VISUAL_ATLAS_V24_CONTRACT.hero.iconWidth}" height="${VISUAL_ATLAS_V24_CONTRACT.hero.iconHeight}" viewBox="0 0 196 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Identidad y acceso">
      <circle cx="124" cy="68" r="48" fill="#F8FBFF" stroke="#D6E5F6" stroke-width="2.5"/>
      <path d="M124 28 154 40v28c0 19-12 35-30 42-18-7-30-23-30-42V40l30-12Z" fill="#EEF5FF" stroke="#2F86E8" stroke-width="4"/>
      <path d="M124 49c8 0 14 6 14 14v8h-28v-8c0-8 6-14 14-14Z" fill="#CBE6FF"/>
      <circle cx="124" cy="43" r="8" fill="#2F86E8"/>
      <path d="M50 92c8-18 23-30 42-34" stroke="#14B8A6" stroke-width="3.2" stroke-dasharray="2 7" stroke-linecap="round"/>
      <rect x="30" y="82" width="18" height="24" rx="4" fill="#F8FAFC" stroke="#64748B" stroke-width="3"/>
      <rect x="34" y="70" width="10" height="16" rx="5" fill="#E0F2FE" stroke="#2F86E8" stroke-width="2.5"/>
      <path d="M146 88h18v18h-18z" fill="#ECFDF5" stroke="#14B8A6" stroke-width="3"/>
      <path d="m151 97 5 5 9-10" stroke="#0F766E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  return `<svg class="title-icon" width="${VISUAL_ATLAS_V24_CONTRACT.hero.iconWidth}" height="${VISUAL_ATLAS_V24_CONTRACT.hero.iconHeight}" viewBox="0 0 196 138" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Patrón técnico">
    <rect x="38" y="28" width="120" height="82" rx="16" fill="#F8FBFF" stroke="#D6E5F6" stroke-width="2.5"/>
    <rect x="58" y="48" width="34" height="22" rx="4" fill="#EFF6FF" stroke="#2F86E8" stroke-width="3"/>
    <rect x="106" y="48" width="34" height="22" rx="4" fill="#ECFDF5" stroke="#14B8A6" stroke-width="3"/>
    <rect x="82" y="80" width="34" height="22" rx="4" fill="#F5F3FF" stroke="#7C3AED" stroke-width="3"/>
    <path d="M92 59h14M123 70v10M92 92h24" stroke="#526E97" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
}

function renderGuideIcon(size: number): string {
  const iconSize = Math.max(14, size - 8);
  return `<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke="white" stroke-width="2.2"/>
    <circle cx="12" cy="12" r="2.3" fill="white"/>
    <path d="M12 1.8v3.2M12 19v3.2M1.8 12H5M19 12h3.2" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

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
  const trapItems = data.traps.slice(0, 3);
  const discardNotes = data.autocheck.discardNotes.slice(0, 2);

  /* ── Icono de título ─────────────────────────────────────────────────── */
  const titleIconSvg = renderHeroIcon(data);
  const guideIconSvg = renderGuideIcon(contract.guide.markerSize);

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
  opacity: 0.9;
}

/* ── GUIDE ──────────────────────────────────────────────────────────────── */
.guide {
  background: #f0f7ff;
  border-bottom: 2px solid ${contract.page.guideColor};
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 10px;
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
.mod.check .mod-body { justify-content: flex-start; }

/* Trap items */
.trap-item { display: flex; gap: ${contract.exam.trapItemGap}px; align-items: flex-start; }
.trap-num {
  flex-shrink: 0;
  width: ${contract.exam.trapNumberSize}px; height: ${contract.exam.trapNumberSize}px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 50%;
  font-size: 7.4px;
  font-weight: 800;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
}
.trap-content { flex: 1; display: flex; flex-direction: column; gap: 1px; }
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
.trap-correction { font-size: ${contract.exam.trapCorrectionFontSize}px; color: #1f2937; line-height: 1.34; }
.trap-correction::before {
  content: "${contract.exam.trapCorrectionLabel}: ";
  color: #047857;
  font-weight: 900;
}

/* Autocheck items */
.autocheck-question { font-size: ${contract.exam.autocheckQuestionFontSize}px; font-weight: 700; color: #06133E; line-height: 1.28; }
.autocheck-options { display: flex; flex-direction: column; gap: 3px; }
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
  line-height: 1.34;
  padding: 5px 7px;
  background: #ecfdf5;
  border-left: 2px solid #34d399;
  border-radius: 0 3px 3px 0;
}
.discard-notes { display: flex; flex-direction: column; gap: 1px; }
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
    <span class="guide-mark">${guideIconSvg}</span>
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
          ${trapItems.map((t, i) => `<div class="trap-item">
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
            ${discardNotes.map(n => `<div class="discard-note">• ${n}</div>`).join("\n            ")}
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

