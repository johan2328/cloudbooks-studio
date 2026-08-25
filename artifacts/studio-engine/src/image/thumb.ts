import sharp from "sharp";
import path from "node:path";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { pageOutputDir } from "../config.js";
import { listSeeds } from "../seeds.js";

/**
 * THUMBNAILS livianos para la galería del estudio: un `thumb.webp` (~360px, ~15-25KB)
 * por página, derivado del `infographic.png` (~1.5MB). La grilla usa el thumb; si falta,
 * el frontend cae al PNG (onError). Tolerante: si sharp falla, no rompe la generación.
 */

const THUMB = "thumb.webp";

/** Escribe un thumb webp desde el buffer del PNG ya generado (default thumb.webp; thumb-A/-B.webp en spreads). */
export async function writeThumb(dir: string, pngBuffer: Buffer, name: string = THUMB): Promise<boolean> {
  try {
    // 1024×1536 (2:3) → 360px webp liviano. Los @types de sharp del proyecto son mínimos
    // (sin webp/fit), pero sharp sí soporta webp en runtime → cast puntual a any.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    await (sharp(pngBuffer) as any).resize(360, 540).webp({ quality: 72 }).toFile(path.join(dir, name));
    /* eslint-enable @typescript-eslint/no-explicit-any */
    return true;
  } catch { return false; }
}

/** Genera el thumb de una página leyendo su infographic.png (idempotente, para backfill). */
export async function ensureThumb(pageId: string): Promise<"created" | "exists" | "no-image" | "failed"> {
  const dir = pageOutputDir(pageId);
  const png = path.join(dir, "infographic.png");
  if (!existsSync(png)) return "no-image";
  if (existsSync(path.join(dir, THUMB))) return "exists";
  try {
    const ok = await writeThumb(dir, await fs.readFile(png));
    return ok ? "created" : "failed";
  } catch { return "failed"; }
}

/** Backfill: crea los thumbs faltantes de todas las páginas con imagen. */
export async function backfillThumbs(): Promise<{ created: number; existed: number; noImage: number; failed: number; total: number }> {
  const seeds = listSeeds();
  const out = { created: 0, existed: 0, noImage: 0, failed: 0, total: seeds.length };
  for (const s of seeds) {
    const r = await ensureThumb(s.pageId);
    if (r === "created") out.created++;
    else if (r === "exists") out.existed++;
    else if (r === "no-image") out.noImage++;
    else out.failed++;
  }
  return out;
}
