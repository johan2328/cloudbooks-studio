import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowRightLeft,
  ArrowUp,
  ArrowDown,
  Blocks,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronsUpDown,
  Layers3,
  Loader2,
  Lock,
  MapPinned,
  GripVertical,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import { evaluateComposerBenchmark } from "@/lib/editorial-benchmark";
import { normalizeQaScoreToTen, qaScoreToHundred, resolveQaScoreSource } from "@/lib/qa-score-source";
import {
  fetchComposerActionLogs,
  fetchComposerBatchStatus,
  fetchComposerDraft,
  fetchComposerProposal,
  retryComposerBatchFailed,
  saveComposerActionLog,
  startComposerBatchRun,
  fetchStudioCatalog,
  fetchStudioOutputStatus,
  fetchStudioQaReport,
  logComposerAutofix,
  saveComposerDraft,
  type ComposerBlock,
  type ComposerActionLogRecord,
  type ComposerBatchRunStatus,
  type ComposerDraftRecord,
  type ComposerProposal,
  type StudioCatalogPage,
  type StudioCatalog,
  type StudioOutputStatus,
  type StudioQaReport,
} from "@/lib/studio-api";

interface ComposerGenerationResponse {
  success: boolean;
  pageId: string;
  regenerationScope?: ComposerRegenerationScope;
  outputs?: {
    html: string;
    metadata: string;
    qaReport: string;
    previewPng: string | null;
  };
  qaDelta?: {
    before: number | null;
    after: number | null;
    delta: number | null;
  };
  error?: string;
  detail?: string;
}

interface ComposerActionLog extends ComposerActionLogRecord {
  pendingSync?: boolean;
}

type ShortcutAction = "compact_rail" | "expand_context" | "boost_technical" | "enforce_four_cards";
type ComposerRegenerationScope = "full" | "technical_core" | "exam_rail";
type ComposerPresetId = "premium_balanced" | "comparison_dominant" | "rail_compact";
type ComposerObjectiveId = "fill_density" | "compact_exam_rail" | "qa_lock";
type PostRenderRemediationSeverity = "success" | "warning" | "critical";

interface PostRenderRemediation {
  available: boolean;
  severity: PostRenderRemediationSeverity;
  label: string;
  reason: string;
  actionLabel: string;
  shortcutAction?: ShortcutAction;
  scope?: ComposerRegenerationScope;
  objectiveId?: ComposerObjectiveId;
  syncOnly?: boolean;
  evidenceItems: string[];
}

const COMPOSER_PRESETS: Array<{
  id: ComposerPresetId;
  label: string;
  hint: string;
}> = [
  {
    id: "premium_balanced",
    label: "Premium balanceado",
    hint: "Equilibra narrativa, núcleo técnico y rail sin sobrecargar.",
  },
  {
    id: "comparison_dominant",
    label: "Comparativo dominante",
    hint: "Prioriza comparativa + decisión para preguntas de examen.",
  },
  {
    id: "rail_compact",
    label: "Rail compacto",
    hint: "Comprime traps/autocheck para devolver altura al cuerpo visual.",
  },
];

const COMPOSER_OBJECTIVES: Array<{
  id: ComposerObjectiveId;
  label: string;
  hint: string;
  actions: ShortcutAction[];
  scope: ComposerRegenerationScope;
  openQa: boolean;
}> = [
  {
    id: "fill_density",
    label: "Recuperar densidad útil",
    hint: "Expande contexto y refuerza núcleo técnico para llenar huecos informativos.",
    actions: ["expand_context", "boost_technical", "enforce_four_cards"],
    scope: "technical_core",
    openQa: false,
  },
  {
    id: "compact_exam_rail",
    label: "Compactar rail de examen",
    hint: "Reduce altura de traps/autocheck y devuelve foco al cuerpo visual.",
    actions: ["compact_rail"],
    scope: "exam_rail",
    openQa: false,
  },
  {
    id: "qa_lock",
    label: "Cerrar para QA oficial",
    hint: "Aplica balance premium y deja la página lista para revisar en QA.",
    actions: ["expand_context", "compact_rail", "boost_technical"],
    scope: "full",
    openQa: true,
  },
];

const TECHNICAL_BLOCK_TYPES = ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"];
const EXAM_RAIL_BLOCK_TYPES = ["exam_traps", "autocheck", "exam_signal"];
const QA_ALIGNMENT_DIMS = [
  { key: "art_direction", label: "Direccion de arte" },
  { key: "editorial_consistency", label: "Consistencia editorial" },
  { key: "readability", label: "Legibilidad" },
  { key: "technical_accuracy", label: "Precision tecnica" },
  { key: "useful_density", label: "Densidad util" },
  { key: "commercial_risk", label: "Seguridad comercial" },
] as const;
const BLOCK_VARIANTS: Record<string, string[]> = {
  hero_title: ["full", "compact"],
  context_deck: ["short", "expanded"],
  guide_question: ["editorial_bar", "icon_bar"],
  diagram_panel: ["single_focus", "two_column", "multi_step"],
  comparison_panel: ["sku_matrix", "decision_matrix"],
  decision_tree: ["binary_path", "multi_branch"],
  map_panel: ["replication_path", "network_boundary"],
  exam_traps: ["compact", "standard"],
  autocheck: ["short", "full"],
  exam_signal: ["rule", "memory_hook", "warning"],
};

function labelFamily(family: ComposerProposal["draft"]["family"]) {
  switch (family) {
    case "comparison":
      return "Comparativa";
    case "architecture":
      return "Arquitectura";
    case "decision":
      return "Decision";
    case "coverage_map":
      return "Cobertura / mapa";
    case "lifecycle":
      return "Ciclo / flujo";
    default:
      return family;
  }
}

function labelTransition(level: ComposerProposal["recommendedTransition"]["level"]) {
  switch (level) {
    case "composer_minor":
      return "Composer minor";
    case "composer_structural":
      return "Composer structural";
    case "composer_full":
      return "Composer full";
    default:
      return level;
  }
}

function labelBlockType(type: ComposerBlock["type"]) {
  switch (type) {
    case "hero_title":
      return "Hero";
    case "context_deck":
      return "Contexto";
    case "guide_question":
      return "Pregunta guia";
    case "diagram_panel":
      return "Diagrama";
    case "comparison_panel":
      return "Comparativa";
    case "decision_tree":
      return "Arbol de decision";
    case "map_panel":
      return "Mapa / cobertura";
    case "exam_traps":
      return "Trampas";
    case "autocheck":
      return "Autocheck";
    case "exam_signal":
      return "Senal de examen";
    default:
      return type;
  }
}

function resolveScopeFromBlockType(type: ComposerBlock["type"]): ComposerRegenerationScope {
  if (EXAM_RAIL_BLOCK_TYPES.includes(type)) return "exam_rail";
  if (TECHNICAL_BLOCK_TYPES.includes(type)) return "technical_core";
  return "full";
}

function labelRegenerationScope(scope: ComposerRegenerationScope): string {
  switch (scope) {
    case "exam_rail":
      return "rail de examen";
    case "technical_core":
      return "nucleo tecnico";
    default:
      return "pagina completa";
  }
}

function summarizeBlockContent(block: ComposerBlock): string {
  const content = block.content;
  if ("title" in content && typeof content.title === "string") {
    return content.title;
  }
  if ("context" in content && typeof content.context === "string") {
    return content.context;
  }
  if ("question" in content && typeof content.question === "string") {
    return content.question;
  }
  if ("message" in content && typeof content.message === "string") {
    return content.message;
  }
  if ("modules" in content && Array.isArray(content.modules)) {
    const labels = content.modules
      .map((item) => (typeof item === "object" && item && "title" in item ? String((item as { title: string }).title) : "modulo"))
      .slice(0, 2);
    return labels.join(" · ");
  }
  if ("traps" in content && Array.isArray(content.traps)) {
    return `${content.traps.length} trampas propuestas`;
  }
  if ("options" in content && Array.isArray(content.options)) {
    return `${content.options.length} opciones de validacion`;
  }
  return "Bloque listo para composicion editorial";
}

