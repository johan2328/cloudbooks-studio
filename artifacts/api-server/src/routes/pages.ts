import { Router, type IRouter } from "express";
import { db, pagesTable, qaRecordsTable, generationRunsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import {
  ListPagesQueryParams,
  ListPagesResponse,
  CreatePageBody,
  GetPageParams,
  GetPageResponse,
  UpdatePageParams,
  UpdatePageBody,
  UpdatePageResponse,
  ApprovePageParams,
  ApprovePageResponse,
  RequestRevisionParams,
  RequestRevisionBody,
  RequestRevisionResponse,
  GetSummaryResponse,
  ListBatchesResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/pages", async (req, res): Promise<void> => {
  const params = ListPagesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let query = db.select().from(pagesTable).$dynamic();

  const conditions = [];
  if (params.data.batch) {
    conditions.push(eq(pagesTable.batch, params.data.batch));
  }
  if (params.data.status) {
    conditions.push(eq(pagesTable.status, params.data.status));
  }
  if (params.data.domain) {
    conditions.push(eq(pagesTable.domain, params.data.domain));
  }

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  const pages = await query.orderBy(pagesTable.pageNumber);
  res.json(ListPagesResponse.parse(serializeDates(pages)));
});

router.post("/pages", async (req, res): Promise<void> => {
  const parsed = CreatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [page] = await db.insert(pagesTable).values(parsed.data).returning();
  res.status(201).json(GetPageResponse.parse(serializeDates(page)));
});

router.get("/pages/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPageParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, params.data.id));
  if (!page) {
    res.status(404).json({ error: "Página no encontrada" });
    return;
  }

  res.json(GetPageResponse.parse(serializeDates(page)));
});

router.patch("/pages/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (parsed.data.groundingStatus === "verified") {
    updateData.groundingUpdatedAt = new Date();
  }

  const [page] = await db
    .update(pagesTable)
    .set(updateData)
    .where(eq(pagesTable.id, params.data.id))
    .returning();

  if (!page) {
    res.status(404).json({ error: "Página no encontrada" });
    return;
  }

  res.json(UpdatePageResponse.parse(serializeDates(page)));
});

router.post("/pages/:id/approve", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ApprovePageParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [page] = await db
    .update(pagesTable)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(pagesTable.id, params.data.id))
    .returning();

  if (!page) {
    res.status(404).json({ error: "Página no encontrada" });
    return;
  }

  res.json(ApprovePageResponse.parse(serializeDates(page)));
});

router.post("/pages/:id/request-revision", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RequestRevisionParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = RequestRevisionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [page] = await db
    .update(pagesTable)
    .set({ status: "pending", updatedAt: new Date() })
    .where(eq(pagesTable.id, params.data.id))
    .returning();

  if (!page) {
    res.status(404).json({ error: "Página no encontrada" });
    return;
  }

  res.json(RequestRevisionResponse.parse(serializeDates(page)));
});

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const allPages = await db.select().from(pagesTable);

  const byStatus: Record<string, number> = {};
  const byDomain: Record<string, number> = {};

  for (const p of allPages) {
    byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    byDomain[p.domain] = (byDomain[p.domain] ?? 0) + 1;
  }

  const scoresArr = allPages.filter((p) => p.qaScore != null).map((p) => p.qaScore as number);
  const avgQaScore = scoresArr.length > 0 ? scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length : null;

  const recentPages = allPages
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  const recentActivity = recentPages.map((p) => ({
    pageId: p.id,
    pageNumber: p.pageNumber,
    title: p.title,
    action: p.status,
    at: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : String(p.updatedAt),
  }));

  res.json(
    GetSummaryResponse.parse({
      total: allPages.length,
      byStatus,
      byDomain,
      recentActivity,
      avgQaScore,
    })
  );
});

router.get("/batches", async (_req, res): Promise<void> => {
  const allPages = await db.select().from(pagesTable);

  const batchMap: Record<string, { pageCount: number; approvedCount: number }> = {};
  for (const p of allPages) {
    if (!batchMap[p.batch]) batchMap[p.batch] = { pageCount: 0, approvedCount: 0 };
    batchMap[p.batch].pageCount += 1;
    if (p.status === "approved" || p.status === "exported") batchMap[p.batch].approvedCount += 1;
  }

  const batches = Object.entries(batchMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, counts]) => ({ id, name: id, ...counts }));

  res.json(ListBatchesResponse.parse(batches));
});

export default router;
