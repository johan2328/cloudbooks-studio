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

  const logs = await query.orderBy(desc(activityLogsTable.createdAt)).limit(200);
  res.json({ logs });
});

export default router;
