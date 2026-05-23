import { useRoute, useLocation } from "wouter";
import { useGetPage, useGetQA, useApprovePage, useRequestRevision, useCreateRun, getGetPageQueryKey, getListPagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, statusColor, statusLabel, scoreColor } from "@/lib/utils";
import { CheckCircle2, RotateCcw, Play, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const QA_DIMENSIONS = [
  { key: "artDirection", label: "Dirección de Arte", desc: "Composición visual, jerarquía, alineación con grid" },
  { key: "editorialConsistency", label: "Consistencia Editorial", desc: "Iconografía uniforme, paleta correcta, tipografía" },
  { key: "readability", label: "Legibilidad", desc: "Tamaño de texto, contraste, claridad de lectura" },
  { key: "technicalAccuracy", label: "Precisión Técnica", desc: "Correctitud de conceptos, terminología Microsoft" },
  { key: "total", label: "QA Total", desc: "Score compuesto ponderado" },
] as const;

export default function QA() {
  const [, params] = useRoute("/qa/:id");
  const id = parseInt(params?.id ?? "1", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  const { data: page, isLoading: pageLoading } = useGetPage(id, { query: { enabled: !!id, queryKey: getGetPageQueryKey(id) } });
  const { data: qa, isLoading: qaLoading } = useGetQA(id, { query: { enabled: !!id, queryKey: ["getQA", id] } });
  const approvePage = useApprovePage();
  const requestRevision = useRequestRevision();
  const createRun = useCreateRun();

  function handleApprove() {
    approvePage.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        toast({ title: "Página aprobada", description: "La infografía ha sido aprobada para exportación." });
      }
    });
  }

  function handleRevision() {
    if (!revisionComment.trim()) { setShowRevisionInput(true); return; }
    requestRevision.mutate({ id, data: { comment: revisionComment } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        setShowRevisionInput(false);
        setRevisionComment("");
        toast({ title: "Revisión solicitada", description: "La página volvió a estado Pendiente." });
      }
    });
  }

  function handleRegenerate() {
    createRun.mutate({ data: { pageId: id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        toast({ title: "Regeneración iniciada", description: "La página está siendo regenerada." });
      }
    });
  }

  if (pageLoading) return <Layout title="QA y Aprobación"><div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div></Layout>;
  if (!page) return <Layout title="QA y Aprobación"><div className="p-6 text-sm text-gray-500">Página no encontrada.</div></Layout>;

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < 61 ? id + 1 : null;

  return (
    <Layout title={`QA y Aprobación — Pág. ${page.pageNumber}`}>
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3">
        <button onClick={() => setLocation("/biblioteca")} className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Biblioteca
        </button>
        <span className="text-gray-200">|</span>
        {prevId && <button onClick={() => setLocation(`/qa/${prevId}`)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5"><ChevronLeft className="w-3 h-3" /> Anterior</button>}
        {nextId && <button onClick={() => setLocation(`/qa/${nextId}`)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">Siguiente <ChevronRight className="w-3 h-3" /></button>}
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", statusColor(page.status))}>
            {statusLabel(page.status)}
          </span>
        </div>
      </div>

      <div className="flex h-full min-h-0">
        {/* Left: Preview */}
        <div className="flex-1 p-5 overflow-y-auto">
          <InfografiaPreview page={page} />
        </div>

        {/* Right: QA panel */}
        <div className="w-80 shrink-0 border-l border-gray-200 bg-white p-4 overflow-y-auto space-y-5">
          {/* Scores */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Panel de Diagnóstico</p>
            {qaLoading ? (
              <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-8" />)}</div>
            ) : qa ? (
              <div className="space-y-2">
                {QA_DIMENSIONS.map(({ key, label, desc }) => {
                  const score = (qa as any)[key] as number;
                  return (
                    <div key={key} className={cn("p-2.5 rounded-sm border", key === "total" ? "border-gray-300 bg-gray-50" : "border-gray-100")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn("text-xs font-medium", key === "total" ? "text-gray-900 font-semibold" : "text-gray-700")}>{label}</span>
                        <span className={cn("text-sm font-bold tabular-nums", scoreColor(score))}>{Math.round(score)}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className={cn("h-1 rounded-full transition-all", score >= 90 ? "bg-green-500" : score >= 75 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${score}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{desc}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-sm">
                Sin datos QA para esta página.
              </div>
            )}
          </section>

          {/* Observations */}
          {qa && (
            <>
              <section>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Observaciones</p>
                {(qa.observations as string[]).length > 0 ? (
                  <ul className="space-y-1.5">
                    {(qa.observations as string[]).map((obs, i) => (
                      <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 shrink-0" />
                        {obs}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-400">Sin observaciones.</p>}
              </section>

              {(qa.redTeam as string[]).length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Red Team</p>
                  <ul className="space-y-1.5">
                    {(qa.redTeam as string[]).map((r, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {/* Actions */}
          <section className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acciones</p>

            <Button
              onClick={handleApprove}
              disabled={page.status === "approved" || approvePage.isPending}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8"
              data-testid="button-approve"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {page.status === "approved" ? "Ya aprobada" : "Aprobar página"}
            </Button>

            {showRevisionInput ? (
              <div className="space-y-1.5">
                <textarea
                  className="w-full text-xs border border-gray-200 rounded-sm p-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
                  rows={3}
                  placeholder="Motivo de la corrección..."
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  data-testid="input-revision-comment"
                />
                <div className="flex gap-1.5">
                  <Button onClick={handleRevision} disabled={requestRevision.isPending} variant="outline" className="flex-1 text-xs h-7 border-amber-300 text-amber-700 hover:bg-amber-50">
                    Confirmar
                  </Button>
                  <Button onClick={() => setShowRevisionInput(false)} variant="ghost" className="text-xs h-7 text-gray-400">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowRevisionInput(true)}
                variant="outline"
                className="w-full text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50"
                data-testid="button-request-revision"
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Solicitar corrección
              </Button>
            )}

            <Button
              onClick={handleRegenerate}
              variant="outline"
              disabled={createRun.isPending}
              className="w-full text-xs h-8 border-gray-200 text-gray-600 hover:bg-gray-50"
              data-testid="button-regenerate"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {createRun.isPending ? "Iniciando..." : "Regenerar página"}
            </Button>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function InfografiaPreview({ page }: { page: any }) {
  const domainColor: Record<string, string> = {
    "Azure AI Vision": "#0d9488",
    "Azure AI Language": "#2563eb",
    "Azure AI Speech": "#7c3aed",
    "Azure AI Document Intelligence": "#d97706",
    "Azure AI Search": "#0891b2",
    "Azure OpenAI Service": "#059669",
    "Conceptos Fundamentales de IA": "#64748b",
    "Azure AI Services": "#1d4ed8",
  };
  const color = domainColor[page.domain] ?? "#0d1629";

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium">Vista previa — {page.pageNumber}/61</p>
      <div
        className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden max-w-lg mx-auto"
        style={{ fontFamily: "Inter, sans-serif" }}
        data-testid={`preview-page-${page.id}`}
      >
        {/* Header */}
        <div style={{ backgroundColor: color }} className="px-5 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-70 font-medium mb-1">AI-200 · {page.domain}</p>
              <h2 className="text-sm font-bold leading-tight">{page.title}</h2>
            </div>
            <div className="text-3xl font-black opacity-20 leading-none">{page.pageNumber}</div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-5 space-y-4">
          {/* Concepts */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Conceptos clave</p>
            {page.concepts ? (
              <div className="grid grid-cols-2 gap-1.5">
                {page.concepts.split(",").slice(0, 6).map((c: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-sm px-2 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-gray-700 leading-tight">{c.trim()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {["Concepto A", "Concepto B", "Concepto C", "Concepto D"].map((c, i) => (
                  <div key={i} className="h-8 bg-gray-50 border border-dashed border-gray-200 rounded-sm flex items-center px-2">
                    <span className="text-[10px] text-gray-300">{c}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context excerpt */}
          {page.context && (
            <div className="text-[10px] text-gray-500 leading-relaxed border-l-2 pl-3" style={{ borderColor: color + "60" }}>
              {page.context.slice(0, 180)}{page.context.length > 180 ? "..." : ""}
            </div>
          )}

          {/* Trampa */}
          {page.examTraps && (
            <div className="border border-red-200 bg-red-50 rounded-sm px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">Trampa de examen</p>
              <p className="text-[10px] text-red-700 leading-snug">
                {page.examTraps.slice(0, 140)}{page.examTraps.length > 140 ? "..." : ""}
              </p>
            </div>
          )}

          {/* Autocheck */}
          {page.autocheckQuestion && (
            <div className="border border-teal-200 bg-teal-50 rounded-sm px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-teal-600 mb-1">Autocheck</p>
              <p className="text-[10px] text-gray-700 mb-1">{page.autocheckQuestion}</p>
              {page.autocheckAnswer && (
                <p className="text-[10px] font-semibold text-teal-800">R: {page.autocheckAnswer}</p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
            <p className="text-[9px] text-gray-300">Microsoft AI-200 · Contrato Visual v1.2</p>
            <p className="text-[9px] text-gray-300">{page.pageNumber}/61</p>
          </div>
        </div>
      </div>
    </div>
  );
}
