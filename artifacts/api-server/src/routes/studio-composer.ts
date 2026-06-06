import { Router } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { activityLogsTable, composerDraftsTable, db, generationRunsTable, pagesTable } from "@workspace/db";

import { getSeed, listSeeds } from "../data/page-seeds";
import { buildComposerProposal } from "../domain/composer/proposals";
import type { EditorialCard } from "../domain/editorial-cards/types";
import { ensurePageByNumber, getAuthUserFromHeader, insertEditorialEvent } from "../services/studio/editorial-events";

const router = Router();
const COMPOSER_ACTION_NOTE_PREFIX = "composer_action_v1:";

type ComposerActionKind = "shortcut" | "generate" | "autofix" | "rollback";
type ComposerActionStatus = "ok" | "error" | "info";
type ComposerRegenerationScope = "full" | "technical_core" | "exam_rail";

interface ComposerActionPayload {
  kind: ComposerActionKind;
  action: string;
  status: ComposerActionStatus;
  beforeTotal: number | null;
  afterTotal: number | null;
  delta: number | null;
  changedBlocks: number;
  note: string;
}

function normalizeNumeric(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Number(value.toFixed(1));
}

function normalizeComposerActionPayload(input: unknown): ComposerActionPayload | null {
  if (!input || typeof input !== "object") return null;
  const payload = input as Record<string, unknown>;
  const kindRaw = typeof payload.kind === "string" ? payload.kind : "shortcut";
  const statusRaw = typeof payload.status === "string" ? payload.status : "info";
  const actionRaw = typeof payload.action === "string" ? payload.action.trim() : "";
  if (!actionRaw) return null;

  const kind = (["shortcut", "generate", "autofix", "rollback"].includes(kindRaw)
    ? kindRaw
    : "shortcut") as ComposerActionKind;
  const status = (["ok", "error", "info"].includes(statusRaw)
    ? statusRaw
    : "info") as ComposerActionStatus;
  const changedBlocksRaw = typeof payload.changedBlocks === "number" && Number.isFinite(payload.changedBlocks)
    ? Math.max(0, Math.round(payload.changedBlocks))
    : 0;
  const noteRaw = typeof payload.note === "string" ? payload.note.trim() : "";

  return {
    kind,
    action: actionRaw,
    status,
    beforeTotal: normalizeNumeric(payload.beforeTotal),
    afterTotal: normalizeNumeric(payload.afterTotal),
    delta: normalizeNumeric(payload.delta),
    changedBlocks: changedBlocksRaw,
    note: noteRaw.length > 0 ? noteRaw : "Sin nota adicional.",
  };
}

function mapComposerActionLog(log: typeof activityLogsTable.$inferSelect) {
  let parsed: ComposerActionPayload | null = null;
  if (log.note?.startsWith(COMPOSER_ACTION_NOTE_PREFIX)) {
    const serialized = log.note.slice(COMPOSER_ACTION_NOTE_PREFIX.length);
    try {
      parsed = normalizeComposerActionPayload(JSON.parse(serialized));
    } catch {
      parsed = null;
    }
  }

  const createdAtIso = log.createdAt instanceof Date
    ? log.createdAt.toISOString()
    : new Date(log.createdAt ?? Date.now()).toISOString();

  return {
    id: String(log.id),
    pageId: log.pageNumber ?? "",
    kind: parsed?.kind ?? "shortcut",
    action: parsed?.action ?? log.result,
    status: parsed?.status ?? "info",
    beforeTotal: parsed?.beforeTotal ?? null,
    afterTotal: parsed?.afterTotal ?? null,
    delta: parsed?.delta ?? null,
    changedBlocks: parsed?.changedBlocks ?? 0,
    note: parsed?.note ?? log.result,
    userName: log.userName ?? "Sistema",
    createdAt: createdAtIso,
  };
}

function normalizePageId(raw: string): string {
  const num = parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 1) return "";
  return String(num).padStart(2, "0");
}

function parseBatchPageIds(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((value) => (typeof value === "string" ? normalizePageId(value) : normalizePageId(String(value))))
          .filter((value) => value.length > 0),
      ),
    );
  }
  if (typeof input === "string") {
    return Array.from(
      new Set(
        input
          .split(/[,\s]+/g)
          .map((token) => normalizePageId(token))
          .filter((value) => value.length > 0),
      ),
    );
  }
  return [];
}

