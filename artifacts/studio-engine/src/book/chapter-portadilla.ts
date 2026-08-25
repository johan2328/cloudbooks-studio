import { readFileSync, existsSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { generateUpperVisual } from "../image/generate-upper-visual.js";
import { wouldExceedCap } from "../cost.js";
import { withLock } from "../fs-safe.js";
import { getBrandContract, type BrandContract } from "./brand-contract.js";
import { renderToPdf } from "./assemble-book.js";
import { chapterHeading } from "./chapter-heading.js";
import type { BookConfig } from "./book-config.js";
import type { ChapterSeed } from "../types.js";

/**
 * PORTADILLA DE CAPÍTULO — DETERMINISTA. El arte de olas lo genera el modelo de imagen UNA vez
 * (sin texto, reutilizable), pero el badge, el título, la regla verde y los 3 párrafos de intro
 * se componen por CSS con TAMAÑO FIJO y justificado → cero varianza tipográfica entre portadillas
 * (lo que el modelo de imagen no puede garantizar al redibujar el texto en cada generación).
 * Full-bleed: se renderiza como página HTML 6×9.3in con @page margin 0 y el arte de fondo.
 */
const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * "Code voice" en la prosa del intro: envuelve comandos y tokens de código en <code> (fuente monoespaciada
 * con tinte) para que NO se estiren ni se confundan con la prosa justificada, y hace no-divisible "AI-200".
 * El intro es prosa plana (sin <code> previo), así que el envuelto es seguro. Patrones acotados y no ambiguos:
 * comandos az/docker/kubectl con subcomandos, identificadores UPPER_SNAKE (con "_" → nunca acrónimos) y flags --xxx.
 */
// Palabras-función del español que NO son subcomandos: cortan el comando para no tragarse la prosa
// (evita "az acr build de docker push" o romper "cuándo"/"usará" al chocar con un acento).
const ES_STOP = "de|y|o|u|e|la|el|los|las|un|una|unos|unas|en|con|para|que|se|su|sus|al|del|es|como|por|si|no|lo|le|más|pero|sin|sobre|entre|desde|hasta|cuando|donde|frente|según|cada|tras|ante|bajo|contra|hacia|durante|mediante|salvo|excepto|versus|tanto|todo|toda|todos|todas|ya|luego|antes|después|cuya|cuyo|cuyas|cuyos";
// {1,3}: exige AL MENOS 1 subcomando (así "az" dentro de "azurecr" o "docker" en "docker-compose" NO matchea como
// prefijo) y a lo sumo 3 (cubre "az acr repository show-tags"); los flags --x y args se envuelven aparte.
const AZ_CMD = new RegExp(`\\b((?:az|docker|kubectl)(?:\\s+(?!(?:${ES_STOP})\\b)[a-z][a-z0-9-]*){1,3})`, "g");
export function codeVoice(html: string): string {
  return String(html ?? "")
    .replace(AZ_CMD, "<code>$1</code>")
    // Identificador UPPER_SNAKE + su asignación opcional "=valor" (para que "WEBSITES_PORT=8000" quede entero).
    .replace(/\b([A-Z][A-Z0-9]*_[A-Z0-9_]+(?:=[^\s<]+)?)/g, "<code>$1</code>")
    .replace(/(^|[\s(])(--[a-z][a-z0-9-]+)/g, "$1<code>$2</code>")
    .replace(/\bAI-200\b/g, "AI‑200"); // guion no divisible → nunca corta en salto de línea
}

/**
 * Code voice para prosa del CUERPO, que YA puede traer <code>/<pre> (del autor/enriquecedor):
 * segmenta por esos spans y aplica el envuelto SOLO a los tramos de texto FUERA de código
 * (evita el doble-envuelto de "<code><code>…</code></code>"). Los spans ya-código quedan intactos.
 */
export function codeVoiceBody(html: string): string {
  return String(html ?? "")
    .split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi)
    .map((seg, i) => (i % 2 === 1 ? seg : codeVoice(seg)))
    .join("");
}

/** Arte de olas COMPARTIDO por libro (mismo fondo en todas las portadillas → uniforme). Sin texto. */
function artFile(): string { return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_portadilla-art.png"); }

function artPrompt(bc: BrandContract): string {
  const accent = bc.dividerAccentHex, canvas = bc.dividerCanvasHex, wave = bc.dividerWaveBaseHex;
  return `FLAT 2D editorial VECTOR BACKGROUND for a book chapter-opener page. Vertical portrait (2:3), full-bleed. ABSOLUTELY NO text, NO letters, NO numbers, NO badge, NO title, NO words — zero typography of any kind anywhere.
CANVAS: a single flat near-white ${canvas}, full-bleed edge to edge.
ART: an elegant FLOWING WAVE / NETWORK field — many FINE thin ~1px lines and small dots forming 2-3 overlapping smooth horizontal sine-wave bands (delicate topographic / network look). Colors: soft light-blue ${wave} with a few strands in the accent ${accent}; flat, pale, airy, ~1px strokes.
PLACEMENT: a wide band across the UPPER-RIGHT portion of the page (upper third, biased right) + a single fainter echo along the BOTTOM ~12%. The LEFT and CENTER of the page stay clean near-white and EMPTY so text can be overlaid later.
NO heavy fills, NO gradients, NO 3D, NO shadows, NO glow, NO photographs. Just the abstract pale wave art on near-white. NOTHING else.`;
}

/** Devuelve el arte como data URI (base64), generándolo una vez si falta. null si no se puede. */
export async function ensurePortadillaArt(): Promise<string | null> {
  const toDataUri = (buf: Buffer): string => `data:image/png;base64,${buf.toString("base64")}`;
  if (existsSync(artFile())) { try { return toDataUri(readFileSync(artFile())); } catch { /* regenerar */ } }
  if (!hasOpenAIKey() || !getOpenAI() || wouldExceedCap(CONFIG.infographicCostUsd)) return null;
  return withLock("portadilla-art", async (): Promise<string | null> => {
    if (existsSync(artFile())) { try { return toDataUri(readFileSync(artFile())); } catch { /* seguir */ } }
    const r = await generateUpperVisual(artPrompt(getBrandContract()), { size: CONFIG.infographicSize, quality: CONFIG.infographicQuality, costUsd: CONFIG.infographicCostUsd, label: "portadilla-art", pageId: "shared" });
    if (r.outcome !== "real" || !r.buffer) return null;
    await mkdir(path.dirname(artFile()), { recursive: true });
    await writeFile(artFile(), r.buffer);
    return toDataUri(r.buffer);
  });
}

/** CSS de la portadilla: tamaños FIJOS (idénticos en todas las portadillas). */
function portadillaCss(bc: BrandContract): string {
  const accent = bc.dividerAccentHex, navy = bc.dividerNavyHex, canvas = bc.dividerCanvasHex;
  return `*{box-sizing:border-box;margin:0;padding:0}body{margin:0}
.pta{position:relative;width:6in;height:9.3in;background:${canvas};overflow:hidden;font-family:'Segoe UI','Segoe UI Web',system-ui,sans-serif}
.pta-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0}
.pta-in{position:absolute;inset:0;z-index:1;padding:.6in .6in}
.pta-kick{font-size:8.5pt;letter-spacing:.16em;text-transform:uppercase;color:${accent};font-weight:700;margin:.1in 0 .1in}
.pta-badge{width:1.05in;height:1.05in;border-radius:12px;background:${navy};color:#fff;font-weight:800;font-size:42pt;line-height:1.05in;text-align:center;letter-spacing:.01em}
.pta-title{font-weight:800;color:${navy};font-size:24pt;line-height:1.1;letter-spacing:-.01em;margin:.32in 0 0;max-width:4.8in;text-wrap:balance;overflow-wrap:break-word;hyphens:none}
.pta-rule{width:1.7in;height:2px;background:${accent};margin:.15in 0 0}
.pta-intro{margin:.2in 0 0;max-width:4.9in}
.pta-intro p{font-family:Georgia,'Times New Roman',serif;font-weight:400;color:#2A3340;font-size:13.5px;line-height:1.5;text-align:justify;hyphens:auto;hyphenate-limit-chars:6 3 3;overflow-wrap:break-word;margin:0 0 .1in}
.pta-intro p:last-child{margin-bottom:0}
.pta-intro code{font-family:Consolas,'Cascadia Mono','Courier New',monospace;font-size:.9em;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;background:${accent}14;color:#20372F;padding:.02em .24em;border-radius:3px;white-space:nowrap}
.pta-obj{margin:.26in 0 0;max-width:4.9in}
.pta-obj-h{font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:${accent};font-weight:700;margin:0 0 .1in}
.pta-obj-list{list-style:none;margin:0;padding:0}
.pta-obj-list li{font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:1.4;color:#2A3340;padding-left:.2in;position:relative;margin:0 0 .075in}
.pta-obj-list li:before{content:"\\203A";position:absolute;left:0;color:${accent};font-weight:800}`;
}

/** Renderiza la portadilla del capítulo como página PDF full-bleed (Buffer). Texto por CSS + arte IA de fondo. */
export async function renderPortadilla(
  browser: Parameters<typeof renderToPdf>[0], c: ChapterSeed, cfg: BookConfig, artDataUri: string | null,
): Promise<Buffer> {
  const bc = getBrandContract();
  const art = artDataUri ? `<img class="pta-art" src="${artDataUri}" alt="">` : "";
  const intro = codeVoice((c.intro && /<p/i.test(c.intro)) ? c.intro : `<p>${esc(c.intro)}</p>`);
  const hd = chapterHeading(c);   // integrador: kicker "Ruta N" + píldora "Proyecto integrador" (sin número)
  const badge = hd.isCapstone
    ? `<div class="pta-badge" style="width:auto;min-width:0;padding:0 .26in;font-size:.24in;line-height:1.05;letter-spacing:.04em;text-align:center;">PROYECTO<br>INTEGRADOR</div>`
    : `<div class="pta-badge">${esc(c.chapterNumber)}</div>`;
  // ENRIQUECIDO: objetivos ("Al terminar, usted podrá…") en la mitad inferior (antes sobria). Viven ACÁ, no en
  // el cuerpo (se quitó el ch-obj-box) → patrón de apertura de libro real, sin duplicar el bloque.
  const obj = c.objectives?.length
    ? `<div class="pta-obj"><p class="pta-obj-h">Al terminar, usted podrá</p><ul class="pta-obj-list">${c.objectives.slice(0, 5).map((o) => `<li>${codeVoice(esc(String(o).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()))}</li>`).join("")}</ul></div>`
    : "";
  const body = `<div class="pta">${art}<div class="pta-in">`
    + `<p class="pta-kick">${esc(hd.isCapstone ? hd.kicker : "Capítulo")}</p>`
    + badge
    + `<h1 class="pta-title">${esc(c.title)}</h1>`
    + `<div class="pta-rule"></div>`
    + `<div class="pta-intro">${intro}</div>`
    + obj
    + `</div></div>`;
  // margin 0 → full-bleed (el arte llega a los bordes); el margen interno lo da .pta-in.
  return renderToPdf(browser, body, "0", portadillaCss(bc), cfg);
}
