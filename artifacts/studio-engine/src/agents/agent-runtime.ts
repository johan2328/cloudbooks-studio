import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync, withLock } from "../fs-safe.js";
import { currentRunContext, type RunContext } from "./runtime-context.js";

/**
 * STORE de RUNTIME por-agente (append-only, `_agent-runtime.json`). Cada span cronometrado por
 * `timeAgent` agrega un AgentRunRecord con su duración real. Es la fuente del dashboard de Runtime
 * de la Cuadrilla (agregado por día/semana/mes/Q en agent-runtime-rollup).
 *
 * Es INDEPENDIENTE del ledger de costo (ese guarda un `ts` por llamada, SIN duración) → no lo toca
 * ni rompe ningún rollup existente. Serializa read-append-write con `withLock` (hay rutas concurrentes:
 * libro sombra A/B) + escritura ATÓMICA, y capa el array a los últimos N (acota tamaño y agregación).
 * Grabar NUNCA debe bloquear ni romper la generación → `recordAgentRun` es fire-and-forget.
 */
export interface AgentRunRecord {
  ts: string;               // fin del span (ISO); el inicio = ts − durationMs
  agentId: string;
  label: string;
  durationMs: number;
  runContext: RunContext;
  moduleId?: string;
  routeId?: string;
  model?: string;
  ok: boolean;
  certId: string;
  format: string;
}

const CAP = 10000;   // conservar los últimos N runs
function storePath(): string { return path.join(CONFIG.outputRoot, "_agent-runtime.json"); }

export function readAgentRuns(): AgentRunRecord[] {
  try {
    const arr = JSON.parse(fs.readFileSync(storePath(), "utf8")) as AgentRunRecord[];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export interface RecordArgs {
  agentId: string; label?: string; durationMs: number;
  runContext?: RunContext; moduleId?: string; routeId?: string; model?: string; ok?: boolean;
}

/** Agrega un run al store. Fire-and-forget: no bloquea el pipeline y atrapa cualquier error. */
export function recordAgentRun(a: RecordArgs): void {
  const ctx = currentRunContext();
  const rec: AgentRunRecord = {
    ts: new Date().toISOString(),
    agentId: a.agentId,
    label: a.label ?? a.agentId,
    durationMs: Math.max(0, Math.round(a.durationMs)),
    runContext: a.runContext ?? ctx?.runContext ?? "module",
    moduleId: a.moduleId ?? ctx?.moduleId,
    routeId: a.routeId ?? ctx?.routeId,
    model: a.model,
    ok: a.ok !== false,
    certId: CONFIG.certId,
    format: CONFIG.format,
  };
  void withLock("agent-runtime", () => {
    const all = readAgentRuns();
    all.push(rec);
    const trimmed = all.length > CAP ? all.slice(all.length - CAP) : all;
    atomicWriteFileSync(storePath(), JSON.stringify(trimmed), "agent-runtime");
  }).catch(() => { /* el runtime jamás debe romper la generación */ });
}

/** Cronometra `fn`, registra el span como un run del agente `agentId`, y devuelve lo que devuelva `fn`.
 *  Envolvé la llamada a la función-agente en la frontera de orquestación (no dentro del hot-path del ledger). */
export async function timeAgent<T>(
  agentId: string,
  label: string,
  fn: () => Promise<T>,
  opts?: { model?: string; moduleId?: string; routeId?: string; runContext?: RunContext },
): Promise<T> {
  const t0 = Date.now();
  let ok = true;
  try {
    return await fn();
  } catch (err) {
    ok = false;
    throw err;
  } finally {
    recordAgentRun({ agentId, label, durationMs: Date.now() - t0, ok, model: opts?.model, moduleId: opts?.moduleId, routeId: opts?.routeId, runContext: opts?.runContext });
  }
}
