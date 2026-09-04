import { useState } from "react";
import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion } from "framer-motion";
import { BookOpen, Globe, ShoppingCart, Download, Eye, FileText, Info, Search, X } from "lucide-react";
import { getLibrary, type OwnedBook } from "@/lib/library";
import { formatDef, PACK_COLOR } from "@/lib/catalog";
import { BookCover } from "@/components/book-cover";

/* ════════════════════════════════════════════════════════════════════════════
   MI BIBLIOTECA — donde el cliente accede a lo que compró (despacho).
   Lee de localStorage (lib/library). PROTOTIPO: lectura/descarga son demo.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", teal: "#2dd4bf", bright: "#c4b5fd", green: "#34d399", gold: "#fbbf24",
};

const colorOf = (b: OwnedBook) => b.format === "Collection Pack" ? PACK_COLOR : (formatDef(b.format)?.color ?? C.violet);
const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

export default function MiBiblioteca() {
  const [, setLocation] = useLocation();
  const [items] = useState<OwnedBook[]>(() => getLibrary());
  const [q, setQ] = useState("");
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

  const filtered = items.filter(b => `${b.name} ${b.cert} ${b.format}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.9)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1240px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <div className="flex items-center gap-3">
            <a href={enHref} target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}><Globe className="w-3.5 h-3.5" /> EN</a>
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all" style={{ fontWeight: 600, color: C.bright, border: `1px solid ${C.violet}66` }}>
              <ShoppingCart className="w-3.5 h-3.5" /> Tienda
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-10 pb-6" style={{ background: `radial-gradient(120% 80% at 80% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="mx-auto max-w-[1100px] px-6">
          <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.violet }}>Tu cuenta</p>
          <h1 className="tracking-[-0.04em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.2rem,5vw,3.4rem)" }}>Mi biblioteca</h1>
          <p className="mt-3 text-[15px]" style={{ color: C.inkSoft }}>{items.length > 0 ? `${items.length} libro(s) · acceso de por vida · actualizaciones mientras la certificación esté vigente.` : "Aquí aparecen los libros que compras."}</p>
        </div>
      </section>

      {/* ── CONTENIDO ── */}
      <section className="py-8 min-h-[40vh]">
        <div className="mx-auto max-w-[1100px] px-6">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20">
              <BookOpen className="w-10 h-10 mb-4" style={{ color: `${C.ink}33` }} />
              <p className="text-lg" style={{ fontFamily: D, fontWeight: 700 }}>Tu biblioteca está vacía</p>
              <p className="mt-1.5 text-sm max-w-md" style={{ color: C.inkSoft }}>Cuando compres un libro, aparecerá aquí para leerlo o descargarlo cuando quieras.</p>
              <button onClick={() => setLocation("/colecciones")} className="mt-6 px-6 h-11 rounded-full text-sm text-white" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Explorar colecciones</button>
            </div>
          ) : (
            <>
              {/* aviso prototipo */}
              <div className="mb-6 flex items-center gap-2 rounded-xl px-4 py-3 text-[12.5px]" style={{ backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}30`, color: C.gold }}>
                <Info className="w-4 h-4 shrink-0" /> Prototipo: la lectura y descarga se activan al conectar el backend de entrega.
              </div>

              {/* buscador */}
              <div className="relative max-w-sm mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar en mi biblioteca…" className="w-full h-11 rounded-full pl-11 pr-10 text-sm focus:outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }} />
                {q && <button onClick={() => setQ("")} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((b, i) => {
                  const color = colorOf(b);
                  return (
                    <motion.div key={b.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: (i % 6) * 0.04 }}
                      className="rounded-2xl p-4 flex gap-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                      {/* mini portada */}
                      <div className="w-16 rounded shrink-0 relative overflow-hidden" style={{ aspectRatio: "1023/1537" }}>
                        <BookCover id={b.id} color={color} format={b.format} cert={b.cert} />
                      </div>
                      {/* info + acciones */}
                      <div className="min-w-0 flex-1 flex flex-col">
                        <p className="text-[15px] leading-tight" style={{ fontFamily: D, fontWeight: 700 }}>{b.name}</p>
                        <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>{b.cert}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: `${C.ink}55` }}>Comprado el {fmtDate(b.purchasedAt)}</p>
                        <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
                          <Action icon={Eye} color={color} primary>Leer</Action>
                          <Action icon={Download}>PDF</Action>
                          <Action icon={FileText}>EPUB</Action>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {filtered.length === 0 && <p className="text-center py-12 text-sm" style={{ color: C.inkSoft }}>Sin coincidencias en tu biblioteca.</p>}
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}

function Action({ icon: Icon, children, primary, color }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; children: React.ReactNode; primary?: boolean; color?: string }) {
  return (
    <button title="Función demo" className="h-8 px-3 rounded-full text-[12px] inline-flex items-center gap-1.5 transition-all hover:brightness-110"
      style={primary ? { backgroundColor: color ?? C.violetBtn, color: "#0d1629", fontFamily: D, fontWeight: 700 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}
