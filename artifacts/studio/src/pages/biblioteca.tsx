import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPages,
  useApprovePage,
  useRequestRevision,
  useUpdatePage,
} from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, AlertTriangle, Clock, RotateCcw, Loader2,
  ChevronRight, Target, BookOpen, Layers, History, Award,
  Download, RefreshCw, MessageSquare, ThumbsUp,
} from "lucide-react";

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
interface QADims { artDir: number; editCons: number; legib: number; techAcc: number }
interface VersionEntry { version: string; date: string; note: string }
interface PageEdit {
  num: string; title: string; domain: string;
  editorialStatus: EStatus; qaTotal: number; qaDims: QADims;
  contractVersion: string; lastRevision: string;
  redTeam: string[]; contentSummary: string;
  grounding: string; sources: string[];
  versionHistory: VersionEntry[];
}
type EStatus = "approved"|"approved_minor"|"qa_review"|"visual_fix"|"pending_regen"|"grounding_pending"|"pending_qa";

/* ─── Datos editoriales Batch 01–10 ─────────────────────────────────────── */
const EDITORIAL: Record<string, PageEdit> = {
  "01": {
    num:"01", title:"Azure Container Registry: arquitectura y tiers", domain:"Azure Container Registry",
    editorialStatus:"approved", qaTotal:9.42,
    qaDims:{artDir:9.6, editCons:9.4, legib:9.2, techAcc:9.5},
    contractVersion:"v24", lastRevision:"2026-05-18",
    redTeam:["Verificar coherencia entre badges de tier y diagrama de capacidades","Confirmar que los límites de almacenamiento aparecen en tabla y no sólo en texto"],
    contentSummary:"Arquitectura de Azure Container Registry, comparativa de tiers (Basic/Standard/Premium), cuotas de almacenamiento y rendimiento, casos de uso por tier y criterios de selección para proyectos empresariales.",
    grounding:"Documentación oficial Microsoft: azure.microsoft.com/en-us/products/container-registry · Azure Pricing Calculator · Azure Container Registry SLA",
    sources:["MS Docs – ACR Overview","MS Docs – ACR Tiers","Azure Architecture Center"],
    versionHistory:[
      {version:"v3",date:"2026-05-18",note:"Aprobada tras ajuste de tabla de tiers"},
      {version:"v2",date:"2026-05-12",note:"Corrección de diagrama de arquitectura"},
      {version:"v1",date:"2026-05-05",note:"Versión inicial generada"},
    ],
  },
  "02": {
    num:"02", title:"Build y push de imágenes hacia ACR", domain:"Azure Container Registry",
    editorialStatus:"approved_minor", qaTotal:9.36,
    qaDims:{artDir:9.4, editCons:9.3, legib:9.5, techAcc:9.2},
    contractVersion:"v24", lastRevision:"2026-05-19",
    redTeam:["Controlar varianza iconográfica entre comandos CLI y portal UI","Asegurar numeración homogénea de pasos en el flujo de build"],
    contentSummary:"Flujo completo de construcción y publicación: docker build, az acr build, ACR Tasks, multi-stage builds y optimización de capas. Integración con Docker CLI y az CLI.",
    grounding:"MS Docs – Build and push Docker image to ACR · Azure CLI Reference · ACR Tasks documentation",
    sources:["MS Docs – ACR Quick Start","MS Docs – ACR Tasks","Docker Official Docs"],
    versionHistory:[
      {version:"v2",date:"2026-05-19",note:"Aprobada con nota: revisar iconos CLI en próxima versión"},
      {version:"v1",date:"2026-05-08",note:"Versión inicial generada"},
    ],
  },
  "03": {
    num:"03", title:"Tags, digest SHA256 y trazabilidad", domain:"Azure Container Registry",
    editorialStatus:"qa_review", qaTotal:9.28,
    qaDims:{artDir:9.3, editCons:9.2, legib:9.4, techAcc:9.1},
    contractVersion:"v24", lastRevision:"2026-05-20",
    redTeam:["Verificar recortes en diagrama de trazabilidad SHA256","Revisar densidad del contexto — puede simplificarse sin perder precisión técnica","Evitar espacios vacíos en zona de autocheck"],
    contentSummary:"Gestión de etiquetas mutables e inmutables, digest SHA256 como identificador único de imagen, quarantine policy, trazabilidad de artefactos en pipelines CI/CD y auditoría de registros.",
    grounding:"MS Docs – Content trust in ACR · OCI Distribution Specification · Azure Policy for ACR",
    sources:["MS Docs – Image Tags","OCI Spec","Azure Monitor Docs"],
    versionHistory:[
      {version:"v2",date:"2026-05-20",note:"En revisión QA – diagrama pendiente de corrección"},
      {version:"v1",date:"2026-05-10",note:"Versión inicial generada"},
    ],
  },
  "04": {
    num:"04", title:"Private Endpoint, firewall y resolución DNS", domain:"Azure Container Registry",
    editorialStatus:"visual_fix", qaTotal:9.12,
    qaDims:{artDir:9.0, editCons:9.2, legib:9.3, techAcc:9.0},
    contractVersion:"v24", lastRevision:"2026-05-21",
    redTeam:["Mejorar jerarquía de títulos en la sección DNS — actualmente poco diferenciada","Verificar que el diagrama de red no recorta la capa de subred privada","Diagrama de firewall rules necesita contraste mayor entre allow/deny"],
    contentSummary:"Configuración de Private Endpoint en VNet, integración con Private DNS Zone, reglas de firewall IP/VNet, service endpoints y arquitecturas de acceso privado a ACR desde AKS/VM.",
    grounding:"MS Docs – ACR Private Link · Azure Private DNS · Azure Firewall integration with ACR",
    sources:["MS Docs – Private Endpoints","MS Docs – Network Rules","Azure Architecture Center"],
    versionHistory:[
      {version:"v2",date:"2026-05-21",note:"Requiere ajuste visual — diagrama de red en revisión"},
      {version:"v1",date:"2026-05-11",note:"Versión inicial generada"},
    ],
  },
  "05": {
    num:"05", title:"Retention policy, limpieza y costos", domain:"Azure Container Registry",
    editorialStatus:"approved", qaTotal:9.33,
    qaDims:{artDir:9.5, editCons:9.3, legib:9.2, techAcc:9.3},
    contractVersion:"v24", lastRevision:"2026-05-18",
    redTeam:["Confirmar que el ejemplo de costo mensual usa precios actualizados 2026"],
    contentSummary:"Políticas de retención de manifiestos sin etiqueta, purge automático de imágenes obsoletas, estimación de costos por tier y estrategias de limpieza para repositorios grandes en producción.",
    grounding:"MS Docs – ACR Retention Policy · Azure Pricing Calculator · ACR Purge Commands",
    sources:["MS Docs – Retention","Azure Cost Management","MS Docs – ACR CLI"],
    versionHistory:[
      {version:"v2",date:"2026-05-18",note:"Aprobada tras actualización de tabla de precios"},
      {version:"v1",date:"2026-05-07",note:"Versión inicial generada"},
    ],
  },
  "06": {
    num:"06", title:"Geo-replicación y zone redundancy", domain:"Azure Container Registry",
    editorialStatus:"approved_minor", qaTotal:9.25,
    qaDims:{artDir:9.2, editCons:9.3, legib:9.1, techAcc:9.4},
    contractVersion:"v24", lastRevision:"2026-05-19",
    redTeam:["Validar que el mapa de regiones no muestre zonas deprecated","Evitar respuesta autocheck duplicada entre preguntas 2 y 3"],
    contentSummary:"Geo-replicación a múltiples regiones Azure, zone redundancy (ZRS) en tiers Premium, resolución de latencia por proximidad, failover automático y consistencia eventual entre réplicas.",
    grounding:"MS Docs – ACR Geo-Replication · Azure Availability Zones · ACR Premium SLA",
    sources:["MS Docs – Geo-Replication","MS Docs – Zone Redundancy","Azure Architecture Center"],
    versionHistory:[
      {version:"v2",date:"2026-05-19",note:"Aprobada — observación menor en autocheck"},
      {version:"v1",date:"2026-05-09",note:"Versión inicial generada"},
    ],
  },
  "07": {
    num:"07", title:"Managed identity y pull seguro desde AKS", domain:"Azure Container Registry",
    editorialStatus:"qa_review", qaTotal:9.18,
    qaDims:{artDir:9.2, editCons:9.1, legib:9.3, techAcc:9.0},
    contractVersion:"v24", lastRevision:"2026-05-21",
    redTeam:["Validar que el grounding no se muestre como texto de infografía","Mejorar diferenciación visual entre system-assigned y user-assigned identity","Score técnico bajo — revisar sección de roles RBAC"],
    contentSummary:"Autenticación sin contraseñas usando Managed Identity, asignación de rol AcrPull a identidades de AKS, kubelet identity, configuración de imagePullSecret y auditoría de accesos al registro.",
    grounding:"MS Docs – Authenticate ACR from AKS · Azure RBAC Roles for ACR · Workload Identity",
    sources:["MS Docs – AKS + ACR Integration","MS Docs – Managed Identity","Azure RBAC Docs"],
    versionHistory:[
      {version:"v2",date:"2026-05-21",note:"En revisión QA — sección RBAC pendiente de corrección"},
      {version:"v1",date:"2026-05-12",note:"Versión inicial generada"},
    ],
  },
  "08": {
    num:"08", title:"Container Apps con imágenes privadas", domain:"Azure Container Registry",
    editorialStatus:"pending_regen", qaTotal:8.96,
    qaDims:{artDir:9.0, editCons:8.9, legib:9.0, techAcc:8.9},
    contractVersion:"v24", lastRevision:"2026-05-20",
    redTeam:["Regeneración selectiva recomendada para sección de configuración de managed env","Densidad de contexto excesiva en zona de trampas — refactorizar","Score general por debajo de 9.0 en 3 dimensiones"],
    contentSummary:"Integración de Azure Container Apps con imágenes de ACR privado, configuración de identidades para pull seguro, variables de entorno, secretos en Container Apps y estrategias de despliegue blue/green.",
    grounding:"MS Docs – Container Apps with ACR · Azure Container Apps Docs · Managed Environments",
    sources:["MS Docs – Container Apps","MS Docs – ACR Integration","Azure Container Apps Reference"],
    versionHistory:[
      {version:"v2",date:"2026-05-20",note:"Pendiente regeneración — score bajo en configuración"},
      {version:"v1",date:"2026-05-14",note:"Versión inicial generada"},
    ],
  },
  "09": {
    num:"09", title:"CI/CD hacia ACR con pipelines", domain:"Azure Container Registry",
    editorialStatus:"grounding_pending", qaTotal:8.70,
    qaDims:{artDir:8.8, editCons:8.7, legib:8.6, techAcc:8.7},
    contractVersion:"v24", lastRevision:"2026-05-22",
    redTeam:["Grounding pendiente de verificación contra documentación vigente de Azure DevOps","Estructura de pipeline YAML requiere revisión técnica","Legibilidad baja — sección de triggers demasiado densa"],
    contentSummary:"Pipelines CI/CD con Azure DevOps y GitHub Actions para build y push automatizado a ACR, uso de service connections, triggers por rama/PR, cacheo de capas y escaneo de vulnerabilidades en pipeline.",
    grounding:"PENDIENTE — verificar contra: MS Docs – Azure Pipelines + ACR · GitHub Actions for Azure · ACR Tasks from pipeline",
    sources:["MS Docs – Azure Pipelines","GitHub Actions Docs","ACR Tasks Reference"],
    versionHistory:[
      {version:"v1",date:"2026-05-22",note:"Grounding pendiente — no apta para aprobación"},
    ],
  },
  "10": {
    num:"10", title:"Troubleshooting de acceso, permisos y versiones", domain:"Azure Container Registry",
    editorialStatus:"pending_qa", qaTotal:8.84,
    qaDims:{artDir:8.9, editCons:8.8, legib:8.9, techAcc:8.7},
    contractVersion:"v24", lastRevision:"2026-05-22",
    redTeam:["Pendiente revisión QA completa","Verificar que la tabla de errores cubre todos los códigos HTTP relevantes","Confirmar cobertura de escenarios de autenticación fallida"],
    contentSummary:"Diagnóstico de errores de autenticación (401/403), problemas de resolución DNS en private endpoint, versiones incompatibles de cliente Docker, permisos RBAC mal configurados y estrategias de recuperación.",
    grounding:"MS Docs – ACR Troubleshooting · Azure Monitor Logs for ACR · ACR Error Codes Reference",
    sources:["MS Docs – Troubleshooting ACR","Azure Monitor","ACR Error Reference"],
    versionHistory:[
      {version:"v1",date:"2026-05-22",note:"Pendiente de revisión QA inicial"},
    ],
  },
};

