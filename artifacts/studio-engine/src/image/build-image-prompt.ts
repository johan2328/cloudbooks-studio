import { CONFIG } from "../config.js";
import type { PageSeed, Recipe } from "../types.js";

/** Nudge de composición por variante (mismo núcleo, distinto énfasis). */
const VARIANT_NUDGE: Record<string, string> = {
  a: "Composition variant A — diagram-forward: each card centers a small flat flow/architecture micro-diagram (nodes, arrows, sequence), labels minimal.",
  b: "Composition variant B — icon-forward: each card centers a single clean flat line icon with a short label and quiet supporting marks.",
};

/**
 * Prompt del bloque visual superior, afinado al "approved ACR reference style"
 * del golden master: 4 tarjetas 2×2 que LLENAN el marco, flat Azure line, paleta
 * navy/azul/teal, sin chrome de página ni texto de marca. La intención de la
 * receta + la variante moldean la composición. Es SOLO el bloque, no la página.
 */
export function buildImagePrompt(seed: PageSeed, recipe: Recipe, variant?: "a" | "b"): { prompt: string; promptVersion: string } {
  // La cantidad de tarjetas la decide el contenido (2–6), no el `cards` fijo de la receta.
  const count = Math.max(2, Math.min(8, seed.visualModules.length || recipe.cards));
  const cards = seed.visualModules.slice(0, count);
  const modulesText = cards
    .map((m) => `- Card ${m.num}: colored numbered header with TITLE "${m.title}" + a colorful flat Microsoft Azure icon/diagram of it + a 1-2 line legible CAPTION (don't repeat the title; teach the concept): ${m.description}`)
    .join("\n");

  const ACCENTS = ["blue", "purple", "teal", "orange", "magenta", "indigo"];
  const accentList = ACCENTS.slice(0, count).join(", ");
  const layoutHint = count <= 4
    ? `a balanced 2x2 grid of exactly 4 concept cards`
    : `a balanced 2x3 grid of ${count} concept cards (2 rows of 3${count === 5 ? ", leaving the 6th cell empty" : ""})`;

  const prompt = [
    `Upper visual block (internal concept composition) for a premium Microsoft Azure certification "Visual Atlas" study page.`,
    `Role: this is ONLY the internal ${count}-card composition, NOT a full page. A deterministic HTML page already owns the page title, domain, guide question, exam traps, autocheck, footer and page number. Do NOT draw any page header, title, footer, page number, brand, dark background, tables, exam-trap section or autocheck section. Start directly with the cards.`,
    `Topic: ${seed.title} — ${seed.subtitle}.`,
    `Compose ${layoutHint} that FILLS the frame edge to edge with only small, even safe margins — avoid any large white moat. Landscape, render size 1536x1024.`,
    variant ? VARIANT_NUDGE[variant] ?? "" : "",
    `Cards:`,
    modulesText,
    `Each card is a SELF-CONTAINED explainer with FOUR parts: (1) a COLORED rounded numbered header (a different Azure accent per card, in this order: ${accentList}) with the short TITLE in it; (2) a colorful flat MICROSOFT AZURE icon/diagram of the concept; (3) a very light tint of the card's accent as its background; (4) a 1-2 line explanatory CAPTION in dark grey that teaches the concept. Informative, vibrant and uncluttered.`,
    `TEXT QUALITY IS CRITICAL (it goes to print): every title and caption must be CRISP, large enough to read, high-contrast, and CORRECTLY SPELLED Spanish — no gibberish, no cut-off words. Keep captions to 1-2 short lines so they stay legible.`,
    `Style: a premium MICROSOFT AZURE study infographic, like a clean Microsoft Learn / Azure architecture diagram. COLORFUL but FLAT and crisp (NOT glossy, NOT 3D). Use the official AZURE VISUAL LANGUAGE: recognizable Azure-style service icons (the Azure cloud, AKS hexagon, App Service globe, Container Apps, container registry, etc.) drawn as clean flat vector with tasteful color fills. Palette: Azure blue (#0078D4) and cyan (#50E6FF) as the base, with per-card accents in this order — blue (#0078D4), purple (#7C3AED), teal (#14B8A6), orange (#F59E0B), magenta (#C026D3), indigo (#4F46E5); semantic red/green only where meaningful (never as a card accent). White page background, rounded cards with a light accent tint, thin connectors, legible labels. Vibrant, professional, Microsoft-grade — never washed-out, monochrome or grey.`,
    `Strict: FLAT vector only — NO glossy/shiny fills, NO heavy 3D gradients, NO glow/shadow/bevel, NO photographic style; colorful and clean (Azure brand palette), not neon or oversaturated; NO marketing/sales copy, NO words like "AI-200", "DOMINIO", "CloudBooks", "Visual Atlas"; NO dark page background, NO page header/footer/table. Fill the frame edge to edge.`,
  ].filter(Boolean).join("\n");

  return { prompt, promptVersion: variant ? `${CONFIG.promptVersion}-${variant}` : CONFIG.promptVersion };
}
