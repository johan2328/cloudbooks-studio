import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { listSeeds } from "../seeds.js";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import type { CoverageReport, ExamDomain, ExamOutline, ExamSkill, PageSeed, SkillCoverage, VisualModule } from "../types.js";

/**
 * TÍTULO DETERMINISTA por skill (español): mapa congelado y editable en
 * skill-titles-es.json. El título de la lámina NO lo genera el autor (era
 * inconsistente: inglés / cortado al re-groundear). Fuente única de verdad.
 */
let TITLES_ES: Record<string, string> | null = null;
function loadTitlesEs(): Record<string, string> {
  if (TITLES_ES) return TITLES_ES;
  try { TITLES_ES = JSON.parse(readFileSync(new URL("./skill-titles-es.json", import.meta.url), "utf8")) as Record<string, string>; }
  catch { TITLES_ES = {}; }
  return TITLES_ES;
}
/** Título ES determinista de una skill (o null si no está en el mapa). */
export function getSkillTitleEs(skillId: string): string | null {
  const t = loadTitlesEs()[skillId];
  return t && t.trim() ? t.trim() : null;
}

/**
 * Taxonomía OFICIAL del curso AI-200T00-A "Develop AI cloud solutions on Azure"
 * (cert. Azure AI Cloud Developer Associate, beta), a NIVEL UNIDAD.
 *
 * Fuente verificada (fetch a learn.microsoft.com, YAML versionado en GitHub, 2026):
 * 9 RUTAS → 24 MÓDULOS → UNIDADES. El átomo de grounding/página es la UNIDAD de
 * CONTENIDO (concepto o ejercicio); se excluyen Introduction / Module assessment /
 * Summary (andamiaje, no contenido nuevo). 122 unidades-contenido en total — ese
 * es el conteo REAL de páginas del Visual Atlas (no 70, que era estimación mía).
 *
 * Cada skill = una unidad de contenido (id `pN.modulo.unidad`), con su URL oficial,
 * su módulo y su tipo. Renumerado limpio; el Dominio 1 (ACR/App Service) es el que
 * el Visual Atlas cubre hoy.
 */
const LP = (slug: string) => `https://learn.microsoft.com/en-us/training/paths/${slug}/`;
const MOD = (slug: string) => `https://learn.microsoft.com/en-us/training/modules/${slug}/`;

type UnitDef = [unitSlug: string, title: string, kind: "concept" | "exercise"];
interface ModuleDef { mid: string; mtitle: string; mslug: string; units: UnitDef[] }
interface PathDef { pid: string; num: number; label: string; slug: string; modules: ModuleDef[] }

