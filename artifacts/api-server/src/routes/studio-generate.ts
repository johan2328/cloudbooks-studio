import { Router } from "express";
import { eq } from "drizzle-orm";
import { composerDraftsTable, db } from "@workspace/db";

import { getSeed } from "../data/page-seeds";
import { generateVisualAtlasPage } from "../services/generation/visual-atlas/generate-visual-atlas-page";
import { computeQaDimensionScores } from "../services/qa/visual-atlas/validate-page-html";
import type { VisualAtlasPageData } from "../lib/visual-atlas-types";
import {
  ensurePageByNumber,
  getAuthUserFromHeader,
  insertEditorialEvent,
  persistGenerationResult,
} from "../services/studio/editorial-events";

const router = Router();

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}

function readComposerBlocks(draftPayload: unknown): Array<Record<string, unknown>> {
  const draft = asRecord(draftPayload);
  const blocks = draft?.blocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item));
}

function pickBlock(blocks: Array<Record<string, unknown>>, blockType: string): Record<string, unknown> | null {
  return blocks.find((block) => block.type === blockType) ?? null;
}

function mergeComposerDraftIntoSeed(seed: VisualAtlasPageData, draftPayload: unknown): VisualAtlasPageData {
  const blocks = readComposerBlocks(draftPayload);
  if (!blocks.length) return seed;

  const next: VisualAtlasPageData = { ...seed };

  const contextBlock = pickBlock(blocks, "context_deck");
  const contextValue = asString(asRecord(contextBlock?.content)?.context);
  if (contextValue) next.context = contextValue;

  const guideBlock = pickBlock(blocks, "guide_question");
  const guideValue = asString(asRecord(guideBlock?.content)?.question);
  if (guideValue) next.guideQuestion = guideValue;

  const trapsBlock = pickBlock(blocks, "exam_traps");
  const trapsRaw = asRecord(trapsBlock?.content)?.traps;
  if (Array.isArray(trapsRaw)) {
    const parsed = trapsRaw
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        wrong: asString(item.wrong) ?? "",
        correction: asString(item.correction) ?? "",
      }))
      .filter((item) => item.wrong.length > 0 && item.correction.length > 0)
      .slice(0, 3);
    if (parsed.length > 0) {
      next.traps = parsed;
    }
  }

  const autocheckBlock = pickBlock(blocks, "autocheck");
  const autocheckContent = asRecord(autocheckBlock?.content);
  if (autocheckContent) {
    const question = asString(autocheckContent.question);
    const explanation = asString(autocheckContent.explanation);
    const optionsRaw = autocheckContent.options;
    const discardRaw = autocheckContent.discardNotes;
    const correctOptionRaw = autocheckContent.correctOption;

    const options = Array.isArray(optionsRaw)
      ? optionsRaw.map((item) => asString(item)).filter((item): item is string => Boolean(item)).slice(0, 4)
      : [];
    const discardNotes = Array.isArray(discardRaw)
      ? discardRaw.map((item) => asString(item)).filter((item): item is string => Boolean(item)).slice(0, 3)
      : [];
    const correctOption = typeof correctOptionRaw === "number" && Number.isFinite(correctOptionRaw)
      ? Math.max(0, Math.min(options.length > 0 ? options.length - 1 : 0, Math.trunc(correctOptionRaw)))
      : seed.autocheck.correctOption;

    next.autocheck = {
      ...seed.autocheck,
      question: question ?? seed.autocheck.question,
      options: options.length >= 2 ? options : seed.autocheck.options,
      explanation: explanation ?? seed.autocheck.explanation,
      discardNotes: discardNotes.length > 0 ? discardNotes : seed.autocheck.discardNotes,
      correctOption,
    };
  }

  return next;
}

function buildComposerQaOverride(
  draftPayload: unknown,
  fallbackTechnicalAccuracy: number,
):
  | {
      artDirection: number;
      editorialConsistency: number;
      readability: number;
      technicalAccuracy: number;
      density: number;
      commercialRisk: number;
    }
  | null {
  const draft = asRecord(draftPayload);
  const editorialValidation = asRecord(draft?.editorialValidation);
  if (!editorialValidation) return null;

  const coverage = asFiniteNumber(editorialValidation.coverageScore);
  const readability = asFiniteNumber(editorialValidation.readabilityScore);
  const usefulDensity = asFiniteNumber(editorialValidation.usefulDensityScore);
  const examUtility = asFiniteNumber(editorialValidation.examUtilityScore);
  const consistency = asFiniteNumber(editorialValidation.consistencyScore);

  if (
    coverage == null
    || readability == null
    || usefulDensity == null
    || examUtility == null
    || consistency == null
  ) {
    return null;
  }

  return {
    artDirection: clamp(roundOne((coverage + consistency) / 2), 6.8, 9.8),
    editorialConsistency: clamp(roundOne(consistency), 6.8, 9.8),
    readability: clamp(roundOne(readability), 6.8, 9.8),
    technicalAccuracy: clamp(roundOne(fallbackTechnicalAccuracy), 6.8, 10),
    density: clamp(roundOne(usefulDensity), 6.8, 9.8),
    commercialRisk: clamp(roundOne((coverage + examUtility) / 2), 6.8, 10),
  };
}

