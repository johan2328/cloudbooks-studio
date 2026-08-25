import { hasOpenAIKey } from "./openai-client.js";
import { runCertPosterSync, lastSyncLog } from "./cert-poster-sync.js";

/**
 * SCHEDULER MENSUAL del sync del póster. Sin dependencias (node-cron no hace falta):
 * un intervalo diario chequea si CAMBIÓ EL MES respecto de la última corrida OK.
 * Si cambió (o nunca corrió), dispara el sync. Auto-agrega altas, nunca deprecia (ver cert-poster-sync).
 *
 * Es best-effort: cualquier error se traga (no debe tumbar el motor). El botón manual
 * (POST /engine/certifications/sync) sigue disponible para forzarlo.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 20_000;   // no bloquear el arranque; esperar a que todo levante

function monthKey(iso: string): string { return iso.slice(0, 7); } // "2026-08"

/** ¿Toca correr? Nunca corrió con éxito, o estamos en un mes distinto al de la última corrida OK. */
function isDue(): boolean {
  const last = lastSyncLog();
  if (!last || !last.ok) return true;
  return monthKey(last.ranAt) !== monthKey(new Date().toISOString());
}

async function tick(trigger: "scheduler"): Promise<void> {
  if (!hasOpenAIKey()) return;         // sin llave no hay visión; el manual avisará
  if (!isDue()) return;
  try {
    const log = await runCertPosterSync({ trigger });
    // eslint-disable-next-line no-console
    console.log(`[cert-sync] corrida ${log.ok ? "OK" : "con error"}: +${log.added.length} altas · ${log.reviewMissing.length} a revisar${log.error ? ` · ${log.error}` : ""}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(`[cert-sync] falló: ${String((err as Error)?.message ?? err)}`);
  }
}

let started = false;
export function startCertSyncScheduler(): void {
  if (started) return;
  started = true;
  // chequeo al arranque (diferido) + cada día
  const t0 = setTimeout(() => { void tick("scheduler"); }, STARTUP_DELAY_MS);
  const t1 = setInterval(() => { void tick("scheduler"); }, DAY_MS);
  if (typeof t0.unref === "function") t0.unref();
  if (typeof t1.unref === "function") t1.unref();
}