/* ─── Config estados editoriales ─────────────────────────────────────────── */
const STATUS_CFG: Record<EStatus, { label: string; color: string; bg: string; dot: string; icon: React.ComponentType<{className?:string}> }> = {
  approved:          { label:"Aprobada",                   color:"text-emerald-700", bg:"bg-emerald-50 border-emerald-200",   dot:"bg-emerald-500", icon:CheckCircle2  },
  approved_minor:    { label:"Aprobada c/observaciones",   color:"text-teal-700",    bg:"bg-teal-50 border-teal-200",         dot:"bg-teal-500",    icon:CheckCircle2  },
  qa_review:         { label:"En revisión QA",             color:"text-blue-700",    bg:"bg-blue-50 border-blue-200",         dot:"bg-blue-400",    icon:Clock         },
  visual_fix:        { label:"Requiere ajuste visual",     color:"text-amber-700",   bg:"bg-amber-50 border-amber-200",       dot:"bg-amber-400",   icon:AlertTriangle },
  pending_regen:     { label:"Pendiente regeneración",     color:"text-orange-700",  bg:"bg-orange-50 border-orange-200",     dot:"bg-orange-400",  icon:RefreshCw     },
  grounding_pending: { label:"Grounding pendiente",        color:"text-violet-700",  bg:"bg-violet-50 border-violet-200",     dot:"bg-violet-400",  icon:AlertTriangle },
  pending_qa:        { label:"Pendiente de QA",            color:"text-gray-600",    bg:"bg-gray-50 border-gray-200",         dot:"bg-gray-300",    icon:Clock         },
};

