import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingCart, Globe, Check, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Plus, Zap, RefreshCw, Download, BookOpen, Layers, Eye, X, Lock, Send, ThumbsUp } from "lucide-react";
import { useCart } from "@/lib/cart";
import { getProduct, formatDef, productsForCert, FORMATS, REVIEWS, RATING_DIST, PACK_COLOR, slug, type Product } from "@/lib/catalog";
import { ownsBook } from "@/lib/library";
import { getReviews, addReview, hasVotedHelpful, toggleHelpful, type UserReview } from "@/lib/reviews";
import { fetchStorefront, fetchStorefrontCatalog, type EngineStorefront } from "@/lib/engine-api";
import { BookCover } from "@/components/book-cover";

/* ════════════════════════════════════════════════════════════════════════════
   LIBRO — ficha de producto estilo tienda de libros. Ruta /libro/:id
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", bright: "#c4b5fd", gold: "#fbbf24", green: "#34d399",
};

/** Total de opiniones (mock) que se muestra en la ficha de tienda. */
const MOCK_OPINIONES = 33;

/* meta enriquecida (formato simple o pack agregado) */
function metaFor(p: Product) {
  if (!p.pack) {
    const f = formatDef(p.format)!;
    return { long: f.long, bullets: f.bullets, toc: f.toc, pages: f.pages, rating: f.rating, reviewCount: f.reviewCount, color: f.color };
  }
  const pages = FORMATS.reduce((s, f) => s + f.pages, 0);
  const reviewCount = FORMATS.reduce((s, f) => s + f.reviewCount, 0);
  const rating = Math.round((FORMATS.reduce((s, f) => s + f.rating, 0) / FORMATS.length) * 10) / 10;
  return {
    long: "La colección completa de la certificación en un solo paquete: los seis formatos complementarios que cubren todo el ciclo de preparación, desde el aprendizaje profundo hasta el repaso de la víspera. La forma más completa —y económica— de prepararte.",
    bullets: ["Los seis formatos de la colección incluidos.", "Cubre todo el ciclo: aprender, practicar, repasar y cerrar.", "Ahorras frente a comprar los formatos por separado.", "Actualizaciones gratis mientras la certificación esté vigente."],
    toc: FORMATS.map(f => `${f.name} — ${f.tag}`), pages, reviewCount, rating, color: PACK_COLOR,
  };
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center" aria-label={`${value} de 5`}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0" style={{ width: size, height: size, color: `${C.gold}40` }} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="absolute inset-0" style={{ width: size, height: size, color: C.gold, fill: C.gold }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* portada: imagen REAL generada si existe; si no, la renderizada (mock) */
function Cover({ p, w = 280, coverUrl }: { p: Product; w?: number; coverUrl?: string | null }) {
  const c = p.color;
  return (
    <div className="relative rounded-r-md rounded-l-sm shadow-2xl overflow-hidden select-none" style={{ width: w, aspectRatio: "1023 / 1537", boxShadow: `0 30px 60px -20px ${c}55, 0 10px 30px rgba(0,0,0,0.5)`, backgroundColor: "#0b0b12" }}>
      {coverUrl
        ? <img src={coverUrl} alt={`Portada ${p.format}`} className="w-full h-full object-cover" />
        : <BookCover id={p.id} color={p.color} format={p.format} cert={p.cert} priority />}
      <span className="absolute left-0 top-0 bottom-0 w-2.5 pointer-events-none" style={{ background: "rgba(0,0,0,0.16)", boxShadow: "inset -2px 0 4px rgba(0,0,0,0.28)" }} />
    </div>
  );
}

export default function Libro() {
  const [, params] = useRoute("/libro/:id");
  const [, setLocation] = useLocation();
  const cart = useCart();
  const id = params?.id ?? "";
  const p = getProduct(id);
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

  if (!p || !p.available) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
        <Layers className="w-10 h-10 mb-4" style={{ color: `${C.ink}33` }} />
        <h1 className="text-2xl" style={{ fontFamily: D, fontWeight: 700 }}>Este libro aún no está disponible</h1>
        <p className="mt-2" style={{ color: C.inkSoft }}>Vuelve a la tienda para ver las colecciones disponibles.</p>
        <button onClick={() => setLocation("/colecciones")} className="mt-6 px-6 h-11 rounded-full text-sm text-white" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Ir a la tienda</button>
      </div>
    );
  }

  const m = metaFor(p);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);   // índice colapsable (no romper la visual)
  const owned = ownsBook(p.id);
  const [userReviews, setUserReviews] = useState<UserReview[]>(() => getReviews(p.id));
  const inCart = cart.items.some(i => i.id === p.id);
  const siblings = productsForCert(p.cert).filter(x => x.id !== p.id);

  // FICHA REAL del engine: si el libro está publicado (o preview del estudio con ?preview=1),
  // override sobre el mock — portada, sinopsis, "acerca de", índice, muestras, precio, categorías.
  const [store, setStore] = useState<NonNullable<EngineStorefront["view"]> | null>(null);
  useEffect(() => {
    let alive = true;
    const preview = new URLSearchParams(window.location.search).get("preview") === "1";
    fetchStorefront(p.cert, slug(p.format), preview)
      .then(r => { if (alive) setStore(r.view ?? null); })
      .catch(() => { if (alive) setStore(null); });
    return () => { alive = false; };
  }, [p.id, p.cert, p.format]);
  const rf = store?.ficha;
  const bustV = rf?.updatedAt ? `?v=${encodeURIComponent(rf.updatedAt)}` : "";
  const eLong = rf?.synopsis?.trim() || m.long;
  const eBullets = rf && rf.about.length ? rf.about : m.bullets;
  const eToc = rf && rf.toc.trim() ? rf.toc.split("\n").map(s => s.replace(/^\s+/, "")).filter(Boolean) : m.toc;
  const ePrice = store && parseFloat(store.price) > 0 ? parseFloat(store.price) : p.price;
  const eCover = store?.cover ? store.cover + bustV : null;
  const eSamples = rf && rf.samples.length ? rf.samples.map(u => u + bustV) : null;
  const eTag = rf && rf.categories.length ? rf.categories.slice(0, 3).join(" · ") : p.tag;
  const eCertTitle = store?.certTitle || p.certTitle;   // nombre del cert: fuente de verdad = engine (certifications.ts); fallback estático de catalog.ts
  const ePages = rf?.pages ?? m.pages;                    // páginas REALES del libro (persistidas al ensamblar); fallback al estático de catalog.ts

  // Catálogo real de la cert (precio + estado publicado por libro) → hermanos/colección.
  const [catalog, setCatalog] = useState<Record<string, { price: string; published: boolean }>>({});
  useEffect(() => {
    let alive = true;
    fetchStorefrontCatalog(p.cert).then(r => {
      if (!alive) return;
      const map: Record<string, { price: string; published: boolean }> = {};
      r.items.forEach(it => { map[it.bookId] = { price: it.price, published: it.published }; });
      setCatalog(map);
    }).catch(() => { /* offline → mock */ });
    return () => { alive = false; };
  }, [p.cert]);
  // El Collection Pack solo se puede activar/comprar cuando los SEIS libros están publicados.
  const SIX_FORMATS = ["visual-atlas", "master-book", "exam-traps", "question-bank", "cheat-sheets", "rapid-review"];
  const packAvailable = SIX_FORMATS.every(id => catalog[id]?.published);
  /** Precio real + disponibilidad de un hermano. */
  const sibInfo = (s: Product) => {
    if (s.pack) return { price: s.price, available: packAvailable };
    const it = catalog[slug(s.format)];
    const price = it && parseFloat(it.price) > 0 ? parseFloat(it.price) : s.price;
    return { price, available: it ? it.published : s.available };
  };

  // Compra del producto principal con el precio REAL (no el mock del catálogo).
  const itemName = p.pack ? `Collection Pack ${p.cert}` : p.format;
  const add = () => cart.add({ id: p.id, name: itemName, cert: p.cert, format: p.format, price: ePrice });
  const buyNow = () => { add(); cart.setOpen(true); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      <SamplePreview product={p} meta={m} images={eSamples} open={previewOpen} onClose={() => setPreviewOpen(false)} />

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

      {/* ── BREADCRUMB ── */}
      <div className="pt-20 pb-2">
        <div className="mx-auto max-w-[1180px] px-6 flex items-center gap-1.5 text-[12px] flex-wrap" style={{ color: C.inkSoft }}>
          <button onClick={() => setLocation("/colecciones")} className="hover:opacity-100" style={{ opacity: 0.8 }}>Colecciones</button>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <button onClick={() => setLocation(`/colecciones?cert=${p.cert}`)} className="hover:opacity-100" style={{ opacity: 0.8 }}>{p.cert} · {eCertTitle}</button>
          <ChevronRight className="w-3 h-3 opacity-50" />
          <span style={{ color: C.ink }}>{p.format}</span>
        </div>
      </div>

      {/* ── DETALLE ── */}
      <section className="pb-16">
        <div className="mx-auto max-w-[1180px] px-6 grid lg:grid-cols-[300px_1fr_300px] gap-8 lg:gap-10">
          {/* col 1: portada */}
          <div className="lg:sticky lg:top-24 self-start flex flex-col items-center">
            <motion.div initial={{ opacity: 0, y: 20, rotateY: -12 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} style={{ perspective: 1000 }}>
              <Cover p={p} w={264} coverUrl={eCover} />
            </motion.div>
            <button onClick={() => setPreviewOpen(true)} className="group mt-5 inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${m.color}66`, color: C.ink, fontFamily: D, fontWeight: 600 }}>
              <Eye className="w-4 h-4" style={{ color: m.color }} /> Echa un vistazo
            </button>
            <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: C.inkSoft }}>
              <Download className="w-3.5 h-3.5" style={{ color: C.teal }} /> Acceso digital · {ePages} págs.
            </div>
          </div>

          {/* col 2: info */}
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: m.color }}>{eTag}</span>
            <h1 className="mt-1.5 tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4vw,3rem)", lineHeight: 1.04 }}>{p.format}</h1>
            <p className="mt-2 text-[15px]" style={{ color: C.inkSoft }}>
              {p.cert} · {eCertTitle} · <span style={{ color: C.bright }}>CloudBooks Editorial</span>
            </p>

            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <Stars value={m.rating} />
              <span className="text-sm" style={{ fontFamily: D, fontWeight: 700, color: C.gold }}>{m.rating.toFixed(1)}</span>
              <a href="#opiniones" className="text-sm hover:opacity-100 transition-opacity" style={{ color: C.bright, opacity: 0.85 }}>{MOCK_OPINIONES + userReviews.length} opiniones</a>
              <span className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.teal}16`, color: C.teal }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: C.teal }} /> Disponible</span>
            </div>

            <p className="mt-6 text-[16px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(243,243,246,0.82)" }}>{eLong}</p>

            {/* acerca de */}
            <div className="mt-8">
              <h2 className="text-lg mb-3 flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><BookOpen className="w-4 h-4" style={{ color: m.color }} /> Acerca de este libro</h2>
              <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {eBullets.map(b => (
                  <li key={b} className="flex items-start gap-2.5 text-[14px]" style={{ color: C.inkSoft }}>
                    <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: m.color }} /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* contenido */}
            <div className="mt-8">
              <h2 className="text-lg mb-3" style={{ fontFamily: D, fontWeight: 700 }}>{p.pack ? "Qué incluye" : "Contenido"} {eToc.length > 0 && <span className="text-[13px]" style={{ color: `${C.ink}55`, fontWeight: 400 }}>· {eToc.length} entradas</span>}</h2>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.ink}14` }}>
                {(tocOpen ? eToc : eToc.slice(0, 8)).map((t, i) => (
                  <div key={t} className="flex items-center gap-3 px-4 py-3 text-[14px]" style={{ borderTop: i ? `1px solid ${C.ink}0f` : "none", color: "rgba(243,243,246,0.85)" }}>
                    <span className="font-mono text-[12px] w-6 shrink-0" style={{ color: `${C.ink}55` }}>{String(i + 1).padStart(2, "0")}</span>
                    {t}
                  </div>
                ))}
                {!tocOpen && eToc.length > 8 && <div className="h-8" style={{ background: `linear-gradient(to bottom, transparent, ${C.bg})`, marginTop: -32, position: "relative", pointerEvents: "none" }} />}
              </div>
              {eToc.length > 8 && (
                <button onClick={() => setTocOpen(o => !o)} className="mt-2 inline-flex items-center gap-1.5 text-[13px] px-3 h-8 rounded-full transition-colors hover:bg-white/5" style={{ border: `1px solid ${C.ink}1f`, color: C.bright }}>
                  {tocOpen ? <>Ver menos <ChevronUp className="w-3.5 h-3.5" /></> : <>Ver las {eToc.length} entradas <ChevronDown className="w-3.5 h-3.5" /></>}
                </button>
              )}
            </div>

            {/* otros formatos de la colección */}
            <div className="mt-8">
              <h2 className="text-lg mb-3" style={{ fontFamily: D, fontWeight: 700 }}>Disponible también como</h2>
              <div className="flex flex-wrap gap-2">
                {siblings.map(s => {
                  const info = sibInfo(s);
                  if (!info.available) return (
                    <span key={s.id} className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3.5 h-9 cursor-not-allowed" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, opacity: 0.5 }} title="Próximamente">
                      <span className="w-1.5 h-5 rounded-full" style={{ background: `${C.ink}40` }} />
                      <span className="text-[13px]" style={{ fontFamily: D, fontWeight: 600, color: C.inkSoft }}>{s.format}</span>
                      <span className="text-[11px] uppercase tracking-wider" style={{ color: `${C.ink}55` }}>Próximamente</span>
                    </span>
                  );
                  return (
                    <button key={s.id} onClick={() => { setLocation(`/libro/${s.id}`); window.scrollTo(0, 0); }} className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3.5 h-9 transition-all hover:brightness-110" style={{ backgroundColor: C.card, border: `1px solid ${s.color}40` }}>
                      <span className="w-1.5 h-5 rounded-full" style={{ background: s.color }} />
                      <span className="text-[13px]" style={{ fontFamily: D, fontWeight: 600 }}>{s.format}</span>
                      <span className="text-[12px]" style={{ color: C.inkSoft }}>${info.price.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* col 3: caja de compra */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="rounded-2xl p-5" style={{ background: p.pack ? `linear-gradient(160deg, ${m.color}16, ${C.card})` : C.card, border: `1px solid ${p.pack ? m.color : `${C.ink}1f`}` }}>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm" style={{ color: C.inkSoft }}>USD</span>
                <span style={{ fontFamily: D, fontWeight: 700, fontSize: "2.6rem", color: p.pack ? m.color : C.ink }}>{ePrice.toFixed(2)}</span>
              </div>
              {p.pack
                ? <p className="text-[12px] mb-1" style={{ color: C.green }}>Ahorras frente a comprar los 6 por separado</p>
                : <p className="text-[12px] mb-1" style={{ color: C.inkSoft }}>o llévate los 6 formatos por USD 19.99</p>}
              {/* Las ventas no están abiertas: no se promete entrega, se promete aviso. */}
              <div className="flex items-center gap-2 text-[13px] mt-2 mb-4" style={{ color: C.teal }}>
                <Zap className="w-4 h-4" /> Reservá y te avisamos al abrir las ventas
              </div>

              {p.pack && !packAvailable ? (
                <div className="w-full h-12 rounded-full text-sm flex items-center justify-center gap-2" style={{ backgroundColor: C.card, color: C.inkSoft, border: `1px dashed ${C.ink}33`, fontFamily: D, fontWeight: 700 }}>
                  <Lock className="w-4 h-4" /> Próximamente · faltan libros por publicar
                </div>
              ) : owned ? (
                <>
                  <div className="w-full h-12 rounded-full text-sm flex items-center justify-center gap-2" style={{ backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 700 }}>
                    <Check className="w-4 h-4" /> Ya en tu biblioteca
                  </div>
                  <button onClick={() => setLocation("/mi-biblioteca")} className="mt-2.5 w-full h-12 rounded-full text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>
                    <BookOpen className="w-4 h-4" /> Ir a Mi biblioteca
                  </button>
                </>
              ) : (
                <>
                  <button onClick={add} disabled={inCart} className="w-full h-12 rounded-full text-sm flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:cursor-default"
                    style={inCart ? { backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 700 } : { backgroundColor: C.gold, color: "#0d1629", fontFamily: D, fontWeight: 700 }}>
                    {inCart ? <><Check className="w-4 h-4" /> En el carrito</> : <><Plus className="w-4 h-4" /> Añadir al carrito</>}
                  </button>
                  <button onClick={buyNow} className="mt-2.5 w-full h-12 rounded-full text-sm text-white flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>
                    Comprar ahora
                  </button>
                </>
              )}

              <div className="mt-5 pt-4 flex flex-col gap-2.5 text-[12.5px]" style={{ borderTop: `1px solid ${C.ink}14`, color: C.inkSoft }}>
                <span className="flex items-center gap-2.5"><Download className="w-4 h-4 shrink-0" style={{ color: C.bright }} /> Formato digital en {ePages} páginas</span>
                <span className="flex items-center gap-2.5"><RefreshCw className="w-4 h-4 shrink-0" style={{ color: C.bright }} /> Actualizaciones gratis mientras la certificación esté vigente</span>
                <span className="flex items-center gap-2.5"><BookOpen className="w-4 h-4 shrink-0" style={{ color: C.bright }} /> Contenido en español (LATAM)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── OPINIONES ── */}
      <section id="opiniones" className="py-14" style={{ borderTop: `1px solid ${C.ink}14`, backgroundColor: C.bgAlt }}>
        <div className="mx-auto max-w-[1180px] px-6">
          <h2 className="text-2xl mb-8" style={{ fontFamily: D, fontWeight: 700 }}>Opiniones de lectores</h2>
          <div className="grid lg:grid-cols-[280px_1fr] gap-10">
            {/* resumen */}
            <div className="lg:sticky lg:top-24 self-start">
              <div className="flex items-end gap-3">
                <span style={{ fontFamily: D, fontWeight: 700, fontSize: "3.2rem", lineHeight: 1 }}>{m.rating.toFixed(1)}</span>
                <div className="pb-1.5">
                  <Stars value={m.rating} size={18} />
                  <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>{MOCK_OPINIONES + userReviews.length} opiniones</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-1.5">
                {RATING_DIST.map((pct, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-[12px]">
                    <span className="w-7 shrink-0" style={{ color: C.inkSoft }}>{5 - i}★</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${C.ink}12` }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.gold }} />
                    </div>
                    <span className="w-8 text-right shrink-0" style={{ color: C.inkSoft }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            {/* escribir opinión (gated por compra) + lista */}
            <div className="flex flex-col gap-7">
              <WriteReview product={p} owned={owned} onSubmit={r => setUserReviews(prev => [r, ...prev])} onGoStore={() => setLocation("/colecciones")} />
              {userReviews.map(r => (
                <ReviewItem key={r.id} reviewId={r.id} baseHelpful={0} name={r.name} initials={initialsOf(r.name)} color={C.violet} stars={r.rating} title={r.title} body={r.body} date={fmtReviewDate(r.date)} mine />
              ))}
              {REVIEWS.map((r, i) => (
                <ReviewItem key={r.name} reviewId={`demo-${i}`} baseHelpful={r.helpful} name={r.name} initials={r.initials} color={r.color} stars={r.stars} title={r.title} body={r.body} date={r.date} last={i === REVIEWS.length - 1} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLETA LA COLECCIÓN ── */}
      <section className="py-14">
        <div className="mx-auto max-w-[1180px] px-6">
          <h2 className="text-2xl mb-6" style={{ fontFamily: D, fontWeight: 700 }}>Completa la colección {p.cert}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {siblings.map(s => {
              const added = cart.items.some(i => i.id === s.id);
              const info = sibInfo(s);
              return (
                <div key={s.id} className="rounded-2xl p-5 flex flex-col transition-all" style={{ backgroundColor: C.card, border: `1px solid ${s.pack && info.available ? s.color : `${C.ink}14`}`, opacity: info.available ? 1 : 0.55 }}>
                  <button onClick={() => { if (!info.available) return; setLocation(`/libro/${s.id}`); window.scrollTo(0, 0); }} disabled={!info.available} className="text-left disabled:cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ fontFamily: D, fontWeight: 700, backgroundColor: `${C.ink}0f`, border: `1px solid ${C.ink}14` }}>{s.cert}</span>
                      {!info.available ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ fontFamily: D, backgroundColor: `${C.ink}12`, color: C.inkSoft }}>Próximamente</span>
                        : s.pack ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: D, backgroundColor: `${s.color}24`, color: s.color }}>MEJOR VALOR</span>
                        : <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: s.color }}>{s.tag}</span>}
                    </div>
                    <h3 className="text-lg leading-tight" style={{ fontFamily: D, fontWeight: 700 }}>{s.format}</h3>
                    <p className="text-[13px] mt-1 leading-relaxed" style={{ color: C.inkSoft }}>{s.blurb}</p>
                  </button>
                  <div className="mt-4 flex items-center justify-between gap-2">
                    {info.available ? (
                      <>
                        <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.4rem", color: s.pack ? s.color : C.ink }}>${info.price.toFixed(2)}</span>
                        <button onClick={() => cart.add({ id: s.id, name: s.pack ? `Collection Pack ${s.cert}` : s.format, cert: s.cert, format: s.format, price: info.price })} disabled={added}
                          className="h-9 px-4 rounded-full text-sm inline-flex items-center gap-1.5 transition-all hover:brightness-110 disabled:cursor-default"
                          style={added ? { backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 600 } : { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>
                          {added ? <><Check className="w-3.5 h-3.5" /> Añadido</> : <><Plus className="w-3.5 h-3.5" /> Añadir</>}
                        </button>
                      </>
                    ) : (
                      <span className="text-[13px]" style={{ color: C.inkSoft }}>Aún no disponible</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   VISOR "ECHA UN VISTAZO" — modal de doble página con lomo, miniaturas y teclado.
   Páginas de muestra generadas como demo (papel crema + marca de agua). // TODO_REAL
   ════════════════════════════════════════════════════════════════════════════ */
const PAPER = "#f7f5ef", PINK = "#23232b", PSOFT = "#6b6b73", PLINE = "#e2dfd5";

interface SPage { kind: "title" | "toc" | "content" | "visual"; title?: string; idx?: number; }

function buildSamplePages(p: Product, m: { toc: string[] }): SPage[] {
  const visual = /atlas|visual/i.test(p.format);
  const toc = (m.toc || []).filter(Boolean);
  const pages: SPage[] = [{ kind: "title" }, { kind: "toc" }];
  toc.slice(0, 5).forEach((t, i) => pages.push({ kind: visual ? "visual" : "content", title: t, idx: i }));
  return pages.slice(0, 8);
}

function FauxText({ lines }: { lines: number }) {
  const w = ["100%", "96%", "90%", "98%", "84%", "93%", "88%", "95%"];
  return <div className="flex flex-col gap-2 w-full">{Array.from({ length: lines }).map((_, i) => <div key={i} className="h-2 rounded" style={{ background: PLINE, width: w[i % w.length] }} />)}</div>;
}

function SamplePageBody({ page, p, m }: { page: SPage; p: Product; m: { toc: string[] } }) {
  const accent = p.color;
  return (
    <div className="relative w-full h-full" style={{ color: PINK }}>
      {/* marca de agua */}
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" style={{ transform: "rotate(-28deg)" }}>
        <span style={{ fontFamily: D, fontWeight: 700, fontSize: "2.6rem", letterSpacing: "0.35em", color: "rgba(0,0,0,0.06)" }}>MUESTRA</span>
      </span>

      {page.kind === "title" && (
        <div className="h-full flex flex-col items-center justify-center text-center px-8">
          <span className="font-mono text-[11px] px-2 py-0.5 rounded mb-5" style={{ fontFamily: D, fontWeight: 700, color: accent, border: `1px solid ${accent}66` }}>{p.cert}</span>
          <h3 style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.4rem,3.5vw,2rem)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{p.format}</h3>
          <p className="mt-2 text-[13px]" style={{ color: PSOFT }}>{p.certTitle}</p>
          <div className="my-5 h-px w-16" style={{ background: accent }} />
          <span className="text-[12px] uppercase tracking-[0.2em]" style={{ color: PSOFT }}>CloudBooks Editorial</span>
          <span className="mt-1 text-[11px]" style={{ color: PSOFT }}>Edición 2026 · Español (LATAM)</span>
        </div>
      )}

      {page.kind === "toc" && (
        <div className="h-full flex flex-col px-8 py-9">
          <h4 className="mb-5" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.3rem" }}>Índice</h4>
          <ol className="flex flex-col gap-3">
            {m.toc.slice(0, 8).map((t, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[13px]">
                <span className="font-mono shrink-0" style={{ color: accent, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</span>
                <span className="truncate" style={{ color: PINK }}>{t}</span>
                <span className="flex-1 border-b border-dotted self-end mb-1" style={{ borderColor: "#cfccc2" }} />
                <span className="font-mono shrink-0" style={{ color: PSOFT }}>{(i + 1) * 12}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {page.kind === "content" && (
        <div className="h-full flex flex-col px-8 py-9 gap-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>Capítulo {(page.idx ?? 0) + 1}</span>
          <h4 style={{ fontFamily: D, fontWeight: 700, fontSize: "1.15rem", lineHeight: 1.15 }}>{page.title}</h4>
          <FauxText lines={5} />
          <div className="rounded-lg p-3" style={{ background: `${accent}14`, borderLeft: `3px solid ${accent}` }}>
            <p className="text-[11px] font-bold mb-1.5" style={{ color: accent }}>NOTA DE EXAMEN</p>
            <FauxText lines={2} />
          </div>
          <FauxText lines={4} />
        </div>
      )}

      {page.kind === "visual" && (
        <div className="h-full flex flex-col px-8 py-9 gap-5">
          <h4 style={{ fontFamily: D, fontWeight: 700, fontSize: "1.15rem" }}>{page.title}</h4>
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-2">
                <div className="rounded-lg px-3 py-4 text-[10px] text-center" style={{ border: `1.5px solid ${accent}`, color: accent, minWidth: 60, fontWeight: 700 }}>·····</div>
                {i < 2 && <div className="w-5 h-px" style={{ background: accent }} />}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2">
            {[0, 1].map(i => <div key={i} className="rounded-lg px-3 py-3 text-[10px]" style={{ background: `${accent}14`, color: PSOFT, minWidth: 80 }}>—— ——</div>)}
          </div>
          <FauxText lines={3} />
        </div>
      )}
    </div>
  );
}

function SamplePreview({ product: p, meta: m, images, open, onClose }: { product: Product; meta: { toc: string[]; color: string; pages: number }; images?: string[] | null; open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [twoUp, setTwoUp] = useState(true);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);   // capa de zoom (imagen real ampliada)
  const [zk, setZk] = useState(1.4);
  const [zpan, setZpan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const real = images && images.length ? images : null;   // muestras REALES (láminas PNG) si el libro está publicado
  const pages: SPage[] = real ? real.map(() => ({ kind: "visual" })) : buildSamplePages(p, m);
  const len = pages.length;
  const step = twoUp ? 2 : 1;
  const openZoom = (url: string) => { setZoomUrl(url); setZk(1.4); setZpan({ x: 0, y: 0 }); };

  useEffect(() => {
    const f = () => setTwoUp(window.innerWidth >= 860);
    f(); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f);
  }, []);
  useEffect(() => { setIndex(0); }, [open, p.id]);

  const go = (dir: number) => setIndex(i => Math.max(0, Math.min(len - 1, i + dir * step)));
  const atEnd = index + step >= len;

  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIndex(i => Math.min(len - 1, i + (window.innerWidth >= 860 ? 2 : 1)));
      else if (e.key === "ArrowLeft") setIndex(i => Math.max(0, i - (window.innerWidth >= 860 ? 2 : 1)));
    };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, [open, len, onClose]);

  const visible = twoUp ? [pages[index], pages[index + 1]].filter(Boolean) : [pages[index]];
  const counter = twoUp ? `Páginas ${index + 1}–${Math.min(index + 2, len)} de ${len}` : `Página ${index + 1} de ${len}`;
  const isVisible = (j: number) => twoUp ? (j === index || j === index + 1) : j === index;

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex flex-col" style={{ backgroundColor: "rgba(6,6,10,0.93)", backdropFilter: "blur(6px)" }} onClick={onClose}>
          {/* cabecera */}
          <div className="flex items-center justify-between px-5 h-14 shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-sm" style={{ color: C.ink }}>
              <Eye className="w-4 h-4" style={{ color: p.color }} />
              <span style={{ fontFamily: D, fontWeight: 700 }}>{p.format}</span>
              <span className="hidden sm:inline" style={{ color: C.inkSoft }}>· vista de muestra</span>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}><X className="w-4 h-4" /></button>
          </div>

          {/* spread */}
          <div className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-2 min-h-0" onClick={e => e.stopPropagation()}>
            <button onClick={() => go(-1)} disabled={index === 0} aria-label="Anterior" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-25 hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><ChevronLeft className="w-5 h-5" /></button>
            <AnimatePresence mode="wait">
              <motion.div key={index} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.22 }}
                className="flex items-stretch" style={{ height: "min(72vh, 620px)" }}>
                {visible.map((pg, k) => {
                  const left = twoUp && k === 0 && visible.length > 1;
                  const right = twoUp && k === 1;
                  return (
                    <div key={k} className="relative overflow-hidden" style={{
                      aspectRatio: "3 / 4", height: "100%", background: PAPER,
                      borderRadius: twoUp ? (left ? "6px 2px 2px 6px" : "2px 6px 6px 2px") : "6px",
                      boxShadow: left ? "inset -16px 0 22px -16px rgba(0,0,0,0.3), 0 20px 50px -20px rgba(0,0,0,0.6)"
                        : right ? "inset 16px 0 22px -16px rgba(0,0,0,0.3), 0 20px 50px -20px rgba(0,0,0,0.6)"
                        : "0 20px 50px -20px rgba(0,0,0,0.6)",
                    }}>
                      {real
                        ? <img src={real[index + k]} alt={`Muestra ${index + k + 1}`} onClick={() => openZoom(real[index + k])} className="w-full h-full object-contain cursor-zoom-in" style={{ background: "#0b0b12" }} title="Click para ampliar" />
                        : <SamplePageBody page={pg} p={p} m={m} />}
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
            <button onClick={() => go(1)} disabled={atEnd} aria-label="Siguiente" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-25 hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><ChevronRight className="w-5 h-5" /></button>
          </div>

          {/* miniaturas + contador */}
          <div className="shrink-0 px-5 py-3 flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              {pages.map((_, j) => (
                <button key={j} onClick={() => setIndex(twoUp ? j - (j % 2) : j)} aria-label={`Página ${j + 1}`}
                  className="w-7 h-9 rounded flex items-center justify-center text-[10px] transition-all"
                  style={isVisible(j) ? { background: PAPER, color: PINK, fontWeight: 700, border: `1px solid ${p.color}` } : { background: C.card, color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{j + 1}</button>
              ))}
            </div>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>{counter}{real ? "" : " · marca de agua en todas las páginas"} · click en la página para ampliar</p>
          </div>

          {/* ── capa de ZOOM ── */}
          {zoomUrl && (
            <div className="absolute inset-0 z-[130] flex items-center justify-center overflow-hidden" style={{ backgroundColor: "rgba(4,4,8,0.96)" }}
              onClick={e => { e.stopPropagation(); setZoomUrl(null); }}
              onWheel={e => { const nk = Math.min(4, Math.max(1, zk + (e.deltaY < 0 ? 0.2 : -0.2))); setZk(nk); if (nk === 1) setZpan({ x: 0, y: 0 }); }}
              onPointerDown={e => { dragRef.current = { x: e.clientX, y: e.clientY, px: zpan.x, py: zpan.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onPointerMove={e => { if (!dragRef.current || zk <= 1) return; setZpan({ x: dragRef.current.px + (e.clientX - dragRef.current.x), y: dragRef.current.py + (e.clientY - dragRef.current.y) }); }}
              onPointerUp={() => { dragRef.current = null; }}>
              <img src={zoomUrl} alt="Zoom" draggable={false} onClick={e => e.stopPropagation()}
                className="select-none" style={{ maxHeight: "92vh", maxWidth: "94vw", objectFit: "contain", transform: `translate(${zpan.x}px, ${zpan.y}px) scale(${zk})`, cursor: zk > 1 ? "grab" : "zoom-in", transition: dragRef.current ? "none" : "transform 0.12s" }} />
              {/* controles */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => { const nk = Math.max(1, zk - 0.3); setZk(nk); if (nk === 1) setZpan({ x: 0, y: 0 }); }} aria-label="Alejar" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: `1px solid ${C.ink}33`, color: C.ink, background: "rgba(0,0,0,0.4)" }}>−</button>
                <span className="text-[12px] tabular-nums w-12 text-center" style={{ color: C.inkSoft }}>{Math.round(zk * 100)}%</span>
                <button onClick={() => setZk(k => Math.min(4, k + 0.3))} aria-label="Acercar" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ border: `1px solid ${C.ink}33`, color: C.ink, background: "rgba(0,0,0,0.4)" }}>+</button>
              </div>
              <button onClick={e => { e.stopPropagation(); setZoomUrl(null); }} aria-label="Cerrar zoom" className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ border: `1px solid ${C.ink}33`, color: C.ink, background: "rgba(0,0,0,0.4)" }}><X className="w-4 h-4" /></button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   OPINIONES — escribir (solo compra verificada) + render de cada reseña.
   ════════════════════════════════════════════════════════════════════════════ */
const initialsOf = (n: string) => (n.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "TÚ");
function fmtReviewDate(iso: string) { try { return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } }

function ReviewItem({ reviewId, baseHelpful = 0, name, initials, color, stars, title, body, date, mine, last }: { reviewId: string; baseHelpful?: number; name: string; initials: string; color: string; stars: number; title: string; body: string; date: string; mine?: boolean; last?: boolean }) {
  const [voted, setVoted] = useState(() => hasVotedHelpful(reviewId));
  const count = baseHelpful + (voted ? 1 : 0);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }}
      className="pb-7" style={{ borderBottom: last ? "none" : `1px solid ${C.ink}12` }}>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: color }}>{initials}</span>
        <div>
          <p className="text-[14px] flex items-center gap-2" style={{ fontFamily: D, fontWeight: 600 }}>
            {name}{mine && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${C.violet}1f`, color: C.bright }}>Tú</span>}
          </p>
          <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: C.teal }}><Check className="w-3 h-3" /> Compra verificada</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <Stars value={stars} size={13} />
        <span className="text-[14px]" style={{ fontFamily: D, fontWeight: 700 }}>{title}</span>
      </div>
      <p className="text-[12px] mb-2" style={{ color: `${C.ink}55` }}>{date}</p>
      <p className="text-[14.5px] leading-relaxed max-w-2xl" style={{ color: "rgba(243,243,246,0.82)" }}>{body}</p>
      <div className="mt-3 flex items-center gap-3">
        <button onClick={() => setVoted(toggleHelpful(reviewId))} aria-pressed={voted}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] transition-all hover:brightness-110"
          style={voted ? { backgroundColor: `${C.teal}1f`, color: C.teal, border: `1px solid ${C.teal}55` } : { border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
          <ThumbsUp className="w-3.5 h-3.5" /> Útil{count > 0 ? ` · ${count}` : ""}
        </button>
        {count > 0 && <span className="text-[12px]" style={{ color: `${C.ink}55` }}>{count} {count === 1 ? "persona lo encontró útil" : "personas lo encontraron útil"}</span>}
      </div>
    </motion.div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = (hover || value) >= n;
        return (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} aria-label={`${n} estrella${n > 1 ? "s" : ""}`}>
            <Star className="w-6 h-6 transition-transform hover:scale-110" style={{ color: on ? C.gold : `${C.ink}30`, fill: on ? C.gold : "transparent" }} />
          </button>
        );
      })}
    </div>
  );
}

