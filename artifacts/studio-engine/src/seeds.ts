import type { PageSeed } from "./types.js";
import { getPersistedPage, listPersistedPages } from "./page-store.js";

/**
 * YA NO hay seeds estáticas ni ids reservados. Todas las páginas nacen del
 * grounding (autoría anclada → `persistAuthored`) y se numeran por su unidad del
 * temario (`pageNumberForSkill`): página 01 = primera unidad. El catálogo y la
 * generación leen directamente las páginas persistidas.
 */
export const SEEDS: PageSeed[] = [];

export function listSeeds(): PageSeed[] {
  return listPersistedPages().map((p) => p.seed);
}

export function getSeed(pageId: string): PageSeed | null {
  return getPersistedPage(pageId)?.seed ?? null;
}
