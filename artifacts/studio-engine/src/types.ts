/**
 * Tipos del motor. Las respuestas espejan las que el frontend ya conoce
 * (artifacts/studio/src/lib/studio-api.ts) para poder reutilizar la cabina.
 */

export interface VisualModule {
  num: string;
  title: string;
  description: string;
}

export interface Trap {
  wrong: string;
  correction: string;
}

export interface Autocheck {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  discardNotes: string[];
}

/** Contenido base de una página (emulado/aprendido de los seeds del repo). */
export interface PageSeed {
  pageId: string;
  pageNumber: string;
  totalPages: number;
  domainLabel: string;
  batchLabel: string;
  title: string;
  subtitle: string;
  context: string;
  guideQuestion: string;
  upperVisualAlt: string;
  traps: Trap[];
  autocheck: Autocheck;
  visualModules: VisualModule[];
  /** Skills del examen que cubre (ids de la taxonomía). Opcional hasta anclar. */
  skillIds?: string[];
}

/* ── Procedencia / grounding (Fase A): fuentes, afirmaciones y citas ── */

/** De dónde viene una fuente del corpus de grounding. */
export type SourceKind = "sheet" | "mslearn" | "doc" | "web" | "manual";

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  url: string | null;
  /** Texto extraído (para anclar/verificar). Puede venir vacío al registrar. */
  text: string | null;
  /** Hash del texto para detectar cambios de la fuente. */
  hash: string | null;
  addedAt: string;
}

/** Respaldo de una afirmación: cita a una fuente, a la web, o al modelo. */
export type CitationKind = "source" | "web" | "model";
export interface Citation {
  kind: CitationKind;
  /** Id de la fuente del corpus (cuando kind === "source"). */
  sourceId: string | null;
  /** Fragmento textual que respalda la afirmación. */
  quote: string;
  /** URL directa cuando aplica (web / doc). */
  url: string | null;
}

/** Una afirmación verificable del contenido, con su respaldo. */
export interface Claim {
  id: string;
  /** Parte de la página: context | trap | autocheck | module. */
  field: string;
  text: string;
  citation: Citation;
}

/** Estado de grounding de una página (lo que significa "verified"). */
export type GroundingStatus = "unverified" | "authored" | "partial" | "verified";

/** Procedencia de una página: skills cubiertas, fuentes, afirmaciones, estado. */
export interface PageProvenance {
  pageId: string;
  skillIds: string[];
  sourceIds: string[];
  claims: Claim[];
  /** Veredictos del verificador por zona (context/module/trampa/autocheck) — anclado real por zona. */
  checks: ClaimCheck[];
  groundingStatus: GroundingStatus;
  /** Score 0-10 del verificador al persistir: salud NUMÉRICA de la versión que EMBARCA (opcional: los
   *  capítulos persistidos antes de esta métrica no lo traen → el consumidor cae a groundingStatus). */
  score?: number;
  updatedAt: string | null;
}

/* ── Autoría anclada (LLM redacta desde skill + corpus, con citas) ── */
export interface AuthoredDraft {
  title: string;
  subtitle: string;
  context: string;
  guideQuestion: string;
  traps: Trap[];
  autocheck: Autocheck;
  visualModules: VisualModule[];
}
export interface AuthoredPage {
  outcome: "real" | "no_key" | "no_sources" | "failed";
  model: string | null;
  skillId: string;
  skillTitle: string;
  draft: AuthoredDraft | null;
  claims: Claim[];
  sourceIds: string[];
  citedClaims: number;   // afirmaciones con cita a fuente válida
  modelClaims: number;   // afirmaciones sin fuente (apoyadas en el modelo)
  coverageNote: string;
  cached: boolean;
  error: string | null;
}

/* ── Variantes de imagen premium (2 cortes + elección por visión/criterio) ── */
export interface VariantInfo {
  variant: string;          // "a" | "b"
  imageUrl: string | null;
  outcome: GenerateImageInfo["outcome"];
  costUsd: number;
  visionScore: number | null;
  notes: string;
}
export interface VariantsResult {
  pageId: string;
  recipeId: string;
  variants: VariantInfo[];
  recommended: string | null;
  totalCostUsd: number;
}

