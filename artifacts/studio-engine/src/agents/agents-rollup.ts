import { ledgerEntries, monthKey, type LedgerEntry } from "../cost.js";
import { CONFIG } from "../config.js";
import { AGENT_REGISTRY, DOMAIN_META, type AgentDomain, type AgentDef } from "./registry.js";
import { AGENT_CONTRACTS, type AgentContract } from "./contracts.js";

/** Etiquetas del ledger propias del pipeline documental (Master Book). Para atribuir entradas
 *  LEGACY (sin `format`) al libro correcto por heurística. Las nuevas ya traen `format`. */
const MASTER_LABELS = new Set(["chapter-author", "psychometrics", "verify-chapter", "supervise-chapter", "chapter-divider-text", "master-glossary", "part-opener-hook"]);
function bookOf(e: LedgerEntry): string {
  if (e.format) return e.format;
  if (MASTER_LABELS.has(e.label) || e.pageId.startsWith("cap-")) return "master-book";
  return "visual-atlas";
}

/**
 * Cruza el REGISTRO de agentes con el LEDGER de costo real → métricas por agente
 * (operaciones, costo, última actividad, activo este mes) + un resumen con el total
 * de agentes que operan el estudio. Read-only: solo lee el ledger, no llama a OpenAI.
 */

export interface AgentStat {
  id: string;
  name: string;
  role: string;
  masterRole?: string;                  // rol reescrito para libros de texto (Master Book)
  scope?: "both" | "atlas" | "master";  // "atlas" = solo image-2; "master" = solo pipeline documental
  domain: AgentDomain;
  iconKey: string;
  model: string;            // derivado del ledger (lo realmente usado); "—" si nunca corrió
  opsMonth: number;
  opsTotal: number;
  costMonthUsd: number;
  costTotalUsd: number;
  lastActiveTs: string | null;
  activeThisMonth: boolean;
  contracts: AgentContract[];           // "contrato de actuación" = system prompt(s) del agente
}

export interface AgentsRollup {
  month: string;
  domains: Record<AgentDomain, { label: string; color: string; blurb: string }>;
  agents: AgentStat[];
  summary: {
    totalAgents: number;
    activeThisMonth: number;
    byDomain: Record<AgentDomain, number>;
    opsMonth: number;
    opsTotal: number;
    costMonthUsd: number;
    costTotalUsd: number;
  };
}

const round = (n: number): number => Math.round(n * 1000) / 1000;

export function agentsRollup(): AgentsRollup {
  // Solo el gasto del LIBRO ACTIVO: la Cuadrilla del Master no debe arrastrar consumos del Atlas.
  const all = ledgerEntries().filter((e) => bookOf(e) === CONFIG.format);
  const m = monthKey();

  // Labels "reclamados" por agentes específicos → el agente por `matchKind` (Ilustrador = image) NO los cuenta (evita doble conteo con el Diseñador).
  const claimedLabels = new Set(AGENT_REGISTRY.flatMap((d) => d.labels ?? []));
  const agents: AgentStat[] = AGENT_REGISTRY.map((def: AgentDef) => {
    const mine = all.filter((e) => (def.matchKind ? (e.kind === def.matchKind && !claimedLabels.has(e.label)) : (def.labels ?? []).includes(e.label)));
    const month = mine.filter((e) => e.ts.slice(0, 7) === m);
    let lastActiveTs: string | null = null;
    let model = "—";
    for (const e of mine) if (!lastActiveTs || e.ts > lastActiveTs) { lastActiveTs = e.ts; model = e.model || "—"; }
    return {
      id: def.id, name: def.name, role: def.role, masterRole: def.masterRole, scope: def.scope ?? "both", domain: def.domain, iconKey: def.iconKey, model,
      opsMonth: month.length,
      opsTotal: mine.length,
      costMonthUsd: round(month.reduce((s, e) => s + e.estCostUsd, 0)),
      costTotalUsd: round(mine.reduce((s, e) => s + e.estCostUsd, 0)),
      lastActiveTs,
      activeThisMonth: month.length > 0,
      contracts: AGENT_CONTRACTS[def.id] ?? [],
    };
  });

  const byDomain: Record<AgentDomain, number> = { conocimiento: 0, creacion: 0, calidad: 0 };
  for (const a of agents) byDomain[a.domain]++;

  return {
    month: m,
    domains: DOMAIN_META,
    agents,
    summary: {
      totalAgents: agents.length,
      activeThisMonth: agents.filter((a) => a.activeThisMonth).length,
      byDomain,
      opsMonth: agents.reduce((s, a) => s + a.opsMonth, 0),
      opsTotal: agents.reduce((s, a) => s + a.opsTotal, 0),
      costMonthUsd: round(agents.reduce((s, a) => s + a.costMonthUsd, 0)),
      costTotalUsd: round(agents.reduce((s, a) => s + a.costTotalUsd, 0)),
    },
  };
}

