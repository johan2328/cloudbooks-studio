import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Clock, AlertTriangle, Loader2, Sparkles,
  ExternalLink, Shield, FileText, Eye, Download, Image, XCircle,
} from "lucide-react";

/* ─── Datos editoriales (Batch 01–10) ─────────────────────────────────────── */
interface PageEdit {
  num: string; title: string; domain: string;
  examObjective: string; contexto: string;
  conceptos: string[]; trampas: string[];
  groundingStatus: "verified" | "partial" | "pending";
  sources: string[];
  contractVersion: string;
}

const PAGES: PageEdit[] = [
  {
    num:"01", title:"Azure Container Registry: arquitectura y tiers",
    domain:"Azure Container Registry",
    examObjective:"Identificar el tier correcto de ACR para escenarios empresariales con geo-replicación, aislamiento de red y alta disponibilidad.",
    contexto:"ACR centraliza imágenes Docker y artefactos OCI para despliegues en Azure, habilitando integración con AKS, Container Apps, App Service y pipelines CI/CD. Los tiers Basic, Standard y Premium definen cuotas de almacenamiento, rendimiento y funcionalidades avanzadas.",
    conceptos:["registry","repository","image","tag","digest SHA256","tier Basic","tier Standard","tier Premium","geo-replicación","private endpoint"],
    trampas:["latest es mutable — no garantiza reproducibilidad","Geo-replicación solo en tier Premium","Private endpoint requiere tier Premium","Basic no es suficiente para escenarios empresariales de red"],
    groundingStatus:"verified", sources:["MS Learn – ACR overview","MS Learn – ACR service tiers","Azure Architecture Center – Container scenarios"],
    contractVersion:"v24",
  },
  {
    num:"02", title:"Build y push de imágenes hacia ACR",
    domain:"Azure Container Registry",
    examObjective:"Distinguir los métodos de build y push a ACR: docker local, az acr build cloud y ACR Tasks.",
    contexto:"El flujo de publicación puede venir de docker local, az acr build o pipelines. az acr build ejecuta la compilación en la nube de Azure sin requerir Docker local.",
    conceptos:["docker build","docker push","az acr build","ACR Tasks","multi-stage build","AcrPush role","az acr login","service principal","managed identity"],
    trampas:["Confundir build local con build cloud","Push no implica versión inmutable","Olvidar az acr login antes del push","No asignar rol AcrPush a la identidad del pipeline"],
    groundingStatus:"verified", sources:["MS Learn – Build and push to ACR Quick Start","MS Learn – ACR Tasks"],
    contractVersion:"v24",
  },
  {
    num:"03", title:"Tags, digest SHA256 y trazabilidad",
    domain:"Azure Container Registry",
    examObjective:"Diferenciar tags mutables e inmutables y comprender cuándo usar digest SHA256 para garantizar reproducibilidad.",
    contexto:"Los tags ayudan a nombrar versiones pero son mutables. El digest SHA256 es el identificador criptográfico inmutable de una imagen exacta.",
    conceptos:["tag mutable","tag inmutable","digest SHA256","quarantine policy","OCI artifact","content trust","image manifest"],
    trampas:["latest no garantiza reproducibilidad","Tags semánticos no garantizan inmutabilidad sin lock","Digest SHA256 no puede modificarse sin generar uno diferente"],
    groundingStatus:"partial", sources:["MS Learn – Content trust in ACR","OCI Distribution Specification"],
    contractVersion:"v24",
  },
  {
    num:"04", title:"Autenticación en ACR: tokens, service principals y managed identity",
    domain:"Azure Container Registry",
    examObjective:"Seleccionar el método de autenticación correcto en ACR según el escenario: individual, automatizado o workload identity.",
    contexto:"ACR soporta múltiples métodos de autenticación: admin user (solo dev), service principal (CI/CD), managed identity (workload Azure) y OIDC federated credentials.",
    conceptos:["admin user","service principal","managed identity","AcrPull","AcrPush","AcrDelete","token de repositorio","OIDC federation"],
    trampas:["Admin user no recomendado en producción","Service principal requiere gestión de secreto rotante","Managed identity solo funciona con recursos Azure"],
    groundingStatus:"verified", sources:["MS Learn – Authenticate with ACR","MS Learn – Managed identities"],
    contractVersion:"v24",
  },
  {
    num:"05", title:"Networking en ACR: private endpoints y service endpoints",
    domain:"Azure Container Registry",
    examObjective:"Configurar acceso privado a ACR usando private endpoints y comprender las diferencias con service endpoints.",
    contexto:"Private endpoint crea una IP privada en la VNet para ACR. Service endpoint restringe acceso desde subredes seleccionadas pero no crea IP privada.",
    conceptos:["private endpoint","private DNS zone","service endpoint","firewall rules","network access","Premium tier","VNet integration"],
    trampas:["Service endpoint no es lo mismo que private endpoint","Private endpoint requiere Premium tier","DNS privado requiere configuración adicional"],
    groundingStatus:"verified", sources:["MS Learn – Private endpoints for ACR","Azure networking for ACR"],
    contractVersion:"v24",
  },
  {
    num:"06", title:"ACR Tasks: automatización de builds y mantenimiento",
    domain:"Azure Container Registry",
    examObjective:"Diseñar flujos de CI/CD usando ACR Tasks para builds automáticos, pruebas de imagen y gestión de artefactos.",
    contexto:"ACR Tasks extiende la funcionalidad de ACR con automatización cloud-side. Permite builds en respuesta a commits, actualizaciones de imagen base o schedules.",
    conceptos:["Quick task","Triggered task","Scheduled task","multi-step task","base image update trigger","YAML task definition"],
    trampas:["ACR Tasks no reemplaza un pipeline CI/CD completo","Quick task no persiste configuración","Multi-step task requiere YAML"],
    groundingStatus:"partial", sources:["MS Learn – ACR Tasks overview","MS Learn – Multi-step tasks"],
    contractVersion:"v24",
  },
  {
    num:"07", title:"Geo-replicación y alta disponibilidad en ACR",
    domain:"Azure Container Registry",
    examObjective:"Implementar geo-replicación en ACR Premium para reducir latencia de pull y garantizar continuidad ante fallos regionales.",
    contexto:"Geo-replicación sincroniza imágenes entre regiones Azure. Los clientes hacen pull desde la réplica más cercana automáticamente via routing DNS.",
    conceptos:["geo-replication","replica","routing","zone redundancy","Premium tier","regional endpoint","disaster recovery"],
    trampas:["Geo-replicación es Premium únicamente","Replicación no es instantánea — hay latencia de sincronización","Zone redundancy es diferente a geo-replication"],
    groundingStatus:"pending", sources:["MS Learn – Geo-replication in ACR","Azure HA documentation"],
    contractVersion:"v24",
  },
  {
    num:"08", title:"Escaneo de vulnerabilidades y seguridad en imágenes",
    domain:"Azure Container Registry",
    examObjective:"Integrar Microsoft Defender for Containers con ACR para escaneo automático de vulnerabilidades en imágenes.",
    contexto:"Defender for Containers escanea imágenes en el push y periódicamente. Reporta CVEs con severidad y recomendaciones de mitigación.",
    conceptos:["Microsoft Defender for Containers","CVE scanning","quarantine policy","image signing","notary","SBOM","vulnerability assessment"],
    trampas:["Escaneo requiere Defender for Containers habilitado — no es automático con ACR solo","Quarantine policy bloquea pull de imágenes no escaneadas"],
    groundingStatus:"pending", sources:["MS Learn – Defender for Containers","MS Security – Container image scanning"],
    contractVersion:"v24",
  },
  {
    num:"09", title:"Exportación, importación y transferencia de artefactos ACR",
    domain:"Azure Container Registry",
    examObjective:"Usar az acr import, az acr export y connected registries para transferir imágenes entre entornos aislados.",
    contexto:"Entornos air-gapped requieren importar imágenes sin acceso a internet. Connected registry permite sincronización con registros on-premises.",
    conceptos:["az acr import","az acr export","connected registry","artifact streaming","air-gapped","offline registry"],
    trampas:["Import no es pull — opera a nivel de registro","Connected registry requiere Premium","Export genera un tarball, no una imagen directamente"],
    groundingStatus:"pending", sources:["MS Learn – Import images to ACR","MS Learn – Connected registry"],
    contractVersion:"v24",
  },
  {
    num:"10", title:"Políticas de retención y ciclo de vida de artefactos",
    domain:"Azure Container Registry",
    examObjective:"Configurar políticas de retención en ACR para eliminar imágenes sin tag y gestionar el ciclo de vida de artefactos.",
    contexto:"Las políticas de retención eliminan manifests sin tag después de N días. Las purge tasks limpian imágenes antiguas según filtros de tag y fecha.",
    conceptos:["retention policy","untagged manifests","purge task","ACR lifecycle","tag filter","age filter"],
    trampas:["Políticas de retención no eliminan imágenes con tag activo","Purge task es una ACR Task — se ejecuta según schedule","Retención aplica por repositorio, no por registro completo"],
    groundingStatus:"pending", sources:["MS Learn – ACR retention policies","MS Learn – Purge images"],
    contractVersion:"v24",
  },
];

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
interface OutputStatus {
  hasOutput: boolean;
  generationMode: "openai_image" | "placeholder_image" | "fallback_html" | "none";
  templateApproach: string | null;
  generatedAt: string | null;
  files: {
    html: boolean;
    metadata: boolean;
    qaReport: boolean;
    upperVisual: boolean;
    previewPng: boolean;
    previewSvg: boolean;
  };
  htmlPath: string | null;
  previewPath: string | null;
}

