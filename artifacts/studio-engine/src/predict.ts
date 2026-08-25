import { analyze } from "./decide.js";
import type { PageSeed, Prediction, Recipe, RiskFlag, RiskSeverity } from "./types.js";

const ORDER: Record<RiskSeverity, number> = { ok: 0, warn: 1, high: 2 };

/**
 * QA PREDICTIVO: estima el riesgo (microtexto, rail pobre, hueco, sobrecarga)
 * desde la geometría + densidad, ANTES de gastar una imagen. Es el gate previo
 * a gpt-image: si el riesgo es alto, conviene ajustar la receta primero.
 */
export function predictPage(seed: PageSeed, recipe: Recipe): Prediction {
  const d = analyze(seed, recipe);
  const risks: RiskFlag[] = [];

  if (d.railStatus === "tight") {
    risks.push({ id: "microtext", label: "Microtexto / rail apretado", severity: "high", detail: `densidad ${d.railRatio}` });
  } else if (d.railStatus === "sparse") {
    risks.push({ id: "rail-gap", label: "Hueco en el rail de examen", severity: "warn", detail: `densidad ${d.railRatio}` });
  }

  if (d.visualStatus === "dense") {
    risks.push({ id: "visual-overload", label: "Bloque visual sobrecargado", severity: "high", detail: `densidad ${d.visualRatio}` });
  } else if (d.visualStatus === "empty") {
    risks.push({ id: "visual-gap", label: "Hueco en el bloque visual", severity: "warn", detail: `densidad ${d.visualRatio}` });
  }

  if (risks.length === 0) {
    risks.push({ id: "ok", label: "Sin riesgos detectados", severity: "ok", detail: `score ${d.score}/10` });
  }

  const worst = risks.reduce<RiskSeverity>((w, r) => (ORDER[r.severity] > ORDER[w] ? r.severity : w), "ok");

  return {
    recipeId: recipe.id,
    recipeLabel: recipe.label,
    risks,
    worst,
    safeToSpendImage: worst !== "high",
    summary:
      worst === "high"
        ? "Riesgo alto: ajustá la receta antes de gastar imagen (gate)."
        : worst === "warn"
          ? "Riesgo medio: revisable; la imagen está permitida."
          : "Bajo riesgo: listo para generar.",
  };
}
