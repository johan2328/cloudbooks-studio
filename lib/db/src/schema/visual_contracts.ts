import { pgTable, text, serial, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type ChangelogEntry = { version: string; note: string; at: string };

export const visualContractsTable = pgTable("visual_contracts", {
  id: serial("id").primaryKey(),
  version: text("version").notNull(),
  nonNegotiable: json("non_negotiable").$type<string[]>().notNull().default([]),
  flexibleStorytelling: json("flexible_storytelling").$type<string[]>().notNull().default([]),
  stableComponents: json("stable_components").$type<string[]>().notNull().default([]),
  changelog: json("changelog").$type<ChangelogEntry[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertVisualContractSchema = createInsertSchema(visualContractsTable).omit({ id: true, updatedAt: true });
export type InsertVisualContract = z.infer<typeof insertVisualContractSchema>;
export type VisualContract = typeof visualContractsTable.$inferSelect;