/** Catálogo: rutas → módulos → unidades de contenido (concepto/ejercicio). */
const PATHS: PathDef[] = [
  { pid: "p1", num: 1, label: "Ruta 1 — Alojamiento de aplicaciones en contenedores", slug: "implement-container-app-hosting-azure", modules: [
    { mid: "p1.acr", mtitle: "Store and manage containers in Azure Container Registry", mslug: "store-manage-containers-azure-container-registry", units: [
      ["2-image-storage", "Registries, repositories, and artifacts", "concept"],
      ["3-build-run-acr-tasks", "Build and run images with ACR Tasks", "concept"],
      ["4-tag-version-images", "Tag and version images", "concept"],
      ["5-exercise-build-manage-acr-tasks", "Exercise — Build and manage a container image with ACR Tasks", "exercise"],
    ] },
    { mid: "p1.appservice", mtitle: "Deploy containers to Azure App Service", mslug: "deploy-containers-azure-app-service", units: [
      ["2-deploy-containers", "Deploy containers to Azure App Service", "concept"],
      ["3-configure-runtime", "Configure container runtime behavior", "concept"],
      ["4-configure-settings", "Configure application settings", "concept"],
      ["5-observe-troubleshoot", "Observe and troubleshoot containerized apps", "concept"],
      ["6-exercise", "Exercise — Deploy a container to Azure App Service", "exercise"],
    ] },
  ] },
  { pid: "p2", num: 2, label: "Ruta 2 — Despliegue y gestión en Azure Container Apps", slug: "deploy-manage-apps-azure-container-apps", modules: [
    { mid: "p2.deploy", mtitle: "Deploy containers to Azure Container Apps", mslug: "deploy-containers-azure-container-apps", units: [
      ["2-container-apps-environments", "Explore Container Apps environments", "concept"],
      ["3-deploy-container-app", "Deploy a container app using the Azure CLI and YAML", "concept"],
      ["4-configure-runtime", "Configure runtime settings with environment variables and secrets", "concept"],
      ["5-connect-to-registries", "Configure image pull authentication for private registries", "concept"],
      ["6-verify-deployment", "Verify deployments with logs and status", "concept"],
      ["7-exercise-deploy-backend-api", "Exercise — Deploy a containerized backend API to Container Apps", "exercise"],
    ] },
    { mid: "p2.manage", mtitle: "Manage containers in Azure Container Apps", mslug: "manage-containers-azure-container-apps", units: [
      ["2-update-images-manage-revisions", "Update images and manage revisions safely", "concept"],
      ["3-app-lifecycle-management", "Manage the container app lifecycle", "concept"],
      ["4-monitor-logs-troubleshoot", "Monitor logs and troubleshoot issues", "concept"],
      ["5-health-probes", "Configure health probes and troubleshoot failures", "concept"],
      ["6-optimize-container-settings", "Optimize container resources and scaling", "concept"],
      ["7-exercise-diagnose-fix-failing-deployment", "Exercise — Diagnose and fix a failing deployment", "exercise"],
    ] },
    { mid: "p2.scale", mtitle: "Scale containers in Azure Container Apps", mslug: "scale-containers-azure-container-apps", units: [
      ["2-configure-scale-rules", "Configure scale rules", "concept"],
      ["3-event-driven-scaling-keda", "Implement event-driven scaling with KEDA", "concept"],
      ["4-keda-scalers-custom-workloads", "Apply KEDA scalers for custom workloads", "concept"],
      ["5-compute-resources-performance-cost", "Select compute resources for performance and cost", "concept"],
      ["6-revision-modes-traffic-management", "Choose and apply revision modes", "concept"],
      ["7-exercise-configure-autoscaling-keda", "Exercise — Configure autoscaling using KEDA triggers", "exercise"],
    ] },
  ] },
  { pid: "p3", num: 3, label: "Ruta 3 — Despliegue y supervisión en Azure Kubernetes Service", slug: "deploy-monitor-apps-azure-kubernetes-service", modules: [
    { mid: "p3.deploy", mtitle: "Deploy applications to Azure Kubernetes Service", mslug: "deploy-apps-azure-kubernetes-service", units: [
      ["2-create-deployment-manifests", "Create Kubernetes deployment manifests", "concept"],
      ["3-expose-applications", "Expose applications in Azure Kubernetes Services", "concept"],
      ["4-deploy-verify-results", "Deploy applications to Azure Kubernetes Services", "concept"],
      ["5-exercise-deploy-ai-api", "Exercise — Deploy an AI inference API to Azure Kubernetes Service", "exercise"],
    ] },
    { mid: "p3.configure", mtitle: "Configure applications on Azure Kubernetes Service", mslug: "configure-apps-azure-kubernetes-service", units: [
      ["2-define-configmaps", "Define ConfigMaps for application settings", "concept"],
      ["3-implement-secrets", "Implement secrets for sensitive data", "concept"],
      ["4-persistent-storage", "Attach persistent storage to an app", "concept"],
      ["5-exercise-configure-apps", "Exercise — Configure apps on Azure Kubernetes Service", "exercise"],
    ] },
    { mid: "p3.monitor", mtitle: "Monitor and troubleshoot applications on Azure Kubernetes Service", mslug: "monitor-apps-azure-kubernetes-service", units: [
      ["2-monitor-logs-metrics", "Monitor application logs and metrics", "concept"],
      ["3-troubleshoot-pods-services", "Troubleshoot pods and services", "concept"],
      ["4-verify-connectivity", "Verify service connectivity and endpoints", "concept"],
      ["5-exercise-troubleshoot-apps", "Exercise — Troubleshoot apps on Azure Kubernetes Service", "exercise"],
    ] },
  ] },
  { pid: "p4", num: 4, label: "Ruta 4 — Soluciones de IA con Azure Cosmos DB for NoSQL", slug: "develop-ai-solutions-azure-cosmos-db", modules: [
    { mid: "p4.query", mtitle: "Build queries for Azure Cosmos DB for NoSQL", mslug: "build-query-azure-cosmos-db", units: [
      ["2-explore-cosmos-db-nosql", "Explore Azure Cosmos DB for NoSQL", "concept"],
      ["3-implement-cosmos-db-sdk", "Implement the Azure Cosmos DB for NoSQL SDK", "concept"],
      ["4-query-cosmos-db-nosql", "Query Azure Cosmos DB for NoSQL", "concept"],
      ["5-exercise-build-rag-document-store", "Exercise — Build a RAG document store on Azure Cosmos DB for NoSQL", "exercise"],
    ] },
    { mid: "p4.vector", mtitle: "Implement vector search on Azure Cosmos DB for NoSQL", mslug: "implement-vector-search-azure-cosmos-db", units: [
      ["2-store-retrieve-embeddings", "Store and retrieve embeddings in Azure Cosmos DB", "concept"],
      ["3-execute-vector-similarity-queries", "Execute vector similarity queries for semantic search", "concept"],
      ["4-combine-vector-metadata-filtering", "Combine vector similarity results with metadata filtering", "concept"],
      ["5-change-feed-trigger-embedding-refresh", "Use the change feed to trigger embedding refresh", "concept"],
      ["6-exercise-build-semantic-search", "Exercise — Build a semantic search application with Cosmos DB for NoSQL", "exercise"],
    ] },
    { mid: "p4.optimize", mtitle: "Optimize query performance for Azure Cosmos DB for NoSQL", mslug: "optimize-query-performance-azure-cosmos-db", units: [
      ["2-understand-indexes-cosmos-db", "Understand indexes in Azure Cosmos DB", "concept"],
      ["3-configure-range-composite-indexes", "Configure range and composite indexes", "concept"],
      ["4-tune-vector-indexes-embeddings", "Tune vector indexes for embedding workloads", "concept"],
      ["5-reduce-ru-costs-strategic-indexing", "Reduce RU costs with strategic indexing", "concept"],
      ["6-choose-consistency-levels-performance", "Choose consistency levels for optimal performance", "concept"],
      ["7-exercise-optimize-query-performance", "Exercise — Optimize query performance with vector indexes", "exercise"],
    ] },
  ] },
  { pid: "p5", num: 5, label: "Ruta 5 — Soluciones de IA con Azure Database for PostgreSQL", slug: "develop-ai-solutions-azure-database-postgresql", modules: [
    { mid: "p5.query", mtitle: "Build and query with Azure Database for PostgreSQL", mslug: "build-query-azure-database-postgresql", units: [
      ["2-explore-azure-database-postgresql", "Explore Azure Database for PostgreSQL", "concept"],
      ["3-connect-to-postgresql", "Connect to PostgreSQL", "concept"],
      ["4-create-manage-schemas", "Create and manage schemas", "concept"],
      ["5-query-data", "Query data", "concept"],
      ["6-integrate-sdks-apps", "Integrate SDKs and applications", "concept"],
      ["7-exercise-build-agent-tool-backend", "Exercise — Build an agent tool backend on Azure Database for PostgreSQL", "exercise"],
    ] },
    { mid: "p5.vector", mtitle: "Implement vector search with Azure Database for PostgreSQL", mslug: "implement-vector-search-azure-database-postgresql", units: [
      ["2-store-query-embeddings-pgvector", "Store and query embeddings with pgvector", "concept"],
      ["3-perform-fast-vector-similarity-search", "Perform fast vector similarity search", "concept"],
      ["4-manage-index-lifecycle-embedding-updates", "Manage index lifecycle and embedding updates", "concept"],
      ["5-run-vector-similarity-search-semantic-retrieval", "Run vector similarity search for semantic retrieval", "concept"],
      ["6-implement-retrieval-patterns-rag-pipelines", "Implement retrieval patterns for RAG pipelines", "concept"],
      ["7-exercise-implement-vector-search", "Exercise — Implement vector search on Azure Database for PostgreSQL", "exercise"],
    ] },
    { mid: "p5.optimize", mtitle: "Optimize vector search in Azure Database for PostgreSQL", mslug: "optimize-vector-search-azure-database-postgresql", units: [
      ["2-tune-postgresql-pgvector", "Tune PostgreSQL for pgvector", "concept"],
      ["3-choose-configure-vector-indexes", "Choose and configure vector indexes", "concept"],
      ["4-optimize-data-layout", "Optimize data layout", "concept"],
      ["5-scale-high-volume-workloads", "Scale for high-volume workloads", "concept"],
      ["6-connection-optimization", "Connection optimization", "concept"],
      ["7-exercise-optimize-vector-search", "Exercise — Optimize vector search performance in PostgreSQL", "exercise"],
    ] },
  ] },
  { pid: "p6", num: 6, label: "Ruta 6 — Soluciones de IA con Azure Managed Redis", slug: "enhance-ai-solutions-azure-managed-redis", modules: [
    { mid: "p6.data", mtitle: "Implement data operations in Azure Managed Redis", mslug: "implement-data-operations-azure-managed-redis", units: [
      ["2-explore-azure-managed-redis", "Explore Azure Managed Redis", "concept"],
      ["3-client-libraries-best-practices", "Client libraries and development best practices", "concept"],
      ["4-implement-data-operations", "Implement data operations", "concept"],
      ["5-exercise-data-operations", "Exercise — Perform data operations in Azure Managed Redis", "exercise"],
    ] },
    { mid: "p6.messaging", mtitle: "Implement event messaging with Azure Managed Redis", mslug: "implement-event-messaging-azure-managed-redis", units: [
      ["2-redis-pub-sub", "Publish and subscribe to events with Redis pub/sub", "concept"],
      ["3-redis-streams", "Implement task queues with Redis Streams", "concept"],
      ["4-coordinate-multiple-subscribers", "Choose between broadcast and coordinated distribution", "concept"],
      ["5-exercise-publish-subscribe-events-redis", "Exercise — Publish and subscribe to events in Azure Managed Redis", "exercise"],
    ] },
    { mid: "p6.vector", mtitle: "Implement vector storage in Azure Managed Redis", mslug: "implement-vector-storage-azure-managed-redis", units: [
      ["2-index-query-vector-data", "Index and query vector data", "concept"],
      ["3-vector-types-index-strategy", "Choose vector types and indexing strategies", "concept"],
      ["4-optimize-redis-data-structure", "Optimize Redis data structures for vector storage", "concept"],
      ["5-exercise-semantic-search-azure-managed-redis", "Exercise — Implement semantic search in Azure Managed Redis", "exercise"],
    ] },
  ] },
  { pid: "p7", num: 7, label: "Ruta 7 — Integración de servicios backend para IA", slug: "integrate-backend-services-ai-solutions", modules: [
    { mid: "p7.servicebus", mtitle: "Queue and process AI operations with Azure Service Bus", mslug: "queue-process-operations-service-bus", units: [
      ["2-explore-service-bus-concepts", "Explore Azure Service Bus concepts and messaging in AI architectures", "concept"],
      ["3-choose-queues-topics-subscriptions", "Choose between queues and topics with subscriptions", "concept"],
      ["4-structure-messages-ai-workloads", "Structure messages for AI workloads", "concept"],
      ["5-process-messages-reliably", "Process messages reliably", "concept"],
      ["6-exercise-process-messages", "Exercise — Process messages with Azure Service Bus", "exercise"],
    ] },
    { mid: "p7.eventgrid", mtitle: "Develop event-driven AI workflows with Azure Event Grid", mslug: "event-driven-workflows-event-grid", units: [
      ["2-understand-event-grid-concepts", "Understand Azure Event Grid concepts and event-driven patterns for AI solutions", "concept"],
      ["3-event-schemas-properties", "Work with event schemas and properties", "concept"],
      ["4-delivery-retry-policies", "Configure delivery and retry policies for reliable event processing", "concept"],
      ["5-publish-custom-events", "Publish custom events from AI applications", "concept"],
      ["6-exercise-publish-receive-events", "Exercise — Publish and receive events with Azure Event Grid", "exercise"],
    ] },
    { mid: "p7.functions", mtitle: "Build serverless AI backends with Azure Functions", mslug: "build-backends-azure-functions", units: [
      ["2-understand-hosting-scaling", "Understand Azure Functions hosting and scaling for AI workloads", "concept"],
      ["3-set-up-local-development-environment", "Set up the local development environment for Functions", "concept"],
      ["4-create-triggers-bindings-ai-patterns", "Create triggers and bindings for AI integration patterns", "concept"],
      ["5-manage-secrets-configuration", "Manage secrets and configuration in Functions", "concept"],
      ["6-configure-identity-access", "Configure identity and access for Functions", "concept"],
      ["7-exercise-create-mcp-server", "Exercise — Create an MCP server with Azure Functions", "exercise"],
    ] },
  ] },
  { pid: "p8", num: 8, label: "Ruta 8 — Secretos y configuración de aplicaciones", slug: "manage-app-secrets-configuration", modules: [
    { mid: "p8.keyvault", mtitle: "Manage application secrets with Azure Key Vault", mslug: "manage-app-secrets-key-vault", units: [
      ["2-store-organize-secrets", "Store and organize secrets, keys, and certificates", "concept"],
      ["3-retrieve-secrets-sdk", "Retrieve secrets using Azure SDK client libraries", "concept"],
      ["4-handle-versioning-rotation", "Handle secret versioning and rotation", "concept"],
      ["5-implement-caching-strategies", "Implement caching strategies to reduce Key Vault calls", "concept"],
      ["6-exercise-manage-secrets", "Exercise — Manage secrets with Azure Key Vault", "exercise"],
    ] },
    { mid: "p8.appconfig", mtitle: "Manage application settings with Azure App Configuration", mslug: "manage-app-settings-app-config", units: [
      ["2-connect-app-configuration", "Connect to App Configuration from application code", "concept"],
      ["3-organize-labels-feature-flags", "Organize settings with labels and feature flags", "concept"],
      ["4-reference-key-vault-secrets", "Reference Key Vault secrets from App Configuration", "concept"],
      ["5-decide-app-config-vs-key-vault", "Decide what to store in App Configuration vs Key Vault", "concept"],
      ["6-exercise-retrieve-settings", "Exercise — Retrieve settings and secrets from Azure App Configuration", "exercise"],
    ] },
  ] },
  { pid: "p9", num: 9, label: "Ruta 9 — Observabilidad y troubleshooting", slug: "observe-troubleshoot-apps", modules: [
    { mid: "p9.opentelemetry", mtitle: "Instrument an app with OpenTelemetry", mslug: "instrument-app-opentelemetry", units: [
      ["2-explore-opentelemetry-observability", "Explore OpenTelemetry and its role in observability", "concept"],
      ["3-add-opentelemetry-sdk", "Add the OpenTelemetry SDK to an application", "concept"],
      ["4-configure-spans-traces", "Configure spans and traces", "concept"],
      ["5-export-telemetry-azure-monitor", "Export telemetry to Azure Monitor", "concept"],
      ["6-debug-distributed-flows-trace-data", "Debug distributed flows with trace data", "concept"],
      ["7-exercise-instrument-app-opentelemetry", "Exercise — Instrument an app with the OpenTelemetry SDK", "exercise"],
    ] },
    { mid: "p9.telemetry", mtitle: "Analyze app telemetry with logs and metrics", mslug: "analyze-telemetry-logs-metrics", units: [
      ["2-write-basic-kql-queries", "Write basic KQL queries", "concept"],
      ["3-explore-logs-errors-performance", "Explore logs for errors and performance", "concept"],
      ["4-build-dashboards-app-telemetry", "Build dashboards for app telemetry", "concept"],
      ["5-create-workbooks-interactive-analysis", "Create workbooks for interactive analysis", "concept"],
      ["6-set-alerts-app-failures-anomalies", "Set alerts for app failures and anomalies", "concept"],
      ["7-exercise-query-logs-kql", "Exercise — Query logs with KQL", "exercise"],
    ] },
  ] },
];

