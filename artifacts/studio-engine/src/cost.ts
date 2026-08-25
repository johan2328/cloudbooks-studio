import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";

interface CostEntry {
  ts: string;
  kind: string;            // image | text | vision
  pageId: string;
  label: string;
  model: string;
  estCostUsd: number;
  certId?: string;         // libro/cert activo al momento del gasto (para atribuir por libro)
  format?: string;         // formato activo (visual-atlas | master-book | …)
}

/** Tarifas aprox. (USD por 1K tokens = $/M ÷ 1000). Solo para estimar el gasto de texto.
 *  Fuente: developers.openai.com/api/docs/pricing (Standard, short context). */
const TEXT_RATES: Record<string, { in: number; out: number }> = {
  // GPT-4o
  "gpt-4o": { in: 0.0025, out: 0.01 },
  "gpt-4o-mini": { in: 0.00015, out: 0.0006 },
  // GPT-4.1 (NO razonamiento → params estilo 4o: max_tokens + temperature)
  "gpt-4.1": { in: 0.002, out: 0.008 },
  "gpt-4.1-mini": { in: 0.0004, out: 0.0016 },
  "gpt-4.1-nano": { in: 0.0001, out: 0.0004 },
  // GPT-5 (razonamiento → params max_completion_tokens, sin temperature)
  "gpt-5": { in: 0.00125, out: 0.01 },
  "gpt-5-mini": { in: 0.00025, out: 0.002 },
  "gpt-5-nano": { in: 0.00005, out: 0.0004 },
  "gpt-5.1": { in: 0.00125, out: 0.01 },
  "gpt-5.2": { in: 0.00175, out: 0.014 },
  "gpt-5.2-pro": { in: 0.021, out: 0.168 },
  "gpt-5-pro": { in: 0.015, out: 0.12 },
  // GPT-5.4 / 5.5 (flagship)
  "gpt-5.4": { in: 0.0025, out: 0.015 },
  "gpt-5.4-mini": { in: 0.00075, out: 0.0045 },
  "gpt-5.4-nano": { in: 0.0002, out: 0.00125 },
  "gpt-5.5": { in: 0.005, out: 0.03 },
  // GPT-5.6 (Sol=insignia, Terra=equilibrado, Luna=rápido/económico) — precios openai.com/es-ES/business/pricing
  "gpt-5.6-sol": { in: 0.005, out: 0.03 },
  "gpt-5.6-terra": { in: 0.002, out: 0.012 },
  "gpt-5.6-luna": { in: 0.0002, out: 0.0012 },
  // o-series
  "o4-mini": { in: 0.0011, out: 0.0044 },
  // Kimi K3 (Moonshot, razonamiento) — ~US$3 / 1M tokens (dato del usuario, 15-ago). Los tokens de
  // pensamiento cuentan como salida. Ajustable si el split in/out real difiere.
  "kimi-k3": { in: 0.003, out: 0.003 },
  "kimi-k2.7-code": { in: 0.003, out: 0.003 },
};

export function estimateTextCost(model: string, promptTokens: number, completionTokens: number): number {
  const r = TEXT_RATES[model] ?? TEXT_RATES["gpt-4o-mini"]!;
  return (promptTokens * r.in + completionTokens * r.out) / 1000;
}

export interface CostStatus {
  month: string;
  spentUsd: number;
  capUsd: number;
  calls: number;
  totalCalls: number;
}

function ledgerPath(): string {
  return path.join(CONFIG.outputRoot, "_cost-ledger.json");
}

function read(): CostEntry[] {
  try {
    return JSON.parse(fs.readFileSync(ledgerPath(), "utf8")) as CostEntry[];
  } catch {
    return [];
  }
}

/** Tipo público de una entrada del ledger (cada llamada a OpenAI registrada). */
export type LedgerEntry = CostEntry;
/** Todas las entradas del ledger de costo (para agregaciones, p. ej. por agente/label). */
export function ledgerEntries(): CostEntry[] {
  return read();
}

