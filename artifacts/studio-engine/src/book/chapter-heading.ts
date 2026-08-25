import { getOutline } from "../skills/ai-200-outline.js";

/**
 * ENCABEZADO DE DISPLAY DE UN CAPÍTULO. Los capítulos normales llevan número global ("Capítulo 21");
 * el CAPÍTULO INTEGRADOR (capstone) NO es un tema numerado sino el PROYECTO DE CIERRE de una ruta:
 * con numeración global cualquier número colisiona, así que no lleva número de capítulo — su portadilla
 * y su fila de índice se identifican por la RUTA que cierra ("Ruta N · Proyecto integrador").
 * Todos los consumidores (divisor, portadilla, TOC, part-opener, ficha, preview, panel) branch por acá.
 */
export function isCapstoneSeed(seed: { moduleId: string }): boolean {
  return seed.moduleId.startsWith("capstone-");
}

/** Número de la ruta (1..N) de un dominio; "" si no se encuentra. */
export function routeNumOf(domainId: string): string {
  const d = getOutline().domains.find((x) => x.id === domainId);
  return d ? String(d.num) : "";
}

export interface ChapterHeading {
  isCapstone: boolean;
  kicker: string;    // "CAPÍTULO 21" | "RUTA 8"      (palabra + número de la portadilla)
  badge: string;     // "21" | "PROYECTO INTEGRADOR"  (lo que va en la caja/píldora de la portadilla)
  label: string;     // "Capítulo 21" | "Proyecto integrador"  (índice/listas)
  tocLabel: string;  // "Capítulo 21 · <título>" | "Proyecto integrador · <título>"
}

export function chapterHeading(seed: { moduleId: string; domainId: string; chapterNumber: string; title: string }): ChapterHeading {
  if (isCapstoneSeed(seed)) {
    const rn = routeNumOf(seed.domainId);
    // El título del capstone suele empezar con "Proyecto integrador:" → sin des-duplicar, el tocLabel repetiría
    // "Proyecto integrador · Proyecto integrador: …" (feo + alarga la fila a 2 líneas → desborde del índice).
    const t = seed.title.replace(/^\s*proyecto integrador\s*[:·—–-]?\s*/i, "").trim();
    return {
      isCapstone: true,
      kicker: rn ? `RUTA ${rn}` : "RUTA",
      badge: "PROYECTO INTEGRADOR",
      label: "Proyecto integrador",
      tocLabel: `Proyecto integrador · ${t || seed.title}`,
    };
  }
  const n = seed.chapterNumber;
  return {
    isCapstone: false,
    kicker: `CAPÍTULO ${n}`,
    badge: n,
    label: `Capítulo ${n}`,
    tocLabel: `Capítulo ${n} · ${seed.title}`,
  };
}
