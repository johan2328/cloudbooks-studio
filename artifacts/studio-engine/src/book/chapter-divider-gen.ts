import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { CONFIG, pageOutputDir, pagePublicBase } from "../config.js";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getPersistedChapter, upsertPersistedChapter, listPersistedChapters } from "../chapter-store.js";
import { getBrandContract, type BrandContract } from "./brand-contract.js";
import { getEditorialContract } from "./editorial-contract.js";
import { certMetaByEngineId } from "../certifications.js";
import { notePromptBlock } from "./design-notes.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { chapterHeading, isCapstoneSeed, type ChapterHeading } from "./chapter-heading.js";
import type { ChapterSeed } from "../types.js";

/**
 * DIVISOR DE CAPÍTULO del Master Book = la PRIMERA página del capítulo, generada como
 * IMAGEN full-bleed con el MISMO lenguaje visual que los divisores de ruta del Atlas
 * ("como el libro de atlas"). Lleva "CAPÍTULO N" + el título + 3 párrafos que resumen
 * (la sección introductoria, legible sobre el arte). Anclado al 1er divisor (master)
 * para consistencia. Idempotente por hash del prompt+ancla.
 */
function dividerFile(chapterId: string): string { return path.join(pageOutputDir(chapterId), "divider.png"); }
function dividerUrl(chapterId: string): string { return `${pagePublicBase(chapterId)}/divider.png`; }
/** URL del divisor de capítulo si ya existe en disco (para el preview de Auto Pages), o null. */
export function chapterDividerUrlIfExists(chapterId: string): string | null { return existsSync(dividerFile(chapterId)) ? dividerUrl(chapterId) : null; }
function manifestFile(chapterId: string): string { return path.join(pageOutputDir(chapterId), "divider.json"); }

/** El 1er capítulo persistido es el MASTER (su divisor ancla a los demás → arte idéntico). */
function masterChapterId(): string | null {
  const first = listPersistedChapters()[0];
  return first?.seed.chapterId ?? null;
}

/** 4-5 párrafos CORTOS, instruccionales y ligeros, para la página de apertura del capítulo (la portadilla). */
async function synth(c: ChapterSeed): Promise<string[]> {
  const openai = getOpenAI()!;
  const headings = c.sections.map((s) => s.heading).join(" · ");
  const code = certMetaByEngineId(CONFIG.certId).code;
  const ed = getEditorialContract();
  const user = `Capítulo: ${c.title} (${c.domainLabel}).\nSecciones: ${headings}\nRazonamiento del examen: ${c.psychometrics.reasoningGoal}\n\nRedacte la INTRODUCCIÓN de este capítulo para su PÁGINA DE APERTURA: EXACTAMENTE 4 párrafos CORTOS, cada uno de 3 a 4 líneas (~35-48 palabras) — deben ENTRAR CON AIRE en la página de apertura (no la llenen hasta el borde). TONO INSTRUCCIONAL y LIGERO: el intro MOTIVA y ORIENTA al estudiante; la profundidad técnica (servicios, comandos, SKUs, flags) vive en el CUERPO del capítulo, NO acá. Entre los párrafos debe quedar, SIN orden fijo ni fórmula: por qué IMPORTA el tema (lo que está EN JUEGO, el error que se evita, la decisión que enfrentará en el examen ${code} y en el trabajo real), un mapa BREVE del recorrido del capítulo en prosa (NO la lista de títulos), y qué podrá DECIDIR/HACER el lector al terminar.\nAPERTURA (crítica): ABRA por lo que está EN JUEGO para el lector, en lenguaje llano y humano; la PRIMERA palabra del primer párrafo es una PALABRA COMÚN con MAYÚSCULA inicial (un gancho), NUNCA un identificador en minúscula ("myregistry", "acr") ni un comando. MOLDE PROHIBIDO: NO abra con "Este capítulo…" ni "En este capítulo…"; VARÍE la apertura para que no suene a plantilla.\nANTI-PLANTILLA (obligatorio): (a) NO enumere los TÍTULOS de las secciones dentro de la prosa; (b) SIN mayúscula a mitad de frase; (c) NO arranque varias oraciones con "Usted" (máx 1 por párrafo; varíe el sujeto); (d) los párrafos aportan información DISTINTA (no reformule la misma idea); (e) NO incluya comandos CLI con flags en el intro (nada de "az webapp create --name … --plan …"): mencione la ACCIÓN en prosa ("crear la Web App con la CLI"); el intro NO es el lugar del detalle técnico; (f) cada oración lógicamente correcta (no ligue conceptos que no se siguen). NOMBRES canónicos si los menciona: registro "myregistry", imagen "inference-api", app "inference-app", grupo "rg-ai200". PRECISIÓN si toca estos puntos (no invente): la purga es una tarea programada de ACR (acr purge), NO "az acr repository purge"; la variable de ACR Tasks es {{.Run.ID}}; los private endpoints de ACR REQUIEREN Premium; las referencias a Key Vault en App Service son "@Microsoft.KeyVault(SecretUri=…)". VOZ (registro ÚNICO): hable SIEMPRE de USTED o impersonal con "se"; PROHIBIDO primera persona (singular o plural), tú y voseo.\n\n${ed.voice}\n\nDevuelva SOLO JSON {"paras":["…","…","…","…"]} (EXACTAMENTE 4 cadenas).`;
  const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Es editor de una editorial técnica premium. Español neutro de LATAM, trato de USTED, sin voseo. Devuelve SOLO JSON válido." }, { role: "user", content: user }], response_format: { type: "json_object" }, ...chatModelParams(CONFIG.authorModel, 6000, 0.5) });
  recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "chapter-divider-text", pageId: c.chapterId });
  const raw = JSON.parse(res.choices[0]?.message?.content || "{}") as { paras?: unknown };
  const paras = Array.isArray(raw.paras) ? raw.paras.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 4) : [];
  return paras;
}

