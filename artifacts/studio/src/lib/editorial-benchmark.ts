import type { ComposerBlock } from "@/lib/studio-api";

export interface ComposerBenchmarkCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ComposerBenchmarkResult {
  score: number;
  checks: ComposerBenchmarkCheck[];
  summary: string;
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function evaluateComposerBenchmark(blocks: ComposerBlock[]): ComposerBenchmarkResult {
  const ordered = [...blocks].sort((a, b) => a.priority - b.priority);
  const technicalTypes = ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"];
  const technicalBlocks = ordered.filter((block) => technicalTypes.includes(block.type));
  const introBlocks = ordered.filter((block) => ["hero_title", "context_deck", "guide_question"].includes(block.type));
  const examBlocks = ordered.filter((block) => ["exam_traps", "autocheck", "exam_signal"].includes(block.type));

  const introHeight = introBlocks.reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const technicalHeight = technicalBlocks.reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const examHeight = examBlocks.reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const totalHeight = Math.max(1, introHeight + technicalHeight + examHeight);

  const technicalShare = Math.round((technicalHeight / totalHeight) * 100);
  const examShare = Math.round((examHeight / totalHeight) * 100);

  const checks: ComposerBenchmarkCheck[] = [
    {
      id: "hierarchy",
      label: "Jerarquia editorial clara",
      passed: introBlocks.some((block) => block.type === "hero_title")
        && introBlocks.some((block) => block.type === "context_deck")
        && introBlocks.some((block) => block.type === "guide_question"),
      detail: "Hero + contexto + pregunta guia deben coexistir para lectura dirigida.",
    },
    {
      id: "technical-dominance",
      label: "Dominancia del nucleo visual",
      passed: technicalBlocks.length >= 4 && technicalShare >= 42,
      detail: `Actualmente ${technicalBlocks.length} bloques tecnicos y ${technicalShare}% de ocupacion tecnica.`,
    },
    {
      id: "exam-rail-balance",
      label: "Rail de examen compacto",
      passed: examShare <= 28,
      detail: `El rail inferior ocupa ${examShare}% del alto estimado. Objetivo: <= 28%.`,
    },
    {
      id: "variant-discipline",
      label: "Disciplina de variantes",
      passed: ordered.filter((block) => block.type === "exam_traps" && block.variant === "compact").length === 1
        && ordered.filter((block) => block.type === "autocheck" && block.variant === "short").length === 1,
      detail: "Para evitar huecos y ruido, traps=compact y autocheck=short deben estar activos.",
    },
    {
      id: "flow-continuity",
      label: "Continuidad narrativa",
      passed: ordered.findIndex((block) => block.type === "guide_question") < ordered.findIndex((block) => technicalTypes.includes(block.type)),
      detail: "La pregunta guia debe anticipar el bloque tecnico, no aparecer despues.",
    },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const rawScore = (passedCount / checks.length) * 100;
  const score = Math.round(clamp(rawScore, 0, 100));

  let summary = "Estado premium en progreso.";
  if (score >= 90) summary = "Composicion premium estable para batch productivo.";
  else if (score >= 75) summary = "Buena base, falta cerrar 1-2 puntos para nivel premium.";
  else if (score >= 60) summary = "Composicion funcional, pero todavia no lista para salida premium.";
  else summary = "La composicion necesita ajuste estructural antes de producir.";

  return { score, checks, summary };
}
