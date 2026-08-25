import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { CONFIG } from "../config.js";
import { getBookConfig, saveBookConfig, type BookConfig } from "./book-config.js";
import { certMetaByEngineId } from "../certifications.js";
import { notePromptBlock } from "./design-notes.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { getOutline, modulesForDomain } from "../skills/ai-200-outline.js";
import { listPersistedPages } from "../page-store.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";

/**
 * DIVISORES DE RUTA (imagen de marca, gpt-image). Reemplaza el flujo manual "diseñá afuera + subí".
 * MASTER canónico: su divisor se genera desde la portada; las otras 8 se generan ANCLADAS a la master
 * (se le pasa como refImage) → layout/arte/espaciado idénticos. Reproducible por manifest (hash del prompt+ancla).
 */
export const DIVIDER_MASTER = "p3";
const ACCENTS: Record<string, string> = { p1: "#2563EB", p2: "#7C3AED", p3: "#0E8A6E", p4: "#C2680C", p5: "#0EA5A5", p6: "#4F46E5", p7: "#DB2777", p8: "#0891B2", p9: "#B45309" };

/** Colores del divisor POR LIBRO: AI-200 conserva su navy exacto (caja/título #021C38, wave azul, ACCENTS por-ruta);
 *  el resto deriva del palette del libro (AB-620 = vino) → caja/título = style.bg, acento = style.accent, wave = style.accent2. */
function dividerTheme(id: string): { accent: string; ink: string; wave: string } {
  if (CONFIG.certId === "ai-200") return { accent: ACCENTS[id] ?? "#2563EB", ink: "#021C38", wave: "#C8D9E8" };
  const s = getBookConfig().style;
  return { accent: s.accent, ink: s.bg, wave: s.accent2 };
}

// Divisores de ruta POR-LIBRO ({certId}/{format}/_book) → cert B no pisa los de cert A.
function bookDir(): string { return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_book"); }
function dividerFile(id: string): string { return path.join(bookDir(), `route-intro-${id}.png`); }
function dividerUrl(id: string): string { return `${CONFIG.publicAssetsBase}/${CONFIG.certId}/${CONFIG.format}/_book/route-intro-${id}.png`; }
function manifestFile(id: string): string { return path.join(bookDir(), `route-intro-${id}.divider.json`); }
// Ancla-master del divisor = la portada de marca POR-CERT (fallback a la global legada).
function coverFile(): string {
  const perCert = path.join(CONFIG.outputRoot, CONFIG.certId, "_book", "cover.png");
  return existsSync(perCert) ? perCert : path.join(CONFIG.outputRoot, "_book", "cover.png");
}
function routeNum(id: string): number { return Number(id.slice(1)); }
function routeTitle(id: string): string {
  const d = getOutline().domains.find((x) => x.id === id);
  return (d?.label ?? id).replace(/^Ruta \d+\s*[—–-]\s*/, "").trim() || (d?.label ?? id);
}
function routeCtx(id: string): string {
  const d = getOutline().domains.find((x) => x.id === id);
  const sids = new Set((d?.skills ?? []).map((s) => s.id));
  const units = listPersistedPages().filter((p) => (p.seed.skillIds ?? []).some((sid) => sids.has(sid))).map((p) => p.seed.title).slice(0, 12);
  const mods = modulesForDomain(id).map((m) => m.moduleTitle);
  return `Módulos: ${mods.join(" · ")}\nUnidades: ${units.join("; ")}`;
}

async function synth(id: string): Promise<{ p1: string; p2: string; p3: string }> {
  const openai = getOpenAI()!;
  const d = getOutline().domains.find((x) => x.id === id);
  const code = certMetaByEngineId(CONFIG.certId).code;
  const user = `${d?.label ?? id}\n${routeCtx(id)}\n\nRedactá la introducción de esta ruta para la PÁGINA DE APERTURA del capítulo. EXACTAMENTE 3 párrafos, cada uno de 5 a 7 líneas (unas 55-75 palabras c/u), en español neutro de LATAM SIN voseo. P1: de qué trata la ruta y por qué importa en el examen ${code}. P2: los temas/módulos que abarca y en qué orden conviene recorrerla. P3: qué va a poder hacer el lector al terminarla. Cálido y orientador, sin tecnicismos de más. Devolvé SOLO JSON {"p1":"...","p2":"...","p3":"..."}.`;
  const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Sos editor técnico. Español neutro, sin voseo. Devolvés SOLO JSON válido." }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.5, max_tokens: 1300 });
  recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "route-divider-text", pageId: id });
  const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, string>;
  return { p1: String(raw.p1 ?? ""), p2: String(raw.p2 ?? ""), p3: String(raw.p3 ?? "") };
}

