import { pgTable, text, serial, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pagesTable = pgTable("pages", {
  id: serial("id").primaryKey(),
  pageNumber: text("page_number").notNull().unique(),
  title: text("title").notNull(),
  domain: text("domain").notNull(),
  batch: text("batch").notNull(),
  status: text("status").notNull().default("pending"),
  qaScore: real("qa_score"),
  groundingStatus: text("grounding_status").notNull().default("unverified"),
  groundingUpdatedAt: timestamp("grounding_updated_at", { withTimezone: true }),
  context: text("context"),
  concepts: text("concepts"),
  examTraps: text("exam_traps"),
  autocheckQuestion: text("autocheck_question"),
  autocheckAnswer: text("autocheck_answer"),
  autocheckExplanation: text("autocheck_explanation"),
  sources: text("sources"),
  thumbnailUrl: text("thumbnail_url"),
  runCount: serial("run_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPageSchema = createInsertSchema(pagesTable).omit({ id: true, createdAt: true, updatedAt: true, runCount: true });
export type InsertPage = z.infer<typeof insertPageSchema>;
export type Page = typeof pagesTable.$inferSelect;
