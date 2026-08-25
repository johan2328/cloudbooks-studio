import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * BUFFER 2 — enlaces COMPLEMENTARIOS curados por UNIDAD (skillId → URLs de docs de producto autoritativos,
 * extraídos de la página de la unidad de MS Learn y CURADOS: no todos los enlaces sirven). Per-cert
 * (`_extra-sources.{certId}.json`). Los consume `skill-sources.curatedSourcesFor()` (se ingieren como el resto
 * del corpus) y `scopedCorpus` los incluye aunque su URL no matchee el slug del módulo (son docs de producto,
 * no páginas /modules/). Reemplaza al hook `EXTRA_SOURCES` vacío en código por un store persistido y editable.
 */
function storePath(): string {
  return path.join(CONFIG.outputRoot, `_extra-sources.${CONFIG.certId}.json`);
}
function loadAll(): Record<string, string[]> {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, string[]>; } catch { return {}; }
}

/** URLs complementarias curadas de una unidad (vacío si no hay). */
export function getExtraSources(skillId: string): string[] {
  return loadAll()[skillId] ?? [];
}

/** Todo el store (para inspección / paneles). */
export function allExtraSources(): Record<string, string[]> {
  return loadAll();
}

/** Setea (MERGE) los extras curados: `map` = {skillId: [urls]}. Dedup + trim; lista vacía borra la entrada. */
export function setExtraSources(map: Record<string, string[]>): Record<string, string[]> {
  const all = loadAll();
  for (const [sid, urls] of Object.entries(map)) {
    const clean = [...new Set((Array.isArray(urls) ? urls : []).map((u) => String(u).trim()).filter(Boolean))];
    if (clean.length) all[sid] = clean; else delete all[sid];
  }
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "extra-sources");
  return all;
}