/** Id corto de unidad: quita el prefijo numérico del slug (2-image-storage → image-storage). */
const unitId = (mid: string, unitSlug: string) => `${mid}.${unitSlug.replace(/^\d+-/, "")}`;

/**
 * Los EJERCICIOS (labs de portal) NO entran al libro (decisión Corrida 33): son actividades
 * para ejecutar en el portal de Azure, no encajan en el formato concepto→trampa→autocheck del
 * Atlas y son redundantes con la unidad de concepto de su módulo. Los datos siguen en PATHS;
 * acá se filtran. Poné true para reactivar una sección de práctica en el futuro.
 */
const INCLUDE_EXERCISES = false;

/** Construye los dominios (rutas) con skills = unidades de contenido (excluye ejercicios). */
const DOMAINS: ExamDomain[] = PATHS.map((p) => ({
  id: p.pid, num: p.num, label: p.label, weightPct: null, url: LP(p.slug),
  skills: p.modules.flatMap((m) =>
    m.units
      .filter(([, , kind]) => INCLUDE_EXERCISES || kind !== "exercise")
      .map<ExamSkill>(([slug, title, kind]) => ({
      id: unitId(m.mid, slug),
      title,
      objectives: [title],
      url: `${MOD(m.mslug)}${slug}`,
      moduleId: m.mid,
      moduleTitle: m.mtitle,
      kind,
    })),
  ),
}));

