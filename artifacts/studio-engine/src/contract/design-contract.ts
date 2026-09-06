import type { PageSeed } from "../types.js";

/**
 * CONTRATO DE DISEÑO EN CASCADA. El contrato visual se descompone en CAMPOS y se
 * define en 3 niveles que heredan/override-an: COLECCIÓN (cert) → LIBRO/FORMATO →
 * MÓDULO (dominio). El contrato EFECTIVO de una página = merge de los 3 por campo.
 * Encapsula el diseño y desbloquea multi-formato/multi-cert sin tocar el prompt.
 */

export type ContractScope = "collection" | "book" | "module";
export interface ContractField { key: string; label: string; value: string; from: ContractScope }

/** Orden + etiqueta de cada campo del preámbulo (también define el orden de armado). */
const FIELD_DEFS: { key: string; label: string }[] = [
  { key: "intro", label: "Encabezado / estética" },
  { key: "canvas", label: "Lienzo" },
  { key: "palette", label: "Paleta de color" },
  { key: "iconography", label: "Iconografía" },
  { key: "numbering", label: "Numeración" },
  { key: "cards", label: "Tarjetas" },
  { key: "typography", label: "Tipografía" },
  { key: "tables", label: "Tablas" },
  { key: "traps", label: "Banda de trampas" },
  { key: "autocheck", label: "Banda de autocheck" },
  { key: "guide", label: "Pregunta guía" },
  { key: "introIcon", label: "Intro · icono de dominio" },
  { key: "diagrams", label: "Variedad de diagramas" },
  { key: "consistency", label: "Consistencia estricta" },
  { key: "layout", label: "Layout" },
];