/* ── Veredicto premium: gates de QA combinados (golden master) ── */
export type PremiumVerdictKind = "production_ready" | "needs_human_art" | "blocked";
export interface QaGate {
  id: string;
  label: string;
  score: number;     // 0-10
  cap: number;       // techo del combinado si este gate (bloqueante) falla (0-10)
  blocks: boolean;
  passed: boolean;
  note: string;
}
/** Veredicto de CONTENIDO (agnóstico del render). El QA visual lo da el agente. */
export interface PremiumVerdict {
  pageId: string;
  verdict: PremiumVerdictKind;
  combinedScore: number;   // 0-10
  gates: QaGate[];
  /** Grounding de la página (Fase A) que pesa en el gate técnico. null = seeded. */
  groundingStatus?: GroundingStatus | null;
  /** Relevancia/cobertura (supervisor) de la página. null = no evaluada. */
  relevanceStatus?: RelevanceStatus | null;
  /** Nota global del QA editorial si corrió (0-10), si no null. */
  editorialOverall?: number | null;
  /** Inconsistencias de libro (#6 editor-jefe) que afectan esta página. */
  bookIssues?: { pageId: string; type: string; detail: string; suggestion: string }[];
}

/* ── Grounding gate: verificación independiente de cada afirmación ── */
export type ClaimVerdict = "supported" | "unsupported" | "contradicted" | "no_source";
export interface ClaimCheck {
  claimId: string;
  field: string;
  text: string;
  citationKind: CitationKind;
  sourceId: string | null;
  verdict: ClaimVerdict;
  note: string;
}
export interface GroundingResult {
  outcome: "real" | "no_key" | "no_claims" | "failed";
  model: string | null;
  skillId: string;
  groundingStatus: GroundingStatus;   // verified | partial | unverified
  score: number;                       // 0-10
  total: number;
  supported: number;
  unsupported: number;
  contradicted: number;
  noSource: number;
  blocked: boolean;
  reason: string;
  checks: ClaimCheck[];
  error: string | null;
}

/* ── Buscador (Searcher): descubre + valida fuentes por skill (agente nuevo) ── */
/** Una URL candidata y su destino tras validación real (fetch + relevancia). */
export interface SourceCandidate {
  url: string;
  origin: "curated" | "llm" | "mslearn-search";
  fetched: boolean;          // ingestUrl OK (no 404/vacía)
  relevant: boolean | null;  // confirmación LLM de relevancia (null = no se llegó a evaluar)
  sourceId: string | null;
  title: string | null;
  reason: string;            // 1 frase: por qué se conservó/rechazó
}
export interface SearchResult {
  outcome: "real" | "no_key" | "failed" | "no_candidates";
  skillId: string;
  skillTitle: string;
  queryTerms: string[];
  candidates: SourceCandidate[];
  found: SourceCandidate[];      // fetcheadas OK (antes de relevancia)
  ingested: SourceCandidate[];   // fetch OK + relevancia confirmada → en el corpus
  rejected: SourceCandidate[];   // 404/vacía u off-topic
  coverageNote: string;
  error: string | null;
}

/* ── Supervisor de relevancia/cobertura (agente nuevo; distinto de fidelidad) ── */
export type RelevanceStatus = "sufficient" | "thin" | "off_topic";
export interface RelevanceResult {
  outcome: "real" | "no_key" | "no_draft" | "failed";
  model: string | null;
  skillId: string;
  relevanceStatus: RelevanceStatus;
  score: number;          // 0-10 (promedio de coverage+content)
  coverageScore: number;  // 0-10: las fuentes cubren el alcance del skill
  contentScore: number;   // 0-10: el contenido es relevante y completo (no genérico)
  gaps: string[];
  note: string;
  /** Master Book: alineación del relato con el perfil psicométrico (0-10). null/undefined en el Atlas. */
  psychoAlignment?: number;
  psychoGaps?: string[];
  error: string | null;
}

