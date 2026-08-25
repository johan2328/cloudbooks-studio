import { readFileSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile } from "../fs-safe.js";

/**
 * CONTRATO DE IMÁGENES DEL RELATO — cómo se crean las FIGURAS que se suman al Master Book
 * (diagramas complementarios de cada capítulo). Nivel COLECCIÓN (la cert). Complementa al
 * contrato de Matter (tipografía): éste gobierna el ARTE de las figuras del relato — estilo,
 * fuente de paleta, tamaño, cantidad y complejidad. Lo consume `chapter-graphics.ts`.
 */
export interface ImageContract {
  figureStyle: string;          // dirección de arte (una frase): p.ej. "vector plano 2D, un diagrama sobrio por figura"
  paletteSource: "cover" | "fixed"; // "cover" = deriva de la tapa (BookConfig.style); "fixed" = navy/azul de marca
  figureSize: string;           // tamaño image-2 (ej. "1536x1024" apaisado, "1024x1536" retrato)
  maxFiguresPerChapter: number; // tope de figuras por capítulo (parquedad)
  maxElements: number;          // tope de elementos etiquetados por figura (complejidad)
  anchorConsistency: boolean;   // anclar todas las figuras a un estilo maestro para consistencia
}

export const DEFAULT_IMAGE_CONTRACT: ImageContract = {
  figureStyle: "Vector plano 2D editorial: UN diagrama esquemático sobrio por figura, sin fotos ni 3D ni sombras.",
  paletteSource: "cover",
  figureSize: "1536x1024",
  maxFiguresPerChapter: 2,
  maxElements: 6,
  anchorConsistency: true,
};

// Colección = la cert → un archivo POR CERT (`_image-contract.{certId}.json`); AB-620 arranca del default.
// Revert con ENGINE_PERCERT_STORES=off. Migración one-time: el override legacy es de AI-200 → copiarlo.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_FILE = (): string => path.join(CONFIG.outputRoot, `_image-contract.json`);
const FILE = (): string => PERCERT_STORES ? path.join(CONFIG.outputRoot, `_image-contract.${CONFIG.certId}.json`) : LEGACY_FILE();
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200") return;
  const p = FILE();
  if (existsSync(p) || !existsSync(LEGACY_FILE())) return;
  try { copyFileSync(LEGACY_FILE(), p); } catch { /* best-effort */ }
}

export function getImageContract(): ImageContract {
  ensureMigrated();
  try {
    if (existsSync(FILE())) return { ...DEFAULT_IMAGE_CONTRACT, ...(JSON.parse(readFileSync(FILE(), "utf8")) as Partial<ImageContract>) };
  } catch { /* corrupto → default */ }
  return { ...DEFAULT_IMAGE_CONTRACT };
}

export async function saveImageContract(patch: Partial<ImageContract>): Promise<ImageContract> {
  const next = { ...getImageContract(), ...patch };
  await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "image-contract");
  return next;
}
