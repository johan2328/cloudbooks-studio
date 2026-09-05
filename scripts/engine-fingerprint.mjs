#!/usr/bin/env node
/**
 * HUELLA DEL ENGINE — gate de regresión para el reordenamiento interno.
 *
 * Golpea sólo endpoints GET del engine vivo y hashea cada respuesta. La huella tiene que
 * ser IDÉNTICA antes y después de cada fase del refactor: mover archivos, agrupar módulos
 * o partir `server.ts` no puede cambiar ni un byte de lo que el motor responde.
 *
 * Es la contraparte del typecheck: el compilador dice que compila, esto dice que responde
 * lo mismo. Sin esto, un import mal resuelto en una fase se descubre semanas después.
 *
 * Se escribió en Node y no en PowerShell (como preveía el plan) para que corra igual en
 * Git Bash y en PowerShell, y para no cargar con la regla de sólo-ASCII de PS 5.1.
 *
 * Uso:
 *   node scripts/engine-fingerprint.mjs                    imprime la huella
 *   node scripts/engine-fingerprint.mjs --save antes.json  la guarda
 *   node scripts/engine-fingerprint.mjs --compare antes.json   compara y sale 1 si difiere
 *   node scripts/engine-fingerprint.mjs --url http://127.0.0.1:8790
 */
import { createHash } from "node:crypto";
import fs from "node:fs";

const args = process.argv.slice(2);
const valor = (n, def) => { const i = args.indexOf(n); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const BASE = valor("--url", "http://127.0.0.1:8790").replace(/\/+$/, "");
const GUARDAR = valor("--save", null);
const COMPARAR = valor("--compare", null);
const TOKEN = process.env.ENGINE_TOKEN || "";

/**
 * Endpoints GET representativos, uno por dominio del motor.
 * NO se incluye `/engine/health`: lleva un timestamp y siempre diferiría.
 */
const ENDPOINTS = [
  "catalog", "library", "library-metrics", "library/lock",
  "book-config", "book-outline", "modules",
  "approvals", "chapters", "chapters-qa",
  "cost", "cost-breakdown", "credit", "credit-events", "agents", "agent-runtime",
  "sources", "extra-sources", "route-locks", "evidence", "grounding-tree",
  "certifications", "certifications/sync-log",
  "design-notes", "design-lock", "corrida-timing",
  "matter-contract", "image-contract", "brand-contract", "editorial-contract", "contract",
  "collection-tags", "assembled-status", "claim-reviews", "route-panels",
  "infographic-stats", "book-review",
  "storefront/ai-200", "storefront/ab-620", "storefront/ai-300",
  "storefront/ai-200/visual-atlas", "storefront/ai-200/master-book",
  "storefront/ab-620/visual-atlas", "storefront/ab-620/master-book",
];

const sha = (s) => createHash("sha256").update(s, "utf8").digest("hex").slice(0, 16);

async function huella() {
  const filas = [];
  for (const ep of ENDPOINTS) {
    try {
      const res = await fetch(`${BASE}/engine/${ep}`, {
        headers: TOKEN ? { "x-engine-token": TOKEN } : {},
        signal: AbortSignal.timeout(20000),
      });
      const cuerpo = await res.text();
      filas.push({ ep, status: res.status, bytes: cuerpo.length, hash: sha(cuerpo) });
    } catch (err) {
      filas.push({ ep, status: 0, bytes: 0, hash: "ERROR", error: String(err?.message ?? err) });
    }
  }
  return filas;
}

const filas = await huella();

const errores = filas.filter((f) => f.hash === "ERROR");
if (errores.length === filas.length) {
  console.error(`No respondio ningun endpoint en ${BASE}. ¿Esta el engine levantado?`);
  process.exit(2);
}

if (GUARDAR) {
  fs.writeFileSync(GUARDAR, JSON.stringify(filas, null, 2), "utf8");
  console.log(`Huella guardada en ${GUARDAR}  (${filas.length} endpoints, ${errores.length} sin respuesta)`);
  process.exit(0);
}

if (COMPARAR) {
  const previo = JSON.parse(fs.readFileSync(COMPARAR, "utf8"));
  const antes = new Map(previo.map((f) => [f.ep, f]));
  const difs = [];
  for (const f of filas) {
    const a = antes.get(f.ep);
    if (!a) { difs.push(`  NUEVO      ${f.ep}`); continue; }
    if (a.hash !== f.hash) difs.push(`  CAMBIO     ${f.ep}  ${a.hash} -> ${f.hash}  (${a.bytes} -> ${f.bytes} bytes)`);
    else if (a.status !== f.status) difs.push(`  STATUS     ${f.ep}  ${a.status} -> ${f.status}`);
  }
  for (const a of previo) if (!filas.some((f) => f.ep === a.ep)) difs.push(`  FALTA      ${a.ep}`);

  if (difs.length === 0) {
    console.log(`Huella IDENTICA en los ${filas.length} endpoints. Sin regresion.`);
    process.exit(0);
  }
  console.error(`Se detectaron ${difs.length} diferencia(s):`);
  for (const d of difs) console.error(d);
  console.error("\nSi el cambio es esperado (p. ej. se publico un libro), regenera la linea base.");
  process.exit(1);
}

console.log(`Huella del engine en ${BASE}\n`);
console.log("  status   bytes  hash              endpoint");
for (const f of filas) {
  const s = f.hash === "ERROR" ? "  ---" : String(f.status).padStart(5);
  console.log(`  ${s}  ${String(f.bytes).padStart(6)}  ${f.hash.padEnd(16)}  ${f.ep}`);
}
console.log(`\n  ${filas.length} endpoints · ${errores.length} sin respuesta`);
