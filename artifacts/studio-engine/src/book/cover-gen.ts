import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir, copyFile } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getBookConfig, saveBookConfig, type BookStyle } from "./book-config.js";
import { certMetaByEngineId, type CertMeta } from "../certifications.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { notePromptBlock } from "./design-notes.js";
import { timeAgent } from "../agents/agent-runtime.js";

/**
 * PORTADA/CONTRAPORTADA del libro ACTIVO, generadas con image-2 ANCLADAS a la TAPA DEL
 * ATLAS (`_book/cover.png` / `_book/backcover.png`, GLOBALES) como referencia de marca:
 * image-2 reproduce el layout EXACTO y sólo cambia (1) la etiqueta de formato y (2) la
 * paleta. Se guardan NAMESPACEADAS (no pisan el ancla).
 *
 * E1.1: VERSIONADO — cada generación es una TOMA guardada en `_book/covers/` (o
 * `backcovers/`); el manifiesto lleva `{active, takes[]}`; `cover.png`/`backcover.png`
 * son una COPIA de la toma activa (así el ancla y el armado siguen leyendo el mismo path).
 * Soporta N variantes (primera vez = 3 para elegir), restaurar una toma previa, y sembrar
 * la identidad de marca desde otra cert (design-anchor).
 */
const FORMAT_LABELS: Record<string, string> = {
  "visual-atlas": "VISUAL ATLAS", "master-book": "MASTER BOOK", "cheat-sheets": "CHEAT SHEETS",
  "exam-traps": "EXAM TRAPS GUIDE", "question-bank": "QUESTION BANK", "rapid-review": "RAPID REVIEW",
};

/** Ancla de marca POR-CERT (la tapa/contra de referencia de la cert, compartida por sus 6 formatos).
 *  Se ESCRIBE per-cert; la LECTURA cae al ancla global legada si aún no hay per-cert (migración AI-200). */
function anchorDir(): string { return path.join(CONFIG.outputRoot, CONFIG.certId, "_book"); }
function atlasCoverPath(): string { return path.join(anchorDir(), "cover.png"); }
function atlasBackCoverPath(): string { return path.join(anchorDir(), "backcover.png"); }

// ── almacenamiento versionado (compartido portada/contra) ──
type Kind = "cover" | "back";
const KIND_FILE: Record<Kind, string> = { cover: "cover.png", back: "backcover.png" };
const KIND_TAKES: Record<Kind, string> = { cover: "covers", back: "backcovers" };
const KIND_MANIFEST: Record<Kind, string> = { cover: "cover.json", back: "backcover.json" };

