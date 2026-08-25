import { getOutline, buildCoverage } from "../skills/ai-200-outline.js";
import { curatedSourcesFor } from "../skills/skill-sources.js";
import { listSources } from "./source-store.js";
import { allRelevance } from "./relevance-store.js";
import { listPersistedPages } from "../page-store.js";
import { isRouteLocked } from "./route-locks.js";

/**
 * ÁRBOL DE GROUNDING (backbone del panel unificado). Une, en una sola estructura
 * Ruta → Módulo → Unidad: las fuentes curadas, cuáles están ingeridas en el corpus,
 * la cobertura (páginas), el grounding y la relevancia. Reemplaza los paneles
 * sueltos Fuentes + Cobertura + Procedencia.
 *
 * El TEXTO del corpus NO viaja acá (payload): el frontend lo toma de
 * /engine/sources por URL al expandir una fuente. Acá solo va el conteo de chars.
 */
export interface TreeSource { title: string; url: string | null; chars: number; sourceId: string }
export interface TreeUnit {
  skillId: string;
  title: string;
  kind: string;
  url: string | null;            // URL oficial de la unidad
  curatedUrls: string[];          // fuentes curadas (unidad + docs)
  sources: TreeSource[];          // las que YA están en el corpus (match por URL)
  pageIds: string[];              // cobertura
  groundingStatus: string | null;
  relevanceStatus: string | null;
  relevanceGaps: string[];
  claims: { field: string; text: string; citationKind: string; quote: string }[];  // procedencia
}
export interface TreeModule { moduleId: string; moduleTitle: string; units: TreeUnit[] }
export interface TreeDomain { id: string; label: string; url: string | null; locked: boolean; modules: TreeModule[] }
export interface GroundingTree {
  domains: TreeDomain[];
  totals: { units: number; ingested: number; covered: number; verified: number; sufficient: number; thin: number; offTopic: number; sinEvaluar: number };
}

const norm = (u: string | null | undefined) => (u ?? "").trim().replace(/\/+$/, "");

export function buildGroundingTree(): GroundingTree {
  const outline = getOutline();
  const cov = buildCoverage();
  const pagesBySkill = new Map(cov.skills.map((s) => [s.skillId, s.pageIds]));
  const srcByUrl = new Map(listSources().filter((s) => s.url).map((s) => [norm(s.url), s]));
  // Leer los stores UNA vez (antes getProvenance/getRelevanceBySkill re-leían su archivo por
  // skill → O(n²): ~98 lecturas de cada store, ~3s con el libro completo).
  const provById = new Map(listPersistedPages().map((p) => [p.seed.pageId, p.provenance]));
  const relAll = allRelevance();

  const totals = { units: 0, ingested: 0, covered: 0, verified: 0, sufficient: 0, thin: 0, offTopic: 0, sinEvaluar: 0 };

  const domains: TreeDomain[] = outline.domains.map((d) => {
    const modMap = new Map<string, TreeModule>();
    for (const skill of d.skills) {
      const mid = skill.moduleId ?? d.id;
      let mod = modMap.get(mid);
      if (!mod) { mod = { moduleId: mid, moduleTitle: skill.moduleTitle ?? mid, units: [] }; modMap.set(mid, mod); }

      const curatedUrls = curatedSourcesFor(skill.id);
      const sources: TreeSource[] = curatedUrls
        .map((u) => srcByUrl.get(norm(u)))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .map((s) => ({ title: s.title, url: s.url, chars: (s.text ?? "").length, sourceId: s.id }));
      const pageIds = pagesBySkill.get(skill.id) ?? [];
      const firstPage = pageIds[0];
      const prov = firstPage ? (provById.get(firstPage) ?? null) : null;
      const groundingStatus = firstPage ? (prov?.groundingStatus ?? "seeded") : null;
      const claims = (prov?.claims ?? []).map((c) => ({ field: c.field, text: c.text, citationKind: c.citation.kind, quote: c.citation.quote }));
      const rel = relAll[skill.id] ?? null;

      totals.units++;
      if (sources.length) totals.ingested++;
      if (pageIds.length) totals.covered++;
      if (groundingStatus === "verified") totals.verified++;
      if (rel?.status === "sufficient") totals.sufficient++;
      else if (rel?.status === "thin") totals.thin++;
      else if (rel?.status === "off_topic") totals.offTopic++;
      else totals.sinEvaluar++;

      mod.units.push({
        skillId: skill.id, title: skill.title, kind: skill.kind ?? "concept", url: skill.url ?? null,
        curatedUrls, sources, pageIds, groundingStatus, claims,
        relevanceStatus: rel?.status ?? null, relevanceGaps: rel?.gaps ?? [],
      });
    }
    return { id: d.id, label: d.label, url: d.url ?? null, locked: isRouteLocked(d.id), modules: [...modMap.values()] };
  });

  return { domains, totals };
}
