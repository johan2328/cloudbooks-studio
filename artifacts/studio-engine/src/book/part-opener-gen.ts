import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { CONFIG, domainOutputDir, domainPublicBase } from "../config.js";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { listPersistedChapters } from "../chapter-store.js";
import { getBrandContract } from "./brand-contract.js";
import { certMetaByEngineId } from "../certifications.js";
import { notePromptBlock } from "./design-notes.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { isCapstoneSeed, chapterHeading } from "./chapter-heading.js";

/**
 * ABRE-PARTE del Master Book (estructura híbrida: 9 PARTES por ruta, cada una con sus
 * capítulos-módulo). Concepto "PORTAL OSCURO": página full-bleed NAVY OSCURO —lo opuesto
 * al divisor de capítulo (claro)— con número de parte gigante, título de ruta, UN gancho
 * corto y la lista "EN ESTA PARTE" (abreboca de los capítulos). Poderoso, poco texto.
 * Anclado a la 1ª parte (master) para arte consistente. Idempotente por hash.
 */
const ROUTE_MASTER = "p1";
function partFile(domainId: string): string { return path.join(domainOutputDir(domainId), "part-opener.png"); }
function partUrl(domainId: string): string { return `${domainPublicBase(domainId)}/part-opener.png`; }
/** URL del abre-parte si ya existe en disco (para el preview de Auto Pages), o null. */
export function partOpenerUrlIfExists(domainId: string): string | null { return existsSync(partFile(domainId)) ? partUrl(domainId) : null; }
function partManifest(domainId: string): string { return path.join(domainOutputDir(domainId), "part-opener.json"); }
function routeNum(id: string): number { return Number(id.slice(1)); }
function routeTitle(id: string): string {
  const d = getOutline().domains.find((x) => x.id === id);
  return (d?.label ?? id).replace(/^Ruta \d+\s*[—–-]\s*/, "").trim() || (d?.label ?? id);
}
/** Capítulos (módulos) del Master Book que caen en esta ruta, en orden. El capstone va con su label
 *  "Proyecto integrador · …" (des-duplicado, vía chapterHeading) y flag para marcarlo distinto en la lista. */
function chaptersInRoute(domainId: string): { num: string; title: string; isCapstone: boolean }[] {
  return listPersistedChapters().filter((c) => c.seed.domainId === domainId).map((c) => {
    const cap = isCapstoneSeed(c.seed);
    return { num: cap ? "" : c.seed.chapterNumber, title: cap ? chapterHeading(c.seed).tocLabel : c.seed.title, isCapstone: cap };
  });
}

async function synthHook(domainId: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) return "";
  const chs = chaptersInRoute(domainId).map((c) => c.title).join("; ");
  const code = certMetaByEngineId(CONFIG.certId).code;
  // El trato de USTED del gancho DERIVA del contrato editorial (misma regla que el cuerpo): la tapa
  // es la primera página que ve el lector, no puede tutear ("Domina") mientras el libro trata de usted.
  const user = `Ruta del examen ${code}: "${routeTitle(domainId)}". Capítulos: ${chs}\n\nEscriba UN gancho de UNA sola frase (máx 14 palabras), potente y directo, para el abre-parte de esta ruta: qué logra el lector en esta parte. Español neutro. TRATO DE USTED o forma NOMINAL: imperativo de usted ("Domine", "Despliegue", "Publique", "Configure") o una frase sustantiva ("Alojamiento de contenedores de punta a punta"). PROHIBIDO el imperativo en TÚ ("Domina/Usa/Aprende/Despliega/Crea/Configura") y el voseo. Sin punto final. Devuelva SOLO la frase.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Es redactor editorial. Devuelve SOLO la frase pedida, en trato de usted o forma nominal, NUNCA en tú ni voseo." }, { role: "user", content: user }], ...chatModelParams(CONFIG.authorModel, 60, 0.6) });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "part-opener-hook", pageId: domainId });
    return (res.choices[0]?.message?.content ?? "").trim().replace(/^["'\s]+|["'\s.]+$/g, "");
  } catch { return ""; }
}

function partPrompt(n: number, title: string, hook: string, chapters: { num: string; title: string; isCapstone: boolean }[], anchored: boolean, accent: string, accent2: string, bg: string): string {
  const ref = anchored ? `MATCH THE REFERENCE IMAGE EXACTLY — it is the CANONICAL master for this PART-opener. Reproduce its dark layout, proportions, the giant number and the glow art placement IDENTICALLY. Only the part number, route title, hook and chapter list differ.\n\n` : "";
  // El capstone va SIN número (su título ya es "Proyecto integrador · …") → se distingue del resto sin marca extra.
  const chapterLines = chapters.map((c) => c.num ? `${c.num} · ${c.title}` : c.title).join("\n");
  return ref + `FIXED PART-OPENER LAYOUT CONTRACT — the most DRAMATIC page of a premium documentary study book: a PART divider. Vertical portrait (2:3), full-bleed. FLAT 2D editorial vector only — NO photographs, NO 3D, NO bevels, NO glossy, NO textures.

CANVAS — background is ALWAYS a deep, dark ${bg}, full-bleed edge to edge (dramatic, high-contrast). ALL text is light (white / light-blue) on this dark field. Keep a clean even outer margin ~8%.

BACKGROUND ART — a GLOWING flowing WAVE / NETWORK field: fine thin luminous lines (~1px) and small glowing dots forming 2-3 overlapping smooth horizontal sine-wave bands, in ${accent2} and the accent ${accent}, softly GLOWING on the dark background (subtle bloom). PLACEMENT: a wide band across the UPPER area (behind/around the number) + a faint echo along the bottom ~12%. Luminous, elegant, airy — it frames the page.

