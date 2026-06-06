import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sourceSnapshotsTable = pgTable("source_snapshots", {
  id: serial("id").primaryKey(),
  certificationId: text("certification_id").notNull().default("ai-200"),
  pageId: text("page_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  sourceLastUpdated: text("source_last_updated"),
  etag: text("etag"),
  lastModified: text("last_modified"),
  contentHash: text("content_hash").notNull(),
  rawExtract: text("raw_extract").notNull(),
  normalizedExtract: text("normalized_extract").notNull(),
  snapshotVersion: integer("snapshot_version").notNull().default(1),
  status: text("status").notNull().default("candidate"),
  metadata: jsonb("metadata"),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSourceSnapshotSchema = createInsertSchema(sourceSnapshotsTable).omit({
  id: true,
  checkedAt: true,
  createdAt: true,
});
export type InsertSourceSnapshot = z.infer<typeof insertSourceSnapshotSchema>;
export type SourceSnapshot = typeof sourceSnapshotsTable.$inferSelect;
