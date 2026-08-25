import fs from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import { clearApproval } from "./approvals.js";
import { clearEditorial } from "./editorial-store.js";
import type { PageProvenance, PageSeed } from "./types.js";

/**
 * STORE DE PÁGINAS PERSISTIDAS (corrida 21 — integración). Cierra el abismo:
 * un borrador redactado + verificado (grounding) se persiste acá como página
 * REAL, generable como cualquier seed. Rompe el techo de 3 páginas hardcodeadas.
 * File-store ahora (atomic); Postgres en la 17. Guarda seed + procedencia juntos.
 */
export interface PersistedPage {
  seed: PageSeed;
  provenance: PageProvenance;
  persistedAt: string;
}

// Store POR LIBRO (`_pages.{cert}.{format}.json`); revert con ENGINE_PERCERT_STORES=off. Migración one-time del legacy Atlas AI-200.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_PATH = (): string => path.join(CONFIG.outputRoot, "_pages.json");
function storePath(): string {
  return PERCERT_STORES ? path.join(CONFIG.outputRoot, `_pages.${CONFIG.certId}.${CONFIG.format}.json`) : LEGACY_PATH();
}
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200" || CONFIG.format !== "visual-atlas") return;
  const p = storePath();
  if (fs.existsSync(p) || !fs.existsSync(LEGACY_PATH())) return;
  try { fs.copyFileSync(LEGACY_PATH(), p); } catch { /* best-effort */ }
}

function readAll(): Record<string, PersistedPage> {
  ensureMigrated();
  try {
    return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, PersistedPage>;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, PersistedPage>): void {
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "page-store");
}

/** Páginas persistidas, ordenadas por pageId. */
export function listPersistedPages(): PersistedPage[] {
  return Object.values(readAll()).sort((a, b) => a.seed.pageId.localeCompare(b.seed.pageId));
}

export function getPersistedPage(pageId: string): PersistedPage | null {
  return readAll()[pageId] ?? null;
}

/** Procedencia (grounding) de una página persistida, o null si es seed estática. */
export function getProvenance(pageId: string): PageProvenance | null {
  return readAll()[pageId]?.provenance ?? null;
}

export function upsertPersistedPage(page: PersistedPage): void {
  const all = readAll();
  all[page.seed.pageId] = page;
  writeAll(all);
}

export function removePersistedPage(pageId: string): boolean {
  const all = readAll();
  if (!(pageId in all)) return false;
  delete all[pageId];
  writeAll(all);
  return true;
}

/**
 * Borra una página persistida POR COMPLETO: del store + su aprobación + su QA
 * editorial + su carpeta de outputs (html/imágenes). Deja todo limpio para que
 * un id reusado no herede estado viejo. Devuelve false si la página no existía.
 */
export function deletePersistedPage(pageId: string): boolean {
  const removed = removePersistedPage(pageId);
  if (!removed) return false;
  clearApproval(pageId);
  clearEditorial(pageId);
  try { fs.rmSync(pageOutputDir(pageId), { recursive: true, force: true }); } catch { /* sin carpeta */ }
  return true;
}

/**
 * Re-keya una página persistida a un nuevo id (numeración por unidad). Actualiza
 * el id del store + `seed.pageId`/`pageNumber` + `provenance.pageId`. No mueve el
 * output ni otros stores: eso lo orquesta `page-renumber.relocatePage`.
 */
export function rekeyPersistedPage(oldId: string, newId: string): boolean {
  if (oldId === newId) return false;
  const all = readAll();
  const p = all[oldId];
  if (!p) return false;
  delete all[oldId];
  p.seed.pageId = newId;
  p.seed.pageNumber = newId;
  p.provenance.pageId = newId;
  all[newId] = p;
  writeAll(all);
  return true;
}