export const EXAM_OUTLINE: ExamOutline = {
  certId: "ai-200",
  certLabel: "AI-200 · Develop AI cloud solutions on Azure (Azure AI Cloud Developer Associate, beta)",
  status: "validated",
  note: "9 rutas → 24 módulos → 122 unidades OFICIALES del curso AI-200T00-A (learn.microsoft.com/training/courses/ai-200t00). El Atlas usa solo las unidades de CONCEPTO (98); los 24 EJERCICIOS (labs de portal) se excluyen del libro (Corrida 33) — sus datos quedan en PATHS, reactivables con INCLUDE_EXERCISES. Se excluyen también intro/assessment/summary. El átomo de página/grounding es la unidad de concepto.",
  domains: DOMAINS,
};

/**
 * REGISTRO DE TEMARIOS POR CERT. AI-200 = el temario oficial validado; otras certs se
 * registran acá cuando tengan su outline. Sin registro → shell vacío (sin branding AI-200,
 * `getOutline`/`allModules`/etc. NO devuelven la estructura de AI-200 para otro cert).
 * Los helpers derivados aceptan `certId?` con default al LIBRO ACTIVO (`CONFIG.certId`),
 * así los ~25 call-sites existentes no cambian y siguen operando sobre el cert activo.
 */
const OUTLINES_BY_CERT: Record<string, ExamOutline> = { "ai-200": EXAM_OUTLINE };