/** Los intros no deben abrir con un identificador en minúscula (myregistry/acr/…) ni un comando; el fix primario es el
 *  prompt, pero como respaldo capitalizamos la 1ª letra SOLO si es una palabra común (no un token de código). */
const LAB_TOKEN_OPEN = /^(myregistry|inference-api|inference-app|rg-ai200|plan-inference|az|acr|docker|kubectl|gunicorn|[a-z]*-[a-z]|[a-z]*[0-9])/i;
function capitalizedIntro(paras: string[]): string[] {
  if (!paras.length) return paras;
  const first = paras[0]!;
  const m = /^(\s*)([^\s]+)/.exec(first);
  if (m && /^[a-záéíóúñ]/.test(m[2]!) && !LAB_TOKEN_OPEN.test(m[2]!) && !/[\d/@_]/.test(m[2]!)) {
    const out = [...paras];
    out[0] = m[1]! + m[2]!.charAt(0).toUpperCase() + first.slice(m[1]!.length + 1);
    return out;
  }
  return paras;
}
/** Ensambla el intro HTML (los párrafos del synth) para seed.intro, con la 1ª letra capitalizada de respaldo. */
function introHtml(paras: string[]): string {
  return capitalizedIntro(paras).map((p) => `<p>${p}</p>`).join("");
}

/** Re-genera SOLO la intro (los 3 párrafos) con el synth endurecido y la persiste en seed.intro. Barato (sin imagen).
 *  La portadilla CSS (renderPortadilla) lee seed.intro → refresca la voz sin regenerar la imagen del divisor. */
export async function regenIntro(chapterId: string): Promise<boolean> {
  if (!hasOpenAIKey() || !getOpenAI()) return false;
  const ch = getPersistedChapter(chapterId);
  if (!ch) return false;
  const paras = await synth(ch.seed);
  const fresh = getPersistedChapter(chapterId);
  if (!fresh || !paras.length) return false;
  fresh.seed.intro = introHtml(paras);
  upsertPersistedChapter(fresh);
  return true;
}

