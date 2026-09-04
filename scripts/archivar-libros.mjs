#!/usr/bin/env node
/**
 * ARCHIVO DE LIBROS CLOUDBOOKS -> disco externo (F: por defecto).
 *
 * Contexto: el working root del engine (.data/engine, ~1.36 GB) esta FUERA de git y del arbol
 * servido (Fase 3 de la migracion, ver docs/ARCHITECTURE.md). De todo eso, lo que de verdad
 * importa es chico; el resto es regenerable o descartable. Este script separa en 3 capas:
 *
 *   finales/                  PERMANENTE  - los 5 PDF finales de cada libro (~210 MB).
 *   pendientes/ai-300-...     PERMANENTE  - las laminas PNG del AI-300 (~115 MB), porque el libro
 *                                           NO esta publicado y tiene un defecto pendiente: el texto
 *                                           esta horneado en la imagen, asi que sin el PNG un arreglo
 *                                           obliga a regenerar con costo (y no sale igual).
 *   cuarentena-<fecha>/       TEMPORAL    - espejo COMPLETO del working root. Red de seguridad por
 *                                           RETENCION_DIAS mientras se verifica que todo anda. Vencida
 *                                           y ya verificado, se borra: lo valioso esta en las otras dos.
 *
 * Ademas genera INDICE.csv (todo lo archivado, buscable) y LEEME.txt.
 *
 * Uso:
 *   node scripts/archivar-libros.mjs                 archiva (idempotente: saltea lo ya copiado igual)
 *   node scripts/archivar-libros.mjs --dry-run       muestra que haria, sin copiar
 *   node scripts/archivar-libros.mjs --estado        que hay archivado + vencimiento de la cuarentena
 *   node scripts/archivar-libros.mjs --buscar TEXTO  busca en el indice (por si hace falta recuperar)
 *   node scripts/archivar-libros.mjs --destino G:\X  cambia el disco/carpeta destino
 *
 *   node scripts/archivar-libros.mjs --cruft         archiva el PESO MUERTO DEL REPO (no del working
 *                                                    root): validation-kit, backups fechados, POCs
 *                                                    sueltos, arboles huerfanos. Solo copia.
 *   node scripts/archivar-libros.mjs --cruft --mover ademas lo BORRA del repo, pero solo lo que no
 *                                                    esta trackeado y solo si la copia se verifico.
 *                                                    Lo trackeado se saca con `git rm`, en un commit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const ORIGEN = path.join(REPO, ".data", "engine");
const RETENCION_DIAS = 60;

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const DESTINO = path.resolve(valor("--destino", "F:\\CloudBooks-Archivo"));
const DRY = flag("--dry-run");

/** Los 5 libros finales: origen relativo -> nombre legible en el archivo. */
const FINALES = [
  ["ai-200/master-book/_export/AI200_master_book.pdf", "AI-200_Master-Book_454pag.pdf"],
  ["_export/AI200_libro.pdf", "AI-200_Visual-Atlas_170pag.pdf"],
  ["ab-620/master-book/_export/AB620_master_book.pdf", "AB-620_Master-Book_207pag.pdf"],
  ["_export/AB620_libro.pdf", "AB-620_Visual-Atlas_80pag.pdf"],
  ["_export/AI300_libro.pdf", "AI-300_Visual-Atlas_138pag.pdf"],
];

const mb = (b) => (b / 1048576).toFixed(1);
const hoy = () => new Date().toISOString().slice(0, 10);

/** Lista recursiva de archivos con su ruta relativa. */
function listar(dir, base = dir, out = []) {
  let ents = [];
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listar(p, base, out);
    else if (e.isFile()) { try { out.push({ rel: path.relative(base, p).replace(/\\/g, "/"), abs: p, size: fs.statSync(p).size }); } catch { /* ignorar */ } }
  }
  return out;
}