const STANDARD = 9.5;
const DOMAIN_COLOR = "#0369a1"; // Azure cyan-700

/* ─── Componente principal ───────────────────────────────────────────────── */
export default function Biblioteca() {
  const [selectedNum, setSelectedNum] = useState("01");
  const queryClient = useQueryClient();
  const { data: pages = [], isLoading } = useListPages();
  const approveMut   = useApprovePage();
  const revisionMut  = useRequestRevision();
  const updateMut    = useUpdatePage();

  // Merge live API data by pageNumber with static editorial data
  const pageMap = Object.fromEntries(pages.map(p => [p.pageNumber, p]));
  const selected = EDITORIAL[selectedNum];
  const selectedPage = pageMap[selectedNum];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["listPages"] });

  function handleApprove() {
    if (!selectedPage) return;
    approveMut.mutate({ id: selectedPage.id }, { onSuccess: invalidate });
  }
  function handleRequestRevision(note: string) {
    if (!selectedPage) return;
    revisionMut.mutate({ id: selectedPage.id, data: { comment: note } }, { onSuccess: invalidate });
  }
  function handleMarkExport() {
    if (!selectedPage) return;
    updateMut.mutate({ id: selectedPage.id, data: { status: "exported" } }, { onSuccess: invalidate });
  }
  function handleSimulatedRegen() {
    if (!selectedPage) return;
    updateMut.mutate({ id: selectedPage.id, data: { status: "generating" } }, { onSuccess: invalidate });
  }

  const isMutating = approveMut.isPending || revisionMut.isPending || updateMut.isPending;

  return (
    <Layout title="Visual Atlas — Batch 01–10">
      <div className="flex h-full overflow-hidden bg-[#f0f2f5]">
        {/* ── Left panel: batch summary + page list ──────────────────── */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
          <BatchSummary />
          <div className="flex-1 overflow-y-auto">
            {isLoading
              ? <div className="p-3 space-y-2">{Array.from({length:10}).map((_,i)=><div key={i} className="h-14 bg-gray-100 rounded-sm animate-pulse"/>)}</div>
              : Object.values(EDITORIAL).map(ed => (
                <PageListItem
                  key={ed.num} ed={ed}
                  liveStatus={pageMap[ed.num]?.status}
                  active={selectedNum === ed.num}
                  onClick={() => setSelectedNum(ed.num)}
                />
              ))
            }
          </div>
        </aside>

        {/* ── Right panel: page detail ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {selected ? (
            <PageDetail
              ed={selected}
              liveStatus={selectedPage?.status}
              isMutating={isMutating}
              onApprove={handleApprove}
              onRequestRevision={handleRequestRevision}
              onMarkExport={handleMarkExport}
              onRegen={handleSimulatedRegen}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-400">Selecciona una página</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ─── Batch summary panel ───────────────────────────────────────────────── */
function BatchSummary() {
  const all = Object.values(EDITORIAL);
  const approved   = all.filter(p => p.editorialStatus === "approved" || p.editorialStatus === "approved_minor").length;
  const review     = all.filter(p => p.editorialStatus === "qa_review" || p.editorialStatus === "visual_fix").length;
  const blocked    = all.filter(p => ["pending_regen","grounding_pending","pending_qa"].includes(p.editorialStatus)).length;
  const avg        = all.reduce((s,p) => s + p.qaTotal, 0) / all.length;
  const gap        = STANDARD - avg;

  return (
    <div className="p-3 border-b border-gray-100 bg-gradient-to-b from-blue-50/50 to-white shrink-0">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Layers className="w-3.5 h-3.5 text-blue-600" />
        <p className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Batch 01–10</p>
        <span className="ml-auto text-[9px] text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded-sm">ACR · v24</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <SummaryChip label="Aprobadas" value={approved} color="text-emerald-600" dot="bg-emerald-400" />
        <SummaryChip label="Revisión"  value={review}   color="text-amber-600"   dot="bg-amber-400"   />
        <SummaryChip label="Bloqueadas" value={blocked} color="text-gray-500"    dot="bg-gray-300"    />
      </div>
      <div className="bg-white border border-gray-200 rounded-sm p-2 space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[9px] text-gray-400">Score promedio</span>
          <span className="text-[10px] font-bold text-blue-700">{avg.toFixed(2)}</span>
        </div>
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full" style={{width:`${(avg/10)*100}%`}} />
        </div>
        <div className="flex justify-between">
          <span className="text-[9px] text-gray-400">Dist. estándar 9.5</span>
          <span className="text-[9px] font-semibold text-amber-600">−{gap.toFixed(2)}</span>
        </div>
      </div>
      <div className="mt-2 text-[8.5px] text-gray-400 bg-amber-50 border border-amber-100 rounded-sm px-2 py-1.5 leading-relaxed">
        <strong className="text-amber-700">Defectos recurrentes:</strong> varianza iconográfica, densidad excesiva en trampas, diagramas recortados, grounding visible como texto.
      </div>
      <div className="mt-1.5 text-[8.5px] text-blue-700 bg-blue-50 border border-blue-100 rounded-sm px-2 py-1.5 leading-relaxed">
        <strong>Siguiente acción:</strong> resolver páginas 07–09 en revisión antes de avanzar al batch 11–20.
      </div>
    </div>
  );
}

function SummaryChip({label,value,color,dot}: {label:string;value:number;color:string;dot:string}) {
  return (
    <div className="bg-white border border-gray-100 rounded-sm px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <span className={cn("w-1.5 h-1.5 rounded-full",dot)} />
        <span className={cn("text-sm font-bold tabular-nums",color)}>{value}</span>
      </div>
      <p className="text-[8px] text-gray-400 leading-none">{label}</p>
    </div>
  );
}

/* ─── Page list item ────────────────────────────────────────────────────── */
function PageListItem({ed, liveStatus, active, onClick}: {
  ed: PageEdit; liveStatus?: string; active: boolean; onClick: ()=>void
}) {
  const cfg = STATUS_CFG[ed.editorialStatus];
  const Icon = cfg.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b border-gray-100 flex items-start gap-2.5 transition-all",
        active ? "bg-blue-50 border-l-2 border-l-blue-500 pl-[10px]" : "hover:bg-gray-50 border-l-2 border-l-transparent"
      )}
    >
      {/* Mini thumbnail */}
      <div className="w-10 h-10 shrink-0 rounded-sm overflow-hidden border border-gray-100">
        <MiniThumb num={ed.num} status={ed.editorialStatus} score={ed.qaTotal} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-[9px] font-bold text-gray-500">#{ed.num}</span>
          <Icon className={cn("w-2.5 h-2.5 shrink-0", cfg.color)} />
        </div>
        <p className="text-[10px] font-semibold text-gray-800 leading-snug line-clamp-2">{ed.title}</p>
        <div className="flex items-center justify-between mt-1">
          <span className={cn("text-[8px] font-bold", cfg.color)}>{cfg.label}</span>
          <span className={cn("text-[9px] font-bold tabular-nums", ed.qaTotal >= 9.3 ? "text-emerald-600" : ed.qaTotal >= 9.0 ? "text-amber-600" : "text-orange-600")}>
            {ed.qaTotal.toFixed(2)}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─── Mini thumbnail (40×40) ────────────────────────────────────────────── */
function MiniThumb({num, status, score}: {num:string; status:EStatus; score:number}) {
  const cfg = STATUS_CFG[status];
  return (
    <div className="w-full h-full relative flex flex-col" style={{background:`linear-gradient(135deg, ${DOMAIN_COLOR}15 0%, ${DOMAIN_COLOR}08 100%)`}}>
      <div className="h-2.5 flex items-center px-1 gap-0.5" style={{backgroundColor:`${DOMAIN_COLOR}22`}}>
        <div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:DOMAIN_COLOR}} />
        <div className="flex-1 h-0.5 rounded" style={{backgroundColor:`${DOMAIN_COLOR}40`}} />
        <span className="text-[6px] font-black leading-none" style={{color:DOMAIN_COLOR}}>{num}</span>
      </div>
      <div className="flex-1 p-0.5 flex flex-col gap-0.5 justify-center">
        {[60,90,45].map((w,i)=><div key={i} className="h-0.5 rounded bg-gray-200" style={{width:`${w}%`}}/>)}
        <div className="flex gap-0.5 mt-0.5">
          <div className="flex-1 h-1.5 rounded-sm bg-red-100"/>
          <div className="flex-1 h-1.5 rounded-sm bg-teal-100"/>
        </div>
      </div>
      <div className={cn("absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full", cfg.dot)} />
    </div>
  );
}

