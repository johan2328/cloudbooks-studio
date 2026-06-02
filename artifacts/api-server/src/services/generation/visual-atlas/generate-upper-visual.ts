import OpenAI from "openai";
import { createHash } from "crypto";
import { writeFile } from "fs/promises";
import { join } from "path";

import { BLOCK_LEGACY_IMG_MODEL } from "../../../config/generation";
import type { ImageGenerationFailure, ImageGenerationFailureCode, VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { VISUAL_ATLAS_V24_CONTRACT } from "../../../domain/editorial-contracts/visual-atlas-v24";
import { buildImagePrompt } from "./build-image-prompt";
import { pagePublicPath } from "../../export/paths";

const ALLOW_HIGH_QUALITY = VISUAL_ATLAS_V24_CONTRACT.generation.allowHighQuality;
const IMAGE_MODEL = VISUAL_ATLAS_V24_CONTRACT.generation.imageModel;
const IMAGE_QUALITY = VISUAL_ATLAS_V24_CONTRACT.generation.imageQuality;

export interface UpperVisualResult {
  imageGenerated: boolean;
  imagePath: string;
  imageError: string;
  imageAttempted: boolean;
  promptHash: string;
  imageFailure: ImageGenerationFailure | null;
}

interface Logger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 16);
}

function makeFailure(args: {
  code: ImageGenerationFailureCode;
  message: string;
  providerError?: string | null;
  retryable: boolean;
  promptHash: string;
}): ImageGenerationFailure {
  return {
    code: args.code,
    message: args.message,
    providerError: args.providerError ?? null,
    retryable: args.retryable,
    model: IMAGE_MODEL,
    quality: IMAGE_QUALITY,
    promptHash: args.promptHash,
  };
}

function classifyProviderError(value: string): { code: ImageGenerationFailureCode; retryable: boolean; message: string } {
  const lower = value.toLowerCase();
  if (lower.includes("401") || lower.includes("incorrect api key") || lower.includes("invalid api key")) {
    return {
      code: "invalid_api_key",
      retryable: false,
      message: "La clave OpenAI no es valida para generar imagenes.",
    };
  }
  if (lower.includes("timeout") || lower.includes("timed out") || lower.includes("abort")) {
    return {
      code: "timeout",
      retryable: true,
      message: "La generacion de imagen excedio el tiempo esperado.",
    };
  }
  if (lower.includes("fetch") || lower.includes("network") || lower.includes("econn") || lower.includes("connect")) {
    return {
      code: "connectivity_error",
      retryable: true,
      message: "No se pudo conectar de forma estable con OpenAI.",
    };
  }
  return {
    code: "provider_error",
    retryable: true,
    message: "OpenAI devolvio un error durante la generacion de imagen.",
  };
}

