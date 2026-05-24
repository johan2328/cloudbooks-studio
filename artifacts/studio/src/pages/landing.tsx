import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  BookOpen, Map, Package, ArrowRight, ChevronRight,
  CheckCircle2, Clock, Database, Layers, Edit3, Eye, Shield, Package as Pkg,
} from "lucide-react";

/* ─── Nav comercial compartida ──────────────────────────────────────────── */
export function CommercialNav({ active }: { active?: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0d1629]/95 backdrop-blur-sm border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <button onClick={() => setLocation("/")} className="shrink-0">
          <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-8 w-auto" draggable={false} />
        </button>
        <nav className="hidden md:flex items-center gap-5 ml-4">
          {[
            { label: "Inicio",      href: "/" },
            { label: "Books",       href: "/books" },
            { label: "Metodología", href: "/#metodologia" },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              className={cn(
                "text-xs font-medium tracking-wide transition-colors",
                active === label ? "text-white/90" : "text-white/40 hover:text-white/80"
              )}>
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user && <span className="text-[10px] text-white/30 mr-1 hidden md:block">{user.displayName}</span>}
          <button onClick={() => setLocation(user ? "/catalogo" : "/login")}
            className="flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-white/60 hover:text-white/90 text-xs font-medium px-3 h-7 rounded-sm transition-all">
            {user ? "Abrir Studio" : "Studio"}
          </button>
          <button onClick={() => setLocation("/books")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold px-3 h-7 rounded-sm transition-all">
            Ver Books <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ─── LANDING ────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white font-sans">
      <CommercialNav active="Inicio" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#0d1629] pt-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
        <div className="absolute top-24 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 bg-blue-600 pointer-events-none" />
        <div className="absolute top-16 right-1/3 w-56 h-56 rounded-full blur-3xl opacity-8 bg-violet-600 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-[9px] font-bold text-teal-400 uppercase tracking-[0.2em] bg-teal-400/10 border border-teal-400/20 px-2 py-1 rounded-sm">Editorial inteligente · Certificaciones cloud</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tight mb-5">
              Una biblioteca inteligente<br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                para aprobar certificaciones cloud.
              </span>
            </h1>
            <p className="text-base text-white/50 leading-relaxed mb-8 max-w-xl">
              CloudBooks produce colecciones de estudio completas por certificación. Cada colección incluye formatos complementarios diseñados para cubrir todo el ciclo de preparación.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setLocation("/books")}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-sm">
                Ver colecciones disponibles
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hero bottom: 3 productos */}
        <div className="relative border-t border-white/[0.06] bg-white/[0.015]">
          <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-3 gap-0 divide-x divide-white/[0.06]">
            {[
              { icon: BookOpen, label: "Master Book",     tag: "Aprendizaje profundo",  color:"#2563eb", desc:"El libro completo por certificación." },
              { icon: Map,      label: "Visual Atlas",    tag: "Estudio visual",         color:"#7c3aed", desc:"Atlas infográfico de conceptos clave.", active: true },
              { icon: Package,  label: "Collection Pack", tag: "Preparación completa",   color:"#0d9488", desc:"Todos los formatos. Mejor valor.", best: true },
            ].map(p => {
              const Icon = p.icon;
              return (
                <div key={p.label} className={cn(
                  "px-6 py-4 flex items-start gap-3",
                  p.best && "bg-teal-500/5"
                )}>
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0 mt-0.5"
                    style={{backgroundColor:`${p.color}20`,border:`1px solid ${p.color}30`}}>
                    <Icon className="w-4 h-4" style={{color:p.color}} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white/80">{p.label}</p>
                      {p.best && <span className="text-[7px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/25 px-1.5 py-0.5 rounded-sm">BEST VALUE</span>}
                      {p.active && !p.best && <span className="text-[7px] font-bold bg-violet-400/20 text-violet-300 border border-violet-400/25 px-1.5 py-0.5 rounded-sm">EN PRODUCCIÓN</span>}
                    </div>
                    <p className="text-[9px] text-white/35 uppercase tracking-wide font-medium">{p.tag}</p>
                    <p className="text-[10px] text-white/30 mt-1">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────────── */}
      <section className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">El problema</p>
              <h2 className="text-2xl font-black text-gray-900 leading-tight mb-4">
                Estudiar certificaciones cloud está fragmentado.
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Documentación extensa sin priorización, cursos desactualizados, dumps sin contexto y resúmenes de calidad inconsistente. Sin una ruta clara ni un estándar de calidad medible.
              </p>
              <div className="space-y-2">
                {[
                  "Fuentes sin coherencia editorial entre sí",
                  "Formatos de estudio aislados, sin ruta integrada",
                  "Sin validación técnica sistemática del contenido",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-sm bg-red-100 border border-red-200 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                    </div>
                    <p className="text-sm text-gray-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-sm p-6 shadow-sm">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4">Fuentes típicas de preparación</p>
              <div className="space-y-2.5">
                {[
                  { src: "Documentación oficial",   q: 40, note: "Muy extensa, sin priorización" },
                  { src: "Cursos en plataformas",   q: 55, note: "Calidad y actualización variables" },
                  { src: "Dumps de preguntas",       q: 25, note: "Sin contexto ni explicación" },
                  { src: "Resúmenes de terceros",    q: 35, note: "Inconsistentes, sin estándar" },
                ].map((r) => (
                  <div key={r.src} className="flex items-center gap-3">
                    <span className="text-[9px] text-gray-400 w-36 shrink-0">{r.src}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-200 rounded-full" style={{width:`${r.q}%`}} />
                    </div>
                    <span className="text-[8px] text-gray-400 w-32 shrink-0">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tres productos ───────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Formatos editoriales</p>
            <h2 className="text-2xl font-black text-gray-900">Tres formatos para cada certificación cloud.</h2>
            <p className="text-sm text-gray-500 mt-2">Cada colección CloudBooks incluye tres niveles de preparación complementarios.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Master Book */}
            <div className="bg-white border border-gray-200 rounded-sm p-5 flex flex-col">
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-blue-50 border border-blue-100">
                <BookOpen className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Aprendizaje profundo</p>
              <h3 className="text-lg font-black text-gray-900 mb-2">Master Book</h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">
                Comprensión profunda de cada dominio, servicio, arquitectura y decisión técnica. El punto de partida de cualquier preparación seria.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="text-xs text-gray-600">Master Book completo (PDF + digital)</span>
                </div>
              </div>
              <button onClick={() => setLocation("/books")}
                className="mt-4 w-full h-8 border border-gray-200 rounded-sm text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
                Ver colecciones <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Visual Atlas */}
            <div className="bg-white border border-violet-200 rounded-sm p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500" />
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-violet-50 border border-violet-100">
                <Map className="w-4.5 h-4.5 text-violet-600" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Estudio visual</p>
                <span className="text-[7px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1 py-px rounded-sm">EN PRODUCCIÓN</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">Visual Atlas</h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1">
                Páginas infográficas, diagramas, trampas visuales, autochecks y mapas de decisión para estudiar más rápido. 61 páginas · 13 batches.
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="text-xs text-gray-600">Visual Atlas completo (61 infografías)</span>
                </div>
              </div>
              <button onClick={() => setLocation("/books")}
                className="mt-4 w-full h-8 bg-violet-600 hover:bg-violet-700 rounded-sm text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5">
                Ver colecciones <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Collection Pack */}
            <div className="bg-[#0d1629] rounded-sm p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-blue-500" />
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-teal-400/15 border border-teal-400/25">
                <Package className="w-4.5 h-4.5 text-teal-400" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-bold text-teal-400/60 uppercase tracking-widest">Preparación completa</p>
                <span className="text-[7px] font-bold bg-teal-400/15 text-teal-300 border border-teal-400/25 px-1.5 py-0.5 rounded-sm">BEST VALUE</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2">Collection Pack</h3>
              <p className="text-xs text-white/50 leading-relaxed flex-1">
                Todo lo necesario para preparar y aprobar la certificación: aprendizaje profundo, estudio visual, trampas de examen, práctica exhaustiva, hojas de repaso y revisión final.
              </p>
              <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-1.5">
                {["Master Book", "Visual Atlas", "Exam Traps Guide", "Question Bank", "Cheat Sheets", "Rapid Review Pack"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-[10px] text-white/60">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setLocation("/books")}
                className="mt-4 w-full h-8 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 rounded-sm text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5">
                Ver colecciones <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Azure Books ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-[#0d1629] border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-[0.2em] mb-3">Azure Books</p>
            <h2 className="text-2xl font-black text-white">Certificaciones Azure disponibles.</h2>
            <p className="text-sm text-white/40 mt-2">Primera cloud activa. Más certificaciones en producción editorial.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { cert:"AI-200", title:"Azure AI Fundamentals",        status:"active",   note:"Collection Pack + Visual Atlas disponibles" },
              { cert:"AZ-900", title:"Azure Fundamentals",            status:"planned",  note:"Q3 2026" },
              { cert:"AI-900", title:"Azure AI Fundamentals (Gen)",   status:"planned",  note:"Q3 2026" },
              { cert:"DP-900", title:"Azure Data Fundamentals",       status:"planned",  note:"Q4 2026" },
              { cert:"AZ-104", title:"Azure Administrator",           status:"planned",  note:"2027" },
              { cert:"AZ-305", title:"Azure Solutions Architect",     status:"planned",  note:"2027" },
            ].map(c => (
              <div key={c.cert} className={cn(
                "rounded-sm border p-4 relative overflow-hidden",
                c.status === "active" ? "bg-white/[0.05] border-teal-500/30" : "bg-white/[0.02] border-white/[0.07]"
              )}>
                {c.status === "active" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500 to-blue-500" />}
                <div className="flex items-start justify-between mb-2">
                  <span className={cn("text-xs font-black tracking-wide font-mono", c.status === "active" ? "text-teal-400" : "text-white/25")}>{c.cert}</span>
                  {c.status === "active"
                    ? <span className="text-[8px] font-bold bg-teal-400/10 text-teal-400 border border-teal-400/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"/>ACTIVO</span>
                    : <Clock className="w-3 h-3 text-white/20" />}
                </div>
                <p className={cn("text-sm font-semibold mb-1", c.status === "active" ? "text-white/80" : "text-white/30")}>{c.title}</p>
                <p className="text-[9px] text-white/25">{c.note}</p>
                {c.status === "active" && (
                  <button onClick={() => setLocation("/ai-200-packs")}
                    className="mt-3 flex items-center gap-1 text-[9px] text-teal-400 hover:text-teal-300 font-semibold transition-colors">
                    Ver paquetes <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metodología ──────────────────────────────────────────────────── */}
      <section id="metodologia" className="py-16 bg-gray-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Metodología editorial</p>
            <h2 className="text-2xl font-black text-gray-900">Producción sistemática con estándar QA ≥ 9.5.</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl">Cada formato se produce a través de un proceso editorial estructurado, validado con scoring multidimensional antes de publicación.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              { icon: Database, label:"Grounding técnico",        desc:"Documentación oficial Microsoft, trazabilidad de fuentes, validación de contenido base." },
              { icon: Layers,   label:"Arquitectura pedagógica",  desc:"Diseño de objetivos, secuencia de contenido y rutas de estudio por certificación." },
              { icon: Edit3,    label:"Dirección editorial",      desc:"Coherencia de voz, estructura narrativa y formato específico por tipo de colección." },
              { icon: Eye,      label:"Dirección visual",         desc:"Layout, paleta, tipografía, iconografía y contrato visual por marca." },
              { icon: Shield,   label:"QA / Red team",            desc:"Validación de precisión, detección de errores y scoring multidimensional ≥ 9.5." },
              { icon: Pkg,      label:"Producción y exportación", desc:"Generación final, exportación por formato, control de versiones y trazabilidad." },
            ].map(d => {
              const Icon = d.icon;
              return (
                <div key={d.label} className="bg-white border border-gray-200 rounded-sm p-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-sm bg-[#0d1629] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <h3 className="text-xs font-bold text-gray-900">{d.label}</h3>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0d1629] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
        <div className="absolute right-0 top-0 w-96 h-96 rounded-full blur-3xl opacity-5 bg-violet-600 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.2em] mb-3">CloudBooks Editorial</p>
            <h2 className="text-2xl font-black text-white mb-2">Colecciones completas para certificaciones cloud.</h2>
            <p className="text-sm text-white/40 max-w-md leading-relaxed">Libros maestros, atlas visuales y packs de preparación. Azure es la primera línea editorial activa.</p>
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <button onClick={() => setLocation("/books")}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-semibold px-6 h-11 rounded-sm transition-all text-sm">
              Ver colecciones disponibles <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setLocation(user ? "/catalogo" : "/login")}
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 font-medium px-5 h-9 rounded-sm transition-all text-xs justify-center">
              Conocer metodología
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1629] border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-6 w-auto opacity-40" draggable={false} />
            <span className="text-[9px] text-white/15">Editorial inteligente de certificaciones cloud</span>
          </div>
          <div className="text-[9px] text-white/15 font-mono">Azure Books · Primera línea editorial activa</div>
        </div>
      </footer>
    </div>
  );
}
