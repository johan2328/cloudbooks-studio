import { Router } from "express";
import { eq } from "drizzle-orm";
import { composerDraftsTable, db } from "@workspace/db";

import { getSeed } from "../data/page-seeds";
import { VISUAL_ATLAS_V24_CONTRACT } from "../domain/editorial-contracts/visual-atlas-v24";
import { generateVisualAtlasPage } from "../services/generation/visual-atlas/generate-visual-atlas-page";
import { computeQaDimensionScores } from "../services/qa/visual-atlas/validate-page-html";
import type { VisualAtlasPageData } from "../lib/visual-atlas-types";
import { evaluateUsefulDensity } from "../domain/editorial-cards/density-agent";
import type { DensityPlan, EditorialCard, EditorialCardDeck, VisualAtlasLayoutRecipe } from "../domain/editorial-cards/types";
import {
  ensurePageByNumber,
  getAuthUserFromHeader,
  insertEditorialEvent,
  persistGenerationResult,
} from "../services/studio/editorial-events";

const router = Router();
type ComposerRegenerationScope = "full" | "technical_core" | "exam_rail";

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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter((item): item is string => Boolean(item))
    : [];
}

function normalizeEditorialCard(raw: unknown, pageId: string): EditorialCard | null {
  const item = asRecord(raw);
  if (!item) return null;
  const id = asString(item.id);
  const title = asString(item.title);
  const claim = asString(item.claim);
  if (!id || !title || !claim) return null;
  const roleRaw = asString(item.role) ?? "concept";
  const targetZoneRaw = asString(item.targetZone) ?? "reserve";
  const statusRaw = asString(item.status) ?? "candidate";
  const densityScore = asFiniteNumber(item.densityScore) ?? 7.4;
  return {
    id,
    pageId,
    role: (["concept", "flow", "comparison", "decision", "trap", "autocheck", "exam_signal", "example", "micro_case", "checklist"].includes(roleRaw) ? roleRaw : "concept") as EditorialCard["role"],
    status: (["candidate", "selected", "rejected"].includes(statusRaw) ? statusRaw : "candidate") as EditorialCard["status"],
    targetZone: (["primary", "complement", "rail", "reserve"].includes(targetZoneRaw) ? targetZoneRaw : "reserve") as EditorialCard["targetZone"],
    title,
    claim,
    explanation: asString(item.explanation) ?? claim,
    diagramIntent: asString(item.diagramIntent) ?? "mini-diagrama editorial con una decision visible",
    examSignal: asString(item.examSignal) ?? claim,
    sourceRefs: asStringArray(item.sourceRefs).length > 0 ? asStringArray(item.sourceRefs) : ["composer-draft"],
    formatAffinity: asStringArray(item.formatAffinity) as EditorialCard["formatAffinity"],
    densityScore: clamp(roundOne(densityScore), 0, 10),
    visualRisk: (["low", "medium", "high"].includes(asString(item.visualRisk) ?? "") ? asString(item.visualRisk) : "medium") as EditorialCard["visualRisk"],
  };
}

function normalizeEditorialDeck(draftPayload: unknown, pageId: string): EditorialCardDeck | null {
  const draft = asRecord(draftPayload);
  const rawDeck = asRecord(draft?.editorialDeck);
  const rawCards = rawDeck?.cards;
  if (!Array.isArray(rawCards)) return null;
  const cards = rawCards
    .map((item) => normalizeEditorialCard(item, pageId))
    .filter((item): item is EditorialCard => Boolean(item));
  if (cards.length === 0) return null;
  const selectedCardIds = asStringArray(rawDeck?.selectedCardIds);
  const rejectedCardIds = asStringArray(rawDeck?.rejectedCardIds);
  return {
    version: "editorial-card-deck-v1",
    pageId,
    source: "composer",
    generatedAt: asString(rawDeck?.generatedAt) ?? new Date().toISOString(),
    cards,
    selectedCardIds: selectedCardIds.length > 0 ? selectedCardIds : cards.filter((card) => card.status === "selected").map((card) => card.id),
    rejectedCardIds: rejectedCardIds.length > 0 ? rejectedCardIds : cards.filter((card) => card.status === "rejected").map((card) => card.id),
  };
}