function dividerPrompt(heading: ChapterHeading, title: string, paras: string[], anchored: boolean, bc: BrandContract): string {
  // Identidad de marca CONGELADA por el contrato (no depende de style.accent → sin drift azul/verde).
  const accent = bc.dividerAccentHex, navy = bc.dividerNavyHex, canvas = bc.dividerCanvasHex, wave = bc.dividerWaveBaseHex;
  // El integrador no lleva número: la caja del número se reemplaza por una píldora "PROYECTO INTEGRADOR" y arriba va "RUTA N".
  const isCap = heading.isCapstone;
  const blockWord = isCap ? heading.kicker : "CAPÍTULO";
  const numberBox = isCap
    ? `a WIDE ROUNDED navy ${navy} PILL (~62% of page width, ~9% of page width tall, 12px radius) containing the two words "PROYECTO INTEGRADOR" centered in WHITE, extra-bold, uppercase, moderate letter-spacing, fit on ONE line — NO number anywhere`
    : `a ROUNDED-SQUARE box (~17% of page width, 12px radius) filled deep-navy ${navy} with the number "${heading.badge}" centered in WHITE, extra-bold, large`;
  const topText = isCap ? `${heading.kicker}\nPROYECTO INTEGRADOR` : `CAPÍTULO ${heading.badge}`;
  const ref = anchored ? `MATCH THE REFERENCE IMAGE EXACTLY — it is the CANONICAL master for this chapter-divider. Reproduce its layout, proportions, margins, the number box, the title position, the EXACT inter-paragraph spacing and leading, the EXACT title cap-height and the EXACT body font size (do NOT rescale the text — same glyph sizes as the reference; EVEN IF this chapter's title has FEWER lines than the reference, keep the SAME title glyph size and leave the extra space empty — never enlarge a short title), the wave-art placement and the footer position IDENTICALLY. The ONLY things that differ are: the chapter number, the title text and the three paragraphs. Keep everything else identical to the reference.\n\n` : "";
  return ref + `FIXED CHAPTER-DIVIDER LAYOUT CONTRACT — a chapter-opener page for a premium documentary study book; render it EXACTLY. Vertical portrait page (2:3), full-bleed. FLAT 2D editorial vector only — NO photographs, NO 3D, NO bevels, NO glossy fills, NO drop shadows, NO glow, NO textures, NO heavy gradients.

CANVAS — background ALWAYS a single flat near-white ${canvas}; NEVER dark. FIXED even outer margin ~8% of page width on all sides. The title and the three paragraphs ALWAYS sit on clean near-white space; the background art NEVER sits behind the paragraph text.

BACKGROUND ART (fixed brand motif) — an elegant FLOWING WAVE / NETWORK field: many FINE thin ~1px lines and small dots forming 2-3 overlapping smooth horizontal sine-wave bands (delicate topographic / network look). Colors: soft light-blue ${wave} with a few strands in the accent ${accent}; flat, pale, airy. PLACEMENT: a wide band in the UPPER-RIGHT (right of the number box and above the title) + a single fainter echo along the BOTTOM ~12% as a calm horizon. Airy — it frames the page, never fills it.

EXACT LAYOUT, top → bottom (all left-aligned except the justified body):
1) NUMBER BLOCK (top-left): the word "${blockWord}" in the accent ${accent}, uppercase, semibold, small, wide letter-spacing; DIRECTLY BELOW ${numberBox}. Wave art begins to the RIGHT of this box.
2) TITLE — clear gap below the number. Text: "${title}". Clean HUMANIST SANS-SERIF (Segoe UI / Frutiger look), EXTRA-BOLD (800), deep-navy ${navy}, tight line-height (~1.05), left-aligned. The TITLE glyph cap-height is FIXED (~6.5% of page height) and IDENTICAL on EVERY chapter divider regardless of title length. The TITLE BLOCK occupies EXACTLY the same content width as the body paragraphs — its LEFT and RIGHT edges are IDENTICAL to the body's, honoring the fixed ~8% outer margin. NO title line may touch or cross the RIGHT margin: if the next word would cross it, WRAP it to the next line instead — NEVER let any glyph bleed toward or past the right edge, and NEVER shrink the title to make it fit. A LONGER title simply wraps to MORE lines (up to MAX 5); a SHORTER title (e.g. 2 lines) uses the SAME glyph size and simply leaves MORE empty space below it — do NOT enlarge a short title to fill the title area, and do NOT shrink a long one. The title area is TOP-anchored, not vertically centered. SANS-SERIF only — NEVER a serif.
3) RULE — ~0.05in below the title: ONE horizontal line, 2px, accent ${accent}, length ~30% of content width, left-aligned.
4) BODY — clear gap below the rule. FOUR or FIVE short paragraphs of running prose, SAME humanist SANS-SERIF, REGULAR (400), dark slate #2A3340, all the SAME FIXED size (~2.0% of page height) IDENTICAL on EVERY chapter divider — never rescale the body to fit the text, line-height ~1.55, full content width, FULLY JUSTIFIED (both edges flush). A fixed clear gap between paragraphs. Each paragraph 3-5 lines. NO bullets, NO icons. Perfectly legible, correct Spanish spelling, no gibberish, no cut/mis-hyphenated words.
5) FOOTER — NONE. Leave the bottom margin CLEAN and EMPTY: NO footer text, NO brand, NO logo, NO cert code, NO "CloudBooks", NO URL, NO page number. The faint wave echo along the bottom is the ONLY thing there.

Render EXACTLY this text and NOTHING ELSE at the bottom, in Spanish (the three paragraphs FULLY JUSTIFIED, NO icons beside them):
${topText}
${title}
${paras.join("\n\n")}`;
}

