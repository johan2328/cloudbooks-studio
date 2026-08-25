import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile, withLock } from "../fs-safe.js";
import type { PanelRun } from "./route-panel.js";

/**
 * OBSERVABILIDAD del panel de QA por ruta: historial persistido de corridas por dominio (ruta).
 * Cada regeneración/evaluación AGREGA una corrida → queda la tendencia (score y veredictos escritos
 * entre generaciones), no solo la última. Keyed por cert+format (como el chapter-store) para que la
 * sombra (`master-book-ab`) y el libro vivo no se pisen. Espejo de `book-review-store` + `cert-poster-sync`.
 */
const HISTORY_CAP = 12;   // corridas guardadas por ruta

function storePath(): string { return path.join(CONFIG.outputRoot, `_route-panel.${CONFIG.certId}.${CONFIG.format}.json`); }
type Store = Record<string, PanelRun[]>;   // domainId → historial (más reciente PRIMERO)
function read(): Store { try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store; } catch { return {}; } }

/** Historial de una ruta (más reciente primero; vacío si nunca se evaluó). */
export function getRoutePanelHistory(domainId: string): PanelRun[] { return read()[domainId] ?? []; }
/** Todo el historial (para pintar el panel de todas las rutas de una). */
export function getAllRoutePanels(): Store { return read(); }

/** Agrega una corrida al historial de la ruta (asigna `generation` 1-based) y persiste. Devuelve la corrida guardada. */
export async function appendPanelRun(domainId: string, run: PanelRun): Promise<PanelRun> {
  return withLock("route-panel", async () => {
    const store = read();
    const prev = store[domainId] ?? [];
    const generation = (prev[0]?.generation ?? 0) + 1;
    const saved: PanelRun = { ...run, generation };
    store[domainId] = [saved, ...prev].slice(0, HISTORY_CAP);
    fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
    await atomicWriteFile(storePath(), JSON.stringify(store, null, 2), "route-panel");
    return saved;
  });
}
