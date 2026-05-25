import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import page01 from "./01";
import page02 from "./02";
import page03 from "./03";
import page04 from "./04";
import page05 from "./05";
import page06 from "./06";
import page07 from "./07";
import page08 from "./08";
import page09 from "./09";
import page10 from "./10";

const PAGE_SEEDS: Record<string, VisualAtlasPageData> = {
  "01": page01,
  "02": page02,
  "03": page03,
  "04": page04,
  "05": page05,
  "06": page06,
  "07": page07,
  "08": page08,
  "09": page09,
  "10": page10,
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

export function listSeeds(): Array<{ pageId: string; data: VisualAtlasPageData }> {
  return Object.entries(PAGE_SEEDS)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([pageId, data]) => ({ pageId, data }));
}

export { PAGE_SEEDS };
