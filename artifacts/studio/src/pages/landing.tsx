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
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
        <button onClick={() => setLocation("/")} className="shrink-0">
          <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 w-auto" draggable={false} />
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

        <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-[9px] font-bold text-teal-400 uppercase tracking-[0.2em] bg-teal-400/10 border border-teal-400/20 px-2 py-1 rounded-sm">Editorial inteligente · Certificaciones cloud</span>
          </div>
          <h1 className="text-4xl md:text-[3.4rem] font-black text-white leading-[1.08] tracking-tight mb-6 max-w-3xl">
            Una biblioteca inteligente<br />
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
              para aprobar certificaciones cloud.
            </span>
          </h1>
          <p className="text-base text-white/55 leading-relaxed mb-8 max-w-xl">
            CloudBooks produce colecciones de estudio completas por certificación. Cada colección incluye seis formatos complementarios diseñados para cubrir todo el ciclo de preparación.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setLocation("/books")}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-sm">
              Ver colecciones disponibles
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => { document.getElementById("metodologia")?.scrollIntoView({behavior:"smooth"}); }}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors font-medium">
              Conocer metodología <ChevronRight className="w-4 h-4" />
            </button>
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
                      {p.active && !p.best && <span className="text-[7px] font-bold bg-violet-400/20 text-violet-300 border border-violet-400/25 px-1.5 py-0.5 rounded-sm">DISPONIBLE</span>}
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
      <section className="py-20 bg-[#0a1220] relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">El problema</p>
              <h2 className="text-2xl font-black text-white leading-tight mb-4">
                Estudiar certificaciones cloud está fragmentado.
              </h2>
              <p className="text-sm text-white/55 leading-relaxed mb-6">
                Documentación extensa sin priorización, cursos desactualizados, dumps sin contexto y resúmenes de calidad inconsistente. Sin una ruta clara ni un estándar de calidad medible.
              </p>
              <div className="space-y-2">
                {[
                  "Fuentes sin coherencia editorial entre sí",
                  "Formatos de estudio aislados, sin ruta integrada",
                  "Sin validación técnica sistemática del contenido",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-sm bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400"/>
                    </div>
                    <p className="text-sm text-white/65">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.04] border border-white/10 rounded-sm p-6">
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-4">Fuentes típicas de preparación</p>
              <div className="space-y-2.5">
                {[
                  { src: "Documentación oficial",   q: 40, note: "Muy extensa, sin priorización" },
                  { src: "Cursos en plataformas",   q: 55, note: "Calidad y actualización variables" },
                  { src: "Dumps de preguntas",       q: 25, note: "Sin contexto ni explicación" },
                  { src: "Resúmenes de terceros",    q: 35, note: "Inconsistentes, sin estándar" },
                ].map((r) => (
                  <div key={r.src} className="flex items-center gap-3">
                    <span className="text-[9px] text-white/50 w-36 shrink-0">{r.src}</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500/60 rounded-full" style={{width:`${r.q}%`}} />
                    </div>
                    <span className="text-[8px] text-white/40 w-32 shrink-0">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seis formatos ────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0d1629] relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Sistema editorial</p>
              <h2 className="text-2xl font-black text-white">Seis formatos. Una ruta completa de estudio.</h2>
              <p className="text-sm text-white/55 mt-3 leading-relaxed">Cada colección CloudBooks se produce en seis formatos complementarios, diseñados para cubrir todo el ciclo de preparación: comprensión profunda, estudio visual, práctica de examen y repaso final.</p>
            </div>
            <div className="hidden md:flex items-center justify-center relative">
              <svg viewBox="0 0 420 320" className="w-full max-w-md" fill="none" aria-hidden>
                <defs>
                  <radialGradient id="fmt-halo" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#0d1629" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="210" cy="160" r="150" fill="url(#fmt-halo)" />
                {/* Backdrop grid */}
                <g stroke="#ffffff" strokeOpacity="0.04" strokeWidth="0.5">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <line key={`gh${i}`} x1="0" y1={i * 48} x2="420" y2={i * 48} />
                  ))}
                  {Array.from({ length: 9 }).map((_, i) => (
                    <line key={`gv${i}`} x1={i * 48} y1="0" x2={i * 48} y2="320" />
                  ))}
                </g>
                {/* Corner ticks */}
                {[[20,20],[400,20],[20,300],[400,300]].map(([x,y],i)=>(
                  <g key={i} stroke="#ffffff" strokeOpacity="0.15" strokeWidth="0.75">
                    <line x1={x-5} y1={y} x2={x+5} y2={y} /><line x1={x} y1={y-5} x2={x} y2={y+5} />
                  </g>
                ))}

                {/* 6 stacked iso sheets, ordered back→front */}
                {[
                  { color:"#059669", label:"Rapid Review",  code:"06" },
                  { color:"#d97706", label:"Cheat Sheets",  code:"05" },
                  { color:"#0d9488", label:"Question Bank", code:"04" },
                  { color:"#dc2626", label:"Exam Traps",    code:"03" },
                  { color:"#7c3aed", label:"Visual Atlas",  code:"02" },
                  { color:"#2563eb", label:"Master Book",   code:"01" },
                ].map((s, i) => {
                  const cx = 210;
                  const cy = 70 + i * 28;
                  const w = 130, h = 18;
                  const pts = `${cx},${cy-h} ${cx+w},${cy} ${cx},${cy+h} ${cx-w},${cy}`;
                  const isVisual = s.label === "Visual Atlas";
                  return (
                    <g key={s.label}>
                      {/* shadow */}
                      <polygon
                        points={`${cx},${cy-h+4} ${cx+w},${cy+4} ${cx},${cy+h+4} ${cx-w},${cy+4}`}
                        fill="#000" fillOpacity="0.18"
                      />
                      <polygon points={pts} fill={s.color} fillOpacity={isVisual ? 0.12 : 0.05} stroke={s.color} strokeOpacity={isVisual ? 0.7 : 0.45} strokeWidth={isVisual ? 1.25 : 0.9} />
                      <line x1={cx-w} y1={cy} x2={cx+w} y2={cy} stroke={s.color} strokeOpacity="0.2" strokeWidth="0.4" />
                      <circle cx={cx} cy={cy} r="2" fill={s.color} fillOpacity={isVisual ? 1 : 0.6} />
                      {/* Callout */}
                      <line x1={cx+w} y1={cy} x2={cx+w+18} y2={cy} stroke={s.color} strokeOpacity="0.5" strokeWidth="0.6" />
                      <text x={cx+w+22} y={cy-2} fill="#ffffff" fillOpacity={isVisual ? 0.95 : 0.7} fontSize="8" fontWeight={isVisual ? 800 : 600} fontFamily="ui-sans-serif" letterSpacing="0.2">{s.label}</text>
                      <text x={cx+w+22} y={cy+8} fill={s.color} fillOpacity="0.7" fontSize="6" fontFamily="ui-monospace" letterSpacing="1.2">FMT · {s.code}</text>
                      {/* Left index */}
                      <text x={cx-w-8} y={cy+2} textAnchor="end" fill={s.color} fillOpacity="0.55" fontSize="6" fontFamily="ui-monospace" letterSpacing="1.2">{s.code}</text>
                    </g>
                  );
                })}

                {/* Spec chrome */}
                <g fill="#ffffff" fillOpacity="0.22" fontSize="6" fontFamily="ui-monospace" letterSpacing="1">
                  <text x="30" y="32">SPEC · 002</text>
                  <text x="390" y="32" textAnchor="end">COLLECTION · 6 FMT</text>
                  <text x="30" y="296">SCALE · 1:1</text>
                  <text x="390" y="296" textAnchor="end">SHEET · B</text>
                </g>
              </svg>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              {
                num: "01", label: "Master Book", tag: "Aprendizaje profundo", color: "#2563eb",
                desc: "El libro completo para construir comprensión técnica de cada dominio, servicio, arquitectura y decisión de examen.",
              },
              {
                num: "02", label: "Visual Atlas", tag: "Estudio visual", color: "#7c3aed",
                desc: "Atlas infográfico para acelerar comprensión, memoria visual, comparaciones, flujos y mapas de decisión.",
              },
              {
                num: "03", label: "Exam Traps Guide", tag: "Criterio de examen", color: "#0d9488",
                desc: "Guía de trampas, distractores, ambigüedades, excepciones y señales que suelen definir la respuesta correcta.",
              },
              {
                num: "04", label: "Question Bank", tag: "Práctica exhaustiva", color: "#0284c7",
                desc: "Banco de preguntas con respuestas explicadas, análisis de distractores, dificultad progresiva y razonamiento de examen.",
              },
              {
                num: "05", label: "Cheat Sheets", tag: "Repaso compacto", color: "#7c3aed",
                desc: "Hojas de referencia con límites, tablas de decisión, diferencias entre servicios y señales rápidas de examen.",
              },
              {
                num: "06", label: "Rapid Review Pack", tag: "Cierre final", color: "#0d9488",
                desc: "Pack de repaso para los últimos días antes del examen: checklist de dominio, preguntas críticas y mapas de memoria.",
              },
            ].map(f => (
              <div key={f.num} className="bg-white/[0.04] border border-white/10 rounded-sm p-4 flex flex-col gap-2 hover:border-white/20 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-white/25 font-mono tracking-wider">{f.num}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                    style={{color: f.color, backgroundColor: `${f.color}25`, border: `1px solid ${f.color}40`, filter: "brightness(1.3)"}}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-sm font-black text-white">{f.label}</h3>
                <p className="text-[10px] text-white/55 leading-relaxed flex-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Elige tu paquete ─────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0a1220] relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Paquetes de compra</p>
            <h2 className="text-2xl font-black text-white">Elige tu paquete.</h2>
            <p className="text-sm text-white/55 mt-2">Tres opciones por certificación. Empieza donde necesites y completa cuando estés listo.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Master Book */}
            <div className="bg-white/[0.04] border border-white/10 rounded-sm p-5 flex flex-col relative overflow-hidden hover:border-blue-400/40 transition-all">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-blue-400" />
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-blue-500/15 border border-blue-500/30">
                <BookOpen className="w-4.5 h-4.5 text-blue-400" />
              </div>
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Aprendizaje profundo</p>
              <h3 className="text-lg font-black text-white mb-2">Master Book</h3>
              <p className="text-xs text-white/55 leading-relaxed flex-1">
                Construye criterio técnico con explicaciones completas de dominios, servicios, arquitecturas, límites y decisiones de examen.
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-xs text-white/70">Incluye Master Book completo</span>
                </div>
              </div>
              <button onClick={() => setLocation("/ai-200-packs")}
                className="mt-4 w-full h-8 border border-white/15 hover:border-blue-400/50 hover:bg-blue-500/10 rounded-sm text-xs font-semibold text-white/70 hover:text-blue-300 transition-all flex items-center justify-center gap-1.5">
                Ver Master Book <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Visual Atlas */}
            <div className="bg-white/[0.04] border border-violet-500/30 rounded-sm p-5 flex flex-col relative overflow-hidden hover:border-violet-400/60 transition-all">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-blue-500" />
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-violet-500/20 border border-violet-500/40">
                <Map className="w-4.5 h-4.5 text-violet-400" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Estudio visual acelerado</p>
                <span className="text-[7px] font-bold bg-violet-500/20 text-violet-300 border border-violet-400/30 px-1 py-px rounded-sm">DISPONIBLE</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2">Visual Atlas</h3>
              <p className="text-xs text-white/55 leading-relaxed flex-1">
                Estudio visual acelerado de conceptos. Diagramas, mapas de decisión, comparaciones y autochecks para comprender más rápido.
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <span className="text-xs text-white/70">Incluye Visual Atlas</span>
                </div>
              </div>
              <button onClick={() => setLocation("/ai-200-packs")}
                className="mt-4 w-full h-8 bg-violet-600 hover:bg-violet-700 rounded-sm text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5">
                Ver Visual Atlas <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Collection Pack */}
            <div className="bg-gradient-to-br from-teal-500/[0.08] to-blue-500/[0.08] border border-teal-400/30 rounded-sm p-5 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-blue-500" />
              <div className="w-9 h-9 rounded-sm flex items-center justify-center mb-3 bg-teal-400/15 border border-teal-400/30">
                <Package className="w-4.5 h-4.5 text-teal-400" />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[9px] font-bold text-teal-400 uppercase tracking-widest">Preparación completa</p>
                <span className="text-[7px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-1.5 py-0.5 rounded-sm">BEST VALUE</span>
              </div>
              <h3 className="text-lg font-black text-white mb-2">Collection Pack</h3>
              <p className="text-xs text-white/65 leading-relaxed flex-1">
                Todo lo necesario para preparar y aprobar: aprendizaje profundo, estudio visual, trampas de examen, práctica exhaustiva, cheat sheets y repaso final.
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                <p className="text-[8px] font-bold text-white/40 uppercase tracking-widest mb-2">Incluye los 6 formatos</p>
                {["Master Book", "Visual Atlas", "Exam Traps Guide", "Question Bank", "Cheat Sheets", "Rapid Review Pack"].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-[10px] text-white/70">{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setLocation("/ai-200-packs")}
                className="mt-4 w-full h-8 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 rounded-sm text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5">
                Ver Collection Pack <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Azure Books ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-[#0d1629] relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-3">Azure Books</p>
            <h2 className="text-2xl font-black text-white">Certificaciones Azure disponibles.</h2>
            <p className="text-sm text-white/55 mt-2">Colecciones Azure disponibles ahora. Más certificaciones próximamente.</p>
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
                c.status === "active" ? "bg-teal-500/10 border-teal-400/40" : "bg-white/[0.03] border-white/10"
              )}>
                {c.status === "active" && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-blue-500" />}
                <div className="flex items-start justify-between mb-2">
                  <span className={cn("text-xs font-black tracking-wide font-mono", c.status === "active" ? "text-teal-300" : "text-white/25")}>{c.cert}</span>
                  {c.status === "active"
                    ? <span className="text-[8px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-1.5 py-0.5 rounded-sm flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"/>ACTIVO</span>
                    : <Clock className="w-3 h-3 text-white/25" />}
                </div>
                <p className={cn("text-sm font-semibold mb-1", c.status === "active" ? "text-white" : "text-white/30")}>{c.title}</p>
                <p className="text-[9px] text-white/40">{c.note}</p>
                {c.status === "active" && (
                  <button onClick={() => setLocation("/ai-200-packs")}
                    className="mt-3 flex items-center gap-1 text-[9px] text-teal-300 hover:text-teal-200 font-semibold transition-colors">
                    Ver paquetes <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metodología — Estudio multiagente unificado ──────────────────── */}
      <section id="metodologia" className="py-24 bg-[#0a1220] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        {/* PCB grid background sutil */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"48px 48px"}} />
        {/* Glows ambientales */}
        <div className="absolute -left-32 top-1/3 w-96 h-96 rounded-full blur-3xl opacity-[0.07] bg-blue-600 pointer-events-none" />
        <div className="absolute -right-32 bottom-1/4 w-96 h-96 rounded-full blur-3xl opacity-[0.07] bg-amber-500 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-14">
            <p className="text-[9px] font-bold text-teal-400/60 uppercase tracking-[0.25em] mb-3">Metodología editorial</p>
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Un estudio editorial humano-agentes.</h2>
            <p className="text-sm text-white/55 mt-4 leading-relaxed max-w-2xl mx-auto">
              Una batería de agentes especializados distribuidos por dominios produce cada formato.
              Un auditor humano valida la entrega final antes de publicación.
            </p>
          </div>

          {/* Bateria de agentes — layout compacto */}
          <div className="relative max-w-5xl mx-auto">
            {(() => {
              const domains = [
                {
                  label: "Conocimiento",
                  color: "blue",
                  agents: [
                    { icon: Database, name: "Grounding",  role: "Trazabilidad técnica",        desc: "Documentación oficial Microsoft, validación de fuentes y verificación de contenido base." },
                    { icon: Layers,   name: "Pedagogy",   role: "Arquitectura de aprendizaje", desc: "Diseño de objetivos, secuencia de contenido y rutas de estudio progresivas." },
                  ],
                },
                {
                  label: "Creación",
                  color: "violet",
                  agents: [
                    { icon: Edit3, name: "Editorial", role: "Voz y narrativa",   desc: "Coherencia editorial, estructura narrativa y formato específico por colección." },
                    { icon: Eye,   name: "Visual",    role: "Dirección de arte", desc: "Layout, paleta, tipografía e iconografía. Aplicación rigurosa del contrato visual." },
                  ],
                },
                {
                  label: "Calidad",
                  color: "teal",
                  agents: [
                    { icon: Shield, name: "QA / Red Team", role: "Validación adversarial", desc: "Auditoría técnica, detección de errores y scoring multidimensional ≥ 9.5." },
                    { icon: Pkg,    name: "Production",    role: "Build y exportación",    desc: "Generación final, exportación por formato y trazabilidad completa." },
                  ],
                },
              ] as const;

              const palette: Record<string, { ring:string; bg:string; tint:string; text:string; line:string; bar:string; chip:string; }> = {
                blue:   { ring:"ring-blue-500/20",   bg:"bg-blue-500/[0.04]",   tint:"from-blue-500/[0.08]",   text:"text-blue-300",   line:"bg-blue-500/50",   bar:"bg-blue-500",   chip:"bg-blue-500/15 ring-blue-500/40" },
                violet: { ring:"ring-violet-500/20", bg:"bg-violet-500/[0.04]", tint:"from-violet-500/[0.08]", text:"text-violet-300", line:"bg-violet-500/50", bar:"bg-violet-500", chip:"bg-violet-500/15 ring-violet-500/40" },
                teal:   { ring:"ring-teal-500/20",   bg:"bg-teal-500/[0.04]",   tint:"from-teal-500/[0.08]",   text:"text-teal-300",   line:"bg-teal-500/50",   bar:"bg-teal-500",   chip:"bg-teal-500/15 ring-teal-500/40" },
              };

              const connectorBetween = ["from-blue-500/25 to-violet-500/25", "from-violet-500/25 to-teal-500/25"];
              return (
                <div className="relative">
                  <div className="flex flex-col">
                    {domains.map((d, di) => {
                      const c = palette[d.color];
                      return (
                        <div key={d.label}>
                        {di > 0 && (
                          <div className="hidden md:flex justify-center my-1" aria-hidden>
                            <div className={`w-px h-6 bg-gradient-to-b ${connectorBetween[di-1]}`} />
                          </div>
                        )}
                        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-0 items-center">
                          {d.agents.map((a, ai) => {
                            const Icon = a.icon;
                            const isLeft = ai === 0;
                            return (
                              <div key={a.name} className={`group relative ${isLeft ? "md:pr-5" : "md:pl-5"}`}>
                                {/* Trace stub al chip de dominio (desktop) */}
                                <div className={`hidden md:block absolute top-1/2 ${isLeft ? "right-0" : "left-0"} w-5 h-px ${c.line}`} />
                                <div className={`relative rounded-sm ring-1 ${c.ring} ${c.bg} bg-gradient-to-br ${c.tint} via-transparent to-transparent p-3.5 transition-all duration-300 hover:ring-2 hover:shadow-[0_0_24px_-8px_rgba(255,255,255,0.18)]`}>
                                  {/* Barra acento */}
                                  <div className={`absolute top-2 bottom-2 ${isLeft ? "right-0" : "left-0"} w-[2px] ${c.bar} opacity-60 group-hover:opacity-100 transition-opacity`} />
                                  <div className={`flex items-start gap-3 ${isLeft ? "md:flex-row-reverse md:text-right" : ""}`}>
                                    <div className={`w-9 h-9 rounded-sm ring-1 ${c.ring} ${c.bg} flex items-center justify-center shrink-0`}>
                                      <Icon className={`w-4 h-4 ${c.text}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <h3 className="text-sm font-black text-white tracking-tight leading-tight">{a.name}</h3>
                                      <p className={`text-[9px] font-mono uppercase tracking-[0.18em] ${c.text} opacity-80 mt-0.5`}>{a.role}</p>
                                      <p className="text-[11px] text-white/55 leading-relaxed mt-1.5">{a.desc}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Chip de dominio = junction central */}
                          <div className="hidden md:flex order-3 col-start-2 row-start-1 items-center justify-center" style={{ gridColumn: 2, gridRow: 1 }}>
                            <div className={`relative z-10 rounded-sm ring-1 ${c.chip} bg-[#0a1220] px-2.5 py-1.5 shadow-[0_0_20px_-8px_currentColor] ${c.text}`}>
                              <span className={`text-[8px] font-mono uppercase tracking-[0.25em] ${c.text} whitespace-nowrap block`}>Dominio</span>
                              <span className="text-[10px] font-black text-white uppercase tracking-wide whitespace-nowrap block leading-tight">{d.label}</span>
                            </div>
                          </div>
                          {/* Mobile: chip de dominio arriba */}
                          <div className="md:hidden -order-1 flex justify-center">
                            <div className={`rounded-sm ring-1 ${c.chip} bg-[#0a1220] px-3 py-1`}>
                              <span className={`text-[9px] font-mono uppercase tracking-[0.25em] ${c.text}`}>Dominio · {d.label}</span>
                            </div>
                          </div>
                        </div>
                        </div>
                      );
                    })}

                    {/* Convergencia → sello */}
                    <div className="relative flex flex-col items-center pt-4">
                      <div className="absolute left-1/2 -translate-x-1/2 -top-1 h-10 w-px bg-gradient-to-b from-teal-500/50 to-amber-500/70" />
                      <div className="relative mt-8">
                        <div className="absolute inset-0 rounded-full bg-amber-400 blur-2xl opacity-25 scale-110" />
                        <div className="relative w-28 h-28 md:w-32 md:h-32">
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_40px_rgba(245,158,11,0.45),inset_0_2px_6px_rgba(255,255,255,0.4),inset_0_-3px_10px_rgba(0,0,0,0.3)]" />
                          <div className="absolute inset-[5px] rounded-full border-2 border-amber-200/70" />
                          <div className="absolute inset-[8px] rounded-full border border-amber-900/40" />
                          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" aria-hidden>
                            {Array.from({length:24}).map((_,i)=>{
                              const a = (i*15)*Math.PI/180;
                              return (<line key={i}
                                x1={50+Math.cos(a)*38} y1={50+Math.sin(a)*38}
                                x2={50+Math.cos(a)*41} y2={50+Math.sin(a)*41}
                                stroke="#78350f" strokeOpacity="0.5" strokeWidth="0.8" />);
                            })}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                            <span className="text-[7px] font-bold text-amber-950 uppercase tracking-[0.2em]">Final</span>
                            <span className="text-sm font-black text-amber-950 uppercase tracking-tight leading-none mt-0.5">Human</span>
                            <span className="text-sm font-black text-amber-950 uppercase tracking-tight leading-none mt-0.5">Audit</span>
                            <div className="w-6 h-px bg-amber-900/40 my-1" />
                            <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-amber-950/70">QA ≥ 9.5</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-amber-300/60 mt-3">Auditoría humana · Cierre editorial</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* ── CTA Final ────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0d1629] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />
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
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-12 w-auto opacity-70" draggable={false} />
            <span className="text-[9px] text-white/15">Editorial inteligente de certificaciones cloud</span>
          </div>
          <div className="text-[9px] text-white/15 font-mono">© 2026 CloudBooks</div>
        </div>
      </footer>
    </div>
  );
}
