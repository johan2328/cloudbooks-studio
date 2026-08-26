/* ════════════════════════════════════════════════════════════════════════════
   engine-api — cliente del motor InDesign AI (studio-engine).
   Habla con /engine/* (proxy de Vite). Es PARALELO a studio-api.ts (Codex):
   no lo reemplaza. Las formas espejan los tipos del motor.
   ════════════════════════════════════════════════════════════════════════════ */

export interface EngineVisualModule { num: string; title: string; description: string }
export interface EngineTrap { wrong: string; correction: string }
export interface EngineAutocheck {
  question: string; options: string[]; correctOption: number; explanation: string; discardNotes: string[];
}

export interface EngineSeed {
  pageId: string; pageNumber: string; totalPages: number;
  domainLabel: string; batchLabel: string; title: string; subtitle: string;
  context: string; guideQuestion: string; upperVisualAlt: string;
  traps: EngineTrap[]; autocheck: EngineAutocheck; visualModules: EngineVisualModule[];
}

export type EngineGenerationMode = "openai_image" | "placeholder_image" | "fallback_html" | "none";

export interface EngineOutputStatus {
  pageId: string;
  hasOutput: boolean;
  generationMode: EngineGenerationMode;
  templateApproach: string | null;
  layoutRevision: string | null;
  currentLayoutRevision: string;
  generatedAt: string | null;
  approvedAt: string | null;
  files: {
    html: boolean; metadata: boolean; qaReport: boolean;
    upperVisual: boolean; previewPng: boolean; previewSvg: boolean; approved: boolean;
  };
  htmlPath: string | null;
  previewPath: string | null;
}

export interface EngineCatalogPage {
  pageId: string; pageNumber: string; totalPages: number;
  title: string; subtitle: string; domain: string; batch: string; skillIds: string[];
  context: string; guideQuestion: string; contractVersion: string;
  groundingStatus: "seeded" | "unverified" | "authored" | "partial" | "verified";
  generationReady: boolean;
  visualModules: EngineVisualModule[]; traps: EngineTrap[]; autocheck: EngineAutocheck;
  outputStatus: EngineOutputStatus;
  imageGeneratedAt: string | null;
  imageOutcome: string | null;
  imageQaOk: boolean | null;
  contentUpdatedAt: string | null;
  needsRegen: boolean;
  approved: boolean;
  approvalStale: boolean;
  sourceUrl: string | null;
}

export interface EngineCatalog {
  source: "engine_seed_and_output_status";
  engine: "studio-engine-v1";
  totalExpected: number;
  availableSeeds: string[];
  pages: EngineCatalogPage[];
}

export interface EngineKeyStatus {
  hasKey: boolean;
  engine: "studio-engine-v1";
  store: "file" | "pg";
  textModel: string; imageModel: string; imageQuality: string;
  contractVersion: string; certId: string; format: string;
}

export interface EngineHealth { ok: boolean; engine: string; store: string; ts: string }

