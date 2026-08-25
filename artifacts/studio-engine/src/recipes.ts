import type { Recipe } from "./types.js";

/**
 * Recetas de layout como DATOS. Cambiar la receta cambia la página (grid del
 * cuerpo, cantidad/arreglo de tarjetas, bloques extra y densidad del rail).
 * Esta es la costura que faltaba: el Composer elige una receta y el render la
 * obedece de forma determinista.
 */
export const RECIPES: Recipe[] = [
  { id: "standard",    label: "Estándar",       desc: "Equilibrio visual/rail. 4 tarjetas 2×2, rail estándar.",            upperPct: 60, cards: 4, cols: 2, extras: [],                       railMode: "standard" },
  { id: "4p",          label: "4P",             desc: "Cuatro paneles de concepto, foco visual parejo.",                  upperPct: 60, cards: 4, cols: 2, extras: [],                       railMode: "standard" },
  { id: "4p2c",        label: "4P + 2C",        desc: "Cuatro paneles + franja comparativa de 2 columnas.",               upperPct: 56, cards: 4, cols: 2, extras: ["comparison"],            railMode: "standard" },
  { id: "3p1d2c",      label: "3P + 1D + 2C",   desc: "Tres paneles + diagrama ancho + comparativa de 2 columnas.",       upperPct: 54, cards: 3, cols: 3, extras: ["diagram", "comparison"], railMode: "standard" },
  { id: "rail-compact",label: "Rail Compact",   desc: "Más espacio al visual; rail de examen compacto y tipografía ajustada.", upperPct: 66, cards: 4, cols: 2, extras: [],                  railMode: "compact" },
  { id: "rail-dense",  label: "Rail Dense",     desc: "Rail de examen denso (más señales de examen) y visual reducido.",  upperPct: 50, cards: 4, cols: 2, extras: [],                       railMode: "dense" },
];

const BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe | null {
  return BY_ID.get(id) ?? null;
}
