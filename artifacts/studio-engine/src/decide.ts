import { BODY_H, PAGE_W, railTokens } from "./render/layout-constants.js";
import { RECIPES, getRecipe } from "./recipes.js";
import type { PageDiagnosis, PageSeed, Recipe, RecommendedAction } from "./types.js";

/* Anchos aproximados de columna (px) para estimar líneas de texto. */
const RAIL_COL_W = (PAGE_W - 36 - 12) / 2; // ~360 → dos columnas
const CARD_COL_W = (PAGE_W - 36) / 2;

function linesFor(text: string, colW: number, font: number): number {
  const charsPerLine = Math.max(8, Math.floor(colW / (font * 0.52)));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

/**
 * Analiza la geometría de una receta contra el contenido del seed y estima si
 * el rail queda apretado (microtexto) o holgado (hueco), y si el bloque visual
 * queda denso o con hueco. Deterministico y explicable.
 */
export function analyze(seed: PageSeed, recipe: Recipe): PageDiagnosis {
  const upperH = Math.round((BODY_H * recipe.upperPct) / 100);
  const railH = BODY_H - upperH;
  const rt = railTokens(recipe.railMode);
  const lineH = rt.font * rt.lead + rt.gap;

  // ── rail (trampas vs autocheck, la columna más alta manda) ──
  const trapsShown = recipe.railMode === "compact" ? Math.min(2, seed.traps.length) : seed.traps.length;
  let trapLines = 1; // header
  for (let i = 0; i < trapsShown; i++) {
    const t = seed.traps[i]!;
    trapLines += linesFor(t.wrong, RAIL_COL_W - 22, rt.font) + linesFor(t.correction, RAIL_COL_W - 22, rt.font);
  }
  const autoLines =
    1 + linesFor(seed.autocheck.question, RAIL_COL_W, rt.font + 0.5) + seed.autocheck.options.length;
  const railDemand = Math.max(trapLines, autoLines) * lineH + 2 * rt.pad;
  const railRatio = railDemand / Math.max(40, railH - 12);
  const railStatus: PageDiagnosis["railStatus"] = railRatio > 1.02 ? "tight" : railRatio < 0.62 ? "sparse" : "ok";

  // ── bloque visual (tarjetas + extras) ──
  const rows = Math.ceil(recipe.cards / recipe.cols);
  const cards = seed.visualModules.slice(0, recipe.cards);
  const maxDescLines = cards.reduce((mx, m) => Math.max(mx, linesFor(m.description, CARD_COL_W / recipe.cols, 10.5)), 1);
  const cardH = (maxDescLines + 2) * 14 + 22;
  let visualDemand = rows * cardH + 16; // + slot label
  if (recipe.extras.includes("diagram")) visualDemand += 56;
  if (recipe.extras.includes("comparison")) visualDemand += 78;
  const upperAvail = Math.max(60, upperH - 28);
  const visualRatio = visualDemand / upperAvail;
  const visualStatus: PageDiagnosis["visualStatus"] = visualRatio > 1.02 ? "dense" : visualRatio < 0.6 ? "empty" : "ok";

  let penalty = 0;
  if (railRatio > 1) penalty += (railRatio - 1) * 30;
  else if (railRatio < 0.62) penalty += (0.62 - railRatio) * 12;
  if (visualRatio > 1) penalty += (visualRatio - 1) * 22;
  else if (visualRatio < 0.6) penalty += (0.6 - visualRatio) * 12;

  return {
    recipeId: recipe.id,
    recipeLabel: recipe.label,
    upperH,
    railH,
    railRatio: Math.round(railRatio * 100) / 100,
    railStatus,
    visualRatio: Math.round(visualRatio * 100) / 100,
    visualStatus,
    score: Math.round((10 - penalty) * 10) / 10,
  };
}

function causeText(d: PageDiagnosis): { cause: string; severity: "ok" | "warn" | "high" } {
  if (d.railStatus === "tight") return { cause: "El rail de examen queda apretado: riesgo de microtexto o recorte de trampas/autocheck.", severity: "high" };
  if (d.visualStatus === "dense") return { cause: "El bloque visual queda denso: las tarjetas se comprimen y pierden legibilidad.", severity: "warn" };
  if (d.visualStatus === "empty") return { cause: "El bloque visual queda con hueco: demasiado espacio para el contenido visual.", severity: "warn" };
  if (d.railStatus === "sparse") return { cause: "El rail queda holgado: hueco no informativo bajo las trampas.", severity: "warn" };
  return { cause: "Rail y bloque visual equilibrados.", severity: "ok" };
}

function effectText(to: PageDiagnosis): string {
  const parts: string[] = [];
  parts.push(to.railStatus === "ok" ? "rail con aire suficiente" : to.railStatus === "tight" ? "rail aún ajustado" : "rail holgado");
  parts.push(to.visualStatus === "ok" ? "visual equilibrado" : to.visualStatus === "dense" ? "visual denso" : "visual con espacio");
  return `Proyección: ${parts.join(" · ")} (score ${to.score}/10).`;
}

function riskText(from: Recipe, to: Recipe): string {
  if (to.upperPct < from.upperPct) return "Da más alto al rail y reduce el bloque visual: vigilá que el diagrama no quede chico.";
  if (to.upperPct > from.upperPct) return "Agranda el visual y achica el rail: vigilá que las trampas no se aprieten.";
  if (to.railMode === "compact") return "El rail muestra solo 2 trampas: puede omitir señales de examen.";
  if (to.railMode === "dense") return "Más densidad en el rail: vigilá la jerarquía y el contraste.";
  return "Cambio de arreglo del visual: revisá la coherencia de las tarjetas.";
}

/**
 * Mesa de decisión: UNA acción recomendada (causa → efecto → riesgo). Puntúa
 * todas las recetas para el contenido y recomienda la mejor; si la actual ya
 * encaja, sugiere mantener.
 */
export function decide(seed: PageSeed, currentRecipeId: string): RecommendedAction {
  const current = getRecipe(currentRecipeId) ?? RECIPES[0]!;
  const diags = RECIPES.map((r) => analyze(seed, r));
  const ranking = diags
    .map((d) => ({ recipeId: d.recipeId, label: d.recipeLabel, score: d.score }))
    .sort((a, b) => b.score - a.score);

  const currentDiag = diags.find((d) => d.recipeId === current.id)!;
  const bestId = ranking[0]!.recipeId;
  const bestRecipe = getRecipe(bestId)!;
  const bestDiag = diags.find((d) => d.recipeId === bestId)!;

  const marginal = bestDiag.score - currentDiag.score < 0.5;

  if (bestId === current.id || marginal) {
    const { cause, severity } = causeText(currentDiag);
    return {
      pageId: seed.pageId,
      kind: "keep",
      fromRecipe: current.id,
      toRecipe: current.id,
      toLabel: current.label,
      cause: severity === "ok" ? "La receta actual encaja con el contenido." : cause,
      effect: `Receta actual “${current.label}” con score ${currentDiag.score}/10. Sin cambio recomendado.`,
      risk: "—",
      severity: severity === "high" ? "warn" : severity,
      current: currentDiag,
      projected: currentDiag,
      ranking,
    };
  }

  const { cause, severity } = causeText(currentDiag);
  return {
    pageId: seed.pageId,
    kind: "switch",
    fromRecipe: current.id,
    toRecipe: bestId,
    toLabel: bestRecipe.label,
    cause,
    effect: `Aplicar “${bestRecipe.label}”. ${effectText(bestDiag)}`,
    risk: riskText(current, bestRecipe),
    severity,
    current: currentDiag,
    projected: bestDiag,
    ranking,
  };
}
