import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { authHeaders, fetchStudioCatalog, type StudioCatalog } from "@/lib/studio-api";
import {
  BookOpen, FileText, Target, HelpCircle, Table2, Zap,
  ArrowRight, ChevronRight,
  Cpu, Download, Activity, Eye, Shield,
} from "lucide-react";

/* ─── Tipos ─────────────────────────────────────────────────────────────── */
type FormatStatus = "active" | "pending" | "planned";

interface FormatModule {
  id: string;
  num: string;
  name: string;
  tagline: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: FormatStatus;
  owner: string;
  lastUpdated: string | null;
  progress: { done: number; total: number } | null;
  qaScore: number | null;
  qaTarget: number;
  batches: string | null;
  color: string;
  href: string | null;
  statusLabel: string;
  notes: string;
}

const MODULES: FormatModule[] = [
  {
    id: "visual-atlas",
    num: "02",
    name: "Visual Atlas",
    tagline: "Estudio visual acelerado",
    role: "61 infografías organizadas en 13 batches por dominio Azure. El formato en producción activa — comunicación visual densa y técnicamente precisa.",
    icon: FileText,
    status: "active",
    owner: "Visual Agent + Editorial",
    lastUpdated: "2026-05-21",
    progress: { done: 6, total: 61 },
    qaScore: 9.2,
    qaTarget: 9.5,
    batches: "Batch 01–10 migrado · batch 11–20 pendiente grounding",
    color: "#2563eb",
    href: "/biblioteca",
    statusLabel: "Activo",
    notes: "QA promedio 9.2 — requiere llegar a 9.5. Riesgos: varianza iconográfica y espacios vacíos en páginas 03–06.",
  },
  {
    id: "master-book",
    num: "01",
    name: "Master Book",
    tagline: "Comprensión profunda",
    role: "Texto completo del dominio con explicaciones detalladas, analogías y marcos conceptuales. Base de referencia del equipo editorial y punto de entrada de cada certificación.",
    icon: BookOpen,
    status: "pending",
    owner: "Pedagogy Agent + Editorial Lead",
    lastUpdated: null,
    progress: null,
    qaScore: null,
    qaTarget: 9.5,
    batches: null,
    color: "#7c3aed",
    href: null,
    statusLabel: "Estructura pendiente",
    notes: "Requiere: definir plantilla de capítulo, estructura de dominios, longitud por sección y criterio de producción.",
  },
  {
    id: "exam-traps",
    num: "03",
    name: "Exam Traps Guide",
    tagline: "Trampas y distractores",
    role: "Guía de ambigüedades del examen: distractores frecuentes, señales de preguntas trampa y patrones de error por dominio Azure.",
    icon: Target,
    status: "pending",
    owner: "QA / Red Team",
    lastUpdated: null,
    progress: null,
    qaScore: null,
    qaTarget: 9.5,
    batches: null,
    color: "#0d9488",
    href: null,
    statusLabel: "Contenido base pendiente",
    notes: "Depende del grounding completo del Visual Atlas. El Red Team extraerá trampas identificadas en el proceso de QA.",
  },
  {
    id: "question-bank",
    num: "04",
    name: "Question Bank",
    tagline: "Práctica exhaustiva",
    role: "Banco de preguntas con explicación completa de por qué cada opción es correcta o incorrecta. Cubre todos los dominios del examen AI-200.",
    icon: HelpCircle,
    status: "pending",
    owner: "Editorial Agent + Pedagogy",
    lastUpdated: null,
    progress: null,
    qaScore: null,
    qaTarget: 9.5,
    batches: null,
    color: "#0284c7",
    href: null,
    statusLabel: "Diseño funcional pendiente",
    notes: "Requiere definir estructura de pregunta, categorías de dificultad y formato de exportación antes de producción.",
  },
  {
    id: "cheat-sheets",
    num: "05",
    name: "Cheat Sheets",
    tagline: "Repaso compacto",
    role: "Hojas de referencia rápida con tablas de decisión, comparativas de servicios y criterios de selección por escenario de examen.",
    icon: Table2,
    status: "planned",
    owner: "Editorial Agent",
    lastUpdated: null,
    progress: null,
    qaScore: null,
    qaTarget: 9.5,
    batches: null,
    color: "#d97706",
    href: null,
    statusLabel: "Planificado",
    notes: "Formato derivado del Visual Atlas — se produce tras consolidar contenido de batches 01–30.",
  },
  {
    id: "rapid-review",
    num: "06",
    name: "Rapid Review Pack",
    tagline: "Cierre pre-examen",
    role: "Sesión condensada para las últimas 48–72h antes del examen. Flashcards, síntesis de dominios, puntos críticos y checklist final.",
    icon: Zap,
    status: "planned",
    owner: "Editorial Lead",
    lastUpdated: null,
    progress: null,
    qaScore: null,
    qaTarget: 9.5,
    batches: null,
    color: "#059669",
    href: null,
    statusLabel: "Planificado",
    notes: "Último formato de la colección — producción inicia tras completar Visual Atlas, Cheat Sheets y Question Bank.",
  },
];

