import { listSources } from "./source-store.js";
import { ensureSkillSources } from "../skills/skill-sources.js";
import { getExtraSources } from "./extra-sources.js";
import { getSkill } from "../skills/ai-200-outline.js";
import { hardFactsSource } from "../skills/domain-facts.js";
import type { Source } from "../types.js";

/** Slug del módulo desde la url de la fuente/skill (`/modules/<slug>`). Criterio único de scope. */
export function moduleSlugOf(url?: string | null): string {
  const m = (url ?? "").match(/\/modules\/([^/]+)/);
  return m ? m[1]! : "";
}

/** Slugs de módulo de un conjunto de skills (ancla de scope compartida). */
export function moduleSlugsFor(skillIds: string[]): Set<string> {
  return new Set(skillIds.map((id) => moduleSlugOf(getSkill(id)?.url)).filter(Boolean));
}

/**
 * CORPUS DEL MÓDULO — helper ÚNICO que reemplaza las 4 copias casi idénticas (autor/enrich/verify/lámina).
 * Asienta las fuentes de las skills, filtra el corpus por el slug de módulo, y ANTEPONE la hoja de datos
 * duros curada (si hay) como fuente sintética → autor, enriquecedor y verificador ven EXACTAMENTE la misma
 * ancla de exactitud. `limit` recorta las fuentes MS Learn (los hechos duros NO cuentan para el límite y van
 * primero, por prioridad). Devuelve [] si el módulo no tiene fuentes (el caller decide el fallback global).
 */
export async function scopedCorpus(skillIds: string[], opts: { limit?: number } = {}): Promise<Source[]> {
  for (const sid of skillIds) { try { await ensureSkillSources(sid); } catch { /* sigue con lo que haya */ } }
  const slugs = moduleSlugsFor(skillIds);
  // Buffer 2: los docs de producto complementarios (extra-sources) viven en OTRA ruta que /modules/ → hay que
  // incluirlos explícitamente o quedarían fuera del scope. SOLO los extras (la unidad ya matchea el slug);
  // si no hay extras, el filtro y el orden quedan EXACTAMENTE como antes (AI-200 idéntico).
  const norm = (u?: string | null): string => (u ?? "").replace(/\/+$/, "");
  const extras = new Set(skillIds.flatMap((id) => getExtraSources(id)).map(norm));
  const scoped = listSources().filter((s) => slugs.has(moduleSlugOf(s.url)) || (extras.size > 0 && extras.has(norm(s.url))));
  // Prioriza los docs complementarios (Buffer 2) antes de recortar por límite: son fuente autoritativa. Sort estable → sin extras, no reordena.
  if (extras.size > 0) scoped.sort((a, b) => Number(extras.has(norm(b.url))) - Number(extras.has(norm(a.url))));
  const limited = opts.limit && scoped.length > opts.limit ? scoped.slice(0, opts.limit) : scoped;
  const facts = hardFactsSource(slugs);
  return facts ? [facts, ...limited] : limited;
}
