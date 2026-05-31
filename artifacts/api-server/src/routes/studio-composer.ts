import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { composerDraftsTable, db } from "@workspace/db";

import { getSeed, listSeeds } from "../data/page-seeds";
import { buildComposerProposal } from "../domain/composer/proposals";
import { getAuthUserFromHeader, insertEditorialEvent } from "../services/studio/editorial-events";

const router = Router();

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

export default router;
