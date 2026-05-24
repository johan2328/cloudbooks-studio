import { useState } from "react";
import Layout from "@/components/Layout";
import { cn, statusColorDark, statusLabel, formatDateTime } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import { Play, Shield, CheckCircle2, Clock, AlertCircle, Loader2, Zap, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlowStep = "idle" | "preflight" | "generating" | "composing" | "qa_check" | "done" | "error";

const FLOW_STEPS: { key: FlowStep; label: string; duration: number }[] = [
  { key: "preflight",  label: "Preflight editorial",  duration: 1200 },
  { key: "generating", label: "Generación visual",    duration: 3500 },
  { key: "composing",  label: "Composición final",    duration: 1500 },
  { key: "qa_check",   label: "QA automático",        duration: 1000 },
  { key: "done",       label: "Completada",           duration: 0    },
];

export default function Generacion() {
  const [mode, setMode]               = useState<"page" | "batch">("page");
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch]   = useState<string>("Batch 01");
  const [flowStep, setFlowStep]       = useState<FlowStep>("idle");
  const [stepIndex, setStepIndex]     = useState(-1);
  const [progress, setProgress]       = useState(0);
  const { toast } = useToast();

  const { state, startGeneration, executeGrounding } = useStudio();

  const pages       = state.pages;
  const allRuns     = state.runs;
  const selectedPage = selectedPageId ? pages.find(p => p.id === selectedPageId) : null;
  const batchPages  = pages.filter(p => p.batch === selectedBatch);
  const selectedRuns = selectedPageId ? allRuns.filter(r => r.pageId === selectedPageId) : allRuns.slice(0, 10);

  const PREFLIGHT = [
    { key: "grounding", label: "Grounding verificado",         pass: selectedPage?.groundingStatus === "verified" },
    { key: "version",   label: "Versión base definida",        pass: !!selectedPage?.currentVersion },
    { key: "sources",   label: "Fuentes referenciadas",        pass: (selectedPage?.sources.length ?? 0) > 0 },
    { key: "contract",  label: "Contrato editorial asignado",  pass: !!selectedPage?.contractVersion },
    { key: "status",    label: "Estado habilitado para gen.",  pass: ["grounded","needs_revision","draft"].includes(selectedPage?.status ?? "") },
  ];
  const preflightOk    = PREFLIGHT.every(r => r.pass);
  const preflightScore = PREFLIGHT.filter(r => r.pass).length;

  function runFlow() {
    if (!selectedPageId) return;
    setFlowStep("preflight");
    setProgress(0);

    let idx = 0;
    const advance = () => {
      if (idx >= FLOW_STEPS.length - 1) {
        setFlowStep("done");
        setStepIndex(FLOW_STEPS.length - 1);
        setProgress(100);
        startGeneration(selectedPageId);
        toast({ title: "Generación completada", description: `Página ${selectedPageId} — nueva versión en QA pendiente` });
        return;
      }
      const step = FLOW_STEPS[idx];
      setFlowStep(step.key);
      setStepIndex(idx);
      setProgress(Math.round(((idx + 1) / (FLOW_STEPS.length - 1)) * 100));
      idx++;
      setTimeout(advance, step.duration);
    };
    advance();
  }

  function runBatch() {
    const eligible = batchPages.filter(p => p.groundingStatus === "verified");
    eligible.forEach((p, i) => setTimeout(() => startGeneration(p.id), i * 800));
    toast({ title: "Batch iniciado", description: `${eligible.length} páginas en Batch ${selectedBatch} — generación en cola` });
  }

  const isRunning = ["preflight", "generating", "composing", "qa_check"].includes(flowStep);

  const STATS = [
    { label: "Runs completados",  value: allRuns.filter(r => r.status === "completed").length, color: "text-emerald-400" },
    { label: "En cola / running", value: allRuns.filter(r => r.status === "running" || r.status === "queued").length, color: "text-violet-400" },
    { label: "Fallidos",          value: allRuns.filter(r => r.status === "failed").length, color: "text-red-400" },
    { label: "Páginas aprobadas", value: pages.filter(p => p.status === "approved" || p.status === "exported").length, color: "text-teal-400" },
  ];

  return (
    <Layout title="Producción / Generación">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 flex items-center gap-6 flex-wrap shrink-0">
          <div className="flex gap-2">
            {(["page", "batch"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn("h-7 px-3 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all",
                  mode === m ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "text-white/25 hover:text-white/50 border border-white/[0.06]")}>
                {m === "page" ? "Página individual" : "Batch completo"}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="ml-auto flex gap-6">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className={cn("text-sm font-black tabular-nums", s.color)}>{s.value}</p>
                <p className="text-[7px] text-white/20">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar selección ── */}
          <aside className="w-56 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
            <div className="p-3 border-b border-white/[0.06]">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">
                {mode === "page" ? "Seleccionar página" : "Seleccionar batch"}
              </p>
              {mode === "batch" && (
                <div className="space-y-px">
                  {["Batch 01","Batch 02","Batch 03","Batch 04","Batch 05"].map(b => (
                    <button key={b} onClick={() => setSelectedBatch(b)}
                      className={cn("w-full text-left px-2.5 py-1.5 rounded-sm text-[9px] font-medium transition-all",
                        selectedBatch === b ? "bg-blue-500/15 text-blue-300 border-l-2 border-blue-400 pl-2" : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]")}>
                      {b}
                      <span className="ml-2 text-[7px] text-white/20">
                        {pages.filter(p => p.batch === b).length}p.
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {(mode === "page" ? pages.slice(0, 10) : batchPages).map(p => (
                <button key={p.id} onClick={() => mode === "page" && setSelectedPageId(p.id)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-white/[0.04] flex items-center gap-2 transition-all",
                    selectedPageId === p.id ? "bg-blue-500/10 border-l-2 border-l-blue-400 pl-[10px]" : "hover:bg-white/[0.03] border-l-2 border-l-transparent"
                  )}>
                  <span className="text-[8px] font-bold text-white/20 font-mono w-5 shrink-0">#{p.id}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-white/60 truncate">{p.title}</p>
                    <span className={cn("text-[7px] font-semibold", statusColorDark(p.status).split(" ")[1])}>
                      {statusLabel(p.status)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preflight panel */}
            {mode === "page" && selectedPage && (
              <div className="p-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start gap-6">
                  {/* Preflight checks */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                        Preflight editorial — {preflightScore}/{PREFLIGHT.length}
                      </p>
                      <div className={cn("text-[8px] font-bold px-2 py-0.5 rounded-sm",
                        preflightOk ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>
                        {preflightOk ? "✓ Listo para generar" : "⚠ Verificar condiciones"}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PREFLIGHT.map(item => (
                        <div key={item.key} className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-sm border text-[9px]",
                          item.pass ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-300/80" : "bg-white/[0.03] border-white/[0.06] text-white/30")}>
                          {item.pass ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3 h-3 text-white/20 shrink-0" />}
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Run button */}
                  <div className="shrink-0 space-y-2">
                    <button onClick={runFlow} disabled={isRunning}
                      className={cn(
                        "flex items-center gap-2 h-10 px-5 rounded-sm text-xs font-bold transition-all",
                        isRunning ? "bg-violet-600/20 border border-violet-500/30 text-violet-300" :
                        "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500"
                      )}>
                      {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {isRunning ? "Generando…" : "Generar página"}
                    </button>
                    <p className="text-[8px] text-white/20 text-center">GPT-4o · Contrato {selectedPage.contractVersion}</p>
                  </div>
                </div>

                {/* Flow pipeline */}
                {flowStep !== "idle" && (
                  <div className="mt-4 flex items-center gap-1 overflow-x-auto">
                    {FLOW_STEPS.map((step, i) => {
                      const isDone  = i < stepIndex || flowStep === "done";
                      const isActive = i === stepIndex && flowStep !== "done";
                      return (
                        <div key={step.key} className="flex items-center gap-1 shrink-0">
                          <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-medium border transition-all",
                            isDone    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            isActive  ? "bg-violet-500/15 border-violet-500/30 text-violet-300 animate-pulse" :
                                        "bg-white/[0.03] border-white/[0.06] text-white/20")}>
                            {isDone ? <CheckCircle2 className="w-3 h-3" /> : isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                            {step.label}
                          </div>
                          {i < FLOW_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-white/10 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Batch mode */}
            {mode === "batch" && (
              <div className="p-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white/70">{selectedBatch}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      {batchPages.filter(p => p.groundingStatus === "verified").length} páginas con grounding verificado de {batchPages.length} totales
                    </p>
                  </div>
                  <button onClick={runBatch}
                    className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold rounded-sm hover:from-blue-500 hover:to-violet-500">
                    <Zap className="w-3.5 h-3.5" />Generar batch
                  </button>
                </div>
              </div>
            )}

            {/* Runs history */}
            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">
                {selectedPageId ? `Historial · Pág. ${selectedPageId}` : "Últimas ejecuciones"}
              </p>
              {selectedRuns.length === 0 ? (
                <div className="text-center py-16 text-white/20">
                  <Shield className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sin runs de generación todavía</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRuns.map(run => (
                    <div key={run.id} className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-4 py-3 flex items-center gap-4">
                      <div className="shrink-0 text-center">
                        <p className="text-[10px] font-bold text-white/40 font-mono">{run.version}</p>
                        <p className="text-[7px] text-white/20">Pág. {run.pageId}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("text-[8px] font-semibold px-1.5 py-0.5 rounded-sm",
                            run.type === "selective_regeneration" ? "bg-sky-500/15 text-sky-400" : "bg-violet-500/15 text-violet-400")}>
                            {run.type === "selective_regeneration" ? "Selectiva" : "Completa"}
                          </span>
                          <span className={cn("text-[8px] font-semibold px-1.5 py-0.5 rounded-sm",
                            run.status === "completed" ? "bg-emerald-500/15 text-emerald-400" : run.status === "running" ? "bg-violet-500/15 text-violet-300" : "bg-white/[0.05] text-white/30")}>
                            {run.status === "completed" ? "Completada" : run.status === "running" ? "En progreso" : run.status}
                          </span>
                          <span className="text-[8px] text-white/20 font-mono">{run.model}</span>
                        </div>
                        {run.note && <p className="text-[9px] text-white/35">{run.note}</p>}
                      </div>
                      <div className="shrink-0 text-right space-y-0.5">
                        <p className="text-[9px] text-white/20">{formatDateTime(run.createdAt)}</p>
                        {run.promptTokens && (
                          <p className="text-[8px] text-white/15 font-mono">
                            {((run.promptTokens + (run.completionTokens ?? 0)) / 1000).toFixed(1)}k tok
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
