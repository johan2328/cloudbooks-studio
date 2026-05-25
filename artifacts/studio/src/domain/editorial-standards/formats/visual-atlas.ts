import { FORMAT_CONTRACTS } from "../data";
import type { FormatContract } from "../types";

/**
 * Contrato de formato Visual Atlas v24.
 * Fuente de verdad para el renderer, la generación y QA.
 * Layout: 768×1152 px, 5 zonas determinísticas, upper visual gpt-image-2 medium.
 */
export const VISUAL_ATLAS_FORMAT: FormatContract = FORMAT_CONTRACTS.find(
  f => f.slug === "visual-atlas",
)!;

export { FORMAT_CONTRACTS };