function dividerPrompt(n: number, title: string, theme: { accent: string; ink: string; wave: string }, p: { p1: string; p2: string; p3: string }, anchored: boolean): string {
  const { accent, ink, wave } = theme;   // paleta POR LIBRO (AI-200 navy / AB-620 vino)
  const code = certMetaByEngineId(CONFIG.certId).code;   // E3: footer parametrizado por cert
  const ref = anchored ? `MATCH THE REFERENCE IMAGE EXACTLY — it is the CANONICAL master for this chapter-divider. Reproduce its layout, proportions, margins, the route-number box, the title position, the EXACT inter-paragraph spacing and leading, the wave-art placement (upper-right band + bottom horizon) and the footer position the SAME as the reference. The ONLY things that differ from the reference are: the route number, the title text, the accent color, and the three paragraphs. Keep everything else identical to the reference.\n\n` : "";
  return ref + `FIXED CHAPTER-DIVIDER LAYOUT CONTRACT — this is the FIXED art direction for a route-opener page; render it EXACTLY, IDENTICAL on every route. The ONLY things that change between routes are: the accent color, the route number, the title text and the three paragraphs. Everything else (positions, proportions, sizes, fonts, colors, the art) is FIXED. Vertical portrait page (2:3), full-bleed. FLAT 2D editorial vector only — NO photographs, NO 3D, NO bevels, NO glossy/shiny fills, NO drop shadows, NO glow, NO textures, NO heavy gradients.

CANVAS — the page background is ALWAYS a single flat near-white #F5F5F5; NEVER navy, NEVER dark, NEVER tinted. Keep a FIXED even outer margin of about 8% of the page width on all four sides. The title block and the three paragraphs ALWAYS sit on clean near-white space; the background art NEVER sits behind the paragraph text and never lowers its contrast.

BACKGROUND ART (FIXED brand motif, identical placement on every page) — an elegant FLOWING WAVE / NETWORK field: many FINE thin lines (about 1px) and small dots forming 2–3 overlapping smooth horizontal sine-wave bands, like a delicate topographic / sound-wave / network diagram. Colors: soft ${wave} with a few strands in the route accent ${accent}; flat, pale, airy (never bold or saturated). PLACEMENT (fixed): (a) a wide band of these waves fills the UPPER-RIGHT area — to the right of the route-number box and spanning across above the title; (b) a single, fainter echo of the same waves runs along the BOTTOM ~12% of the page as a calm horizon. Airy and uncluttered — it frames the page, it does not fill it.

EXACT LAYOUT, top → bottom (all left-aligned to the left margin except the body, which is justified):
1) ROUTE NUMBER BLOCK (top-left, at the top margin): the word "RUTA" in the accent ${accent}, uppercase, semibold, small (~3.5% of page height), with wide letter-spacing; DIRECTLY BELOW it a ROUNDED-SQUARE box (~17% of page width, square, 12px corner radius) filled solid ${ink}, with the route number "${n}" centered inside in WHITE, extra-bold, large (cap-height ~70% of the box). The wave art begins just to the RIGHT of this box.
2) TITLE — with a clear gap below the number block. Text: "${title}". Font: clean HUMANIST SANS-SERIF (Segoe UI / Frutiger look), EXTRA-BOLD (weight 800), ${ink}, tight line-height (~1.05), size large (~8% of page height per line), left-aligned, MAXIMUM 3 lines, breathing space above and below. SANS-SERIF only — NEVER a serif.
3) RULE — about 0.05in below the title: ONE single horizontal line, 2px thick, in the accent ${accent}, length ~30% of the content width, left-aligned. Nothing else on this line.
4) BODY — a clear gap below the rule. EXACTLY THREE paragraphs of running prose, in the SAME clean HUMANIST SANS-SERIF, REGULAR weight (400), dark slate #2A3340, all the SAME size (~2.2% of page height), line-height ~1.6, spanning the FULL content width between the margins. FULLY JUSTIFIED: every line flush to BOTH left and right margins so both side edges form a clean straight vertical block (only the last line may be short). A FIXED clear vertical gap between paragraphs. Each paragraph 5–7 lines. NO bullets, NO icons, NO pull-quotes. PERFECTLY legible, correct Spanish spelling, no gibberish, no cut or mis-hyphenated words.
5) FOOTER — leave the footer area COMPLETELY EMPTY: NO text at all (no code, no brand, no "CloudBooks", no logo, no page number, no URL). Just clean near-white space with only the faint wave echo along the very bottom.

STRICT CONSISTENCY — IDENTICAL on every route divider: near-white #F5F5F5 background; 8% outer margins; flowing-wave art in the SAME upper-right band + same bottom horizon; the "RUTA" label + navy rounded-square number box at the SAME size and top-left position; the SANS title at the SAME weight/color/size, left-aligned, max 3 lines; the 2px accent rule at the SAME length/position; the justified 3-paragraph SANS body at the SAME size/leading/gap; an EMPTY footer area (NO text). Only the accent, route number, title and three paragraphs differ. Calm, balanced, fresh, premium.

Render EXACTLY this text, in Spanish (the three paragraphs FULLY JUSTIFIED, NO icons beside them):
RUTA ${n}
${title}
${p.p1}

${p.p2}

${p.p3}`;
}

