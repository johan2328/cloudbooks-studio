import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn, statusColorDark, statusLabel, scoreColorDark, formatDateTime } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import {
  CheckCircle2, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight,
  ShieldCheck, Shield, Eye, Loader2, History,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QA_DIMS = [
  { key: "artDirection",         label: "Dirección de Arte",      desc: "Composición, grid 8px, alineación, jerarquía visual" },
  { key: "editorialConsistency", label: "Consistencia Editorial", desc: "Iconografía uniforme, paleta correcta, tipografía" },
  { key: "readability",          label: "Legibilidad",            desc: "Tamaño de texto, contraste, claridad de lectura" },
  { key: "technicalAccuracy",    label: "Precisión Técnica",      desc: "Correctitud de conceptos, terminología Microsoft" },
  { key: "density",              label: "Densidad útil",          desc: "Relación información relevante / espacio utilizado" },
  { key: "commercialRisk",       label: "Riesgo comercial",       desc: "Ausencia de copy comercial o lenguaje de venta" },
  { key: "total",                label: "QA Total",               desc: "Score compuesto ponderado · Red team objetivo ≥ 9.5" },
] as const;

const DEFECT_TYPES = [
  { id: "icon_variance",    label: "Varianza iconográfica",   desc: "Iconos de distinta familia en la misma página" },
  { id: "type_drift",       label: "Alteración tipográfica",  desc: "Tamaños o pesos de fuente que rompen la jerarquía" },
  { id: "label_dup",        label: "Duplicación de etiquetas",desc: "Mismo concepto aparece dos veces con nombres distintos" },
  { id: "empty_gap",        label: "Huecos no informativos",  desc: "Espacio vacío sin propósito narrativo" },
  { id: "title_conflict",   label: "Título compite con diagrama", desc: "El título visual eclipsa el diagrama o viceversa" },
  { id: "crop",             label: "Recorte de elementos",   desc: "Texto o iconos cortados por borde de página" },
  { id: "color_incoherence",label: "Incoherencia cromática",  desc: "Colores fuera del sistema de paleta del atlas" },
  { id: "autocheck_repeat", label: "Autocheck repetido",      desc: "La respuesta correcta es idéntica a una opción incorrecta" },
];

export default function QAPage() {
  const [, params] = useRoute("/qa/:id");
  const pageNum = params?.id ? String(parseInt(params.id, 10)).padStart(2, "0") : "01";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { state, executeQA, approvePage, requestRevision, regenerateSelective, getPage, getQAForPage, getRunsForPage } = useStudio();

  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [checkedDefects, setCheckedDefects] = useState<Set<string>>(new Set());
  const [qaRunning, setQaRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"qa" | "historial">("qa");

  const page = getPage(pageNum);
  const qa   = getQAForPage(pageNum);
  const runs = getRunsForPage(pageNum);
  const currentPageNum = parseInt(pageNum, 10);

  function handleRunQA() {
    setQaRunning(true);
    executeQA(pageNum);
    setTimeout(() => setQaRunning(false), 2500);
    toast({ title: "QA ejecutado", description: `Página ${pageNum} — análisis completado` });
  }

  function handleApprove() {
    approvePage(pageNum);
    toast({ title: "Página aprobada", description: `Pág. ${pageNum} marcada como aprobada — lista para exportación` });
  }

  function handleRevision() {
    requestRevision(pageNum, revisionComment || "Corrección solicitada desde panel QA");
    setShowRevisionInput(false);
    setRevisionComment("");
    toast({ title: "Corrección solicitada", description: `Pág. ${pageNum} devuelta para corrección` });
  }

  function handleRegen() {
    regenerateSelective(pageNum);
    toast({ title: "Regeneración selectiva iniciada", description: `Pág. ${pageNum} — nueva versión en proceso` });
  }

  function toggleDefect(id: string) {
    setCheckedDefects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canApprove = page?.status === "qa_review";
  const canRegen   = page?.status === "needs_revision" || page?.status === "qa_review" || page?.status === "qa_pending";

  if (!page) {
    return (
      <Layout title="QA y Aprobación">
        <div className="flex items-center justify-center h-full bg-[#0a1220]">
          <p className="text-sm text-white/25">Página {pageNum} no encontrada en el store</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="QA y Aprobación">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Topbar ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-2.5 flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button onClick={() => setLocation("/biblioteca")}
              className="text-white/20 hover:text-white/60 transition-colors shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">QA · Pág. {pageNum}</span>
                <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-sm border", statusColorDark(page.status))}>
                  {statusLabel(page.status)}
                </span>
                <span className="text-[8px] text-white/15">Versión {page.currentVersion}</span>
              </div>
              <p className="text-xs font-bold text-white/75 truncate">{page.title}</p>
            </div>
          </div>

          {/* Nav pages */}
          <div className="flex items-center gap-1 shrink-0">
            {currentPageNum > 1 && (
              <button onClick={() => setLocation(`/qa/${currentPageNum - 1}`)}
                className="text-[9px] text-white/25 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                <ChevronLeft className="w-3 h-3" />Ant.
              </button>
            )}
            {currentPageNum < 10 && (
              <button onClick={() => setLocation(`/qa/${currentPageNum + 1}`)}
                className="text-[9px] text-white/25 hover:text-white/60 flex items-center gap-0.5 transition-colors">
                Sig.<ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Score */}
          {page.qaScore != null && (
            <div className="text-center shrink-0">
              <p className={cn("text-lg font-black tabular-nums leading-none", scoreColorDark(page.qaScore))}>
                {page.qaScore.toFixed(1)}
              </p>
              <p className="text-[7px] text-white/20">Score QA</p>
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-white/[0.06] bg-[#0d1629] shrink-0">
          {([["qa", "QA y Aprobación"], ["historial", "Historial de runs"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={cn(
                "px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                activeTab === id ? "border-b-2 border-blue-400 text-blue-300 bg-blue-500/5" : "text-white/25 hover:text-white/50"
              )}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === "qa" && (
            <div className="flex h-full overflow-hidden">
              {/* ── Panel izquierdo: diagnóstico ── */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-w-xl">

                {/* Acciones */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Acciones de aprobación</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={handleRunQA} disabled={qaRunning}
                      className="flex items-center gap-1.5 h-8 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-sm text-[10px] font-semibold text-blue-300 transition-all disabled:opacity-40">
                      {qaRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                      {qaRunning ? "Ejecutando QA…" : "Ejecutar QA"}
                    </button>
                    <button onClick={handleApprove} disabled={!canApprove}
                      className="flex items-center gap-1.5 h-8 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-sm text-[10px] font-semibold text-emerald-300 transition-all disabled:opacity-30">
                      <CheckCircle2 className="w-3 h-3" />Aprobar página
                    </button>
                    <button onClick={() => setShowRevisionInput(v => !v)}
                      className="flex items-center gap-1.5 h-8 px-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 rounded-sm text-[10px] font-semibold text-amber-300/80 transition-all">
                      <AlertTriangle className="w-3 h-3" />Solicitar corrección
                    </button>
                    <button onClick={handleRegen} disabled={!canRegen}
                      className="flex items-center gap-1.5 h-8 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[10px] font-semibold text-white/40 transition-all disabled:opacity-30">
                      <RotateCcw className="w-3 h-3" />Regenerar selectivo
                    </button>
                  </div>

                  {showRevisionInput && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={revisionComment}
                        onChange={e => setRevisionComment(e.target.value)}
                        placeholder="Describe el problema a corregir…"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-3 py-2 text-[10px] text-white/70 placeholder:text-white/20 resize-none h-16 focus:outline-none focus:border-amber-500/40"
                      />
                      <button onClick={handleRevision}
                        className="h-7 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-sm text-[9px] font-bold text-amber-300 transition-all">
                        Confirmar corrección
                      </button>
                    </div>
                  )}
                </div>

                {/* QA Score dims */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Score por dimensión</p>
                  <div className="space-y-2.5">
                    {QA_DIMS.map(dim => {
                      const val = qa?.dimensions?.[dim.key as keyof typeof qa.dimensions] ?? page.qaScore ?? 0;
                      const pct = Math.min(100, (val / 100) * 100);
                      return (
                        <div key={dim.key}>
                          <div className="flex justify-between mb-0.5">
                            <span className="text-[9px] text-white/50 font-medium">{dim.label}</span>
                            <span className={cn("text-[9px] font-bold tabular-nums", scoreColorDark(val))}>{val.toFixed(1)}</span>
                          </div>
                          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all", val >= 95 ? "bg-emerald-500" : val >= 90 ? "bg-teal-500" : val >= 75 ? "bg-amber-400" : "bg-red-400")}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[7px] text-white/20 mt-0.5">{dim.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Defect checklist */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">
                    Checklist de defectos
                    {checkedDefects.size > 0 && (
                      <span className="ml-2 text-amber-400">· {checkedDefects.size} marcados</span>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {DEFECT_TYPES.map(defect => {
                      const fromQA = qa?.defectsFound?.includes(defect.id);
                      const checked = checkedDefects.has(defect.id) || fromQA;
                      return (
                        <label key={defect.id}
                          className={cn(
                            "flex items-start gap-2.5 px-3 py-2 rounded-sm border cursor-pointer transition-all",
                            checked
                              ? "bg-amber-500/8 border-amber-500/20"
                              : "bg-white/[0.02] border-white/[0.05] hover:border-white/10"
                          )}>
                          <input type="checkbox" checked={checked} onChange={() => toggleDefect(defect.id)}
                            className="mt-0.5 shrink-0 accent-amber-400" />
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-[10px] font-semibold", checked ? "text-amber-300" : "text-white/50")}>{defect.label}</p>
                            <p className="text-[8px] text-white/25 leading-snug">{defect.desc}</p>
                          </div>
                          {fromQA && <span className="text-[7px] text-amber-400/60 shrink-0">Auto</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Panel derecho: preview + observaciones ── */}
              <div className="w-72 border-l border-white/[0.06] flex flex-col bg-[#0d1629] overflow-hidden shrink-0">
                {/* Preview */}
                <div className="p-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Eye className="w-3 h-3 text-white/20" />
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Preview editorial</p>
                  </div>
                  <div className="aspect-[4/3] bg-[#0a1220] rounded-sm border border-white/[0.06] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full p-2 flex flex-col text-[5px] text-white/30 space-y-1">
                      <div className="h-3 rounded-sm flex items-center px-1.5 gap-1" style={{ backgroundColor: "#0078d420" }}>
                        <span className="font-black text-[#0078d4]/70">ACR · #{pageNum}</span>
                        <span className="ml-auto text-white/20">{page.contractVersion}</span>
                      </div>
                      <div className="font-bold text-[6px] text-white/50 line-clamp-1">{page.title}</div>
                      {[70, 55, 85, 60, 45].map((w,i) => (
                        <div key={i} className="h-px bg-white/10 rounded-full" style={{ width: `${w}%` }} />
                      ))}
                      <div className="flex gap-1 flex-1 mt-1">
                        <div className="flex-1 bg-blue-500/10 rounded-sm" />
                        <div className="flex-1 bg-teal-500/10 rounded-sm" />
                      </div>
                      <div className="h-3 bg-teal-500/10 rounded-sm border border-teal-500/20 flex items-center px-1 gap-1">
                        <span className="text-teal-400/60 font-bold">Autocheck</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* QA report observations */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {qa && (
                    <>
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <ShieldCheck className="w-3 h-3 text-blue-400" />
                          <p className="text-[9px] font-bold text-white/30">Veredicto</p>
                        </div>
                        <div className={cn("px-3 py-2 rounded-sm border text-[10px] font-semibold", qa.verdict === "approved" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300" : "bg-amber-500/10 border-amber-500/25 text-amber-300")}>
                          {qa.verdict === "approved" ? "✓ Lista para aprobación editorial" : "⚠ Requiere corrección antes de aprobar"}
                        </div>
                      </div>

                      {qa.observations.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Observaciones</p>
                          <div className="space-y-1.5">
                            {qa.observations.map((obs, i) => (
                              <p key={i} className="text-[9px] text-white/45 leading-snug">· {obs}</p>
                            ))}
                          </div>
                        </div>
                      )}

                      {qa.redTeamLog.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Red team log</p>
                          <div className="space-y-1">
                            {qa.redTeamLog.map((entry, i) => (
                              <p key={i} className={cn("text-[8px] leading-snug font-mono", entry.startsWith("✓") ? "text-emerald-400/60" : "text-amber-400/60")}>
                                {entry}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {!qa && (
                    <div className="text-center py-8">
                      <Shield className="w-6 h-6 text-white/10 mx-auto mb-2" />
                      <p className="text-[9px] text-white/20">Sin reporte QA todavía</p>
                      <p className="text-[8px] text-white/15 mt-0.5">Ejecuta QA para ver el diagnóstico</p>
                    </div>
                  )}

                  {/* Contract info */}
                  <div className="border-t border-white/[0.05] pt-3">
                    <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Contrato editorial</p>
                    <div className="space-y-1 text-[8px] text-white/30">
                      <p>Versión: <span className="text-white/50">{page.contractVersion}</span></p>
                      <p>Score mínimo: <span className="text-amber-400">95/100</span></p>
                      <p>Grounding: <span className={page.groundingStatus === "verified" ? "text-emerald-400" : "text-amber-400"}>{page.groundingStatus}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "historial" && (
            <div className="overflow-y-auto h-full p-5 space-y-2 max-w-2xl">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-4">Runs de generación · Pág. {pageNum}</p>
              {runs.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-6 h-6 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/20">Sin runs de generación todavía</p>
                </div>
              ) : (
                runs.map(run => (
                  <div key={run.id} className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-white/20 font-mono">{run.version}</span>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded-sm font-semibold",
                          run.type === "selective_regeneration" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400")}>
                          {run.type === "selective_regeneration" ? "Regeneración selectiva" : "Generación completa"}
                        </span>
                        <span className={cn("text-[8px] px-1.5 py-0.5 rounded-sm font-semibold",
                          run.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>
                          {run.status === "completed" ? "Completada" : run.status}
                        </span>
                      </div>
                      <span className="text-[9px] text-white/20">{formatDateTime(run.createdAt)}</span>
                    </div>
                    {run.note && <p className="text-[9px] text-white/40 mb-2">{run.note}</p>}
                    {run.promptTokens && (
                      <div className="flex gap-4 text-[8px] text-white/20">
                        <span>Modelo: <span className="text-white/40 font-mono">{run.model}</span></span>
                        <span>Prompt: <span className="text-white/40">{run.promptTokens.toLocaleString()}</span></span>
                        <span>Completion: <span className="text-white/40">{run.completionTokens?.toLocaleString()}</span></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
