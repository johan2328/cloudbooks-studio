import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import { pageOutputDir } from "../export/paths";

export type ApprovalCheckResult =
  | { allowed: true;  generationMode: string }
  | { allowed: false; code: "no_output" | "approval_blocked_placeholder" | "metadata_error"; generationMode?: string };

/**
 * Gate de aprobación editorial.
 * Solo permite aprobación si generationMode === "openai_image"
 * (upper visual real de gpt-image-2 medium). Fallbacks y placeholders quedan bloqueados.
 */
export async function checkApprovalGate(pageId: string): Promise<ApprovalCheckResult> {
  const outDir   = pageOutputDir(pageId);
  const metaPath = join(outDir, "metadata.json");

  if (!existsSync(metaPath)) {
    return { allowed: false, code: "no_output" };
  }

  let generationMode: string | null = null;
  try {
    const raw = await readFile(metaPath, "utf-8");
    const m   = JSON.parse(raw) as { generationMode?: string };
    generationMode = m.generationMode ?? null;
  } catch {
    return { allowed: false, code: "metadata_error" };
  }

  if (generationMode !== "openai_image") {
    return { allowed: false, code: "approval_blocked_placeholder", generationMode: generationMode ?? "unknown" };
  }

  return { allowed: true, generationMode };
}
