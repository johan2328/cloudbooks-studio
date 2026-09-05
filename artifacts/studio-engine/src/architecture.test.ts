import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

/**
 * TESTS DE ARQUITECTURA — la red que protege el reordenamiento del engine.
 *
 * El motor tiene ciclos de importación REALES que hoy sobreviven por convención, no por
 * herramienta:
 *   · `config ↔ active-book`  — roto pasando `outputRoot` por parámetro y con `certId`/
 *     `format` como getters (evaluación diferida).
 *   · `certifications ↔ library-catalog` — ciclo topológico verdadero: sobrevive SÓLO
 *     porque la arista de vuelta es `import type`, que TypeScript borra al emitir.
 *   · `book-config ↔ palette-defs` — mismo patrón.
 *
 * Y no hay UN SOLO `import()` dinámico en todo `src/`. Consecuencia: un ciclo nuevo con
 * arista de VALOR no degrada elegantemente — mata el arranque con
 * `Cannot access 'X' before initialization`, y puede hacerlo sólo en cierto orden de carga.
 *
 * Estos dos tests convierten esa convención en un gate.
 */

const SRC = path.dirname(fileURLToPath(import.meta.url));

/* ── 1. Grafo de imports ────────────────────────────────────────────────────── */

function listarTs(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listarTs(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** Quita comentarios para no leer imports comentados como aristas reales. */
const sinComentarios = (s: string): string =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/**
 * Aristas de VALOR de un archivo. Se excluyen:
 *   · `import type { X } from "…"`  y  `export type { X } from "…"`
 *   · `import { type A, type B } from "…"` — todos los especificadores son tipos
 * porque el `verbatimModuleSyntax: false` del paquete hace que TS los borre al emitir,
 * así que NO existen en runtime y no pueden causar un TDZ.
 */
function aristasDeValor(file: string): string[] {
  const src = sinComentarios(fs.readFileSync(file, "utf8"));
  const destinos: string[] = [];
  const re = /(?:^|\n)\s*(import|export)\s+([\s\S]*?)\s*from\s*["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    const clausula = m[2]!.trim();
    const spec = m[3]!;
    if (!spec.startsWith(".")) continue;                       // sólo imports internos
    if (/^type\b/.test(clausula)) continue;                    // import/export type { … }
    const llaves = clausula.match(/\{([\s\S]*)\}/);
    if (llaves && !/^\s*\*/.test(clausula) && !/^[A-Za-z_$][\w$]*\s*,/.test(clausula)) {
      const specs = llaves[1]!.split(",").map((s) => s.trim()).filter(Boolean);
      if (specs.length > 0 && specs.every((s) => /^type\s/.test(s))) continue;   // todos tipos
    }
    destinos.push(spec);
  }
  // `import "./x.js"` (sólo efecto) también es arista de valor.
  const soloEfecto = /(?:^|\n)\s*import\s+["'](\.[^"']+)["']/g;
  while ((m = soloEfecto.exec(src)) !== null) destinos.push(m[1]!);
  return destinos;
}

/** Resuelve un especificador relativo (`./x.js`) al archivo `.ts` real. */
function resolver(desde: string, spec: string): string | null {
  const base = path.resolve(path.dirname(desde), spec);
  for (const cand of [base.replace(/\.js$/, ".ts"), `${base}.ts`, path.join(base, "index.ts")]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
  }
  return null;
}

function construirGrafo(): Map<string, string[]> {
  const grafo = new Map<string, string[]>();
  for (const f of listarTs(SRC)) {
    if (f.endsWith(".test.ts")) continue;      // los tests no son parte del grafo de producción
    const destinos = aristasDeValor(f)
      .map((s) => resolver(f, s))
      .filter((x): x is string => x !== null);
    grafo.set(f, destinos);
  }
  return grafo;
}

/** Devuelve todos los ciclos encontrados, como listas de rutas relativas. */
function buscarCiclos(grafo: Map<string, string[]>): string[][] {
  const ciclos: string[][] = [];
  const estado = new Map<string, 0 | 1 | 2>();   // 0=sin visitar 1=en pila 2=listo
  const pila: string[] = [];

  const visitar = (n: string): void => {
    estado.set(n, 1);
    pila.push(n);
    for (const d of grafo.get(n) ?? []) {
      const e = estado.get(d) ?? 0;
      if (e === 1) {
        const i = pila.indexOf(d);
        ciclos.push([...pila.slice(i), d].map((p) => path.relative(SRC, p).replace(/\\/g, "/")));
      } else if (e === 0) visitar(d);
    }
    pila.pop();
    estado.set(n, 2);
  };

  for (const n of grafo.keys()) if ((estado.get(n) ?? 0) === 0) visitar(n);
  return ciclos;
}

test("el grafo de imports se construye sobre archivos reales", () => {
  const grafo = construirGrafo();
  assert.ok(grafo.size > 80, `se esperaban >80 módulos, se encontraron ${grafo.size}`);
  const aristas = [...grafo.values()].reduce((s, v) => s + v.length, 0);
  assert.ok(aristas > 150, `se esperaban >150 aristas de valor, se encontraron ${aristas}`);
});

test("NO hay ciclos de importación con arista de valor", () => {
  const ciclos = buscarCiclos(construirGrafo());
  const detalle = ciclos.map((c) => `  ${c.join(" → ")}`).join("\n");
  assert.deepEqual(
    ciclos, [],
    `Se detectaron ${ciclos.length} ciclo(s) de valor. Esto rompe el arranque con "Cannot access ` +
    `'X' before initialization".\nSi el ciclo es inevitable, la arista de vuelta debe ser ` +
    `\`import type\`.\n${detalle}`,
  );
});

test("ningún directorio de src/ expone un barrel index.ts", () => {
  // Con 3 ciclos vivos rotos por convención, un barrel por grupo convierte cada arista
  // intra-grupo en un ciclo de grupo. La regla es imports profundos explícitos.
  const barrels = listarTs(SRC)
    .filter((f) => path.basename(f) === "index.ts" && path.dirname(f) !== SRC)
    .map((f) => path.relative(SRC, f).replace(/\\/g, "/"));
  assert.deepEqual(barrels, [], `barrels prohibidos: ${barrels.join(", ")}`);
});

/* ── 2. Humo de arranque ────────────────────────────────────────────────────── */

test("el grafo de módulos carga entero sin TDZ", async () => {
  // Importar `server.js` arrastra ~98 módulos: es el smoke test más barato de que el orden
  // de inicialización sigue siendo válido. Se apunta el working root a un tmpdir para no
  // tocar el estado real (`getActiveBook` recibe la raíz por parámetro, justo el diseño
  // que evita el ciclo config↔active-book).
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "engine-smoke-"));
  process.env.ENGINE_OUTPUT_ROOT = tmp;
  process.env.ENGINE_PUBLISH_ROOT = tmp;
  try {
    const mod = await import("./server.js");
    assert.equal(typeof mod.createApp, "function", "server.js debe exportar createApp");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
