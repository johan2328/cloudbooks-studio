import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG, pageOutputDir, pagePublicBase } from "./config.js";
import type { GenerationMode, OutputStatus } from "./types.js";

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readMeta(dir: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(path.join(dir, "metadata.json"), "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Lee el filesystem del namespace del motor y reporta el estado de outputs
 * de una página. Mientras no se haya generado nada, devuelve hasOutput=false.
 */
export async function readOutputStatus(pageId: string): Promise<OutputStatus> {
  const dir = pageOutputDir(pageId);
  const base = pagePublicBase(pageId);

  const [html, metadata, qaReport, upperVisual, approved] = await Promise.all([
    exists(path.join(dir, "page.html")),
    exists(path.join(dir, "metadata.json")),
    exists(path.join(dir, "qa-report.md")),
    exists(path.join(dir, "upper-art.png")),
    exists(path.join(dir, "approval.json")),
  ]);

  const meta = metadata ? await readMeta(dir) : null;
  const generationMode = (meta?.["generationMode"] as GenerationMode | undefined) ?? (html ? "fallback_html" : "none");
  const generatedAt = (meta?.["generatedAt"] as string | undefined) ?? null;
  const layoutRevision = (meta?.["layoutRevision"] as string | undefined) ?? null;
  const templateApproach = (meta?.["approach"] as string | undefined) ?? null;
  let approvedAt: string | null = null;
  if (approved) {
    try {
      const raw = await fs.readFile(path.join(dir, "approval.json"), "utf8");
      approvedAt = (JSON.parse(raw) as { approvedAt?: string }).approvedAt ?? null;
    } catch {
      approvedAt = null;
    }
  }

  return {
    pageId,
    hasOutput: html,
    generationMode,
    templateApproach,
    layoutRevision,
    currentLayoutRevision: CONFIG.contractVersion,
    generatedAt,
    approvedAt,
    files: {
      html,
      metadata,
      qaReport,
      upperVisual,
      previewPng: upperVisual,
      previewSvg: false,
      approved,
    },
    htmlPath: html ? `${base}/page.html` : null,
    previewPath: upperVisual ? `${base}/upper-art.png` : null,
  };
}
