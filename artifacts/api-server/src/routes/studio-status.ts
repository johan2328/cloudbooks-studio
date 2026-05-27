import { Router } from "express";

import { getSeed, listSeeds } from "../data/page-seeds";
import { readOutputStatus } from "../services/export/output-status";
import { VISUAL_ATLAS_V24_CONTRACT } from "../domain/editorial-contracts/visual-atlas-v24";
import { BLOCK_LEGACY_IMG_MODEL } from "../config/generation";
import { getRuntimeInfo } from "../lib/runtime-info";

const ALLOW_HIGH_QUALITY = VISUAL_ATLAS_V24_CONTRACT.generation.allowHighQuality;
const GUARDRAIL_LABEL = VISUAL_ATLAS_V24_CONTRACT.generation.costGuardrail;

const router = Router();

/**
 * GET /api/studio/output-status/:pageId
 * Lee el filesystem y retorna estado de todos los archivos de output.
 */
router.get("/studio/output-status/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const status = await readOutputStatus(pageId);
  res.json(status);
});

/**
 * GET /api/studio/visual-atlas-pages
 * Catalogo operativo del Visual Atlas. La fuente de verdad no es localStorage:
 * sale de los seeds disponibles + filesystem de outputs.
 */
router.get("/studio/visual-atlas-pages", async (_req, res): Promise<void> => {
  const seeds = listSeeds();
  const pages = await Promise.all(
    seeds.map(async ({ pageId, data }) => {
      const outputStatus = await readOutputStatus(pageId);
      return {
        pageId,
        pageNumber: data.pageNumber,
        totalPages: data.totalPages,
        title: `${data.title}: ${data.subtitle}`,
        domain: data.domainLabel,
        batch: data.batchLabel,
        context: data.context,
        guideQuestion: data.guideQuestion,
        contractVersion: data.contractVersion,
        groundingStatus: "seeded",
        generationReady: true,
        visualModules: data.visualModules,
        traps: data.traps,
        autocheck: data.autocheck,
        outputStatus,
      };
    }),
  );

  res.json({
    source: "server_seed_and_output_status",
    totalExpected: pages[0]?.totalPages ?? 61,
    availableSeeds: seeds.map((s) => s.pageId),
    pages,
  });
});

/**
 * GET /api/studio/seed-status/:pageId
 * Informa si una página tiene seed disponible para generación.
 */
router.get("/studio/seed-status/:pageId", (req, res): void => {
  const { pageId } = req.params;
  const result = getSeed(pageId);
  if (result.found) {
    res.json({
      pageId,
      ready:          true,
      title:          result.data.title,
      availableSeeds: [pageId],
    });
  } else {
    res.json({
      pageId,
      ready:          false,
      reason:         result.reason,
      availableSeeds: result.availableSeeds,
    });
  }
});

/**
 * GET /api/studio/key-status
 * Devuelve configuración activa de modelos y guardrails.
 */
router.get("/studio/key-status", (_req, res): void => {
  const runtime = getRuntimeInfo();
  res.json({
    hasKey:              !!process.env.OPENAI_API_KEY,
    textModel:           VISUAL_ATLAS_V24_CONTRACT.generation.textModel,
    imageModel:          VISUAL_ATLAS_V24_CONTRACT.generation.imageModel,
    imageQuality:        VISUAL_ATLAS_V24_CONTRACT.generation.imageQuality,
    allowHighQuality:    ALLOW_HIGH_QUALITY,
    blockLegacyImgModel: BLOCK_LEGACY_IMG_MODEL,
    costGuardrail:       GUARDRAIL_LABEL,
    templateVersion:     VISUAL_ATLAS_V24_CONTRACT.version,
    contractId:          VISUAL_ATLAS_V24_CONTRACT.id,
    upperVisualRole:     VISUAL_ATLAS_V24_CONTRACT.upperVisual.role,
    upperVisualSize:     VISUAL_ATLAS_V24_CONTRACT.generation.imageSize,
    layoutRows:          VISUAL_ATLAS_V24_CONTRACT.page.gridRows,
    upperVisualSlot: {
      width: VISUAL_ATLAS_V24_CONTRACT.upperVisual.slotWidth,
      height: VISUAL_ATLAS_V24_CONTRACT.upperVisual.slotHeight,
    },
    chrome: {
      topbar: {
        fontSize: VISUAL_ATLAS_V24_CONTRACT.chrome.topbar.fontSize,
        showCertificationBadge: VISUAL_ATLAS_V24_CONTRACT.chrome.topbar.showCertificationBadge,
        showStatusDot: VISUAL_ATLAS_V24_CONTRACT.chrome.topbar.showStatusDot,
      },
      footer: {
        fontSize: VISUAL_ATLAS_V24_CONTRACT.chrome.footer.fontSize,
        brandText: VISUAL_ATLAS_V24_CONTRACT.chrome.footer.brandText,
      },
    },
    density: {
      guideFontSize: VISUAL_ATLAS_V24_CONTRACT.guide.fontSize,
      examHeaderFontSize: VISUAL_ATLAS_V24_CONTRACT.exam.headerFontSize,
      optionFontSize: VISUAL_ATLAS_V24_CONTRACT.exam.optionFontSize,
    },
    approach:            "golden_master_fixed_template",
    layout:              "Golden Master Visual Atlas v24",
    template:            "locked",
    renderer:            "deterministic HTML",
    svgFallback:         "disabled",
    runtime,
  });
});

export default router;
