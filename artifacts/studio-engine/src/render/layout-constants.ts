import type { RailMode } from "../types.js";

export const PAGE_W = 768;
export const PAGE_H = 1152;
// Cintillos al estilo golden master v24: topbar 34 · hero 170 · guía 42 · footer 34.
export const TOPBAR_H = 34;
export const HERO_H = 170;
export const GUIDE_H = 42;
export const FOOTER_H = 34;
export const CHROME = TOPBAR_H + HERO_H + GUIDE_H + FOOTER_H; // 280
export const BODY_H = PAGE_H - CHROME; // 872

export function railTokens(mode: RailMode): { font: number; gap: number; pad: number; lead: number } {
  if (mode === "compact") return { font: 10, gap: 4, pad: 8, lead: 1.25 };
  if (mode === "dense") return { font: 12.5, gap: 9, pad: 13, lead: 1.4 };
  return { font: 11.5, gap: 7, pad: 11, lead: 1.35 };
}
