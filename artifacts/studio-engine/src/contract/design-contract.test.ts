import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveContract, domainIdForSeed } from "./design-contract.js";
import type { PageSeed } from "../types.js";

/**
 * CONTRATO DE DISEÑO EN CASCADA — colección (cert) → libro (formato) → módulo (ruta).
 *
 * Por qué importa: `resolveContract()` arma el preámbulo que va al prompt de arte de
 * CADA lámina del Visual Atlas. Un campo que se pierda o quede vacío no rompe nada de
 * forma visible: el modelo simplemente deja de recibir esa instrucción y las láminas
 * salen distintas — que es exactamente la clase de regresión silenciosa que costó
 * rondas de retrabajo (marcos, títulos, iconografía de otro dominio).
 *
 * Es una función PURA, sin fs ni red, así que estos tests corren en milisegundos.
 */

const CAMPOS_ESPERADOS = [
  "intro", "canvas", "palette", "iconography", "numbering", "cards", "typography",
  "tables", "traps", "autocheck", "guide", "introIcon", "diagrams", "consistency", "layout",
];

test("resuelve los 15 campos del contrato más el acento del módulo", () => {
  const r = resolveContract("ai-200", "visual-atlas", "p1");
  assert.equal(r.fields.length, CAMPOS_ESPERADOS.length + 1);
  assert.deepEqual(r.fields.slice(0, -1).map((f) => f.key), CAMPOS_ESPERADOS);
  assert.equal(r.fields.at(-1)!.key, "domainAccent");
});

test("NINGÚN campo del contrato queda vacío", () => {
  // Un campo faltante en la colección se resolvería a "" en silencio y el prompt de arte
  // perdería esa instrucción para TODAS las páginas del libro.
  const r = resolveContract("ai-200", "visual-atlas", "p1");
  for (const f of r.fields) {
    assert.ok(f.value.trim().length > 0, `el campo "${f.key}" (${f.label}) quedó vacío`);
  }
});

test("procedencia: los campos vienen de la colección y el acento del módulo", () => {
  const r = resolveContract("ai-200", "visual-atlas", "p3");
  const base = r.fields.filter((f) => f.key !== "domainAccent");
  assert.ok(base.every((f) => f.from === "collection"), "visual-atlas no define overrides de libro hoy");
  assert.equal(r.fields.find((f) => f.key === "domainAccent")!.from, "module");
});

test("el acento cambia por ruta y cae a Azure blue si la ruta es desconocida", () => {
  const acento = (d: string) => resolveContract("ai-200", "visual-atlas", d).fields.find((f) => f.key === "domainAccent")!.value;
  assert.match(acento("p1"), /Azure blue/);
  assert.match(acento("p3"), /teal/);
  assert.match(acento("p8"), /emerald/);
  assert.match(acento("p99"), /Azure blue/);   // fallback
  assert.match(acento(""), /Azure blue/);
});

test("un formato sin overrides declarados no pierde campos", () => {
  // BOOK_CONTRACTS sólo declara "visual-atlas". Un formato nuevo (master-book, etc.)
  // debe heredar la colección completa, no quedarse sin contrato.
  const r = resolveContract("ai-300", "formato-inexistente", "p2");
  assert.equal(r.fields.length, CAMPOS_ESPERADOS.length + 1);
  for (const f of r.fields) assert.ok(f.value.trim().length > 0, `"${f.key}" vacío en un formato sin overrides`);
});

test("el preámbulo contiene todos los campos y termina con el acento", () => {
  const r = resolveContract("ai-200", "visual-atlas", "p4");
  for (const f of r.fields.filter((x) => x.key !== "domainAccent")) {
    assert.ok(r.preamble.includes(f.value), `el preámbulo no incluye el campo "${f.key}"`);
  }
  assert.ok(r.preamble.trimEnd().endsWith(r.fields.at(-1)!.value), "el acento del módulo debe ir en la última línea");
});

test("es determinista: mismas entradas, misma salida", () => {
  const a = resolveContract("ai-200", "visual-atlas", "p1");
  const b = resolveContract("ai-200", "visual-atlas", "p1");
  assert.equal(a.preamble, b.preamble);
  assert.deepEqual(a.fields, b.fields);
});

test("devuelve la identidad con la que se lo invocó", () => {
  const r = resolveContract("ab-620", "visual-atlas", "p5");
  assert.equal(r.certId, "ab-620");
  assert.equal(r.format, "visual-atlas");
  assert.equal(r.domainId, "p5");
});

/* ── domainIdForSeed: de la etiqueta de ruta al id del módulo ── */

const seedCon = (domainLabel: string): PageSeed => ({ domainLabel } as PageSeed);

test("domainIdForSeed lee la ruta de la etiqueta", () => {
  assert.equal(domainIdForSeed(seedCon("Ruta 1 — Alojamiento en contenedores")), "p1");
  assert.equal(domainIdForSeed(seedCon("Ruta 7 — Otra cosa")), "p7");
  assert.equal(domainIdForSeed(seedCon("Dominio 4 · Algo")), "p4");
  assert.equal(domainIdForSeed(seedCon("RUTA 9")), "p9");       // insensible a mayúsculas
});

test("domainIdForSeed cae a p1 ante etiquetas fuera de rango o ilegibles", () => {
  assert.equal(domainIdForSeed(seedCon("Ruta 0 — cero")), "p1");
  assert.equal(domainIdForSeed(seedCon("Sin número de ruta")), "p1");
  assert.equal(domainIdForSeed(seedCon("")), "p1");
  assert.equal(domainIdForSeed({} as PageSeed), "p1");
});
