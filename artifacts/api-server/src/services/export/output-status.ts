import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

import { VISUAL_ATLAS_V24_CONTRACT } from "../../domain/editorial-contracts/visual-atlas-v24";
import { pageOutputDir, pagePublicPath } from "./paths";

export type GenerationMode = "openai_image" | "placeholder_image" | "fallback_html" | "none";

export interface OutputStatus {
  pageId: string;
  hasOutput: boolean;
  files: {
    html: boolean;
    metadata: boolean;
    qaReport: boolean;
    upperVisual: boolean;
    previewSvg: boolean;
    previewPng: boolean;
    approved: boolean;
  };
  generationMode: GenerationMode;
  templateApproach: string | null;
  layoutRevision: string | null;
  currentLayoutRevision: string;
  generatedAt: string | null;
  approvedAt: string | null;
  htmlPath: string | null;
  previewPath: string | null;
}

/**
 * Lee el filesystem para reportar el estado de outputs de una pagina.
 * Fuente de verdad: metadata.json + approval.json.
 */
export async function readOutputStatus(pageId: string): Promise<OutputStatus> {
  const outDir = pageOutputDir(pageId);
  const exists = (file: string) => existsSync(join(outDir, file));

  const files = {
    html: exists("page.html"),
    metadata: exists("metadata.json"),
    qaReport: exists("qa-report.md"),
    upperVisual: exists("upper-art.png"),
    previewSvg: exists("preview.svg"),
    previewPng: exists("preview.png"),
    approved: exists("approval.json"),
  };

  const hasAny = Object.values(files).some(Boolean);
  let generationMode: GenerationMode = "none";
  let generatedAt: string | null = null;
  let templateApproach: string | null = null;
  let layoutRevision: string | null = null;
  let approvedAt: string | null = null;

  if (files.metadata) {
    try {
      const raw = await readFile(join(outDir, "metadata.json"), "utf-8");
      const metadata = JSON.parse(raw) as {
        generationMode?: string;
        generatedAt?: string;
        templateApproach?: string;
        layoutRevision?: string;
      };
      const mode = metadata.generationMode;
      if (mode === "openai_image" || mode === "placeholder_image" || mode === "fallback_html") {
        generationMode = mode;
      }
      generatedAt = metadata.generatedAt ?? null;
      templateApproach = metadata.templateApproach ?? null;
      layoutRevision = metadata.layoutRevision ?? null;
    } catch {
      // metadata corrupto: se mantiene el estado por defecto
    }
  }

  if (files.approved) {
    try {
      const raw = await readFile(join(outDir, "approval.json"), "utf-8");
      const approval = JSON.parse(raw) as { approvedAt?: string };
      approvedAt = approval.approvedAt ?? null;
    } catch {
      // approval corrupto: no bloquea lectura de status
    }
  }

  const previewPath = files.upperVisual
    ? pagePublicPath(pageId, "upper-art.png")
    : files.previewPng
      ? pagePublicPath(pageId, "preview.png")
      : files.previewSvg
        ? pagePublicPath(pageId, "preview.svg")
        : null;

  return {
    pageId,
    hasOutput: hasAny,
    files,
    generationMode,
    templateApproach,
    layoutRevision,
    currentLayoutRevision: VISUAL_ATLAS_V24_CONTRACT.renderRevision,
    generatedAt,
    approvedAt,
    htmlPath: files.html ? pagePublicPath(pageId, "page.html") : null,
    previewPath,
  };
}