function withCacheBust(url: string | null, version: string | null | undefined): string | null {
  if (!url) return null;
  const stamp = version ?? String(Date.now());
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(stamp)}`;
}

function cloneDraftRecord(draft: ComposerProposal["draft"]): ComposerProposal["draft"] {
  return JSON.parse(JSON.stringify(draft)) as ComposerProposal["draft"];
}

async function readJsonOrThrow<T>(res: Response, label: string): Promise<T> {
  const bodyText = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const preview = bodyText.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(`${label}: respuesta no JSON (${res.status}). ${preview}`);
  }
  try {
    return JSON.parse(bodyText) as T;
  } catch (err) {
    throw new Error(`${label}: JSON invalido (${String(err)})`);
  }
}

function composerAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("studio_token") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function estimateBlockHeight(block: ComposerBlock): number {
  switch (block.type) {
    case "hero_title":
      return block.variant === "full" ? 126 : 108;
    case "context_deck":
      return block.variant === "expanded" ? 118 : 82;
    case "guide_question":
      return 42;
    case "comparison_panel":
      return 240;
    case "diagram_panel":
      return block.variant === "multi_step" ? 224 : 208;
    case "decision_tree":
      return 214;
    case "map_panel":
      return 198;
    case "exam_traps":
      return block.variant === "compact" ? 120 : 154;
    case "autocheck":
      return block.variant === "short" ? 124 : 162;
    case "exam_signal":
      return 90;
    default:
      return block.minHeight;
  }
}

function computeSpacePlan(blocks: ComposerBlock[]) {
  const introHeight = blocks
    .filter((block) => ["hero_title", "context_deck", "guide_question"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const technicalHeight = blocks
    .filter((block) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const examHeight = blocks
    .filter((block) => ["exam_traps", "autocheck", "exam_signal"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const total = Math.max(1, introHeight + technicalHeight + examHeight);
  const technicalShare = Math.round((technicalHeight / total) * 100);
  const examShare = Math.round((examHeight / total) * 100);
  const introShare = Math.round((introHeight / total) * 100);
  const railMode = examShare >= 31 ? "compactar" : examShare <= 24 ? "estable" : "vigilar";
  const visualPressure = technicalShare >= 46 ? "fuerte" : technicalShare >= 39 ? "correcta" : "timida";
  const guidance =
    railMode === "compactar"
      ? "El rail inferior esta absorbiendo demasiada altura: conviene compactar traps o pasar autocheck a short."
      : visualPressure === "timida"
        ? "El cuerpo central aun no domina la pagina: conviene ampliar bloque tecnico o reducir chrome editorial."
        : "La pagina tiene un reparto de espacio razonable para seguir refinando detalles.";

  return { introHeight, technicalHeight, examHeight, introShare, technicalShare, examShare, railMode, visualPressure, guidance };
}

function applyPresetToBlocks(presetId: ComposerPresetId, blocks: ComposerBlock[]): ComposerBlock[] {
  const ordered = normalizePriorities([...blocks].sort((a, b) => a.priority - b.priority));

  if (presetId === "rail_compact") {
    return ordered.map((block) => {
      if (block.type === "exam_traps") return { ...block, variant: "compact" };
      if (block.type === "autocheck") return { ...block, variant: "short" };
      if (block.type === "context_deck") return { ...block, variant: "expanded" };
      return block;
    });
  }

  if (presetId === "comparison_dominant") {
    const next = ordered.map((block) => {
      if (block.type === "comparison_panel") return { ...block, variant: "sku_matrix" };
      if (block.type === "decision_tree") return { ...block, variant: "multi_branch" };
      if (block.type === "diagram_panel" && block.variant !== "multi_step") return { ...block, variant: "multi_step" };
      if (block.type === "exam_traps") return { ...block, variant: "compact" };
      return block;
    });
    return normalizePriorities(next);
  }

  // premium_balanced
  const balanced = ordered.map((block) => {
    if (block.type === "context_deck") return { ...block, variant: "expanded" };
    if (block.type === "guide_question") return { ...block, variant: "editorial_bar" };
    if (block.type === "diagram_panel") return { ...block, variant: "two_column" };
    if (block.type === "comparison_panel") return { ...block, variant: "sku_matrix" };
    if (block.type === "exam_traps") return { ...block, variant: "compact" };
    if (block.type === "autocheck") return { ...block, variant: "short" };
    return block;
  });
  return normalizePriorities(balanced);
}

function normalizePriorities(blocks: ComposerBlock[]): ComposerBlock[] {
  return blocks.map((block, index) => ({ ...block, priority: (index + 1) * 10 }));
}

function roundToOne(value: number): number {
  return Number(value.toFixed(1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function recalculateDraft(draft: ComposerProposal["draft"]): ComposerProposal["draft"] {
  const blocks = normalizePriorities([...draft.blocks].sort((a, b) => a.priority - b.priority));
  const technicalCoreCount = blocks.filter((block) => TECHNICAL_BLOCK_TYPES.includes(block.type)).length;
  const technicalCore = technicalCoreCount >= 2;
  const examSignals = blocks.some((block) => block.type === "exam_traps" || block.type === "exam_signal");
  const validationPresent = blocks.filter((block) => block.type === "autocheck").length === 1;

  const missing: string[] = [];
  if (!blocks.some((block) => block.type === "hero_title")) missing.push("Falta un bloque Hero.");
  if (blocks.filter((block) => block.type === "guide_question").length !== 1) missing.push("La pagina debe tener exactamente una pregunta guia.");
  if (technicalCoreCount < 2) missing.push("El nucleo tecnico requiere al menos dos bloques visuales.");
  if (!validationPresent) missing.push("La pagina debe tener exactamente un bloque de autocheck.");

  const warnings: string[] = [];
  const spacePlan = computeSpacePlan(blocks);
  if (spacePlan.examShare >= 33) warnings.push("El rail inferior esta pesado: conviene compactar traps/autocheck.");
  if (spacePlan.technicalShare < 40) warnings.push("El cuerpo visual tecnico aun se ve timido.");
  if (blocks.filter((block) => block.type === "exam_signal").length > 1) warnings.push("Hay mas de una senal de examen; revisar saturacion.");

  const weakAreas: string[] = [];
  if (!technicalCore) weakAreas.push("El nucleo tecnico no domina la pagina.");
  if (!examSignals) weakAreas.push("No hay senal de examen explicita.");
  if (!validationPresent) weakAreas.push("Falta cierre de validacion final.");

  const compactExam = blocks.some((block) => block.type === "exam_traps" && block.variant === "compact")
    && blocks.some((block) => block.type === "autocheck" && block.variant === "short");
  const hasExpandedContext = blocks.some((block) => block.type === "context_deck" && block.variant === "expanded");
  const hasExamSignal = blocks.some((block) => block.type === "exam_signal");

  const coverageScore = clamp(7.1 + technicalCoreCount * 0.75 + (validationPresent ? 0.4 : 0), 6.8, 9.8);
  const readabilityScore = clamp(7.6 + (hasExpandedContext ? 0.5 : 0.2) + (compactExam ? 0.35 : 0), 6.8, 9.6);
  const usefulDensityScore = clamp(7.4 + (spacePlan.technicalShare >= 44 ? 0.7 : 0.2) + (compactExam ? 0.55 : 0), 6.8, 9.7);
  const examUtilityScore = clamp(7.7 + (hasExamSignal ? 0.8 : 0.2) + (validationPresent ? 0.5 : 0), 6.8, 9.8);
  const consistencyScore = clamp(7.8 + (missing.length === 0 ? 0.55 : 0) + (warnings.length <= 1 ? 0.35 : 0), 6.8, 9.7);
  const total = roundToOne((coverageScore + readabilityScore + usefulDensityScore + examUtilityScore + consistencyScore) / 5);

  return {
    ...draft,
    blocks,
    coverage: {
      technicalCore,
      examSignals,
      validationPresent,
      weakAreas,
    },
    structuralValidation: {
      passed: missing.length === 0,
      missing,
      warnings,
    },
    editorialValidation: {
      coverageScore: roundToOne(coverageScore),
      readabilityScore: roundToOne(readabilityScore),
      usefulDensityScore: roundToOne(usefulDensityScore),
      examUtilityScore: roundToOne(examUtilityScore),
      consistencyScore: roundToOne(consistencyScore),
      total,
    },
  };
}

function nextVariantForBlock(block: ComposerBlock): ComposerBlock {
  const variants = BLOCK_VARIANTS[block.type];
  if (!variants || variants.length < 2) return block;
  const currentIndex = variants.indexOf(block.variant);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % variants.length : 0;
  return { ...block, variant: variants[nextIndex] };
}

function buildProjectedQaScores(draft: ComposerProposal["draft"], lockedTechnicalAccuracy: number | null) {
  const density = draft.editorialValidation.usefulDensityScore;
  const readability = draft.editorialValidation.readabilityScore;
  const consistency = draft.editorialValidation.consistencyScore;
  const utility = draft.editorialValidation.examUtilityScore;
  const coverage = draft.editorialValidation.coverageScore;
  const technicalAccuracy = lockedTechnicalAccuracy != null
    ? lockedTechnicalAccuracy
    : 8.7;

  const scores = {
    art_direction: Number(Math.min(10, Math.max(6.8, (coverage + consistency) / 2)).toFixed(1)),
    editorial_consistency: Number(consistency.toFixed(1)),
    readability: Number(readability.toFixed(1)),
    technical_accuracy: Number(technicalAccuracy.toFixed(1)),
    useful_density: Number(density.toFixed(1)),
    commercial_risk: Number(Math.min(10, Math.max(6.8, (coverage + utility) / 2)).toFixed(1)),
  };
  const total = Number(
    (
      (scores.art_direction
        + scores.editorial_consistency
        + scores.readability
        + scores.technical_accuracy
        + scores.useful_density
        + scores.commercial_risk) / 6
    ).toFixed(1),
  );
  return { ...scores, total };
}

function blockAccent(type: ComposerBlock["type"]) {
  switch (type) {
    case "hero_title":
      return "from-slate-400/80 to-slate-500/50";
    case "context_deck":
      return "from-blue-400/80 to-cyan-400/50";
    case "guide_question":
      return "from-blue-500/80 to-sky-400/50";
    case "comparison_panel":
      return "from-violet-400/80 to-fuchsia-400/50";
    case "diagram_panel":
      return "from-blue-500/80 to-indigo-400/50";
    case "decision_tree":
      return "from-amber-400/80 to-orange-400/50";
    case "map_panel":
      return "from-teal-400/80 to-cyan-400/50";
    case "exam_traps":
      return "from-rose-400/80 to-red-400/50";
    case "autocheck":
      return "from-emerald-400/80 to-green-400/50";
    case "exam_signal":
      return "from-yellow-400/80 to-amber-400/50";
    default:
      return "from-slate-400/80 to-slate-500/50";
  }
}

const LOCKED_DIM_LABELS: Array<{ key: string; label: string }> = [
  { key: "art_direction", label: "Direccion de arte" },
  { key: "editorial_consistency", label: "Consistencia editorial" },
  { key: "readability", label: "Legibilidad" },
  { key: "technical_accuracy", label: "Precision tecnica" },
  { key: "useful_density", label: "Densidad util" },
  { key: "commercial_risk", label: "Seguridad comercial" },
];

function scoreFromLockedDim(key: string, value: number): string {
  if (value >= 9) return `${key}: mantener linea actual y consolidar.`;
  if (value >= 8) return `${key}: pequenos ajustes para empujar a rango premium.`;
  if (value >= 7) return `${key}: hay mejora visible posible en la siguiente iteracion.`;
  return `${key}: requiere intervencion editorial prioritaria.`;
}

function formatLogTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function lockedActionHint(key: string): string {
  switch (key) {
    case "art_direction":
      return "Reforzar jerarquia visual y protagonismo del nucleo tecnico.";
    case "editorial_consistency":
      return "Unificar familia de iconos y grosor de bordes en todos los modulos.";
    case "readability":
      return "Reducir microtexto y aumentar tamano util de labels internos.";
    case "technical_accuracy":
      return "Refrescar grounding puntual de este tema antes de regenerar.";
    case "useful_density":
      return "Compactar rail inferior y mover carga util al bloque visual central.";
    case "commercial_risk":
      return "Eliminar rasgos escolares y sostener acabado premium consistente.";
    default:
      return "Aplicar ajuste editorial dirigido en la proxima regeneracion.";
  }
}

function derivePostRenderRemediation(
  report: StudioQaReport | null,
  technicalBlockCount: number,
  qaAlignmentState: string,
): PostRenderRemediation {
  const evidence = report?.layoutEvidence;
  if (!report) {
    return {
      available: false,
      severity: "warning",
      label: "Sin QA real",
      reason: "Todavia no hay lectura QA consolidada para convertir el Composer en una accion verificable.",
      actionLabel: "Sincronizar QA",
      syncOnly: true,
      evidenceItems: ["Genera la pagina y refresca QA antes de tomar una decision editorial final."],
    };
  }

  const engine = report.layoutEngine;
  if (engine?.primaryAction) {
    const visual = report.visualMeasurement;
    const visualEvidenceItems = visual?.available
      ? [
          `Visual real: ${visual.score.toFixed(1)}/10, overflow ${visual.overflow.count}, microtexto ${visual.typography.smallTextCount}.`,
          `Rail real: ${visual.zoneUsage.exam_rail?.freeBottomPx ?? "-"}px libres; upper ${visual.zoneUsage.upper_visual?.occupancyPct ?? "-"}% ocupado.`,
        ]
      : visual
        ? [`Visual real: no disponible (${visual.note}).`]
        : [];
    const actionId = engine.primaryAction.id;
    const shortcutAction: ShortcutAction | undefined =
      actionId === "boost_technical_core"
        ? "boost_technical"
        : actionId === "compact_exam_rail"
          ? "compact_rail"
          : actionId === "expand_context"
            ? "expand_context"
            : actionId === "approve_candidate"
              ? undefined
              : undefined;
    const scope: ComposerRegenerationScope | undefined =
      engine.primaryAction.scope === "technical_core" || engine.primaryAction.scope === "exam_rail" || engine.primaryAction.scope === "full"
        ? engine.primaryAction.scope
        : undefined;
    return {
      available: true,
      severity: engine.readiness === "blocked" ? "critical" : engine.readiness === "approved_candidate" ? "success" : "warning",
      label: engine.primaryAction.label,
      reason: engine.primaryAction.reason,
      actionLabel: engine.primaryAction.id === "approve_candidate" || engine.primaryAction.id === "human_visual_review"
        ? "Abrir QA final"
        : engine.primaryAction.label,
      shortcutAction,
      scope,
      objectiveId: engine.primaryAction.id === "compact_exam_rail"
        ? "compact_exam_rail"
        : engine.primaryAction.id === "boost_technical_core" || engine.primaryAction.id === "expand_context"
          ? "fill_density"
          : engine.primaryAction.id === "approve_candidate" || engine.primaryAction.id === "human_visual_review"
            ? undefined
            : "qa_lock",
      evidenceItems: [
        `Motor layout: ${engine.score.toFixed(1)}/10 (${engine.readiness}).`,
        `Batch: ${engine.batchGate.canBatch ? "habilitado" : "bloqueado"} - ${engine.batchGate.reason}`,
        ...visualEvidenceItems,
        engine.primaryAction.expectedImpact,
      ],
    };
  }

  const visual = report.visualMeasurement;
  if (visual?.available) {
    const visualItems = [
      `Visual real: ${visual.score.toFixed(1)}/10; canvas ${visual.page.width}x${visual.page.height}.`,
      `Overflow: ${visual.overflow.count}; microtexto: ${visual.typography.smallTextCount}; rail libre: ${visual.zoneUsage.exam_rail?.freeBottomPx ?? "-"}px.`,
    ];
    if (visual.blockers.length > 0) {
      return {
        available: true,
        severity: "critical",
        label: "Bloqueo visual real",
        reason: visual.blockers[0],
        actionLabel: "Regenerar pagina completa",
        scope: "full",
        objectiveId: "qa_lock",
        evidenceItems: [...visualItems, ...visual.blockers.slice(0, 2)],
      };
    }
    if (visual.typography.smallTextCount > 0 || visual.overflow.count > 0) {
      return {
        available: true,
        severity: "warning",
        label: "Ajuste visual medido",
        reason: visual.warnings[0] ?? "La captura real detecto detalles visuales que no aparecen en el QA estructural.",
        actionLabel: "Reforzar nucleo tecnico",
        shortcutAction: "boost_technical",
        scope: "technical_core",
        objectiveId: "fill_density",
        evidenceItems: visualItems,
      };
    }
  }

  if (!evidence) {
    return {
      available: false,
      severity: "warning",
      label: "Falta evidencia post-render",
      reason: "El QA existe, pero no trae mediciones del HTML final; sin eso el Composer vuelve a operar por intuicion.",
      actionLabel: "Sincronizar QA",
      syncOnly: true,
      evidenceItems: ["Refresca QA o regenera la pagina para capturar upper, rail y zonas reales."],
    };
  }

  const evidenceItems = [
    `Upper: ${evidence.upper.rowHeight}px, aire ${evidence.upper.freeVerticalPx}px, uso ${evidence.upper.imageSlotSharePct}%.`,
    `Rail: ${evidence.examRail.rowHeight}px, ${evidence.examRail.sharePct}% del cuerpo, densidad ${evidence.examRail.densityBand}.`,
    `Layout score: ${evidence.score.toFixed(1)}/10.`,
  ];

  if (evidence.blockers.length > 0) {
    return {
      available: true,
      severity: "critical",
      label: "Bloqueo estructural real",
      reason: evidence.blockers[0],
      actionLabel: "Regenerar pagina completa",
      scope: "full",
      objectiveId: "qa_lock",
      evidenceItems: [...evidenceItems, ...evidence.blockers.slice(0, 2)],
    };
  }

  if (evidence.upper.freeVerticalPx > 92 || evidence.upper.imageSlotSharePct < 78) {
    return {
      available: true,
      severity: "warning",
      label: "Upper visual subutilizado",
      reason: "La composicion central no esta usando suficiente altura disponible; el cuerpo visual queda timido y aparecen huecos.",
      actionLabel: "Reforzar nucleo tecnico",
      shortcutAction: "boost_technical",
      scope: "technical_core",
      objectiveId: "fill_density",
      evidenceItems,
    };
  }

  if (technicalBlockCount < 4) {
    return {
      available: true,
      severity: "warning",
      label: "Nucleo tecnico incompleto",
      reason: `El Composer tiene ${technicalBlockCount}/4 bloques tecnicos; falta estructura visual suficiente para una pagina premium.`,
      actionLabel: "Estructura 4 tarjetas",
      shortcutAction: "enforce_four_cards",
      scope: "technical_core",
      objectiveId: "fill_density",
      evidenceItems,
    };
  }

  if (evidence.examRail.rowHeight > 225 || evidence.examRail.sharePct > 28 || evidence.examRail.densityBand === "thin") {
    return {
      available: true,
      severity: "warning",
      label: "Rail inferior mal aprovechado",
      reason: "Trampas/autocheck ocupan demasiado plano para la densidad que aportan; conviene compactar o enriquecer sin agrandar.",
      actionLabel: "Compactar rail inferior",
      shortcutAction: "compact_rail",
      scope: "exam_rail",
      objectiveId: "compact_exam_rail",
      evidenceItems,
    };
  }

  if (qaAlignmentState !== "aligned") {
    return {
      available: true,
      severity: "warning",
      label: "Composer no consolidado",
      reason: "El draft o la proyeccion no estan alineados con el QA servidor; falta una corrida real antes de confiar en el score.",
      actionLabel: "Generar desde draft",
      scope: "full",
      objectiveId: "qa_lock",
      evidenceItems,
    };
  }

  if (evidence.score < 9) {
    return {
      available: true,
      severity: "warning",
      label: "Calidad post-render insuficiente",
      reason: "La pagina no esta bloqueada, pero la evidencia real todavia no alcanza el umbral editorial premium.",
      actionLabel: "Autocorregir premium",
      objectiveId: "qa_lock",
      evidenceItems,
    };
  }

  return {
    available: true,
    severity: "success",
    label: "Post-render estable",
    reason: "La evidencia del HTML final no muestra huecos criticos ni bloqueos estructurales.",
    actionLabel: "Abrir QA final",
    evidenceItems,
  };
}

function inferFamilyFromPage(page: StudioCatalogPage): ComposerProposal["draft"]["family"] {
  const text = `${page.title} ${page.domain} ${page.context} ${page.guideQuestion}`.toLowerCase();
  if (/(tier|sku|compar|replic)/.test(text)) return "comparison";
  if (/(identity|identidad|token|rol|managed identity|service principal)/.test(text)) return "decision";
  if (/(dns|network|firewall|private endpoint|vnet|red)/.test(text)) return "coverage_map";
  if (/(retention|cleanup|policy|lifecycle|task|limpieza|ciclo)/.test(text)) return "lifecycle";
  return "architecture";
}

function makeBlock(
  type: ComposerBlock["type"],
  variant: ComposerBlock["variant"],
  priority: number,
  content: Record<string, unknown>,
): ComposerBlock {
  const defaults: Record<ComposerBlock["type"], { minHeight: number; maxHeight: number; required: boolean }> = {
    hero_title: { minHeight: 88, maxHeight: 148, required: true },
    context_deck: { minHeight: 68, maxHeight: 132, required: true },
    guide_question: { minHeight: 34, maxHeight: 56, required: true },
    diagram_panel: { minHeight: 180, maxHeight: 360, required: false },
    comparison_panel: { minHeight: 160, maxHeight: 340, required: false },
    decision_tree: { minHeight: 160, maxHeight: 340, required: false },
    map_panel: { minHeight: 150, maxHeight: 320, required: false },
    exam_traps: { minHeight: 96, maxHeight: 200, required: true },
    autocheck: { minHeight: 96, maxHeight: 220, required: true },
    exam_signal: { minHeight: 70, maxHeight: 150, required: false },
  };

  return {
    id: `${type}:${priority}`,
    type,
    variant,
    priority,
    required: defaults[type].required,
    minHeight: defaults[type].minHeight,
    maxHeight: defaults[type].maxHeight,
    content,
  };
}

function buildClientProposal(page: StudioCatalogPage): ComposerProposal {
  const family = inferFamilyFromPage(page);
  const modules = page.visualModules;

  const commonIntro: ComposerBlock[] = [
    makeBlock("hero_title", "full", 10, { title: page.title, subtitle: page.domain }),
    makeBlock("context_deck", page.context.length > 240 ? "short" : "expanded", 20, { context: page.context }),
    makeBlock("guide_question", "editorial_bar", 30, { question: page.guideQuestion }),
  ];

  const examTail: ComposerBlock[] = [
    makeBlock("exam_traps", page.traps.length >= 3 ? "compact" : "standard", 80, {
      traps: page.traps.slice(0, 3),
    }),
    makeBlock("autocheck", page.autocheck.discardNotes.length > 2 ? "short" : "full", 90, {
      question: page.autocheck.question,
      options: page.autocheck.options,
      correctOption: page.autocheck.correctOption,
      explanation: page.autocheck.explanation,
      discardNotes: page.autocheck.discardNotes.slice(0, 2),
    }),
  ];

  let blocks: ComposerBlock[] = [];
  switch (family) {
    case "comparison":
      blocks = [
        ...commonIntro,
        makeBlock("comparison_panel", "sku_matrix", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "two_column", 50, { modules: modules.slice(0, 2) }),
        makeBlock("map_panel", "replication_path", 60, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "rule", 70, {
          message: "Las senales de examen pesan mas que el nombre del SKU cuando hay geo-replicacion o acceso privado.",
        }),
        ...examTail,
      ];
      break;
    case "decision":
      blocks = [
        ...commonIntro,
        makeBlock("decision_tree", "multi_branch", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "single_focus", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "warning", 70, {
          message: "En examen, elegir identidad o permiso equivocado rompe el flujo aunque ACR este bien configurado.",
        }),
        ...examTail,
      ];
      break;
    case "coverage_map":
      blocks = [
        ...commonIntro,
        makeBlock("map_panel", "network_boundary", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "multi_step", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "memory_hook", 70, {
          message: "Si el acceso falla, piensa primero en conectividad, DNS y boundary de red antes que en permisos de imagen.",
        }),
        ...examTail,
      ];
      break;
    case "lifecycle":
      blocks = [
        ...commonIntro,
        makeBlock("diagram_panel", "multi_step", 40, { modules: modules.slice(0, 2) }),
        makeBlock("decision_tree", "binary_path", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "rule", 70, {
          message: "Politica, limpieza y automatizacion deben leerse como un ciclo operativo, no como features aisladas.",
        }),
        ...examTail,
      ];
      break;
    case "architecture":
    default:
      blocks = [
        ...commonIntro,
        makeBlock("diagram_panel", "two_column", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "multi_step", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "memory_hook", 70, {
          message: "El lector debe recordar el flujo principal y la senal de examen, no solo los nombres de los servicios.",
        }),
        ...examTail,
      ];
      break;
  }

  const technicalCore = blocks.some((b) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(b.type));
  const examSignals = blocks.some((b) => b.type === "exam_traps" || b.type === "exam_signal");
  const validationPresent = blocks.some((b) => b.type === "autocheck");
  const technicalCoreCount = blocks.filter((b) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(b.type)).length;
  const missing: string[] = [];
  if (!blocks.some((b) => b.type === "hero_title" || b.type === "context_deck")) missing.push("Falta un bloque de apertura.");
  if (blocks.filter((b) => b.type === "guide_question").length !== 1) missing.push("La pagina debe tener exactamente una pregunta guia.");
  if (technicalCoreCount < 2) missing.push("Faltan bloques tecnicos centrales.");
  if (blocks.filter((b) => b.type === "autocheck").length !== 1) missing.push("La pagina debe tener exactamente un bloque de autocheck.");

  const warnings: string[] = [];
  if (blocks.some((b) => b.type === "exam_traps" && b.variant === "standard")) {
    warnings.push("Evalua compactar trampas si el cuerpo visual necesita mas respiracion.");
  }

  const weakAreas: string[] = [];
  if (!technicalCore) weakAreas.push("La composicion aun no explica el nucleo tecnico.");
  if (!examSignals) weakAreas.push("La pagina no deja una senal clara de examen.");
  if (!validationPresent) weakAreas.push("Falta validacion para cerrar la lectura.");

  const coverageScore = technicalCoreCount >= 2 ? 9 : 7;
  const readabilityScore = blocks.some((b) => b.type === "autocheck" && b.variant === "short") ? 8.8 : 8.2;
  const usefulDensityScore = blocks.some((b) => b.type === "exam_traps" && b.variant === "compact") ? 9 : 8;
  const examUtilityScore = blocks.some((b) => b.type === "exam_signal") ? 9.2 : 8.4;
  const consistencyScore = family === "comparison" || family === "architecture" ? 8.8 : 8.5;
  const total = Number(((coverageScore + readabilityScore + usefulDensityScore + examUtilityScore + consistencyScore) / 5).toFixed(1));
  const structuralLevel = family === "comparison" && (page.context.length > 260 || page.autocheck.discardNotes.length > 2);

  return {
    source: "api_visual_atlas_composer_v1",
    pageId: page.pageId,
    lockedReference: {
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      contractId: page.contractVersion,
      title: page.title,
      domain: page.domain,
      preservedZones: ["hero title", "context deck", "guide question", "upper visual", "exam traps", "autocheck", "footer"],
    },
    recommendedTransition: {
      level: structuralLevel ? "composer_structural" : "composer_minor",
      reason: structuralLevel
        ? "La pagina pide reequilibrar cuerpo visual y rail inferior sin perder cobertura de examen."
        : "La transicion sirve para ajustar densidad, variantes y respiracion sin reescribir la pagina completa.",
      unlockedCapabilities: structuralLevel
        ? ["Compactar rail inferior", "Cambiar variantes de comparacion y mapa", "Anadir o quitar una senal de examen"]
        : ["Compactar traps y autocheck", "Expandir contexto", "Cambiar variante de pregunta guia"],
      blockedCapabilities: structuralLevel
        ? ["Romper minimos de cobertura", "Quitar pregunta guia"]
        : ["Eliminar nucleo tecnico", "Quitar validacion final"],
    },
    draft: {
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      mode: "composer",
      family,
      blocks,
      coverage: {
        technicalCore,
        examSignals,
        validationPresent,
        weakAreas,
      },
      structuralValidation: {
        passed: missing.length === 0,
        missing,
        warnings,
      },
      editorialValidation: {
        coverageScore,
        readabilityScore,
        usefulDensityScore,
        examUtilityScore,
        consistencyScore,
        total,
      },
    },
    nextActions: [
      "Comparar esta propuesta contra la referencia locked.",
      "Validar si el rail inferior debe ir en modo compacto o estandar.",
      "Revisar si el nucleo tecnico necesita comparacion, decision o mapa como bloque dominante.",
    ],
  };
}

export default function ComposerPage() {
  const [, params] = useRoute("/composer/:id");
  const [, setLocation] = useLocation();
  const pageIdFromRoute = params?.id ? String(parseInt(params.id, 10)).padStart(2, "0") : "01";

  const [studioCatalog, setStudioCatalog] = useState<StudioCatalog | null>(null);
  const [proposal, setProposal] = useState<ComposerProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [draftRecord, setDraftRecord] = useState<ComposerDraftRecord | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lockedStatus, setLockedStatus] = useState<StudioOutputStatus | null>(null);
  const [lockedQa, setLockedQa] = useState<StudioQaReport | null>(null);
  const [editableDraft, setEditableDraft] = useState<ComposerProposal["draft"] | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<"draft" | "real">("draft");
  const [focusMode, setFocusMode] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [generatingFromComposer, setGeneratingFromComposer] = useState(false);
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [syncingServerState, setSyncingServerState] = useState(false);
  const [lastServerSyncAt, setLastServerSyncAt] = useState<string | null>(null);
  const [serverSyncMessage, setServerSyncMessage] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchPageInput, setBatchPageInput] = useState("01,02,03,04,05");
  const [batchStarting, setBatchStarting] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [batchRunId, setBatchRunId] = useState<string | null>(null);
  const [batchStatus, setBatchStatus] = useState<ComposerBatchRunStatus | null>(null);
  const [batchRefreshing, setBatchRefreshing] = useState(false);
  const [batchRetrying, setBatchRetrying] = useState(false);
  const [qaDelta, setQaDelta] = useState<{ before: number | null; after: number | null; delta: number | null } | null>(null);
  const [autofixFeedback, setAutofixFeedback] = useState<string | null>(null);
  const [quickActionBusy, setQuickActionBusy] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);
  const [lastShortcutSnapshot, setLastShortcutSnapshot] = useState<ComposerProposal["draft"] | null>(null);
  const [lastShortcutLabel, setLastShortcutLabel] = useState<string | null>(null);
  const [actionLogs, setActionLogs] = useState<ComposerActionLog[]>([]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editorialReadOpen, setEditorialReadOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [alignmentOpen, setAlignmentOpen] = useState(true);
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [composerActionsOpen, setComposerActionsOpen] = useState(true);

  function pushActionLog(entry: Omit<ComposerActionLogRecord, "id" | "pageId" | "userName" | "createdAt">) {
    const optimisticId = `local-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const optimistic: ComposerActionLog = {
      ...entry,
      id: optimisticId,
      pageId: pageIdFromRoute,
      userName: "Tu sesion",
      createdAt: new Date().toISOString(),
      pendingSync: true,
    };

    setActionLogs((current) => [optimistic, ...current].slice(0, 24));

    void saveComposerActionLog(pageIdFromRoute, entry)
      .then((saved) => {
        setActionLogs((current) => {
          const replaced = current.map((log) => (log.id === optimisticId ? saved : log));
          return replaced.slice(0, 24);
        });
      })
      .catch(() => {
        setActionLogs((current) => current.map((log) => (
          log.id === optimisticId
            ? {
                ...log,
                pendingSync: false,
                note: log.note.includes("pendiente de sync") ? log.note : `${log.note} (pendiente de sync API)`,
              }
            : log
        )));
      });
  }

  useEffect(() => {
    let mounted = true;
    fetchStudioCatalog()
      .then((studioData) => {
        if (!mounted) return;
        setStudioCatalog(studioData);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchComposerProposal(pageIdFromRoute)
      .then((data) => {
        if (!mounted) return;
        setProposal(data);
        setEditableDraft(recalculateDraft(data.draft));
      })
      .catch((err) => {
        if (!mounted) return;
        const fallbackPage = studioCatalog?.pages.find((page) => page.pageId === pageIdFromRoute);
        if (fallbackPage) {
          const fallbackProposal = buildClientProposal(fallbackPage);
          setProposal(fallbackProposal);
          setEditableDraft(recalculateDraft(fallbackProposal.draft));
          setError("La ruta Composer del API aun no esta disponible en este runtime. Se mostro una propuesta local equivalente para no frenar la evaluacion editorial.");
        } else {
          setError(err instanceof Error ? err.message : String(err));
          setProposal(null);
          setEditableDraft(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute, studioCatalog]);

  useEffect(() => {
    let mounted = true;
    setSaveMessage(null);
    setDraftRecord(null);
    fetchComposerDraft(pageIdFromRoute)
      .then((record) => {
        if (!mounted) return;
        setDraftRecord(record);
        if (record?.draft) {
          setEditableDraft(recalculateDraft(record.draft));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setDraftRecord(null);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute]);

  useEffect(() => {
    let mounted = true;
    fetchComposerActionLogs(pageIdFromRoute, 24)
      .then((logs) => {
        if (!mounted) return;
        setActionLogs(logs);
      })
      .catch(() => {
        if (!mounted) return;
        setActionLogs([]);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute]);

  async function refreshLockedArtifacts(targetPageId: string) {
    const [status, qa] = await Promise.all([
      fetchStudioOutputStatus(targetPageId),
      fetchStudioQaReport(targetPageId),
    ]);
    setLockedStatus(status);
    setLockedQa(qa);
  }

  const syncComposerWithServerQa = useCallback(
    async (mode: "silent" | "manual" = "silent") => {
      if (mode === "manual") {
        setSyncingServerState(true);
        setServerSyncMessage(null);
      }
      try {
        const [status, qa, logs] = await Promise.all([
          fetchStudioOutputStatus(pageIdFromRoute),
          fetchStudioQaReport(pageIdFromRoute),
          fetchComposerActionLogs(pageIdFromRoute, 24),
        ]);
        setLockedStatus(status);
        setLockedQa(qa);
        setActionLogs(logs);
        setLastServerSyncAt(new Date().toISOString());
        if (mode === "manual") {
          setServerSyncMessage("Composer sincronizado con estado QA del servidor.");
        }
      } catch (err) {
        if (mode === "manual") {
          setServerSyncMessage(err instanceof Error ? err.message : "No se pudo sincronizar con servidor.");
        }
      } finally {
        if (mode === "manual") {
          setSyncingServerState(false);
        }
      }
    },
    [pageIdFromRoute],
  );

  useEffect(() => {
    let mounted = true;
    setLockedStatus(null);
    setLockedQa(null);
    Promise.all([
      fetchStudioOutputStatus(pageIdFromRoute),
      fetchStudioQaReport(pageIdFromRoute),
    ])
      .then(([status, qa]) => {
        if (!mounted) return;
        setLockedStatus(status);
        setLockedQa(qa);
        setLastServerSyncAt(new Date().toISOString());
      })
      .catch(() => {
        if (!mounted) return;
        setLockedStatus(null);
        setLockedQa(null);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute]);

  useEffect(() => {
    const handleFocusSync = () => {
      void syncComposerWithServerQa("silent");
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncComposerWithServerQa("silent");
      }
    };
    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncComposerWithServerQa]);

  useEffect(() => {
    if (!batchRunId) return;
    void refreshBatchStatus(batchRunId, "silent");
    const timer = window.setInterval(() => {
      void refreshBatchStatus(batchRunId, "silent");
    }, 5000);
    return () => window.clearInterval(timer);
  }, [batchRunId]);

  useEffect(() => {
    setGenerationFeedback(null);
    setPipelineBusy(false);
    setQaDelta(null);
    setAutofixFeedback(null);
    setQuickActionBusy(null);
    setQuickActionFeedback(null);
    setLastShortcutSnapshot(null);
    setLastShortcutLabel(null);
    setActionLogs([]);
    setActionsOpen(false);
    setEditorialReadOpen(false);
    setTransitionOpen(false);
    setAlignmentOpen(true);
    setBaselineOpen(false);
    setComposerActionsOpen(true);
    setServerSyncMessage(null);
    setLastServerSyncAt(null);
    setSyncingServerState(false);
    setBatchRunId(null);
    setBatchStatus(null);
    setBatchMessage(null);
    setBatchRefreshing(false);
    setBatchRetrying(false);
  }, [pageIdFromRoute]);

  const pageSummary = useMemo(() => {
    return studioCatalog?.pages.find((page) => page.pageId === pageIdFromRoute) ?? studioCatalog?.pages[0] ?? null;
  }, [studioCatalog, pageIdFromRoute]);

  const spacePlan = useMemo(() => (editableDraft ? computeSpacePlan(editableDraft.blocks) : null), [editableDraft]);
  const lockedTotal = lockedQa?.scores?.total == null ? null : normalizeQaScoreToTen(lockedQa.scores.total);
  const lockedGap = lockedTotal != null ? Math.max(0, 9.5 - lockedTotal) : null;
  const projectedQaScores = useMemo(
    () => {
      if (!editableDraft) return null;
      const lockedTechnicalAccuracy = lockedQa?.scores?.technical_accuracy;
      return buildProjectedQaScores(
        editableDraft,
        lockedTechnicalAccuracy == null ? null : normalizeQaScoreToTen(lockedTechnicalAccuracy),
      );
    },
    [editableDraft, lockedQa],
  );
  const qaResolution = useMemo(
    () => resolveQaScoreSource({
      serverScores: lockedQa?.scores ?? null,
      composerScores: projectedQaScores,
      generatedAt: lockedStatus?.generatedAt ?? null,
      composerUpdatedAt: draftRecord?.updatedAt ?? null,
    }),
    [lockedQa?.scores, projectedQaScores, lockedStatus?.generatedAt, draftRecord?.updatedAt],
  );
  const serverQaTotal = qaResolution.serverTotal;
  const composerQaTotal = qaResolution.composerTotal ?? projectedQaScores?.total ?? null;
  const activeQaTotal = qaResolution.activeScores?.total ?? null;
  const activeGapToTarget = activeQaTotal != null ? Math.max(0, 9.5 - activeQaTotal) : null;
  const qaAlignmentState = qaResolution.source === "server"
    ? "aligned"
    : qaResolution.hasDivergence
      ? "pending_regeneration"
      : "projection_only";
  const lockedGeneratedMs = lockedStatus?.generatedAt ? Date.parse(lockedStatus.generatedAt) : NaN;
  const draftUpdatedMs = draftRecord?.updatedAt ? Date.parse(draftRecord.updatedAt) : NaN;
  const hasFreshDraftVsOutput =
    Number.isFinite(draftUpdatedMs) && Number.isFinite(lockedGeneratedMs)
      ? draftUpdatedMs > lockedGeneratedMs
      : false;
  const hasComposerIntervention = actionLogs.some((log) =>
    log.kind === "shortcut" || log.kind === "autofix" || log.kind === "rollback",
  );
  const stepDraftAdjusted = hasComposerIntervention || hasFreshDraftVsOutput;
  const stepDraftSaved = Boolean(draftRecord?.updatedAt);
  const stepGenerated = Boolean(lockedStatus?.hasOutput);
  const stepQaReviewed = Boolean(lockedQa?.scores);
  const flowNextStep = !stepDraftAdjusted
    ? 1
    : !stepDraftSaved
      ? 2
      : !stepGenerated
        ? 3
        : !stepQaReviewed
          ? 4
          : 5;
  const flowCompletionPercent = Math.round(
    ([stepDraftAdjusted, stepDraftSaved, stepGenerated, stepQaReviewed].filter(Boolean).length / 4) * 100,
  );
  const flowStepDescriptor = flowNextStep === 1
    ? "Ajustar bloques en canvas"
    : flowNextStep === 2
      ? "Guardar draft"
      : flowNextStep === 3
        ? "Generar desde draft"
        : flowNextStep === 4
          ? "Revisar QA editorial"
          : "Flujo completo";
  const flowBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!stepDraftAdjusted) blockers.push("Todavia no hay ajuste compositivo aplicado en esta sesion.");
    if (!stepDraftSaved) blockers.push("Falta guardar el draft para congelar estado antes de generar.");
    if (!stepGenerated) blockers.push("Aun no existe output real generado desde el draft vigente.");
    if (!stepQaReviewed) blockers.push("QA editorial no tiene lectura consolidada para esta version.");
    return blockers;
  }, [stepDraftAdjusted, stepDraftSaved, stepGenerated, stepQaReviewed]);
  const qaHardGate = useMemo(() => {
    const blockers: string[] = [];
    const evidence = lockedQa?.layoutEvidence ?? null;
    if (qaAlignmentState !== "aligned") blockers.push("QA servidor y Composer no estan alineados todavia.");
    if (!stepGenerated) blockers.push("No hay output real confirmado para esta version.");
    if (!stepQaReviewed) blockers.push("QA oficial aun no consolido lectura para esta pagina.");
    if (lockedTotal == null) blockers.push("No existe score total de QA servidor.");
    if (lockedTotal != null && lockedTotal < 9.5) blockers.push(`Score QA servidor en ${lockedTotal.toFixed(1)}/10 (objetivo minimo 9.5).`);
    if (evidence?.blockers.length) blockers.push(`Bloqueo post-render: ${evidence.blockers[0]}`);
    if (evidence && evidence.score < 8.5) blockers.push(`Score post-render en ${evidence.score.toFixed(1)}/10; falta correccion compositiva.`);
    return {
      ready: blockers.length === 0,
      blockers,
    };
  }, [qaAlignmentState, stepGenerated, stepQaReviewed, lockedTotal, lockedQa]);
  const projectedGap = projectedQaScores ? Math.max(0, 9.5 - projectedQaScores.total) : null;
  const sortedBlocks = useMemo(
    () => (editableDraft?.blocks ?? []).slice().sort((a, b) => a.priority - b.priority),
    [editableDraft],
  );
  const realHtmlPreviewUrl = withCacheBust(lockedStatus?.htmlPath ?? null, lockedStatus?.generatedAt);
  const technicalBlockCount = useMemo(
    () => sortedBlocks.filter((block) => TECHNICAL_BLOCK_TYPES.includes(block.type)).length,
    [sortedBlocks],
  );
  const selectedBlock = useMemo(
    () => sortedBlocks.find((block) => block.id === selectedBlockId) ?? sortedBlocks[0] ?? null,
    [sortedBlocks, selectedBlockId],
  );
  const lockedWeakDims = useMemo(() => {
    if (!lockedQa?.scores) return [];
    return LOCKED_DIM_LABELS
      .map((dim) => ({ ...dim, value: normalizeQaScoreToTen(Number(lockedQa.scores[dim.key] ?? 0)) }))
      .filter((dim) => Number.isFinite(dim.value))
      .sort((a, b) => a.value - b.value)
      .slice(0, 3);
  }, [lockedQa]);
  const composerReadiness = useMemo(() => {
    const projectedTotal = projectedQaScores?.total ?? null;
    const lockedTotalScore = lockedQa?.scores?.total == null
      ? null
      : normalizeQaScoreToTen(lockedQa.scores.total);
    const hasRealOutput = lockedStatus?.hasOutput === true;
    const hasFourTechnical = technicalBlockCount >= 4;
    const targetReached = projectedTotal != null && projectedTotal >= 9.5;
    const serverAligned = lockedTotalScore != null && projectedTotal != null
      ? Math.abs(projectedTotal - lockedTotalScore) <= 0.1
      : false;

    return {
      projectedTotal,
      hasRealOutput,
      hasFourTechnical,
      targetReached,
      serverAligned,
      isReadyForPublish: hasRealOutput && targetReached && serverAligned,
    };
  }, [projectedQaScores, lockedQa, lockedStatus, technicalBlockCount]);
  const benchmark = useMemo(
    () => evaluateComposerBenchmark(sortedBlocks),
    [sortedBlocks],
  );
  const postRenderRemediation = useMemo(
    () => derivePostRenderRemediation(lockedQa, technicalBlockCount, qaAlignmentState),
    [lockedQa, technicalBlockCount, qaAlignmentState],
  );
  const recommendedShortcut = useMemo(() => {
    if (postRenderRemediation.shortcutAction) {
      return {
        action: postRenderRemediation.shortcutAction,
        label: postRenderRemediation.actionLabel,
        reason: postRenderRemediation.reason,
      };
    }
    const checks = new Map(benchmark.checks.map((check) => [check.id, check.passed]));
    if (!checks.get("technical-dominance")) {
      return { action: "enforce_four_cards" as ShortcutAction, label: "Estructura 4 tarjetas", reason: "el núcleo técnico todavía no domina la página" };
    }
    if (!checks.get("exam-rail-balance")) {
      return { action: "compact_rail" as ShortcutAction, label: "Compactar rail", reason: "el rail inferior consume demasiado alto visual" };
    }
    if (!checks.get("flow-continuity")) {
      return { action: "expand_context" as ShortcutAction, label: "Expandir contexto", reason: "la continuidad narrativa entre guía y bloque técnico aún es débil" };
    }
    if (!checks.get("variant-discipline")) {
      return { action: "boost_technical" as ShortcutAction, label: "Reforzar núcleo técnico", reason: "las variantes de bloque todavía no están consolidadas" };
    }
    if ((projectedGap ?? 0) > 0.4) {
      return { action: "boost_technical" as ShortcutAction, label: "Reforzar núcleo técnico", reason: "la brecha contra 9.5 todavía requiere más impacto visual/técnico" };
    }
    return null;
  }, [benchmark, projectedGap, postRenderRemediation]);
  const recommendedObjective = useMemo(() => {
    if (postRenderRemediation.objectiveId) {
      return COMPOSER_OBJECTIVES.find((objective) => objective.id === postRenderRemediation.objectiveId) ?? null;
    }
    if (!spacePlan) return null;
    if (qaAlignmentState !== "aligned" && (projectedGap ?? 9.5) > 0.6) {
      return COMPOSER_OBJECTIVES.find((objective) => objective.id === "qa_lock") ?? null;
    }
    if (spacePlan.examShare >= 31 || spacePlan.railMode === "compactar") {
      return COMPOSER_OBJECTIVES.find((objective) => objective.id === "compact_exam_rail") ?? null;
    }
    if (spacePlan.technicalShare < 41 || spacePlan.introShare > 33) {
      return COMPOSER_OBJECTIVES.find((objective) => objective.id === "fill_density") ?? null;
    }
    if ((projectedGap ?? 0) > 0.4) {
      return COMPOSER_OBJECTIVES.find((objective) => objective.id === "qa_lock") ?? null;
    }
    return null;
  }, [spacePlan, qaAlignmentState, projectedGap, postRenderRemediation]);
  const decisionFlow = useMemo(() => {
    const step1Done = technicalBlockCount >= 4;
    const step2Done = (projectedGap ?? 9.5) <= 0.6;
    const step3Done = composerReadiness.serverAligned && composerReadiness.hasRealOutput;
    const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : 4;
    return {
      currentStep,
      steps: [
        {
          id: 1,
          title: "Estructura técnica",
          done: step1Done,
          detail: step1Done ? "Núcleo técnico consolidado (4 tarjetas)." : `Faltan tarjetas técnicas (${technicalBlockCount}/4).`,
        },
        {
          id: 2,
          title: "Brecha editorial",
          done: step2Done,
          detail: step2Done ? "Brecha <= 0.6 hacia 9.5." : `Brecha actual ${projectedGap?.toFixed(1) ?? "-"} (objetivo <= 0.6).`,
        },
        {
          id: 3,
          title: "Consolidación QA",
          done: step3Done,
          detail: step3Done
            ? "Composer y QA servidor alineados."
            : "Genera y valida QA para consolidar trazabilidad final.",
        },
      ],
    };
  }, [technicalBlockCount, projectedGap, composerReadiness.serverAligned, composerReadiness.hasRealOutput]);
  const shortcutImpact = useMemo(() => {
    if (!lastShortcutSnapshot || !editableDraft) return null;
    const beforeIds = lastShortcutSnapshot.blocks.map((block) => block.id);
    const afterIds = editableDraft.blocks.map((block) => block.id);
    const moved = afterIds.filter((id, index) => beforeIds[index] !== id).length;
    const beforePlan = computeSpacePlan(lastShortcutSnapshot.blocks);
    const afterPlan = computeSpacePlan(editableDraft.blocks);
    const railDelta = afterPlan.examShare - beforePlan.examShare;
    const technicalDelta = afterPlan.technicalShare - beforePlan.technicalShare;
    const introDelta = afterPlan.introShare - beforePlan.introShare;
    return {
      moved,
      railDelta,
      technicalDelta,
      introDelta,
      label: lastShortcutLabel ?? "último ajuste",
    };
  }, [lastShortcutSnapshot, editableDraft, lastShortcutLabel]);
  const zoneImpact = useMemo(() => {
    if (!lastShortcutSnapshot || !editableDraft) return null;
    return {
      before: computeSpacePlan(lastShortcutSnapshot.blocks),
      after: computeSpacePlan(editableDraft.blocks),
    };
  }, [lastShortcutSnapshot, editableDraft]);

  useEffect(() => {
    if (!selectedBlockId && sortedBlocks.length > 0) {
      setSelectedBlockId(sortedBlocks[0].id);
      return;
    }
    if (selectedBlockId && sortedBlocks.every((block) => block.id !== selectedBlockId)) {
      setSelectedBlockId(sortedBlocks[0]?.id ?? null);
    }
  }, [selectedBlockId, sortedBlocks]);

  useEffect(() => {
    if (lockedStatus?.hasOutput) {
      setCanvasMode("real");
    }
  }, [lockedStatus?.hasOutput, pageIdFromRoute]);

  function updateDraftBlocks(mutator: (blocks: ComposerBlock[]) => ComposerBlock[]) {
    setEditableDraft((current) => {
      if (!current) return current;
      const nextBlocks = mutator([...current.blocks].sort((a, b) => a.priority - b.priority));
      return recalculateDraft({ ...current, blocks: nextBlocks });
    });
  }

  function moveBlock(blockId: string, direction: "up" | "down") {
    updateDraftBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return blocks;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= blocks.length) return blocks;
      const swapped = [...blocks];
      const [item] = swapped.splice(index, 1);
      swapped.splice(target, 0, item);
      return normalizePriorities(swapped);
    });
  }

  function rotateVariant(blockId: string) {
    updateDraftBlocks((blocks) => normalizePriorities(
      blocks.map((block) => (block.id === blockId ? nextVariantForBlock(block) : block))
    ));
  }

  function setBlockVariant(blockId: string, variant: string) {
    updateDraftBlocks((blocks) => normalizePriorities(
      blocks.map((block) => (block.id === blockId ? { ...block, variant } : block))
    ));
  }

  function moveBlockByOffset(blockId: string, offset: number) {
    updateDraftBlocks((blocks) => {
      const index = blocks.findIndex((block) => block.id === blockId);
      if (index < 0) return blocks;
      const target = index + offset;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return normalizePriorities(next);
    });
  }

  function reorderFromCanvas(dragBlockId: string, targetBlockId: string, place: "before" | "after") {
    updateDraftBlocks((blocks) => {
      const dragIndex = blocks.findIndex((block) => block.id === dragBlockId);
      const targetIndex = blocks.findIndex((block) => block.id === targetBlockId);
      if (dragIndex < 0 || targetIndex < 0 || dragIndex === targetIndex) return blocks;
      const next = [...blocks];
      const [dragged] = next.splice(dragIndex, 1);
      const adjustedTarget = dragIndex < targetIndex ? targetIndex - 1 : targetIndex;
      const insertIndex = place === "before" ? adjustedTarget : adjustedTarget + 1;
      next.splice(insertIndex, 0, dragged);
      return normalizePriorities(next);
    });
  }

  function applyComposerActionToBlocks(
    action: ShortcutAction,
    blocks: ComposerBlock[],
  ): ComposerBlock[] {
    let next = [...blocks];
    if (action === "compact_rail") {
      next = next.map((block) => {
        if (block.type === "exam_traps") return { ...block, variant: "compact" };
        if (block.type === "autocheck") return { ...block, variant: "short" };
        return block;
      });
    }
    if (action === "expand_context") {
      next = next.map((block) => (block.type === "context_deck" ? { ...block, variant: "expanded" } : block));
    }
    if (action === "boost_technical") {
      const hasTechnical = next.some((block) => TECHNICAL_BLOCK_TYPES.includes(block.type));
      if (!hasTechnical) {
        next.push(
          makeBlock("diagram_panel", "two_column", 55, {
            modules: pageSummary?.visualModules?.slice(0, 2) ?? [],
          }),
        );
      } else {
        next = next.map((block) => {
          if (block.type === "diagram_panel" && block.variant !== "multi_step") {
            return { ...block, variant: "multi_step" };
          }
          return block;
        });
      }
    }
    if (action === "enforce_four_cards") {
      const intro = next.filter((block) => ["hero_title", "context_deck", "guide_question"].includes(block.type));
      const examTail = next.filter((block) => ["exam_traps", "autocheck", "exam_signal"].includes(block.type));
      const technicalByType = new Map(
        next.filter((block) => TECHNICAL_BLOCK_TYPES.includes(block.type)).map((block) => [block.type, block]),
      );
      const modules = pageSummary?.visualModules ?? [];
      const rebuiltTechnical: ComposerBlock[] = [
        technicalByType.get("diagram_panel")
          ?? makeBlock("diagram_panel", "two_column", 40, { modules: modules.slice(0, 2) }),
        technicalByType.get("comparison_panel")
          ?? makeBlock("comparison_panel", "sku_matrix", 50, { modules: modules.slice(0, 3) }),
        technicalByType.get("decision_tree")
          ?? makeBlock("decision_tree", "binary_path", 60, { modules: modules.slice(1, 3) }),
        technicalByType.get("map_panel")
          ?? makeBlock("map_panel", "replication_path", 70, { modules: modules.slice(2, 4) }),
      ];
      next = [...intro, ...rebuiltTechnical, ...examTail];
    }
    return normalizePriorities(next);
  }

  function applyShortcutChain(
    blocks: ComposerBlock[],
    actions: ShortcutAction[],
  ): ComposerBlock[] {
    let next = normalizePriorities([...blocks].sort((a, b) => a.priority - b.priority));
    for (const action of actions) {
      next = applyComposerActionToBlocks(action, next);
    }
    return normalizePriorities(next);
  }

  function buildAutofixDraft(currentDraft: ComposerProposal["draft"]) {
    const actionsApplied: string[] = [];
    let nextBlocks = [...currentDraft.blocks].sort((a, b) => a.priority - b.priority);
    const initialBenchmark = evaluateComposerBenchmark(nextBlocks);
    const checkById = new Map(initialBenchmark.checks.map((check) => [check.id, check]));

    if (!checkById.get("technical-dominance")?.passed) {
      actionsApplied.push("estructura 4 tarjetas");
      const intro = nextBlocks.filter((block) => ["hero_title", "context_deck", "guide_question"].includes(block.type));
      const examTail = nextBlocks.filter((block) => ["exam_traps", "autocheck", "exam_signal"].includes(block.type));
      const technicalByType = new Map(
        nextBlocks.filter((block) => TECHNICAL_BLOCK_TYPES.includes(block.type)).map((block) => [block.type, block]),
      );
      const modules = pageSummary?.visualModules ?? [];
      const rebuiltTechnical: ComposerBlock[] = [
        technicalByType.get("diagram_panel") ??
          makeBlock("diagram_panel", "two_column", 40, { modules: modules.slice(0, 2) }),
        technicalByType.get("comparison_panel") ??
          makeBlock("comparison_panel", "sku_matrix", 50, { modules: modules.slice(0, 3) }),
        technicalByType.get("decision_tree") ??
          makeBlock("decision_tree", "binary_path", 60, { modules: modules.slice(1, 3) }),
        technicalByType.get("map_panel") ??
          makeBlock("map_panel", "replication_path", 70, { modules: modules.slice(2, 4) }),
      ];
      nextBlocks = [...intro, ...rebuiltTechnical, ...examTail];
    }

    if (!checkById.get("exam-rail-balance")?.passed || !checkById.get("variant-discipline")?.passed) {
      actionsApplied.push("compactar rail");
      nextBlocks = nextBlocks.map((block) => {
        if (block.type === "exam_traps") return { ...block, variant: "compact" };
        if (block.type === "autocheck") return { ...block, variant: "short" };
        return block;
      });
    }

    if (!checkById.get("flow-continuity")?.passed) {
      const guideIndex = nextBlocks.findIndex((block) => block.type === "guide_question");
      const firstTechnicalIndex = nextBlocks.findIndex((block) => TECHNICAL_BLOCK_TYPES.includes(block.type));
      if (guideIndex >= 0 && firstTechnicalIndex >= 0 && guideIndex > firstTechnicalIndex) {
        actionsApplied.push("reorden narrativo");
        const reordered = [...nextBlocks];
        const [guide] = reordered.splice(guideIndex, 1);
        reordered.splice(firstTechnicalIndex, 0, guide);
        nextBlocks = reordered;
      }
    }

    const contextBlock = nextBlocks.find((block) => block.type === "context_deck");
    if (contextBlock && contextBlock.variant !== "expanded") {
      actionsApplied.push("contexto expandido");
      nextBlocks = nextBlocks.map((block) => (block.type === "context_deck" ? { ...block, variant: "expanded" } : block));
    }

    const normalizedBlocks = normalizePriorities(nextBlocks);
    const nextDraft = recalculateDraft({ ...currentDraft, blocks: normalizedBlocks });
    return { nextDraft, actionsApplied };
  }

  async function handleAutofixComposer() {
    if (!editableDraft) return;
    const beforeTotal = projectedQaScores?.total ?? null;
    const beforeBlocks = editableDraft.blocks;
    const { nextDraft, actionsApplied } = buildAutofixDraft(editableDraft);
    setEditableDraft(nextDraft);

    if (actionsApplied.length === 0) {
      setAutofixFeedback("No hubo ajustes automaticos: el draft ya estaba dentro de los parametros premium.");
      pushActionLog({
        kind: "autofix",
        action: "Autocorregir premium",
        status: "info",
        beforeTotal,
        afterTotal: beforeTotal,
        delta: 0,
        changedBlocks: 0,
        note: "Sin cambios efectivos.",
      });
      return;
    }
    const afterLockedTechnicalAccuracy = lockedQa?.scores?.technical_accuracy;
    const afterScores = buildProjectedQaScores(
      nextDraft,
      afterLockedTechnicalAccuracy == null ? null : normalizeQaScoreToTen(afterLockedTechnicalAccuracy),
    );
    const afterTotal = afterScores?.total ?? null;
    const changedBlocks = nextDraft.blocks.filter((block, idx) => {
      const prev = beforeBlocks[idx];
      return !prev || prev.id !== block.id || prev.variant !== block.variant || prev.type !== block.type;
    }).length;
    setAutofixFeedback(`Autocorreccion aplicada: ${actionsApplied.join(" | ")}.`);
    pushActionLog({
      kind: "autofix",
      action: "Autocorregir premium",
      status: "ok",
      beforeTotal,
      afterTotal,
      delta: beforeTotal != null && afterTotal != null ? Number((afterTotal - beforeTotal).toFixed(1)) : null,
      changedBlocks,
      note: actionsApplied.join(" · "),
    });

    try {
      await logComposerAutofix(pageIdFromRoute, {
        actions: actionsApplied,
        beforeTotal,
        afterTotal,
      });
    } catch {
      // El autofix aplica igual aunque falle la bitacora.
    }
  }

  async function handleAutofixAndOpenQa() {
    if (!proposal || !editableDraft || generatingFromComposer || pipelineBusy) return;
    setPipelineBusy(true);
    setGeneratingFromComposer(true);
    setGenerationFeedback(null);
    setQaDelta(null);
    setQuickActionFeedback(null);
    setAutofixFeedback(null);
    try {
      const beforeTotal = projectedQaScores?.total ?? null;
      const beforeBlocks = editableDraft.blocks;
      const { nextDraft, actionsApplied } = buildAutofixDraft(editableDraft);
      const changedBlocks = nextDraft.blocks.filter((block, idx) => {
        const prev = beforeBlocks[idx];
        return !prev || prev.id !== block.id || prev.variant !== block.variant || prev.type !== block.type;
      }).length;
      setEditableDraft(nextDraft);

      const afterLockedTechnicalAccuracy = lockedQa?.scores?.technical_accuracy;
      const afterScores = buildProjectedQaScores(
        nextDraft,
        afterLockedTechnicalAccuracy == null ? null : normalizeQaScoreToTen(afterLockedTechnicalAccuracy),
      );
      const afterTotal = afterScores?.total ?? null;

      if (actionsApplied.length > 0) {
        await logComposerAutofix(pageIdFromRoute, {
          actions: actionsApplied,
          beforeTotal,
          afterTotal,
        });
      }

      pushActionLog({
        kind: "autofix",
        action: "Autofix + QA",
        status: "ok",
        beforeTotal,
        afterTotal,
        delta: beforeTotal != null && afterTotal != null ? Number((afterTotal - beforeTotal).toFixed(1)) : null,
        changedBlocks,
        note: actionsApplied.length > 0
          ? `Autofix aplicado: ${actionsApplied.join(" | ")}`
          : "Sin cambios de autofix, se mantiene draft actual.",
      });

      await generateFromDraft(nextDraft, "Pipeline autofix premium + QA");
      setGenerationFeedback("Autofix aplicado y QA abierto para validacion final.");
      setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo ejecutar autofix + QA.";
      setGenerationFeedback(message);
      pushActionLog({
        kind: "autofix",
        action: "Autofix + QA",
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
      setPipelineBusy(false);
    }
  }

  async function handleSaveDraft() {
    if (!proposal || !editableDraft || savingDraft) return;
    setSavingDraft(true);
    setSaveMessage(null);
    try {
      const saved = await saveComposerDraft(proposal.pageId, {
        pageNumber: editableDraft.pageNumber,
        family: editableDraft.family,
        transitionLevel: proposal.recommendedTransition.level,
        draft: editableDraft,
        note: "Draft guardado desde vista Composer",
      });
      setDraftRecord(saved);
      setSaveMessage(`Draft guardado por ${saved.updatedByName}`);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "No se pudo guardar el draft");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleRunNextStep() {
    if (flowNextStep === 1) {
      setFocusMode(false);
      setComposerActionsOpen(true);
      setTransitionOpen(false);
      return;
    }
    if (flowNextStep === 2) {
      await handleSaveDraft();
      return;
    }
    if (flowNextStep === 3) {
      await handlePipelineToQa();
      return;
    }
    if (flowNextStep === 4) {
      setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
      return;
    }
    if (!qaHardGate.ready) {
      setServerSyncMessage("Gate QA hard bloqueado: revisa bloqueos y sincroniza antes de cierre final.");
      return;
    }
    setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
  }

  async function handleApplyPostRenderRemediation() {
    if (postRenderRemediation.syncOnly) {
      await syncComposerWithServerQa("manual");
      return;
    }

    if (postRenderRemediation.actionLabel === "Abrir QA final") {
      setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
      return;
    }

    if (postRenderRemediation.shortcutAction) {
      await runShortcutAction(postRenderRemediation.shortcutAction, postRenderRemediation.actionLabel);
      return;
    }

    if (postRenderRemediation.actionLabel === "Autocorregir premium") {
      await handleAutofixComposer();
      return;
    }

    if (!editableDraft || !proposal || generatingFromComposer || pipelineBusy) return;
    setGeneratingFromComposer(true);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      await generateFromDraft(
        editableDraft,
        `Remediacion post-render: ${postRenderRemediation.label}`,
        postRenderRemediation.scope ?? "full",
      );
      setGenerationFeedback(`Remediacion post-render aplicada: ${postRenderRemediation.label}.`);
      pushActionLog({
        kind: "shortcut",
        action: postRenderRemediation.actionLabel,
        status: "ok",
        beforeTotal: activeQaTotal,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: postRenderRemediation.reason,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aplicar la remediacion post-render.";
      setGenerationFeedback(message);
      pushActionLog({
        kind: "shortcut",
        action: postRenderRemediation.actionLabel,
        status: "error",
        beforeTotal: activeQaTotal,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
    }
  }

  function parseBatchInput(value: string): string[] {
    return Array.from(
      new Set(
        value
          .split(/[,\s]+/g)
          .map((token) => {
            const num = parseInt(token, 10);
            if (!Number.isFinite(num) || num < 1) return "";
            return String(num).padStart(2, "0");
          })
          .filter((pageId) => pageId.length > 0),
      ),
    );
  }

  async function refreshBatchStatus(runId = batchRunId, mode: "silent" | "manual" = "silent") {
    if (!runId) return;
    if (mode === "manual") {
      setBatchRefreshing(true);
      setBatchMessage(null);
    }
    try {
      const status = await fetchComposerBatchStatus(runId);
      setBatchStatus(status);
      if (mode === "manual") {
        setBatchMessage(
          status.done
            ? `Batch ${runId} finalizado · ok ${status.counts.completed} · failed ${status.counts.failed}.`
            : `Batch ${runId} en progreso · running ${status.counts.running} · queued ${status.counts.queued}.`,
        );
      }
    } catch (err) {
      if (mode === "manual") {
        setBatchMessage(err instanceof Error ? err.message : "No se pudo refrescar el estado del batch.");
      }
    } finally {
      if (mode === "manual") {
        setBatchRefreshing(false);
      }
    }
  }

  async function handleStartBatchRun() {
    const pageIds = parseBatchInput(batchPageInput);
    if (pageIds.length === 0) {
      setBatchMessage("Debes indicar paginas validas. Ejemplo: 01,02,03,04,05");
      return;
    }
    setBatchStarting(true);
    setBatchMessage(null);
    try {
      const started = await startComposerBatchRun({
        pageIds,
        useComposerDraft: true,
        regenerationScope: "full",
      });
      setBatchRunId(started.runId);
      setBatchMessage(`Batch ${started.runId} iniciado con ${started.queued} pagina(s).`);
      await refreshBatchStatus(started.runId, "silent");
    } catch (err) {
      setBatchMessage(err instanceof Error ? err.message : "No se pudo iniciar el batch.");
    } finally {
      setBatchStarting(false);
    }
  }

  async function handleRetryBatchFailed() {
    if (!batchRunId) return;
    setBatchRetrying(true);
    setBatchMessage(null);
    try {
      const result = await retryComposerBatchFailed(batchRunId, {
        useComposerDraft: true,
        regenerationScope: "full",
      });
      setBatchMessage(`Reintento lanzado para ${result.retried} item(s) failed.`);
      await refreshBatchStatus(batchRunId, "silent");
    } catch (err) {
      setBatchMessage(err instanceof Error ? err.message : "No se pudo reintentar failed.");
    } finally {
      setBatchRetrying(false);
    }
  }

  async function generateFromDraft(
    draft: ComposerProposal["draft"],
    note: string,
    scope: ComposerRegenerationScope = "full",
  ): Promise<void> {
    if (!proposal) return;
    const saved = await saveComposerDraft(proposal.pageId, {
      pageNumber: draft.pageNumber,
      family: draft.family,
      transitionLevel: proposal.recommendedTransition.level,
      draft,
      note,
    });
    setDraftRecord(saved);

    const response = await fetch("/api/studio/generate-visual-atlas-page", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...composerAuthHeaders() },
      body: JSON.stringify({
        certificationId: "ai-200",
        pageId: proposal.pageId,
        useComposerDraft: true,
        regenerationScope: scope,
      }),
    });

    if (!response.ok) {
      const err = await readJsonOrThrow<ComposerGenerationResponse>(response, "generate-from-composer");
      throw new Error(err.error ?? err.detail ?? `No se pudo generar (${response.status})`);
    }

    const data = await readJsonOrThrow<ComposerGenerationResponse>(response, "generate-from-composer");
    if (data.qaDelta) {
      setQaDelta(data.qaDelta);
    }
    await refreshLockedArtifacts(proposal.pageId);
    setCanvasMode("real");
  }

  async function runShortcutAction(action: ShortcutAction, label: string) {
    if (!editableDraft || !proposal || quickActionBusy || generatingFromComposer) return;
    setQuickActionBusy(action);
    setQuickActionFeedback(null);
    setGenerationFeedback(null);
    setQaDelta(null);
    setLastShortcutSnapshot(cloneDraftRecord(editableDraft));
    setLastShortcutLabel(label);
    try {
      const beforeSerialized = JSON.stringify(editableDraft.blocks);
      const updatedBlocks = applyComposerActionToBlocks(action, editableDraft.blocks);
      const nextDraft = recalculateDraft({ ...editableDraft, blocks: updatedBlocks });
      const afterSerialized = JSON.stringify(nextDraft.blocks);

      if (beforeSerialized === afterSerialized) {
        setQuickActionFeedback(`Atajo "${label}" no produjo cambios efectivos en esta pagina.`);
        pushActionLog({
          kind: "shortcut",
          action: label,
          status: "info",
          beforeTotal: projectedQaScores?.total ?? null,
          afterTotal: projectedQaScores?.total ?? null,
          delta: 0,
          changedBlocks: 0,
          note: "Sin cambios en bloques.",
        });
        return;
      }

      const changedBlocks = nextDraft.blocks.filter((block, idx) => {
        const prev = editableDraft.blocks[idx];
        return !prev || prev.id !== block.id || prev.variant !== block.variant || prev.type !== block.type;
      }).length;
      const beforeTotal = projectedQaScores?.total ?? null;
      const afterLockedTechnicalAccuracy = lockedQa?.scores?.technical_accuracy;
      const afterScores = buildProjectedQaScores(
        nextDraft,
        afterLockedTechnicalAccuracy == null ? null : normalizeQaScoreToTen(afterLockedTechnicalAccuracy),
      );
      const afterTotal = afterScores.total;
      setEditableDraft(nextDraft);
      setGeneratingFromComposer(true);
      await generateFromDraft(nextDraft, `Atajo operativo aplicado: ${label}`);
      setQuickActionFeedback(`Atajo "${label}" aplicado + regeneracion completada.`);
      pushActionLog({
        kind: "shortcut",
        action: label,
        status: "ok",
        beforeTotal,
        afterTotal,
        delta: beforeTotal != null ? Number((afterTotal - beforeTotal).toFixed(1)) : null,
        changedBlocks,
        note: "Aplicado y regenerado.",
      });
    } catch (err) {
      setQuickActionFeedback(err instanceof Error ? err.message : `Fallo al ejecutar atajo "${label}".`);
      pushActionLog({
        kind: "shortcut",
        action: label,
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: err instanceof Error ? err.message : "Error no especificado",
      });
    } finally {
      setGeneratingFromComposer(false);
      setQuickActionBusy(null);
    }
  }

  async function handleRunObjective(objectiveId: ComposerObjectiveId) {
    if (!proposal || !editableDraft || generatingFromComposer || pipelineBusy || quickActionBusy) return;
    const objective = COMPOSER_OBJECTIVES.find((item) => item.id === objectiveId);
    if (!objective) return;

    setPipelineBusy(true);
    setGeneratingFromComposer(true);
    setGenerationFeedback(null);
    setQaDelta(null);
    setQuickActionFeedback(null);

    try {
      const beforeTotal = projectedQaScores?.total ?? null;
      const beforeDraft = cloneDraftRecord(editableDraft);
      const nextBlocks = applyShortcutChain(editableDraft.blocks, objective.actions);
      const nextDraft = recalculateDraft({ ...editableDraft, blocks: nextBlocks });

      const changedBlocks = nextDraft.blocks.filter((block, idx) => {
        const prev = beforeDraft.blocks[idx];
        return !prev || prev.id !== block.id || prev.variant !== block.variant || prev.type !== block.type;
      }).length;

      const afterScores = buildProjectedQaScores(
        nextDraft,
        lockedQa?.scores?.technical_accuracy == null
          ? null
          : normalizeQaScoreToTen(lockedQa.scores.technical_accuracy),
      );
      const afterTotal = afterScores?.total ?? null;

      setLastShortcutSnapshot(beforeDraft);
      setLastShortcutLabel(`objetivo:${objective.label}`);
      setEditableDraft(nextDraft);

      pushActionLog({
        kind: "generate",
        action: `Objetivo Sprint 5: ${objective.label}`,
        status: "ok",
        beforeTotal,
        afterTotal,
        delta: beforeTotal != null && afterTotal != null ? Number((afterTotal - beforeTotal).toFixed(1)) : null,
        changedBlocks,
        note: `Playbook aplicado (${objective.actions.join(" -> ")}) + regeneracion ${objective.scope}.`,
      });

      await generateFromDraft(
        nextDraft,
        `Sprint 5 objetivo editorial: ${objective.label}`,
        objective.scope,
      );

      setGenerationFeedback(`Objetivo ejecutado: ${objective.label}.`);
      if (objective.openQa) {
        setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `No se pudo ejecutar el objetivo ${objective.label}.`;
      setGenerationFeedback(message);
      pushActionLog({
        kind: "generate",
        action: `Objetivo Sprint 5: ${objective.label}`,
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
      setPipelineBusy(false);
    }
  }

  async function handleRevertLastShortcut() {
    if (!lastShortcutSnapshot || !proposal || generatingFromComposer) return;
    setGeneratingFromComposer(true);
    setQuickActionFeedback(null);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      const restored = recalculateDraft(cloneDraftRecord(lastShortcutSnapshot));
      setEditableDraft(restored);
      await generateFromDraft(
        restored,
        `Rollback operativo del ultimo atajo${lastShortcutLabel ? `: ${lastShortcutLabel}` : ""}`,
      );
      setQuickActionFeedback(`Rollback aplicado${lastShortcutLabel ? ` (${lastShortcutLabel})` : ""} y regenerado.`);
      pushActionLog({
        kind: "rollback",
        action: "Rollback atajo",
        status: "ok",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: restored.blocks.length,
        note: lastShortcutLabel ? `Revertido: ${lastShortcutLabel}` : "Rollback aplicado",
      });
      setLastShortcutSnapshot(null);
      setLastShortcutLabel(null);
    } catch (err) {
      setQuickActionFeedback(err instanceof Error ? err.message : "No se pudo revertir el ultimo atajo.");
      pushActionLog({
        kind: "rollback",
        action: "Rollback atajo",
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: err instanceof Error ? err.message : "Error no especificado",
      });
    } finally {
      setGeneratingFromComposer(false);
    }
  }

  async function handleGenerateWithDraft() {
    if (!proposal || !editableDraft || generatingFromComposer) return;
    setGeneratingFromComposer(true);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      await generateFromDraft(editableDraft, "Draft aplicado para generacion desde Composer");
      setGenerationFeedback("Generacion completada desde Composer y QA recargado.");
      pushActionLog({
        kind: "generate",
        action: "Generar con draft",
        status: "ok",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: projectedQaScores?.total ?? null,
        delta: qaDelta?.delta ?? null,
        changedBlocks: editableDraft.blocks.length,
        note: "Generación ejecutada.",
      });
    } catch (err) {
      setGenerationFeedback(err instanceof Error ? err.message : "No se pudo generar desde Composer");
      pushActionLog({
        kind: "generate",
        action: "Generar con draft",
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: err instanceof Error ? err.message : "Error no especificado",
      });
    } finally {
      setGeneratingFromComposer(false);
    }
  }

  async function handleScopedRegeneration(scope: ComposerRegenerationScope, label: string) {
    if (!proposal || !editableDraft || generatingFromComposer || quickActionBusy) return;
    setGeneratingFromComposer(true);
    setQuickActionFeedback(null);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      await generateFromDraft(
        editableDraft,
        `Regeneracion dirigida desde Composer: ${label}`,
        scope,
      );
      setGenerationFeedback(`Regeneracion dirigida completada (${label}).`);
      pushActionLog({
        kind: "generate",
        action: `Regenerar: ${label}`,
        status: "ok",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: projectedQaScores?.total ?? null,
        delta: qaDelta?.delta ?? null,
        changedBlocks: editableDraft.blocks.length,
        note: `Scope ${scope} aplicado al pipeline de generacion.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : `No se pudo regenerar ${label}.`;
      setGenerationFeedback(message);
      pushActionLog({
        kind: "generate",
        action: `Regenerar: ${label}`,
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
    }
  }

  async function handleRegenerateSelectedBlock() {
    if (!proposal || !editableDraft || !selectedBlock || generatingFromComposer || pipelineBusy) return;
    const blockType = selectedBlock.type;
    const scope = resolveScopeFromBlockType(blockType);
    const label = labelRegenerationScope(scope);

    setPipelineBusy(true);
    setGeneratingFromComposer(true);
    setQuickActionFeedback(null);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      await generateFromDraft(
        editableDraft,
        `Regeneracion contextual por bloque seleccionado: ${labelBlockType(blockType)} (${selectedBlock.id})`,
        scope,
      );
      setGenerationFeedback(`Regeneracion contextual completada (${label}) desde bloque ${labelBlockType(blockType)}.`);
      pushActionLog({
        kind: "generate",
        action: `Bloque: ${labelBlockType(blockType)}`,
        status: "ok",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: projectedQaScores?.total ?? null,
        delta: qaDelta?.delta ?? null,
        changedBlocks: editableDraft.blocks.length,
        note: `Regeneracion contextual en scope ${scope}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo regenerar desde el bloque seleccionado.";
      setGenerationFeedback(message);
      pushActionLog({
        kind: "generate",
        action: `Bloque: ${labelBlockType(blockType)}`,
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
      setPipelineBusy(false);
    }
  }

  async function handleApplyPreset(presetId: ComposerPresetId, runToQa: boolean) {
    if (!proposal || !editableDraft || generatingFromComposer || quickActionBusy) return;
    setQuickActionBusy(`preset:${presetId}`);
    setQuickActionFeedback(null);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      const beforeTotal = projectedQaScores?.total ?? null;
      const beforeDraft = cloneDraftRecord(editableDraft);
      const nextBlocks = applyPresetToBlocks(presetId, editableDraft.blocks);
      const nextDraft = recalculateDraft({ ...editableDraft, blocks: nextBlocks });

      if (JSON.stringify(beforeDraft.blocks) === JSON.stringify(nextDraft.blocks)) {
        setQuickActionFeedback(`Preset "${presetId}" no generó cambios en esta página.`);
        pushActionLog({
          kind: "shortcut",
          action: `Preset: ${presetId}`,
          status: "info",
          beforeTotal,
          afterTotal: beforeTotal,
          delta: 0,
          changedBlocks: 0,
          note: "Sin cambios efectivos.",
        });
        return;
      }

      const changedBlocks = nextDraft.blocks.filter((block, idx) => {
        const prev = beforeDraft.blocks[idx];
        return !prev || prev.id !== block.id || prev.variant !== block.variant || prev.type !== block.type;
      }).length;
      const afterScores = buildProjectedQaScores(
        nextDraft,
        lockedQa?.scores?.technical_accuracy == null
          ? null
          : normalizeQaScoreToTen(lockedQa.scores.technical_accuracy),
      );

      setLastShortcutSnapshot(beforeDraft);
      setLastShortcutLabel(`preset:${presetId}`);
      setEditableDraft(nextDraft);
      setQuickActionFeedback(`Preset aplicado: ${presetId}.`);

      pushActionLog({
        kind: "shortcut",
        action: `Preset: ${presetId}`,
        status: "ok",
        beforeTotal,
        afterTotal: afterScores.total,
        delta: beforeTotal != null ? Number((afterScores.total - beforeTotal).toFixed(1)) : null,
        changedBlocks,
        note: runToQa ? "Preset aplicado y flujo a QA." : "Preset aplicado al draft.",
      });

      if (runToQa) {
        setGeneratingFromComposer(true);
        await generateFromDraft(nextDraft, `Preset aplicado: ${presetId} · pipeline a QA`, "full");
        setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : `No se pudo aplicar preset ${presetId}.`;
      setQuickActionFeedback(message);
      pushActionLog({
        kind: "shortcut",
        action: `Preset: ${presetId}`,
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
      setQuickActionBusy(null);
    }
  }

  async function handlePipelineToQa() {
    if (!proposal || !editableDraft || generatingFromComposer || pipelineBusy) return;
    setPipelineBusy(true);
    setGeneratingFromComposer(true);
    setGenerationFeedback(null);
    setQaDelta(null);
    try {
      let workingDraft = editableDraft;
      if (recommendedShortcut) {
        const updatedBlocks = applyComposerActionToBlocks(recommendedShortcut.action, workingDraft.blocks);
        const nextDraft = recalculateDraft({ ...workingDraft, blocks: updatedBlocks });
        if (JSON.stringify(nextDraft.blocks) !== JSON.stringify(workingDraft.blocks)) {
          setLastShortcutSnapshot(cloneDraftRecord(workingDraft));
          setLastShortcutLabel(recommendedShortcut.label);
          setEditableDraft(nextDraft);
          workingDraft = nextDraft;
          pushActionLog({
            kind: "shortcut",
            action: `Pipeline: ${recommendedShortcut.label}`,
            status: "ok",
            beforeTotal: projectedQaScores?.total ?? null,
            afterTotal: buildProjectedQaScores(
              nextDraft,
              lockedQa?.scores?.technical_accuracy == null
                ? null
                : normalizeQaScoreToTen(lockedQa.scores.technical_accuracy),
            ).total,
            delta: null,
            changedBlocks: nextDraft.blocks.length,
            note: "Ajuste recomendado aplicado dentro del pipeline.",
          });
        }
      }

      await generateFromDraft(workingDraft, "Pipeline operativo Composer -> QA");
      pushActionLog({
        kind: "generate",
        action: "Pipeline a QA",
        status: "ok",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: projectedQaScores?.total ?? null,
        delta: qaDelta?.delta ?? null,
        changedBlocks: workingDraft.blocks.length,
        note: "Generado y redirigido a QA editorial.",
      });
      setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo ejecutar pipeline a QA";
      setGenerationFeedback(message);
      pushActionLog({
        kind: "generate",
        action: "Pipeline a QA",
        status: "error",
        beforeTotal: projectedQaScores?.total ?? null,
        afterTotal: null,
        delta: null,
        changedBlocks: 0,
        note: message,
      });
    } finally {
      setGeneratingFromComposer(false);
      setPipelineBusy(false);
    }
  }

  return (
    <Layout title="Composer">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setLocation("/biblioteca")}
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Visual Atlas Composer</p>
            <p className="text-sm font-bold text-white/85 truncate">
              {pageSummary ? `${pageSummary.title}` : `Pagina ${pageIdFromRoute}`}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5 truncate">
              {proposal && editableDraft ? `${labelFamily(editableDraft.family)} · ${labelTransition(proposal.recommendedTransition.level)}` : "Cargando propuesta compositiva"}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSelectorOpen((value) => !value)}
              className="flex items-center gap-2 h-9 px-3 rounded-sm border border-white/[0.08] bg-white/[0.02] text-[10px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <span className="font-bold">{pageIdFromRoute}</span>
              <span className="max-w-[260px] truncate">{pageSummary?.title ?? "Seleccionar pagina"}</span>
              <ChevronsUpDown className="w-3 h-3 text-white/35" />
            </button>

            {selectorOpen && (
              <div className="absolute right-0 top-11 w-[360px] max-h-[360px] overflow-y-auto rounded-sm border border-white/[0.08] bg-[#0d1629] shadow-2xl z-20">
                {(studioCatalog?.pages ?? []).map((page) => {
                  const active = page.pageId === pageIdFromRoute;
                  return (
                    <button
                      key={page.pageId}
                      type="button"
                      onClick={() => {
                        setSelectorOpen(false);
                        setLocation(`/composer/${page.pageId}`);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 border-b border-white/[0.04] transition-all",
                        active ? "bg-blue-500/10 text-white" : "text-white/65 hover:bg-white/[0.03] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-white/30">{page.pageNumber}</span>
                        <span className="text-[10px] font-semibold line-clamp-2">{page.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateWithDraft}
            disabled={!proposal || !editableDraft || generatingFromComposer}
            className={cn(
              "h-9 px-3 rounded-sm border text-[10px] font-semibold transition-all flex items-center gap-2",
              !proposal || !editableDraft || generatingFromComposer
                ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                : "border-teal-400/30 bg-teal-500/18 text-teal-50 hover:bg-teal-500/26",
            )}
          >
            {generatingFromComposer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {generatingFromComposer ? "Generando..." : "Generar draft"}
          </button>
          <button
            type="button"
            onClick={() => setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`)}
            className="h-9 px-3 rounded-sm border border-blue-500/25 bg-blue-500/10 text-[10px] font-semibold text-blue-100 hover:bg-blue-500/16 transition-all"
          >
            QA
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!loading && (draftRecord || saveMessage) && (
            <div className="max-w-6xl mx-auto mb-3 px-3 py-2 rounded-sm border border-white/[0.08] bg-white/[0.02]">
              <p className="text-[10px] text-white/70">
                {saveMessage
                  ? saveMessage
                  : `Draft activo: ${draftRecord?.updatedByName ?? "Sistema"} - ${new Date(draftRecord?.updatedAt ?? "").toLocaleString("es-AR")}`}
              </p>
            </div>
          )}

          {loading ? (
            <div className="max-w-6xl mx-auto flex items-center gap-2 py-8 text-white/35">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px]">Armando mesa de composicion...</span>
            </div>
          ) : error ? (
            <div className="max-w-6xl mx-auto bg-amber-500/8 border border-amber-400/20 rounded-sm p-4">
              <p className="text-[11px] font-bold text-amber-200">Composer usando propuesta local</p>
              <p className="text-[10px] text-amber-100/70 mt-1">{error}</p>
            </div>
          ) : proposal ? (
            <div className="max-w-[1500px] mx-auto space-y-4">
              <section className="rounded-sm border border-white/[0.08] bg-[#0d1629] px-4 py-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-cyan-300/75">Composer Reset</p>
                    <h2 className="text-lg font-black text-white mt-1">Mesa editorial de pagina</h2>
                    <p className="text-[11px] text-white/52 mt-1 max-w-3xl">
                      Una sola lectura: preview grande, problema dominante y tres acciones que deben cambiar la salida final.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 min-w-[360px]">
                    <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                      <p className="text-[8px] text-white/30 uppercase tracking-widest">QA oficial</p>
                      <p className={cn("text-sm font-black mt-1", lockedTotal != null && lockedTotal >= 9.5 ? "text-emerald-300" : "text-amber-300")}>
                        {lockedTotal != null ? `${lockedTotal.toFixed(1)}/10` : "sin QA"}
                      </p>
                    </div>
                    <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                      <p className="text-[8px] text-white/30 uppercase tracking-widest">Draft</p>
                      <p className={cn("text-sm font-black mt-1", projectedQaScores && projectedQaScores.total >= 9.5 ? "text-emerald-300" : "text-cyan-300")}>
                        {projectedQaScores ? `${projectedQaScores.total.toFixed(1)}/10` : "sin draft"}
                      </p>
                    </div>
                    <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                      <p className="text-[8px] text-white/30 uppercase tracking-widest">Brecha</p>
                      <p className={cn("text-sm font-black mt-1", (activeGapToTarget ?? projectedGap ?? 9.5) <= 0.5 ? "text-emerald-300" : "text-amber-300")}>
                        {(activeGapToTarget ?? projectedGap) != null ? (activeGapToTarget ?? projectedGap)?.toFixed(1) : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">
                <section className="rounded-sm border border-white/[0.08] bg-[#0d1629] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Preview editorial</p>
                      <p className="text-[11px] text-white/55 mt-1">
                        {canvasMode === "real" ? "Output real generado" : "Borrador compositivo editable"}
                      </p>
                    </div>
                    <div className="h-8 rounded-sm border border-white/[0.08] bg-white/[0.02] p-0.5 flex items-center">
                      <button
                        type="button"
                        onClick={() => setCanvasMode("real")}
                        className={cn(
                          "h-7 px-3 rounded-[3px] text-[9px] font-semibold transition-all",
                          canvasMode === "real" ? "bg-emerald-500/18 text-emerald-50" : "text-white/45 hover:text-white/75",
                        )}
                      >
                        Real
                      </button>
                      <button
                        type="button"
                        onClick={() => setCanvasMode("draft")}
                        className={cn(
                          "h-7 px-3 rounded-[3px] text-[9px] font-semibold transition-all",
                          canvasMode === "draft" ? "bg-blue-500/18 text-blue-50" : "text-white/45 hover:text-white/75",
                        )}
                      >
                        Draft
                      </button>
                    </div>
                  </div>

                  <div className="mx-auto max-w-[860px] rounded-sm border border-white/[0.08] bg-[#07101d] p-3">
                    {canvasMode === "real" ? (
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.08] bg-white overflow-hidden">
                        {realHtmlPreviewUrl ? (
                          <iframe
                            title={`Output real pagina ${pageIdFromRoute}`}
                            src={realHtmlPreviewUrl}
                            className="w-full h-full border-0 bg-white"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-[#f7fbff] text-[11px] text-[#47607f]">
                            Todavia no hay output real para esta pagina.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.08] bg-[#f7fbff] overflow-y-auto p-4">
                        <div className="h-full w-full flex flex-col gap-2">
                          {sortedBlocks.map((block, index) => {
                            const selected = selectedBlock?.id === block.id;
                            const blockHeight = Math.max(42, Math.min(180, Math.round(estimateBlockHeight(block) * 0.58)));
                            const isDragging = draggingBlockId === block.id;
                            return (
                              <button
                                key={`reset-canvas:${block.id}`}
                                type="button"
                                draggable
                                onDragStart={() => setDraggingBlockId(block.id)}
                                onDragEnd={() => setDraggingBlockId(null)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={(event) => {
                                  event.preventDefault();
                                  if (!draggingBlockId || draggingBlockId === block.id) return;
                                  reorderFromCanvas(draggingBlockId, block.id, "before");
                                  setDraggingBlockId(null);
                                }}
                                onClick={() => setSelectedBlockId(block.id)}
                                className={cn(
                                  "w-full text-left rounded-[6px] border px-3 py-2 transition-all",
                                  selected ? "border-[#1f6fff] bg-[#eaf3ff]" : "border-[#d8e4f4] bg-white hover:border-[#9bb8ea]",
                                  isDragging && "opacity-45",
                                )}
                                style={{ minHeight: `${blockHeight}px` }}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <GripVertical className="w-3 h-3 text-[#4369a8] shrink-0" />
                                    <span className="text-[8px] font-black text-[#0b4aa2] uppercase tracking-[0.08em]">
                                      {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <span className="text-[11px] font-black text-[#091b4f] truncate">{labelBlockType(block.type)}</span>
                                  </div>
                                  <span className="text-[8px] text-[#5071a6] bg-[#e8f0fc] border border-[#d4e2f8] rounded-[4px] px-1.5 py-0.5">
                                    {block.variant}
                                  </span>
                                </div>
                                <p className="text-[9px] text-[#405c8f] leading-snug mt-2 line-clamp-3">
                                  {summarizeBlockContent(block)}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <aside className="space-y-3">
                  <section className="rounded-sm border border-white/[0.08] bg-[#0d1629] p-4">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Problema dominante</p>
                    <p className="text-sm font-black text-white mt-2">
                      {recommendedObjective?.label ?? recommendedShortcut?.label ?? postRenderRemediation.label}
                    </p>
                    <p className="text-[10px] text-white/58 mt-2 leading-relaxed">
                      {spacePlan?.guidance ?? recommendedShortcut?.reason ?? postRenderRemediation.reason}
                    </p>
                    {spacePlan ? (
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-2">
                          <p className="text-[8px] text-white/30 uppercase tracking-widest">Intro</p>
                          <p className="text-[12px] font-black text-cyan-300 mt-1">{spacePlan.introShare}%</p>
                        </div>
                        <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-2">
                          <p className="text-[8px] text-white/30 uppercase tracking-widest">Visual</p>
                          <p className="text-[12px] font-black text-emerald-300 mt-1">{spacePlan.technicalShare}%</p>
                        </div>
                        <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-2">
                          <p className="text-[8px] text-white/30 uppercase tracking-widest">Rail</p>
                          <p className="text-[12px] font-black text-amber-300 mt-1">{spacePlan.examShare}%</p>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-sm border border-white/[0.08] bg-[#0d1629] p-4">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Acciones de maquetacion</p>
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => void handleRunObjective("qa_lock")}
                        disabled={!proposal || !editableDraft || generatingFromComposer || pipelineBusy}
                        className="w-full h-10 rounded-sm border border-violet-400/30 bg-violet-500/16 text-[10px] font-bold text-violet-50 hover:bg-violet-500/24 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {(generatingFromComposer || pipelineBusy) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        Rebalancear pagina
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRunObjective("fill_density")}
                        disabled={!proposal || !editableDraft || generatingFromComposer || pipelineBusy}
                        className="w-full h-10 rounded-sm border border-cyan-400/30 bg-cyan-500/14 text-[10px] font-bold text-cyan-50 hover:bg-cyan-500/22 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Layers3 className="w-3.5 h-3.5" />
                        Rellenar huecos utiles
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRunObjective("compact_exam_rail")}
                        disabled={!proposal || !editableDraft || generatingFromComposer || pipelineBusy}
                        className="w-full h-10 rounded-sm border border-amber-400/30 bg-amber-500/14 text-[10px] font-bold text-amber-50 hover:bg-amber-500/22 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Waypoints className="w-3.5 h-3.5" />
                        Compactar rail inferior
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={!proposal || savingDraft}
                        className="h-8 rounded-sm border border-white/[0.1] bg-white/[0.03] text-[9px] font-semibold text-white/70 hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        {savingDraft ? "Guardando..." : "Guardar draft"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`)}
                        className="h-8 rounded-sm border border-blue-400/25 bg-blue-500/10 text-[9px] font-semibold text-blue-100 hover:bg-blue-500/16"
                      >
                        Abrir QA
                      </button>
                    </div>
                  </section>

                  <section className="rounded-sm border border-white/[0.08] bg-[#0d1629] p-4">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Bloque seleccionado</p>
                    {selectedBlock ? (
                      <>
                        <p className="text-sm font-black text-white mt-2">{labelBlockType(selectedBlock.type)}</p>
                        <p className="text-[10px] text-white/55 mt-1 leading-relaxed">{summarizeBlockContent(selectedBlock)}</p>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => moveBlockByOffset(selectedBlock.id, -1)}
                            className="h-8 rounded-sm border border-white/[0.1] text-[9px] font-semibold text-white/70 hover:bg-white/[0.04]"
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBlockByOffset(selectedBlock.id, 1)}
                            className="h-8 rounded-sm border border-white/[0.1] text-[9px] font-semibold text-white/70 hover:bg-white/[0.04]"
                          >
                            Bajar
                          </button>
                          <button
                            type="button"
                            onClick={() => rotateVariant(selectedBlock.id)}
                            className="h-8 rounded-sm border border-blue-400/25 bg-blue-500/10 text-[9px] font-semibold text-blue-100 hover:bg-blue-500/16"
                          >
                            Variante
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-white/45 mt-2">Selecciona un bloque del canvas.</p>
                    )}
                  </section>

                  {(generationFeedback || quickActionFeedback || qaDelta) && (
                    <section className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-3">
                      {generationFeedback ? <p className="text-[10px] text-white/70 leading-relaxed">{generationFeedback}</p> : null}
                      {quickActionFeedback ? <p className="text-[10px] text-cyan-200/85 leading-relaxed mt-1">{quickActionFeedback}</p> : null}
                      {qaDelta ? (
                        <p className="text-[9px] text-white/50 mt-1">
                          Delta QA: {qaDelta.before == null ? "sin baseline" : qaDelta.before.toFixed(1)} {"->"} {qaDelta.after?.toFixed(1) ?? "-"}
                        </p>
                      ) : null}
                    </section>
                  )}
                </aside>
              </div>
            </div>
          ) : null}

          <div className="hidden" aria-hidden="true">
          {!loading && !error && (
            <div className="max-w-6xl mx-auto mb-3 px-3 py-2 rounded-sm border border-white/[0.08] bg-[#0d1629]">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Modo operador Composer</p>
              <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[9px] text-white/68">
                  Ruta minima para cerrar esta pagina: ajustar, guardar, generar y consolidar QA sin perder contexto.
                </p>
                <span className="text-[8px] font-bold px-2 py-1 rounded-sm border border-cyan-500/25 bg-cyan-500/10 text-cyan-100">
                  Progreso {flowCompletionPercent}% · {flowNextStep <= 4 ? `Paso ${flowNextStep} pendiente` : "Flujo completo"}
                </span>
              </div>
              <div className="mt-2 rounded-sm border border-violet-500/25 bg-violet-500/10 p-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[9px] text-violet-100/90">
                      Siguiente accion sugerida: <span className="font-semibold">{flowStepDescriptor}</span>
                    </p>
                  <button
                    type="button"
                    onClick={() => void handleRunNextStep()}
                    disabled={pipelineBusy || generatingFromComposer || savingDraft || (flowNextStep > 4 && !qaHardGate.ready)}
                    className={cn(
                      "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                      pipelineBusy || generatingFromComposer || savingDraft || (flowNextStep > 4 && !qaHardGate.ready)
                        ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                        : "border-violet-400/30 bg-violet-500/20 text-violet-50 hover:bg-violet-500/28",
                    )}
                  >
                    {(pipelineBusy || generatingFromComposer || savingDraft) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {flowNextStep <= 4 ? `Ejecutar paso ${flowNextStep}` : qaHardGate.ready ? "Abrir QA final" : "Gate QA bloqueado"}
                  </button>
                </div>
                {flowBlockers.length > 0 ? (
                  <div className="mt-2 grid md:grid-cols-2 gap-1.5">
                    {flowBlockers.slice(0, 4).map((blocker) => (
                      <p key={blocker} className="text-[8px] text-violet-100/75">
                        - {blocker}
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
              {lockedQa?.layoutEvidence ? (
                <div className="mt-2 grid md:grid-cols-4 gap-2">
                  <div className="rounded-sm border border-cyan-500/18 bg-cyan-500/8 px-2.5 py-2">
                    <p className="text-[8px] font-bold text-cyan-100/75 uppercase tracking-widest">Upper real</p>
                    <p className="text-[10px] text-white/78 mt-1">
                      {lockedQa.layoutEvidence.upper.rowHeight}px · aire {lockedQa.layoutEvidence.upper.freeVerticalPx}px
                    </p>
                  </div>
                  <div className="rounded-sm border border-cyan-500/18 bg-cyan-500/8 px-2.5 py-2">
                    <p className="text-[8px] font-bold text-cyan-100/75 uppercase tracking-widest">Rail inferior</p>
                    <p className="text-[10px] text-white/78 mt-1">
                      {lockedQa.layoutEvidence.examRail.rowHeight}px · {lockedQa.layoutEvidence.examRail.densityBand}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    lockedQa.layoutEvidence.blockers.length > 0 || lockedQa.layoutEvidence.warnings.length > 0
                      ? "border-amber-500/22 bg-amber-500/10"
                      : "border-emerald-500/20 bg-emerald-500/8",
                  )}>
                    <p className="text-[8px] font-bold text-white/45 uppercase tracking-widest">Lectura real</p>
                    <p className="text-[10px] text-white/78 mt-1 line-clamp-2">
                      {lockedQa.layoutEvidence.blockers[0]
                        ?? lockedQa.layoutEvidence.warnings[0]
                        ?? "Sin alertas post-render en el HTML actual."}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    lockedQa.visualMeasurement?.available
                      ? lockedQa.visualMeasurement.blockers.length > 0 || lockedQa.visualMeasurement.warnings.length > 0
                        ? "border-amber-500/22 bg-amber-500/10"
                        : "border-emerald-500/20 bg-emerald-500/8"
                      : "border-white/[0.08] bg-white/[0.02]",
                  )}>
                    <p className="text-[8px] font-bold text-white/45 uppercase tracking-widest">Medicion visual</p>
                    <p className="text-[10px] text-white/78 mt-1 line-clamp-2">
                      {lockedQa.visualMeasurement?.available
                        ? `${lockedQa.visualMeasurement.score.toFixed(1)}/10 · overflow ${lockedQa.visualMeasurement.overflow.count} · micro ${lockedQa.visualMeasurement.typography.smallTextCount}`
                        : "No disponible: instalar Chromium/Playwright activa lectura real."}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className={cn(
                "mt-2 rounded-sm border p-2.5",
                postRenderRemediation.severity === "success" && "border-emerald-500/25 bg-emerald-500/10",
                postRenderRemediation.severity === "warning" && "border-amber-500/25 bg-amber-500/10",
                postRenderRemediation.severity === "critical" && "border-red-500/25 bg-red-500/10",
              )}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold text-white/35 uppercase tracking-widest">Plan post-render</p>
                    <p className={cn(
                      "text-[11px] font-bold mt-0.5",
                      postRenderRemediation.severity === "success" && "text-emerald-100",
                      postRenderRemediation.severity === "warning" && "text-amber-100",
                      postRenderRemediation.severity === "critical" && "text-red-100",
                    )}>
                      {postRenderRemediation.label}
                    </p>
                    <p className="text-[9px] text-white/68 mt-1 leading-relaxed">{postRenderRemediation.reason}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleApplyPostRenderRemediation()}
                    disabled={pipelineBusy || generatingFromComposer || syncingServerState}
                    className={cn(
                      "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                      pipelineBusy || generatingFromComposer || syncingServerState
                        ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                        : "border-white/[0.12] bg-white/[0.06] text-white/86 hover:bg-white/[0.10]",
                    )}
                  >
                    {(pipelineBusy || generatingFromComposer || syncingServerState) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {postRenderRemediation.actionLabel}
                  </button>
                </div>
                <div className="mt-2 grid md:grid-cols-3 gap-1.5">
                  {postRenderRemediation.evidenceItems.slice(0, 3).map((item) => (
                    <p key={item} className="rounded-sm border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 text-[8px] text-white/62">
                      {item}
                    </p>
                  ))}
                </div>
              </div>
              <div className={cn(
                "mt-2 rounded-sm border p-2.5",
                qaHardGate.ready
                  ? "border-emerald-500/25 bg-emerald-500/10"
                  : "border-amber-500/25 bg-amber-500/10",
              )}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className={cn("text-[9px] font-semibold", qaHardGate.ready ? "text-emerald-100" : "text-amber-100")}>
                    Gate editorial: {qaHardGate.ready ? "habilitado" : "bloqueado"}
                  </p>
                  <span className={cn(
                    "text-[8px] px-2 py-1 rounded-sm border font-bold",
                    qaHardGate.ready
                      ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-200"
                      : "border-amber-500/25 bg-amber-500/12 text-amber-200",
                  )}>
                    Cierre editorial
                  </span>
                </div>
                {qaHardGate.blockers.length > 0 ? (
                  <div className="mt-2 grid md:grid-cols-2 gap-1.5">
                    {qaHardGate.blockers.slice(0, 4).map((blocker) => (
                      <p key={blocker} className="text-[8px] text-amber-100/80">
                        - {blocker}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[8px] text-emerald-100/80">
                    Cierre habilitado: puedes pasar a QA final con score y trazabilidad consolidados.
                  </p>
                )}
              </div>
              <div className="mt-2 grid md:grid-cols-4 gap-2">
                <div className={cn(
                  "px-2.5 py-2 rounded-sm border text-[9px] transition-all",
                  stepDraftAdjusted
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-white/[0.08] bg-white/[0.02] text-white/72",
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span>1. Ajustar bloques en canvas</span>
                    <span className={cn("text-[8px] font-bold", stepDraftAdjusted ? "text-emerald-300" : "text-amber-300")}>
                      {stepDraftAdjusted ? "OK" : "Pendiente"}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-2 rounded-sm border text-[9px] transition-all",
                  stepDraftSaved
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-white/[0.08] bg-white/[0.02] text-white/72",
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span>2. Guardar draft</span>
                    <span className={cn("text-[8px] font-bold", stepDraftSaved ? "text-emerald-300" : "text-amber-300")}>
                      {stepDraftSaved ? "OK" : "Pendiente"}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-2 rounded-sm border text-[9px] transition-all",
                  stepGenerated
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-teal-500/20 bg-teal-500/8 text-teal-100",
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span>3. Generar con draft</span>
                    <span className={cn("text-[8px] font-bold", stepGenerated ? "text-emerald-300" : "text-teal-200")}>
                      {stepGenerated ? "OK" : "Pendiente"}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-2 rounded-sm border text-[9px] transition-all",
                  stepQaReviewed
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
                    : "border-blue-500/20 bg-blue-500/8 text-blue-100",
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span>4. Revisar QA y aprobar</span>
                    <span className={cn("text-[8px] font-bold", stepQaReviewed ? "text-emerald-300" : "text-blue-200")}>
                      {stepQaReviewed ? "OK" : "Pendiente"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center flex-wrap gap-2">
                <span className={cn(
                  "text-[8px] px-2 py-1 rounded-sm border font-bold",
                  qaAlignmentState === "aligned" && "border-emerald-500/25 bg-emerald-500/12 text-emerald-200/85",
                  qaAlignmentState === "pending_regeneration" && "border-amber-500/25 bg-amber-500/12 text-amber-200/85",
                  qaAlignmentState === "projection_only" && "border-violet-500/25 bg-violet-500/12 text-violet-200/85",
                )}>
                  {qaAlignmentState === "aligned" && "Estado: QA consolidado"}
                  {qaAlignmentState === "pending_regeneration" && "Estado: draft más nuevo · falta regenerar"}
                  {qaAlignmentState === "projection_only" && "Estado: solo proyección Composer"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAlignmentOpen(true);
                    setComposerActionsOpen(true);
                    setTransitionOpen(false);
                    setBaselineOpen(false);
                  }}
                  className="h-7 px-2.5 rounded-sm border border-white/[0.08] bg-white/[0.03] text-[8px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.06]"
                >
                  Vista operativa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransitionOpen(true);
                    setAlignmentOpen(true);
                    setBaselineOpen(true);
                    setComposerActionsOpen(true);
                  }}
                  className="h-7 px-2.5 rounded-sm border border-white/[0.08] bg-white/[0.03] text-[8px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.06]"
                >
                  Abrir diagnóstico completo
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFocusMode(false);
                    setComposerActionsOpen(true);
                    setTransitionOpen(false);
                  }}
                  className="h-8 px-3 rounded-sm border border-violet-500/25 bg-violet-500/10 text-[9px] font-semibold text-violet-100 hover:bg-violet-500/16 transition-all"
                >
                  Ir a Paso 1 (ajustar)
                </button>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!proposal || savingDraft}
                  className={cn(
                    "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all",
                    !proposal || savingDraft
                      ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                      : "border-emerald-500/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18",
                  )}
                >
                  {savingDraft ? "Guardando..." : "Paso 2: Guardar draft"}
                </button>
                <button
                  type="button"
                  onClick={handlePipelineToQa}
                  disabled={!editableDraft || pipelineBusy || generatingFromComposer}
                  className={cn(
                    "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                    !editableDraft || pipelineBusy || generatingFromComposer
                      ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                      : "border-emerald-500/25 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18",
                  )}
                >
                  {(pipelineBusy || generatingFromComposer) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {pipelineBusy ? "Corriendo pipeline..." : "Paso 3: Aplicar recomendación + generar + abrir QA"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateWithDraft}
                  disabled={!editableDraft || generatingFromComposer || pipelineBusy}
                  className={cn(
                    "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all",
                    !editableDraft || generatingFromComposer || pipelineBusy
                      ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                      : "border-teal-500/25 bg-teal-500/10 text-teal-100 hover:bg-teal-500/16",
                  )}
                >
                  Generar desde draft
                </button>
                <button
                  type="button"
                  onClick={() => setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`)}
                  className="h-8 px-3 rounded-sm border border-blue-500/25 bg-blue-500/10 text-[9px] font-semibold text-blue-100 hover:bg-blue-500/16 transition-all"
                >
                  Paso 4: Abrir QA
                </button>
                <button
                  type="button"
                  onClick={() => void syncComposerWithServerQa("manual")}
                  disabled={syncingServerState}
                  className={cn(
                    "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                    syncingServerState
                      ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                      : "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/16",
                  )}
                >
                  {syncingServerState ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  {syncingServerState ? "Sincronizando..." : "Sincronizar QA servidor"}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {lastServerSyncAt ? (
                  <span className="text-[8px] px-2 py-1 rounded-sm border border-cyan-500/25 bg-cyan-500/8 text-cyan-100/80">
                    Ultima sync servidor: {formatLogTime(lastServerSyncAt)}
                  </span>
                ) : null}
                {serverSyncMessage ? (
                  <span className="text-[8px] text-cyan-100/80">{serverSyncMessage}</span>
                ) : null}
              </div>
              <details className="mt-2 rounded-sm border border-fuchsia-500/22 bg-fuchsia-500/8 p-2.5 group" open={batchOpen} onToggle={(event) => setBatchOpen((event.target as HTMLDetailsElement).open)}>
                <summary className="list-none cursor-pointer flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-bold text-fuchsia-100 uppercase tracking-widest">Batch Runner</p>
                    <p className="text-[9px] text-fuchsia-100/75 mt-1">Produccion en lote desde Composer con estado y reintento de fallidas.</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-fuchsia-100/60 transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-2">
                  <label className="block text-[8px] text-fuchsia-100/70 uppercase tracking-widest font-bold">Paginas del lote</label>
                  <input
                    value={batchPageInput}
                    onChange={(event) => setBatchPageInput(event.target.value)}
                    placeholder="01,02,03,04,05"
                    className="w-full h-8 rounded-sm bg-[#0b1a31] border border-fuchsia-400/25 text-[9px] text-white/80 px-2 outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleStartBatchRun()}
                      disabled={batchStarting}
                      className={cn(
                        "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                        batchStarting
                          ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                          : "border-fuchsia-400/30 bg-fuchsia-500/18 text-fuchsia-50 hover:bg-fuchsia-500/24",
                      )}
                    >
                      {batchStarting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {batchStarting ? "Iniciando..." : "Iniciar batch"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void refreshBatchStatus(batchRunId, "manual")}
                      disabled={!batchRunId || batchRefreshing}
                      className={cn(
                        "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all",
                        !batchRunId || batchRefreshing
                          ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                          : "border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/16",
                      )}
                    >
                      {batchRefreshing ? "Refrescando..." : "Refrescar estado"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRetryBatchFailed()}
                      disabled={!batchRunId || batchRetrying}
                      className={cn(
                        "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all",
                        !batchRunId || batchRetrying
                          ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/16",
                      )}
                    >
                      {batchRetrying ? "Reintentando..." : "Retry failed"}
                    </button>
                  </div>
                  {batchRunId ? (
                    <p className="text-[8px] text-fuchsia-100/70">
                      Run activo: <span className="font-semibold text-fuchsia-100">{batchRunId}</span>
                    </p>
                  ) : null}
                  {batchStatus ? (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                        <p className="text-[8px] text-white/35 uppercase tracking-widest">Queued</p>
                        <p className="text-[10px] font-bold text-white/78 mt-1">{batchStatus.counts.queued}</p>
                      </div>
                      <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                        <p className="text-[8px] text-white/35 uppercase tracking-widest">Running</p>
                        <p className="text-[10px] font-bold text-cyan-200 mt-1">{batchStatus.counts.running}</p>
                      </div>
                      <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                        <p className="text-[8px] text-white/35 uppercase tracking-widest">Completed</p>
                        <p className="text-[10px] font-bold text-emerald-200 mt-1">{batchStatus.counts.completed}</p>
                      </div>
                      <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                        <p className="text-[8px] text-white/35 uppercase tracking-widest">Failed</p>
                        <p className="text-[10px] font-bold text-rose-200 mt-1">{batchStatus.counts.failed}</p>
                      </div>
                    </div>
                  ) : null}
                  {batchMessage ? <p className="text-[8px] text-fuchsia-100/80">{batchMessage}</p> : null}
                </div>
              </details>
              {recommendedObjective ? (
                <div className="mt-2 px-2.5 py-2 rounded-sm border border-teal-500/25 bg-teal-500/10 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[8px] font-bold text-teal-100 uppercase tracking-widest">Objetivo recomendado</p>
                    <p className="text-[9px] text-teal-100/85 mt-1">{recommendedObjective.label}</p>
                    <p className="text-[8px] text-teal-100/65 mt-1">{recommendedObjective.hint}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRunObjective(recommendedObjective.id)}
                    disabled={generatingFromComposer || pipelineBusy || Boolean(quickActionBusy)}
                    className={cn(
                      "h-8 px-3 rounded-sm border text-[9px] font-semibold transition-all flex items-center gap-1.5",
                      generatingFromComposer || pipelineBusy || Boolean(quickActionBusy)
                        ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                        : "border-teal-400/30 bg-teal-500/20 text-teal-50 hover:bg-teal-500/28",
                    )}
                  >
                    {(generatingFromComposer || pipelineBusy) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Ejecutar objetivo
                  </button>
                </div>
              ) : (
                <div className="mt-2 px-2.5 py-2 rounded-sm border border-emerald-500/20 bg-emerald-500/10 text-[9px] text-emerald-100/85">
                  No hay objetivo dominante pendiente: la página está en zona de ajustes finos.
                </div>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="max-w-5xl mx-auto bg-amber-500/8 border border-amber-400/20 rounded-sm p-4">
              <p className="text-[11px] font-bold text-amber-200">Composer usando propuesta local</p>
              <p className="text-[10px] text-amber-100/70 mt-1">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="max-w-5xl mx-auto flex items-center gap-2 py-8 text-white/35">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px]">Armando propuesta editorial compositiva...</span>
            </div>
          ) : proposal ? (
            <div className="max-w-6xl mx-auto space-y-4">
              {!focusMode && (
                <>
                  <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <button
                    type="button"
                    onClick={() => setTransitionOpen((value) => !value)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center shrink-0">
                        <ArrowRightLeft className="w-4 h-4 text-white/35" />
                      </div>
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Transicion recomendada</p>
                        <p className="text-sm font-black text-white/88 mt-1">{labelTransition(proposal.recommendedTransition.level)}</p>
                        <p className="text-[10px] text-white/45 mt-1 leading-relaxed max-w-2xl">
                          {proposal.recommendedTransition.reason}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", transitionOpen && "rotate-180")} />
                  </button>

                  {transitionOpen && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-emerald-300/85 uppercase tracking-widest">Se desbloquea</p>
                      <ul className="mt-2 space-y-1.5">
                        {proposal.recommendedTransition.unlockedCapabilities.map((item) => (
                          <li key={item} className="text-[10px] text-white/70 leading-relaxed">- {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-amber-300/85 uppercase tracking-widest">Se mantiene bloqueado</p>
                      <ul className="mt-2 space-y-1.5">
                        {proposal.recommendedTransition.blockedCapabilities.map((item) => (
                          <li key={item} className="text-[10px] text-white/70 leading-relaxed">- {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  )}
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <button
                    type="button"
                    onClick={() => setAlignmentOpen((value) => !value)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-white/35" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Alineacion QA / Composer</p>
                          {qaResolution.source !== "none" && (
                            <span className={cn(
                              "text-[7px] px-1.5 py-px rounded-sm border font-bold",
                              qaResolution.source === "server"
                                ? "border-teal-500/20 bg-teal-500/8 text-teal-300/80"
                                : "border-violet-500/20 bg-violet-500/10 text-violet-200/85"
                            )}>
                              {qaResolution.sourceLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/45 mt-1">
                          Fuente activa: <span className="text-white/75 font-semibold">{qaResolution.sourceLabel}</span>
                          {activeGapToTarget != null ? (
                            <>
                              {" "}· brecha a 9.5: <span className="text-amber-300/85 font-semibold">{activeGapToTarget.toFixed(1)}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", alignmentOpen && "rotate-180")} />
                  </button>

                  {alignmentOpen && (
                    <>
                  <div className="flex items-start justify-between gap-3 mt-3">
                    <div>
                      <div className="grid sm:grid-cols-2 gap-2 mt-2">
                        <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-1.5">
                          <p className="text-[8px] text-white/35 uppercase tracking-widest">QA servidor</p>
                          <p className="text-[12px] font-black text-white/82 mt-1">
                            {serverQaTotal != null ? `${serverQaTotal.toFixed(1)}/10` : "Sin QA"}
                          </p>
                        </div>
                        <div className="rounded-sm border border-violet-500/20 bg-violet-500/10 px-2 py-1.5">
                          <p className="text-[8px] text-violet-200/65 uppercase tracking-widest">Composer draft</p>
                          <p className="text-[12px] font-black text-violet-100 mt-1">
                            {composerQaTotal != null ? `${composerQaTotal.toFixed(1)}/10` : "Sin proyeccion"}
                          </p>
                        </div>
                      </div>
                      <p className={cn(
                        "text-[9px] mt-2",
                        qaResolution.source === "server" ? "text-teal-300/75" : "text-violet-300/80",
                      )}>
                        {qaResolution.sourceHint}
                      </p>
                      <div className={cn(
                        "mt-2 px-2.5 py-2 rounded-sm border text-[9px]",
                        qaAlignmentState === "aligned" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-200/85",
                        qaAlignmentState === "pending_regeneration" && "border-amber-500/20 bg-amber-500/10 text-amber-200/85",
                        qaAlignmentState === "projection_only" && "border-violet-500/20 bg-violet-500/10 text-violet-200/85",
                      )}>
                        {qaAlignmentState === "aligned" && "QA oficial ya está alineado con el estado actual de la página."}
                        {qaAlignmentState === "pending_regeneration" && "El draft Composer es más nuevo: regenera para consolidar este score en QA oficial."}
                        {qaAlignmentState === "projection_only" && "Solo existe proyección de Composer. Falta una corrida real para fijar QA servidor."}
                      </div>
                      <div className="mt-2 grid sm:grid-cols-2 gap-2">
                        <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-1.5">
                          <p className="text-[8px] text-white/35 uppercase tracking-widest">Ult QA servidor</p>
                          <p className="text-[9px] text-white/70 mt-1">
                            {lockedStatus?.generatedAt ? formatLogTime(lockedStatus.generatedAt) : "Sin generacion"}
                          </p>
                        </div>
                        <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-1.5">
                          <p className="text-[8px] text-white/35 uppercase tracking-widest">Ult draft composer</p>
                          <p className="text-[9px] text-white/70 mt-1">
                            {draftRecord?.updatedAt ? formatLogTime(draftRecord.updatedAt) : "Sin draft guardado"}
                          </p>
                        </div>
                      </div>
                      {lockedQa?.layoutEvidence ? (
                        <div className="mt-2 rounded-sm border border-cyan-500/18 bg-cyan-500/8 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[8px] font-bold text-cyan-100/80 uppercase tracking-widest">Evidencia post-render real</p>
                            <span className={cn(
                              "text-[9px] font-black",
                              lockedQa.layoutEvidence.score >= 9 ? "text-emerald-300" : lockedQa.layoutEvidence.score >= 8 ? "text-cyan-300" : "text-amber-300",
                            )}>
                              {lockedQa.layoutEvidence.score.toFixed(1)}/10
                            </span>
                          </div>
                          <div className="grid sm:grid-cols-3 gap-2 mt-2">
                            <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                              <p className="text-[8px] text-white/35 uppercase tracking-widest">Upper</p>
                              <p className="text-[9px] text-white/72 mt-1">
                                {lockedQa.layoutEvidence.upper.rowHeight}px · aire {lockedQa.layoutEvidence.upper.freeVerticalPx}px
                              </p>
                            </div>
                            <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                              <p className="text-[8px] text-white/35 uppercase tracking-widest">Rail</p>
                              <p className="text-[9px] text-white/72 mt-1">
                                {lockedQa.layoutEvidence.examRail.rowHeight}px · {lockedQa.layoutEvidence.examRail.sharePct}%
                              </p>
                            </div>
                            <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
                              <p className="text-[8px] text-white/35 uppercase tracking-widest">Densidad</p>
                              <p className="text-[9px] text-white/72 mt-1">
                                {lockedQa.layoutEvidence.examRail.densityBand}
                              </p>
                            </div>
                          </div>
                          {[...lockedQa.layoutEvidence.blockers, ...lockedQa.layoutEvidence.warnings].length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {[...lockedQa.layoutEvidence.blockers, ...lockedQa.layoutEvidence.warnings].slice(0, 3).map((item) => (
                                <p key={item} className="text-[8px] text-amber-100/80 leading-relaxed">- {item}</p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-2 rounded-sm border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[9px] text-white/42">
                          El proximo render generara evidencia post-render real para comparar upper, rail y densidad.
                        </div>
                      )}
                    </div>
                  </div>
                  {qaResolution.hasDivergence && (
                    <div className="mt-3 px-3 py-2 rounded-sm border border-violet-500/20 bg-violet-500/10 text-[9px] text-violet-200/85 leading-relaxed">
                      Diferencia detectada: servidor <span className="font-semibold">{qaResolution.serverTotal?.toFixed(1)}/10</span> vs composer{" "}
                      <span className="font-semibold">{qaResolution.composerTotal?.toFixed(1)}/10</span>. Para consolidar trazabilidad, genera desde draft y valida en QA.
                    </div>
                  )}

                  <div className="space-y-3 mt-4">
                    {QA_ALIGNMENT_DIMS.map((dimension) => {
                      const composerScore = projectedQaScores?.[dimension.key] ?? 0;
                      const score = qaResolution.activeScores?.[dimension.key] ?? composerScore;
                      const hundred = qaScoreToHundred(score);
                      const locked = lockedQa?.scores?.[dimension.key];
                      const lockedNormalized = locked == null ? null : normalizeQaScoreToTen(locked);
                      const delta = lockedNormalized != null ? Number((composerScore - lockedNormalized).toFixed(1)) : null;
                      return (
                        <div key={dimension.key}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] text-white/70 font-semibold">{dimension.label}</span>
                            <div className="text-right">
                              <span className={cn("text-[11px] font-bold", scoreColorDark(hundred))}>{hundred}/100</span>
                              {delta != null && (
                                <p className={cn("text-[8px] mt-0.5", delta >= 0 ? "text-emerald-300/85" : "text-amber-300/85")}>
                                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)} proy. vs QA
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", hundred >= 90 ? "bg-emerald-400" : hundred >= 80 ? "bg-cyan-400" : "bg-amber-400")}
                              style={{ width: `${Math.min(100, hundred)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                    </>
                  )}
                </section>
                  </div>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <button
                  type="button"
                  onClick={() => setBaselineOpen((value) => !value)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-white/35" />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Baseline locked real</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">
                        {lockedQa?.scores
                          ? `Puntaje real ${lockedTotal?.toFixed(1) ?? "0.0"}/10`
                          : "Todavia sin baseline real para esta pagina"}
                      </p>
                      <p className="text-[10px] text-white/50 mt-1">
                        {lockedStatus?.hasOutput
                          ? `Output detectado: ${lockedStatus.generationMode}`
                          : "Genera la pagina y ejecuta QA para heredar metrica fija al Composer."}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", baselineOpen && "rotate-180")} />
                </button>

                {baselineOpen && (lockedQa?.scores ? (
                  <div className="grid lg:grid-cols-[0.46fr_0.54fr] gap-4 mt-4">
                    <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Brecha a 9.5</p>
                      <p className="text-lg font-black text-amber-300 mt-1">{lockedGap?.toFixed(1) ?? "0.0"}</p>
                      <p className="text-[10px] text-white/55 mt-2">
                        {lockedGap && lockedGap > 0
                          ? "Usa estas dimensiones debiles para dirigir la siguiente regeneracion."
                          : "La pagina ya esta en rango objetivo del baseline editorial."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {lockedWeakDims.map((dim) => {
                        const pct = Math.round((dim.value / 10) * 100);
                        return (
                          <div key={dim.key} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[10px] font-semibold text-white/78">{dim.label}</p>
                              <p className={cn("text-[11px] font-bold", scoreColorDark(pct))}>{pct}/100</p>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={cn("h-full rounded-full", pct >= 90 ? "bg-emerald-400" : pct >= 80 ? "bg-cyan-400" : "bg-amber-400")}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-white/55 mt-2">{scoreFromLockedDim(dim.label, dim.value)}</p>
                            <p className="text-[10px] text-blue-200/80 mt-1">{lockedActionHint(dim.key)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 px-3 py-3 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/65">
                    Composer ya esta listo, pero para cerrar brecha real necesitamos una corrida con output + QA de esta misma pagina.
                  </div>
                ))}
                  </section>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <button
                  type="button"
                  onClick={() => setComposerActionsOpen((value) => !value)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Acciones Composer</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">Ajustes directos sobre el draft actual</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/45">Impacta score proyectado al instante</span>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", composerActionsOpen && "rotate-180")} />
                  </div>
                </button>
                {composerActionsOpen && (
                  <>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAutofixComposer}
                    className="px-3 py-1.5 rounded-sm border border-violet-400/25 bg-violet-500/10 text-[10px] font-semibold text-violet-100 hover:bg-violet-500/15 transition-colors"
                  >
                    Autocorregir premium
                  </button>
                  <button
                    type="button"
                    onClick={() => runShortcutAction("compact_rail", "Compactar rail")}
                    disabled={Boolean(quickActionBusy) || generatingFromComposer}
                    className="px-3 py-1.5 rounded-sm border border-amber-400/25 bg-amber-500/10 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/15 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    Compactar rail inferior
                  </button>
                  <button
                    type="button"
                    onClick={() => runShortcutAction("expand_context", "Expandir contexto")}
                    disabled={Boolean(quickActionBusy) || generatingFromComposer}
                    className="px-3 py-1.5 rounded-sm border border-sky-400/25 bg-sky-500/10 text-[10px] font-semibold text-sky-100 hover:bg-sky-500/15 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    Expandir contexto
                  </button>
                  <button
                    type="button"
                    onClick={() => runShortcutAction("boost_technical", "Reforzar nucleo tecnico")}
                    disabled={Boolean(quickActionBusy) || generatingFromComposer}
                    className="px-3 py-1.5 rounded-sm border border-emerald-400/25 bg-emerald-500/10 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/15 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    Elevar nucleo tecnico
                  </button>
                </div>
                {autofixFeedback ? (
                  <p className="text-[10px] text-violet-200/80 mt-3 leading-relaxed">{autofixFeedback}</p>
                ) : null}
                  </>
                )}
                  </section>
                </>
              )}

              <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Estado Composer</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">
                      {composerReadiness.isReadyForPublish ? "Listo para cierre editorial" : "Ajuste en progreso"}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[8px] px-2 py-1 rounded-sm border font-bold",
                    composerReadiness.isReadyForPublish
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-200",
                  )}>
                    {composerReadiness.isReadyForPublish ? "READY" : "WORKING"}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    composerReadiness.hasFourTechnical ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8",
                  )}>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Nucleo tecnico</p>
                    <p className="text-[10px] font-bold mt-1 text-white/80">
                      {composerReadiness.hasFourTechnical ? "4 tarjetas activas" : `${technicalBlockCount}/4 tarjetas`}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    composerReadiness.targetReached ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8",
                  )}>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Objetivo 9.5</p>
                    <p className="text-[10px] font-bold mt-1 text-white/80">
                      {composerReadiness.projectedTotal?.toFixed(1) ?? "-"} / 10
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    composerReadiness.serverAligned ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8",
                  )}>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Alineación QA</p>
                    <p className="text-[10px] font-bold mt-1 text-white/80">
                      {composerReadiness.serverAligned ? "Sync con servidor" : "Pendiente regeneración"}
                    </p>
                  </div>
                  <div className={cn(
                    "rounded-sm border px-2.5 py-2",
                    composerReadiness.hasRealOutput ? "border-emerald-500/20 bg-emerald-500/8" : "border-amber-500/20 bg-amber-500/8",
                  )}>
                    <p className="text-[8px] text-white/30 uppercase tracking-widest">Output real</p>
                    <p className="text-[10px] font-bold mt-1 text-white/80">
                      {composerReadiness.hasRealOutput ? "Disponible" : "Aun no generado"}
                    </p>
                  </div>
                </div>
                <div className="rounded-sm border border-white/[0.08] bg-[#0b1a31] p-3 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Siguiente accion operativa</p>
                    <span className={cn(
                      "text-[9px] font-bold",
                      benchmark.score >= 90 ? "text-emerald-300" : benchmark.score >= 75 ? "text-cyan-300" : "text-amber-300",
                    )}>
                      {benchmark.score}/100
                    </span>
                  </div>
                  <p className="text-[10px] text-white/60 mt-2">{benchmark.summary}</p>
                  {recommendedShortcut ? (
                    <div className="mt-3 rounded-sm border border-amber-500/25 bg-amber-500/10 px-3 py-2">
                      <p className="text-[9px] text-amber-100 font-semibold">
                        Recomendado: {recommendedShortcut.label}
                      </p>
                      <p className="text-[9px] text-amber-200/75 mt-1">{recommendedShortcut.reason}.</p>
                      <button
                        type="button"
                        onClick={() => runShortcutAction(recommendedShortcut.action, recommendedShortcut.label)}
                        disabled={Boolean(quickActionBusy) || generatingFromComposer}
                        className="mt-2 h-7 px-2.5 rounded-sm border border-amber-400/30 bg-amber-500/20 text-[9px] font-semibold text-amber-50 hover:bg-amber-500/30 disabled:opacity-55 disabled:cursor-not-allowed"
                      >
                        {quickActionBusy === recommendedShortcut.action ? "Aplicando recomendacion..." : "Aplicar recomendacion"}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[9px] text-emerald-100">
                      No hay accion dominante pendiente: sigue con QA o ajustes finos por bloque.
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-2 mt-3">
                    {benchmark.checks.map((check) => (
                      <div
                        key={check.id}
                        className={cn(
                          "rounded-sm border px-2.5 py-2",
                          check.passed
                            ? "border-emerald-500/20 bg-emerald-500/8"
                            : "border-amber-500/20 bg-amber-500/8",
                        )}
                      >
                        <p className={cn(
                          "text-[9px] font-semibold",
                          check.passed ? "text-emerald-200/90" : "text-amber-200/90",
                        )}>
                          {check.label}
                        </p>
                        <p className="text-[9px] text-white/52 mt-1 leading-relaxed">{check.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Canvas Composer</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">Editor compositivo: arrastra, suelta y ajusta variantes en contexto</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCanvasMode("draft")}
                      className={cn(
                        "h-7 px-2.5 rounded-sm border text-[9px] font-semibold transition-all",
                        canvasMode === "draft"
                          ? "border-blue-500/30 bg-blue-500/15 text-blue-100"
                          : "border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/75"
                      )}
                    >
                      Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanvasMode("real")}
                      className={cn(
                        "h-7 px-2.5 rounded-sm border text-[9px] font-semibold transition-all",
                        canvasMode === "real"
                          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-100"
                          : "border-white/[0.08] bg-white/[0.02] text-white/50 hover:text-white/75"
                      )}
                    >
                      Output real
                    </button>
                  </div>
                </div>

                <div className="grid xl:grid-cols-[0.68fr_0.32fr] gap-4 mt-4">
                  <div className="rounded-sm border border-white/[0.06] bg-[#09111e] p-3">
                    {canvasMode === "real" ? (
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.06] bg-[#0b1424] overflow-hidden">
                        {realHtmlPreviewUrl ? (
                          <iframe
                            title={`Output real pagina ${pageIdFromRoute}`}
                            src={realHtmlPreviewUrl}
                            className="w-full h-full border-0 bg-white"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[10px] text-white/45">
                            Aun no hay output real para esta pagina.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.06] bg-[#f7fbff] overflow-y-auto p-[10px]">
                        <div className="h-full w-full flex flex-col gap-[8px]">
                          {sortedBlocks.map((block, index) => {
                            const selected = selectedBlock?.id === block.id;
                            const blockHeight = Math.max(36, Math.min(170, Math.round(estimateBlockHeight(block) * 0.52)));
                            const isDragging = draggingBlockId === block.id;
                            return (
                              <div key={`canvas-wrap:${block.id}`} className="space-y-[6px]">
                                {draggingBlockId && draggingBlockId !== block.id && (
                                  <div
                                    className="h-[8px] rounded-full border border-dashed border-[#69a1ff]/45 bg-[#69a1ff]/10"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      if (!draggingBlockId) return;
                                      reorderFromCanvas(draggingBlockId, block.id, "before");
                                      setDraggingBlockId(null);
                                    }}
                                  />
                                )}
                                <button
                                  type="button"
                                  draggable
                                  onDragStart={() => setDraggingBlockId(block.id)}
                                  onDragEnd={() => setDraggingBlockId(null)}
                                  onClick={() => setSelectedBlockId(block.id)}
                                  className={cn(
                                    "w-full text-left rounded-[6px] border px-2 py-2 transition-all",
                                    selected
                                      ? "border-[#1f6fff] bg-[#eaf3ff] shadow-[0_0_0_1px_rgba(31,111,255,0.35)]"
                                      : "border-[#d8e4f4] bg-white hover:border-[#9bb8ea]",
                                    isDragging && "opacity-45"
                                  )}
                                  style={{ minHeight: `${blockHeight}px` }}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <GripVertical className="w-3 h-3 text-[#4369a8] shrink-0" />
                                      <span className="text-[7px] font-black text-[#10336d] uppercase tracking-[0.09em]">{String(index + 1).padStart(2, "0")}</span>
                                      <span className="text-[9px] font-bold text-[#1b3360] truncate">{labelBlockType(block.type)}</span>
                                    </div>
                                    <span className="text-[8px] text-[#5071a6] bg-[#e8f0fc] border border-[#d4e2f8] rounded-[4px] px-1.5 py-0.5">{block.variant}</span>
                                  </div>
                                  <p className="text-[8px] text-[#405c8f] leading-snug mt-2 line-clamp-3">{summarizeBlockContent(block)}</p>
                                </button>
                                {draggingBlockId && draggingBlockId !== block.id && (
                                  <div
                                    className="h-[8px] rounded-full border border-dashed border-[#69a1ff]/45 bg-[#69a1ff]/10"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      if (!draggingBlockId) return;
                                      reorderFromCanvas(draggingBlockId, block.id, "after");
                                      setDraggingBlockId(null);
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                          {draggingBlockId && sortedBlocks.length > 0 && (
                            <div
                              className="h-[8px] rounded-full border border-dashed border-[#69a1ff]/45 bg-[#69a1ff]/10"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                const lastBlockId = sortedBlocks[sortedBlocks.length - 1]?.id;
                                if (!draggingBlockId || !lastBlockId) return;
                                reorderFromCanvas(draggingBlockId, lastBlockId, "after");
                                setDraggingBlockId(null);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Semaforo rapido</p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                          <p className="text-[8px] text-white/30 uppercase tracking-widest">Bloques tecnicos</p>
                          <p className={cn("text-[11px] font-bold mt-1", technicalBlockCount >= 4 ? "text-emerald-300" : "text-amber-300")}>
                            {technicalBlockCount}/4
                          </p>
                        </div>
                        <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                          <p className="text-[8px] text-white/30 uppercase tracking-widest">Brecha 9.5</p>
                          <p className={cn("text-[11px] font-bold mt-1", (projectedGap ?? 0) <= 0.6 ? "text-emerald-300" : "text-amber-300")}>
                            {projectedGap?.toFixed(1) ?? "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Asistente de decision</p>
                      <p className="text-[9px] text-white/48 mt-1">Paso {Math.min(decisionFlow.currentStep, 3)} de 3 para cerrar la pagina.</p>
                      <div className="space-y-2 mt-2">
                        {decisionFlow.steps.map((step) => (
                          <div
                            key={step.id}
                            className={cn(
                              "rounded-sm border px-2.5 py-2",
                              step.done
                                ? "border-emerald-500/20 bg-emerald-500/8"
                                : step.id === decisionFlow.currentStep
                                  ? "border-amber-500/25 bg-amber-500/10"
                                  : "border-white/[0.08] bg-white/[0.02]",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn("text-[9px] font-semibold", step.done ? "text-emerald-200/90" : "text-white/80")}>
                                {step.id}. {step.title}
                              </p>
                              <span className={cn(
                                "text-[8px] font-bold",
                                step.done ? "text-emerald-300" : step.id === decisionFlow.currentStep ? "text-amber-300" : "text-white/35",
                              )}>
                                {step.done ? "OK" : step.id === decisionFlow.currentStep ? "Ahora" : "Pendiente"}
                              </span>
                            </div>
                            <p className="text-[9px] text-white/52 mt-1">{step.detail}</p>
                          </div>
                        ))}
                      </div>
                      {recommendedShortcut && (
                        <button
                          type="button"
                          onClick={() => runShortcutAction(recommendedShortcut.action, recommendedShortcut.label)}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className="mt-2 w-full h-8 rounded-sm border border-amber-400/25 bg-amber-500/15 text-[9px] font-semibold text-amber-100 hover:bg-amber-500/22 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {quickActionBusy === recommendedShortcut.action ? "Aplicando recomendacion..." : `Aplicar ahora: ${recommendedShortcut.label}`}
                        </button>
                      )}
                    </div>

                    <details className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 group" open>
                      <summary className="list-none cursor-pointer flex items-center justify-between">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Bloque seleccionado</p>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2">
                      {selectedBlock ? (
                        <>
                          {(() => {
                            const selectedBlockScope = resolveScopeFromBlockType(selectedBlock.type);
                            return (
                              <div className="mt-2 rounded-sm border border-cyan-400/18 bg-cyan-500/10 px-2 py-2">
                                <p className="text-[8px] font-bold uppercase tracking-widest text-cyan-100/85">Scope sugerido</p>
                                <p className="text-[9px] text-cyan-100 mt-1">
                                  Este bloque regenera sobre: <span className="font-semibold">{labelRegenerationScope(selectedBlockScope)}</span>
                                </p>
                              </div>
                            );
                          })()}
                          <p className="text-[11px] font-bold text-white/78 mt-2">{labelBlockType(selectedBlock.type)}</p>
                          <p className="text-[9px] text-white/45 mt-1">{summarizeBlockContent(selectedBlock)}</p>

                          <div className="mt-3 space-y-2">
                            <label className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Variante</label>
                            <select
                              value={selectedBlock.variant}
                              onChange={(event) => setBlockVariant(selectedBlock.id, event.target.value)}
                              className="w-full h-8 rounded-sm bg-[#0b1a31] border border-white/[0.1] text-[9px] text-white/75 px-2 outline-none"
                            >
                              {(BLOCK_VARIANTS[selectedBlock.type] ?? [selectedBlock.variant]).map((variant) => (
                                <option key={variant} value={variant} className="bg-[#0b1a31] text-white">
                                  {variant}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => moveBlockByOffset(selectedBlock.id, -1)}
                              className="h-8 rounded-sm border border-white/[0.1] text-[9px] font-semibold text-white/70 hover:bg-white/[0.04] flex items-center justify-center gap-1"
                            >
                              <ArrowUp className="w-3 h-3" /> Subir
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlockByOffset(selectedBlock.id, 1)}
                              className="h-8 rounded-sm border border-white/[0.1] text-[9px] font-semibold text-white/70 hover:bg-white/[0.04] flex items-center justify-center gap-1"
                            >
                              <ArrowDown className="w-3 h-3" /> Bajar
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={handleRegenerateSelectedBlock}
                            disabled={generatingFromComposer || pipelineBusy}
                            className={cn(
                              "mt-2 w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                              !generatingFromComposer && !pipelineBusy
                                ? "border-cyan-400/25 bg-cyan-500/12 text-cyan-100 hover:bg-cyan-500/18"
                                : "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed",
                            )}
                          >
                            {(generatingFromComposer || pipelineBusy) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Waypoints className="w-3 h-3" />}
                            {(generatingFromComposer || pipelineBusy) ? "Regenerando bloque..." : "Regenerar por bloque seleccionado"}
                          </button>
                        </>
                      ) : (
                        <p className="text-[9px] text-white/45 mt-2">Selecciona un bloque para editarlo.</p>
                      )}
                      </div>
                    </details>

                    <details className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 group" open>
                      <summary className="list-none cursor-pointer flex items-center justify-between">
                        <div>
                          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Atajos editoriales</p>
                          <p className="text-[9px] text-white/48 mt-1 leading-relaxed">Cada atajo aplica cambios al draft y dispara regeneracion real.</p>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 space-y-2">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Objetivos editoriales (Sprint 5)</p>
                        <div className="grid gap-2">
                          {COMPOSER_OBJECTIVES.map((objective) => (
                            <button
                              key={objective.id}
                              type="button"
                              onClick={() => handleRunObjective(objective.id)}
                              disabled={Boolean(quickActionBusy) || generatingFromComposer || pipelineBusy}
                              className={cn(
                                "w-full text-left px-2.5 py-2 rounded-sm border transition-all",
                                !Boolean(quickActionBusy) && !generatingFromComposer && !pipelineBusy
                                  ? "border-teal-400/20 bg-teal-500/10 hover:bg-teal-500/16"
                                  : "border-white/[0.06] bg-white/[0.02] opacity-60 cursor-not-allowed",
                              )}
                            >
                              <p className="text-[9px] font-semibold text-teal-100">{objective.label}</p>
                              <p className="text-[8px] text-teal-100/70 mt-1">{objective.hint}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-2 space-y-2">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Presets Composer</p>
                        <div className="grid gap-2">
                          {COMPOSER_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleApplyPreset(preset.id, false)}
                              disabled={Boolean(quickActionBusy) || generatingFromComposer}
                              className={cn(
                                "w-full text-left px-2.5 py-2 rounded-sm border transition-all",
                                !Boolean(quickActionBusy) && !generatingFromComposer
                                  ? "border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.05]"
                                  : "border-white/[0.06] bg-white/[0.02] opacity-60 cursor-not-allowed",
                              )}
                            >
                              <p className="text-[9px] font-semibold text-white/82">{preset.label}</p>
                              <p className="text-[8px] text-white/45 mt-1">{preset.hint}</p>
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset("premium_balanced", true)}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !Boolean(quickActionBusy) && !generatingFromComposer
                              ? "border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-100 hover:bg-fuchsia-500/18"
                              : "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed",
                          )}
                        >
                          {generatingFromComposer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {generatingFromComposer ? "Aplicando preset..." : "Preset premium + abrir QA"}
                        </button>
                      </div>
                      <div className="space-y-2 mt-2">
                        <button
                          type="button"
                          onClick={() => runShortcutAction("compact_rail", "Compactar rail")}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className="w-full h-8 rounded-sm border border-amber-400/25 bg-amber-500/10 text-[9px] font-semibold text-amber-100 hover:bg-amber-500/15 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {quickActionBusy === "compact_rail" ? "Aplicando..." : "Compactar rail"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runShortcutAction("expand_context", "Expandir contexto")}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className="w-full h-8 rounded-sm border border-sky-400/25 bg-sky-500/10 text-[9px] font-semibold text-sky-100 hover:bg-sky-500/15 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {quickActionBusy === "expand_context" ? "Aplicando..." : "Expandir contexto"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runShortcutAction("boost_technical", "Reforzar nucleo tecnico")}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className="w-full h-8 rounded-sm border border-emerald-400/25 bg-emerald-500/10 text-[9px] font-semibold text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {quickActionBusy === "boost_technical" ? "Aplicando..." : "Reforzar nucleo tecnico"}
                        </button>
                        <button
                          type="button"
                          onClick={() => runShortcutAction("enforce_four_cards", "Estructura 4 tarjetas")}
                          disabled={Boolean(quickActionBusy) || generatingFromComposer}
                          className="w-full h-8 rounded-sm border border-violet-400/25 bg-violet-500/10 text-[9px] font-semibold text-violet-100 hover:bg-violet-500/15 disabled:opacity-55 disabled:cursor-not-allowed"
                        >
                          {quickActionBusy === "enforce_four_cards" ? "Aplicando..." : "Estructura 4 tarjetas"}
                        </button>
                        <button
                          type="button"
                          onClick={handleRevertLastShortcut}
                          disabled={!lastShortcutSnapshot || generatingFromComposer || Boolean(quickActionBusy)}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold",
                            !lastShortcutSnapshot || generatingFromComposer || Boolean(quickActionBusy)
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/16",
                          )}
                        >
                          Revertir ultimo atajo
                        </button>
                      </div>
                      {quickActionFeedback ? (
                        <p className="text-[9px] text-cyan-200/85 mt-2 leading-relaxed">{quickActionFeedback}</p>
                      ) : null}
                    </details>

                    <details className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 group" open>
                      <summary className="list-none cursor-pointer flex items-center justify-between">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Diff de impacto</p>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2">
                        {shortcutImpact ? (
                          <div className="space-y-2">
                            <p className="text-[9px] text-white/65">
                              Último ajuste: <span className="text-white/85 font-semibold">{shortcutImpact.label}</span>
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                                <p className="text-[8px] text-white/30 uppercase tracking-widest">rail</p>
                                <p className={cn("text-[10px] font-bold mt-1", shortcutImpact.railDelta <= 0 ? "text-emerald-300" : "text-amber-300")}>
                                  {shortcutImpact.railDelta >= 0 ? "+" : ""}{shortcutImpact.railDelta}%
                                </p>
                              </div>
                              <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                                <p className="text-[8px] text-white/30 uppercase tracking-widest">técnico</p>
                                <p className={cn("text-[10px] font-bold mt-1", shortcutImpact.technicalDelta >= 0 ? "text-emerald-300" : "text-amber-300")}>
                                  {shortcutImpact.technicalDelta >= 0 ? "+" : ""}{shortcutImpact.technicalDelta}%
                                </p>
                              </div>
                              <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2 py-2">
                                <p className="text-[8px] text-white/30 uppercase tracking-widest">movidos</p>
                                <p className="text-[10px] font-bold mt-1 text-cyan-300">{shortcutImpact.moved}</p>
                              </div>
                            </div>
                            {zoneImpact ? (
                              <div className="mt-1 space-y-1.5 rounded-sm border border-white/[0.08] bg-white/[0.02] p-2.5">
                                <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Before / After por zona</p>
                                <div>
                                  <div className="flex items-center justify-between text-[8px] text-white/55">
                                    <span>Intro</span>
                                    <span>{zoneImpact.before.introShare}% {"->"} {zoneImpact.after.introShare}%</span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div className="h-full bg-violet-400/75" style={{ width: `${Math.min(100, zoneImpact.after.introShare)}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-[8px] text-white/55">
                                    <span>Tecnico</span>
                                    <span>{zoneImpact.before.technicalShare}% {"->"} {zoneImpact.after.technicalShare}%</span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div className="h-full bg-emerald-400/85" style={{ width: `${Math.min(100, zoneImpact.after.technicalShare)}%` }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-center justify-between text-[8px] text-white/55">
                                    <span>Rail examen</span>
                                    <span>{zoneImpact.before.examShare}% {"->"} {zoneImpact.after.examShare}%</span>
                                  </div>
                                  <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                    <div className="h-full bg-amber-400/85" style={{ width: `${Math.min(100, zoneImpact.after.examShare)}%` }} />
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-[9px] text-white/45">Aplica un atajo para ver impacto comparativo inmediato.</p>
                        )}
                      </div>
                    </details>

                    <details className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 group">
                      <summary className="list-none cursor-pointer flex items-center justify-between">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Telemetría de acciones</p>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 space-y-2 max-h-44 overflow-y-auto pr-1">
                        {actionLogs.length === 0 ? (
                          <p className="text-[9px] text-white/45">Sin eventos en esta sesión de página.</p>
                        ) : (
                          actionLogs.map((log) => (
                            <div key={log.id} className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2.5 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] font-semibold text-white/80">{log.action}</p>
                                <div className="flex items-center gap-1.5">
                                  {log.pendingSync ? <span className="text-[8px] font-bold text-amber-300">SYNC</span> : null}
                                  <span className={cn(
                                    "text-[8px] font-bold",
                                    log.status === "ok" ? "text-emerald-300" : log.status === "error" ? "text-red-300" : "text-amber-300",
                                  )}>
                                    {log.status.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <p className="text-[8px] text-white/45 mt-1">
                                {formatLogTime(log.createdAt)} · Δ score {log.delta == null ? "--" : `${log.delta >= 0 ? "+" : ""}${log.delta}`} · bloques {log.changedBlocks}
                              </p>
                              <p className="text-[8px] text-white/55 mt-1 line-clamp-2">{log.note}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </details>

                    <details className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3 group" open>
                      <summary className="list-none cursor-pointer flex items-center justify-between">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Salida y validacion</p>
                        <ChevronDown className="w-3.5 h-3.5 text-white/30 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-2 mt-2">
                        <button
                          type="button"
                          onClick={handleAutofixAndOpenQa}
                          disabled={!proposal || !editableDraft || generatingFromComposer || pipelineBusy}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !proposal || !editableDraft || generatingFromComposer || pipelineBusy
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-fuchsia-400/25 bg-fuchsia-500/12 text-fuchsia-100 hover:bg-fuchsia-500/18",
                          )}
                        >
                          {pipelineBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {pipelineBusy ? "Aplicando autofix..." : "Autofix premium + abrir QA"}
                        </button>
                        <button
                          type="button"
                          onClick={handlePipelineToQa}
                          disabled={!proposal || !editableDraft || generatingFromComposer || pipelineBusy}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !proposal || !editableDraft || generatingFromComposer || pipelineBusy
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-violet-400/25 bg-violet-500/12 text-violet-100 hover:bg-violet-500/18",
                          )}
                        >
                          {pipelineBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {pipelineBusy ? "Ejecutando pipeline..." : "Aplicar + generar + abrir QA"}
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateWithDraft}
                          disabled={!proposal || !editableDraft || generatingFromComposer}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !proposal || !editableDraft || generatingFromComposer
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-teal-400/25 bg-teal-500/10 text-teal-100 hover:bg-teal-500/15"
                          )}
                        >
                          {generatingFromComposer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          {generatingFromComposer ? "Generando..." : "Generar con draft"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScopedRegeneration("technical_core", "nucleo tecnico")}
                          disabled={!proposal || !editableDraft || generatingFromComposer}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !proposal || !editableDraft || generatingFromComposer
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-indigo-400/25 bg-indigo-500/10 text-indigo-100 hover:bg-indigo-500/15",
                          )}
                        >
                          {generatingFromComposer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Layers3 className="w-3 h-3" />}
                          {generatingFromComposer ? "Regenerando..." : "Regenerar nucleo tecnico"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleScopedRegeneration("exam_rail", "rail de examen")}
                          disabled={!proposal || !editableDraft || generatingFromComposer}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold flex items-center justify-center gap-1.5",
                            !proposal || !editableDraft || generatingFromComposer
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-rose-400/25 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15",
                          )}
                        >
                          {generatingFromComposer ? <Loader2 className="w-3 h-3 animate-spin" /> : <Waypoints className="w-3 h-3" />}
                          {generatingFromComposer ? "Regenerando..." : "Regenerar rail de examen"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocation(`/generacion?page=${pageIdFromRoute}`)}
                          className="w-full h-8 rounded-sm border border-sky-400/25 bg-sky-500/10 text-[9px] font-semibold text-sky-100 hover:bg-sky-500/15"
                        >
                          Abrir panel generacion
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`)}
                          className="w-full h-8 rounded-sm border border-blue-400/25 bg-blue-500/10 text-[9px] font-semibold text-blue-100 hover:bg-blue-500/15"
                        >
                          Abrir QA
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          disabled={!proposal || savingDraft}
                          className={cn(
                            "w-full h-8 rounded-sm border text-[9px] font-semibold",
                            !proposal || savingDraft
                              ? "border-white/[0.08] bg-white/[0.02] text-white/35 cursor-not-allowed"
                              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16",
                          )}
                        >
                          {savingDraft ? "Guardando..." : "Guardar draft"}
                        </button>
                        {(generationFeedback || qaDelta) && (
                          <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 space-y-1.5">
                            {generationFeedback ? (
                              <p className="text-[9px] text-white/70 leading-relaxed">{generationFeedback}</p>
                            ) : null}
                            {qaDelta ? (
                              <div className="text-[9px] text-white/55">
                                <span className="font-semibold text-white/70">Delta QA:</span>{" "}
                                {qaDelta.before == null ? "sin baseline previo" : `${qaDelta.before.toFixed(1)} -> ${qaDelta.after?.toFixed(1) ?? "-"} `}
                                {qaDelta.delta != null ? (
                                  <span className={cn("font-semibold", qaDelta.delta >= 0 ? "text-emerald-300" : "text-amber-300")}>
                                    ({qaDelta.delta >= 0 ? "+" : ""}{qaDelta.delta.toFixed(1)})
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </section>

              {!focusMode && (
              <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-3">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((value) => !value)}
                  className="w-full flex items-center justify-between text-left px-1 py-1"
                >
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Diagnostico avanzado</p>
                    <p className="text-[10px] text-white/45 mt-0.5">Huella espacial, baseline detallado, validaciones y listado tecnico de bloques</p>
                  </div>
                  {advancedOpen ? <ChevronUp className="w-4 h-4 text-white/35" /> : <ChevronDown className="w-4 h-4 text-white/35" />}
                </button>
              </section>
              )}

              {!focusMode && advancedOpen && spacePlan && (
                <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Huella espacial</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Que tan dominante es el cuerpo visual frente al rail de examen</p>
                      </div>
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                        <Layers3 className="w-4 h-4 text-white/35" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mt-4">
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Apertura</p>
                        <p className="text-lg font-black text-white/88 mt-1">{spacePlan.introShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">{spacePlan.introHeight}px estimados</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Cuerpo visual</p>
                        <p className="text-lg font-black text-emerald-300 mt-1">{spacePlan.technicalShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">Presion {spacePlan.visualPressure}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Rail inferior</p>
                        <p className="text-lg font-black text-amber-300 mt-1">{spacePlan.examShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">Modo {spacePlan.railMode}</p>
                      </div>
                    </div>

                    <div className="mt-4 px-3 py-3 rounded-sm bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Recomendacion</p>
                      <p className="text-[11px] text-white/68 leading-relaxed mt-2">{spacePlan.guidance}</p>
                    </div>
                  </section>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Mini layout</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Wireframe rapido para detectar monotonia, rail pesado o foco timido</p>
                      </div>
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                        <Blocks className="w-4 h-4 text-white/35" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-sm border border-white/[0.06] bg-[#09111e] p-3">
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.06] bg-[#f7fbff] overflow-hidden p-[10px]">
                        <div className="h-full w-full flex flex-col gap-[8px]">
                          <div className="h-[10px] rounded-[2px] bg-[#0d1f57]" />
                          {(editableDraft?.blocks ?? [])
                            .slice()
                            .sort((a, b) => a.priority - b.priority)
                            .map((block) => {
                              const blockHeight = estimateBlockHeight(block);
                              const relativeHeight = Math.max(18, Math.min(92, Math.round(blockHeight / 3)));
                              const isTechnical = ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(block.type);
                              const isExam = ["exam_traps", "autocheck", "exam_signal"].includes(block.type);
                              return (
                                <div
                                  key={`wire:${block.id}`}
                                  className={cn(
                                    "rounded-[6px] border border-[#d8e4f4] bg-white px-2 py-1 shadow-[0_1px_0_rgba(9,30,66,0.04)]",
                                    isTechnical ? "grid grid-cols-2 gap-2 items-stretch" : "flex items-center gap-2",
                                    isExam && "bg-[#fffdfd]"
                                  )}
                                  style={{ minHeight: `${relativeHeight}px` }}
                                >
                                  {isTechnical ? (
                                    <>
                                      <div className={cn("rounded-[4px] bg-gradient-to-r opacity-85", blockAccent(block.type))} />
                                      <div className={cn("rounded-[4px] bg-gradient-to-r opacity-55", blockAccent(block.type))} />
                                    </>
                                  ) : (
                                    <>
                                      <div className={cn("w-[26%] h-full min-h-[14px] rounded-[4px] bg-gradient-to-r opacity-85", blockAccent(block.type))} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[7px] leading-none font-bold text-[#18305f] uppercase tracking-[0.08em] truncate">
                                          {labelBlockType(block.type)}
                                        </div>
                                        <div className="text-[6px] text-[#607192] mt-1 truncate">{block.variant}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          <div className="h-[10px] rounded-[2px] bg-[#0d1f57]" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {!focusMode && advancedOpen && (
              <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Referencia locked</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">{proposal.lockedReference.title}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Contrato</p>
                      <p className="text-[10px] text-white/70 mt-2">{proposal.lockedReference.contractId}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Dominio</p>
                      <p className="text-[10px] text-white/70 mt-2">{proposal.lockedReference.domain}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Zonas preservadas</p>
                    <div className="flex flex-wrap gap-2">
                      {proposal.lockedReference.preservedZones.map((zone) => (
                        <span key={zone} className="px-2 py-1 rounded-sm border border-white/[0.06] bg-white/[0.02] text-[9px] text-white/58">
                          {zone}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Cobertura y validacion</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">
                        {editableDraft?.structuralValidation.passed ? "Minimos cubiertos" : "Faltan minimos estructurales"}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    <CoverageCard title="Nucleo tecnico" ok={Boolean(editableDraft?.coverage.technicalCore)} />
                    <CoverageCard title="Senal de examen" ok={Boolean(editableDraft?.coverage.examSignals)} />
                    <CoverageCard title="Validacion final" ok={Boolean(editableDraft?.coverage.validationPresent)} />
                  </div>

                  {(editableDraft?.structuralValidation.missing.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <p className="text-[8px] font-bold text-red-300/80 uppercase tracking-widest mb-2">Faltantes</p>
                      <div className="space-y-2">
                        {editableDraft?.structuralValidation.missing.map((item) => (
                          <div key={item} className="px-3 py-2 rounded-sm bg-red-500/8 border border-red-500/15 text-[10px] text-red-200/80">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-[8px] font-bold text-amber-300/80 uppercase tracking-widest mb-2">Advertencias / weak areas</p>
                    <div className="space-y-2">
                      {editableDraft && [...editableDraft.structuralValidation.warnings, ...editableDraft.coverage.weakAreas].length > 0 ? (
                        [...editableDraft.structuralValidation.warnings, ...editableDraft.coverage.weakAreas].map((item) => (
                          <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/65">
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 rounded-sm bg-emerald-500/8 border border-emerald-500/15 text-[10px] text-emerald-200/75">
                          La propuesta no tiene alertas estructurales evidentes.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
              )}

              {!focusMode && advancedOpen && (
              <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <div className="flex items-center gap-2">
                  <Blocks className="w-4 h-4 text-white/30" />
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Composicion propuesta</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">
                      {(editableDraft?.blocks.length ?? 0)} bloques · familia {labelFamily(editableDraft?.family ?? proposal.draft.family)}
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-3 mt-4">
                  {(editableDraft?.blocks ?? [])
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((block) => (
                      <div key={block.id} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest">P{block.priority}</span>
                              <span className="text-[11px] font-bold text-white/80">{labelBlockType(block.type)}</span>
                              <span className="px-1.5 py-px rounded-sm border border-white/[0.06] text-[8px] text-blue-200/70 bg-blue-500/8">
                                {block.variant}
                              </span>
                              {block.required && (
                                <span className="px-1.5 py-px rounded-sm border border-emerald-500/15 text-[8px] text-emerald-200/75 bg-emerald-500/8">
                                  requerido
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/58 mt-2 leading-relaxed">
                              {summarizeBlockContent(block)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[8px] text-white/20 uppercase tracking-widest">Altura</p>
                            <p className="text-[9px] text-white/55 mt-1">{block.minHeight}-{block.maxHeight}px</p>
                            <div className="mt-2 flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => moveBlock(block.id, "up")}
                                className="w-6 h-6 rounded-sm border border-white/[0.08] bg-white/[0.02] text-white/65 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center justify-center"
                                aria-label={`Subir bloque ${labelBlockType(block.type)}`}
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveBlock(block.id, "down")}
                                className="w-6 h-6 rounded-sm border border-white/[0.08] bg-white/[0.02] text-white/65 hover:text-white hover:bg-white/[0.05] transition-colors flex items-center justify-center"
                                aria-label={`Bajar bloque ${labelBlockType(block.type)}`}
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => rotateVariant(block.id)}
                                className="h-6 px-2 rounded-sm border border-blue-400/20 bg-blue-500/10 text-[8px] font-semibold text-blue-100 hover:bg-blue-500/15 transition-colors"
                              >
                                Variante
                              </button>
                            </div>
                          </div>
                        </div>

                        {block.dependsOn && block.dependsOn.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-[8px] text-white/35">
                            <Waypoints className="w-3 h-3" />
                            <span>Depende de: {block.dependsOn.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </section>
              )}

              {!focusMode && advancedOpen && (
              <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <button
                    type="button"
                    onClick={() => setActionsOpen((value) => !value)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Layers3 className="w-4 h-4 text-white/30" />
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Siguientes acciones</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Como usar esta propuesta</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", actionsOpen && "rotate-180")} />
                  </button>
                  {actionsOpen && (
                  <div className="space-y-2 mt-4">
                    {proposal.nextActions.map((item) => (
                      <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                        {item}
                      </div>
                    ))}
                  </div>
                  )}
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <button
                    type="button"
                    onClick={() => setEditorialReadOpen((value) => !value)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-4 h-4 text-white/30" />
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Lectura editorial</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Que estamos intentando mejorar</p>
                      </div>
                    </div>
                    <ChevronDown className={cn("w-4 h-4 text-white/30 transition-transform", editorialReadOpen && "rotate-180")} />
                  </button>

                  {editorialReadOpen && (
                  <div className="mt-4 space-y-2">
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      El modo Composer no desecha el locked actual: parte de esa base y nos ayuda a ajustar densidad, bloques dominantes y senales de examen sin perder identidad de coleccion.
                    </div>
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      Si sigues viendo el layout actual "igual", eso casi seguro significa que estas mirando un output viejo. Los cambios de contrato no son retroactivos: hay que regenerar page.html para verlos.
                    </div>
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      Esta vista sirve justo para eso: evaluar si conviene quedarse en locked, pasar a composer minor o abrir una correccion mas estructural antes de seguir con el batch.
                    </div>
                  </div>
                  )}
                </section>
              </div>
              )}
            </div>
          ) : null}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function CoverageCard({ title, ok }: { title: string; ok: boolean }) {
  return (
    <div className={cn(
      "rounded-sm border p-3",
      ok ? "bg-emerald-500/8 border-emerald-500/15" : "bg-amber-500/8 border-amber-500/15"
    )}>
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">{title}</p>
      <p className={cn("text-[11px] font-bold mt-2", ok ? "text-emerald-200/85" : "text-amber-200/85")}>
        {ok ? "Cubierto" : "Pendiente"}
      </p>
    </div>
  );
}