async function runImageGenerationPreflight(promptHash: string): Promise<ImageGenerationFailure | null> {
  if (!process.env.OPENAI_API_KEY) {
    return makeFailure({
      code: "missing_api_key",
      message: "OPENAI_API_KEY no esta configurada en el entorno.",
      retryable: false,
      promptHash,
    });
  }
  if (IMAGE_MODEL !== "gpt-image-2") {
    return makeFailure({
      code: "model_not_allowed",
      message: `Modelo de imagen no permitido: ${IMAGE_MODEL}.`,
      retryable: false,
      promptHash,
    });
  }
  if (IMAGE_QUALITY !== "medium") {
    return makeFailure({
      code: "quality_not_allowed",
      message: `Calidad no permitida: ${IMAGE_QUALITY}. Solo medium esta habilitado.`,
      retryable: false,
      promptHash,
    });
  }
  if (VISUAL_ATLAS_V24_CONTRACT.generation.imageSize !== "1536x1024") {
    return makeFailure({
      code: "size_not_allowed",
      message: `Tamano no permitido: ${VISUAL_ATLAS_V24_CONTRACT.generation.imageSize}.`,
      retryable: false,
      promptHash,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("https://api.openai.com/v1/models?limit=1", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: controller.signal,
    });
    const text = response.ok ? "" : await response.text();
    if (response.status === 401) {
      return makeFailure({
        code: "invalid_api_key",
        message: "OPENAI_API_KEY fue rechazada por OpenAI.",
        providerError: text.slice(0, 300),
        retryable: false,
        promptHash,
      });
    }
    if (!response.ok) {
      return makeFailure({
        code: "connectivity_error",
        message: `Preflight OpenAI fallo con HTTP ${response.status}.`,
        providerError: text.slice(0, 300),
        retryable: response.status >= 500 || response.status === 429,
        promptHash,
      });
    }
  } catch (err) {
    const raw = String(err).slice(0, 300);
    const classified = classifyProviderError(raw);
    return makeFailure({
      code: classified.code === "timeout" ? "timeout" : "connectivity_error",
      message: classified.code === "timeout" ? classified.message : "No se pudo completar el preflight de OpenAI.",
      providerError: raw,
      retryable: true,
      promptHash,
    });
  } finally {
    clearTimeout(timeout);
  }

  return null;
}

export async function generateUpperVisual(
  pageId: string,
  seedData: VisualAtlasPageData,
  outDir: string,
  log: Logger,
): Promise<UpperVisualResult> {
  if (ALLOW_HIGH_QUALITY) {
    log.error({ pageId }, "GUARDRAIL VIOLATION: ALLOW_HIGH_QUALITY is true");
  }
  if (BLOCK_LEGACY_IMG_MODEL) {
    log.info({ pageId }, "Legacy image model check: gpt-image-1 blocked, using gpt-image-2");
  }

  const prompt = buildImagePrompt(seedData);
  const promptHash = hashPrompt(prompt);
  let imageGenerated = false;
  let imagePath = "placeholder";
  let imageError = "";
  let imageAttempted = false;
  let imageFailure: ImageGenerationFailure | null = null;

  const preflightFailure = await runImageGenerationPreflight(promptHash);
  if (preflightFailure) {
    log.warn({ pageId, failure: preflightFailure }, "Image generation preflight failed");
    return {
      imageGenerated,
      imagePath,
      imageError: preflightFailure.message,
      imageAttempted,
      promptHash,
      imageFailure: preflightFailure,
    };
  }

  const openai = new OpenAI();
  try {
    log.info({ pageId, model: IMAGE_MODEL, quality: IMAGE_QUALITY, promptHash }, "Generating upper visual");
    imageAttempted = true;

    const imgResponse = await openai.images.generate({
      model: IMAGE_MODEL,
      prompt,
      n: 1,
      size: VISUAL_ATLAS_V24_CONTRACT.generation.imageSize,
      quality: IMAGE_QUALITY,
    });

    const b64 = imgResponse.data?.[0]?.b64_json;
    const imgUrl = imgResponse.data?.[0]?.url;
    let imgBuf: Buffer | null = null;

    if (b64) {
      imgBuf = Buffer.from(b64, "base64");
    } else if (imgUrl) {
      const response = await fetch(imgUrl);
      imgBuf = Buffer.from(await response.arrayBuffer());
    }

    if (!imgBuf) {
      imageFailure = makeFailure({
        code: "no_image_returned",
        message: "OpenAI respondio sin b64_json ni url de imagen.",
        retryable: true,
        promptHash,
      });
      imageError = imageFailure.message;
    } else {
      await writeFile(join(outDir, "upper-art.png"), imgBuf);
      imageGenerated = true;
      imagePath = pagePublicPath(pageId, "upper-art.png");
      log.info({ pageId, bytes: imgBuf.length, promptHash }, "Upper visual saved (upper-art.png)");
    }
  } catch (err) {
    imageError = String(err).slice(0, 300);
    const classified = classifyProviderError(imageError);
    imageFailure = makeFailure({
      code: classified.code,
      message: classified.message,
      providerError: imageError,
      retryable: classified.retryable,
      promptHash,
    });
    log.warn({ pageId, failure: imageFailure }, "Image generation failed, using placeholder");
  }

  return { imageGenerated, imagePath, imageError, imageAttempted, promptHash, imageFailure };
}
