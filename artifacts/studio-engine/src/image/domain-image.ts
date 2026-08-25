import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG, domainOutputDir, domainPublicBase } from "../config.js";
import { atomicWriteFile, atomicWriteFileSync, withLock } from "../fs-safe.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { hasOpenAIKey } from "../openai-client.js";
import { wouldExceedCap } from "../cost.js";
import { buildImagePrompt } from "./build-image-prompt.js";
import { generateBestUpperVisual } from "./variants.js";
import type { ExamDomain, GenerateImageInfo, PageSeed, Recipe } from "../types.js";

/** Piso de coherencia/legibilidad: por debajo, la imagen está rota → regenerar 1 vez. */
const COHERENCE_FLOOR = 4;

export interface DomainImageResult {
  imageUrl?: string;
  hash: string | null;
  outcome: GenerateImageInfo["outcome"];   // real | reused | no_key | capped | failed | gated
  attempts: number;
  costUsd: number;
  visionScore: number | null;
  variant: string | null;
  error: string | null;
}

/** El dominio (de la taxonomía) que cubre una página, vía su primera skill. */
export function domainForSeed(seed: PageSeed): ExamDomain | null {
  const skillId = seed.skillIds?.[0];
  if (!skillId) return null;
  for (const d of getOutline().domains) if (d.skills.some((s) => s.id === skillId)) return d;
  return null;
}

/** Seed sintética que representa al DOMINIO (sus 4 skills tope) para el prompt de imagen. */
function domainSeedFor(domain: ExamDomain): PageSeed {
  const skills = domain.skills.slice(0, 4);
  return {
    pageId: `domain-${domain.id}`,
    pageNumber: "00",
    totalPages: 70,
    domainLabel: domain.label,
    batchLabel: "domain",
    title: domain.label.replace(/^Dominio\s*\d+\s*[—-]\s*/i, "").trim() || domain.label,
    subtitle: "panorama del dominio",
    context: "",
    guideQuestion: "",
    upperVisualAlt: `Panorama visual del ${domain.label}`,
    traps: [],
    autocheck: { question: "", options: [], correctOption: 0, explanation: "", discardNotes: [] },
    visualModules: skills.map((s, i) => ({ num: String(i + 1).padStart(2, "0"), title: s.title, description: s.objectives.join("; ") })),
    skillIds: skills.map((s) => s.id),
  };
}

function exists(p: string): boolean { try { fs.accessSync(p); return true; } catch { return false; } }
function readMeta(metaPath: string): { hash?: string; visionScore?: number | null } {
  try { return JSON.parse(fs.readFileSync(metaPath, "utf8")) as { hash?: string; visionScore?: number | null }; } catch { return {}; }
}

/**
 * IMAGEN COMPARTIDA POR DOMINIO (1 por dominio, no por página): se genera una vez
 * (mejor de 2 por visión, mismo pipeline premium) y TODAS las páginas del dominio
 * la reusan → costo de imagen ~constante por dominio en vez de por página.
 * Idempotente por (dominio + versión de prompt); lock por dominio anti doble gasto.
 */
export async function getDomainImage(domain: ExamDomain, recipe: Recipe, force = false): Promise<DomainImageResult> {
  const dseed = domainSeedFor(domain);
  const { prompt, promptVersion } = buildImagePrompt(dseed, recipe);
  const hash = crypto.createHash("sha256").update(`${domain.id}|${promptVersion}|${prompt}`).digest("hex").slice(0, 16);
  const dir = domainOutputDir(domain.id);
  const pngPath = path.join(dir, "upper-art.png");
  const metaPath = path.join(dir, "art-meta.json");
  const publicBase = domainPublicBase(domain.id);
  const reuse = (): DomainImageResult => ({ imageUrl: `${publicBase}/upper-art.png`, hash, outcome: "reused", attempts: 0, costUsd: 0, visionScore: readMeta(metaPath).visionScore ?? null, variant: null, error: null });

  if (!force && exists(pngPath) && readMeta(metaPath).hash === hash) return reuse();

  return withLock(`domain-img:${domain.id}`, async (): Promise<DomainImageResult> => {
    if (!force && exists(pngPath) && readMeta(metaPath).hash === hash) return reuse();     // re-check dentro del lock
    if (!hasOpenAIKey()) return { hash, outcome: "no_key", attempts: 0, costUsd: 0, visionScore: null, variant: null, error: "Sin llave OpenAI." };
    if (wouldExceedCap(CONFIG.imageCostUsd * 2)) return { hash, outcome: "capped", attempts: 0, costUsd: 0, visionScore: null, variant: null, error: "Tope de costo alcanzado." };

    await fsp.mkdir(dir, { recursive: true });
    let b = await generateBestUpperVisual(dseed, recipe, dir);
    let attempts = 2, extraCost = 0;
    // #5 coherencia/legibilidad (agente de visión): si la imagen sale ROTA
    // (texto ilegible / no representa los conceptos → visión < piso), regenera
    // UNA vez. Acotado: máx 1 reintento, solo si claramente mala (no malgasta).
    if (b.outcome === "real" && b.buffer && b.visionScore != null && b.visionScore < COHERENCE_FLOOR) {
      const b2 = await generateBestUpperVisual(dseed, recipe, dir);
      attempts = 4; extraCost = b2.costUsd;
      if (b2.outcome === "real" && b2.buffer && (b2.visionScore ?? -1) > (b.visionScore ?? -1)) b = b2;
    }
    if (b.outcome === "real" && b.buffer) {
      await atomicWriteFile(pngPath, b.buffer, "domain-upper-art");
      atomicWriteFileSync(metaPath, JSON.stringify({ hash, at: new Date().toISOString(), variant: b.variant, visionScore: b.visionScore }, null, 2), "domain-art-meta");
      return { imageUrl: `${publicBase}/upper-art.png`, hash, outcome: "real", attempts, costUsd: b.costUsd + extraCost, visionScore: b.visionScore, variant: b.variant, error: null };
    }
    return { hash, outcome: b.outcome === "real" ? "failed" : b.outcome, attempts, costUsd: extraCost, visionScore: null, variant: null, error: b.error };
  });
}