function bookDir(): string { return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_book"); }
function activePath(k: Kind): string { return path.join(bookDir(), KIND_FILE[k]); }
function takesDir(k: Kind): string { return path.join(bookDir(), KIND_TAKES[k]); }
function manifestPath(k: Kind): string { return path.join(bookDir(), KIND_MANIFEST[k]); }
const pub = (rel: string) => `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/_book/${rel}`;
function activeUrlOf(k: Kind): string { return pub(KIND_FILE[k]); }
function takeUrlOf(k: Kind, file: string): string { return pub(`${KIND_TAKES[k]}/${file}`); }

// ── Ancla de marca: lectura per-cert con fallback a la global legada (migración AI-200) ──
function legacyAnchorPath(k: Kind): string { return path.join(CONFIG.outputRoot, "_book", KIND_FILE[k]); }
/** Ruta de LECTURA del ancla: per-cert si existe; si no, la global legada. */
function anchorReadPath(k: Kind): string {
  const perCert = k === "cover" ? atlasCoverPath() : atlasBackCoverPath();
  if (existsSync(perCert)) return perCert;
  const legacy = legacyAnchorPath(k);
  return existsSync(legacy) ? legacy : perCert;
}
/** URL pública del ancla vigente (per-cert o legada), o null si no hay. */
function anchorPubUrl(k: Kind): string | null {
  if (existsSync(k === "cover" ? atlasCoverPath() : atlasBackCoverPath())) return `${CONFIG.publicAssetsBase}/${CONFIG.certId}/_book/${KIND_FILE[k]}`;
  if (existsSync(legacyAnchorPath(k))) return `${CONFIG.publicAssetsBase}/_book/${KIND_FILE[k]}`;
  return null;
}

export interface DesignTake { file: string; url: string; generatedAt: string; hash: string; palette?: string[] }
export interface DesignAsset { active: string | null; activeUrl: string | null; label: string; takes: DesignTake[] }

// Exports de compatibilidad (los usa el ensamblado) ──────────────────────────
export function bookCoverUrl(): string { return activeUrlOf("cover"); }
export function bookBackCoverUrl(): string { return activeUrlOf("back"); }
export function bookCoverFileForActive(): string | null { const p = activePath("cover"); return existsSync(p) ? p : null; }
export function bookBackCoverFileForActive(): string | null { const p = activePath("back"); return existsSync(p) ? p : null; }

function readManifest(k: Kind): DesignAsset {
  try {
    const m = JSON.parse(readFileSync(manifestPath(k), "utf8")) as { active?: string | null; label?: string; takes?: DesignTake[]; hash?: string; generatedAt?: string; palette?: string[] };
    if (Array.isArray(m.takes)) {
      return { active: m.active ?? null, activeUrl: existsSync(activePath(k)) ? activeUrlOf(k) : null, label: m.label ?? "", takes: m.takes };
    }
    // manifiesto LEGACY {hash,generatedAt,label,palette} + imagen en el path activo → una toma sintética "legacy"
    if (existsSync(activePath(k))) {
      return { active: "legacy", activeUrl: activeUrlOf(k), label: m.label ?? "", takes: [{ file: "legacy", url: activeUrlOf(k), generatedAt: m.generatedAt ?? "", hash: m.hash ?? "", palette: m.palette }] };
    }
  } catch { /* sin/roto manifiesto */ }
  if (existsSync(activePath(k))) return { active: "legacy", activeUrl: activeUrlOf(k), label: "", takes: [{ file: "legacy", url: activeUrlOf(k), generatedAt: "", hash: "" }] };
  return { active: null, activeUrl: null, label: "", takes: [] };
}

async function writeManifest(k: Kind, m: DesignAsset): Promise<void> {
  await mkdir(bookDir(), { recursive: true });
  await writeFile(manifestPath(k), JSON.stringify({ active: m.active, label: m.label, takes: m.takes }, null, 2));
}

/** Migra la toma "legacy" (cover.png suelta, sin versionar) a un archivo real en `covers/`. */
async function migrateLegacy(k: Kind, man: DesignAsset): Promise<DesignAsset> {
  if (!man.takes.some(t => t.file === "legacy")) return man;
  if (!existsSync(activePath(k))) { man.takes = man.takes.filter(t => t.file !== "legacy"); if (man.active === "legacy") man.active = null; return man; }
  const legacy = man.takes.find(t => t.file === "legacy")!;
  const file = `t-legacy-${Date.now()}.png`;
  await mkdir(takesDir(k), { recursive: true });
  await copyFile(activePath(k), path.join(takesDir(k), file));
  const migrated: DesignTake = { file, url: takeUrlOf(k, file), generatedAt: legacy.generatedAt || "", hash: legacy.hash || "", palette: legacy.palette };
  man.takes = [migrated, ...man.takes.filter(t => t.file !== "legacy")];
  if (man.active === "legacy") man.active = file;
  return man;
}

/** Copia una toma al archivo canónico activo (cover.png/backcover.png) y refleja en book-config. */
async function activateTake(k: Kind, file: string): Promise<string | null> {
  let man = readManifest(k);
  man = await migrateLegacy(k, man);
  if (!man.takes.some(t => t.file === file)) return null;
  const src = path.join(takesDir(k), file);
  if (!existsSync(src)) return null;
  await copyFile(src, activePath(k));
  man.active = file;
  await writeManifest(k, man);
  const cfg = getBookConfig();
  if (k === "cover") await saveBookConfig({ cover: { ...cfg.cover, mode: "generated", imageUrl: activeUrlOf("cover") } });
  else await saveBookConfig({ backCover: { ...cfg.backCover, mode: "template", imageUrl: activeUrlOf("back") } });
  return activeUrlOf(k);
}

/** Genera UNA toma (image-2 anclada) y la guarda en `covers/`/`backcovers/`. */
async function genTake(k: Kind, prompt: string, palette: string[]): Promise<{ take?: DesignTake; error?: string; costUsd?: number }> {
  const ref = readFileSync(anchorReadPath(k));
  const r = await generateUpperVisual(prompt, { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, refImages: [ref], label: k === "cover" ? "book-cover" : "book-backcover" });
  if (r.outcome !== "real" || !r.buffer) return { error: r.error ?? r.outcome, costUsd: r.costUsd };
  const hash = crypto.createHash("sha256").update(r.buffer).digest("hex").slice(0, 12);
  const file = `t-${Date.now()}-${hash}.png`;
  await mkdir(takesDir(k), { recursive: true });
  await writeFile(path.join(takesDir(k), file), r.buffer);
  return { take: { file, url: takeUrlOf(k, file), generatedAt: new Date().toISOString(), hash, palette }, costUsd: r.costUsd };
}

export interface CoverResult { ok: boolean; url?: string; reused?: boolean; outcome?: string; costUsd?: number; error?: string; takes?: DesignTake[]; active?: string | null }

/** Núcleo compartido: genera N tomas de portada/contra, versiona, activa según reglas. */
async function generateDesign(k: Kind, buildPrompt: (label: string, s: BookStyle, meta: CertMeta) => string, force: boolean, count: number): Promise<CoverResult> {
  if (!hasOpenAIKey() || !getOpenAI()) return { ok: false, error: "Sin llave/cliente OpenAI." };
  const n = Math.max(1, Math.min(3, count));
  if (wouldExceedCap(CONFIG.infographicCostUsd * n)) return { ok: false, error: "Tope de costo mensual alcanzado." };
  if (!existsSync(anchorReadPath(k))) return { ok: false, error: `No existe el ancla de marca (_book/${KIND_FILE[k]}). Cargá una canonical o sembrá desde otra cert.` };

  return withLock(`book-${k}:${CONFIG.certId}.${CONFIG.format}`, async (): Promise<CoverResult> => {
    const s = getBookConfig().style;
    const label = FORMAT_LABELS[CONFIG.format] ?? CONFIG.format.toUpperCase();
    const prompt = buildPrompt(label, s, certMetaByEngineId(CONFIG.certId)) + notePromptBlock(k === "cover" ? "cover" : "back");
    const palette = [s.bg, s.accent, s.accent2];

    let man = await migrateLegacy(k, readManifest(k));
    const newTakes: DesignTake[] = [];
    let cost = 0;
    for (let i = 0; i < n; i++) {
      const r = await genTake(k, prompt, palette);
      if (r.costUsd) cost += r.costUsd;
      if (r.error || !r.take) { if (newTakes.length === 0) return { ok: false, error: r.error ?? "La generación falló.", costUsd: cost }; break; }
      newTakes.push(r.take);
    }
    man.takes = [...newTakes, ...man.takes];   // más nuevas primero
    man.label = label;

    // Activación: 1 toma (regenerar) → activar la nueva. N>1 (elegir) → NO auto-activar (salvo que no hubiera ninguna).
    let activeFile = man.active;
    if (n === 1 && newTakes[0]) activeFile = newTakes[0].file;
    man.active = activeFile;
    await writeManifest(k, man);
    if (activeFile) await activateTake(k, activeFile);

    return { ok: true, url: activeFile ? activeUrlOf(k) : undefined, reused: false, costUsd: cost, takes: man.takes, active: man.active };
  });
}

// ── PORTADA ──────────────────────────────────────────────────────────────────
/** Los 5 captions de dominio de la portada. AI-200 = su copia curada; otras certs = sus rutas (outline). */
function coverCaptions(meta: CertMeta): string[] {
  if (meta.code === "AI-200") return ["APPS EN CONTENEDORES", "DATOS VECTORIALES Y CACHÉ", "INTEGRACIÓN BACKEND", "SECRETOS Y CONFIGURACIÓN", "OBSERVABILIDAD"];
  // AB-620: captions curados (el ciclo de vida del agente + la credencial); si no, saldrían las 3 rutas + el
  // título repetido dos veces por el padding. Arco: diseñar → construir → integrar → probar → certificar.
  if (meta.code === "AB-620") return ["DISEÑAR CONVERSACIONES INTELIGENTES", "CONSTRUIR SOLUCIONES MULTI-AGENTE", "INTEGRAR CON SISTEMAS EMPRESARIALES", "PROBAR Y GOBERNAR AGENTES"];
  const doms = getOutline(CONFIG.certId).domains
    .map((d) => d.label.replace(/^Ruta \d+\s*[—–-]\s*/, "").trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 5);
  while (doms.length < 5) doms.push(meta.title.toUpperCase());   // shell sin outline → foco de la cert
  return doms;
}

/** Tagline de VENTA por cert (keyed por certId minúscula). Sin entrada → sin tagline (AI-200 conserva su tapa). */
const COVER_TAGLINE: Record<string, string> = {
  "ab-620": "Crea agentes de IA en Copilot Studio y aprueba el examen.",
};

/** Prompt de portada = recolor + relabel de la tapa del Atlas (ancla), a la paleta del libro, banda de solo texto.
 *  E3: código, subtítulo, captions de dominio y nivel se parametrizan por cert (AI-200 conserva su copia curada). */
function coverPrompt(label: string, s: BookStyle, meta: CertMeta): string {
  const code = meta.code;
  const subtitle = code === "AI-200" ? "Desarrollo en Azure de Soluciones de IA" : meta.title;
  const captions = coverCaptions(meta).map((c) => `"${c}"`).join(", ");
  // Cantidad de iconos DATA-DRIVEN (sigue a coverCaptions) → los literales "five/FIVE" del prompt no quedan
  // desfasados si un cert usa 4. AI-200 (5) → "five"/"FIVE" idéntico; AB-620 (4) → "four"/"FOUR".
  const iconCount = coverCaptions(meta).length;
  const nWord = ({ 4: "four", 5: "five" } as Record<number, string>)[iconCount] ?? "five";
  const nWordUpper = nWord.toUpperCase();
  // Si el cert usa ≠5 iconos (el reference tiene 5 slots), redistribuir a lo ancho completo para no dejar hueco.
  const iconFitClause = iconCount !== 5 ? ` IMPORTANT: there are ${nWord} icons but the reference has five slots — distribute the ${nWord} icons EVENLY across the FULL width of the row with equal spacing, leaving NO empty slot or gap.` : "";
  // Glifos por dominio (AI-200 = cloud developer; AB-620 = agentes de IA).
  const iconRow = code === "AI-200"
    ? `(1) a stack of containers/boxes for "APPS EN CONTENEDORES", (2) a database cylinder surrounded by small scattered vector dots for "DATOS VECTORIALES Y CACHÉ", (3) connected nodes linked by message arrows for "INTEGRACIÓN BACKEND", (4) a key inside a shield for "SECRETOS Y CONFIGURACIÓN", (5) a line chart with a small magnifier for "OBSERVABILIDAD"`
    : code === "AB-620"
    ? `(1) two overlapping speech/chat bubbles for "DISEÑAR CONVERSACIONES INTELIGENTES", (2) three small connected robot/agent nodes for "CONSTRUIR SOLUCIONES MULTI-AGENTE", (3) a puzzle piece joining an enterprise/building block for "INTEGRAR CON SISTEMAS EMPRESARIALES", (4) a shield with a checkmark for "PROBAR Y GOBERNAR AGENTES"`
    : `each glyph clearly matching its caption — ${captions}`;
  // Tagline de venta por-cert (slot nuevo). Vacío para certs sin entrada → el prompt queda idéntico (AI-200).
  const tagline = COVER_TAGLINE[code.toLowerCase()] ?? "";
  const taglineClause = tagline ? ` A single short SELLING TAGLINE line must read "${tagline}", in a small, thin, elegant style, centered directly below the two-line subtitle (above the wave artwork).` : "";
  const levelBand = `MICROSOFT CERTIFIED ${meta.level.toUpperCase()}`;
  return `Book cover, PORTRAIT orientation (2:3), premium editorial design. The reference image is the CANONICAL brand template for this book family — reproduce its composition, structure, proportions, margins, typography placement, the flowing dotted WAVE/NETWORK artwork band in the middle, the POSITION and SIZE of the row of ${nWordUpper} domain icons, and the bottom band POSITION *identically*. This is a recolor + relabel of the reference (the icon GLYPHS are redrawn per the list below), NOT a new design.

Changes versus the reference:
1) TOP LABEL: the small letter-spaced kicker at the very top currently reading "VISUAL ATLAS" must instead read "${label}" — same uppercase style, same thin horizontal lines with a dot on each side.
2) COLOR PALETTE: the whole cover uses THIS colour scheme — the giant "${code}" wordmark in ${s.accent} (deep, shifting toward ${s.bg}); the wave/network artwork flowing from ${s.accent} on the left to ${s.accent2} on the right; the subtitle words and the ${nWord} icons in ${s.accent}; the bottom band filled solid ${s.bg}. Map the reference's tones onto these colours (if the reference already uses them, keep it essentially unchanged).
3) WORDMARK + SUBTITLE: the giant wordmark must read "${code}" (replace the reference's "AI-200"); the subtitle, on two lines, must read "${subtitle}".${taglineClause}

Keep the giant "${code}" wordmark (same font, weight, size, position) and the light off-white background #F5F6F8 IDENTICAL to the reference. REDRAW the ${nWordUpper} domain icons: keep the SAME row position, size, spacing, flat single-line pictogram style and ${s.accent} colour as the reference, but change each GLYPH so it matches its caption, in this exact order — ${iconRow}. Each icon is a simple, flat, minimal line pictogram with its uppercase caption below, evenly spaced across the row.${iconFitClause}

BOTTOM BAND: same three items, left to right, separated by thin vertical dividers: (1) the MICROSOFT LOGO (its four coloured squares — red, green, blue, yellow) next to the "Microsoft" wordmark, (2) "CloudBooks", (3) "${levelBand}". Recolor ONLY the band BACKGROUND to solid ${s.bg}; keep the Microsoft four-square logo in its OFFICIAL colours, and all wordmarks in white. Preserve the Microsoft logo exactly as in the reference — do NOT omit it. CRITICAL SIZE — the "CloudBooks" wordmark must be just SLIGHTLY smaller than the "Microsoft" wordmark that sits next to the four-square logo: about 95% of the "Microsoft" cap-height (only ~5% smaller). It sits at ALMOST the same size as "Microsoft" — do NOT make it tiny/caption-sized, and do NOT make it bigger, bolder, wider or horizontally STRETCHED than "Microsoft". Same weight and natural letter-spacing as "Microsoft".

Flat 2D vector, crisp and legible, professional. Spell every word EXACTLY as given, correct Spanish, no gibberish, no extra text.`;
}

export async function generateBookCover(force = false, count = 1): Promise<CoverResult> {
  return timeAgent("disenador", "book-cover", () => generateBookCoverInner(force, count));
}
async function generateBookCoverInner(force = false, count = 1): Promise<CoverResult> {
  return generateDesign("cover", coverPrompt, force, count);
}
export async function selectCoverTake(file: string): Promise<CoverResult> {
  const url = await activateTake("cover", file);
  if (!url) return { ok: false, error: "Toma inexistente." };
  const man = readManifest("cover");
  return { ok: true, url, takes: man.takes, active: man.active };
}

// ── CONTRAPORTADA ─────────────────────────────────────────────────────────────
/** Contenido documental de la contraportada del Master (para que image-2 rinda TEXTO propio, no el del Atlas).
 *  AI-200 conserva su copia curada; otras certs derivan un texto genérico parametrizado por su código/título. */
function masterBack(meta: CertMeta): { blurb: string; bullets: string[]; stats: string } {
  if (meta.code === "AI-200") return {
    blurb: `Olvídate de leer documentación suelta. El Master Book teje cada tema del AI-200 en una exposición continua —el porqué, las decisiones de diseño y las trampas— para que llegues al examen razonando, no memorizando. El libro troncal de la colección AI-200, para el examen y para el trabajo.`,
    bullets: [
      "Contenedores, datos vectoriales, mensajería, seguridad y observabilidad en Azure.",
      "El porqué de cada decisión de arquitectura, no solo el cómo.",
      "Las trampas del examen, desactivadas dentro de la exposición.",
      "Puntos clave y glosario para fijar cada capítulo.",
    ],
    stats: "Exposición por módulo · puntos clave · glosario · fiel al temario de Microsoft",
  };
  if (meta.code === "AB-620") return {
    blurb: `Olvídate de leer documentación suelta. El Master Book teje cada tema del AB-620 en una exposición continua —el porqué, las decisiones de diseño y las trampas— para que llegues al examen razonando, no memorizando. El libro troncal de la colección AB-620, para el examen y para el trabajo.`,
    bullets: [
      "Topics, Adaptive Cards, generative answers, agentes multi-agente e integración con sistemas empresariales en Copilot Studio.",
      "El porqué de cada decisión de diseño, no solo el cómo.",
      "Las trampas del examen, desactivadas dentro de la exposición.",
      "Puntos clave y glosario para fijar cada capítulo.",
    ],
    stats: "Exposición por módulo · puntos clave · glosario · fiel al temario de AI Agent Builder Associate",
  };
  return {
    blurb: `Olvídate de leer documentación suelta. El Master Book teje cada tema del ${meta.code} en una exposición continua —el porqué, las decisiones de diseño y las trampas— para que llegues al examen razonando, no memorizando. El libro troncal de la colección ${meta.code}, para el examen y para el trabajo.`,
    bullets: [
      "Exposición continua de todo el temario oficial.",
      "El porqué de cada decisión de diseño, no solo el cómo.",
      "Las trampas del examen, desactivadas dentro de la exposición.",
      "Puntos clave y glosario para fijar cada capítulo.",
    ],
    stats: `Exposición por módulo · puntos clave · glosario · fiel al temario de ${meta.title}`,
  };
}

/** Contenido documental de la contraportada del Visual Atlas ("una skill, una lámina"): es una REFERENCIA VISUAL
 *  —diagramas, repaso rápido— NO la prosa continua del Master. AI-200 conserva copia curada; el resto deriva genérico. */
function atlasBack(meta: CertMeta): { blurb: string; bullets: string[]; stats: string } {
  if (meta.code === "AI-200") return {
    blurb: `Olvídate de los muros de texto. El Visual Atlas convierte cada skill del AI-200 en una lámina —un diagrama que explica el qué, el porqué y las trampas de un vistazo— para que estudies mirando y lo recuerdes. El mapa visual de la certificación AI-200, para repasar rápido y fijar conceptos.`,
    bullets: [
      "Contenedores, datos vectoriales, mensajería, seguridad y observabilidad en Azure — cada tema en su lámina.",
      "El porqué de cada decisión de arquitectura, explicado con diagramas.",
      "Las trampas del examen, señaladas dentro de cada lámina.",
      "Un repaso visual para fijar lo estudiado y llegar listo al examen.",
    ],
    stats: "Una skill por lámina · diagramas · repaso visual · fiel al temario de Microsoft",
  };
  if (meta.code === "AB-620") return {
    blurb: `Olvídate de los muros de texto. El Visual Atlas convierte cada skill del AB-620 en una lámina —un diagrama que explica el qué, el porqué y las trampas de un vistazo— para que estudies mirando y lo recuerdes. El mapa visual de la certificación AB-620, para repasar rápido y fijar conceptos.`,
    bullets: [
      "Topics, Adaptive Cards, generative answers, agentes multi-agente e integración con conectores, REST, Azure AI Search y MCP en Copilot Studio — cada tema en su lámina.",
      "El porqué de cada decisión de diseño, explicado con diagramas.",
      "Las trampas del examen, señaladas dentro de cada lámina.",
      "Un repaso visual para fijar lo estudiado y llegar listo al examen.",
    ],
    stats: "Una skill por lámina · diagramas · repaso visual · fiel al temario de AI Agent Builder Associate",
  };
  return {
    blurb: `Olvídate de los muros de texto. El Visual Atlas convierte cada skill del ${meta.code} en una lámina —un diagrama que explica el qué, el porqué y las trampas de un vistazo— para que estudies mirando y lo recuerdes. El mapa visual de la certificación ${meta.code}, para repasar rápido y fijar conceptos.`,
    bullets: [
      "Todo el temario oficial, tema por tema, cada uno en su lámina.",
      "El porqué de cada decisión de diseño, explicado con diagramas.",
      "Las trampas del examen, señaladas dentro de cada lámina.",
      "Un repaso visual para fijar lo estudiado y llegar listo al examen.",
    ],
    stats: `Una skill por lámina · diagramas · repaso visual · fiel al temario de ${meta.title}`,
  };
}

/** Prompt de contraportada, CONSCIENTE DEL FORMATO: Master y Atlas inyectan su PROPIO texto (masterBack/atlasBack);
 *  otros formatos CONSERVAN el texto de su contraportada de referencia — solo relabel + recolor + CloudBooks compacto. */
function backCoverPrompt(label: string, s: BookStyle, meta: CertMeta): string {
  const code = meta.code;
  const subtitle = code === "AI-200" ? "Desarrollo en Azure de Soluciones de IA" : meta.title;
  const isMaster = CONFIG.format === "master-book";
  const isAtlas = CONFIG.format === "visual-atlas";
  const injectText = isMaster || isAtlas;
  const mb = isAtlas ? atlasBack(meta) : masterBack(meta);
  const bodyBlock = injectText
    ? `3) BODY TEXT: replace the reference's paragraph, bullet list and stats line with EXACTLY this Spanish text (keep the SAME positions and typographic styling as the reference):

BLURB PARAGRAPH (in the rounded panel):
${mb.blurb}

SECTION HEADING: QUÉ VAS A DOMINAR
BULLET LIST (four items, each with a "›" marker):
${mb.bullets.map((b) => `   › ${b}`).join("\n")}

STATS LINE (below the bullets, with a small document icon): ${mb.stats}`
    : `3) BODY TEXT: keep the reference's paragraph, bullet list, stats line and every caption EXACTLY as they appear — reproduce all the wording faithfully. Do NOT change, translate, summarize or invent any text.`;
  return `Back cover of a book, PORTRAIT orientation (2:3), premium editorial design. The reference image is the CANONICAL back-cover template of this book family — reproduce its EXACT layout, structure, proportions, margins, the flowing dotted WAVE/NETWORK artwork in the corners, the rounded blurb panel, the row of FOUR feature icons at the bottom, the ISBN box with its barcode at the bottom-right, and the bottom band. This is a FAITHFUL reproduction of the reference with only the changes below.

Change versus the reference:
1) TOP LABEL: the letter-spaced kicker at the top currently reading "VISUAL ATLAS" must instead read "${label}" (same uppercase, letter-spaced style with thin lines + dots).
2) COLOR PALETTE: the whole cover uses THIS colour scheme — the giant "${code}" wordmark in ${s.accent} (deep, toward ${s.bg}); the wave/network art from ${s.accent} to ${s.accent2}; accents, the four feature icons and section headings in ${s.accent}; the bottom band solid ${s.bg}. Map the reference's tones onto these colours (if the reference already uses them, keep it essentially unchanged).
2b) WORDMARK + SUBTITLE: the giant wordmark must read "${code}" (replace the reference's "AI-200"); the subtitle, on two lines, must read "${subtitle}".
${bodyBlock}

Keep IDENTICAL to the reference: the giant "${code}" wordmark, the FOUR feature icons with their captions ("EXPLICACIONES CLARAS", "MEJORES PRÁCTICAS", "IMPLEMENTACIÓN EFECTIVA", "ALINEADO AL EXAMEN ${code}"), the ISBN box + barcode at the bottom-right, and the bottom band with the "CloudBooks" wordmark. Light off-white background #F5F6F8. CRITICAL SIZE — the "CloudBooks" wordmark in the bottom band must be just SLIGHTLY smaller than the "Microsoft" wordmark next to the four-square logo: about 95% of the "Microsoft" cap-height (only ~5% smaller), NOT tiny/caption-sized, and never bigger, bolder, wider or STRETCHED than "Microsoft". Same weight and natural letter-spacing as "Microsoft".

Flat 2D vector, crisp and perfectly legible. Spell every word EXACTLY as given, correct Spanish, NO gibberish, NO invented text, NO cut words.`;
}

export async function generateBookBackCover(force = false, count = 1): Promise<CoverResult> {
  return timeAgent("disenador", "book-backcover", () => generateBookBackCoverInner(force, count));
}
async function generateBookBackCoverInner(force = false, count = 1): Promise<CoverResult> {
  return generateDesign("back", backCoverPrompt, force, count);
}
export async function selectBackCoverTake(file: string): Promise<CoverResult> {
  const url = await activateTake("back", file);
  if (!url) return { ok: false, error: "Toma inexistente." };
  const man = readManifest("back");
  return { ok: true, url, takes: man.takes, active: man.active };
}

// ── lectura de assets (para la UI de Auto Pages) ──
export function listDesignAssets(): { cover: DesignAsset; back: DesignAsset } {
  return { cover: readManifest("cover"), back: readManifest("back") };
}

// ── BRAND-SOURCE: sembrar la identidad de marca (ancla global) desde otra cert ──
function anchorInfoPath(): string { return path.join(anchorDir(), "anchor.json"); }
export interface DesignAnchor { coverUrl: string | null; backUrl: string | null; source: { certId: string; format: string } | null; setAt: string | null }

export function getDesignAnchor(): DesignAnchor {
  let source: { certId: string; format: string } | null = null, setAt: string | null = null;
  try { const j = JSON.parse(readFileSync(anchorInfoPath(), "utf8")) as { source?: { certId: string; format: string }; setAt?: string }; source = j.source ?? null; setAt = j.setAt ?? null; } catch { /* sin info */ }
  return { coverUrl: anchorPubUrl("cover"), backUrl: anchorPubUrl("back"), source, setAt };
}

/** Copia la portada (y contra si existe) del libro FUENTE al ancla POR-CERT del cert activo → las
 *  próximas generaciones de ESTA cert heredan esa identidad de marca. Registra la fuente en anchor.json. */
export async function setDesignAnchorFromBook(sourceCertId: string, sourceFormat: string): Promise<{ ok: boolean; error?: string; anchor?: DesignAnchor }> {
  const srcCover = path.join(CONFIG.outputRoot, sourceCertId, sourceFormat, "_book", "cover.png");
  if (!existsSync(srcCover)) return { ok: false, error: "La cert/libro fuente no tiene portada generada." };
  await mkdir(anchorDir(), { recursive: true });
  await copyFile(srcCover, atlasCoverPath());
  const srcBack = path.join(CONFIG.outputRoot, sourceCertId, sourceFormat, "_book", "backcover.png");
  if (existsSync(srcBack)) await copyFile(srcBack, atlasBackCoverPath());
  await writeFile(anchorInfoPath(), JSON.stringify({ source: { certId: sourceCertId, format: sourceFormat }, setAt: new Date().toISOString() }, null, 2));
  return { ok: true, anchor: getDesignAnchor() };
}
