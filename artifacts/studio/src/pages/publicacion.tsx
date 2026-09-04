import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Check, Clock, Image as ImageIcon, FileText, Package, ListOrdered, Tag, Sparkles,
  Globe, BookOpen, Truck, CircleDashed, CheckCircle2, X, Eye, DollarSign, ChevronRight, ChevronDown, Cloud, Search, Plus, ArrowLeft, LogOut, ClipboardList, Wand2, Loader2, Save, Hash, RefreshCw,
} from "lucide-react";
import { FORMATS } from "@/lib/catalog";
import { logoutEstudio } from "@/lib/estudio-auth";
import {
  fetchLibraryTree, switchBook, enableBook, fetchBookConfig, saveBookConfig, generateFicha, fetchBookPreviews,
  fetchLibraryMetrics, fetchCollectionTags, addCollectionTags,
  type EngineLibraryTree, type EngineLibCert, type EngineLibBook, type EngineBookConfig, type EngineFicha, type EngineBookPreview, type EngineCollectionTags,
} from "@/lib/engine-api";

/* ════════════════════════════════════════════════════════════════════════════
   PUBLICACIÓN — ficha comercial REAL de un libro producido por el Estudio.
   Opera sobre el LIBRO ACTIVO del engine (patrón Auto Pages): al elegir un
   formato se hace switchBook y se carga su BookConfig.ficha + backCover.
   La copy la redacta el agente "Redactor de ficha" (POST /engine/book-ficha).
   Persiste vía POST /engine/book-config. // La tienda real sigue diferida.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", cardHi: "#1b1b25", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", bright: "#c4b5fd", green: "#34d399", amber: "#fbbf24", gold: "#fbbf24", red: "#f87171",
};

const PROVIDERS = [
  { id: "azure", name: "Microsoft Azure", short: "Azure", color: "#3b82f6", cloud: "azure" as const, active: true },
  { id: "aws", name: "Amazon Web Services", short: "AWS", color: "#ff9900", cloud: "aws" as const, active: false },
  { id: "gcp", name: "Google Cloud", short: "GCP", color: "#ea4335", cloud: "gcp" as const, active: false },
];

const CATEGORY_SUGGESTIONS = ["Microsoft Azure", "Inteligencia Artificial", "Certificación oficial", "Datos", "Arquitectura", "Administración", "Fundamentos", "Asociado", "Experto", "Especialista", "Seguridad"];
const PUBLISHER = "CloudBooks Editorial";

type Status = "borrador" | "listo" | "publicado";
const STATUS_META: Record<Status, { label: string; color: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }> = {
  borrador: { label: "Borrador", color: C.inkSoft, icon: CircleDashed },
  listo: { label: "Listo para publicar", color: C.amber, icon: Clock },
  publicado: { label: "Publicado · en venta", color: C.green, icon: CheckCircle2 },
};

/* color/tag de cada formato desde el catálogo (por nombre del libro) */
const fmtMeta = (label: string) => {
  const f = FORMATS.find(x => x.name.toLowerCase() === label.toLowerCase());
  return { color: f?.color ?? C.violet, tag: f?.tag ?? "Formato del estudio" };
};
const bust = (u: string | null | undefined, stamp: string) => (u ? `${u}${u.includes("?") ? "&" : "?"}v=${stamp}` : null);

