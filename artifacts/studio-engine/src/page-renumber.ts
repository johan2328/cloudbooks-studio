import fs from "node:fs";
import { pageOutputDir } from "./config.js";
import { listPersistedPages, rekeyPersistedPage } from "./page-store.js";
import { pageNumberForSkill } from "./skills/ai-200-outline.js";
import { rekeyApproval } from "./infographic-approvals.js";
import { rekeyEditorial } from "./editorial-store.js";
import { rekeyBookIssues } from "./book/book-review-store.js";

/**
 * RENUMERACIÓN POR UNIDAD. El id de cada página pasa a ser su posición en el
 * temario oficial (`pageNumberForSkill`): página 01 = primera unidad. Reubicar
 * una página = mover su output + re-keyear TODO lo keyed por pageId (store,
 * aprobación, editorial, issues de libro). La relevancia es por skillId → no se toca.
 */

/** Reubica una página de oldId → newId: mueve su carpeta de output y re-keya los stores. */
export async function relocatePage(oldId: string, newId: string): Promise<void> {
  if (oldId === newId) return;
  // Mover la carpeta de output (preserva la infografía generada/aprobada).
  try {
    const oldDir = pageOutputDir(oldId), newDir = pageOutputDir(newId);
    if (fs.existsSync(oldDir)) {
      if (fs.existsSync(newDir)) fs.rmSync(newDir, { recursive: true, force: true });
      fs.renameSync(oldDir, newDir);
    }
  } catch { /* output best-effort: si no se pudo mover, el store igual queda consistente */ }
  rekeyPersistedPage(oldId, newId);
  await rekeyApproval(oldId, newId);
  rekeyEditorial(oldId, newId);
  rekeyBookIssues(oldId, newId);
}

export interface RenumberResult {
  moved: { old: string; new: string; skillId: string }[];
  unchanged: number;
  total: number;
}

/**
 * Renumera TODAS las páginas persistidas a su ordinal de temario. Dos fases (vía
 * ids temporales) para no pisar un slot ocupado por otra página que también se
 * mueve. Idempotente: si ya están numeradas, no hace nada.
 */
export async function renumberPagesToCurriculum(): Promise<RenumberResult> {
  const pages = listPersistedPages();
  const plan = pages
    .map((p) => {
      const skillId = p.provenance.skillIds[0] ?? "";
      const target = pageNumberForSkill(skillId);
      return { old: p.seed.pageId, target, skillId };
    })
    .filter((x): x is { old: string; target: string; skillId: string } => !!x.target && x.target !== x.old);

  if (plan.length === 0) return { moved: [], unchanged: pages.length, total: pages.length };

  // Fase 1: old → temp (evita colisiones cuando un target = old de otra página).
  for (const it of plan) await relocatePage(it.old, `__mig_${it.skillId}`);
  // Fase 2: temp → target final.
  for (const it of plan) await relocatePage(`__mig_${it.skillId}`, it.target);

  return {
    moved: plan.map((it) => ({ old: it.old, new: it.target, skillId: it.skillId })),
    unchanged: pages.length - plan.length,
    total: pages.length,
  };
}
