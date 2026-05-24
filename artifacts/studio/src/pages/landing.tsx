import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  BookOpen, Map, AlertTriangle, HelpCircle, FileText, Zap,
  ChevronRight, ArrowRight, CheckCircle2, Clock, ExternalLink,
  Database, Layers, Edit3, Eye, Shield, Package,
} from "lucide-react";

/* ─── Datos de producto ─────────────────────────────────────────────────── */
const FORMATS = [
  {
    id: "master-book", label: "Master Book", icon: BookOpen,
    desc: "Guía completa estructurada por dominios del examen. Narración técnica, ejemplos prácticos y referencias a la documentación oficial.",
    tag: "Referencia principal", color: "#2563eb",
  },
  {
    id: "visual-atlas", label: "Visual Atlas", icon: Map,
    desc: "Colección de infografías técnicas, una por concepto clave. Diseño editorial de alta densidad informacional.",
    tag: "En producción · AI-200", color: "#7c3aed", active: true,
  },
  {
    id: "exam-traps", label: "Exam Traps Guide", icon: AlertTriangle,
    desc: "Análisis de patrones de error recurrentes en el examen. Cada trampa explicada con contexto, señuelo y respuesta correcta.",
    tag: "Red team editorial", color: "#dc2626",
  },
  {
    id: "question-bank", label: "Question Bank", icon: HelpCircle,
    desc: "Banco de preguntas estilo examen con explicaciones detalladas. Filtrable por dominio, dificultad y tipo de pregunta.",
    tag: "Práctica activa", color: "#0d9488",
  },
  {
    id: "cheat-sheets", label: "Cheat Sheets", icon: FileText,
    desc: "Resúmenes de referencia rápida por dominio. Una hoja por área, densidad máxima, sin texto superfluo.",
    tag: "Referencia rápida", color: "#d97706",
  },
  {
    id: "rapid-review", label: "Rapid Review Pack", icon: Zap,
    desc: "Secuencia de revisión intensiva para los últimos días antes del examen. Resumen de resúmenes, focalizado en frecuencia de aparición.",
    tag: "Sprint final", color: "#059669",
  },
];

const STUDY_PATH = [
  { step: "01", format: "Master Book",       action: "Aprender",        desc: "Dominio completo del temario por bloques" },
  { step: "02", format: "Visual Atlas",       action: "Comprender",      desc: "Visualizar y fijar conceptos con infografías" },
  { step: "03", format: "Exam Traps Guide",   action: "Entrenar criterio", desc: "Identificar señuelos y respuestas trampa" },
  { step: "04", format: "Question Bank",      action: "Practicar",       desc: "Simular el examen con feedback por pregunta" },
  { step: "05", format: "Cheat Sheets",       action: "Memorizar",       desc: "Consolidar conceptos clave antes del examen" },
  { step: "06", format: "Rapid Review Pack",  action: "Cerrar",          desc: "Revisión final de alta frecuencia de aparición" },
];

const AZURE_LIBRARY = [
  { cert: "AI-200", title: "Azure AI Fundamentals", status: "active",   note: "61 páginas · Visual Atlas en producción" },
  { cert: "AZ-900", title: "Azure Fundamentals",    status: "planned",  note: "Planificado para Q3 2026" },
  { cert: "AI-900", title: "Azure AI Fundamentals (Legacy)", status: "planned", note: "Planificado para Q3 2026" },
  { cert: "DP-900", title: "Azure Data Fundamentals", status: "planned", note: "Planificado para Q4 2026" },
  { cert: "AZ-104", title: "Azure Administrator",   status: "planned",  note: "Planificado para 2027" },
  { cert: "AZ-305", title: "Azure Solutions Architect", status: "planned", note: "Planificado para 2027" },
];

const WORK_DOMAINS = [
  { icon: Database, label: "Grounding técnico",           desc: "Investigación, documentación oficial Microsoft, trazabilidad de fuentes y validación de contenido base." },
  { icon: Layers,   label: "Arquitectura pedagógica",     desc: "Diseño de objetivos de aprendizaje, secuencia de contenido y estructura de rutas de estudio por certificación." },
  { icon: Edit3,    label: "Dirección editorial",         desc: "Coherencia de voz, estructura narrativa, registro técnico y formato específico por colección." },
  { icon: Eye,      label: "Dirección visual",            desc: "Layout, paleta de color, tipografía, iconografía y contrato visual no negociable por marca." },
  { icon: Shield,   label: "QA técnico / Red team",       desc: "Validación de precisión técnica, detección de errores, scoring multidimensional y estándar de producción ≥ 9.5." },
  { icon: Package,  label: "Producción y exportación",    desc: "Generación final de artefactos, exportación por formato, control de versiones y trazabilidad editorial." },
];