export default function Publicacion() {
  const [, setLocation] = useLocation();
  const [tree, setTree] = useState<EngineLibraryTree | null>(null);
  const [provider, setProvider] = useState("azure");
  const [certId, setCertId] = useState("");
  const [selBookId, setSelBookId] = useState<string | null>(null);

  const [cfg, setCfg] = useState<EngineBookConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"all" | "copy" | "toc" | "samples" | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [credit, setCredit] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [stamp, setStamp] = useState("0");
  const [pool, setPool] = useState<EngineCollectionTags>({ categories: [], tags: [] });   // etiquetas reutilizables de la colección
  const [poolSaving, setPoolSaving] = useState(false);

  const selProvider = PROVIDERS.find(p => p.id === provider)!;
  const cloud = tree?.clouds.find(c => c.id === selProvider.cloud);
  const certsOf: EngineLibCert[] = useMemo(() => cloud?.certs ?? [], [cloud]);
  const cert = certsOf.find(c => c.id === certId || c.code === certId);
  const certBooks: EngineLibBook[] = cert?.books ?? [];
  const selBook = certBooks.find(b => b.id === selBookId) ?? null;

  const refreshCredit = useCallback(() => {
    fetchLibraryMetrics().then(m => setCredit(m.credit?.remainingUsd ?? null)).catch(() => {});
  }, []);

  // carga inicial del árbol → arranca en el cert/libro activo
  useEffect(() => {
    fetchLibraryTree().then(t => {
      setTree(t);
      const cl = t.clouds.find(c => c.certs.some(x => x.id === t.activeCertId));
      const prov = PROVIDERS.find(p => p.cloud === cl?.id);
      if (prov) setProvider(prov.id);
      setCertId(t.activeCertId);
    }).catch(() => {});
    refreshCredit();
  }, [refreshCredit]);

  // al entrar a un cert, preseleccionar el libro activo (si pertenece) o el primero enabled
  useEffect(() => {
    if (!cert) { setSelBookId(null); return; }
    const active = cert.books.find(b => b.id === tree?.activeBookId && (cert.id === tree?.activeCertId || cert.code === tree?.activeCertId));
    const pick = active ?? cert.books.find(b => b.enabled) ?? cert.books[0] ?? null;
    setSelBookId(pick?.id ?? null);
  }, [certId, cert, tree?.activeBookId, tree?.activeCertId]);

  // cargar la ficha del libro seleccionado (switchBook si hace falta)
  const loadBook = useCallback(async (cId: string, book: EngineLibBook) => {
    setLoading(true); setNote(null); setCfg(null); setDirty(false);
    try {
      if (!(tree && tree.activeCertId === cId && tree.activeBookId === book.id)) {
        const r = await switchBook(cId, book.id);
        if (!r.ok) { setNote(r.error ?? "No se pudo activar este libro."); setLoading(false); return; }
        setTree(r.tree);
      }
      const c = await fetchBookConfig();
      setCfg(c); setStamp(String(Date.now()));
      fetchCollectionTags().then(setPool).catch(() => { /* noop */ });   // pool de la colección (per-cert)
    } catch { setNote("Error cargando la ficha del libro."); }
    setLoading(false);
  }, [tree]);
  /** Guarda las categorías/etiquetas de este libro en el pool de la colección → reutilizables en los demás. */
  async function saveToPool() {
    if (!cfg) return;
    setPoolSaving(true);
    try { setPool(await addCollectionTags({ categories: cfg.ficha.categories, tags: cfg.ficha.tags })); }
    catch { setNote("No se pudo guardar en la colección."); }
    setPoolSaving(false);
  }

  useEffect(() => {
    if (selBook && selBook.enabled && cert) loadBook(cert.id, selBook);
    else setCfg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selBookId, selBook?.enabled]);

  function chooseProvider(id: string) {
    setProvider(id);
    const cl = tree?.clouds.find(c => c.id === PROVIDERS.find(p => p.id === id)?.cloud);
    setCertId(cl?.certs[0]?.id ?? "");
  }

  const patchFicha = (p: Partial<EngineFicha>) => { setCfg(c => c ? { ...c, ficha: { ...c.ficha, ...p } } : c); setDirty(true); };
  const patchPrice = (price: string) => { setCfg(c => c ? { ...c, backCover: { ...c.backCover, price } } : c); setDirty(true); };
  const patchIsbn = (isbn: string) => { setCfg(c => c ? { ...c, backCover: { ...c.backCover, isbn } } : c); setDirty(true); };

  async function save(extra?: Partial<EngineFicha>) {
    if (!cfg) return;
    setSaving(true);
    try {
      const ficha = { ...cfg.ficha, ...extra };
      const r = await saveBookConfig({ ficha, backCover: { price: cfg.backCover.price, isbn: cfg.backCover.isbn } as EngineBookConfig["backCover"] });
      setCfg(r); setDirty(false);
    } catch { setNote("No se pudo guardar."); }
    setSaving(false);
  }

  async function runAI(parts?: string[]) {
    if (!cfg) return;
    setBusy(!parts ? "all" : (parts[0] as "copy" | "toc" | "samples")); setNote(null);
    try {
      const r = await generateFicha(parts);
      if (r.ok) { setCfg(c => c ? { ...c, ficha: r.ficha } : c); setStamp(String(Date.now())); setDirty(false); }
      else setNote(r.error ?? "El agente no pudo generar la ficha.");
      refreshCredit();
    } catch { setNote("Error llamando al agente de ficha."); }
    setBusy(null);
  }

  /** Guarda las muestras curadas (selector de vista previa) sin pisar otras ediciones sin guardar. */
  async function saveSamples(urls: string[]) {
    if (!cfg) return;
    try { await saveBookConfig({ ficha: { samples: urls } as EngineFicha }); setCfg(c => c ? { ...c, ficha: { ...c.ficha, samples: urls } } : c); setStamp(String(Date.now())); }
    catch { setNote("No se pudieron guardar las muestras."); }
  }

  const status: Status = (cfg?.ficha.status ?? "borrador") as Status;
  const coverUrl = bust(cfg?.cover.imageUrl, stamp);
  const backUrl = bust(cfg?.backCover.imageUrl, stamp);
  const priceNum = parseFloat(cfg?.backCover.price || "0") || 0;

  const checklist = cfg ? [
    { k: "Portada", ok: !!cfg.cover.imageUrl },
    { k: "Sinopsis", ok: cfg.ficha.synopsis.trim().length > 20 },
    { k: "Acerca de", ok: cfg.ficha.about.length > 0 },
    { k: "Índice", ok: cfg.ficha.toc.trim().length > 0 },
    { k: "Categorías", ok: cfg.ficha.categories.length > 0 },
    { k: "Precio", ok: priceNum > 0 },
  ] : [];
  const ready = checklist.length > 0 && checklist.every(c => c.ok);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* ── BARRA SUPERIOR ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.9)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setLocation("/estudio")} className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.85 }}>
              <ArrowLeft className="w-4 h-4" /> Estudio
            </button>
            <span className="hidden sm:block w-px h-5" style={{ backgroundColor: `${C.ink}1f` }} />
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <ClipboardList className="w-4 h-4 shrink-0" style={{ color: C.teal }} />
              <span className="truncate" style={{ fontFamily: D, fontWeight: 700 }}>Armado de fichas</span>
            </div>
          </div>
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden md:flex items-center gap-1.5 text-[12px] min-w-0" style={{ color: C.inkSoft }}>
              <span className="inline-flex items-center gap-1.5" style={{ color: selProvider.color }}><Cloud className="w-3.5 h-3.5" /> {selProvider.short}</span>
              <ChevronRight className="w-3 h-3 opacity-50" />
              <span>{cert?.code ?? "—"}</span>
              {selBook && <><ChevronRight className="w-3 h-3 opacity-50" /><span className="truncate" style={{ color: C.ink }}>{selBook.label}</span></>}
            </div>
            {credit != null && <span className="hidden lg:inline text-[12px]" style={{ color: C.inkSoft }}>Crédito <strong style={{ color: C.green }}>${credit.toFixed(2)}</strong></span>}
            <button onClick={() => { logoutEstudio(); setLocation("/estudio"); }} className="shrink-0 inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── INTRO ── */}
      <section className="pt-8 pb-5" style={{ background: `radial-gradient(120% 80% at 80% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="mx-auto max-w-[1280px] px-6">
          <h1 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(1.8rem,3.5vw,2.6rem)" }}>Publicación de productos</h1>
          <p className="mt-2 text-[15px] max-w-2xl" style={{ color: C.inkSoft }}>
            Toma un libro que el Estudio ya terminó, deja que la IA redacte su ficha comercial desde el contenido real y publícalo. Al publicar queda en venta y se <strong style={{ color: C.bright, fontWeight: 600 }}>despacha automáticamente</strong> tras la compra.
          </p>
        </div>
      </section>

      {/* ── JERARQUÍA: proveedor → certificación ── */}
      <section className="pb-2">
        <div className="mx-auto max-w-[1280px] px-6 flex flex-col gap-3">
          <Row label="Proveedor">
            {PROVIDERS.map(p => (
              <Chip key={p.id} active={provider === p.id} dim={!p.active} color={p.color} onClick={() => chooseProvider(p.id)}>
                <Cloud className="w-3.5 h-3.5" /> {p.short}{!p.active && <span className="ml-1 opacity-60">·próx.</span>}
              </Chip>
            ))}
          </Row>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider shrink-0 w-[88px]" style={{ color: `${C.ink}66` }}>Certificación</span>
            <CertSelect certs={certsOf} value={cert?.id ?? ""} onChange={setCertId} />
            <span className="text-[12px] hidden sm:inline" style={{ color: `${C.ink}55` }}>
              {certsOf.length ? `${certsOf.length} certificaciones` : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* ── CUERPO ── */}
      <section className="py-5">
        <div className="mx-auto max-w-[1280px] px-6">
          {certBooks.length === 0 ? (
            <Empty title="Sin libros para publicar aquí" msg={`Aún no hay libros para ${cert?.code ?? "esta selección"}.`} />
          ) : (
            <div className="grid lg:grid-cols-[300px_1fr] gap-6">
              {/* lista de formatos */}
              <aside className="lg:sticky lg:top-24 self-start">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] mb-3 px-1" style={{ color: `${C.ink}66` }}>Formatos · {cert?.code}</p>
                <div className="flex flex-col gap-2">
                  {certBooks.map(b => {
                    const m = fmtMeta(b.label);
                    const active = b.id === selBookId;
                    return (
                      <button key={b.id} onClick={() => setSelBookId(b.id)} className="flex items-center gap-3 rounded-xl p-3 text-left transition-all"
                        style={{ backgroundColor: active ? C.cardHi : C.card, border: `1px solid ${active ? `${m.color}66` : `${C.ink}12`}`, opacity: b.enabled ? 1 : 0.6 }}>
                        <span className="w-9 h-12 rounded shrink-0 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(150deg, ${m.color}, #0b0b12)` }}>
                          <BookOpen className="w-4 h-4" style={{ color: "rgba(255,255,255,0.7)" }} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] truncate" style={{ fontFamily: D, fontWeight: 600 }}>{b.label}</p>
                          <span className="inline-flex items-center gap-1 text-[11px] mt-0.5" style={{ color: b.enabled ? C.teal : C.inkSoft }}>
                            {b.enabled ? <><Check className="w-3 h-3" /> En producción</> : <>Sin activar</>}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* editor */}
              <div>
                {!selBook ? null : !selBook.enabled ? (
                  <NotEnabled book={selBook} onEnable={async () => {
                    if (!cert) return;
                    const r = await enableBook(cert.id, selBook.id, true);
                    if (r.ok) setTree(r.tree);
                  }} />
                ) : loading ? (
                  <div className="flex items-center gap-2 py-20 justify-center" style={{ color: C.inkSoft }}><Loader2 className="w-5 h-5 animate-spin" /> Cargando ficha…</div>
                ) : !cfg ? (
                  <Empty title="Sin datos del libro" msg={note ?? "No se pudo cargar la ficha."} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[12px] px-2 py-0.5 rounded" style={{ fontFamily: D, fontWeight: 700, color: fmtMeta(selBook.label).color, backgroundColor: `${fmtMeta(selBook.label).color}1a`, border: `1px solid ${fmtMeta(selBook.label).color}40` }}>{cert?.code}</span>
                          <h2 className="text-2xl" style={{ fontFamily: D, fontWeight: 700 }}>{selBook.label}</h2>
                        </div>
                        <p className="mt-1 text-[13px]" style={{ color: C.inkSoft }}>{fmtMeta(selBook.label).tag}</p>
                      </div>
                      <StatusPill status={status} />
                    </div>

                    {/* panel de generación con IA */}
                    <div className="rounded-2xl p-5 mb-4" style={{ background: `linear-gradient(120deg, ${C.violet}14, ${C.card})`, border: `1px solid ${C.violet}3a` }}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><Wand2 className="w-4 h-4" style={{ color: C.bright }} /><h3 className="text-[15px]" style={{ fontFamily: D, fontWeight: 700 }}>Redactor de ficha (IA)</h3></div>
                          <p className="text-[12px] mt-1 max-w-lg" style={{ color: C.inkSoft }}>Solo <strong style={{ color: C.bright }}>"Redactar textos"</strong> usa IA (gasta crédito): sinopsis, "acerca de", categorías, tags y blurb desde los capítulos reales. El <strong style={{ color: C.ink }}>índice</strong> es un recálculo del temario (gratis) y las <strong style={{ color: C.ink }}>muestras</strong> se eligen abajo en el selector.</p>
                          {cfg.ficha.updatedAt && <p className="text-[11px] mt-1.5" style={{ color: `${C.ink}55` }}>Última generación: {new Date(cfg.ficha.updatedAt).toLocaleString()}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button onClick={() => runAI(["copy", "toc"])} disabled={!!busy} className="h-11 px-5 rounded-full text-sm inline-flex items-center gap-2 text-white transition-all hover:brightness-110 disabled:opacity-50" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generar ficha
                          </button>
                          <div className="flex items-center gap-1.5">
                            <MiniGen label="Redactar textos (IA · $)" icon={Wand2} on={busy === "copy"} disabled={!!busy} onClick={() => runAI(["copy"])} />
                            <MiniGen label="Índice" icon={ListOrdered} on={busy === "toc"} disabled={!!busy} onClick={() => runAI(["toc"])} />
                          </div>
                        </div>
                      </div>
                      {note && <p className="mt-3 text-[12px] flex items-center gap-1.5" style={{ color: C.amber }}><X className="w-3.5 h-3.5" /> {note}</p>}
                    </div>

                    {/* portada + contraportada (generadas en Auto Pages) */}
                    <Section icon={ImageIcon} title="Portada y contraportada" hint="Vienen de Auto Pages. Si faltan, generalas allí.">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <CoverPreview label="Portada" url={coverUrl} color={fmtMeta(selBook.label).color} />
                        <CoverPreview label="Contraportada" url={backUrl} color={fmtMeta(selBook.label).color} />
                      </div>
                      <button onClick={() => setLocation("/estudio")} className="mt-3 inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.bright }}><ImageIcon className="w-3.5 h-3.5" /> Ir a Auto Pages</button>
                    </Section>

                    {/* ficha (copy) */}
                    <Section icon={FileText} title="Ficha del producto" hint="Lo que se muestra en la página de venta.">
                      <div className="flex flex-col gap-4">
                        <Field label="Frase de gancho (blurb / contraportada)">
                          <input value={cfg.ficha.marketingBlurb} onChange={e => patchFicha({ marketingBlurb: e.target.value })} placeholder="Una frase que enganche…" className={inputCls} style={inputStyle} />
                        </Field>
                        <Field label="Descripción / sinopsis">
                          <textarea value={cfg.ficha.synopsis} onChange={e => patchFicha({ synopsis: e.target.value })} rows={5} placeholder="Describe de qué trata el libro y para quién es…" className={inputCls + " h-auto py-2.5 resize-y"} style={inputStyle} />
                        </Field>
                      </div>
                    </Section>

                    {/* acerca de */}
                    <Section icon={Sparkles} title="Acerca de este libro" hint="Puntos destacados que aparecen como viñetas en la ficha.">
                      <ListEditor items={cfg.ficha.about} onChange={v => patchFicha({ about: v })} placeholder="Ej: Cobertura íntegra del temario oficial." addLabel="Añadir punto" />
                    </Section>

                    {/* índice */}
                    <Section icon={ListOrdered} title="Índice del libro" hint="Derivado del temario real. Editable.">
                      <textarea value={cfg.ficha.toc} onChange={e => patchFicha({ toc: e.target.value })} rows={7} placeholder={"1. …\n2. …"} className={inputCls + " h-auto py-2.5 resize-y font-mono text-[13px]"} style={inputStyle} />
                      {cfg.ficha.toc.trim() && <p className="mt-2 text-[12px]" style={{ color: C.inkSoft }}>{cfg.ficha.toc.split("\n").filter(l => l.trim()).length} entradas</p>}
                    </Section>

                    {/* muestras — selector visual de vista previa */}
                    <Section icon={Eye} title="Páginas de muestra (Echa un vistazo)" hint="Elegí qué páginas reales del libro se muestran como vista previa en la tienda. Se guardan al tildar.">
                      <PreviewSelector key={`${cert?.code}:${selBook.id}`} samples={cfg.ficha.samples} stamp={stamp} onSave={saveSamples} />
                    </Section>

                    {/* categorías y etiquetas */}
                    <Section icon={Tag} title="Categorías y etiquetas" hint="Sirven para buscar y filtrar el libro en la tienda. Guardá las que quieras reutilizar en toda la colección.">
                      <div className="flex flex-col gap-4">
                        <Field label="Categorías">
                          <TokenInput tokens={cfg.ficha.categories} onChange={v => patchFicha({ categories: v })} placeholder="Añadir categoría y Enter…" suggestions={[...new Set([...pool.categories, ...CATEGORY_SUGGESTIONS])]} color={C.violet} />
                        </Field>
                        <Field label="Etiquetas">
                          <TokenInput tokens={cfg.ficha.tags} onChange={v => patchFicha({ tags: v })} placeholder="Añadir etiqueta y Enter…" suggestions={pool.tags} color={C.teal} />
                        </Field>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button onClick={saveToPool} disabled={poolSaving} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] transition-all hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.ink}26`, color: C.bright }}>
                            {poolSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Guardar en la colección
                          </button>
                          <span className="text-[11px]" style={{ color: `${C.ink}55` }}>{pool.categories.length + pool.tags.length > 0 ? `${pool.categories.length} categorías · ${pool.tags.length} etiquetas reutilizables (aparecen como sugerencias en los 6 libros)` : "Aún no hay etiquetas de colección"}</span>
                        </div>
                      </div>
                    </Section>

                    {/* comercial (precio / ISBN, reales en backCover) */}
                    <Section icon={DollarSign} title="Datos comerciales" hint="Precio e ISBN — se comparten con la contraportada del PDF y el Master timeline.">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Precio (USD)">
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
                            <input value={cfg.backCover.price} onChange={e => patchPrice(e.target.value)} placeholder="5.99" className={inputCls + " pl-9"} style={inputStyle} />
                          </div>
                        </Field>
                        <Field label="ISBN">
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
                            <input value={cfg.backCover.isbn} onChange={e => patchIsbn(e.target.value)} placeholder="978-…" className={inputCls + " pl-9"} style={inputStyle} />
                          </div>
                        </Field>
                        <Field label="Editorial">
                          <div className={inputCls + " flex items-center justify-between"} style={{ ...inputStyle, color: C.inkSoft }}>{PUBLISHER}<span className="text-[10px] uppercase tracking-wider opacity-60">fijo</span></div>
                        </Field>
                      </div>
                    </Section>

                    {/* barra de guardado */}
                    <div className="sticky bottom-4 z-10 rounded-2xl p-4 mb-4 flex items-center justify-between gap-3 backdrop-blur" style={{ backgroundColor: "rgba(21,21,29,0.92)", border: `1px solid ${dirty ? `${C.amber}55` : `${C.ink}1f`}` }}>
                      <span className="text-[13px] flex items-center gap-2" style={{ color: dirty ? C.amber : C.inkSoft }}>
                        {dirty ? <><RefreshCw className="w-4 h-4" /> Cambios sin guardar</> : <><Check className="w-4 h-4" style={{ color: C.green }} /> Todo guardado</>}
                      </span>
                      <button onClick={() => save()} disabled={!dirty || saving} className="h-10 px-5 rounded-full text-sm inline-flex items-center gap-2 transition-all disabled:opacity-40" style={{ backgroundColor: dirty ? C.violetBtn : C.card, color: dirty ? "#fff" : C.inkSoft, fontFamily: D, fontWeight: 600, border: dirty ? "none" : `1px solid ${C.ink}1f` }}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar ficha
                      </button>
                    </div>

                    {/* publicar */}
                    <div className="rounded-2xl p-5 mt-2" style={{ background: ready ? `linear-gradient(120deg, ${C.green}14, ${C.card})` : C.card, border: `1px solid ${ready ? `${C.green}55` : `${C.ink}14`}` }}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg mb-2" style={{ fontFamily: D, fontWeight: 700 }}>{status === "publicado" ? "Producto publicado" : "Requisitos para publicar"}</h3>
                          <div className="grid grid-cols-2 gap-x-5 gap-y-1.5">
                            {checklist.map(c => (
                              <span key={c.k} className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: c.ok ? C.ink : C.inkSoft }}>
                                {c.ok ? <Check className="w-3.5 h-3.5" style={{ color: C.green }} /> : <X className="w-3.5 h-3.5" style={{ color: `${C.ink}40` }} />} {c.k}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 shrink-0">
                          {status === "publicado" ? (
                            <button onClick={() => save({ status: "listo" })} className="h-10 px-5 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Despublicar</button>
                          ) : (
                            <button onClick={() => ready && save({ status: "publicado" })} disabled={!ready || saving}
                              className="h-11 px-6 rounded-full text-sm inline-flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                              style={{ backgroundColor: ready ? C.green : C.card, color: ready ? "#06281b" : C.inkSoft, fontFamily: D, fontWeight: 700, border: ready ? "none" : `1px solid ${C.ink}1f` }}>
                              <Globe className="w-4 h-4" /> Publicar producto
                            </button>
                          )}
                          {cert && (
                            <button onClick={() => setLocation(`/libro/${cert.code}-${selBook.id}?preview=1`)} className="h-10 px-5 rounded-full text-sm inline-flex items-center justify-center gap-2 transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.bright }}>
                              <Eye className="w-4 h-4" /> Ver en la tienda{status === "publicado" ? "" : " (preview)"}
                            </button>
                          )}
                        </div>
                      </div>
                      {!ready && status !== "publicado" && <p className="mt-3 text-[12px]" style={{ color: C.amber }}>Completa los requisitos marcados (podés generar la ficha con IA) para poder publicar.</p>}
                      <p className="mt-3 text-[12px] flex items-center gap-1.5" style={{ color: C.inkSoft }}><Truck className="w-3.5 h-3.5" style={{ color: C.bright }} /> Entrega digital inmediata · sin envío físico. <Package className="w-3.5 h-3.5 ml-2" /> La tienda real se habilita en el lanzamiento.</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── subcomponentes ─────────────────────────────────────────────────────── */
const inputCls = "w-full h-11 rounded-lg px-3.5 text-sm focus:outline-none transition-colors placeholder:opacity-50";
const inputStyle: React.CSSProperties = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };

function Empty({ title, msg }: { title: string; msg: string }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center text-center py-20 px-6" style={{ backgroundColor: C.card, border: `1px dashed ${C.ink}26` }}>
      <BookOpen className="w-9 h-9 mb-4" style={{ color: `${C.ink}33` }} />
      <p className="text-lg" style={{ fontFamily: D, fontWeight: 700 }}>{title}</p>
      <p className="mt-1.5 text-sm max-w-md" style={{ color: C.inkSoft }}>{msg}</p>
    </div>
  );
}

function NotEnabled({ book, onEnable }: { book: EngineLibBook; onEnable: () => void }) {
  return (
    <div className="rounded-2xl flex flex-col items-center justify-center text-center py-20 px-6" style={{ backgroundColor: C.card, border: `1px dashed ${C.ink}26` }}>
      <Package className="w-9 h-9 mb-4" style={{ color: `${C.ink}33` }} />
      <p className="text-lg" style={{ fontFamily: D, fontWeight: 700 }}>{book.label} no está en producción</p>
      <p className="mt-1.5 text-sm max-w-md" style={{ color: C.inkSoft }}>Activá este libro para trabajar su ficha. Se sumará a la corrida del Master timeline.</p>
      <button onClick={onEnable} className="mt-4 h-10 px-5 rounded-full text-sm inline-flex items-center gap-2 text-white transition-all hover:brightness-110" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}><Plus className="w-4 h-4" /> Activar libro</button>
    </div>
  );
}

function MiniGen({ label, icon: Icon, on, disabled, onClick }: { label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className="h-8 px-3 rounded-full text-[12px] inline-flex items-center gap-1.5 transition-all hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
      {on ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {label}
    </button>
  );
}

function CoverPreview({ label, url, color }: { label: string; url: string | null; color: string }) {
  return (
    <div>
      <span className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>{label}</span>
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "2 / 3", border: `1.5px ${url ? "solid" : "dashed"} ${url ? color : `${C.ink}2a`}`, backgroundColor: C.bg }}>
        {url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-contain" />
            <span className="absolute bottom-2 left-2 text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: "rgba(0,0,0,0.55)", color: C.green }}><Check className="w-3 h-3" /> Generada</span>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-6 h-6" style={{ color: `${C.ink}44` }} />
            <span className="text-[12px]" style={{ color: C.inkSoft }}>Sin {label.toLowerCase()} · generá en Auto Pages</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* selector visual de páginas para la vista previa ("Echa un vistazo") */
function PreviewSelector({ samples, stamp, onSave }: { samples: string[]; stamp: string; onSave: (urls: string[]) => Promise<void> }) {
  const [items, setItems] = useState<EngineBookPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Set<string>>(new Set(samples));
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetchBookPreviews().then(r => setItems(r.items)).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setSel(new Set(samples)); }, [samples]);

  const toggle = (url: string) => setSel(s => { const n = new Set(s); if (n.has(url)) n.delete(url); else n.add(url); return n; });
  async function save() { setSaving(true); await onSave([...sel]); setSaving(false); }

  const groups = useMemo(() => {
    const m = new Map<string, EngineBookPreview[]>();
    for (const it of items) { const a = m.get(it.group) ?? []; a.push(it); m.set(it.group, a); }
    return [...m.entries()];
  }, [items]);
  const dirty = sel.size !== samples.length || samples.some(u => !sel.has(u));

  if (loading) return <div className="flex items-center gap-2 py-8 justify-center text-[13px]" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando páginas del libro…</div>;
  if (!items.length) return (
    <div className="text-[13px] flex items-center justify-between gap-3" style={{ color: C.inkSoft }}>
      <span>No hay páginas generadas todavía. Generá la portada/láminas en Auto Pages y volvé.</span>
      <button onClick={load} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] shrink-0" style={{ border: `1px solid ${C.ink}26`, color: C.bright }}><RefreshCw className="w-3.5 h-3.5" /> Recargar</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px]" style={{ color: C.inkSoft }}>{sel.size} seleccionada(s) · {items.length} disponibles</p>
        <button onClick={load} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px]" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}><RefreshCw className="w-3.5 h-3.5" /> Recargar</button>
      </div>
      {groups.map(([group, its]) => (
        <div key={group}>
          <p className="text-[10px] uppercase tracking-[0.12em] mb-2" style={{ color: `${C.ink}66` }}>{group}</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {its.map(it => {
              const on = sel.has(it.url);
              return (
                <button key={it.url} onClick={() => toggle(it.url)} className="relative rounded-lg overflow-hidden text-left transition-all" style={{ aspectRatio: "2 / 3", border: `2px solid ${on ? C.green : `${C.ink}1f`}`, backgroundColor: C.bg }} title={it.label}>
                  <img src={bust(it.url, stamp) ?? it.url} alt={it.label} className="w-full h-full object-contain" style={{ opacity: on ? 1 : 0.72 }} />
                  <span className="absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: on ? C.green : "rgba(0,0,0,0.5)", color: on ? "#06281b" : "#fff" }}>{on ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}</span>
                  <span className="absolute bottom-0 inset-x-0 text-[9px] px-1 py-0.5 truncate" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>{it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-end gap-2 pt-1">
        {dirty && <span className="text-[12px]" style={{ color: C.amber }}>Cambios sin guardar</span>}
        <button onClick={save} disabled={!dirty || saving} className="h-9 px-4 rounded-full text-sm inline-flex items-center gap-2 transition-all disabled:opacity-40" style={{ backgroundColor: dirty ? C.violetBtn : C.card, color: dirty ? "#fff" : C.inkSoft, fontFamily: D, fontWeight: 600, border: dirty ? "none" : `1px solid ${C.ink}1f` }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar selección
        </button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
      <span className="font-mono text-[10px] uppercase tracking-wider shrink-0 w-[88px]" style={{ color: `${C.ink}66` }}>{label}</span>
      {children}
    </div>
  );
}

function Chip({ active, dim, color, onClick, children }: { active: boolean; dim?: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="shrink-0 h-8 px-3.5 rounded-full text-[13px] whitespace-nowrap transition-all inline-flex items-center gap-1.5"
      style={active ? { backgroundColor: color ?? C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: dim ? `${C.ink}66` : C.inkSoft, fontWeight: 500 }}>
      {children}
    </button>
  );
}

/* selector de certificación con buscador */
function CertSelect({ certs, value, onChange }: { certs: EngineLibCert[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cur = certs.find(c => c.id === value);
  const filtered = certs.filter(c => `${c.code} ${c.name}`.toLowerCase().includes(q.toLowerCase()));

  if (certs.length === 0) return <span className="text-[13px]" style={{ color: C.inkSoft }}>Sin certificaciones para este proveedor todavía.</span>;

  const item = (c: EngineLibCert) => {
    const nEnabled = c.books.filter(b => b.enabled).length;
    return (
      <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); setQ(""); }} className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-white/[0.04]"
        style={{ backgroundColor: c.id === value ? C.cardHi : "transparent" }}>
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[12px] shrink-0" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{c.code}</span>
          <span className="text-[13px] truncate" style={{ color: C.inkSoft }}>{c.name}</span>
        </span>
        {nEnabled > 0
          ? <span className="text-[10px] shrink-0" style={{ color: C.green }}>{nEnabled} en prod.</span>
          : <span className="text-[10px] shrink-0" style={{ color: C.inkSoft }}>—</span>}
      </button>
    );
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="h-9 min-w-[260px] px-3.5 rounded-lg flex items-center justify-between gap-3 transition-colors" style={{ backgroundColor: C.card, border: `1px solid ${open ? C.violet : `${C.ink}1f`}` }}>
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[13px]" style={{ fontFamily: D, fontWeight: 700 }}>{cur?.code ?? "Selecciona"}</span>
          {cur && <span className="text-[12px] truncate hidden sm:inline" style={{ color: C.inkSoft }}>· {cur.name}</span>}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform" style={{ color: C.inkSoft, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-2 w-[340px] max-w-[80vw] rounded-xl p-2 shadow-2xl" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}1f` }}>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar certificación…" className="w-full h-9 rounded-lg pl-9 pr-3 text-sm focus:outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filtered.map(item)}
              {filtered.length === 0 && <p className="px-3 py-4 text-center text-[13px]" style={{ color: C.inkSoft }}>Sin coincidencias</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" style={{ color: C.violet }} />
        <h3 className="text-[15px]" style={{ fontFamily: D, fontWeight: 700 }}>{title}</h3>
      </div>
      <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>{hint}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] mb-1.5" style={{ color: C.inkSoft }}>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: Status }) {
  const M = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full" style={{ backgroundColor: `${M.color}1a`, color: M.color, border: `1px solid ${M.color}40` }}>
      <M.icon className="w-3.5 h-3.5" /> {M.label}
    </span>
  );
}

