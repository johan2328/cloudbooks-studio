import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import {
  CheckCircle2, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight,
  Shield, Loader2, ExternalLink, XCircle, Download, FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RealQA {
  verdict: string;
  scores: Record<string, number>;
  observations: string[];
  redTeamLog: string[];
  generatedAt: string | null;
}

type GenerationMode = "openai_image" | "placeholder_image" | "fallback_html" | "none";

interface OutputStatus {
  hasOutput: boolean;
  generationMode: GenerationMode;
  generatedAt: string | null;
  approvedAt: string | null;
  files: {
    html: boolean; metadata: boolean; qaReport: boolean;
    upperVisual: boolean; previewPng: boolean; previewSvg: boolean;
    approved: boolean;
  };
  htmlPath: string | null;
  previewPath: string | null;
}

const QA_DIMS = [
  { key: "art_direction",         label: "Dirección de arte",       desc: "Composición, grid, jerarquía visual" },
  { key: "editorial_consistency", label: "Consistencia editorial",   desc: "Iconografía, paleta, tipografía" },
  { key: "readability",           label: "Legibilidad",             desc: "Tamaño, contraste, claridad" },
  { key: "technical_accuracy",    label: "Precisión técnica",       desc: "Correctitud de conceptos Microsoft" },
  { key: "useful_density",        label: "Densidad útil",           desc: "Info relevante / espacio" },
  { key: "commercial_risk",       label: "Riesgo comercial",        desc: "Sin copy de venta o lenguaje comercial" },
] as const;

const DEFECTS = [
  { id: "icon_variance",    label: "Varianza iconográfica" },
  { id: "type_drift",       label: "Alteración tipográfica" },
  { id: "label_dup",        label: "Duplicación de etiquetas" },
  { id: "empty_gap",        label: "Huecos no informativos" },
  { id: "title_conflict",   label: "Título compite con diagrama" },
  { id: "crop",             label: "Recorte de elementos" },
  { id: "color_incoherence",label: "Incoherencia cromática" },
];

function buildEditorialAssessment(args: {
  hasOutput: boolean;
  isRealVisual: boolean;
  serverApproved: boolean;
  realQA: RealQA | null;
}) {
  const { hasOutput, isRealVisual, serverApproved, realQA } = args;

  if (!hasOutput) {
    return {
      verdict: "Sin material evaluable",
      risk: "No se puede emitir criterio editorial hasta que exista HTML generado.",
      next: "Generar la pagina con el contrato Visual Atlas v24 antes de pasar por QA.",
      tone: "neutral" as const,
    };
  }

  if (!isRealVisual) {
    return {
      verdict: "Bloqueo editorial",
      risk: "La pagina usa placeholder visual. En una coleccion premium esto rompe la promesa comercial del Visual Atlas.",
      next: "Regenerar el upper visual con gpt-image-2 medium y volver a revisar encuadre, legibilidad y densidad.",
      tone: "danger" as const,
    };
  }

  if (serverApproved) {
    return {
      verdict: "Lista para exportacion",
      risk: "Riesgo bajo: el output tiene imagen real, QA registrado y aprobacion trazable.",
      next: "Mantener esta version como referencia comparativa para las siguientes paginas del batch.",
      tone: "success" as const,
    };
  }

  if (realQA?.verdict === "approved") {
    return {
      verdict: "Aprobable con revision humana",
      risk: "Riesgo moderado: el servidor no bloquea, pero conviene revisar criterio visual, equilibrio de espacios y precision tecnica.",
      next: "Aprobar si la lectura a tamano real sostiene jerarquia, consistencia iconografica y claridad de examen.",
      tone: "success" as const,
    };
  }

  return {
    verdict: "Requiere mirada editorial",
    risk: "Riesgo medio: faltan criterios suficientes para llevarla a produccion sin una revision dirigida.",
    next: "Marcar defectos visibles y solicitar correccion con una indicacion concreta, no regeneracion abierta.",
    tone: "warning" as const,
  };
}

function getToken() { return localStorage.getItem("studio_token") ?? ""; }
function authHdr() { return { Authorization: `Bearer ${getToken()}` }; }

export default function QAPage() {
  const [, params] = useRoute("/qa/:id");
  const pageNum = params?.id ? String(parseInt(params.id, 10)).padStart(2, "0") : "01";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { approvePage, requestRevision, getPage } = useStudio();

  const page = getPage(pageNum);
  const currentNum = parseInt(pageNum, 10);

  const [outputStatus, setOutputStatus] = useState<OutputStatus | null>(null);
  const [realQA, setRealQA] = useState<RealQA | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [revisionComment, setRevisionComment] = useState("");
  const [showRevision, setShowRevision] = useState(false);
  const [checkedDefects, setCheckedDefects] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    setLoadingStatus(true);
    setRealQA(null);
    fetch(`/api/studio/output-status/${pageNum}`, {
      headers: authHdr(),
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: OutputStatus | null) => {
        setOutputStatus(d);
        if (d?.hasOutput && d.files.qaReport) {
          return fetch(`/api/studio/qa-report/${pageNum}`, {
            headers: authHdr(),
          }).then(r => r.ok ? r.json() : null).then(setRealQA);
        }
        return undefined;
      })
      .catch(() => setOutputStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [pageNum]);

  /**
   * Aprobación real: primero valida contra el servidor (que chequea
   * generationMode === "openai_image" y escribe approval.json).
   * Solo actualiza el estado local después de confirmación del servidor.
   * El gate approvalBlocked también se verifica aquí — no solo en la UI.
   */
  async function handleApprove() {
    if (approvalBlocked) {
      toast({
        title: "Aprobación bloqueada",
        description: "El upper visual es un placeholder. Genera imagen real con gpt-image-2 medium primero.",
        variant: "destructive",
      });
      return;
    }

    setApproving(true);
    try {
      const res = await fetch(`/api/studio/approve-page/${pageNum}`, {
        method: "POST",
        headers: authHdr(),
      });

      if (!res.ok) {
        const err = await res.json() as { error: string };
        toast({
          title: "Aprobación rechazada por el servidor",
          description: err.error ?? `Error ${res.status}`,
          variant: "destructive",
        });
        return;
      }

      const data = await res.json() as { approvedAt: string };
      approvePage(pageNum, data.approvedAt);
      toast({
        title: "Página aprobada ✓",
        description: `Pág. ${pageNum} aprobada · ${data.approvedAt.slice(0, 10)} · lista para exportación`,
      });
      setOutputStatus(prev => prev ? { ...prev, files: { ...prev.files, approved: true }, approvedAt: data.approvedAt } : prev);
    } catch {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar al servidor de aprobación.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  }

  function handleRevision() {
    requestRevision(pageNum, revisionComment || "Corrección solicitada desde panel QA");
    setShowRevision(false);
    setRevisionComment("");
    toast({ title: "Corrección solicitada", description: `Pág. ${pageNum} devuelta para corrección` });
  }

  const hasOutput      = outputStatus?.hasOutput === true;
  const isRealVisual   = outputStatus?.generationMode === "openai_image";
  const isPlaceholder  = !isRealVisual && hasOutput;
  const approvalBlocked = !isRealVisual;
  const serverApproved = outputStatus?.files.approved === true;
  const editorialAssessment = buildEditorialAssessment({ hasOutput, isRealVisual, serverApproved, realQA });

  return (
    <Layout title={`QA · Pág. ${pageNum}`}>
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* Topbar */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-2.5 flex items-center gap-3 shrink-0">
          <button onClick={() => setLocation("/biblioteca")}
            className="text-white/20 hover:text-white/60 transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">
              QA y Aprobación · Pág. {pageNum}
            </p>
            <p className="text-xs font-bold text-white/70 truncate">
              {page?.title ?? `Página ${pageNum}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {currentNum > 1 && (
              <button onClick={() => setLocation(`/qa/${currentNum - 1}`)}
                className="text-[9px] text-white/25 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                <ChevronLeft className="w-3 h-3" />Ant.
              </button>
            )}
            {currentNum < 61 && (
              <button onClick={() => setLocation(`/qa/${currentNum + 1}`)}
                className="text-[9px] text-white/25 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                Sig.<ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-3xl mx-auto space-y-4">

            {loadingStatus ? (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                <span className="text-[10px] text-white/30">Verificando output real…</span>
              </div>
            ) : !hasOutput ? (
              /* ── Sin output real ── */
              <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-6 text-center space-y-3">
                <Shield className="w-8 h-8 text-white/10 mx-auto" />
                <div>
                  <p className="text-sm font-bold text-white/40">Sin output real generado todavía</p>
                  <p className="text-[10px] text-white/25 mt-1 leading-relaxed">
                    El QA solo se puede hacer sobre output real. Genera la página primero.
                  </p>
                </div>
                <button onClick={() => setLocation("/generacion")}
                  className="inline-flex items-center gap-2 h-8 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all">
                  Ir a generar página {pageNum}
                </button>
              </div>
            ) : (
              /* ── Con output real ── */
              <>
                <div className={cn(
                  "bg-[#0d1629] border rounded-sm p-4",
                  editorialAssessment.tone === "danger" && "border-red-500/25",
                  editorialAssessment.tone === "warning" && "border-amber-500/20",
                  editorialAssessment.tone === "success" && "border-emerald-500/20",
                  editorialAssessment.tone === "neutral" && "border-white/[0.08]"
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border",
                      editorialAssessment.tone === "danger" && "bg-red-500/10 border-red-500/25 text-red-300",
                      editorialAssessment.tone === "warning" && "bg-amber-500/10 border-amber-500/20 text-amber-300",
                      editorialAssessment.tone === "success" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
                      editorialAssessment.tone === "neutral" && "bg-white/[0.03] border-white/[0.08] text-white/35"
                    )}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Dictamen editorial</p>
                      <p className="text-sm font-black text-white/80 mt-1">{editorialAssessment.verdict}</p>
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Riesgo</p>
                          <p className="text-[10px] text-white/55 leading-relaxed mt-1">{editorialAssessment.risk}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                          <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Siguiente accion</p>
                          <p className="text-[10px] text-white/55 leading-relaxed mt-1">{editorialAssessment.next}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloque de bloqueo — visible cuando hay placeholder */}
                {isPlaceholder && (
                  <div className="bg-red-950/30 border border-red-500/30 rounded-sm px-4 py-3 flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-red-300">Bloqueado: upper visual no premium</p>
                      <p className="text-[9px] text-red-400/70 mt-0.5">
                        El upper visual es un placeholder. Aprobación bloqueada hasta generar imagen real con gpt-image-2 medium.
                      </p>
                    </div>
                    <button onClick={() => setLocation("/generacion")}
                      className="shrink-0 flex items-center gap-1.5 h-7 px-3 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 rounded-sm text-[9px] font-bold text-white transition-all">
                      <RotateCcw className="w-3 h-3" />Generar upper visual premium
                    </button>
                  </div>
                )}

                {/* Acción principal */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Decisión editorial</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {serverApproved ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <div>
                          <span className="text-[10px] font-bold text-emerald-300">Página aprobada</span>
                          {outputStatus.approvedAt && (
                            <span className="text-[8px] text-emerald-400/50 ml-2">{outputStatus.approvedAt.slice(0, 10)}</span>
                          )}
                        </div>
                      </div>
                    ) : approvalBlocked ? (
                      <div className="flex items-center gap-2">
                        <button disabled
                          className="flex items-center gap-1.5 h-8 px-3 bg-white/5 border border-white/10 rounded-sm text-[10px] font-bold text-white/20 cursor-not-allowed">
                          <CheckCircle2 className="w-3 h-3" />Aprobar página
                        </button>
                        <span className="text-[8px] text-red-400/70">— bloqueado: upper visual no premium</span>
                      </div>
                    ) : (
                      <button onClick={handleApprove} disabled={approving}
                        className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-sm text-[10px] font-bold text-white transition-all disabled:opacity-50">
                        {approving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Aprobar página
                      </button>
                    )}
                    <button onClick={() => setShowRevision(v => !v)}
                      className="flex items-center gap-1.5 h-8 px-2.5 border border-white/10 rounded-sm text-[10px] text-white/40 hover:text-amber-400 hover:border-amber-500/30 transition-all">
                      <AlertTriangle className="w-3 h-3" />Solicitar corrección
                    </button>
                  </div>

                  {showRevision && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={revisionComment}
                        onChange={e => setRevisionComment(e.target.value)}
                        placeholder="Describe el problema a corregir…"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-3 py-2 text-[10px] text-white/70 placeholder:text-white/20 resize-none h-16 focus:outline-none focus:border-amber-500/40"
                      />
                      <div className="flex gap-2">
                        <button onClick={handleRevision}
                          className="h-7 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-sm text-[9px] font-bold text-amber-300 transition-all">
                          Confirmar corrección
                        </button>
                        <button onClick={() => setShowRevision(false)}
                          className="h-7 px-3 border border-white/10 rounded-sm text-[9px] text-white/30 hover:text-white/60 transition-all">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones de output — T6 */}
                {outputStatus.htmlPath && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={outputStatus.htmlPath} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all shadow-sm">
                      <ExternalLink className="w-3.5 h-3.5" />Abrir tamaño real
                    </a>
                    <a href={outputStatus.htmlPath} download={`page-${pageNum}.html`}
                      className="flex items-center gap-1.5 h-9 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.12] text-white/60 hover:text-white/90 text-[9px] font-bold rounded-sm transition-all">
                      <Download className="w-3 h-3" />Descargar HTML
                    </a>
                    {outputStatus.files.qaReport && (
                      <a href={`/api/studio/qa-report/${pageNum}`} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 h-9 px-3 border border-white/[0.08] text-white/35 hover:text-white/60 text-[9px] font-medium rounded-sm transition-all">
                        <FileText className="w-3 h-3" />QA Report
                      </a>
                    )}
                    <button onClick={() => setLocation("/generacion")}
                      className="flex items-center gap-1.5 h-9 px-3 border border-white/[0.07] text-white/20 hover:text-amber-400/60 hover:border-amber-500/20 text-[9px] font-medium rounded-sm transition-all ml-auto">
                      <RotateCcw className="w-3 h-3" />Regenerar
                    </button>
                  </div>
                )}

                {/* Preview página completa */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Preview página 768×1152</p>
                    <span className={cn(
                      "text-[7px] px-1.5 py-px rounded-sm border font-bold",
                      isRealVisual
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/25"
                    )}>
                      {isRealVisual ? "UPPER VISUAL REAL" : "UPPER VISUAL PLACEHOLDER"}
                    </span>
                  </div>
                  {outputStatus.htmlPath ? (
                    <div className="relative w-full overflow-hidden rounded-sm border border-white/[0.06] bg-white"
                      style={{ paddingBottom: "150%" }}>
                      <iframe
                        src={outputStatus.htmlPath}
                        className="absolute inset-0 w-full h-full border-0 origin-top-left"
                        style={{ transform: "scale(1)", transformOrigin: "top left" }}
                        title="Preview página completa"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-[#0a1220] border border-white/[0.05] rounded-sm py-8">
                      <p className="text-[9px] text-white/20">Sin preview HTML disponible</p>
                    </div>
                  )}
                </div>

                {/* Slot upper visual 728×494 */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                      Slot upper visual
                    </p>
                    <span className="text-[7px] px-1.5 py-px rounded-sm border border-white/10 text-white/30 font-bold">
                      728 × 494 px
                    </span>
                    {!isRealVisual && (
                      <span className="text-[7px] px-1.5 py-px rounded-sm border border-red-500/25 bg-red-500/10 text-red-400 font-bold">
                        PLACEHOLDER
                      </span>
                    )}
                  </div>
                  {outputStatus.previewPath ? (
                    <div className="w-full overflow-hidden rounded-sm border border-white/[0.06] bg-[#f8fafc]">
                      <img
                        src={outputStatus.previewPath}
                        alt="Upper visual 728×494"
                        className="w-full h-auto block"
                        style={{ aspectRatio: "728/494", objectFit: "contain" }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center bg-[#0a1220] border border-white/[0.05] rounded-sm"
                      style={{ aspectRatio: "728/494" }}>
                      <p className="text-[9px] text-white/20">Sin imagen generada</p>
                    </div>
                  )}
                  {!isRealVisual && (
                    <p className="mt-2 text-[8px] text-red-400/60">
                      Upper visual es placeholder. Regenerar con gpt-image-2 medium para obtener imagen premium.
                    </p>
                  )}
                </div>

                {/* QA scores del reporte real del servidor */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Score por dimensión</p>
                    {realQA && (
                      <span className="text-[7px] px-1.5 py-px rounded-sm border border-teal-500/20 bg-teal-500/8 text-teal-400/70 font-bold">
                        QA SERVIDOR
                      </span>
                    )}
                  </div>
                  {realQA ? (
                    <div className="space-y-2.5">
                      {QA_DIMS.map(dim => {
                        const val = (realQA.scores[dim.key] ?? 0) * 10;
                        return (
                          <div key={dim.key}>
                            <div className="flex justify-between mb-0.5">
                              <span className="text-[9px] text-white/50">{dim.label}</span>
                              <span className={cn("text-[9px] font-bold", scoreColorDark(val))}>
                                {val.toFixed(0)}/100
                              </span>
                            </div>
                            <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full",
                                val >= 90 ? "bg-emerald-500" : val >= 75 ? "bg-teal-500" : val >= 60 ? "bg-amber-400" : "bg-red-400"
                              )} style={{ width: `${Math.min(100, val)}%` }} />
                            </div>
                          </div>
                        );
                      })}

                      {/* Veredicto */}
                      <div className={cn(
                        "mt-3 px-3 py-2 rounded-sm border text-[10px] font-semibold",
                        isPlaceholder
                          ? "bg-red-500/10 border-red-500/25 text-red-300"
                          : realQA.verdict === "approved"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/25 text-amber-300"
                      )}>
                        {isPlaceholder
                          ? "🔴 Bloqueado — upper visual no premium"
                          : realQA.verdict === "approved"
                            ? "✓ Lista para aprobación editorial"
                            : "⚠ Requiere revisión visual antes de aprobar"}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <XCircle className="w-5 h-5 text-white/10 mx-auto mb-2" />
                      <p className="text-[9px] text-white/25">QA report no disponible — genera la página primero</p>
                    </div>
                  )}
                </div>

                {/* Checklist de defectos */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">
                    Checklist de defectos visuales
                    {checkedDefects.size > 0 && (
                      <span className="ml-2 text-amber-400 normal-case font-normal">· {checkedDefects.size} marcados</span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DEFECTS.map(d => {
                      const checked = checkedDefects.has(d.id);
                      return (
                        <label key={d.id} className={cn(
                          "flex items-center gap-2 px-2.5 py-2 rounded-sm border cursor-pointer transition-all",
                          checked ? "bg-amber-500/8 border-amber-500/20" : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                        )}>
                          <input type="checkbox" checked={checked}
                            onChange={() => setCheckedDefects(prev => {
                              const next = new Set(prev);
                              if (next.has(d.id)) next.delete(d.id); else next.add(d.id);
                              return next;
                            })}
                            className="shrink-0 accent-amber-400" />
                          <span className={cn("text-[9px] font-medium", checked ? "text-amber-300" : "text-white/45")}>
                            {d.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
