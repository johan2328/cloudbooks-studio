import { readFile } from "node:fs/promises";
import { pdf } from "pdf-to-img";

/**
 * Rasterizador PERMANENTE de PDFs (para el panel de QA por ruta y cualquier lectura por visión).
 * Copia el patrón probado de `cert-poster-sync.ts` (pdf-to-img → PNG por página) pero junta TODAS
 * las páginas. Se pasa un Buffer (no una ruta) a propósito: en Windows `pdf-to-img` tropieza con
 * las rutas POSIX/backslash; leyendo el archivo nosotros mismos evitamos ese bug.
 */
export async function rasterizePdf(src: string | Buffer, opts: { scale?: number } = {}): Promise<Buffer[]> {
  const buf = typeof src === "string" ? await readFile(src) : src;
  const doc = await pdf(buf, { scale: opts.scale ?? 2 });
  const pages: Buffer[] = [];
  for await (const page of doc) pages.push(page as Buffer);
  return pages;
}

/**
 * Muestra hasta `max` páginas repartidas UNIFORMEMENTE (primera, última y equiespaciadas en medio).
 * Los agentes visuales no necesitan las 40 páginas para juzgar composición/tipografía, y mandar
 * todas reventaría los tokens de visión; una muestra representativa alcanza y acota el costo.
 */
export function samplePages(pages: Buffer[], max = 10): Buffer[] {
  if (pages.length <= max) return pages;
  const out: Buffer[] = [];
  const step = (pages.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(pages[Math.round(i * step)]!);
  return out;
}
