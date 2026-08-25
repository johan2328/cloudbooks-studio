import { readFileSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFile } from "./fs-safe.js";

/**
 * APROBACIONES con granularidad PÁGINA/CAPÍTULO y LIBRO. La aprobación humana es el gate
 * final: una página/capítulo aprobado = firmado; el LIBRO aprobado = todo firmado (lo que
 * consume Ensamblar). El flag de LIBRO está namespaceado por FORMATO (`books[format]`) → aprobar
 * el Master NO voltea el Atlas. Los ids de página (Atlas 01..NN) y capítulo (cap-01..) no colisionan,
 * así que `pages` es global. Compat FE: se expone `book` = el libro del formato ACTIVO.
 */
type BookFlag = { approved: boolean; at: string | null };
export interface ApprovalState {
  pages: Record<string, { approved: boolean; at: string }>;
  book: BookFlag;                       // libro del FORMATO ACTIVO (derivado, compat FE)
  books: Record<string, BookFlag>;      // por formato (fuente de verdad)
}

// Store POR LIBRO (`_approvals.{cert}.{format}.json`); revert con ENGINE_PERCERT_STORES=off. Migración one-time del legacy Atlas AI-200.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_FILE = (): string => path.join(CONFIG.outputRoot, "_approvals.json");
const FILE = (): string => PERCERT_STORES ? path.join(CONFIG.outputRoot, `_approvals.${CONFIG.certId}.${CONFIG.format}.json`) : LEGACY_FILE();
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200" || CONFIG.format !== "visual-atlas") return;
  const p = FILE();
  if (existsSync(p) || !existsSync(LEGACY_FILE())) return;
  try { copyFileSync(LEGACY_FILE(), p); } catch { /* best-effort */ }
}
const EMPTY_BOOK: BookFlag = { approved: false, at: null };

interface StoredState { pages: Record<string, { approved: boolean; at: string }>; books: Record<string, BookFlag>; }

function load(): StoredState {
  ensureMigrated();
  try {
    if (existsSync(FILE())) {
      const s = JSON.parse(readFileSync(FILE(), "utf8")) as Partial<StoredState> & { book?: BookFlag };
      const books: Record<string, BookFlag> = s.books ?? {};
      // Migración: el legacy `book` (global, histórico del Atlas) → books["visual-atlas"].
      if (!s.books && s.book) books["visual-atlas"] = s.book;
      return { pages: s.pages ?? {}, books };
    }
  } catch { /* corrupto → estado vacío */ }
  return { pages: {}, books: {} };
}

async function save(s: StoredState): Promise<void> {
  await atomicWriteFile(FILE(), JSON.stringify(s, null, 2), "approvals");
}

const activeBook = (books: Record<string, BookFlag>): BookFlag => books[CONFIG.format] ?? { ...EMPTY_BOOK };
const withBook = (s: StoredState): ApprovalState => ({ pages: s.pages, book: activeBook(s.books), books: s.books });

export function getApprovals(): ApprovalState {
  return withBook(load());
}

export async function setPageApproved(pageId: string, approved: boolean): Promise<ApprovalState> {
  const s = load();
  if (approved) s.pages[pageId] = { approved: true, at: new Date().toISOString() };
  else delete s.pages[pageId];
  // Si se desaprueba una página/capítulo, el LIBRO de ESE formato deja de estar aprobado (consistencia).
  if (!approved && s.books[CONFIG.format]?.approved) s.books[CONFIG.format] = { ...EMPTY_BOOK };
  await save(s);
  return withBook(s);
}

/** Aprueba/revoca en lote (ej. "aprobar visibles" o "aprobar libro"). */
export async function setPagesApproved(pageIds: string[], approved: boolean): Promise<ApprovalState> {
  const s = load();
  const at = new Date().toISOString();
  for (const id of pageIds) {
    if (approved) s.pages[id] = { approved: true, at };
    else delete s.pages[id];
  }
  if (!approved && s.books[CONFIG.format]?.approved) s.books[CONFIG.format] = { ...EMPTY_BOOK };
  await save(s);
  return withBook(s);
}

/** Mueve la aprobación de una página de oldId → newId (renumeración por unidad). */
export async function rekeyApproval(oldId: string, newId: string): Promise<void> {
  const s = load();
  const a = s.pages[oldId];
  if (!a) return;
  delete s.pages[oldId];
  s.pages[newId] = a;
  await save(s);
}

export async function setBookApproved(approved: boolean): Promise<ApprovalState> {
  const s = load();
  s.books[CONFIG.format] = { approved, at: approved ? new Date().toISOString() : null };
  await save(s);
  return withBook(s);
}
