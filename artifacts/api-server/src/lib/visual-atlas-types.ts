import type { DensityPlan, EditorialCardDeck, VisualAtlasLayoutRecipe } from "../domain/editorial-cards/types";

export type ImageGenerationFailureCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "model_not_allowed"
  | "quality_not_allowed"
  | "size_not_allowed"
  | "connectivity_error"
  | "provider_error"
  | "no_image_returned"
  | "timeout"
  | "unknown";

export interface ImageGenerationFailure {
  code: ImageGenerationFailureCode;
  message: string;
  providerError: string | null;
  retryable: boolean;
  model: string;
  quality: string;
  promptHash: string;
}

export type VisualAtlasGenerationStatus =
  | "image_generated"
  | "image_failed"
  | "composer_draft_missing"
  | "post_render_failed";

export interface TrapItem {
  wrong: string;
  correction: string;
}

export interface AutocheckData {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  discardNotes: string[];
}

export interface VisualModule {
  num: string;
  title: string;
  description: string;
  idea?: string;
  recommendedDiagram?: string;
  maxMicrocopy?: string;
  examSignal?: string;
}

export interface VisualAtlasPageData {
  domainLabel:    string;
  pageNumber:     string;
  totalPages:     number;
  batchLabel:     string;
  title:          string;
  subtitle:       string;
  context:        string;
  guideQuestion:  string;
  upperVisualSrc: string;
  upperVisualAlt: string;
  traps:          TrapItem[];
  autocheck:      AutocheckData;
  contractVersion: string;
  visualModules:  VisualModule[];
  editorialDeck?: EditorialCardDeck;
  contentCut?: {
    contentCutId: string;
    snapshotIds: number[];
    sourceStatus: "locked" | "candidate" | "mixed";
    deckHash: string;
  };
  densityPlan?: DensityPlan;
  layoutRecipe?: VisualAtlasLayoutRecipe;
  imageFailure?: ImageGenerationFailure | null;
}