router.post("/studio/generate-visual-atlas-page", async (req, res): Promise<void> => {
  const body = req.body as { certificationId?: string; pageId?: string; useComposerDraft?: boolean };

  if (!body.pageId || typeof body.pageId !== "string") {
    res.status(400).json({ error: "Se requiere pageId en el body" });
    return;
  }

  const { pageId } = body;
  const useComposerDraft = body.useComposerDraft === true;
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
  const pageRecord = await ensurePageByNumber({
    pageNumber: pageId,
    title: seedResult.data.title,
    domain: seedResult.data.domainLabel,
    batch: `Batch ${seedResult.data.batch}`,
    context: seedResult.data.context,
  });
  const eventPageNumber = pageRecord?.pageNumber ?? pageId;
  const eventPageTitle = pageRecord?.title ?? seedResult.data.title;
  const qaBaselineTotal = pageRecord?.qaScore ?? null;

  let generationSeed = seedResult.data;
  let composerDraftMeta: {
    id: number;
    updatedAt: string;
    family: string;
    transitionLevel: string;
  } | null = null;
  let composerQaOverride: {
    artDirection: number;
    editorialConsistency: number;
    readability: number;
    technicalAccuracy: number;
    density: number;
    commercialRisk: number;
  } | null = null;

  if (useComposerDraft) {
    const [draft] = await db.select().from(composerDraftsTable).where(eq(composerDraftsTable.pageId, pageId));
    if (!draft) {
      res.status(409).json({
        error: "No hay draft composer guardado para esta pagina. Guarda el draft antes de generar desde Composer.",
        code: "composer_draft_missing",
      });
      return;
    }
    generationSeed = mergeComposerDraftIntoSeed(seedResult.data, draft.draft);
    composerDraftMeta = {
      id: draft.id,
      updatedAt: new Date(draft.updatedAt).toISOString(),
      family: draft.family,
      transitionLevel: draft.transitionLevel,
    };
    composerQaOverride = buildComposerQaOverride(draft.draft, 10);
  }

  try {
    await insertEditorialEvent({
      actionType: "generation_started",
      pageId: pageRecord?.id ?? null,
      pageNumber: eventPageNumber,
      pageTitle: eventPageTitle,
      userId: authUser.id,
      userName: authUser.displayName,
      result: "Generacion iniciada desde Studio sobre plantilla golden master",
      note: useComposerDraft
        ? `Fuente compositiva: draft composer #${composerDraftMeta?.id ?? "?"}`
        : "Fuente compositiva: seed locked",
    });

    const result = await generateVisualAtlasPage(pageId, generationSeed, req.log, {
      generationSource: useComposerDraft ? "composer_draft" : "locked_seed",
      composerDraft: composerDraftMeta,
      qaBaselineTotal,
      qaDimensionsOverride: composerQaOverride,
    });

    if (pageRecord) {
      const qaDims = result.qaDimensions ?? computeQaDimensionScores(result.imageGenerated);
      const qaAfterTotal = qaDims.avg * 10;
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
      res.status(201).json({
        success: true,
        ...result,
        qaDelta: {
          before: qaBaselineTotal,
          after: qaAfterTotal,
          delta: qaBaselineTotal == null ? null : Number((qaAfterTotal - qaBaselineTotal).toFixed(1)),
        },
      });
      return;
    } else {
      const qaDims = computeQaDimensionScores(result.imageGenerated);
      await insertEditorialEvent({
        actionType: "generation_completed",
        pageId: null,
        pageNumber: eventPageNumber,
        pageTitle: eventPageTitle,
        userId: authUser.id,
        userName: authUser.displayName,
        result: result.imageGenerated
          ? `Generacion completada con imagen real y QA ${(qaDims.avg * 10).toFixed(0)}/100`
          : `Generacion completada con placeholder por falla de imagen; QA ${(qaDims.avg * 10).toFixed(0)}/100`,
        note: result.imageError,
      });
    }

    res.status(201).json({
      success: true,
      ...result,
      qaDelta: {
        before: qaBaselineTotal,
        after: null,
        delta: null,
      },
    });
  } catch (err) {
    await insertEditorialEvent({
      actionType: "generation_completed",
      pageId: pageRecord?.id ?? null,
      pageNumber: eventPageNumber,
      pageTitle: eventPageTitle,
      userId: authUser.id,
      userName: authUser.displayName,
      result: "Generacion interrumpida por error interno del pipeline",
      note: String(err),
    });
    req.log.error({ pageId, err }, "Unexpected error in generate-visual-atlas-page");
    res.status(500).json({ error: "Error interno de generacion", detail: String(err) });
  }
});

export default router;