// ── Actividad reciente (operatoria): las últimas entradas del ledger, atribuidas a su agente ──
const CLAIMED_LABELS = new Set(AGENT_REGISTRY.flatMap((d) => d.labels ?? []));
/** Atribuye una entrada del ledger a su agente (misma regla que el rollup: por label, o por kind si el label es libre). */
export function attributeEntry(e: LedgerEntry): AgentDef | null {
  return AGENT_REGISTRY.find((d) =>
    d.matchKind ? (e.kind === d.matchKind && !CLAIMED_LABELS.has(e.label)) : (d.labels ?? []).includes(e.label),
  ) ?? null;
}

/** Propósito humano de una entrada, derivado de su label (o del kind como respaldo). */
function purposeOf(label: string, kind: string): string {
  const l = (label || "").toLowerCase();
  if (l.startsWith("panel-")) return "QA de ruta (panel)";
  if (l.endsWith("-text") || l.endsWith("-hook")) return "Texto de apertura";
  if (l.startsWith("author") || l === "chapter-author") return "Redacción de contenido";
  if (l.startsWith("verify")) return "Verificación de fidelidad";
  if (l.includes("supervise") || l.startsWith("relevance")) return "Supervisión de relevancia";
  if (l === "psychometrics") return "Análisis psicométrico";
  if (l === "topic-audit") return "Auditoría de tema";
  if (l.startsWith("search")) return "Búsqueda de fuentes";
  if (l === "layout-director" || /(book-cover|book-backcover|part-opener|chapter-divider|route-divider)$/.test(l)) return "Diseño de página";
  if (["study-guide", "route-intro", "glossary", "domain-map", "ficha-copy"].includes(l)) return "Redacción de sección";
  if (l === "qa-editorial" || l === "infographic-qa" || l === "vision-score") return "QA de página (Atlas)";
  if (l === "book-review") return "Revisión del libro";
  if (l.includes("extract-claims") || l.includes("claim")) return "Extracción de afirmaciones";
  if (l.includes("enrich")) return "Enriquecido de contenido";
  if (l.includes("capstone")) return "Capstone de ruta";
  if (kind === "image") return "Ilustración";
  return label || kind || "operación";
}

export interface AgentActivity {
  ts: string;
  agentId: string | null;
  agentName: string;
  iconKey: string;
  domain: AgentDomain | null;
  label: string;
  kind: string;
  target: string;      // pageId (capítulo/ruta/página sobre el que operó)
  purpose: string;
  model: string;
  costUsd: number;
  book: string;        // formato/libro donde ocurrió (master-book | master-book-ab | visual-atlas)
}

/** Últimas N operaciones del ledger (TODOS los libros), más reciente primero — para "ver la operatoria" real,
 *  incluida la de la sombra. La columna `book` distingue el libro; el roster de la Cuadrilla sigue por libro activo. */
export function recentActivity(limit = 40): AgentActivity[] {
  const n = Math.max(1, Math.min(200, Math.floor(limit) || 40));
  return ledgerEntries().slice(-n).reverse().map((e) => {
    const def = attributeEntry(e);
    return {
      ts: e.ts, agentId: def?.id ?? null, agentName: def?.name ?? "—", iconKey: def?.iconKey ?? "",
      domain: def?.domain ?? null, label: e.label, kind: e.kind, target: e.pageId,
      purpose: purposeOf(e.label, e.kind), model: e.model, costUsd: e.estCostUsd, book: bookOf(e),
    };
  });
}
