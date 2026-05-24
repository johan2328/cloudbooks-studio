import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  BookOpen, FileText, Target, HelpCircle, Table2, Zap,
  AlertTriangle, CheckCircle2, Clock, ArrowRight, ChevronRight,
  Activity, Layers, Shield, Package, BarChart3, FileCheck,
  TrendingUp, Calendar, Users, Edit3,
} from "lucide-react";

/* ─── Tipos ────────────────────────────────────────────────────────────── */
type TaskStatus = "pending" | "in-progress" | "blocked";
type RiskLevel  = "high" | "medium" | "low";

const NEXT_TASKS: { label: string; owner: string; due: string; status: TaskStatus }[] = [
  { label: "Completar grounding del batch 11–20", owner: "Grounding Agent", due: "2026-06-01", status: "in-progress" },
  { label: "Elevar score QA visual a 9.5 en páginas 03–06", owner: "QA / Red Team", due: "2026-05-28", status: "in-progress" },
  { label: "Normalizar contrato editorial v24", owner: "Editorial Agent", due: "2026-05-30", status: "pending" },
  { label: "Definir plantilla de Master Book", owner: "Pedagogy Agent", due: "2026-06-05", status: "pending" },
  { label: "Diseñar estructura del Question Bank", owner: "Editorial Lead", due: "2026-06-10", status: "pending" },
  { label: "Preparar exportación de Collection Pack", owner: "Production Agent", due: "2026-06-15", status: "pending" },
];

const RISKS: { label: string; level: RiskLevel; format: string }[] = [
  { label: "Varianza iconográfica entre páginas del batch 01–10", level: "high", format: "Visual Atlas" },
  { label: "Espacios vacíos en zona de autocheck (páginas 04–06)", level: "high", format: "Visual Atlas" },
  { label: "Solapamientos y recortes en diagramas de red", level: "medium", format: "Visual Atlas" },
  { label: "Copy comercial mezclado con lenguaje interno de producción", level: "medium", format: "General" },
  { label: "Diferencias de tono entre formatos de la colección", level: "medium", format: "AI-200 Collection" },
  { label: "Falta de trazabilidad de fuentes en batch 11–20", level: "low", format: "Visual Atlas" },
];

const CONTRACTS: { label: string; version: string; status: "active" | "draft"; updated: string }[] = [
  { label: "Contrato global CloudBooks", version: "v2.1", status: "active", updated: "2026-05-10" },
  { label: "Contrato editorial Azure", version: "v1.4", status: "active", updated: "2026-05-15" },
  { label: "Contrato colección AI-200", version: "v3.0", status: "active", updated: "2026-05-18" },
  { label: "Contrato Visual Atlas v24", version: "v24", status: "active", updated: "2026-05-20" },
];

const FORMATS_SUMMARY = [
  { name: "Visual Atlas", icon: FileText, status: "active", progress: 16, total: 61, qa: 9.2, color: "#2563eb" },
  { name: "Master Book", icon: BookOpen, status: "pending", progress: 0, total: null, qa: null, color: "#7c3aed" },
  { name: "Exam Traps Guide", icon: Target, status: "pending", progress: 0, total: null, qa: null, color: "#0d9488" },
  { name: "Question Bank", icon: HelpCircle, status: "pending", progress: 0, total: null, qa: null, color: "#0284c7" },
  { name: "Cheat Sheets", icon: Table2, status: "planned", progress: 0, total: null, qa: null, color: "#d97706" },
  { name: "Rapid Review Pack", icon: Zap, status: "planned", progress: 0, total: null, qa: null, color: "#059669" },
];

function taskStatusBadge(s: TaskStatus) {
  if (s === "in-progress") return <span className="text-[8px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 px-1.5 py-px rounded-sm uppercase tracking-wide">En curso</span>;
  if (s === "blocked") return <span className="text-[8px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-px rounded-sm uppercase tracking-wide">Bloqueado</span>;
  return <span className="text-[8px] font-bold bg-white/5 text-white/30 border border-white/10 px-1.5 py-px rounded-sm uppercase tracking-wide">Pendiente</span>;
}

function riskDot(level: RiskLevel) {
  if (level === "high") return <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-0.5" />;
  if (level === "medium") return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-0.5" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0 mt-0.5" />;
}

