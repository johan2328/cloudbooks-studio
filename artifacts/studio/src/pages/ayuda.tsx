import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { LifeBuoy, ChevronDown, ArrowRight, Globe, Mail, Scale, ExternalLink, ShoppingCart, BookOpen, ShieldCheck, Send, CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

/* ════════════════════════════════════════════════════════════════════════════
   AYUDA & SOPORTE — hub: FAQ + contacto + reclamos (Defensa del Consumidor).
   Ruta /ayuda. /faq redirige aquí.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.6)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", bright: "#c4b5fd", teal: "#2dd4bf", gold: "#fbbf24",
};

const CATS = [
  { icon: BookOpen, color: "#3b82f6", t: "Contenido y calidad", to: "#faq" },
  { icon: ShoppingCart, color: "#8b5cf6", t: "Compra y acceso", to: "#faq" },
  { icon: Mail, color: "#2dd4bf", t: "Contacto", to: "#contacto" },
  { icon: Scale, color: "#fbbf24", t: "Reclamos", to: "#reclamos" },
];

const FAQ_GROUPS = [
  {
    cat: "General",
    items: [
      { q: "¿Qué es CloudBooks?", a: "Una editorial que produce colecciones de estudio completas por certificación cloud. Cada colección combina seis formatos complementarios, auditados por un editor humano antes de publicar." },
      { q: "¿Me sirve para aprobar el examen?", a: "Cada colección cubre el temario oficial en seis formatos, auditados por un humano con un score de calidad superior a 9.7." },
      { q: "¿Qué certificaciones cubren?", a: "Empezamos por Azure (AI-200). AWS y Google Cloud están en el roadmap del catálogo." },
    ],
  },
  {
    cat: "Contenido y calidad",
    items: [
      { q: "¿El contenido está actualizado?", a: "Sí. Mientras la certificación esté vigente, si cambia reeditamos los libros y te los reenviamos sin costo (~1 semana)." },
      { q: "¿Está en español?", a: "Todo el contenido está en español (LATAM). Pronto disponible en inglés." },
      { q: "¿Cuáles son los seis formatos?", a: "Master Book (aprendizaje profundo), Visual Atlas (estudio visual), Exam Traps (criterio de examen), Question Bank (práctica), Cheat Sheets (repaso) y Rapid Review (cierre)." },
      { q: "¿Cómo garantizan la calidad?", a: "Cada libro lo produce una batería de agentes especializados por dominios —Conocimiento, Creación y Calidad— y un editor humano lo valida y firma. Si no supera un score de 9.7, se reescribe." },
    ],
  },
  {
    cat: "Compra y acceso",
    items: [
      { q: "¿Puedo comprar un solo formato?", a: "Sí. Cada formato cuesta USD 5.99, o llevate el Collection Pack completo a USD 19.99." },
      { q: "¿Cómo recibo los libros?", a: "Acceso digital inmediato tras la compra, en cada uno de los formatos de la colección, desde Mi biblioteca." },
      { q: "¿El Collection Pack incluye actualizaciones?", a: "Sí. Mientras la certificación esté vigente, si se actualiza reeditamos los libros y te los reenviamos sin costo." },
      { q: "¿Hay garantía o reembolso?", a: "Sí, ofrecemos garantía de satisfacción. [Ajustar al detalle de tu política real.]" /* TODO_REAL */ },
    ],
  },
];

const RECLAMOS_URL = "https://autogestion.produccion.gob.ar/consumidores";

