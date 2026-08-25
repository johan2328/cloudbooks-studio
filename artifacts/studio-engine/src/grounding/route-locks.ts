import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * CANDADO POR RUTA. Una vez que una ruta quedó llena de contenido, el humano la
 * BLOQUEA para que no se re-groundee toda de nuevo por error (lo que recrearía/
 * pisaría sus páginas). El candado bloquea SOLO las operaciones masivas de la
 * ruta (groundear la ruta completa, ingerir la ruta completa); siguen permitidas
 * las acciones puntuales y seguras: borrar una página duplicada, re-correr o
 * rellenar UNA unidad floja, "Mejorar relevancia". File-store atomic.
 */
function storePath(): string {
  return path.join(CONFIG.outputRoot, "_route-locks.json");
}
function readAll(): Record<string, boolean> {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, boolean>; } catch { return {}; }
}
function writeAll(all: Record<string, boolean>): void {
  fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "route-locks");
}

export function isRouteLocked(domainId: string): boolean {
  return readAll()[domainId] === true;
}
export function listRouteLocks(): Record<string, boolean> {
  return readAll();
}
export function setRouteLock(domainId: string, locked: boolean): void {
  const all = readAll();
  if (locked) all[domainId] = true; else delete all[domainId];
  writeAll(all);
}
