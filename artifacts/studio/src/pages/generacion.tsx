import { useState } from "react";
import { useListPages, useListRuns, useCreateRun, useGetContract, getListRunsQueryKey, getListPagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn, formatDate } from "@/lib/utils";
import { Play, ShieldCheck, ChevronRight, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type FlowStep = "idle" | "preflight" | "generating" | "composing" | "qa_check" | "done" | "error";

const PREFLIGHT_ITEMS = [
  { key: "grounding",   label: "Grounding verificado",            check: (p: any) => p.groundingStatus === "verified" },
  { key: "context",     label: "Contexto editorial presente",     check: (p: any) => !!p.context && p.context.length > 50 },
  { key: "concepts",    label: "Conceptos clave definidos",       check: (p: any) => !!p.concepts },
  { key: "traps",       label: "Trampas de examen documentadas",  check: (p: any) => !!p.examTraps },
  { key: "autocheck",   label: "Autocheck completo",              check: (p: any) => !!p.autocheckQuestion && !!p.autocheckAnswer },
  { key: "sources",     label: "Fuente Microsoft Learn presente", check: (p: any) => !!p.sources },
];

const FLOW_STEPS: { key: FlowStep; label: string; duration: number }[] = [
  { key: "preflight",   label: "Preflight editorial",    duration: 1200 },
  { key: "generating",  label: "Generación visual",      duration: 3000 },
  { key: "composing",   label: "Composición final",      duration: 1500 },
  { key: "qa_check",    label: "QA automático",          duration: 1000 },
  { key: "done",        label: "Completada",             duration: 0 },
];

const BATCH_OPTIONS = ["Batch 01", "Batch 02", "Batch 03", "Batch 04", "Batch 05"];

export default function Generacion() {
  const [mode, setMode] = useState<"page" | "batch">("page");
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>("Batch 01");
  const [flowStep, setFlowStep] = useState<FlowStep>("idle");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(-1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages = [] } = useListPages({});
  const { data: allRuns = [], isLoading: runsLoading } = useListRuns(
    { pageId: selectedPageId ?? undefined },
    { query: { queryKey: getListRunsQueryKey({ pageId: selectedPageId ?? undefined }) } }
  );
  const { data: contract } = useGetContract();
  const createRun = useCreateRun();

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const batchPages = pages.filter((p) => p.batch === selectedBatch);

  const preflightResults = selectedPage
    ? PREFLIGHT_ITEMS.map((item) => ({ ...item, pass: item.check(selectedPage) }))
    : [];
  const preflightOk = preflightResults.every((r) => r.pass);
  const preflightScore = preflightResults.filter((r) => r.pass).length;

  function runFlow() {
    setFlowStep("preflight");
    setStepIndex(0);
    setProgress(0);

    let idx = 0;
    function nextStep() {
      idx++;
      if (idx >= FLOW_STEPS.length) return;
      const step = FLOW_STEPS[idx];
      setStepIndex(idx);
      setFlowStep(step.key);
      if (step.key === "generating") setProgress(10);
      if (step.key === "composing") setProgress(60);
      if (step.key === "qa_check") setProgress(85);

      if (step.key === "done") {
        setProgress(100);
        if (selectedPageId) {
          createRun.mutate({ data: { pageId: selectedPageId } }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getListRunsQueryKey({ pageId: selectedPageId }) });
              queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
            }
          });
        }
        toast({
          title: "Generación completada",
          description: selectedPage
            ? `Pág. ${selectedPage.pageNumber} — ${selectedPage.title.slice(0, 40)} · lista para QA.`
            : `Batch generado — páginas listas para revisión editorial.`,
        });
        setTimeout(() => { setFlowStep("idle"); setProgress(0); setStepIndex(-1); }, 3000);
        return;
      }
      setTimeout(nextStep, step.duration);
    }
    setTimeout(nextStep, FLOW_STEPS[0].duration);
  }

  const canGenerate = mode === "page"
    ? selectedPageId !== null && preflightOk && flowStep === "idle"
    : flowStep === "idle";
  const isRunning = flowStep !== "idle" && flowStep !== "done" && flowStep !== "error";

  return (
    <Layout title="Generación — AI-200 Visual Study Atlas">
      <div className="flex min-h-0 bg-[#0a1220]" style={{ height: "calc(100vh - 57px)" }}>
        {/* Left: config */}
        <div className="w-80 shrink-0 border-r border-white/[0.06] bg-[#0d1629] p-5 overflow-y-auto space-y-5">
          {/* Mode toggle */}
          <section>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Modo de generación</p>
            <div className="flex border border-white/[0.08] rounded-sm overflow-hidden">
              {([["page", "Página individual"], ["batch", "Batch completo"]] as const).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("flex-1 text-xs py-1.5 font-medium transition-colors",
                    mode === m ? "bg-blue-600 text-white" : "text-white/30 hover:text-white/60 hover:bg-white/[0.03]")}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Page selector */}
          {mode === "page" ? (
            <section>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Página objetivo</p>
              <select value={selectedPageId ?? ""} onChange={(e) => setSelectedPageId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-8 text-xs border border-white/[0.08] rounded-sm px-2 bg-[#0a1220] text-white/60 focus:outline-none focus:ring-1 focus:ring-teal-500/40"
                data-testid="select-page-generate">
                <option value="">— Seleccionar página —</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pageNumber} · {p.title.slice(0, 42)}
                  </option>
                ))}
              </select>

              {selectedPage && (
                <div className="mt-3 bg-white/[0.02] border border-white/[0.06] rounded-sm px-3 py-2.5 space-y-1.5">
                  <InfoRow label="Batch" value={selectedPage.batch} />
                  <InfoRow label="Dominio" value={selectedPage.domain.split(" ").slice(0,3).join(" ")} />
                  <InfoRow label="Estado" value={selectedPage.status} />
                  <InfoRow label="Grounding" value={selectedPage.groundingStatus ?? "unverified"} />
                </div>
              )}
            </section>
          ) : (
            <section>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Batch objetivo</p>
              <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full h-8 text-xs border border-white/[0.08] rounded-sm px-2 bg-[#0a1220] text-white/60 focus:outline-none focus:ring-1 focus:ring-teal-500/40">
                {BATCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              <div className="mt-2 text-xs text-white/30 bg-white/[0.02] border border-white/[0.06] rounded-sm px-3 py-2">
                {batchPages.length} páginas · {batchPages.filter(p => p.groundingStatus === "verified").length} con grounding verificado
              </div>
            </section>
          )}

          {/* Preflight */}
          {mode === "page" && selectedPage && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest">Preflight editorial</p>
                <span className={cn("text-[10px] font-bold", preflightOk ? "text-emerald-400" : "text-amber-400")}>
                  {preflightScore}/{PREFLIGHT_ITEMS.length}
                </span>
              </div>
              <div className="space-y-1">
                {preflightResults.map((item) => (
                  <div key={item.key} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-sm text-[10px]",
                    item.pass ? "bg-emerald-500/8 text-emerald-300" : "bg-amber-500/8 text-amber-300")}>
                    {item.pass
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      : <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />}
                    {item.label}
                  </div>
                ))}
              </div>
              {!preflightOk && (
                <p className="text-[9px] text-amber-400 mt-1.5 px-1">
                  Completa el grounding en Contenido y Grounding antes de generar.
                </p>
              )}
            </section>
          )}

          {/* Model */}
          <section>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Modelo</p>
            <select className="w-full h-8 text-xs border border-white/[0.08] rounded-sm px-2 bg-[#0a1220] text-white/60 focus:outline-none focus:ring-1 focus:ring-teal-500/40">
              <option value="gpt-4o">GPT-4o — calidad premium</option>
              <option value="gpt-4o-mini">GPT-4o mini — iteración rápida</option>
            </select>
            <div className="mt-2 flex items-start gap-1.5 text-[9px] text-white/30 bg-white/[0.02] border border-dashed border-white/[0.06] rounded-sm px-2 py-1.5">
              <ShieldCheck className="w-3 h-3 text-teal-400 shrink-0 mt-0.5" />
              Modo seguro activo — sin API conectada. Simulación funcional disponible.
            </div>
          </section>

          {/* Generate button */}
          <Button onClick={runFlow} disabled={!canGenerate || isRunning}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-10"
            data-testid="button-generate">
            {isRunning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{FLOW_STEPS[stepIndex]?.label ?? "Procesando"}…</>
            ) : (
              <><Play className="w-4 h-4 mr-2" />{mode === "batch" ? `Generar ${selectedBatch}` : "Generar página"}</>
            )}
          </Button>
        </div>

        {/* Right: pipeline + runs */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {/* Flow pipeline */}
          <section>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Pipeline de generación</p>
            <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
              {/* Progress */}
              {isRunning && (
                <div className="px-4 pt-3 pb-1">
                  <Progress value={progress} className="h-1.5 bg-white/[0.06]" />
                </div>
              )}
              {/* Steps */}
              <div className="p-4 flex items-center gap-0">
                {FLOW_STEPS.filter(s => s.key !== "idle" && s.key !== "error").map((step, i, arr) => {
                  const stepOrder = i;
                  const isActive = stepIndex === stepOrder;
                  const isDone = stepIndex > stepOrder || flowStep === "done";
                  return (
                    <div key={step.key} className="flex items-center flex-1 min-w-0">
                      <div className={cn("flex flex-col items-center gap-1 flex-1 text-center transition-all",
                        isActive ? "opacity-100" : isDone ? "opacity-80" : "opacity-30")}>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                          isDone ? "bg-emerald-500 text-white" :
                          isActive ? "bg-blue-600 text-white ring-2 ring-teal-400 ring-offset-1" :
                          "bg-white/[0.06] text-white/20")}>
                          {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                           i + 1}
                        </div>
                        <span className="text-[9px] font-medium text-white/40 leading-tight">{step.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <ChevronRight className={cn("w-3 h-3 shrink-0 -mx-1", isDone ? "text-emerald-400" : "text-white/[0.06]")} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Contrato visual summary */}
          {contract && (
            <section>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3 flex items-center gap-2">
                Contrato Visual Activo
                <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded-sm">{contract.version}</span>
              </p>
              <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-bold text-red-400 uppercase tracking-wide mb-2">No negociable ({(contract.nonNegotiable as string[]).length})</p>
                  <ul className="space-y-1">
                    {(contract.nonNegotiable as string[]).slice(0, 5).map((rule, i) => (
                      <li key={i} className="text-[9px] text-white/40 flex items-start gap-1">
                        <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                        <span className="leading-tight">{rule.slice(0, 80)}{rule.length > 80 ? "…" : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-teal-400 uppercase tracking-wide mb-2">Storytelling flexible ({(contract.flexibleStorytelling as string[]).length})</p>
                  <ul className="space-y-1">
                    {(contract.flexibleStorytelling as string[]).slice(0, 4).map((rule, i) => (
                      <li key={i} className="text-[9px] text-white/40 flex items-start gap-1">
                        <span className="w-1 h-1 bg-teal-400 rounded-full mt-1.5 shrink-0" />
                        <span className="leading-tight">{rule.slice(0, 80)}{rule.length > 80 ? "…" : ""}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* Run history */}
          <section>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3 flex items-center gap-2">
              Historial de versiones
              {selectedPage && <span className="text-white/15 font-normal">· Pág. {selectedPage.pageNumber}</span>}
            </p>
            {runsLoading ? (
              <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 bg-white/[0.04]" />)}</div>
            ) : allRuns.length === 0 ? (
              <div className="bg-[#0d1629] border border-dashed border-white/[0.06] rounded-sm p-5 text-center">
                <Clock className="w-5 h-5 text-white/10 mx-auto mb-1.5" />
                <p className="text-xs text-white/25">
                  {selectedPageId ? "Sin ejecuciones registradas para esta página." : "Selecciona una página para ver su historial de versiones."}
                </p>
              </div>
            ) : (
              <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                    <tr>
                      <th className="text-left px-3 py-2 text-[9px] text-white/25 font-semibold uppercase tracking-wide">Estado</th>
                      <th className="text-left px-3 py-2 text-[9px] text-white/25 font-semibold uppercase tracking-wide">Modelo</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/25 font-semibold uppercase tracking-wide">Tokens</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/25 font-semibold uppercase tracking-wide">Versión</th>
                      <th className="text-right px-3 py-2 text-[9px] text-white/25 font-semibold uppercase tracking-wide">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {allRuns.map((run, idx) => (
                      <tr key={run.id} className="hover:bg-white/[0.02]" data-testid={`row-run-${run.id}`}>
                        <td className="px-3 py-2"><RunBadge status={run.status} /></td>
                        <td className="px-3 py-2 font-mono text-white/25 text-[10px]">{run.model ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-white/20 text-[10px] tabular-nums">
                          {run.promptTokens != null && run.completionTokens != null
                            ? `${(run.promptTokens + run.completionTokens).toLocaleString()}t`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] text-white/20 font-mono">
                          v{allRuns.length - idx}
                        </td>
                        <td className="px-3 py-2 text-right text-[10px] text-white/20">{formatDate(run.startedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function RunBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    running:   "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    queued:    "bg-white/[0.03] text-white/25 border border-white/[0.06]",
    failed:    "bg-red-500/10 text-red-400 border border-red-500/20",
  };
  const labels: Record<string, string> = {
    completed: "Completada", running: "En curso", queued: "En cola", failed: "Error"
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-semibold", cfg[status] ?? "bg-white/[0.03] text-white/25")}>
      {labels[status] ?? status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[9px] text-white/20">{label}</span>
      <span className="text-[10px] text-white/50 font-medium truncate max-w-36">{value}</span>
    </div>
  );
}
