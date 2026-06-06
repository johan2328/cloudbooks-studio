import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const layoutCheckRunsTable = pgTable("layout_check_runs", {
  id: serial("id").primaryKey(),
  certificationId: text("certification_id").notNull().default("ai-200"),
  pageId: text("page_id").notNull(),
  generationRunId: integer("generation_run_id"),
  contentCutId: text("content_cut_id"),
  attempt: integer("attempt").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(2),
  status: text("status").notNull().default("measured"),
  score: real("score").notNull().default(0),
  primaryAction: text("primary_action").notNull().default("human_review_required"),
  humanReviewRequired: integer("human_review_required").notNull().default(0),
  evidenceFingerprint: text("evidence_fingerprint"),
  measurement: jsonb("measurement"),
  layoutEngine: jsonb("layout_engine"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLayoutCheckRunSchema = createInsertSchema(layoutCheckRunsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLayoutCheckRun = z.infer<typeof insertLayoutCheckRunSchema>;
export type LayoutCheckRun = typeof layoutCheckRunsTable.$inferSelect;
