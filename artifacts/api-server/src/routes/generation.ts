import { Router, type IRouter } from "express";
import { db, generationRunsTable, pagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  ListRunsQueryParams,
  ListRunsResponse,
  CreateRunBody,
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

router.post("/generation/runs", async (req, res): Promise<void> => {
  const parsed = CreateRunBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.id, parsed.data.pageId));
  if (!page) {
    res.status(404).json({ error: "Página no encontrada" });
    return;
  }

  await db
    .update(pagesTable)
    .set({ status: "generating" })
    .where(eq(pagesTable.id, parsed.data.pageId));

  const model = parsed.data.model ?? "gpt-4o";

  const [run] = await db
    .insert(generationRunsTable)
    .values({
      pageId: parsed.data.pageId,
      batch: parsed.data.batch ?? page.batch,
      status: "running",
      model,
    })
    .returning();

  simulateGeneration(run.id, page).catch(() => {});

  res.status(201).json(serializeDates(run));
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

async function simulateGeneration(
  runId: number,
  page: { id: number; title: string; domain: string }
): Promise<void> {
  const delay = 3000 + Math.random() * 2000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const hasApiKey = !!process.env.OPENAI_API_KEY;
  const outputText = hasApiKey
    ? "[OpenAI output would appear here in production]"
    : `[DEMO] Infografía generada para "${page.title}" (${page.domain}). En producción, este output sería el HTML/SVG completo generado por GPT-4o con el Contrato Visual v1.4 activo.`;

  await db
    .update(generationRunsTable)
    .set({
      status: "completed",
      promptTokens: Math.floor(800 + Math.random() * 400),
      completionTokens: Math.floor(1200 + Math.random() * 800),
      output: outputText,
      finishedAt: new Date(),
    })
    .where(eq(generationRunsTable.id, runId));

  await db
    .update(pagesTable)
    .set({ status: "review" })
    .where(eq(pagesTable.id, page.id));
}

export default router;
