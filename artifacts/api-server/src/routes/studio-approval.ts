import { Router } from "express";
import { writeFile } from "fs/promises";
import { join } from "path";

import { checkApprovalGate } from "../services/qa/approval-gate";
import { pageOutputDir } from "../services/export/paths";

const router = Router();

/**
 * POST /api/studio/approve-page/:pageId
 * Aprobación real persistida en filesystem (approval.json).
 * Bloquea si el output es placeholder (no imagen real de gpt-image-2).
 */
router.post("/studio/approve-page/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;

  const gate = await checkApprovalGate(pageId);

  if (!gate.allowed) {
    if (gate.code === "no_output") {
      res.status(400).json({
        error: "Sin output generado para esta página. Genera primero.",
        code:  "no_output",
      });
      return;
    }
    if (gate.code === "metadata_error") {
      res.status(500).json({ error: "metadata.json corrupto o ilegible" });
      return;
    }
    res.status(400).json({
      error:          "Aprobación bloqueada: el upper visual no es una imagen real de gpt-image-2 medium.",
      code:           "approval_blocked_placeholder",
      generationMode: gate.generationMode,
    });
    return;
  }

  const approval = {
    pageId,
    approvedAt:       new Date().toISOString(),
    generationMode:   gate.generationMode,
    approvedByClient: (req.headers["x-user-id"] as string | undefined) ?? "unknown",
  };

  const outDir = pageOutputDir(pageId);
  await writeFile(join(outDir, "approval.json"), JSON.stringify(approval, null, 2), "utf-8");

  req.log.info({ pageId, approvedAt: approval.approvedAt }, "Page approved — approval.json written");

  res.status(200).json({ success: true, pageId, approvedAt: approval.approvedAt });
});

export default router;
