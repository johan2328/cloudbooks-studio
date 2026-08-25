import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * CRONOMETRAJE de la corrida del Master timeline, por libro (Plan D · pedido del usuario).
 * Dos métricas durables:
 *  - `autoMs`: tiempo ACTIVO de generación automática (suma de cada tramo que la corrida
 *    realmente ejecutó, SIN contar la espera en los gates humanos). = "cuánto tarda el libro
 *    de forma automática sin aprobaciones humanas".
 *  - `startedAt → finishedAt`: reloj de pared, incluye las esperas humanas (aprobar/bloquear/
 *    publicar). = "cuánto tarda CON aprobaciones humanas".
 * El motor de corrida (frontend) reporta cada tramo; se persiste en `_corrida-timing.json`.
 */
export interface CorridaTiming { certId: string; format: string; startedAt: string | null; autoMs: number; finishedAt: string | null }
interface Entry { startedAt: string | null; autoMs: number; finishedAt: string | null }
type Store = Record<string, Entry>;

function storePath(): string { return path.join(CONFIG.outputRoot, "_corrida-timing.json"); }
function bookKey(): string { return `${CONFIG.certId}.${CONFIG.format}`; }
function read(): Store { try { const s = JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store; return s && typeof s === "object" ? s : {}; } catch { return {}; } }
function write(s: Store): void { atomicWriteFileSync(storePath(), JSON.stringify(s, null, 2), "corrida-timing"); }

export function getCorridaTiming(): CorridaTiming {
  const e = read()[bookKey()] ?? { startedAt: null, autoMs: 0, finishedAt: null };
  return { certId: CONFIG.certId, format: CONFIG.format, startedAt: e.startedAt, autoMs: e.autoMs, finishedAt: e.finishedAt };
}

/** Patch del cronometraje del libro activo. `reset` limpia todo (nueva medición). */
export function updateCorridaTiming(patch: { startIfUnset?: boolean; addMs?: number; finish?: boolean; reset?: boolean }): CorridaTiming {
  const s = read();
  const k = bookKey();
  let e: Entry = s[k] ?? { startedAt: null, autoMs: 0, finishedAt: null };
  if (patch.reset) e = { startedAt: null, autoMs: 0, finishedAt: null };
  if (patch.startIfUnset && !e.startedAt) { e.startedAt = new Date().toISOString(); e.finishedAt = null; }
  if (typeof patch.addMs === "number" && patch.addMs > 0) e.autoMs += Math.round(patch.addMs);
  if (patch.finish) e.finishedAt = new Date().toISOString();
  s[k] = e;
  write(s);
  return { certId: CONFIG.certId, format: CONFIG.format, startedAt: e.startedAt, autoMs: e.autoMs, finishedAt: e.finishedAt };
}
