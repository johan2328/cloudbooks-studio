import { getSeed } from "./seeds.js";
import { getRecipe, RECIPES } from "./recipes.js";
import { generatePage } from "./generate.js";
import { decide } from "./decide.js";
import { editorialQa, buildEditorialContext } from "./qa-editorial.js";
import type { AutoReviseResult, ReviseAttempt } from "./types.js";

/**
 * AUTO-REVISIÓN ACOTADA: el contenido (seed) lo evalúa UNA vez el revisor LLM
 * (es fijo). El layout es la palanca que el motor controla: en un bucle acotado
 * regenera con la mejor receta (mesa de decisión) hasta que estructural +
 * identidad pasen y el editorial esté sobre umbral, con historial de intentos.
 * Si el editorial cae por contenido, se detiene y marca revisión humana (no
 * inventa ediciones). Idempotente en imagen (reusa si la receta ya tiene PNG).
 */
export async function autoRevise(
  pageId: string,
  startRecipeId: string,
  maxAttempts = 3,
  threshold = 8,
): Promise<AutoReviseResult> {
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);

  // El editorial depende del contenido (fijo): una sola llamada al LLM.
  const editorial = await editorialQa(seed, buildEditorialContext(pageId));
  const edOverall = editorial.outcome === "real" ? editorial.overall : null;

  const attempts: ReviseAttempt[] = [];
  let recipeId = getRecipe(startRecipeId) ? startRecipeId : RECIPES[0]!.id;
  let approved = false;

  for (let i = 1; i <= maxAttempts; i++) {
    const gen = await generatePage(pageId, recipeId, false);
    const layoutOk = gen.structural.passed && gen.contract.passed;
    const edOk = edOverall == null || edOverall >= threshold;
    approved = layoutOk && edOk;

    const dec = decide(seed, recipeId);
    const canSwitch = dec.kind === "switch" && dec.toRecipe !== recipeId && i < maxAttempts;

    let action: string;
    if (approved) action = "aprobada";
    else if (layoutOk && !edOk) action = "contenido bajo umbral → revisión humana";
    else if (canSwitch) action = `cambiar a “${dec.toLabel}”`;
    else action = "sin mejor receta disponible";

    attempts.push({
      attempt: i,
      recipeId,
      recipeLabel: getRecipe(recipeId)?.label ?? recipeId,
      structural: gen.structural.score,
      contract: gen.contract.score,
      editorial: edOverall,
      verdict: editorial.verdict,
      imageOutcome: gen.image.outcome,
      action,
    });

    if (approved) break;
    if (layoutOk && !edOk) break;        // layout ok pero contenido flojo → humano
    if (canSwitch) recipeId = dec.toRecipe;
    else break;                          // no hay receta mejor
  }

  const finalRecipe = getRecipe(recipeId);
  const reason = approved
    ? "Aprobada: estructural + identidad pasan y el editorial está sobre umbral."
    : edOverall != null && edOverall < threshold
      ? `Editorial ${edOverall}/10 bajo umbral ${threshold}: revisar contenido (ver hallazgos), el layout no lo corrige.`
      : editorial.outcome !== "real"
        ? "Layout optimizado; el QA editorial (LLM) no corrió (sin llave o falló)."
        : "No se alcanzó el umbral con las recetas disponibles.";

  return {
    pageId,
    attempts,
    finalRecipeId: recipeId,
    finalRecipeLabel: finalRecipe?.label ?? recipeId,
    approved,
    reason,
    threshold,
    editorial,
  };
}