/* editor de viñetas */
function ListEditor({ items, onChange, placeholder, addLabel }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; addLabel: string }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.violet }} />
          <input value={it} onChange={e => onChange(items.map((x, j) => j === i ? e.target.value : x))} placeholder={placeholder} className={inputCls} style={inputStyle} />
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors hover:bg-white/5" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
        </div>
      ))}
      <button onClick={() => onChange([...items, ""])} className="self-start mt-1 inline-flex items-center gap-1.5 text-[13px] px-3 h-9 rounded-full transition-colors" style={{ border: `1px solid ${C.ink}1f`, color: C.bright }}><Plus className="w-4 h-4" /> {addLabel}</button>
    </div>
  );
}

/* input de tokens */
function TokenInput({ tokens, onChange, placeholder, suggestions, color }: { tokens: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[]; color: string }) {
  const [val, setVal] = useState("");
  const add = (t: string) => { const v = t.trim(); if (v && !tokens.includes(v)) onChange([...tokens, v]); setVal(""); };
  const avail = (suggestions ?? []).filter(s => !tokens.includes(s));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg p-2 min-h-[44px]" style={inputStyle}>
        {tokens.map(t => (
          <span key={t} className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full text-[13px]" style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}40` }}>
            {t}
            <button onClick={() => onChange(tokens.filter(x => x !== t))} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        <input value={val} onChange={e => setVal(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(val); } else if (e.key === "Backspace" && !val && tokens.length) onChange(tokens.slice(0, -1)); }}
          placeholder={tokens.length ? "" : placeholder} className="flex-1 min-w-[140px] h-7 bg-transparent text-sm focus:outline-none" style={{ color: C.ink }} />
      </div>
      {avail.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {avail.map(s => (
            <button key={s} onClick={() => add(s)} className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] transition-colors hover:bg-white/5" style={{ border: `1px dashed ${C.ink}26`, color: C.inkSoft }}><Plus className="w-3 h-3" /> {s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
