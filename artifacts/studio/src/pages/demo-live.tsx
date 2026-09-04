import { useState } from "react";
import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { ArrowRight, Globe, ShoppingCart, Plus, Check, CheckCircle2, Eye, ShieldCheck, Sparkles } from "lucide-react";
import { useCart } from "@/lib/cart";
import { FORMATS, getProduct, slug, type Product } from "@/lib/catalog";
import { SampleViewer } from "@/components/sample-book";

/* ════════════════════════════════════════════════════════════════════════════
   DEMO EN VIVO — recorrido real por un libro: cambia de formato y hojéalo.
   Sin formulario. Ruta /demo. Datos de muestra (AI-200). // TODO_REAL
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", bright: "#c4b5fd", gold: "#fbbf24", green: "#34d399",
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const DEMO = FORMATS.map(f => ({ def: f, product: getProduct(`AI-200-${slug(f.name)}`)! })).filter(d => d.product);

export default function DemoLive() {
  const [, setLocation] = useLocation();
  const cart = useCart();
  const [sel, setSel] = useState(0);
  const cur = DEMO[sel];
  const p: Product = cur.product;
  const inCart = cart.items.some(i => i.id === p.id);
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

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
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: h === "/demo" ? 1 : 0.85, color: h === "/demo" ? C.bright : undefined }}>{l}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés" className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => cart.setOpen(true)} aria-label="Abrir carrito" className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
              <ShoppingCart className="w-4 h-4" />
              {cart.count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: C.violetBtn }}>{cart.count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-28 lg:pt-32 pb-6 relative overflow-hidden" style={{ background: `radial-gradient(120% 80% at 85% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="relative mx-auto max-w-[1240px] px-6">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.violet }}>Demo en vivo</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.05 }} className="tracking-[-0.04em] leading-[1.0] max-w-[18ch]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.2rem,5.5vw,4rem)" }}>
            Mira un libro{" "}
            <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>por dentro</span><CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.teal} strokeWidth={3} />
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.1 }} className="mt-5 text-lg max-w-2xl leading-relaxed" style={{ color: C.inkSoft, fontWeight: 300 }}>
            Esto es la colección <strong style={{ color: C.ink, fontWeight: 600 }}>AI-200</strong> real. Cambia de formato y hojea páginas de muestra como las verá tu lector.
          </motion.p>
        </div>
      </section>

      {/* ── SELECTOR DE FORMATO ── */}
      <section className="pb-4">
        <div className="mx-auto max-w-[1240px] px-6 flex items-center gap-2 overflow-x-auto py-1" style={{ scrollbarWidth: "none" }}>
          <span className="font-mono text-[10px] uppercase tracking-wider shrink-0 mr-1" style={{ color: `${C.ink}66` }}>Formato</span>
          {DEMO.map((d, i) => {
            const on = i === sel;
            return (
              <button key={d.def.name} onClick={() => setSel(i)} className="shrink-0 h-9 px-4 rounded-full text-sm inline-flex items-center gap-2 transition-all"
                style={on ? { backgroundColor: `${d.def.color}1f`, border: `1px solid ${d.def.color}`, color: "#fff", fontFamily: D, fontWeight: 700 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft, fontWeight: 500 }}>
                <span className="w-2 h-2 rounded-full" style={{ background: d.def.color }} /> {d.def.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── VISOR + INFO ── */}
      <section className="py-4">
        <div className="mx-auto max-w-[1240px] px-6 grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
          {/* visor */}
          <SampleViewer product={p} toc={cur.def.toc} />

          {/* info del formato */}
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="lg:sticky lg:top-24">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: p.color }}>{cur.def.tag}</span>
            <h2 className="mt-1.5 tracking-[-0.02em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.6rem,3vw,2.2rem)" }}>{p.format}</h2>
            <p className="mt-2 text-[13px]" style={{ color: C.inkSoft }}>{p.cert} · {p.certTitle}</p>
            <p className="mt-4 text-[15px] leading-relaxed" style={{ color: "rgba(243,243,246,0.82)" }}>{cur.def.long}</p>

            <div className="mt-5 flex flex-col gap-2 text-[13px]" style={{ color: C.inkSoft }}>
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 shrink-0" style={{ color: C.teal }} /> Auditado por un editor humano · QA 9.7+</span>
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 shrink-0" style={{ color: C.teal }} /> Uno de los 6 formatos de la colección</span>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => cart.add({ id: p.id, name: p.format, cert: p.cert, format: p.format, price: p.price })} disabled={inCart}
                className="h-11 px-5 rounded-full text-sm inline-flex items-center gap-2 transition-all hover:brightness-110 disabled:cursor-default"
                style={inCart ? { backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 600 } : { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>
                {inCart ? <><Check className="w-4 h-4" /> En el carrito</> : <><Plus className="w-4 h-4" /> Añadir · ${p.price.toFixed(2)}</>}
              </button>
              <button onClick={() => { setLocation(`/libro/${p.id}`); window.scrollTo(0, 0); }} className="group h-11 px-5 rounded-full text-sm inline-flex items-center gap-2 transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.ink, fontFamily: D, fontWeight: 600 }}>
                Ver ficha completa <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <div className="rounded-2xl p-8 md:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
            style={{ background: `linear-gradient(120deg, ${C.violet}1f, ${C.bgAlt})`, border: `1px solid ${C.violet}3a` }}>
            <div>
              <h2 className="text-2xl mb-1.5" style={{ fontFamily: D, fontWeight: 700 }}>¿Te gustó lo que viste?</h2>
              <p style={{ color: C.inkSoft }}>Llévate la colección completa o el formato que necesites.</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
              <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 text-white px-6 h-11 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                Ver colecciones <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => { setLocation(`/libro/${p.id}`); window.scrollTo(0, 0); }} className="px-5 h-11 rounded-full text-sm border transition-all hover:bg-white/5 inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 500, borderColor: `${C.ink}26`, color: C.ink }}>
                <Eye className="w-4 h-4" /> Ver este libro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}