/** COLECCIÓN (cert AI-200): el ADN de marca — define TODOS los campos base. */
const AI200_COLLECTION: Record<string, string> = {
  intro: `PREMIUM EDITORIAL CONTRACT — this is the FIXED art direction, identical on EVERY page of the book. Follow it EXACTLY; do not improvise styles. A clean Microsoft Learn aesthetic.`,
  canvas: `CANVAS: pure white #FFFFFF background. FLAT 2D vector only — NO gradients, NO glossy/shiny fills, NO glow, NO drop shadows, NO 3D, NO photographic textures. SAFE MARGINS (critical, fixed and CONSISTENT on EVERY page): keep an even white margin of about 6% of the page (~1.5 cm) on ALL FOUR edges; NO card, table, band, icon or text may touch or bleed to the very edge of the canvas. The BOTTOM margin in particular must be GENEROUS and the SAME on every page — the last band (cards, or autocheck) must end with a clear, comfortable white band below it (never tight against the bottom edge, never different from one page to the next). Cards keep a controlled height; they do NOT stretch to fill leftover vertical space — leftover space stays as even white margin, it is NOT absorbed by enlarging the bottom row. INTERNAL SPACING (critical): between the main content zones — the numbered-cards block, the TRAMPAS band and the AUTOCHECK band — keep an EVEN vertical white gap, consistent on every page, so each zone reads as its OWN block separated by white space; NEVER let two adjacent zones' borders touch or merge. NO OUTER FRAME (critical): do NOT draw any border, frame, box, panel or rounded rectangle that encloses the whole page or wraps ALL the cards/bands together — ONLY the individual cards and bands have their own borders; the page background is plain white all the way to the safe margin, with NO perimeter line, outline or containing box around the content.`,
  palette: `COLOR PALETTE — use these EXACT flat tones. DO NOT boost, brighten, saturate or make colors vivid/neon; keep them calm and professional at Microsoft-Learn MODERATE saturation, as flat solid fills:
- Section accents IN ORDER: Section 1 = Azure blue #0078D4 ; Section 2 = purple #7C3AED ; Section 3 = teal #119A8C ; Section 4 = orange #E8820C ; Section 5 = magenta #C026D3 ; Section 6 = indigo #4F46E5 ; Section 7 = rose #DB2777 ; Section 8 = amber #B45309. Use only as many accents as there are sections, always in this order starting from section 1.
- Warning / traps / "NO" in tables = red #D7322A. Correct / "SÍ" / success = green #1A7A37. (Red and green are RESERVED for traps/correct — never use them as a section accent.)
- Title navy #0F1B3D ; body text #44505F ; muted labels #6B7480 ; card border #E3E8F0.`,
  iconography: `ICONOGRAPHY: official-style flat Azure/Microsoft service icons chosen to match THIS page's own domain and the specific services named in each card's caption — draw the icon that depicts the concept the card is actually about; do NOT reuse a fixed icon vocabulary borrowed from another topic or product family. Two-tone FLAT: a thin EVEN outline in the section accent (or Azure blue) with a soft light-azure fill #CFE4FA. SAME stroke weight on every icon across the whole book. No gradients, no shadows, no 3D, moderate brand saturation only. ICON UNIQUENESS (important): each section card must use a DISTINCT icon/diagram specific to ITS OWN concept — do NOT draw the same icon on more than one card, and NEVER reproduce the big hero/domain icon from the top intro inside a card. The N cards each show a different, concept-specific visual; repeating one icon across cards or cloning the hero icon is NOT allowed.`,
  numbering: `NUMBERING: each section header begins with a SOLID FILLED CIRCLE in the section accent color, a WHITE bold number centered inside (circle ~28px), then the section title to its right, bold, in the same accent. Accent order is ALWAYS 1=blue, 2=purple, 3=teal, 4=orange, 5=magenta, 6=indigo, 7=rose, 8=amber. CRITICAL — EACH card uses a DIFFERENT accent following that exact sequence (card 1 blue, card 2 purple, card 3 teal, card 4 orange, …): the number circle AND the section title of each card take that card's own accent. It is a CONTRACT VIOLATION to paint all the cards in the SAME single color (e.g. every card purple) — the accents MUST vary card by card in order. GRID (rows read LEFT-TO-RIGHT, always FULL with no empty cells): 2 sections = two tall cards side by side ; 3 sections = 2 on top + 1 WIDE below ; 4 sections = 2×2 ; 5 sections = a row of 3 on top + a row of 2 CENTERED below ; 6 sections = 2 rows of 3 ; 7 sections = a row of 4 on top + a row of 3 centered below ; 8 sections = 2 rows of 4 (4 cards across the top, 4 across the bottom). Cards keep EQUAL size and the same style regardless of count.`,
  cards: `CARDS: every card has a CLEAN WHITE fill (NEVER tinted), a 1px #E3E8F0 border, 14px rounded corners, even generous padding. Identical corner radius and border on ALL cards. Inside every card the icon/diagram and the text keep clear even padding from the card's border — content NEVER touches, overlaps or overflows the card edge, and the card's own border never touches the page's safe margin.`,
  typography: `TYPOGRAPHY: ONE humanist sans family (Segoe UI look) on the whole page. Page title extra-bold (~800) in navy #0F1B3D. Section titles bold, accent-colored. Body regular #44505F. Small labels UPPERCASE, letter-spaced, muted. Perfectly legible Spanish, correctly spelled, no gibberish, no cut words.`,
  tables: `TABLES: white cells, thin #E3E8F0 grid lines, a bold accent header row; "NO" in red #D7322A and "SÍ" in green #1A7A37, centered.`,
  traps: `EXAM-TRAPS BAND: header "TRAMPAS DEL EXAMEN" in red #D7322A preceded by ONE FIXED warning icon — ALWAYS the exact same glyph on every page: a SOLID red #D7322A filled equilateral triangle pointing up, with a single white exclamation mark "!" centered inside it. NEVER an outline-only triangle, never a different shape, never with a circle — always this same solid red filled triangle with the white "!". The triangle is ONE perfectly FLAT, uniform, solid red fill — absolutely NO gradient, NO dark-to-light shading, NO glossy highlight, NO bevel, NO 3D, NO drop shadow; a plain flat vector silhouette of a single solid color, exactly like a Microsoft-Learn flat icon. the trap cards are WHITE with a thin red left accent and a small red numbered square. In EACH trap, ONLY the labels "Mito:" (red, bold) and "Corrección:" (green #1A7A37, bold) are bold and colored; the explanatory sentence after each label is REGULAR weight in dark grey #44505F — never bold. SEPARATION (critical): the whole TRAMPAS band is ONE self-contained block; it is separated from the AUTOCHECK band below it by a clear, comfortable white GAP (about 4% of the page height) — the trap cards and the autocheck block NEVER touch, share or merge their outer borders; there is ALWAYS clean white space between the two bands. Inside the band, the trap cards are separated from each other by an even white gutter; their borders do not touch.`,
  autocheck: `AUTOCHECK BAND: header "VERIFICACIÓN AUTOCHECK" in Azure blue #0078D4 with a blue clipboard-check icon — JUST the flat line glyph, with NO colored background box, square or chip behind it (the icon sits directly on the band, same as the trampas/guide icons); four option chips, WHITE with a thin grey border, laid out in a SINGLE horizontal row (A B C D). CRITICAL FIT RULE: all FOUR option chips, including the LAST one (D), MUST fit ENTIRELY inside the frame, respecting the SAME left and right margin as the rest of the page — chip D must end with clear white space before the right edge and must NEVER touch, cross or be clipped by the right edge of the canvas. The four chips share EQUAL width; if the labels are long, shrink the chips and the option font UNIFORMLY so the whole row fits with margin on both sides (never let one chip push the row past the frame). Each option shows its letter ONCE (e.g., "A. ...") — NEVER doubled like "A. A.". The CORRECT option chip is ALWAYS highlighted IDENTICALLY on every page: green #1A7A37 border + very light green #EAF7EE fill + a green CHECK-CIRCLE icon at its right. The correct option's TEXT stays the SAME regular weight as the other three — do NOT bold it; only the green border, fill and check distinguish it. ONLY the correct option is green; the others stay white. TEXT COLOR & WEIGHT (fixed on every page): the "Pregunta:" line begins with the bold navy #0F1B3D label "Pregunta:" followed by the question text in REGULAR weight, dark slate #44505F — the question text is NOT bold and NOT blue. Below the chips, the "Explicación:" line begins with the bold Azure-blue #0078D4 label "Explicación:" followed by the explanation text in REGULAR weight, dark slate #44505F (NOT blue, NOT bold). Only the two labels ("Pregunta:", "Explicación:") are bold; all the body text is regular dark slate. The "Explicación:" line ALSO stays fully inside the frame (no word clipped at the right edge). SEPARATION (critical): the AUTOCHECK band is a SEPARATE self-contained block placed BELOW the TRAMPAS band with a clear white GAP between them — the two bands NEVER touch, overlap or share a border; there is always a comfortable strip of white space separating TRAMPAS (above) from AUTOCHECK (below).`,
  guide: `GUIDE QUESTION: a slim light-blue band of FIXED height — ALWAYS the same proportions on every page. Layout inside the band, left to right on ONE single line: a small BLUE LOCATION-PIN icon (a map pin, NOT a question-mark circle), then the label "PREGUNTA GUÍA" in blue uppercase, then a thin vertical divider, then the question. The QUESTION text keeps the SAME fixed font size on every page — do NOT shrink it to force one line. If the question is long, let it WRAP to a SECOND line (maximum two lines) and the band grows to fit those two lines; keep the question font proportion CONSISTENT across pages rather than shrinking. The question text is REGULAR weight in dark slate #44505F — never bold, never blue. VERTICAL ALIGNMENT (critical, fixed on every page): the pin icon and the "PREGUNTA GUÍA" label sit at the LEFT of the band, vertically CENTERED; the question text occupies its OWN column to the RIGHT of the vertical divider. The pin, label, divider and the question's first line all share ONE baseline. When the question wraps to a second line, BOTH lines stay in that right-hand column aligned under each other — the question text NEVER flows under the pin icon or under the label, and the pin/label never drop below the text. The band always reads: [pin] [PREGUNTA GUÍA] | [question…] — never the text stacked above/below the icon, never the text pushed into a top corner.`,
  introIcon: `TOP INTRO: place ONE larger flat Azure icon for the page's domain/topic to the LEFT of the title block — the icon on the LEFT, the title and the one-line context to its RIGHT. The hero icon is ALWAYS on the SAME left side on EVERY page (never on the right). Same domain icon across the whole domain. This big HERO/domain icon appears ONLY here, in the top intro — it must NEVER be reused, copied or redrawn inside any of the numbered section cards below.`,
  diagrams: `DIAGRAM VARIETY (creative, but style stays locked): each section's diagram should use the archetype that BEST FITS its content — do NOT default every section to a left-to-right arrow flow. Choose and VARY among: process flow (a sequence), hub-and-spoke (one-to-many), cycle/loop (a lifecycle), layered stack (architecture tiers), comparison TABLE (options/SKUs), matrix/quadrant (two axes), hierarchy/tree (a taxonomy), nested containers (containment), timeline, or before/after. Use DIFFERENT archetypes across the sections so the page feels designed, not templated. CRITICAL: only the diagram SHAPE varies — the visual STYLE (palette, flat Azure icons, white cards, numbered badges, borders, typography) stays EXACTLY per this contract on every diagram and every page.`,
  consistency: `STRICT CONSISTENCY — these structural elements must look IDENTICAL on EVERY page of the book; do not restyle, recolor or reinterpret them:
- The page TITLE is ALWAYS solid navy #0F1B3D — never a different blue, never a gradient, never accent-colored.
- Each TRAP card has ONLY a thin 3px RED LEFT BAR plus the standard 1px grey border — NEVER a thick full red outline around the card.
- The AUTOCHECK header icon is ALWAYS the SAME simple flat clipboard-with-check glyph in Azure blue #0078D4 — same drawing every time, a flat line glyph with NO background box/square/chip behind it.
- The TRAMPAS header icon is ALWAYS the SAME solid red filled triangle with a white "!" — never an outline triangle, never another shape. It is ONE perfectly FLAT uniform red fill: NO gradient, NO shading, NO glossy/3D look — a plain flat silhouette.
- ALL filled shapes, badges and icons are perfectly FLAT single-color fills — NO gradients, NO inner shading, NO glossy highlights, NO drop shadows anywhere on the page.
- The GUIDE band keeps the SAME question font size on every page; if the question is long it WRAPS to a SECOND line (max two) and the band grows to fit — never shrink the question font to force a single line.
- In the AUTOCHECK, the question text and the explanation text are ALWAYS regular-weight dark slate #44505F; only the labels "Pregunta:" (navy) and "Explicación:" (blue) are bold/colored — the body text is never bold and never blue.
- The big hero/domain icon appears ONLY in the top intro; it is NEVER duplicated inside a section card, and no single icon is repeated across more than one card.
- The numbered section badges are ALWAYS the same solid circle + white number; the guide PIN is always the same blue map-pin; the icon stroke weight is the same on all icons.
- The TRAMPAS band and the AUTOCHECK band are ALWAYS two SEPARATE blocks with a clear white GAP between them; their borders never touch, merge or overlap on any page.
- The three content zones (the numbered-cards block, the TRAMPAS band, the AUTOCHECK band) are ALWAYS separated by even white gutters — never crammed so two zones' borders meet.
- In the GUIDE band, the pin + "PREGUNTA GUÍA" label stay at the LEFT and the question text stays in its own right-hand column on one shared baseline; the question text NEVER wraps under the pin icon and the band is never taller on one page than another for the same line count.
- Borders, corner radii, fonts and font weights are uniform across all cards and all pages.
- There is NEVER an outer frame, border, box or rounded rectangle enclosing the whole page or wrapping all the cards/bands together — only individual cards and bands are bordered; the page perimeter is plain white with no line around the content.`,
  layout: `LAYOUT: start at the big title, end at the autocheck. NO top certification bar, NO bottom footer (added separately). Even small margins, balanced, uncluttered, premium. SAFE AREA — every element (cards, tables, diagrams, the autocheck row and its explanation) stays FULLY INSIDE the safe margin with an even white margin on ALL FOUR sides; NOTHING bleeds off, runs past, or is clipped by any edge. Do NOT draw a perimeter frame/box around the page — the safe area is defined by white space, not by a drawn border. The right edge especially must show clear white margin — no card, chip or word may be cut off there.`,
};

