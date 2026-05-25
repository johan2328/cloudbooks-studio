import { Router } from "express";

import { getSeed } from "../data/page-seeds";
import { readOutputStatus } from "../services/export/output-status";
import {
  TEXT_MODEL, IMAGE_MODEL, IMAGE_QUALITY,
  BLOCK_LEGACY_IMG_MODEL, TEMPLATE_VERSION,
} from "../config/generation";

const ALLOW_HIGH_QUALITY = false as const;
const GUARDRAIL_LABEL    = "high_quality_blocked_gpt_image_2_medium_only" as const;

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
  res.json({
    hasKey:              !!process.env.OPENAI_API_KEY,
    textModel:           TEXT_MODEL,
    imageModel:          IMAGE_MODEL,
    imageQuality:        IMAGE_QUALITY,
    allowHighQuality:    ALLOW_HIGH_QUALITY,
    blockLegacyImgModel: BLOCK_LEGACY_IMG_MODEL,
    costGuardrail:       GUARDRAIL_LABEL,
    templateVersion:     TEMPLATE_VERSION,
    approach:            "golden_master_fixed_template",
    layout:              "Golden Master Visual Atlas v24",
    template:            "locked",
    renderer:            "deterministic HTML",
    svgFallback:         "disabled",
  });
});

export default router;