function emptyOutline(certId: string): ExamOutline {
  return { certId, certLabel: certId.toUpperCase(), status: "draft", note: "Sin temario cargado para esta certificación todavía.", domains: [] };
}

// OVERRIDE PERSISTIDO por cert (`_outline.{certId}.json`): onboardear un cert es una operación PERSISTIDA por el
// producto (endpoint `POST /engine/outline`), no un edit de código. Memoizado; se invalida al setear. Precedencia:
// persistido > default en código (`OUTLINES_BY_CERT`) > shell vacío. Barrido cross-cert Fase 1.
const outlinePath = (certId: string): string => path.join(CONFIG.outputRoot, `_outline.${certId}.json`);
const PERSISTED_OUTLINE = new Map<string, ExamOutline | null>();
function loadPersistedOutline(certId: string): ExamOutline | null {
  if (PERSISTED_OUTLINE.has(certId)) return PERSISTED_OUTLINE.get(certId)!;
  let val: ExamOutline | null = null;
  try { const p = outlinePath(certId); if (existsSync(p)) val = JSON.parse(readFileSync(p, "utf8")) as ExamOutline; } catch { val = null; }
  PERSISTED_OUTLINE.set(certId, val);
  return val;
}

/** Temario del cert (default = libro activo): override persistido → default en código → shell vacío. */
export function getOutline(certId: string = CONFIG.certId): ExamOutline {
  return loadPersistedOutline(certId) ?? OUTLINES_BY_CERT[certId] ?? emptyOutline(certId);
}

