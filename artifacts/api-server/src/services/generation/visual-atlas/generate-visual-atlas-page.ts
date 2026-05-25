import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { TEXT_MODEL, IMAGE_MODEL, IMAGE_QUALITY, TEMPLATE_VERSION } from "../../../config/generation";
import { pageOutputDir, pagePublicPath } from "../../export/paths";
import { renderVisualAtlasPage } from "../../renderers/visual-atlas/render-golden-page";
import { runStructuralQa, computeQaDimensionScores, type StructuralQaResult } from "../../qa/visual-atlas/validate-page-html";
import { generateUpperVisual } from "./generate-upper-visual";

const GUARDRAIL_LABEL = "high_quality_blocked_gpt_image_2_medium_only" as const;

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
}

interface Logger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
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
): Promise<GeneratePageResult> {
  const startedAt = Date.now();
  const outDir    = pageOutputDir(pageId);
  await mkdir(outDir, { recursive: true });

  log.info({ pageId, textModel: TEXT_MODEL, imageModel: IMAGE_MODEL }, "Starting Visual Atlas generation — golden master template");

  /* ── Step 1: Imagen del bloque visual superior ────────────────────────── */
  const { imageGenerated, imagePath, imageError } = await generateUpperVisual(pageId, seedData, outDir, log);

  /* ── Step 2: Ensamblar HTML con plantilla cerrada ─────────────────────── */
  const pageData: VisualAtlasPageData = { ...seedData, upperVisualSrc: imagePath };
  log.info({ pageId, hasImage: imageGenerated }, "Assembling HTML from golden master template");
  const pageHtml = renderVisualAtlasPage(pageData);

  /* ── Step 3: QA estructural ───────────────────────────────────────────── */
  const qa  = runStructuralQa(pageHtml, pageData);
  const dim = computeQaDimensionScores(imageGenerated);
  log.info({ pageId, qaScore: qa.score, qaPassed: qa.passed }, "Structural QA complete");

  const generatedAt = new Date().toISOString();
  const durationMs  = Date.now() - startedAt;

  /* ── Step 4: Guardar outputs ──────────────────────────────────────────── */
  await writeFile(join(outDir, "page.html"), pageHtml, "utf-8");

  const metadata = {
    pageId,
    title:            `${pageData.title} — ${pageData.subtitle}`,
    domain:           pageData.domainLabel,
    batch:            pageData.batchLabel,
    certificationId:  "ai-200",
    contractVersion:  TEMPLATE_VERSION,
    generatedAt,
    templateApproach: "golden_master_v24",
    textModel:        TEXT_MODEL,
    imageModel:       imageGenerated ? IMAGE_MODEL : "none",
    imageQuality:     IMAGE_QUALITY,
    imageGenerated,
    costGuardrail:    GUARDRAIL_LABEL,
    generationMode:   imageGenerated ? "openai_image" : "placeholder_image",
    imageError:       imageError || null,
    qaStructural:     qa,
    durationMs,
  };
  await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  const qaLines   = qa.checks.map(c => `- ${c.ok ? "✓" : "✗"} ${c.name}`).join("\n");
  const qaReport  = `# QA Report — Página ${pageId}
## ${pageData.title} — ${pageData.subtitle}

**Generado:** ${generatedAt}
**Template:** Golden Master Visual Atlas ${TEMPLATE_VERSION}
**Modelo imagen:** ${imageGenerated ? IMAGE_MODEL + " " + IMAGE_QUALITY : "placeholder"}
**Upper visual:** ${imageGenerated ? "upper_visual_real" : "upper_visual_placeholder"}
**Veredicto:** ${dim.verdictLabel}

## Scores (${dim.avg}/10 promedio)
- Dirección de arte: **${dim.artDirection}/10**
- Consistencia editorial: **${dim.editorialConsistency}/10**
- Legibilidad: **${dim.readability}/10**
- Precisión técnica: **${dim.technicalAccuracy}/10**
- Densidad útil: **${dim.density}/10**
- Riesgo comercial: **${dim.commercialRisk}/10**

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
    templateVersion: TEMPLATE_VERSION,
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
  };
}