export default function StudioDashboard() {
  const [, setLocation] = useLocation();
  const [dismissedRisks, setDismissedRisks] = useState<number[]>([]);

  const highRisks = RISKS.filter(r => r.level === "high").length;
  const medRisks  = RISKS.filter(r => r.level === "medium").length;

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-[#0a1220]">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[8px] font-bold text-teal-400 uppercase tracking-[0.2em]">CloudBooks Studio</span>
              <span className="text-white/10">·</span>
              <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.2em]">Dashboard operativo</span>
            </div>
            <h1 className="text-base font-black text-white tracking-tight">Producción editorial activa</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/ai-200")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold px-3 h-7 rounded-sm transition-all">
              Colección AI-200 <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] border-b border-white/[0.04]">
          {[
            { label: "Páginas en producción", value: "61", sub: "Visual Atlas · AI-200", icon: Layers, color: "#2563eb" },
            { label: "QA promedio batch 01–10", value: "9.24", sub: "Objetivo ≥ 9.5", icon: BarChart3, color: "#0d9488" },
            { label: "Aprobadas", value: "6 / 10", sub: "Batch 01–10", icon: CheckCircle2, color: "#059669" },
            { label: "Riesgos abiertos", value: `${highRisks} altos · ${medRisks} medios`, sub: "Requieren atención", icon: AlertTriangle, color: "#d97706" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[#0d1629] px-5 py-3 flex items-center gap-3">
                <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-[8px] text-white/30 uppercase tracking-wider font-medium">{s.label}</p>
                  <p className="text-sm font-black text-white leading-tight">{s.value}</p>
                  <p className="text-[8px] text-white/30">{s.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* ── Formatos de la colección ─────────────────────────────── */}
          <div className="xl:col-span-2 space-y-5">

            {/* Formato summary grid */}
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">AI-200 Collection · 6 formatos</span>
                </div>
                <button onClick={() => setLocation("/ai-200")}
                  className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  Ver todos <ChevronRight className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {FORMATS_SUMMARY.map(fmt => {
                  const Icon = fmt.icon;
                  const isActive = fmt.status === "active";
                  const isPending = fmt.status === "pending";
                  return (
                    <div key={fmt.name}
                      className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${isActive ? "hover:bg-white/[0.02] cursor-pointer" : ""}`}
                      onClick={() => isActive && setLocation("/ai-200")}>
                      <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0"
                        style={{ background: `${fmt.color}15`, opacity: isActive ? 1 : 0.5 }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: fmt.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isActive ? "text-white" : "text-white/40"}`}>{fmt.name}</span>
                          {isActive && <span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1 py-px rounded-sm font-bold uppercase tracking-wide">Activo</span>}
                          {isPending && <span className="text-[7px] bg-white/5 text-white/25 border border-white/10 px-1 py-px rounded-sm font-bold uppercase tracking-wide">Estructura pendiente</span>}
                          {fmt.status === "planned" && <span className="text-[7px] bg-white/5 text-white/20 border border-white/10 px-1 py-px rounded-sm font-bold uppercase tracking-wide">Planificado</span>}
                        </div>
                        {isActive && fmt.total && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.round((fmt.progress / fmt.total) * 100)}%`, background: fmt.color }} />
                            </div>
                            <span className="text-[8px] text-white/30 shrink-0">{fmt.progress}/{fmt.total} págs</span>
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {fmt.qa ? (
                          <span className={`text-sm font-black ${fmt.qa >= 9.5 ? "text-emerald-400" : fmt.qa >= 9.0 ? "text-amber-400" : "text-red-400"}`}>
                            {fmt.qa.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-white/15 text-sm font-black">—</span>
                        )}
                        {fmt.qa && <p className="text-[7px] text-white/25">QA prom.</p>}
                      </div>
                      {isActive && <ChevronRight className="w-3 h-3 text-white/15 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Próximas tareas */}
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-violet-400" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Próximas tareas del Studio</span>
                <span className="ml-auto text-[8px] bg-violet-500/15 text-violet-400 border border-violet-500/25 px-1.5 py-px rounded-sm font-bold">
                  {NEXT_TASKS.filter(t => t.status === "in-progress").length} en curso
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {NEXT_TASKS.map((t, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-white/80 truncate">{t.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Users className="w-2.5 h-2.5 text-white/20" />
                        <span className="text-[8px] text-white/30">{t.owner}</span>
                        <span className="text-white/10">·</span>
                        <Clock className="w-2.5 h-2.5 text-white/20" />
                        <span className="text-[8px] text-white/30">{t.due}</span>
                      </div>
                    </div>
                    {taskStatusBadge(t.status)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Panel derecho ─────────────────────────────────────────── */}
          <div className="space-y-4">

            {/* Riesgos editoriales */}
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Riesgos editoriales</span>
                <span className="ml-auto text-[8px] bg-red-500/15 text-red-400 border border-red-500/25 px-1.5 py-px rounded-sm font-bold">
                  {highRisks} alto{highRisks !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {RISKS.filter((_, i) => !dismissedRisks.includes(i)).map((r, i) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-2">
                    {riskDot(r.level)}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/70 leading-snug">{r.label}</p>
                      <p className="text-[8px] text-white/25 mt-0.5">{r.format}</p>
                    </div>
                    <button onClick={() => setDismissedRisks(prev => [...prev, i])}
                      className="text-white/10 hover:text-white/40 transition-colors shrink-0 mt-0.5 text-[9px]">✕</button>
                  </div>
                ))}
                {dismissedRisks.length > 0 && (
                  <div className="px-4 py-2 text-center">
                    <button onClick={() => setDismissedRisks([])}
                      className="text-[8px] text-white/20 hover:text-white/40 transition-colors">
                      Restaurar {dismissedRisks.length} riesgo{dismissedRisks.length !== 1 ? "s" : ""}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Contratos activos */}
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Contratos activos</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {CONTRACTS.map((c, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-2 hover:bg-white/[0.02] cursor-pointer transition-colors"
                    onClick={() => setLocation("/contrato")}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-white/70 truncate">{c.label}</p>
                      <p className="text-[8px] text-white/25 mt-0.5">Actualizado {c.updated}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[8px] font-bold text-teal-400/60 font-mono">{c.version}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Activo" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-white/[0.06]">
                <button onClick={() => setLocation("/contrato")}
                  className="w-full flex items-center justify-center gap-1.5 h-7 border border-white/10 hover:border-teal-400/30 rounded-sm text-[10px] text-white/40 hover:text-teal-300 transition-all">
                  <Edit3 className="w-3 h-3" />
                  Gestionar contratos
                </button>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/[0.06]">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Accesos rápidos</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Biblioteca", href: "/biblioteca", icon: Layers, color: "#2563eb" },
                  { label: "QA", href: "/qa/1", icon: Shield, color: "#0d9488" },
                  { label: "Grounding", href: "/contenido/1", icon: Activity, color: "#7c3aed" },
                  { label: "Exportar", href: "/exportacion", icon: TrendingUp, color: "#d97706" },
                ].map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.href} onClick={() => setLocation(a.href)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-sm bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all">
                      <Icon className="w-3 h-3 shrink-0" style={{ color: a.color }} />
                      <span className="text-[10px] font-medium text-white/50">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
