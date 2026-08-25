import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile } from "../fs-safe.js";

/**
 * CONTRATO DE MARCA de las páginas de IMAGEN del Master Book (portadilla de capítulo +
 * hoja de ruta / abre-parte). Fija los HEX de identidad para que sean REPRODUCIBLES y NO
 * driften con la paleta del libro (`BookConfig.style.accent`, que flipa azul/verde vía
 * auto-paleta o palette-apply). Los generadores de portadilla/hoja-de-ruta leen ESTE
 * contrato, no `style.accent`. Vive en la sección Contrato. Por cert+formato (flip-safe).
 */
export interface BrandContract {
  dividerAccentHex: string;    // portadilla: eyebrow "CAPÍTULO" + regla + hebras de olas + pie "{code}"
  dividerNavyHex: string;      // portadilla: caja del número + título
  dividerCanvasHex: string;    // portadilla: fondo near-white
  dividerWaveBaseHex: string;  // portadilla: color base de las olas
  partBgHex: string;           // hoja de ruta: fondo oscuro full-bleed
  partAccentHex: string;       // hoja de ruta: eyebrow "RUTA" + regla + "EN ESTA RUTA" + pie
  partAccent2Hex: string;      // hoja de ruta: glow de las olas
}

export const DEFAULT_BRAND: BrandContract = {
  dividerAccentHex: "#0E8A6E",   // verde master-book (marca elegida, congelada)
  dividerNavyHex: "#021C38",
  dividerCanvasHex: "#F5F5F5",
  dividerWaveBaseHex: "#C8D9E8",
  partBgHex: "#021C38",
  partAccentHex: "#0E8A6E",
  partAccent2Hex: "#7DD3FC",
};

// Por cert+formato (como book-config): las portadillas viven en el master-book de cada cert.
const FILE = (): string => path.join(CONFIG.outputRoot, `_brand-contract.${CONFIG.certId}.${CONFIG.format}.json`);

export function getBrandContract(): BrandContract {
  try {
    if (existsSync(FILE())) return { ...DEFAULT_BRAND, ...(JSON.parse(readFileSync(FILE(), "utf8")) as Partial<BrandContract>) };
  } catch { /* corrupto → default */ }
  return { ...DEFAULT_BRAND };
}

export async function saveBrandContract(patch: Partial<BrandContract>): Promise<BrandContract> {
  const next = { ...getBrandContract(), ...patch };
  await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "brand-contract");
  return next;
}