const ENGINE_OFFLINE =
  "Motor no conectado. Levantá el engine: pnpm --filter @workspace/studio-engine dev";

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { cache: "no-store" });
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
  // El proxy de Vite devuelve 5xx (típicamente 500) cuando el motor no está
  // escuchando: lo tratamos como "motor no conectado".
  if (res.status >= 500) throw new Error(ENGINE_OFFLINE);
  if (!res.ok) throw new Error(`Engine ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface EngineRecipe {
  id: string; label: string; desc: string;
  upperPct: number; cards: number; cols: number;
  extras: ("comparison" | "diagram")[];
  railMode: "compact" | "standard" | "dense";
}

export interface EngineStructuralCheck { name: string; ok: boolean }

export interface EngineImageInfo {
  outcome: "real" | "reused" | "no_key" | "capped" | "failed" | "gated";
  attempts: number;
  reused: boolean;
  costUsd: number;
  errorKind: string | null;
  error: string | null;
}

/* ── QA predictivo (antes de gastar imagen) ── */
export type EngineRiskSeverity = "ok" | "warn" | "high";
export interface EngineRiskFlag {
  id: string;
  label: string;
  severity: EngineRiskSeverity;
  detail: string;
}
export interface EnginePrediction {
  recipeId: string;
  recipeLabel: string;
  risks: EngineRiskFlag[];
  worst: EngineRiskSeverity;
  safeToSpendImage: boolean;
  summary: string;
}

export interface EngineContractCheck { id: string; name: string; ok: boolean; detail: string }
export interface EngineContractResult { version: string; passed: boolean; score: number; checks: EngineContractCheck[] }

/* ── QA renderizada (headless): truncado/desborde real ── */
export interface EngineRenderQa {
  available: boolean;
  overflow: boolean;
  overflows: { zone: string; overBy: number }[];
  pageOverflow: boolean;
  error: string | null;
}

export interface EnginePipelineStage {
  num: string;
  key: string;
  label: string;
  detail: string;
  status: "done" | "skipped" | "failed";
  ms: number;
}

export interface EngineGenerateResult {
  pageId: string;
  recipeId: string;
  recipeLabel: string;
  generatedAt: string;
  durationMs: number;
  generationMode: EngineGenerationMode;
  approach: string;
  layoutRevision: string;
  structural: { passed: boolean; score: number; checks: EngineStructuralCheck[] };
  image: EngineImageInfo;
  contract: EngineContractResult;
  prediction: EnginePrediction;
  pipeline: EnginePipelineStage[];
  renderQa: EngineRenderQa | null;
  htmlPath: string;
  bytes: number;
}

export interface EngineQASummary {
  pageId: string;
  generated: boolean;
  generationMode: EngineGenerationMode | null;
  recipeId: string | null;
  recipeLabel: string | null;
  generatedAt: string | null;
  structural: { passed: boolean; score: number; checks: EngineStructuralCheck[] } | null;
  contract: EngineContractResult | null;
  renderQa: EngineRenderQa | null;
}

export interface EngineCost { month: string; spentUsd: number; capUsd: number; calls: number; totalCalls: number }

/* ── Cuadrilla de agentes (roster + métricas reales del ledger) ── */
export type EngineAgentDomain = "conocimiento" | "creacion" | "calidad";
export interface EngineAgentContract { label: string; prompt: string }
export interface EngineAgentStat {
  id: string; name: string; role: string; masterRole?: string; scope?: "both" | "atlas" | "master"; domain: EngineAgentDomain; iconKey: string; model: string;
  opsMonth: number; opsTotal: number; costMonthUsd: number; costTotalUsd: number; lastActiveTs: string | null; activeThisMonth: boolean;
  contracts?: EngineAgentContract[];
}
export interface EngineAgentsRollup {
  month: string;
  domains: Record<EngineAgentDomain, { label: string; color: string; blurb: string }>;
  agents: EngineAgentStat[];
  summary: { totalAgents: number; activeThisMonth: number; byDomain: Record<EngineAgentDomain, number>; opsMonth: number; opsTotal: number; costMonthUsd: number; costTotalUsd: number };
}
export const fetchAgents = () => getJson<EngineAgentsRollup>("/engine/agents");

/* Actividad reciente (operatoria): últimas operaciones del ledger del libro activo, atribuidas a su agente. */
export interface EngineAgentActivity {
  ts: string; agentId: string | null; agentName: string; iconKey: string; domain: EngineAgentDomain | null;
  label: string; kind: string; target: string; purpose: string; model: string; costUsd: number; book: string;
}
export const fetchAgentActivity = (limit = 40) => getJson<{ activity: EngineAgentActivity[] }>(`/engine/agent-activity?limit=${limit}`);

/* Runtime por agente (duración real): agregado por día/semana/mes/trimestre + timeline + waterfall de la última corrida. */
export type EngineRuntimePeriod = "day" | "week" | "month" | "quarter";
export interface EngineRuntimeAgentStat {
  id: string; name: string; role: string; masterRole?: string; domain: EngineAgentDomain; iconKey: string;
  runs: number; totalMs: number; avgMs: number; p50: number; p95: number; lastRun: string | null; okRate: number;
}
export interface EngineRuntimeRun {
  ts: string; agentId: string; agentName: string; iconKey: string; domain: EngineAgentDomain | null;
  durationMs: number; runContext: string; moduleId?: string; routeId?: string; model?: string; ok: boolean;
}
export interface EngineAgentRuntime {
  period: EngineRuntimePeriod; periodKey: string;
  domains: Record<EngineAgentDomain, { label: string; color: string; blurb: string }>;
  agents: EngineRuntimeAgentStat[];
  timeline: { periodKey: string; totalMs: number; runs: number }[];
  summary: { totalMs: number; activeAgents: number; longestRunMs: number; longestAgentId: string | null; longestAgentName: string | null; runsTotal: number };
  lastRuns: EngineRuntimeRun[];
  lastCorrida: EngineRuntimeRun[];
}
export const fetchAgentRuntime = (period: EngineRuntimePeriod = "week") => getJson<EngineAgentRuntime>(`/engine/agent-runtime?period=${period}`);

/** Crédito OpenAI homologado: saldo anclado + gasto desde el ancla → restante (global, no por libro). */
export interface EngineCredit { balanceUsd: number; anchoredAt: string; spentSinceUsd: number; remainingUsd: number; }
export const fetchCredit = () => getJson<EngineCredit>("/engine/credit");
export const setCreditAnchor = (balanceUsd: number, anchoredAt?: string) => postJson<EngineCredit>("/engine/credit", { balanceUsd, anchoredAt });

/** Ingresos de saldo (recargas): ledger append-only. Restante = Σ ingresos − Σ gasto. */
export interface EngineCreditEvent { ts: string; amountUsd: number; note: string; }
export const fetchCreditEvents = () => getJson<{ events: EngineCreditEvent[] }>("/engine/credit-events");
export const addCreditEvent = (amountUsd: number, note = "") => postJson<{ event: EngineCreditEvent; credit: EngineCredit }>("/engine/credit-events", { amountUsd, note });

/** Desglose de costos (lifetime) por modelo / kind / libro. */
export interface EngineCostRow { key: string; costUsd: number; calls: number }
export interface EngineCostBreakdown { byModel: EngineCostRow[]; byKind: EngineCostRow[]; byFormat: EngineCostRow[]; monthUsd: number; totalUsd: number; totalCalls: number }
export const fetchCostBreakdown = () => getJson<EngineCostBreakdown>("/engine/cost-breakdown");

export interface EnginePageDiagnosis {
  recipeId: string;
  recipeLabel: string;
  upperH: number;
  railH: number;
  railRatio: number;
  railStatus: "tight" | "ok" | "sparse";
  visualRatio: number;
  visualStatus: "dense" | "ok" | "empty";
  score: number;
}

export interface EngineRecommendedAction {
  pageId: string;
  kind: "keep" | "switch";
  fromRecipe: string;
  toRecipe: string;
  toLabel: string;
  cause: string;
  effect: string;
  risk: string;
  severity: "ok" | "warn" | "high";
  current: EnginePageDiagnosis;
  projected: EnginePageDiagnosis;
  ranking: { recipeId: string; label: string; score: number }[];
}

export const fetchEngineHealth = () => getJson<EngineHealth>("/engine/health");
export const fetchEngineCatalog = () => getJson<EngineCatalog>("/engine/catalog");

/* ── Master Book: modelo de CAPÍTULO (espejo de ChapterSeed del motor) ── */
export interface EngineChapterGraphic { id: string; kind: string; spec: string; imageUrl?: string | null; afterSectionId?: string }
export interface EngineChapterSection { id: string; heading: string; prose: string }
export interface EngineChapterSeed {
  chapterId: string; chapterNumber: string; title: string; subtitle?: string;
  domainId: string; domainLabel: string;
  sections?: EngineChapterSection[]; graphics?: EngineChapterGraphic[]; keyTakeaways?: string[];
}
export interface EngineChapter { seed: EngineChapterSeed; provenance?: { sourceIds?: string[] } }
/** Capítulos persistidos del libro ACTIVO (Master Book). Vacío para el Atlas. */
export const fetchChapters = () => getJson<{ chapters: EngineChapter[] }>("/engine/chapters");
export const fetchEngineKeyStatus = () => getJson<EngineKeyStatus>("/engine/key-status");
export const fetchEngineOutputStatus = (pageId: string) =>
  getJson<EngineOutputStatus>(`/engine/output-status/${pageId}`);
export const fetchEngineSeed = (pageId: string) => getJson<EngineSeed>(`/engine/seed/${pageId}`);
export const fetchEngineRecipes = () => getJson<{ recipes: EngineRecipe[] }>("/engine/recipes");
export const fetchEngineCost = () => getJson<EngineCost>("/engine/cost");
export const fetchEngineDecision = (pageId: string, recipeId: string) =>
  getJson<EngineRecommendedAction>(`/engine/decide/${pageId}?recipe=${encodeURIComponent(recipeId)}`);
export const fetchEnginePrediction = (pageId: string, recipeId: string) =>
  getJson<EnginePrediction>(`/engine/predict/${pageId}?recipe=${encodeURIComponent(recipeId)}`);
export const fetchEngineQa = (pageId: string) => getJson<EngineQASummary>(`/engine/qa/${pageId}`);

/* ── Taxonomía de skills + cobertura (grounding Fase A) ── */
export interface EngineExamSkill { id: string; title: string; objectives: string[]; url?: string; moduleId?: string; moduleTitle?: string; kind?: "concept" | "exercise" }
export interface EngineExamDomain { id: string; num: number; label: string; weightPct: number | null; skills: EngineExamSkill[]; url?: string }
export interface EngineExamOutline { certId: string; certLabel: string; status: "draft" | "validated"; note: string; domains: EngineExamDomain[] }
export interface EngineSkillCoverage { skillId: string; domainId: string; title: string; pageIds: string[]; covered: boolean }
export interface EngineCoverageReport {
  certId: string; taxonomyStatus: "draft" | "validated";
  totalSkills: number; coveredSkills: number;
  byDomain: { domainId: string; label: string; total: number; covered: number }[];
  skills: EngineSkillCoverage[]; gaps: EngineSkillCoverage[];
}
export const fetchEngineSkills = () => getJson<EngineExamOutline>("/engine/skills");
export const fetchEngineCoverage = () => getJson<EngineCoverageReport>("/engine/skills/coverage");

/* ── Corpus de fuentes (grounding Fase A) ── */
export interface EngineSource {
  id: string;
  kind: "sheet" | "mslearn" | "doc" | "web" | "manual";
  title: string;
  url: string | null;
  text: string | null;
  hash: string | null;
  addedAt: string;
}
export interface IngestUrlResult { ok: boolean; source?: EngineSource; error?: string }
export interface IngestCsvResult { ok: boolean; sources?: EngineSource[]; error?: string }

/** Lee la respuesta tal cual (201 ok / 422 {ok:false,error}); solo lanza si offline/500. */
async function postResult<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
  if (res.status >= 500) throw new Error(ENGINE_OFFLINE);
  return res.json() as Promise<T>;
}

export const fetchEngineSources = () => getJson<{ sources: EngineSource[] }>("/engine/sources");
export const ingestSourceUrl = (url: string, kind?: string) => postResult<IngestUrlResult>("/engine/sources/url", { url, kind });
export const ingestSourceCsv = (payload: { csv?: string; url?: string }) => postResult<IngestCsvResult>("/engine/sources/csv", payload);
export async function deleteEngineSource(id: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`/engine/sources/${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.json() as Promise<{ ok: boolean }>;
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
}

/* ── Autoría anclada (LLM redacta desde skill + corpus, con citas) ── */
export interface EngineCitation { kind: "source" | "web" | "model"; sourceId: string | null; quote: string; url: string | null }
export interface EngineClaim { id: string; field: string; text: string; citation: EngineCitation }

/* ── Procedencia por página: claims + fuentes citadas + relevancia (cinta de grounding de Contenido) ── */
export interface EngineProvenanceSource { id: string; title: string; url: string | null; kind: string }
export interface EngineProvenance {
  pageId: string;
  grounded: boolean;
  groundingStatus: EngineGroundingStatus | null;
  skillIds: string[];
  claims: EngineClaim[];
  checks: EngineClaimCheck[];   // veredicto por zona (context/module/trampa/autocheck)
  sources: EngineProvenanceSource[];
  relevance: { status: EngineRelevanceStatus; score: number; gaps: string[] } | null;
}
export const fetchEngineProvenance = (pageId: string) =>
  getJson<EngineProvenance>(`/engine/provenance/${encodeURIComponent(pageId)}`);

/** Renumera todas las páginas a su unidad del temario (01 = primera unidad). */
export interface EngineRenumberResult { moved: { old: string; new: string; skillId: string }[]; unchanged: number; total: number }
export const renumberPages = () => postResult<EngineRenumberResult>("/engine/renumber-pages", {});
export interface EngineAuthoredDraft {
  title: string; subtitle: string; context: string; guideQuestion: string;
  traps: EngineTrap[]; autocheck: EngineAutocheck; visualModules: EngineVisualModule[];
}
export interface EngineAuthoredPage {
  outcome: "real" | "no_key" | "no_sources" | "failed";
  model: string | null; skillId: string; skillTitle: string;
  draft: EngineAuthoredDraft | null; claims: EngineClaim[]; sourceIds: string[];
  citedClaims: number; modelClaims: number; coverageNote: string; cached: boolean; error: string | null;
}
export const runAuthor = (skillId: string, force = false) => postResult<EngineAuthoredPage>("/engine/author", { skillId, force });

/** Persistir el borrador anclado como PÁGINA real (verifica grounding; bloquea si no cierra). */
export interface EnginePersistResult {
  ok: boolean; pageId: string | null; skillId: string;
  groundingStatus: EngineGroundingStatus | null; groundingScore: number | null;
  blocked: boolean; reason: string; error: string | null;
}
export const persistAuthored = (skillId: string, pageId?: string) =>
  postResult<EnginePersistResult>("/engine/persist-authored", { skillId, pageId });

/** Borra una página (todas nacen del grounding; ya no hay páginas reservadas). */
export async function deleteEnginePage(pageId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/engine/page/${encodeURIComponent(pageId)}`, { method: "DELETE" });
    return res.json() as Promise<{ ok: boolean; error?: string }>;
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
}

/* ── Grounding gate: verificación de cada afirmación contra su fuente ── */
export type EngineClaimVerdict = "supported" | "unsupported" | "contradicted" | "no_source";
export type EngineGroundingStatus = "unverified" | "authored" | "partial" | "verified";
export interface EngineClaimCheck {
  claimId: string; field: string; text: string;
  citationKind: "source" | "web" | "model"; sourceId: string | null;
  verdict: EngineClaimVerdict; note: string;
}
export interface EngineGroundingResult {
  outcome: "real" | "no_key" | "no_claims" | "failed";
  model: string | null; skillId: string;
  groundingStatus: EngineGroundingStatus; score: number;
  total: number; supported: number; unsupported: number; contradicted: number; noSource: number;
  blocked: boolean; reason: string; checks: EngineClaimCheck[]; error: string | null;
}
export const verifyGroundingApi = (skillId: string) => postResult<EngineGroundingResult>("/engine/verify-grounding", { skillId });

/* ── Pipeline de grounding · 4 agentes (Buscador + Supervisor de relevancia, nuevos) ── */
export interface EngineSourceCandidate {
  url: string; origin: "curated" | "llm" | "mslearn-search";
  fetched: boolean; relevant: boolean | null; sourceId: string | null; title: string | null; reason: string;
}
export interface EngineSearchResult {
  outcome: "real" | "no_key" | "failed" | "no_candidates";
  skillId: string; skillTitle: string; queryTerms: string[];
  candidates: EngineSourceCandidate[]; found: EngineSourceCandidate[]; ingested: EngineSourceCandidate[]; rejected: EngineSourceCandidate[];
  coverageNote: string; error: string | null;
}
export const searchSources = (skillId: string, allowMsLearnSearch = false) =>
  postResult<EngineSearchResult>("/engine/search-sources", { skillId, allowMsLearnSearch });

export type EngineRelevanceStatus = "sufficient" | "thin" | "off_topic";
export interface EngineRelevanceResult {
  outcome: "real" | "no_key" | "no_draft" | "failed"; model: string | null; skillId: string;
  relevanceStatus: EngineRelevanceStatus; score: number; coverageScore: number; contentScore: number;
  gaps: string[]; note: string; error: string | null;
}
export const superviseRelevanceApi = (skillId: string) =>
  postResult<EngineRelevanceResult>("/engine/relevance", { skillId });

export interface EngineGroundSkillResult {
  skillId: string; skillTitle: string;
  search: { ingested: number; found: number; rejected: number; coverageNote: string } | null;
  author: { outcome: string; citedClaims: number; modelClaims: number; cached: boolean } | null;
  grounding: { status: EngineGroundingStatus; score: number; blocked: boolean; reason: string } | null;
  relevance: { status: EngineRelevanceStatus; score: number; gaps: string[] } | null;
  pageId: string | null; persisted: boolean; step: string; error: string | null;
}
export interface EngineGroundDomainResult {
  domainId: string; domainLabel: string; total: number;
  searched: number; authored: number; verified: number; relevant: number; persisted: number; blocked: number; failed: number;
  spentBeforeUsd: number; spentAfterUsd: number; skills: EngineGroundSkillResult[];
}
export const groundDomain = (domainId: string, persist = true, allowMsLearnSearch = false) =>
  postResult<EngineGroundDomainResult>("/engine/ground-domain", { domainId, persist, allowMsLearnSearch });

/* ── Evidencia: capturas oficiales de las 9 rutas en MS Learn (prueba de alcance) ── */
export interface EngineEvidenceShot {
  id: string; label: string; url: string; title: string | null;
  imagePath: string | null; gitCommit: string | null; capturedAt: string; ok: boolean; error: string | null;
}
export interface EngineEvidenceResult { available: boolean; shots: EngineEvidenceShot[]; capturedAt: string | null; error: string | null }
export const fetchEvidence = () => getJson<EngineEvidenceResult>("/engine/evidence");
export const captureEvidence = () => postResult<EngineEvidenceResult>("/engine/evidence/capture", {});

/* ── Árbol de grounding (unifica Fuentes + Cobertura + Procedencia) ── */
export interface EngineTreeSource { title: string; url: string | null; chars: number; sourceId: string }
export interface EngineTreeUnit {
  skillId: string; title: string; kind: string; url: string | null;
  curatedUrls: string[]; sources: EngineTreeSource[]; pageIds: string[];
  groundingStatus: string | null; relevanceStatus: EngineRelevanceStatus | null; relevanceGaps: string[];
  claims: { field: string; text: string; citationKind: string; quote: string }[];
}
export interface EngineTreeModule { moduleId: string; moduleTitle: string; units: EngineTreeUnit[] }
export interface EngineTreeDomain { id: string; label: string; url: string | null; locked: boolean; modules: EngineTreeModule[] }
export interface EngineGroundingTree {
  domains: EngineTreeDomain[];
  totals: { units: number; ingested: number; covered: number; verified: number; sufficient: number; thin: number; offTopic: number; sinEvaluar: number };
}
export const fetchGroundingTree = () => getJson<EngineGroundingTree>("/engine/grounding-tree");

export interface EngineIngestResult { skillId: string; ingested: string[]; alreadyHad: number; mapped: number }
export const ingestSkill = (skillId: string) => postResult<EngineIngestResult>("/engine/ingest-skill", { skillId });
export interface EngineIngestDomainResult { domainId: string; units: number; ingested: number; results: EngineIngestResult[] }
export const ingestDomain = (domainId: string) => postResult<EngineIngestDomainResult>("/engine/ingest-domain", { domainId });
export const improveRelevance = (skillId: string) => postResult<EngineRelevanceResult>("/engine/improve-relevance", { skillId });

/* ── Candado por ruta ── */
export const fetchRouteLocks = () => getJson<Record<string, boolean>>("/engine/route-locks");
export const setRouteLock = (domainId: string, locked: boolean) =>
  postResult<{ ok: boolean; domainId: string; locked: boolean }>("/engine/route-lock", { domainId, locked });

/* ── Veredicto premium: gates de QA combinados en uno ── */
export type EnginePremiumVerdictKind = "production_ready" | "needs_human_art" | "blocked";
export interface EngineQaGate { id: string; label: string; score: number; cap: number; blocks: boolean; passed: boolean; note: string }
/** Veredicto de CONTENIDO (agnóstico del render). El QA visual lo da el agente. */
export interface EnginePremiumVerdict {
  pageId: string;
  verdict: EnginePremiumVerdictKind; combinedScore: number; gates: EngineQaGate[];
  groundingStatus?: EngineGroundingStatus | null; relevanceStatus?: EngineRelevanceStatus | null; editorialOverall?: number | null;
  bookIssues?: { pageId: string; type: string; detail: string; suggestion: string }[];
}
export const fetchEnginePremiumVerdict = (pageId: string) =>
  getJson<EnginePremiumVerdict>(`/engine/premium-verdict/${pageId}`);

/** Rollup de readiness de CONTENIDO para el Dashboard (veredicto por página + motivos). */
export interface EngineReadinessRow {
  pageId: string; pageNumber: string; title: string;
  verdict: EnginePremiumVerdictKind; groundingStatus: EngineGroundingStatus | null;
  relevanceStatus: EngineRelevanceStatus | null;
  editorialOverall: number | null; combinedScore: number; reasons: string[];
  generatedAt: string | null;
}
export interface EngineContentReadiness {
  total: number; seeded: number;
  counts: { production_ready: number; needs_human_art: number; blocked: number };
  verifiedGrounding: number; rows: EngineReadinessRow[];
}
export const fetchContentReadiness = () =>
  getJson<EngineContentReadiness>("/engine/content-readiness");

/* ── COCKPIT DE QA: todas las señales por dimensión + estado operativo + worklist ── */
export type EngineDimStatus = "ok" | "warn" | "bad" | "pending";
export type EngineOperationalStatus = "lista" | "por_aprobar" | "regenerar" | "generar" | "revisar_contenido" | "bloqueada" | "reaprobar";
export type EngineActionTarget = "grounding" | "contenido" | "generar" | "qa" | "aprobaciones";
export interface EngineNextAction { label: string; target: EngineActionTarget }
export interface EngineQaDimension { score: number | null; status: EngineDimStatus; label: string; detail: string[] }
export interface EngineQaDossier {
  pageId: string; pageNumber: string; title: string;
  operationalStatus: EngineOperationalStatus; nextAction: EngineNextAction;
  verdict: EnginePremiumVerdictKind; combinedScore: number;
  hasImage: boolean; imageQaOk: boolean | null; needsRegen: boolean; approved: boolean; approvalStale: boolean;
  cost: { attempts: number | null; costUsd: number | null };
  dimensions: { fidelidad: EngineQaDimension; calidad: EngineQaDimension; consistencia: EngineQaDimension; reproducibilidad: EngineQaDimension };
}
export interface EngineDimHealth { ok: number; warn: number; bad: number; pending: number }
export interface EngineWorklistItem { pageId: string; pageNumber: string; title: string; operationalStatus: EngineOperationalStatus; statusLabel: string; nextAction: EngineNextAction; combinedScore: number }
export interface EngineQaRollup {
  total: number;
  byStatus: Record<EngineOperationalStatus, number>;
  dimensions: { fidelidad: EngineDimHealth; calidad: EngineDimHealth; consistencia: EngineDimHealth; reproducibilidad: EngineDimHealth };
  cost: { totalUsd: number; rerolls: number };
  worklist: EngineWorklistItem[];
}
export const fetchQaCockpit = () => getJson<EngineQaRollup>("/engine/qa-cockpit");
export const fetchQaDossier = (pageId: string) => getJson<EngineQaDossier>(`/engine/qa-cockpit/${encodeURIComponent(pageId)}`);

/* ── Motor de INFOGRAFÍA (image-2 dibuja el cuerpo; agente QA gobernado) ── */
export interface EngineInfographicQa {
  ran: boolean;
  highlightedLetter: string | null; expectedLetter: string; answerMatches: boolean;
  garbled: boolean; garbledSamples: string[]; doubleLetter: boolean;
  cardsWhite: boolean; saturationOk: boolean; numberingOk: boolean; bordersOk: boolean; guidePin: boolean; correctIsGreen: boolean;
  contentBleed: boolean; fidelityIssues?: string[]; conformanceIssues: string[];
  criticalFailures: string[]; styleFailures: string[]; advisory: string[]; correctiveHint: string;
  ok: boolean; notes: string;
}
export type EngineInfographicOutcome = "real" | "reused" | "needs_review" | "no_key" | "capped" | "failed";
export interface EngineInfographicResult {
  pageId: string; mode: "infographic"; outcome: EngineInfographicOutcome;
  imageUrl: string | null; htmlPath: string | null;
  attempts: number; reused: boolean; costUsd: number;
  qa: EngineInfographicQa | null; contentHash: string; error: string | null;
}
export const generateInfographic = (pageId: string, force = false) =>
  postResult<EngineInfographicResult>("/engine/generate-infographic", { pageId, force });
export const setStyleAnchor = (pageId: string) =>
  postResult<{ ok: boolean; masterPageId?: string }>("/engine/style-anchor", { pageId });
export interface EngineInfographicManifest {
  pageId: string; outcome?: EngineInfographicOutcome; attempts?: number; costUsd?: number;
  qa?: EngineInfographicQa | null; generatedAt?: string; anchored?: boolean; anchorMaster?: string | null;
  promptVersion?: string; imageUrl?: string;
}
export interface EngineInfographicStats {
  total: number; ready: number; needsReview: number; reused: number;
  avgAttempts: number; rerolls: number; totalCostUsd: number;
  pages: { pageId: string; outcome?: EngineInfographicOutcome; attempts?: number; costUsd?: number; ok?: boolean }[];
}
export const fetchInfographicManifest = (pageId: string) =>
  getJson<EngineInfographicManifest>(`/engine/infographic/${pageId}`);
export const fetchInfographicStats = () =>
  getJson<EngineInfographicStats>("/engine/infographic-stats");
export type EngineContractScope = "collection" | "book" | "module";
export interface EngineContractField { key: string; label: string; value: string; from: EngineContractScope }
export interface EngineContractCascade {
  version: string; certId: string; format: string; domainId: string; domainLabel: string;
  fields: EngineContractField[]; preamble: string;
}
export const fetchInfographicContract = (pageId?: string) =>
  getJson<EngineContractCascade>(`/engine/infographic-contract${pageId ? `/${pageId}` : ""}`);
export interface EngineInfographicBatch {
  pages: { pageId: string; outcome: EngineInfographicOutcome; attempts: number; costUsd: number; ok: boolean }[];
  totalCostUsd: number; ready: number; needsReview: number; failed: number;
}
export const runInfographicBatch = (pageIds: string[], force = false) =>
  postResult<EngineInfographicBatch>("/engine/infographic-batch", { pageIds, force });
export interface EngineExportResult { ok: boolean; url?: string; pages: number; error?: string }
export const exportBookPdf = (pageIds: string[]) =>
  postResult<EngineExportResult>("/engine/export-pdf", { pageIds });
export type EngineExportFormat = "pdf" | "png" | "html";
export interface EngineExportGranular {
  ok: boolean; format: EngineExportFormat; pages: number;
  pdfUrl?: string; files?: { pageId: string; url: string }[]; error?: string;
}
export const exportGranular = (pageIds: string[], format: EngineExportFormat) =>
  postResult<EngineExportGranular>("/engine/export", { pageIds, format });

/* ── Aprobaciones (granularidad página + libro) ── */
export interface EngineApprovals {
  pages: Record<string, { approved: boolean; at: string }>;
  book: { approved: boolean; at: string | null };
}
export const fetchApprovals = () => getJson<EngineApprovals>("/engine/approvals");
export const approvePage = (pageId: string, approved: boolean) => postResult<EngineApprovals>("/engine/approve", { pageId, approved });
export const approvePages = (pageIds: string[], approved: boolean) => postResult<EngineApprovals>("/engine/approve-pages", { pageIds, approved });
export const approveBook = (approved: boolean) => postResult<EngineApprovals>("/engine/approve-book", { approved });

/* ── Ensamblar libro (front/back matter + bloque aprobado → PDF) ── */
export interface EngineBookOutline {
  laminas: number; dominios: number; bookApproved: boolean;
  sections: { key: string; label: string; detail: string }[];
  toc: { pageNumber: string; title: string; domain: string }[];
}
export interface EngineAssembleResult { ok: boolean; url?: string; pages: number; laminas: number; sections: string[]; error?: string; warnings?: string[] }
export const fetchBookOutline = () => getJson<EngineBookOutline>("/engine/book-outline");
export const assembleBook = () => postResult<EngineAssembleResult>("/engine/assemble-book", {});
/** Ensamblar el Master Book (portada + matter + capítulos + glosario/bibliografía + contraportada). */
export interface EngineMasterAssembleResult { ok: boolean; url?: string; path?: string; pages?: number; chapters?: number; error?: string }
export const assembleMasterBook = () => postResult<EngineMasterAssembleResult>("/engine/assemble-master-book", {});
/** (Re)generar el divisor (página de apertura) de un capítulo del Master Book. */
export const generateChapterDivider = (chapterId: string, force = true) =>
  postJson<{ ok: boolean; chapterId: string; url?: string; reused?: boolean; error?: string }>("/engine/chapter-divider/generate", { chapterId, force });
/** (Re)generar los gráficos complementarios de un capítulo del Master Book. */
export const generateChapterGraphics = (chapterId: string, force = true) =>
  postJson<{ results: { ok: boolean; graphicId: string; url?: string; error?: string }[] }>("/engine/chapter-graphics/generate", { chapterId, force });

/** Capstone (proyecto integrador) de una ruta: teje sus módulos ya groundeados en un capítulo integrador con objetivos. */
export const generateRouteCapstone = (domainId: string, force = true) =>
  postJson<{ ok: boolean; chapterId?: string; error?: string }>("/engine/route-capstone", { domainId, force });
/** Maquetar UN capítulo del Master Book a PDF (divisor + relato + figuras + folios) → devuelve su URL. */
export const renderChapter = (chapterId: string) =>
  postJson<{ ok: boolean; chapterId?: string; url?: string; pages?: number; error?: string }>("/engine/render-chapter", { chapterId });
/** Módulos del temario (unidad de autoría del Master Book) + si ya tienen capítulo. */
export interface EngineModule { moduleId: string; moduleTitle: string; domainId: string; domainLabel: string; skills: number; chapterNumber: string | null; chapterId: string | null; hasChapter: boolean }
export const fetchModules = () => getJson<{ modules: EngineModule[] }>("/engine/modules");
/** Resultado del pipeline documental por módulo (psicometría → autor → verify → supervisor → capítulo). */
export interface EngineGroundModuleResult {
  moduleId: string; moduleTitle: string; domainId: string;
  psychometrics: { verbs: number; archetypes: number; reasoningGoal: string } | null;
  author: { outcome: string; sections: number; graphics: number; citedClaims: number; cached: boolean } | null;
  grounding: { status: string; score: number; blocked: boolean; reason: string } | null;
  relevance: { status: string; score: number; psychoAlignment: number; gaps: string[] } | null;
  chapterId: string | null; persisted: boolean; step: string; error: string | null;
}
export const groundModule = (moduleId: string, persist = true, force = false) =>
  postJson<EngineGroundModuleResult>("/engine/ground-module", { moduleId, persist, force });
/** Editar (patch) campos del capítulo: título/subtítulo/intro, secciones (heading/prose), spec de gráficos, puntos clave. */
export interface EngineChapterPatch { title?: string; subtitle?: string; intro?: string; keyTakeaways?: string[]; sections?: { id: string; heading?: string; prose?: string }[]; graphics?: { id: string; spec?: string }[] }
export const saveChapter = (chapterId: string, patch: EngineChapterPatch) =>
  postJson<EngineChapter>(`/engine/chapter/${encodeURIComponent(chapterId)}`, patch);
/** QA de prosa por capítulo (Master): verify por claim + grounding + relevancia + alineación psicométrica. */
export interface EngineChapterQa {
  chapterId: string; chapterNumber: string; title: string; domainLabel: string;
  groundingStatus: string;
  /** Score 0-10 al persistir (null en capítulos previos a la métrica). Salud de lo que embarca. */
  score: number | null;
  checks: { total: number; byVerdict: Record<string, number>; items: { field: string; text: string; verdict: string; sourceId: string | null; note: string }[] };
  sources: number;
  relevance: { status: string; score: number; coverageScore: number; contentScore: number; gaps: string[]; psychoAlignment: number | null; psychoGaps: string[] } | null;
  sections: number; updatedAt: string | null;
}
export const fetchChapterQa = (chapterId: string) => getJson<EngineChapterQa>(`/engine/chapter-qa/${encodeURIComponent(chapterId)}`);
export const fetchChaptersQa = () => getJson<{ chapters: EngineChapterQa[] }>("/engine/chapters-qa");

/** Cola de REVISIÓN HUMANA de claims contestados (bloqueados / 'wrong' sin 2º voto confirmatorio). */
export interface EngineClaimReview {
  id: string; chapterId: string; chapterNumber: string; title: string; domainLabel: string;
  claimText: string; verdict: string; note: string; sourceId: string | null;
  kind: "blocked" | "unconfirmed"; status: "pending" | "accepted" | "rejected";
  createdAt: string; updatedAt: string; resolvedBy?: string;
}
export const fetchClaimReviews = () => getJson<{ reviews: EngineClaimReview[] }>("/engine/claim-reviews");
export const resolveClaimReview = (id: string, status: "pending" | "accepted" | "rejected") =>
  postJson<EngineClaimReview>("/engine/claim-review/resolve", { id, status });

/* ── Composición del libro (BookConfig editable) ── */
export interface EngineBookStyle { bg: string; accent: string; accent2: string; text: string; onDark: string }
export interface EngineCollectionItem { id: string; coverUrl: string; title: string; buyUrl: string }
export interface EngineDomainMapRow { skill: string; domain: string; notes: string }
export interface EngineRouteIntro { imageUrl: string | null; text: string }
export interface EngineBookConfig {
  style: EngineBookStyle;
  cover: { mode: "generated" | "uploaded"; imageUrl: string | null; palette: string[] };
  blocks: { copyright: string; preface: string; intro: string; conclusions: string; studyGuide: string; glossary: string; scenarioReview: string };
  routeIntros: Record<string, EngineRouteIntro>;
  backCover: { mode: "auto" | "template"; imageUrl: string | null; html: string; isbn: string; price: string; overlay: { top: number; left: number; width: number; color: string; align: "left" | "center" | "right" } };
  collection: { note: string; items: EngineCollectionItem[] };
  domainMap: { note: string; rows: EngineDomainMapRow[] };
  sections: { copyright: boolean; preface: boolean; collection: boolean; domainMap: boolean; intro: boolean; studyGuide: boolean; routeIntros: boolean; conclusions: boolean; scenarioReview: boolean; glossary: boolean; bibliography: boolean; backCover: boolean };
  ficha: EngineFicha;
}
export interface EngineFicha {
  synopsis: string;
  about: string[];
  categories: string[];
  tags: string[];
  marketingBlurb: string;
  toc: string;
  samples: string[];
  status: "borrador" | "listo" | "publicado";
  updatedAt: string;
  /** Conteo REAL de páginas del libro ensamblado (persistido al ensamblar); undefined hasta el primer ensamblado. */
  pages?: number;
}
export const fetchBookConfig = () => getJson<EngineBookConfig>("/engine/book-config");
export const saveBookConfig = (patch: Partial<EngineBookConfig>) => postResult<EngineBookConfig>("/engine/book-config", patch);
/** Ficha comercial: el agente "Redactor de ficha" genera copy (LLM) + índice/muestras (datos). `parts` filtra: copy|toc|samples. */
export const generateFicha = (parts?: string[]) => postResult<{ ok: boolean; ficha: EngineFicha; error?: string }>("/engine/book-ficha/generate", { parts });
/** Estado del PDF ensamblado del libro activo → para el preview global (embeber sin re-render). */
export const fetchAssembledStatus = () => getJson<{ url: string | null }>("/engine/assembled-status");

/** Pool de etiquetas/categorías de la colección (reutilizables entre los 6 libros de la cert). */
export interface EngineCollectionTags { categories: string[]; tags: string[] }
export const fetchCollectionTags = () => getJson<EngineCollectionTags>("/engine/collection-tags");
export const addCollectionTags = (patch: { categories?: string[]; tags?: string[] }) => postResult<EngineCollectionTags>("/engine/collection-tags", patch);

/** Páginas previsualizables del libro activo (selector "Echa un vistazo"): portada/contra/rutas/capítulos/láminas (PNG). */
export interface EngineBookPreview { kind: "cover" | "back" | "route" | "chapter" | "lamina"; id: string; label: string; url: string; group: string }
export const fetchBookPreviews = () => getJson<{ items: EngineBookPreview[] }>("/engine/book-previews");

/** Escaparate público: la ficha REAL de un libro para la página de tienda. Flip-safe (no cambia el libro activo). */
export interface EngineStorefront {
  published: boolean;
  view?: { published: boolean; code: string; certTitle: string; cover: string | null; back: string | null; price: string; isbn: string; ficha: EngineFicha };
}
export const fetchStorefront = (certId: string, bookId: string, preview = false) =>
  getJson<EngineStorefront>(`/engine/storefront/${encodeURIComponent(certId)}/${encodeURIComponent(bookId)}${preview ? "?preview=1" : ""}`);
/** Catálogo de tienda de una cert: precio real + estado publicado de sus 6 libros (hermanos/colección). */
export interface EngineStorefrontCatalogItem { bookId: string; label: string; price: string; published: boolean; cover: string | null }
export const fetchStorefrontCatalog = (certId: string) =>
  getJson<{ items: EngineStorefrontCatalogItem[] }>(`/engine/storefront/${encodeURIComponent(certId)}`);
/** Restaura un bloque editable al texto por defecto (neutro). key: copyright|preface|intro|conclusions|collectionNote|backcover */
export const resetBookBlock = (key: string) => postResult<EngineBookConfig>("/engine/book-config/reset-block", { key });
export const uploadBookCover = (dataUrl: string) => postResult<{ ok: boolean; url: string; palette: string[]; config: EngineBookConfig }>("/engine/book-cover", { dataUrl });
export const uploadBookAsset = (dataUrl: string, name: string) => postResult<{ ok: boolean; url: string }>("/engine/book-asset", { dataUrl, name });
export type EngineBookSection = "preface" | "intro" | "conclusions" | "backcover" | "collectionNote" | "domainNote" | "domainRows";
export interface EngineBookGenResult { ok: boolean; html?: string; note?: string; rows?: EngineDomainMapRow[]; error?: string }
export const generateBookSection = (section: EngineBookSection) => postResult<EngineBookGenResult>("/engine/book-generate", { section });

/* ── Secciones nuevas del libro: guía de estudio · intros por ruta · glosario ── */
export interface EngineSectionGenResult { ok: boolean; html?: string; text?: string; error?: string }
export const generateStudyGuide = () => postResult<EngineSectionGenResult>("/engine/book-section/generate", { section: "studyGuide" });
export const generateGlossary = () => postResult<EngineSectionGenResult>("/engine/book-section/generate", { section: "glossary" });
/** Plan de dominio = una fila por RUTA del atlas (las 9), generado desde el outline + lo groundeado. */
export interface EngineDomainMapGenResult { ok: boolean; rows?: EngineDomainMapRow[]; note?: string; error?: string }
export const generateDomainMap = () => postResult<EngineDomainMapGenResult>("/engine/book-section/generate", { section: "domainMap" });
/** Repaso de escenarios = una pregunta de escenario/código tipo examen por ruta (9). Genera + guarda en cfg.blocks.scenarioReview. */
export const generateScenarioReview = () => postResult<EngineSectionGenResult & { count?: number }>("/engine/book-section/generate", { section: "scenarioReview" });
export const generateRouteIntro = (domainId: string) => postResult<EngineSectionGenResult>("/engine/route-intro/generate", { domainId });
export const uploadRouteIntro = (domainId: string, dataUrl: string) => postResult<{ ok: boolean; url: string; config: EngineBookConfig }>("/engine/route-intro/upload", { domainId, dataUrl });
/** Divisor de marca (imagen gpt-image) por ruta — ancla canónica (ruta 3 = master), reproducible. */
export interface EngineDividerResult { ok: boolean; domainId: string; url?: string; reused?: boolean; anchored?: boolean; error?: string }
export const generateRouteDivider = (domainId: string, force = false) => postResult<EngineDividerResult>("/engine/route-divider/generate", { domainId, force });
export const generateRouteDividersAll = (force = false) => postResult<{ ok: boolean; master: string; results: EngineDividerResult[] }>("/engine/route-dividers/generate-all", { force });

/* ── Auto Pages: generadores de identidad/diseño (image-2), operan sobre el libro ACTIVO ── */
export interface EngineDesignTake { file: string; url: string; generatedAt: string; hash: string; palette?: string[] }
export interface EngineDesignAsset { active: string | null; activeUrl: string | null; label: string; takes: EngineDesignTake[] }
export interface EngineCoverGenResult { ok: boolean; url?: string; reused?: boolean; error?: string; takes?: EngineDesignTake[]; active?: string | null }
/** `count` (1..3): 1 = regenerar (activa la nueva); 3 = primera vez (devuelve tomas para elegir, sin auto-activar). */
export const generateBookCover = (force = true, count = 1) => postResult<EngineCoverGenResult>("/engine/book-cover/generate", { force, count });
export const generateBookBackCover = (force = true, count = 1) => postResult<EngineCoverGenResult>("/engine/book-backcover/generate", { force, count });
export const selectCoverTake = (take: string) => postResult<EngineCoverGenResult>("/engine/book-cover/select", { take });
export const selectBackCoverTake = (take: string) => postResult<EngineCoverGenResult>("/engine/book-backcover/select", { take });
export interface EngineDesignAssets { cover: EngineDesignAsset; back: EngineDesignAsset; openers: Record<string, string | null>; dividers: Record<string, string | null> }
export const fetchDesignAssets = () => getJson<EngineDesignAssets>("/engine/design-assets");
/** Ancla de marca GLOBAL: identidad que heredan las próximas generaciones. */
export interface EngineDesignAnchor { coverUrl: string | null; backUrl: string | null; source: { certId: string; format: string } | null; setAt: string | null }
export const fetchDesignAnchor = () => getJson<EngineDesignAnchor>("/engine/design-anchor");
export const setDesignAnchorFromCert = (certId: string, format: string) => postResult<{ ok: boolean; error?: string; anchor?: EngineDesignAnchor }>("/engine/design-anchor/set", { certId, format });
/** Bloqueo de diseños del libro activo (aprobaciones persistidas + lock). El gate del armado llega con Plan D. */
export interface EngineDesignLock { certId: string; format: string; locked: boolean; lockedAt: string | null; pieces: string[] }
export const fetchDesignLock = () => getJson<EngineDesignLock>("/engine/design-lock");
export const updateDesignLock = (patch: { pieces?: string[]; locked?: boolean }) => postResult<EngineDesignLock>("/engine/design-lock", patch);
/** Notas de mejora por pieza (F2): se appendean al prompt de image-2 al regenerar. assetKey: cover·back·route:{id}·chapter:{id}. */
export const fetchDesignNotes = () => getJson<{ notes: Record<string, string> }>("/engine/design-notes");
export const setDesignNote = (assetKey: string, note: string) => postResult<{ ok: boolean; notes: Record<string, string> }>("/engine/design-note", { assetKey, note });
/** Cronometraje de la corrida por libro: `autoMs` = tiempo activo automático; `startedAt→finishedAt` = reloj con aprobaciones. */
export interface EngineCorridaTiming { certId: string; format: string; startedAt: string | null; autoMs: number; finishedAt: string | null }
export const fetchCorridaTiming = () => getJson<EngineCorridaTiming>("/engine/corrida-timing");
export const updateCorridaTiming = (patch: { startIfUnset?: boolean; addMs?: number; finish?: boolean; reset?: boolean }) => postResult<EngineCorridaTiming>("/engine/corrida-timing", patch);
export interface EnginePartOpenerResult { ok: boolean; domainId?: string; url?: string; reused?: boolean; error?: string }
/** Abre-rutas del Master: con domainId genera esa ruta; sin él corre el batch. */
export const generatePartOpeners = (domainId?: string, force = true) =>
  postResult<{ results: EnginePartOpenerResult[] }>("/engine/part-openers/generate", domainId ? { domainId, force } : { force });
/** Glosario del Master Book (términos extraídos del relato de los capítulos). Endpoint dedicado (NO el genérico de sección). */
export const generateMasterGlossary = () => postResult<{ ok: boolean; count?: number; error?: string }>("/engine/master-book/glossary", {});
export const fetchPaletteFamily = () => getJson<{ palettes: EngineBookStyle[] }>("/engine/palette-family");
export const applyBookPalette = (style?: EngineBookStyle) => postResult<{ ok: boolean; style: EngineBookStyle }>("/engine/book-palette/apply", style ? { style } : {});

/* ── Contrato visual de MATTER (nivel colección, reproducible) ── */
export interface EngineMatterContract { fontFamily: string; titleSize: number; h1Size: number; h2Size: number; bodySize: number; lineHeight: number; tocSize: number; tableSize: number }
export const fetchMatterContract = () => getJson<EngineMatterContract>("/engine/matter-contract");
export const saveMatterContract = (patch: Partial<EngineMatterContract>) => postResult<EngineMatterContract>("/engine/matter-contract", patch);

/* ── Contrato de IMÁGENES del relato (figuras del Master): cómo se crean las imágenes que se suman al texto ── */
export interface EngineImageContract { figureStyle: string; paletteSource: "cover" | "fixed"; figureSize: string; maxFiguresPerChapter: number; maxElements: number; anchorConsistency: boolean }
export const fetchImageContract = () => getJson<EngineImageContract>("/engine/image-contract");
export const saveImageContract = (patch: Partial<EngineImageContract>) => postResult<EngineImageContract>("/engine/image-contract", patch);

/* ── Contrato de MARCA de las páginas de imagen (portadillas + hojas de ruta): hex de identidad congelados ── */
export interface EngineBrandContract { dividerAccentHex: string; dividerNavyHex: string; dividerCanvasHex: string; dividerWaveBaseHex: string; partBgHex: string; partAccentHex: string; partAccent2Hex: string }
export const fetchBrandContract = () => getJson<EngineBrandContract>("/engine/brand-contract");
export const saveBrandContract = (patch: Partial<EngineBrandContract>) => postResult<EngineBrandContract>("/engine/brand-contract", patch);

/* ── Contrato EDITORIAL (voz del autor): reglas de estilo que obedece el autor en cada capítulo ── */
export interface EngineEditorialContract { voice: string }
export const fetchEditorialContract = () => getJson<EngineEditorialContract>("/engine/editorial-contract");
export const saveEditorialContract = (patch: Partial<EngineEditorialContract>) => postResult<EngineEditorialContract>("/engine/editorial-contract", patch);

/* ── Variantes de imagen premium (2 cortes + elección por visión) ── */
export interface EngineVariantInfo {
  variant: string; imageUrl: string | null;
  outcome: EngineImageInfo["outcome"]; costUsd: number;
  visionScore: number | null; notes: string;
}
export interface EngineVariantsResult {
  pageId: string; recipeId: string;
  variants: EngineVariantInfo[]; recommended: string | null; totalCostUsd: number;
}
export const runVariants = (pageId: string, recipeId: string) =>
  postResult<EngineVariantsResult>("/engine/variants", { pageId, recipeId });
export const selectVariantApi = (pageId: string, recipeId: string, variant: string) =>
  postResult<{ ok: boolean; error?: string }>("/engine/select-variant", { pageId, recipeId, variant });

/* ── QA editorial (LLM) + auto-revisión ── */
export interface EngineEditorialScores {
  claridad: number; fidelidadExamen: number; coherencia: number; autocheckCorrecto: number; trampasValidas: number;
}
export interface EngineEditorialQa {
  outcome: "real" | "no_key" | "failed";
  model: string | null;
  scores: EngineEditorialScores | null;
  overall: number | null;
  verdict: "approve" | "revise" | null;
  findings: string[];
  summary: string;
  error: string | null;
}
export interface EngineReviseAttempt {
  attempt: number; recipeId: string; recipeLabel: string;
  structural: number; contract: number; editorial: number | null;
  verdict: "approve" | "revise" | null; imageOutcome: string; action: string;
}
export interface EngineAutoReviseResult {
  pageId: string; attempts: EngineReviseAttempt[];
  finalRecipeId: string; finalRecipeLabel: string;
  approved: boolean; reason: string; threshold: number; editorial: EngineEditorialQa;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error(ENGINE_OFFLINE);
  if (!res.ok) throw new Error(`Engine ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ── Biblioteca multi-cloud (cloud → cert → libro) ──
export type EngineLibStatus = "active" | "available" | "coming_soon";
export interface EngineLibBook { id: string; label: string; icon: string; status: EngineLibStatus; state: string; enabled?: boolean }
export type EngineCertLevel = "fundamentals" | "associate" | "expert" | "specialty";
export type EngineCertTrack = "azure" | "ai" | "data" | "security" | "devops" | "m365" | "power-platform" | "dynamics";
export interface EngineLibCert { id: string; code: string; name: string; track: EngineCertTrack; level: EngineCertLevel; domains: number; pagesPlanned: number; status: EngineLibStatus; books: EngineLibBook[] }
export interface EngineLibCloud { id: "azure" | "aws" | "gcp"; label: string; status: EngineLibStatus; certs: EngineLibCert[] }
export interface EngineLibraryTree { clouds: EngineLibCloud[]; activeCertId: string; activeBookId: string }
export interface EngineActivateResult { ok: boolean; tree: EngineLibraryTree; error?: string; busy?: boolean; holder?: string | null }
/** Lock "busy" de la corrida (anti flip-hazard): mientras esté tomado, switch/activate responden ocupado. */
export interface EngineBookLockState { locked: boolean; holder: string | null; since: string | null }
export const lockLibrary = (holder: string) => postJson<{ ok: boolean; state: EngineBookLockState }>("/engine/library/lock", { holder });
export const unlockLibrary = () => postJson<{ ok: boolean; state: EngineBookLockState }>("/engine/library/unlock", {});
export const fetchLibraryLock = () => getJson<EngineBookLockState>("/engine/library/lock");

export const fetchLibraryTree = () => getJson<EngineLibraryTree>("/engine/library");
export const activateCertBook = (certId: string, bookId: string) =>
  postJson<EngineActivateResult>("/engine/library/activate", { certId, bookId });
/** Cambiar el libro de TRABAJO (árbol). Exige que esté activado. */
export const switchBook = (certId: string, bookId: string) =>
  postJson<EngineActivateResult>("/engine/library/switch", { certId, bookId });
/** Activar/desactivar un libro para producción (Timeline). No cambia el libro de trabajo. */
export const enableBook = (certId: string, bookId: string, enabled: boolean) =>
  postJson<EngineActivateResult>("/engine/library/enable", { certId, bookId, enabled });
/** Métricas de los 6 libros de la familia (Dashboard global + Timeline). */
export interface EngineBookMetric {
  format: string; label: string; enabled: boolean; isActive: boolean;
  costUsd: number; ops: number;
  units: number; totalUnits: number; unitLabel: string;
  capstones?: number;   // capítulos integradores, aparte de units
  approved: number; bookApproved: boolean;
  assembled: boolean; coverUrl: string | null;
  palette: { bg: string; accent: string; accent2: string };
  lastActivity: string | null;
}
export interface EngineLibraryMetrics { books: EngineBookMetric[]; credit: EngineCredit; totalCostUsd: number }
export const fetchLibraryMetrics = () => getJson<EngineLibraryMetrics>("/engine/library-metrics");
/** Catálogo canónico de certificaciones (fuente única: árbol + página de certificaciones). */
export interface EngineCertification { code: string; title: string; cloud: string; area: string; track: string; level: string; status: string; note?: string; domains: number; pages: number }
export const fetchCertifications = () => getJson<{ certs: EngineCertification[] }>("/engine/certifications");

/** Sync mensual con el póster oficial de Microsoft (altas automáticas; nunca auto-deprecia). */
export interface CertSyncChange { code: string; title?: string; level?: string; note: string }
export interface CertSyncLog {
  ranAt: string; trigger: "manual" | "scheduler"; ok: boolean; passes: number;
  extractedUnion: number; confirmed: number;
  added: CertSyncChange[]; retired: CertSyncChange[]; reviewMissing: CertSyncChange[]; unconfirmed: CertSyncChange[];
  suspectMisread: CertSyncChange[]; error?: string;
}
export const fetchCertSyncLog = () => getJson<{ last: CertSyncLog | null; history: CertSyncLog[] }>("/engine/certifications/sync-log");
export const runCertSync = () => postJson<{ ok: boolean; log: CertSyncLog; certs: EngineCertification[] }>("/engine/certifications/sync", {});
export const runCertRemove = (code: string) => postJson<{ ok: boolean; removed: boolean; certs: EngineCertification[] }>("/engine/certifications/remove", { code });
/** Cambia el status de un cert canónico (retirar/reactivar). Reversa de la baja automática del sync. */
export const setCertStatus = (code: string, status: string) => postJson<{ ok: boolean; certs: EngineCertification[] }>("/engine/certifications/status", { code, status });

export const runEditorialQa = (pageId: string) =>
  postJson<EngineEditorialQa>(`/engine/qa-editorial/${pageId}`, {});
export const runAutoRevise = (pageId: string, recipeId: string, maxAttempts = 3, threshold = 8) =>
  postJson<EngineAutoReviseResult>("/engine/auto-revise", { pageId, recipeId, maxAttempts, threshold });

export async function generateEnginePage(pageId: string, recipeId: string, force = false): Promise<EngineGenerateResult> {
  let res: Response;
  try {
    res = await fetch("/engine/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId, recipeId, force }),
    });
  } catch {
    throw new Error(ENGINE_OFFLINE);
  }
  if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error(ENGINE_OFFLINE);
  if (!res.ok) throw new Error(`Engine generate → ${res.status}`);
  return res.json() as Promise<EngineGenerateResult>;
}

// ── Panel de QA POR RUTA (observabilidad + regenerar) ──
export interface RoutePanelFinding { severity: "blocker" | "major" | "minor"; issue: string; where: string; fix: string }
export interface RouteExpertVerdict {
  id: string;
  modality: "vision" | "text" | "lint";
  score: number | null;
  would_ship: boolean;
  hasBlocker?: boolean;
  findings: RoutePanelFinding[];
  veredicto: string;
  error: string | null;
  runs?: number;
}
export interface RoutePanelAggregate { score: number; verdict: "ship" | "revise" | "block"; wouldShipCount: number; total: number; blockers: number }
export interface RoutePanelRun {
  generation: number;
  ts: string;
  pages: number;
  model: string;
  experts: RouteExpertVerdict[];
  aggregate: RoutePanelAggregate;
}

/** Historial de veredictos de UNA ruta (más reciente primero). */
export function fetchRouteExpertPanel(domainId: string): Promise<{ domainId: string; runs: RoutePanelRun[] }> {
  return getJson(`/engine/route-panel/${encodeURIComponent(domainId)}`);
}
/** Historial de TODAS las rutas de una. */
export function fetchAllRoutePanels(): Promise<{ panels: Record<string, RoutePanelRun[]> }> {
  return getJson(`/engine/route-panels`);
}
/** Corre el panel (ensambla + rasteriza + 7 expertos) sobre una ruta ya generada y lo persiste. */
export function runRoutePanel(domainId: string): Promise<{ ok: boolean; domainId: string; run?: RoutePanelRun; error?: string }> {
  return postJson(`/engine/run-route-panel`, { domainId });
}
/** Regenera la ruta entera bajo los prompts endurecidos (re-groundea módulos + capstone) y re-evalúa. */
export function regenerateRoute(domainId: string, force = true, runPanel = true): Promise<{ ok: boolean; domainId: string; modules: unknown[]; panel: RoutePanelRun | null; panelError: string | null }> {
  return postJson(`/engine/regenerate-route`, { domainId, force, runPanel });
}
