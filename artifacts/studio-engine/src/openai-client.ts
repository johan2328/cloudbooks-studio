import OpenAI from "openai";
import { CONFIG } from "./config.js";

let oaiClient: OpenAI | null = null;
let kimiClient: OpenAI | null = null;
let routedClient: OpenAI | null = null;

function baseOpenAI(): OpenAI | null {
  if (!CONFIG.openaiKey) return null;
  if (!oaiClient) oaiClient = new OpenAI({ apiKey: CONFIG.openaiKey });
  return oaiClient;
}

function baseKimi(): OpenAI | null {
  if (!CONFIG.kimiKey) return null;
  if (!kimiClient) kimiClient = new OpenAI({ apiKey: CONFIG.kimiKey, baseURL: CONFIG.kimiBaseUrl });
  return kimiClient;
}

/**
 * Sanea el body para Kimi K3 (modelo de RAZONAMIENTO, OpenAI-compatible pero con reglas propias):
 *  - `temperature`: solo admite 1 → se OMITE (usa el default del modelo).
 *  - usa `max_tokens` (no `max_completion_tokens`); se da piso amplio porque incluye tokens de pensamiento.
 *  - `reasoning_effort`: low|high|max (default del modelo = max, lento) → se fija el de CONFIG si no vino.
 */
function kimiBody(body: Record<string, unknown>): Record<string, unknown> {
  const b: Record<string, unknown> = { ...body };
  delete b.temperature;
  const cap = Number(b.max_tokens ?? b.max_completion_tokens ?? 4000);
  delete b.max_completion_tokens;
  b.max_tokens = Math.max(cap, 8000);
  if (b.reasoning_effort == null) b.reasoning_effort = CONFIG.kimiEffort;
  return b;
}

/**
 * Sanea el body para modelos de RAZONAMIENTO de OpenAI (gpt-5*, o*): SIN `temperature` (solo admiten 1) y
 * `max_completion_tokens` en vez de `max_tokens`, con piso para dejar lugar al pensamiento. Protege a los
 * call sites que hardcodean `temperature`/`max_tokens` (supervise, search-sources, etc.) cuando su modelo
 * pasa a gpt-5.6-luna (razonamiento) — antes solo el helper `chatModelParams` los adaptaba.
 */
function reasoningBody(body: Record<string, unknown>): Record<string, unknown> {
  const b: Record<string, unknown> = { ...body };
  delete b.temperature;
  const cap = Number(b.max_completion_tokens ?? b.max_tokens ?? 4000);
  delete b.max_tokens;
  b.max_completion_tokens = Math.max(cap, 4000);
  return b;
}

/**
 * Cliente con RUTEO POR MODELO. Las `chat.completions` cuyo `model` empieza con "kimi" van al endpoint de
 * Kimi/Moonshot (con params saneados); TODO lo demás (imágenes, visión, embeddings y los modelos OpenAI) va
 * al cliente OpenAI. Es un Proxy transparente → los ~30 call sites NO cambian. Devuelve null si no hay ninguna
 * llave (generación deshabilitada). Sin Kimi configurado, se comporta idéntico al cliente OpenAI de antes.
 */
export function getOpenAI(): OpenAI | null {
  const oai = baseOpenAI();
  const kimi = baseKimi();
  if (!kimi) return oai;          // sin Kimi → OpenAI puro (comportamiento previo)
  if (!oai) return kimi;          // solo Kimi (las imágenes/visión fallarían; caso degradado)
  if (routedClient) return routedClient;

  const oaiCreate = oai.chat.completions.create.bind(oai.chat.completions) as (b: unknown, o?: unknown) => unknown;
  const kimiCreate = kimi.chat.completions.create.bind(kimi.chat.completions) as (b: unknown, o?: unknown) => unknown;
  const routedChat = {
    completions: {
      create: (body: Record<string, unknown>, opts?: unknown) => {
        const model = String(body?.model ?? "");
        if (/^kimi/i.test(model)) return kimiCreate(kimiBody(body), opts);
        if (/^(gpt-5|o[0-9])/.test(model)) return oaiCreate(reasoningBody(body), opts);
        return oaiCreate(body, opts);
      },
    },
  };
  routedClient = new Proxy(oai, {
    get(target, prop) {
      if (prop === "chat") return routedChat;
      const v = (target as unknown as Record<string | symbol, unknown>)[prop];
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(target) : v;
    },
  }) as OpenAI;
  return routedClient;
}

export function hasOpenAIKey(): boolean {
  return Boolean(CONFIG.openaiKey || CONFIG.kimiKey);
}

/**
 * Params compatibles por FAMILIA de modelo:
 *  - Kimi (razonamiento): `max_tokens` amplio (incluye pensamiento) + `reasoning_effort`, SIN temperature.
 *  - GPT-5/o* (razonamiento): `max_completion_tokens`, SIN temperature.
 *  - Resto (gpt-4.1*): `temperature` + `max_tokens`.
 * (El ruteo del cliente sanea igual los kimi por si un call site no usa este helper.)
 */
export function chatModelParams(model: string, maxTokens: number, temperature = 0.3): Record<string, number | string> {
  if (/^kimi/i.test(model)) return { max_tokens: Math.max(maxTokens * 2, 8000), reasoning_effort: CONFIG.kimiEffort };
  if (/^(gpt-5|o[0-9])/.test(model)) return { max_completion_tokens: Math.max(maxTokens * 2, 4000) };
  return { temperature, max_tokens: maxTokens };
}
