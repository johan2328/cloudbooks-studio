import type { QaDimensionScores, VisualAtlasLayoutEvidence } from "../qa/visual-atlas/validate-page-html";
import type { VisualAtlasPageVisualMeasurement } from "../visual-measurement/visual-atlas-page-measurement";

export type LayoutEngineReadiness = "approved_candidate" | "needs_targeted_fix" | "blocked";
export type LayoutEngineActionId =
  | "regenerate_full"
  | "boost_technical_core"
  | "compact_exam_rail"
  | "expand_context"
  | "human_visual_review"
  | "approve_candidate";
export type LayoutEngineScope = "full" | "technical_core" | "exam_rail" | "qa_review";

export interface LayoutEngineAction {
  id: LayoutEngineActionId;
  label: string;
  scope: LayoutEngineScope;
  priority: number;
  reason: string;
  expectedImpact: string;
}

export interface VisualAtlasLayoutEngineReport {
  version: "visual-atlas-layout-engine-v1";
  readiness: LayoutEngineReadiness;
  score: number;
  summary: string;
  primaryAction: LayoutEngineAction;
  actions: LayoutEngineAction[];
  batchGate: {
    canBatch: boolean;
    reason: string;
  };
  constraints: {
    targetScore: number;
    maxUpperFreeVerticalPx: number;
    minUpperImageSharePct: number;
    maxExamRailSharePct: number;
    minLayoutScoreForBatch: number;
  };
  evidenceFingerprint: string;
}

interface LayoutEngineContext {
  imageGenerated: boolean;
  generationSource: "locked_seed" | "composer_draft";
  visualMeasurement?: VisualAtlasPageVisualMeasurement | null;
}

const CONSTRAINTS = {
  targetScore: 9.5,
  maxUpperFreeVerticalPx: 92,
  minUpperImageSharePct: 78,
  maxExamRailSharePct: 28,
  minLayoutScoreForBatch: 8.8,
} as const;

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function action(
  id: LayoutEngineActionId,
  label: string,
  scope: LayoutEngineScope,
  priority: number,
  reason: string,
  expectedImpact: string,
): LayoutEngineAction {
  return { id, label, scope, priority, reason, expectedImpact };
}

function fingerprint(evidence: VisualAtlasLayoutEvidence, qa: QaDimensionScores): string {
  return [
    `layout:${evidence.score}`,
    `upper-free:${evidence.upper.freeVerticalPx}`,
    `upper-share:${evidence.upper.imageSlotSharePct}`,
    `rail:${evidence.examRail.rowHeight}`,
    `rail-share:${evidence.examRail.sharePct}`,
    `rail-density:${evidence.examRail.densityBand}`,
    `qa:${qa.avg}`,
    `blockers:${evidence.blockers.length}`,
    `warnings:${evidence.warnings.length}`,
  ].join("|");
}

function hasUsefulUpperSupport(context: LayoutEngineContext): boolean {
  const supportUsage = context.visualMeasurement?.zoneUsage.upper_support;
  return Boolean(context.visualMeasurement?.available && supportUsage && supportUsage.occupancyPct >= 55 && supportUsage.usedHeight >= 38);
}

