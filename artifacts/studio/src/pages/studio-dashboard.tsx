import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  Layers,
  Loader2,
  Map,
  PackageCheck,
  Shield,
  Table2,
  Target,
  Zap,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { authHeaders, fetchStudioCatalog, type StudioCatalog } from "@/lib/studio-api";

const FORMATS = [
  {
    id: "master-book",
    name: "Master Book",
    label: "Aprendizaje profundo",
    icon: BookOpen,
    status: "Planificacion",
    progress: 0,
    route: "/ai-200",
    color: "#7c3aed",
  },
  {
    id: "visual-atlas",
    name: "Visual Atlas",
    label: "Estudio visual acelerado",
    icon: Map,
    status: "Produccion activa",
    progress: 10,
    route: "/biblioteca",
    color: "#2563eb",
  },
  {
    id: "exam-traps",
    name: "Exam Traps Guide",
    label: "Trampas y distractores",
    icon: Target,
    status: "Pendiente de extraccion",
    progress: 0,
    route: "/ai-200",
    color: "#dc2626",
  },
  {
    id: "question-bank",
    name: "Question Bank",
    label: "Practica exhaustiva",
    icon: HelpCircle,
    status: "Diseno pendiente",
    progress: 0,
    route: "/ai-200",
    color: "#0284c7",
  },
  {
    id: "cheat-sheets",
    name: "Cheat Sheets",
    label: "Repaso compacto",
    icon: Table2,
    status: "Planificado",
    progress: 0,
    route: "/ai-200",
    color: "#d97706",
  },
  {
    id: "rapid-review",
    name: "Rapid Review Pack",
    label: "Cierre pre-examen",
    icon: Zap,
    status: "Planificado",
    progress: 0,
    route: "/ai-200",
    color: "#059669",
  },
];