type RunState =
  | "success_with_real_upper_visual"
  | "success_with_placeholder_visual"
  | "legacy_fallback"
  | "failed_no_html"
  | "no_output";

function computeRunState(s: OutputStatus | null): RunState {
  if (!s || !s.hasOutput) return "no_output";
  if (!s.files.html) return "failed_no_html";
  if (s.generationMode === "openai_image") return "success_with_real_upper_visual";
  if (s.generationMode === "placeholder_image") return "success_with_placeholder_visual";
  return "legacy_fallback";
}

type Tab = "output" | "contenido";

function getToken() { return localStorage.getItem("studio_token") ?? ""; }

function groundingDot(s: PageEdit["groundingStatus"]) {
  if (s === "verified") return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />;
  if (s === "partial")  return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />;
}

/* ─── Componente principal ──────────────────────────────────────────────── */
export default function Biblioteca() {
  const [, setLocation] = useLocation();
  const [selectedNum, setSelectedNum] = useState("01");
  const [tab, setTab] = useState<Tab>("output");
  const [outputStatus, setOutputStatus] = useState<OutputStatus | null>(null);
  const [loadingOutput, setLoadingOutput] = useState(false);

  const page = PAGES.find(p => p.num === selectedNum) ?? PAGES[0];

  /* Cargar output status cuando cambia la página o tab */
  useEffect(() => {
    if (tab !== "output") return;
    setLoadingOutput(true);
    setOutputStatus(null);
    fetch(`/api/studio/output-status/${selectedNum}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(setOutputStatus)
      .catch(() => setOutputStatus(null))
      .finally(() => setLoadingOutput(false));
  }, [selectedNum, tab]);

  const hasOutput = outputStatus?.hasOutput === true;

  return (
    <Layout title="Visual Atlas">
      <div className="flex h-full overflow-hidden bg-[#0a1220]">

        {/* ── Lista de páginas (izquierda) ─────────────────────────────── */}
        <aside className="w-52 bg-[#0d1629] border-r border-white/[0.05] flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">Visual Atlas · AI-200</p>
            <p className="text-[8px] text-white/30 mt-0.5">61 páginas · Batch 01–10 activo</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {PAGES.map(p => {
              const active = p.num === selectedNum;
              return (
                <button key={p.num} onClick={() => { setSelectedNum(p.num); setTab("output"); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-white/[0.04] flex items-start gap-2.5 transition-all",
                    active ? "bg-blue-500/10 border-l-2 border-l-blue-400 pl-[10px]" : "border-l-2 border-l-transparent hover:bg-white/[0.03]"
                  )}>
                  <span className="text-[8px] font-bold text-white/25 font-mono mt-0.5 w-4 shrink-0">{p.num}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[9px] leading-snug line-clamp-2", active ? "text-white/85" : "text-white/45")}>
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {groundingDot(p.groundingStatus)}
                      <span className="text-[7px] text-white/20 capitalize">{p.groundingStatus}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {/* Páginas 11–61 */}
            <div className="px-3 py-3 border-t border-white/[0.04]">
              <p className="text-[7px] text-white/15 italic">
                Páginas 11–61 — contenido en preparación
              </p>
            </div>
          </div>
        </aside>

        {/* ── Detalle de página (derecha) ──────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Header de página */}
          <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 shrink-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider">Pág. {page.num}</span>
                <span className="text-white/10">·</span>
                <span className="text-[7px] text-[#0078d4]/50">{page.domain}</span>
                <span className="text-white/10">·</span>
                <span className="text-[7px] text-white/20">Contrato {page.contractVersion}</span>
              </div>
              <h2 className="text-sm font-bold text-white/85 truncate">{page.title}</h2>
            </div>

            {/* Acción primaria única */}
            <button onClick={() => setLocation("/generacion")}
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-sm text-[10px] font-bold transition-all shrink-0",
                page.num === "01"
                  ? "bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white"
                  : "bg-white/[0.04] border border-white/10 text-white/30 cursor-not-allowed"
              )}
              disabled={page.num !== "01"}>
              <Sparkles className="w-3 h-3" />
              {page.num === "01" ? "Generar página 01" : "Próximamente"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/[0.06] bg-[#0d1629] shrink-0">
            {([["output", "Output real"], ["contenido", "Contenido editorial"]] as [Tab, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn(
                  "px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                  tab === id ? "border-b-2 border-blue-400 text-blue-300 bg-blue-500/5" : "text-white/25 hover:text-white/50"
                )}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab: Output real ── */}
          {tab === "output" && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-3xl space-y-5">
                {loadingOutput ? (
                  <div className="flex items-center gap-2 py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                    <span className="text-[10px] text-white/30">Verificando output en disco…</span>
                  </div>
                ) : (() => {
                  const runState = computeRunState(outputStatus);

                  /* ── Sin output ── */
                  if (runState === "no_output") return (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 px-4 py-4 bg-white/[0.02] border border-white/[0.06] rounded-sm">
                        <Clock className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-bold text-white/45">Sin output generado todavía</p>
                          <p className="text-[9px] text-white/30 mt-1 leading-relaxed">
                            {page.num === "01"
                              ? "Siguiente paso: generar página 01 con OpenAI."
                              : `La generación de la página ${page.num} se habilitará en batch una vez que página 01 esté aprobada.`}
                          </p>
                        </div>
                      </div>
                      {page.num === "01" && (
                        <button onClick={() => setLocation("/generacion")}
                          className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all">
                          <Sparkles className="w-3.5 h-3.5" />Generar página 01
                        </button>
                      )}
                    </div>
                  );

                  /* ── HTML faltante ── */
                  if (runState === "failed_no_html") return (
                    <div className="flex items-start gap-3 px-4 py-4 bg-red-500/8 border border-red-500/20 rounded-sm">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-red-300">Generación incompleta — sin page.html válido</p>
                        <p className="text-[9px] text-white/35 mt-1">
                          Los metadatos indican que existe un run pero no hay HTML renderizable. Regenerar para obtener salida válida.
                        </p>
                      </div>
                    </div>
                  );

                  /* ── Legacy fallback (solo SVG) ── */
                  if (runState === "legacy_fallback") return (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-amber-300">Fallback no válido para aprobación</p>
                          <p className="text-[9px] text-white/40 mt-1 leading-relaxed">
                            Este run es de una generación anterior con SVG fallback. No cumple el golden master v24.
                            Regenerar para obtener el HTML 768×1152 con visual real.
                          </p>
                        </div>
                      </div>
                      <button onClick={() => setLocation("/generacion")}
                        className="flex items-center gap-2 h-8 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all">
                        <Sparkles className="w-3.5 h-3.5" />Regenerar con golden master
                      </button>
                    </div>
                  );

                  /* ── Output válido (success_with_real / placeholder) ── */
                  const isRealVisual = runState === "success_with_real_upper_visual";
                  const htmlPath = outputStatus!.htmlPath;

                  return (
                    <>
                      {/* ── Banner de estado ── */}
                      <div className={cn(
                        "flex items-start gap-3 px-4 py-3 rounded-sm border",
                        isRealVisual ? "bg-emerald-500/8 border-emerald-500/20" : "bg-blue-500/8 border-blue-500/20"
                      )}>
                        <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0",
                          isRealVisual ? "text-emerald-400" : "text-blue-400")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-[10px] font-bold",
                              isRealVisual ? "text-emerald-300" : "text-blue-300")}>
                              {isRealVisual
                                ? "success_with_real_upper_visual"
                                : "success_with_placeholder_visual"}
                            </p>
                            <span className="text-[7px] font-bold px-1.5 py-px border rounded-sm bg-white/5 border-white/10 text-white/30">
                              golden_master_v24
                            </span>
                          </div>
                          {outputStatus!.generatedAt && (
                            <p className="text-[9px] text-white/35 mt-0.5">
                              {new Date(outputStatus!.generatedAt).toLocaleString("es-ES", {
                                day: "2-digit", month: "long", year: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          )}
                          {/* Chips de archivos */}
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <Chip label="HTML 768×1152" ok={outputStatus!.files.html} />
                            <Chip label="Metadata" ok={outputStatus!.files.metadata} />
                            <Chip label="QA Report" ok={outputStatus!.files.qaReport} />
                            {isRealVisual
                              ? <Chip label="Visual gpt-image-2" ok={outputStatus!.files.upperVisual} />
                              : <Chip label="Visual placeholder" ok />
                            }
                            <span className="text-[7px] font-bold px-1.5 py-px border rounded-sm bg-red-500/5 border-red-500/15 text-red-400/60">
                              SVG fallback: deshabilitado
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── Botones de exportación ── */}
                      <div className="flex flex-wrap gap-2">
                        {htmlPath && (
                          <a href={htmlPath} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/25 text-emerald-300 text-[9px] font-bold rounded-sm transition-all">
                            <ExternalLink className="w-3 h-3" />Abrir HTML
                          </a>
                        )}
                        {htmlPath && (
                          <a href={htmlPath} download={`page-${page.num}.html`}
                            className="flex items-center gap-1.5 h-8 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white/80 text-[9px] font-bold rounded-sm transition-all">
                            <Download className="w-3 h-3" />Descargar HTML
                          </a>
                        )}
                        {outputStatus!.files.qaReport && (
                          <a href={`/api/studio/qa-report/${page.num}`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white/80 text-[9px] font-bold rounded-sm transition-all">
                            <FileText className="w-3 h-3" />QA Report
                          </a>
                        )}
                        {outputStatus!.files.upperVisual ? (
                          <a href={`/assets/cloudbooks/ai-200/visual-atlas/pages/${page.num}/upper-visual.png`}
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 h-8 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/50 hover:text-white/80 text-[9px] font-bold rounded-sm transition-all">
                            <Image className="w-3 h-3" />Visual PNG
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 h-8 px-3 border border-white/[0.06] text-white/20 text-[9px] rounded-sm">
                            <Image className="w-3 h-3" />Visual PNG pendiente
                          </span>
                        )}
                        <button onClick={() => setLocation("/qa/1")}
                          className="flex items-center gap-1.5 h-8 px-3 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/20 text-blue-300 text-[9px] font-bold rounded-sm transition-all">
                          <Shield className="w-3 h-3" />Revisar QA
                        </button>
                        <button onClick={() => setLocation("/generacion")}
                          className="flex items-center gap-1.5 h-8 px-3 border border-white/10 text-white/35 hover:text-white/60 hover:border-white/20 text-[9px] font-medium rounded-sm transition-all">
                          Regenerar
                        </button>
                      </div>

                      {/* ── Preview iframe del page.html 768×1152 ── */}
                      {htmlPath && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-3 h-3 text-white/20" />
                            <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                              Preview — página libro 768×1152
                            </p>
                            <span className={cn(
                              "text-[7px] px-1.5 py-px rounded-sm border font-bold",
                              isRealVisual
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {isRealVisual ? "VISUAL REAL" : "VISUAL PLACEHOLDER"}
                            </span>
                          </div>
                          {/* Contenedor con proporción 768:1152 = 2:3 */}
                          <div
                            className="rounded-sm border border-white/10 overflow-hidden bg-white relative"
                            style={{ width: 320, height: 480 }}
                          >
                            <iframe
                              src={htmlPath}
                              title={`Página ${page.num} — golden master v24`}
                              scrolling="no"
                              style={{
                                width: 768,
                                height: 1152,
                                transform: "scale(0.4167)",
                                transformOrigin: "top left",
                                border: "none",
                                pointerEvents: "none",
                              }}
                            />
                          </div>
                          <p className="text-[7px] text-white/20 mt-1.5">
                            Escala 41.7% · Abrir en pestaña para tamaño real
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Tab: Contenido editorial ── */}
          {tab === "contenido" && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="max-w-2xl space-y-4">

                {/* Objetivo de examen */}
                <Section title="Objetivo de examen">
                  <p className="text-[10px] text-white/65 leading-relaxed">{page.examObjective}</p>
                </Section>

                {/* Contexto */}
                <Section title="Contexto base">
                  <p className="text-[10px] text-white/55 leading-relaxed">{page.contexto}</p>
                </Section>

                {/* Conceptos clave */}
                <Section title="Conceptos clave">
                  <div className="flex flex-wrap gap-1.5">
                    {page.conceptos.map(c => (
                      <span key={c} className="text-[9px] bg-blue-500/10 text-blue-300/70 border border-blue-500/15 px-2 py-0.5 rounded-sm font-mono">
                        {c}
                      </span>
                    ))}
                  </div>
                </Section>

                {/* Trampas de examen */}
                <Section title="Trampas de examen">
                  <ul className="space-y-1.5">
                    {page.trampas.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400/50 shrink-0 mt-0.5" />
                        <span className="text-[9px] text-white/50 leading-snug">{t}</span>
                      </li>
                    ))}
                  </ul>
                </Section>

                {/* Fuentes */}
                <Section title="Fuentes de grounding">
                  <div className="flex items-center gap-2 mb-2">
                    {groundingDot(page.groundingStatus)}
                    <span className={cn("text-[8px] font-bold",
                      page.groundingStatus === "verified" ? "text-emerald-400/70" :
                      page.groundingStatus === "partial" ? "text-amber-400/70" : "text-white/25"
                    )}>
                      {page.groundingStatus === "verified" ? "Verificado" :
                       page.groundingStatus === "partial" ? "Parcialmente verificado" : "Pendiente"}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {page.sources.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <FileText className="w-2.5 h-2.5 text-white/15 shrink-0" />
                        <span className="text-[9px] text-white/35">{s}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
      <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function Chip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={cn(
      "text-[7px] font-bold px-1.5 py-px rounded-sm border",
      ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/25 border-white/10"
    )}>
      {ok ? `${label} ✓` : label}
    </span>
  );
}
