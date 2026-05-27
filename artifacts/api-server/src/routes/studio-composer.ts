import { Router } from "express";

import { getSeed, listSeeds } from "../data/page-seeds";
import { buildComposerProposal } from "../domain/composer/proposals";

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

export default router;
