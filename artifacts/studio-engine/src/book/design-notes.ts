import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * NOTAS DE MEJORA por pieza de diseño (Auto Pages · F2). Además del canonical (ancla),
 * el humano deja una aclaración de diseño por asset (portada/contra/ruta/capítulo) que se
 * APPENDEA al prompt de image-2 en cada regeneración (image edit = ref-image + prompt).
 * Persistida por libro en `_design-notes.{cert}.{format}.json` → `Record<assetKey, note>`.
 * assetKey: "cover" · "back" · "route:{domainId}" · "chapter:{chapterId}".
 */
type Notes = Record<string, string>;
function storePath(): string { return path.join(CONFIG.outputRoot, CONFIG.certId, CONFIG.format, "_book", "design-notes.json"); }

function load(): Notes {
  try { const n = JSON.parse(fs.readFileSync(storePath(), "utf8")) as Notes; return n && typeof n === "object" ? n : {}; } catch { return {}; }
}
function save(n: Notes): void {
  fs.mkdirSync(path.dirname(storePath()), { recursive: true });
  atomicWriteFileSync(storePath(), JSON.stringify(n, null, 2), "design-notes");
}

/** Todas las notas del libro activo. */
export function getAllDesignNotes(): Notes { return load(); }
/** Nota de una pieza (string vacío si no hay). */
export function getDesignNote(assetKey: string): string { return load()[assetKey] ?? ""; }
/** Setea/borra la nota de una pieza. */
export function setDesignNote(assetKey: string, note: string): Notes {
  const n = load();
  const v = note.trim();
  if (v) n[assetKey] = v; else delete n[assetKey];
  save(n);
  return n;
}

/** Bloque a APPENDEAR al prompt de image-2 si la pieza tiene nota (foco/ajuste del humano). */
export function notePromptBlock(assetKey: string): string {
  const v = getDesignNote(assetKey);
  return v ? `\n\nDESIGN FOCUS (human refinement — apply on top of the reference, keep the brand/layout): ${v}` : "";
}
