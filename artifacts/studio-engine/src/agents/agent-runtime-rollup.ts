import { CONFIG } from "../config.js";
import { AGENT_REGISTRY, DOMAIN_META, type AgentDomain } from "./registry.js";
import { readAgentRuns, type AgentRunRecord } from "./agent-runtime.js";

/**
 * AGREGACIÓN del store de runtime por (agente × período) para el dashboard de la Cuadrilla.
 * Espeja agents-rollup (mismo criterio "solo libro activo") pero suma DURACIÓN, no costo, y
 * generaliza el filtro de mes a día/semana ISO/mes/trimestre. Read-only.
 */
export type Period = "day" | "week" | "month" | "quarter";

/** Clave de período de un ISO ts. Generaliza `monthKey` (slice 0,7) a día/semana-ISO/mes/trimestre. */
export function periodKey(ts: string, p: Period): string {
  if (p === "day") return ts.slice(0, 10);         // 2026-08-13
  if (p === "month") return ts.slice(0, 7);        // 2026-08
  const d = new Date(ts);
  if (p === "quarter") return `${d.getUTCFullYear()}-Q${Math.floor(d.getUTCMonth() / 3) + 1}`;
  // semana ISO-8601 (lunes como primer día; la semana pertenece al año de su jueves)
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dn = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - dn + 3);
  const firstThu = new Date(Date.UTC(day.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((day.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function pctl(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx]!;
}
const round = (n: number): number => Math.round(n);

export interface RuntimeAgentStat {
  id: string; name: string; role: string; masterRole?: string; domain: AgentDomain; iconKey: string;
  runs: number; totalMs: number; avgMs: number; p50: number; p95: number; lastRun: string | null; okRate: number;
}
export interface RuntimeRun {
  ts: string; agentId: string; agentName: string; iconKey: string; domain: AgentDomain | null;
  durationMs: number; runContext: string; moduleId?: string; routeId?: string; model?: string; ok: boolean;
}
export interface AgentRuntimeRollup {
  period: Period; periodKey: string;
  domains: Record<AgentDomain, { label: string; color: string; blurb: string }>;
  agents: RuntimeAgentStat[];
  timeline: { periodKey: string; totalMs: number; runs: number }[];
  summary: { totalMs: number; activeAgents: number; longestRunMs: number; longestAgentId: string | null; longestAgentName: string | null; runsTotal: number };
  lastRuns: RuntimeRun[];
  lastCorrida: RuntimeRun[];
}

const byId = new Map(AGENT_REGISTRY.map((d) => [d.id, d]));

function toRun(r: AgentRunRecord): RuntimeRun {
  const def = byId.get(r.agentId);
  return {
    ts: r.ts, agentId: r.agentId, agentName: def?.name ?? r.agentId, iconKey: def?.iconKey ?? "",
    domain: def?.domain ?? null, durationMs: r.durationMs, runContext: r.runContext,
    moduleId: r.moduleId, routeId: r.routeId, model: r.model, ok: r.ok,
  };
}

/** Aísla los runs de la ÚLTIMA corrida para el waterfall: desde el run más reciente hacia atrás
 *  mientras el hueco entre spans sea < 5 min (un gap mayor = fase/corrida anterior). */
function extractLastCorrida(all: AgentRunRecord[]): AgentRunRecord[] {
  if (!all.length) return [];
  const sorted = [...all].sort((a, b) => (a.ts < b.ts ? -1 : 1));
  const GAP = 5 * 60 * 1000;
  const out: AgentRunRecord[] = [sorted[sorted.length - 1]!];
  for (let i = sorted.length - 2; i >= 0; i--) {
    const cur = sorted[i]!, next = out[out.length - 1]!;
    const startNext = new Date(next.ts).getTime() - next.durationMs;
    if (startNext - new Date(cur.ts).getTime() > GAP) break;
    out.push(cur);
  }
  return out.reverse().slice(-60);   // el waterfall se lee bien hasta ~60 spans
}

export function agentRuntimeRollup(period: Period): AgentRuntimeRollup {
  // solo el libro activo (igual criterio que agentsRollup): la Cuadrilla del Master no arrastra el Atlas.
  const all = readAgentRuns().filter((r) => r.format === CONFIG.format);
  const curKey = periodKey(new Date().toISOString(), period);
  const inPeriod = all.filter((r) => periodKey(r.ts, period) === curKey);

  // por agente en el período actual
  const grouped = new Map<string, AgentRunRecord[]>();
  for (const r of inPeriod) { const g = grouped.get(r.agentId) ?? []; g.push(r); grouped.set(r.agentId, g); }
  const agents: RuntimeAgentStat[] = [];
  for (const [agentId, recs] of grouped) {
    const def = byId.get(agentId);
    const durs = recs.map((r) => r.durationMs).sort((a, b) => a - b);
    const totalMs = durs.reduce((s, x) => s + x, 0);
    const oks = recs.filter((r) => r.ok).length;
    let lastRun: string | null = null;
    for (const r of recs) if (!lastRun || r.ts > lastRun) lastRun = r.ts;
    agents.push({
      id: agentId, name: def?.name ?? agentId, role: def?.role ?? "", masterRole: def?.masterRole,
      domain: def?.domain ?? "calidad", iconKey: def?.iconKey ?? "",
      runs: recs.length, totalMs: round(totalMs), avgMs: round(totalMs / recs.length),
      p50: round(pctl(durs, 0.5)), p95: round(pctl(durs, 0.95)), lastRun, okRate: recs.length ? oks / recs.length : 1,
    });
  }
  agents.sort((a, b) => b.totalMs - a.totalMs);

  // timeline: últimos ~12 buckets del período (sobre todo el store del libro activo)
  const buckets = new Map<string, { totalMs: number; runs: number }>();
  for (const r of all) { const k = periodKey(r.ts, period); const b = buckets.get(k) ?? { totalMs: 0, runs: 0 }; b.totalMs += r.durationMs; b.runs += 1; buckets.set(k, b); }
  const timeline = [...buckets.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12).map(([k, v]) => ({ periodKey: k, totalMs: round(v.totalMs), runs: v.runs }));

  // summary del período actual
  let longestRunMs = 0, longestAgentId: string | null = null;
  for (const r of inPeriod) if (r.durationMs > longestRunMs) { longestRunMs = r.durationMs; longestAgentId = r.agentId; }
  const summary = {
    totalMs: round(inPeriod.reduce((s, r) => s + r.durationMs, 0)),
    activeAgents: agents.length,
    longestRunMs: round(longestRunMs),
    longestAgentId,
    longestAgentName: longestAgentId ? (byId.get(longestAgentId)?.name ?? longestAgentId) : null,
    runsTotal: inPeriod.length,
  };

  return {
    period, periodKey: curKey, domains: DOMAIN_META, agents, timeline, summary,
    lastRuns: all.slice(-40).reverse().map(toRun),
    lastCorrida: extractLastCorrida(all).map(toRun),
  };
}
