import { existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { CONFIG, pageOutputDir, pagePublicBase } from "../config.js";
import { hasOpenAIKey, getOpenAI } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getPersistedChapter, upsertPersistedChapter } from "../chapter-store.js";
import { getImageContract, type ImageContract } from "./image-contract.js";
import { getBookConfig } from "./book-config.js";
import type { GraphicSpec } from "../types.js";

/**
 * GRÁFICO COMPLEMENTARIO del Master Book (Frente D). El agente autor decide dónde un
 * diagrama fija un concepto (GraphicSpec); acá se genera con un CONTRATO DE ARTE PROPIO:
 * diagrama esquemático SOBRIO de un solo concepto, deliberadamente distinto de la infografía
 * densa del Atlas (el peso visual vive en el Atlas). Idempotente por hash del prompt.
 * Reusa generateUpperVisual + el namespacing de assets por cert/format.
 */
/** Prompt de la figura, gobernado por el CONTRATO DE IMÁGENES (estilo/paleta/complejidad). */
function graphicPrompt(g: GraphicSpec, contract: ImageContract, structure: string, accent: string): string {
  return `${contract.figureStyle}
FLAT 2D editorial vector DIAGRAM for a premium study book — a SINGLE, clean, schematic diagram that illustrates ONE concept to COMPLEMENT a narrative text. This is NOT a dense infographic and NOT a poster: it is a sober, minimal supporting diagram.

READABILITY IS THE #1 PRIORITY — the diagram is printed SMALL (about 7 cm / 2.8 inches tall). Every label MUST be comfortably readable at that size, WITHOUT zooming. To guarantee that:
- Use LARGE, bold text. Few words per label (1–4 words). BIG boxes, generous spacing.
- MAXIMUM ${contract.maxElements} labeled elements TOTAL. If the idea has more parts, DISTILL to the essential core and DROP the rest.
- ABSOLUTELY NO parameter tables, NO bullet lists inside boxes, NO multi-row "config" panels, NO tiny sub-labels. A box holds ONE short label, nothing else.
- If ${g.spec} contains many details (parameters, sub-points, comparisons of several attributes), DO NOT try to show them all — pick the ONE key relationship and show only that, large and clear.
- If the concept is a COMPARISON of several options, render it as AT MOST 3–4 large side-by-side CARDS (one option per card): each card shows its NAME in big bold text plus AT MOST one short 2–4 word qualifier line. NEVER a grid/table of attributes, NEVER rows of parameters, NEVER a matrix. Big cards, big text, lots of whitespace.

STRICT STYLE: FLAT 2D vector only. NO photographs, NO 3D, NO isometric, NO bevels, NO glossy/shiny fills, NO drop shadows, NO glow, NO gradients, NO textures, NO background scene. Pure white #FFFFFF background. Generous whitespace; airy, uncluttered.

PALETTE: deep ${structure} for structure, boxes and text; ONE accent ${accent} for emphasis/arrows; light grey #E6EAF0 for secondary fills. Clean lines (~2px), rounded rectangles (8px radius), clear straight arrows.

LABELS: clean humanist SANS-SERIF (Segoe UI / Frutiger look), in SPANISH, perfectly legible, correct spelling, NO gibberish. An optional SHORT title at the top, bold.

DIAGRAM TYPE: ${g.kind}. Distil this to its single core idea and show ONLY that, big and clear: ${g.spec}

Composition reading left-to-right or top-to-bottom, symmetric and calm. Think "one glance, instantly understood" — a few large elements, not many small ones.`;
}

export interface ChapterGraphicResult { ok: boolean; chapterId: string; graphicId: string; url?: string; reused?: boolean; costUsd?: number; error?: string }

// Marcadores de la "trampa" tabla/matriz densa en un spec de figura (queda ilegible a ~7 cm de impresión).
const FIGURE_SPEC_TRAP = /\btabla\b|\bmatriz\b|\d+\s*[x×]\s*\d+|\bcolumnas?\b|\bfilas?\b|comparaci[oó]n de|\bejes\s*:|\batributos\b/i;

/**
 * GUARD determinista de specs de figura (Fase 0.B): tras (re)autorar un capítulo, reescribe los specs que piden una
 * TABLA/MATRIZ densa a formato TARJETAS/pasos grandes (legible), preservando el concepto pero sin lenguaje de tabla.
 * Complementa la cláusula comparación→tarjetas de `graphicPrompt`. Correr ANTES de `generateChapterGraphics`.
 * Devuelve cuántos specs reescribió.
 */
