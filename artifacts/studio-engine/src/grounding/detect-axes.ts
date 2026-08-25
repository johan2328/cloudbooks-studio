/**
 * Detección DETERMINISTA de los ejes conceptuales de una unidad fuente (Corrida 36).
 *
 * Parsea los encabezados '##' del markdown (ingest.ts ya los preserva) y descarta el
 * "andamiaje" de plantilla de MS Learn (Additional resources, Best practices, Knowledge
 * check, Summary, Code fragment, etc.) que NO son ejes de contenido. Los '##' son
 * CANDIDATOS, no la decisión: esta función los LIMPIA para poder auditar cobertura
 * (módulos generados vs ejes reales) sin gastar LLM. No reemplaza el juicio del autor;
 * da una señal barata y reproducible para detectar sub-extracción.
 */

// Encabezados de plantilla que NO son ejes de contenido (vocabulario MS Learn, cerrado y estable).
const STOP_HEADING = /^(additional resources|summary|knowledge check|best practices|clean ?up|prerequisites?|introduction|next unit|references?|exercise|recap|review|conclusion|module complete|resumen|recursos adicionales|verificaci[oó]n de conocimientos|introducci[oó]n)\b/i;
// Los "Code fragment/sample/example" ejemplifican la sección previa: no son un eje propio.
const CODE_HEADING = /^code (fragment|sample|example)\b/i;

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, " ").trim();

export interface DetectedAxis { title: string; charLen: number }

/**
 * Devuelve los ejes de contenido de una unidad: encabezados '##' tras descartar el andamiaje
 * y el título propio de la unidad. `rawH2` es el conteo crudo (sin limpiar) para comparar.
 */
export function detectAxes(text: string, opts?: { unitTitle?: string }): { axes: DetectedAxis[]; count: number; rawH2: number } {
  const src = text ?? "";
  const titleNorm = opts?.unitTitle ? norm(opts.unitTitle) : null;
  const re = /^##\s+(.+?)\s*$/gm;
  const marks: { title: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) marks.push({ title: (m[1] ?? "").trim(), start: m.index });
  const rawH2 = marks.length;
  const axes: DetectedAxis[] = [];
  for (let i = 0; i < marks.length; i++) {
    const mark = marks[i]!;
    const title = mark.title;
    if (STOP_HEADING.test(title) || CODE_HEADING.test(title)) continue;
    // Saltar el título propio de la unidad si aparece como '##' (a veces el scrape lo deja como H2).
    if (titleNorm && norm(title) === titleNorm) continue;
    const next = marks[i + 1];
    const end = next ? next.start : src.length;
    axes.push({ title, charLen: end - mark.start });
  }
  return { axes, count: axes.length, rawH2 };
}
