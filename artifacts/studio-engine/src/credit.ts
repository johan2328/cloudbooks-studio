import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import { ledgerEntries } from "./cost.js";
import { listCreditEvents, totalIncomeUsd } from "./credit-events.js";

/**
 * Homologación del crédito real de OpenAI. Un saldo ANCLADO en un instante + el gasto acumulado
 * del ledger DESDE ese ancla → crédito restante. El crédito de OpenAI es UNO solo (global a todos
 * los libros), así que esto NO se scopea por formato: cuenta todo el gasto del estudio.
 */
export interface CreditAnchor { balanceUsd: number; anchoredAt: string; }
export interface CreditStatus { balanceUsd: number; anchoredAt: string; spentSinceUsd: number; remainingUsd: number; }

const DEFAULT_BALANCE = 16.01;

function anchorPath(): string {
  return path.join(CONFIG.outputRoot, "_credit-anchor.json");
}

/** Lee el ancla persistida; si no existe la crea con el saldo default anclado AHORA (el "hoy" del usuario). */
function readAnchor(): CreditAnchor {
  try {
    const a = JSON.parse(fs.readFileSync(anchorPath(), "utf8")) as Partial<CreditAnchor>;
    if (typeof a.balanceUsd === "number" && typeof a.anchoredAt === "string") return { balanceUsd: a.balanceUsd, anchoredAt: a.anchoredAt };
  } catch { /* no existe → crear con el default */ }
  const fresh: CreditAnchor = { balanceUsd: DEFAULT_BALANCE, anchoredAt: new Date().toISOString() };
  try { atomicWriteFileSync(anchorPath(), JSON.stringify(fresh, null, 2), "credit-anchor"); } catch { /* noop */ }
  return fresh;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function creditStatus(): CreditStatus {
  // Fuente de verdad NUEVA: ledger de ingresos. remaining = Σ ingresos − Σ gasto (lifetime). Preserva la historia
  // (el gasto acumulado queda visible en spentSinceUsd). Si aún no hay ingresos registrados, cae al ancla legacy.
  const events = listCreditEvents();
  if (events.length > 0) {
    const income = totalIncomeUsd();
    const spent = ledgerEntries().reduce((s, e) => s + e.estCostUsd, 0);   // lifetime
    return {
      balanceUsd: round2(income),
      anchoredAt: events[0]!.ts,
      spentSinceUsd: round2(spent),
      remainingUsd: round2(income - spent),
    };
  }
  const anchor = readAnchor();
  const spent = ledgerEntries().filter((e) => e.ts >= anchor.anchoredAt).reduce((s, e) => s + e.estCostUsd, 0);
  return {
    balanceUsd: round2(anchor.balanceUsd),
    anchoredAt: anchor.anchoredAt,
    spentSinceUsd: round2(spent),
    remainingUsd: round2(anchor.balanceUsd - spent),
  };
}

/** Re-ancla el saldo (p. ej. cuando el usuario recarga crédito). `anchoredAt` = ahora por defecto. */
export function setCreditAnchor(balanceUsd: number, anchoredAt?: string): CreditStatus {
  const anchor: CreditAnchor = { balanceUsd, anchoredAt: anchoredAt ?? new Date().toISOString() };
  atomicWriteFileSync(anchorPath(), JSON.stringify(anchor, null, 2), "credit-anchor");
  return creditStatus();
}