function normalizeLayoutRecipe(raw: unknown): VisualAtlasLayoutRecipe | null {
  const recipe = asRecord(raw);
  if (!recipe) return null;
  const modeRaw = asString(recipe.mode) ?? "4P";
  const railStrategyRaw = asString(recipe.railStrategy) ?? "standard";
  return {
    mode: (["4P", "4P+2C", "3P+1D+2C", "Rail Compact", "Rail Dense"].includes(modeRaw) ? modeRaw : "4P") as VisualAtlasLayoutRecipe["mode"],
    primaryCardIds: asStringArray(recipe.primaryCardIds),
    complementaryCardIds: asStringArray(recipe.complementaryCardIds),
    railCardIds: asStringArray(recipe.railCardIds),
    upperCardCount: asFiniteNumber(recipe.upperCardCount) ?? 4,
    railStrategy: (railStrategyRaw === "compact" || railStrategyRaw === "dense" ? railStrategyRaw : "standard"),
    promptDirective: asString(recipe.promptDirective) ?? "Use selected editorial cards; do not add filler.",
    reason: asString(recipe.reason) ?? "Composer editorial deck",
  };
}

function normalizeDensityPlan(raw: unknown, data: VisualAtlasPageData, deck: EditorialCardDeck): DensityPlan {
  const plan = asRecord(raw);
  const evaluated = evaluateUsefulDensity(data, deck);
  const layoutRecipe = normalizeLayoutRecipe(plan?.layoutRecipe) ?? evaluated.layoutRecipe;
  const status = (["ready", "grounding_required", "rail_first", "blocked_placeholder"].includes(asString(plan?.status) ?? "")
    ? asString(plan?.status)
    : evaluated.status) as DensityPlan["status"];
  const scoreCap = status === "grounding_required" ? 8.7 : status === "rail_first" ? 8.8 : status === "blocked_placeholder" ? 6.5 : 9.6;
  return {
    version: "useful-density-agent-v1",
    targetScore: 9.5,
    score: Math.min(asFiniteNumber(plan?.score) ?? evaluated.score, scoreCap),
    usefulDensityScore: Math.min(asFiniteNumber(plan?.usefulDensityScore) ?? evaluated.usefulDensityScore, scoreCap),
    status,
    groundingNeeded: typeof plan?.groundingNeeded === "boolean" ? plan.groundingNeeded : evaluated.groundingNeeded,
    groundingRationale: asString(plan?.groundingRationale) ?? evaluated.groundingRationale,
    nextAction: (["regenerate_with_deck", "run_selective_grounding", "compact_rail", "fix_image_generation"].includes(asString(plan?.nextAction) ?? "")
      ? asString(plan?.nextAction)
      : evaluated.nextAction) as DensityPlan["nextAction"],
    problems: asStringArray(plan?.problems).length > 0 ? asStringArray(plan?.problems) : evaluated.problems,
    recommendations: asStringArray(plan?.recommendations).length > 0 ? asStringArray(plan?.recommendations) : evaluated.recommendations,
    rejectedCards: Array.isArray(plan?.rejectedCards)
      ? plan.rejectedCards.map((item) => asRecord(item)).filter((item): item is Record<string, unknown> => Boolean(item)).map((item) => ({
        cardId: asString(item.cardId) ?? "",
        reason: asString(item.reason) ?? "fuera del cupo editorial",
      })).filter((item) => item.cardId.length > 0)
      : [],
    layoutRecipe,
  };
}

function pickBlock(blocks: Array<Record<string, unknown>>, blockType: string): Record<string, unknown> | null {
  return blocks.find((block) => block.type === blockType) ?? null;
}

function compactText(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const firstSentence = normalized.match(/^.{1,220}?[.!?](\s|$)/)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= Math.floor(maxChars * 0.55)) {
    return firstSentence.slice(0, maxChars).trim();
  }
  return `${normalized.slice(0, maxChars).trim()}...`;
}

