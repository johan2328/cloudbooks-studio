import { existsSync } from "node:fs";
import path from "node:path";
import { getSeed, listSeeds } from "./seeds.js";
import { pageOutputDir } from "./config.js";
import { getProvenance } from "./page-store.js";
import { getEditorial } from "./editorial-store.js";
import { getRelevanceForPage } from "./grounding/relevance-store.js";
import { getBookIssues } from "./book/book-review-store.js";
import { getInfographicManifest } from "./generate-infographic.js";
import type { GroundingStatus, PremiumVerdict, PremiumVerdictKind, QaGate, RelevanceStatus } from "./types.js";

/** Copy de venta / marketing que descalifica una página de estudio. */
const MARKETING_RE = /\b(comprá|comprar ya|oferta especial|descuento|mejor precio|promoci[oó]n|suscrib[ií]|vendé|bestseller|imperdible|¡)/i;

/**
 * VEREDICTO DE CONTENIDO (agnóstico del render). Combina SOLO los gates que
 * miden la VERDAD del contenido — precisión técnica (grounding), QA editorial,
 * riesgo comercial y consistencia de libro. El QA VISUAL (arte/estilo/legibilidad)
 * lo hace el AGENTE DE CONFORMIDAD de la infografía; acá no se evalúa render.
 * (Los gates del composer —dirección de arte, ajuste, densidad, identidad,
 * legibilidad— se jubilaron con el pivote a infografía.)
 */
export async function premiumVerdict(pageId: string): Promise<PremiumVerdict> {
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);
  const prov = getProvenance(pageId);
  const grounding = prov?.groundingStatus ?? null;
  const rel = prov ? getRelevanceForPage(prov.skillIds) : null;
  const ed = getEditorial(pageId);
  const bookIssues = getBookIssues(pageId);
  const blob = `${seed.context} ${seed.subtitle} ${seed.traps.map((t) => `${t.wrong} ${t.correction}`).join(" ")} ${seed.autocheck.explanation}`;
  const { gates, verdict, combinedScore } = evaluateContentGates({
    grounding,
    relevanceStatus: rel?.status ?? null, relevanceScore: rel?.score ?? null,
    editorialRan: !!ed, editorialVerdict: ed?.verdict ?? null, editorialOverall: ed?.overall ?? null,
    hasMarketing: MARKETING_RE.test(blob),
    bookConsistent: bookIssues.length === 0, bookIssueCount: bookIssues.length,
  });
  return { pageId, verdict, combinedScore, gates, groundingStatus: grounding, relevanceStatus: rel?.status ?? null, editorialOverall: ed?.overall ?? null, bookIssues };
}

export interface VerdictInputs {
  grounding?: GroundingStatus | null;
  relevanceStatus?: RelevanceStatus | null;
  relevanceScore?: number | null;
  editorialRan?: boolean;
  editorialVerdict?: "approve" | "revise" | null;
  editorialOverall?: number | null;
  hasMarketing?: boolean;
  bookConsistent?: boolean;
  bookIssueCount?: number;
}

