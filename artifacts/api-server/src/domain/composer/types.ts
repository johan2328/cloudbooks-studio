export type PageMode = "locked" | "composer";

export type ComposerTransitionLevel =
  | "composer_minor"
  | "composer_structural"
  | "composer_full";

export type ComposerBlockType =
  | "hero_title"
  | "context_deck"
  | "guide_question"
  | "diagram_panel"
  | "comparison_panel"
  | "decision_tree"
  | "map_panel"
  | "exam_traps"
  | "autocheck"
  | "exam_signal";

export type ComposerBlockVariant =
  | "full"
  | "compact"
  | "short"
  | "expanded"
  | "inline_badge"
  | "editorial_bar"
  | "single_focus"
  | "two_column"
  | "multi_step"
  | "sku_matrix"
  | "pros_cons"
  | "feature_split"
  | "binary_path"
  | "multi_branch"
  | "region_distribution"
  | "network_boundary"
  | "replication_path"
  | "standard"
  | "rule"
  | "warning"
  | "memory_hook";

export type ComposerCompositionFamily =
  | "comparison"
  | "architecture"
  | "decision"
  | "coverage_map"
  | "lifecycle";

export interface ComposerBlock {
  id: string;
  type: ComposerBlockType;
  variant: ComposerBlockVariant;
  required: boolean;
  minHeight: number;
  maxHeight: number;
  priority: number;
  dependsOn?: string[];
  scoreWeight?: number;
  content: Record<string, unknown>;
}

export interface ComposerStructuralValidation {
  passed: boolean;
  missing: string[];
  warnings: string[];
}

export interface ComposerEditorialValidation {
  coverageScore: number;
  readabilityScore: number;
  usefulDensityScore: number;
  examUtilityScore: number;
  consistencyScore: number;
  total: number;
}

export interface ComposerCoverageResult {
  technicalCore: boolean;
  examSignals: boolean;
  validationPresent: boolean;
  weakAreas: string[];
}

export interface LockedReferenceSummary {
  pageId: string;
  pageNumber: string;
  contractId: string;
  title: string;
  domain: string;
  preservedZones: string[];
}

export interface ComposerTransitionRecommendation {
  level: ComposerTransitionLevel;
  reason: string;
  unlockedCapabilities: string[];
  blockedCapabilities: string[];
}

export interface ComposerPageDraft {
  pageId: string;
  pageNumber: string;
  mode: "composer";
  family: ComposerCompositionFamily;
  blocks: ComposerBlock[];
  visualDensityPlan?: {
    problem: string;
    affectedZone: "upper_visual" | "exam_rail" | "full_page";
    proposedAction: string;
    expectedImpact: string;
    risk: string;
  };
  coverage: ComposerCoverageResult;
  structuralValidation: ComposerStructuralValidation;
  editorialValidation: ComposerEditorialValidation;
}

export interface ComposerProposal {
  source: "api_visual_atlas_composer_v1";
  pageId: string;
  lockedReference: LockedReferenceSummary;
  recommendedTransition: ComposerTransitionRecommendation;
  draft: ComposerPageDraft;
  nextActions: string[];
}