/** Copia idempotente: si el destino ya existe con el mismo tamano, no recopia. */
function copiar(src, dst) {
  try {
    const s = fs.statSync(src);
    if (fs.existsSync(dst) && fs.statSync(dst).size === s.size) return { ok: true, saltado: true, bytes: s.size };
    if (DRY) return { ok: true, saltado: false, bytes: s.size, simulado: true };
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    return { ok: true, saltado: false, bytes: s.size };
  } catch (err) { return { ok: false, error: String(err?.message ?? err) }; }
}

// ── Modos de consulta ────────────────────────────────────────────────────────────
function leerIndice() {
  const f = path.join(DESTINO, "INDICE.csv");
  if (!fs.existsSync(f)) return null;
  return fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
}

if (flag("--buscar")) {
  const q = (valor("--buscar", "") || "").toLowerCase();
  const idx = leerIndice();
  if (!idx) { console.log(`No hay indice en ${DESTINO}. Corre el script sin flags primero.`); process.exit(0); }
  const hits = idx.slice(1).filter((l) => l.toLowerCase().includes(q));
  console.log(`Buscando "${q}" en el archivo de ${DESTINO}\n`);
  if (!hits.length) { console.log("  sin resultados"); process.exit(0); }
  console.log("  capa | ruta en el archivo | ruta original | MB");
  for (const l of hits.slice(0, 60)) {
    const [capa, enArchivo, original, bytes] = l.split(";");
    console.log(`  ${capa} | ${enArchivo} | ${original} | ${mb(Number(bytes))}`);
  }
  if (hits.length > 60) console.log(`  ... y ${hits.length - 60} mas`);
  console.log(`\n  Para restaurar uno: copialo de vuelta a ${ORIGEN}\\<ruta original>`);
  process.exit(0);
}

if (flag("--estado")) {
  console.log(`Archivo en: ${DESTINO}\n`);
  if (!fs.existsSync(DESTINO)) { console.log("  todavia no existe (nunca se archivo)"); process.exit(0); }
  for (const capa of ["finales", "pendientes"]) {
    const d = path.join(DESTINO, capa);
    const fs2 = listar(d);
    const tot = fs2.reduce((s, f) => s + f.size, 0);
    console.log(`  ${capa.padEnd(12)} ${String(fs2.length).padStart(5)} archivos  ${mb(tot).padStart(8)} MB  [PERMANENTE]`);
  }
  const cuarentenas = fs.readdirSync(DESTINO).filter((n) => n.startsWith("cuarentena-"));
  for (const c of cuarentenas) {
    const fecha = c.replace("cuarentena-", "");
    const vence = new Date(new Date(fecha).getTime() + RETENCION_DIAS * 864e5);
    const dias = Math.ceil((vence - new Date()) / 864e5);
    const arch = listar(path.join(DESTINO, c));
    const tot = arch.reduce((s, f) => s + f.size, 0);
    const estado = dias > 0 ? `vence en ${dias} dias (${vence.toISOString().slice(0, 10)})` : `VENCIDA hace ${-dias} dias -> si todo anda bien, se puede borrar`;
    console.log(`  ${c.padEnd(12)} ${String(arch.length).padStart(5)} archivos  ${mb(tot).padStart(8)} MB  [${estado}]`);
  }
  process.exit(0);
}

// ── Modo --cruft: peso muerto del REPO (distinto del working root) ───────────────
/**
 * Ojo: esto NO es el working root, es basura dentro del repo. Por eso va a su propia
 * carpeta y tiene su propio indice. Regla de oro: se COPIA y se VERIFICA primero;
 * borrar del disco exige --mover explicito. Lo TRACKEADO nunca se borra aca: eso es
 * un `git rm` que pertenece a un commit, no a un script de archivado.
 */
