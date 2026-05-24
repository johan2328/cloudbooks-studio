import type { AtlasPage, GenerationRun, QAReport, UserActionLog, ContractVersion, StudioState } from "./types";

/* ─── Páginas Batch 01–10 (Azure Container Registry) ────────────────────── */
const PAGES: AtlasPage[] = [
  {
    id:"01", pageNumber:"01", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Azure Container Registry: arquitectura y tiers",
    domain:"Azure Container Registry",
    status:"approved", groundingStatus:"verified", currentVersion:"v3", contractVersion:"v24",
    qaScore:9.42, lastRevision:"2026-05-18",
    groundingNote:"Verificado contra Azure Container Registry Overview (MS Learn) y ACR Pricing documentation.",
    sources:["MS Learn – Azure Container Registry overview","MS Learn – ACR service tiers","Azure Architecture Center – Container scenarios"],
  },
  {
    id:"02", pageNumber:"02", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Build y push de imágenes hacia ACR",
    domain:"Azure Container Registry",
    status:"approved", groundingStatus:"verified", currentVersion:"v2", contractVersion:"v24",
    qaScore:9.36, lastRevision:"2026-05-19",
    groundingNote:"Verificado contra MS Learn – Build and push Docker image to ACR y Azure CLI Reference.",
    sources:["MS Learn – Build and push to ACR Quick Start","MS Learn – ACR Tasks documentation","Docker Official Docs – docker push"],
  },
  {
    id:"03", pageNumber:"03", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Tags, digest SHA256 y trazabilidad",
    domain:"Azure Container Registry",
    status:"qa_review", groundingStatus:"partial", currentVersion:"v2", contractVersion:"v24",
    qaScore:9.28, lastRevision:"2026-05-20",
    groundingNote:"Parcialmente verificado — pendiente confirmar quarantine policy en tier Basic.",
    sources:["MS Learn – Content trust in ACR","OCI Distribution Specification","Azure Policy for ACR – image signing"],
  },
  {
    id:"04", pageNumber:"04", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Autenticación: tokens, service principals y managed identity",
    domain:"Azure Container Registry",
    status:"needs_revision", groundingStatus:"verified", currentVersion:"v2", contractVersion:"v24",
    qaScore:9.18, lastRevision:"2026-05-20",
    groundingNote:"Verificado contra MS Learn – Authenticate with ACR y Azure RBAC docs.",
    sources:["MS Learn – Authenticate with ACR","MS Learn – Managed identities for Azure resources","Azure RBAC Docs"],
  },
  {
    id:"05", pageNumber:"05", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Geo-replicación y alta disponibilidad",
    domain:"Azure Container Registry",
    status:"qa_pending", groundingStatus:"verified", currentVersion:"v1", contractVersion:"v24",
    qaScore:8.96, lastRevision:"2026-05-21",
    groundingNote:"Verificado contra MS Learn – Geo-replication in ACR.",
    sources:["MS Learn – Geo-replication in ACR","Azure Architecture Center – HA patterns","ACR Premium Features docs"],
  },
  {
    id:"06", pageNumber:"06", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Seguridad: private endpoint y network rules",
    domain:"Azure Container Registry",
    status:"qa_pending", groundingStatus:"partial", currentVersion:"v1", contractVersion:"v24",
    qaScore:8.91, lastRevision:"2026-05-21",
    groundingNote:"Parcialmente verificado — private DNS Zone config en validación.",
    sources:["MS Learn – ACR private endpoint","Azure Network Security Docs","MS Learn – Virtual network rules"],
  },
  {
    id:"07", pageNumber:"07", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"ACR Tasks: automatización de builds y pipelines",
    domain:"Azure Container Registry",
    status:"grounded", groundingStatus:"verified", currentVersion:"v1", contractVersion:"v24",
    groundingNote:"Verificado contra MS Learn – ACR Tasks reference y GitHub Actions integration.",
    sources:["MS Learn – ACR Tasks documentation","GitHub Actions – Azure Container Registry","MS Learn – Multi-step tasks"],
  },
  {
    id:"08", pageNumber:"08", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Integración con AKS y Container Apps",
    domain:"Azure Container Registry",
    status:"grounding_pending", groundingStatus:"unverified", currentVersion:"v1", contractVersion:"v24",
    sources:["MS Learn – AKS with ACR","MS Learn – Container Apps with ACR"],
  },
  {
    id:"09", pageNumber:"09", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Políticas de retención y limpieza de imágenes",
    domain:"Azure Container Registry",
    status:"grounding_pending", groundingStatus:"unverified", currentVersion:"v1", contractVersion:"v24",
    sources:["MS Learn – ACR retention policies","MS Learn – Auto-purge for ACR"],
  },
  {
    id:"10", pageNumber:"10", batch:"Batch 01", certificationId:"ai-200", formatId:"visual-atlas",
    title:"Troubleshooting de acceso, permisos y versiones",
    domain:"Azure Container Registry",
    status:"qa_pending", groundingStatus:"verified", currentVersion:"v1", contractVersion:"v24",
    qaScore:8.84, lastRevision:"2026-05-22",
    groundingNote:"Verificado contra MS Learn – ACR Troubleshooting y Azure Monitor Logs for ACR.",
    sources:["MS Learn – Troubleshooting ACR","Azure Monitor Docs","ACR Error Reference – az acr check-health"],
  },
  /* Batch 02–13 — páginas de placeholder */
  ...Array.from({length:51}, (_,i) => {
    const n = String(i + 11).padStart(2,"0");
    const batchNum = String(Math.ceil((i+11)/5)).padStart(2,"0");
    return {
      id:n, pageNumber:n, batch:`Batch ${batchNum}`, certificationId:"ai-200", formatId:"visual-atlas",
      title:`Página AI-200 ${n} — Pendiente de contenido`,
      domain:"Azure AI Services",
      status:"draft" as const, groundingStatus:"unverified" as const,
      currentVersion:"v0", contractVersion:"v24",
      sources:[] as string[],
    };
  }),
];