export default function Ayuda() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState<string | null>("General-0");
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

  const [form, setForm] = useState({ nombre: "", email: "", tema: "Compra y acceso", pedido: "", mensaje: "" });
  const [sent, setSent] = useState(false);
  const inputCls = "w-full rounded-xl px-4 h-11 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/60";
  const inputStyle = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink } as const;

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
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: 0.85 }}>{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés" className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              Ver colecciones <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-32 lg:pt-40 pb-10 text-center" style={{ background: `radial-gradient(120% 80% at 80% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="mx-auto max-w-[820px] px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4 inline-flex items-center gap-2" style={{ color: C.violet }}><LifeBuoy className="w-4 h-4" /> Centro de ayuda</p>
          <h1 className="tracking-[-0.04em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.6rem,6vw,4.4rem)", lineHeight: 0.95 }}>
            Ayuda <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},#3b82f6 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>y Soporte</span>
          </h1>
          <p className="mt-5 text-lg" style={{ color: C.inkSoft }}>Respuestas a lo más frecuente, cómo contactarnos y dónde hacer un reclamo.</p>
        </div>
      </section>

      {/* ── CATEGORÍAS ── */}
      <section className="pb-6">
        <div className="mx-auto max-w-[900px] px-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {CATS.map(c => (
            <a key={c.t} href={c.to} className="group rounded-2xl p-5 flex flex-col gap-3 transition-transform hover:-translate-y-1" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c.color}1f`, border: `1px solid ${c.color}40` }}><c.icon className="w-5 h-5" style={{ color: c.color }} /></span>
              <span className="text-[15px] tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{c.t}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-12" style={{ scrollMarginTop: "5rem" }}>
        <div className="mx-auto max-w-[860px] px-6">
          <h2 className="text-2xl mb-8 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Preguntas frecuentes</h2>
          <div className="flex flex-col gap-12">
            {FAQ_GROUPS.map(group => (
              <div key={group.cat}>
                <p className="font-mono text-[12px] uppercase tracking-[0.24em] mb-3" style={{ color: C.teal }}>{group.cat}</p>
                <div style={{ borderTop: `1px solid ${C.ink}1f` }}>
                  {group.items.map((it, i) => {
                    const id = `${group.cat}-${i}`;
                    const isOpen = open === id;
                    return (
                      <div key={id} style={{ borderBottom: `1px solid ${C.ink}1f` }}>
                        <button onClick={() => setOpen(isOpen ? null : id)} aria-expanded={isOpen} className="w-full flex items-center justify-between gap-4 py-5 text-left">
                          <span className="text-lg tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{it.q}</span>
                          <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-300" aria-hidden style={{ color: isOpen ? C.violet : C.inkSoft, transform: isOpen ? "rotate(180deg)" : "none" }} />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                              <p className="pb-6 text-[15px] leading-relaxed max-w-3xl" style={{ color: C.inkSoft }}>{it.a}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="py-12" style={{ scrollMarginTop: "5rem" }}>
        <div className="mx-auto max-w-[960px] px-6 grid md:grid-cols-5 gap-6">
          {/* Aside */}
          <div className="md:col-span-2 flex flex-col gap-5">
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.24em] mb-2" style={{ color: C.bright }}>Contacto</p>
              <h2 className="text-2xl mb-3 tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>¿Necesitás una mano?</h2>
              <p className="text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>Completá el formulario y te respondemos a tu correo dentro de [24–48 h hábiles]. También podés escribirnos directo a:</p>
              <a href="mailto:soporte@cloudbooks.xxx" className="mt-3 inline-flex items-center gap-2 text-sm transition-opacity hover:opacity-100" style={{ color: C.bright, opacity: 0.9 }}><Mail className="w-4 h-4" /> soporte@cloudbooks.xxx</a>
            </div>
            <div className="rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${C.violet}1c, ${C.bgAlt})`, border: `1px solid ${C.violet}3a` }}>
              <p className="text-[14px] mb-3" style={{ color: C.inkSoft }}>¿Sos una empresa? Tenemos un canal dedicado para capacitación de equipos.</p>
              <button onClick={() => setLocation("/empresas")} className="group inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                Soluciones para empresas <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Formulario */}
          <div className="md:col-span-3 rounded-2xl p-6 md:p-7" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            {sent ? (
              <div role="status" aria-live="polite" className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-4">
                <span className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${C.teal}1f`, border: `1px solid ${C.teal}4d` }}><CheckCircle2 className="w-7 h-7" style={{ color: C.teal }} /></span>
                <div>
                  <h3 className="text-xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>¡Mensaje enviado!</h3>
                  <p className="mt-2 text-[14px] max-w-xs mx-auto" style={{ color: C.inkSoft }}>Gracias, {form.nombre || "te"} — te responderemos a <span style={{ color: C.bright }}>{form.email || "tu correo"}</span> dentro de [24–48 h hábiles].</p>
                </div>
                <button onClick={() => { setSent(false); setForm({ nombre: "", email: "", tema: "Compra y acceso", pedido: "", mensaje: "" }); }} className="text-sm underline underline-offset-4" style={{ color: C.bright }}>Enviar otra consulta</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSent(true); }} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-nombre" className="text-[13px]" style={{ color: C.inkSoft }}>Nombre</label>
                    <input id="c-nombre" name="name" autoComplete="name" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Tu nombre" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-email" className="text-[13px]" style={{ color: C.inkSoft }}>Correo electrónico</label>
                    <input id="c-email" name="email" type="email" autoComplete="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} style={inputStyle} placeholder="tucorreo@ejemplo.com" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-tema" className="text-[13px]" style={{ color: C.inkSoft }}>Tema</label>
                    <select id="c-tema" value={form.tema} onChange={e => setForm(f => ({ ...f, tema: e.target.value }))} className={inputCls} style={inputStyle}>
                      <option>Compra y acceso</option>
                      <option>Contenido y calidad</option>
                      <option>Facturación</option>
                      <option>Reclamo</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="c-pedido" className="text-[13px]" style={{ color: C.inkSoft }}>N.º de pedido <span style={{ color: `${C.ink}55` }}>(opcional)</span></label>
                    <input id="c-pedido" name="order" value={form.pedido} onChange={e => setForm(f => ({ ...f, pedido: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ej. CB-10248" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="c-mensaje" className="text-[13px]" style={{ color: C.inkSoft }}>Mensaje</label>
                  <textarea id="c-mensaje" required rows={5} maxLength={1500} value={form.mensaje} onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-y focus-visible:ring-2 focus-visible:ring-violet-500/60" style={inputStyle} placeholder="Contanos en qué podemos ayudarte…" />
                  <span className="self-end font-mono text-[11px]" style={{ color: `${C.ink}55` }}>{form.mensaje.length}/1500</span>
                </div>
                <button type="submit" className="group mt-1 inline-flex items-center justify-center gap-2 text-white px-6 h-11 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                  Enviar mensaje <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <p className="text-[12px] leading-relaxed" style={{ color: `${C.ink}55` }}>Al enviar aceptás el tratamiento de tus datos según la <button type="button" onClick={() => setLocation("/politica-privacidad")} className="underline underline-offset-4" style={{ color: C.bright }}>Política de Privacidad</button>.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── RECLAMOS ── */}
      <section id="reclamos" className="py-12" style={{ scrollMarginTop: "5rem" }}>
        <div className="mx-auto max-w-[860px] px-6">
          <div className="rounded-2xl p-7 md:p-9" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.gold}1f`, border: `1px solid ${C.gold}40` }}><Scale className="w-4 h-4" style={{ color: C.gold }} /></span>
              <h2 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Reclamos</h2>
            </div>
            <p className="text-[15px] leading-relaxed max-w-2xl" style={{ color: C.inkSoft }}>
              Si tenés un reclamo como consumidor y no pudimos resolverlo por nuestros canales, podés iniciarlo ante la autoridad de Defensa del Consumidor a través de la Ventanilla Única Federal:
            </p>
            <a href={RECLAMOS_URL} target="_blank" rel="noopener noreferrer" className="group mt-5 inline-flex items-center gap-2 px-5 h-11 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: D, fontWeight: 600 }}>
              Iniciar un reclamo en Defensa del Consumidor <ExternalLink className="w-4 h-4" />
            </a>
            <p className="mt-3 font-mono text-[11px]" style={{ color: `${C.ink}55` }}>autogestion.produccion.gob.ar/consumidores</p>
            <p className="mt-4 text-[13px] flex items-center gap-2" style={{ color: C.inkSoft }}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" style={{ color: C.teal }} /> Para datos personales, ver la <button onClick={() => setLocation("/politica-privacidad")} className="underline underline-offset-4" style={{ color: C.bright }}>Política de Privacidad</button>.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