/** Lógica PURA de los gates de CONTENIDO + veredicto (testeable, sin fs/red). */
export function evaluateContentGates(p: VerdictInputs): { gates: QaGate[]; verdict: PremiumVerdictKind; combinedScore: number } {
  const g = p.grounding ?? null;                       // verified | partial | authored | unverified | null(seeded)
  const groundingBad = g === "unverified";             // contradicha/sin respaldo → bloquea
  const groundingVerified = g === "verified";          // único estado que certifica production_ready
  const rel = p.relevanceStatus ?? null;               // sufficient | thin | off_topic | null(no evaluada)
  const relBad = rel === "off_topic";                  // fuera de alcance → bloquea
  const relSufficient = rel === "sufficient";          // único estado que certifica production_ready
  const edRan = !!p.editorialRan;
  const edRevise = edRan && p.editorialVerdict === "revise";
  const editorialOk = edRan && p.editorialVerdict === "approve";
  const bookOk = p.bookConsistent !== false;

  const gates: QaGate[] = [
    { id: "technical", label: "Precisión técnica (grounding)", blocks: true, cap: 3,
      passed: !groundingBad,
      score: g === "verified" ? 10 : g === "partial" || g === "authored" ? 7 : g === "unverified" ? 3 : 7,
      note: g === "verified" ? "Grounding verificado: afirmaciones citadas y respaldadas por su fuente."
        : g === "partial" || g === "authored" ? "Grounding parcial (parte apoyada en el modelo): requiere 'verified' para production_ready."
        : g === "unverified" ? "Grounding sin respaldo o contradicho."
        : "Contenido seeded (sin grounding): requiere 'verified' para production_ready." },
    { id: "content", label: "QA editorial (contenido)", blocks: true, cap: 5,
      passed: !edRevise,
      score: !edRan ? 6 : edRevise ? Math.min(5, p.editorialOverall ?? 5) : Math.max(8, p.editorialOverall ?? 8),
      note: !edRan ? "QA editorial (LLM) pendiente — obligatorio para production_ready."
        : edRevise ? `El revisor editorial pide revisión (overall ${p.editorialOverall ?? "?"}/10).`
        : `Revisor editorial: aprobado (overall ${p.editorialOverall ?? "?"}/10).` },
    { id: "risk", label: "Riesgo comercial", blocks: true, cap: 4,
      passed: !p.hasMarketing, score: p.hasMarketing ? 3 : 10,
      note: p.hasMarketing ? "Detectado lenguaje de marketing/venta." : "Sin copy de venta." },
    { id: "relevance", label: "Relevancia / cobertura", blocks: true, cap: 5,
      passed: rel !== "off_topic" && rel !== "thin",   // no-evaluada (null) no bloquea páginas legacy
      score: rel === "off_topic" ? 3 : rel === "thin" ? 5 : rel === "sufficient" ? Math.max(8, p.relevanceScore ?? 8) : 7,
      note: rel === "off_topic" ? "Fuera del alcance del skill (supervisor de relevancia)."
        : rel === "thin" ? "Cobertura/contenido flojo: faltan aspectos del skill o es genérico."
        : rel === "sufficient" ? "Relevancia y cobertura suficientes (supervisor)."
        : "Relevancia no evaluada — corré el supervisor (pipeline de grounding)." },
    { id: "book", label: "Consistencia de libro", blocks: false, cap: 6,
      passed: bookOk, score: bookOk ? 9 : 5,
      note: bookOk ? "Consistente con el resto del libro (o sin revisar)." : `${p.bookIssueCount ?? 0} inconsistencia(s) vs otras páginas (editor-jefe).` },
  ];

  // production_ready exige: grounding 'verified' + relevancia 'sufficient' + QA editorial
  // aprobado + libro consistente. Grounding contradicho O relevancia off-topic → blocked.
  // Falta algo (incl. relevancia no evaluada) → needs_human_art (revisión humana).
  const verdict: PremiumVerdictKind = (groundingBad || relBad) ? "blocked"
    : (!groundingVerified || !relSufficient || !editorialOk || !bookOk) ? "needs_human_art"
    : "production_ready";

  const avg = gates.reduce((s, gate) => s + gate.score, 0) / gates.length;
  let combined = avg;
  for (const gate of gates) if (gate.blocks && !gate.passed) combined = Math.min(combined, gate.cap);
  const combinedScore = Math.round(combined * 10) / 10;
  return { gates, verdict, combinedScore };
}

// ── READINESS DE CONTENIDO (agregado para el Dashboard) ──
// No promedia métricas (los gates aún se están afinando): cuenta el VEREDICTO por
// página + lista las que bloquean con su motivo. Es el semáforo de "¿se puede publicar?".
export interface ReadinessRow {
  pageId: string; pageNumber: string; title: string;
  verdict: PremiumVerdictKind; groundingStatus: GroundingStatus | null;
  relevanceStatus: RelevanceStatus | null;
  editorialOverall: number | null; combinedScore: number; reasons: string[];
  generatedAt: string | null;
}
export interface ContentReadiness {
  total: number; seeded: number;
  counts: { production_ready: number; needs_human_art: number; blocked: number };
  verifiedGrounding: number; rows: ReadinessRow[];
}

/** Recorre las páginas GENERADAS, computa su veredicto de contenido y agrega. */
export async function contentReadiness(): Promise<ContentReadiness> {
  const seeds = listSeeds();
  const rows: ReadinessRow[] = [];
  const counts = { production_ready: 0, needs_human_art: 0, blocked: 0 };
  let verifiedGrounding = 0;
  for (const seed of seeds) {
    if (!existsSync(path.join(pageOutputDir(seed.pageId), "infographic.png"))) continue;
    const v = await premiumVerdict(seed.pageId);
    counts[v.verdict] += 1;
    if (v.groundingStatus === "verified") verifiedGrounding += 1;
    const reasons: string[] = [];
    if (v.groundingStatus !== "verified") reasons.push(`grounding ${v.groundingStatus ?? "seeded"}`);
    if (v.relevanceStatus === "off_topic") reasons.push("relevancia off-topic");
    else if (v.relevanceStatus === "thin") reasons.push("relevancia thin");
    else if (!v.relevanceStatus) reasons.push("relevancia sin evaluar");
    const content = v.gates.find((g) => g.id === "content");
    if (content && !/aprobado/i.test(content.note)) reasons.push("editorial pendiente");
    const risk = v.gates.find((g) => g.id === "risk");
    if (risk && !risk.passed) reasons.push("riesgo comercial");
    if ((v.bookIssues?.length ?? 0) > 0) reasons.push(`${v.bookIssues!.length} inconsist. libro`);
    rows.push({
      pageId: seed.pageId, pageNumber: seed.pageNumber, title: seed.title,
      verdict: v.verdict, groundingStatus: v.groundingStatus ?? null, relevanceStatus: v.relevanceStatus ?? null,
      editorialOverall: v.editorialOverall ?? null, combinedScore: v.combinedScore, reasons,
      generatedAt: getInfographicManifest(seed.pageId)?.generatedAt ?? null,
    });
  }
  rows.sort((a, b) => a.pageNumber.localeCompare(b.pageNumber));
  return { total: rows.length, seeded: seeds.length, counts, verifiedGrounding, rows };
}