/* ─── Runs de generación iniciales ──────────────────────────────────────── */
const RUNS: GenerationRun[] = [
  { id:"run-001", pageId:"01", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación desde grounding verificado", createdAt:"2026-05-05T10:30:00Z", completedAt:"2026-05-05T10:32:45Z", promptTokens:2840, completionTokens:1920 },
  { id:"run-002", pageId:"01", type:"selective_regeneration", status:"completed", model:"gpt-4o", version:"v2", note:"Corrección de diagrama de arquitectura", createdAt:"2026-05-12T14:20:00Z", completedAt:"2026-05-12T14:21:30Z", promptTokens:1450, completionTokens:890 },
  { id:"run-003", pageId:"01", type:"selective_regeneration", status:"completed", model:"gpt-4o", version:"v3", note:"Ajuste de tabla de tiers — aprobación final", createdAt:"2026-05-18T11:00:00Z", completedAt:"2026-05-18T11:01:20Z", promptTokens:980, completionTokens:620 },
  { id:"run-004", pageId:"02", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación", createdAt:"2026-05-08T09:15:00Z", completedAt:"2026-05-08T09:17:40Z", promptTokens:2760, completionTokens:1870 },
  { id:"run-005", pageId:"02", type:"selective_regeneration", status:"completed", model:"gpt-4o", version:"v2", note:"Aprobada con observación", createdAt:"2026-05-19T16:45:00Z", completedAt:"2026-05-19T16:46:50Z", promptTokens:1120, completionTokens:740 },
  { id:"run-006", pageId:"03", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación", createdAt:"2026-05-10T11:00:00Z", completedAt:"2026-05-10T11:02:30Z", promptTokens:2920, completionTokens:1980 },
  { id:"run-007", pageId:"03", type:"selective_regeneration", status:"completed", model:"gpt-4o", version:"v2", note:"Ajuste de diagrama SHA256", createdAt:"2026-05-20T10:30:00Z", completedAt:"2026-05-20T10:31:40Z", promptTokens:1340, completionTokens:820 },
  { id:"run-008", pageId:"04", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación", createdAt:"2026-05-11T09:00:00Z", completedAt:"2026-05-11T09:02:20Z", promptTokens:2680, completionTokens:1820 },
  { id:"run-009", pageId:"04", type:"selective_regeneration", status:"completed", model:"gpt-4o", version:"v2", note:"Corrección de flujo RBAC", createdAt:"2026-05-20T14:00:00Z", completedAt:"2026-05-20T14:01:30Z", promptTokens:1180, completionTokens:780 },
  { id:"run-010", pageId:"05", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación", createdAt:"2026-05-21T10:00:00Z", completedAt:"2026-05-21T10:02:15Z", promptTokens:2540, completionTokens:1760 },
  { id:"run-011", pageId:"06", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera generación", createdAt:"2026-05-21T11:00:00Z", completedAt:"2026-05-21T11:02:40Z", promptTokens:2610, completionTokens:1790 },
  { id:"run-012", pageId:"10", type:"full_generation", status:"completed", model:"gpt-4o", version:"v1", note:"Primera versión generada — pendiente QA inicial", createdAt:"2026-05-22T09:30:00Z", completedAt:"2026-05-22T09:32:20Z", promptTokens:2480, completionTokens:1700 },
];

/* ─── Reportes QA iniciales ──────────────────────────────────────────────── */
const QA_REPORTS: QAReport[] = [
  {
    id:"qa-001", pageId:"01", verdict:"approved", reviewer:"QA Specialist",
    createdAt:"2026-05-18T12:00:00Z",
    dimensions:{ artDirection:96, editorialConsistency:94, readability:92, technicalAccuracy:95, density:93, commercialRisk:96, total:94 },
    observations:["Coherencia entre badges de tier y diagrama — resuelto en v3","Tabla de almacenamiento correctamente posicionada"],
    redTeamLog:["✓ Verificar coherencia entre badges de tier y diagrama de capacidades — v3 resuelto","✓ Confirmar que los límites de almacenamiento aparecen en tabla y no sólo en texto"],
    defectsFound:[],
  },
  {
    id:"qa-002", pageId:"02", verdict:"approved", reviewer:"QA Specialist",
    createdAt:"2026-05-19T17:00:00Z",
    dimensions:{ artDirection:94, editorialConsistency:93, readability:95, technicalAccuracy:92, density:91, commercialRisk:95, total:93 },
    observations:["Varianza iconográfica entre comandos CLI y portal UI — observación menor"],
    redTeamLog:["⚠ Controlar varianza iconográfica entre comandos CLI y portal UI — pendiente v3","✓ Asegurar numeración homogénea de pasos en el flujo de build"],
    defectsFound:["icon_variance"],
  },
  {
    id:"qa-003", pageId:"03", verdict:"needs_revision", reviewer:"QA Specialist",
    createdAt:"2026-05-20T11:00:00Z",
    dimensions:{ artDirection:93, editorialConsistency:92, readability:94, technicalAccuracy:91, density:90, commercialRisk:94, total:92 },
    observations:["Posible recorte en diagrama SHA256 — zona inferior derecha","Densidad del contexto elevada — simplificar sin perder precisión","Espacio vacío en zona de autocheck"],
    redTeamLog:["⚠ Verificar recortes en diagrama de trazabilidad SHA256 — zona inferior derecha","⚠ Revisar densidad del contexto — puede simplificarse sin perder precisión técnica","⚠ Evitar espacios vacíos en zona de autocheck"],
    defectsFound:["empty_gap","crop"],
  },
  {
    id:"qa-004", pageId:"04", verdict:"needs_revision", reviewer:"QA Specialist",
    createdAt:"2026-05-20T15:00:00Z",
    dimensions:{ artDirection:92, editorialConsistency:90, readability:91, technicalAccuracy:93, density:88, commercialRisk:93, total:91 },
    observations:["Diagrama de flujo RBAC confuso — simplificar jerarquía visual","Tabla de roles incompleta — agregar AcrDelete"],
    redTeamLog:["⚠ Diagrama de flujo RBAC confuso — simplificar jerarquía visual","⚠ Tabla de roles incompleta — faltan AcrDelete y roles compuestos"],
    defectsFound:["type_drift","label_dup"],
  },
];

/* ─── Log de actividad inicial ───────────────────────────────────────────── */
const ACTION_LOG: UserActionLog[] = [
  { id:"log-001", actionType:"grounding_executed", pageId:"01", pageTitle:"Azure Container Registry: arquitectura y tiers", pageNumber:"01", userId:"u-1", userName:"Ana García", result:"Grounding verificado contra 3 fuentes Microsoft Learn", createdAt:"2026-05-04T09:00:00Z" },
  { id:"log-002", actionType:"generation_started", pageId:"01", pageTitle:"Azure Container Registry: arquitectura y tiers", pageNumber:"01", userId:"u-1", userName:"Ana García", result:"Run run-001 iniciado con GPT-4o", createdAt:"2026-05-05T10:30:00Z" },
  { id:"log-003", actionType:"generation_completed", pageId:"01", pageTitle:"Azure Container Registry: arquitectura y tiers", pageNumber:"01", userId:"u-1", userName:"Ana García", result:"v1 generada — 4.760 tokens", createdAt:"2026-05-05T10:32:45Z" },
  { id:"log-004", actionType:"qa_executed", pageId:"01", pageTitle:"Azure Container Registry: arquitectura y tiers", pageNumber:"01", userId:"u-2", userName:"Carlos Méndez", result:"QA 94/100 — aprobada", createdAt:"2026-05-18T12:00:00Z" },
  { id:"log-005", actionType:"page_approved", pageId:"01", pageTitle:"Azure Container Registry: arquitectura y tiers", pageNumber:"01", userId:"u-3", userName:"Laura Vidal", result:"Aprobada para exportación — Contrato v24 cumplido", createdAt:"2026-05-18T12:30:00Z" },
  { id:"log-006", actionType:"grounding_executed", pageId:"02", pageTitle:"Build y push de imágenes hacia ACR", pageNumber:"02", userId:"u-1", userName:"Ana García", result:"Grounding verificado contra 3 fuentes Microsoft Learn", createdAt:"2026-05-07T10:00:00Z" },
  { id:"log-007", actionType:"generation_started", pageId:"02", pageTitle:"Build y push de imágenes hacia ACR", pageNumber:"02", userId:"u-1", userName:"Ana García", result:"Run run-004 iniciado con GPT-4o", createdAt:"2026-05-08T09:15:00Z" },
  { id:"log-008", actionType:"page_approved", pageId:"02", pageTitle:"Build y push de imágenes hacia ACR", pageNumber:"02", userId:"u-3", userName:"Laura Vidal", result:"Aprobada con observación — varianza iconográfica menor", createdAt:"2026-05-19T17:30:00Z" },
  { id:"log-009", actionType:"qa_executed", pageId:"03", pageTitle:"Tags, digest SHA256 y trazabilidad", pageNumber:"03", userId:"u-2", userName:"Carlos Méndez", result:"QA 92/100 — requiere corrección: recorte en diagrama", createdAt:"2026-05-20T11:00:00Z" },
  { id:"log-010", actionType:"revision_requested", pageId:"03", pageTitle:"Tags, digest SHA256 y trazabilidad", pageNumber:"03", userId:"u-3", userName:"Laura Vidal", result:"Revisión solicitada — recortes y densidad de contexto", createdAt:"2026-05-20T11:30:00Z" },
  { id:"log-011", actionType:"qa_executed", pageId:"04", pageTitle:"Autenticación: tokens, service principals y managed identity", pageNumber:"04", userId:"u-2", userName:"Carlos Méndez", result:"QA 91/100 — requiere corrección: flujo RBAC confuso", createdAt:"2026-05-20T15:00:00Z" },
  { id:"log-012", actionType:"grounding_executed", pageId:"05", pageTitle:"Geo-replicación y alta disponibilidad", pageNumber:"05", userId:"u-1", userName:"Ana García", result:"Grounding verificado contra 3 fuentes", createdAt:"2026-05-20T09:00:00Z" },
  { id:"log-013", actionType:"generation_completed", pageId:"10", pageTitle:"Troubleshooting de acceso, permisos y versiones", pageNumber:"10", userId:"u-1", userName:"Ana García", result:"v1 generada — pendiente QA inicial", createdAt:"2026-05-22T09:32:20Z" },
];

/* ─── Contratos editoriales versionados ──────────────────────────────────── */
const CONTRACTS: ContractVersion[] = [
  {
    id:"contract-global",
    name:"CloudBooks Global Contract",
    version:"v2.1",
    scope:"Aplica a toda la colección CloudBooks — reglas globales que heredan todos los formatos",
    appliesTo:["Todos los formatos","Todos los proveedores cloud","Todos los niveles de certificación"],
    status:"active",
    lastUpdated:"2026-05-10",
    nonNegotiable:[
      "Toda infografía debe citarse con fuente Microsoft Learn o documentación oficial del proveedor",
      "El lenguaje debe ser consistente con la terminología del examen oficial",
      "Los scores QA no pueden bajarse artificialmente — registrar siempre el valor real",
      "No se admiten imágenes con copyright externo sin licencia CC0 o propia",
      "Cada página debe pasar QA score ≥ 90 antes de entrar a revisión editorial",
    ],
    flexible:[
      "El tono puede variar entre didáctico y técnico según el formato",
      "La densidad visual puede adaptarse al dominio del contenido",
      "La longitud del contexto puede ajustarse al nivel del concepto",
    ],
    stableComponents:[
      "Header con número de página, certificación y dominio",
      "Footer con fuente y versión del contrato",
      "Zona de Autocheck en posición inferior derecha",
    ],
    changelog:[
      { version:"v2.1", note:"Actualización de criterios de score QA mínimo — ahora 90 en lugar de 85", at:"2026-05-10", author:"Editorial Lead" },
      { version:"v2.0", note:"Incorporación de criterio de fuente obligatoria", at:"2026-04-15", author:"Editorial Lead" },
      { version:"v1.0", note:"Contrato inicial CloudBooks", at:"2026-03-01", author:"Editorial Lead" },
    ],
  },
  {
    id:"contract-azure",
    name:"Azure Editorial Contract",
    version:"v1.4",
    scope:"Aplica a todos los formatos bajo la línea Azure — nomenclatura, paleta y estándares Microsoft",
    appliesTo:["Azure AI-200","Azure AZ-900","Azure AI-900","Azure DP-900","Azure AZ-104","Azure AZ-305"],
    status:"active",
    lastUpdated:"2026-05-15",
    nonNegotiable:[
      "El color primario Azure es #0078d4 — no puede modificarse en elementos estructurales",
      "Los nombres de servicios deben usar la capitalización oficial de Microsoft (ej: Azure AI Services, no azure ai services)",
      "Los códigos de examen deben aparecer en el header de cada página en el formato oficial (AI-200, AZ-900)",
      "Los service tier names deben usar la capitalización oficial (Basic, Standard, Premium — no básico, estándar, premium)",
    ],
    flexible:[
      "Los iconos pueden ser de Fluent UI o equivalente con coherencia visual garantizada",
      "El orden de los dominios dentro de un batch puede ajustarse según flujo pedagógico",
      "Los diagramas de arquitectura pueden simplificarse manteniendo la precisión técnica",
    ],
    stableComponents:[
      "Badge de certificación en header (Azure · Associate / Fundamental / Expert)",
      "Color de dominio diferenciado por servicio Azure",
      "Tabla de tiers cuando el servicio tiene niveles de pricing",
    ],
    changelog:[
      { version:"v1.4", note:"Clarificación de reglas de capitalización para service tier names", at:"2026-05-15", author:"Ana García" },
      { version:"v1.3", note:"Incorporación de Fluent UI como alternativa de iconografía", at:"2026-05-01", author:"Laura Vidal" },
      { version:"v1.2", note:"Ajuste de reglas de color para diagramas multi-servicio", at:"2026-04-20", author:"Editorial Lead" },
      { version:"v1.1", note:"Primera revisión post-producción de páginas Azure", at:"2026-04-05", author:"Editorial Lead" },
      { version:"v1.0", note:"Contrato Azure inicial", at:"2026-03-15", author:"Editorial Lead" },
    ],
  },
  {
    id:"contract-ai200",
    name:"AI-200 Certification Contract",
    version:"v3.0",
    scope:"Estándares específicos para la colección de certificación Microsoft AI-200 (Azure AI Engineer Associate)",
    appliesTo:["Visual Atlas AI-200","Master Book AI-200","Exam Traps Guide AI-200","Question Bank AI-200"],
    status:"active",
    lastUpdated:"2026-05-18",
    nonNegotiable:[
      "Cada página debe cubrir exactamente un objetivo de examen — sin mezclar objetivos",
      "Las trampas de examen deben estar documentadas y ser técnicamente verificables",
      "El autocheck debe tener exactamente 4 opciones con una sola respuesta correcta",
      "La respuesta correcta del autocheck debe estar justificada en la explicación",
      "Los dominios deben seguir el skill outline oficial de AI-200 sin alterar proporciones",
    ],
    flexible:[
      "Los ejemplos de código pueden usar Python o C# según el contexto del servicio",
      "La profundidad del contexto puede ajustarse según la complejidad del concepto",
      "El orden de los conceptos clave puede reorganizarse para mejor comprensión",
    ],
    stableComponents:[
      "Sección Trampa de examen con borde de alerta visual",
      "Sección Autocheck con opciones A-B-C-D",
      "Zona de Conceptos clave en grid 2 columnas",
    ],
    changelog:[
      { version:"v3.0", note:"Actualización post-revisión curriculum AI-200 mayo 2026", at:"2026-05-18", author:"Carlos Méndez" },
      { version:"v2.1", note:"Incorporación de regla sobre justificación del autocheck", at:"2026-04-28", author:"Carlos Méndez" },
      { version:"v2.0", note:"Restructuración completa tras revisión del skill outline", at:"2026-04-10", author:"Editorial Lead" },
      { version:"v1.0", note:"Contrato AI-200 inicial", at:"2026-03-20", author:"Editorial Lead" },
    ],
  },
  {
    id:"contract-atlas",
    name:"Visual Atlas Contract v24",
    version:"v24",
    scope:"Contrato visual específico del formato Visual Atlas — reglas de composición, zona de autocheck y storytelling",
    appliesTo:["Visual Atlas AI-200","Batches 01–61"],
    status:"active",
    lastUpdated:"2026-05-20",
    nonNegotiable:[
      "Grid 8px — toda separación y tamaño de elemento debe ser múltiplo de 8",
      "Score QA mínimo para aprobación: 95/100",
      "Score Red Team objetivo antes de producción: ≥ 9.5/10",
      "Header con color de dominio — no puede ser blanco ni gris neutro",
      "Autocheck siempre en zona inferior derecha — posición fija del contrato",
      "Footer con número de página y versión del contrato — siempre visible",
      "Máximo 8 conceptos clave por página — no saturar la zona de conceptos",
    ],
    flexible:[
      "El diagrama principal puede tomar diferentes formas visuales según el concepto (flowchart, comparativa, arquitectura, timeline)",
      "El color de acento puede variar dentro de la paleta del dominio",
      "La proporción contexto/diagrama puede ajustarse según la densidad conceptual",
      "Los iconos pueden cambiarse si se mantiene coherencia visual dentro de la página",
    ],
    stableComponents:[
      "Header: color de dominio + título + número de página (posición: top)",
      "Conceptos clave: grid 2x4 máximo (posición: upper middle)",
      "Diagrama visual principal (posición: center flexible)",
      "Trampa de examen: borde visual de alerta (posición: lower left)",
      "Autocheck: 4 opciones + respuesta correcta (posición: lower right)",
      "Footer: fuente + versión contrato + num. página (posición: bottom)",
    ],
    changelog:[
      { version:"v24", note:"Reducción del máximo de conceptos clave de 10 a 8 — mejorar densidad", at:"2026-05-20", author:"Laura Vidal" },
      { version:"v23", note:"Fijación del score mínimo QA en 95 — antes era 90", at:"2026-05-12", author:"Laura Vidal" },
      { version:"v22", note:"Actualización de posición del Autocheck a lower right fija", at:"2026-04-30", author:"Ana García" },
      { version:"v21", note:"Incorporación de zona Trampa de examen como componente estable", at:"2026-04-15", author:"Editorial Lead" },
      { version:"v20", note:"Versión base del contrato Visual Atlas", at:"2026-03-25", author:"Editorial Lead" },
    ],
  },
];

/* ─── Export assets iniciales ────────────────────────────────────────────── */

/* ─── Seed inicial del store ─────────────────────────────────────────────── */
export function buildInitialState(): StudioState {
  return {
    pages: PAGES,
    runs: RUNS,
    qaReports: QA_REPORTS,
    actionLog: ACTION_LOG,
    contracts: CONTRACTS,
    exports: [],
  };
}
