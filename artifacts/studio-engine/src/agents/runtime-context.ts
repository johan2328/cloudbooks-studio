import { AsyncLocalStorage } from "node:async_hooks";

/**
 * CONTEXTO DE CORRIDA ambiente (concurrency-safe vía AsyncLocalStorage). Lo setea el orquestador
 * (groundModule / route-panel / runBook) y lo leen los wraps de `timeAgent` para etiquetar cada
 * run con dónde ocurrió (generación por módulo, panel por ruta, o corrida completa del Master timeline).
 * Se usa ALS y NO un global de módulo porque las rutas del libro sombra A/B pueden correr concurrentes.
 */
export type RunContext = "master-timeline" | "module" | "route";
export interface RunCtx { runContext: RunContext; moduleId?: string; routeId?: string }

const als = new AsyncLocalStorage<RunCtx>();

/** Ejecuta `fn` con el contexto de corrida ambiente. Todo lo que corra dentro (incl. awaits) lo hereda. */
export function withRunContext<T>(ctx: RunCtx, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Contexto de corrida actual (o undefined si se ejecuta fuera de una corrida instrumentada). */
export function currentRunContext(): RunCtx | undefined {
  return als.getStore();
}
