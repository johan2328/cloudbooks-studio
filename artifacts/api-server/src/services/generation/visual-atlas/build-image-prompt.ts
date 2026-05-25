import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";

/**
 * Construye el prompt de imagen para el bloque visual superior.
 * Parametrizado desde VisualAtlasPageData — sin strings hardcodeados por página.
 * Cada seed define sus módulos; este builder los serializa de forma genérica.
 */
export function buildImagePrompt(data: VisualAtlasPageData): string {
  const modulesText = data.visualModules
    .map(m => `Module ${m.num}: ${m.title} — ${m.description}`)
    .join(". ");

  return `Light editorial Azure certification atlas upper block, white background, professional technical infographic, ${data.visualModules.length} numbered modules, fits 728x494 landscape area, ${data.domainLabel} theme. ${modulesText}. Clean Azure-like vector iconography, navy/blue/teal/orange accents, sparse readable Spanish labels, premium book infographic style. No dark background, no dashboard UI, no tiny dense tables, no traps section, no autocheck section, no footer, no full page, no marketing hero.`;
}