export function auditFigureSpecs(chapterId: string): number {
  const ch = getPersistedChapter(chapterId);
  if (!ch?.seed.graphics?.length) return 0;
  let changed = 0;
  for (const g of ch.seed.graphics) {
    if (!g.spec || !FIGURE_SPEC_TRAP.test(g.spec)) continue;
    if (/^Representá esto como MÁXIMO/.test(g.spec)) continue;   // idempotente: ya destilado a tarjetas → NO re-manglar (el template contiene palabras-trampa a propósito)
    const concept = g.spec.replace(/tabla(\s+visual|\s+comparativa)?|matriz/gi, "comparación").trim();
    g.spec = `Representá esto como MÁXIMO 4 TARJETAS grandes lado a lado (o ≤5 pasos si es un flujo), UNA idea por tarjeta: nombre en grande (1-4 palabras) + UNA línea corta. PROHIBIDO: tabla, matriz, grilla de atributos, filas/columnas, ejes, texto chico. Concepto a mostrar: ${concept}`;
    changed++;
  }
  if (changed) upsertPersistedChapter(ch);
  return changed;
}

/** Genera (o reusa) UN gráfico complementario y lo aplica a chapter.graphics[i].imageUrl. */
export async function generateChapterGraphic(chapterId: string, graphicId: string, force = false): Promise<ChapterGraphicResult> {
  if (!hasOpenAIKey() || !getOpenAI()) return { ok: false, chapterId, graphicId, error: "Sin llave/cliente OpenAI." };
  if (wouldExceedCap(CONFIG.infographicCostUsd)) return { ok: false, chapterId, graphicId, error: "Tope de costo mensual alcanzado." };
  return withLock(`chapter-graphic:${chapterId}:${graphicId}`, async (): Promise<ChapterGraphicResult> => {
    const ch = getPersistedChapter(chapterId);
    if (!ch) return { ok: false, chapterId, graphicId, error: "Capítulo no encontrado." };
    const g = ch.seed.graphics.find((x) => x.id === graphicId);
    if (!g) return { ok: false, chapterId, graphicId, error: "Gráfico no encontrado." };

    const dir = pageOutputDir(chapterId);
    const file = path.join(dir, `graphic-${graphicId}.png`);
    const manifest = path.join(dir, `graphic-${graphicId}.json`);
    const url = `${pagePublicBase(chapterId)}/graphic-${graphicId}.png`;
    const contract = getImageContract();
    // Paleta desde el contrato: "cover" = colores de la tapa (BookConfig.style); "fixed" = navy/azul de marca.
    const style = getBookConfig().style;
    const structure = contract.paletteSource === "cover" ? (style.text || "#021C38") : "#021C38";
    const accent = contract.paletteSource === "cover" ? (style.accent || "#2563EB") : "#2563EB";
    const prompt = graphicPrompt(g, contract, structure, accent);
    const hash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 16);

    const applyUrl = (): void => {
      const fresh = getPersistedChapter(chapterId);
      if (!fresh) return;
      const j = fresh.seed.graphics.findIndex((x) => x.id === graphicId);
      if (j >= 0 && fresh.seed.graphics[j]!.imageUrl !== url) { fresh.seed.graphics[j]!.imageUrl = url; upsertPersistedChapter(fresh); }
    };

    // REUSE-SI-EXISTE (pedido del usuario): con force=false, si la figura ya está en disco, se REUSA — sin re-chequear el
    // hash del prompt. Así "Continuar/tomar las que tengo" conserva las figuras; un cambio de prompt NO las regenera (solo force=true).
    if (!force && existsSync(file) && existsSync(manifest)) {
      applyUrl(); return { ok: true, chapterId, graphicId, url, reused: true };
    }

    const r = await generateUpperVisual(prompt, { size: contract.figureSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd });
    if (r.outcome !== "real" || !r.buffer) return { ok: false, chapterId, graphicId, error: r.error ?? r.outcome, costUsd: r.costUsd };
    await mkdir(dir, { recursive: true });
    await writeFile(file, r.buffer);
    await writeFile(manifest, JSON.stringify({ hash, generatedAt: new Date().toISOString(), kind: g.kind }, null, 2));
    applyUrl();
    return { ok: true, chapterId, graphicId, url, reused: false, costUsd: r.costUsd };
  });
}

/** Genera los gráficos del capítulo, topados por el contrato (maxFiguresPerChapter, parquedad). Cronometrado como el Ilustrador. */
export async function generateChapterGraphics(chapterId: string, force = false): Promise<ChapterGraphicResult[]> {
  return timeAgent("ilustrador", "chapter-graphics", () => generateChapterGraphicsInner(chapterId, force), { moduleId: chapterId });
}
async function generateChapterGraphicsInner(chapterId: string, force = false): Promise<ChapterGraphicResult[]> {
  auditFigureSpecs(chapterId);   // Fase 0.B: destilar specs-trampa (tabla densa → tarjetas grandes) ANTES de generar.
  const ch = getPersistedChapter(chapterId);
  if (!ch) return [{ ok: false, chapterId, graphicId: "", error: "Capítulo no encontrado." }];
  const maxFigs = Math.max(0, getImageContract().maxFiguresPerChapter);
  const out: ChapterGraphicResult[] = [];
  for (const g of ch.seed.graphics.slice(0, maxFigs)) {
    if (wouldExceedCap(CONFIG.infographicCostUsd)) { out.push({ ok: false, chapterId, graphicId: g.id, error: "Tope de costo alcanzado." }); break; }
    out.push(await generateChapterGraphic(chapterId, g.id, force));
  }
  return out;
}