function mergeComposerDraftIntoSeed(
  seed: VisualAtlasPageData,
  draftPayload: unknown,
  scope: ComposerRegenerationScope = "full",
): VisualAtlasPageData {
  const blocks = readComposerBlocks(draftPayload);
  const draftRecord = asRecord(draftPayload);
  const deck = normalizeEditorialDeck(draftPayload, seed.pageNumber);
  if (!blocks.length && !deck) return seed;

  const next: VisualAtlasPageData = { ...seed };
  const allowNarrative = scope === "full";
  const allowTechnical = scope === "full" || scope === "technical_core";
  const allowExam = scope === "full" || scope === "exam_rail";

  const contextBlock = pickBlock(blocks, "context_deck");
  const contextValue = asString(asRecord(contextBlock?.content)?.context);
  const contextVariant = asString(contextBlock?.variant);
  if (allowNarrative && contextValue) next.context = contextValue;
  if (allowNarrative && contextVariant === "expanded") {
    const appendix = [
      next.traps[0]?.wrong ? `Prioriza ${next.traps[0].wrong.toLowerCase()}.` : null,
      next.guideQuestion ? `La pregunta guia orienta la decision de examen.` : null,
    ].filter(Boolean).join(" ");
    if (appendix && next.context.length < 280) {
      next.context = `${next.context} ${appendix}`.trim();
    }
  }

  const guideBlock = pickBlock(blocks, "guide_question");
  const guideValue = asString(asRecord(guideBlock?.content)?.question);
  if (allowNarrative && guideValue) next.guideQuestion = guideValue;

  const trapsBlock = pickBlock(blocks, "exam_traps");
  const trapsVariant = asString(trapsBlock?.variant);
  const trapsRaw = asRecord(trapsBlock?.content)?.traps;
  if (allowExam && Array.isArray(trapsRaw)) {
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
      next.traps = trapsVariant === "compact"
        ? parsed.map((item) => ({ ...item, correction: compactText(item.correction, 118) }))
        : parsed;
    }
  }

  const autocheckBlock = pickBlock(blocks, "autocheck");
  const autocheckVariant = asString(autocheckBlock?.variant);
  const autocheckContent = asRecord(autocheckBlock?.content);
  if (allowExam && autocheckContent) {
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
      explanation: autocheckVariant === "short"
        ? compactText(explanation ?? seed.autocheck.explanation, 140)
        : (explanation ?? seed.autocheck.explanation),
      discardNotes: autocheckVariant === "short"
        ? (discardNotes.length > 0 ? discardNotes.slice(0, 1) : seed.autocheck.discardNotes.slice(0, 1))
        : (discardNotes.length > 0 ? discardNotes : seed.autocheck.discardNotes),
      correctOption,
    };
  }

  const technicalBlocks = allowTechnical
    ? blocks
    .filter((block) => {
      const type = asString(block.type);
      return type === "diagram_panel" || type === "comparison_panel" || type === "decision_tree" || type === "map_panel";
    })
    .sort((a, b) => (asFiniteNumber(a.priority) ?? 999) - (asFiniteNumber(b.priority) ?? 999))
    : [];
  const moduleCandidates = technicalBlocks
    .flatMap((block) => {
      const modules = asRecord(block.content)?.modules;
      if (!Array.isArray(modules)) return [];
      return modules
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .map((item) => ({
          num: asString(item.num) ?? "",
          title: asString(item.title) ?? "",
          description: asString(item.description) ?? "",
          idea: asString(item.idea) ?? undefined,
          recommendedDiagram: asString(item.recommendedDiagram) ?? undefined,
          maxMicrocopy: asString(item.maxMicrocopy) ?? undefined,
          examSignal: asString(item.examSignal) ?? undefined,
        }))
        .filter((item) => item.title.length > 0);
    });
  if (moduleCandidates.length > 0) {
    const unique = new Map<string, {
      title: string;
      description: string;
      idea?: string;
      recommendedDiagram?: string;
      maxMicrocopy?: string;
      examSignal?: string;
    }>();
    for (const moduleItem of moduleCandidates) {
      const key = moduleItem.title.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, {
          title: moduleItem.title,
          description: moduleItem.description || "Bloque tecnico de referencia para examen.",
          idea: moduleItem.idea,
          recommendedDiagram: moduleItem.recommendedDiagram,
          maxMicrocopy: moduleItem.maxMicrocopy,
          examSignal: moduleItem.examSignal,
        });
      }
      if (unique.size >= 4) break;
    }
    const remapped = Array.from(unique.values()).slice(0, 4).map((item, idx) => ({
      num: String(idx + 1).padStart(2, "0"),
      title: item.title,
      description: item.description,
      idea: item.idea,
      recommendedDiagram: item.recommendedDiagram,
      maxMicrocopy: item.maxMicrocopy,
      examSignal: item.examSignal,
    }));
    if (remapped.length === 4) {
      next.visualModules = remapped;
    }
  }

  if (deck) {
    const densityPlan = normalizeDensityPlan(draftRecord?.densityPlan, next, deck);
    next.editorialDeck = deck;
    next.densityPlan = densityPlan;
    next.layoutRecipe = normalizeLayoutRecipe(draftRecord?.layoutRecipe) ?? densityPlan.layoutRecipe;

    const primaryCards = deck.cards
      .filter((card) => card.status === "selected" && card.targetZone === "primary")
      .sort((a, b) => b.densityScore - a.densityScore)
      .slice(0, 4);
    if (allowTechnical && primaryCards.length >= 4) {
      next.visualModules = primaryCards.map((card, idx) => ({
        num: String(idx + 1).padStart(2, "0"),
        title: card.title,
        description: card.explanation || card.claim,
        idea: card.claim,
        recommendedDiagram: card.diagramIntent,
        maxMicrocopy: "titulo + 1 takeaway legible; sin microtexto ni duplicacion",
        examSignal: card.examSignal,
      }));
    }

    const railTrapCards = deck.cards.filter((card) => card.status === "selected" && card.targetZone === "rail" && card.role === "trap").slice(0, 3);
    if (allowExam && railTrapCards.length >= 1) {
      const mergedTraps = railTrapCards.map((card) => ({
        wrong: card.claim.replace(/^Mito:\s*/i, ""),
        correction: card.explanation,
      }));
      next.traps = [...mergedTraps, ...next.traps].slice(0, 3);
    }
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
  const densityPlan = asRecord(draft?.densityPlan);
  const densityStatus = asString(densityPlan?.status);
  const groundingNeeded = densityPlan?.groundingNeeded === true || densityStatus === "grounding_required";
  const railFirst = densityStatus === "rail_first";
  const maxComposerOverride = groundingNeeded ? 8.6 : railFirst ? 8.8 : 9.2;

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
    artDirection: clamp(roundOne((coverage + consistency) / 2), 6.8, maxComposerOverride),
    editorialConsistency: clamp(roundOne(consistency), 6.8, maxComposerOverride),
    readability: clamp(roundOne(readability), 6.8, maxComposerOverride),
    technicalAccuracy: clamp(roundOne(fallbackTechnicalAccuracy), 6.8, 10),
    density: clamp(roundOne(usefulDensity - (groundingNeeded ? 0.5 : railFirst ? 0.35 : 0)), 6.2, maxComposerOverride),
    commercialRisk: clamp(roundOne((coverage + examUtility) / 2 - (groundingNeeded ? 0.4 : 0)), 6.8, 9.2),
  };
}

