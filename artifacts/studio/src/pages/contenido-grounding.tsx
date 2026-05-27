import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, CheckCircle2, AlertTriangle, Clock, HelpCircle,
  RefreshCw, BookOpen, Zap, Shield, FileText, Globe, Link2,
  Database, AlertCircle, Package, ExternalLink, Activity,
  BookMarked, Send, Search,
} from "lucide-react";

/* ─── Tipos locales ─────────────────────────────────────────────────────── */
type GroundingState = "grounded" | "needs_review" | "pending_sources" | "pending_grounding";
type SourceStatus   = "linked" | "pending_validation" | "needs_refresh";
type FormatId       = "master_book" | "visual_atlas" | "exam_traps" | "question_bank" | "cheat_sheets" | "rapid_review";

interface MsLearnSource {
  id: string; title: string; url: string; status: SourceStatus; relatedTopics: string[];
}

interface ContentTopic {
  id: string; num: string; title: string; domain: string;
  objetivo: string; contexto: string;
  conceptos: string[]; decisiones: string[]; trampas: string[];
  autocheck: { pregunta: string; opciones: string[]; respuesta: string; explicacion: string };
  formatos: FormatId[];
  sourceIds: string[];
}

interface EditorialGap {
  id: string; severity: "high" | "medium" | "low"; topicIds: string[]; description: string; action: string;
}

/* ─── Config estados grounding ──────────────────────────────────────────── */
const GS_CFG: Record<GroundingState, { label: string; badge: string; dot: string; icon: React.ComponentType<{className?:string}> }> = {
  grounded:          { label:"Grounded",          badge:"bg-emerald-500/15 text-emerald-300 border-emerald-500/25",  dot:"bg-emerald-400",  icon:CheckCircle2  },
  needs_review:      { label:"Necesita revisión", badge:"bg-amber-500/15 text-amber-300 border-amber-500/25",        dot:"bg-amber-400",    icon:AlertTriangle },
  pending_sources:   { label:"Fuentes pendientes",badge:"bg-blue-500/15 text-blue-300 border-blue-500/25",           dot:"bg-blue-400",     icon:Clock         },
  pending_grounding: { label:"Sin grounding",     badge:"bg-white/[0.05] text-white/25 border-white/10",             dot:"bg-white/20",     icon:HelpCircle    },
};

