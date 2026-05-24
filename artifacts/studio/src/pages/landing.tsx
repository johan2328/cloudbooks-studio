import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import {
  BookOpen, Map, Package, ArrowRight, ChevronRight,
  CheckCircle2, Check, Clock, Database, Layers, Edit3, Eye, Shield, Package as Pkg,
  Globe, Search, ShoppingCart, X, Minus, Plus, Users, Briefcase, GraduationCap,
  FileText, Wand2, Beaker, ClipboardCheck, Sparkles,
} from "lucide-react";

export function translateHref() {
  if (typeof window === "undefined") return "#";
  return `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}`;
}

/* ─── Fila legal compartida (Apple-style) ───────────────────────────────── */
export function LegalRow() {
  return (
    <div className="border-t border-white/[0.04] mt-5 pt-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[10px] text-white/30">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Copyright © 2026 CloudBooks. Todos los derechos reservados.</span>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Política de privacidad</a>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Aviso legal</a>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Mapa del sitio</a>
      </div>
      <div className="flex items-center gap-3">
        <span>América Latina y el Caribe</span>
        <span className="text-white/10">|</span>
        <a
          href={translateHref()}
          target="_blank"
          rel="noopener noreferrer"
          title="Traducir esta página al inglés (Google Translate)"
          className="hover:text-white/60 transition-colors inline-flex items-center gap-1"
        >
          <Globe className="w-3 h-3" />
          English
        </a>
      </div>
    </div>
  );
}

