import { Router } from "express";

import { getSeed } from "../data/page-seeds";
import { generateVisualAtlasPage } from "../services/generation/visual-atlas/generate-visual-atlas-page";
import { computeQaDimensionScores } from "../services/qa/visual-atlas/validate-page-html";
import {
  getAuthUserFromHeader,
  insertEditorialEvent,
  persistGenerationResult,
  resolvePageByNumber,
} from "../services/studio/editorial-events";

const router = Router();

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
      error: `Seed no disponible para pageId '${pageId}'. Esta pagina aun no esta lista para generacion.`,
      code: "seed_missing",
      availableSeeds: seedResult.availableSeeds,
      message: `Contenido no migrado - agrega el seed en data/page-seeds/${pageId}.ts`,
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({
      error: "OPENAI_API_KEY no configurada en Secrets. Agregala para ejecutar generacion real.",
      demo: true,
    });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const pageRecord = await resolvePageByNumber(pageId);

  try {
    if (pageRecord) {
      await insertEditorialEvent({
        actionType: "generation_started",
        pageId: pageRecord.id,
        pageNumber: pageRecord.pageNumber,
        pageTitle: pageRecord.title,
        userId: authUser.id,
        userName: authUser.displayName,
        result: "Generacion iniciada desde Studio sobre plantilla golden master",
      });
    }

    const result = await generateVisualAtlasPage(pageId, seedResult.data, req.log);

    if (pageRecord) {
      const qaDims = computeQaDimensionScores(result.imageGenerated);
      await persistGenerationResult({
        pageDbId: pageRecord.id,
        pageNumber: pageRecord.pageNumber,
        batch: pageRecord.batch,
        title: pageRecord.title,
        userId: authUser.id,
        userName: authUser.displayName,
        imageGenerated: result.imageGenerated,
        textModel: result.textModel,
        imageModel: result.imageModel,
        outputPath: result.outputs.html,
        error: result.imageError,
        qa: {
          artDirection: qaDims.artDirection,
          editorialConsistency: qaDims.editorialConsistency,
          readability: qaDims.readability,
          technicalAccuracy: qaDims.technicalAccuracy,
          total: qaDims.avg,
          observations: [
            result.imageGenerated
              ? "Upper visual real generado; requiere dictamen humano final antes de exportar."
              : "Upper visual en placeholder; la pagina queda bloqueada para aprobacion editorial.",
            `QA estructural ${result.qaStructural.score}/10 con contrato ${result.templateVersion}.`,
          ],
          redTeam: [
            `Direccion de arte ${qaDims.artDirection}/10`,
            `Consistencia editorial ${qaDims.editorialConsistency}/10`,
            `Legibilidad ${qaDims.readability}/10`,
            `Precision tecnica ${qaDims.technicalAccuracy}/10`,
            `Densidad util ${qaDims.density}/10`,
            `Seguridad comercial ${qaDims.commercialRisk}/10`,
          ],
        },
      });
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    if (pageRecord) {
      await insertEditorialEvent({
        actionType: "generation_completed",
        pageId: pageRecord.id,
        pageNumber: pageRecord.pageNumber,
        pageTitle: pageRecord.title,
        userId: authUser.id,
        userName: authUser.displayName,
        result: "Generacion interrumpida por error interno del pipeline",
        note: String(err),
      });
    }
    req.log.error({ pageId, err }, "Unexpected error in generate-visual-atlas-page");
    res.status(500).json({ error: "Error interno de generacion", detail: String(err) });
  }
});

export default router;
