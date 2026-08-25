import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile } from "../fs-safe.js";

/**
 * POOL DE ETIQUETAS/CATEGORÍAS de la COLECCIÓN (la cert) — reutilizables entre sus 6 libros.
 * Definís una etiqueta en un libro, la guardás en la colección y aparece como sugerencia en los
 * demás → consistencia de categorías/tags en toda la familia. Un archivo por cert (namespaced).
 */
export interface CollectionTags { categories: string[]; tags: string[] }

const FILE = (): string => path.join(CONFIG.outputRoot, `_collection-tags.${CONFIG.certId}.json`);
const uniq = (a: string[]): string[] => [...new Set(a.map(s => s.trim()).filter(Boolean))];

export function getCollectionTags(): CollectionTags {
  try {
    if (existsSync(FILE())) { const j = JSON.parse(readFileSync(FILE(), "utf8")) as Partial<CollectionTags>; return { categories: uniq(j.categories ?? []), tags: uniq(j.tags ?? []) }; }
  } catch { /* corrupto → vacío */ }
  return { categories: [], tags: [] };
}

/** Suma (unión, sin duplicados) categorías/tags al pool de la colección. */
export async function addCollectionTags(patch: { categories?: string[]; tags?: string[] }): Promise<CollectionTags> {
  const cur = getCollectionTags();
  const next: CollectionTags = {
    categories: uniq([...cur.categories, ...(patch.categories ?? [])]),
    tags: uniq([...cur.tags, ...(patch.tags ?? [])]),
  };
  await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "collection-tags");
  return next;
}
