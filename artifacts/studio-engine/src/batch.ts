import { getSeed } from "./seeds.js";
import { persistAuthored } from "./grounding/persist-page.js";
import { generatePage } from "./generate.js";
import { editorialQa, buildEditorialContext } from "./qa-editorial.js";
import { saveEditorial } from "./editorial-store.js";
import { premiumVerdict } from "./premium-verdict.js";
import { setArtApproved } from "./approvals.js";
import { costStatus } from "./cost.js";
import type { GroundingStatus, PremiumVerdictKind } from "./types.js";

export interface BatchItem {
  skillId: string;
  pageId: string | null;
  groundingStatus: GroundingStatus | null;
  groundingScore: number | null;
  editorialOverall: number | null;
  verdict: PremiumVerdictKind | null;
  blockedReasons: string[];
  step: string;            // hasta dónde llegó (para diagnosticar fallas)
  error: string | null;
}

export interface BatchResult {
  recipeId: string;
  total: number;
  persisted: number;       // borrador → página creada (grounding no bloqueó)
  verified: number;        // grounding verified
  productionReady: number;
  needsHumanArt: number;
  blocked: number;
  failed: number;          // error técnico
  spentBeforeUsd: number;
  spentAfterUsd: number;
  items: BatchItem[];
}

/**
 * RUNNER DE LOTE (camino al libro): por cada skill corre el pipeline riguroso
 * completo — redactar+anclar+verificar (persist) → generar (imagen de dominio,
 * reusada → ~$0) → QA editorial contra fuentes → veredicto premium. No aprueba
 * arte (sello humano) salvo opt-in. Reporta cuántas llegan a verified / lista
 * para revisión de arte / bloqueada, para ver si el rigor escala más de 1 página.
 */
export async function runBatch(skillIds: string[], recipeId: string, opts?: { approveArt?: boolean }): Promise<BatchResult> {
  const spentBeforeUsd = costStatus().spentUsd;
  const items: BatchItem[] = [];

  for (const skillId of skillIds) {
    const item: BatchItem = { skillId, pageId: null, groundingStatus: null, groundingScore: null, editorialOverall: null, verdict: null, blockedReasons: [], step: "persist", error: null };
    try {
      const p = await persistAuthored(skillId);
      item.groundingStatus = p.groundingStatus;
      item.groundingScore = p.groundingScore;
      if (!p.ok || !p.pageId) {
        item.error = p.blocked ? `grounding bloqueado: ${p.reason}` : (p.error ?? "no persistió");
        items.push(item);
        continue;
      }
      item.pageId = p.pageId;

      item.step = "generate";
      await generatePage(p.pageId, recipeId);

      item.step = "editorial";
      const seed = getSeed(p.pageId)!;
      const ed = await editorialQa(seed, buildEditorialContext(p.pageId));
      saveEditorial(p.pageId, ed);
      item.editorialOverall = ed.outcome === "real" ? ed.overall : null;

      if (opts?.approveArt) setArtApproved(p.pageId, true);

      item.step = "verdict";
      const v = await premiumVerdict(p.pageId);
      item.verdict = v.verdict;
      item.blockedReasons = v.gates.filter((g) => g.blocks && !g.passed).map((g) => g.note);
      item.step = "done";
    } catch (err) {
      item.error = String((err as Error)?.message ?? err);
    }
    items.push(item);
  }

  const spentAfterUsd = costStatus().spentUsd;
  return {
    recipeId,
    total: skillIds.length,
    persisted: items.filter((i) => i.pageId).length,
    verified: items.filter((i) => i.groundingStatus === "verified").length,
    productionReady: items.filter((i) => i.verdict === "production_ready").length,
    needsHumanArt: items.filter((i) => i.verdict === "needs_human_art").length,
    blocked: items.filter((i) => i.verdict === "blocked").length,
    failed: items.filter((i) => i.error && !i.pageId).length,
    spentBeforeUsd,
    spentAfterUsd,
    items,
  };
}
