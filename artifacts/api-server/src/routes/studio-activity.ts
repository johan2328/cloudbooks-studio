import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();
const COMPOSER_ACTION_NOTE_PREFIX = "composer_action_v1:";

function normalizeActivityLog(log: typeof activityLogsTable.$inferSelect) {
  if (log.actionType !== "composer_action" || !log.note?.startsWith(COMPOSER_ACTION_NOTE_PREFIX)) {
    return log;
  }
  try {
    const payload = JSON.parse(log.note.slice(COMPOSER_ACTION_NOTE_PREFIX.length)) as {
      kind?: string;
      action?: string;
      status?: string;
      delta?: number | null;
      changedBlocks?: number;
      note?: string;
    };
    const deltaText = typeof payload.delta === "number" && Number.isFinite(payload.delta)
      ? `${payload.delta >= 0 ? "+" : ""}${payload.delta.toFixed(1)}`
      : "--";
    const blockText = typeof payload.changedBlocks === "number" && Number.isFinite(payload.changedBlocks)
      ? String(payload.changedBlocks)
      : "0";
    return {
      ...log,
      result: `${payload.kind ?? "composer"}: ${payload.action ?? log.result} (${payload.status ?? "info"})`,
      note: `delta=${deltaText} · bloques=${blockText} · ${payload.note ?? "sin nota"}`,
    };
  } catch {
    return log;
  }
}

router.get("/studio/activity", async (req, res): Promise<void> => {
  const actionType = typeof req.query.actionType === "string" ? req.query.actionType : undefined;
  const pageNumber = typeof req.query.pageNumber === "string" ? req.query.pageNumber : undefined;

  let query = db.select().from(activityLogsTable).$dynamic();
  const conditions = [];

  if (actionType && actionType !== "all") {
    conditions.push(eq(activityLogsTable.actionType, actionType));
  }
  if (pageNumber) {
    conditions.push(eq(activityLogsTable.pageNumber, pageNumber));
  }

  if (conditions.length === 1) {
    query = query.where(conditions[0]);
  } else if (conditions.length > 1) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  const logsRaw = await query.orderBy(desc(activityLogsTable.createdAt)).limit(300);
  const logs = logsRaw.map(normalizeActivityLog);
  const ordered = [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const startByPage = new Map<string, Date>();
  const computed: Array<{ pageNumber: string; startedAt: string; approvedAt: string; minutes: number }> = [];

  for (const entry of ordered) {
    const pageNumber = entry.pageNumber ?? "";
    if (!pageNumber) continue;
    const createdAt = new Date(entry.createdAt);
    if (entry.actionType === "generation_started") {
      if (!startByPage.has(pageNumber)) {
        startByPage.set(pageNumber, createdAt);
      }
      continue;
    }
    if (entry.actionType === "page_approved") {
      const startedAt = startByPage.get(pageNumber);
      if (!startedAt) continue;
      const alreadyComputed = computed.some((item) => item.pageNumber === pageNumber);
      if (alreadyComputed) continue;
      const minutes = Math.max(0, Math.round(((createdAt.getTime() - startedAt.getTime()) / 60000) * 10) / 10);
      computed.push({
        pageNumber,
        startedAt: startedAt.toISOString(),
        approvedAt: createdAt.toISOString(),
        minutes,
      });
    }
  }

  const avgMinutes = computed.length > 0
    ? Math.round((computed.reduce((sum, item) => sum + item.minutes, 0) / computed.length) * 10) / 10
    : null;

  res.setHeader("Cache-Control", "no-store");
  res.json({
    logs,
    summary: {
      timeToApprovable: {
        samples: computed.length,
        avgMinutes,
        byPage: computed.sort((a, b) => a.pageNumber.localeCompare(b.pageNumber)),
      },
    },
  });
});

export default router;
