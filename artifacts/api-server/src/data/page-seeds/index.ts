import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import page01 from "./01";

const PAGE_SEEDS: Record<string, VisualAtlasPageData> = {
  "01": page01,
};

export type SeedResult =
  | { found: true;  data: VisualAtlasPageData }
  | { found: false; reason: "seed_missing"; availableSeeds: string[] };

export function getSeed(pageId: string): SeedResult {
  const data = PAGE_SEEDS[pageId];
  if (data) return { found: true, data };
  return {
    found: false,
    reason: "seed_missing",
    availableSeeds: Object.keys(PAGE_SEEDS),
  };
}

export function hasSeed(pageId: string): boolean {
  return pageId in PAGE_SEEDS;
}

export { PAGE_SEEDS };
