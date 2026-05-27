import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import type {
  ComposerBlock,
  ComposerBlockType,
  ComposerBlockVariant,
  ComposerCompositionFamily,
  ComposerCoverageResult,
  ComposerEditorialValidation,
  ComposerPageDraft,
  ComposerProposal,
  ComposerStructuralValidation,
  ComposerTransitionRecommendation,
  LockedReferenceSummary,
} from "./types";

function inferFamily(data: VisualAtlasPageData): ComposerCompositionFamily {
  const text = `${data.title} ${data.subtitle} ${data.context} ${data.guideQuestion}`.toLowerCase();
  if (/(tier|sku|compar|replic)/.test(text)) return "comparison";
  if (/(identity|identidad|token|rol|managed identity|service principal)/.test(text)) return "decision";
  if (/(dns|network|firewall|private endpoint|vnet|red)/.test(text)) return "coverage_map";
  if (/(retention|cleanup|policy|lifecycle|task|limpieza|ciclo)/.test(text)) return "lifecycle";
  return "architecture";
}

function block(
  type: ComposerBlockType,
  variant: ComposerBlockVariant,
  priority: number,
  content: Record<string, unknown>,
  overrides?: Partial<ComposerBlock>,
): ComposerBlock {
  const defaults: Record<ComposerBlockType, { minHeight: number; maxHeight: number; required: boolean }> = {
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
    ...overrides,
  };
}

function createBlocks(data: VisualAtlasPageData, family: ComposerCompositionFamily): ComposerBlock[] {
  const commonIntro = [
    block("hero_title", "full", 10, { title: data.title, subtitle: data.subtitle }),
    block("context_deck", data.context.length > 240 ? "short" : "expanded", 20, { context: data.context }),
    block("guide_question", "editorial_bar", 30, { question: data.guideQuestion }),
  ];

  const examTail = [
    block("exam_traps", data.traps.length >= 3 ? "compact" : "standard", 80, {
      traps: data.traps.slice(0, 3),
    }),
    block("autocheck", data.autocheck.discardNotes.length > 2 ? "short" : "full", 90, {
      question: data.autocheck.question,
      options: data.autocheck.options,
      correctOption: data.autocheck.correctOption,
      explanation: data.autocheck.explanation,
      discardNotes: data.autocheck.discardNotes.slice(0, 2),
    }),
  ];

  switch (family) {
    case "comparison":
      return [
        ...commonIntro,
        block("comparison_panel", "sku_matrix", 40, { modules: data.visualModules.slice(0, 2) }),
        block("diagram_panel", "two_column", 50, { modules: data.visualModules.slice(0, 2) }),
        block("map_panel", "replication_path", 60, { modules: data.visualModules.slice(2, 4) }),
        block("exam_signal", "rule", 70, {
          message: "Las señales de examen pesan más que el nombre del SKU cuando hay geo-replicación o acceso privado.",
        }),
        ...examTail,
      ];
    case "decision":
      return [
        ...commonIntro,
        block("decision_tree", "multi_branch", 40, { modules: data.visualModules.slice(0, 2) }),
        block("diagram_panel", "single_focus", 50, { modules: data.visualModules.slice(2, 4) }),
        block("exam_signal", "warning", 70, {
          message: "En examen, elegir identidad o permiso equivocado rompe el flujo aunque ACR esté bien configurado.",
        }),
        ...examTail,
      ];
    case "coverage_map":
      return [
        ...commonIntro,
        block("map_panel", "network_boundary", 40, { modules: data.visualModules.slice(0, 2) }),
        block("diagram_panel", "multi_step", 50, { modules: data.visualModules.slice(2, 4) }),
        block("exam_signal", "memory_hook", 70, {
          message: "Si el acceso falla, piensa primero en conectividad, DNS y boundary de red antes que en permisos de imagen.",
        }),
        ...examTail,
      ];
    case "lifecycle":
      return [
        ...commonIntro,
        block("diagram_panel", "multi_step", 40, { modules: data.visualModules.slice(0, 2) }),
        block("decision_tree", "binary_path", 50, { modules: data.visualModules.slice(2, 4) }),
        block("exam_signal", "rule", 70, {
          message: "Política, limpieza y automatización deben leerse como un ciclo operativo, no como features aisladas.",
        }),
        ...examTail,
      ];
    case "architecture":
    default:
      return [
        ...commonIntro,
        block("diagram_panel", "two_column", 40, { modules: data.visualModules.slice(0, 2) }),
        block("diagram_panel", "multi_step", 50, { modules: data.visualModules.slice(2, 4) }),
        block("exam_signal", "memory_hook", 70, {
          message: "El lector debe recordar el flujo principal y la señal de examen, no solo los nombres de los servicios.",
        }),
        ...examTail,
      ];
  }
}

