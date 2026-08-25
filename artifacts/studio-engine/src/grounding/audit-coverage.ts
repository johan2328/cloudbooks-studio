/**
 * Auditoría de COBERTURA de módulos (Corrida 36): por cada página persistida, compara
 * cuántos visualModules tiene vs cuántos ejes reales de contenido tiene su unidad fuente
 * (vía detectAxes, determinista, sin LLM). Sirve para dimensionar la sub-extracción
 * (cuántas láminas quedaron cortas por el truncado del corpus) antes de remediar.
 * Solo lectura; no gasta tokens.
 */
import { listPersistedPages } from "../page-store.js";
import { getSkill } from "../skills/ai-200-outline.js";
import { listSources } from "./source-store.js";
import { detectAxes } from "./detect-axes.js";

const normUrl = (u?: string | null): string => ((u ?? "").split("?")[0] ?? "").replace(/\/+$/, "").toLowerCase();

export interface CoverageRow {
  pageId: string; pageNumber: string; skillId: string; title: string;
  modules: number; axes: number; rawH2: number; axisTitles: string[]; sourceFound: boolean;
  gap: number; underExtracted: boolean;
}

/** `underExtracted` = la unidad tiene al menos 2 ejes más que módulos generados (señal de sub-extracción). */
export function auditCoverage(): { rows: CoverageRow[]; underExtracted: number; noSource: number; total: number } {
  const byUrl = new Map(listSources().map((s) => [normUrl(s.url), s]));
  const rows: CoverageRow[] = [];
  for (const p of listPersistedPages()) {
    const skillId = p.seed.skillIds?.[0] ?? "";
    const skill = getSkill(skillId);
    const modules = p.seed.visualModules?.length ?? 0;
    const src = skill?.url ? byUrl.get(normUrl(skill.url)) : undefined;
    const det = src ? detectAxes(src.text ?? "", { unitTitle: skill?.title }) : { axes: [], count: 0, rawH2: 0 };
    const gap = det.count - modules;
    rows.push({
      pageId: p.seed.pageId, pageNumber: p.seed.pageNumber, skillId, title: p.seed.title,
      modules, axes: det.count, rawH2: det.rawH2, axisTitles: det.axes.map((a) => a.title),
      sourceFound: !!src, gap, underExtracted: !!src && gap >= 2,
    });
  }
  rows.sort((a, b) => a.pageId.localeCompare(b.pageId));
  return {
    rows,
    underExtracted: rows.filter((r) => r.underExtracted).length,
    noSource: rows.filter((r) => !r.sourceFound).length,
    total: rows.length,
  };
}
