import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowRightLeft,
  Blocks,
  ChevronLeft,
  ChevronsUpDown,
  Layers3,
  Loader2,
  Lock,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import {
  fetchComposerProposal,
  fetchStudioCatalog,
  type ComposerBlock,
  type ComposerProposal,
  type StudioCatalog,
} from "@/lib/studio-api";

const DIMENSIONS = [
  { key: "coverageScore", label: "Cobertura" },
  { key: "readabilityScore", label: "Legibilidad" },
  { key: "usefulDensityScore", label: "Densidad util" },
  { key: "examUtilityScore", label: "Utilidad de examen" },
  { key: "consistencyScore", label: "Consistencia" },
] as const;

function labelFamily(family: ComposerProposal["draft"]["family"]) {
  switch (family) {
    case "comparison":
      return "Comparativa";
    case "architecture":
      return "Arquitectura";
    case "decision":
      return "Decision";
    case "coverage_map":
      return "Cobertura / mapa";
    case "lifecycle":
      return "Ciclo / flujo";
    default:
      return family;
  }
}

function labelTransition(level: ComposerProposal["recommendedTransition"]["level"]) {
  switch (level) {
    case "composer_minor":
      return "Composer minor";
    case "composer_structural":
      return "Composer structural";
    case "composer_full":
      return "Composer full";
    default:
      return level;
  }
}

function labelBlockType(type: ComposerBlock["type"]) {
  switch (type) {
    case "hero_title":
      return "Hero";
    case "context_deck":
      return "Contexto";
    case "guide_question":
      return "Pregunta guia";
    case "diagram_panel":
      return "Diagrama";
    case "comparison_panel":
      return "Comparativa";
    case "decision_tree":
      return "Arbol de decision";
    case "map_panel":
      return "Mapa / cobertura";
    case "exam_traps":
      return "Trampas";
    case "autocheck":
      return "Autocheck";
    case "exam_signal":
      return "Senal de examen";
    default:
      return type;
  }
}

function summarizeBlockContent(block: ComposerBlock): string {
  const content = block.content;
  if ("title" in content && typeof content.title === "string") {
    return content.title;
  }
  if ("context" in content && typeof content.context === "string") {
    return content.context;
  }
  if ("question" in content && typeof content.question === "string") {
    return content.question;
  }
  if ("message" in content && typeof content.message === "string") {
    return content.message;
  }
  if ("modules" in content && Array.isArray(content.modules)) {
    const labels = content.modules
      .map((item) => (typeof item === "object" && item && "title" in item ? String((item as { title: string }).title) : "modulo"))
      .slice(0, 2);
    return labels.join(" · ");
  }
  if ("traps" in content && Array.isArray(content.traps)) {
    return `${content.traps.length} trampas propuestas`;
  }
  if ("options" in content && Array.isArray(content.options)) {
    return `${content.options.length} opciones de validacion`;
  }
  return "Bloque listo para composicion editorial";
}

function scoreToHundred(score: number) {
  return Math.round(score * 10);
}