function buildStudioBaseUrl(req: { protocol: string; get(name: string): string | undefined; headers: Record<string, unknown> }): string {
  const host = req.get("host") ?? "";
  const forwardedProto = typeof req.headers["x-forwarded-proto"] === "string" ? req.headers["x-forwarded-proto"] : "";
  const proto = forwardedProto || req.protocol || "http";
  return `${proto}://${host}`;
}

function compact(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
}

function buildSelectiveGroundingCards(pageId: string): { cards: EditorialCard[]; expiresAt: string; sourceRefs: string[] } {
  const seed = getSeed(pageId);
  if (!seed.found) return { cards: [], expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), sourceRefs: [] };
  const data = seed.data;
  const firstModule = data.visualModules[0];
  const secondModule = data.visualModules[1] ?? firstModule;
  const answer = data.autocheck.options[data.autocheck.correctOption] ?? "respuesta correcta";
  const sourceRefs = [
    "mslearn:azure-container-registry",
    `cloudbooks:ai-200:${pageId}:selective-grounding-v1`,
  ];
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const base = {
    pageId,
    status: "selected" as const,
    targetZone: "complement" as const,
    sourceRefs,
    formatAffinity: ["visual_atlas", "exam_traps", "question_bank", "rapid_review"] as EditorialCard["formatAffinity"],
    densityScore: 9.0,
    visualRisk: "low" as const,
  };

  return {
    expiresAt,
    sourceRefs,
    cards: [
      {
        ...base,
        id: `grounding-exam-signal-${pageId}`,
        role: "exam_signal",
        title: "Senal de examen",
        claim: compact(data.traps[0]?.correction ?? firstModule.description, 104),
        explanation: compact(`Relaciona ${firstModule.title} con la decision evaluable: ${data.guideQuestion}`, 170),
        diagramIntent: "chip visual de decision con condicion, senal y resultado esperado",
        examSignal: compact(data.traps[0]?.wrong ?? data.guideQuestion, 110),
      },
      {
        ...base,
        id: `grounding-micro-case-${pageId}`,
        role: "micro_case",
        title: "Caso minimo",
        claim: compact(`Situacion: ${secondModule.title}. Decision correcta: ${answer}.`, 104),
        explanation: compact(data.autocheck.explanation, 170),
        diagramIntent: "micro-caso con actor, restriccion, decision y consecuencia en una sola lectura",
        examSignal: compact(data.autocheck.question, 110),
      },
    ],
  };
}

async function processBatchRun(args: {
  runId: string;
  runRowIds: number[];
  pageIds: string[];
  baseUrl: string;
  authHeader?: string;
  useComposerDraft: boolean;
  regenerationScope: ComposerRegenerationScope;
}): Promise<void> {
  const { runId, runRowIds, pageIds, baseUrl, authHeader, useComposerDraft, regenerationScope } = args;
  for (let idx = 0; idx < pageIds.length; idx += 1) {
    const pageId = pageIds[idx];
    const runRowId = runRowIds[idx];
    if (!pageId || !runRowId) continue;
    await db
      .update(generationRunsTable)
      .set({
        status: "running",
        startedAt: new Date(),
        finishedAt: null,
        error: null,
      })
      .where(eq(generationRunsTable.id, runRowId));

    try {
      const res = await fetch(`${baseUrl}/api/studio/generate-visual-atlas-page`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          certificationId: "ai-200",
          pageId,
          useComposerDraft,
          regenerationScope,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        await db
          .update(generationRunsTable)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: text.slice(0, 1800),
          })
          .where(eq(generationRunsTable.id, runRowId));
        continue;
      }

      const payload = await res.json() as {
        outputs?: { html?: string | null };
        imageGenerated?: boolean;
        imageError?: string | null;
        qaDelta?: { after?: number | null };
        layoutEngine?: { score?: number; batchGate?: { canBatch?: boolean } };
      };
      const outputSummary = [
        payload.outputs?.html ? `html=${payload.outputs.html}` : null,
        typeof payload.qaDelta?.after === "number" ? `qa_after=${payload.qaDelta.after.toFixed(1)}` : null,
        typeof payload.layoutEngine?.score === "number" ? `layout_engine=${payload.layoutEngine.score.toFixed(1)}` : null,
        typeof payload.layoutEngine?.batchGate?.canBatch === "boolean" ? `batch_gate=${payload.layoutEngine.batchGate.canBatch ? "pass" : "hold"}` : null,
        payload.imageGenerated ? "visual=real" : "visual=placeholder",
      ].filter(Boolean).join(" · ");

      await db
        .update(generationRunsTable)
        .set({
          status: "completed",
          finishedAt: new Date(),
          output: outputSummary || `composer_batch:${runId}`,
          error: payload.imageError ?? null,
        })
        .where(eq(generationRunsTable.id, runRowId));
    } catch (err) {
      await db
        .update(generationRunsTable)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: String(err).slice(0, 1800),
        })
        .where(eq(generationRunsTable.id, runRowId));
    }
  }
}

