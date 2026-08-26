import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Globe, ShoppingCart, Check, Clock, Plus, Search, X, Layers, ChevronDown, ChevronLeft, ChevronRight, Star, BookOpen, Cloud, SlidersHorizontal, Bell, Sparkles, CheckCircle2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { CERTS, PRODUCTS, FORMAT_CHIPS, formatDef, slug, type Product } from "@/lib/catalog";
import { getLibrary } from "@/lib/library";
import { fetchStorefrontCatalog } from "@/lib/engine-api";
import { BookCover } from "@/components/book-cover";

/* ════════════════════════════════════════════════════════════════════════════
   COLECCIONES — librería: pestañas de proveedor + sidebar de filtros facetados
   (izquierda) + grilla paginada (12/pág). Carrito real + ficha + "En tu biblioteca".
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", cardHi: "#1b1b25", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", bright: "#c4b5fd", gold: "#fbbf24", green: "#34d399",
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const PAGE_SIZE = 12;

const PROVIDERS = [
  { id: "azure", name: "Microsoft Azure", short: "Azure", color: "#3b82f6", active: true },
  { id: "aws", name: "Amazon Web Services", short: "AWS", color: "#ff9900", active: false },
  { id: "gcp", name: "Google Cloud", short: "GCP", color: "#4285F4", active: false },
];

const AVAIL_OPTS = [{ key: "disp", label: "Disponibles" }, { key: "prox", label: "Próximamente" }];
const PRICE_OPTS = [{ key: "f", label: "Formato · USD 5.99" }, { key: "p", label: "Pack · USD 19.99" }];
const SORTS = [
  { key: "destacados", label: "Destacados" },
  { key: "precio-asc", label: "Precio: menor a mayor" },
  { key: "precio-desc", label: "Precio: mayor a menor" },
  { key: "nombre", label: "Nombre (A–Z)" },
];

/* lectura de filtros desde la URL (deep-link) */
const readSP = () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams());
const readParam = (k: string) => readSP().get(k) ?? "";
const readSet = (k: string): Set<string> => { const v = readSP().get(k); return v ? new Set(v.split(",").filter(Boolean)) : new Set(); };