/* ── Orquestación por dominio: corre los 4 agentes por skill, contexto acotado ── */
export interface GroundSkillResult {
  skillId: string;
  skillTitle: string;
  search: { ingested: number; found: number; rejected: number; coverageNote: string } | null;
  author: { outcome: AuthoredPage["outcome"]; citedClaims: number; modelClaims: number; cached: boolean } | null;
  grounding: { status: GroundingStatus; score: number; blocked: boolean; reason: string } | null;
  relevance: { status: RelevanceStatus; score: number; gaps: string[] } | null;
  pageId: string | null;
  persisted: boolean;
  step: string;   // search | author | verify | supervise | persist | done
  error: string | null;
}
export interface GroundDomainResult {
  domainId: string;
  domainLabel: string;
  total: number;
  searched: number;
  authored: number;
  verified: number;
  relevant: number;
  persisted: number;
  blocked: number;
  failed: number;
  spentBeforeUsd: number;
  spentAfterUsd: number;
  skills: GroundSkillResult[];
}

/* ══════════════════════════════════════════════════════════════════════════
   MASTER BOOK (formato DOCUMENTAL) — modelo de contenido por CAPÍTULO (módulo).
   Hermano de PageSeed. El Atlas es "una skill → una lámina"; el Master Book es
   "un módulo → un capítulo narrativo" (relato que teje varias unidades), con
   GRÁFICOS PUNTUALES decididos por el agente y un PERFIL PSICOMÉTRICO que guía el
   relato hacia el razonamiento que el examen evalúa. Reusa Source/Citation/Claim/
   PageProvenance/ClaimCheck (grounding agnóstico del formato; Claim.field admite
   "section"). Es el libro COMPAÑERO pero el más importante: el peso visual queda
   en el Atlas → los gráficos son parcos y complementarios.
   ══════════════════════════════════════════════════════════════════════════ */

/** Perfil psicométrico de un módulo: CÓMO evalúa el examen ese tema (no QUÉ contenido).
 *  Lo produce el agente "psicometrista" desde la fuente de comportamiento del examen
 *  (skills-measured oficial) + modelado de arquetipos. Guía al autor del relato.
 *  Honesto: el examen no publica ítems → esto es un MODELO, no una cita literal. */
export interface PsychoProfile {
  /** Verbos que el examen mide en el módulo (create, configure, troubleshoot, choose…). */
  measuredVerbs: string[];
  /** Arquetipos de pregunta esperables (caso, elegir-acción, completar-código, ordenar-pasos…). */
  questionArchetypes: string[];
  /** Niveles cognitivos (Bloom) que exige el módulo (recordar, aplicar, analizar, evaluar…). */
  cognitiveLevels: string[];
  /** Confusiones/trampas que el examen explota (para que el relato las desactive). */
  commonTraps: string[];
  /** 1-2 frases: qué razonamiento debe construir el lector para rendir este módulo. */
  reasoningGoal: string;
}

/** Una sección de prosa del capítulo (relato continuo). */
export interface ProseSection {
  id: string;              // "s1".."sN" (estable dentro del capítulo)
  heading: string;
  /** Cuerpo en HTML (párrafos, listas, <code>…). Prosa extensa, NO tarjetas. */
  prose: string;
  /** Ids de los claims que respaldan las afirmaciones críticas de esta sección. */
  claimRefs: string[];
  /** true si la sección tiene afirmaciones DURAS → van al gate de fidelidad (rigor híbrido). */
  critical?: boolean;
}

/** Un gráfico complementario PUNTUAL, decidido por el agente donde fija conocimiento.
 *  Esquemático y sobrio (1 concepto) — complementa, no compite con la lámina del Atlas. */