const CRUFT = [
  ["artifacts/studio-engine/validation-kit", "QA visual de jun-2026; cero referencias en codigo", false],
  ["artifacts/studio-engine/_design-fixes-2026-08-20", "backup manual fechado", false],
  ["artifacts/studio-engine/_practice-gate-2026-08-21", "backup manual fechado", false],
  ["screenshots", "cero referencias en el repo", true],
  ["studio", "arbol huerfano en la raiz; el codigo real usa artifacts/studio/public", true],
  [".agents", "metadata de agente Replit; apunta a un PNG inexistente", true],
  ["scripts/src/hello.ts", "console.log de 47 bytes, nunca invocado", true],
];
/** Scratch suelto en la raiz del engine: se resuelve por patron, no a mano. */
const CRUFT_PATRONES = [
  ["artifacts/studio-engine/src", /^_poc-.*\.ts$/, "POC suelto; entra al tsconfig y lleva rutas absolutas de otra maquina", false],
  ["artifacts/studio-engine", /^build-.*\.ts$/, "script one-off de build", false],
  // OJO: _raster2.mjs NO entra aca. Implementa el protocolo de verificacion de PDFs que exige
  // CLAUDE.md (pdf-to-img, nunca el visor Chrome): se promovio a scripts/verificar-pdf.mjs.
  ["artifacts/studio-engine", /^_cmp.*\.mjs$|^_regen-list\.json$/, "script one-off de comparacion", false],
];

if (flag("--cruft")) {
  const MOVER = flag("--mover");
  const destino = path.join(DESTINO, `repo-cruft-${hoy()}`);
  console.log(`PESO MUERTO DEL REPO${DRY ? "  (DRY-RUN: no copia nada)" : ""}`);
  console.log(`  origen:  ${REPO}`);
  console.log(`  destino: ${destino}`);
  console.log(`  borrado: ${MOVER ? "SI, tras verificar la copia (solo lo NO trackeado)" : "no (solo copia; usa --mover para liberar disco)"}\n`);

  // Expandir patrones a items concretos.
  const items = [...CRUFT];
  for (const [dir, re, motivo, trackeado] of CRUFT_PATRONES) {
    let ents = [];
    try { ents = fs.readdirSync(path.join(REPO, dir)); } catch { /* sin dir */ }
    for (const n of ents.filter((n) => re.test(n))) items.push([`${dir}/${n}`, motivo, trackeado]);
  }

  const idx = [["ruta_original", "trackeado", "motivo", "bytes", "fecha"].join(";")];
  let totBytes = 0, totArch = 0, borrados = 0;
  const fallos = [];

  for (const [rel, motivo, trackeado] of items) {
    const abs = path.join(REPO, rel);
    if (!fs.existsSync(abs)) { console.log(`   ausente   ${rel}`); continue; }
    const esDir = fs.statSync(abs).isDirectory();
    const archivos = esDir ? listar(abs) : [{ rel: path.basename(abs), abs, size: fs.statSync(abs).size }];

    let bytesItem = 0, okItem = true;
    for (const f of archivos) {
      const dst = esDir ? path.join(destino, rel, f.rel) : path.join(destino, rel);
      const r = copiar(f.abs, dst);
      if (!r.ok) { okItem = false; fallos.push(`${rel}/${f.rel}: ${r.error}`); continue; }
      bytesItem += r.bytes;
    }
    totBytes += bytesItem; totArch += archivos.length;
    idx.push([rel, trackeado ? "si" : "no", motivo, bytesItem, hoy()].join(";"));

    // Borrar SOLO si: se pidio --mover, la copia entera salio bien, y NO esta trackeado.
    let nota = "";
    if (MOVER && !DRY && okItem && !trackeado) {
      try { fs.rmSync(abs, { recursive: true, force: true }); borrados++; nota = "  -> BORRADO del repo"; }
      catch (err) { fallos.push(`borrando ${rel}: ${String(err?.message ?? err)}`); }
    } else if (MOVER && trackeado) nota = "  -> trackeado: se borra con `git rm`, no aca";

    console.log(`   ${String(archivos.length).padStart(4)} arch  ${mb(bytesItem).padStart(8)} MB  ${rel}${nota}`);
  }

  if (!DRY) {
    fs.mkdirSync(destino, { recursive: true });
    fs.writeFileSync(path.join(destino, "INDICE-cruft.csv"), idx.join("\n"), "utf8");
    fs.writeFileSync(path.join(destino, "LEEME.txt"),
      [`PESO MUERTO DEL REPO CLOUDBOOKS`,
       `Generado: ${hoy()}   Origen: ${REPO}`,
       ``,
       `Esto NO son libros: es material que vivia dentro del repo sin cumplir funcion`,
       `(kit de QA visual, backups fechados, POCs sueltos, arboles huerfanos).`,
       `Se archiva antes de borrarlo por si algo hacia falta.`,
       ``,
       `A diferencia de ..\\finales, esto es DESCARTABLE: si en 60 dias nada lo extrano,`,
       `se puede borrar entero.`,
       ``,
       `INDICE-cruft.csv dice de donde salio cada cosa y por que se considero muerta.`,
       `Para restaurar: copiar de vuelta a ${REPO}\\<ruta original>`,
      ].join("\r\n"), "utf8");
  }

  console.log(`\nRESUMEN`);
  console.log(`  items: ${items.length}   archivos: ${totArch}   total: ${mb(totBytes)} MB`);
  if (MOVER) console.log(`  borrados del repo: ${borrados} items no trackeados`);
  if (fallos.length) { console.log(`  FALLOS (${fallos.length}):`); for (const f of fallos.slice(0, 10)) console.log(`   - ${f}`); }
  else console.log(`  sin errores`);
  process.exit(fallos.length ? 1 : 0);
}

