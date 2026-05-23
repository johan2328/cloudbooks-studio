import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generationRunsTable = pgTable("generation_runs", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull(),
  batch: text("batch"),
  status: text("status").notNull().default("queued"),
  model: text("model"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  output: text("output"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const insertGenerationRunSchema = createInsertSchema(generationRunsTable).omit({ id: true, startedAt: true });
export type InsertGenerationRun = z.infer<typeof insertGenerationRunSchema>;
export type GenerationRun = typeof generationRunsTable.$inferSelect;
