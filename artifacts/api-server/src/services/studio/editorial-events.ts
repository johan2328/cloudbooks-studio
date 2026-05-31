import { db, activityLogsTable, generationRunsTable, pagesTable, qaRecordsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

interface AuthUser {
  id: number | null;
  displayName: string;
}

export async function getAuthUserFromHeader(authHeader?: string): Promise<AuthUser> {
  if (!authHeader || !authHeader.startsWith("Bearer demo-token-")) {
    return { id: null, displayName: "Sistema" };
  }

  const userId = parseInt(authHeader.replace("Bearer demo-token-", ""), 10);
  if (!Number.isFinite(userId)) {
    return { id: null, displayName: "Sistema" };
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    return { id: null, displayName: "Sistema" };
  }

  return { id: user.id, displayName: user.displayName };
}

export async function resolvePageByNumber(pageNumber: string) {
  const [page] = await db.select().from(pagesTable).where(eq(pagesTable.pageNumber, pageNumber));
  return page ?? null;
}

export async function ensurePageByNumber(args: {
  pageNumber: string;
  title: string;
  domain: string;
  batch: string;
  context?: string | null;
}) {
  const [existing] = await db.select().from(pagesTable).where(eq(pagesTable.pageNumber, args.pageNumber));
  if (existing) return existing;

  const [created] = await db
    .insert(pagesTable)
    .values({
      pageNumber: args.pageNumber,
      title: args.title,
      domain: args.domain,
      batch: args.batch,
      status: "pending",
      groundingStatus: "verified",
      context: args.context ?? null,
    })
    .returning();

  return created;
}

export async function insertEditorialEvent(args: {
  actionType: string;
  pageId?: number | null;
  pageNumber?: string | null;
  pageTitle?: string | null;
  userId?: number | null;
  userName?: string | null;
  result: string;
  note?: string | null;
}) {
  await db.insert(activityLogsTable).values({
    actionType: args.actionType,
    pageId: args.pageId ?? null,
    pageNumber: args.pageNumber ?? null,
    pageTitle: args.pageTitle ?? null,
    userId: args.userId ?? null,
    userName: args.userName ?? "Sistema",
    result: args.result,
    note: args.note ?? null,
  });
}

export async function persistGenerationResult(args: {
  pageDbId: number;
  pageNumber: string;
  batch: string;
  title: string;
  userId: number | null;
  userName: string;
  imageGenerated: boolean;
  generationSource: "locked_seed" | "composer_draft";
  textModel: string;
  imageModel: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  outputPath: string;
  error: string | null;
  qa: {
    artDirection: number;
    editorialConsistency: number;
    readability: number;
    technicalAccuracy: number;
    total: number;
    observations: string[];
    redTeam: string[];
  };
}) {
  await db.insert(generationRunsTable).values({
    pageId: args.pageDbId,
    batch: args.batch,
    status: args.imageGenerated ? "completed_real_visual" : "completed_placeholder",
    model: [args.textModel, args.imageModel].filter(Boolean).join(" + "),
    promptTokens: args.promptTokens ?? null,
    completionTokens: args.completionTokens ?? null,
    output: args.outputPath,
    error: args.error ?? null,
    finishedAt: new Date(),
  });

  const qaPayload = {
    artDirection: args.qa.artDirection * 10,
    editorialConsistency: args.qa.editorialConsistency * 10,
    readability: args.qa.readability * 10,
    technicalAccuracy: args.qa.technicalAccuracy * 10,
    total: args.qa.total * 10,
    observations: args.qa.observations,
    redTeam: args.qa.redTeam,
    updatedAt: new Date(),
  };

  const [existingQa] = await db.select().from(qaRecordsTable).where(eq(qaRecordsTable.pageId, args.pageDbId));
  if (existingQa) {
    await db.update(qaRecordsTable).set(qaPayload).where(eq(qaRecordsTable.pageId, args.pageDbId));
  } else {
    await db.insert(qaRecordsTable).values({ pageId: args.pageDbId, ...qaPayload });
  }

  await db
    .update(pagesTable)
    .set({
      status: args.imageGenerated ? "qa_review" : "needs_revision",
      qaScore: args.qa.total * 10,
      updatedAt: new Date(),
    })
    .where(eq(pagesTable.id, args.pageDbId));

  await insertEditorialEvent({
    actionType: "generation_completed",
    pageId: args.pageDbId,
    pageNumber: args.pageNumber,
    pageTitle: args.title,
    userId: args.userId,
    userName: args.userName,
    result: args.imageGenerated
      ? `Generacion completada (${args.generationSource === "composer_draft" ? "fuente: Composer draft" : "fuente: Locked seed"}) con imagen real y QA servidor ${(args.qa.total * 10).toFixed(0)}/100`
      : `Generacion completada (${args.generationSource === "composer_draft" ? "fuente: Composer draft" : "fuente: Locked seed"}) con placeholder por falla de imagen; QA servidor ${(args.qa.total * 10).toFixed(0)}/100`,
    note: [
      args.error ? `error=${args.error}` : null,
      `qa_source=server`,
      `generation_source=${args.generationSource}`,
    ].filter(Boolean).join(" · "),
  });
}
