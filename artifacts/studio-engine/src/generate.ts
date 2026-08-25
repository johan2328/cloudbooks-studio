import fs from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "./fs-safe.js";
import { CONFIG, pageOutputDir, pagePublicBase } from "./config.js";
import { getSeed } from "./seeds.js";
import { getRecipe, RECIPES } from "./recipes.js";
import { autoFit } from "./render/auto-fit.js";
import { directLayout } from "./render/layout-director.js";
import { hasOpenAIKey } from "./openai-client.js";
import { domainForSeed, getDomainImage } from "./image/domain-image.js";
import { runContractChecks } from "./contract-checks.js";
import { predictPage } from "./predict.js";
import type { GenerateImageInfo, GenerateResult, GenerationMode, PipelineStage, StructuralCheck } from "./types.js";

function qaMarkdown(meta: { pageId: string; recipeLabel: string; generatedAt: string; generationMode: string; structural: { score: number; checks: StructuralCheck[] } }): string {
  const lines = meta.structural.checks.map((c) => `- [${c.ok ? "x" : " "}] ${c.name}`).join("\n");
  return `# QA estructural — Pág. ${meta.pageId}\n\nReceta: **${meta.recipeLabel}** · modo: ${meta.generationMode}\nGenerado: ${meta.generatedAt}\nScore estructural: **${meta.structural.score}/10**\n\n${lines}\n\n> QA editorial (LLM) y auto-revisión llegan en corridas siguientes.\n`;
}

/**
 * Genera la página: (seed + receta) → prompt de imagen (intención de la receta)
 * → imagen real (OpenAI, robusta) con idempotencia/costo → render determinista
 * que embebe la imagen si existe, o cae con gracia a las tarjetas.
 */
