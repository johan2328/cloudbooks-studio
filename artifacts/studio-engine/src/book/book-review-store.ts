import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import type { BookIssue, BookReview } from "./editor-jefe.js";

/**
 * Persiste la última revisión del editor-jefe (#6) por página, para que el
 * veredicto premium la consuma: una página con inconsistencias de libro no
 * llega a production_ready hasta resolverlas. Así el #6 deja de ser un voyeur
 * (reporta) y pasa a GATEAR (anticipa: el humano solo aprueba lo consistente).
 */
interface StoredReview {
  issuesByPage: Record<string, BookIssue[]>;
  pages: string[];
  at: string;
}

function storePath(): string {
  return path.join(CONFIG.outputRoot, "_book-review.json");
}
function read(): StoredReview | null {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as StoredReview; } catch { return null; }
}

/** Guarda la revisión: agrupa los issues por página. */
export function saveBookReview(review: BookReview): void {
  if (review.outcome !== "real") return;
  const issuesByPage: Record<string, BookIssue[]> = {};
  for (const id of review.pages) issuesByPage[id] = [];
  for (const it of review.issues) {
    if (!issuesByPage[it.pageId]) issuesByPage[it.pageId] = [];
    issuesByPage[it.pageId]!.push(it);
  }
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify({ issuesByPage, pages: review.pages, at: new Date().toISOString() }, null, 2), "book-review");
}

/** Issues de libro de una página (vacío si no fue revisada o está consistente). */
export function getBookIssues(pageId: string): BookIssue[] {
  return read()?.issuesByPage[pageId] ?? [];
}

/** Quita los issues de una página (p.ej. tras corregir/aprobar manualmente). */
export function clearBookIssues(pageId: string): void {
  const s = read();
  if (!s || !(pageId in s.issuesByPage)) return;
  s.issuesByPage[pageId] = [];
  atomicWriteFileSync(storePath(), JSON.stringify(s, null, 2), "book-review");
}

/** Mueve los issues de libro de oldId → newId (renumeración por unidad). */
export function rekeyBookIssues(oldId: string, newId: string): void {
  const s = read();
  if (!s) return;
  const idx = s.pages.indexOf(oldId);
  if (idx >= 0) s.pages[idx] = newId;
  if (oldId in s.issuesByPage) {
    s.issuesByPage[newId] = s.issuesByPage[oldId]!;
    delete s.issuesByPage[oldId];
  }
  atomicWriteFileSync(storePath(), JSON.stringify(s, null, 2), "book-review");
}
