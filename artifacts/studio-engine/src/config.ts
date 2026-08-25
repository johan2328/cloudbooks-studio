import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotEnv } from "./env.js";
import { getActiveBook } from "./active-book.js";
import { currentBook } from "./book-context.js";

loadDotEnv();

const here = path.dirname(fileURLToPath(import.meta.url));

/** Resuelve un ejecutable de Chrome/Edge para el QA renderizado (headless). */
function resolveChrome(): string | null {
  const cands = [
    process.env.ENGINE_CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA.replace(/\\/g, "/")}/Google/Chrome/Application/chrome.exe` : null,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ];
  for (const c of cands) { if (c) { try { if (fs.existsSync(c)) return c; } catch { /* ignore */ } } }
  return null;
}

/**
 * Configuración del motor. Replit-ready: todo por variables de entorno.
 * Las salidas viven en un namespace propio (cloudbooks-engine) DENTRO de
 * artifacts/studio/public para que Vite las sirva, sin tocar las de Codex
 * (cloudbooks).
 */
export const CONFIG = {
  port: Number(process.env.ENGINE_PORT ?? 8790),
  store: (process.env.STORE ?? "file") as "file" | "pg",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  // KIMI K3 (Moonshot, OpenAI-compatible) para los agentes de TEXTO. El cliente rutea por modelo: los
  // modelos "kimi*" van a este endpoint; las imágenes/visión siguen en OpenAI. Key/baseURL desde .env.
  kimiKey: process.env.ENGINE_KIMI_KEY ?? "",
  kimiBaseUrl: process.env.ENGINE_KIMI_BASE_URL ?? "https://api.moonshot.ai/v1",
  /** Esfuerzo de razonamiento de kimi-k3: low | high | max. "low" por LATENCIA: con fuente completa, "high"/"max" tardaban >10 min/cap. */
  kimiEffort: process.env.ENGINE_KIMI_EFFORT ?? "low",
  // REPARTO DE MODELOS (15-ago): AUTOR y VERIFICADOR/EXPERTO en kimi-k3 (razonamiento → contenido profundo +
  // juez consistente); TODO lo demás (enrich, textModel, misc) en gpt-5.6-luna (rápido y baratísimo:
  // $0.20/$1.20 por 1M). Imágenes/visión siguen en OpenAI. El cliente rutea por modelo (openai-client.ts).
  textModel: process.env.ENGINE_TEXT_MODEL ?? "gpt-5.6-luna",
  /** QA editorial + VERIFICADOR/EXPERTO de grounding. gpt-5.6-luna (razonamiento, RÁPIDO y baratísimo $0.20/$1.20):
   *  kimi era razonamiento pero DEMASIADO lento (~50s/llamada = ~7min/cap) y rechazaba el enrich. Luna razona,
   *  es ~5x más rápido y queda ALINEADO con el enrich Luna → deja pasar la práctica. */
  qaModel: process.env.ENGINE_QA_MODEL ?? "gpt-5.6-luna",
  /** Autoría anclada (redacta el contenido desde las fuentes). gpt-5.6-luna: rápido, barato y OBEDIENTE al contrato
   *  editorial (kimi-k3 era lento, caro y violaba reglas como el anti-duplicado de objetivos; la profundidad viene
   *  del PROMPT v8, no del modelo). Alineado con verify+enrich Luna. */
  authorModel: process.env.ENGINE_AUTHOR_MODEL ?? "gpt-5.6-luna",
  /** ENRICH (agrega código/tablas/callouts + práctica). gpt-5.6-luna (barato/rápido, alineado con el verificador Luna).
   *  Terra quedó descartado por costo de salida ($12/1M). Su código lo revisa el gate; los duros escalan (abajo). */
  enrichModel: process.env.ENGINE_ENRICH_MODEL ?? "gpt-5.6-luna",
  /** ESCALADA del enrich: DESHABILITADA (se sacó kimi del camino de texto). El verify+enrich Luna alineados +
   *  el rescate de práctica en fallback manejan los casos duros sin escalar. Reactivable por .env si hiciera falta. */
  enrichEscalateModel: process.env.ENGINE_ENRICH_ESCALATE_MODEL ?? "",
  /** VERIFICADOR DE PRÁCTICA — INDEPENDIENTE del autor/enrich (que son Luna). gpt-5.6-terra (equilibrado, distinto de
   *  Luna) → el gate de la práctica NO lo corre el mismo modelo que la escribió (cierra el "verified ≠ verificado").
   *  Barato: pocos claims por capítulo. Overridable por .env. */
  practiceVerifyModel: process.env.ENGINE_PRACTICE_VERIFY_MODEL ?? "gpt-5.6-terra",
  /** Versión del autor (entra al cache de drafts). v6: corpus completo. v7: tope 8 + spread. v8: granularidad (sub-temas distintos = tarjetas separadas; unidades ricas → 7-8 → spread). Corrida 37. */
  authorVersion: "author-v8-granular",
  /** Modelo de visión para puntuar/QA de imágenes. gpt-4.1-mini es multimodal y barato. */
  visionModel: process.env.ENGINE_VISION_MODEL ?? "gpt-4.1-mini",
  // gpt-image-2 (medium): el modelo con el que trabaja el repo golden master.
  imageModel: process.env.ENGINE_IMAGE_MODEL ?? "gpt-image-2",
  imageQuality: process.env.ENGINE_IMAGE_QUALITY ?? "medium",
  imageSize: process.env.ENGINE_IMAGE_SIZE ?? "1536x1024",
  imageMaxAttempts: Number(process.env.ENGINE_IMAGE_MAX_ATTEMPTS ?? 3),
  /** Costo estimado por imagen (USD) para el ledger/guardrail. Ajustable. */
  imageCostUsd: Number(process.env.ENGINE_IMAGE_COST_USD ?? 0.04),
  /** Tope mensual de costo (USD). 0 = sin tope. */
  costCapUsd: Number(process.env.ENGINE_COST_CAP_USD ?? 25),
  /** Gate de QA predictivo: no gastar imagen si el riesgo es alto. */
  gateImageOnRisk: (process.env.ENGINE_GATE_ON_RISK ?? "true") !== "false",
  /** Ejecutable de Chrome/Edge para el QA renderizado (null = sin headless). */
  chromePath: resolveChrome(),
  /** Generar 2 variantes y quedarse con la mejor por visión en cada generate. */
  alwaysVariants: (process.env.ENGINE_ALWAYS_VARIANTS ?? "true") !== "false",
  /** Versión del prompt (entra al hash de idempotencia). v10: Azure colorido de Microsoft (iconografía Azure, secciones de color), flat. */
  promptVersion: "imgprompt-v10-azure-color",
  // ── Infografía de página completa (image-2 dibuja el cuerpo; HTML el header/footer) ──
  infographicSize: process.env.ENGINE_INFOGRAPHIC_SIZE ?? "1024x1536",
  infographicQuality: process.env.ENGINE_INFOGRAPHIC_QUALITY ?? "medium",
  infographicCostUsd: Number(process.env.ENGINE_INFOGRAPHIC_COST_USD ?? 0.07),
  /** Reintentos máximos cuando el QA de visión rechaza la imagen (re-roll). */
  infographicMaxRerolls: Number(process.env.ENGINE_INFOGRAPHIC_REROLLS ?? 2),
  infographicPromptVersion: "infographic-v6-optionweight",
  /** Path del master de estilo (ancla). Si existe, image-2 genera CON referencia
   *  para heredar el look. Lo setea el humano al aprobar una página como master. */
  styleAnchorEnabled: (process.env.ENGINE_STYLE_ANCHOR ?? "true") !== "false",
  /** Cert + formato del LIBRO ACTIVO — getters sobre el store `active-book` (estado real,
   *  reencaminable). Default ai-200/visual-atlas → el Atlas se comporta idéntico. */
  get certId(): string { return currentBook()?.certId ?? getActiveBook(CONFIG.outputRoot).certId; },
  get format(): string { return currentBook()?.format ?? getActiveBook(CONFIG.outputRoot).format; },
  /** Umbral de "unidad densa": con esta cantidad de tarjetas o más, la lámina se vuelve SPREAD (pág 1 = las 6 primeras tarjetas; pág 2 = tarjetas restantes + trampas + autocheck). 6 o menos = una sola página. Corrida 37.2. */
  spreadMinModules: Number(process.env.ENGINE_SPREAD_MIN_MODULES) || 7,
  contractVersion: "engine-v1-2026-06",
  outputRoot: process.env.ENGINE_OUTPUT_ROOT
    ? path.resolve(process.env.ENGINE_OUTPUT_ROOT)
    : path.resolve(here, "..", "..", "studio", "public", "assets", "cloudbooks-engine"),
  publicAssetsBase: "/assets/cloudbooks-engine",
} as const;

export function pageOutputDir(pageId: string): string {
  return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "pages", pageId);
}

export function pagePublicBase(pageId: string): string {
  return `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/pages/${pageId}`;
}

/** Carpeta/base públicos de la imagen COMPARTIDA por dominio (1 imagen por dominio). */
export function domainOutputDir(domainId: string): string {
  return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "domains", domainId);
}
export function domainPublicBase(domainId: string): string {
  return `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/domains/${domainId}`;
}
