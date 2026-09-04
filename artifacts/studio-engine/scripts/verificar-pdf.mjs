#!/usr/bin/env node
/**
 * VERIFICACION DE PDF POR RASTERIZADO REAL.
 *
 * Es el unico metodo valido para dar por bueno un libro (ver CLAUDE.md y la spec del pipeline):
 * el visor de Chrome sobre `file://` NO sirve — su render es no determinista y tapa defectos
 * reales (cortes de caja, colisiones de clase, margenes). pdf-to-img rasteriza de verdad, asi
 * que lo que se ve en el PNG es lo que hay en el PDF.
 *
 * Antes vivia como `_raster2.mjs` en la raiz del paquete, sin versionar y con prefijo de scratch,
 * pese a ser una herramienta del protocolo. Se promovio para que deje de ser saber tribal.
 *
 * Uso:
 *   node scripts/verificar-pdf.mjs <archivo.pdf> <carpeta-salida> [escala]
 *
 * Ejemplo:
 *   node scripts/verificar-pdf.mjs ../../.data/engine/_export/AI300_libro.pdf ./_check
 *   -> escribe p01.png, p02.png, ... y despues se leen con la herramienta de imagenes.
 *
 * La escala por defecto (3) da ~300 dpi: suficiente para juzgar tipografia y cortes.
 */
import { pdf } from "pdf-to-img";
import { writeFile, mkdir } from "node:fs/promises";

const [src, out, escalaArg] = process.argv.slice(2);

if (!src || !out) {
  console.error("Uso: node scripts/verificar-pdf.mjs <archivo.pdf> <carpeta-salida> [escala]");
  process.exit(1);
}

const scale = Number(escalaArg ?? 3);
if (!Number.isFinite(scale) || scale <= 0) {
  console.error(`Escala invalida: "${escalaArg}"`);
  process.exit(1);
}

await mkdir(out, { recursive: true });

const doc = await pdf(src, { scale });
let i = 0;
for await (const page of doc) {
  i++;
  await writeFile(`${out}/p${String(i).padStart(2, "0")}.png`, page);
}

console.log(`rasterizadas ${i} paginas (escala ${scale}) -> ${out}`);