/** Persiste el temario de un cert (onboarding data-driven) e invalida las cachés (memo + derivadas). */
export function setOutline(certId: string, outline: ExamOutline): ExamOutline {
  const full: ExamOutline = { ...outline, certId };
  atomicWriteFileSync(outlinePath(certId), JSON.stringify(full, null, 2), "outline");
  PERSISTED_OUTLINE.set(certId, full);
  DERIVED.clear();
  return full;
}

// ── Cachés derivadas POR CERT (índices/ordinales de skills y módulos), memoizadas ──
interface OutlineModule { moduleId: string; moduleTitle: string; domainId: string; domainLabel: string; skillIds: string[] }
interface OutlineDerived {
  skills: { skill: ExamSkill; domainId: string }[];
  skillIndex: Map<string, { skill: ExamSkill; domainId: string }>;
  skillOrdinal: Map<string, number>;
  modules: OutlineModule[];
  moduleOrdinal: Map<string, number>;
  moduleIndex: Map<string, OutlineModule>;
}
const DERIVED = new Map<string, OutlineDerived>();

/** Módulos de un dominio (agrupa las skills por moduleId). Puro sobre el outline dado. */
function modulesOf(outline: ExamOutline, domainId: string): { moduleId: string; moduleTitle: string; skillIds: string[] }[] {
  const d = outline.domains.find((x) => x.id === domainId);
  if (!d) return [];
  const byModule = new Map<string, { moduleId: string; moduleTitle: string; skillIds: string[] }>();
  for (const s of d.skills) {
    const mid = s.moduleId ?? d.id;
    const entry = byModule.get(mid) ?? { moduleId: mid, moduleTitle: s.moduleTitle ?? mid, skillIds: [] };
    entry.skillIds.push(s.id);
    byModule.set(mid, entry);
  }
  return [...byModule.values()];
}

