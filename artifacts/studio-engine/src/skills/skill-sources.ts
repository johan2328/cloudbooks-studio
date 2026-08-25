import { listSources } from "../grounding/source-store.js";
import { ingestUrl } from "../grounding/ingest.js";
import { getExtraSources } from "../grounding/extra-sources.js";
import { getOutline } from "./ai-200-outline.js";

/**
 * GESTOR DE FUENTES POR SKILL (regla anticipatoria, no parche).
 *
 * Las fuentes curadas de cada skill (módulo oficial) son: su PÁGINA DE MÓDULO en
 * MS Learn (de la taxonomía oficial) + docs de producto EXTRA cuando las tenemos.
 * Antes de redactar, el motor auto-ingiere las que falten → el autor siempre tiene
 * de dónde anclar. El humano queda para lo puntual (aprobar), no para alimentar
 * fuentes a mano. Ingesta tolerante: si una URL falla, se saltea sin romper.
 *
 * Hoy la Ruta 1 (ACR) está ricamente curada (es la que cubre el Visual Atlas);
 * el resto arranca con su página de módulo, y el agente Buscador la enriquece.
 */
// Docs de producto EXTRA por MÓDULO (además de la página oficial de la unidad).
/**
 * Docs complementarios EXTRA por **UNIDAD** (keyed por skillId, NO por módulo):
 * solo fuentes específicas de ESA unidad. Vacío por default — la fuente canónica
 * es la PÁGINA DE LA UNIDAD; si una unidad queda fina, el Buscador agrega docs
 * específicos validados por relevancia (no el combo del módulo, que ensucia la
 * auditoría por unidad).
 */
/** Fuentes curadas de la unidad: su página oficial (canónica) + extras por-unidad (Buffer 2, store persistido). */
export function curatedSourcesFor(skillId: string): string[] {
  const skill = getOutline().domains.flatMap((d) => d.skills).find((s) => s.id === skillId);
  if (!skill) return [];
  const unitUrl = skill.url ? [skill.url] : [];
  const extra = getExtraSources(skillId);   // Buffer 2: enlaces complementarios curados, por UNIDAD (skillId)
  return [...unitUrl, ...extra];
}

/** ¿La skill tiene fuentes curadas? (para anticipar cobertura antes de gastar). */
export function hasMappedSources(skillId: string): boolean {
  return curatedSourcesFor(skillId).length > 0;
}

export interface EnsureSourcesResult {
  skillId: string;
  ingested: string[];   // títulos ingeridos esta vez
  alreadyHad: number;   // mapeadas que ya estaban
  mapped: number;       // URLs mapeadas para la skill
}

/**
 * Asegura en el corpus las fuentes curadas de la skill: ingiere las que faltan
 * (por URL), saltea las que ya están. Tolerante a fallas de red.
 */
export async function ensureSkillSources(skillId: string): Promise<EnsureSourcesResult> {
  const urls = curatedSourcesFor(skillId);
  const result: EnsureSourcesResult = { skillId, ingested: [], alreadyHad: 0, mapped: urls.length };
  if (urls.length === 0) return result;

  const have = new Set(listSources().map((s) => (s.url ?? "").replace(/\/+$/, "")));
  for (const url of urls) {
    if (have.has(url.replace(/\/+$/, ""))) { result.alreadyHad++; continue; }
    // Reintento con backoff: MS Learn rate-limita ráfagas (422/connection). Sin esto, una
    // fuente que falla queda fuera del corpus → su unidad se contamina con el global. Robusto.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await ingestUrl(url, "mslearn");
        if (r.ok && r.source) { result.ingested.push(r.source.title); break; }
      } catch { /* sigue al reintento */ }
      if (attempt < 2) await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    }
  }
  return result;
}

/**
 * Pre-puebla el corpus con las páginas canónicas de TODAS las unidades del dominio,
 * ANTES de autorar la primera. Necesario para que el filtro por módulo del autor
 * (`relevantSources`) siempre encuentre los hermanos del módulo y no caiga al corpus
 * global (que contamina). Idempotente (saltea las ya ingeridas). Throttle suave para
 * no gatillar el rate-limit de MS Learn en ráfagas. Tolerante a red.
 */
export async function ensureDomainSources(domainId: string): Promise<{ domainId: string; ingested: number; total: number }> {
  const domain = getOutline().domains.find((d) => d.id === domainId);
  const skills = domain?.skills ?? [];
  let ingested = 0;
  for (const s of skills) {
    const r = await ensureSkillSources(s.id);
    ingested += r.ingested.length;
    if (r.ingested.length) await new Promise((res) => setTimeout(res, 600)); // throttle solo si fetcheó
  }
  return { domainId, ingested, total: skills.length };
}
