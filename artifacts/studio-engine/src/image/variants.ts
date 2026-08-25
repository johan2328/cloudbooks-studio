import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { atomicWriteFile } from "../fs-safe.js";
import { CONFIG, pageOutputDir, pagePublicBase } from "../config.js";
import { getSeed } from "../seeds.js";
import { getRecipe, RECIPES } from "../recipes.js";
import { autoFit } from "../render/auto-fit.js";
import { runContractChecks } from "../contract-checks.js";
import { predictPage } from "../predict.js";
import { buildImagePrompt } from "./build-image-prompt.js";
import { generateUpperVisual, type ImageOutcome } from "./generate-upper-visual.js";
import { visionScore } from "./vision-score.js";
import { recordCost } from "../cost.js";
import type { PageSeed, Recipe, VariantInfo, VariantsResult } from "../types.js";

const LABELS = ["a", "b"] as const;

/**
 * Genera 2 variantes del bloque visual (mismo contenido, distinto énfasis),
 * las puntúa con visión (dirección de arte) y recomienda la mejor. No toca la
 * imagen activa: el humano (o el recommended) elige con selectVariant.
 */
export async function generateVariants(pageId: string, recipeId: string): Promise<VariantsResult> {
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);
  const recipe = getRecipe(recipeId) ?? RECIPES[0]!;
  const dir = pageOutputDir(pageId);
  await fs.mkdir(dir, { recursive: true });
  const publicBase = pagePublicBase(pageId);

  const variants: VariantInfo[] = [];
  let totalCostUsd = 0;
  for (const v of LABELS) {
    const { prompt } = buildImagePrompt(seed, recipe, v);
    const r = await generateUpperVisual(prompt);
    if (r.outcome === "real" && r.buffer) {
      await atomicWriteFile(path.join(dir, `upper-art-${v}.png`), r.buffer, `upper-art-${v}`);
      recordCost(pageId, `${recipe.id}:var-${v}`, r.costUsd);
      totalCostUsd += r.costUsd;
      const vs = await visionScore(r.buffer, seed.visualModules.slice(0, 8).map((m) => m.title));
      variants.push({ variant: v, imageUrl: `${publicBase}/upper-art-${v}.png`, outcome: "real", costUsd: r.costUsd, visionScore: vs.score, notes: vs.notes });
    } else {
      variants.push({ variant: v, imageUrl: null, outcome: r.outcome, costUsd: 0, visionScore: null, notes: r.error ?? "" });
    }
  }

  const scored = variants.filter((x) => x.visionScore != null);
  const recommended = scored.length
    ? scored.reduce((best, x) => (x.visionScore! > best.visionScore! ? x : best)).variant
    : null;

  return { pageId, recipeId: recipe.id, variants, recommended, totalCostUsd };
}

/**
 * Para el flujo normal: genera 2 variantes y devuelve el BUFFER de la MEJOR por
 * visión (dirección de arte). Escribe los PNG de variante y registra el costo.
 */
export async function generateBestUpperVisual(seed: PageSeed, recipe: Recipe, dir: string): Promise<{
  outcome: ImageOutcome; buffer: Buffer | null; costUsd: number; variant: string | null; visionScore: number | null; error: string | null;
}> {
  const tries: { v: string; buffer: Buffer | null; costUsd: number; score: number | null; outcome: ImageOutcome; error: string | null }[] = [];
  for (const v of LABELS) {
    const { prompt } = buildImagePrompt(seed, recipe, v);
    const r = await generateUpperVisual(prompt);
    if (r.outcome === "real" && r.buffer) {
      await atomicWriteFile(path.join(dir, `upper-art-${v}.png`), r.buffer, `upper-art-${v}`);
      recordCost(seed.pageId, `${recipe.id}:var-${v}`, r.costUsd);
      const vs = await visionScore(r.buffer, seed.visualModules.slice(0, 8).map((m) => m.title));
      tries.push({ v, buffer: r.buffer, costUsd: r.costUsd, score: vs.score, outcome: "real", error: null });
    } else {
      tries.push({ v, buffer: null, costUsd: 0, score: null, outcome: r.outcome, error: r.error });
    }
  }
  const real = tries.filter((t) => t.buffer);
  if (real.length === 0) {
    const f = tries[0];
    return { outcome: f?.outcome ?? "failed", buffer: null, costUsd: 0, variant: null, visionScore: null, error: f?.error ?? "sin imagen" };
  }
  const best = real.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a));
  return { outcome: "real", buffer: best.buffer, costUsd: tries.reduce((s, t) => s + t.costUsd, 0), variant: best.v, visionScore: best.score, error: null };
}

/**
 * Fija una variante como imagen activa de la página: copia upper-art-{v}.png a
 * upper-art.png y re-renderiza (HTML + contrato + metadata) SIN gastar imagen.
 */
export async function selectVariant(pageId: string, recipeId: string, variant: string): Promise<{ ok: boolean; error?: string }> {
  const seed = getSeed(pageId);
  if (!seed) return { ok: false, error: `seed_missing:${pageId}` };
  const recipe = getRecipe(recipeId) ?? RECIPES[0]!;
  const dir = pageOutputDir(pageId);
  const variantPath = path.join(dir, `upper-art-${variant}.png`);
  try { await fs.access(variantPath); } catch { return { ok: false, error: `variante_inexistente:${variant}` }; }

  await fs.copyFile(variantPath, path.join(dir, "upper-art.png"));

  const publicBase = pagePublicBase(pageId);
  const imageUrl = `${publicBase}/upper-art.png`;
  // Mismo hash que generatePage (SIN sufijo de variante): así un /generate
  // posterior REUSA la imagen seleccionada en vez de regenerar (no doble gasto).
  const { prompt, promptVersion } = buildImagePrompt(seed, recipe);
  const imageHash = crypto.createHash("sha256").update(`${pageId}|${recipe.id}|${promptVersion}|${prompt}`).digest("hex").slice(0, 16);

  const fitRes = await autoFit(seed, recipe, imageUrl);
  const { html, structural, renderQa } = fitRes;
  const contract = runContractChecks(seed, recipe, html, "openai_image");
  const prediction = predictPage(seed, recipe);
  const generatedAt = new Date().toISOString();

  const meta = {
    pageId,
    recipeId: recipe.id,
    recipeLabel: recipe.label,
    generationMode: "openai_image",
    approach: "composer_parametric_v1",
    layoutRevision: recipe.id,
    contractVersion: CONFIG.contractVersion,
    textModel: CONFIG.textModel,
    imageModel: CONFIG.imageModel,
    imageQuality: CONFIG.imageQuality,
    generatedAt,
    imageHash,
    imageOutcome: "selected",
    selectedVariant: variant,
    structural,
    contract,
    prediction,
    renderQa,
    fit: fitRes.fitApplied,
    fitted: fitRes.fitted,
  };

  await atomicWriteFile(path.join(dir, "page.html"), html, "page.html");
  await atomicWriteFile(path.join(dir, "metadata.json"), JSON.stringify(meta, null, 2), "metadata.json");
  return { ok: true };
}