export default function ComposerPage() {
  const [, params] = useRoute("/composer/:id");
  const [, setLocation] = useLocation();
  const pageIdFromRoute = params?.id ? String(parseInt(params.id, 10)).padStart(2, "0") : "01";

  const [studioCatalog, setStudioCatalog] = useState<StudioCatalog | null>(null);
  const [proposal, setProposal] = useState<ComposerProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStudioCatalog()
      .then((studioData) => {
        if (!mounted) return;
        setStudioCatalog(studioData);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchComposerProposal(pageIdFromRoute)
      .then((data) => {
        if (!mounted) return;
        setProposal(data);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setProposal(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute]);

  const pageSummary = useMemo(() => {
    return studioCatalog?.pages.find((page) => page.pageId === pageIdFromRoute) ?? studioCatalog?.pages[0] ?? null;
  }, [studioCatalog, pageIdFromRoute]);

  const scoreGap = proposal ? Math.max(0, 9.5 - proposal.draft.editorialValidation.total) : null;

  return (
    <Layout title="Composer">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setLocation("/biblioteca")}
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Visual Atlas Composer</p>
            <p className="text-sm font-bold text-white/85 truncate">
              {pageSummary ? `${pageSummary.title}` : `Pagina ${pageIdFromRoute}`}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5 truncate">
              {proposal ? `${labelFamily(proposal.draft.family)} · ${labelTransition(proposal.recommendedTransition.level)}` : "Cargando propuesta compositiva"}
            </p>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setSelectorOpen((value) => !value)}
              className="flex items-center gap-2 h-9 px-3 rounded-sm border border-white/[0.08] bg-white/[0.02] text-[10px] text-white/70 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              <span className="font-bold">{pageIdFromRoute}</span>
              <span className="max-w-[260px] truncate">{pageSummary?.title ?? "Seleccionar pagina"}</span>
              <ChevronsUpDown className="w-3 h-3 text-white/35" />
            </button>

            {selectorOpen && (
              <div className="absolute right-0 top-11 w-[360px] max-h-[360px] overflow-y-auto rounded-sm border border-white/[0.08] bg-[#0d1629] shadow-2xl z-20">
                {(studioCatalog?.pages ?? []).map((page) => {
                  const active = page.pageId === pageIdFromRoute;
                  return (
                    <button
                      key={page.pageId}
                      type="button"
                      onClick={() => {
                        setSelectorOpen(false);
                        setLocation(`/composer/${page.pageId}`);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 border-b border-white/[0.04] transition-all",
                        active ? "bg-blue-500/10 text-white" : "text-white/65 hover:bg-white/[0.03] hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-white/30">{page.pageNumber}</span>
                        <span className="text-[10px] font-semibold line-clamp-2">{page.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!loading && error && (
            <div className="max-w-5xl mx-auto bg-red-500/8 border border-red-500/20 rounded-sm p-4">
              <p className="text-[11px] font-bold text-red-300">No se pudo construir la vista Composer</p>
              <p className="text-[10px] text-red-200/70 mt-1">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="max-w-5xl mx-auto flex items-center gap-2 py-8 text-white/35">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px]">Armando propuesta editorial compositiva...</span>
            </div>
          ) : proposal ? (
            <div className="max-w-6xl mx-auto space-y-4">
              <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Transicion recomendada</p>
                      <p className="text-sm font-black text-white/88 mt-1">{labelTransition(proposal.recommendedTransition.level)}</p>
                      <p className="text-[10px] text-white/45 mt-2 leading-relaxed max-w-2xl">
                        {proposal.recommendedTransition.reason}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                      <ArrowRightLeft className="w-4 h-4 text-white/35" />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-emerald-300/85 uppercase tracking-widest">Se desbloquea</p>
                      <ul className="mt-2 space-y-1.5">
                        {proposal.recommendedTransition.unlockedCapabilities.map((item) => (
                          <li key={item} className="text-[10px] text-white/70 leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-amber-300/85 uppercase tracking-widest">Se mantiene bloqueado</p>
                      <ul className="mt-2 space-y-1.5">
                        {proposal.recommendedTransition.blockedCapabilities.map((item) => (
                          <li key={item} className="text-[10px] text-white/70 leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Puntaje editorial Composer</p>
                      <p className="text-sm font-black text-white/88 mt-1">
                        {proposal.draft.editorialValidation.total.toFixed(1)}/10
                      </p>
                      <p className="text-[10px] text-white/45 mt-1">
                        Brecha hacia 9.5: <span className="text-amber-300/85 font-semibold">{scoreGap?.toFixed(1) ?? "0.0"}</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-white/35" />
                    </div>
                  </div>

                  <div className="space-y-3 mt-4">
                    {DIMENSIONS.map((dimension) => {
                      const score = proposal.draft.editorialValidation[dimension.key];
                      const hundred = scoreToHundred(score);
                      return (
                        <div key={dimension.key}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] text-white/70 font-semibold">{dimension.label}</span>
                            <span className={cn("text-[11px] font-bold", scoreColorDark(hundred))}>{hundred}/100</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", hundred >= 90 ? "bg-emerald-400" : hundred >= 80 ? "bg-cyan-400" : "bg-amber-400")}
                              style={{ width: `${Math.min(100, hundred)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Referencia locked</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">{proposal.lockedReference.title}</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Contrato</p>
                      <p className="text-[10px] text-white/70 mt-2">{proposal.lockedReference.contractId}</p>
                    </div>
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Dominio</p>
                      <p className="text-[10px] text-white/70 mt-2">{proposal.lockedReference.domain}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-2">Zonas preservadas</p>
                    <div className="flex flex-wrap gap-2">
                      {proposal.lockedReference.preservedZones.map((zone) => (
                        <span key={zone} className="px-2 py-1 rounded-sm border border-white/[0.06] bg-white/[0.02] text-[9px] text-white/58">
                          {zone}
                        </span>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Cobertura y validacion</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">
                        {proposal.draft.structuralValidation.passed ? "Minimos cubiertos" : "Faltan minimos estructurales"}
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 mt-4">
                    <CoverageCard title="Nucleo tecnico" ok={proposal.draft.coverage.technicalCore} />
                    <CoverageCard title="Senal de examen" ok={proposal.draft.coverage.examSignals} />
                    <CoverageCard title="Validacion final" ok={proposal.draft.coverage.validationPresent} />
                  </div>

                  {proposal.draft.structuralValidation.missing.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[8px] font-bold text-red-300/80 uppercase tracking-widest mb-2">Faltantes</p>
                      <div className="space-y-2">
                        {proposal.draft.structuralValidation.missing.map((item) => (
                          <div key={item} className="px-3 py-2 rounded-sm bg-red-500/8 border border-red-500/15 text-[10px] text-red-200/80">
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-[8px] font-bold text-amber-300/80 uppercase tracking-widest mb-2">Advertencias / weak areas</p>
                    <div className="space-y-2">
                      {[...proposal.draft.structuralValidation.warnings, ...proposal.draft.coverage.weakAreas].length > 0 ? (
                        [...proposal.draft.structuralValidation.warnings, ...proposal.draft.coverage.weakAreas].map((item) => (
                          <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/65">
                            {item}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 rounded-sm bg-emerald-500/8 border border-emerald-500/15 text-[10px] text-emerald-200/75">
                          La propuesta no tiene alertas estructurales evidentes.
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                <div className="flex items-center gap-2">
                  <Blocks className="w-4 h-4 text-white/30" />
                  <div>
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Composicion propuesta</p>
                    <p className="text-[12px] font-bold text-white/78 mt-0.5">
                      {proposal.draft.blocks.length} bloques · familia {labelFamily(proposal.draft.family)}
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-3 mt-4">
                  {proposal.draft.blocks
                    .slice()
                    .sort((a, b) => a.priority - b.priority)
                    .map((block) => (
                      <div key={block.id} className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest">P{block.priority}</span>
                              <span className="text-[11px] font-bold text-white/80">{labelBlockType(block.type)}</span>
                              <span className="px-1.5 py-px rounded-sm border border-white/[0.06] text-[8px] text-blue-200/70 bg-blue-500/8">
                                {block.variant}
                              </span>
                              {block.required && (
                                <span className="px-1.5 py-px rounded-sm border border-emerald-500/15 text-[8px] text-emerald-200/75 bg-emerald-500/8">
                                  requerido
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/58 mt-2 leading-relaxed">
                              {summarizeBlockContent(block)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[8px] text-white/20 uppercase tracking-widest">Altura</p>
                            <p className="text-[9px] text-white/55 mt-1">{block.minHeight}-{block.maxHeight}px</p>
                          </div>
                        </div>

                        {block.dependsOn && block.dependsOn.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-[8px] text-white/35">
                            <Waypoints className="w-3 h-3" />
                            <span>Depende de: {block.dependsOn.join(", ")}</span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </section>

              <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-4">
                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <Layers3 className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Siguientes acciones</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">Como usar esta propuesta</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    {proposal.nextActions.map((item) => (
                      <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <div className="flex items-center gap-2">
                    <MapPinned className="w-4 h-4 text-white/30" />
                    <div>
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Lectura editorial</p>
                      <p className="text-[12px] font-bold text-white/78 mt-0.5">Que estamos intentando mejorar</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      El modo Composer no desecha el locked actual: parte de esa base y nos ayuda a ajustar densidad, bloques dominantes y senales de examen sin perder identidad de coleccion.
                    </div>
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      Si sigues viendo el layout actual "igual", eso casi seguro significa que estas mirando un output viejo. Los cambios de contrato no son retroactivos: hay que regenerar page.html para verlos.
                    </div>
                    <div className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/68">
                      Esta vista sirve justo para eso: evaluar si conviene quedarse en locked, pasar a composer minor o abrir una correccion mas estructural antes de seguir con el batch.
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
}

function CoverageCard({ title, ok }: { title: string; ok: boolean }) {
  return (
    <div className={cn(
      "rounded-sm border p-3",
      ok ? "bg-emerald-500/8 border-emerald-500/15" : "bg-amber-500/8 border-amber-500/15"
    )}>
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/30">{title}</p>
      <p className={cn("text-[11px] font-bold mt-2", ok ? "text-emerald-200/85" : "text-amber-200/85")}>
        {ok ? "Cubierto" : "Pendiente"}
      </p>
    </div>
  );
}
