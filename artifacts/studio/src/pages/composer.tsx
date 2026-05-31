import { useEffect, useMemo, useState } from "react";
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
  Save,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import { evaluateComposerBenchmark } from "@/lib/editorial-benchmark";
import { normalizeQaScoreToTen, qaScoreToHundred, resolveQaScoreSource } from "@/lib/qa-score-source";
import {
  fetchComposerDraft,
  fetchComposerProposal,
  fetchStudioCatalog,
  fetchStudioOutputStatus,
  fetchStudioQaReport,
  logComposerAutofix,
  saveComposerDraft,
  type ComposerBlock,
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

type ShortcutAction = "compact_rail" | "expand_context" | "boost_technical" | "enforce_four_cards";

const TECHNICAL_BLOCK_TYPES = ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"];
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
  const [qaDelta, setQaDelta] = useState<{ before: number | null; after: number | null; delta: number | null } | null>(null);
  const [autofixFeedback, setAutofixFeedback] = useState<string | null>(null);
  const [quickActionBusy, setQuickActionBusy] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);
  const [lastShortcutSnapshot, setLastShortcutSnapshot] = useState<ComposerProposal["draft"] | null>(null);
  const [lastShortcutLabel, setLastShortcutLabel] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editorialReadOpen, setEditorialReadOpen] = useState(false);

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

  async function refreshLockedArtifacts(targetPageId: string) {
    const [status, qa] = await Promise.all([
      fetchStudioOutputStatus(targetPageId),
      fetchStudioQaReport(targetPageId),
    ]);
    setLockedStatus(status);
    setLockedQa(qa);
  }

  useEffect(() => {
    let mounted = true;
    setLockedStatus(null);
    setLockedQa(null);
    Promise.all([
      fetchStudioOutputStatus(pageIdFromRoute),
      fetchStudioQaReport(pageIdFromRoute),
    ]).then(([status, qa]) => {
      if (!mounted) return;
      setLockedStatus(status);
      setLockedQa(qa);
    }).catch(() => {
      if (!mounted) return;
      setLockedStatus(null);
      setLockedQa(null);
    });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute]);

  useEffect(() => {
    setGenerationFeedback(null);
    setQaDelta(null);
    setAutofixFeedback(null);
    setQuickActionBusy(null);
    setQuickActionFeedback(null);
    setLastShortcutSnapshot(null);
    setLastShortcutLabel(null);
    setActionsOpen(false);
    setEditorialReadOpen(false);
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
  const recommendedShortcut = useMemo(() => {
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
  }, [benchmark, projectedGap]);

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

  async function handleAutofixComposer() {
    if (!editableDraft) return;
    const actionsApplied: string[] = [];
    const beforeTotal = projectedQaScores?.total ?? null;
    let nextBlocks = [...editableDraft.blocks].sort((a, b) => a.priority - b.priority);
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
    const nextDraft = recalculateDraft({ ...editableDraft, blocks: normalizedBlocks });
    setEditableDraft(nextDraft);

    if (actionsApplied.length === 0) {
      setAutofixFeedback("No hubo ajustes automaticos: el draft ya estaba dentro de los parametros premium.");
      return;
    }
    const afterLockedTechnicalAccuracy = lockedQa?.scores?.technical_accuracy;
    const afterScores = buildProjectedQaScores(
      nextDraft,
      afterLockedTechnicalAccuracy == null ? null : normalizeQaScoreToTen(afterLockedTechnicalAccuracy),
    );
    const afterTotal = afterScores?.total ?? null;
    setAutofixFeedback(`Autocorreccion aplicada: ${actionsApplied.join(" | ")}.`);

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

  async function generateFromDraft(
    draft: ComposerProposal["draft"],
    note: string,
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
        return;
      }

      setEditableDraft(nextDraft);
      setGeneratingFromComposer(true);
      await generateFromDraft(nextDraft, `Atajo operativo aplicado: ${label}`);
      setQuickActionFeedback(`Atajo "${label}" aplicado + regeneracion completada.`);
    } catch (err) {
      setQuickActionFeedback(err instanceof Error ? err.message : `Fallo al ejecutar atajo "${label}".`);
    } finally {
      setGeneratingFromComposer(false);
      setQuickActionBusy(null);
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
      setLastShortcutSnapshot(null);
      setLastShortcutLabel(null);
    } catch (err) {
      setQuickActionFeedback(err instanceof Error ? err.message : "No se pudo revertir el ultimo atajo.");
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
    } catch (err) {
      setGenerationFeedback(err instanceof Error ? err.message : "No se pudo generar desde Composer");
    } finally {
      setGeneratingFromComposer(false);
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
            onClick={handleSaveDraft}
            disabled={!proposal || savingDraft}
            className={cn(
              "h-9 px-3 rounded-sm border text-[10px] font-semibold transition-all flex items-center gap-2",
              !proposal || savingDraft
                ? "border-white/[0.08] bg-white/[0.02] text-white/30 cursor-not-allowed"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/16"
            )}
          >
            {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {savingDraft ? "Guardando..." : "Guardar draft"}
          </button>

          <button
            type="button"
            onClick={() => setFocusMode((current) => !current)}
            className={cn(
              "h-9 px-3 rounded-sm border text-[10px] font-semibold transition-all",
              focusMode
                ? "border-violet-500/30 bg-violet-500/12 text-violet-100 hover:bg-violet-500/18"
                : "border-white/[0.08] bg-white/[0.02] text-white/65 hover:bg-white/[0.04] hover:text-white",
            )}
          >
            {focusMode ? "Modo enfoque" : "Mostrar diagnostico"}
          </button>

          <button
            type="button"
            onClick={() => setLocation(`/generacion?page=${pageIdFromRoute}`)}
            className="h-9 px-3 rounded-sm border border-teal-500/25 bg-teal-500/10 text-[10px] font-semibold text-teal-100 hover:bg-teal-500/16 transition-all"
          >
            Generar pagina
          </button>
          <button
            type="button"
            onClick={() => setLocation(`/qa/${parseInt(pageIdFromRoute, 10)}`)}
            className="h-9 px-3 rounded-sm border border-blue-500/25 bg-blue-500/10 text-[10px] font-semibold text-blue-100 hover:bg-blue-500/16 transition-all"
          >
            Revisar QA
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
          {!loading && !error && (
            <div className="max-w-6xl mx-auto mb-3 px-3 py-2 rounded-sm border border-white/[0.08] bg-[#0d1629]">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Proceso recomendado</p>
              <div className="mt-2 grid md:grid-cols-4 gap-2">
                <div className="px-2.5 py-2 rounded-sm border border-white/[0.08] bg-white/[0.02] text-[9px] text-white/72">
                  1. Ajustar bloques en canvas
                </div>
                <div className="px-2.5 py-2 rounded-sm border border-white/[0.08] bg-white/[0.02] text-[9px] text-white/72">
                  2. Guardar draft
                </div>
                <div className="px-2.5 py-2 rounded-sm border border-teal-500/20 bg-teal-500/8 text-[9px] text-teal-100">
                  3. Generar con draft
                </div>
                <div className="px-2.5 py-2 rounded-sm border border-blue-500/20 bg-blue-500/8 text-[9px] text-blue-100">
                  4. Revisar QA y aprobar
                </div>
              </div>
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Transicion recomendada</p>
                      <p className="text-sm font-black text-white/88 mt-1">{labelTransition(proposal.recommendedTransition.level)}</p>
                      <p className="text-[10px] text-white/45 mt-2 leading-relaxed max-w-2xl">
                        {proposal.recommendedTransition.reason}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4 text-white/35" />
                    </div>
                  </div>

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
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Proyeccion Composer (draft)</p>
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
                      <p className="text-sm font-black text-white/88 mt-1">
                        {projectedQaScores?.total.toFixed(1) ?? "0.0"}/10
                      </p>
                      <p className="text-[10px] text-white/45 mt-1">
                        Brecha hacia 9.5: <span className="text-amber-300/85 font-semibold">{projectedGap?.toFixed(1) ?? "0.0"}</span>
                      </p>
                      <p className={cn(
                        "text-[9px] mt-2",
                        qaResolution.source === "server" ? "text-teal-300/75" : "text-violet-300/80",
                      )}>
                        {qaResolution.sourceHint}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white/35" />
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
                      const score = projectedQaScores?.[dimension.key] ?? 0;
                      const hundred = qaScoreToHundred(score);
                      const locked = lockedQa?.scores?.[dimension.key];
                      const lockedNormalized = locked == null ? null : normalizeQaScoreToTen(locked);
                      const delta = lockedNormalized != null ? Number((score - lockedNormalized).toFixed(1)) : null;
                      return (
                        <div key={dimension.key}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] text-white/70 font-semibold">{dimension.label}</span>
                            <div className="text-right">
                              <span className={cn("text-[11px] font-bold", scoreColorDark(hundred))}>{hundred}/100</span>
                              {delta != null && (
                                <p className={cn("text-[8px] mt-0.5", delta >= 0 ? "text-emerald-300/85" : "text-amber-300/85")}>
                                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)} vs QA
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
                </section>
                  </div>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <div className="flex items-start justify-between gap-3">
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
                  <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white/35" />
                  </div>
                </div>

                {lockedQa?.scores ? (
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
                )}
                  </section>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Acciones Composer</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">Ajustes directos sobre el draft actual</p>
                  </div>
                  <span className="text-[10px] text-white/45">Impacta score proyectado al instante</span>
                </div>
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
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Bloque seleccionado</p>
                      {selectedBlock ? (
                        <>
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
                        </>
                      ) : (
                        <p className="text-[9px] text-white/45 mt-2">Selecciona un bloque para editarlo.</p>
                      )}
                    </div>

                    <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Atajos editoriales</p>
                      <p className="text-[9px] text-white/48 mt-1 leading-relaxed">Cada atajo aplica cambios al draft y dispara regeneracion real.</p>
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
                    </div>

                    <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Salida y validacion</p>
                      <div className="space-y-2 mt-2">
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
                    </div>
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
            </div>
          ) : null}
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
