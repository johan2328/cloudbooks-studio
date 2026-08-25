import fs from "node:fs/promises";
import path from "node:path";
import { pageOutputDir } from "./config.js";
import type { ContractResult, GenerationMode, QASummary, RenderQa, StructuralCheck } from "./types.js";

/** Lee metadata.json de una página y arma el resumen de QA (estructural + identidad). */
export async function readQaSummary(pageId: string): Promise<QASummary> {
  const dir = pageOutputDir(pageId);
  let meta: Record<string, unknown> | null = null;
  try {
    meta = JSON.parse(await fs.readFile(path.join(dir, "metadata.json"), "utf8")) as Record<string, unknown>;
  } catch {
    meta = null;
  }
  if (!meta) {
    return { pageId, generated: false, generationMode: null, recipeId: null, recipeLabel: null, generatedAt: null, structural: null, contract: null, renderQa: null };
  }
  return {
    pageId,
    generated: true,
    generationMode: (meta["generationMode"] as GenerationMode | undefined) ?? null,
    recipeId: (meta["recipeId"] as string | undefined) ?? null,
    recipeLabel: (meta["recipeLabel"] as string | undefined) ?? null,
    generatedAt: (meta["generatedAt"] as string | undefined) ?? null,
    structural: (meta["structural"] as { passed: boolean; score: number; checks: StructuralCheck[] } | undefined) ?? null,
    contract: (meta["contract"] as ContractResult | undefined) ?? null,
    renderQa: (meta["renderQa"] as RenderQa | undefined) ?? null,
    visionScore: (meta["visionScore"] as number | undefined) ?? null,
  };
}