export function evaluateVisualAtlasLayoutEngine(
  evidence: VisualAtlasLayoutEvidence,
  qa: QaDimensionScores,
  context: LayoutEngineContext,
): VisualAtlasLayoutEngineReport {
  const actions: LayoutEngineAction[] = [];
  const upperSupportActive = hasUsefulUpperSupport(context);

  if (evidence.blockers.length > 0) {
    actions.push(action(
      "regenerate_full",
      "Regenerar pagina completa",
      "full",
      100,
      evidence.blockers[0],
      "Reconstruye HTML + visual y vuelve a medir antes de aprobar o producir en lote.",
    ));
  }

  if (!context.imageGenerated) {
    actions.push(action(
      "regenerate_full",
      "Regenerar visual real",
      "full",
      95,
      "El upper visual no es imagen real; no cumple promesa editorial premium.",
      "Vuelve a ejecutar gpt-image-2 medium y conserva fallback solo como bloqueo visible.",
    ));
  }

  if (!upperSupportActive && (evidence.upper.freeVerticalPx > CONSTRAINTS.maxUpperFreeVerticalPx || evidence.upper.imageSlotSharePct < CONSTRAINTS.minUpperImageSharePct)) {
    actions.push(action(
      "boost_technical_core",
      "Reforzar nucleo visual",
      "technical_core",
      80,
      `Upper subutilizado: ${evidence.upper.freeVerticalPx}px de aire y ${evidence.upper.imageSlotSharePct}% de uso de slot.`,
      "Aumenta densidad util del cuerpo visual sin tocar traps/autocheck.",
    ));
  }

  if (evidence.examRail.sharePct > CONSTRAINTS.maxExamRailSharePct || evidence.examRail.densityBand === "thin") {
    actions.push(action(
      "compact_exam_rail",
      "Compactar rail inferior",
      "exam_rail",
      70,
      `Rail ${evidence.examRail.sharePct}% con densidad ${evidence.examRail.densityBand}.`,
      "Reduce altura improductiva del bloque de examen y devuelve foco al nucleo visual.",
    ));
  }

  if (qa.readability < 8.5 || qa.density < 8.5) {
    actions.push(action(
      "expand_context",
      "Expandir contexto dirigido",
      "full",
      55,
      `Legibilidad ${qa.readability}/10 y densidad ${qa.density}/10 todavia no sostienen salida premium.`,
      "Agrega microexplicacion util sin agrandar artificialmente la pagina.",
    ));
  }

  if (context.visualMeasurement?.available) {
    if (context.visualMeasurement.blockers.length > 0) {
      actions.push(action(
        "regenerate_full",
        "Corregir medicion visual",
        "full",
        98,
        context.visualMeasurement.blockers[0],
        "La captura real detecto un problema que no debe entrar a produccion.",
      ));
    }
    if (context.visualMeasurement.typography.smallTextCount > 0) {
      actions.push(action(
        "boost_technical_core",
        "Ajustar microtipografia",
        "technical_core",
        78,
        `${context.visualMeasurement.typography.smallTextCount} texto(s) por debajo del umbral legible.`,
        "Sube legibilidad real y reduce riesgo de lectura pobre en pagina impresa.",
      ));
    }
    if ((context.visualMeasurement.zoneUsage.exam_rail?.freeBottomPx ?? 0) > 58) {
      actions.push(action(
        "compact_exam_rail",
        "Recomponer rail inferior",
        "exam_rail",
        76,
        `La captura real detecto ${context.visualMeasurement.zoneUsage.exam_rail?.freeBottomPx ?? 0}px libres al fondo del rail.`,
        "Reduce vacio visible o enriquece microexplicaciones sin inflar el bloque.",
      ));
    }
    if (upperSupportActive && qa.avg < CONSTRAINTS.targetScore && evidence.examRail.densityBand !== "thin") {
      actions.push(action(
        "human_visual_review",
        "Revisar calidad editorial",
        "qa_review",
        42,
        "El hueco superior ya esta compensado por soporte editorial; la brecha restante parece de arte, jerarquia o precision de contenido.",
        "Evita regeneracion abierta y dirige la revision a criterio editorial humano.",
      ));
    }
  }

  if (actions.length === 0 && qa.avg < CONSTRAINTS.targetScore) {
    actions.push(action(
      "human_visual_review",
      "Revision visual humana",
      "qa_review",
      40,
      `QA ${qa.avg}/10: no hay bloqueo estructural, pero falta criterio humano de direccion de arte.`,
      "Permite decidir si el margen hasta 9.5 es de arte visual, iconografia o contenido.",
    ));
  }

  if (actions.length === 0) {
    actions.push(action(
      "approve_candidate",
      "Candidato a aprobacion",
      "qa_review",
      10,
      "La evidencia estructural no muestra bloqueos ni huecos criticos.",
      "Enviar a QA final y no regenerar sin una razon editorial concreta.",
    ));
  }

  const primaryAction = actions.slice().sort((a, b) => b.priority - a.priority)[0];
  const evidencePenalty =
    evidence.blockers.length * 1.4
    + evidence.warnings.length * 0.28
    + (context.visualMeasurement?.available ? context.visualMeasurement.blockers.length * 0.9 + context.visualMeasurement.warnings.length * 0.18 : 0)
    + (context.imageGenerated ? 0 : 1.2)
    + Math.max(0, CONSTRAINTS.targetScore - qa.avg) * 0.35;
  const score = roundOne(clamp(10 - evidencePenalty, 0, 10));
  const canBatch =
    context.imageGenerated
    && evidence.blockers.length === 0
    && (!context.visualMeasurement?.available || context.visualMeasurement.blockers.length === 0)
    && evidence.score >= CONSTRAINTS.minLayoutScoreForBatch
    && (!context.visualMeasurement?.available || context.visualMeasurement.score >= 8.8)
    && qa.avg >= CONSTRAINTS.targetScore;
  const readiness: LayoutEngineReadiness = canBatch
    ? "approved_candidate"
    : evidence.blockers.length > 0 || !context.imageGenerated || (context.visualMeasurement?.available === true && context.visualMeasurement.blockers.length > 0)
      ? "blocked"
      : "needs_targeted_fix";

  const summary = readiness === "approved_candidate"
    ? "La pagina puede pasar a QA final sin regeneracion abierta."
    : readiness === "blocked"
      ? "La pagina no debe entrar a batch: requiere correccion estructural o visual real."
      : "La pagina necesita una correccion dirigida antes de intentar cierre 9.5.";

  return {
    version: "visual-atlas-layout-engine-v1",
    readiness,
    score,
    summary,
    primaryAction,
    actions: actions.sort((a, b) => b.priority - a.priority),
    batchGate: {
      canBatch,
      reason: canBatch
        ? "Cumple visual real, layout sin bloqueos y QA objetivo."
        : primaryAction.reason,
    },
    constraints: { ...CONSTRAINTS },
    evidenceFingerprint: fingerprint(evidence, qa),
  };
}