EXACT LAYOUT, top → bottom (left-aligned):
1) "RUTA" in the accent ${accent}, uppercase, semibold, small, wide letter-spacing. DIRECTLY BELOW: a GIANT number "${n}" in WHITE, extra-bold (900), enormous (cap-height ~22% of page height) — the number DOMINATES the top third.
2) ROUTE TITLE — clear gap below the number. "${title}" in WHITE, clean humanist SANS-SERIF, extra-bold (800), large (~7% of page height per line), tight leading, MAX 2 lines.
3) RULE — a 2px horizontal line in the accent ${accent}, ~26% of content width, left-aligned.
4) HOOK — ONE single short line: "${hook}". Light-blue #BAE6FD, regular, medium size, a single punchy sentence — NOT a paragraph, NO wrap beyond 2 lines.
5) "EN ESTA RUTA" — small label in the accent ${accent}, uppercase, wide letter-spacing, placed a MODERATE gap DIRECTLY below the hook (NOT a large gap). BELOW it, a short LIST, each line "NN · Título" in light grey #CBD5E1, clean sans, small, one per line, COMFORTABLE (not huge) line spacing. The LAST line may read "Proyecto integrador · …" with NO number — that is the route's capstone; render it the SAME size as the other lines (do NOT skip it, do NOT add a star or bullet). The label + list sit TOGETHER in the UPPER-MIDDLE of the page, close to the hook; do NOT push the list toward the bottom — keep the LOWER THIRD of the page as clean, empty dark space.
6) FOOTER — keep only a clean ~8% bottom margin. NO brand, NO logo, NO cert code, NO URL, NO page number. Only a faint wave echo along the very bottom.

Powerful, dark, editorial, luminous. Perfect Spanish spelling, no gibberish, no cut words. Render EXACTLY this text and NOTHING ELSE, in Spanish, on the dark navy:
RUTA ${n}
${title}
${hook}
EN ESTA RUTA
${chapterLines}`;
}

export interface PartOpenerResult { ok: boolean; domainId: string; url?: string; reused?: boolean; anchored?: boolean; costUsd?: number; error?: string }

export async function generatePartOpener(domainId: string, force = false): Promise<PartOpenerResult> {
  return timeAgent("disenador", "part-opener", () => generatePartOpenerInner(domainId, force), { routeId: domainId, runContext: "route" });
}
async function generatePartOpenerInner(domainId: string, force = false): Promise<PartOpenerResult> {
  if (!/^p[1-9]$/.test(domainId)) return { ok: false, domainId, error: "domainId inválido (p1..p9)." };
  if (!hasOpenAIKey() || !getOpenAI()) return { ok: false, domainId, error: "Sin llave/cliente OpenAI." };
  if (wouldExceedCap(CONFIG.infographicCostUsd)) return { ok: false, domainId, error: "Tope de costo mensual alcanzado." };
  return withLock(`part-opener:${domainId}`, async (): Promise<PartOpenerResult> => {
    const chapters = chaptersInRoute(domainId);
    if (chapters.length === 0) return { ok: false, domainId, error: "La ruta no tiene capítulos en el Master Book todavía." };
    const isMaster = domainId === ROUTE_MASTER;
    const anchorPath = partFile(ROUTE_MASTER);
    const anchored = !isMaster && existsSync(anchorPath);
    const refBuf = anchored ? readFileSync(anchorPath) : null;
    const hook = await synthHook(domainId);
    // Identidad de marca CONGELADA por el contrato (no style.accent → sin drift).
    const bc = getBrandContract();
    const accent = bc.partAccentHex, accent2 = bc.partAccent2Hex, bg = bc.partBgHex;
    const prompt = partPrompt(routeNum(domainId), routeTitle(domainId), hook, chapters, anchored, accent, accent2, bg) + notePromptBlock(`route:${domainId}`);
    const hash = crypto.createHash("sha256").update(prompt + (anchored ? "|anchor" : "|master")).digest("hex").slice(0, 16);

    if (!force && existsSync(partFile(domainId)) && existsSync(partManifest(domainId))) {
      try { const prev = JSON.parse(readFileSync(partManifest(domainId), "utf8")) as { hash?: string }; if (prev.hash === hash) return { ok: true, domainId, url: partUrl(domainId), reused: true, anchored }; } catch { /* regenerar */ }
    }
    const r = await generateUpperVisual(prompt, { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, refImages: refBuf ? [refBuf] : undefined, label: "part-opener", pageId: domainId });
    if (r.outcome !== "real" || !r.buffer) return { ok: false, domainId, error: r.error ?? r.outcome, costUsd: r.costUsd };
    const dir = domainOutputDir(domainId);
    await mkdir(dir, { recursive: true });
    await writeFile(partFile(domainId), r.buffer);
    await writeFile(partManifest(domainId), JSON.stringify({ hash, generatedAt: new Date().toISOString(), anchored, hook }, null, 2));
    return { ok: true, domainId, url: partUrl(domainId), reused: false, anchored, costUsd: r.costUsd };
  });
}

/** Genera los abre-partes de todas las rutas que tienen capítulos (master primero, resto anclado). */
export async function runPartOpenerBatch(force = false): Promise<{ ok: boolean; results: PartOpenerResult[] }> {
  const routes = [...new Set(listPersistedChapters().map((c) => c.seed.domainId))];
  const ordered = [ROUTE_MASTER, ...routes.filter((id) => id !== ROUTE_MASTER)].filter((id) => routes.includes(id));
  const results: PartOpenerResult[] = [];
  for (const id of ordered) {
    if (wouldExceedCap(CONFIG.infographicCostUsd)) { results.push({ ok: false, domainId: id, error: "Tope de costo alcanzado." }); break; }
    results.push(await generatePartOpener(id, force));
  }
  return { ok: results.every((r) => r.ok), results };
}
