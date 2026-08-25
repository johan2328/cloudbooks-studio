import { CONFIG } from "./config.js";
import { listSeeds } from "./seeds.js";
import { readOutputStatus } from "./output-status.js";
import { listPersistedPages } from "./page-store.js";
import { getInfographicManifest } from "./generate-infographic.js";
import { getApprovals } from "./infographic-approvals.js";
import { totalUnits, getSkill } from "./skills/ai-200-outline.js";
import { hasOpenAIKey } from "./openai-client.js";
import type { Catalog, KeyStatus } from "./types.js";

/** ¿`a` es posterior a `b`? (fechas ISO; si falta alguna → false, no molesta). */
function isAfter(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const ta = Date.parse(a), tb = Date.parse(b);
  return Number.isFinite(ta) && Number.isFinite(tb) && ta > tb;
}

/** Catálogo operativo: seeds + estado de outputs en el filesystem del motor. */
export async function buildCatalog(): Promise<Catalog> {
  const seeds = listSeeds();
  const approvals = getApprovals();
  // Leer el store de provenance UNA sola vez (antes getProvenance re-leía _pages.json por
  // página → O(n²): 98 lecturas del store entero, ~5s con el libro completo).
  const provById = new Map(listPersistedPages().map((p) => [p.seed.pageId, p.provenance]));
  const pages = await Promise.all(
    seeds.map(async (s) => {
      const prov = provById.get(s.pageId) ?? null;
      const manifest = getInfographicManifest(s.pageId);
      const contentUpdatedAt = prov?.updatedAt ?? null;
      const imageGeneratedAt = manifest?.generatedAt ?? null;
      const appr = approvals.pages[s.pageId];
      const approved = appr?.approved ?? false;
      return {
        pageId: s.pageId,
        pageNumber: s.pageNumber,
        totalPages: s.totalPages,
        title: s.title,
        subtitle: s.subtitle,
        domain: s.domainLabel,
        batch: s.batchLabel,
        context: s.context,
        guideQuestion: s.guideQuestion,
        contractVersion: CONFIG.contractVersion,
        groundingStatus: prov?.groundingStatus ?? ("seeded" as const),
        skillIds: s.skillIds ?? [],
        generationReady: true,
        visualModules: s.visualModules,
        traps: s.traps,
        autocheck: s.autocheck,
        outputStatus: await readOutputStatus(s.pageId),
        imageGeneratedAt,
        imageOutcome: manifest?.outcome ?? null,
        imageQaOk: manifest?.qa?.ok ?? null,
        contentUpdatedAt,
        needsRegen: !!imageGeneratedAt && isAfter(contentUpdatedAt, imageGeneratedAt),
        approved,
        approvalStale: approved && isAfter(contentUpdatedAt, appr?.at ?? null),
        // Origen: la página oficial (MS Learn) de la unidad que groundeó esta lámina (control de origen).
        sourceUrl: getSkill((s.skillIds ?? [])[0] ?? "")?.url ?? null,
      };
    }),
  );

  return {
    source: "engine_seed_and_output_status",
    engine: "studio-engine-v1",
    totalExpected: totalUnits(),
    availableSeeds: seeds.map((s) => s.pageId),
    pages,
  };
}

export function buildKeyStatus(): KeyStatus {
  return {
    hasKey: hasOpenAIKey(),
    engine: "studio-engine-v1",
    store: CONFIG.store,
    textModel: CONFIG.textModel,
    imageModel: CONFIG.imageModel,
    imageQuality: CONFIG.imageQuality,
    contractVersion: CONFIG.contractVersion,
    certId: CONFIG.certId,
    format: CONFIG.format,
  };
}
