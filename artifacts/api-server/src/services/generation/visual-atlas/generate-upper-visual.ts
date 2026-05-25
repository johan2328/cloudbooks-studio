import OpenAI from "openai";
import { writeFile } from "fs/promises";
import { join } from "path";

import { IMAGE_MODEL, IMAGE_QUALITY, BLOCK_LEGACY_IMG_MODEL } from "../../../config/generation";
import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { buildImagePrompt } from "./build-image-prompt";
import { pagePublicPath } from "../../export/paths";

const ALLOW_HIGH_QUALITY = false as const;

export interface UpperVisualResult {
  imageGenerated: boolean;
  imagePath:      string;
  imageError:     string;
}

interface Logger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

/**
 * Genera el upper visual con gpt-image-2 medium (guardrail activo).
 * Si la generación falla, devuelve imagePath = "placeholder" sin escalar.
 * ALLOW_HIGH_QUALITY está hardcodeado a false — no se puede activar sin edit de código.
 */
export async function generateUpperVisual(
  pageId:   string,
  seedData: VisualAtlasPageData,
  outDir:   string,
  log:      Logger,
): Promise<UpperVisualResult> {
  if (ALLOW_HIGH_QUALITY) {
    log.error({ pageId }, "GUARDRAIL VIOLATION: ALLOW_HIGH_QUALITY is true — abortando");
  }
  if (BLOCK_LEGACY_IMG_MODEL) {
    log.info({ pageId }, "Legacy image model check: gpt-image-1 bloqueado — usando gpt-image-2");
  }

  let imageGenerated = false;
  let imagePath      = "placeholder";
  let imageError     = "";

  const openai = new OpenAI();
  try {
    log.info({ pageId, model: IMAGE_MODEL, quality: IMAGE_QUALITY }, "Generating upper visual");

    const imgResponse = await openai.images.generate({
      model:   IMAGE_MODEL,
      prompt:  buildImagePrompt(seedData),
      n:       1,
      size:    "1536x1024",
      quality: IMAGE_QUALITY,
    });

    const b64    = imgResponse.data?.[0]?.b64_json;
    const imgUrl = imgResponse.data?.[0]?.url;
    let imgBuf: Buffer | null = null;

    if (b64) {
      imgBuf = Buffer.from(b64, "base64");
    } else if (imgUrl) {
      const r = await fetch(imgUrl);
      imgBuf  = Buffer.from(await r.arrayBuffer());
    }

    if (imgBuf) {
      await writeFile(join(outDir, "upper-art.png"), imgBuf);
      imageGenerated = true;
      imagePath      = pagePublicPath(pageId, "upper-art.png");
      log.info({ pageId, bytes: imgBuf.length }, "Upper visual saved (upper-art.png)");
    }
  } catch (imgErr) {
    imageError = String(imgErr).slice(0, 300);
    log.warn({ pageId, err: imageError }, "Image generation failed — usando placeholder, sin escalación");
  }

  return { imageGenerated, imagePath, imageError };
}