export async function generatePage(pageId: string, recipeId: string, force = false): Promise<GenerateResult> {
  const t0 = Date.now();
  const seed = getSeed(pageId);
  if (!seed) throw new Error(`seed_missing:${pageId}`);
  const recipe = getRecipe(recipeId) ?? RECIPES[0]!;

  const dir = pageOutputDir(pageId);
  await fs.mkdir(dir, { recursive: true });
  const publicBase = pagePublicBase(pageId);

  // ── imagen COMPARTIDA por dominio (1 imagen por dominio, no por página) ──
  // QA predictivo (informativo; la imagen del dominio se gestiona/cachea aparte).
  const prediction = predictPage(seed, recipe);

  let imageUrl: string | undefined;
  let imageHash: string | null = null;
  let image: GenerateImageInfo;
  let chosenVariant: string | null = null;
  let chosenVisionScore: number | null = null;

  const tImg0 = Date.now();
  const domain = domainForSeed(seed);
  if (domain) {
    const di = await getDomainImage(domain, recipe, force);
    if (di.imageUrl) {
      imageUrl = di.imageUrl;
      imageHash = di.hash;
      chosenVariant = di.variant;
      chosenVisionScore = di.visionScore;
      image = { outcome: di.outcome, attempts: di.attempts, reused: di.outcome === "reused", costUsd: di.costUsd, errorKind: null, error: null };
    } else {
      image = { outcome: di.outcome, attempts: di.attempts, reused: false, costUsd: 0, errorKind: "domain_image", error: di.error };
    }
  } else {
    image = { outcome: "failed", attempts: 0, reused: false, costUsd: 0, errorKind: "no_domain", error: "La página no mapea a un dominio (skillIds)." };
  }
  const imgMs = Date.now() - tImg0;

  const generationMode: GenerationMode = imageUrl ? "openai_image" : (image.outcome === "no_key" ? "fallback_html" : "placeholder_image");

  const tRender0 = Date.now();
  // 1) GEOMETRÍA (regla): render + medición + ajuste hasta que entra.
  let fitRes = await autoFit(seed, recipe, imageUrl);
  // 2) JUICIO (agente): el director de maquetación mira la página renderizada y
  //    decide si llenar el aire con una síntesis (que redacta) y/o achicar la
  //    imagen. La regla VALIDA: solo adoptamos su directiva si sigue entrando.
  let directive = null as Awaited<ReturnType<typeof directLayout>> | null;
  if (imageUrl && hasOpenAIKey()) {
    directive = await directLayout(seed, recipe, fitRes.html);
    if (directive.decision === "synthesize" && directive.synthesis) {
      const withSynth = await autoFit(seed, recipe, imageUrl, { synthesisText: directive.synthesis, imageMaxH: directive.imageMaxHeightPx ?? undefined });
      if (withSynth.fitted && !withSynth.renderQa.overflow) fitRes = withSynth;   // entra de verdad → adoptamos
    }
  }
  const { html, structural, renderQa, fitApplied, fitted, attempts: fitAttempts } = fitRes;
  const renderMs = Date.now() - tRender0;

  const tQa0 = Date.now();
  const contract = runContractChecks(seed, recipe, html, generationMode);
  const qaMs = Date.now() - tQa0;
  const generatedAt = new Date().toISOString();

  // ── guardar page.html (medimos el guardado del artefacto principal) ──
  const tSave0 = Date.now();
  await atomicWriteFile(path.join(dir, "page.html"), html, "page.html");
  const saveMs = Date.now() - tSave0;

  // ── pipeline editorial: el flujo REAL por etapas (con tiempos medidos) ──
  const imgDetail =
    image.outcome === "real" ? `${CONFIG.imageModel} ${CONFIG.imageQuality} · imagen de dominio (nueva)${chosenVariant ? ` · mejor de 2 (var ${chosenVariant}, visión ${chosenVisionScore ?? "n/d"})` : ""}`
    : image.outcome === "reused" ? `${CONFIG.imageModel} · imagen de dominio reusada (sin gasto)${chosenVisionScore != null ? ` · visión ${chosenVisionScore}` : ""}`
    : image.outcome === "gated" ? "gate de riesgo alto · sin gasto"
    : image.outcome === "no_key" ? "sin llave OpenAI · placeholder"
    : image.outcome === "capped" ? "tope de costo · placeholder"
    : `falló (${image.errorKind ?? "?"}) · placeholder`;
  const imgStatus: PipelineStage["status"] =
    image.outcome === "real" || image.outcome === "reused" ? "done"
    : image.outcome === "failed" ? "failed" : "skipped";

  const pipeline: PipelineStage[] = [
    { num: "01", key: "image", label: "Imagen visual", detail: imgDetail, status: imgStatus, ms: imgMs },
    { num: "02", key: "assemble", label: "Ensamblado + auto-fit + director", detail: `render · receta ${recipe.label}${fitAttempts > 1 ? ` · auto-fit (intento ${fitAttempts}${fitted ? "" : ", aún desborda"})` : ""}${directive?.ran ? ` · director: ${directive.decision}${directive.decision === "synthesize" ? " (síntesis)" : ""}` : ""}`, status: fitted ? "done" : "failed", ms: renderMs },
    { num: "03", key: "qa", label: "QA estructural + identidad + render", detail: `est ${structural.score} · id ${contract.score}${renderQa.available ? ` · render ${renderQa.overflow ? "TRUNCA ✗" : "ok"}` : " · render n/d"}`, status: structural.passed && contract.passed && !renderQa.overflow ? "done" : "failed", ms: qaMs },
    { num: "04", key: "save", label: "Guardar outputs", detail: `page.html · metadata.json · qa-report.md${imageUrl ? " · img de dominio" : ""}`, status: "done", ms: saveMs },
    { num: "05", key: "done", label: "Completado", detail: "page.html listo · static files", status: "done", ms: Date.now() - t0 },
  ];

  const meta = {
    pageId,
    recipeId: recipe.id,
    recipeLabel: recipe.label,
    generationMode,
    approach: "composer_parametric_v1",
    layoutRevision: recipe.id,
    contractVersion: CONFIG.contractVersion,
    textModel: CONFIG.textModel,
    imageModel: CONFIG.imageModel,
    imageQuality: CONFIG.imageQuality,
    generatedAt,
    imageHash,
    imageOutcome: image.outcome,
    visionScore: chosenVisionScore,
    structural,
    contract,
    prediction,
    pipeline,
    renderQa,
    fit: fitApplied,
    fitAttempts,
    fitted,
    layoutDirective: directive,
  };

  await atomicWriteFile(path.join(dir, "metadata.json"), JSON.stringify(meta, null, 2), "metadata.json");
  await atomicWriteFile(path.join(dir, "qa-report.md"), qaMarkdown(meta), "qa-report.md");

  return {
    pageId,
    recipeId: recipe.id,
    recipeLabel: recipe.label,
    generatedAt,
    durationMs: Date.now() - t0,
    generationMode,
    approach: "composer_parametric_v1",
    layoutRevision: recipe.id,
    structural,
    image,
    contract,
    prediction,
    pipeline,
    renderQa,
    htmlPath: `${publicBase}/page.html`,
    bytes: Buffer.byteLength(html, "utf8"),
  };
}