router.get("/studio/composer/pages", (_req, res): void => {
  const proposals = listSeeds().map(({ pageId, data }) => buildComposerProposal(pageId, data));
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    source: "api_visual_atlas_composer_v1",
    pages: proposals.map((proposal) => ({
      pageId: proposal.pageId,
      pageNumber: proposal.draft.pageNumber,
      family: proposal.draft.family,
      recommendedTransition: proposal.recommendedTransition.level,
      totalScore: proposal.draft.editorialValidation.total,
      missing: proposal.draft.structuralValidation.missing,
    })),
  });
});

router.get("/studio/composer/proposal/:pageId", (req, res): void => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const seed = getSeed(pageId);

  if (!seed.found) {
    res.status(404).json({
      error: "composer_seed_missing",
      pageId,
      availableSeeds: seed.availableSeeds,
    });
    return;
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json(buildComposerProposal(pageId, seed.data));
});

router.get("/studio/composer/draft/:pageId", async (req, res): Promise<void> => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const [draft] = await db.select().from(composerDraftsTable).where(eq(composerDraftsTable.pageId, pageId));

  if (!draft) {
    res.status(404).json({ error: "composer_draft_missing", pageId });
    return;
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    pageId: draft.pageId,
    pageNumber: draft.pageNumber,
    family: draft.family,
    transitionLevel: draft.transitionLevel,
    draft: draft.draft,
    note: draft.note,
    updatedByName: draft.updatedByName,
    updatedAt: draft.updatedAt,
  });
});

router.put("/studio/composer/draft/:pageId", async (req, res): Promise<void> => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const seed = getSeed(pageId);
  if (!seed.found) {
    res.status(404).json({
      error: "composer_seed_missing",
      pageId,
      availableSeeds: seed.availableSeeds,
    });
    return;
  }

  const payload = req.body as {
    pageNumber?: string;
    family?: string;
    transitionLevel?: string;
    draft?: unknown;
    note?: string | null;
  };

  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "composer_payload_invalid", detail: "Payload vacio o invalido." });
    return;
  }
  if (!payload.pageNumber || typeof payload.pageNumber !== "string") {
    res.status(400).json({ error: "composer_payload_invalid", detail: "pageNumber es requerido." });
    return;
  }
  if (!payload.family || typeof payload.family !== "string") {
    res.status(400).json({ error: "composer_payload_invalid", detail: "family es requerido." });
    return;
  }
  if (!payload.transitionLevel || typeof payload.transitionLevel !== "string") {
    res.status(400).json({ error: "composer_payload_invalid", detail: "transitionLevel es requerido." });
    return;
  }
  if (!payload.draft || typeof payload.draft !== "object") {
    res.status(400).json({ error: "composer_payload_invalid", detail: "draft es requerido." });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const values = {
    pageId,
    pageNumber: payload.pageNumber,
    family: payload.family,
    transitionLevel: payload.transitionLevel,
    draft: payload.draft,
    note: payload.note ?? null,
    updatedById: authUser.id,
    updatedByName: authUser.displayName,
  };

  const [existing] = await db.select().from(composerDraftsTable).where(eq(composerDraftsTable.pageId, pageId));
  if (existing) {
    await db.update(composerDraftsTable).set(values).where(and(eq(composerDraftsTable.id, existing.id), eq(composerDraftsTable.pageId, pageId)));
  } else {
    await db.insert(composerDraftsTable).values(values);
  }

  await insertEditorialEvent({
    actionType: "composer_draft_saved",
    pageNumber: payload.pageNumber,
    pageTitle: seed.data.title,
    userId: authUser.id,
    userName: authUser.displayName,
    result: "Borrador Composer guardado",
    note: payload.note ?? null,
  });

  const [saved] = await db.select().from(composerDraftsTable).where(eq(composerDraftsTable.pageId, pageId));
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    pageId: saved.pageId,
    pageNumber: saved.pageNumber,
    family: saved.family,
    transitionLevel: saved.transitionLevel,
    draft: saved.draft,
    note: saved.note,
    updatedByName: saved.updatedByName,
    updatedAt: saved.updatedAt,
  });
});

