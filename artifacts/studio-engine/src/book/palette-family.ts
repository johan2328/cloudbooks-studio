import { getBookConfig, saveBookConfig, type BookStyle } from "./book-config.js";
import { FAMILY_PALETTES, paletteFor } from "./palette-defs.js";

/**
 * AGENTE DE PALETA de la familia (cross-cert). Propone una paleta por formato desde una
 * FAMILIA CANÓNICA (de los ejemplos aprobados): misma identidad de marca, varianza por
 * gradiente accent→accent2. Convergencia (misma estructura) + complementariedad (color
 * distinto por libro). El usuario aprueba; se aplica al `cfg.style` del libro activo y
 * fluye aguas abajo (portada, abre-partes, divisores, matter). Las definiciones viven en
 * `palette-defs.ts` (hoja) para que book-config las use en la auto-paleta perezosa sin ciclo.
 */
const LABELS: Record<string, string> = {
  "visual-atlas": "Visual Atlas", "master-book": "Master Book", "exam-traps": "Exam Traps Guide",
  "question-bank": "Question Bank", "cheat-sheets": "Cheat Sheets", "rapid-review": "Rapid Review",
};

export { FAMILY_PALETTES, paletteFor };
export interface FamilyPaletteProposal { format: string; label: string; style: BookStyle; gradient: string }

/** Propuesta de la familia completa (para aprobar en la sección cross). */
export function proposeFamilyPalettes(): FamilyPaletteProposal[] {
  return Object.entries(FAMILY_PALETTES).map(([format, style]) => ({
    format, label: LABELS[format] ?? format, style, gradient: `${style.accent} → ${style.accent2}`,
  }));
}

/** Aplica una paleta al LIBRO ACTIVO (cfg.style + cfg.cover.palette) → fluye aguas abajo. */
export async function applyActiveBookPalette(style: BookStyle): Promise<BookStyle> {
  const cur = getBookConfig();
  await saveBookConfig({ style, cover: { ...cur.cover, palette: [style.bg, style.accent, style.accent2, style.text, style.onDark] } });
  return style;
}
