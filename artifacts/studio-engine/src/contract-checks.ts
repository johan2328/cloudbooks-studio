import { MEASURABLE_CONTRACT as MC } from "./contract.js";
import { railTokens } from "./render/layout-constants.js";
import { analyze } from "./decide.js";
import type { ContractCheck, ContractResult, GenerationMode, PageSeed, Recipe } from "./types.js";

/**
 * Corre el contrato visual contra el HTML renderizado + la geometría. Convierte
 * la identidad (numeración, bordes, escala tipográfica, mínimos, jerarquía,
 * densidad, marca, coherencia imagen) en checks verificables. QA de identidad.
 */
export function runContractChecks(
  seed: PageSeed,
  recipe: Recipe,
  html: string,
  generationMode: GenerationMode,
): ContractResult {
  const checks: ContractCheck[] = [];
  const add = (id: string, name: string, ok: boolean, detail = "") => checks.push({ id, name, ok, detail });

  // Lienzo
  add("canvas", `Lienzo ${MC.canvas.w}×${MC.canvas.h}`, html.includes(`width:${MC.canvas.w}px;height:${MC.canvas.h}px`));

  // Marca (footer: CloudBooks · AI-200 Visual Atlas)
  add("brand", "Footer de marca (CloudBooks)", html.includes(MC.brandText));
  add("badge", "Identidad de marca (AI-200 · Visual Atlas)", html.includes(MC.badge) && html.includes(MC.series));

  // Guía única
  const guideCount = (html.match(/class="guide"/g) ?? []).length;
  add("guide", "Guía única", guideCount === 1, `${guideCount} bloque(s)`);

  // Numeración de trampas
  const tnCount = (html.match(/class="tn"/g) ?? []).length;
  const trapsShown = recipe.railMode === "compact" ? Math.min(2, seed.traps.length) : seed.traps.length;
  add("numbering", "Numeración de trampas consistente", tnCount === trapsShown, `${tnCount}/${trapsShown}`);

  // Bordes ∈ {1,2}px
  const borderWidths = [...html.matchAll(/border(?:-(?:top|right|bottom|left))?:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
  const badBorders = [...new Set(borderWidths)].filter((w) => !MC.borderWidthsPx.includes(w as 1 | 2));
  add("borders", "Bordes ∈ {1px, 2px}", badBorders.length === 0, badBorders.length ? `fuera: ${badBorders.join(", ")}px` : "ok");

  // Escala tipográfica
  const fontSizes = [...html.matchAll(/font-size:\s*([\d.]+)px/g)].map((m) => Number(m[1]));
  const allowed = new Set<number>(MC.typeScalePx as readonly number[]);
  const badFonts = [...new Set(fontSizes)].filter((f) => !allowed.has(f));
  add("typescale", "Escala tipográfica respetada", badFonts.length === 0, badFonts.length ? `fuera: ${badFonts.join(", ")}px` : `${new Set(fontSizes).size} tamaños`);

  // Tipografía mínima de lectura (rail)
  const railFont = railTokens(recipe.railMode).font;
  add("minfont", `Tipografía mínima ≥ ${MC.minReadingFontPx}px`, railFont >= MC.minReadingFontPx, `rail ${railFont}px`);

  // Jerarquía hero > guía ≥ rail
  add("hierarchy", "Jerarquía hero > guía ≥ rail", MC.heroFontPx > MC.guideFontPx && MC.guideFontPx >= railFont, `${MC.heroFontPx} > ${MC.guideFontPx} ≥ ${railFont}`);

  // Densidad (sin microtexto / sin sobrecarga)
  const d = analyze(seed, recipe);
  add("rail-density", "Rail sin microtexto", d.railRatio <= MC.railTightMax, `ratio ${d.railRatio}`);
  add("visual-density", "Visual sin sobrecarga", d.visualRatio <= MC.visualDenseMax, `ratio ${d.visualRatio}`);

  // Coherencia imagen/tarjetas
  const hasImg = /class="visual"/.test(html);
  const hasCards = /class="cards"/.test(html);
  const coherent = generationMode === "openai_image" ? hasImg : hasCards;
  add("image", "Coherencia imagen/tarjetas", coherent, generationMode);

  const passedCount = checks.filter((c) => c.ok).length;
  return {
    version: MC.version,
    passed: passedCount === checks.length,
    score: Math.round((passedCount / checks.length) * 100) / 10,
    checks,
  };
}