/** LIBRO / FORMATO: overrides por formato. Visual Atlas = el formato base (sin overrides). */
const BOOK_CONTRACTS: Record<string, Record<string, string>> = {
  "visual-atlas": {},
};

/** MÓDULO / RUTA: override del acento de color (firma del capítulo). 9 rutas. */
const DOMAIN_ACCENT: Record<string, string> = {
  p1: "Azure blue", p2: "deep indigo", p3: "teal", p4: "magenta", p5: "amber",
  p6: "crimson", p7: "violet", p8: "emerald", p9: "slate",
};

/** Mapea el dominio (ruta) de una página a su id (p1..p9). */
export function domainIdForSeed(seed: PageSeed): string {
  const m = (seed.domainLabel || "").toLowerCase().match(/(?:ruta|dominio)\s*(\d)/);
  const n = m ? Number(m[1]) : 1;
  return n >= 1 && n <= 9 ? `p${n}` : "p1";
}

export interface ResolvedContract {
  certId: string; format: string; domainId: string;
  fields: ContractField[];        // cada campo con su valor efectivo y de qué nivel viene
  preamble: string;               // el preámbulo final (lo que usa build-infographic-prompt)
}

/**
 * Resuelve el contrato EFECTIVO de una página: colección + libro/formato + módulo.
 * Cada campo toma el override del nivel más específico que lo defina.
 */
export function resolveContract(certId: string, format: string, domainId: string): ResolvedContract {
  const book = BOOK_CONTRACTS[format] ?? {};
  const fields: ContractField[] = FIELD_DEFS.map(({ key, label }) => {
    if (book[key] != null) return { key, label, value: book[key]!, from: "book" as ContractScope };
    return { key, label, value: AI200_COLLECTION[key] ?? "", from: "collection" as ContractScope };
  });
  // Acento del dominio = nivel MÓDULO (firma del capítulo).
  const accent = DOMAIN_ACCENT[domainId] ?? "Azure blue";
  fields.push({ key: "domainAccent", label: "Acento del dominio (módulo)", value: `Primary/title accent for THIS domain: ${accent}.`, from: "module" });

  // Armado del preámbulo: campos de colección/libro unidos por línea en blanco,
  // y el acento del módulo en una línea final (igual que el output histórico).
  const base = FIELD_DEFS.map(({ key }) => fields.find((f) => f.key === key)!.value).join("\n\n");
  const accentLine = fields.find((f) => f.key === "domainAccent")!.value;
  const preamble = `${base}\n${accentLine}`;
  return { certId, format, domainId, fields, preamble };
}
