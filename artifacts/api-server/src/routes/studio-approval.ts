import { Router } from "express";
import { writeFile } from "fs/promises";
import { join } from "path";
import { db, pagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import { checkApprovalGate } from "../services/qa/approval-gate";
import { pageOutputDir } from "../services/export/paths";
import { getAuthUserFromHeader, insertEditorialEvent, resolvePageByNumber } from "../services/studio/editorial-events";

const router = Router();

router.post("/studio/approve-page/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const gate = await checkApprovalGate(pageId);

  if (!gate.allowed) {
    if (gate.code === "no_output") {
      res.status(400).json({ error: "Sin output generado para esta pagina. Genera primero.", code: "no_output" });
      return;
    }
    if (gate.code === "metadata_error") {
      res.status(500).json({ error: "metadata.json corrupto o ilegible" });
      return;
    }
    res.status(400).json({
      error: "Aprobacion bloqueada: el upper visual no es una imagen real de gpt-image-2 medium.",
      code: "approval_blocked_placeholder",
      generationMode: gate.generationMode,
    });
    return;
  }

  const authUser = await getAuthUserFromHeader(req.headers.authorization);
  const approval = {
    pageId,
    approvedAt: new Date().toISOString(),
    generationMode: gate.generationMode,
    approvedByClient: authUser.id ?? "unknown",
  };

  const outDir = pageOutputDir(pageId);
  await writeFile(join(outDir, "approval.json"), JSON.stringify(approval, null, 2), "utf-8");

  const pageRecord = await resolvePageByNumber(pageId);
  if (pageRecord) {
    await db.update(pagesTable).set({ status: "approved", updatedAt: new Date() }).where(eq(pagesTable.id, pageRecord.id));
    await insertEditorialEvent({
      actionType: "page_approved",
      pageId: pageRecord.id,
      pageNumber: pageRecord.pageNumber,
      pageTitle: pageRecord.title,
      userId: authUser.id,
      userName: authUser.displayName,
      result: "Pagina aprobada para exportacion con upper visual real",
    });
  }

  req.log.info({ pageId, approvedAt: approval.approvedAt }, "Page approved - approval.json written");
  res.status(200).json({ success: true, pageId, approvedAt: approval.approvedAt });
});

export default router;