router.post("/studio/generate-visual-atlas-page", async (req, res): Promise<void> => {
  const body = req.body as {
    certificationId?: string;
    pageId?: string;
    useComposerDraft?: boolean;
    regenerationScope?: ComposerRegenerationScope;
  };

  if (!body.pageId || typeof body.pageId !== "string") {
    res.status(400).json({ error: "Se requiere pageId en el body" });
    return;
  }

  const { pageId } = body;
  const useComposerDraft = body.useComposerDraft === true;
  const regenerationScope: ComposerRegenerationScope = body.regenerationScope === "technical_core" || body.regenerationScope === "exam_rail"
    ? body.regenerationScope
    : "full";
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
      generationStatus: "image_failed",
      imageGenerated: false,
      imageAttempted: false,
      imageFailure: {
        code: "missing_api_key",
        message: "OPENAI_API_KEY no esta configurada en Secrets. La pagina queda bloqueada para evaluacion editorial.",
        providerError: null,
        retryable: false,
        model: VISUAL_ATLAS_V24_CONTRACT.generation.imageModel,
        quality: VISUAL_ATLAS_V24_CONTRACT.generation.imageQuality,
        promptHash: "preflight-not-run",
      },
      demo: true,
    });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const pageRecord = await ensurePageByNumber({
    pageNumber: pageId,
    title: seedResult.data.title,
    domain: seedResult.data.domainLabel,
    batch: seedResult.data.batchLabel,
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
        generationStatus: "composer_draft_missing",
      });
      return;
    }
    generationSeed = mergeComposerDraftIntoSeed(seedResult.data, draft.draft, regenerationScope);
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
        ? `Fuente compositiva: draft composer #${composerDraftMeta?.id ?? "?"} · scope=${regenerationScope}`
        : "Fuente compositiva: seed locked",
    });

    const result = await generateVisualAtlasPage(pageId, generationSeed, req.log, {
      generationSource: useComposerDraft ? "composer_draft" : "locked_seed",
      composerDraft: composerDraftMeta,
      qaBaselineTotal,
      qaDimensionsOverride: composerQaOverride,
    });

    if (pageRecord) {
      const qaDims = result.qaDimensions ?? computeQaDimensionScores(result.imageGenerated, result.qaStructural.layoutEvidence);
      const qaAfterTotal = qaDims.avg * 10;
      await persistGenerationResult({
        pageDbId: pageRecord.id,
        pageNumber: pageRecord.pageNumber,
        batch: pageRecord.batch,
        title: pageRecord.title,
        userId: authUser.id,
        userName: authUser.displayName,
        imageGenerated: result.imageGenerated,
        generationStatus: result.generationStatus,
        generationSource: useComposerDraft ? "composer_draft" : "locked_seed",
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
        regenerationScope,
        qaDelta: {
          before: qaBaselineTotal,
          after: qaAfterTotal,
          delta: qaBaselineTotal == null ? null : Number((qaAfterTotal - qaBaselineTotal).toFixed(1)),
        },
      });
      return;
    } else {
      const qaDims = result.qaDimensions ?? computeQaDimensionScores(result.imageGenerated, result.qaStructural.layoutEvidence);
      await insertEditorialEvent({
        actionType: "generation_completed",
        pageId: null,
        pageNumber: eventPageNumber,
        pageTitle: eventPageTitle,
        userId: authUser.id,
        userName: authUser.displayName,
        result: result.imageGenerated
          ? result.generationStatus === "post_render_failed"
            ? `Generacion bloqueada (${useComposerDraft ? "fuente: Composer draft" : "fuente: Locked seed"}): post-render no medible`
            : `Generacion completada (${useComposerDraft ? "fuente: Composer draft" : "fuente: Locked seed"}) con imagen real y QA servidor ${(qaDims.avg * 10).toFixed(0)}/100`
          : `Generacion bloqueada (${useComposerDraft ? "fuente: Composer draft" : "fuente: Locked seed"}): falla de imagen; QA servidor ${(qaDims.avg * 10).toFixed(0)}/100`,
        note: [
          result.imageError ? `error=${result.imageError}` : null,
          "qa_source=server",
          `generation_source=${useComposerDraft ? "composer_draft" : "locked_seed"}`,
        ].filter(Boolean).join(" · "),
      });
    }

    res.status(201).json({
      success: true,
      ...result,
      regenerationScope,
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
