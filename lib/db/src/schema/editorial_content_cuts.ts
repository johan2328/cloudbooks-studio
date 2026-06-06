import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const editorialContentCutsTable = pgTable("editorial_content_cuts", {
  id: serial("id").primaryKey(),
  certificationId: text("certification_id").notNull().default("ai-200"),
  pageId: text("page_id").notNull(),
  contentCutId: text("content_cut_id").notNull().unique(),
  snapshotIds: jsonb("snapshot_ids").notNull(),
  sourceStatus: text("source_status").notNull().default("locked"),
  deckHash: text("deck_hash").notNull(),
  promptHash: text("prompt_hash"),
  model: text("model").notNull(),
  quality: text("quality").notNull(),
  templateVersion: text("template_version").notNull(),
  status: text("status").notNull().default("locked"),
  createdById: integer("created_by_id"),
  createdByName: text("created_by_name").notNull().default("Sistema"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

export const insertEditorialContentCutSchema = createInsertSchema(editorialContentCutsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEditorialContentCut = z.infer<typeof insertEditorialContentCutSchema>;
export type EditorialContentCut = typeof editorialContentCutsTable.$inferSelect;
