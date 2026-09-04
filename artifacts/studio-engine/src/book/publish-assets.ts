import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";

/**
 * PUBLICACION DE ASSETS (Fase 2' de la migracion de peso del repo — docs/ARCHITECTURE.md).
 *
 * El motor escribe TODO en `outputRoot` (~1.4 GB: paginas intermedias, _export, tomas de portada
 * descartadas, POCs). Pero la TIENDA solo sirve un subconjunto chico: por cada libro PUBLICADO,
 * su portada, su contratapa y las muestras de la ficha (~48 archivos / 76 MB medidos).
 *
 * Este modulo materializa ese subconjunto en `publishRoot` **espejando la ruta relativa**, de modo
 * que las URLs (`/assets/cloudbooks-engine/...`) no cambian ni en los `_book-config` ni en el front.
 *
 * Hoy `publishRoot === outputRoot` por defecto → la copia es un no-op y el valor esta en el
 * MANIFIESTO (saber exactamente que necesita produccion). Cuando la Fase 3' saque el working root
 * del arbol servido, este mismo paso empieza a copiar de verdad, sin cambiar nada mas.
 */

export interface PublishedFile { url: string; bytes: number; copied: boolean; reason?: string }
export interface PublishResult {
  ok: boolean;
  dryRun: boolean;
  sameRoot: boolean;          // publishRoot === outputRoot (copia innecesaria)
  books: { book: string; status: string; files: number }[];
  files: PublishedFile[];
  totalFiles: number;
  totalBytes: number;
  missing: string[];          // referenciados por un config pero ausentes en disco
  error?: string;
}

/** URL publica (`/assets/cloudbooks-engine/x/y.png`) -> ruta relativa dentro del root (`x/y.png`). */
function urlToRelative(url: string): string | null {
  if (typeof url !== "string" || !url.startsWith(`${CONFIG.publicAssetsBase}/`)) return null;
  const rel = decodeURIComponent(url.slice(CONFIG.publicAssetsBase.length + 1)).replace(/\\/g, "/");
  // Sin path traversal ni rutas absolutas.
  if (!rel || rel.startsWith("/") || rel.split("/").includes("..")) return null;
  return rel;
}

/** Lee los `_book-config.{cert}.{format}.json` del working root y junta lo que la tienda sirve. */
function collectPublishable(): { books: PublishResult["books"]; urls: Set<string> } {
  const books: PublishResult["books"] = [];
  const urls = new Set<string>();
  let names: string[] = [];
  try { names = fs.readdirSync(CONFIG.outputRoot).filter((n) => /^_book-config\..+\.json$/.test(n)); } catch { return { books, urls }; }

  for (const name of names.sort()) {
    let cfg: Record<string, unknown>;
    try { cfg = JSON.parse(fs.readFileSync(path.join(CONFIG.outputRoot, name), "utf8")) as Record<string, unknown>; } catch { continue; }
    const ficha = (cfg.ficha ?? {}) as { status?: string; samples?: unknown };
    const status = String(ficha.status ?? "-");
    // Solo se publica lo PUBLICADO: un borrador no debe filtrarse a la tienda.
    if (status !== "publicado") { books.push({ book: name.replace(/^_book-config\.|\.json$/g, ""), status, files: 0 }); continue; }

    const before = urls.size;
    const add = (u: unknown): void => { const r = typeof u === "string" ? urlToRelative(u) : null; if (r) urls.add(r); };
    add((cfg.cover as { imageUrl?: unknown } | undefined)?.imageUrl);
    add((cfg.backCover as { imageUrl?: unknown } | undefined)?.imageUrl);
    for (const s of Array.isArray(ficha.samples) ? ficha.samples : []) add(s);
    // El propio config es la fuente de la ficha (precio, ISBN, copy) → tambien viaja.
    urls.add(name);
    books.push({ book: name.replace(/^_book-config\.|\.json$/g, ""), status, files: urls.size - before });
  }
  return { books, urls };
}

/** Copia (o simula) el subconjunto publicable de `outputRoot` a `publishRoot`. */
export function publishAssets(dryRun = false): PublishResult {
  const sameRoot = path.resolve(CONFIG.outputRoot) === path.resolve(CONFIG.publishRoot);
  const { books, urls } = collectPublishable();
  const files: PublishedFile[] = [];
  const missing: string[] = [];
  let totalBytes = 0;

  for (const rel of [...urls].sort()) {
    const src = path.join(CONFIG.outputRoot, rel);
    let bytes = 0;
    try { bytes = fs.statSync(src).size; } catch { missing.push(rel); continue; }
    totalBytes += bytes;

    if (sameRoot || dryRun) {
      files.push({ url: `${CONFIG.publicAssetsBase}/${rel}`, bytes, copied: false, reason: sameRoot ? "publishRoot === outputRoot (nada que copiar)" : "dry-run" });
      continue;
    }
    const dst = path.join(CONFIG.publishRoot, rel);
    try {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      files.push({ url: `${CONFIG.publicAssetsBase}/${rel}`, bytes, copied: true });
    } catch (err) {
      files.push({ url: `${CONFIG.publicAssetsBase}/${rel}`, bytes, copied: false, reason: String((err as Error)?.message ?? err) });
    }
  }

  return { ok: true, dryRun, sameRoot, books, files, totalFiles: files.length, totalBytes, missing };
}
