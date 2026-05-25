import { Router, type IRouter } from "express";
import { db, generationRunsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListRunsQueryParams,
  ListRunsResponse,
  GetRunParams,
  GetRunResponse,
} from "@workspace/api-zod";
import { serializeDates } from "../lib/serialize.js";

const router: IRouter = Router();

router.get("/generation/runs", async (req, res): Promise<void> => {
  const params = ListRunsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  let runs;
  if (params.data.pageId) {
    runs = await db
      .select()
      .from(generationRunsTable)
      .where(eq(generationRunsTable.pageId, params.data.pageId))
      .orderBy(desc(generationRunsTable.startedAt));
  } else {
    runs = await db
      .select()
      .from(generationRunsTable)
      .orderBy(desc(generationRunsTable.startedAt))
      .limit(50);
  }

  res.json(ListRunsResponse.parse(serializeDates(runs)));
});

router.post("/generation/runs", async (_req, res): Promise<void> => {
  res.status(410).json({
    error: "Legacy generation route disabled",
    message:
      "Use /api/studio/generate-visual-atlas-page. This route previously created simulated runs and is disabled to avoid mixing demo state with production output.",
  });
});

router.get("/generation/runs/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRunParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [run] = await db
    .select()
    .from(generationRunsTable)
    .where(eq(generationRunsTable.id, params.data.id));

  if (!run) {
    res.status(404).json({ error: "Ejecución no encontrada" });
    return;
  }

  res.json(GetRunResponse.parse(serializeDates(run)));
});

export default router;