// ── Archivado ────────────────────────────────────────────────────────────────────
if (!fs.existsSync(ORIGEN)) { console.error(`ERROR: no existe el origen ${ORIGEN}`); process.exit(1); }
const raizDestino = path.parse(DESTINO).root;
if (!fs.existsSync(raizDestino)) { console.error(`ERROR: el disco ${raizDestino} no esta montado.`); process.exit(1); }

console.log(`ARCHIVO CLOUDBOOKS${DRY ? "  (DRY-RUN: no copia nada)" : ""}`);
console.log(`  origen:  ${ORIGEN}`);
console.log(`  destino: ${DESTINO}\n`);

const indice = [["capa", "ruta_en_archivo", "ruta_original", "bytes", "fecha"].join(";")];
const errores = [];
let copiados = 0, salteados = 0, bytes = 0;

const registrar = (capa, relArchivo, relOrigen, r) => {
  if (!r.ok) { errores.push(`${relOrigen}: ${r.error}`); return; }
  indice.push([capa, relArchivo, relOrigen, r.bytes, hoy()].join(";"));
  bytes += r.bytes;
  if (r.saltado) salteados++; else copiados++;
};

// CAPA 1 - los 5 libros finales
console.log("[1/3] finales (PERMANENTE)");
for (const [rel, nombre] of FINALES) {
  const src = path.join(ORIGEN, rel);
  if (!fs.existsSync(src)) { errores.push(`FALTA el final: ${rel}`); console.log(`   FALTA  ${rel}`); continue; }
  const r = copiar(src, path.join(DESTINO, "finales", nombre));
  registrar("finales", `finales/${nombre}`, rel, r);
  console.log(`   ${r.saltado ? "ya estaba" : "copiado  "}  ${nombre}  (${mb(r.bytes ?? 0)} MB)`);
}

// CAPA 2 - laminas del AI-300 (libro aun no publicado, con defecto pendiente)
console.log("\n[2/3] pendientes/ai-300-laminas (PERMANENTE hasta cerrar el AI-300)");
const laminas = listar(path.join(ORIGEN, "ai-300")).filter((f) => f.rel.endsWith(".png"));
for (const f of laminas) {
  const r = copiar(f.abs, path.join(DESTINO, "pendientes", "ai-300-laminas", f.rel));
  registrar("pendientes", `pendientes/ai-300-laminas/${f.rel}`, `ai-300/${f.rel}`, r);
}
console.log(`   ${laminas.length} imagenes`);