function WriteReview({ product, owned, onSubmit, onGoStore }: { product: Product; owned: boolean; onSubmit: (r: UserReview) => void; onGoStore: () => void }) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const TITLE_MAX = 80, BODY_MIN = 20, BODY_MAX = 600, NAME_MAX = 40;
  const valid = rating > 0 && body.trim().length >= BODY_MIN;
  const inputStyle: React.CSSProperties = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };

  // GATING: solo quien tiene el libro en su biblioteca (compra verificada) puede opinar
  if (!owned) {
    return (
      <div className="rounded-2xl p-6 flex flex-col items-center text-center gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <span className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: `${C.ink}0f` }}><Lock className="w-5 h-5" style={{ color: C.inkSoft }} /></span>
        <div>
          <p className="text-[15px]" style={{ fontFamily: D, fontWeight: 700 }}>Solo quienes compraron pueden opinar</p>
          <p className="text-[13px] mt-1 max-w-md mx-auto" style={{ color: C.inkSoft }}>Validamos tu compra antes de publicar la reseña. Así todas las opiniones son de <strong>compra verificada</strong>.</p>
        </div>
        <button onClick={onGoStore} className="mt-1 px-5 h-10 rounded-full text-sm text-white" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Comprar este libro</button>
      </div>
    );
  }
  if (done) {
    return (
      <div className="rounded-2xl p-5 flex items-center gap-3" style={{ background: `${C.green}10`, border: `1px solid ${C.green}40` }}>
        <Check className="w-5 h-5 shrink-0" style={{ color: C.green }} />
        <p className="text-[14px]" style={{ color: C.green }}>¡Gracias! Tu opinión se publicó como <strong>compra verificada</strong>.</p>
      </div>
    );
  }
  const submit = () => {
    if (!valid) return;
    const r = addReview({ productId: product.id, name: name.trim() || "Lector verificado", rating, title: title.trim() || "Mi opinión", body: body.trim() });
    onSubmit(r); setDone(true);
  };
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h3 className="text-[16px]" style={{ fontFamily: D, fontWeight: 700 }}>Escribe tu opinión</h3>
        <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ backgroundColor: `${C.teal}16`, color: C.teal }}><Check className="w-3 h-3" /> Compra verificada</span>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px]" style={{ color: C.inkSoft }}>Tu valoración</span>
          <StarInput value={rating} onChange={setRating} />
        </div>
        <div>
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={TITLE_MAX} placeholder="Título (opcional)" className="w-full h-11 rounded-lg px-3.5 text-sm focus:outline-none placeholder:opacity-50" style={inputStyle} />
          <p className="mt-1 text-right text-[11px]" style={{ color: `${C.ink}40` }}>{title.length}/{TITLE_MAX}</p>
        </div>
        <div>
          <textarea value={body} onChange={e => setBody(e.target.value)} maxLength={BODY_MAX} rows={4} placeholder="Cuéntanos qué te pareció el libro y a quién se lo recomendarías…" className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none placeholder:opacity-50 resize-y" style={inputStyle} />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span style={{ color: C.gold }}>{body.trim().length < BODY_MIN ? `Mínimo ${BODY_MIN} caracteres` : ""}</span>
            <span style={{ color: body.length > BODY_MAX - 50 ? C.gold : `${C.ink}40` }}>{body.length}/{BODY_MAX}</span>
          </div>
        </div>
        <div>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={NAME_MAX} placeholder="Tu nombre (opcional)" className="w-full h-11 rounded-lg px-3.5 text-sm focus:outline-none placeholder:opacity-50" style={inputStyle} />
          <p className="mt-1 text-right text-[11px]" style={{ color: `${C.ink}40` }}>{name.length}/{NAME_MAX}</p>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[12px]" style={{ color: valid ? C.inkSoft : `${C.ink}55` }}>{rating === 0 ? "Elige una valoración" : body.trim().length < BODY_MIN ? `Tu opinión necesita al menos ${BODY_MIN} caracteres` : "Listo para publicar"}</span>
          <button onClick={submit} disabled={!valid} className="h-11 px-5 rounded-full text-sm inline-flex items-center gap-2 text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>
            <Send className="w-4 h-4" /> Publicar opinión
          </button>
        </div>
      </div>
    </div>
  );
}