function write(entries: CostEntry[]): void {
  atomicWriteFileSync(ledgerPath(), JSON.stringify(entries, null, 2), "cost-ledger");
}

export function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

export function monthSpent(): number {
  const m = monthKey();
  return read()
    .filter((x) => x.ts.slice(0, 7) === m)
    .reduce((s, x) => s + x.estCostUsd, 0);
}

/** True si una próxima imagen excedería el tope mensual configurado. */
export function wouldExceedCap(nextCostUsd: number): boolean {
  return CONFIG.costCapUsd > 0 && monthSpent() + nextCostUsd > CONFIG.costCapUsd;
}

/** Registra CUALQUIER gasto de OpenAI (imagen/texto/visión) en el ledger. */
export function recordSpend(entry: { kind: string; model: string; costUsd: number; pageId?: string; label?: string }): void {
  const entries = read();
  entries.push({
    ts: new Date().toISOString(),
    kind: entry.kind,
    pageId: entry.pageId ?? "",
    label: entry.label ?? "",
    model: entry.model,
    estCostUsd: entry.costUsd,
    certId: CONFIG.certId,
    format: CONFIG.format,
  });
  write(entries);
}

/** Registra gasto de una llamada de texto/visión desde su `usage`. Devuelve el costo. */
export function recordTextSpend(
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number } | null | undefined,
  opts: { kind?: string; pageId?: string; label?: string } = {},
): number {
  const cost = estimateTextCost(model, usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0);
  recordSpend({ kind: opts.kind ?? "text", model, costUsd: cost, pageId: opts.pageId, label: opts.label });
  return cost;
}

/** Compat: gasto de imagen (gpt-image). */
export function recordCost(pageId: string, recipeId: string, costUsd: number): void {
  recordSpend({ kind: "image", model: CONFIG.imageModel, costUsd, pageId, label: recipeId });
}

export function costStatus(): CostStatus {
  const m = monthKey();
  const all = read();
  const month = all.filter((x) => x.ts.slice(0, 7) === m);
  return {
    month: m,
    spentUsd: Math.round(month.reduce((s, x) => s + x.estCostUsd, 0) * 1000) / 1000,
    capUsd: CONFIG.costCapUsd,
    calls: month.length,
    totalCalls: all.length,
  };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Gasto TOTAL de toda la historia del ledger (para el saldo restante = ingresos − gasto lifetime). */
export function lifetimeSpentUsd(): number {
  return round3(read().reduce((s, x) => s + x.estCostUsd, 0));
}

export interface CostBreakdownRow { key: string; costUsd: number; calls: number }
export interface CostBreakdown { byModel: CostBreakdownRow[]; byKind: CostBreakdownRow[]; byFormat: CostBreakdownRow[]; monthUsd: number; totalUsd: number; totalCalls: number }

/** Desglose del gasto (lifetime) por modelo / kind / libro(format), ordenado desc por costo. Para el panel de costos. */
export function costBreakdown(): CostBreakdown {
  const all = read();
  const group = (keyOf: (e: CostEntry) => string): CostBreakdownRow[] => {
    const map = new Map<string, { costUsd: number; calls: number }>();
    for (const e of all) {
      const k = keyOf(e) || "—";
      const g = map.get(k) ?? { costUsd: 0, calls: 0 };
      g.costUsd += e.estCostUsd; g.calls += 1; map.set(k, g);
    }
    return [...map.entries()].map(([key, v]) => ({ key, costUsd: round3(v.costUsd), calls: v.calls })).sort((a, b) => b.costUsd - a.costUsd);
  };
  const m = monthKey();
  return {
    byModel: group((e) => e.model),
    byKind: group((e) => e.kind),
    byFormat: group((e) => e.format ?? ""),
    monthUsd: round3(all.filter((x) => x.ts.slice(0, 7) === m).reduce((s, x) => s + x.estCostUsd, 0)),
    totalUsd: round3(all.reduce((s, x) => s + x.estCostUsd, 0)),
    totalCalls: all.length,
  };
}
