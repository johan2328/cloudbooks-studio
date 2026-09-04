/**
 * Etiqueta/orden de capítulos para la UI del estudio. El CAPÍTULO INTEGRADOR (capstone) no es un tema
 * numerado sino el proyecto de cierre de una ruta: se identifica por su ruta, no por un número (que además
 * colisiona con un capítulo real por la numeración global). Todos los listados/galerías branch por acá.
 */
export function chapIsCapstone(x: { moduleId?: string; chapterId?: string }): boolean {
  return !!x.moduleId?.startsWith("capstone-") || !!x.chapterId?.startsWith("cap-zz-capstone-");
}

/** Badge corto: "Cap 21" para los normales; "Integrador" para el integrador. */
export function chapBadge(seed: { moduleId?: string; chapterId?: string; chapterNumber?: string }): string {
  return chapIsCapstone(seed) ? "Integrador" : `Cap ${seed.chapterNumber ?? ""}`.trim();
}

/** Título largo para encabezados: "Capítulo 21" para los normales; "Proyecto integrador" para el integrador. */
export function chapTitle(seed: { moduleId?: string; chapterId?: string; chapterNumber?: string }): string {
  return chapIsCapstone(seed) ? "Proyecto integrador" : `Capítulo ${seed.chapterNumber ?? ""}`.trim();
}

/** Clave de orden global que respeta la ruta y deja al integrador ÚLTIMO dentro de su ruta.
 *  routePart.inner → los reales por su número; el integrador con "zz" cae al final de su ruta. */
export function chapSortKey(seed: { moduleId?: string; chapterId?: string; chapterNumber?: string; domainId?: string }): string {
  const m = /^p(\d+)/.exec(seed.domainId ?? "");
  const routePart = (m ? m[1] : "99").padStart(2, "0");
  const inner = chapIsCapstone(seed) ? "zz" : (seed.chapterNumber || "00").padStart(2, "0");
  return `${routePart}.${inner}`;
}