/* ─── Componente principal ───────────────────────────────────────────────── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const goToStudio = () => setLocation(user ? "/catalogo" : "/login");

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0d1629]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-8 w-auto" draggable={false} />
          <nav className="hidden md:flex items-center gap-5 ml-6">
            <a href="#formatos" className="text-xs text-white/40 hover:text-white/80 transition-colors font-medium tracking-wide">Formatos</a>
            <a href="#biblioteca" className="text-xs text-white/40 hover:text-white/80 transition-colors font-medium tracking-wide">Biblioteca</a>
            <a href="#sistema" className="text-xs text-white/40 hover:text-white/80 transition-colors font-medium tracking-wide">Sistema editorial</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user && (
              <span className="text-[10px] text-white/30 mr-1">{user.displayName}</span>
            )}
            <button
              onClick={goToStudio}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold px-3 h-7 rounded-sm transition-all"
            >
              {user ? "Abrir Studio" : "Production Studio"}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#0d1629] pt-14 pb-0 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-10 bg-blue-600 pointer-events-none" />
        <div className="absolute top-20 right-1/3 w-48 h-48 rounded-full blur-3xl opacity-8 bg-violet-600 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[9px] font-bold text-teal-400 uppercase tracking-[0.2em] bg-teal-400/10 border border-teal-400/20 px-2 py-1 rounded-sm">Editorial inteligente · Certificaciones cloud</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
              Una biblioteca inteligente<br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">para aprobar certificaciones cloud.</span>
            </h1>
            <p className="text-base text-white/50 leading-relaxed mb-8 max-w-xl">
              CloudBooks produce colecciones de estudio completas por certificación. Cada colección incluye seis formatos complementarios diseñados para cubrir el ciclo completo de preparación.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={goToStudio}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-sm"
              >
                Entrar al Production Studio
                <ArrowRight className="w-4 h-4" />
              </button>
              <a href="#formatos"
                className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors font-medium">
                Ver colección AI-200
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Hero bottom: format strip */}
        <div className="relative border-t border-white/[0.06] bg-white/[0.02]">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-0 overflow-x-auto">
            {FORMATS.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.id} className={cn(
                  "flex items-center gap-2.5 px-4 py-2.5 shrink-0 border-r border-white/[0.06] last:border-0",
                  f.active && "bg-violet-600/10"
                )}>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{color: f.active ? "#a78bfa" : "#ffffff40"}} />
                  <span className={cn("text-[10px] font-semibold tracking-wide", f.active ? "text-violet-300" : "text-white/30")}>
                    {f.label}
                  </span>
                  {f.active && <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1 py-0.5 rounded-sm font-bold border border-violet-500/20">ACTIVO</span>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">El problema</p>
              <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">
                Estudiar certificaciones cloud está fragmentado.
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                La preparación para una certificación técnica requiere múltiples recursos: documentación oficial extensa, videos dispersos, dumps de preguntas sin contexto y resúmenes de terceros de calidad inconsistente.
              </p>
              <div className="space-y-2">
                {[
                  "Fuentes de información sin coherencia editorial entre sí",
                  "Formatos de estudio aislados, no integrados en una ruta",
                  "Ausencia de validación técnica sistemática del contenido",
                  "Sin estándar de calidad medible por certificación",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-sm bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                    </div>
                    <p className="text-sm text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Escenario típico de preparación</p>
              <div className="space-y-2.5">
                {[
                  { src: "MS Learn", type: "Documentación", quality: 40, label: "Muy extenso, sin priorización" },
                  { src: "YouTube", type: "Video", quality: 55, label: "Calidad variable" },
                  { src: "Udemy / Coursera", type: "Curso", quality: 60, label: "Desactualizado con frecuencia" },
                  { src: "Dumps de examen", type: "Preguntas", quality: 25, label: "Sin contexto ni validación" },
                  { src: "Reddit / Discord", type: "Tips", quality: 30, label: "Anecdótico, sin estructura" },
                ].map((r) => (
                  <div key={r.src} className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-400 w-28 shrink-0">{r.src}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-200 rounded-full" style={{width:`${r.quality}%`}} />
                    </div>
                    <span className="text-[8px] text-gray-400 w-32 shrink-0">{r.label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[9px] text-gray-400">Resultado: horas de estudio mal priorizadas, sin ruta clara, sin estándar de calidad medible.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solución ─────────────────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-[#0d1629] rounded-sm p-6 order-2 md:order-1">
              <p className="text-[9px] font-bold text-teal-400/70 uppercase tracking-widest mb-4">Colección AI-200 — estructura</p>
              <div className="space-y-2">
                {FORMATS.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.id} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-sm border",
                      f.active ? "bg-violet-600/10 border-violet-500/20" : "bg-white/[0.03] border-white/[0.06]"
                    )}>
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{color: f.active ? "#a78bfa" : "#ffffff30"}} />
                      <div className="flex-1">
                        <p className={cn("text-[10px] font-semibold", f.active ? "text-violet-200" : "text-white/40")}>{f.label}</p>
                        <p className="text-[8px] text-white/25">{f.tag}</p>
                      </div>
                      {f.active
                        ? <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1 py-0.5 rounded-sm font-bold border border-violet-500/20">EN PRODUCCIÓN</span>
                        : <span className="text-[8px] text-white/20">Planificado</span>
                      }
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[9px] text-white/25">Un solo estándar editorial para todos los formatos. Score QA ≥ 9.5 para aprobación a producción.</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">La solución</p>
              <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">
                Una colección completa por certificación, varios formatos, un solo objetivo.
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                CloudBooks produce cada colección como un sistema editorial coherente: seis formatos complementarios que cubren el ciclo completo de preparación, desde el aprendizaje conceptual hasta la revisión final del día anterior.
              </p>
              <div className="space-y-2">
                {[
                  "Contenido validado técnicamente contra documentación oficial",
                  "Estándar de calidad medible: score QA multidimensional por formato",
                  "Ruta de estudio estructurada, no recursos dispersos",
                  "Producción editorial sistemática con control de versiones",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Formatos ─────────────────────────────────────────────────────────── */}
      <section id="formatos" className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Colección editorial</p>
            <h2 className="text-2xl font-black text-gray-900">Seis formatos. Un objetivo.</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Cada formato cubre una necesidad distinta del ciclo de preparación. Juntos forman una colección completa y coherente.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {FORMATS.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.id} className={cn(
                  "bg-white border rounded-sm p-5 relative overflow-hidden",
                  f.active ? "border-violet-200 shadow-sm ring-1 ring-violet-100" : "border-gray-200"
                )}>
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{backgroundColor: f.color}} />
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{backgroundColor:`${f.color}15`, border:`1px solid ${f.color}25`}}>
                      <Icon className="w-4 h-4" style={{color: f.color}} />
                    </div>
                    {f.active && (
                      <span className="text-[8px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-sm">EN PRODUCCIÓN</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{f.label}</h3>
                  <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-wide">{f.tag}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Ruta de estudio ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Ruta de estudio</p>
            <h2 className="text-2xl font-black text-gray-900">De cero al examen en seis etapas.</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">La secuencia óptima para usar la colección completa.</p>
          </div>
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-6 top-5 bottom-5 w-px bg-gradient-to-b from-blue-200 via-violet-200 to-teal-200 hidden md:block" />
            <div className="space-y-3">
              {STUDY_PATH.map((s, i) => {
                const f = FORMATS[i];
                const Icon = f.icon;
                return (
                  <div key={s.step} className="relative flex items-start gap-5 pl-0 md:pl-14">
                    {/* Step number */}
                    <div className="absolute left-0 top-0 w-12 h-12 rounded-sm flex items-center justify-center hidden md:flex shrink-0"
                      style={{backgroundColor:`${f.color}15`, border:`1px solid ${f.color}25`}}>
                      <span className="text-[10px] font-black tabular-nums" style={{color:f.color}}>{s.step}</span>
                    </div>
                    <div className="flex-1 bg-gray-50 border border-gray-200 rounded-sm px-4 py-3 flex items-center gap-4">
                      <Icon className="w-4 h-4 shrink-0 md:hidden" style={{color:f.color}} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-widest" style={{color:f.color}}>{s.action}</span>
                          <span className="text-[9px] text-gray-400">·</span>
                          <span className="text-[9px] font-medium text-gray-500">{s.format}</span>
                        </div>
                        <p className="text-xs text-gray-600">{s.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-200 shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Biblioteca Azure ────────────────────────────────────────────────── */}
      <section id="biblioteca" className="py-16 bg-[#0d1629] border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-[0.2em] mb-3">Biblioteca</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Azure · Certificaciones activas y planificadas.</h2>
                <p className="text-sm text-white/40 mt-2">Primera cloud activa. Colecciones en distintas etapas de producción editorial.</p>
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-2 text-[10px] text-white/30 border border-white/[0.08] rounded-sm px-3 py-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <span>Activo</span>
                  <div className="w-2 h-2 rounded-full bg-white/20 ml-2" />
                  <span>Planificado</span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {AZURE_LIBRARY.map((cert) => (
              <div key={cert.cert}
                className={cn(
                  "rounded-sm border p-4 relative overflow-hidden",
                  cert.status === "active"
                    ? "bg-white/[0.05] border-teal-500/30"
                    : "bg-white/[0.02] border-white/[0.07]"
                )}>
                {cert.status === "active" && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-blue-500" />
                )}
                <div className="flex items-start justify-between mb-2">
                  <span className={cn(
                    "text-xs font-black tracking-wide font-mono",
                    cert.status === "active" ? "text-teal-400" : "text-white/30"
                  )}>{cert.cert}</span>
                  {cert.status === "active"
                    ? <span className="text-[8px] font-bold bg-teal-400/10 text-teal-400 border border-teal-400/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-400"/>ACTIVO</span>
                    : <Clock className="w-3 h-3 text-white/20" />
                  }
                </div>
                <p className={cn("text-sm font-semibold mb-1", cert.status === "active" ? "text-white/80" : "text-white/30")}>{cert.title}</p>
                <p className="text-[9px] text-white/25">{cert.note}</p>
                {cert.status === "active" && (
                  <button
                    onClick={() => setLocation("/login")}
                    className="mt-3 flex items-center gap-1 text-[9px] text-teal-400 hover:text-teal-300 font-semibold transition-colors"
                  >
                    Abrir colección <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sistema editorial ────────────────────────────────────────────────── */}
      <section id="sistema" className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Sistema editorial</p>
            <h2 className="text-2xl font-black text-gray-900">Producción estructurada por dominios de trabajo.</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Cada colección se produce a través de un proceso editorial sistemático, agrupado en dominios de responsabilidad especializados.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {WORK_DOMAINS.map((d) => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="bg-white border border-gray-200 rounded-sm p-4">
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-7 h-7 rounded-sm bg-[#0d1629] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{d.label}</h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 bg-white border border-gray-200 rounded-sm px-5 py-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-900">Estándar de producción: score QA ≥ 9.5</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Cada formato se evalúa en cuatro dimensiones: dirección de arte, consistencia editorial, legibilidad y precisión técnica. Solo se aprueba a producción con score ≥ 9.5.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0d1629] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-5 bg-violet-600 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4">Acceso al equipo editorial</p>
          <h2 className="text-3xl font-black text-white mb-4">Production Studio</h2>
          <p className="text-sm text-white/40 mb-8 max-w-md mx-auto leading-relaxed">
            Consola editorial interna para el equipo de producción CloudBooks. Gestiona contenido, genera con IA, evalúa QA y exporta formatos.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button
              onClick={goToStudio}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-6 h-11 rounded-sm transition-all text-sm"
            >
              Entrar al Production Studio
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLocation(user ? "/biblioteca" : "/login")}
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/50 hover:text-white/80 font-medium px-5 h-11 rounded-sm transition-all text-sm"
            >
              Abrir AI-200 Visual Atlas
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1629] border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-6 w-auto opacity-40" draggable={false} />
            <span className="text-[9px] text-white/15">Editorial inteligente de certificaciones cloud</span>
          </div>
          <div className="text-[9px] text-white/15 font-mono">v24 · AI-200 Visual Atlas en producción</div>
        </div>
      </footer>
    </div>
  );
}