export default function Colecciones() {
  const [, setLocation] = useLocation();
  const cart = useCart();
  const [provider, setProvider] = useState(() => readParam("p") || "azure");
  const [q, setQ] = useState(() => readParam("q"));
  const [availSel, setAvailSel] = useState<Set<string>>(() => readSet("avail"));
  const [certSel, setCertSel] = useState<Set<string>>(() => readSet("cert"));
  const [fmtSel, setFmtSel] = useState<Set<string>>(() => readSet("fmt"));
  const [priceSel, setPriceSel] = useState<Set<string>>(() => readSet("price"));
  const [sort, setSort] = useState(() => readParam("sort") || "destacados");
  const [page, setPage] = useState(() => Math.max(1, parseInt(readParam("page"), 10) || 1));
  const [showFilters, setShowFilters] = useState(false);

  const owned = useMemo(() => new Set(getLibrary().map(b => b.id)), []);
  const inCart = (id: string) => cart.items.some(i => i.id === id);

  // Estado REAL del engine por cert disponible (precio/publicado/portada por libro) → overlay sobre el mock.
  const SIX_FORMATS = ["visual-atlas", "master-book", "exam-traps", "question-bank", "cheat-sheets", "rapid-review"];
  const [real, setReal] = useState<Record<string, Record<string, { price: string; published: boolean; cover: string | null }>>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(CERTS.filter(c => c.available).map(c =>
      fetchStorefrontCatalog(c.cert).then(r => [c.cert, Object.fromEntries(r.items.map(it => [it.bookId, { price: it.price, published: it.published, cover: it.cover }]))] as const).catch(() => null)
    )).then(rows => { if (!alive) return; const m: typeof real = {}; for (const row of rows) if (row) m[row[0]] = row[1]; setReal(m); });
    return () => { alive = false; };
  }, []);
  /** Precio real + disponibilidad + portada de un producto (overlay del engine; fallback al mock). */
  const prodInfo = (p: Product): { price: number; available: boolean; cover: string | null } => {
    const certReal = real[p.cert];
    if (p.pack) return { price: p.price, available: !!certReal && SIX_FORMATS.every(id => certReal[id]?.published), cover: null };
    const it = certReal?.[slug(p.format)];
    const price = it && parseFloat(it.price) > 0 ? parseFloat(it.price) : p.price;
    return { price, available: it ? it.published : p.available, cover: it?.cover ?? null };
  };

  const buy = (p: Product) => { const info = prodInfo(p); if (!info.available) return; cart.add({ id: p.id, name: p.pack ? `Collection Pack ${p.cert}` : p.format, cert: p.cert, format: p.format, price: info.price }); };
  const openBook = (p: Product) => { setLocation(`/libro/${p.id}`); window.scrollTo(0, 0); };
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";

  const providerActive = provider === "azure"; // solo Azure tiene catálogo hoy

  const filtered = useMemo(() => {
    if (!providerActive) return [];
    const needle = q.trim().toLowerCase();
    const out = PRODUCTS.filter(p => {
      if (availSel.size && !availSel.has(prodInfo(p).available ? "disp" : "prox")) return false;
      if (certSel.size && !certSel.has(p.cert)) return false;
      if (fmtSel.size && !fmtSel.has(p.format)) return false;
      if (priceSel.size && !priceSel.has(p.price < 10 ? "f" : "p")) return false;
      if (needle && !`${p.cert} ${p.certTitle} ${p.format} ${p.tag} ${p.domain}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    out.sort((a, b) => {
      if (sort === "precio-asc") return prodInfo(a).price - prodInfo(b).price;
      if (sort === "precio-desc") return prodInfo(b).price - prodInfo(a).price;
      if (sort === "nombre") return a.format.localeCompare(b.format);
      return Number(prodInfo(b).available) - Number(prodInfo(a).available) || Number(b.pack) - Number(a.pack); // destacados
    });
    return out;
  }, [providerActive, q, availSel, certSel, fmtSel, priceSel, sort, real]);

  const filterKey = JSON.stringify([provider, q, sort, [...availSel], [...certSel], [...fmtSel], [...priceSel]]);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; } // no resetear página en el deep-link inicial
    setPage(1);
  }, [filterKey]);

  // refleja el estado en la URL (deep-link / compartir)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (provider !== "azure") sp.set("p", provider);
    if (q.trim()) sp.set("q", q.trim());
    if (availSel.size) sp.set("avail", [...availSel].join(","));
    if (certSel.size) sp.set("cert", [...certSel].join(","));
    if (fmtSel.size) sp.set("fmt", [...fmtSel].join(","));
    if (priceSel.size) sp.set("price", [...priceSel].join(","));
    if (sort !== "destacados") sp.set("sort", sort);
    if (page > 1) sp.set("page", String(page));
    const qs = sp.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [provider, q, availSel, certSel, fmtSel, priceSel, sort, page]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const curPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (curPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(curPage * PAGE_SIZE, filtered.length);

  const activeCount = (q ? 1 : 0) + availSel.size + certSel.size + fmtSel.size + priceSel.size;
  const clear = () => { setQ(""); setAvailSel(new Set()); setCertSel(new Set()); setFmtSel(new Set()); setPriceSel(new Set()); };
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, k: string) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); setter(n); };

  // contadores contextuales: cuentan respetando los demás filtros activos (faceted search)
  const passExcept = (p: Product, except: string) => {
    if (except !== "avail" && availSel.size && !availSel.has(prodInfo(p).available ? "disp" : "prox")) return false;
    if (except !== "cert" && certSel.size && !certSel.has(p.cert)) return false;
    if (except !== "fmt" && fmtSel.size && !fmtSel.has(p.format)) return false;
    if (except !== "price" && priceSel.size && !priceSel.has(p.price < 10 ? "f" : "p")) return false;
    const needle = q.trim().toLowerCase();
    if (needle && !`${p.cert} ${p.certTitle} ${p.format} ${p.tag} ${p.domain}`.toLowerCase().includes(needle)) return false;
    return true;
  };
  const certCount = (cert: string) => PRODUCTS.filter(p => p.cert === cert && passExcept(p, "cert")).length;
  const fmtCount = (f: string) => PRODUCTS.filter(p => p.format === f && passExcept(p, "fmt")).length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{ color: C.inkSoft }}>
            {[["Nuestra Labor", "/nuestra-labor"], ["Empresas", "/empresas"], ["Demo", "/demo"], ["Colecciones", "/colecciones"]].map(([l, h]) => (
              <a key={l} href={h} className="transition-opacity hover:opacity-100" style={{ fontWeight: 500, opacity: h === "/colecciones" ? 1 : 0.85, color: h === "/colecciones" ? C.bright : undefined }}>{l}</a>
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
        <div className="relative mx-auto max-w-[1280px] px-6">
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.violet }}>La librería</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.05 }} className="tracking-[-0.04em] leading-[1.0]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.2rem,5.5vw,4rem)" }}>
            Colecciones por{" "}
            <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>certificación cloud</span><CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.teal} strokeWidth={3} />
          </motion.h1>
        </div>
      </section>

      {/* ── PESTAÑAS DE PROVEEDOR (primer filtro) ── */}
      <section className="sticky top-16 z-40 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.9)", borderBottom: `1px solid ${C.ink}14` }}>
        <div className="mx-auto max-w-[1280px] px-6 flex items-center gap-2 overflow-x-auto py-3" style={{ scrollbarWidth: "none" }}>
          <span className="font-mono text-[10px] uppercase tracking-wider shrink-0 mr-1" style={{ color: `${C.ink}66` }}>Proveedor</span>
          {PROVIDERS.map(pr => {
            const on = provider === pr.id;
            return (
              <button key={pr.id} onClick={() => setProvider(pr.id)} className="shrink-0 h-10 px-4 rounded-full text-sm inline-flex items-center gap-2 transition-all"
                style={on ? { backgroundColor: `${pr.color}1f`, border: `1px solid ${pr.color}`, color: "#fff", fontFamily: D, fontWeight: 700 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: pr.active ? C.inkSoft : `${C.ink}66`, fontWeight: 500 }}>
                <Cloud className="w-4 h-4" style={{ color: on ? pr.color : undefined }} /> {pr.short}
                {!pr.active && <span className="text-[10px] opacity-60">próx.</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── PRÓXIMOS PROVEEDORES (roadmap) ── */}
      <section className="pt-5">
        <div className="mx-auto max-w-[1280px] px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-4 py-3 text-[13px]" style={{ backgroundColor: C.card, border: `1px dashed ${C.ink}26`, color: C.inkSoft }}>
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] shrink-0" style={{ color: C.bright }}><Sparkles className="w-3.5 h-3.5" /> Roadmap</span>
            <span>Sumamos <strong style={{ color: C.ink, fontWeight: 600 }}>Oracle</strong>, <strong style={{ color: C.ink, fontWeight: 600 }}>Meta</strong> y <strong style={{ color: C.ink, fontWeight: 600 }}>Salesforce</strong> en</span>
            <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] shrink-0" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><Clock className="w-3.5 h-3.5" /> Q1 2028</span>
          </div>
        </div>
      </section>

      {/* ── CUERPO: sidebar + resultados ── */}
      <section className="py-8">
        <div className="mx-auto max-w-[1280px] px-6">
          {!providerActive ? (
            <ProviderComingSoon provider={PROVIDERS.find(p => p.id === provider)!} onAzure={() => setProvider("azure")} />
          ) : (
            <div className="grid lg:grid-cols-[256px_1fr] gap-8">
              {/* ── SIDEBAR FILTROS (izquierda) ── */}
              <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
                <div className="lg:sticky lg:top-36">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Filtros</span>
                    {activeCount > 0 && <button onClick={clear} className="text-[12px] inline-flex items-center gap-1" style={{ color: C.bright }}><X className="w-3 h-3" /> Limpiar ({activeCount})</button>}
                  </div>
                  {/* buscador */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
                    <input value={q} onChange={e => setQ(e.target.value)} type="search" aria-label="Buscar colecciones" placeholder="Buscar…" className="w-full h-10 rounded-lg pl-10 pr-9 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 transition-[box-shadow,border-color]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }} />
                    {q && <button onClick={() => setQ("")} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: C.inkSoft }}><X className="w-4 h-4" aria-hidden /></button>}
                  </div>

                  <Facet title="Disponibilidad">
                    {AVAIL_OPTS.map(o => <CheckRow key={o.key} checked={availSel.has(o.key)} onChange={() => toggle(availSel, setAvailSel, o.key)} label={o.label} />)}
                  </Facet>
                  <Facet title="Certificación" defaultOpen={certSel.size > 0}>
                    {CERTS.map(c => <CheckRow key={c.cert} checked={certSel.has(c.cert)} onChange={() => toggle(certSel, setCertSel, c.cert)} label={c.cert} sub={c.title} count={certCount(c.cert)} dim={!c.available} />)}
                  </Facet>
                  <Facet title="Formato" defaultOpen={fmtSel.size > 0}>
                    {FORMAT_CHIPS.map(f => <CheckRow key={f} checked={fmtSel.has(f)} onChange={() => toggle(fmtSel, setFmtSel, f)} label={f} count={fmtCount(f)} />)}
                  </Facet>
                  <Facet title="Precio" last defaultOpen={priceSel.size > 0}>
                    {PRICE_OPTS.map(o => <CheckRow key={o.key} checked={priceSel.has(o.key)} onChange={() => toggle(priceSel, setPriceSel, o.key)} label={o.label} />)}
                  </Facet>
                </div>
              </aside>

              {/* ── RESULTADOS ── */}
              <main>
                {/* encabezado: contador + orden + filtros móvil */}
                <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setShowFilters(v => !v)} className="lg:hidden h-10 px-4 rounded-full text-sm inline-flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                      <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros{activeCount > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: C.violetBtn }}>{activeCount}</span>}
                    </button>
                    <span className="text-[13px]" style={{ color: C.inkSoft }}>
                      {filtered.length > 0 ? <>Mostrando <span style={{ color: C.ink, fontWeight: 600 }}>{from}–{to}</span> de {filtered.length}</> : "Sin resultados"}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-[13px]" style={{ color: C.inkSoft }}>
                    Ordenar
                    <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Ordenar resultados" className="h-10 rounded-lg px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 cursor-pointer" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                      {SORTS.map(s => <option key={s.key} value={s.key} style={{ backgroundColor: C.card }}>{s.label}</option>)}
                    </select>
                  </label>
                </div>

                {/* grilla */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-20">
                    <Layers className="w-10 h-10 mb-4" style={{ color: `${C.ink}33` }} />
                    <p className="text-lg" style={{ fontFamily: D, fontWeight: 700 }}>Sin resultados</p>
                    <p className="mt-1 text-sm" style={{ color: C.inkSoft }}>Prueba con otros filtros o limpia la selección.</p>
                    <button onClick={clear} className="mt-5 px-5 h-10 rounded-full text-sm" style={{ border: `1px solid ${C.violet}66`, color: C.bright, fontFamily: D, fontWeight: 600 }}>Limpiar filtros</button>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div key={`${filterKey}-${curPage}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: EASE }}
                      className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {pageItems.map(p => {
                        const added = inCart(p.id);
                        const has = owned.has(p.id);
                        const info = prodInfo(p);   // estado REAL del engine (precio/disponible/portada)
                        const rating = p.pack ? 4.8 : formatDef(p.format)?.rating;
                        return (
                          <article key={p.id} onClick={() => info.available && openBook(p)}
                            {...(info.available ? { role: "button", tabIndex: 0, "aria-label": `Ver ${p.format} — ${p.cert}`, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBook(p); } } } : {})}
                            className={`group relative rounded-2xl flex items-stretch overflow-hidden transition-transform ${info.available ? "cursor-pointer hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70" : ""}`}
                            style={p.pack
                              ? { background: `linear-gradient(160deg, ${p.color}1c, ${C.card})`, border: `1.5px solid ${info.available ? p.color : `${C.ink}1f`}`, opacity: info.available ? 1 : 0.55 }
                              : { backgroundColor: C.card, border: `1px solid ${C.ink}14`, opacity: info.available ? 1 : 0.5 }}>

                            {/* PORTADA — la mitad de la tarjeta */}
                            <div className="w-1/2 shrink-0 self-stretch relative overflow-hidden" style={{ background: `linear-gradient(160deg, ${p.color}1f, ${C.bg})`, borderRight: `1px solid ${C.ink}14` }}>
                              <div className="absolute inset-0 flex items-center justify-center p-3">
                                <div className="h-full w-auto rounded-md overflow-hidden" style={{ aspectRatio: "1023 / 1537", boxShadow: `0 14px 30px -10px ${p.color}99`, border: `1px solid ${C.ink}1f`, backgroundColor: "#0b0b12" }}>
                                  {info.cover
                                    ? <img src={info.cover} alt={`Portada ${p.format}`} className="w-full h-full object-contain" />
                                    : <BookCover id={p.id} color={p.color} format={p.format} cert={p.cert} />}
                                </div>
                              </div>
                              {p.pack && (
                                <span className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ fontFamily: D, backgroundColor: p.color, color: "#0d1629" }}>MEJOR VALOR</span>
                              )}
                            </div>

                            {/* INFO — la otra mitad */}
                            <div className="w-1/2 min-w-0 p-4 flex flex-col">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ fontFamily: D, fontWeight: 700, color: info.available ? C.ink : C.inkSoft, backgroundColor: `${C.ink}0f`, border: `1px solid ${C.ink}14` }}>{p.cert}</span>
                                {!p.pack && <span className="font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: p.color }}>{p.tag}</span>}
                              </div>
                              <h3 className="text-base leading-tight inline-flex items-center gap-1.5" style={{ fontFamily: D, fontWeight: 700 }}>
                                {p.format}
                                {info.available && <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all shrink-0" />}
                              </h3>
                              <p className="text-[12px] mt-0.5" style={{ color: `${C.ink}88` }}>{p.certTitle}</p>
                              <p className="text-[12px] leading-relaxed mt-2 flex-1 line-clamp-3" style={{ color: C.inkSoft }}>{p.blurb}</p>

                              {info.available && rating && (
                                <div className="mt-2 flex items-center gap-1.5 text-[12px]" style={{ color: C.inkSoft }}>
                                  <Star className="w-3.5 h-3.5" style={{ color: C.gold, fill: C.gold }} />
                                  <span style={{ color: C.gold, fontWeight: 600 }}>{rating.toFixed(1)}</span>
                                  <span className="opacity-70">· Ver reseña</span>
                                </div>
                              )}

                              <div className="mt-3">
                                <div className="flex items-baseline gap-1 mb-2">
                                  <span className="text-[11px]" style={{ color: C.inkSoft }}>USD</span>
                                  <span style={{ fontFamily: D, fontWeight: 700, fontSize: p.pack ? "1.7rem" : "1.4rem", color: p.pack ? p.color : C.ink }}>{info.price.toFixed(2)}</span>
                                </div>
                                {!info.available ? (
                                  <span className="h-9 px-3 rounded-full text-[12px] inline-flex items-center gap-1.5" style={{ border: `1px dashed ${C.ink}26`, color: C.inkSoft }}><Clock className="w-3.5 h-3.5" /> {p.pack ? "Próximamente · faltan libros" : (p.eta || "Próximamente")}</span>
                                ) : has ? (
                                  <button onClick={e => { e.stopPropagation(); setLocation("/mi-biblioteca"); }} className="w-full h-9 px-3 rounded-full text-[13px] inline-flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 600 }}><BookOpen className="w-4 h-4" /> En tu biblioteca</button>
                                ) : (
                                  <button onClick={e => { e.stopPropagation(); buy(p); }} disabled={added} className="w-full h-9 px-3 rounded-full text-[13px] inline-flex items-center justify-center gap-2 transition-all hover:brightness-110 disabled:cursor-default"
                                    style={added ? { backgroundColor: `${C.green}1f`, color: C.green, border: `1px solid ${C.green}55`, fontFamily: D, fontWeight: 600 }
                                      : p.pack ? { backgroundColor: p.color, color: "#0d1629", fontFamily: D, fontWeight: 700 }
                                        : { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>
                                    {added ? <><Check className="w-4 h-4" /> Añadido</> : <><Plus className="w-4 h-4" /> Añadir</>}
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}

                {/* paginado */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-1.5">
                    <PageBtn label="Página anterior" disabled={curPage === 1} onClick={() => { setPage(curPage - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ChevronLeft className="w-4 h-4" aria-hidden /></PageBtn>
                    {pageList(curPage, totalPages).map((n, i) => n === "…"
                      ? <span key={`e${i}`} className="px-1.5 text-sm" style={{ color: C.inkSoft }}>…</span>
                      : <PageBtn key={n} active={n === curPage} onClick={() => { setPage(n as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{n}</PageBtn>)}
                    <PageBtn label="Página siguiente" disabled={curPage === totalPages} onClick={() => { setPage(curPage + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}><ChevronRight className="w-4 h-4" aria-hidden /></PageBtn>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <SiteFooter />
    </div>
  );
}

/* ── estado "Próximamente" premium por proveedor ── */
const PROVIDER_ROADMAP: Record<string, { eta: string; certs: { code: string; name: string }[] }> = {
  aws: { eta: "Q4 2026", certs: [
    { code: "CLF-C02", name: "Cloud Practitioner" },
    { code: "AIF-C01", name: "AI Practitioner" },
    { code: "SAA-C03", name: "Solutions Architect Associate" },
  ] },
  gcp: { eta: "Q4 2026", certs: [
    { code: "CDL", name: "Cloud Digital Leader" },
    { code: "ACE", name: "Associate Cloud Engineer" },
    { code: "PMLE", name: "Professional ML Engineer" },
  ] },
};

/* logos de marca — archivos oficiales servidos desde /public/logos (sin distorsión) */
const LOGO_SRC: Record<string, string> = {
  aws: "/logos/aws.svg",
  gcp: "/logos/google-cloud.svg",
};
function ProviderLogo({ provider, height = 24, plate = true, light = false }: { provider: typeof PROVIDERS[number]; height?: number; plate?: boolean; light?: boolean }) {
  const src = LOGO_SRC[provider.id];
  const [err, setErr] = useState(false);
  // fallback (sin archivo): wordmark en color de marca — NO es el logo oficial
  if (!src || err) return <span style={{ fontFamily: D, fontWeight: 700, fontSize: Math.round(height * 0.82), lineHeight: 1, letterSpacing: "-0.01em", color: light ? "#fff" : provider.color }}>{provider.short}</span>;
  const img = <img src={src} alt={provider.name} onError={() => setErr(true)} style={{ height, width: "auto", display: "block", objectFit: "contain" }} />;
  // los logos oficiales son oscuros → sobre la marca oscura van en una placa blanca para verse nítidos
  return plate ? <span className="inline-flex items-center rounded-xl px-4 py-3" style={{ background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.25)" }}>{img}</span> : img;
}

function ProviderComingSoon({ provider, onAzure }: { provider: typeof PROVIDERS[number]; onAzure: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const road = PROVIDER_ROADMAP[provider.id] ?? { eta: "Pronto", certs: [] };
  const col = provider.color;

  return (
    <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
      className="relative rounded-3xl overflow-hidden" style={{ background: `radial-gradient(120% 120% at 100% 0%, ${col}1a, ${C.card} 55%)`, border: `1px solid ${C.ink}14` }}>
      {/* glow animado */}
      <motion.div aria-hidden className="pointer-events-none absolute -top-24 -right-16 w-[28rem] h-[28rem] rounded-full blur-3xl" style={{ background: col, opacity: 0.16 }}
        animate={{ x: [0, 20, 0], y: [0, 14, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />

      <div className="relative grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center p-8 md:p-12">
        {/* texto + roadmap + notify */}
        <div>
          <div className="mb-5"><ProviderLogo provider={provider} height={provider.id === "gcp" ? 22 : 26} /></div>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] px-3 py-1 rounded-full mb-5" style={{ color: col, border: `1px solid ${col}55`, backgroundColor: `${col}12` }}>
            <Sparkles className="w-3.5 h-3.5" /> En el roadmap · {road.eta}
          </span>
          <h2 className="tracking-[-0.03em] leading-[1.05]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.9rem,4vw,3rem)" }}>
            Estamos preparando las colecciones de{" "}
            <span style={{ backgroundImage: `linear-gradient(100deg, ${col}, ${C.bright})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{provider.short}</span>
          </h2>
          <p className="mt-4 text-[15px] max-w-xl leading-relaxed" style={{ color: C.inkSoft }}>
            Empezamos por Azure para perfeccionar cada formato. {provider.short} entra a producción con el mismo estándar: seis formatos por certificación, auditados por un editor humano.
          </p>

          {road.certs.length > 0 && (
            <div className="mt-7">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3" style={{ color: `${C.ink}66` }}>Primeras colecciones previstas</p>
              <div className="flex flex-col gap-2">
                {road.certs.map(c => (
                  <div key={c.code} className="flex items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}12` }}>
                    <span className="font-mono text-[12px] shrink-0" style={{ fontFamily: D, fontWeight: 700, color: col }}>{c.code}</span>
                    <span className="text-[14px]" style={{ color: `${C.ink}cc` }}>{c.name}</span>
                    <Clock className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: `${C.ink}33` }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* notify */}
          <div className="mt-7">
            {sent ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[14px]" style={{ backgroundColor: `${C.green}1a`, border: `1px solid ${C.green}55`, color: C.green }}>
                <Check className="w-4 h-4" /> ¡Listo! Te avisaremos en <span style={{ fontWeight: 600 }}>{email}</span>.
              </motion.div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); if (email.includes("@")) setSent(true); }} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
                <input type="email" name="email" autoComplete="email" spellCheck={false} aria-label="Tu email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com" className="flex-1 h-12 rounded-full px-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 transition-[box-shadow,border-color] placeholder:opacity-50" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
                <button type="submit" className="h-12 px-5 rounded-full text-sm inline-flex items-center justify-center gap-2 text-white transition-all hover:brightness-110 shrink-0" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>
                  <Bell className="w-4 h-4" /> Avísame
                </button>
              </form>
            )}
            <p className="mt-2.5 text-[12px]" style={{ color: `${C.ink}55` }}>Te escribimos solo cuando {provider.short} esté disponible. Sin spam.</p>
            <button onClick={onAzure} className="group mt-5 inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: C.bright }}>
              Mientras tanto, explora Azure <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* visual: portada frontal con logo nítido (sin rotación) + profundidad */}
        <div className="hidden lg:flex items-center justify-center">
          <motion.div className="relative" style={{ width: 360, height: 380 }} animate={{ y: [0, -9, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
            {/* portadas laterales (solo profundidad) */}
            {[-1, 1].map(s => (
              <div key={s} className="absolute top-1/2 left-1/2 rounded-r-lg rounded-l-sm" style={{
                width: 158, aspectRatio: "3 / 4",
                transform: `translate(-50%,-50%) translateX(${s * 70}px) rotate(${s * 8}deg)`,
                background: `linear-gradient(155deg, ${col}, #0b0b12 80%)`, border: `1px solid ${col}33`, opacity: 0.4,
                boxShadow: `0 30px 60px -24px ${col}44`, zIndex: 1,
              }}>
                <span className="absolute left-0 top-0 bottom-0 w-2" style={{ background: "rgba(0,0,0,0.35)" }} />
              </div>
            ))}
            {/* portada frontal */}
            <div className="absolute top-1/2 left-1/2 rounded-r-xl rounded-l-md flex flex-col items-center justify-center gap-4 px-5 overflow-hidden" style={{
              width: 192, aspectRatio: "3 / 4", transform: "translate(-50%,-50%)",
              background: `linear-gradient(160deg, ${col}, #0b0b12 82%)`, border: `1px solid ${col}66`,
              boxShadow: `0 36px 70px -22px ${col}66, 0 10px 30px rgba(0,0,0,0.5)`, zIndex: 2,
            }}>
              <span className="absolute left-0 top-0 bottom-0 w-2.5" style={{ background: "rgba(0,0,0,0.35)", boxShadow: "inset -2px 0 4px rgba(0,0,0,0.4)" }} />
              <ProviderLogo provider={provider} light height={provider.id === "gcp" ? 22 : 26} />
              <div className="h-px w-12" style={{ background: "rgba(255,255,255,0.4)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-center leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>CloudBooks<br />Editorial</span>
            </div>
            {/* pill */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full backdrop-blur" style={{ backgroundColor: "rgba(10,10,14,0.78)", border: `1px solid ${col}55`, color: col, zIndex: 3 }}>
              <Sparkles className="w-3 h-3" /> Próximamente · {road.eta}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── sidebar: sección de faceta colapsable ── */
function Facet({ title, children, last, defaultOpen = true }: { title: string; children: React.ReactNode; last?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="py-4" style={{ borderTop: `1px solid ${C.ink}12`, ...(last ? {} : {}) }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <span className="text-[13px]" style={{ fontFamily: D, fontWeight: 700 }}>{title}</span>
        <ChevronDown className="w-4 h-4 transition-transform" style={{ color: C.inkSoft, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
            <div className="mt-3 flex flex-col gap-1.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckRow({ checked, onChange, label, sub, count, dim }: { checked: boolean; onChange: () => void; label: string; sub?: string; count?: number; dim?: boolean }) {
  return (
    <button onClick={onChange} role="checkbox" aria-checked={checked} className="flex items-center gap-2.5 text-left py-0.5 group rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70">
      <span className="w-4 h-4 rounded shrink-0 flex items-center justify-center transition-colors" style={checked ? { backgroundColor: C.violetBtn, border: `1px solid ${C.violetBtn}` } : { border: `1.5px solid ${C.ink}33` }}>
        {checked && <Check className="w-3 h-3 text-white" aria-hidden />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="text-[13px]" style={{ color: dim ? `${C.ink}66` : C.ink, fontWeight: checked ? 600 : 400 }}>{label}</span>
        {sub && <span className="block text-[11px] truncate" style={{ color: C.inkSoft }}>{sub}</span>}
      </span>
      {count != null && <span className="text-[11px] shrink-0" style={{ color: `${C.ink}55` }}>{count}</span>}
    </button>
  );
}

function PageBtn({ children, active, disabled, onClick, label }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} aria-current={active ? "page" : undefined} className="min-w-9 h-9 px-2 rounded-lg text-sm inline-flex items-center justify-center transition-[transform,filter] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
      style={active ? { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 700 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
      {children}
    </button>
  );
}

function pageList(cur: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, cur - 1), hi = Math.min(total - 1, cur + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < total - 1) out.push("…");
  out.push(total);
  return out;
}
