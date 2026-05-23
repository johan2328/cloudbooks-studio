import { useState } from "react";
import { useListPages, useListRuns, useCreateRun, useGetContract, getListRunsQueryKey, getListPagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { Play, RefreshCw, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Generacion() {
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pages = [] } = useListPages({});
  const { data: runs = [], isLoading: runsLoading } = useListRuns(
    { pageId: selectedPageId ?? undefined },
    { query: { queryKey: getListRunsQueryKey({ pageId: selectedPageId ?? undefined }) } }
  );
  const { data: contract } = useGetContract();
  const createRun = useCreateRun();

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  function handleGenerate() {
    if (!selectedPageId) {
      toast({ title: "Selecciona una página primero", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setProgress(0);

    // Progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) { clearInterval(interval); return prev; }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 500);

    createRun.mutate(
      { data: { pageId: selectedPageId, model: "gpt-4o" } },
      {
        onSuccess: () => {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            setGenerating(false);
            setProgress(0);
            queryClient.invalidateQueries({ queryKey: getListRunsQueryKey({ pageId: selectedPageId }) });
            queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
            toast({ title: "Generación iniciada", description: "La página pasará a En revisión cuando finalice." });
          }, 600);
        },
        onError: () => {
          clearInterval(interval);
          setGenerating(false);
          setProgress(0);
          toast({ title: "Error en generación", variant: "destructive" });
        }
      }
    );
  }

  const runCountText = selectedPage
    ? `${selectedPage.runCount ?? 0} corrida${(selectedPage.runCount ?? 0) !== 1 ? "s" : ""} previas`
    : "—";

  return (
    <Layout title="Generación de Infografías">
      <div className="flex h-full min-h-0">
        {/* Left: config panel */}
        <div className="w-80 shrink-0 border-r border-gray-200 bg-white p-5 overflow-y-auto">
          <section className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Página a generar</p>
            <select
              value={selectedPageId ?? ""}
              onChange={(e) => setSelectedPageId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full h-9 text-sm border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              data-testid="select-page-generate"
            >
              <option value="">— Seleccionar página —</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pageNumber} — {p.title.slice(0, 45)}
                </option>
              ))}
            </select>

            {selectedPage && (
              <div className="mt-3 space-y-1.5">
                <InfoRow label="Dominio" value={selectedPage.domain} />
                <InfoRow label="Batch" value={selectedPage.batch} />
                <InfoRow label="Estado actual" value={selectedPage.status} />
                <InfoRow label="Corridas previas" value={runCountText} />
              </div>
            )}
          </section>

          <section className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modelo</p>
            <select className="w-full h-8 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
              <option value="gpt-4o">GPT-4o (recomendado)</option>
              <option value="gpt-4o-mini">GPT-4o mini (economico)</option>
            </select>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-sm px-2 py-1.5">
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>OPENAI_API_KEY se usa solo en servidor. Nunca expuesta al navegador.</span>
            </div>
          </section>

          {/* Generate button */}
          <div className="space-y-3">
            {generating && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>Generando...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
            <Button
              onClick={handleGenerate}
              disabled={!selectedPageId || generating || createRun.isPending}
              className="w-full bg-[#0d1629] hover:bg-[#1a2745] text-white text-sm h-9"
              data-testid="button-generate"
            >
              <Play className="w-4 h-4 mr-2" />
              {generating ? "Generando..." : "Generar página"}
            </Button>
          </div>
        </div>

        {/* Right: contract summary + runs */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {/* Contrato visual */}
          {contract && (
            <section>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                Contrato Visual Activo
                <span className="text-[10px] bg-[#0d1629] text-white px-1.5 py-0.5 rounded-sm">{contract.version}</span>
              </p>
              <div className="bg-white border border-gray-200 rounded-sm p-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Reglas no negociables ({(contract.nonNegotiable as string[]).length})</p>
                <ul className="space-y-1">
                  {(contract.nonNegotiable as string[]).slice(0, 4).map((rule, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                      <span className="w-1 h-1 bg-red-400 rounded-full mt-1.5 shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Runs table */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              Registro de Ejecuciones
              {selectedPage && <span className="text-gray-400 font-normal">— Pág. {selectedPage.pageNumber}</span>}
            </p>

            {runsLoading ? (
              <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : runs.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-sm p-6 text-center">
                <p className="text-xs text-gray-400">
                  {selectedPageId ? "Sin ejecuciones para esta página." : "Selecciona una página para ver su historial."}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 font-medium uppercase tracking-wide">Estado</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 font-medium uppercase tracking-wide">Modelo</th>
                      <th className="text-right px-3 py-2 text-[10px] text-gray-500 font-medium uppercase tracking-wide">Tokens</th>
                      <th className="text-right px-3 py-2 text-[10px] text-gray-500 font-medium uppercase tracking-wide">Iniciada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {runs.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-50" data-testid={`row-run-${run.id}`}>
                        <td className="px-3 py-2">
                          <RunStatusBadge status={run.status} />
                        </td>
                        <td className="px-3 py-2 text-gray-600 font-mono">{run.model ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-500">
                          {run.promptTokens != null && run.completionTokens != null
                            ? `${run.promptTokens + run.completionTokens}t`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400">{formatDate(run.startedAt)}</td>
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

function RunStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    running: "bg-blue-100 text-blue-800",
    queued: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    completed: "Completada",
    running: "En curso",
    queued: "En cola",
    failed: "Error",
  };
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium", colors[status] ?? "bg-gray-100 text-gray-600")}>
      {labels[status] ?? status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-xs text-gray-700 font-medium truncate max-w-40">{value}</span>
    </div>
  );
}
