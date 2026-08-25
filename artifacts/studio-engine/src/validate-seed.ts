import type { PageSeed } from "./types.js";

/**
 * Validación de seeds sin dependencias (zod no está instalado). Detecta seeds
 * malformados ANTES de generar: campos faltantes, autocheck fuera de rango,
 * trampas/módulos insuficientes. Devuelve la lista de errores (vacía = ok).
 */
export function validateSeed(s: unknown): string[] {
  const errs: string[] = [];
  const o = (s ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => typeof v === "string";
  const arr = (v: unknown) => Array.isArray(v);

  if (!str(o.pageId) || !(o.pageId as string).trim()) errs.push("pageId vacío");
  if (!str(o.title) || !(o.title as string).trim()) errs.push("title vacío");
  if (!str(o.subtitle)) errs.push("subtitle ausente");
  if (!str(o.domainLabel) || !(o.domainLabel as string).trim()) errs.push("domainLabel vacío");
  if (!str(o.context) || (o.context as string).length < 20) errs.push("context muy corto (<20)");
  if (!str(o.guideQuestion) || !(o.guideQuestion as string).trim()) errs.push("guideQuestion vacía");

  const traps = arr(o.traps) ? (o.traps as Record<string, unknown>[]) : [];
  if (traps.length < 2) errs.push("necesita ≥2 trampas");
  traps.forEach((t, i) => {
    if (!str(t?.wrong) || !str(t?.correction)) errs.push(`trampa ${i} incompleta`);
  });

  const ac = (o.autocheck ?? {}) as Record<string, unknown>;
  const opts = arr(ac.options) ? (ac.options as unknown[]) : [];
  if (!str(ac.question) || !(ac.question as string).trim()) errs.push("autocheck.question vacía");
  if (opts.length < 3) errs.push("autocheck necesita ≥3 opciones");
  if (typeof ac.correctOption !== "number" || ac.correctOption < 0 || ac.correctOption >= opts.length) errs.push("autocheck.correctOption fuera de rango");
  if (!str(ac.explanation) || !(ac.explanation as string).trim()) errs.push("autocheck.explanation vacía");

  const mods = arr(o.visualModules) ? (o.visualModules as unknown[]) : [];
  if (mods.length < 2 || mods.length > 8) errs.push("visualModules debe estar entre 2 y 8 (la fuente decide; 7–8 ejes → spread de 2 páginas)");

  return errs;
}

/** Valida todos los seeds al arranque y loguea los inválidos (no aborta). */
export function validateAllSeeds(seeds: PageSeed[]): number {
  let bad = 0;
  for (const s of seeds) {
    const errs = validateSeed(s);
    if (errs.length) { bad++; console.error(`[seeds] pág. ${s.pageId ?? "?"} inválida: ${errs.join("; ")}`); }
  }
  if (bad === 0) console.log(`[seeds] ${seeds.length} seeds válidos.`);
  return bad;
}