function QABadge({ score, target }: { score: number | null; target: number }) {
  if (!score) return <span className="text-white/15 text-lg font-black leading-none">—</span>;
  const ok = score >= target;
  return (
    <div className="text-right">
      <span className={`text-lg font-black leading-none ${ok ? "text-emerald-400" : "text-amber-400"}`}>{score.toFixed(1)}</span>
      <p className="text-[7px] text-white/25 mt-px">{ok ? "✓ objetivo" : `obj. ${target}`}</p>
    </div>
  );
}

function StatusBadge({ status, label }: { status: FormatStatus; label: string }) {
  if (status === "active") return (
    <span className="flex items-center gap-1 text-[8px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1.5 py-px rounded-sm uppercase tracking-wide">
      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />{label}
    </span>
  );
  if (status === "pending") return (
    <span className="text-[8px] font-bold bg-amber-500/10 text-amber-400/80 border border-amber-500/20 px-1.5 py-px rounded-sm uppercase tracking-wide">{label}</span>
  );
  return (
    <span className="text-[8px] font-bold bg-white/5 text-white/25 border border-white/10 px-1.5 py-px rounded-sm uppercase tracking-wide">{label}</span>
  );
}

export default function AI200Collection() {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<string | null>("visual-atlas");
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [visualAtlasQaAvg, setVisualAtlasQaAvg] = useState<number | null>(null);
  const [visualAtlasQaSamples, setVisualAtlasQaSamples] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchStudioCatalog()
      .then(async (data) => {
        if (!mounted) return;
        setCatalog(data);

        const pagesWithQa = data.pages.filter((p) => p.outputStatus.files.qaReport);
        if (!pagesWithQa.length) {
          setVisualAtlasQaAvg(null);
          setVisualAtlasQaSamples(0);
          return;
        }

        const results = await Promise.all(
          pagesWithQa.map(async (page) => {
            try {
              const res = await fetch(`/api/studio/qa-report/${page.pageId}`, {
                headers: authHeaders(),
                cache: "no-store",
              });
              if (!res.ok) return null;
              const report = await res.json() as { scores?: Record<string, number> };
              return typeof report.scores?.total === "number" ? report.scores.total : null;
            } catch {
              return null;
            }
          }),
        );

        const validScores = results.filter((score): score is number => typeof score === "number");
        setVisualAtlasQaSamples(validScores.length);
        setVisualAtlasQaAvg(validScores.length
          ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          : null);
      })
      .catch(() => {
        if (!mounted) return;
        setCatalog(null);
        setVisualAtlasQaAvg(null);
        setVisualAtlasQaSamples(0);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const activeModules = MODULES.filter(m => m.status === "active").length;
  const pendingModules = MODULES.filter(m => m.status === "pending").length;
  const visualAtlasStats = useMemo(() => {
    const pages = catalog?.pages ?? [];
    const generated = pages.filter((p) => p.outputStatus.hasOutput && p.outputStatus.files.html).length;
    const realVisuals = pages.filter((p) => p.outputStatus.generationMode === "openai_image").length;
    const approved = pages.filter((p) => p.outputStatus.files.approved).length;
    const seeds = catalog?.availableSeeds.length ?? 0;
    const expected = catalog?.totalExpected ?? 61;
    const qaScore = visualAtlasQaAvg;

    return {
      generated,
      realVisuals,
      approved,
      seeds,
      expected,
      qaScore,
      notes: generated > 0
        ? `${generated} output(s), ${realVisuals} con imagen real, ${approved} aprobado(s), ${visualAtlasQaSamples} QA report(s) reales.`
        : "Sin outputs generados en este entorno. Primero generar una pagina desde el modulo Visual Atlas.",
    };
  }, [catalog, visualAtlasQaAvg, visualAtlasQaSamples]);

  const modules = useMemo(() => MODULES.map((mod) => {
    if (mod.id !== "visual-atlas") return mod;
    return {
      ...mod,
      progress: { done: visualAtlasStats.generated, total: visualAtlasStats.expected },
      qaScore: visualAtlasStats.qaScore,
      batches: `${visualAtlasStats.seeds} seeds disponibles de ${visualAtlasStats.expected} paginas esperadas`,
      notes: visualAtlasStats.notes,
    };
  }), [visualAtlasStats]);

  return (
    <Layout title="AI-200 Collection">
      <div className="h-full overflow-y-auto bg-[#0a1220]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-start gap-4 max-w-5xl">
            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-[11px] font-black shrink-0 leading-none">
              AI<br />200
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[8px] font-bold bg-[#0078d4] text-white px-1.5 py-0.5 rounded-sm tracking-wider uppercase">Azure · Associate</span>
                <span className="flex items-center gap-1 text-[8px] font-semibold text-emerald-400">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> En producción activa
                </span>
              </div>
              <h1 className="text-base font-black text-white tracking-tight">AI-200 Certification Collection</h1>
              <p className="text-[10px] text-white/40 mt-0.5">Colección editorial interna · 6 formatos · producción por batches · flujo QA ≥ 9.5</p>
            </div>
            <div className="hidden md:flex items-center gap-6 shrink-0">
              {[
                { label: "Formatos activos", value: String(activeModules) },
                { label: "En preparación", value: String(pendingModules) },
                { label: "Outputs reales", value: String(visualAtlasStats.generated) },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-[7px] text-white/25 uppercase tracking-wider font-medium">{s.label}</p>
                  <p className="text-base font-black text-white leading-none mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Módulos de producción ───────────────────────────────────────── */}
        <div className="p-6 max-w-5xl space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Módulos editoriales de producción</span>
            <div className="flex-1 h-px bg-white/[0.05]" />
          </div>

          {modules.map(mod => {
            const Icon = mod.icon;
            const isExpanded = expanded === mod.id;
            const isActive = mod.status === "active";

            return (
              <div key={mod.id}
                className={cn(
                  "bg-[#0d1629] border rounded-sm overflow-hidden transition-all duration-200",
                  isActive ? "border-white/[0.1]" : "border-white/[0.05] opacity-80"
                )}>

                {/* ── Fila resumen ── */}
                <div
                  className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : mod.id)}>

                  {/* Número */}
                  <span className="text-[9px] font-mono text-white/20 w-4 shrink-0">{mod.num}</span>

                  {/* Icono */}
                  <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
                    style={{ background: `${mod.color}15`, color: mod.color }}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Nombre + badge */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isActive ? "text-white" : "text-white/50"}`}>{mod.name}</span>
                      <StatusBadge status={mod.status} label={mod.statusLabel} />
                    </div>
                    <p className="text-[9px] text-white/30 mt-0.5">{mod.tagline}</p>
                  </div>

                  {/* Progreso / QA */}
                  {mod.progress && (
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <div className="w-24 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.round((mod.progress.done / mod.progress.total) * 100)}%`, background: mod.color }} />
                      </div>
                      <span className="text-[8px] text-white/25">{mod.progress.done}/{mod.progress.total}</span>
                    </div>
                  )}
                  <QABadge score={mod.qaScore} target={mod.qaTarget} />
                  <ChevronRight className={`w-3 h-3 text-white/15 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>

                {/* ── Panel expandido ── */}
                {isExpanded && (
                  <div className="border-t border-white/[0.05] px-4 py-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Info */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-[8px] text-white/25 uppercase tracking-wider mb-1">Descripción del formato</p>
                          <p className="text-[11px] text-white/65 leading-relaxed">{mod.role}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-white/25 uppercase tracking-wider mb-1">Nota operativa</p>
                          <p className="text-[10px] text-amber-400/70 leading-relaxed">{mod.notes}</p>
                        </div>
                      </div>
                      {/* Metadata */}
                      <div className="space-y-2">
                        {[
                          { label: "Responsable", value: mod.owner },
                          { label: "Última actualización", value: mod.lastUpdated ?? "Sin iniciar" },
                          { label: "Batches", value: mod.batches ?? "Pendiente de planificación" },
                          { label: "Score objetivo", value: `≥ ${mod.qaTarget}` },
                        ].map(m => (
                          <div key={m.label} className="flex items-start gap-2">
                            <span className="text-[8px] text-white/25 uppercase tracking-wider w-28 shrink-0 pt-px">{m.label}</span>
                            <span className="text-[10px] text-white/60 font-medium">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isActive && (
                      <div className="grid md:grid-cols-4 gap-2">
                        {[
                          { label: "Contenido", text: "Seeds, grounding y brechas", href: "/contenido-base", icon: Activity },
                          { label: "Generación", text: "Generación por página", href: "/generacion", icon: Cpu },
                          { label: "QA editorial", text: "Dictamen, riesgos y gates", href: "/qa/1", icon: Shield },
                          { label: "Exportación", text: "HTML, reportes y salida final", href: "/exportacion", icon: Download },
                        ].map((item) => (
                          <button
                            key={item.label}
                            onClick={() => setLocation(item.href)}
                            className="text-left bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] rounded-sm p-3 transition-all"
                          >
                            <item.icon className="w-3.5 h-3.5 text-blue-300/70" />
                            <p className="text-[10px] font-bold text-white/70 mt-2">{item.label}</p>
                            <p className="text-[8px] text-white/28 mt-0.5 leading-snug">{item.text}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-white/[0.05]">
                      <button
                        onClick={() => mod.href && setLocation(mod.href)}
                        disabled={!isActive}
                        className={cn(
                          "flex items-center gap-1.5 h-7 px-3 rounded-sm text-[10px] font-semibold transition-all",
                          isActive
                            ? "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                        )}>
                        <Eye className="w-3 h-3" />
                        Abrir producción
                        {isActive && <ArrowRight className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Pipeline secuencial ─────────────────────────────────────── */}
          <div className="mt-6 bg-[#0d1629] border border-white/[0.05] rounded-sm p-4">
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-3">Pipeline de producción · secuencia editorial</p>
            <div className="flex items-center gap-0 overflow-x-auto pb-1">
              {MODULES.map((mod, i) => {
                const Icon = mod.icon;
                const isActive = mod.status === "active";
                return (
                  <div key={mod.id} className="flex items-center shrink-0">
                    <div className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-sm border text-center min-w-[90px]",
                      isActive ? "bg-blue-500/10 border-blue-500/30" : "bg-white/[0.02] border-white/[0.05]"
                    )}>
                      <span style={{ color: isActive ? mod.color : "rgba(255,255,255,0.15)" }}>
                        <Icon className="w-3.5 h-3.5 mb-0.5" />
                      </span>
                      <p className={cn("text-[8px] font-bold leading-tight", isActive ? "text-white" : "text-white/25")}>{mod.name}</p>
                      <p className="text-[7px] leading-tight" style={{ color: isActive ? `${mod.color}cc` : "rgba(255,255,255,0.15)" }}>{mod.tagline}</p>
                      {isActive && <span className="mt-0.5 text-[6px] bg-emerald-500/20 text-emerald-400 font-bold px-1 py-px rounded-sm uppercase tracking-wide">Activo</span>}
                    </div>
                    {i < MODULES.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-white/10 shrink-0 mx-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
