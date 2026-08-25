/**
 * Contrato visual MEDIBLE (identidad como datos verificables, no prosa).
 * Estos valores se chequean contra el HTML renderizado en contract-checks.ts.
 */
export const MEASURABLE_CONTRACT = {
  version: "identity-v3-premium",
  canvas: { w: 768, h: 1152 },
  brandText: "CloudBooks",
  badge: "AI-200",
  series: "Visual Atlas",
  /** Anchos de borde permitidos (px). */
  borderWidthsPx: [1, 2],
  /** Escala tipográfica permitida (px) — ninguna fuente fuera de este set. */
  typeScalePx: [9, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14, 33],
  /** Fuente de lectura mínima (rail). */
  minReadingFontPx: 10,
  /** Título hero premium (golden master v24). */
  heroFontPx: 33,
  guideFontPx: 13,
  /** Bandas de densidad (ratio demanda/disponible). */
  railTightMax: 1.05,
  visualDenseMax: 1.05,
} as const;