/* ─── Page detail panel ─────────────────────────────────────────────────── */
function PageDetail({ed, liveStatus, isMutating, onApprove, onRequestRevision, onMarkExport, onRegen}: {
  ed: PageEdit; liveStatus?: string; isMutating: boolean;
  onApprove: ()=>void; onRequestRevision:(note:string)=>void;
  onMarkExport: ()=>void; onRegen: ()=>void;
}) {
  const [activeTab, setActiveTab] = useState<"ficha"|"qa"|"redteam"|"history">("ficha");
  const cfg = STATUS_CFG[ed.editorialStatus];
  const Icon = cfg.icon;
  const canApprove = ["qa_review","visual_fix","approved_minor"].includes(ed.editorialStatus);
  const canExport  = ["approved","approved_minor"].includes(ed.editorialStatus);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-violet-600" />
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Large preview */}
            <div className="w-48 h-32 rounded-sm overflow-hidden border border-gray-200 shrink-0">
              <LargeThumb num={ed.num} status={ed.editorialStatus} title={ed.title} score={ed.qaTotal} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[10px] font-bold bg-[#0369a1] text-white px-1.5 py-0.5 rounded-sm tracking-wider">ACR · #{ed.num}</span>
                <span className={cn("flex items-center gap-1 text-[9px] font-semibold border rounded-sm px-1.5 py-0.5", cfg.bg, cfg.color)}>
                  <Icon className="w-2.5 h-2.5" />{cfg.label}
                </span>
                <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-sm">Contrato {ed.contractVersion}</span>
                <span className="text-[9px] text-gray-400 ml-auto">{ed.lastRevision}</span>
              </div>
              <h2 className="text-base font-bold text-gray-900 leading-tight mb-1">{ed.title}</h2>
              <p className="text-[10px] text-gray-400 mb-3">{ed.domain}</p>

              {/* QA Score overview */}
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-[8px] text-gray-400 uppercase tracking-wider">Score QA</p>
                  <p className={cn("text-xl font-black tabular-nums", ed.qaTotal >= 9.3 ? "text-emerald-600" : ed.qaTotal >= 9.0 ? "text-amber-600" : "text-orange-600")}>
                    {ed.qaTotal.toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 space-y-1">
                  {[
                    {label:"Dirección de arte", val:ed.qaDims.artDir},
                    {label:"Consistencia editorial", val:ed.qaDims.editCons},
                    {label:"Legibilidad", val:ed.qaDims.legib},
                    {label:"Precisión técnica", val:ed.qaDims.techAcc},
                  ].map(d=>(
                    <div key={d.label} className="flex items-center gap-2">
                      <span className="text-[8px] text-gray-400 w-32 shrink-0">{d.label}</span>
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", d.val>=9.3?"bg-emerald-500":d.val>=9.0?"bg-amber-400":"bg-orange-400")}
                          style={{width:`${(d.val/10)*100}%`}} />
                      </div>
                      <span className="text-[8px] font-bold tabular-nums text-gray-600 w-6 text-right">{d.val.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-[8px] text-gray-400 uppercase tracking-wider mb-0.5">Estándar</p>
                  <p className="text-sm font-bold text-gray-300">{STANDARD}</p>
                  <p className={cn("text-[9px] font-semibold", (STANDARD - ed.qaTotal) > 0.2 ? "text-amber-600" : "text-emerald-600")}>
                    {ed.qaTotal >= STANDARD ? "✓ OK" : `−${(STANDARD - ed.qaTotal).toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
            <ActionButton icon={ThumbsUp} label="Aprobar" variant="primary"
              disabled={!canApprove || isMutating} onClick={onApprove} loading={approveMut_pending(isMutating)} />
            <ActionButton icon={MessageSquare} label="Solicitar corrección" variant="secondary"
              disabled={isMutating} onClick={() => onRequestRevision("Corrección solicitada por red team")} />
            <ActionButton icon={RefreshCw} label="Regenerar selectivamente" variant="warning"
              disabled={isMutating} onClick={onRegen} />
            <ActionButton icon={Download} label="Marcar exportación" variant="ghost"
              disabled={!canExport || isMutating} onClick={onMarkExport} />
            {isMutating && <Loader2 className="w-4 h-4 text-blue-400 animate-spin ml-1" />}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {(["ficha","qa","redteam","history"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5",
                activeTab===tab ? "border-b-2 border-blue-500 text-blue-700 bg-blue-50/50" : "text-gray-400 hover:text-gray-600"
              )}>
              {tab==="ficha"   && <><BookOpen className="w-3 h-3"/>Ficha editorial</>}
              {tab==="qa"      && <><Award className="w-3 h-3"/>QA por dimensión</>}
              {tab==="redteam" && <><Target className="w-3 h-3"/>Red team</>}
              {tab==="history" && <><History className="w-3 h-3"/>Historial</>}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab==="ficha" && (
            <div className="space-y-4">
              <Field label="Resumen de contenido técnico" value={ed.contentSummary} />
              <Field label="Grounding y fuentes verificadas" value={ed.grounding}
                warning={ed.editorialStatus==="grounding_pending"} />
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Fuentes de referencia</p>
                <div className="flex flex-wrap gap-1.5">
                  {ed.sources.map(s=>(
                    <span key={s} className="text-[9px] bg-blue-50 border border-blue-100 text-blue-700 px-2 py-0.5 rounded-sm font-medium">{s}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Versión de contrato visual" value={ed.contractVersion} mono />
                <Field label="Última revisión" value={ed.lastRevision} mono />
              </div>
            </div>
          )}
          {activeTab==="qa" && (
            <div className="space-y-4">
              {[
                {key:"artDir", label:"Dirección de arte", desc:"Layout, jerarquía visual, colores, iconografía y composición global.", val:ed.qaDims.artDir},
                {key:"editCons", label:"Consistencia editorial", desc:"Coherencia con contrato visual v24: header/footer, tipografía, formato de trampas y autocheck.", val:ed.qaDims.editCons},
                {key:"legib", label:"Legibilidad", desc:"Tamaño de texto, contraste, densidad informacional y ausencia de solapamientos.", val:ed.qaDims.legib},
                {key:"techAcc", label:"Precisión técnica", desc:"Corrección de contenido Azure, validez del grounding y cobertura de objetivos del examen.", val:ed.qaDims.techAcc},
              ].map(d=>(
                <div key={d.key} className="bg-gray-50 border border-gray-100 rounded-sm p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{d.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{d.desc}</p>
                    </div>
                    <div className="text-center ml-4 shrink-0">
                      <p className={cn("text-xl font-black tabular-nums", d.val>=9.3?"text-emerald-600":d.val>=9.0?"text-amber-600":"text-orange-500")}>{d.val.toFixed(1)}</p>
                      <p className="text-[8px] text-gray-400">/ 10</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", d.val>=9.3?"bg-emerald-500":d.val>=9.0?"bg-amber-400":"bg-orange-400")}
                      style={{width:`${(d.val/10)*100}%`}} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[8px] text-gray-400">0</span>
                    <span className="text-[8px] text-amber-600 font-medium">Estándar 9.5</span>
                    <span className="text-[8px] text-gray-400">10</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab==="redteam" && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-400 mb-3">Observaciones del red team para la versión actual. Deben resolverse antes de aprobar.</p>
              {ed.redTeam.map((obs,i)=>(
                <div key={i} className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-sm px-3 py-2.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-900 leading-relaxed">{obs}</p>
                </div>
              ))}
              {ed.editorialStatus==="approved" && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-sm px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <p className="text-[10px] text-emerald-700 font-medium">Todas las observaciones resueltas en esta versión.</p>
                </div>
              )}
            </div>
          )}
          {activeTab==="history" && (
            <div className="space-y-2">
              {ed.versionHistory.map((v,i)=>(
                <div key={i} className={cn("flex items-start gap-3 px-3 py-2.5 rounded-sm border",
                  i===0 ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100")}>
                  <div className="shrink-0 mt-0.5">
                    <div className={cn("w-5 h-5 rounded-sm flex items-center justify-center text-[8px] font-black",
                      i===0 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-600")}>
                      {v.version}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold text-gray-700">{v.version}</span>
                      <span className="text-[9px] text-gray-400">{v.date}</span>
                      {i===0 && <span className="text-[8px] bg-blue-600 text-white px-1 py-0.5 rounded-sm font-bold">ACTUAL</span>}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-0.5">{v.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Large infographic thumbnail (192×128) ─────────────────────────────── */
function LargeThumb({num, status, title, score}: {num:string; status:EStatus; title:string; score:number}) {
  const cfg = STATUS_CFG[status];
  const short = title.split(":")[0] ?? title;
  return (
    <div className="w-full h-full flex flex-col" style={{background:`linear-gradient(150deg, ${DOMAIN_COLOR}12 0%, #f8faff 100%)`}}>
      {/* Header bar */}
      <div className="px-2 py-1 flex items-center gap-1.5 shrink-0" style={{backgroundColor:`${DOMAIN_COLOR}20`}}>
        <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[6px] font-black text-white shrink-0" style={{backgroundColor:DOMAIN_COLOR}}>
          {num}
        </div>
        <p className="text-[7px] font-bold text-gray-700 flex-1 truncate leading-none">{short}</p>
        <span className={cn("text-[7px] font-bold",score>=9.3?"text-emerald-600":"text-amber-600")}>{score.toFixed(2)}</span>
      </div>
      {/* Content mock */}
      <div className="flex-1 p-1.5 flex gap-1.5">
        <div className="flex-1 flex flex-col gap-1">
          {[80,65,90,50,75].map((w,i)=><div key={i} className="h-1 rounded-sm bg-gray-200" style={{width:`${w}%`}}/>)}
          <div className="flex-1 mt-1 flex flex-col gap-1">
            {[1,2,3].map(i=>(
              <div key={i} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-sm border shrink-0" style={{borderColor:`${DOMAIN_COLOR}60`,backgroundColor:`${DOMAIN_COLOR}15`}}/>
                <div className="flex-1 h-0.5 rounded bg-gray-200" style={{width:`${60+i*10}%`}}/>
              </div>
            ))}
          </div>
        </div>
        <div className="w-14 flex flex-col gap-1">
          <div className="flex-1 rounded-sm border p-1" style={{borderColor:`${DOMAIN_COLOR}30`,backgroundColor:`${DOMAIN_COLOR}08`}}>
            <div className="flex flex-col items-center gap-0.5 h-full justify-center">
              {[1,2,3].map(i=>(
                <div key={i} className="w-full h-3 rounded-sm flex items-center justify-center"
                  style={{backgroundColor:`${DOMAIN_COLOR}${15+i*5}`}}>
                  <div className="w-6 h-0.5 rounded" style={{backgroundColor:`${DOMAIN_COLOR}60`}}/>
                </div>
              ))}
              <ChevronRight className="w-2 h-2 my-0.5" style={{color:`${DOMAIN_COLOR}40`}}/>
              <div className="w-full h-3 rounded-sm" style={{backgroundColor:`${DOMAIN_COLOR}20`}}/>
            </div>
          </div>
        </div>
      </div>
      {/* Footer: traps + autocheck */}
      <div className="flex gap-1 px-1.5 pb-1.5 shrink-0">
        <div className="flex-1 bg-red-50 border border-red-100 rounded-sm px-1 py-0.5">
          <p className="text-[6px] font-bold text-red-500 uppercase tracking-wide">⚠ Trampa</p>
          <div className="h-0.5 bg-red-100 rounded mt-0.5"/>
        </div>
        <div className="flex-1 bg-teal-50 border border-teal-100 rounded-sm px-1 py-0.5">
          <p className="text-[6px] font-bold text-teal-600 uppercase tracking-wide">✓ Autocheck</p>
          <div className="h-0.5 bg-teal-100 rounded mt-0.5"/>
        </div>
      </div>
      {/* Status dot */}
      <div className={cn("absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white", cfg.dot)} style={{position:"absolute",bottom:4,right:4}}/>
    </div>
  );
}

/* ─── Action button helper ──────────────────────────────────────────────── */
function ActionButton({icon:Icon, label, variant, disabled, onClick, loading}: {
  icon: React.ComponentType<{className?:string}>; label:string;
  variant:"primary"|"secondary"|"warning"|"ghost"; disabled?:boolean; onClick:()=>void; loading?:boolean
}) {
  const styles = {
    primary:   "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white",
    secondary: "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
    warning:   "bg-white border border-amber-300 text-amber-700 hover:bg-amber-50",
    ghost:     "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn("flex items-center gap-1.5 px-3 h-7 rounded-sm text-xs font-semibold transition-all",
        styles[variant], disabled && "opacity-40 cursor-not-allowed"
      )}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Icon className="w-3 h-3"/>}
      {label}
    </button>
  );
}

function approveMut_pending(b:boolean){return b;}

/* ─── Generic field ─────────────────────────────────────────────────────── */
function Field({label, value, mono, warning}: {label:string; value:string; mono?:boolean; warning?:boolean}) {
  return (
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={cn("text-[10px] leading-relaxed", mono?"font-mono text-gray-600":"text-gray-700",
        warning && "text-amber-700 bg-amber-50 border border-amber-100 rounded-sm px-2 py-1.5"
      )}>{value}</p>
    </div>
  );
}