router.get("/studio/composer/actions/:pageId", async (req, res): Promise<void> => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const limitQuery = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 24;
  const limit = Number.isFinite(limitQuery) ? Math.max(1, Math.min(80, limitQuery)) : 24;
  const logs = await db
    .select()
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.pageNumber, pageId), eq(activityLogsTable.actionType, "composer_action")))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    pageId,
    source: "composer_activity_logs_v1",
    logs: logs.map(mapComposerActionLog),
  });
});

router.post("/studio/composer/actions/:pageId", async (req, res): Promise<void> => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const seed = getSeed(pageId);
  if (!seed.found) {
    res.status(404).json({
      error: "composer_seed_missing",
      pageId,
      availableSeeds: seed.availableSeeds,
    });
    return;
  }

  const normalized = normalizeComposerActionPayload(req.body);
  if (!normalized) {
    res.status(400).json({
      error: "composer_action_payload_invalid",
      detail: "Action, kind y status validos son requeridos.",
    });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const serialized = `${COMPOSER_ACTION_NOTE_PREFIX}${JSON.stringify(normalized)}`;
  await insertEditorialEvent({
    actionType: "composer_action",
    pageNumber: pageId,
    pageTitle: seed.data.title,
    userId: authUser.id,
    userName: authUser.displayName,
    result: `${normalized.kind}: ${normalized.action}`,
    note: serialized,
  });

  const [latest] = await db
    .select()
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.pageNumber, pageId), eq(activityLogsTable.actionType, "composer_action")))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(1);

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.status(201).json({
    pageId,
    log: latest ? mapComposerActionLog(latest) : {
      id: `local-${Date.now()}`,
      pageId,
      ...normalized,
      userName: authUser.displayName,
      createdAt: new Date().toISOString(),
    },
  });
});

