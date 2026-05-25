import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";

/**
 * Construye el prompt del upper visual.
 * La imagen es un asset modular, no una pagina completa: el HTML gobierna
 * titulo, contexto, pregunta guia, trampas, autocheck y footer.
 */
export function buildImagePrompt(data: VisualAtlasPageData): string {
  const modulesText = data.visualModules
    .map((m) => `${m.num}. ${m.title}: ${m.description}`)
    .join("\n");

  return `Create ONLY the modular upper visual asset for a premium certification book page.

Canvas and composition:
- Landscape technical infographic asset, designed to be placed inside an existing HTML slot.
- Target visible slot is 728x494 px; keep all important content inside a safe margin.
- White background, no outer page frame, no hero layout, no footer.
- Use exactly ${data.visualModules.length} internal modules/cards arranged as a balanced 2x2 grid.
- Each internal card may have a small number badge (${data.visualModules.map((m) => m.num).join(", ")}) and a short module title.
- The asset must begin directly with the 2x2 module grid. Do not add any global header band above it.

Hard prohibitions:
- Do NOT write "${data.title}", "${data.subtitle}", "${data.domainLabel}", "AI-200", "Azure Certification Atlas", "Visual Study Atlas", "DOMINIO", page numbers, book title, certification title, topbar, footer, traps, autocheck, exam question, or any whole-page heading.
- Do NOT create a full infographic page inside the image.
- Do NOT include large title typography outside the internal cards.
- Do NOT add dark backgrounds, dashboard UI, marketing hero art, dense tiny tables, or decorative title banners.

Visual style:
- Premium editorial technical diagram, clean Azure-like vector iconography, navy/blue/teal accents with restrained orange/red only when semantically useful.
- Similar icon family across all cards: flat technical line icons, no 3D, no glossy app icons, no random illustration styles.
- Sparse readable Spanish labels only where needed inside cards; prioritize diagrams, arrows, mini decision flows, maps, role badges, and callout chips.
- Card borders should be light and quiet, with white card backgrounds and soft separators.

Internal card content:
${modulesText}`;
}