export default function StudioDashboard() {
  const [, setLocation] = useLocation();
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [qaScoresByPage, setQaScoresByPage] = useState<Record<string, number>>({});
  const [timeToApprovableAvg, setTimeToApprovableAvg] = useState<number | null>(null);
  const [timeToApprovableSamples, setTimeToApprovableSamples] = useState(0);
  const [pendingConsolidationCount, setPendingConsolidationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudioCatalog()
      .then(async (data) => {
        setCatalog(data);
        const pagesWithQa = data.pages.filter((p) => p.outputStatus.files.qaReport);
        if (!pagesWithQa.length) {
          setQualityScore(null);
          return;
        }

        const results = await Promise.all(
          pagesWithQa.map(async (page) => {
            try {
              const res = await fetch(`/api/studio/qa-report/${page.pageId}`, { headers: authHeaders() });
              if (!res.ok) return null;
              const report = await res.json() as { scores?: Record<string, number> };
              return {
                pageId: page.pageId,
                score: typeof report.scores?.total === "number" ? report.scores.total : null,
              };
            } catch {
              return null;
            }
          }),
        );

        const scoreMap: Record<string, number> = {};
        const validScores: number[] = [];
        for (const item of results) {
          if (!item || typeof item.score !== "number") continue;
          scoreMap[item.pageId] = item.score;
          validScores.push(item.score);
        }
        setQaScoresByPage(scoreMap);
        setQualityScore(validScores.length
          ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length
          : null);

        const outputPages = data.pages.filter((p) => p.outputStatus.hasOutput && p.outputStatus.generatedAt);
        const draftChecks = await Promise.all(outputPages.map(async (page) => {
          try {
            const res = await fetch(`/api/studio/composer/draft/${page.pageId}`, {
              headers: authHeaders(),
              cache: "no-store",
            });
            if (!res.ok) return false;
            const draft = await res.json() as { updatedAt?: string | null };
            if (!draft.updatedAt || !page.outputStatus.generatedAt) return false;
            const draftAt = Date.parse(draft.updatedAt);
            const outputAt = Date.parse(page.outputStatus.generatedAt);
            return Number.isFinite(draftAt) && Number.isFinite(outputAt) && draftAt > outputAt;
          } catch {
            return false;
          }
        }));
        setPendingConsolidationCount(draftChecks.filter(Boolean).length);

        try {
          const actRes = await fetch("/api/studio/activity", {
            headers: authHeaders(),
            cache: "no-store",
          });
          if (actRes.ok) {
            const activity = await actRes.json() as {
              summary?: { timeToApprovable?: { avgMinutes?: number | null; samples?: number } };
            };
            const avg = activity.summary?.timeToApprovable?.avgMinutes;
            const samples = activity.summary?.timeToApprovable?.samples;
            setTimeToApprovableAvg(typeof avg === "number" ? avg : null);
            setTimeToApprovableSamples(typeof samples === "number" ? samples : 0);
          }
        } catch {
          setTimeToApprovableAvg(null);
          setTimeToApprovableSamples(0);
        }
      })
      .catch(() => setCatalog(null))
      .finally(() => setLoading(false));
  }, []);

  const atlasStats = useMemo(() => {
    const pages = catalog?.pages ?? [];
    const generated = pages.filter((p) => p.outputStatus.hasOutput && p.outputStatus.files.html).length;
    const realVisuals = pages.filter((p) => p.outputStatus.generationMode === "openai_image").length;
    const approved = pages.filter((p) => p.outputStatus.files.approved).length;
    return {
      seeds: catalog?.availableSeeds.length ?? 0,
      expected: catalog?.totalExpected ?? 61,
      generated,
      realVisuals,
      approved,
    };
  }, [catalog]);

  const operationalStats = useMemo(() => {
    const pages = catalog?.pages ?? [];
    const staleOutputs = pages.filter((p) =>
      p.outputStatus.hasOutput
      && p.outputStatus.layoutRevision
      && p.outputStatus.currentLayoutRevision
      && p.outputStatus.layoutRevision !== p.outputStatus.currentLayoutRevision).length;
    const noOfficialQa = pages.filter((p) => p.outputStatus.hasOutput && !p.outputStatus.files.qaReport).length;
    const officialAligned = pages.filter((p) =>
      p.outputStatus.hasOutput
      && p.outputStatus.files.qaReport
      && !(p.outputStatus.layoutRevision && p.outputStatus.currentLayoutRevision && p.outputStatus.layoutRevision !== p.outputStatus.currentLayoutRevision)
    ).length - pendingConsolidationCount;

    return {
      staleOutputs,
      noOfficialQa,
      officialAligned: Math.max(0, officialAligned),
    };
  }, [catalog, pendingConsolidationCount]);

  const batchGate = useMemo(() => {
    const pages = (catalog?.pages ?? []).filter((p) => p.batch.toLowerCase().includes("batch 01"));
    const total = pages.length;
    if (!total) return null;
    const required = Math.ceil(total * 0.85);
    const passCount = pages.filter((page) => {
      const score = qaScoresByPage[page.pageId];
      const isRealVisual = page.outputStatus.generationMode === "openai_image";
      return typeof score === "number" && score >= 9.5 && isRealVisual;
    }).length;
    const gatePass = passCount >= required;
    return { total, required, passCount, gatePass };
  }, [catalog, qaScoresByPage]);

  const collectionProgress = Math.round((atlasStats.generated / Math.max(atlasStats.expected, 1)) * 100);
  const qualityGap = qualityScore != null ? Math.max(0, 9.5 - qualityScore) : null;

  return (
    <Layout title="Dashboard Studio">
      <div className="h-full overflow-y-auto bg-[#0a1220]">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-5">
          <div className="max-w-6xl flex items-start gap-5">
            <div className="w-11 h-11 rounded-sm bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] font-bold text-teal-400/70 uppercase tracking-[0.2em] mb-1">
                Coleccion editorial
              </p>
              <h1 className="text-xl font-black text-white tracking-tight">
                AI-200 Collection
              </h1>
              <p className="text-[10px] text-white/35 mt-1 max-w-2xl leading-relaxed">
                Vision global del estado editorial: avance por formato, cobertura de paginas, QA y salida lista para exportacion.
              </p>
            </div>
            <button
              onClick={() => setLocation("/ai-200")}
              className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white/65 transition-all"
            >
              Ver coleccion <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="p-6 max-w-6xl space-y-5">
          <section className="grid md:grid-cols-4 gap-3">
            {[
              { label: "Formatos", value: "6", sub: "libros por certificacion", icon: PackageCheck, color: "text-blue-400" },
              { label: "Seeds Visual Atlas", value: `${atlasStats.seeds}/${atlasStats.expected}`, sub: "contenido migrado", icon: FileText, color: "text-teal-400" },
              { label: "Outputs generados", value: String(atlasStats.generated), sub: `${atlasStats.realVisuals} con imagen real`, icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Puntaje editorial", value: qualityScore != null ? `${qualityScore.toFixed(1)}/10` : "Sin QA", sub: qualityGap != null ? `brecha ${qualityGap.toFixed(1)} hacia 9.5` : "aun no hay reportes QA", icon: Shield, color: qualityGap != null && qualityGap > 0.5 ? "text-amber-400" : "text-emerald-400" },
            ].map((card) => (
              <div key={card.label} className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
                <div className="flex items-center justify-between gap-3">
                  <card.icon className={cn("w-4 h-4", card.color)} />
                  {loading && <Loader2 className="w-3 h-3 animate-spin text-white/15" />}
                </div>
                <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold mt-4">{card.label}</p>
                <p className="text-lg font-black text-white mt-0.5 leading-none">{card.value}</p>
                <p className="text-[8px] text-white/25 mt-1">{card.sub}</p>
              </div>
            ))}
          </section>

          <section className="grid md:grid-cols-4 gap-3">
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
              <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Semaforo oficial</p>
              <p className="text-lg font-black text-emerald-300 mt-1">{operationalStats.officialAligned}</p>
              <p className="text-[8px] text-white/30">oficiales alineadas</p>
            </div>
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
              <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Pendiente consolidar</p>
              <p className="text-lg font-black text-amber-300 mt-1">{pendingConsolidationCount}</p>
              <p className="text-[8px] text-white/30">draft mas nuevo que output</p>
            </div>
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
              <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Sin QA oficial</p>
              <p className="text-lg font-black text-violet-300 mt-1">{operationalStats.noOfficialQa}</p>
              <p className="text-[8px] text-white/30">
                outputs sin QA · {operationalStats.staleOutputs} desactualizados
              </p>
            </div>
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
              <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Tiempo a aprobable</p>
              <p className="text-lg font-black text-cyan-300 mt-1">
                {timeToApprovableAvg != null ? `${timeToApprovableAvg}m` : "—"}
              </p>
              <p className="text-[8px] text-white/30">{timeToApprovableSamples} muestra(s)</p>
            </div>
          </section>

          <section className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[8px] text-white/25 uppercase tracking-widest font-bold">Gate de lote · Batch 01</p>
                <p className="text-[10px] text-white/40 mt-1">
                  Criterio: QA >= 9.5 y visual real en al menos 85% de paginas del lote.
                </p>
              </div>
              <span className={cn(
                "text-[9px] font-bold px-2.5 py-1 rounded-sm border",
                batchGate?.gatePass
                  ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
                  : "text-amber-300 border-amber-500/30 bg-amber-500/10",
              )}>
                {batchGate
                  ? (batchGate.gatePass ? "LOTE APROBABLE" : "LOTE BLOQUEADO")
                  : "SIN DATOS"}
              </span>
            </div>
            {batchGate ? (
              <div className="mt-3 grid sm:grid-cols-3 gap-2">
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <p className="text-[8px] text-white/25 uppercase tracking-widest">Paginas lote</p>
                  <p className="text-[12px] font-bold text-white/80 mt-1">{batchGate.total}</p>
                </div>
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <p className="text-[8px] text-white/25 uppercase tracking-widest">Minimo requerido</p>
                  <p className="text-[12px] font-bold text-white/80 mt-1">{batchGate.required}</p>
                </div>
                <div className="rounded-sm border border-white/[0.08] bg-white/[0.02] p-2.5">
                  <p className="text-[8px] text-white/25 uppercase tracking-widest">Cumplen</p>
                  <p className={cn("text-[12px] font-bold mt-1", batchGate.gatePass ? "text-emerald-300" : "text-amber-300")}>
                    {batchGate.passCount}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
              <div>
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Coleccion AI-200</p>
                <p className="text-[10px] text-white/45 mt-0.5">Estado por libro/formato editorial</p>
              </div>
              <span className="text-[8px] font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-sm">
                Progreso global {collectionProgress}%
              </span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {FORMATS.map((format) => {
                const Icon = format.icon;
                const active = format.id === "visual-atlas";
                return (
                  <button
                    key={format.id}
                    onClick={() => setLocation(format.route)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.025] transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0" style={{ background: `${format.color}18`, color: format.color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-bold text-white/80">{format.name}</p>
                        {active && (
                          <span className="text-[7px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-px rounded-sm uppercase">
                            activo
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-white/30 mt-0.5">{format.label}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-3 w-56">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${format.progress}%`, background: format.color }} />
                      </div>
                      <span className="w-20 text-[8px] text-white/35">{format.status}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-white/20 shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid md:grid-cols-3 gap-3">
            {[
              { title: "Siguiente decision", text: "Consolidar navegacion por formato: cada libro tendra Contenido, QA, Contrato y Exportacion propios.", icon: Activity },
              { title: "Visual Atlas", text: "Mantenerlo como primer formato productivo y usarlo como fuente para Traps Guide, Cheat Sheets y Rapid Review.", icon: Map },
              { title: "Gobernanza", text: "Separar contrato visual del Visual Atlas de contratos narrativos para Master Book y Question Bank.", icon: Shield },
            ].map((item) => (
              <div key={item.title} className="bg-white/[0.015] border border-white/[0.05] rounded-sm p-4">
                <item.icon className="w-4 h-4 text-teal-400/70" />
                <p className="text-[10px] font-bold text-white/65 mt-3">{item.title}</p>
                <p className="text-[9px] text-white/30 mt-1 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </section>
        </div>
      </div>
    </Layout>
  );
}