router.post("/studio/composer/grounding/:pageId", async (req, res): Promise<void> => {
  const pageId = normalizePageId(req.params.pageId);
  if (!pageId) {
    res.status(400).json({ error: "composer_page_invalid", detail: "pageId invalido." });
    return;
  }
  const seed = getSeed(pageId);

  if (!seed.found) {
    res.status(404).json({
      error: "composer_seed_missing",
      pageId,
      availableSeeds: seed.availableSeeds,
    });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const grounding = buildSelectiveGroundingCards(pageId);

  await insertEditorialEvent({
    actionType: "composer_grounding_requested",
    pageNumber: pageId,
    pageTitle: seed.data.title,
    userId: authUser.id,
    userName: authUser.displayName,
    result: `Grounding selectivo preparado (${grounding.cards.length} carta(s))`,
    note: `ttl=7d | refs=${grounding.sourceRefs.join(",")}`,
  });

  res.status(200).json({
    success: true,
    pageId,
    status: "grounding_ready",
    ttlDays: 7,
    expiresAt: grounding.expiresAt,
    sourceRefs: grounding.sourceRefs,
    cards: grounding.cards,
    message: "Grounding selectivo listo como insumo editorial; no se muestra como texto bruto en la pagina.",
  });
});

router.post("/studio/composer/autofix/:pageId", async (req, res): Promise<void> => {
  const pageId = String(req.params.pageId).padStart(2, "0");
  const seed = getSeed(pageId);

  if (!seed.found) {
    res.status(404).json({
      error: "composer_seed_missing",
      pageId,
      availableSeeds: seed.availableSeeds,
    });
    return;
  }

  const payload = req.body as {
    actions?: unknown;
    beforeTotal?: unknown;
    afterTotal?: unknown;
  };
  const actions = Array.isArray(payload?.actions)
    ? payload.actions.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const beforeTotal = typeof payload?.beforeTotal === "number" && Number.isFinite(payload.beforeTotal)
    ? payload.beforeTotal
    : null;
  const afterTotal = typeof payload?.afterTotal === "number" && Number.isFinite(payload.afterTotal)
    ? payload.afterTotal
    : null;

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const delta = beforeTotal != null && afterTotal != null ? Number((afterTotal - beforeTotal).toFixed(1)) : null;
  const actionList = actions.length > 0 ? actions.join(" | ") : "sin cambios";

  await insertEditorialEvent({
    actionType: "composer_autofix_applied",
    pageNumber: pageId,
    pageTitle: seed.data.title,
    userId: authUser.id,
    userName: authUser.displayName,
    result: `Autocorreccion Composer aplicada (${actionList})`,
    note: `qa_source=composer_projection; before=${beforeTotal ?? "-"}; after=${afterTotal ?? "-"}; delta=${delta ?? "-"}`,
  });

  res.status(200).json({ success: true, pageId, actions, beforeTotal, afterTotal, delta });
});

router.post("/studio/composer/batch/run", async (req, res): Promise<void> => {
  const body = req.body as {
    pageIds?: unknown;
    useComposerDraft?: boolean;
    regenerationScope?: ComposerRegenerationScope;
  };
  const pageIds = parseBatchPageIds(body?.pageIds);
  if (pageIds.length === 0) {
    res.status(400).json({ error: "batch_page_ids_invalid", detail: "Debes enviar pageIds validos (ej: [\"01\",\"02\"])." });
    return;
  }

  const available = new Set(listSeeds().map((seed) => seed.pageId));
  const unknown = pageIds.filter((pageId) => !available.has(pageId));
  if (unknown.length > 0) {
    res.status(404).json({ error: "batch_seed_missing", detail: `Seeds no disponibles para: ${unknown.join(", ")}` });
    return;
  }

  const useComposerDraft = body?.useComposerDraft !== false;
  const regenerationScope: ComposerRegenerationScope = body?.regenerationScope === "technical_core" || body?.regenerationScope === "exam_rail"
    ? body.regenerationScope
    : "full";

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const runId = `cb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const batchKey = `composer_batch:${runId}`;
  const runRowIds: number[] = [];

  for (const pageId of pageIds) {
    const seed = getSeed(pageId);
    if (!seed.found) continue;
    const pageRecord = await ensurePageByNumber({
      pageNumber: pageId,
      title: seed.data.title,
      domain: seed.data.domainLabel,
      batch: seed.data.batchLabel,
      context: seed.data.context,
    });
    const [row] = await db.insert(generationRunsTable).values({
      pageId: pageRecord.id,
      batch: batchKey,
      status: "queued",
      model: "gpt-4o-mini+gpt-image-2",
      output: `scope=${regenerationScope}`,
      error: useComposerDraft ? "source=composer_draft" : "source=locked_seed",
    }).returning({ id: generationRunsTable.id });
    if (row?.id) runRowIds.push(row.id);
  }

  await insertEditorialEvent({
    actionType: "batch_generation_started",
    pageNumber: null,
    pageTitle: `Batch Composer ${runId}`,
    userId: authUser.id,
    userName: authUser.displayName,
    result: `Batch iniciado con ${pageIds.length} pagina(s)`,
    note: `runId=${runId} · scope=${regenerationScope} · source=${useComposerDraft ? "composer_draft" : "locked_seed"}`,
  });

  const baseUrl = buildStudioBaseUrl(req);
  void processBatchRun({
    runId,
    runRowIds,
    pageIds,
    baseUrl,
    authHeader: req.headers.authorization,
    useComposerDraft,
    regenerationScope,
  });

  res.status(202).json({
    success: true,
    runId,
    batchKey,
    queued: pageIds.length,
    source: useComposerDraft ? "composer_draft" : "locked_seed",
    regenerationScope,
  });
});

router.get("/studio/composer/batch/:runId", async (req, res): Promise<void> => {
  const runId = String(req.params.runId ?? "").trim();
  if (!runId) {
    res.status(400).json({ error: "batch_run_id_required" });
    return;
  }
  const batchKey = `composer_batch:${runId}`;
  const rows = await db
    .select()
    .from(generationRunsTable)
    .where(eq(generationRunsTable.batch, batchKey))
    .orderBy(asc(generationRunsTable.id));

  if (rows.length === 0) {
    res.status(404).json({ error: "batch_run_not_found", runId });
    return;
  }

  const pageDbIds = Array.from(new Set(rows.map((row) => row.pageId)));
  const pageRows = await db
    .select({
      id: pagesTable.id,
      pageNumber: pagesTable.pageNumber,
      title: pagesTable.title,
    })
    .from(pagesTable)
    .where(inArray(pagesTable.id, pageDbIds));
  const pageMap = new Map(pageRows.map((page) => [page.id, page]));

  const counts = rows.reduce(
    (acc, row) => {
      const status = row.status || "queued";
      if (status === "completed") acc.completed += 1;
      else if (status === "failed") acc.failed += 1;
      else if (status === "running") acc.running += 1;
      else acc.queued += 1;
      return acc;
    },
    { queued: 0, running: 0, completed: 0, failed: 0 },
  );

  const done = counts.queued === 0 && counts.running === 0;
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({
    runId,
    batchKey,
    done,
    counts,
    items: rows.map((row) => {
      const page = pageMap.get(row.pageId);
      return {
        runRowId: row.id,
        pageDbId: row.pageId,
        pageId: page?.pageNumber ?? String(row.pageId),
        title: page?.title ?? "Pagina",
        status: row.status,
        startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
        finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : null,
        output: row.output,
        error: row.error,
      };
    }),
  });
});

router.post("/studio/composer/batch/:runId/retry-failed", async (req, res): Promise<void> => {
  const runId = String(req.params.runId ?? "").trim();
  if (!runId) {
    res.status(400).json({ error: "batch_run_id_required" });
    return;
  }
  const batchKey = `composer_batch:${runId}`;
  const rows = await db
    .select()
    .from(generationRunsTable)
    .where(eq(generationRunsTable.batch, batchKey))
    .orderBy(asc(generationRunsTable.id));
  const failed = rows.filter((row) => row.status === "failed");
  if (failed.length === 0) {
    res.status(200).json({ success: true, runId, retried: 0, detail: "No hay items failed para reintentar." });
    return;
  }

  const pageDbIds = Array.from(new Set(failed.map((row) => row.pageId)));
  const pageRows = await db
    .select({
      id: pagesTable.id,
      pageNumber: pagesTable.pageNumber,
    })
    .from(pagesTable)
    .where(inArray(pagesTable.id, pageDbIds));
  const pageMap = new Map(pageRows.map((page) => [page.id, page.pageNumber]));
  const pageIds = failed
    .map((row) => pageMap.get(row.pageId) ?? "")
    .map((pageId) => normalizePageId(pageId))
    .filter((pageId) => pageId.length > 0);
  const runRowIds = failed.map((row) => row.id);

  await db
    .update(generationRunsTable)
    .set({ status: "queued", error: null, finishedAt: null })
    .where(inArray(generationRunsTable.id, runRowIds));

  const body = req.body as {
    useComposerDraft?: boolean;
    regenerationScope?: ComposerRegenerationScope;
  };
  const useComposerDraft = body?.useComposerDraft !== false;
  const regenerationScope: ComposerRegenerationScope = body?.regenerationScope === "technical_core" || body?.regenerationScope === "exam_rail"
    ? body.regenerationScope
    : "full";
  const baseUrl = buildStudioBaseUrl(req);
  void processBatchRun({
    runId,
    runRowIds,
    pageIds,
    baseUrl,
    authHeader: req.headers.authorization,
    useComposerDraft,
    regenerationScope,
  });

  res.status(202).json({ success: true, runId, retried: runRowIds.length, regenerationScope, source: useComposerDraft ? "composer_draft" : "locked_seed" });
});

export default router;
