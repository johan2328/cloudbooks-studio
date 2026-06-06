export type FormatAffinity =
  | "master_book"
  | "visual_atlas"
  | "exam_traps"
  | "question_bank"
  | "cheat_sheet"
  | "rapid_review";

export type EditorialCardRole =
  | "concept"
  | "flow"
  | "comparison"
  | "decision"
  | "trap"
  | "autocheck"
  | "exam_signal"
  | "example"
  | "micro_case"
  | "checklist";

export type EditorialCardStatus = "candidate" | "selected" | "rejected";
export type EditorialCardZone = "primary" | "complement" | "rail" | "reserve";
export type VisualAtlasLayoutMode = "4P" | "4P+2C" | "3P+1D+2C" | "Rail Compact" | "Rail Dense";
export type RailStrategy = "compact" | "standard" | "dense";

export interface EditorialCard {
  id: string;
  pageId: string;
  sourceSnapshotId?: number;
  role: EditorialCardRole;
  status: EditorialCardStatus;
  targetZone: EditorialCardZone;
  title: string;
  claim: string;
  explanation: string;
  diagramIntent: string;
  examSignal: string;
  sourceRefs: string[];
  formatAffinity: FormatAffinity[];
  densityScore: number;
  visualRisk: "low" | "medium" | "high";
}

export interface EditorialCardDeck {
  version: "editorial-card-deck-v1";
  pageId: string;
  source: "seed" | "composer" | "grounding" | "grounding_locked" | "grounding_candidate";
  generatedAt: string;
  contentCutId?: string;
  snapshotIds?: number[];
  cards: EditorialCard[];
  selectedCardIds: string[];
  rejectedCardIds: string[];
}

export interface VisualAtlasLayoutRecipe {
  mode: VisualAtlasLayoutMode;
  primaryCardIds: string[];
  complementaryCardIds: string[];
  railCardIds: string[];
  upperCardCount: number;
  railStrategy: RailStrategy;
  promptDirective: string;
  reason: string;
}

export interface DensityPlan {
  version: "useful-density-agent-v1";
  targetScore: 9.5;
  score: number;
  usefulDensityScore: number;
  status: "ready" | "grounding_required" | "rail_first" | "blocked_placeholder";
  groundingNeeded: boolean;
  groundingRationale: string;
  nextAction: "regenerate_with_deck" | "run_selective_grounding" | "compact_rail" | "fix_image_generation";
  problems: string[];
  recommendations: string[];
  rejectedCards: Array<{ cardId: string; reason: string }>;
  layoutRecipe: VisualAtlasLayoutRecipe;
}
