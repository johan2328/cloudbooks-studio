import { pgTable, text, serial, timestamp, real, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const qaRecordsTable = pgTable("qa_records", {
  id: serial("id").primaryKey(),
  pageId: integer("page_id").notNull().unique(),
  artDirection: real("art_direction").notNull().default(0),
  editorialConsistency: real("editorial_consistency").notNull().default(0),
  readability: real("readability").notNull().default(0),
  technicalAccuracy: real("technical_accuracy").notNull().default(0),
  total: real("total").notNull().default(0),
  observations: json("observations").$type<string[]>().notNull().default([]),
  redTeam: json("red_team").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQARecordSchema = createInsertSchema(qaRecordsTable).omit({ id: true, updatedAt: true });
export type InsertQARecord = z.infer<typeof insertQARecordSchema>;
export type QARecord = typeof qaRecordsTable.$inferSelect;
