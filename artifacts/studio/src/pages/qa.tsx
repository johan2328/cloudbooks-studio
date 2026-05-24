import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetPage, useGetQA, useApprovePage, useRequestRevision, useCreateRun, getGetPageQueryKey, getListPagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, statusColorDark, statusLabel, scoreColorDark } from "@/lib/utils";
import { CheckCircle2, RotateCcw, AlertTriangle, ChevronLeft, ChevronRight, ShieldCheck, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const QA_DIMS = [
  { key: "artDirection",          label: "Dirección de Arte",       desc: "Composición, grid 8px, alineación, jerarquía visual" },
  { key: "editorialConsistency",  label: "Consistencia Editorial",   desc: "Iconografía uniforme, paleta correcta, tipografía" },
  { key: "readability",           label: "Legibilidad",              desc: "Tamaño de texto, contraste, claridad de lectura" },
  { key: "technicalAccuracy",     label: "Precisión Técnica",        desc: "Correctitud de conceptos, terminología Microsoft" },
  { key: "total",                 label: "QA Total",                 desc: "Score compuesto ponderado · Red team objetivo ≥ 9.5" },
] as const;

const DEFECT_TYPES = [
  { id: "icon_variance",    label: "Varianza iconográfica",               desc: "Iconos de distinta familia en la misma página" },
  { id: "type_drift",       label: "Alteración tipográfica",              desc: "Tamaños o pesos de fuente que rompen la jerarquía" },
  { id: "label_dup",        label: "Duplicación de etiquetas",            desc: "Mismo concepto aparece dos veces con nombres distintos" },
  { id: "empty_gap",        label: "Huecos no informativos",              desc: "Espacio vacío sin propósito narrativo" },
  { id: "title_conflict",   label: "Título compite con diagrama",         desc: "El título visual eclipsa el diagrama o viceversa" },
  { id: "crop",             label: "Recorte de elementos",                desc: "Texto o iconos cortados por borde de página" },
  { id: "color_incoherence","label": "Incoherencia cromática",            desc: "Colores fuera del sistema de paleta del atlas" },
  { id: "autocheck_repeat", label: "Respuesta autocheck repetida",        desc: "La respuesta correcta es idéntica a una opción incorrecta" },
];

const DOMAIN_COLORS: Record<string, string> = {
  "Azure AI Vision":                  "#0891b2",
  "Azure AI Language":                "#7c3aed",
  "Azure AI Speech":                  "#0d9488",
  "Azure AI Document Intelligence":   "#d97706",
  "Azure AI Search":                  "#2563eb",
  "Azure OpenAI Service":             "#059669",
  "Conceptos Fundamentales de IA":    "#64748b",
  "Azure AI Services":                "#1d4ed8",
};

export default function QA() {
  const [, params] = useRoute("/qa/:id");
  const id = parseInt(params?.id ?? "1", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revisionComment, setRevisionComment] = useState("");
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [checkedDefects, setCheckedDefects] = useState<Set<string>>(new Set());

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
        toast({ title: "✓ Página aprobada", description: `Pág. ${page?.pageNumber} — lista para exportación.` });
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
        toast({ title: "Corrección solicitada", description: "La página volvió a Pendiente para regeneración." });
      }
    });
  }

  function handleRegenerate() {
    createRun.mutate({ data: { pageId: id } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        toast({ title: "Regeneración iniciada", description: "La versión anterior queda en historial." });
      }
    });
  }

  function toggleDefect(idStr: string) {
    setCheckedDefects((prev) => {
      const next = new Set(prev);
      if (next.has(idStr)) next.delete(idStr); else next.add(idStr);
      return next;
    });
  }

  if (pageLoading) return (
    <Layout title="QA y Aprobación">
      <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 bg-white/[0.04]" />)}</div>
    </Layout>
  );

  if (!page) return (
    <Layout title="QA y Aprobación">
      <div className="p-6 text-sm text-white/30">Página no encontrada.</div>
    </Layout>
  );

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < 61 ? id + 1 : null;
  const color = DOMAIN_COLORS[page.domain ?? ""] ?? "#0d1629";
  const totalScore = qa ? (qa as any).total as number : null;
  const redTeamScore = totalScore != null ? (totalScore / 10).toFixed(1) : null;
  const isProductionReady = totalScore != null && totalScore >= 95;

  return (
    <Layout title={`QA y Aprobación — Pág. ${page.pageNumber}`}>
      {/* Topbar */}
      <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-2.5 flex items-center gap-3">
        <button onClick={() => setLocation("/biblioteca")} className="text-xs text-white/30 hover:text-white/70 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Biblioteca
        </button>
        <span className="text-white/10">|</span>
        {prevId && <button onClick={() => setLocation(`/qa/${prevId}`)} className="text-xs text-white/30 hover:text-white/70 flex items-center gap-0.5"><ChevronLeft className="w-3 h-3" /> Anterior</button>}
        {nextId && <button onClick={() => setLocation(`/qa/${nextId}`)} className="text-xs text-white/30 hover:text-white/70 flex items-center gap-0.5">Siguiente <ChevronRight className="w-3 h-3" /></button>}

        <div className="ml-auto flex items-center gap-3">
          {isProductionReady && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm">
              <ShieldCheck className="w-3 h-3" /> Lista para producción
            </span>
          )}
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", statusColorDark(page.status))}>
            {statusLabel(page.status)}
          </span>
          {totalScore != null && (
            <span className={cn("text-base font-bold tabular-nums", scoreColorDark(totalScore))}>{totalScore}</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 overflow-hidden" style={{ height: "calc(100vh - 106px)" }}>
        {/* Center: Infografia preview */}
        <div className="flex-1 p-5 overflow-y-auto bg-[#0a1220]">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-3.5 h-3.5 text-white/30" />
            <p className="text-xs text-white/40 font-medium uppercase tracking-wide">Vista editorial — {page.pageNumber}/61</p>
            <span className="text-[10px] text-white/15">AI-200 Visual Study Atlas · Contrato Visual v1.4</span>
          </div>
          <InfografiaPreview page={page} color={color} />
        </div>

        {/* Right: QA Panel */}
        <div className="w-80 shrink-0 border-l border-white/[0.06] bg-[#0d1629] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Scores */}
            <section>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-3">Diagnóstico Editorial</p>
              {qaLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 bg-white/[0.04]" />)}</div>
              ) : qa ? (
                <div className="space-y-1.5">
                  {QA_DIMS.map(({ key, label, desc }) => {
                    const score = (qa as any)[key] as number;
                    const redTeam = (score / 10).toFixed(1);
                    return (
                      <div key={key} className={cn("px-2.5 py-2 rounded-sm border",
                        key === "total" ? "border-white/[0.08] bg-white/[0.03] mt-2" : "border-white/[0.04]")}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn("text-[10px] font-semibold", key === "total" ? "text-white" : "text-white/60")}>{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-white/25 tabular-nums">{redTeam}/10</span>
                            <span className={cn("text-xs font-bold tabular-nums", scoreColorDark(score))}>{Math.round(score)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-white/[0.06] rounded-full h-1">
                          <div className={cn("h-1 rounded-full transition-all",
                            score >= 95 ? "bg-emerald-500" : score >= 90 ? "bg-teal-500" : score >= 75 ? "bg-amber-400" : "bg-red-400")}
                            style={{ width: `${score}%` }} />
                        </div>
                        {key === "total" && (
                          <p className="text-[9px] text-white/25 mt-1">{desc}</p>
                        )}
                      </div>
                    );
                  })}
                  {redTeamScore && (
                    <div className={cn("flex items-center justify-between px-2.5 py-2 rounded-sm border text-xs font-bold",
                      parseFloat(redTeamScore) >= 9.5 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-amber-500/20 bg-amber-500/10 text-amber-400")}>
                      <span>Score Red Team</span>
                      <span className="tabular-nums">{redTeamScore} / 10</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-white/25 text-center py-4 border border-dashed border-white/[0.06] rounded-sm">
                  Sin datos QA registrados para esta página.
                </div>
              )}
            </section>

            {/* Observations */}
            {qa && (qa.observations as string[]).length > 0 && (
              <section>
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Observaciones</p>
                <ul className="space-y-1.5">
                  {(qa.observations as string[]).map((obs, i) => (
                    <li key={i} className="text-[10px] text-white/50 flex items-start gap-2 leading-relaxed">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1 shrink-0" />
                      {obs}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Red team log */}
            {qa && (qa.redTeam as string[]).length > 0 && (
              <section>
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Log Red Team</p>
                <ul className="space-y-1.5">
                  {(qa.redTeam as string[]).map((r, i) => (
                    <li key={i} className={cn("text-[10px] flex items-start gap-2 leading-relaxed",
                      r.startsWith("✓") ? "text-emerald-400" : r.startsWith("⚠") ? "text-amber-400" : "text-white/40")}>
                      <span className="shrink-0">{r.slice(0, 1)}</span>
                      <span>{r.slice(2)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Defect checklist */}
            <section>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">Control de defectos</p>
              <div className="space-y-1">
                {DEFECT_TYPES.map((d) => (
                  <label key={d.id} className={cn(
                    "flex items-start gap-2 px-2 py-1.5 rounded-sm cursor-pointer group border transition-colors",
                    checkedDefects.has(d.id) ? "border-red-500/20 bg-red-500/5" : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"
                  )}>
                    <input type="checkbox" className="mt-0.5 shrink-0 accent-red-500"
                      checked={checkedDefects.has(d.id)}
                      onChange={() => toggleDefect(d.id)} />
                    <div>
                      <p className={cn("text-[10px] font-medium", checkedDefects.has(d.id) ? "text-red-400" : "text-white/60")}>{d.label}</p>
                      <p className="text-[9px] text-white/25">{d.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              {checkedDefects.size > 0 && (
                <p className="text-[10px] text-red-400 font-semibold mt-2 px-1">
                  {checkedDefects.size} defecto{checkedDefects.size !== 1 ? "s" : ""} marcado{checkedDefects.size !== 1 ? "s" : ""} — requiere corrección
                </p>
              )}
            </section>
          </div>

          {/* Actions — sticky bottom */}
          <div className="border-t border-white/[0.06] p-3 space-y-1.5 bg-[#0d1629] shrink-0">
            <Button onClick={handleApprove}
              disabled={page.status === "approved" || approvePage.isPending || checkedDefects.size > 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
              data-testid="button-approve">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {page.status === "approved" ? "Ya aprobada" : checkedDefects.size > 0 ? "Defectos pendientes" : "Aprobar página"}
            </Button>

            {showRevisionInput ? (
              <div className="space-y-1.5">
                <textarea rows={2}
                  className="w-full text-[10px] border border-amber-500/20 rounded-sm p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500/40 bg-[#0a1220] text-white/70 placeholder:text-white/20"
                  placeholder="Motivo de la corrección..."
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  data-testid="input-revision-comment" />
                <div className="flex gap-1.5">
                  <Button onClick={handleRevision} disabled={requestRevision.isPending}
                    variant="outline" className="flex-1 text-xs h-7 border-amber-500/25 text-amber-400 hover:bg-amber-500/10 bg-transparent">
                    Confirmar
                  </Button>
                  <Button onClick={() => setShowRevisionInput(false)} variant="ghost" className="text-xs h-7 text-white/30 hover:text-white/60 hover:bg-white/[0.03]">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowRevisionInput(true)} variant="outline"
                className="w-full text-xs h-8 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                data-testid="button-request-revision">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Solicitar corrección
              </Button>
            )}

            <Button onClick={handleRegenerate} variant="outline" disabled={createRun.isPending}
              className="w-full text-xs h-8 border-white/[0.08] text-white/40 hover:bg-white/[0.03] bg-transparent"
              data-testid="button-regenerate">
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              {createRun.isPending ? "Iniciando..." : "Regenerar selectivamente"}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfografiaPreview({ page, color }: { page: any; color: string }) {
  const hasTrap = !!page.examTraps;
  const hasAutocheck = !!page.autocheckQuestion;
  const concepts = page.concepts?.split(",").map((c: string) => c.trim()).filter(Boolean) ?? [];

  return (
    <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm shadow-sm overflow-hidden max-w-xl mx-auto"
      data-testid={`preview-page-${page.id}`}>
      {/* Header — stable zone */}
      <div style={{ backgroundColor: color }} className="px-5 py-3.5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] uppercase tracking-widest opacity-60 font-semibold">AI-200 Visual Study Atlas</span>
              <span className="text-[9px] opacity-40">·</span>
              <span className="text-[9px] uppercase tracking-wider opacity-60">{page.domain}</span>
            </div>
            <h2 className="text-sm font-bold leading-snug">{page.title}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black opacity-15 leading-none">{page.pageNumber}</div>
            <div className="text-[9px] opacity-40 mt-0.5">/ 61</div>
          </div>
        </div>
      </div>

      {/* Contexto */}
      {page.context && (
        <div className="px-5 pt-4 pb-2">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>Contexto</p>
          <p className="text-[10px] text-white/50 leading-relaxed">
            {page.context.slice(0, 280)}{page.context.length > 280 ? "…" : ""}
          </p>
        </div>
      )}

      {/* Conceptos clave */}
      {concepts.length > 0 && (
        <div className="px-5 py-3">
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color }}>Conceptos clave</p>
          <div className="grid grid-cols-2 gap-1.5">
            {concepts.slice(0, 8).map((c: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-sm px-2 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-white/50 leading-tight">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagrama placeholder */}
      <div className="px-5 py-3 border-t border-white/[0.04]">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2 text-white/25">Diagrama visual</p>
        <div className="h-16 border border-dashed border-white/[0.08] rounded-sm flex items-center justify-center bg-white/[0.02]">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {[1,2,3].map((i) => (
                <div key={i} className="px-2 py-1 rounded-sm text-[8px] font-semibold text-white"
                  style={{ backgroundColor: color, opacity: 0.6 + (i * 0.15) }}>
                  {i === 1 ? "A" : i === 2 ? "B" : "C"}
                </div>
              ))}
            </div>
            <p className="text-[8px] text-white/20">Storytelling visual flexible · Asset local pendiente</p>
          </div>
        </div>
      </div>

      {/* Trampas + Autocheck — stable zones */}
      <div className="flex gap-0">
        {/* Trampas — lower left */}
        <div className={cn("flex-1 border-t px-3 py-2.5", hasTrap ? "border-red-500/10 bg-red-500/5" : "border-white/[0.04] bg-white/[0.02]")}>
          <p className={cn("text-[8px] font-bold uppercase tracking-widest mb-1.5", hasTrap ? "text-red-400" : "text-white/20")}>
            Trampa de examen
          </p>
          {hasTrap ? (
            <div className="border border-red-500/15 rounded-sm px-2 py-1.5 bg-[#0a1220]">
              <p className="text-[9px] text-red-300/80 leading-snug">
                {page.examTraps.split("\n")[0].slice(0, 120)}
                {page.examTraps.length > 120 ? "…" : ""}
              </p>
            </div>
          ) : (
            <div className="h-6 border border-dashed border-red-500/10 rounded-sm" />
          )}
        </div>

        {/* Autocheck — lower right */}
        <div className={cn("flex-1 border-t border-l px-3 py-2.5", hasAutocheck ? "border-teal-500/10 bg-teal-500/5" : "border-white/[0.04] bg-white/[0.02]")}>
          <p className={cn("text-[8px] font-bold uppercase tracking-widest mb-1.5", hasAutocheck ? "text-teal-400" : "text-white/20")}>
            Autocheck
          </p>
          {hasAutocheck ? (
            <div className="border border-teal-500/15 rounded-sm px-2 py-1.5 bg-[#0a1220] space-y-0.5">
              <p className="text-[9px] text-white/50 leading-snug font-medium">
                {page.autocheckQuestion.slice(0, 80)}{page.autocheckQuestion.length > 80 ? "…" : ""}
              </p>
              <p className="text-[9px] text-teal-300/80 font-semibold">R: {page.autocheckAnswer}</p>
            </div>
          ) : (
            <div className="h-6 border border-dashed border-teal-500/10 rounded-sm" />
          )}
        </div>
      </div>

      {/* Footer — stable zone */}
      <div className="border-t border-white/[0.04] px-5 py-2 flex items-center justify-between bg-white/[0.02]">
        <p className="text-[8px] text-white/15 font-mono truncate max-w-xs">
          {page.sources?.split("\n")[0]?.slice(0, 60) ?? "learn.microsoft.com/es-es/azure/ai-services"}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[8px] text-white/15">Contrato v1.4</p>
          <p className="text-[8px] text-white/15">{page.pageNumber}/61</p>
        </div>
      </div>
    </div>
  );
}
