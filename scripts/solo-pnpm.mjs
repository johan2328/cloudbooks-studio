#!/usr/bin/env node
/**
 * GUARD DE GESTOR DE PAQUETES (preinstall).
 *
 * Reemplaza al guard anterior, que era `sh -c '... case "$npm_config_user_agent" in
 * pnpm/*) ;; *) exit 1 ;; esac'` y tenia dos fallas que bloqueaban el repo entero:
 *
 *  1. `sh` NO existe en PowerShell (el camino Windows que documenta CLAUDE.md), asi
 *     que el preinstall fallaba con "sh no se reconoce como un comando".
 *  2. pnpm 11.5 no expone `npm_config_user_agent` a los scripts de ciclo de vida en
 *     este entorno, asi que el guard fallaba CERRADO contra el propio pnpm. Como
 *     pnpm dispara un `install` implicito cuando node_modules no coincide con el
 *     lockfile, cualquier `pnpm typecheck` / `pnpm exec` quedaba bloqueado.
 *
 * Criterio nuevo: fallar solo cuando se identifica POSITIVAMENTE npm o yarn. Si no
 * se puede determinar el gestor, se deja pasar: un guard que bloquea al gestor
 * correcto es peor que uno que ocasionalmente no detecta al incorrecto.
 */
import { rmSync } from "node:fs";

// Los lockfiles ajenos se borran siempre: si aparecen, alguien uso otro gestor.
for (const f of ["package-lock.json", "yarn.lock"]) {
  try { rmSync(new URL(`../${f}`, import.meta.url), { force: true }); } catch { /* no estaba */ }
}

const ua = process.env.npm_config_user_agent ?? "";
const execpath = process.env.npm_execpath ?? "";

const esNpm = /^npm\//.test(ua) || /npm-cli\.js$/.test(execpath);
const esYarn = /^yarn\//.test(ua) || /yarn\.(js|cjs)$/.test(execpath);

if (esNpm || esYarn) {
  const cual = esNpm ? "npm" : "yarn";
  console.error(
    `\nEste workspace usa pnpm. Detecte ${cual}.\n` +
    `  Instala pnpm:  corepack enable && corepack prepare pnpm@latest --activate\n` +
    `  Luego:         pnpm install\n`,
  );
  process.exit(1);
}
