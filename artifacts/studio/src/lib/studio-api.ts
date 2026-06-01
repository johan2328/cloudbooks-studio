export type GenerationMode = "openai_image" | "placeholder_image" | "fallback_html" | "none";

export interface StudioOutputStatus {
  pageId: string;
  hasOutput: boolean;
  generationMode: GenerationMode;
  templateApproach: string | null;
  layoutRevision: string | null;
  currentLayoutRevision: string;
  generatedAt: string | null;
  approvedAt: string | null;
  files: {
    html: boolean;
    metadata: boolean;
    qaReport: boolean;
    upperVisual: boolean;
    previewPng: boolean;
    previewSvg: boolean;
    approved: boolean;
  };
  htmlPath: string | null;
  previewPath: string | null;
}

export interface StudioQaReport {
  verdict: "approved" | "needs_revision";
  scores: Record<string, number>;
  observations: string[];
  redTeamLog: string[];
  generatedAt?: string | null;
  layoutEvidence?: StudioLayoutEvidence | null;
  layoutEngine?: StudioLayoutEngineReport | null;
  raw?: string;
}

export interface StudioLayoutEngineAction {
  id: "regenerate_full" | "boost_technical_core" | "compact_exam_rail" | "expand_context" | "human_visual_review" | "approve_candidate";
  label: string;
  scope: "full" | "technical_core" | "exam_rail" | "qa_review";
  priority: number;
  reason: string;
  expectedImpact: string;
}

export interface StudioLayoutEngineReport {
  version: "visual-atlas-layout-engine-v1";
  readiness: "approved_candidate" | "needs_targeted_fix" | "blocked";
  score: number;
  summary: string;
  primaryAction: StudioLayoutEngineAction;
  actions: StudioLayoutEngineAction[];
  batchGate: {
    canBatch: boolean;
    reason: string;
  };
  constraints: {
    targetScore: number;
    maxUpperFreeVerticalPx: number;
    minUpperImageSharePct: number;
    maxExamRailSharePct: number;
    minLayoutScoreForBatch: number;
  };
  evidenceFingerprint: string;
}

export interface StudioLayoutEvidence {
  page: {
    width: number;
    height: number;
  };
  zonesPresent: Record<string, boolean>;
  upper: {
    rowHeight: number;
    slotHeight: number;
    slotWidth: number;
    freeVerticalPx: number;
    imageSlotSharePct: number;
  };
  examRail: {
    rowHeight: number;
    sharePct: number;
    trapItems: number;
    autocheckOptions: number;
    discardNotes: number;
    fillerBlocks: number;
    trapChars: number;
    autocheckChars: number;
    densityBand: "thin" | "balanced" | "dense";
  };
  projectedVsReal: {
    expectedBodyHeight: number;
    measuredBodyHeight: number;
    bodyDeltaPx: number;
    expectedUpperRowHeight: number;
    upperDeltaPx: number;
  };
  warnings: string[];
  blockers: string[];
  score: number;
}

export interface StudioActivityLog {
  id: string;
  actionType: string;
  pageId: number | null;
  pageNumber: string | null;
  pageTitle: string | null;
  userId: number | null;
  userName: string;
  result: string;
  note: string | null;
  createdAt: string;
}

export interface StudioTimeToApprovableItem {
  pageNumber: string;
  startedAt: string;
  approvedAt: string;
  minutes: number;
}

export interface StudioActivitySummary {
  timeToApprovable: {
    samples: number;
    avgMinutes: number | null;
    byPage: StudioTimeToApprovableItem[];
  };
}

export interface StudioActivityResponse {
  logs: StudioActivityLog[];
  summary: StudioActivitySummary;
}

export interface StudioVisualModule {
  num: string;
  title: string;
  description: string;
}

export interface StudioTrap {
  wrong: string;
  correction: string;
}

export interface StudioAutocheck {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  discardNotes: string[];
}

export interface StudioCatalogPage {
  pageId: string;
  pageNumber: string;
  totalPages: number;
  title: string;
  domain: string;
  batch: string;
  context: string;
  guideQuestion: string;
  contractVersion: string;
  groundingStatus: "seeded";
  generationReady: boolean;
  visualModules: StudioVisualModule[];
  traps: StudioTrap[];
  autocheck: StudioAutocheck;
  outputStatus: StudioOutputStatus;
}

export interface StudioCatalog {
  source: "server_seed_and_output_status";
  totalExpected: number;
  availableSeeds: string[];
  pages: StudioCatalogPage[];
}

export interface StudioRuntimeInfo {
  gitSha: string | null;
  gitBranch: string | null;
  gitDirty: boolean;
  syncCommand: string;
  secretsSource: string;
}

