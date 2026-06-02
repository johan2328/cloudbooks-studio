import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";

export interface StructuralQaResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  score: number;
  layoutEvidence: VisualAtlasLayoutEvidence;
}

export interface QaDimensionScores {
  artDirection:         number;
  editorialConsistency: number;
  readability:          number;
  technicalAccuracy:    number;
  density:              number;
  commercialRisk:       number;
  avg:                  number;
  verdict:              "needs_visual_review" | "needs_revision";
  verdictLabel:         string;
}

export interface VisualAtlasLayoutEvidence {
  page: {
    width: number;
    height: number;
  };
  zonesPresent: Record<"topbar" | "hero" | "guide" | "body" | "upper" | "exam" | "footer", boolean>;
  upper: {
    rowHeight: number;
    slotHeight: number;
    slotWidth: number;
    freeVerticalPx: number;
    imageSlotSharePct: number;
  };
  examRail: {
    rowHeight: number;
    sharePct: number;
    trapItems: number;
    autocheckOptions: number;
    discardNotes: number;
    fillerBlocks: number;
    trapChars: number;
    autocheckChars: number;
    densityBand: "thin" | "balanced" | "dense";
  };
  projectedVsReal: {
    expectedBodyHeight: number;
    measuredBodyHeight: number;
    bodyDeltaPx: number;
    expectedUpperRowHeight: number;
    upperDeltaPx: number;
  };
  warnings: string[];
  blockers: string[];
  score: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function countMatches(html: string, pattern: RegExp): number {
  return Array.from(html.matchAll(pattern)).length;
}

function readDataNumber(html: string, key: string, fallback: number): number {
  const pattern = new RegExp(`data-${key}="([0-9.]+)"`);
  const match = html.match(pattern);
  if (!match) return fallback;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

function extractExpectedUpperRowHeight(rows: string): number {
  const match = rows.match(/^(\d+)px\s+/);
  if (!match) return 690;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 690;
}

export function measureVisualAtlasRender(html: string, data: VisualAtlasPageData): VisualAtlasLayoutEvidence {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const pageWidth = readDataNumber(html, "page-width", contract.page.width);
  const pageHeight = readDataNumber(html, "page-height", contract.page.height);
  const upperRowHeight = readDataNumber(html, "upper-height", contract.upperVisual.slotHeight);
  const examRailHeight = readDataNumber(html, "exam-rail-height", 0);
  const slotHeight = readDataNumber(html, "upper-slot-height", contract.upperVisual.slotHeight);
  const slotWidth = readDataNumber(html, "upper-slot-width", contract.upperVisual.slotWidth);
  const bodyHeight = upperRowHeight + examRailHeight;
  const expectedBodyHeight = 872;
  const expectedUpperRowHeight = extractExpectedUpperRowHeight(contract.page.bodyRows);
  const trapItems = countMatches(html, /class="trap-item"/g);
  const autocheckOptions = countMatches(html, /class="option-row/g);
  const discardNotes = countMatches(html, /class="discard-note"/g);
  const fillerBlocks = countMatches(html, /class="rail-fill"/g);
  const trapChars = data.traps.slice(0, 3).reduce((sum, item) => sum + item.wrong.length + item.correction.length, 0);
  const autocheckChars =
    data.autocheck.question.length
    + data.autocheck.explanation.length
    + data.autocheck.options.join(" ").length
    + data.autocheck.discardNotes.join(" ").length;
  const railDensity = (trapChars + autocheckChars) / Math.max(1, examRailHeight);
  const densityBand: VisualAtlasLayoutEvidence["examRail"]["densityBand"] =
    railDensity < 2.5 ? "thin" : railDensity > 5.2 ? "dense" : "balanced";

  const zonesPresent = {
    topbar: html.includes('data-zone="topbar"') || html.includes('class="topbar"'),
    hero: html.includes('data-zone="hero"') || html.includes('class="hero"'),
    guide: html.includes('data-zone="guide"') || html.includes('class="guide"'),
    body: html.includes('data-zone="body"') || html.includes('class="body"'),
    upper: html.includes('data-zone="upper_visual"') || html.includes('class="upper"'),
    exam: html.includes('data-zone="exam_rail"') || html.includes('class="exam"'),
    footer: html.includes('data-zone="footer"') || html.includes('class="footer"'),
  };

  const warnings: string[] = [];
  const blockers: string[] = [];
  const freeVerticalPx = Math.max(0, upperRowHeight - slotHeight - 18);
  const imageSlotSharePct = upperRowHeight > 0 ? roundOne((slotHeight / upperRowHeight) * 100) : 0;
  const examShare = bodyHeight > 0 ? roundOne((examRailHeight / bodyHeight) * 100) : 0;

  for (const [zone, ok] of Object.entries(zonesPresent)) {
    if (!ok) blockers.push(`Zona obligatoria ausente: ${zone}.`);
  }
  if (pageWidth !== contract.page.width || pageHeight !== contract.page.height) {
    blockers.push(`Canvas fuera de contrato: ${pageWidth}x${pageHeight}.`);
  }
  if (Math.abs(bodyHeight - expectedBodyHeight) > 2) {
    blockers.push(`Body height no cierra: ${bodyHeight}px vs ${expectedBodyHeight}px.`);
  }
  if (trapItems !== 3) blockers.push(`Trampas esperadas: 3; detectadas: ${trapItems}.`);
  if (autocheckOptions < 4) blockers.push(`Autocheck esperado: 4 opciones; detectadas: ${autocheckOptions}.`);
  if (examRailHeight > 278 && data.layoutRecipe?.railStrategy !== "dense") warnings.push(`Rail inferior alto (${examRailHeight}px); puede competir con el nucleo visual.`);
  if (examRailHeight < 168) warnings.push(`Rail inferior muy compacto (${examRailHeight}px); revisar legibilidad de traps/autocheck.`);
  if (freeVerticalPx > 92) warnings.push(`Upper visual deja ${freeVerticalPx}px verticales sin uso activo dentro del row.`);
  if (imageSlotSharePct < 78) warnings.push(`La imagen ocupa solo ${imageSlotSharePct}% del alto disponible del upper row.`);
  if (densityBand === "thin") warnings.push("Rail inferior con baja densidad util: conviene compactar o enriquecer microexplicaciones.");
  if (densityBand === "thin" && examRailHeight > 220) {
    warnings.push("Densidad falsa: el rail ocupa altura relevante pero aporta poca lectura util.");
  }
  if (densityBand === "dense") warnings.push("Rail inferior denso: verificar microtipografia antes de aprobar.");
  if (fillerBlocks > 0 && data.layoutRecipe?.railStrategy !== "dense") {
    warnings.push("Notas de cierre detectadas fuera de Rail Dense: posible filler visual.");
  }
  if (data.layoutRecipe?.railStrategy === "compact" && examRailHeight > 240) {
    blockers.push(`Rail compact solicitado pero renderizado alto: ${examRailHeight}px.`);
  }
  if (data.upperVisualSrc === "placeholder") {
    blockers.push("Upper visual placeholder: la pagina no es salida editorial evaluable.");
  }

  const penalty = blockers.length * 1.4 + warnings.length * 0.35;
  const score = roundOne(clamp(10 - penalty, 0, 10));

  return {
    page: {
      width: pageWidth,
      height: pageHeight,
    },
    zonesPresent,
    upper: {
      rowHeight: upperRowHeight,
      slotHeight,
      slotWidth,
      freeVerticalPx,
      imageSlotSharePct,
    },
    examRail: {
      rowHeight: examRailHeight,
      sharePct: examShare,
      trapItems,
      autocheckOptions,
      discardNotes,
      fillerBlocks,
      trapChars,
      autocheckChars,
      densityBand,
    },
    projectedVsReal: {
      expectedBodyHeight,
      measuredBodyHeight: bodyHeight,
      bodyDeltaPx: bodyHeight - expectedBodyHeight,
      expectedUpperRowHeight,
      upperDeltaPx: upperRowHeight - expectedUpperRowHeight,
    },
    warnings,
    blockers,
    score,
  };
}

/**
 * Deterministic structural QA against the centralized Visual Atlas v24 contract.
 * Human visual QA still decides whether the generated upper visual reaches 9.5.
 */
export function runStructuralQa(html: string, data: VisualAtlasPageData): StructuralQaResult {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const layoutEvidence = measureVisualAtlasRender(html, data);
  const checks = [
    {
      name: `Dimensions ${contract.page.width}x${contract.page.height}`,
      ok: html.includes(`width: ${contract.page.width}px`) && html.includes(`height: ${contract.page.height}px`),
    },
    { name: `Grid rows ${contract.page.gridRows}`, ok: html.includes(contract.page.gridRows) },
    {
      name: `Body rows close ${layoutEvidence.projectedVsReal.expectedBodyHeight}px`,
      ok: Math.abs(layoutEvidence.projectedVsReal.bodyDeltaPx) <= 2,
      detail: `${layoutEvidence.projectedVsReal.measuredBodyHeight}px measured`,
    },
    { name: `Editorial background ${contract.page.background}`, ok: html.includes(`background: ${contract.page.background}`) },
    { name: `Topbar/footer ${contract.chrome.topbar.background}`, ok: html.includes(contract.chrome.topbar.background) },
    { name: `Topbar font ${contract.chrome.topbar.fontSize}px`, ok: html.includes(`font-size: ${contract.chrome.topbar.fontSize}px`) },
    { name: "Topbar without certification badge", ok: !html.includes('class="tb-badge"') },
    { name: "Title present in h1", ok: html.includes(data.title) },
    { name: "Context deck present", ok: html.includes(data.context.slice(0, 40)) },
    { name: "Guide question present", ok: html.includes(data.guideQuestion.slice(0, 30)) },
    { name: "Guide icon present", ok: html.includes('class="guide-mark"') && html.includes('aria-hidden="true"') },
    { name: "Domain title icon present", ok: html.includes('class="title-icon"') },
    { name: "Upper visual block exists", ok: html.includes('class="upper"') },
    { name: "Exam traps: 3 items", ok: data.traps.length === 3 },
    { name: "Exam traps rendered: 3 items", ok: layoutEvidence.examRail.trapItems === 3 },
    { name: "Autocheck rendered: 4 options", ok: layoutEvidence.examRail.autocheckOptions >= 4 },
    { name: "Post-render layout without blockers", ok: layoutEvidence.blockers.length === 0 },
    { name: `Exam traps header ${contract.page.trapColor}`, ok: html.includes(contract.page.trapColor) },
    { name: "Exam traps without strikethrough", ok: html.includes(`text-decoration: ${contract.exam.trapWrongTextDecoration}`) },
    { name: "Exam traps labels present", ok: html.includes(contract.exam.trapWrongLabel) && html.includes(contract.exam.trapCorrectionLabel) },
    { name: `Guide border ${contract.page.guideColor}`, ok: html.includes(contract.page.guideColor) },
    { name: "Footer brand present", ok: html.includes(contract.chrome.footer.brandText) },
    { name: `Footer font ${contract.chrome.footer.fontSize}px`, ok: html.includes(`font-size: ${contract.chrome.footer.fontSize}px`) },
    { name: "No external CDNs", ok: !html.includes("googleapis.com") && !html.includes("cloudflare.com") },
    { name: "No dark app body background", ok: !html.includes("background: #0d1629") },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return { passed: passed === total, checks, score: Math.round((passed / total) * 10), layoutEvidence };
}

/**
 * Deterministic QA dimensions. These are conservative until human visual QA
 * confirms the upper visual against the art direction threshold.
 */
export function computeQaDimensionScores(imageGenerated: boolean, layoutEvidence?: VisualAtlasLayoutEvidence): QaDimensionScores {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const blockerPenalty = (layoutEvidence?.blockers.length ?? 0) * 0.6;
  const warningPenalty = (layoutEvidence?.warnings.length ?? 0) * 0.18;
  const layoutPenalty = blockerPenalty + warningPenalty;
  const usefulDensityBonus = layoutEvidence?.examRail.densityBand === "balanced" ? 0.5 : -0.3;
  const falseDensityPenalty =
    layoutEvidence?.examRail.densityBand === "thin" && (layoutEvidence.examRail.rowHeight ?? 0) > 220
      ? 0.75
      : 0;
  const upperUsePenalty = (layoutEvidence?.upper.freeVerticalPx ?? 0) > 92 ? 0.5 : 0;
  const artDirection = roundOne(clamp((imageGenerated ? 7 : 5) + (layoutEvidence?.score ?? 7) * 0.08 - layoutPenalty - upperUsePenalty, 0, 10));
  const editorialConsistency = roundOne(clamp((imageGenerated ? 7 : 5) + (layoutEvidence?.blockers.length ? -0.4 : 0.2) - warningPenalty, 0, 10));
  const readability = roundOne(clamp(8 - Math.max(0, (layoutEvidence?.examRail.sharePct ?? 0) - 26) * 0.03 - warningPenalty, 0, 10));
  const technicalAccuracy = 10;
  const density = roundOne(clamp((imageGenerated ? 7 : 4) + usefulDensityBonus - upperUsePenalty - warningPenalty - falseDensityPenalty, 0, 10));
  const commercialRisk = roundOne(clamp(10 - blockerPenalty - warningPenalty - (imageGenerated ? 0 : 1.5), 0, 10));
  const avg = roundOne(
    (artDirection + editorialConsistency + readability + technicalAccuracy + density + commercialRisk) / 6,
  );
  if (!imageGenerated) {
    return {
      artDirection: Math.min(artDirection, 6.2),
      editorialConsistency: Math.min(editorialConsistency, 6.5),
      readability: Math.min(readability, 6.5),
      technicalAccuracy: Math.min(technicalAccuracy, 6.5),
      density: Math.min(density, 6),
      commercialRisk: Math.min(commercialRisk, 6),
      avg: Math.min(avg, 6.5),
      verdict: "needs_revision",
      verdictLabel: "Blocked: upper visual is not a real premium image; QA max 6.5",
    };
  }
  const verdict = imageGenerated ? "needs_visual_review" as const : "needs_revision" as const;
  const verdictLabel = imageGenerated
    ? `Requires human visual review: target ${contract.qa.humanArtScoreToProduce}/10 before production`
    : "Blocked: upper visual is not a real premium image";
  return {
    artDirection,
    editorialConsistency,
    readability,
    technicalAccuracy,
    density,
    commercialRisk,
    avg,
    verdict,
    verdictLabel,
  };
}
