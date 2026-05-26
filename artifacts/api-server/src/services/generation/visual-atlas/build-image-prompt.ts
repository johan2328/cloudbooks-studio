import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";
import { buildUpperVisualPrompt } from "../../../domain/editorial-contracts/visual-atlas-v24";

/**
 * Compatibility wrapper: the prompt is owned by the centralized v24 contract.
 */
export function buildImagePrompt(data: VisualAtlasPageData): string {
  return buildUpperVisualPrompt(data);
}
