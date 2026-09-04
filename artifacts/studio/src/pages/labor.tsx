import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Globe, CheckCircle2 } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import { MethodologyReactor } from "@/components/methodology";

/* ════════════════════════════════════════════════════════════════════════════
   NUESTRA LABOR — página de propósito, consistente con la marca del landing.
   Negro #0a0a0e · Space Grotesk · acentos violeta/oro · ruta /nuestra-labor
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", bright: "#c4b5fd", gold: "#fbbf24", teal: "#2dd4bf",
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const up: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

const DOING = [
  { color: "#3b82f6", t: "Una colección por certificación", d: "Cada certificación cloud, su propia colección completa: seis formatos que cubren todo el ciclo de preparación.", micro: "Seis formatos · Un solo pago" },
  { color: "#8b5cf6", t: "Producción humano-agentes",       d: "Agentes de IA producen cada formato por dominios; un editor humano audita y firma.", micro: "Escala de máquina · Criterio humano" },
  { color: "#2dd4bf", t: "Acceso real",                      d: "Sin suscripciones infladas. El estudio de calidad no debería ser un privilegio.", micro: "Desde USD 5.99 / formato" },
];

const SPINE_COLORS = ["#3b82f6", "#8b5cf6", "#2dd4bf", "#38bdf8", "#fbbf24", "#34d399"];

const PRINCIPLES = [
  { color: "#3b82f6", t: "Rigor", d: "Documentación oficial, cada dato verificado." },
  { color: "#8b5cf6", t: "Claridad", d: "Diseñado para entenderse rápido." },
  { color: "#fbbf24", t: "Calidad medible", d: "Score 9.7+ y firma de un editor humano." },
  { color: "#2dd4bf", t: "Cercanía", d: "En español (LATAM), a un precio accesible." },
];

const BOOKS = [
  { n: "01", label: "Master Book", tag: "Aprendizaje profundo", color: "#3b82f6" },
  { n: "02", label: "Visual Atlas", tag: "Estudio visual", color: "#8b5cf6" },
  { n: "03", label: "Exam Traps", tag: "Criterio de examen", color: "#2dd4bf" },
  { n: "04", label: "Question Bank", tag: "Práctica", color: "#38bdf8" },
  { n: "05", label: "Cheat Sheets", tag: "Repaso", color: "#fbbf24" },
  { n: "06", label: "Rapid Review", tag: "Cierre", color: "#34d399" },
];

export default function Labor() {
  const [, setLocation] = useLocation();
  const enHref = typeof window !== "undefined"
    ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}`
    : "#";
  const reveal = { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.2 } } as const;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1240px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.inkSoft }}>
            {[["Nuestra Labor", "/nuestra-labor"], ["Empresas", "/empresas"], ["Demo", "/demo"], ["Colecciones", "/colecciones"]].map(([l, h]) => (
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: h === "/nuestra-labor" ? 1 : 0.85, color: h === "/nuestra-labor" ? C.bright : undefined }}>{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              Ver colecciones <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO / MISIÓN ── */}
      <section className="pt-32 lg:pt-44 pb-20 relative overflow-hidden" style={{ background: `radial-gradient(120% 80% at 85% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <motion.div aria-hidden className="pointer-events-none absolute -top-20 -right-10 w-[28rem] h-[28rem] rounded-full blur-3xl" style={{ background: C.violet, opacity: 0.12 }}
          animate={{ x: [0, 20, 0], y: [0, 18, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="pointer-events-none absolute top-40 -left-20 w-[24rem] h-[24rem] rounded-full blur-3xl" style={{ background: C.blue, opacity: 0.1 }}
          animate={{ x: [0, -16, 0], y: [0, 22, 0] }} transition={{ duration: 17, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mx-auto max-w-[1000px] px-6">
          <motion.p variants={up} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-5" style={{ color: C.violet }}>Nuestra labor</motion.p>
          <motion.h1 variants={up} className="tracking-[-0.04em] leading-[1.0] max-w-[18ch]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.6rem,6.5vw,5rem)" }}>
            Convertimos el caos del estudio cloud en colecciones que{" "}
            <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>sí preparan</span><CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.teal} strokeWidth={3} />
          </motion.h1>
          <motion.p variants={up} className="mt-8 text-xl max-w-2xl leading-relaxed" style={{ color: C.inkSoft, fontWeight: 300 }}>
            CloudBooks nació de una frustración: prepararse para certificar significa saltar entre documentación interminable,
            cursos desactualizados y dumps sin contexto. Creemos que estudiar merece un <b style={{ color: C.ink, fontWeight: 600 }}>estándar editorial</b> —claro,
            completo y verificado—. Eso es lo que producimos.
          </motion.p>
        </motion.div>
      </section>

      {/* ── SHOWCASE: lo que producimos (los 6 libros) ── */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.gold}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1100px] px-6">
          <motion.div variants={up} className="mb-12 max-w-2xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.gold }}>Lo que producimos</p>
            <h2 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.8rem,4vw,3rem)" }}>Una colección. Seis libros.</h2>
            <p className="text-base mt-3 leading-relaxed" style={{ color: C.inkSoft }}>Cada certificación se convierte en seis libros complementarios. Pasa el cursor por cualquiera.</p>
          </motion.div>
          <div className="flex flex-wrap justify-center gap-3 lg:gap-4 pt-6">
            {BOOKS.map((b, i) => {
              const tilt = (i - 2.5) * 2.2;
              return (
                <motion.div key={b.n}
                  initial={{ opacity: 0, y: 60, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: tilt }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
                  whileHover={{ y: -16, rotate: 0, scale: 1.05, zIndex: 20, transition: { duration: 0.25 } }}
                  className="relative cursor-default"
                  style={{ width: "clamp(118px,15vw,158px)", aspectRatio: "1023 / 1537", transformOrigin: "bottom center" }}>
                  <div className="w-full h-full rounded-lg overflow-hidden relative" style={{ border: `1px solid ${b.color}44`, boxShadow: "0 20px 44px -18px rgba(0,0,0,0.75)" }}>
                    <BookCover id={`AI-200-${b.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} color={b.color} format={b.label} cert="AI-200" />
                    {/* lomo */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 pointer-events-none" style={{ background: "rgba(0,0,0,0.14)" }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ── LO QUE HACEMOS ── */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.violet}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1100px] px-6">
          <motion.p variants={up} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.violet }}>Qué hacemos</motion.p>
          <motion.h2 variants={up} className="tracking-[-0.03em] mb-12 max-w-3xl leading-[1.05]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.9rem,4.5vw,3.2rem)" }}>Tres decisiones que lo cambian todo</motion.h2>

          <div className="grid lg:grid-cols-12 gap-x-10 gap-y-12 items-start">
            {/* 01 — destacado */}
            <motion.div variants={up} className="lg:col-span-7" style={{ borderTop: `2px solid ${DOING[0].color}` }}>
              <div className="pt-6 flex gap-5 sm:gap-7">
                <span className="leading-[0.78] tabular-nums shrink-0" style={{ fontFamily: D, fontWeight: 800, fontSize: "clamp(3.5rem,8vw,6.5rem)", WebkitTextStroke: `2px ${DOING[0].color}`, color: "transparent" }}>01</span>
                <div>
                  <h3 className="text-2xl sm:text-[1.7rem] tracking-tight mb-3 leading-tight" style={{ fontFamily: D, fontWeight: 700 }}>{DOING[0].t}</h3>
                  <p className="text-[15px] leading-relaxed max-w-md mb-6" style={{ color: C.inkSoft }}>{DOING[0].d}</p>
                  <div className="flex items-end gap-2 h-16" aria-hidden>
                    {SPINE_COLORS.map((c, i) => (
                      <motion.span key={i} className="rounded-sm" style={{ width: 13, height: 60, background: `linear-gradient(180deg, ${c}, ${c}55)`, transformOrigin: "bottom center" }}
                        initial={{ rotate: 0, y: 12, opacity: 0 }} whileInView={{ rotate: (i - 2.5) * 6, y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: EASE }} />
                    ))}
                  </div>
                  <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: DOING[0].color }}>{DOING[0].micro}</p>
                </div>
              </div>
            </motion.div>

            {/* 02 + 03 — apoyo */}
            <div className="lg:col-span-5 flex flex-col gap-10">
              {[DOING[1], DOING[2]].map((x, k) => (
                <motion.div key={x.t} variants={up} style={{ borderTop: `1px solid ${x.color}66` }}>
                  <div className="pt-5 flex gap-4">
                    <span className="leading-[0.78] tabular-nums shrink-0" style={{ fontFamily: D, fontWeight: 800, fontSize: "clamp(2.4rem,5vw,3.4rem)", WebkitTextStroke: `1.5px ${x.color}`, color: "transparent" }}>{String(k + 2).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-xl tracking-tight mb-2 leading-tight" style={{ fontFamily: D, fontWeight: 700 }}>{x.t}</h3>
                      <p className="text-[14px] leading-relaxed mb-3" style={{ color: C.inkSoft }}>{x.d}</p>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: x.color }}>{x.micro}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* tira de principios (unificada bajo "Qué hacemos") */}
          <motion.div variants={up} className="mt-14 pt-8" style={{ borderTop: `1px solid ${C.ink}1f` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] mb-5" style={{ color: `${C.ink}66` }}>Nuestros principios</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
              {PRINCIPLES.map(x => (
                <div key={x.t} className="pt-3" style={{ borderTop: `2px solid ${x.color}` }}>
                  <p className="text-[15px] mb-1 tracking-tight" style={{ fontFamily: D, fontWeight: 700, color: x.color }}>{x.t}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>{x.d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── METODOLOGÍA (reactor de agentes) ── */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.teal}40,transparent)` }} />
        <MethodologyReactor />
      </section>

      {/* ── CITA / MANIFIESTO ── */}
      <section className="py-24">
        <div className="relative mx-auto max-w-[900px] px-6 text-center">
          {/* comilla decorativa (lead-in) */}
          <span aria-hidden className="block select-none mx-auto" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(3.4rem,8vw,5.5rem)", lineHeight: 0.55, color: C.gold, opacity: 0.38 }}>“</span>

          <blockquote className="relative mt-3 tracking-[-0.025em] leading-[1.04]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.2rem,6vw,4.4rem)", color: C.ink }}>
            No publicamos rápido<br />
            <span className="relative inline-block">
              <span style={{ color: C.gold }}>Publicamos bien</span>
              <motion.svg className="absolute left-0 w-full" style={{ bottom: "-0.14em", height: "0.3em", overflow: "visible", transformOrigin: "left center" }} viewBox="0 0 300 12" fill="none" preserveAspectRatio="none" aria-hidden
                initial={{ scaleX: 0, opacity: 0 }} whileInView={{ scaleX: 1, opacity: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}>
                <path d="M2 7 C 90 2, 210 2, 298 6 C 210 10, 90 10, 2 7 Z" fill={C.gold} />
              </motion.svg>
            </span><CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.08em" }} color={C.gold} strokeWidth={3} />
          </blockquote>

          {/* firma manuscrita (trazo dibujado, sin fuente cursiva) */}
          <div className="mt-9 flex flex-col items-center gap-1.5">
            <svg width="170" height="54" viewBox="0 0 190 60" fill="none" aria-hidden style={{ overflow: "visible" }}>
              {/* trazo del nombre — cursiva con bucle inicial y remate ascendente */}
              <motion.path d="M8 44 C 2 20, 18 6, 26 16 C 32 23, 22 34, 16 30 C 9 26, 18 13, 32 18 C 42 21, 44 38, 50 42 C 55 45, 60 40, 58 30 C 56 21, 62 18, 66 28 C 70 38, 79 40, 86 29 C 93 18, 90 11, 96 21 C 102 31, 111 33, 120 24 C 131 13, 124 7, 132 14 C 141 22, 136 35, 148 32 C 160 29, 166 16, 184 7"
                stroke={C.teal} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none"
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1.4, ease: "easeInOut", delay: 0.25 }} />
              {/* rúbrica / paraph — flourish que barre y cierra en bucle */}
              <motion.path d="M10 52 C 70 61, 142 56, 184 38 C 193 34, 188 26, 178 30 C 169 34, 175 46, 160 47"
                stroke={C.teal} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" style={{ opacity: 0.85 }}
                initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.95, ease: "easeInOut", delay: 1.2 }} />
            </svg>
            <span className="font-mono text-[11px] uppercase tracking-[0.28em]" style={{ color: C.inkSoft }}>Firma humana</span>
          </div>

          <p className="mt-8 text-lg max-w-xl mx-auto leading-relaxed" style={{ color: C.inkSoft }}>
            Cada libro pasa por una cadena de agentes especializados y termina en una firma humana. Si no llega al estándar, vuelve a la cadena.
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="pb-24">
        <div className="mx-auto max-w-[1000px] px-6">
          <div className="rounded-2xl p-8 md:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
            style={{ background: `linear-gradient(120deg, ${C.violet}1f, ${C.bgAlt})`, border: `1px solid ${C.violet}3a` }}>
            <div>
              <h2 className="text-2xl md:text-3xl mb-1.5 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Mira lo que producimos</h2>
              <p style={{ color: C.inkSoft }}>Colecciones completas, auditadas por humanos, para cada certificación cloud.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 text-white px-6 h-12 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                Ver colecciones <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setLocation("/demo")} className="px-5 h-12 rounded-full text-sm border transition-all hover:bg-white/5" style={{ fontFamily: D, fontWeight: 500, borderColor: `${C.ink}26`, color: C.ink }}>Ver demo</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
