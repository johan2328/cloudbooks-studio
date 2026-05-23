import { Router, type IRouter } from "express";
import { db, qaRecordsTable, pagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetQAParams, UpsertQAParams, UpsertQABody, GetQAResponse, UpsertQAResponse } from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/qa/:pageId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  const params = GetQAParams.safeParse({ pageId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [record] = await db
    .select()
    .from(qaRecordsTable)
    .where(eq(qaRecordsTable.pageId, params.data.pageId));

  if (!record) {
    res.status(404).json({ error: "Registro QA no encontrado" });
    return;
  }

  res.json(GetQAResponse.parse(serializeDates(record)));
});

router.put("/qa/:pageId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.pageId) ? req.params.pageId[0] : req.params.pageId;
  const params = UpsertQAParams.safeParse({ pageId: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpsertQABody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(qaRecordsTable)
    .where(eq(qaRecordsTable.pageId, params.data.pageId));

  let record;
  if (existing.length > 0) {
    [record] = await db
      .update(qaRecordsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(qaRecordsTable.pageId, params.data.pageId))
      .returning();
  } else {
    [record] = await db
      .insert(qaRecordsTable)
      .values({ pageId: params.data.pageId, ...parsed.data })
      .returning();
  }

  await db
    .update(pagesTable)
    .set({ qaScore: parsed.data.total })
    .where(eq(pagesTable.id, params.data.pageId));

  res.json(UpsertQAResponse.parse(serializeDates(record)));
});

export default router;
