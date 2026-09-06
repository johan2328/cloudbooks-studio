import { CONFIG } from "../config.js";
import type { PageSeed, VisualModule } from "../types.js";
import { resolveContract, domainIdForSeed } from "../contract/design-contract.js";

/**
 * PROMPT DE PÁGINA (infografía). El CONTRATO VISUAL (preámbulo) lo resuelve el modelo en
 * cascada; acá se arma el CONTENIDO desde el seed.
 *
 * MODELO "overflow" (Corrida 37): una unidad de ≤7 tarjetas se dibuja en UNA página
 * (tarjetas + trampas + autocheck). Una unidad DENSA (≥CONFIG.spreadMinModules = 8 tarjetas)
 * se dibuja como SPREAD: PÁGINA 1 = SOLO las primeras 6 tarjetas (nada más); PÁGINA 2 = las
 * tarjetas RESTANTES (7ª en adelante) + las trampas + el autocheck.
 */

export type InfographicPart = "single" | "A" | "B";

/** Máximo de tarjetas en la página 1 de un spread (el resto va a la página 2). */
export const PAGE1_MAX = 6;

function lettered(i: number): string {
  return String.fromCharCode(65 + i);
}

const NUM_WORDS = ["zero", "one", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT"];
const numWord = (n: number): string => NUM_WORDS[n] ?? String(n);

/** Distribución de la grilla de N tarjetas (rows read left-to-right) que LLENA todo, sin huecos. */
export function moduleGrid(n: number): string {
  return n === 1 ? "as ONE wide card spanning the full width at the top of the section area (with a generous diagram and caption) — it does NOT need to fill the whole height; leave the rest of the page for the bands below"
    : n === 2 ? "as TWO TALL cards side by side (one row of 2), EACH spanning the FULL HEIGHT so the two columns fill the rectangle top-to-bottom — NO empty band above, below or beside them"
    : n === 3 ? "as a '2-over-1' layout that FILLS the area with NO empty cell: TWO cards in the top row and ONE WIDE card spanning the full width below (NEVER a 2×2 grid with an empty 4th cell)"
    : n === 4 ? "in a balanced 2×2 grid (2 rows of 2) that fills the whole area"
    : n === 5 ? "as a row of 3 cards on top and a row of 2 cards CENTERED below (the bottom two slightly wider so the row is full) — NO empty cell"
    : n === 6 ? "as 2 rows of 3 cards (read left-to-right) — full, NO empty cell"
    : n === 7 ? "as a row of 4 cards on top and a row of 3 cards centered below (read left-to-right; the bottom 3 spread to full width) — NO empty cell or gap"
    : n === 8 ? "as 2 ROWS OF 4 cards (4 across the top, 4 across the bottom, read left-to-right) — full, NO empty cell or gap"
    : `as ${n} cards in balanced rows of 4 read LEFT-TO-RIGHT (the last row centered if it has fewer) — full, NO empty cell or gap`;
}

/** ¿Esta unidad se renderiza como SPREAD de 2 páginas? (densa: ≥ spreadMinModules tarjetas). */
export function isSpread(seed: PageSeed): boolean {
  return seed.visualModules.length >= CONFIG.spreadMinModules;
}

function headerBlock(seed: PageSeed, partLabel?: string): string {
  return `TITLE: "${seed.title}"${partLabel ? ` — with a small "${partLabel}" badge immediately to the right of the title (a small SOLID deep-navy #06133E rounded box with WHITE bold text, ~the title's cap-height)` : ""} (render the title in DEEP NAVY #06133E, bold, large — the FULL title COMPLETE; if the title is long, REDUCE the font size and/or WRAP it onto a SECOND line so the ENTIRE title fits within the canvas width — NEVER truncate, clip or drop any word, e.g. never render "Machine" without its "Learning").
CONTEXT (one line): ${seed.context}
GUIDE BAR (light blue, the band already has its own "PREGUNTA GUÍA" label from the contract — do NOT repeat "Pregunta guía" in the question text). The band is ONE row: [blue map-pin] [PREGUNTA GUÍA] | question — the pin and label stay at the LEFT, vertically centered, and the question text stays in its OWN column to the RIGHT of the divider on the same baseline; if it wraps, it stays in that right column and NEVER flows under the pin icon. Question: "${seed.guideQuestion}"`;
}

/** Header de la PÁGINA 2 de un spread: MISMO título grande que la pág 1 + badge "2/2" idéntico al "1/2"; SIN ícono grande de hero, SIN contexto, SIN pregunta guía. */
function slimHeaderBlock(seed: PageSeed): string {
  return `HEADER (this is page 2 of a 2-page spread): render the page TITLE "${seed.title}" EXACTLY like page 1 — DEEP NAVY #06133E, bold, the SAME LARGE SIZE as the title on page 1, full and complete — reducing the font size and/or wrapping onto a second line if the title is long so the ENTIRE title fits and NO word is ever cut — with a small "2 / 2" badge immediately to its right that is IDENTICAL in size and style to the "1 / 2" badge on page 1 (the same small SOLID deep-navy #06133E rounded box with WHITE bold text). IMPORTANT: on this page do NOT draw the big hero/domain icon, do NOT draw a context line, and do NOT draw the "PREGUNTA GUÍA" guide bar (those go ONLY on page 1). Just this title line (same height as page 1's title row), then the content below.`;
}

/** Bloque de tarjetas numeradas. `startNum` = número/acento de la primera (1 en pág 1, 7 en pág 2). */
function modulesBlock(mods: VisualModule[], startNum: number, fullPage: boolean): string {
  const n = mods.length;
  const grid = moduleGrid(n);
  const sections = mods.map((m, i) => `  SECTION ${startNum + i} "${m.title}": ${m.description}`).join("\n");
  const fill = fullPage
    ? "LAYOUT FILL (critical): the cards occupy the page below the guide bar with balanced rows, equal gutters and NO empty cell or hole — BUT keep the safe outer margin: do NOT push cards to the canvas edges, and the BOTTOM row ends with a clear white band above the footer (cards have controlled height, not stretched down)."
    : "LAYOUT FILL (critical): the numbered-sections block fills its area with balanced cards, equal gutters and NO empty cell or hole, while keeping the safe outer margin (cards do NOT touch the canvas edges).";
  return `${numWord(n)} NUMBERED SECTIONS ${grid} (numbered starting at ${startNum}; use a table where the content compares options/tiers, a flow diagram where it describes a sequence):
${sections}
ACCENTS: each card's number-circle AND title take that card's OWN accent by its NUMBER (1 blue, 2 purple, 3 teal, 4 orange, 5 magenta, 6 indigo, 7 rose, 8 amber); every card a DIFFERENT accent — NEVER paint all cards the same color.
${fill}
FIDELITY (critical): each card's icons/diagram depict ONLY the services and concepts NAMED IN ITS OWN caption text above; do NOT add Azure service icons the card's text doesn't mention.`;
}

function trapsBlock(seed: PageSeed): string {
  const traps = seed.traps.map((t, i) => `  ${i + 1}) Mito: ${t.wrong} | Corrección: ${t.correction}`).join("\n");
  return `TRAMPAS DEL EXAMEN (red band, ${seed.traps.length} cards, each Mito + Corrección):
${traps}
SEPARATION: the TRAMPAS band is its OWN self-contained block; leave a clear white GAP between it and the AUTOCHECK band below — their outer borders NEVER touch or merge, and the trap cards inside are separated by an even gutter.`;
}

function autocheckBlock(seed: PageSeed): string {
  const opts = seed.autocheck.options
    .map((o, i) => {
      const clean = o.replace(/^\s*[A-Da-d][.)]\s*/, "").trim();
      return `${lettered(i)}. ${clean}${i === seed.autocheck.correctOption ? "  <-- CORRECT, highlight green with check" : ""}`;
    })
    .join(" ; ");
  return `VERIFICACIÓN AUTOCHECK (blue band, a SEPARATE block placed BELOW the TRAMPAS band with a clear white gap between them — the two bands never touch or share a border): Pregunta: "${seed.autocheck.question}" Options: ${opts}. Explanation: ${seed.autocheck.explanation}`;
}

/** Página ÚNICA (unidad ≤7 tarjetas): tarjetas + trampas + autocheck. */
export function infographicContent(seed: PageSeed): string {
  return `PAGE CONTENT (render all text exactly, in Spanish):
${headerBlock(seed)}
${modulesBlock(seed.visualModules, 1, false)}
${trapsBlock(seed)}
${autocheckBlock(seed)}`;
}

/** SPREAD · PÁGINA 1 (unidad densa): SOLO las primeras 6 tarjetas, a página completa. Sin trampas ni autocheck. */
export function infographicContentPartA(seed: PageSeed): string {
  const mods = seed.visualModules.slice(0, PAGE1_MAX);
  return `PAGE CONTENT — PART 1 of a 2-page spread (render all text exactly, in Spanish). This page shows ONLY the title, the guide question and the first ${mods.length} concept cards at full page size. There are NO "trampas" and NO "autocheck" on this page — they are on page 2, together with the remaining cards. NO recap strip and NO summary; only the title, guide and the ${mods.length} cards.
${headerBlock(seed, "1 / 2")}
${modulesBlock(mods, 1, true)}`;
}

/** SPREAD · PÁGINA 2 (unidad densa): header SLIM (sin ícono/contexto/guía) + tarjetas restantes (7ª+) + trampas + autocheck. */
export function infographicContentPartB(seed: PageSeed): string {
  const mods = seed.visualModules.slice(PAGE1_MAX);
  return `PAGE CONTENT — PART 2 of a 2-page spread (continuation; render all text exactly, in Spanish). This facing page has ONLY: a slim title line at the top, then the REMAINING concept cards of the SAME unit (cards ${PAGE1_MAX + 1} onward), then the exam traps, then the autocheck. NO big hero icon, NO context paragraph, NO guide bar (those are only on page 1).
${slimHeaderBlock(seed)}
${modulesBlock(mods, PAGE1_MAX + 1, false)}
${trapsBlock(seed)}
${autocheckBlock(seed)}`;
}

export function buildInfographicPrompt(seed: PageSeed, part: InfographicPart = "single"): { prompt: string; promptVersion: string } {
  const resolved = resolveContract(CONFIG.certId, CONFIG.format, domainIdForSeed(seed));
  const content = part === "A" ? infographicContentPartA(seed)
    : part === "B" ? infographicContentPartB(seed)
    : infographicContent(seed);
  return { prompt: `${resolved.preamble}\n\n${content}`, promptVersion: CONFIG.infographicPromptVersion };
}