export interface StudioKeyStatus {
  hasKey: boolean;
  textModel: string;
  imageModel: string;
  imageQuality: string;
  allowHighQuality: boolean;
  blockLegacyImgModel: boolean;
  costGuardrail: string;
  templateVersion: string;
  approach: string;
  runtime: StudioRuntimeInfo;
}

export interface ComposerProposalPageSummary {
  pageId: string;
  pageNumber: string;
  family: string;
  recommendedTransition: string;
  totalScore: number;
  missing: string[];
}

export interface ComposerCatalogResponse {
  source: "api_visual_atlas_composer_v1";
  pages: ComposerProposalPageSummary[];
}

export interface ComposerBlock {
  id: string;
  type: string;
  variant: string;
  required: boolean;
  minHeight: number;
  maxHeight: number;
  priority: number;
  dependsOn?: string[];
  scoreWeight?: number;
  content: Record<string, unknown>;
}

export interface ComposerProposal {
  source: "api_visual_atlas_composer_v1";
  pageId: string;
  lockedReference: {
    pageId: string;
    pageNumber: string;
    contractId: string;
    title: string;
    domain: string;
    preservedZones: string[];
  };
  recommendedTransition: {
    level: "composer_minor" | "composer_structural" | "composer_full";
    reason: string;
    unlockedCapabilities: string[];
    blockedCapabilities: string[];
  };
  draft: {
    pageId: string;
    pageNumber: string;
    mode: "composer";
    family: "comparison" | "architecture" | "decision" | "coverage_map" | "lifecycle";
    blocks: ComposerBlock[];
    coverage: {
      technicalCore: boolean;
      examSignals: boolean;
      validationPresent: boolean;
      weakAreas: string[];
    };
    structuralValidation: {
      passed: boolean;
      missing: string[];
      warnings: string[];
    };
    editorialValidation: {
      coverageScore: number;
      readabilityScore: number;
      usefulDensityScore: number;
      examUtilityScore: number;
      consistencyScore: number;
      total: number;
    };
  };
  nextActions: string[];
}

export interface ComposerDraftRecord {
  pageId: string;
  pageNumber: string;
  family: string;
  transitionLevel: string;
  draft: ComposerProposal["draft"];
  note: string | null;
  updatedByName: string;
  updatedAt: string;
}

export interface ComposerActionLogRecord {
  id: string;
  pageId: string;
  kind: "shortcut" | "generate" | "autofix" | "rollback";
  action: string;
  status: "ok" | "error" | "info";
  beforeTotal: number | null;
  afterTotal: number | null;
  delta: number | null;
  changedBlocks: number;
  note: string;
  userName: string;
  createdAt: string;
}

export interface ComposerBatchRunItem {
  runRowId: number;
  pageDbId: number;
  pageId: string;
  title: string;
  status: "queued" | "running" | "completed" | "failed" | string;
  startedAt: string | null;
  finishedAt: string | null;
  output: string | null;
  error: string | null;
}

export interface ComposerBatchRunStatus {
  runId: string;
  batchKey: string;
  done: boolean;
  counts: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
  };
  items: ComposerBatchRunItem[];
}

export interface StudioContractChangelogEntry {
  version: string;
  note: string;
  at: string;
}

export interface StudioVisualContract {
  id: number;
  version: string;
  nonNegotiable: string[];
  flexibleStorytelling: string[];
  stableComponents: string[];
  changelog: StudioContractChangelogEntry[];
  updatedAt: string;
}

export interface StudioVisualContractUpdateInput {
  version?: string;
  nonNegotiable?: string[];
  flexibleStorytelling?: string[];
  stableComponents?: string[];
  changeNote?: string;
}

export function getStudioToken(): string {
  return localStorage.getItem("studio_token") ?? "";
}