/* ─── Nav comercial compartida ──────────────────────────────────────────── */
export function CommercialNav({ active }: { active?: string }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { count, open: cartOpen, setOpen: setCartOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0d1629]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center gap-6">
          <button onClick={() => setLocation("/")} className="shrink-0">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 w-auto" draggable={false} />
          </button>
          <nav className="hidden md:flex items-center gap-5 ml-4">
            {[
              { label: "Inicio",         href: "/" },
              { label: "Nuestra Labor",  href: "/nuestra-labor" },
              { label: "Empresas",       href: "/empresas" },
              { label: "Demo",            href: "/demo" },
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
            <a
              href={translateHref()}
              target="_blank"
              rel="noopener noreferrer"
              title="Traducir esta página al inglés (Google Translate)"
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors mr-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono tracking-wider">EN</span>
            </a>
            <button onClick={() => setLocation("/demo")}
              className="flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-white/60 hover:text-white/90 text-xs font-medium px-3 h-7 rounded-sm transition-all">
              {user ? "Abrir Studio" : "Studio"}
            </button>
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-7 h-7 border border-white/15 hover:border-white/30 text-white/50 hover:text-white/90 rounded-sm transition-all"
              title="Buscar"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-7 h-7 border border-white/15 hover:border-amber-400/40 text-white/50 hover:text-amber-300 rounded-sm transition-all"
              title="Carrito"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </button>
            <button onClick={() => setLocation("/books")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold px-3 h-7 rounded-sm transition-all">
              Ver Books <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal búsqueda */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg mx-4 bg-[#0d1629] border border-white/10 rounded-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar certificaciones, formatos, conceptos..."
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") { setSearchOpen(false); setLocation("/books"); } }}
              />
              <span className="text-[10px] text-white/20 font-mono border border-white/10 px-1.5 py-0.5 rounded-sm">ESC</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Sugerencias rápidas</p>
              <div className="flex flex-wrap gap-2">
                {["AI-200", "AZ-900", "Visual Atlas", "Master Book", "Cheat Sheets"].map(s => (
                  <button key={s} onClick={() => { setSearchOpen(false); setLocation("/books"); }}
                    className="text-xs text-white/50 hover:text-white/80 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 px-2.5 h-6 rounded-sm transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── LANDING ────────────────────────────────────────────────────────────── */
export default function Landing() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  /* Intersection Observer para animaciones progresivas */
  const [formatsInView, setFormatsInView] = useState(false);
  const formatsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = formatsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setFormatsInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      <CommercialNav active="Inicio" />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-[#0d1629] pt-14 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
        <div className="absolute top-24 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 bg-blue-600 pointer-events-none" />
        <div className="absolute top-16 right-1/3 w-56 h-56 rounded-full blur-3xl opacity-8 bg-violet-600 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-10 flex-1 flex flex-col justify-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* ── Izquierda: texto ── */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-[9px] font-bold text-teal-400 uppercase tracking-[0.2em] bg-teal-400/10 border border-teal-400/20 px-2 py-1 rounded-sm">Editorial inteligente · Certificaciones cloud</span>
              </div>
              <h1 className="text-4xl md:text-[3.2rem] font-black text-white leading-[1.08] tracking-tight mb-6 max-w-2xl">
                Una biblioteca inteligente<br />
                <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                  para aprobar certificaciones cloud.
                </span>
              </h1>
              <p className="text-base text-white/55 leading-relaxed mb-8 max-w-lg">
                CloudBooks produce colecciones de estudio completas por certificación. Cada colección incluye seis formatos complementarios diseñados para cubrir todo el ciclo de preparación.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setLocation("/books")}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-sm">
                  Colecciones disponibles
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => setLocation("/demo")}
                  className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors font-medium">
                  Ver demo <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Derecha: imagen hero ── */}
            <div className="relative hidden lg:flex items-center justify-center">
              <img
                src="/hero-ai200.png"
                alt="CloudBooks AI-200 — 6 formatos sincronizados"
                className="w-full max-w-[640px] h-auto object-contain drop-shadow-2xl"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0a1220] relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">El problema</p>
              <h2 className="text-3xl font-black text-white leading-tight mb-5">
                Estudiar certificaciones cloud está fragmentado.
              </h2>
              <p className="text-base text-white/55 leading-relaxed mb-7">
                Documentación extensa sin priorización, cursos desactualizados, dumps sin contexto y resúmenes de calidad inconsistente. Sin una ruta clara ni un estándar de calidad medible.
              </p>
              <div className="space-y-3">
                {[
                  "Fuentes sin coherencia editorial entre sí",
                  "Formatos de estudio aislados, sin ruta integrada",
                  "Sin validación técnica sistemática del contenido",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-sm bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-red-400"/>
                    </div>
                    <p className="text-sm text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-sm p-8 shadow-2xl shadow-black/40">
              <div className="absolute -inset-px rounded-sm bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Fuentes típicas de preparación</p>
                </div>
                <div className="space-y-5">
                  {[
                    { src: "Documentación oficial",   q: 40, note: "Muy extensa, sin priorización" },
                    { src: "Cursos en plataformas",   q: 55, note: "Calidad y actualización variables" },
                    { src: "Dumps de preguntas",       q: 25, note: "Sin contexto ni explicación" },
                    { src: "Resúmenes de terceros",    q: 35, note: "Inconsistentes, sin estándar" },
                  ].map((r) => (
                    <div key={r.src}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-white/70">{r.src}</span>
                        <span className="text-[10px] text-white/40">{r.note}</span>
                      </div>
                      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500/70 to-red-400/50 rounded-full" style={{width:`${r.q}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Seis formatos ────────────────────────────────────────────────── */}
      <section className="py-28 bg-[#0d1629] relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16 max-w-2xl">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Sistema editorial</p>
            <h2 className="text-3xl md:text-4xl font-black text-white">Seis formatos. Una ruta completa de estudio.</h2>
            <p className="text-base text-white/55 mt-4 leading-relaxed">Cada colección CloudBooks se produce en seis formatos complementarios, diseñados para cubrir todo el ciclo de preparación: comprensión profunda, estudio visual, práctica de examen y repaso final.</p>
          </div>

          {/* Timeline pipeline — cronológico con animación progresiva al scroll */}
          <div ref={formatsRef} className="relative flex flex-col md:flex-row items-stretch gap-8 md:gap-10">
            {/* Desktop: línea punteada animada (marching ants) */}
            <div className="hidden md:block absolute top-[28px] left-8 right-8 h-0 border-t border-dashed border-white/[0.12] pointer-events-none z-0 overflow-hidden"
              style={{background: "linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.08) 50%)", backgroundSize: "16px 100%", animation: formatsInView ? "march 1s linear infinite" : "none", opacity: formatsInView ? 1 : 0, transition: "opacity 0.6s ease-out"}} />

            {[
              { num: "01", label: "Master Book", tag: "Aprendizaje profundo", color: "#2563eb",
                desc: "Libro completo. Dominios, servicios y arquitectura." },
              { num: "02", label: "Visual Atlas", tag: "Estudio visual", color: "#7c3aed",
                desc: "Infografías, mapas de decisión y comparaciones." },
              { num: "03", label: "Exam Traps", tag: "Criterio de examen", color: "#0d9488",
                desc: "Trampas, distractores y señales de respuesta." },
              { num: "04", label: "Question Bank", tag: "Práctica", color: "#0284c7",
                desc: "Preguntas con razonamiento y dificultad progresiva." },
              { num: "05", label: "Cheat Sheets", tag: "Repaso", color: "#d97706",
                desc: "Tablas de decisión, límites y señales rápidas." },
              { num: "06", label: "Rapid Review", tag: "Cierre", color: "#059669",
                desc: "Checklist y mapas de memoria pre-examen." },
            ].map((f, i) => {
              const delay = i * 120;
              return (
                <div key={f.num} className="relative flex-1 z-10 group"
                  style={{opacity: formatsInView ? 1 : 0, transform: formatsInView ? "translateY(0)" : "translateY(18px)", transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`}}>
                  {/* Mobile conector vertical */}
                  {i > 0 && <div className="md:hidden absolute top-0 left-[23px] -translate-y-7 w-px h-7 bg-white/10" />}

                  <div className="flex md:flex-col items-start md:items-center gap-4 md:gap-0">
                    {/* Círculo grande con glow continuo */}
                    <div className="w-14 h-14 rounded-full border-[3px] flex items-center justify-center font-mono text-base font-black tracking-wider shrink-0 z-10 relative transition-all duration-300 group-hover:scale-110"
                      style={{borderColor: `${f.color}40`, color: f.color, backgroundColor: `#0d1629`}}>
                      {/* Anillo pulsante */}
                      <span className="absolute inset-0 rounded-full border border-transparent transition-opacity duration-500"
                        style={{opacity: formatsInView ? 1 : 0, transitionDelay: `${delay}ms`, animation: formatsInView ? `pulseRing 2s ease-out ${delay}ms infinite` : "none", borderColor: `${f.color}30`}} />
                      {f.num}
                    </div>

                    {/* Texto con stagger */}
                    <div className="md:mt-6 md:text-center flex-1"
                      style={{opacity: formatsInView ? 1 : 0, transform: formatsInView ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.45s ease-out ${delay + 150}ms, transform 0.45s ease-out ${delay + 150}ms`}}>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-1.5"
                        style={{color: f.color}}>{f.tag}</p>
                      <h3 className="text-xl font-black text-white mb-1.5">{f.label}</h3>
                      <p className="text-xs text-white/50 leading-relaxed hidden md:block max-w-[180px] mx-auto">{f.desc}</p>
                      <p className="text-sm text-white/55 leading-relaxed md:hidden">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fases agrupadas (mobile) */}
          <div className="md:hidden mt-8 grid grid-cols-2 gap-3">
            {[
              { label: "Comprensión", steps: "01 — 02", color: "#2563eb" },
              { label: "Criterio",    steps: "03 — 04", color: "#0d9488" },
              { label: "Memorización", steps: "05",       color: "#d97706" },
              { label: "Cierre",      steps: "06",       color: "#059669" },
            ].map(g => (
              <div key={g.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-3.5 text-center">
                <span className="text-[10px] font-mono text-white/30 block mb-1">{g.steps}</span>
                <span className="text-xs font-bold" style={{color: g.color}}>{g.label}</span>
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
              Colecciones disponibles <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setLocation("/demo")}
              className="flex items-center gap-2 border border-white/10 hover:border-white/20 text-white/40 hover:text-white/70 font-medium px-5 h-9 rounded-sm transition-all text-xs justify-center">
              Ver demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-[#0d1629] border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 w-auto opacity-70" draggable={false} />
          </div>
          <LegalRow />
        </div>
      </footer>
    </div>
  );
}
