import { readFileSync, existsSync, copyFileSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile } from "../fs-safe.js";

/**
 * CONTRATO VISUAL DE MATTER — nivel COLECCIÓN (reproducible entre libros de la
 * misma cert). Fija la TIPOGRAFÍA y estructura del front/back matter (portada,
 * índice, secciones, tablas) para que TODOS los libros de la colección se vean
 * iguales. El COLOR queda por libro (de la tapa, en BookConfig.style). Vive en la
 * sección Contrato, no en Ensamblar libro (que es per-libro y solo consume esto).
 */
export interface MatterContract {
  fontFamily: string;   // familia tipográfica de todo el matter
  titleSize: number;    // portada (cv-title)
  h1Size: number;       // títulos de sección
  h2Size: number;       // subtítulos
  bodySize: number;     // párrafos
  lineHeight: number;   // interlínea del cuerpo
  tocSize: number;      // índice
  tableSize: number;    // tablas (mapeo de dominios)
}

export const DEFAULT_MATTER: MatterContract = {
  // SANS (Segoe UI, fuente del sistema → se embebe en el PDF) para títulos/estructura;
  // el CUERPO de prosa va en SERIF (Georgia, también del sistema) por CSS. Ambas embeben confiable.
  fontFamily: `"Segoe UI", system-ui, -apple-system, Arial, sans-serif`,
  titleSize: 34, h1Size: 26, h2Size: 18, bodySize: 13.5, lineHeight: 1.6, tocSize: 12.5, tableSize: 11.5,
};

// Colección = la cert → un archivo POR CERT (`_matter-contract.{certId}.json`); AB-620 arranca del default.
// Revert con ENGINE_PERCERT_STORES=off. Migración one-time: el override legacy es de AI-200 → copiarlo.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
const LEGACY_FILE = (): string => path.join(CONFIG.outputRoot, `_matter-contract.json`);
const FILE = (): string => PERCERT_STORES ? path.join(CONFIG.outputRoot, `_matter-contract.${CONFIG.certId}.json`) : LEGACY_FILE();
function ensureMigrated(): void {
  if (!PERCERT_STORES || CONFIG.certId !== "ai-200") return;
  const p = FILE();
  if (existsSync(p) || !existsSync(LEGACY_FILE())) return;
  try { copyFileSync(LEGACY_FILE(), p); } catch { /* best-effort */ }
}

export function getMatterContract(): MatterContract {
  ensureMigrated();
  try {
    if (existsSync(FILE())) return { ...DEFAULT_MATTER, ...(JSON.parse(readFileSync(FILE(), "utf8")) as Partial<MatterContract>) };
  } catch { /* corrupto → default */ }
  return { ...DEFAULT_MATTER };
}

export async function saveMatterContract(patch: Partial<MatterContract>): Promise<MatterContract> {
  const next = { ...getMatterContract(), ...patch };
  await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "matter-contract");
  return next;
}