export interface GraphicSpec {
  id: string;                 // "g1".."gN"
  afterSectionId: string;     // va DESPUÉS de esta ProseSection.id
  /** Tipo de diagrama complementario (flujo, arquitectura, comparación, línea-de-tiempo…). */
  kind: string;
  /** Brief del gráfico: lo que el agente quiere mostrar (instrucción al modelo de imagen — NO se muestra al lector). */
  spec: string;
  /** LEYENDA para el lector (frase descriptiva; es lo que va en el <figcaption>, no el brief). */
  caption: string;
  /** Por qué aporta valor acá (aprobación humana + gate de parquedad). */
  rationale: string;
  /** URL de la imagen generada (null hasta generarla). */
  imageUrl: string | null;
}

/** Contenido base de un CAPÍTULO del Master Book (uno por módulo del temario). */
export interface ChapterSeed {
  chapterId: string;       // "cap-01" (ordinal del módulo en el temario)
  chapterNumber: string;   // "01".."NN"
  moduleId: string;        // módulo del outline (ancla de la jerarquía)
  domainId: string;        // ruta/dominio del examen
  domainLabel: string;
  title: string;           // = título del módulo
  subtitle: string;
  /** Entrada narrativa del capítulo (por qué importa, qué vas a construir). */
  intro: string;
  /** Las unidades del temario que teje este capítulo. */
  skillIds: string[];
  /** El relato: secciones de prosa en orden. */
  sections: ProseSection[];
  /** Gráficos complementarios puntuales (parcos: ≤ cap por capítulo). */
  graphics: GraphicSpec[];
  /** Perfil psicométrico del módulo (guía del relato). */
  psychometrics: PsychoProfile;
  /** Cierre: puntos clave para fijar (3-6). */
  keyTakeaways: string[];
  /** Orientación práctica de UNA frase: qué construye/logra concretamente el lector en el capítulo (baja la carga cognitiva). */
  buildGoal?: string;
  /** Objetivos de aprendizaje OBSERVABLES y medibles (verbo de acción) — se muestran al inicio del capítulo. */
  objectives?: string[];
  /** Prerrequisitos ACCIONABLES ("qué tener listo antes") — activación de conocimiento previo, no lista de tecnologías. */
  prerequisites?: string[];
  /** Cápsula de repaso: una línea "¿Sin base en X? Repase … antes de seguir" (editorial, no gateada por grounding). */
  prereqRemedy?: string;
  /** Práctica tipo examen ESTRUCTURADA: el render muestra los escenarios con opciones A/B/C (sin revelar
   *  la correcta) y arma una sección "Soluciones" aparte. Lo agrega el enriquecedor/capstone. */
  practice?: PracticeItem[];
}

/** Formato del ejercicio (emula los tipos reales del examen AI-200). Default "single" = retro-compatible. */
export type PracticeKind = "single" | "multi" | "order" | "build";

/** Un ejercicio tipo examen AI-200. `kind` decide el formato:
 *  - single: `options[]` + `correctIndex` (1 respuesta correcta). [default si falta `kind`]
 *  - multi:  `options[]` + `correctIndices[]` (N correctas — "elija todas las que apliquen").
 *  - order:  `steps[]` = la secuencia CORRECTA (el render la baraja; el lector la ordena). P.ej. comandos `az`.
 *  - build:  `template` = código/config con huecos; `blanks[]` = cada hueco con sus opciones + la correcta.
 *  Para order/build, `options`/`correctIndex` quedan vacíos ([]/0) y NO se usan (los lee el kind específico). */
export interface PracticeItem {
  kind?: PracticeKind;
  question: string;
  options: string[];
  correctIndex: number;
  correctIndices?: number[];
  steps?: string[];
  template?: string;
  blanks?: { options: string[]; correctIndex: number }[];
  explanation: string;
}

/* ── Psicometrista: perfil de comportamiento del examen por módulo (agente nuevo) ── */
export interface PsychometricsResult {
  outcome: "real" | "no_key" | "failed";
  model: string | null;
  moduleId: string;
  profile: PsychoProfile | null;
  cached: boolean;
  error: string | null;
}

