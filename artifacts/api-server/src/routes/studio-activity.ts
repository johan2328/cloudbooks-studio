import { Router } from "express";
import { db, activityLogsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

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

  const logs = await query.orderBy(desc(activityLogsTable.createdAt)).limit(300);
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
