import fs from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";

/**
 * Aprobaciones humanas (revisión de dirección de arte ≥ 9.5). El veredicto
 * premium no puede llegar a 'production_ready' sin esta confirmación humana:
 * la máquina no certifica arte por sí sola. File-store ahora; Postgres en la 17.
 */
interface ArtApproval { artApproved: boolean; at: string }

/**
 * Piso de visión para PERMITIR la aprobación humana de arte. Por debajo, la
 * imagen tiene defectos objetivos (ilegible, saturada/glossy, incoherente): el
 * humano no puede certificarla — primero hay que regenerarla. Es más alto que
 * el piso DURO que bloquea (5): el humano aprueba arte decente-o-mejor, no apenas-no-basura.
 */
export const APPROVAL_VISION_FLOOR = 6;

// Store POR LIBRO (`_approvals.{cert}.{format}.json`); revert con ENGINE_PERCERT_STORES=off. Migración one-time del legacy Atlas AI-200.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_PATH = (): string => path.join(CONFIG.outputRoot, "_approvals.json");
function storePath(): string {
  return PERCERT_STORES ? path.join(CONFIG.outputRoot, `_approvals.${CONFIG.certId}.${CONFIG.format}.json`) : LEGACY_PATH();
}
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200" || CONFIG.format !== "visual-atlas") return;
  const p = storePath();
  if (fs.existsSync(p) || !fs.existsSync(LEGACY_PATH())) return;
  try { fs.copyFileSync(LEGACY_PATH(), p); } catch { /* best-effort */ }
}
function readAll(): Record<string, ArtApproval> {
  ensureMigrated();
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, ArtApproval>; } catch { return {}; }
}
function writeAll(all: Record<string, ArtApproval>): void {
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "approvals");
}

export function isArtApproved(pageId: string): boolean {
  return readAll()[pageId]?.artApproved ?? false;
}

/** Borra la aprobación de una página (al eliminarla) y su marcador en disco. */
export function clearApproval(pageId: string): void {
  const all = readAll();
  if (pageId in all) { delete all[pageId]; writeAll(all); }
  try { fs.rmSync(path.join(pageOutputDir(pageId), "approval.json"), { force: true }); } catch { /* sin carpeta */ }
}
export function setArtApproved(pageId: string, approved: boolean): void {
  const at = new Date().toISOString();
  const all = readAll();
  all[pageId] = { artApproved: approved, at };
  writeAll(all);
  // Unifica las dos nociones de "aprobado" (corrida 21): el marcador que lee el
  // dashboard (approval.json en la carpeta de la página) sigue al estado de arte.
  syncApprovalMarker(pageId, approved, at);
}

/** Escribe (o borra) approval.json en la carpeta de la página → KPI 'Aprobadas' real. */
function syncApprovalMarker(pageId: string, approved: boolean, at: string): void {
  const marker = path.join(pageOutputDir(pageId), "approval.json");
  try {
    if (approved) {
      fs.mkdirSync(pageOutputDir(pageId), { recursive: true });
      atomicWriteFileSync(marker, JSON.stringify({ approvedAt: at }, null, 2), "approval-marker");
    } else {
      fs.rmSync(marker, { force: true });
    }
  } catch { /* sin carpeta de output todavía: no bloquea la aprobación */ }
}
