import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { cn, statusColorDark, statusLabel, formatDateTime } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import {
  Play, Shield, CheckCircle2, Clock, AlertCircle, Loader2, Zap,
  ChevronRight, Key, Sparkles, ExternalLink, FileText, Eye, Image,
  XCircle, Info, RefreshCw, HardDrive, Code2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Types ───────────────────────────────────────────────────────────────── */
type FlowStep = "idle" | "preflight" | "generating" | "composing" | "qa_check" | "done" | "error";
type RealStep =
  | "idle"
  | "validating_key"
  | "generating_html"
  | "running_qa"
  | "saving_outputs"
  | "done"
  | "error";

interface GenerationResult {
  pageId: string;
  durationMs: number;
  outputs: { html: string; metadata: string; qaReport: string; previewPng: string };
  previewGenerated: boolean;
  previewMode?: "dalle3" | "dalle2" | "svg_fallback";
  imageError: string | null;
  qaVerdict: string;
  qaScores: Record<string, number>;
  tokens: { prompt: number; completion: number };
  model: string;
}

/* ── Demo flow steps (simulation) ───────────────────────────────────────── */
const FLOW_STEPS: { key: FlowStep; label: string; duration: number }[] = [
  { key: "preflight",  label: "Preflight editorial",  duration: 1200 },
  { key: "generating", label: "Generación visual",    duration: 3500 },
  { key: "composing",  label: "Composición final",    duration: 1500 },
  { key: "qa_check",   label: "QA automático",        duration: 1000 },
  { key: "done",       label: "Completada",           duration: 0    },
];

/* ── Real flow steps labels ─────────────────────────────────────────────── */
const REAL_STEPS: { key: RealStep; label: string; sublabel: string }[] = [
  { key:"validating_key",  label:"Verificando API key",     sublabel:"OPENAI_API_KEY desde Secrets" },
  { key:"generating_html", label:"Generando HTML",          sublabel:"GPT-4o · Contrato Visual Atlas v24" },
  { key:"running_qa",      label:"QA automático",           sublabel:"GPT-4o · 6 dimensiones" },
  { key:"saving_outputs",  label:"Guardando outputs",       sublabel:"/public/assets/cloudbooks/…" },
  { key:"done",            label:"Completado",              sublabel:"Assets listos en Replit static" },
];

const QA_DIM_LABELS: Record<string, string> = {
  art_direction:         "Dirección de arte",
  editorial_consistency: "Consistencia editorial",
  readability:           "Legibilidad",
  technical_accuracy:    "Precisión técnica",
  useful_density:        "Densidad útil",
  commercial_risk:       "Riesgo comercial",
};

function getToken(): string {
  return localStorage.getItem("studio_token") ?? "";
}

/* ── KeyStatusBadge ─────────────────────────────────────────────────────── */
function KeyStatusBadge({ hasKey, checked }: { hasKey: boolean | null; checked: boolean }) {
  if (!checked) return (
    <span className="flex items-center gap-1 text-[8px] text-white/25 border border-white/10 px-2 py-1 rounded-sm">
      <Loader2 className="w-2.5 h-2.5 animate-spin" />Verificando…
    </span>
  );
  if (hasKey === null) return null;
  return hasKey ? (
    <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-sm font-semibold">
      <Key className="w-2.5 h-2.5" />OPENAI_API_KEY configurada
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[8px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-sm font-semibold">
      <Key className="w-2.5 h-2.5" />OPENAI_API_KEY no configurada
    </span>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function Generacion() {
  /* ── Demo flow state ── */
  const [mode, setMode]               = useState<"page" | "batch">("page");
  const [selectedPageId, setSelectedPageId] = useState<string | null>("01");
  const [selectedBatch, setSelectedBatch]   = useState<string>("Batch 01");
  const [flowStep, setFlowStep]       = useState<FlowStep>("idle");
  const [stepIndex, setStepIndex]     = useState(-1);
  const [progress, setProgress]       = useState(0);

  /* ── Real generation state ── */
  const [realStep, setRealStep]       = useState<RealStep>("idle");
  const [realError, setRealError]     = useState<string | null>(null);
  const [realResult, setRealResult]   = useState<GenerationResult | null>(null);
  const [hasKey, setHasKey]           = useState<boolean | null>(null);
  const [keyChecked, setKeyChecked]   = useState(false);
  const [previewKey, setPreviewKey]   = useState(0); // force img reload

  const { toast } = useToast();
  const { state, startGeneration } = useStudio();
  const pages       = state.pages;
  const allRuns     = state.runs;
  const selectedPage = selectedPageId ? pages.find(p => p.id === selectedPageId) : null;
  const batchPages  = pages.filter(p => p.batch === selectedBatch);
  const selectedRuns = selectedPageId ? allRuns.filter(r => r.pageId === selectedPageId) : allRuns.slice(0, 10);

  /* ── Check key status on mount ── */
  useEffect(() => {
    fetch("/api/studio/key-status", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((data: { hasKey: boolean }) => { setHasKey(data.hasKey); setKeyChecked(true); })
      .catch(() => { setHasKey(false); setKeyChecked(true); });
  }, []);

  /* ── Preflight checks ── */
  const PREFLIGHT = [
    { key: "grounding", label: "Grounding verificado",         pass: selectedPage?.groundingStatus === "verified" },
    { key: "version",   label: "Versión base definida",        pass: !!selectedPage?.currentVersion },
    { key: "sources",   label: "Fuentes referenciadas",        pass: (selectedPage?.sources.length ?? 0) > 0 },
    { key: "contract",  label: "Contrato editorial asignado",  pass: !!selectedPage?.contractVersion },
    { key: "status",    label: "Estado habilitado para gen.",  pass: ["grounded","needs_revision","draft"].includes(selectedPage?.status ?? "") },
  ];
  const preflightOk    = PREFLIGHT.every(r => r.pass);
  const preflightScore = PREFLIGHT.filter(r => r.pass).length;

  /* ── Demo flow ── */
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
        toast({ title: "Simulación completada", description: `Pág. ${selectedPageId} — modo demo` });
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
    toast({ title: "Batch iniciado", description: `${eligible.length} páginas en cola` });
  }

  /* ── Real generation ── */
  async function runRealGeneration() {
    if (!selectedPageId) return;
    setRealStep("validating_key");
    setRealError(null);
    setRealResult(null);

    try {
      // Step 1: Validate key
      const keyRes = await fetch("/api/studio/key-status", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const keyData = await keyRes.json() as { hasKey: boolean };
      if (!keyData.hasKey) {
        setRealError("OPENAI_API_KEY no configurada en Secrets. Agrégala en Replit → Secrets para ejecutar generación real.");
        setRealStep("error");
        return;
      }

      setHasKey(true);
      setRealStep("generating_html");

      // Step 2: Call generation endpoint (gpt-4o runs ~10-25s)
      const genRes = await fetch("/api/studio/generate-visual-atlas-page", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ certificationId: "ai-200", pageId: selectedPageId }),
      });

      setRealStep("running_qa");
      await new Promise(r => setTimeout(r, 300)); // brief UI step

      if (!genRes.ok) {
        const err = await genRes.json() as { error: string };
        throw new Error(err.error ?? `HTTP ${genRes.status}`);
      }

      setRealStep("saving_outputs");
      const result = await genRes.json() as GenerationResult;
      await new Promise(r => setTimeout(r, 400)); // brief UI step

      setRealResult(result);
      setRealStep("done");
      setPreviewKey(k => k + 1);
      startGeneration(selectedPageId);
      toast({
        title: "Generación real completada",
        description: `Pág. ${selectedPageId} · ${(result.durationMs / 1000).toFixed(1)}s · GPT-4o`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRealError(msg);
      setRealStep("error");
      toast({ title: "Error en generación", description: msg, variant: "destructive" });
    }
  }

  const isRealRunning = ["validating_key","generating_html","running_qa","saving_outputs"].includes(realStep);
  const isDemoRunning = ["preflight","generating","composing","qa_check"].includes(flowStep);
  const isPage01      = selectedPageId === "01";

  const STATS = [
    { label:"Runs completados",   value:allRuns.filter(r => r.status === "completed").length,                    color:"text-emerald-400" },
    { label:"En cola / running",  value:allRuns.filter(r => r.status === "running" || r.status === "queued").length, color:"text-violet-400" },
    { label:"Fallidos",           value:allRuns.filter(r => r.status === "failed").length,                       color:"text-red-400" },
    { label:"Páginas aprobadas",  value:pages.filter(p => p.status === "approved" || p.status === "exported").length, color:"text-teal-400" },
  ];

  return (
    <Layout title="Producción / Generación">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 flex items-center gap-6 flex-wrap shrink-0">
          <div className="flex gap-2">
            {(["page","batch"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={cn("h-7 px-3 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all",
                  mode === m ? "bg-blue-600/20 text-blue-300 border border-blue-500/30" : "text-white/25 hover:text-white/50 border border-white/[0.06]")}>
                {m === "page" ? "Página individual" : "Batch completo"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <KeyStatusBadge hasKey={hasKey} checked={keyChecked} />
          </div>
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

          {/* ── Sidebar ── */}
          <aside className="w-56 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
            <div className="p-3 border-b border-white/[0.06]">
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2">
                {mode === "page" ? "Seleccionar página" : "Seleccionar batch"}
              </p>
              {mode === "batch" && (
                <div className="space-y-px">
                  {["Batch 01","Batch 02","Batch 03"].map(b => (
                    <button key={b} onClick={() => setSelectedBatch(b)}
                      className={cn("w-full text-left px-2.5 py-1.5 rounded-sm text-[9px] font-medium transition-all",
                        selectedBatch === b ? "bg-blue-500/15 text-blue-300 border-l-2 border-blue-400 pl-2" : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]")}>
                      {b} <span className="ml-2 text-[7px] text-white/20">{pages.filter(p => p.batch === b).length}p.</span>
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
                  {p.id === "01" && (
                    <span title="Generación real disponible"><Sparkles className="w-2.5 h-2.5 text-teal-400/50 shrink-0" /></span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main ── */}
          <div className="flex-1 flex flex-col overflow-y-auto">

            {/* ═══════════════════════════════════════════════════════════
                SECCIÓN REAL — solo visible cuando page 01 está seleccionada
            ═══════════════════════════════════════════════════════════ */}
            {mode === "page" && isPage01 && (
              <div className="border-b border-white/[0.08] bg-[#0d1629]/50 shrink-0">

                {/* Header del panel real */}
                <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-400" />
                    <div>
                      <p className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Generación real · OpenAI API</p>
                      <p className="text-[8px] text-white/30">Página 01 — Azure Container Registry</p>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    {!hasKey && keyChecked && (
                      <p className="text-[8px] text-amber-400/70 max-w-xs">
                        OPENAI_API_KEY no configurada en Secrets. Agrégala para ejecutar generación real.
                      </p>
                    )}
                    <button
                      onClick={runRealGeneration}
                      disabled={isRealRunning || !keyChecked}
                      className={cn(
                        "flex items-center gap-2 h-9 px-4 rounded-sm text-[10px] font-bold transition-all",
                        isRealRunning
                          ? "bg-teal-600/20 border border-teal-500/30 text-teal-300 cursor-not-allowed"
                          : !hasKey && keyChecked
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-400/70 cursor-not-allowed"
                          : "bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-500 hover:to-blue-500 shadow-lg"
                      )}>
                      {isRealRunning
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando…</>
                        : <><Sparkles className="w-3.5 h-3.5" />Generar con OpenAI</>
                      }
                    </button>
                  </div>
                </div>

                {/* Flow de estados real */}
                {realStep !== "idle" && (
                  <div className="px-6 py-3 space-y-3">

                    {/* Steps pipeline */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {REAL_STEPS.map((step, i) => {
                        const activeIdx = REAL_STEPS.findIndex(s => s.key === realStep);
                        const isDone    = i < activeIdx || realStep === "done";
                        const isActive  = step.key === realStep && realStep !== "done";
                        const isError   = realStep === "error" && i === activeIdx;
                        return (
                          <div key={step.key} className="flex items-center gap-1 shrink-0">
                            <div className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-medium border transition-all",
                              realStep === "done" && isDone
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : isDone
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : isActive
                                ? "bg-teal-500/15 border-teal-500/30 text-teal-300 animate-pulse"
                                : isError
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-white/[0.03] border-white/[0.06] text-white/20"
                            )}>
                              {isDone
                                ? <CheckCircle2 className="w-3 h-3" />
                                : isActive
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : isError
                                ? <XCircle className="w-3 h-3" />
                                : <Clock className="w-3 h-3" />
                              }
                              {step.label}
                            </div>
                            {i < REAL_STEPS.length - 1 && (
                              <ChevronRight className="w-3 h-3 text-white/10 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Error message */}
                    {realStep === "error" && realError && (
                      <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-sm px-3 py-2.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[9px] font-bold text-red-400 mb-0.5">Error en generación</p>
                          <p className="text-[8px] text-red-300/60 leading-relaxed">{realError}</p>
                          {realError.includes("OPENAI_API_KEY") && (
                            <p className="text-[7px] text-white/20 mt-1">
                              Ir a Replit → Secrets (ícono de candado) → agregar OPENAI_API_KEY con el valor de tu API key de OpenAI.
                            </p>
                          )}
                        </div>
                        <button onClick={() => setRealStep("idle")}
                          className="ml-auto h-5 w-5 flex items-center justify-center text-white/20 hover:text-white/50 transition-colors shrink-0">
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Result panel */}
                    {realStep === "done" && realResult && (
                      <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <p className="text-[9px] font-bold text-emerald-400 flex-1">
                            Generación completada · {(realResult.durationMs / 1000).toFixed(1)}s · {realResult.model}
                          </p>
                          <span className={cn("text-[7px] px-2 py-0.5 rounded-sm font-bold border",
                            realResult.qaVerdict === "approved"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                              : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                          )}>
                            QA: {realResult.qaVerdict === "approved" ? "Aprobado" : "Revisar"}
                          </span>
                          <span className="text-[7px] text-white/20 font-mono">
                            {((realResult.tokens.prompt + realResult.tokens.completion) / 1000).toFixed(1)}k tokens
                          </span>
                        </div>

                        <div className="p-4 grid grid-cols-3 gap-4">
                          {/* Preview image */}
                          <div className="col-span-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest">Preview</p>
                              {realResult.previewMode === "dalle3" ? (
                                <span className="text-[7px] px-1.5 py-0.5 rounded-sm bg-violet-500/15 text-violet-400 border border-violet-500/20 font-semibold">DALL-E 3</span>
                              ) : realResult.previewMode === "dalle2" ? (
                                <span className="text-[7px] px-1.5 py-0.5 rounded-sm bg-violet-400/15 text-violet-300/80 border border-violet-400/20 font-semibold">DALL-E 2</span>
                              ) : (
                                <span className="text-[7px] px-1.5 py-0.5 rounded-sm bg-teal-500/10 text-teal-400/70 border border-teal-500/15 font-semibold">SVG generado</span>
                              )}
                            </div>
                            <div className="aspect-video bg-[#0a1220] border border-white/[0.07] rounded-sm overflow-hidden">
                              <img
                                key={previewKey}
                                src={`${realResult.outputs.previewPng}?v=${previewKey}`}
                                alt="Preview generado"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <HardDrive className="w-2.5 h-2.5 text-teal-400/40 shrink-0" />
                              <p className="text-[7px] text-teal-400/50 font-semibold">Replit static</p>
                            </div>
                          </div>

                          {/* Output links */}
                          <div className="col-span-1">
                            <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest mb-1.5">Outputs generados</p>
                            <div className="space-y-1">
                              {([
                                ["page.html",     realResult.outputs.html,      Code2,    "text-blue-400"],
                                ["metadata.json", realResult.outputs.metadata,  FileText, "text-teal-400"],
                                ["qa-report.md",  realResult.outputs.qaReport,  Shield,   "text-sky-400"],
                                [realResult.previewMode === "dalle2"
                                ? "preview.png (DALL-E 2)"
                                : realResult.outputs.previewPng.endsWith(".svg")
                                  ? "preview.svg"
                                  : "preview.png",
                                realResult.outputs.previewPng, Eye, "text-violet-400"],
                              ] as [string, string, typeof Code2, string][]).map(([file, url, Icon, color]) => (
                                <a key={file} href={url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-2 py-1.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] rounded-sm transition-all group">
                                  <Icon className={cn("w-3 h-3 shrink-0", color)} />
                                  <span className="text-[8px] font-mono text-white/40 group-hover:text-white/60 flex-1">{file}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-white/15 group-hover:text-white/40 shrink-0" />
                                </a>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 px-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400/50 shrink-0" />
                              <p className="text-[7px] text-emerald-400/50">status: qa_pending → Ejecutar QA</p>
                            </div>
                          </div>

                          {/* QA scores */}
                          <div className="col-span-1">
                            <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest mb-1.5">QA scores</p>
                            <div className="space-y-1">
                              {Object.entries(realResult.qaScores).map(([dim, score]) => (
                                <div key={dim} className="flex items-center gap-2">
                                  <p className="text-[7px] text-white/30 w-28 truncate shrink-0">{QA_DIM_LABELS[dim] ?? dim}</p>
                                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                      className={cn("h-full rounded-full", score >= 8 ? "bg-emerald-500/70" : score >= 6 ? "bg-teal-500/70" : "bg-amber-500/70")}
                                      style={{ width:`${score * 10}%` }}
                                    />
                                  </div>
                                  <span className="text-[8px] font-mono text-white/40 w-5 text-right shrink-0">{score}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* HTML preview inline */}
                        <div className="border-t border-emerald-500/10 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest">Vista previa infografía HTML</p>
                            <a href={realResult.outputs.html} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[8px] text-blue-400/50 hover:text-blue-400 transition-colors">
                              Abrir en nueva pestaña <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                          <div className="bg-[#0a1220] border border-white/[0.07] rounded-sm overflow-hidden" style={{ height: 320 }}>
                            <iframe
                              key={previewKey}
                              src={`${realResult.outputs.html}?v=${previewKey}`}
                              className="w-full h-full border-none"
                              title="Infografía generada"
                              sandbox="allow-same-origin"
                              style={{ transform: "scale(0.7)", transformOrigin: "top left", width: "143%", height: "143%" }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Waiting message while generating */}
                    {isRealRunning && (
                      <div className="flex items-center gap-2 text-[8px] text-white/25 px-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {realStep === "generating_html" && "GPT-4o generando el HTML de la infografía — puede tomar 15-30 segundos…"}
                        {realStep === "validating_key" && "Verificando OPENAI_API_KEY en Replit Secrets…"}
                        {realStep === "running_qa" && "GPT-4o evaluando 6 dimensiones de calidad editorial…"}
                        {realStep === "saving_outputs" && "Guardando archivos en /public/assets/cloudbooks/…"}
                      </div>
                    )}
                  </div>
                )}

                {/* Batch 01-05 hint */}
                <div className="px-6 py-2 border-t border-white/[0.04] flex items-center gap-2">
                  <Zap className="w-3 h-3 text-white/15" />
                  <p className="text-[7px] text-white/20">
                    <span className="font-semibold">Batch 01–05:</span> Disponible como próximo paso — genera 5 páginas en secuencia. Actualmente solo Pág. 01 tiene seed data.
                  </p>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                SECCIÓN DEMO / SIMULACIÓN (todas las páginas)
            ═══════════════════════════════════════════════════════════ */}
            {mode === "page" && selectedPage && (
              <div className="p-5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-start gap-6">
                  {/* Preflight */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                        Preflight editorial — {preflightScore}/{PREFLIGHT.length}
                      </p>
                      <div className={cn("text-[8px] font-bold px-2 py-0.5 rounded-sm",
                        preflightOk ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400")}>
                        {preflightOk ? "✓ Listo" : "⚠ Verificar"}
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

                  {/* Demo run button */}
                  <div className="shrink-0 space-y-2">
                    <button onClick={runFlow} disabled={isDemoRunning}
                      className={cn(
                        "flex items-center gap-2 h-9 px-4 rounded-sm text-[10px] font-bold transition-all",
                        isDemoRunning
                          ? "bg-violet-600/20 border border-violet-500/30 text-violet-300"
                          : "bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.12] text-white/50"
                      )}>
                      {isDemoRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      {isDemoRunning ? "Simulando…" : "Simular (demo)"}
                    </button>
                    <p className="text-[7px] text-white/15 text-center">Sin API key</p>
                  </div>
                </div>

                {/* Demo flow pipeline */}
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
                    <Zap className="w-3.5 h-3.5" />Simular batch
                  </button>
                </div>
              </div>
            )}

            {/* ── Runs history ── */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                  {selectedPageId ? `Historial · Pág. ${selectedPageId}` : "Últimas ejecuciones"}
                </p>
              </div>
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
                            run.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                            run.status === "running"   ? "bg-violet-500/15 text-violet-300" :
                                                         "bg-white/[0.05] text-white/30")}>
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
