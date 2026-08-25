import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG } from "../config.js";
import { atomicWriteFile, withLock } from "../fs-safe.js";

/**
 * COLA DE REVISIÓN HUMANA de claims CONTESTADOS del Master Book.
 *
 * El pipeline auto-resuelve la mayoría (reparación dirigida + hoja de datos duros + doble-voto). Lo que NO
 * puede resolver solo —un claim que BLOQUEÓ el capítulo, o un 'wrong' que el 2º voto NO confirmó (disputa
 * genuina, p. ej. un dato en transición como FIPS 140-2 vs 140-3)— se ENCOLA acá para que un humano adjudique.
 * Convierte el riesgo de exactitud (abierto, infinito) en un proceso ACOTADO y observable: 1-2 items por libro.
 *
 * Keyed por cert+format (como el chapter-store / route-panel-store) para que la sombra y el libro vivo no se
 * pisen. Idempotente por (capítulo + texto del claim): re-encolar preserva la decisión humana previa.
 */
export type ClaimReviewStatus = "pending" | "accepted" | "rejected";   // accepted = el claim es correcto (el gate se pasó); rejected = es un error real, corregir
export type ClaimReviewKind = "blocked" | "unconfirmed" | "practice";  // blocked = contradicho que bloqueó; unconfirmed = 'wrong' sin 2º voto; practice = ítem de práctica dropeado por respuesta/CLI incorrecta

export interface ClaimReviewItem {
  id: string;
  chapterId: string;
  chapterNumber: string;
  title: string;
  domainLabel: string;
  claimText: string;
  verdict: string;
  note: string;
  sourceId: string | null;
  kind: ClaimReviewKind;
  status: ClaimReviewStatus;
  createdAt: string;
  updatedAt: string;
  resolvedBy?: string;
}

export interface ClaimReviewInput { claimText: string; verdict: string; note: string; sourceId: string | null; kind: ClaimReviewKind }

function storePath(): string { return path.join(CONFIG.outputRoot, `_claim-reviews.${CONFIG.certId}.${CONFIG.format}.json`); }
type Store = Record<string, ClaimReviewItem>;   // id → item
function read(): Store { try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Store; } catch { return {}; } }

const idOf = (chapterId: string, claimText: string): string =>
  crypto.createHash("sha256").update(`${chapterId}|${claimText}`).digest("hex").slice(0, 16);

/** Todas las revisiones: PENDIENTES primero, luego por fecha desc. */
export function listClaimReviews(): ClaimReviewItem[] {
  return Object.values(read()).sort((a, b) => {
    if ((a.status === "pending") !== (b.status === "pending")) return a.status === "pending" ? -1 : 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

/** Encola/actualiza los claims contestados de un capítulo (idempotente por claim). PRESERVA la decisión
 *  humana si el item ya existía → no re-abre lo resuelto (salvo que cambie el texto del claim → nuevo id). */
export async function enqueueClaimReviews(
  meta: { chapterId: string; chapterNumber: string; title: string; domainLabel: string },
  items: ClaimReviewInput[],
): Promise<void> {
  if (items.length === 0) return;
  await withLock("claim-review", async () => {
    const store = read();
    const now = new Date().toISOString();
    for (const it of items) {
      const id = idOf(meta.chapterId, it.claimText);
      const prev = store[id];
      store[id] = {
        id, chapterId: meta.chapterId, chapterNumber: meta.chapterNumber, title: meta.title, domainLabel: meta.domainLabel,
        claimText: it.claimText, verdict: it.verdict, note: it.note, sourceId: it.sourceId, kind: it.kind,
        status: prev?.status ?? "pending", createdAt: prev?.createdAt ?? now, updatedAt: now, resolvedBy: prev?.resolvedBy,
      };
    }
    fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
    await atomicWriteFile(storePath(), JSON.stringify(store, null, 2), "claim-review");
  });
}

/** Aplica la decisión humana a una revisión (accepted/rejected/pending). Devuelve el item actualizado o null. */
export async function resolveClaimReview(id: string, status: ClaimReviewStatus, resolvedBy?: string): Promise<ClaimReviewItem | null> {
  return withLock("claim-review", async () => {
    const store = read();
    const item = store[id];
    if (!item) return null;
    item.status = status; item.updatedAt = new Date().toISOString(); if (resolvedBy) item.resolvedBy = resolvedBy;
    fs.mkdirSync(CONFIG.outputRoot, { recursive: true });
    await atomicWriteFile(storePath(), JSON.stringify(store, null, 2), "claim-review");
    return item;
  });
}

/** Cantidad de revisiones PENDIENTES (para el gate de la corrida y el badge del panel). */
export function pendingClaimReviewCount(): number {
  return Object.values(read()).filter((x) => x.status === "pending").length;
}
