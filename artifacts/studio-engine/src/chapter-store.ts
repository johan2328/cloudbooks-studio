import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import type { ChapterSeed, PageProvenance, RelevanceStatus } from "./types.js";

/**
 * STORE DE CAPÍTULOS del Master Book (formato documental) — hermano del page-store
 * del Atlas. Un capítulo = un módulo del temario, con su relato + procedencia.
 * Namespaceado por LIBRO ACTIVO (cert/format) → no colisiona con `_pages.json` del Atlas.
 * Reusa PageProvenance (pageId = chapterId; Claim.field admite "section").
 */
export interface ChapterRelevance {
  status: RelevanceStatus; score: number; coverageScore: number; contentScore: number;
  gaps: string[]; psychoAlignment?: number; psychoGaps?: string[];
}
export interface PersistedChapter {
  seed: ChapterSeed;
  provenance: PageProvenance;
  persistedAt: string;
  /** Resultado del supervisor (cobertura/contenido/alineación psicométrica), persistido para el QA sin re-LLM. */
  relevance?: ChapterRelevance;
}

function storePath(): string {
  return path.join(CONFIG.outputRoot, `_chapters.${CONFIG.certId}.${CONFIG.format}.json`);
}

function readAll(): Record<string, PersistedChapter> {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, PersistedChapter>; } catch { return {}; }
}

function writeAll(all: Record<string, PersistedChapter>): void {
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "chapter-store");
}

/** Capítulos persistidos, ordenados por chapterId. */
export function listPersistedChapters(): PersistedChapter[] {
  return Object.values(readAll()).sort((a, b) => a.seed.chapterId.localeCompare(b.seed.chapterId));
}

export function getPersistedChapter(chapterId: string): PersistedChapter | null {
  return readAll()[chapterId] ?? null;
}

export function upsertPersistedChapter(ch: PersistedChapter): void {
  const all = readAll();
  all[ch.seed.chapterId] = ch;
  writeAll(all);
}

export function removePersistedChapter(chapterId: string): boolean {
  const all = readAll();
  if (!(chapterId in all)) return false;
  delete all[chapterId];
  writeAll(all);
  return true;
}
