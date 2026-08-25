import { toFile } from "openai";
import { CONFIG } from "../config.js";
import { getOpenAI } from "../openai-client.js";
import { wouldExceedCap, recordSpend } from "../cost.js";

export type ImageOutcome = "real" | "no_key" | "capped" | "failed";
export type ImageErrorKind = "auth" | "rate" | "prompt" | "server" | "network" | "unknown" | null;

export interface ImageResult {
  outcome: ImageOutcome;
  buffer: Buffer | null;
  attempts: number;
  costUsd: number;
  errorKind: ImageErrorKind;
  error: string | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function categorize(err: unknown): { kind: ImageErrorKind; transient: boolean; msg: string } {
  const status = (err as { status?: number })?.status;
  const msg = String((err as { message?: string })?.message ?? err);
  if (status === 401 || status === 403) return { kind: "auth", transient: false, msg };
  if (status === 400 || status === 422) return { kind: "prompt", transient: false, msg };
  if (status === 429) return { kind: "rate", transient: true, msg };
  if (typeof status === "number" && status >= 500) return { kind: "server", transient: true, msg };
  if (status === undefined) return { kind: "network", transient: true, msg };
  return { kind: "unknown", transient: false, msg };
}

/**
 * Genera la imagen del bloque visual superior con OpenAI, de forma robusta:
 * reintentos con backoff+jitter (solo en errores transitorios), guardrail de
 * costo y errores categorizados. Devuelve el buffer PNG (no escribe el archivo).
 */
export async function generateUpperVisual(
  prompt: string,
  opts?: { size?: string; quality?: string; costUsd?: number; refImages?: Buffer[]; label?: string; pageId?: string },
): Promise<ImageResult> {
  const size = opts?.size ?? CONFIG.imageSize;
  const quality = opts?.quality ?? CONFIG.imageQuality;
  const costUsd = opts?.costUsd ?? CONFIG.imageCostUsd;
  const refImages = opts?.refImages ?? [];
  const client = getOpenAI();
  if (!client) {
    return { outcome: "no_key", buffer: null, attempts: 0, costUsd: 0, errorKind: null, error: "OPENAI_API_KEY ausente" };
  }
  if (wouldExceedCap(costUsd)) {
    return { outcome: "capped", buffer: null, attempts: 0, costUsd: 0, errorKind: null, error: "Tope mensual de costo alcanzado" };
  }

  const max = Math.max(1, CONFIG.imageMaxAttempts);
  let lastKind: ImageErrorKind = null;
  let lastMsg = "";

  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      // Con imagen(es) de referencia → images.edit (ANCLA DE ESTILO: hereda el
      // look del master). Sin referencia → images.generate normal.
      const resp = refImages.length > 0
        ? await client.images.edit({
            model: CONFIG.imageModel,
            image: await Promise.all(refImages.map((b, i) => toFile(b, `ref${i}.png`, { type: "image/png" }))),
            prompt,
            size: size as "1024x1024" | "1536x1024" | "1024x1536" | "auto",
            quality: quality as "low" | "medium" | "high" | "auto",
            n: 1,
          })
        : await client.images.generate({
            model: CONFIG.imageModel,
            prompt,
            size: size as "1024x1024" | "1536x1024" | "1024x1536" | "auto",
            quality: quality as "low" | "medium" | "high" | "auto",
            n: 1,
          });
      const first = resp.data?.[0];
      const b64 = first?.b64_json;
      let buffer: Buffer | null = null;
      if (b64) {
        buffer = Buffer.from(b64, "base64");
      } else if (first?.url) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        try {
          const r = await fetch(first.url, { signal: ctrl.signal });
          if (!r.ok) throw new Error(`descarga de imagen HTTP ${r.status}`);
          const ct = r.headers.get("content-type") ?? "";
          if (ct && !/image\//i.test(ct)) throw new Error(`content-type inesperado: ${ct}`);
          const ab = await r.arrayBuffer();
          if (ab.byteLength < 256) throw new Error("imagen vacía o demasiado chica");
          buffer = Buffer.from(ab);
        } finally {
          clearTimeout(timer);
        }
      }
      if (!buffer) {
        lastKind = "unknown"; lastMsg = "Respuesta de imagen vacía";
        break;
      }
      // Registrar el gasto en el ledger (antes NO se hacía → el crédito de Auto Pages/diseño no se movía).
      recordSpend({ kind: "image", model: CONFIG.imageModel, costUsd, pageId: opts?.pageId, label: opts?.label ?? "design" });
      return { outcome: "real", buffer, attempts: attempt, costUsd, errorKind: null, error: null };
    } catch (err) {
      const c = categorize(err);
      lastKind = c.kind; lastMsg = c.msg;
      if (!c.transient || attempt === max) break;
      const backoff = Math.round(500 * Math.pow(2, attempt - 1) + Math.random() * 250);
      await sleep(backoff);
    }
  }

  return { outcome: "failed", buffer: null, attempts: max, costUsd: 0, errorKind: lastKind, error: lastMsg };
}
