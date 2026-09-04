import { useState } from "react";
import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, Globe, Check, CheckCircle2 } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   EMPRESAS (B2B) — servicio editorial a medida + formulario de contacto.
   Consistente con la marca del landing. Ruta /empresas.
   ⚠️ El formulario es front-end: conectar a backend/CRM/email donde dice // TODO_REAL.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", bright: "#c4b5fd", gold: "#fbbf24", teal: "#2dd4bf",
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const up: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

const OFFER = [
  { color: "#3b82f6", t: "Priorización de producción", d: "Producimos primero las certificaciones que tu equipo necesita. Tú marcas la prioridad del roadmap editorial." },
  { color: "#8b5cf6", t: "Materiales dedicados", d: "Colecciones a medida: tu stack, tus casos internos y tu marca. Contenido pensado para tu organización." },
  { color: "#fbbf24", t: "Acompañamiento por rol", d: "Rutas de estudio según el rol y el nivel de cada persona, no un material genérico para todos." },
];

const INPUT = "w-full h-12 rounded-lg px-4 text-sm bg-[#15151d] border border-white/10 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-white/30";

export default function Empresas() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ nombre: "", empresa: "", email: "", equipo: "1–10", cert: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const submit = (e: React.FormEvent) => { e.preventDefault(); /* TODO_REAL: enviar a backend/CRM/email */ setSent(true); };
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";
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
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: h === "/empresas" ? 1 : 0.85, color: h === "/empresas" ? C.bright : undefined }}>{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés" className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <a href="#contacto" className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              Hablemos <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 lg:pt-44 pb-16 relative overflow-hidden" style={{ background: `radial-gradient(120% 80% at 85% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <motion.div aria-hidden className="pointer-events-none absolute -top-20 -right-10 w-[26rem] h-[26rem] rounded-full blur-3xl" style={{ background: C.violet, opacity: 0.12 }} animate={{ x: [0, 18, 0], y: [0, 16, 0] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div variants={stagger} initial="hidden" animate="show" className="relative mx-auto max-w-[1000px] px-6">
          <motion.p variants={up} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-5" style={{ color: C.violet }}>Para empresas</motion.p>
          <motion.h1 variants={up} className="tracking-[-0.04em] leading-[1.0] max-w-[20ch]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.6rem,6.5vw,5rem)" }}>
            Certifica a tu equipo con colecciones{" "}
            <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>a medida</span><CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.teal} strokeWidth={3} />
          </motion.h1>
          <motion.p variants={up} className="mt-8 text-xl max-w-2xl leading-relaxed" style={{ color: C.inkSoft, fontWeight: 300 }}>
            Servicio editorial dedicado: priorizamos las certificaciones que tu organización necesita y producimos materiales hechos a la medida de tu equipo.
          </motion.p>
          <motion.div variants={up} className="mt-9">
            <a href="#contacto" className="group inline-flex items-center gap-2 text-white px-7 h-12 rounded-full text-base transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
              Solicitar propuesta <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── OFERTA (editorial, sin tarjetas/iconos) ── */}
      <section className="py-20 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.violet}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1000px] px-6">
          <motion.h2 variants={up} className="tracking-[-0.03em] mb-12 max-w-2xl" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.8rem,4vw,3rem)" }}>El servicio editorial para empresas</motion.h2>
          <div style={{ borderTop: `1px solid ${C.ink}1f` }}>
            {OFFER.map((x, i) => (
              <motion.div key={x.t} variants={up} className="grid md:grid-cols-[auto_1fr] gap-3 md:gap-12 py-8 items-baseline" style={{ borderBottom: `1px solid ${C.ink}1f` }}>
                <span className="leading-none tabular-nums" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4vw,3rem)", color: x.color }}>{String(i + 1).padStart(2, "0")}</span>
                <div className="max-w-2xl">
                  <h3 className="text-2xl mb-2 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{x.t}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{x.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="py-20 relative scroll-mt-20">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.teal}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1100px] px-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-12 lg:gap-16 items-start">
          {/* intro */}
          <motion.div variants={up}>
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.teal }}>Hablemos</p>
            <h2 className="tracking-[-0.03em] mb-4" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.9rem,4vw,3rem)" }}>Cuéntanos sobre tu equipo</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: C.inkSoft }}>Déjanos tus datos y te enviamos una propuesta con prioridades, formatos y precios para tu organización.</p>
            <ul className="space-y-2.5">
              {["Propuesta sin compromiso", "Materiales y prioridad a tu medida", "Respuesta en 48 h hábiles"].map(t => (
                <li key={t} className="flex items-center gap-2.5 text-sm" style={{ color: C.inkSoft }}>
                  <Check className="w-4 h-4 shrink-0" style={{ color: C.teal }} />{t}{/* TODO_REAL: ajustar SLA */}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* formulario */}
          <motion.div variants={up} className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}14` }}>
            {sent ? (
              <div className="flex flex-col items-center text-center py-10 gap-4">
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${C.teal}1f`, border: `1px solid ${C.teal}55` }}><Check className="w-7 h-7" style={{ color: C.teal }} /></span>
                <h3 className="text-2xl" style={{ fontFamily: D, fontWeight: 700 }}>¡Recibido!</h3>
                <p className="text-[15px] max-w-sm" style={{ color: C.inkSoft }}>Gracias, {form.nombre || "🙂"}. Revisaremos tu solicitud y te contactaremos pronto a <b style={{ color: C.ink }}>{form.email}</b>.</p>
                <button onClick={() => { setSent(false); setForm({ nombre: "", empresa: "", email: "", equipo: "1–10", cert: "", mensaje: "" }); }} className="mt-2 text-sm underline" style={{ color: C.inkSoft, textUnderlineOffset: "4px" }}>Enviar otra solicitud</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Nombre</label>
                    <input className={INPUT} style={{ color: C.ink }} required value={form.nombre} onChange={set("nombre")} placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Empresa</label>
                    <input className={INPUT} style={{ color: C.ink }} required value={form.empresa} onChange={set("empresa")} placeholder="Nombre de la empresa" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Email corporativo</label>
                    <input type="email" className={INPUT} style={{ color: C.ink }} required value={form.email} onChange={set("email")} placeholder="tu@empresa.com" />
                  </div>
                  <div>
                    <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Tamaño del equipo</label>
                    <select className={INPUT} style={{ color: C.ink }} value={form.equipo} onChange={set("equipo")}>
                      {["1–10", "11–50", "51–200", "200+"].map(o => <option key={o} value={o} style={{ background: C.card }}>{o} personas</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Certificaciones de interés</label>
                  <input className={INPUT} style={{ color: C.ink }} value={form.cert} onChange={set("cert")} placeholder="Ej. AZ-900, AI-900, AWS…" />
                </div>
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>Mensaje</label>
                  <textarea className="w-full rounded-lg px-4 py-3 text-sm bg-[#15151d] border border-white/10 focus:border-violet-500 focus:outline-none transition-colors placeholder:text-white/30 resize-none" style={{ color: C.ink }} rows={4} value={form.mensaje} onChange={set("mensaje")} placeholder="Cuéntanos qué necesita tu equipo…" />
                </div>
                <button type="submit" className="group w-full h-12 rounded-full text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                  Enviar solicitud <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[11px] text-center" style={{ color: `${C.ink}40` }}>Al enviar aceptas nuestro <button type="button" onClick={() => setLocation("/aviso-legal")} className="underline" style={{ color: "inherit" }}>aviso legal</button>.</p>
              </form>
            )}
          </motion.div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