/* ── Autoría documental: teje las unidades del módulo en un relato (agente nuevo) ── */
export interface AuthoredChapter {
  outcome: "real" | "no_key" | "no_sources" | "failed";
  model: string | null;
  moduleId: string;
  moduleTitle: string;
  seed: ChapterSeed | null;
  claims: Claim[];
  sourceIds: string[];
  citedClaims: number;   // afirmaciones críticas con cita a fuente válida
  modelClaims: number;   // afirmaciones apoyadas solo en el modelo
  coverageNote: string;
  cached: boolean;
  error: string | null;
}

/* ── Orquestación documental por MÓDULO: psicometría → search → autor → verify → supervise ── */
export interface GroundModuleResult {
  moduleId: string;
  moduleTitle: string;
  domainId: string;
  search: { ingested: number; found: number; rejected: number; coverageNote: string } | null;
  psychometrics: { verbs: number; archetypes: number; reasoningGoal: string } | null;
  author: { outcome: AuthoredChapter["outcome"]; sections: number; graphics: number; citedClaims: number; cached: boolean } | null;
  grounding: { status: GroundingStatus; score: number; blocked: boolean; reason: string } | null;
  /** Enriquecido (código/tablas/callouts/práctica) gateado: si el gate lo rechaza, se persiste la prosa sin enriquecer.
   *  `escalated` = hizo falta el modelo fuerte; `model` = el que produjo el resultado aceptado. */
  enrich: { applied: boolean; ok: boolean; repairs: number; escalated: boolean; model: string | null; reason: string } | null;
  relevance: { status: RelevanceStatus; score: number; psychoAlignment: number; gaps: string[] } | null;
  chapterId: string | null;
  persisted: boolean;
  step: string;   // psychometrics | search | author | verify | enrich | supervise | persist | done
  error: string | null;
}

/* ── Taxonomía de skills del examen (ancla de cobertura) ── */
export interface ExamSkill {
  id: string;          // p. ej. "p1.acr.image-storage" (módulo.unidad)
  title: string;
  objectives: string[];
  /** URL oficial de la UNIDAD en MS Learn (procedencia). */
  url?: string;
  /** Módulo oficial al que pertenece la unidad. */
  moduleId?: string;
  moduleTitle?: string;
  /** Tipo de unidad de contenido (las que generan página). */
  kind?: "concept" | "exercise";
}
export interface ExamDomain {
  id: string;          // p. ej. "p1"
  num: number;
  label: string;       // "Ruta 1 — Alojamiento de aplicaciones en contenedores"
  weightPct: number | null;
  skills: ExamSkill[];
  /** URL oficial de la ruta de aprendizaje en MS Learn (procedencia + evidencia). */
  url?: string;
}
export interface ExamOutline {
  certId: string;
  certLabel: string;
  /** draft = derivado de seeds/conocimiento; validated = contra outline oficial. */
  status: "draft" | "validated";
  note: string;
  domains: ExamDomain[];
}
export interface SkillCoverage {
  skillId: string;
  domainId: string;
  title: string;
  pageIds: string[];   // páginas que la cubren
  covered: boolean;
}
export interface CoverageReport {
  certId: string;
  taxonomyStatus: "draft" | "validated";
  totalSkills: number;
  coveredSkills: number;
  byDomain: { domainId: string; label: string; total: number; covered: number }[];
  skills: SkillCoverage[];
  gaps: SkillCoverage[];   // skills sin página
}

export type GenerationMode =
  | "openai_image"
  | "placeholder_image"
  | "fallback_html"
  | "none";

