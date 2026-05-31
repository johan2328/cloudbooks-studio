import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";
import { pageOutputDir, pagePublicPath } from "../../export/paths";
import { renderVisualAtlasPage } from "../../renderers/visual-atlas/render-golden-page";
import { runStructuralQa, computeQaDimensionScores, type QaDimensionScores, type StructuralQaResult } from "../../qa/visual-atlas/validate-page-html";
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

  /* ── Step 3: QA estructural ───────────────────────────────────────────── */
  const qa  = runStructuralQa(pageHtml, pageData);
  const defaultDim = computeQaDimensionScores(imageGenerated);
  const override = options.qaDimensionsOverride;
  const dim: QaDimensionScores = override ? {
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
  log.info({ pageId, qaScore: qa.score, qaPassed: qa.passed }, "Structural QA complete");

  const generatedAt = new Date().toISOString();
  const durationMs  = Date.now() - startedAt;
  const generationSource = options.generationSource ?? "locked_seed";

  /* ── Step 4: Guardar outputs ──────────────────────────────────────────── */
  await writeFile(join(outDir, "page.html"), pageHtml, "utf-8");

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
      previewPng: imageGenerated ? pagePublicPath(pageId, "upper-art.png") : null,
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
  };
}