function derived(certId: string): OutlineDerived {
  const hit = DERIVED.get(certId);
  if (hit) return hit;
  const outline = getOutline(certId);
  const skills = outline.domains.flatMap((dom) => dom.skills.map((skill) => ({ skill, domainId: dom.id })));
  const modules: OutlineModule[] = [];
  for (const dom of outline.domains) for (const m of modulesOf(outline, dom.id)) modules.push({ ...m, domainId: dom.id, domainLabel: dom.label });
  const d: OutlineDerived = {
    skills,
    skillIndex: new Map(skills.map((x) => [x.skill.id, x])),
    skillOrdinal: new Map(skills.map((x, i) => [x.skill.id, i + 1])),
    modules,
    moduleOrdinal: new Map(modules.map((m, i) => [m.moduleId, i + 1])),
    moduleIndex: new Map(modules.map((m) => [m.moduleId, m])),
  };
  DERIVED.set(certId, d);
  return d;
}

export function allSkills(certId: string = CONFIG.certId): { skill: ExamSkill; domainId: string }[] {
  return [...derived(certId).skills];
}

export function getSkill(id: string, certId: string = CONFIG.certId): ExamSkill | null {
  return derived(certId).skillIndex.get(id)?.skill ?? null;
}

/** Número de página (id) de una unidad: su posición en el temario oficial, padded a 2 dígitos. */
export function pageNumberForSkill(skillId: string, certId: string = CONFIG.certId): string | null {
  const ord = derived(certId).skillOrdinal.get(skillId);
  return ord ? String(ord).padStart(2, "0") : null;
}