export function authHeaders(): HeadersInit {
  const token = getStudioToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStudioCatalog(): Promise<StudioCatalog> {
  const res = await fetch("/api/studio/visual-atlas-pages", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar el catalogo operativo (${res.status})`);
  return res.json() as Promise<StudioCatalog>;
}

export async function fetchStudioOutputStatus(pageId: string): Promise<StudioOutputStatus | null> {
  const res = await fetch(`/api/studio/output-status/${pageId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<StudioOutputStatus>;
}

export async function fetchStudioQaReport(pageId: string): Promise<StudioQaReport | null> {
  const res = await fetch(`/api/studio/qa-report/${pageId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<StudioQaReport>;
}

export async function fetchStudioKeyStatus(): Promise<StudioKeyStatus> {
  const res = await fetch("/api/studio/key-status", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar el runtime del Studio (${res.status})`);
  return res.json() as Promise<StudioKeyStatus>;
}

export async function fetchComposerCatalog(): Promise<ComposerCatalogResponse> {
  const res = await fetch("/api/studio/composer/pages", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar el catalogo composer (${res.status})`);
  return res.json() as Promise<ComposerCatalogResponse>;
}

export async function fetchComposerProposal(pageId: string): Promise<ComposerProposal> {
  const res = await fetch(`/api/studio/composer/proposal/${pageId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar la propuesta composer para ${pageId} (${res.status})`);
  return res.json() as Promise<ComposerProposal>;
}

export async function fetchComposerDraft(pageId: string): Promise<ComposerDraftRecord> {
  const res = await fetch(`/api/studio/composer/draft/${pageId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar el draft composer para ${pageId} (${res.status})`);
  return res.json() as Promise<ComposerDraftRecord>;
}

export async function saveComposerDraft(pageId: string, payload: {
  pageNumber: string;
  family: string;
  transitionLevel: string;
  draft: ComposerProposal["draft"];
  note?: string | null;
}): Promise<ComposerDraftRecord> {
  const res = await fetch(`/api/studio/composer/draft/${pageId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`No se pudo guardar el draft composer para ${pageId} (${res.status})`);
  return res.json() as Promise<ComposerDraftRecord>;
}

export async function logComposerAutofix(pageId: string, payload: {
  actions: string[];
  beforeTotal: number | null;
  afterTotal: number | null;
}): Promise<void> {
  await fetch(`/api/studio/composer/autofix/${pageId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchComposerActionLogs(pageId: string, limit = 24): Promise<ComposerActionLogRecord[]> {
  const res = await fetch(`/api/studio/composer/actions/${pageId}?limit=${Math.max(1, Math.min(80, limit))}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar telemetria Composer para ${pageId} (${res.status})`);
  const data = await res.json() as { logs?: ComposerActionLogRecord[] };
  return Array.isArray(data.logs) ? data.logs : [];
}

export async function saveComposerActionLog(pageId: string, payload: {
  kind: "shortcut" | "generate" | "autofix" | "rollback";
  action: string;
  status: "ok" | "error" | "info";
  beforeTotal: number | null;
  afterTotal: number | null;
  delta: number | null;
  changedBlocks: number;
  note: string;
}): Promise<ComposerActionLogRecord> {
  const res = await fetch(`/api/studio/composer/actions/${pageId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`No se pudo persistir accion Composer para ${pageId} (${res.status})`);
  const data = await res.json() as { log?: ComposerActionLogRecord };
  if (!data.log) throw new Error("Respuesta de telemetria Composer invalida.");
  return data.log;
}

export async function startComposerBatchRun(payload: {
  pageIds: string[];
  useComposerDraft?: boolean;
  regenerationScope?: "full" | "technical_core" | "exam_rail";
}): Promise<{ runId: string; queued: number; source: string; regenerationScope: string }> {
  const res = await fetch("/api/studio/composer/batch/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`No se pudo iniciar batch Composer (${res.status})`);
  return res.json() as Promise<{ runId: string; queued: number; source: string; regenerationScope: string }>;
}

export async function fetchComposerBatchStatus(runId: string): Promise<ComposerBatchRunStatus> {
  const res = await fetch(`/api/studio/composer/batch/${runId}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo leer estado de batch Composer (${res.status})`);
  return res.json() as Promise<ComposerBatchRunStatus>;
}

export async function retryComposerBatchFailed(runId: string, payload?: {
  useComposerDraft?: boolean;
  regenerationScope?: "full" | "technical_core" | "exam_rail";
}): Promise<{ runId: string; retried: number }> {
  const res = await fetch(`/api/studio/composer/batch/${runId}/retry-failed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw new Error(`No se pudo reintentar fallidas del batch (${res.status})`);
  return res.json() as Promise<{ runId: string; retried: number }>;
}

export async function fetchStudioContract(): Promise<StudioVisualContract> {
  const res = await fetch("/api/contract", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`No se pudo cargar el contrato visual (${res.status})`);
  return res.json() as Promise<StudioVisualContract>;
}

export async function updateStudioContract(payload: StudioVisualContractUpdateInput): Promise<StudioVisualContract> {
  const res = await fetch("/api/contract", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`No se pudo actualizar el contrato visual (${res.status})`);
  return res.json() as Promise<StudioVisualContract>;
}

export function getPageIdFromLocation(defaultPageId = "01"): string {
  const raw = new URLSearchParams(window.location.search).get("page") ?? defaultPageId;
  const num = parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 1) return defaultPageId;
  return String(num).padStart(2, "0");
}
