import type { BookStyle } from "./book-config.js";

/**
 * DEFINICIONES DE PALETA (módulo hoja, sin imports de runtime → lo puede usar book-config
 * sin ciclo). Familia canónica POR FORMATO: misma identidad, gradiente accent→accent2
 * distinto por libro. `book-config` la usa para la auto-paleta perezosa; `palette-family`
 * la re-exporta y agrega el aplicador.
 */
export const FAMILY_PALETTES: Record<string, BookStyle> = {
  "visual-atlas":  { bg: "#061B49", accent: "#2563EB", accent2: "#0E8A9E", text: "#0F1B3D", onDark: "#FFFFFF" }, // navy/azul → teal
  "master-book":   { bg: "#0B2E2A", accent: "#0E8A6E", accent2: "#3FA34D", text: "#0F1B3D", onDark: "#FFFFFF" }, // teal → verde
  "master-book-ab":{ bg: "#0B2E2A", accent: "#0E8A6E", accent2: "#3FA34D", text: "#0F1B3D", onDark: "#FFFFFF" }, // sombra del master-book (PoC) → MISMA marca verde
  "cheat-sheets":  { bg: "#3A0E2E", accent: "#C0246B", accent2: "#E8620C", text: "#0F1B3D", onDark: "#FFFFFF" }, // magenta → naranja
  "exam-traps":    { bg: "#171B4A", accent: "#3B4FD6", accent2: "#7C3AED", text: "#0F1B3D", onDark: "#FFFFFF" }, // azul → violeta
  "question-bank": { bg: "#3A0E1E", accent: "#B0185A", accent2: "#D7322A", text: "#0F1B3D", onDark: "#FFFFFF" }, // magenta → rojo
  "rapid-review":  { bg: "#3A2A0E", accent: "#B8860B", accent2: "#E8820C", text: "#0F1B3D", onDark: "#FFFFFF" }, // ámbar → naranja
};

/** Paleta canónica de un formato (fallback a la del Atlas). */
export function paletteFor(format: string): BookStyle {
  return FAMILY_PALETTES[format] ?? FAMILY_PALETTES["visual-atlas"]!;
}
