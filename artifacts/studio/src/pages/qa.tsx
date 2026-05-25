import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import {
  CheckCircle2, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight,
  Shield, Loader2, ExternalLink, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RealQA {
  verdict: string;
  scores: Record<string, number>;
  observations: string[];
  redTeamLog: string[];
  generatedAt: string | null;
  generationMode: "openai" | "fallback_html" | "none";
}

interface OutputStatus {
  hasOutput: boolean;
  generationMode: "openai" | "fallback_html" | "none";
  generatedAt: string | null;
  files: { html: boolean; metadata: boolean; qaReport: boolean; previewPng: boolean; previewSvg: boolean };
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

function getToken() { return localStorage.getItem("studio_token") ?? ""; }

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
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then((d: OutputStatus | null) => {
        setOutputStatus(d);
        if (d?.hasOutput && d.files.qaReport) {
          return fetch(`/api/studio/qa-report/${pageNum}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }).then(r => r.ok ? r.json() : null).then(setRealQA);
        }
        return undefined;
      })
      .catch(() => setOutputStatus(null))
      .finally(() => setLoadingStatus(false));
  }, [pageNum]);

  function handleApprove() {
    setApproving(true);
    approvePage(pageNum);
    toast({ title: "Página aprobada", description: `Pág. ${pageNum} lista para exportación` });
    setTimeout(() => setApproving(false), 800);
  }

  function handleRevision() {
    requestRevision(pageNum, revisionComment || "Corrección solicitada desde panel QA");
    setShowRevision(false);
    setRevisionComment("");
    toast({ title: "Corrección solicitada", description: `Pág. ${pageNum} devuelta para corrección` });
  }

  const hasOutput = outputStatus?.hasOutput === true;

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
                {/* Acción principal */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Siguiente acción</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {page?.status === "approved" ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-300">Página aprobada</span>
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
                    <button onClick={() => setLocation("/generacion")}
                      className="flex items-center gap-1.5 h-8 px-2.5 border border-white/10 rounded-sm text-[10px] text-white/40 hover:text-white/70 hover:border-white/20 transition-all ml-auto">
                      <RotateCcw className="w-3 h-3" />Regenerar
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

                {/* Preview y links */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Preview real */}
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Preview real</p>
                      <span className={cn(
                        "text-[7px] px-1.5 py-px rounded-sm border font-bold",
                        outputStatus.generationMode === "openai"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}>
                        {outputStatus.generationMode === "openai" ? "REAL OUTPUT" : "SVG FALLBACK"}
                      </span>
                    </div>
                    {outputStatus.previewPath ? (
                      <img src={outputStatus.previewPath} alt="Preview real"
                        className="w-full h-auto rounded-sm border border-white/[0.06]"
                        style={{ aspectRatio: "8.5/11", objectFit: "contain" }} />
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-[#0a1220] border border-white/[0.05] rounded-sm">
                        <p className="text-[9px] text-white/20">Sin preview disponible</p>
                      </div>
                    )}
                    {outputStatus.htmlPath && (
                      <a href={outputStatus.htmlPath} target="_blank" rel="noreferrer"
                        className="mt-2 flex items-center gap-1.5 text-[8px] text-blue-400/60 hover:text-blue-400 transition-colors">
                        <ExternalLink className="w-2.5 h-2.5" />Ver HTML completo
                      </a>
                    )}
                  </div>

                  {/* QA scores del reporte real */}
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Score por dimensión</p>
                    {realQA ? (
                      <div className="space-y-2.5">
                        {QA_DIMS.map(dim => {
                          const val = (realQA.scores[dim.key] ?? 0) * 10;
                          return (
                            <div key={dim.key}>
                              <div className="flex justify-between mb-0.5">
                                <span className="text-[9px] text-white/50">{dim.label}</span>
                                <span className={cn("text-[9px] font-bold", scoreColorDark(val))}>
                                  {val.toFixed(1)}
                                </span>
                              </div>
                              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full",
                                  val >= 95 ? "bg-emerald-500" : val >= 90 ? "bg-teal-500" : val >= 75 ? "bg-amber-400" : "bg-red-400"
                                )} style={{ width: `${Math.min(100, val)}%` }} />
                              </div>
                            </div>
                          );
                        })}

                        {/* Veredicto */}
                        <div className={cn(
                          "mt-3 px-3 py-2 rounded-sm border text-[10px] font-semibold",
                          realQA.verdict === "approved"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                            : "bg-amber-500/10 border-amber-500/25 text-amber-300"
                        )}>
                          {realQA.verdict === "approved"
                            ? "✓ Lista para aprobación editorial"
                            : "⚠ Revisar antes de aprobar"}
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                        <XCircle className="w-5 h-5 text-white/10 mx-auto mb-2" />
                        <p className="text-[9px] text-white/25">QA report no disponible desde API</p>
                        <p className="text-[8px] text-white/15 mt-0.5">
                          El archivo qa-report.md existe en disco pero no hay endpoint de parsing.
                        </p>
                      </div>
                    )}
                  </div>
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
