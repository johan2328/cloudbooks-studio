import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import type { RelevanceResult, RelevanceStatus } from "../types.js";

/**
 * Último veredicto del SUPERVISOR DE RELEVANCIA, keyed por **skillId** (el
 * supervisor corre por skill, antes de que exista la página). El veredicto
 * premium —keyed por pageId— lo lee y lo une vía `provenance.skillIds`. Espejo
 * de editorial-store. File-store atomic; Postgres en la 17.
 */
export interface RelevanceRecord {
  status: RelevanceStatus;
  score: number;
  gaps: string[];
  at: string;
}

// Store POR CERT (`_relevance.{certId}.json`); revert con ENGINE_PERCERT_STORES=off. Migración one-time del legacy AI-200.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_PATH = (): string => path.join(CONFIG.outputRoot, "_relevance.json");
function storePath(): string {
  return PERCERT_STORES ? path.join(CONFIG.outputRoot, `_relevance.${CONFIG.certId}.json`) : LEGACY_PATH();
}
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200") return;
  const p = storePath();
  if (fs.existsSync(p) || !fs.existsSync(LEGACY_PATH())) return;
  try { fs.copyFileSync(LEGACY_PATH(), p); } catch { /* best-effort */ }
}
function readAll(): Record<string, RelevanceRecord> {
  ensureMigrated();
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, RelevanceRecord>; } catch { return {}; }
}
function writeAll(all: Record<string, RelevanceRecord>): void {
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "relevance-store");
}

/** Guarda el resultado del supervisor (solo si realmente corrió). */
export function saveRelevance(skillId: string, r: RelevanceResult): void {
  if (r.outcome !== "real") return;
  const all = readAll();
  all[skillId] = { status: r.relevanceStatus, score: r.score, gaps: r.gaps, at: new Date().toISOString() };
  writeAll(all);
}

export function getRelevanceBySkill(skillId: string): RelevanceRecord | null {
  return readAll()[skillId] ?? null;
}

/** Todo el store de una (para builds que recorren muchas skills: evita re-leer el archivo por skill). */
export function allRelevance(): Record<string, RelevanceRecord> {
  return readAll();
}

/** Relevancia de una página: primer skill con registro (las del pipeline son single-skill). */
export function getRelevanceForPage(skillIds: string[]): RelevanceRecord | null {
  const all = readAll();
  for (const id of skillIds) if (all[id]) return all[id]!;
  return null;
}

export function clearRelevance(skillId: string): void {
  const all = readAll();
  if (skillId in all) { delete all[skillId]; writeAll(all); }
}
