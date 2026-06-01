import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";
import { pageOutputDir, pagePublicPath } from "../../export/paths";
import { renderVisualAtlasPage } from "../../renderers/visual-atlas/render-golden-page";
import { runStructuralQa, computeQaDimensionScores, type QaDimensionScores, type StructuralQaResult } from "../../qa/visual-atlas/validate-page-html";
import { evaluateVisualAtlasLayoutEngine, type VisualAtlasLayoutEngineReport } from "../../layout/visual-atlas-layout-engine";
import { measureVisualAtlasPageVisuals, type VisualAtlasPageVisualMeasurement } from "../../visual-measurement/visual-atlas-page-measurement";
import { generateUpperVisual } from "./generate-upper-visual";

const GUARDRAIL_LABEL = VISUAL_ATLAS_V24_CONTRACT.generation.costGuardrail;
const TEXT_MODEL = VISUAL_ATLAS_V24_CONTRACT.generation.textModel;
const IMAGE_MODEL = VISUAL_ATLAS_V24_CONTRACT.generation.imageModel;
const IMAGE_QUALITY = VISUAL_ATLAS_V24_CONTRACT.generation.imageQuality;

export interface GeneratePageResult {
  pageId:          string;
  durationMs:      number;
  templateVersion: string;
  approach:        string;
  outputs: {
    html:       string;
    metadata:   string;
    qaReport:   string;
    previewPng: string | null;
  };
  imageGenerated: boolean;
  imageModel:     string | null;
  imageQuality:   string;
  imageError:     string | null;
  costGuardrail:  string;
  qaStructural:   StructuralQaResult;
  textModel:      string;
  generationSource: "locked_seed" | "composer_draft";
  composerDraft: {
    id: number;
    updatedAt: string;
    family: string;
    transitionLevel: string;
  } | null;
  qaBaselineTotal: number | null;
  qaDimensions: QaDimensionScores;
  layoutEngine: VisualAtlasLayoutEngineReport;
  visualMeasurement: VisualAtlasPageVisualMeasurement;
}

interface Logger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

