import fs from "node:fs";
import path from "node:path";
import { atomicWriteFileSync } from "./fs-safe.js";
import { pinCurrentBook } from "./book-context.js";

/**
 * LIBRO ACTIVO — sobre qué (cert + formato) opera el motor AHORA MISMO.
 *
 * Estado REAL y persistido (`_active-book.json`): activar un libro en la biblioteca
 * reencamina TODO `/engine/*` (rutas de salida, book-config, catálogo). Reemplaza
 * los literales `CONFIG.certId/format`, que ahora son getters que leen este store.
 *
 * `outputRoot` se pasa por parámetro a propósito: NO importa config.ts, para evitar
 * el ciclo config↔active-book (config.ts sí importa esto en sus getters).
 * Default seguro = ai-200/visual-atlas → el Atlas se comporta idéntico si nadie cambió nada.
 */
export interface ActiveBook { certId: string; format: string }

const DEFAULT_ACTIVE: ActiveBook = { certId: "ai-200", format: "visual-atlas" };

let cached: ActiveBook | null = null;

function storePath(outputRoot: string): string {
  return path.join(outputRoot, "_active-book.json");
}

/** Lee el libro activo (cacheado en memoria; disco solo la 1ª vez). */
export function getActiveBook(outputRoot: string): ActiveBook {
  if (cached) return cached;
  try {
    const raw = JSON.parse(fs.readFileSync(storePath(outputRoot), "utf8")) as Partial<ActiveBook>;
    cached = { certId: raw.certId || DEFAULT_ACTIVE.certId, format: raw.format || DEFAULT_ACTIVE.format };
  } catch {
    cached = { ...DEFAULT_ACTIVE };
  }
  return cached;
}

/** Setea el libro activo (persistido + cache). Lo llama la activación de la biblioteca. */
export function setActiveBook(outputRoot: string, next: ActiveBook): ActiveBook {
  cached = { certId: next.certId, format: next.format };
  atomicWriteFileSync(storePath(outputRoot), JSON.stringify(cached, null, 2), "active-book");
  // Si estamos dentro de un request con libro fijado (ALS), actualizar SU pin: el mutador
  // (switch/activate) debe ver su propio cambio; los otros requests en vuelo quedan intactos.
  pinCurrentBook(cached);
  return cached;
}
