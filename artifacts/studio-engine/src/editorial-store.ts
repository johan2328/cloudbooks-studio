import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import type { EditorialQa, EditorialScores } from "./types.js";

/**
 * Último QA editorial por página (corrida 21). El veredicto premium lo consume:
 * si el editorial corrió y pide 'revise', el contenido no es production_ready.
 * Antes vivía solo como panel suelto; ahora alimenta el gate. File-store atomic.
 */
export interface EditorialRecord {
  overall: number | null;
  verdict: "approve" | "revise" | null;
  at: string;
  // Persistidos para el cockpit de QA (detalle sin re-correr). Opcionales: registros viejos no los tienen.
  scores?: EditorialScores | null;
  findings?: string[];
  summary?: string;
  model?: string | null;
}

// Store POR LIBRO (`_editorial.{cert}.{format}.json`); revert con ENGINE_PERCERT_STORES=off. Migración one-time del legacy Atlas AI-200.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_PATH = (): string => path.join(CONFIG.outputRoot, "_editorial.json");
function storePath(): string {
  return PERCERT_STORES ? path.join(CONFIG.outputRoot, `_editorial.${CONFIG.certId}.${CONFIG.format}.json`) : LEGACY_PATH();
}
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200" || CONFIG.format !== "visual-atlas") return;
  const p = storePath();
  if (fs.existsSync(p) || !fs.existsSync(LEGACY_PATH())) return;
  try { fs.copyFileSync(LEGACY_PATH(), p); } catch { /* best-effort */ }
}
function readAll(): Record<string, EditorialRecord> {
  ensureMigrated();
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, EditorialRecord>; } catch { return {}; }
}
function writeAll(all: Record<string, EditorialRecord>): void {
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "editorial-store");
}

/** Guarda el resultado del QA editorial de una página (solo si realmente corrió). */
export function saveEditorial(pageId: string, qa: EditorialQa): void {
  if (qa.outcome !== "real") return;
  const all = readAll();
  all[pageId] = { overall: qa.overall, verdict: qa.verdict, at: new Date().toISOString(), scores: qa.scores, findings: qa.findings, summary: qa.summary, model: qa.model };
  writeAll(all);
}

export function getEditorial(pageId: string): EditorialRecord | null {
  return readAll()[pageId] ?? null;
}

/** Borra el registro editorial de una página (al eliminar la página). */
export function clearEditorial(pageId: string): void {
  const all = readAll();
  if (pageId in all) { delete all[pageId]; writeAll(all); }
}

/** Mueve el registro editorial de oldId → newId (renumeración por unidad). */
export function rekeyEditorial(oldId: string, newId: string): void {
  const all = readAll();
  const rec = all[oldId];
  if (!rec) return;
  delete all[oldId];
  all[newId] = rec;
  writeAll(all);
}