export interface ChapterDividerResult { ok: boolean; chapterId: string; url?: string; reused?: boolean; anchored?: boolean; costUsd?: number; error?: string }

export async function generateChapterDivider(chapterId: string, force = false): Promise<ChapterDividerResult> {
  return timeAgent("disenador", "chapter-divider", () => generateChapterDividerInner(chapterId, force), { moduleId: chapterId });
}
async function generateChapterDividerInner(chapterId: string, force = false): Promise<ChapterDividerResult> {
  if (!hasOpenAIKey() || !getOpenAI()) return { ok: false, chapterId, error: "Sin llave/cliente OpenAI." };
  if (wouldExceedCap(CONFIG.infographicCostUsd)) return { ok: false, chapterId, error: "Tope de costo mensual alcanzado." };
  return withLock(`chapter-divider:${chapterId}`, async (): Promise<ChapterDividerResult> => {
    const ch = getPersistedChapter(chapterId);
    if (!ch) return { ok: false, chapterId, error: "Capítulo no encontrado." };
    // IDEMPOTENCIA (fix de fuga): reusar el divisor existente SIN re-llamar al LLM (`synth`) ni regenerar la imagen. El
    // hash previo se calculaba sobre la salida de `synth` (temp 0.5 → NO determinista) → casi nunca coincidía → regeneraba
    // (y gastaba) en CADA corrida. Con force=false y el divisor + manifest ya en disco → reusar. `force=true` (botón
    // "Regenerar" por página o content-force) sí regenera.
    if (!force && existsSync(dividerFile(chapterId)) && existsSync(manifestFile(chapterId))) {
      return { ok: true, chapterId, url: dividerUrl(chapterId), reused: true };
    }
    const c = ch.seed;
    const master = masterChapterId();
    const isMaster = !master || master === chapterId;
    const anchorPath = master ? dividerFile(master) : "";
    const anchored = !isMaster && !isCapstoneSeed(c) && !!anchorPath && existsSync(anchorPath);   // el integrador NO ancla a la portadilla numerada (bloque distinto)
    const refBuf = anchored ? readFileSync(anchorPath) : null;
    const paras = await synth(c);
    const bc = getBrandContract();   // identidad congelada (no style.accent)
    const prompt = dividerPrompt(chapterHeading(c), c.title, paras, anchored, bc) + notePromptBlock(`chapter:${chapterId}`);
    const hash = crypto.createHash("sha256").update(prompt + (anchored ? "|anchor" : "|master")).digest("hex").slice(0, 16);
    const r = await generateUpperVisual(prompt, { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, refImages: refBuf ? [refBuf] : undefined, label: "chapter-divider", pageId: chapterId });
    if (r.outcome !== "real" || !r.buffer) return { ok: false, chapterId, error: r.error ?? r.outcome, costUsd: r.costUsd };
    const dir = pageOutputDir(chapterId);
    await mkdir(dir, { recursive: true });
    await writeFile(dividerFile(chapterId), r.buffer);
    await writeFile(manifestFile(chapterId), JSON.stringify({ hash, generatedAt: new Date().toISOString(), anchored }, null, 2));
    // Guardar la síntesis del divisor como intro del capítulo (fallback legible si no hay imagen).
    const fresh = getPersistedChapter(chapterId);
    if (fresh) { fresh.seed.intro = introHtml(paras); upsertPersistedChapter(fresh); }
    return { ok: true, chapterId, url: dividerUrl(chapterId), reused: false, anchored, costUsd: r.costUsd };
  });
}