interface GeneratePageOptions {
  generationSource?: "locked_seed" | "composer_draft";
  composerDraft?: {
    id: number;
    updatedAt: string;
    family: string;
    transitionLevel: string;
  } | null;
  qaBaselineTotal?: number | null;
  qaDimensionsOverride?: {
    artDirection: number;
    editorialConsistency: number;
    readability: number;
    technicalAccuracy: number;
    density: number;
    commercialRisk: number;
  } | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function applyVisualMeasurementToQaDimensions(
  base: QaDimensionScores,
  visual: VisualAtlasPageVisualMeasurement,
): QaDimensionScores {
  if (!visual.available) return base;

  const upperUsage = visual.zoneUsage.upper_visual;
  const examUsage = visual.zoneUsage.exam_rail;
  const visualWarningPenalty = visual.warnings.length * 0.08;
  const visualBlockerPenalty = visual.blockers.length * 0.25;

  const upperOccupancyPenalty =
    upperUsage && upperUsage.occupancyPct < 82
      ? Math.min(0.9, (82 - upperUsage.occupancyPct) * 0.04)
      : 0;
  const examFreeBottomPenalty =
    examUsage && examUsage.freeBottomPx > 40
      ? Math.min(1.1, (examUsage.freeBottomPx - 40) * 0.02)
      : 0;
  const microTypographyPenalty = Math.min(0.8, visual.typography.smallTextCount * 0.06);
  const overflowPenalty = Math.min(0.7, visual.overflow.count * 0.07);

  const visualPenalty =
    visualWarningPenalty
    + visualBlockerPenalty
    + upperOccupancyPenalty
    + examFreeBottomPenalty
    + microTypographyPenalty
    + overflowPenalty;

  const artDirection = roundOne(clamp(base.artDirection - visualPenalty, 0, 10));
  const readability = roundOne(clamp(base.readability - (examFreeBottomPenalty * 0.65 + microTypographyPenalty * 0.35), 0, 10));
  const density = roundOne(clamp(base.density - (examFreeBottomPenalty * 0.9 + upperOccupancyPenalty * 0.4), 0, 10));
  const editorialConsistency = roundOne(
    clamp(base.editorialConsistency - (visualWarningPenalty + visualBlockerPenalty + overflowPenalty * 0.4), 0, 10),
  );
  const technicalAccuracy = base.technicalAccuracy;
  const commercialRisk = roundOne(clamp(base.commercialRisk - (visualBlockerPenalty + visualWarningPenalty * 0.5), 0, 10));
  const avg = roundOne(
    (artDirection + editorialConsistency + readability + technicalAccuracy + density + commercialRisk) / 6,
  );

  return {
    ...base,
    artDirection,
    editorialConsistency,
    readability,
    technicalAccuracy,
    density,
    commercialRisk,
    avg,
  };
}

/**
 * Orquestador de generación Visual Atlas (página completa):
 *   1. generateUpperVisual → imagen gpt-image-2 medium o placeholder
 *   2. renderVisualAtlasPage → HTML golden master v24
 *   3. runStructuralQa → validación determinística de la plantilla
 *   4. Escribe page.html, metadata.json, qa-report.md en filesystem
 * No contiene lógica HTTP — solo lógica de dominio.
 */
export async function generateVisualAtlasPage(
  pageId:   string,
  seedData: VisualAtlasPageData,
  log:      Logger,
  options:  GeneratePageOptions = {},
): Promise<GeneratePageResult> {
  const startedAt = Date.now();
  const outDir    = pageOutputDir(pageId);
  await mkdir(outDir, { recursive: true });

  log.info({ pageId, textModel: TEXT_MODEL, imageModel: IMAGE_MODEL }, "Starting Visual Atlas generation — golden master template");

  /* ── Step 1: Imagen del bloque visual superior ────────────────────────── */
  const { imageGenerated, imagePath, imageError } = await generateUpperVisual(pageId, seedData, outDir, log);

  /* ── Step 2: Ensamblar HTML con plantilla cerrada ─────────────────────── */
  const pageData: VisualAtlasPageData = {
    ...seedData,
    upperVisualSrc: imageGenerated ? "./upper-art.png" : imagePath,
  };
  log.info({ pageId, hasImage: imageGenerated }, "Assembling HTML from golden master template");
  const pageHtml = renderVisualAtlasPage(pageData);
  const generationSource = options.generationSource ?? "locked_seed";
  const htmlFilePath = join(outDir, "page.html");
  const previewFilePath = join(outDir, "preview.png");
  await writeFile(htmlFilePath, pageHtml, "utf-8");

  /* ── Step 3: QA estructural ───────────────────────────────────────────── */
  const qa  = runStructuralQa(pageHtml, pageData);
  const defaultDim = computeQaDimensionScores(imageGenerated, qa.layoutEvidence);
  const override = options.qaDimensionsOverride;
  const provisionalDim: QaDimensionScores = override ? {
    artDirection: override.artDirection,
    editorialConsistency: override.editorialConsistency,
    readability: override.readability,
    technicalAccuracy: override.technicalAccuracy,
    density: override.density,
    commercialRisk: override.commercialRisk,
    avg: Number((
      (override.artDirection
        + override.editorialConsistency
        + override.readability
        + override.technicalAccuracy
        + override.density
        + override.commercialRisk) / 6
    ).toFixed(1)),
    verdict: imageGenerated ? "needs_visual_review" : "needs_revision",
    verdictLabel: imageGenerated
      ? `Requires human visual review: target ${VISUAL_ATLAS_V24_CONTRACT.qa.humanArtScoreToProduce}/10 before production`
      : "Blocked: upper visual is not a real premium image",
  } : defaultDim;
  const visualMeasurement = await measureVisualAtlasPageVisuals({
    htmlFilePath,
    screenshotFilePath: previewFilePath,
    pageWidth: VISUAL_ATLAS_V24_CONTRACT.page.width,
    pageHeight: VISUAL_ATLAS_V24_CONTRACT.page.height,
    log,
  });
  const dim = applyVisualMeasurementToQaDimensions(provisionalDim, visualMeasurement);
  const layoutEngine = evaluateVisualAtlasLayoutEngine(qa.layoutEvidence, dim, {
    imageGenerated,
    generationSource,
    visualMeasurement,
  });
  log.info({
    pageId,
    qaScore: qa.score,
    qaPassed: qa.passed,
    visualMeasurementAvailable: visualMeasurement.available,
    visualMeasurementScore: visualMeasurement.score,
  }, "Structural QA complete");

  const generatedAt = new Date().toISOString();
  const durationMs  = Date.now() - startedAt;

  /* ── Step 4: Guardar outputs ──────────────────────────────────────────── */
  const persistedVisualMeasurement: VisualAtlasPageVisualMeasurement = {
    ...visualMeasurement,
    screenshotFile: visualMeasurement.available ? pagePublicPath(pageId, "preview.png") : null,
  };

  const metadata = {
    pageId,
    title:            `${pageData.title} — ${pageData.subtitle}`,
    domain:           pageData.domainLabel,
    batch:            pageData.batchLabel,
    certificationId:  "ai-200",
    contractVersion:  VISUAL_ATLAS_V24_CONTRACT.version,
    layoutRevision:   VISUAL_ATLAS_V24_CONTRACT.renderRevision,
    generatedAt,
    templateApproach: "golden_master_v24",
    textModel:        TEXT_MODEL,
    imageModel:       imageGenerated ? IMAGE_MODEL : "none",
    imageQuality:     IMAGE_QUALITY,
    imageGenerated,
    costGuardrail:    GUARDRAIL_LABEL,
    generationMode:   imageGenerated ? "openai_image" : "placeholder_image",
    imageError:       imageError || null,
    generationSource,
    composerDraft: options.composerDraft ?? null,
    qaBaselineTotal: options.qaBaselineTotal ?? null,
    qaStructural:     qa,
    layoutEvidence:   qa.layoutEvidence,
    qaDimensions:     dim,
    layoutEngine,
    visualMeasurement: persistedVisualMeasurement,
    durationMs,
  };
  await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  const qaLines   = qa.checks.map(c => `- ${c.ok ? "✓" : "✗"} ${c.name}`).join("\n");
  const qaReport  = `# QA Report — Página ${pageId}
## ${pageData.title} — ${pageData.subtitle}

**Generado:** ${generatedAt}
**Template:** Golden Master Visual Atlas ${VISUAL_ATLAS_V24_CONTRACT.version}
**Modelo imagen:** ${imageGenerated ? IMAGE_MODEL + " " + IMAGE_QUALITY : "placeholder"}
**Upper visual:** ${imageGenerated ? "upper_visual_real" : "upper_visual_placeholder"}
**Veredicto:** ${dim.verdictLabel}

## Scores (${dim.avg}/10 promedio)
- Dirección de arte: **${dim.artDirection}/10**
- Consistencia editorial: **${dim.editorialConsistency}/10**
- Legibilidad: **${dim.readability}/10**
- Precisión técnica: **${dim.technicalAccuracy}/10**
- Densidad útil: **${dim.density}/10**
- Seguridad comercial: **${dim.commercialRisk}/10** (puntaje alto = bajo riesgo comercial)

## Checks estructurales
${qaLines}

## Evidencia post-render
- Canvas: **${qa.layoutEvidence.page.width}x${qa.layoutEvidence.page.height}px**
- Upper row: **${qa.layoutEvidence.upper.rowHeight}px** · slot imagen **${qa.layoutEvidence.upper.slotWidth}x${qa.layoutEvidence.upper.slotHeight}px** · aire vertical **${qa.layoutEvidence.upper.freeVerticalPx}px**
- Rail examen: **${qa.layoutEvidence.examRail.rowHeight}px** (${qa.layoutEvidence.examRail.sharePct}% del body) · densidad **${qa.layoutEvidence.examRail.densityBand}**
- Trampas renderizadas: **${qa.layoutEvidence.examRail.trapItems}** · opciones autocheck: **${qa.layoutEvidence.examRail.autocheckOptions}** · notas de descarte: **${qa.layoutEvidence.examRail.discardNotes}**
- Score layout real: **${qa.layoutEvidence.score}/10**
${qa.layoutEvidence.blockers.length > 0 ? `\n### Bloqueos post-render\n${qa.layoutEvidence.blockers.map((item) => `- ${item}`).join("\n")}\n` : ""}
${qa.layoutEvidence.warnings.length > 0 ? `\n### Alertas post-render\n${qa.layoutEvidence.warnings.map((item) => `- ${item}`).join("\n")}\n` : ""}

## Medicion visual real
- Disponible: **${visualMeasurement.available ? "si" : "no"}**
- Renderer: **${visualMeasurement.renderer}**
- Score visual: **${visualMeasurement.score}/10**
- Screenshot: **${visualMeasurement.available ? "preview.png" : "no disponible"}**
- Canvas medido: **${visualMeasurement.page.width}x${visualMeasurement.page.height}px**
- Scroll medido: **${visualMeasurement.page.scrollWidth}x${visualMeasurement.page.scrollHeight}px**
- Overflow: **${visualMeasurement.overflow.count}** elemento(s) · horizontal **${visualMeasurement.page.horizontalOverflowPx}px** · vertical **${visualMeasurement.page.verticalOverflowPx}px**
- Tipografia minima: **${visualMeasurement.typography.minFontPx ?? "n/a"}px** · textos pequenos **${visualMeasurement.typography.smallTextCount}**
- Upper visual ocupado: **${visualMeasurement.zoneUsage.upper_visual?.occupancyPct ?? "n/a"}%** · aire inferior real **${visualMeasurement.zoneUsage.upper_visual?.freeBottomPx ?? "n/a"}px**
- Rail inferior ocupado: **${visualMeasurement.zoneUsage.exam_rail?.occupancyPct ?? "n/a"}%** · aire inferior real **${visualMeasurement.zoneUsage.exam_rail?.freeBottomPx ?? "n/a"}px**
${visualMeasurement.blockers.length > 0 ? `\n### Bloqueos visuales reales\n${visualMeasurement.blockers.map((item) => `- ${item}`).join("\n")}\n` : ""}
${visualMeasurement.warnings.length > 0 ? `\n### Alertas visuales reales\n${visualMeasurement.warnings.map((item) => `- ${item}`).join("\n")}\n` : ""}
- Nota: ${visualMeasurement.note}

## Motor de layout
- Version: **${layoutEngine.version}**
- Score motor: **${layoutEngine.score}/10**
- Estado: **${layoutEngine.readiness}**
- Accion primaria: **${layoutEngine.primaryAction.label}**
- Razon: ${layoutEngine.primaryAction.reason}
- Batch gate: **${layoutEngine.batchGate.canBatch ? "habilitado" : "bloqueado"}** - ${layoutEngine.batchGate.reason}

## Observaciones
- Layout golden master v24 ensamblado deterministicamente
- Contenido editorial validado manualmente para página ${pageId}
- Upper visual: ${imageGenerated ? "generada con " + IMAGE_MODEL + " medium — requiere revisión visual humana para aprobación" : "placeholder — BLOQUEADO para aprobación editorial"}
${!imageGenerated ? "- Acción requerida: Generar upper visual premium con gpt-image-2 medium" : "- Acción requerida: Revisar calidad del upper visual antes de aprobar"}
`;
  await writeFile(join(outDir, "qa-report.md"), qaReport, "utf-8");

  log.info({ pageId, durationMs, imageGenerated, qaScore: qa.score }, "Generation complete");

  return {
    pageId,
    durationMs,
    templateVersion: VISUAL_ATLAS_V24_CONTRACT.version,
    approach:        "golden_master_fixed_template",
    outputs: {
      html:       pagePublicPath(pageId, "page.html"),
      metadata:   pagePublicPath(pageId, "metadata.json"),
      qaReport:   pagePublicPath(pageId, "qa-report.md"),
      previewPng: visualMeasurement.available ? pagePublicPath(pageId, "preview.png") : imageGenerated ? pagePublicPath(pageId, "upper-art.png") : null,
    },
    imageGenerated,
    imageModel:    imageGenerated ? IMAGE_MODEL : null,
    imageQuality:  IMAGE_QUALITY,
    imageError:    imageError || null,
    costGuardrail: GUARDRAIL_LABEL,
    qaStructural:  qa,
    textModel:     TEXT_MODEL,
    generationSource,
    composerDraft: options.composerDraft ?? null,
    qaBaselineTotal: options.qaBaselineTotal ?? null,
    qaDimensions: dim,
    layoutEngine,
    visualMeasurement: persistedVisualMeasurement,
  };
}