// CAPA 3 - cuarentena: espejo completo, con vencimiento
const carpetaCuarentena = `cuarentena-${hoy()}`;
const vence = new Date(Date.now() + RETENCION_DIAS * 864e5).toISOString().slice(0, 10);
console.log(`\n[3/3] ${carpetaCuarentena} (TEMPORAL, vence ${vence})`);
const todo = listar(ORIGEN);
let n = 0;
for (const f of todo) {
  const r = copiar(f.abs, path.join(DESTINO, carpetaCuarentena, f.rel));
  registrar("cuarentena", `${carpetaCuarentena}/${f.rel}`, f.rel, r);
  if (++n % 200 === 0) console.log(`   ... ${n}/${todo.length}`);
}
console.log(`   ${todo.length} archivos`);

if (!DRY) {
  fs.mkdirSync(DESTINO, { recursive: true });
  fs.writeFileSync(path.join(DESTINO, "INDICE.csv"), indice.join("\n"), "utf8");
  fs.writeFileSync(path.join(DESTINO, carpetaCuarentena, `VENCE-${vence}.txt`),
    [`Cuarentena creada el ${hoy()}. Vence el ${vence} (${RETENCION_DIAS} dias).`,
     ``,
     `Es un espejo COMPLETO del working root del engine, guardado como red de seguridad`,
     `mientras se verifica que todo funciona con el archivo curado.`,
     ``,
     `Cuando venza Y este confirmado que no falta nada, esta carpeta se puede borrar:`,
     `lo valioso vive en ..\\finales (los 5 libros) y ..\\pendientes (laminas del AI-300).`,
     ``,
     `Para buscar algo antes de borrar:`,
     `  node scripts/archivar-libros.mjs --buscar <texto>`,
    ].join("\r\n"), "utf8");
  fs.writeFileSync(path.join(DESTINO, "LEEME.txt"),
    [`ARCHIVO CLOUDBOOKS`,
     `Generado: ${hoy()}   Origen: ${ORIGEN}`,
     ``,
     `QUE HAY ACA`,
     `  finales\\      Los 5 libros terminados en PDF. Es LO IMPORTANTE. No borrar.`,
     `  pendientes\\   Laminas PNG del AI-300: el libro no esta publicado y tiene un defecto`,
     `                pendiente. El texto esta horneado en la imagen, asi que sin estos PNG`,
     `                cualquier arreglo obliga a regenerar con costo (y no sale igual).`,
     `                Se pueden soltar cuando el AI-300 quede publicado y corregido.`,
     `  cuarentena-*\\ Espejo completo del working root, TEMPORAL (${RETENCION_DIAS} dias).`,
     `                Red de seguridad por si algo faltaba. Vencida y verificada, se borra.`,
     `  INDICE.csv    Todo lo archivado: capa, ruta aca, ruta original, bytes, fecha.`,
     ``,
     `SI NECESITAS BUSCAR O RECUPERAR ALGO`,
     `  node scripts/archivar-libros.mjs --buscar <texto>     busca en el indice`,
     `  node scripts/archivar-libros.mjs --estado             que hay y cuando vence`,
     `  Para restaurar: copia el archivo de vuelta a`,
     `  ${ORIGEN}\\<ruta original>`,
     ``,
     `QUE NO SE ARCHIVA A PROPOSITO`,
     `  Los PDF parciales por modulo/ruta y los _poc: son exports viejos, regenerables.`,
     `  Los PDF se re-ensamblan gratis desde las laminas (Chrome + pdf-lib, sin API).`,
     `  Lo unico que cuesta plata y NO sale igual son los PNG generados por gpt-image.`,
    ].join("\r\n"), "utf8");
}

console.log(`\nRESUMEN`);
console.log(`  copiados: ${copiados}   ya estaban: ${salteados}   total: ${mb(bytes)} MB`);
if (errores.length) { console.log(`  ERRORES (${errores.length}):`); for (const e of errores.slice(0, 10)) console.log(`   - ${e}`); }
else console.log(`  sin errores`);
if (!DRY) console.log(`\n  Indice: ${path.join(DESTINO, "INDICE.csv")}\n  Guia:   ${path.join(DESTINO, "LEEME.txt")}`);
