import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const composerDraftsTable = pgTable("composer_drafts", {
  id: serial("id").primaryKey(),
  pageId: text("page_id").notNull().unique(),
  pageNumber: text("page_number").notNull(),
  family: text("family").notNull(),
  transitionLevel: text("transition_level").notNull(),
  draft: jsonb("draft").notNull(),
  note: text("note"),
  updatedById: integer("updated_by_id"),
  updatedByName: text("updated_by_name").notNull().default("Sistema"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertComposerDraftSchema = createInsertSchema(composerDraftsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertComposerDraft = z.infer<typeof insertComposerDraftSchema>;
export type ComposerDraft = typeof composerDraftsTable.$inferSelect;

