import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * BLOQUEO DE DISEÑOS por libro (Auto Pages · E2). Persiste qué piezas de diseño
 * (portada/contra/abre-partes/divisores) fueron APROBADAS y si el libro está BLOQUEADO.
 * Archivo propio `_design-locks.json` (NO reusar `_approvals.json`, que tiene colisión de
 * shapes). El GATE del armado que consume este lock lo cablea el Master timeline (Plan D).
 * Almacén keyed por `${certId}.${format}` — un lock por libro.
 */
export interface DesignLock { certId: string; format: string; locked: boolean; lockedAt: string | null; pieces: string[] }
interface LockEntry { locked: boolean; lockedAt: string | null; pieces: string[] }
type Store = Record<string, LockEntry>;

function storePath(): string { return path.join(CONFIG.outputRoot, "_design-locks.json"); }
function read(): Store { try { const s = JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store; return s && typeof s === "object" ? s : {}; } catch { return {}; } }
function write(s: Store): void { atomicWriteFileSync(storePath(), JSON.stringify(s, null, 2), "design-locks"); }
function bookKey(): string { return `${CONFIG.certId}.${CONFIG.format}`; }

/** Lock del libro ACTIVO. */
export function getDesignLock(): DesignLock {
  const e = read()[bookKey()] ?? { locked: false, lockedAt: null, pieces: [] };
  return { certId: CONFIG.certId, format: CONFIG.format, locked: e.locked, lockedAt: e.lockedAt, pieces: e.pieces };
}

/** Actualiza aprobaciones (pieces) y/o el estado de bloqueo del libro activo. */
export function updateDesignLock(patch: { pieces?: string[]; locked?: boolean }): DesignLock {
  const s = read();
  const k = bookKey();
  const cur: LockEntry = s[k] ?? { locked: false, lockedAt: null, pieces: [] };
  if (Array.isArray(patch.pieces)) cur.pieces = [...new Set(patch.pieces.map(String))];
  if (typeof patch.locked === "boolean") { cur.locked = patch.locked; cur.lockedAt = patch.locked ? new Date().toISOString() : null; }
  s[k] = cur;
  write(s);
  return { certId: CONFIG.certId, format: CONFIG.format, locked: cur.locked, lockedAt: cur.lockedAt, pieces: cur.pieces };
}
