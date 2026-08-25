import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";

/**
 * LEDGER DE INGRESOS DE SALDO (recargas de crédito OpenAI). Append-only, GLOBAL (el crédito es uno solo, no por libro).
 * Fuente de verdad del "restante": Σ ingresos − Σ gasto (el ledger de costo). Cada recarga = un evento {ts, amountUsd, note}.
 * El primer evento (bootstrap) suele codificar "saldo disponible + consumo previo" para no perder la historia del ledger.
 */
export interface CreditEvent { ts: string; amountUsd: number; note: string; }

const round2 = (n: number): number => Math.round(n * 100) / 100;

function eventsPath(): string {
  return path.join(CONFIG.outputRoot, "_credit-events.json");
}

/** Todos los ingresos registrados (recargas), en orden de inserción. */
export function listCreditEvents(): CreditEvent[] {
  try {
    const a = JSON.parse(fs.readFileSync(eventsPath(), "utf8")) as CreditEvent[];
    return Array.isArray(a) ? a.filter((e) => e && typeof e.amountUsd === "number" && typeof e.ts === "string") : [];
  } catch { return []; }
}

/** Total ingresado = suma de todas las recargas. */
export function totalIncomeUsd(): number {
  return round2(listCreditEvents().reduce((s, e) => s + e.amountUsd, 0));
}

/** Registra una recarga de saldo (append). Devuelve el evento creado. */
export function addCreditEvent(amountUsd: number, note = ""): CreditEvent {
  const ev: CreditEvent = { ts: new Date().toISOString(), amountUsd: round2(amountUsd), note: String(note ?? "").slice(0, 240) };
  const all = listCreditEvents();
  all.push(ev);
  atomicWriteFileSync(eventsPath(), JSON.stringify(all, null, 2), "credit-events");
  return ev;
}
