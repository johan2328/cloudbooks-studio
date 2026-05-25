import { Router } from "express";

import { getSeed } from "../data/page-seeds";
import { generateVisualAtlasPage } from "../services/generation/visual-atlas/generate-visual-atlas-page";

const router = Router();

/**
 * POST /api/studio/generate-visual-atlas-page
 * Valida seed + key, delega en el servicio de generación, retorna resultado.
 */
router.post("/studio/generate-visual-atlas-page", async (req, res): Promise<void> => {
  const body = req.body as { certificationId?: string; pageId?: string };

  if (!body.pageId || typeof body.pageId !== "string") {
    res.status(400).json({ error: "Se requiere pageId en el body" });
    return;
  }

  const { pageId } = body;
  const seedResult = getSeed(pageId);

  if (!seedResult.found) {
    res.status(404).json({
      error:          `Seed no disponible para pageId '${pageId}'. Esta página aún no está lista para generación.`,
      code:           "seed_missing",
      availableSeeds: seedResult.availableSeeds,
      message:        `Contenido no migrado — agrega el seed en data/page-seeds/${pageId}.ts`,
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({
      error: "OPENAI_API_KEY no configurada en Secrets. Agrégala para ejecutar generación real.",
      demo:  true,
    });
    return;
  }

  try {
    const result = await generateVisualAtlasPage(pageId, seedResult.data, req.log);
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    req.log.error({ pageId, err }, "Unexpected error in generate-visual-atlas-page");
    res.status(500).json({ error: "Error interno de generación", detail: String(err) });
  }
});

export default router;