export interface OutputStatus {
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

export interface CatalogPage {
  pageId: string;
  pageNumber: string;
  totalPages: number;
  title: string;
  subtitle: string;
  domain: string;
  batch: string;
  context: string;
  guideQuestion: string;
  contractVersion: string;
  /** "seeded" = contenido hand-authored (01–03); el resto viene del grounding (Fase A). */
  groundingStatus: GroundingStatus | "seeded";
  skillIds: string[];
  generationReady: boolean;
  visualModules: VisualModule[];
  traps: Trap[];
  autocheck: Autocheck;
  outputStatus: OutputStatus;
  /* ── Estado de generación de la infografía (para la sección Generar) ── */
  imageGeneratedAt: string | null;   // cuándo se generó la imagen (manifest)
  imageOutcome: string | null;       // real | reused | needs_review | …
  imageQaOk: boolean | null;         // el agente QA aprobó la imagen
  contentUpdatedAt: string | null;   // último cambio del contenido (provenance)
  needsRegen: boolean;               // hay imagen y el contenido cambió DESPUÉS de generarla
  approved: boolean;                 // lámina aprobada (infographic-approvals)
  approvalStale: boolean;            // aprobada, pero el contenido cambió tras aprobar
  sourceUrl: string | null;          // página oficial (MS Learn) de la unidad — control de origen
}

export interface Catalog {
  source: "engine_seed_and_output_status";
  engine: "studio-engine-v1";
  totalExpected: number;
  availableSeeds: string[];
  pages: CatalogPage[];
}

export interface KeyStatus {
  hasKey: boolean;
  engine: "studio-engine-v1";
  store: "file" | "pg";
  textModel: string;
  imageModel: string;
  imageQuality: string;
  contractVersion: string;
  certId: string;
  format: string;
}

/* ── Recetas de layout (datos que parametrizan el render) ── */
export type RailMode = "compact" | "standard" | "dense";
export type RecipeExtra = "comparison" | "diagram";

export interface Recipe {
  id: string;
  label: string;
  desc: string;
  /** % del cuerpo para el bloque visual superior (el resto es el rail de examen). */
  upperPct: number;
  /** Tarjetas de concepto en el bloque superior. */
  cards: number;
  /** Columnas de la grilla de tarjetas. */
  cols: number;
  /** Bloques extra del cuerpo superior. */
  extras: RecipeExtra[];
  /** Densidad del rail de examen (trampas + autocheck). */
  railMode: RailMode;
}

export interface StructuralCheck {
  name: string;
  ok: boolean;
}

export interface ContractCheck {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
}

export interface ContractResult {
  version: string;
  passed: boolean;
  score: number;
  checks: ContractCheck[];
}

export interface QASummary {
  pageId: string;
  generated: boolean;
  generationMode: GenerationMode | null;
  recipeId: string | null;
  recipeLabel: string | null;
  generatedAt: string | null;
  structural: { passed: boolean; score: number; checks: StructuralCheck[] } | null;
  contract: ContractResult | null;
  renderQa: RenderQa | null;
  /** Score de visión de la imagen elegida (0-10), si se midió. */
  visionScore?: number | null;
}

export interface GenerateImageInfo {
  outcome: "real" | "reused" | "no_key" | "capped" | "failed" | "gated";
  attempts: number;
  reused: boolean;
  costUsd: number;
  errorKind: string | null;
  error: string | null;
}

/* ── QA editorial (revisor LLM gpt-4o) + auto-revisión acotada ── */
export interface EditorialScores {
  claridad: number;
  fidelidadExamen: number;
  coherencia: number;
  autocheckCorrecto: number;
  trampasValidas: number;
}
export interface EditorialQa {
  outcome: "real" | "no_key" | "failed";
  model: string | null;
  scores: EditorialScores | null;
  overall: number | null;
  verdict: "approve" | "revise" | null;
  findings: string[];
  summary: string;
  error: string | null;
}
export interface ReviseAttempt {
  attempt: number;
  recipeId: string;
  recipeLabel: string;
  structural: number;
  contract: number;
  editorial: number | null;
  verdict: "approve" | "revise" | null;
  imageOutcome: string;
  action: string;
}
export interface AutoReviseResult {
  pageId: string;
  attempts: ReviseAttempt[];
  finalRecipeId: string;
  finalRecipeLabel: string;
  approved: boolean;
  reason: string;
  threshold: number;
  editorial: EditorialQa;
}

/* ── Auto-fit: parámetros que el motor ajusta hasta que el contenido entra ── */
export interface FitParams {
  deckFontPx?: number;   // fuente del contexto del hero (default 14)
  deckLines?: number;    // líneas permitidas del contexto (default 3)
  expLines?: number;     // líneas de la explicación del autocheck (default 4)
  railFontDelta?: number; // ajuste de la fuente del rail (≤ 0, clamp a ≥10)
  railLeadDelta?: number; // ajuste del line-height del rail (≤ 0, clamp a ≥1.12) — comprime sin tocar la fuente
  railGapDelta?: number;  // ajuste de gaps/padding del rail (≤ 0, clamp a ≥2px) — comprime sin tocar la fuente
  synthLines?: number;    // líneas del párrafo de síntesis que explica las tarjetas (0 = sin síntesis). Llena el aire en páginas con espacio; la escalera lo recorta en páginas densas.
  imageMaxH?: number;     // cap de alto de la imagen superior (px) para liberar lugar — lo decide el director de maquetación, no la regla.
}

/**
 * Directiva del DIRECTOR DE MAQUETACIÓN (agente): mira la página renderizada
 * (visión) + el contenido y DECIDE qué hacer con el espacio. La GEOMETRÍA (si
 * entra) la sigue resolviendo la regla; el JUICIO (qué poner, si achicar la
 * imagen, qué redactar) es del agente. El humano solo aprueba.
 */
export interface LayoutDirective {
  decision: "breathe" | "synthesize";      // dejar respirar | llenar el aire con una síntesis
  synthesis: string | null;                // párrafo de 3-5 líneas (prosa, NO títulos de tarjetas) si decision=synthesize
  imageMaxHeightPx: number | null;          // si conviene achicar la imagen para hacerle lugar (null = no tocar)
  rationale: string;                        // por qué (para la metadata / aprobación humana)
  ran: boolean;                             // corrió el agente (false = sin llave / sin headless / capado)
}

/* ── QA renderizada (headless): mide truncado/desborde real ── */
export interface RenderQa {
  available: boolean;
  overflow: boolean;
  overflows: { zone: string; overBy: number }[];
  pageOverflow: boolean;
  error: string | null;
}

/* ── Pipeline editorial (flujo real por etapas, con tiempos) ── */
export interface PipelineStage {
  num: string;            // "01".."05"
  key: string;            // image | assemble | qa | save | done
  label: string;
  detail: string;
  status: "done" | "skipped" | "failed";
  ms: number;
}

/* ── QA predictivo (antes de gastar imagen) ── */
export type RiskSeverity = "ok" | "warn" | "high";
export interface RiskFlag {
  id: string;
  label: string;
  severity: RiskSeverity;
  detail: string;
}
export interface Prediction {
  recipeId: string;
  recipeLabel: string;
  risks: RiskFlag[];
  worst: RiskSeverity;
  safeToSpendImage: boolean;
  summary: string;
}

/* ── Diagnóstico de página y acción recomendada (mesa de decisión) ── */
export interface PageDiagnosis {
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

export interface RecommendedAction {
  pageId: string;
  kind: "keep" | "switch";
  fromRecipe: string;
  toRecipe: string;
  toLabel: string;
  cause: string;
  effect: string;
  risk: string;
  severity: "ok" | "warn" | "high";
  current: PageDiagnosis;
  projected: PageDiagnosis;
  ranking: { recipeId: string; label: string; score: number }[];
}

export interface GenerateResult {
  pageId: string;
  recipeId: string;
  recipeLabel: string;
  generatedAt: string;
  durationMs: number;
  generationMode: GenerationMode;
  approach: string;
  layoutRevision: string;
  structural: {
    passed: boolean;
    score: number;
    checks: StructuralCheck[];
  };
  image: GenerateImageInfo;
  contract: ContractResult;
  prediction: Prediction;
  pipeline: PipelineStage[];
  renderQa: RenderQa | null;
  htmlPath: string;
  bytes: number;
}