export interface DividerGenResult { ok: boolean; domainId: string; url?: string; reused?: boolean; anchored?: boolean; attempts?: number; costUsd?: number; error?: string }

/** Genera (o reusa) el divisor de UNA ruta y lo aplica a routeIntros[id].imageUrl. */
export async function generateRouteDivider(domainId: string, force = false): Promise<DividerGenResult> {
  return timeAgent("disenador", "route-divider", () => generateRouteDividerInner(domainId, force), { routeId: domainId, runContext: "route" });
}
async function generateRouteDividerInner(domainId: string, force = false): Promise<DividerGenResult> {
  if (!/^p[1-9]$/.test(domainId)) return { ok: false, domainId, error: "domainId inválido (p1..p9)." };
  if (!hasOpenAIKey() || !getOpenAI()) return { ok: false, domainId, error: "Sin llave/cliente OpenAI." };
  if (wouldExceedCap(CONFIG.infographicCostUsd)) return { ok: false, domainId, error: "Tope de costo mensual alcanzado." };
  return withLock(`route-divider:${domainId}`, async () => {
    const cfg = getBookConfig();
    const isMaster = domainId === DIVIDER_MASTER;
    const anchorPath = dividerFile(DIVIDER_MASTER);
    const anchored = !isMaster && existsSync(anchorPath);
    const refBuf = anchored ? readFileSync(anchorPath) : (existsSync(coverFile()) ? readFileSync(coverFile()) : null);
    const theme = dividerTheme(domainId);
    const title = routeTitle(domainId);
    const p = await synth(domainId);
    const prompt = dividerPrompt(routeNum(domainId), title, theme, p, anchored) + notePromptBlock(`route:${domainId}`);
    const hash = crypto.createHash("sha256").update(prompt + (anchored ? "|anchor:master" : "|cover")).digest("hex").slice(0, 16);
    if (!force && existsSync(dividerFile(domainId)) && existsSync(manifestFile(domainId))) {
      try { const prev = JSON.parse(readFileSync(manifestFile(domainId), "utf8")) as { hash?: string }; if (prev.hash === hash) return { ok: true, domainId, url: dividerUrl(domainId), reused: true, anchored }; } catch { /* regenerar */ }
    }
    const r = await generateUpperVisual(prompt, { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, refImages: refBuf ? [refBuf] : undefined, label: "route-divider", pageId: domainId });
    if (r.outcome !== "real" || !r.buffer) return { ok: false, domainId, error: r.error ?? r.outcome, attempts: r.attempts, costUsd: r.costUsd };
    await mkdir(bookDir(), { recursive: true });
    await writeFile(dividerFile(domainId), r.buffer);
    await writeFile(manifestFile(domainId), JSON.stringify({ hash, generatedAt: new Date().toISOString(), anchored, accent: theme.accent, title }, null, 2));
    const prevText = cfg.routeIntros?.[domainId]?.text ?? "";
    await saveBookConfig({ routeIntros: { [domainId]: { imageUrl: dividerUrl(domainId), text: prevText } } } as Partial<BookConfig>);
    return { ok: true, domainId, url: dividerUrl(domainId), reused: false, anchored, attempts: r.attempts, costUsd: r.costUsd };
  });
}

/** Genera los 9 divisores: la MASTER primero (para que exista el ancla) y luego las otras 8 ancladas. */
export async function runRouteDividerBatch(force = false): Promise<{ ok: boolean; master: string; results: DividerGenResult[] }> {
  const ids = getOutline().domains.map((d) => d.id).filter((id) => /^p[1-9]$/.test(id));
  const ordered = [DIVIDER_MASTER, ...ids.filter((id) => id !== DIVIDER_MASTER)];
  const results: DividerGenResult[] = [];
  for (const id of ordered) {
    if (wouldExceedCap(CONFIG.infographicCostUsd)) { results.push({ ok: false, domainId: id, error: "Tope de costo alcanzado." }); break; }
    results.push(await generateRouteDivider(id, force));
  }
  return { ok: results.every((r) => r.ok), master: DIVIDER_MASTER, results };
}