const SS_CFG: Record<SourceStatus, { label: string; badge: string; dot: string }> = {
  linked:             { label:"Vinculada",          badge:"bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  dot:"bg-emerald-400" },
  pending_validation: { label:"Pendiente",          badge:"bg-blue-500/10 text-blue-400 border-blue-500/20",           dot:"bg-blue-400"    },
  needs_refresh:      { label:"Requiere revisión",  badge:"bg-amber-500/10 text-amber-400 border-amber-500/20",        dot:"bg-amber-400"   },
};

const FORMAT_CFG: Record<FormatId, { label: string; icon: React.ComponentType<{className?:string}>; color: string; desc: string; fields: string[] }> = {
  master_book:  { label:"Master Book",        icon:BookOpen,   color:"text-indigo-400",  desc:"Libro completo AI-200",       fields:["contexto_técnico","conceptos","decisiones","fuentes"] },
  visual_atlas: { label:"Visual Atlas",       icon:FileText,   color:"text-blue-400",    desc:"Infografías por página",      fields:["conceptos","diagramas","trampas","autocheck"] },
  exam_traps:   { label:"Exam Traps Guide",   icon:Shield,     color:"text-red-400",     desc:"Guía de trampas de examen",   fields:["trampas","distractores","señales","excepciones"] },
  question_bank:{ label:"Question Bank",      icon:HelpCircle, color:"text-violet-400",  desc:"Banco de preguntas",          fields:["objetivos","escenarios","distractores","explicaciones"] },
  cheat_sheets: { label:"Cheat Sheets",       icon:Package,    color:"text-teal-400",    desc:"Hojas de referencia rápida",  fields:["límites","comandos","diferencias","tablas_decisión"] },
  rapid_review: { label:"Rapid Review Pack",  icon:Zap,        color:"text-amber-400",   desc:"Revisión rápida final",       fields:["síntesis","preguntas_críticas","checklist"] },
};

/* ─── Fuentes MS Learn ──────────────────────────────────────────────────── */
const MS_SOURCES: MsLearnSource[] = [
  { id:"s1", title:"Azure Container Registry documentation", url:"learn.microsoft.com/azure/container-registry/", status:"linked", relatedTopics:["01","02","03","04","05","06","07","08","09","10"] },
  { id:"s2", title:"ACR authentication and authorization",   url:"learn.microsoft.com/azure/container-registry/container-registry-authentication", status:"linked", relatedTopics:["07","09"] },
  { id:"s3", title:"ACR repository and image concepts",      url:"learn.microsoft.com/azure/container-registry/container-registry-concepts", status:"linked", relatedTopics:["01","02","03"] },
  { id:"s4", title:"ACR geo-replication",                    url:"learn.microsoft.com/azure/container-registry/container-registry-geo-replication", status:"linked", relatedTopics:["06"] },
  { id:"s5", title:"ACR private endpoint configuration",     url:"learn.microsoft.com/azure/container-registry/container-registry-private-link", status:"needs_refresh", relatedTopics:["04"] },
  { id:"s6", title:"Container Apps with private registry",   url:"learn.microsoft.com/azure/container-apps/containers", status:"pending_validation", relatedTopics:["08"] },
  { id:"s7", title:"AKS pull images from ACR",               url:"learn.microsoft.com/azure/aks/cluster-container-registry-integration", status:"pending_validation", relatedTopics:["07","09"] },
];

/* ─── Gaps editoriales ──────────────────────────────────────────────────── */
const INITIAL_GAPS: EditorialGap[] = [
  { id:"g1", severity:"high",   topicIds:["08","09","10"], description:"Fuentes no validadas para páginas 08-10. Se requiere confirmación de las URLs de Microsoft Learn antes de aprobar el grounding.", action:"Validar fuentes" },
  { id:"g2", severity:"medium", topicIds:["05","06"],      description:"Faltan límites exactos y comandos CLI para los temas de retention policy y geo-replicación. Necesarios para Cheat Sheets y Question Bank.", action:"Completar contenido" },
  { id:"g3", severity:"medium", topicIds:["03","04"],      description:"Algunos autochecks requieren distractores más fuertes — actualmente las opciones incorrectas son demasiado evidentes para el nivel AI-200.", action:"Revisar autochecks" },
  { id:"g4", severity:"low",    topicIds:["01","02","03","04","05"], description:"Las trampas de examen necesitan separación explícita entre la regla del examen y su explicación pedagógica para el Exam Traps Guide.", action:"Reformatear trampas" },
];

/* ─── Temas de contenido ────────────────────────────────────────────────── */
const TOPICS: ContentTopic[] = [
  {
    id:"01", num:"01", title:"ACR: arquitectura y tiers",
    domain:"Azure Container Registry", objetivo:"Identificar el tier correcto de ACR para escenarios con geo-replicación, red aislada y alta disponibilidad.",
    contexto:"Azure Container Registry (ACR) es un servicio gestionado para almacenar y gestionar imágenes de contenedores y artefactos OCI. Ofrece tres tiers: Basic (desarrollo/exploración), Standard (producción general) y Premium (enterprise con geo-replicación, private endpoint y zone redundancy).",
    conceptos:["registry","repository","image tag","digest SHA256","tier Basic","tier Standard","tier Premium","OCI artifact","content trust","quarantine policy"],
    decisiones:["Usar tier Premium cuando se requiere geo-replicación o private endpoint","Basic no es suficiente para escenarios enterprise","Standard carece de zone redundancy y private link"],
    trampas:["latest es mutable — no garantiza reproducibilidad; usar digest SHA256","Geo-replicación solo en tier Premium, no en Standard","Private endpoint requiere Premium","Basic es para exploración, no para CI/CD productivo"],
    autocheck:{ pregunta:"Una empresa necesita imágenes en múltiples regiones con acceso privado. ¿Qué tier?", opciones:["A. Basic","B. Standard","C. Premium","D. Cualquier tier con VNet"], respuesta:"C", explicacion:"Premium incluye geo-replicación multi-región y soporte de private endpoint — requisitos que no cumple Basic ni Standard." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets","rapid_review"],
    sourceIds:["s1","s3"],
  },
  {
    id:"02", num:"02", title:"Build y push hacia ACR",
    domain:"Azure Container Registry", objetivo:"Configurar pipelines de build y push de imágenes hacia ACR usando az acr build, Docker CLI y ACR Tasks.",
    contexto:"ACR Tasks permite automatizar la compilación y push de imágenes directamente desde el servidor de ACR, sin necesidad de un agente de build local. Acepta Dockerfile, contextos remotos y puede dispararse por webhooks o triggers de base image.",
    conceptos:["az acr build","docker push","ACR Tasks","base image trigger","multi-step task","build context","platform override","task run","OCI index","buildpack"],
    decisiones:["az acr build vs docker build+push: preferir az acr build en pipelines cloud-native","ACR Tasks para builds serverless sin infraestructura de build","Usar --no-push para validar antes de publicar"],
    trampas:["az acr build necesita acceso de administrador o token con permisos de escritura","Un task multi-step no garantiza transaccionalidad entre steps","Base image triggers requieren que la imagen base también esté en ACR"],
    autocheck:{ pregunta:"¿Cuál es la forma recomendada de hacer build+push sin agente de CI local?", opciones:["A. docker build && docker push","B. az acr build","C. kubectl apply","D. az container create"], respuesta:"B", explicacion:"az acr build ejecuta el build directamente en ACR Tasks, eliminando la necesidad de Docker instalado localmente o agentes de CI/CD." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s1","s3"],
  },
  {
    id:"03", num:"03", title:"Tags, digest SHA256 y trazabilidad",
    domain:"Azure Container Registry", objetivo:"Gestionar la inmutabilidad de imágenes mediante digest SHA256 y content trust para garantizar trazabilidad en producción.",
    contexto:"Un tag en ACR es una referencia mutable que puede apuntar a diferentes manifests a lo largo del tiempo. El digest SHA256 es el identificador inmutable de un manifest. Content Trust permite firmar imágenes y verificar su integridad criptográfica antes del despliegue.",
    conceptos:["tag mutable","digest SHA256","content trust","manifest","OCI Index","image signing","Notary v2","quarantine policy","cosign","SBOM"],
    decisiones:["Usar digest en lugar de tag en pipelines de producción","Habilitar content trust en registros de producción","Quarantine policy bloquea pull hasta validación de seguridad"],
    trampas:["Referenciar una imagen por tag:latest no garantiza la misma versión entre deployments","Content trust está disponible solo en tier Standard y Premium","Un digest solo cambia cuando cambia el contenido del layer"],
    autocheck:{ pregunta:"¿Qué identificador garantiza inmutabilidad de una imagen en ACR?", opciones:["A. Tag","B. Repository name","C. Digest SHA256","D. Registry hostname"], respuesta:"C", explicacion:"El digest SHA256 es el hash del manifest y es inmutable. Un tag como 'latest' puede reasignarse a otro manifest en cualquier momento." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s1","s3"],
  },
  {
    id:"04", num:"04", title:"Private Endpoint, firewall y DNS",
    domain:"Azure Container Registry", objetivo:"Configurar acceso privado a ACR usando private endpoint, network rules y private DNS zone para aislar el registro de la red pública.",
    contexto:"ACR Private Endpoint permite exponer el registro dentro de una VNet con una IP privada, bloqueando el acceso público. Requiere tier Premium. La configuración correcta de la Private DNS Zone es crítica para que los clientes internos resuelvan el nombre del registry correctamente.",
    conceptos:["private endpoint","private DNS zone","network rules","service endpoint","firewall allowlist","VNet injection","IP restriction","trusted services","disable public access","DNS resolution"],
    decisiones:["Private endpoint requiere Premium — no disponible en Basic/Standard","Service endpoint no proporciona el mismo nivel de aislamiento que private endpoint","Sin Private DNS Zone correctamente configurada, las consultas DNS no resuelven a la IP privada"],
    trampas:["Deshabilitar el acceso público sin configurar Private DNS rompe la resolución desde dentro de la VNet","Los trusted services (ACR Tasks, AKS) pueden omitir las network rules si se habilita explícitamente","Service endpoint no bloquea el acceso público"],
    autocheck:{ pregunta:"¿Qué se necesita para que un cliente VNet resuelva el hostname de ACR a una IP privada?", opciones:["A. NSG rule","B. Private DNS Zone integrada","C. VNet peering","D. ExpressRoute"], respuesta:"B", explicacion:"La Private DNS Zone (privatelink.azurecr.io) registra el hostname del registro con la IP del private endpoint, permitiendo la resolución interna." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s1","s5"],
  },
  {
    id:"05", num:"05", title:"Retention policy y limpieza",
    domain:"Azure Container Registry", objetivo:"Implementar políticas de retención y purga para controlar el crecimiento del almacenamiento en ACR.",
    contexto:"ACR acumula manifests y layers sin etiquetar a medida que se ejecutan builds. La retention policy elimina automáticamente manifests sin tag después de N días. El comando az acr purge permite eliminar tags e imágenes según criterios de antigüedad o patrón.",
    conceptos:["retention policy","untagged manifest","dangling layer","az acr purge","garbage collection","manifest list","tag expiry","ACR Task schedule","storage cost","policy scope"],
    decisiones:["Retention policy solo aplica a manifests sin tag — no elimina imágenes con tag activo","az acr purge puede ejecutarse en un ACR Task con cron para limpieza automática","Garbage collection se ejecuta automáticamente pero no garantiza inmediatez"],
    trampas:["Retention policy no aplica a imágenes que tienen al menos un tag","az acr purge con --dry-run no hace cambios — útil para preview","La purga de layers ocurre en garbage collection, no en el momento del delete de manifest"],
    autocheck:{ pregunta:"¿Qué eliminará retention policy si está configurada en 30 días?", opciones:["A. Todas las imágenes mayores de 30 días","B. Manifests sin tag con más de 30 días","C. Tags expirados","D. Layers duplicados"], respuesta:"B", explicacion:"Retention policy elimina manifests sin etiquetar (untagged) después del período configurado. Las imágenes con al menos un tag activo no son afectadas." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s1"],
  },
  {
    id:"06", num:"06", title:"Geo-replicación y zone redundancy",
    domain:"Azure Container Registry", objetivo:"Configurar geo-replicación y zone redundancy en ACR Premium para alta disponibilidad y baja latencia multi-región.",
    contexto:"La geo-replicación en ACR Premium replica el contenido del registro en múltiples regiones de Azure, permitiendo push y pull desde la región más cercana. Zone redundancy distribuye la infraestructura del registro entre availability zones de una región.",
    conceptos:["geo-replication","zone redundancy","replica region","home region","push routing","pull routing","replication webhook","active-active","availability zones","RPO/RTO"],
    decisiones:["Geo-replicación requiere tier Premium","Zone redundancy solo disponible en regiones con availability zones","El tráfico de pull se enruta automáticamente a la réplica más cercana"],
    trampas:["Solo Premium soporta geo-replicación","Zone redundancy y geo-replicación son características independientes","Un push a la región home se propaga asíncronamente a réplicas — puede haber lag"],
    autocheck:{ pregunta:"¿Cómo minimiza ACR la latencia de pull desde múltiples regiones?", opciones:["A. CDN automático","B. Geo-replicación con enrutamiento regional","C. ExpressRoute","D. VNet peering entre regiones"], respuesta:"B", explicacion:"La geo-replicación coloca réplicas del registry en múltiples regiones y Azure enruta automáticamente el pull a la réplica más cercana al cliente." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets","rapid_review"],
    sourceIds:["s1","s4"],
  },
  {
    id:"07", num:"07", title:"Managed Identity y pull seguro",
    domain:"Azure Container Registry", objetivo:"Autenticar cargas de trabajo Azure (AKS, Container Apps, VMs) contra ACR usando managed identity sin credenciales almacenadas.",
    contexto:"Managed Identity permite que recursos Azure obtengan tokens de Azure AD para autenticarse contra ACR sin necesidad de service principals con contraseñas. AKS puede hacer attach directo a ACR con az aks update --attach-acr, configurando automáticamente el role assignment.",
    conceptos:["managed identity","system-assigned identity","user-assigned identity","ACR pull role","az aks update --attach-acr","workload identity","service principal","RBAC assignment","imagePullSecrets vs MSI","token scope"],
    decisiones:["Preferir managed identity sobre service principal para workloads Azure","az aks update --attach-acr es el método más simple para AKS","imagePullSecrets requiere rotación manual de credenciales — evitar en producción"],
    trampas:["Managed identity requiere que el recurso tenga asignado el rol AcrPull en el scope del registry","az aks update --attach-acr no funciona si el cluster no tiene managed identity habilitada","Un service principal expirado rompe todos los pulls del cluster — riesgo operativo crítico"],
    autocheck:{ pregunta:"¿Cuál es el método recomendado para que AKS haga pull de imágenes desde ACR sin credenciales?", opciones:["A. imagePullSecrets con admin password","B. Managed Identity con AcrPull role","C. Service principal con clave estática","D. ACR admin account"], respuesta:"B", explicacion:"Managed Identity elimina la necesidad de gestionar credenciales. AKS puede obtener tokens de Azure AD automáticamente si tiene el rol AcrPull asignado en el registry." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s2","s7"],
  },
  {
    id:"08", num:"08", title:"Container Apps con imágenes privadas",
    domain:"Azure Container Registry", objetivo:"Configurar Azure Container Apps para usar imágenes almacenadas en ACR privado, con autenticación segura.",
    contexto:"Container Apps puede hacer pull de imágenes desde ACR usando managed identity o credenciales de registry. La configuración se realiza en el momento del create o update del container app, especificando el servidor, usuario y secreto del registry.",
    conceptos:["container app registry config","managed identity pull","registry credentials","az containerapp create","--registry-server","--registry-identity","imagePullPolicy","private registry","secrets","revision management"],
    decisiones:["Usar managed identity cuando Container Apps y ACR están en el mismo tenant","Las credenciales de registry se almacenan como secrets en Container Apps","Cambiar la imagen requiere una nueva revisión del container app"],
    trampas:["Sin la managed identity asignada al container app environment, el pull fallará aunque el rol esté asignado","Las credenciales de registry no se rotan automáticamente si se usan secretos estáticos","Container Apps no soporta imagePullSecrets de Kubernetes — usa su propio mecanismo"],
    autocheck:{ pregunta:"¿Cómo configura Container Apps para pull desde ACR sin credenciales estáticas?", opciones:["A. Usando imagePullSecrets","B. Managed identity con AcrPull en el registry","C. Admin account de ACR","D. VNet peering con ACR"], respuesta:"B", explicacion:"Container Apps puede usar managed identity asignada al environment para obtener tokens de Azure AD y hacer pull sin credenciales almacenadas." },
    formatos:["master_book","visual_atlas","exam_traps","question_bank"],
    sourceIds:["s6"],
  },
  {
    id:"09", num:"09", title:"CI/CD hacia ACR",
    domain:"Azure Container Registry", objetivo:"Implementar pipelines CI/CD que construyan y publiquen imágenes hacia ACR usando GitHub Actions, Azure DevOps o ACR Tasks.",
    contexto:"Los pipelines CI/CD modernos para ACR usan service principals, managed identity de workload o tokens de repositorio para autenticarse. GitHub Actions tiene acción oficial 'azure/acr-build' y puede usar OIDC para federación de identidad sin secretos estáticos.",
    conceptos:["GitHub Actions","Azure DevOps","OIDC federation","workload identity federation","service principal CI","acr-build action","az acr login","docker/login-action","--image-name","pipeline trigger"],
    decisiones:["OIDC federation elimina la necesidad de service principal secrets en GitHub Actions","ACR Tasks puede integrarse como alternativa serverless al pipeline CI/CD","El scope del service principal debe ser mínimo — solo AcrPush en el registry específico"],
    trampas:["Un service principal con Client Secret expirado rompe todo el pipeline","OIDC federation requiere configuración de trust en el registro de apps de Azure AD","Las imágenes pusheadas sin tag de versión explícita no son trazables en producción"],
    autocheck:{ pregunta:"¿Qué mecanismo elimina la necesidad de secrets estáticos en GitHub Actions para push a ACR?", opciones:["A. Personal Access Token","B. OIDC federation con Workload Identity","C. Admin password de ACR","D. SSH key rotation"], respuesta:"B", explicacion:"OIDC federation permite a GitHub Actions obtener tokens de Azure AD directamente sin almacenar client secrets, usando una relación de confianza configurada entre GitHub y Azure." },
    formatos:["master_book","exam_traps","question_bank","cheat_sheets"],
    sourceIds:["s2","s7"],
  },
  {
    id:"10", num:"10", title:"Troubleshooting de acceso y versiones",
    domain:"Azure Container Registry", objetivo:"Diagnosticar y resolver errores comunes de acceso, autenticación y resolución de imágenes en ACR.",
    contexto:"Los errores más frecuentes en ACR incluyen: unauthorized (falta de permisos), name resolution failures (DNS mal configurado), not found (tag o digest incorrecto), y rate limiting. El diagnóstico efectivo requiere entender el flujo de autenticación y el modelo de permisos.",
    conceptos:["unauthorized error","403 Forbidden","name resolution","pull rate limit","token expiry","ACR diagnostics","az acr check-health","repository scope","admin account risks","audit log"],
    decisiones:["az acr check-health es la herramienta de diagnóstico integrada","El admin account debe estar deshabilitado en producción — es una señal de riesgo de seguridad","Los rate limits de pull aplican por IP — usar authenticated pull para evitarlos"],
    trampas:["Unauthorized puede significar falta de rol O token expirado — verificar ambos","Un digest incorrecto da not found aunque el tag exista","Deshabilitar admin account puede romper pipelines legacy que lo usen como credencial"],
    autocheck:{ pregunta:"¿Qué herramienta integrada permite diagnosticar la salud de la conexión con ACR?", opciones:["A. az acr list","B. az acr check-health","C. docker inspect","D. kubectl describe"], respuesta:"B", explicacion:"az acr check-health valida la conectividad, autenticación, DNS y compatibilidad de versiones entre el cliente y el registry, devolviendo un diagnóstico detallado." },
    formatos:["master_book","exam_traps","question_bank","rapid_review"],
    sourceIds:["s1","s2"],
  },
];

/* ─── Estado inicial de grounding ────────────────────────────────────────── */
const INITIAL_GROUNDING: Record<string, GroundingState> = {
  "01":"grounded","02":"grounded","03":"grounded","04":"grounded","05":"grounded",
  "06":"needs_review","07":"needs_review","08":"pending_sources","09":"pending_sources","10":"pending_grounding",
};

/* ─── Componente principal ──────────────────────────────────────────────── */
export default function ContenidoGrounding() {
  const [, setLocation]      = useLocation();
  const { toast }            = useToast();
  const [groundingStates, setGroundingStates] = useState<Record<string, GroundingState>>(INITIAL_GROUNDING);
  const [sourceStatuses, setSourceStatuses]   = useState<Record<string, SourceStatus>>(
    Object.fromEntries(MS_SOURCES.map(s => [s.id, s.status]))
  );
  const [gaps, setGaps]           = useState<EditorialGap[]>(INITIAL_GAPS);
  const [selectedId, setSelectedId] = useState<string>("01");
  const [detailTab, setDetailTab]   = useState<"contenido"|"fuentes"|"cobertura">("contenido");
  const [lastSync, setLastSync]     = useState<string | null>(null);
  const [syncing, setSyncing]       = useState(false);
  const [bottomTab, setBottomTab]   = useState<"matriz"|"brechas">("matriz");
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState("01-10");

  const selected = TOPICS.find(t => t.id === selectedId)!;

  /* ── Contadores ── */
  const counts = {
    grounded:          Object.values(groundingStates).filter(s => s === "grounded").length,
    needs_review:      Object.values(groundingStates).filter(s => s === "needs_review").length,
    pending_sources:   Object.values(groundingStates).filter(s => s === "pending_sources").length,
    pending_grounding: Object.values(groundingStates).filter(s => s === "pending_grounding").length,
  };

  /* ── Acciones simuladas ── */
  function syncSheet() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setLastSync(new Date().toISOString());
      toast({ title:"Sincronización completada", description:"10 temas detectados · Google Sheet AI-200 · Batch 01-10" });
    }, 2000);
  }

  function runGrounding(topicId: string) {
    const current = groundingStates[topicId];
    const next: GroundingState = current === "pending_grounding" ? "pending_sources"
      : current === "pending_sources" ? "needs_review" : "needs_review";
    setGroundingStates(prev => ({ ...prev, [topicId]: next }));
    const topic = TOPICS.find(t => t.id === topicId)!;
    toast({ title:`Grounding ejecutado — pág. ${topicId}`, description:`${topic.title} · Estado: ${GS_CFG[next].label}` });
  }

  function validateSources(topicId: string) {
    const topic = TOPICS.find(t => t.id === topicId)!;
    const updated: Record<string, SourceStatus> = { ...sourceStatuses };
    topic.sourceIds.forEach(sid => {
      if (updated[sid] === "pending_validation") updated[sid] = "linked";
      else if (updated[sid] === "needs_refresh") updated[sid] = "linked";
    });
    setSourceStatuses(updated);
    toast({ title:"Fuentes validadas", description:`${topic.title} · ${topic.sourceIds.length} fuentes verificadas` });
  }

  function markGrounded(topicId: string) {
    setGroundingStates(prev => ({ ...prev, [topicId]: "grounded" }));
    const topic = TOPICS.find(t => t.id === topicId)!;
    toast({ title:"Marcado como grounded", description:topic.title });
  }

  function sendToFormat(topicId: string, formatId: FormatId) {
    const topic = TOPICS.find(t => t.id === topicId)!;
    const fmt = FORMAT_CFG[formatId];
    toast({ title:`Enviado a ${fmt.label}`, description:`${topic.title} · Contenido disponible para producción` });
  }

  function detectGaps() {
    const updatedGaps = gaps.map(g => ({ ...g, description: g.description }));
    setGaps(updatedGaps);
    toast({ title:"Análisis de brechas actualizado", description:`${gaps.length} brechas detectadas · ${new Date().toLocaleTimeString("es-ES")}` });
  }

  const gs = groundingStates[selectedId] || "pending_grounding";
  const GsCfg = GS_CFG[gs];
  const GsIcon = GsCfg.icon;

  return (
    <Layout title="Base editorial AI-200 — Contenido y Grounding">
      <div className="h-full bg-[#0a1220] overflow-y-auto">

        {/* ── Header con breadcrumb ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 shrink-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[8px] text-white/25 mb-3">
            {["Biblioteca editorial","Azure","AI-200","Contenido y Grounding"].map((crumb, i, arr) => (
              <span key={crumb} className="flex items-center gap-1.5">
                <span className={i === arr.length-1 ? "text-white/60 font-semibold" : ""}>{crumb}</span>
                {i < arr.length-1 && <ChevronRight className="w-2.5 h-2.5 text-white/15" />}
              </span>
            ))}
          </div>

          <div className="flex items-start gap-4">
            {/* Source sync card */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.07] rounded-sm">
                  <Database className="w-3 h-3 text-blue-400" />
                  <div>
                    <p className="text-[8px] font-bold text-white/50">Fuente base</p>
                    <p className="text-[9px] text-blue-400/80 font-semibold">Google Sheet / CSV · AI-200 Batch 01-10</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] border border-white/[0.07] rounded-sm">
                  <Package className="w-3 h-3 text-teal-400" />
                  <div>
                    <p className="text-[8px] font-bold text-white/50">Batch activo</p>
                    <select
                      value={selectedBatch}
                      onChange={(event) => setSelectedBatch(event.target.value)}
                      className="bg-transparent text-[9px] text-teal-300/80 font-semibold outline-none"
                    >
                      <option value="01-10" className="bg-[#0d1629] text-white">AI-200 Batch 01-10</option>
                      <option value="11-20" className="bg-[#0d1629] text-white" disabled>AI-200 Batch 11-20 - planificado</option>
                      <option value="21-30" className="bg-[#0d1629] text-white" disabled>AI-200 Batch 21-30 - planificado</option>
                    </select>
                  </div>
                </label>
                <div className="flex items-center gap-1.5 text-[8px] text-white/25">
                  <span>10 temas detectados</span>
                  <span>·</span>
                  <span>7 fuentes MS Learn vinculadas</span>
                  <span>·</span>
                  <span className={lastSync ? "text-emerald-400/60" : "text-white/20"}>
                    {lastSync ? `Última sync: ${new Date(lastSync).toLocaleTimeString("es-ES")}` : "Sin sincronizar desde sesión"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={syncSheet} disabled={syncing}
                  className="flex items-center gap-1.5 h-7 px-3 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 rounded-sm text-[9px] text-blue-400 font-semibold transition-all disabled:opacity-50">
                  <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                  {syncing ? "Sincronizando..." : "Sincronizar Sheet/CSV"}
                </button>
                <button onClick={() => { TOPICS.forEach(t => runGrounding(t.id)); }}
                  className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[9px] text-white/50 font-semibold transition-all">
                  <Zap className="w-3 h-3" />Ejecutar grounding (todos)
                </button>
                <button onClick={() => { MS_SOURCES.forEach(s => { if (s.status !== "linked") setSourceStatuses(prev => ({ ...prev, [s.id]: "linked" })); }); toast({title:"Fuentes validadas", description:"7 fuentes Microsoft Learn verificadas"}); }}
                  className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[9px] text-white/50 font-semibold transition-all">
                  <Shield className="w-3 h-3" />Validar todas las fuentes
                </button>
                <button onClick={detectGaps}
                  className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[9px] text-white/50 font-semibold transition-all">
                  <Search className="w-3 h-3" />Detectar brechas
                </button>
              </div>
            </div>

            {/* Stats grid */}
            <div className="flex items-center gap-2 shrink-0">
              {([
                ["grounded",          counts.grounded,          "text-emerald-400", "Grounded"],
                ["needs_review",      counts.needs_review,      "text-amber-400",   "En revisión"],
                ["pending_sources",   counts.pending_sources,   "text-blue-400",    "Fuentes pend."],
                ["pending_grounding", counts.pending_grounding, "text-white/25",    "Sin grounding"],
              ] as const).map(([key, val, color, label]) => (
                <div key={key} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2 text-center min-w-[56px]">
                  <p className={cn("text-xl font-black tabular-nums leading-none", color)}>{val}</p>
                  <p className="text-[7px] text-white/20 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main split layout ── */}
        <div className="grid grid-cols-[240px_minmax(0,1fr)] min-h-[560px]">

          {/* ── Left: topics list ── */}
          <aside className="bg-[#0d1629] border-r border-white/[0.06] flex flex-col min-h-[560px]">
            <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Temas · Batch 01-10</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {TOPICS.map(topic => {
                const gs_ = groundingStates[topic.id] || "pending_grounding";
                const cfg_ = GS_CFG[gs_];
                const Ic = cfg_.icon;
                const isSelected = selectedId === topic.id;
                return (
                  <button key={topic.id} onClick={() => setSelectedId(topic.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 border-b border-white/[0.04] transition-all",
                      isSelected ? "bg-blue-500/10 border-l-2 border-l-blue-500/50 pl-[14px]" : "hover:bg-white/[0.03]"
                    )}>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-white/20 tabular-nums w-4 shrink-0">
                        {topic.num}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-[9px] font-semibold truncate", isSelected ? "text-white/80" : "text-white/50")}>{topic.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Ic className={cn("w-2.5 h-2.5 shrink-0", isSelected ? cfg_.dot.replace("bg-","text-") : "text-white/15")} />
                          <span className={cn("text-[7px]", isSelected ? "text-white/40" : "text-white/20")}>{cfg_.label}</span>
                        </div>
                      </div>
                      <span className={cn("w-2 h-2 rounded-full shrink-0", cfg_.dot)} />
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Right: topic detail ── */}
          <div className="min-w-0 flex flex-col">

            {/* Detail header */}
            <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[8px] font-black text-white/20 tabular-nums">#{selected.num}</span>
                    <span className="text-[8px] text-white/20">{selected.domain}</span>
                    <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", GsCfg.badge)}>
                      <span className={cn("w-1 h-1 rounded-full", GsCfg.dot)} />
                      {GsCfg.label}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white/80 mb-1">{selected.title}</p>
                  <p className="text-[9px] text-white/35 leading-relaxed max-w-2xl">{selected.objetivo}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  <button onClick={() => runGrounding(selected.id)}
                    className="flex items-center gap-1 h-6 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
                    <Zap className="w-2.5 h-2.5" />Grounding
                  </button>
                  <button onClick={() => validateSources(selected.id)}
                    className="flex items-center gap-1 h-6 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                    <Shield className="w-2.5 h-2.5" />Validar fuentes
                  </button>
                  <button onClick={() => markGrounded(selected.id)} disabled={gs === "grounded"}
                    className="flex items-center gap-1 h-6 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-sm text-[8px] text-emerald-400 font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                    <CheckCircle2 className="w-2.5 h-2.5" />Marcar grounded
                  </button>
                  <button onClick={() => sendToFormat(selected.id, "visual_atlas")}
                    className="flex items-center gap-1 h-6 px-2.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-sm text-[8px] text-violet-400 font-semibold transition-all">
                    <Send className="w-2.5 h-2.5" />Enviar a formato
                  </button>
                </div>
              </div>

              {/* Detail tabs */}
              <div className="flex gap-0.5 mt-3">
                {([["contenido","Contenido editorial",BookOpen],["fuentes","Fuentes MS Learn",Globe],["cobertura","Cobertura formatos",Activity]] as const).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setDetailTab(id)}
                    className={cn(
                      "flex items-center gap-1.5 h-7 px-3 rounded-sm text-[9px] font-semibold transition-all",
                      detailTab === id ? "bg-white/[0.08] text-white/75" : "text-white/30 hover:text-white/55"
                    )}>
                    <Icon className="w-3 h-3" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail content */}
            <div className="p-5">

              {/* ── Tab: Contenido editorial ── */}
              {detailTab === "contenido" && (
                <div className="space-y-4 max-w-2xl">
                  {/* Contexto */}
                  <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Contexto técnico</p>
                    <p className="text-[10px] text-white/65 leading-relaxed">{selected.contexto}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Conceptos */}
                    <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Conceptos clave</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.conceptos.map(c => (
                          <span key={c} className="text-[8px] bg-blue-500/10 border border-blue-500/20 text-blue-300/70 px-1.5 py-0.5 rounded-sm">{c}</span>
                        ))}
                      </div>
                    </div>

                    {/* Decisiones */}
                    <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Decisiones técnicas</p>
                      <ul className="space-y-1.5">
                        {selected.decisiones.map(d => (
                          <li key={d} className="flex items-start gap-2">
                            <ChevronRight className="w-2.5 h-2.5 text-teal-400/50 mt-0.5 shrink-0" />
                            <span className="text-[9px] text-white/55 leading-relaxed">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Trampas */}
                  <div className="bg-[#0d1629] border border-amber-500/15 rounded-sm p-3">
                    <p className="text-[8px] font-bold text-amber-400/60 uppercase tracking-widest mb-2">Trampas de examen</p>
                    <ul className="space-y-1.5">
                      {selected.trampas.map(t => (
                        <li key={t} className="flex items-start gap-2">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400/50 mt-0.5 shrink-0" />
                          <span className="text-[9px] text-white/55 leading-relaxed">{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Autocheck */}
                  <div className="bg-[#0d1629] border border-violet-500/15 rounded-sm p-3">
                    <p className="text-[8px] font-bold text-violet-400/50 uppercase tracking-widest mb-2">Autocheck base</p>
                    <p className="text-[10px] text-white/70 font-semibold mb-2">{selected.autocheck.pregunta}</p>
                    <div className="grid grid-cols-2 gap-1 mb-2">
                      {selected.autocheck.opciones.map(o => (
                        <div key={o} className={cn(
                          "text-[8px] px-2 py-1 rounded-sm border",
                          o.startsWith(selected.autocheck.respuesta)
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300/80 font-semibold"
                            : "bg-white/[0.02] border-white/[0.06] text-white/35"
                        )}>{o}</div>
                      ))}
                    </div>
                    <p className="text-[8px] text-white/35 leading-relaxed border-t border-white/[0.05] pt-2">{selected.autocheck.explicacion}</p>
                  </div>
                </div>
              )}

              {/* ── Tab: Fuentes MS Learn ── */}
              {detailTab === "fuentes" && (
                <div className="space-y-3 max-w-2xl">
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-3">Fuentes Microsoft Learn vinculadas — pág. {selected.num}</p>
                  {MS_SOURCES.filter(s => selected.sourceIds.includes(s.id)).map(src => {
                    const status = sourceStatuses[src.id];
                    const sc = SS_CFG[status];
                    return (
                      <div key={src.id} className={cn(
                        "flex items-center gap-3 px-4 py-3 border rounded-sm",
                        status === "linked" ? "bg-emerald-500/5 border-emerald-500/15" :
                        status === "needs_refresh" ? "bg-amber-500/5 border-amber-500/15" :
                        "bg-white/[0.02] border-white/[0.06]"
                      )}>
                        <Globe className={cn("w-4 h-4 shrink-0", status === "linked" ? "text-emerald-400" : status === "needs_refresh" ? "text-amber-400" : "text-blue-400")} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-semibold text-white/70 mb-0.5">{src.title}</p>
                          <p className="text-[8px] font-mono text-white/25 truncate">{src.url}</p>
                        </div>
                        <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border shrink-0", sc.badge)}>
                          <span className={cn("w-1 h-1 rounded-full", sc.dot)} />{sc.label}
                        </span>
                        <button onClick={() => validateSources(selected.id)}
                          className="shrink-0 flex items-center gap-1 h-5 px-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[7px] text-white/30 transition-all">
                          <ExternalLink className="w-2 h-2" />Validar
                        </button>
                      </div>
                    );
                  })}
                  {selected.sourceIds.length === 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-4 text-center">
                      <p className="text-[9px] text-white/25">Sin fuentes vinculadas aún para este tema</p>
                    </div>
                  )}
                  <div className="mt-4 flex items-start gap-2 px-3 py-2.5 bg-blue-500/5 border border-blue-500/15 rounded-sm">
                    <AlertCircle className="w-3 h-3 text-blue-400/50 mt-0.5 shrink-0" />
                    <p className="text-[8px] text-blue-300/50 leading-relaxed">
                      Las fuentes no se scrapean en tiempo real. Los estados reflejan la última validación manual o automatizada. 
                      <strong> needs_refresh</strong> indica que la URL fue validada pero el contenido puede haber cambiado. 
                      <strong> pending_validation</strong> indica que la URL fue agregada pero no verificada.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Tab: Cobertura de formatos ── */}
              {detailTab === "cobertura" && (
                <div className="space-y-3 max-w-2xl">
                  <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-3">Formatos que consumen este tema — pág. {selected.num}</p>
                  {(Object.entries(FORMAT_CFG) as [FormatId, typeof FORMAT_CFG[FormatId]][]).map(([fid, fcfg]) => {
                    const FIcon = fcfg.icon;
                    const isActive = selected.formatos.includes(fid);
                    return (
                      <div key={fid} className={cn(
                        "flex items-center gap-3 px-4 py-3 border rounded-sm transition-all",
                        isActive ? "bg-white/[0.03] border-white/[0.09]" : "bg-white/[0.01] border-white/[0.04] opacity-50"
                      )}>
                        <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center border border-white/10 bg-white/[0.04] shrink-0")}>
                          <FIcon className={cn("w-4 h-4", isActive ? fcfg.color : "text-white/15")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn("text-[10px] font-bold", isActive ? fcfg.color : "text-white/15")}>{fcfg.label}</p>
                            {!isActive && <span className="text-[7px] text-white/15">no consume este tema</span>}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {fcfg.fields.map(f => (
                              <span key={f} className={cn(
                                "text-[7px] px-1.5 py-0.5 rounded-sm border",
                                isActive ? "bg-white/[0.05] border-white/10 text-white/40" : "bg-white/[0.02] border-white/[0.05] text-white/15"
                              )}>{f}</span>
                            ))}
                          </div>
                        </div>
                        {isActive && (
                          <button onClick={() => sendToFormat(selected.id, fid)}
                            className="shrink-0 flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                            <Send className="w-2.5 h-2.5" />Enviar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom panels ── */}
        <div className="border-t border-white/[0.06] bg-[#0d1629]">
          <div className="flex items-center justify-between gap-3 px-5 pt-2 border-b border-white/[0.05]">
            <div className="flex gap-0.5">
              {([["matriz","Cobertura por formato"],["brechas","Brechas editoriales"]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setBottomTab(id)}
                  className={cn(
                    "h-7 px-3 rounded-sm text-[9px] font-semibold transition-all",
                    bottomTab === id ? "bg-white/[0.07] text-white/70" : "text-white/25 hover:text-white/50"
                  )}>{label}</button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBottomPanelOpen((value) => !value)}
              className="mb-1 inline-flex items-center gap-1.5 h-7 px-3 rounded-sm border border-white/[0.06] text-[8px] font-semibold text-white/38 hover:text-white/70 hover:border-white/[0.12] transition-all"
            >
              {bottomPanelOpen ? "Replegar panel" : "Abrir panel"}
              <ChevronDown className={cn("w-3 h-3 transition-transform", bottomPanelOpen && "rotate-180")} />
            </button>
          </div>

          {bottomPanelOpen && (
          <div className="overflow-x-auto p-4">

            {/* ── Matriz de cobertura ── */}
            {bottomTab === "matriz" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-sm border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <p className="text-[8px] text-white/35 leading-relaxed max-w-xl">
                    Mapa editorial del batch: indica que formatos consumen cada tema. No es un score; sirve para detectar huecos antes de generar libros.
                  </p>
                  <div className="ml-auto flex items-center gap-3 text-[7px] text-white/30">
                    <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400/70" /> incluido</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> grounded</span>
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> revision</span>
                    <span className="inline-flex items-center gap-1"><span className="text-white/15">·</span> no aplica</span>
                  </div>
                </div>
              <table className="w-full text-[7px] border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-[7px] text-white/25 font-bold uppercase tracking-widest pb-2 pr-4 w-36">Formato</th>
                    {TOPICS.map(t => (
                      <th key={t.id} className="text-center pb-2 px-1">
                        <span className={cn("inline-block text-[6px] font-black tabular-nums w-5 h-5 rounded-sm flex items-center justify-center",
                          groundingStates[t.id] === "grounded" ? "bg-emerald-500/15 text-emerald-400" :
                          groundingStates[t.id] === "needs_review" ? "bg-amber-500/15 text-amber-400" :
                          groundingStates[t.id] === "pending_sources" ? "bg-blue-500/15 text-blue-400" :
                          "bg-white/[0.05] text-white/20"
                        )}>{t.num}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.entries(FORMAT_CFG) as [FormatId, typeof FORMAT_CFG[FormatId]][]).map(([fid, fcfg]) => {
                    const FIcon = fcfg.icon;
                    return (
                      <tr key={fid} className="border-t border-white/[0.04]">
                        <td className="py-1.5 pr-4">
                          <div className="flex items-center gap-1.5">
                            <FIcon className={cn("w-2.5 h-2.5", fcfg.color)} />
                            <span className={cn("font-semibold", fcfg.color)}>{fcfg.label}</span>
                          </div>
                        </td>
                        {TOPICS.map(t => {
                          const covers = t.formatos.includes(fid);
                          return (
                            <td key={t.id} className="text-center py-1.5 px-1">
                              {covers
                                ? <CheckCircle2 className="w-3 h-3 text-emerald-400/70 mx-auto" />
                                : <span className="text-white/10 mx-auto block text-center">·</span>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            )}

            {/* ── Brechas editoriales ── */}
            {bottomTab === "brechas" && (
              <div className="space-y-2">
                {gaps.map(gap => {
                  const sev = gap.severity;
                  return (
                    <div key={gap.id} className={cn(
                      "flex items-start gap-3 px-3 py-2.5 border rounded-sm",
                      sev === "high" ? "bg-red-500/5 border-red-500/15" :
                      sev === "medium" ? "bg-amber-500/5 border-amber-500/15" :
                      "bg-white/[0.02] border-white/[0.06]"
                    )}>
                      <AlertTriangle className={cn("w-3 h-3 mt-0.5 shrink-0",
                        sev === "high" ? "text-red-400" : sev === "medium" ? "text-amber-400" : "text-white/25")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[7px] font-bold uppercase",
                            sev === "high" ? "text-red-400" : sev === "medium" ? "text-amber-400" : "text-white/25")}>{sev}</span>
                          <span className="text-[7px] text-white/20">Páginas: {gap.topicIds.join(", ")}</span>
                        </div>
                        <p className="text-[9px] text-white/55 leading-relaxed">{gap.description}</p>
                      </div>
                      <button onClick={() => toast({ title:`Acción: ${gap.action}`, description:`Brecha en páginas ${gap.topicIds.join(", ")} marcada para resolución` })}
                        className="shrink-0 flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[7px] text-white/30 font-semibold transition-all whitespace-nowrap">
                        {gap.action}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
