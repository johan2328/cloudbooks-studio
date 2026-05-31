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
  type StudioCatalogPage,
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

function estimateBlockHeight(block: ComposerBlock): number {
  switch (block.type) {
    case "hero_title":
      return block.variant === "full" ? 126 : 108;
    case "context_deck":
      return block.variant === "expanded" ? 118 : 82;
    case "guide_question":
      return 42;
    case "comparison_panel":
      return 240;
    case "diagram_panel":
      return block.variant === "multi_step" ? 224 : 208;
    case "decision_tree":
      return 214;
    case "map_panel":
      return 198;
    case "exam_traps":
      return block.variant === "compact" ? 120 : 154;
    case "autocheck":
      return block.variant === "short" ? 124 : 162;
    case "exam_signal":
      return 90;
    default:
      return block.minHeight;
  }
}

function computeSpacePlan(blocks: ComposerBlock[]) {
  const introHeight = blocks
    .filter((block) => ["hero_title", "context_deck", "guide_question"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const technicalHeight = blocks
    .filter((block) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const examHeight = blocks
    .filter((block) => ["exam_traps", "autocheck", "exam_signal"].includes(block.type))
    .reduce((sum, block) => sum + estimateBlockHeight(block), 0);
  const total = Math.max(1, introHeight + technicalHeight + examHeight);
  const technicalShare = Math.round((technicalHeight / total) * 100);
  const examShare = Math.round((examHeight / total) * 100);
  const introShare = Math.round((introHeight / total) * 100);
  const railMode = examShare >= 31 ? "compactar" : examShare <= 24 ? "estable" : "vigilar";
  const visualPressure = technicalShare >= 46 ? "fuerte" : technicalShare >= 39 ? "correcta" : "timida";
  const guidance =
    railMode === "compactar"
      ? "El rail inferior esta absorbiendo demasiada altura: conviene compactar traps o pasar autocheck a short."
      : visualPressure === "timida"
        ? "El cuerpo central aun no domina la pagina: conviene ampliar bloque tecnico o reducir chrome editorial."
        : "La pagina tiene un reparto de espacio razonable para seguir refinando detalles.";

  return { introHeight, technicalHeight, examHeight, introShare, technicalShare, examShare, railMode, visualPressure, guidance };
}

function blockAccent(type: ComposerBlock["type"]) {
  switch (type) {
    case "hero_title":
      return "from-slate-400/80 to-slate-500/50";
    case "context_deck":
      return "from-blue-400/80 to-cyan-400/50";
    case "guide_question":
      return "from-blue-500/80 to-sky-400/50";
    case "comparison_panel":
      return "from-violet-400/80 to-fuchsia-400/50";
    case "diagram_panel":
      return "from-blue-500/80 to-indigo-400/50";
    case "decision_tree":
      return "from-amber-400/80 to-orange-400/50";
    case "map_panel":
      return "from-teal-400/80 to-cyan-400/50";
    case "exam_traps":
      return "from-rose-400/80 to-red-400/50";
    case "autocheck":
      return "from-emerald-400/80 to-green-400/50";
    case "exam_signal":
      return "from-yellow-400/80 to-amber-400/50";
    default:
      return "from-slate-400/80 to-slate-500/50";
  }
}

function inferFamilyFromPage(page: StudioCatalogPage): ComposerProposal["draft"]["family"] {
  const text = `${page.title} ${page.domain} ${page.context} ${page.guideQuestion}`.toLowerCase();
  if (/(tier|sku|compar|replic)/.test(text)) return "comparison";
  if (/(identity|identidad|token|rol|managed identity|service principal)/.test(text)) return "decision";
  if (/(dns|network|firewall|private endpoint|vnet|red)/.test(text)) return "coverage_map";
  if (/(retention|cleanup|policy|lifecycle|task|limpieza|ciclo)/.test(text)) return "lifecycle";
  return "architecture";
}

function makeBlock(
  type: ComposerBlock["type"],
  variant: ComposerBlock["variant"],
  priority: number,
  content: Record<string, unknown>,
): ComposerBlock {
  const defaults: Record<ComposerBlock["type"], { minHeight: number; maxHeight: number; required: boolean }> = {
    hero_title: { minHeight: 88, maxHeight: 148, required: true },
    context_deck: { minHeight: 68, maxHeight: 132, required: true },
    guide_question: { minHeight: 34, maxHeight: 56, required: true },
    diagram_panel: { minHeight: 180, maxHeight: 360, required: false },
    comparison_panel: { minHeight: 160, maxHeight: 340, required: false },
    decision_tree: { minHeight: 160, maxHeight: 340, required: false },
    map_panel: { minHeight: 150, maxHeight: 320, required: false },
    exam_traps: { minHeight: 96, maxHeight: 200, required: true },
    autocheck: { minHeight: 96, maxHeight: 220, required: true },
    exam_signal: { minHeight: 70, maxHeight: 150, required: false },
  };

  return {
    id: `${type}:${priority}`,
    type,
    variant,
    priority,
    required: defaults[type].required,
    minHeight: defaults[type].minHeight,
    maxHeight: defaults[type].maxHeight,
    content,
  };
}

function buildClientProposal(page: StudioCatalogPage): ComposerProposal {
  const family = inferFamilyFromPage(page);
  const modules = page.visualModules;

  const commonIntro: ComposerBlock[] = [
    makeBlock("hero_title", "full", 10, { title: page.title, subtitle: page.domain }),
    makeBlock("context_deck", page.context.length > 240 ? "short" : "expanded", 20, { context: page.context }),
    makeBlock("guide_question", "editorial_bar", 30, { question: page.guideQuestion }),
  ];

  const examTail: ComposerBlock[] = [
    makeBlock("exam_traps", page.traps.length >= 3 ? "compact" : "standard", 80, {
      traps: page.traps.slice(0, 3),
    }),
    makeBlock("autocheck", page.autocheck.discardNotes.length > 2 ? "short" : "full", 90, {
      question: page.autocheck.question,
      options: page.autocheck.options,
      correctOption: page.autocheck.correctOption,
      explanation: page.autocheck.explanation,
      discardNotes: page.autocheck.discardNotes.slice(0, 2),
    }),
  ];

  let blocks: ComposerBlock[] = [];
  switch (family) {
    case "comparison":
      blocks = [
        ...commonIntro,
        makeBlock("comparison_panel", "sku_matrix", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "two_column", 50, { modules: modules.slice(0, 2) }),
        makeBlock("map_panel", "replication_path", 60, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "rule", 70, {
          message: "Las senales de examen pesan mas que el nombre del SKU cuando hay geo-replicacion o acceso privado.",
        }),
        ...examTail,
      ];
      break;
    case "decision":
      blocks = [
        ...commonIntro,
        makeBlock("decision_tree", "multi_branch", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "single_focus", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "warning", 70, {
          message: "En examen, elegir identidad o permiso equivocado rompe el flujo aunque ACR este bien configurado.",
        }),
        ...examTail,
      ];
      break;
    case "coverage_map":
      blocks = [
        ...commonIntro,
        makeBlock("map_panel", "network_boundary", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "multi_step", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "memory_hook", 70, {
          message: "Si el acceso falla, piensa primero en conectividad, DNS y boundary de red antes que en permisos de imagen.",
        }),
        ...examTail,
      ];
      break;
    case "lifecycle":
      blocks = [
        ...commonIntro,
        makeBlock("diagram_panel", "multi_step", 40, { modules: modules.slice(0, 2) }),
        makeBlock("decision_tree", "binary_path", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "rule", 70, {
          message: "Politica, limpieza y automatizacion deben leerse como un ciclo operativo, no como features aisladas.",
        }),
        ...examTail,
      ];
      break;
    case "architecture":
    default:
      blocks = [
        ...commonIntro,
        makeBlock("diagram_panel", "two_column", 40, { modules: modules.slice(0, 2) }),
        makeBlock("diagram_panel", "multi_step", 50, { modules: modules.slice(2, 4) }),
        makeBlock("exam_signal", "memory_hook", 70, {
          message: "El lector debe recordar el flujo principal y la senal de examen, no solo los nombres de los servicios.",
        }),
        ...examTail,
      ];
      break;
  }

  const technicalCore = blocks.some((b) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(b.type));
  const examSignals = blocks.some((b) => b.type === "exam_traps" || b.type === "exam_signal");
  const validationPresent = blocks.some((b) => b.type === "autocheck");
  const technicalCoreCount = blocks.filter((b) => ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(b.type)).length;
  const missing: string[] = [];
  if (!blocks.some((b) => b.type === "hero_title" || b.type === "context_deck")) missing.push("Falta un bloque de apertura.");
  if (blocks.filter((b) => b.type === "guide_question").length !== 1) missing.push("La pagina debe tener exactamente una pregunta guia.");
  if (technicalCoreCount < 2) missing.push("Faltan bloques tecnicos centrales.");
  if (blocks.filter((b) => b.type === "autocheck").length !== 1) missing.push("La pagina debe tener exactamente un bloque de autocheck.");

  const warnings: string[] = [];
  if (blocks.some((b) => b.type === "exam_traps" && b.variant === "standard")) {
    warnings.push("Evalua compactar trampas si el cuerpo visual necesita mas respiracion.");
  }

  const weakAreas: string[] = [];
  if (!technicalCore) weakAreas.push("La composicion aun no explica el nucleo tecnico.");
  if (!examSignals) weakAreas.push("La pagina no deja una senal clara de examen.");
  if (!validationPresent) weakAreas.push("Falta validacion para cerrar la lectura.");

  const coverageScore = technicalCoreCount >= 2 ? 9 : 7;
  const readabilityScore = blocks.some((b) => b.type === "autocheck" && b.variant === "short") ? 8.8 : 8.2;
  const usefulDensityScore = blocks.some((b) => b.type === "exam_traps" && b.variant === "compact") ? 9 : 8;
  const examUtilityScore = blocks.some((b) => b.type === "exam_signal") ? 9.2 : 8.4;
  const consistencyScore = family === "comparison" || family === "architecture" ? 8.8 : 8.5;
  const total = Number(((coverageScore + readabilityScore + usefulDensityScore + examUtilityScore + consistencyScore) / 5).toFixed(1));
  const structuralLevel = family === "comparison" && (page.context.length > 260 || page.autocheck.discardNotes.length > 2);

  return {
    source: "api_visual_atlas_composer_v1",
    pageId: page.pageId,
    lockedReference: {
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      contractId: page.contractVersion,
      title: page.title,
      domain: page.domain,
      preservedZones: ["hero title", "context deck", "guide question", "upper visual", "exam traps", "autocheck", "footer"],
    },
    recommendedTransition: {
      level: structuralLevel ? "composer_structural" : "composer_minor",
      reason: structuralLevel
        ? "La pagina pide reequilibrar cuerpo visual y rail inferior sin perder cobertura de examen."
        : "La transicion sirve para ajustar densidad, variantes y respiracion sin reescribir la pagina completa.",
      unlockedCapabilities: structuralLevel
        ? ["Compactar rail inferior", "Cambiar variantes de comparacion y mapa", "Anadir o quitar una senal de examen"]
        : ["Compactar traps y autocheck", "Expandir contexto", "Cambiar variante de pregunta guia"],
      blockedCapabilities: structuralLevel
        ? ["Romper minimos de cobertura", "Quitar pregunta guia"]
        : ["Eliminar nucleo tecnico", "Quitar validacion final"],
    },
    draft: {
      pageId: page.pageId,
      pageNumber: page.pageNumber,
      mode: "composer",
      family,
      blocks,
      coverage: {
        technicalCore,
        examSignals,
        validationPresent,
        weakAreas,
      },
      structuralValidation: {
        passed: missing.length === 0,
        missing,
        warnings,
      },
      editorialValidation: {
        coverageScore,
        readabilityScore,
        usefulDensityScore,
        examUtilityScore,
        consistencyScore,
        total,
      },
    },
    nextActions: [
      "Comparar esta propuesta contra la referencia locked.",
      "Validar si el rail inferior debe ir en modo compacto o estandar.",
      "Revisar si el nucleo tecnico necesita comparacion, decision o mapa como bloque dominante.",
    ],
  };
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
        const fallbackPage = studioCatalog?.pages.find((page) => page.pageId === pageIdFromRoute);
        if (fallbackPage) {
          setProposal(buildClientProposal(fallbackPage));
          setError("La ruta Composer del API aun no esta disponible en este runtime. Se mostro una propuesta local equivalente para no frenar la evaluacion editorial.");
        } else {
          setError(err instanceof Error ? err.message : String(err));
          setProposal(null);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [pageIdFromRoute, studioCatalog]);

  const pageSummary = useMemo(() => {
    return studioCatalog?.pages.find((page) => page.pageId === pageIdFromRoute) ?? studioCatalog?.pages[0] ?? null;
  }, [studioCatalog, pageIdFromRoute]);

  const scoreGap = proposal ? Math.max(0, 9.5 - proposal.draft.editorialValidation.total) : null;
  const spacePlan = useMemo(() => (proposal ? computeSpacePlan(proposal.draft.blocks) : null), [proposal]);

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
            <div className="max-w-5xl mx-auto bg-amber-500/8 border border-amber-400/20 rounded-sm p-4">
              <p className="text-[11px] font-bold text-amber-200">Composer usando propuesta local</p>
              <p className="text-[10px] text-amber-100/70 mt-1">{error}</p>
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

              {spacePlan && (
                <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Huella espacial</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Que tan dominante es el cuerpo visual frente al rail de examen</p>
                      </div>
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                        <Layers3 className="w-4 h-4 text-white/35" />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mt-4">
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Apertura</p>
                        <p className="text-lg font-black text-white/88 mt-1">{spacePlan.introShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">{spacePlan.introHeight}px estimados</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Cuerpo visual</p>
                        <p className="text-lg font-black text-emerald-300 mt-1">{spacePlan.technicalShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">Presion {spacePlan.visualPressure}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-3">
                        <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Rail inferior</p>
                        <p className="text-lg font-black text-amber-300 mt-1">{spacePlan.examShare}%</p>
                        <p className="text-[10px] text-white/45 mt-1">Modo {spacePlan.railMode}</p>
                      </div>
                    </div>

                    <div className="mt-4 px-3 py-3 rounded-sm bg-white/[0.02] border border-white/[0.05]">
                      <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Recomendacion</p>
                      <p className="text-[11px] text-white/68 leading-relaxed mt-2">{spacePlan.guidance}</p>
                    </div>
                  </section>

                  <section className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Mini layout</p>
                        <p className="text-[12px] font-bold text-white/78 mt-0.5">Wireframe rapido para detectar monotonia, rail pesado o foco timido</p>
                      </div>
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                        <Blocks className="w-4 h-4 text-white/35" />
                      </div>
                    </div>

                    <div className="mt-4 rounded-sm border border-white/[0.06] bg-[#09111e] p-3">
                      <div className="w-full aspect-[768/1152] rounded-sm border border-white/[0.06] bg-[#f7fbff] overflow-hidden p-[10px]">
                        <div className="h-full w-full flex flex-col gap-[8px]">
                          <div className="h-[10px] rounded-[2px] bg-[#0d1f57]" />
                          {proposal.draft.blocks
                            .slice()
                            .sort((a, b) => a.priority - b.priority)
                            .map((block) => {
                              const blockHeight = estimateBlockHeight(block);
                              const relativeHeight = Math.max(18, Math.min(92, Math.round(blockHeight / 3)));
                              const isTechnical = ["diagram_panel", "comparison_panel", "decision_tree", "map_panel"].includes(block.type);
                              const isExam = ["exam_traps", "autocheck", "exam_signal"].includes(block.type);
                              return (
                                <div
                                  key={`wire:${block.id}`}
                                  className={cn(
                                    "rounded-[6px] border border-[#d8e4f4] bg-white px-2 py-1 shadow-[0_1px_0_rgba(9,30,66,0.04)]",
                                    isTechnical ? "grid grid-cols-2 gap-2 items-stretch" : "flex items-center gap-2",
                                    isExam && "bg-[#fffdfd]"
                                  )}
                                  style={{ minHeight: `${relativeHeight}px` }}
                                >
                                  {isTechnical ? (
                                    <>
                                      <div className={cn("rounded-[4px] bg-gradient-to-r opacity-85", blockAccent(block.type))} />
                                      <div className={cn("rounded-[4px] bg-gradient-to-r opacity-55", blockAccent(block.type))} />
                                    </>
                                  ) : (
                                    <>
                                      <div className={cn("w-[26%] h-full min-h-[14px] rounded-[4px] bg-gradient-to-r opacity-85", blockAccent(block.type))} />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-[7px] leading-none font-bold text-[#18305f] uppercase tracking-[0.08em] truncate">
                                          {labelBlockType(block.type)}
                                        </div>
                                        <div className="text-[6px] text-[#607192] mt-1 truncate">{block.variant}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          <div className="h-[10px] rounded-[2px] bg-[#0d1f57]" />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

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
