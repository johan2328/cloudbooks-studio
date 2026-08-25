import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import type { Source } from "../types.js";

/**
 * Corpus de fuentes (grounding) en file-store. Postgres llega en la corrida 17;
 * por ahora un JSON en el outputRoot, igual que el ledger de costo. Upsert por
 * id/url para idempotencia (re-ingerir una URL actualiza su texto, no duplica).
 */
// Corpus POR CERT (`_sources.{certId}.json`) → un cert nuevo NO hereda las fuentes de AI-200. Revert con
// ENGINE_PERCERT_STORES=off (vuelve al global legacy). Ver plan del barrido cross-cert.
const PERCERT_STORES = process.env.ENGINE_PERCERT_STORES !== "off";
function storePath(): string {
  return PERCERT_STORES
    ? path.join(CONFIG.outputRoot, `_sources.${CONFIG.certId}.json`)
    : path.join(CONFIG.outputRoot, "_sources.json");
}
// Migración one-time: el corpus GLOBAL legacy `_sources.json` es de AI-200 (único cert generado hasta ahora) →
// copiarlo a `_sources.ai-200.json` la primera vez. Otros certs arrancan con corpus VACÍO (colectan el propio).
function ensureMigrated(): void {
  if (!PERCERT_STORES) return;
  const p = storePath();
  if (fs.existsSync(p) || CONFIG.certId !== "ai-200") return;
  const legacy = path.join(CONFIG.outputRoot, "_sources.json");
  if (fs.existsSync(legacy)) { try { fs.copyFileSync(legacy, p); } catch { /* best-effort */ } }
}

export function listSources(): Source[] {
  ensureMigrated();
  try {
    return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Source[];
  } catch {
    return [];
  }
}

function writeAll(sources: Source[]): void {
  atomicWriteFileSync(storePath(), JSON.stringify(sources, null, 2), "sources");
}

export function getSource(id: string): Source | null {
  return listSources().find((s) => s.id === id) ?? null;
}

export function hashText(t: string): string {
  return crypto.createHash("sha256").update(t).digest("hex").slice(0, 16);
}

export function sourceId(url: string | null, title: string): string {
  return crypto.createHash("sha256").update(`${url ?? ""}|${title}`).digest("hex").slice(0, 12);
}

/** Upsert por id o por url. Conserva addedAt si ya existía. */
export function upsertSource(s: Omit<Source, "addedAt"> & { addedAt?: string }): Source {
  const all = listSources();
  const full: Source = { ...s, addedAt: s.addedAt ?? new Date().toISOString() };
  const idx = all.findIndex((x) => x.id === full.id || (!!full.url && x.url === full.url));
  if (idx >= 0) {
    const prev = all[idx]!;
    full.addedAt = prev.addedAt;
    all[idx] = full;
  } else {
    all.push(full);
  }
  writeAll(all);
  return full;
}

export function removeSource(id: string): boolean {
  const all = listSources();
  const next = all.filter((s) => s.id !== id);
  if (next.length === all.length) return false;
  writeAll(next);
  return true;
}
