import { pgTable, text, serial, timestamp, integer, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const groundingCardsTable = pgTable("grounding_cards", {
  id: serial("id").primaryKey(),
  certificationId: text("certification_id").notNull().default("ai-200"),
  pageId: text("page_id").notNull(),
  sourceSnapshotId: integer("source_snapshot_id").notNull(),
  contentCutId: text("content_cut_id"),
  cardId: text("card_id").notNull(),
  role: text("role").notNull(),
  targetZone: text("target_zone").notNull(),
  title: text("title").notNull(),
  claim: text("claim").notNull(),
  explanation: text("explanation").notNull(),
  diagramIntent: text("diagram_intent").notNull(),
  examSignal: text("exam_signal").notNull(),
  formatAffinity: jsonb("format_affinity").notNull(),
  densityScore: real("density_score").notNull().default(8),
  visualRisk: text("visual_risk").notNull().default("medium"),
  status: text("status").notNull().default("selected"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGroundingCardSchema = createInsertSchema(groundingCardsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertGroundingCard = z.infer<typeof insertGroundingCardSchema>;
export type GroundingCard = typeof groundingCardsTable.$inferSelect;