function validateStructure(blocks: ComposerBlock[]): ComposerStructuralValidation {
  const openingCount = blocks.filter((b) => b.type === "hero_title" || b.type === "context_deck").length;
  const guideCount = blocks.filter((b) => b.type === "guide_question").length;
  const technicalCoreCount = blocks.filter((b) =>
    b.type === "diagram_panel" || b.type === "comparison_panel" || b.type === "decision_tree" || b.type === "map_panel"
  ).length;
  const examCount = blocks.filter((b) => b.type === "exam_traps" || b.type === "exam_signal").length;
  const validationCount = blocks.filter((b) => b.type === "autocheck").length;

  const missing: string[] = [];
  if (openingCount < 1) missing.push("Falta un bloque de apertura.");
  if (guideCount !== 1) missing.push("La página debe tener exactamente una pregunta guía.");
  if (technicalCoreCount < 2) missing.push("Faltan bloques técnicos centrales.");
  if (examCount < 1) missing.push("Falta una señal de examen.");
  if (validationCount !== 1) missing.push("La página debe tener exactamente un bloque de autocheck.");

  const warnings: string[] = [];
  if (technicalCoreCount > 4) warnings.push("Hay demasiados bloques técnicos para una lectura acelerada.");
  if (blocks.some((b) => b.type === "exam_traps" && b.variant === "standard")) {
    warnings.push("Evalúa compactar trampas si el cuerpo visual necesita más respiración.");
  }

  return {
    passed: missing.length === 0,
    missing,
    warnings,
  };
}

function evaluateCoverage(blocks: ComposerBlock[]): ComposerCoverageResult {
  const technicalCore = blocks.some((b) =>
    b.type === "diagram_panel" || b.type === "comparison_panel" || b.type === "decision_tree" || b.type === "map_panel"
  );
  const examSignals = blocks.some((b) => b.type === "exam_traps" || b.type === "exam_signal");
  const validationPresent = blocks.some((b) => b.type === "autocheck");

  const weakAreas: string[] = [];
  if (!technicalCore) weakAreas.push("La composición aún no explica el núcleo técnico.");
  if (!examSignals) weakAreas.push("La página no deja una señal clara de examen.");
  if (!validationPresent) weakAreas.push("Falta validación para cerrar la lectura.");

  return { technicalCore, examSignals, validationPresent, weakAreas };
}

function evaluateEditorial(blocks: ComposerBlock[], family: ComposerCompositionFamily): ComposerEditorialValidation {
  const technicalCoreCount = blocks.filter((b) =>
    b.type === "diagram_panel" || b.type === "comparison_panel" || b.type === "decision_tree" || b.type === "map_panel"
  ).length;

  const coverageScore = technicalCoreCount >= 2 ? 9 : 7;
  const readabilityScore = blocks.some((b) => b.type === "autocheck" && b.variant === "short") ? 8.8 : 8.2;
  const usefulDensityScore = blocks.some((b) => b.type === "exam_traps" && b.variant === "compact") ? 9 : 8;
  const examUtilityScore = blocks.some((b) => b.type === "exam_signal") ? 9.2 : 8.4;
  const consistencyScore = family === "comparison" || family === "architecture" ? 8.8 : 8.5;

  const total = Number(((coverageScore + readabilityScore + usefulDensityScore + examUtilityScore + consistencyScore) / 5).toFixed(1));
  return {
    coverageScore,
    readabilityScore,
    usefulDensityScore,
    examUtilityScore,
    consistencyScore,
    total,
  };
}

function recommendTransition(data: VisualAtlasPageData, family: ComposerCompositionFamily): ComposerTransitionRecommendation {
  const denseContext = data.context.length > 260;
  const manyDiscardNotes = data.autocheck.discardNotes.length > 2;

  if (family === "comparison" && (denseContext || manyDiscardNotes)) {
    return {
      level: "composer_structural",
      reason: "La página pide reequilibrar cuerpo visual y rail inferior sin perder cobertura de examen.",
      unlockedCapabilities: [
        "Compactar rail inferior",
        "Cambiar variantes de comparación y mapa",
        "Añadir o quitar una señal de examen",
      ],
      blockedCapabilities: [
        "Romper mínimos de cobertura",
        "Quitar pregunta guía",
      ],
    };
  }

  return {
    level: "composer_minor",
    reason: "La transición sirve para ajustar densidad, variantes y respiración sin reescribir la página completa.",
    unlockedCapabilities: [
      "Compactar traps y autocheck",
      "Expandir contexto",
      "Cambiar variante de pregunta guía",
    ],
    blockedCapabilities: [
      "Eliminar núcleo técnico",
      "Quitar validación final",
    ],
  };
}

export function buildComposerProposal(pageId: string, data: VisualAtlasPageData): ComposerProposal {
  const family = inferFamily(data);
  const blocks = createBlocks(data, family);
  const structuralValidation = validateStructure(blocks);
  const coverage = evaluateCoverage(blocks);
  const editorialValidation = evaluateEditorial(blocks, family);

  const lockedReference: LockedReferenceSummary = {
    pageId,
    pageNumber: data.pageNumber,
    contractId: data.contractVersion,
    title: `${data.title}: ${data.subtitle}`,
    domain: data.domainLabel,
    preservedZones: [
      "hero title",
      "context deck",
      "guide question",
      "upper visual",
      "exam traps",
      "autocheck",
      "footer",
    ],
  };

  const draft: ComposerPageDraft = {
    pageId,
    pageNumber: data.pageNumber,
    mode: "composer",
    family,
    blocks,
    coverage,
    structuralValidation,
    editorialValidation,
  };

  return {
    source: "api_visual_atlas_composer_v1",
    pageId,
    lockedReference,
    recommendedTransition: recommendTransition(data, family),
    draft,
    nextActions: [
      "Comparar esta propuesta contra la referencia locked.",
      "Validar si el rail inferior debe ir en modo compacto o estándar.",
      "Revisar si el núcleo técnico necesita comparación, decisión o mapa como bloque dominante.",
    ],
  };
}