/** Total de unidades de contenido del temario (= total de páginas posibles del atlas). */
export function totalUnits(certId: string = CONFIG.certId): number {
  return derived(certId).skillOrdinal.size;
}

/** Módulos de un dominio (ruta) con sus unidades, para agrupar en la UI. */
export function modulesForDomain(domainId: string, certId: string = CONFIG.certId): { moduleId: string; moduleTitle: string; skillIds: string[] }[] {
  return modulesOf(getOutline(certId), domainId);
}

/** Todos los módulos del temario en orden (ruta→módulo), con su dominio. Átomo del Master Book: 1 módulo = 1 capítulo. */
export function allModules(certId: string = CONFIG.certId): OutlineModule[] {
  return [...derived(certId).modules];
}

export function getModule(moduleId: string, certId: string = CONFIG.certId): OutlineModule | null {
  return derived(certId).moduleIndex.get(moduleId) ?? null;
}
/** Número de capítulo (id) de un módulo: su posición en el temario, padded a 2 dígitos. Capítulo 01 = primer módulo. */
export function chapterNumberForModule(moduleId: string, certId: string = CONFIG.certId): string | null {
  const ord = derived(certId).moduleOrdinal.get(moduleId);
  return ord ? String(ord).padStart(2, "0") : null;
}
export function totalModules(certId: string = CONFIG.certId): number { return derived(certId).moduleOrdinal.size; }

/**
 * Leyenda del dominio (las 4 unidades tope) que EXPLICA la imagen compartida por
 * dominio. Cae a los visualModules del seed si la página no mapea a un dominio.
 */
export function domainLegendForSeed(seed: PageSeed, certId: string = CONFIG.certId): VisualModule[] {
  const skillId = seed.skillIds?.[0];
  if (skillId) {
    for (const d of getOutline(certId).domains) {
      if (d.skills.some((s) => s.id === skillId)) {
        return d.skills.slice(0, 4).map((s, i) => ({ num: String(i + 1).padStart(2, "0"), title: s.title, description: s.objectives.join(" · ") }));
      }
    }
  }
  return seed.visualModules.slice(0, 8);
}

/** Cobertura: qué skills (unidades) cubre cada página (desde seed.skillIds). */
export function buildCoverage(certId: string = CONFIG.certId): CoverageReport {
  const outline = getOutline(certId);
  const seeds = listSeeds();
  const pagesBySkill = new Map<string, string[]>();
  for (const s of seeds) {
    for (const skillId of s.skillIds ?? []) {
      const arr = pagesBySkill.get(skillId) ?? [];
      arr.push(s.pageId);
      pagesBySkill.set(skillId, arr);
    }
  }

  const skills: SkillCoverage[] = allSkills(certId).map(({ skill, domainId }) => {
    const pageIds = pagesBySkill.get(skill.id) ?? [];
    return { skillId: skill.id, domainId, title: skill.title, pageIds, covered: pageIds.length > 0 };
  });

  const byDomain = outline.domains.map((d) => {
    const ds = skills.filter((s) => s.domainId === d.id);
    return { domainId: d.id, label: d.label, total: ds.length, covered: ds.filter((s) => s.covered).length };
  });

  return {
    certId: outline.certId,
    taxonomyStatus: outline.status,
    totalSkills: skills.length,
    coveredSkills: skills.filter((s) => s.covered).length,
    byDomain,
    skills,
    gaps: skills.filter((s) => !s.covered),
  };
}
