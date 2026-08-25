import { useEffect, useState, useRef, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, LogOut, Wand2, FileText, Sparkles, LayoutTemplate, ShieldCheck, Scale,
  Download, Library, Cloud, Loader2, AlertTriangle, CircleDashed, ExternalLink, RefreshCw, Check, X, KeyRound, ArrowRight,
  LayoutDashboard, ChevronRight, ChevronDown, Lock, Layers, BookOpen, Database, Clock, FileCode2, Coins, Trash2, Maximize2, BadgeCheck, Upload, Plus, MapPin, Quote, Link2,
  Grid3x3, ZoomIn, ZoomOut, ChevronLeft, Play,
  Users, Search, PenTool, ScanSearch, Route, List, Edit3, Eye, Palette, ClipboardCheck, Image as ImageIcon, Gauge,
  BookMarked, Type as TypeIcon, ShieldAlert, GraduationCap, FileSearch, Target, Smile,
  Workflow, Activity, Timer,
} from "lucide-react";
import { logoutEstudio } from "@/lib/estudio-auth";
import {
  fetchEngineCatalog, fetchEngineKeyStatus, fetchEngineSeed, fetchEngineRecipes, generateEnginePage, fetchEngineDecision, fetchEngineQa, fetchEnginePrediction,
  runEditorialQa, runAutoRevise, fetchEngineSkills,
  fetchEngineSources, ingestSourceUrl, ingestSourceCsv, deleteEngineSource, fetchEngineCoverage, runAuthor, verifyGroundingApi, persistAuthored, deleteEnginePage,
  fetchEngineProvenance, type EngineProvenance,
  fetchQaCockpit, fetchQaDossier, type EngineQaRollup, type EngineQaDossier, type EngineQaDimension, type EngineOperationalStatus, type EngineActionTarget,
  fetchEngineCost, type EngineCost,
  fetchAgents, fetchAgentActivity, type EngineAgentsRollup, type EngineAgentStat, type EngineAgentDomain, type EngineAgentActivity,
  fetchAgentRuntime, type EngineAgentRuntime, type EngineRuntimeAgentStat, type EngineRuntimePeriod,
  fetchCredit, setCreditAnchor, type EngineCredit,
  fetchCreditEvents, addCreditEvent, type EngineCreditEvent, fetchCostBreakdown, type EngineCostBreakdown,
  fetchEnginePremiumVerdict, runVariants, selectVariantApi,
  fetchContentReadiness, type EngineContentReadiness,
  fetchLibraryTree, activateCertBook, switchBook, enableBook, lockLibrary, unlockLibrary, fetchLibraryMetrics, type EngineLibraryMetrics, type EngineBookMetric, fetchChapters, assembleMasterBook, renderChapter, generateChapterDivider, generateChapterGraphics, generateRouteCapstone, fetchModules, groundModule, saveChapter, fetchChapterQa, fetchChaptersQa, fetchClaimReviews, resolveClaimReview, type EngineChapterQa, type EngineClaimReview, type EngineModule, type EngineGroundModuleResult, type EngineChapter, type EngineMasterAssembleResult, type EngineLibraryTree, type EngineLibCloud, type EngineLibCert, type EngineLibBook, type EngineCertTrack, type EngineCertLevel, type EngineActivateResult,
  groundDomain, type EngineGroundDomainResult, type EngineGroundSkillResult,
  fetchEvidence, captureEvidence, type EngineEvidenceResult,
  fetchGroundingTree, ingestSkill, ingestDomain, improveRelevance, type EngineGroundingTree, type EngineTreeDomain, type EngineTreeModule, type EngineTreeUnit,
  fetchRouteLocks, setRouteLock,
  fetchAllRoutePanels, runRoutePanel as runRoutePanelApi, regenerateRoute, type RoutePanelRun, type RouteExpertVerdict,
  generateInfographic, setStyleAnchor, fetchInfographicManifest, fetchInfographicStats,
  fetchInfographicContract, runInfographicBatch, exportGranular,
  fetchApprovals, approvePage, approvePages, approveBook, type EngineApprovals,
  fetchBookOutline, assembleBook, type EngineBookOutline, type EngineAssembleResult,
  fetchBookConfig, saveBookConfig, resetBookBlock, uploadBookCover, uploadBookAsset, generateBookSection, type EngineBookConfig, type EngineBookSection,
  generateStudyGuide, generateGlossary, generateScenarioReview, generateDomainMap, generateRouteIntro, uploadRouteIntro, generateRouteDivider, generateRouteDividersAll,
  generateBookCover, generateBookBackCover, generatePartOpeners, generateMasterGlossary,
  selectCoverTake, selectBackCoverTake, fetchDesignAssets, fetchDesignAnchor, setDesignAnchorFromCert, applyBookPalette,
  fetchDesignLock, updateDesignLock, fetchDesignNotes, setDesignNote, fetchCorridaTiming, updateCorridaTiming, type EngineCorridaTiming,
  type EngineDesignAnchor, type EngineDesignAssets,
  fetchMatterContract, saveMatterContract, type EngineMatterContract,
  fetchImageContract, saveImageContract, type EngineImageContract,
  fetchBrandContract, saveBrandContract, type EngineBrandContract,
  fetchEditorialContract, saveEditorialContract, type EngineEditorialContract,
  fetchAssembledStatus, fetchBookPreviews, type EngineBookPreview,
  type EngineInfographicResult, type EngineInfographicQa, type EngineInfographicOutcome,
  type EngineInfographicManifest, type EngineInfographicStats,
  type EngineContractCascade, type EngineContractField, type EngineInfographicBatch, type EngineExportFormat,
  type EngineCatalog, type EngineCatalogPage, type EngineKeyStatus, type EngineSeed,
  type EngineRecipe, type EngineGenerateResult, type EngineRecommendedAction, type EngineQASummary, type EnginePrediction, type EnginePipelineStage,
  type EngineEditorialQa, type EngineAutoReviseResult, type EngineExamOutline, type EngineSource, type EngineCoverageReport, type EngineAuthoredPage, type EngineCitation,
  type EngineGroundingResult, type EngineClaimVerdict, type EnginePremiumVerdict, type EngineQaGate,
  type EngineVariantsResult, type EngineVariantInfo,
} from "@/lib/engine-api";
import { useCorridaRun, RUN_PHASES, activePhaseIdx, type RunState } from "@/lib/corrida-run-store";
import { chapBadge, chapTitle, chapSortKey } from "@/lib/chapter-label";

/* ════════════════════════════════════════════════════════════════════════════
   INDESIGN AI — cabina unificada del Estudio (marca CloudBooks).
   Maneja el motor local (studio-engine vía /engine). El motor es central; esta
   pantalla orquesta sus etapas. Ruta /estudio/indesign (gateada).
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", cardHi: "#1b1b25", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", gold: "#fbbf24", bright: "#c4b5fd", green: "#34d399",
};

type StageId = "dashboard" | "cuadrilla" | "grounding" | "contenido" | "generar" | "galeria" | "componer" | "qa" | "runs" | "aprobaciones" | "contrato" | "exportar" | "ensamblar" | "catalogo" | "costos";
/** Secciones del nivel GLOBAL (Grounding es agnóstico del formato; Dashboard y Timeline son de la familia). */
type GlobalSectionId = "grounding" | "dashboard" | "timeline" | "autopages";

/** Mapa ícono-string (lo manda el engine) → ícono de lucide (frontend). */
const LIB_ICONS: Record<string, typeof FileText> = {
  LayoutTemplate, BookOpen, AlertTriangle, CircleDashed, FileText, Sparkles,
};
const libIcon = (k: string): typeof FileText => LIB_ICONS[k] ?? FileText;
/** Etiqueta legible de un libro/formato por su id. */
const LIB_BOOK_LABELS: Record<string, string> = {
  "visual-atlas": "Visual Atlas", "master-book": "Master Book", "exam-traps": "Exam Traps Guide",
  "question-bank": "Question Bank", "cheat-sheets": "Cheat Sheets", "rapid-review": "Rapid Review",
};
const labelForBook = (id: string): string => LIB_BOOK_LABELS[id] ?? id;

/** Secciones GLOBALES (nivel familia, arriba del libro activo). Grounding vive acá: el corpus es único. */
const GLOBAL_SECTIONS: { id: GlobalSectionId; label: string; icon: typeof FileText }[] = [
  { id: "grounding", label: "Grounding", icon: Database },
  { id: "dashboard", label: "Dashboard global", icon: LayoutDashboard },
  { id: "timeline", label: "Master timeline", icon: Clock },
  { id: "autopages", label: "Auto Pages", icon: ImageIcon },
];

/* ════════════════════════════════════════════════════════════════════════════
   AUTO PAGES (E1) — sección GLOBAL: genera las páginas de IDENTIDAD/DISEÑO del
   libro ACTIVO (portada · contraportada · aperturas de ruta · divisores de
   capítulo) con los generadores image-2 existentes. Advisory: generar/regenerar/
   aprobar por pieza (la persistencia del lock + gate del armado llegan en E2).
   ════════════════════════════════════════════════════════════════════════════ */
const AUTOPAGES_HELP = {
  title: "Auto Pages — diseño del libro",
  body: [
    "Generá las páginas de identidad del libro activo con IA: portada y contraportada (listas apenas activás el cert), y las aperturas de ruta / divisores de capítulo (necesitan capítulos groundeados).",
    "Cada pieza se puede regenerar (image-2 no es determinista → cada toma es nueva). Aprobás por pieza; el bloqueo persistido que habilita el armado llega en la próxima fase.",
  ],
};
const ASSET_COST = 0.07;
const ALL_FORMATS = ["visual-atlas", "master-book", "exam-traps", "question-bank", "cheat-sheets", "rapid-review"];

function AutoPagesStage({ library, reloadKey, onReload, onSwitchBook }: { library: EngineLibraryTree | null; reloadKey: number; onReload: () => void; onSwitchBook: (certId: string, bookId: string) => void }) {
  const format = library?.activeBookId ?? "visual-atlas";
  const certId = library?.activeCertId ?? "ai-200";
  const isMaster = format === "master-book";
  const bookLabel = labelForBook(format);
  const [cfg, setCfg] = useState<EngineBookConfig | null>(null);
  const [modules, setModules] = useState<EngineModule[]>([]);
  const [credit, setCredit] = useState<EngineCredit | null>(null);
  const [assets, setAssets] = useState<EngineDesignAssets | null>(null);
  const [anchor, setAnchor] = useState<EngineDesignAnchor | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [genUrls, setGenUrls] = useState<Record<string, string>>({});
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [stamp, setStamp] = useState(0);
  const [msg, setMsg] = useState("");
  const [locked, setLocked] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [pieceErr, setPieceErr] = useState<Record<string, string>>({});   // error por-tarjeta (atribuido a la pieza, no al banner del panel)
  const notePendingRef = useRef<Promise<unknown> | null>(null);           // la "Nota de mejora" (guardada on-blur) debe llegar antes del regenerar
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandCert, setBrandCert] = useState(certId);
  const [brandFmt, setBrandFmt] = useState("visual-atlas");

  const azure = library?.clouds.find(c => c.id === "azure") ?? null;
  const activeCert = azure?.certs.find(c => c.id === certId) ?? null;

  useEffect(() => {
    let a = true;
    fetchBookConfig().then(c => { if (a) setCfg(c); }).catch(() => { if (a) setCfg(null); });
    fetchModules().then(r => { if (a) setModules(r.modules); }).catch(() => { if (a) setModules([]); });
    fetchCredit().then(c => { if (a) setCredit(c); }).catch(() => { if (a) setCredit(null); });
    fetchDesignAssets().then(x => { if (a) setAssets(x); }).catch(() => { if (a) setAssets(null); });
    fetchDesignAnchor().then(x => { if (a) setAnchor(x); }).catch(() => { if (a) setAnchor(null); });
    fetchDesignLock().then(l => { if (a) { setApproved(new Set(l.pieces)); setLocked(l.locked); } }).catch(() => { if (a) { setApproved(new Set()); setLocked(false); } });
    fetchDesignNotes().then(r => { if (a) setNotes(r.notes ?? {}); }).catch(() => { if (a) setNotes({}); });
    setGenUrls({}); setMsg("");
    return () => { a = false; };
  }, [reloadKey, format]);

  function saveNote(key: string, val: string) {
    setNotes(n => ({ ...n, [key]: val }));
    notePendingRef.current = setDesignNote(key, val).catch(() => { /* noop */ });
  }
  function approveAll(keys: string[]) {
    const n = new Set(keys);
    setApproved(n); persistLock({ pieces: [...n] });
  }

  /** Persiste el set de aprobadas; si cambia el diseño (regenerar) se DESBLOQUEA el libro. */
  function persistLock(patch: { pieces?: string[]; locked?: boolean }) {
    updateDesignLock(patch).then(l => { setApproved(new Set(l.pieces)); setLocked(l.locked); }).catch(() => { /* noop */ });
  }
  function unlockIfLocked() { if (locked) { setLocked(false); persistLock({ locked: false }); } }

  const bust = (u?: string | null): string | null => u ? `${u}${u.includes("?") ? "&" : "?"}v=${stamp}` : null;
  function refreshAll() {
    setStamp(s => s + 1);
    return Promise.all([
      fetchDesignAssets().then(setAssets).catch(() => { /* noop */ }),
      fetchDesignAnchor().then(setAnchor).catch(() => { /* noop */ }),
      fetchBookConfig().then(setCfg).catch(() => { /* noop */ }),
      fetchCredit().then(setCredit).catch(() => { /* noop */ }),
    ]).then(() => onReload());
  }

  const routes = useMemo(() => {
    const m = new Map<string, string>();
    for (const mod of modules) if (!m.has(mod.domainId)) m.set(mod.domainId, mod.domainLabel);
    return [...m.entries()].map(([domainId, label]) => ({ domainId, label })).sort((x, y) => x.domainId.localeCompare(y.domainId));
  }, [modules]);
  const chapters = useMemo(() => modules.filter(m => m.hasChapter && m.chapterId), [modules]);
  const hasChapterInRoute = (domainId: string) => chapters.some(c => c.domainId === domainId);
  function toggleApprove(key: string) {
    const n = new Set(approved); n.has(key) ? n.delete(key) : n.add(key);
    setApproved(n); persistLock({ pieces: [...n] });
  }
  /** Un cambio de diseño (regenerar/elegir/subir) saca la aprobación de la pieza y DESBLOQUEA el libro. */
  function afterDesignChange(key?: string) {
    const n = new Set(approved); if (key) n.delete(key);
    setApproved(n); setLocked(false); persistLock({ pieces: [...n], locked: false });
  }

  // ── handlers de identidad (versionado + variantes + subir referencia + brand) ──
  async function genIdentity(kind: "cover" | "back", count: number) {
    setBusy(kind); setMsg("");
    try { const r = kind === "cover" ? await generateBookCover(true, count) : await generateBookBackCover(true, count); if (!r.ok && r.error) setMsg(r.error); afterDesignChange(kind); await refreshAll(); }
    catch { setMsg("No se pudo generar (verificá el engine y la llave de OpenAI)."); }
    finally { setBusy(null); }
  }
  async function chooseTake(kind: "cover" | "back", file: string) {
    setBusy(`${kind}:sel`);
    try { kind === "cover" ? await selectCoverTake(file) : await selectBackCoverTake(file); afterDesignChange(kind); await refreshAll(); }
    catch { setMsg("No se pudo seleccionar la toma."); }
    finally { setBusy(null); }
  }
  async function uploadCanonical(kind: "cover" | "back", file: File) {
    setBusy(`${kind}:up`); setMsg("");
    try { const dataUrl = await fileToDataUrl(file); if (kind === "cover") await uploadBookCover(dataUrl); else await uploadBookAsset(dataUrl, "backcover"); afterDesignChange(kind); await refreshAll(); }
    catch { setMsg("No se pudo subir la referencia."); }
    finally { setBusy(null); }
  }
  async function seedBrand() {
    setBusy("brand"); setMsg("");
    try { const r = await setDesignAnchorFromCert(brandCert, brandFmt); if (!r.ok) setMsg(r.error ?? "No se pudo sembrar la identidad."); await refreshAll(); }
    catch { setMsg("No se pudo sembrar la identidad."); }
    finally { setBusy(null); }
  }
  /** Aplica la paleta canónica de familia del formato al libro activo (recolorea covers/dividers aguas abajo). */
  async function applyPalette() {
    setBusy("palette"); setMsg("");
    try { await applyBookPalette(); await refreshAll(); setMsg("Paleta de familia aplicada al libro."); }
    catch { setMsg("No se pudo aplicar la paleta."); }
    finally { setBusy(null); }
  }

  // ── openers / dividers (derivados de contenido) ──
  async function genPiece(key: string, fn: () => Promise<{ ok?: boolean; url?: string; error?: string; results?: { ok?: boolean; url?: string; error?: string }[] }>) {
    setBusy(key); setMsg(""); setPieceErr(e => { const n = { ...e }; delete n[key]; return n; });
    try {
      if (notePendingRef.current) { try { await notePendingRef.current; } catch { /* noop */ } }   // la nota de mejora debe persistirse ANTES de regenerar (evita usar la nota vieja)
      const r = await fn();
      const url = r.url ?? r.results?.find(x => x?.url)?.url;
      const error = r.error ?? r.results?.find(x => x?.error)?.error;
      if (url) { setGenUrls(g => ({ ...g, [key]: url })); afterDesignChange(key); setStamp(s => s + 1); }
      if (error && !url) { setMsg(error); setPieceErr(e => ({ ...e, [key]: error })); }
      if (key.startsWith("route:")) fetchBookConfig().then(setCfg).catch(() => { /* noop */ });
      fetchCredit().then(setCredit).catch(() => { /* noop */ });
      onReload();
    } catch { setMsg("No se pudo generar (verificá el engine y la llave de OpenAI)."); setPieceErr(e => ({ ...e, [key]: "No se pudo generar (engine/llave)." })); }
    finally { setBusy(null); }
  }
  interface Piece { key: string; title: string; sub: string; url: string | null; disabled?: string; run: () => Promise<{ ok?: boolean; url?: string; error?: string; results?: { ok?: boolean; url?: string; error?: string }[] }> }
  const openers: Piece[] = routes.map(r => {
    const key = `route:${r.domainId}`;
    const disabled = isMaster && !hasChapterInRoute(r.domainId) ? "Necesita capítulos groundeados en esta ruta" : undefined;
    return {
      key, title: `Apertura · ${r.label}`, sub: isMaster ? "Abre-parte (Master)" : "Divisor de ruta (Atlas)",
      url: bust(genUrls[key] ?? (isMaster ? assets?.openers?.[r.domainId] : cfg?.routeIntros?.[r.domainId]?.imageUrl)),
      disabled, run: () => isMaster ? generatePartOpeners(r.domainId, true) : generateRouteDivider(r.domainId, true),
    };
  });
  const dividers: Piece[] = isMaster ? chapters.map(c => {
    const key = `chapter:${c.chapterId}`;
    return { key, title: `Divisor · cap ${c.chapterNumber ?? ""}`.trim(), sub: c.moduleTitle, url: bust(genUrls[key] ?? assets?.dividers?.[c.chapterId ?? ""]), run: () => generateChapterDivider(c.chapterId!, true) };
  }) : [];

  const coverActive = assets?.cover.activeUrl ?? null;
  const backActive = assets?.back.activeUrl ?? null;
  const openersGen = openers.filter(a => !a.disabled);
  const presentKeys = [
    ...(coverActive ? ["cover"] : []), ...(backActive ? ["back"] : []),
    ...openersGen.filter(a => a.url).map(a => a.key), ...dividers.filter(a => a.url).map(a => a.key),
  ];
  const totalPieces = 2 + openersGen.length + dividers.length;
  const approvedCount = presentKeys.filter(k => approved.has(k)).length;
  const allApproved = presentKeys.length > 0 && approvedCount === presentKeys.length && presentKeys.length >= totalPieces;

  const openerTemplateKey = `route:${isMaster ? "p1" : "p3"}`;
  const dividerTemplateKey = chapters[0]?.chapterId ? `chapter:${chapters[0].chapterId}` : "";
  function pieceCard(a: Piece) {
    const isBusy = busy === a.key;
    const ap = approved.has(a.key);
    const isTemplate = a.key === openerTemplateKey || (!!dividerTemplateKey && a.key === dividerTemplateKey);
    return (
      <div key={a.key} className="rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${ap ? `${C.green}55` : `${C.ink}14`}` }}>
        <div className="relative flex items-center justify-center" style={{ height: 168, backgroundColor: C.bg, borderBottom: `1px solid ${C.ink}0f` }}>
          {a.url
            ? <img src={a.url} alt={a.title} className="max-h-full max-w-full object-contain" style={{ opacity: isBusy ? 0.4 : 1 }} />
            : <div className="flex flex-col items-center gap-1.5" style={{ color: `${C.ink}33` }}><ImageIcon className="w-7 h-7" /><span className="text-[11px]">sin generar</span></div>}
          {isBusy && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: C.teal }} /></div>}
          {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="absolute top-1.5 right-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg" style={{ backgroundColor: `${C.bg}cc`, color: C.inkSoft }} title="Abrir en tamaño real"><ExternalLink className="w-3.5 h-3.5" /></a>}
        </div>
        <div className="p-3 flex flex-col gap-2 flex-1">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-[13px]" style={{ fontFamily: D, fontWeight: 600, color: C.ink }}>{a.title}</p>
              {isTemplate && <span title="Pieza de referencia de este tipo. La identidad la fija el ancla de marca de la cert (Fuente de marca); todas las piezas anclan a ella." className="text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full shrink-0" style={{ color: C.bright, border: `1px solid ${C.violet}55` }}>referencia</span>}
            </div>
            <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: `${C.ink}55` }}>{a.sub}</p>
          </div>
          {a.disabled ? (
            <p className="text-[11px] mt-auto inline-flex items-center gap-1.5" style={{ color: C.gold }}><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {a.disabled}</p>
          ) : (
            <>
              <div className="mt-auto flex items-center gap-2">
                <button onClick={() => genPiece(a.key, a.run)} disabled={isBusy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-all hover:brightness-110 disabled:opacity-50" style={{ color: "#fff", fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin" : ""}`} /> {a.url ? "Regenerar" : "Generar"}
                </button>
                <button onClick={() => toggleApprove(a.key)} disabled={!a.url} title={a.url ? "Aprobar esta pieza" : "Generá primero"} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] transition-all disabled:opacity-40" style={ap ? { backgroundColor: `${C.green}22`, border: `1px solid ${C.green}`, color: C.green } : { border: `1px solid ${C.ink}22`, color: C.inkSoft }}>
                  <Check className="w-3.5 h-3.5" /> {ap ? "Aprobada" : "Aprobar"}
                </button>
                <span className="ml-auto text-[10px]" style={{ color: `${C.ink}44` }}>≈US${ASSET_COST.toFixed(2)}</span>
              </div>
              <input value={notes[a.key] ?? ""} onChange={e => setNotes(n => ({ ...n, [a.key]: e.target.value }))} onBlur={e => saveNote(a.key, e.target.value)} placeholder="Nota de mejora (foco de diseño)…" title="Se suma al prompt de image-2 al regenerar" className="mt-1.5 w-full rounded-lg px-2 h-7 text-[11px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${notes[a.key] ? `${C.bright}44` : `${C.ink}18`}`, color: C.ink }} />
              {pieceErr[a.key] && <p className="text-[11px] mt-1 inline-flex items-start gap-1" style={{ color: "#f87171" }}><AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {pieceErr[a.key]}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  function identityCard(kind: "cover" | "back") {
    const asset = kind === "cover" ? assets?.cover : assets?.back;
    const title = kind === "cover" ? "Portada" : "Contraportada";
    const active = bust(asset?.activeUrl ?? null);
    const takes = asset?.takes ?? [];
    const hasTakes = takes.length > 0;
    const isBusy = busy === kind || busy === `${kind}:sel` || busy === `${kind}:up`;
    const ap = approved.has(kind);
    return (
      <div className="rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${ap ? `${C.green}55` : `${C.ink}14`}` }}>
        <div className="relative flex items-center justify-center" style={{ height: 200, backgroundColor: C.bg, borderBottom: `1px solid ${C.ink}0f` }}>
          {active
            ? <img src={active} alt={title} className="max-h-full max-w-full object-contain" style={{ opacity: isBusy ? 0.4 : 1 }} />
            : <div className="flex flex-col items-center gap-1.5" style={{ color: `${C.ink}33` }}><ImageIcon className="w-7 h-7" /><span className="text-[11px]">{hasTakes ? "elegí una toma abajo" : "sin generar"}</span></div>}
          {isBusy && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: C.teal }} /></div>}
          {active && <a href={active} target="_blank" rel="noreferrer" className="absolute top-1.5 right-1.5 w-7 h-7 inline-flex items-center justify-center rounded-lg" style={{ backgroundColor: `${C.bg}cc`, color: C.inkSoft }} title="Abrir en tamaño real"><ExternalLink className="w-3.5 h-3.5" /></a>}
        </div>
        <div className="p-3 flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-[13px]" style={{ fontFamily: D, fontWeight: 600, color: C.ink }}>{title}</p>
            <span className="text-[10px]" style={{ color: `${C.ink}44` }}>≈US${ASSET_COST.toFixed(2)}/toma</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hasTakes
              ? <button onClick={() => genIdentity(kind, 3)} disabled={isBusy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-all hover:brightness-110 disabled:opacity-50" style={{ color: "#fff", fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><Sparkles className="w-3.5 h-3.5" /> Generar 3 opciones</button>
              : <>
                  <button onClick={() => genIdentity(kind, 1)} disabled={isBusy} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-all hover:brightness-110 disabled:opacity-50" style={{ color: "#fff", fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><RefreshCw className={`w-3.5 h-3.5 ${isBusy ? "animate-spin" : ""}`} /> Regenerar</button>
                  <button onClick={() => genIdentity(kind, 3)} disabled={isBusy} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] transition-all disabled:opacity-50" style={{ border: `1px solid ${C.ink}22`, color: C.inkSoft }}><Sparkles className="w-3.5 h-3.5" /> +3</button>
                </>}
            <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] cursor-pointer transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}22`, color: C.inkSoft }} title="Subir una imagen de referencia (queda como ancla de marca)">
              <Upload className="w-3.5 h-3.5" /> Referencia
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadCanonical(kind, f); e.currentTarget.value = ""; }} />
            </label>
            <button onClick={() => toggleApprove(kind)} disabled={!active} className="ml-auto inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] transition-all disabled:opacity-40" style={ap ? { backgroundColor: `${C.green}22`, border: `1px solid ${C.green}`, color: C.green } : { border: `1px solid ${C.ink}22`, color: C.inkSoft }}><Check className="w-3.5 h-3.5" /> {ap ? "Aprobada" : "Aprobar"}</button>
          </div>
          {hasTakes && (
            <div className="mt-1">
              <p className="text-[10px] uppercase tracking-[0.12em] mb-1 inline-flex items-center gap-1" style={{ color: `${C.ink}55` }}><Clock className="w-3 h-3" /> Versiones ({takes.length})</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {takes.map(t => {
                  const isActive = t.file === asset?.active;
                  return (
                    <button key={t.file} onClick={() => !isActive && chooseTake(kind, t.file)} title={isActive ? "Toma activa" : "Volver a esta toma"} disabled={isBusy}
                      className="relative shrink-0 rounded-md overflow-hidden disabled:opacity-60" style={{ width: 46, height: 62, border: `2px solid ${isActive ? C.teal : `${C.ink}22`}` }}>
                      <img src={bust(t.url) ?? t.url} alt="toma" className="w-full h-full object-cover" />
                      {isActive && <span className="absolute bottom-0 inset-x-0 text-[7px] text-center" style={{ backgroundColor: `${C.teal}dd`, color: "#04120f" }}>activa</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <input value={notes[kind] ?? ""} onChange={e => setNotes(n => ({ ...n, [kind]: e.target.value }))} onBlur={e => saveNote(kind, e.target.value)} placeholder="Nota de mejora (foco de diseño)…" title="Se suma al prompt de image-2 al regenerar" className="mt-1.5 w-full rounded-lg px-2 h-7 text-[11px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${notes[kind] ? `${C.bright}44` : `${C.ink}18`}`, color: C.ink }} />
        </div>
      </div>
    );
  }

  const bookOpts = activeCert?.books ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Diseño · {activeCert?.code ?? certId.toUpperCase()}</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Auto Pages</h1>
            <SectionHelp title={AUTOPAGES_HELP.title} body={AUTOPAGES_HELP.body} />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* selector de libro (switch global con confirmación en el padre) */}
          <div className="inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" style={{ color: C.inkSoft }} />
            <select value={format} onChange={e => { const b = e.target.value; if (b && b !== format) onSwitchBook(certId, b); }} aria-label="Libro a diseñar"
              className="rounded-lg px-2.5 h-9 text-[13px] outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
              {bookOpts.map(b => { const on = b.enabled ?? b.status === "active"; return <option key={b.id} value={b.id} disabled={!on && b.id !== format}>{b.label}{!on ? " · próx" : ""}</option>; })}
            </select>
          </div>
          {credit && <span className="text-[12px] inline-flex items-center gap-1.5" style={{ color: C.inkSoft }}><Coins className="w-3.5 h-3.5" style={{ color: C.gold }} /> US${credit.remainingUsd.toFixed(2)}</span>}
          <button onClick={() => approveAll(presentKeys)} disabled={presentKeys.length === 0 || approvedCount === presentKeys.length} title="Aprobar todas las piezas con arte" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] transition-all hover:bg-white/5 disabled:opacity-40" style={{ border: `1px solid ${C.green}44`, color: C.green }}><Check className="w-3.5 h-3.5" /> Aprobar todo</button>
          <span className="text-[12px]" style={{ color: C.inkSoft }}>{approvedCount}/{totalPieces} aprob.</span>
          <button
            onClick={() => { if (locked) { setLocked(false); persistLock({ locked: false }); } else if (allApproved) { setLocked(true); persistLock({ locked: true, pieces: [...approved] }); } }}
            disabled={!locked && !allApproved}
            title={locked ? "Diseños bloqueados — clic para desbloquear" : allApproved ? "Bloquear los diseños del libro (habilita el armado en el Master timeline)" : "Aprobá todas las piezas para poder bloquear"}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] transition-all disabled:opacity-50"
            style={locked ? { backgroundColor: `${C.green}22`, border: `1px solid ${C.green}`, color: C.green } : { border: `1px solid ${allApproved ? C.green : `${C.ink}26`}`, color: allApproved ? C.green : C.inkSoft }}>
            {locked ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {locked ? "Bloqueado" : "Bloquear diseños"}
          </button>
        </div>
      </div>

      {msg && <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{msg}</p>}

      {/* fuente de marca (identidad heredada de otra cert) */}
      <div className="rounded-xl" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}14` }}>
        <button onClick={() => setBrandOpen(o => !o)} className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left">
          <Palette className="w-4 h-4" style={{ color: C.bright }} />
          <span className="text-[13px]" style={{ fontFamily: D, fontWeight: 600, color: C.ink }}>Fuente de marca</span>
          <span className="text-[11px]" style={{ color: C.inkSoft }}>{anchor?.source ? `heredando de ${anchor.source.certId.toUpperCase()} · ${labelForBook(anchor.source.format)}` : "ancla actual"}</span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${brandOpen ? "rotate-180" : ""}`} style={{ color: C.inkSoft }} />
        </button>
        {brandOpen && (
          <div className="px-3.5 pb-3.5 flex flex-wrap items-end gap-3">
            <div className="flex gap-1.5 shrink-0">
              {([["coverUrl", "portada"], ["backUrl", "contra"]] as const).map(([k, lbl]) => (
                <div key={k} className="w-14 h-[74px] rounded-md overflow-hidden relative" style={{ border: `1px solid ${C.ink}22`, backgroundColor: C.bg }}>
                  {anchor?.[k] ? <img src={bust(anchor[k]) ?? anchor[k]!} alt={`ancla ${lbl}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center" style={{ color: `${C.ink}33` }}><ImageIcon className="w-5 h-5" /></div>}
                  <span className="absolute bottom-0 inset-x-0 text-[7px] text-center" style={{ backgroundColor: `${C.bg}dd`, color: `${C.ink}88` }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div className="flex-1 min-w-[220px]">
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: C.inkSoft }}>Sembrá la identidad de la colección desde una cert ya diseñada (ej. el <strong style={{ color: C.ink }}>Master</strong>): su <strong style={{ color: C.ink }}>portada Y contraportada</strong> pasan a ser el ancla que heredan las próximas generaciones. <span style={{ color: `${C.ink}55` }}>(El ancla es por-cert: afecta las próximas portadas/contras de esta certificación.)</span></p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={brandCert} onChange={e => setBrandCert(e.target.value)} aria-label="Cert fuente" className="rounded-lg px-2.5 h-8 text-[12px] outline-none max-w-[200px]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                  {(azure?.certs ?? []).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
                </select>
                <select value={brandFmt} onChange={e => setBrandFmt(e.target.value)} aria-label="Libro fuente" className="rounded-lg px-2.5 h-8 text-[12px] outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                  {ALL_FORMATS.map(f => <option key={f} value={f}>{labelForBook(f)}</option>)}
                </select>
                <button onClick={seedBrand} disabled={busy === "brand"} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-all hover:brightness-110 disabled:opacity-50" style={{ color: "#fff", fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                  {busy === "brand" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Sembrar identidad
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: `1px solid ${C.ink}0f` }}>
                <span className="text-[11px]" style={{ color: C.inkSoft }}>Paleta de familia del formato →</span>
                <button onClick={applyPalette} disabled={busy === "palette"} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] transition-all hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.ink}26`, color: C.bright }}>
                  {busy === "palette" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Palette className="w-3.5 h-3.5" />} Aplicar paleta
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* identidad */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Identidad</p>
          <span className="text-[11px] hidden sm:inline" style={{ color: `${C.ink}44` }}>· portada + contraportada · 3 opciones la 1ª vez, con historial para volver</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">{identityCard("cover")}{identityCard("back")}</div>
      </div>

      {/* derivados de contenido */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>{isMaster ? "Abre-partes (por ruta)" : "Divisores de ruta"}</p>
          <span className="text-[11px] hidden sm:inline" style={{ color: `${C.ink}44` }}>· una por ruta · la marcada «plantilla» es la canonical que heredan las demás</span>
          <span className="ml-auto font-mono text-[10px]" style={{ color: `${C.ink}40` }}>{openers.length}</span>
        </div>
        {openers.length === 0 ? <p className="text-[12px]" style={{ color: C.inkSoft }}>Sin piezas todavía.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{openers.map(pieceCard)}</div>}
      </div>
      {isMaster && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Divisores de capítulo</p>
            <span className="text-[11px] hidden sm:inline" style={{ color: `${C.ink}44` }}>· apertura de cada capítulo · la marcada «plantilla» es la canonical que heredan los demás</span>
            <span className="ml-auto font-mono text-[10px]" style={{ color: `${C.ink}40` }}>{dividers.length}</span>
          </div>
          {dividers.length === 0 ? <p className="text-[12px]" style={{ color: C.inkSoft }}>Sin capítulos groundeados todavía.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{dividers.map(pieceCard)}</div>}
        </div>
      )}
    </div>
  );
}

/** Secciones del formato activo (viven en el sidebar). Grounding se movió al nivel GLOBAL. */
const SECTIONS: { id: StageId; label: string; icon: typeof FileText; enabled: boolean; soon?: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { id: "cuadrilla", label: "Cuadrilla IA", icon: Users, enabled: true },
  { id: "costos", label: "Costos y saldo", icon: Coins, enabled: true },
  { id: "contenido", label: "Contenido", icon: FileText, enabled: true },
  // "Generar" se fusionó en "Contenido": ya no está en el selector; la etapa "generar" sigue viva y se
  // accede desde Contenido (botones "Generar"/"Regenerar" y las tabs por capítulo). El sidebar resalta Contenido.
  { id: "galeria", label: "Galería", icon: Grid3x3, enabled: true },
  { id: "qa", label: "QA editorial", icon: ShieldCheck, enabled: true },
  { id: "aprobaciones", label: "Aprobaciones", icon: BadgeCheck, enabled: true },
  { id: "contrato", label: "Contrato", icon: Scale, enabled: true },
  { id: "exportar", label: "Exportar", icon: Download, enabled: true },
  { id: "ensamblar", label: "Ensamblar libro", icon: BookOpen, enabled: true },
];

/** Etapas cuyo sujeto es UNA página: muestran riel de páginas + preview contextual. */
const PAGE_STAGES = new Set<StageId>(["contenido", "generar", "qa"]);

/** Los 6 formatos del libro/cert. Hoy solo Visual Atlas está activo. */
const FORMATS: { id: string; label: string; icon: typeof FileText; active: boolean; state: string }[] = [
  { id: "visual-atlas", label: "Visual Atlas", icon: LayoutTemplate, active: true, state: "Producción activa" },
  { id: "master-book", label: "Master Book", icon: BookOpen, active: false, state: "Planificación" },
  { id: "exam-traps", label: "Exam Traps Guide", icon: AlertTriangle, active: false, state: "Pendiente de extracción" },
  { id: "question-bank", label: "Question Bank", icon: CircleDashed, active: false, state: "Planificación" },
  { id: "cheat-sheets", label: "Cheat Sheets", icon: FileText, active: false, state: "Planificación" },
  { id: "rapid-review", label: "Rapid Review", icon: Sparkles, active: false, state: "Planificación" },
];

const sectionLabel = (id: StageId) => SECTIONS.find(s => s.id === id)?.label ?? id;

function statusChip(p: EngineCatalogPage): { label: string; color: string } {
  const o = p.outputStatus;
  if (o.files.approved) return { label: "Aprobada", color: C.green };
  if (o.hasOutput) return { label: o.generationMode === "openai_image" ? "Generada" : "Borrador", color: o.generationMode === "openai_image" ? C.teal : C.gold };
  return { label: "Sin generar", color: C.inkSoft };
}

export default function EstudioIndesign() {
  const [, setLocation] = useLocation();
  const [catalog, setCatalog] = useState<EngineCatalog | null>(null);
  const [keyStatus, setKeyStatus] = useState<EngineKeyStatus | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [pageId, setPageId] = useState("01");
  const [stage, setStage] = useState<StageId>("dashboard");
  // Nivel de navegación: "global" (Grounding · Dashboard 6 libros · Timeline) vs "book" (stages del libro activo).
  const [view, setView] = useState<"global" | "book">("book");
  const [globalSection, setGlobalSection] = useState<GlobalSectionId>("grounding");
  // "Volver a la corrida" desde el badge flotante: enfocar Global/Timeline; el modal se auto-abre para el run activo.
  const { wantsFocus, clearFocus } = useCorridaRun();
  useEffect(() => { if (!wantsFocus) return; setView("global"); setGlobalSection("timeline"); clearFocus(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [wantsFocus]);
  // "runs" (Generación batch) se fusionó dentro de Generar (tab Lote) — redirige enlaces viejos.
  useEffect(() => { if (stage === "runs") setStage("generar"); }, [stage]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [seed, setSeed] = useState<EngineSeed | null>(null);
  const [reload, setReload] = useState(0);
  const [library, setLibrary] = useState<EngineLibraryTree | null>(null);
  const [recipes, setRecipes] = useState<EngineRecipe[]>([]);
  const [recipeId, setRecipeId] = useState("standard");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<EngineGenerateResult | null>(null);
  const [genErr, setGenErr] = useState("");
  const [decision, setDecision] = useState<EngineRecommendedAction | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [qa, setQa] = useState<EngineQASummary | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [prediction, setPrediction] = useState<EnginePrediction | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);
  const [chapters, setChapters] = useState<EngineChapter[]>([]);
  const [masterChapterId, setMasterChapterId] = useState<string>("");  // deep-link: fila del Dashboard → Contenido de ESE capítulo
  // Libro activo: el Master Book usa modelo de CAPÍTULO (no láminas). Se ramifica todo por acá.
  const activeBookId = library?.activeBookId ?? "visual-atlas";
  const activeCertId = library?.activeCertId ?? "ai-200";   // cert activo → base de assets de la galería (evita el bleed AI-200↔AB-620)
  const isMaster = activeBookId === "master-book";
  // Cambiar el TIPO de libro activo pasa por un modal de confirmación (evita activaciones accidentales por un click).
  const [pendingSwitch, setPendingSwitch] = useState<{ certId: string; bookId: string; stay?: boolean } | null>(null);
  const [switchingBook, setSwitchingBook] = useState(false);
  const confirmSwitchBook = async () => {
    if (!pendingSwitch) return;
    setSwitchingBook(true);
    try {
      const r = await switchBook(pendingSwitch.certId, pendingSwitch.bookId);
      if (r.ok) { setLibrary(r.tree); if (!pendingSwitch.stay) { setView("book"); setStage("dashboard"); } setReload(n => n + 1); setPendingSwitch(null); }
      else if (r.busy) { window.alert(r.error ?? "Hay una corrida en curso. Esperá a que termine para cambiar de libro."); }
    } finally { setSwitchingBook(false); }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr("");
    Promise.all([fetchEngineCatalog(), fetchEngineKeyStatus(), fetchEngineRecipes()])
      .then(([cat, ks, rec]) => {
        if (!alive) return;
        setCatalog(cat); setKeyStatus(ks); setRecipes(rec.recipes);
        if (cat.pages.length && !cat.pages.some(p => p.pageId === pageId)) setPageId(cat.pages[0].pageId);
      })
      .catch(e => { if (alive) setErr(String((e as Error).message || e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  // Árbol de biblioteca (3 nubes → certs → libros); refresca al activar.
  useEffect(() => {
    let alive = true;
    fetchLibraryTree().then(t => { if (alive) setLibrary(t); }).catch(() => { if (alive) setLibrary(null); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  // Capítulos del Master Book (galería + stages book-aware). Vacío para el Atlas.
  useEffect(() => {
    let alive = true;
    if (isMaster) fetchChapters().then(r => { if (alive) setChapters(r.chapters ?? []); }).catch(() => { if (alive) setChapters([]); });
    else setChapters([]);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMaster, reload]);

  async function handleGenerate(force = false, recipeOverride?: string) {
    if (!pageId) return;
    const useRecipe = recipeOverride ?? recipeId;
    setGenerating(true); setGenErr("");
    try {
      const result = await generateEnginePage(pageId, useRecipe, force);
      setGenResult(result);
      setReload(n => n + 1); // refresca catálogo → el preview toma la nueva salida
    } catch (e) {
      setGenErr(String((e as Error).message || e));
    } finally {
      setGenerating(false);
    }
  }

  function applyDecision(toRecipe: string) {
    setRecipeId(toRecipe);
    void handleGenerate(false, toRecipe);
  }

  useEffect(() => {
    let alive = true;
    if (!pageId) return;
    fetchEngineSeed(pageId).then(s => { if (alive) setSeed(s); }).catch(() => { if (alive) setSeed(null); });
    return () => { alive = false; };
  }, [pageId]);

  useEffect(() => {
    if (stage !== "componer" || !pageId) return;
    let alive = true;
    setDecisionLoading(true);
    fetchEngineDecision(pageId, recipeId)
      .then(d => { if (alive) setDecision(d); })
      .catch(() => { if (alive) setDecision(null); })
      .finally(() => { if (alive) setDecisionLoading(false); });
    return () => { alive = false; };
  }, [stage, pageId, recipeId, reload]);

  useEffect(() => {
    if (stage !== "qa" || !pageId) return;
    let alive = true;
    setQaLoading(true);
    fetchEngineQa(pageId)
      .then(q => { if (alive) setQa(q); })
      .catch(() => { if (alive) setQa(null); })
      .finally(() => { if (alive) setQaLoading(false); });
    return () => { alive = false; };
  }, [stage, pageId, reload]);

  // QA predictivo: estima el riesgo (microtexto / hueco / sobrecarga) de la
  // receta elegida ANTES de gastar imagen. Es el gate previo a gpt-image.
  useEffect(() => {
    if (stage !== "generar" || !pageId) return;
    let alive = true;
    setPredictionLoading(true);
    fetchEnginePrediction(pageId, recipeId)
      .then(p => { if (alive) setPrediction(p); })
      .catch(() => { if (alive) setPrediction(null); })
      .finally(() => { if (alive) setPredictionLoading(false); });
    return () => { alive = false; };
  }, [stage, pageId, recipeId, reload]);

  const page = catalog?.pages.find(p => p.pageId === pageId) ?? null;
  // El "riel de página" (PageSelector + stages contenido/generar/qa) es del Atlas (modelo lámina).
  // El Master usa su propio wrapper por CAPÍTULO (MasterContentStages).
  const isPageStage = !isMaster && PAGE_STAGES.has(stage);
  const isMasterContentStage = isMaster && PAGE_STAGES.has(stage);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      <Sidebar
        stage={stage}
        onSelect={(s) => { setView("book"); setStage(s); }}
        view={view}
        globalSection={globalSection}
        onSelectGlobal={(g) => { setView("global"); setGlobalSection(g); }}
        library={library}
        keyStatus={keyStatus}
        offline={!!err}
        onBack={() => setLocation("/estudio")}
        onExit={() => { logoutEstudio(); setLocation("/estudio"); }}
        onActivate={(certId, bookId) => setPendingSwitch({ certId, bookId })}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* ── barra de migas ── */}
        <header className="sticky top-0 z-30 backdrop-blur-md flex items-center justify-between gap-4 px-6 h-14" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
          <Breadcrumb stage={stage} bookLabel={library ? labelForBook(library.activeBookId) : "Visual Atlas"} globalSection={view === "global" ? globalSection : null} />
          <div className="flex items-center gap-3">
            <EngineBadge keyStatus={keyStatus} offline={!!err} />
            <button onClick={() => setReload(n => n + 1)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </button>
          </div>
        </header>

        {/* ── motor offline ── */}
        {!loading && err && (
          <div className="px-6 pt-5">
            <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={{ backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}33` }}>
              <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: C.gold }} />
              <div className="min-w-0">
                <p className="text-[14px]" style={{ color: C.ink, fontWeight: 600 }}>{err}</p>
                <p className="font-mono text-[12px] mt-0.5" style={{ color: `${C.ink}88` }}>pnpm --filter @workspace/studio-engine dev</p>
              </div>
              <button onClick={() => setReload(n => n + 1)} className="ml-auto inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm" style={{ border: `1px solid ${C.gold}66`, color: C.gold }}>
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 px-6 py-6">
          {view === "global" && (
            globalSection === "grounding"
              ? <GroundingStage reloadKey={reload} onReload={() => setReload(n => n + 1)} onPageCreated={(id) => { setPageId(id); setReload(n => n + 1); setView("book"); setStage("generar"); }} activeBookLabel={library ? labelForBook(library.activeBookId) : "Visual Atlas"} isMaster={isMaster} onChapterGrounded={(id) => { setMasterChapterId(id); setReload(n => n + 1); setView("book"); setStage("contenido"); }} />
              : globalSection === "dashboard"
                ? <DashboardGlobal reloadKey={reload} onOpenBook={(certId, bookId) => setPendingSwitch({ certId, bookId })} />
                : globalSection === "autopages"
                  ? <AutoPagesStage library={library} reloadKey={reload} onReload={() => setReload(n => n + 1)} onSwitchBook={(certId, bookId) => setPendingSwitch({ certId, bookId, stay: true })} />
                  : <BooksTimeline reloadKey={reload} onReload={() => setReload(n => n + 1)} onOpenBook={(certId, bookId) => setPendingSwitch({ certId, bookId })} activeFormat={library?.activeBookId ?? ""} onGateNav={(t) => { if (t === "autopages") { setView("global"); setGlobalSection("autopages"); } else if (t === "aprobaciones") { setView("book"); setStage("aprobaciones"); } else if (t === "qa") { setView("book"); setStage("qa"); } else { setLocation("/publicacion"); } }} />
          )}
          {view === "book" && (<>
          {stage === "dashboard" && (isMaster
            ? <DashboardMaster chapters={chapters} setStage={setStage} onOpenChapter={(id) => { setMasterChapterId(id); setStage("contenido"); }} />
            : <DashboardStage
              catalog={catalog}
              loading={loading}
              reloadKey={reload}
              onOpenContenido={() => setStage("contenido")}
              onPick={(id) => { setPageId(id); setStage("contenido"); }}
              onOpenQa={() => setStage("qa")}
              setStage={setStage}
              bookLabel={library ? labelForBook(library.activeBookId) : "Visual Atlas"}
            />)}

          {isPageStage && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PageSelector pages={catalog?.pages ?? []} pageId={pageId} setPageId={setPageId} loading={loading} onDeleted={(id) => { if (pageId === id) setPageId("01"); setReload(n => n + 1); }} />
                  <button onClick={() => setPreviewOpen(true)} disabled={!page?.outputStatus.htmlPath} title="Ver la página a tamaño grande, sin nada a los lados" className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-[12px] transition-all hover:bg-white/5 disabled:opacity-40 disabled:cursor-default" style={{ border: `1px solid ${C.ink}1f`, color: C.bright }}>
                    <Maximize2 className="w-3.5 h-3.5" /> Ver página
                  </button>
                </div>
                {catalog && <span className="text-[11px]" style={{ color: `${C.ink}55` }}>{catalog.pages.length}/{catalog.totalExpected} páginas</span>}
              </div>
              <StepFlow stage={stage} onSelect={setStage} />
              <section className="min-w-0">
                {stage === "contenido" && <ContenidoStage seed={seed} page={page} activeBookLabel={library ? labelForBook(library.activeBookId) : "Visual Atlas"} onOpenGrounding={() => setStage("grounding")} onReload={() => setReload(n => n + 1)} onPageCreated={(id) => { setPageId(id); setReload(n => n + 1); setStage("generar"); }} />}
                {stage === "generar" && <GenerarStage page={page} pages={catalog?.pages ?? []} reloadKey={reload} recipes={recipes} recipeId={recipeId} setRecipeId={setRecipeId} generating={generating} genResult={genResult} genErr={genErr} onGenerate={handleGenerate} prediction={prediction} predictionLoading={predictionLoading} hasKey={!!keyStatus?.hasKey} onReload={() => setReload(n => n + 1)} />}
                {stage === "componer" && <ComponerStage decision={decision} loading={decisionLoading} generating={generating} onApply={applyDecision} onRefresh={() => setReload(n => n + 1)} />}
                {stage === "qa" && <QAStage qa={qa} loading={qaLoading} onGenerate={() => setStage("generar")} pageId={pageId} recipeId={recipeId} hasKey={!!keyStatus?.hasKey} onReload={() => setReload(n => n + 1)} setStage={setStage} setPageId={setPageId} reloadKey={reload} />}
              </section>
            </div>
          )}

          {isMasterContentStage && <MasterContentStages chapters={chapters} stage={stage} setStage={setStage} onReload={() => setReload(n => n + 1)} initialChapterId={masterChapterId} certId={activeCertId} />}
          {stage === "galeria" && (isMaster
            ? <GaleriaMasterCapitulos chapters={chapters} certId={activeCertId} />
            : <GaleriaStage pages={catalog?.pages ?? []} reloadKey={reload} onReload={() => setReload(n => n + 1)} hasKey={!!keyStatus?.hasKey} setStage={setStage} setPageId={setPageId} certId={activeCertId} />)}
          {stage === "cuadrilla" && <CuadrillaStage reloadKey={reload} isMaster={isMaster} />}
          {stage === "costos" && <div className="max-w-[1100px]"><CostCreditPanel /></div>}
          {stage === "grounding" && <GroundingStage reloadKey={reload} onReload={() => setReload(n => n + 1)} onPageCreated={(id) => { setPageId(id); setReload(n => n + 1); setStage("generar"); }} activeBookLabel={library ? labelForBook(library.activeBookId) : "Visual Atlas"} isMaster={isMaster} onChapterGrounded={(id) => { setMasterChapterId(id); setReload(n => n + 1); setStage("contenido"); }} />}
          {stage === "catalogo" && <CatalogStage library={library} onActivated={() => setReload(n => n + 1)} onClose={() => setStage("dashboard")} />}
          {stage === "aprobaciones" && (isMaster
            ? <MasterAprobaciones chapters={chapters} reloadKey={reload} onReload={() => setReload(n => n + 1)} setStage={setStage} />
            : <AprobacionesStage pages={catalog?.pages ?? []} reloadKey={reload} onReload={() => setReload(n => n + 1)} setStage={setStage} setPageId={setPageId} />)}
          {stage === "contrato" && <ContratoStage pageId={pageId} reloadKey={reload} page={page} setStage={setStage} isMaster={isMaster} chapters={chapters} certId={activeCertId} />}
          {stage === "exportar" && (isMaster
            ? <MasterExportar chapters={chapters} setStage={setStage} />
            : <ExportarStage pages={catalog?.pages ?? []} reloadKey={reload} setStage={setStage} />)}
          {stage === "ensamblar" && (isMaster
            ? <EnsamblarMaster chapters={chapters} certId={activeCertId} />
            : <EnsamblarLibroStage reloadKey={reload} />)}
          </>)}
        </main>
      </div>
      {previewOpen && page && <PagePreviewModal page={page} onClose={() => setPreviewOpen(false)} />}
      {pendingSwitch && <SwitchBookModal label={labelForBook(pendingSwitch.bookId)} busy={switchingBook} onConfirm={confirmSwitchBook} onClose={() => { if (!switchingBook) setPendingSwitch(null); }} />}
    </div>
  );
}

/* ── PARTE B · Dashboard GLOBAL de los 6 libros de la familia ── */
function DashboardGlobal({ reloadKey, onOpenBook }: { reloadKey: number; onOpenBook: (certId: string, bookId: string) => void }) {
  const [data, setData] = useState<EngineLibraryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let a = true; setLoading(true); fetchLibraryMetrics().then(d => { if (a) setData(d); }).catch(() => { if (a) setData(null); }).finally(() => { if (a) setLoading(false); }); return () => { a = false; }; }, [reloadKey]);
  const credit = data?.credit;
  const enabledCount = data ? data.books.filter(b => b.enabled).length : 0;
  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Global · Familia AI-200</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Dashboard de los 6 libros</h1>
          <SectionHelp title="Dashboard global" body={["Costos y KPIs de la familia AI-200: los 6 formatos de libro, sus unidades (capítulos/láminas), aprobación, ensamblado y costo. Solo los ACTIVADOS tienen datos; el resto está 'próx'.", "El crédito de OpenAI es de la familia (uno solo). Activá/desactivá libros desde el Timeline."]} />
        </div>
        <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>{enabledCount} de 6 libros activados.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MiniStat label="Libros activados" value={`${enabledCount}/6`} />
        <MiniStat label="Costo total familia" value={`$${(data?.totalCostUsd ?? 0).toFixed(2)}`} />
        <MiniStat label="Crédito restante" value={credit ? `$${credit.remainingUsd.toFixed(2)}` : "—"} />
      </div>
      {loading && !data ? <p className="text-[13px] inline-flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando métricas…</p>
        : <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {data?.books.map(b => <BookMetricCard key={b.format} b={b} onOpenBook={onOpenBook} />)}
        </div>}
    </div>
  );
}

function BookMetricCard({ b, onOpenBook }: { b: EngineBookMetric; onOpenBook: (certId: string, bookId: string) => void }) {
  const grad = `linear-gradient(135deg, ${b.palette.bg}, ${b.palette.accent})`;
  return (
    <div className="rounded-2xl overflow-hidden flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${b.isActive ? `${C.teal}55` : b.enabled ? `${C.ink}1f` : `${C.ink}12`}`, opacity: b.enabled ? 1 : 0.72 }}>
      <div className="relative" style={{ height: 96, background: grad }}>
        {b.coverUrl && <img src={b.coverUrl} alt={b.label} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.92 }} />}
        <div className="absolute inset-0 flex items-end justify-between p-3" style={{ background: b.coverUrl ? "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" : "transparent" }}>
          <span className="text-[14px]" style={{ fontFamily: D, fontWeight: 800, color: "#fff" }}>{b.label}</span>
          {b.isActive ? <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: C.teal, color: "#04110d", fontWeight: 700 }}>activo</span>
            : !b.enabled ? <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.16)", color: "#fff" }}>próx</span> : null}
        </div>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {b.enabled ? (
          <>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <span style={{ color: C.inkSoft }}>{b.unitLabel}: <strong style={{ color: C.ink }}>{b.units}/{b.totalUnits}</strong></span>
              <span style={{ color: C.inkSoft }}>aprobados: <strong style={{ color: C.ink }}>{b.approved}</strong></span>
              <span style={{ color: C.inkSoft }}>costo: <strong style={{ color: C.ink }}>${b.costUsd.toFixed(2)}</strong></span>
              <span style={{ color: b.assembled ? C.teal : `${C.ink}66` }}>{b.assembled ? "ensamblado ✓" : "sin ensamblar"}</span>
            </div>
            {b.bookApproved && <span className="text-[11px] inline-flex items-center gap-1" style={{ color: C.teal }}><BadgeCheck className="w-3.5 h-3.5" /> libro aprobado</span>}
            {b.isActive
              ? <span className="text-[11px] mt-0.5" style={{ color: `${C.ink}55` }}>Libro de trabajo actual</span>
              : <button onClick={() => onOpenBook("ai-200", b.format)} className="mt-1 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] self-start hover:bg-white/5" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>Trabajar <ArrowRight className="w-3.5 h-3.5" /></button>}
          </>
        ) : <p className="text-[12px]" style={{ color: C.inkSoft }}>Aún no activado. Se enciende desde el Timeline.</p>}
      </div>
    </div>
  );
}

/* ── PARTE B · Timeline vistoso: las 6 carátulas avanzando por su proceso hasta la tienda ── */
const TIMELINE_STAGES = ["Grounding", "Contenido", "Generar", "QA", "Aprobado", "Ensamblado", "Publicado"];
/** Progreso REAL del libro por COMPLETITUD (units/totalUnits): una etapa se marca "hecha" solo si el
 *  libro completó esa etapa para TODO su alcance; un libro parcial (ej. 5/24) queda "En producción". */
function bookProgress(b: EngineBookMetric): { reached: boolean[]; currentIdx: number; label: string } {
  const total = Math.max(1, b.totalUnits);
  const has = b.units > 0;
  const complete = b.units >= total;                       // todas las unidades producidas
  const allApproved = complete && (b.approved >= total || b.bookApproved);
  const done = complete && b.assembled;
  const reached = [
    has || b.costUsd > 0,      // 0 Grounding (arrancó)
    complete,                  // 1 Contenido (todas escritas)
    complete,                  // 2 Generar
    complete,                  // 3 QA
    allApproved,               // 4 Aprobado
    done,                      // 5 Ensamblado (libro COMPLETO ensamblado)
    false,                     // 6 Publicado (tienda)
  ];
  let currentIdx: number, label: string;
  if (!has) { currentIdx = 0; label = "Sin arrancar"; }
  else if (!complete) { currentIdx = 2; label = `En producción (${b.units}/${total})`; }
  else if (!allApproved) { currentIdx = 4; label = "En aprobación"; }
  else if (!b.assembled) { currentIdx = 5; label = "Listo para ensamblar"; }
  else { currentIdx = 5; label = "Ensamblado"; }
  return { reached, currentIdx, label };
}
/* ── Plan D: corrida por libro. El estado y el orquestador (runBook) viven en el store de nivel app
     `lib/corrida-run-store` para sobrevivir a la navegación; acá solo se consume vía useCorridaRun. ── */

/** hh:mm:ss local para el log de ejecución. */
function fmtClock(ts: number): string { return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }

/** Formatea una duración en ms → "Xs" / "Xm Ys" / "Xh Ym". */
function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Checklist de fases OBLIGATORIAS + % (derivado de métricas, sin flipear el libro). El bullet de diseños se completa con el lock real cuando el libro es el activo. */
function bookChecklist(b: EngineBookMetric): { bullets: { n: number; label: string; done: boolean; detail: string }[]; pct: number } {
  const total = Math.max(1, b.totalUnits);
  const complete = b.units >= total;
  const approved = complete && (b.approved >= total || b.bookApproved);
  const assembled = complete && b.assembled;   // completitud-gated: consistente con el riel (bookProgress)
  const bullets = [
    { n: 1, label: "Grounding + contenido", done: complete, detail: `${b.units}/${total} ${b.unitLabel}${b.capstones ? ` · ${b.capstones} integradores` : ""}` },
    { n: 2, label: "Contenido aprobado", done: approved, detail: approved ? (b.bookApproved ? "libro aprobado" : `${b.approved}/${total}`) : (complete ? `${b.approved}/${total} aprobadas` : "requiere contenido completo") },
    { n: 3, label: "Diseños bloqueados (Auto Pages)", done: false, detail: "se verifica al correr" },
    { n: 4, label: "Ensamblado (PDF)", done: assembled, detail: assembled ? "listo" : (b.assembled ? `PDF parcial (${b.units}/${total})` : "pendiente") },
    { n: 5, label: "Publicación (precio/ficha)", done: false, detail: "cargar en Publicación" },
  ];
  const pct = Math.round(100 * (0.55 * Math.min(1, b.units / total) + 0.25 * Math.min(1, b.approved / total) + 0.20 * (b.assembled ? 1 : 0)));
  return { bullets, pct };
}

function BooksTimeline({ reloadKey, onReload, onOpenBook, onGateNav, activeFormat }: { reloadKey: number; onReload: () => void; onOpenBook: (certId: string, bookId: string) => void; onGateNav: (t: "autopages" | "aprobaciones" | "publicacion" | "qa") => void; activeFormat: string }) {
  const [data, setData] = useState<EngineLibraryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { run, startRun: runCorrida, cancelRun, dismissRun, progressVersion } = useCorridaRun();
  const [pendingRun, setPendingRun] = useState<{ fmt: string; kind: "content" | "design" | "complete"; missing: number; unitLabel: string; resumeFrom: "content" | "design" | "assemble" | "publish"; detected: string } | null>(null);
  const [regenPick, setRegenPick] = useState<string | null>(null);   // fmt del libro cuyo selector de regeneración está abierto
  const load = () => { setLoading(true); return fetchLibraryMetrics().then(setData).catch(() => setData(null)).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [reloadKey]);
  // Refresh en vivo de métricas mientras corre la corrida: el header "(x/24) · y%", la barra y los
  // bullets del modal avanzan solos (antes quedaban congelados hasta el próximo gate).
  useEffect(() => {
    if (!run?.running) return;
    const id = setInterval(() => { fetchLibraryMetrics().then(setData).catch(() => { /* noop */ }); }, 4000);
    return () => clearInterval(id);
  }, [run?.running]);
  // Refresco de métricas (parent + local) en las fronteras de fase de la corrida: el store bump-ea progressVersion.
  useEffect(() => { load(); onReload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [progressVersion]);
  // Re-attach al volver: si hay una corrida activa (corriendo o en gate), abrir su modal (sin pisar otro ya abierto).
  useEffect(() => { if (run && (run.running || run.gate)) setExpanded(prev => prev ?? run.format); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [run?.running, run?.gate?.kind, run?.format]);
  async function toggleEnable(fmt: string, enabled: boolean) {
    setBusy(fmt);
    try { await enableBook("ai-200", fmt, enabled); await load(); onReload(); } catch { /* noop */ } finally { setBusy(""); }
  }
  const metricOf = async (fmt: string) => (await fetchLibraryMetrics()).books.find(x => x.format === fmt);

  /** Paso 0: confirma el costo con un modal estilado si hay contenido por generar; si no, corre directo. */
  async function startRun(fmt: string) {
    if (run?.running) return;
    setExpanded(fmt);
    let m: EngineBookMetric | undefined;
    try { m = await metricOf(fmt); } catch { /* sin métricas → corre y se resuelve adentro */ }
    if (m && fmt === "master-book") {
      if (m.units < m.totalUnits) { setPendingRun({ fmt, kind: "content", missing: m.totalUnits - m.units, unitLabel: m.unitLabel, resumeFrom: "content", detected: `contenido (${m.totalUnits - m.units} ${m.unitLabel})` }); return; }
      // Contenido completo: ¿faltan assets de diseño (portadillas + hojas de ruta)? También consume crédito → confirmar.
      let missingDesign = 0;
      try { const a = await fetchDesignAssets(); missingDesign = Object.values(a.dividers ?? {}).filter(v => !v).length + Object.values(a.openers ?? {}).filter(v => !v).length; } catch { /* noop */ }
      if (missingDesign > 0) { setPendingRun({ fmt, kind: "design", missing: missingDesign, unitLabel: "assets de diseño", resumeFrom: "design", detected: `${missingDesign} assets de diseño (portadillas/hojas de ruta)` }); return; }
      // Contenido + diseño completos: BARRIDO fino (aprobado / bloqueado / ensamblado) → primera fase incompleta.
      const contentApproved = m.approved >= m.totalUnits || m.bookApproved;
      let designLocked = false; try { designLocked = (await fetchDesignLock()).locked; } catch { /* noop */ }
      let resumeFrom: "assemble" | "publish" = "publish"; let detected = "publicación (precio/ficha)";
      if (!contentApproved) { resumeFrom = "assemble"; detected = "aprobar el contenido"; }
      else if (!designLocked) { resumeFrom = "assemble"; detected = "bloquear los diseños (Auto Pages)"; }
      else if (!m.assembled) { resumeFrom = "assemble"; detected = "ensamblar el PDF"; }
      setPendingRun({ fmt, kind: "complete", missing: 0, unitLabel: "capítulos", resumeFrom, detected }); return;
    }
    void runCorrida(fmt);
  }

  /** Reintento: abre el SELECTOR para elegir qué capítulos regenerar (relato + portadilla) con force.
   *  Switchea al libro ANTES de abrir (si no, `fetchModules` del selector lee otro libro activo → 0 capítulos). */
  async function startRegen(fmt: string) {
    if (run?.running) return;
    setExpanded(fmt);
    try { await switchBook("ai-200", fmt); } catch { /* el modal avisa si no hay capítulos */ }
    setRegenPick(fmt);
  }


  const expandedBook = data?.books.find(b => b.format === expanded) ?? null;

  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Global · Corridas</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Master timeline</h1>
          <SectionHelp title="Master timeline" body={["Cada libro avanza por sus fases: Grounding → Contenido → Generar → QA → Aprobado → Diseños bloqueados → Ensamblado → QA de ruta (panel) → Publicación.", "«Correr»: ejecuta las fases automatizables y SE DETIENE en cada gate humano (aprobar contenido, bloquear diseños en Auto Pages, publicación). Tras (re)ensamblar corre el panel de QA por ruta (veredictos + métricas), respetando el tope de costo. «Expandir»: detalle por bullets + %."]} />
        </div>
        <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>Lanzá una corrida por libro; se frena en cada punto que requiere tu decisión.</p>
      </div>
      {loading && !data
        ? <p className="text-[13px] inline-flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</p>
        : <div className="flex flex-col gap-3">
          {data?.books.map(b => <TimelineRow key={b.format} b={b} busy={busy === b.format} running={!!run?.running && run.format === b.format} runDisabled={!!run?.running && run.format !== b.format} runPct={run?.running && run.format === b.format ? (() => { const i = activePhaseIdx(run.phase); const f = run.totalUnits > 0 ? run.unit / run.totalUnits : 0; return i >= 0 ? Math.round(((i + f) / RUN_PHASES.length) * 100) : 0; })() : null} onEnable={() => toggleEnable(b.format, !b.enabled)} onOpen={() => onOpenBook("ai-200", b.format)} onExpand={() => setExpanded(b.format)} onRun={() => startRun(b.format)} />)}
        </div>}

      {expandedBook && <BookPhaseModal b={expandedBook} run={run?.format === expandedBook.format ? run : null} isActive={expandedBook.format === activeFormat} onClose={() => setExpanded(null)} onRun={() => startRun(expandedBook.format)} onRegen={() => startRegen(expandedBook.format)} onCancel={cancelRun} onGateNav={onGateNav} onReload={() => { load(); onReload(); }} onForceUnlock={() => { unlockLibrary().catch(() => { /* noop */ }).finally(() => runCorrida(expandedBook.format)); }} onFinish={dismissRun} />}

      {pendingRun && <RunConfirmModal kind={pendingRun.kind} missing={pendingRun.missing} unitLabel={pendingRun.unitLabel} detected={pendingRun.detected}
        onContinue={() => { const f = pendingRun.fmt; const rf = pendingRun.resumeFrom; setPendingRun(null); void runCorrida(f, { resumeFrom: rf }); }}
        onRegenDividers={() => { const f = pendingRun.fmt; setPendingRun(null); void runCorrida(f, { regenDividers: true }); }}
        onRegenDesign={() => { const f = pendingRun.fmt; setPendingRun(null); void runCorrida(f, { regenDividers: true, regenFigures: true }); }}
        onRegenAll={async () => { const f = pendingRun.fmt; setPendingRun(null); try { await switchBook("ai-200", f); const ids = (await fetchModules()).modules.map(mm => mm.moduleId); if (ids.length) void runCorrida(f, { regenModuleIds: ids }); else void runCorrida(f, { regenDividers: true, regenFigures: true }); } catch { void runCorrida(f, { regenDividers: true, regenFigures: true }); } }}
        onClose={() => setPendingRun(null)} />}

      {regenPick && <RegenSelectModal onConfirm={(ids) => { const f = regenPick; setRegenPick(null); if (ids.length) void runCorrida(f, { regenModuleIds: ids }); }} onClose={() => setRegenPick(null)} />}
    </div>
  );
}

function TimelineRow({ b, busy, running, runDisabled, runPct, onEnable, onOpen, onExpand, onRun }: { b: EngineBookMetric; busy: boolean; running: boolean; runDisabled: boolean; runPct?: number | null; onEnable: () => void; onOpen: () => void; onExpand: () => void; onRun: () => void }) {
  const grad = `linear-gradient(135deg, ${b.palette.bg}, ${b.palette.accent})`;
  const { reached, currentIdx, label: stageLabel } = bookProgress(b);
  const { pct } = bookChecklist(b);
  const shownPct = running && runPct != null ? runPct : pct;   // mientras corre, el % de la fila refleja la ejecución
  const lastI = TIMELINE_STAGES.length - 1;
  return (
    <div className="rounded-2xl p-4 flex gap-4 items-center flex-wrap" style={{ backgroundColor: C.card, border: `1px solid ${running ? C.violet : b.isActive ? `${C.teal}55` : b.enabled ? `${C.ink}1f` : `${C.ink}12`}`, opacity: b.enabled ? 1 : 0.82 }}>
      {/* carátula (o gradiente de paleta) */}
      <div className="relative rounded-lg overflow-hidden shrink-0" style={{ width: 64, aspectRatio: "1024 / 1536", background: grad }}>
        {b.coverUrl && <img src={b.coverUrl} alt={b.label} className="absolute inset-0 w-full h-full object-cover" />}
        {!b.enabled && <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}><Lock className="w-4 h-4" style={{ color: "#fff" }} /></div>}
      </div>
      {/* nombre + riel */}
      <div className="flex-1 min-w-[300px]">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{b.label}</span>
          {b.isActive && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${C.teal}22`, color: C.teal, border: `1px solid ${C.teal}55` }}>en trabajo</span>}
          {running && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full inline-flex items-center gap-1" style={{ backgroundColor: `${C.violet}22`, color: C.bright, border: `1px solid ${C.violet}55` }}><Loader2 className="w-2.5 h-2.5 animate-spin" /> corriendo</span>}
          {!b.enabled && <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full" style={{ color: `${C.ink}55`, border: `1px solid ${C.ink}1f` }}>próx</span>}
          {b.enabled && <span className="ml-auto text-[10px] font-mono" style={{ color: `${C.ink}66` }}>{shownPct}%</span>}
        </div>
        {/* riel de etapas — se LLENA proporcional al % de avance (mismo número que el modal); el nodo Publicado queda apagado hasta publicar */}
        <div className="flex items-center">
          {(() => {
            const p = b.enabled ? (shownPct / 100) * lastI : 0;   // posición continua sobre el riel (0..lastI); en vivo mientras corre
            return TIMELINE_STAGES.flatMap((st, i) => {
              const passed = b.enabled && i < lastI && p >= i - 0.001;   // el fill pasó por este nodo (Publicado nunca por progreso)
              const current = i === currentIdx && b.enabled;
              const lit = passed || (b.enabled && reached[i]) || current;
              const els = [];
              if (i > 0) {
                const segFill = Math.max(0, Math.min(1, p - (i - 1)));
                els.push(
                  <div key={`l${i}`} className="flex-1 h-[3px] rounded-full relative overflow-hidden" style={{ backgroundColor: `${C.ink}18` }}>
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${segFill * 100}%`, backgroundColor: b.palette.accent, transition: "width .3s" }} />
                  </div>
                );
              }
              els.push(
                <span key={`n${i}`} title={st} className="rounded-full flex items-center justify-center shrink-0" style={{ width: current ? 15 : 11, height: current ? 15 : 11, backgroundColor: lit ? b.palette.accent : `${C.ink}1f`, boxShadow: current ? `0 0 0 4px ${b.palette.accent}33` : "none", transition: "all .25s" }} />
              );
              return els;
            });
          })()}
        </div>
        {/* pie: etapa actual + publicación */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: b.enabled ? `${C.ink}77` : `${C.ink}44` }}>{b.enabled ? stageLabel : "no activado"}</span>
          <span className="text-[10px] inline-flex items-center gap-1" style={{ color: `${C.ink}44` }}>{TIMELINE_STAGES[lastI]}</span>
        </div>
      </div>
      {/* acciones */}
      <div className="flex flex-col items-stretch gap-1.5 shrink-0" style={{ minWidth: 132 }}>
        {!b.enabled
          ? <button onClick={onEnable} disabled={busy} className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-white hover:brightness-110 disabled:opacity-60" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Activar libro</button>
          : <>
              <button onClick={onRun} disabled={running || runDisabled} title={runDisabled ? "Hay otra corrida en curso" : "Correr la corrida hasta el próximo gate"} className="inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-white hover:brightness-110 disabled:opacity-50" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>{running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {running ? "Corriendo…" : "Correr"}</button>
              <button onClick={onExpand} className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-full text-[11px] hover:bg-white/5" style={{ border: `1px solid ${running ? C.violet : `${C.ink}26`}`, color: running ? C.bright : C.inkSoft }}><Maximize2 className="w-3.5 h-3.5" /> {running ? "Ver corrida" : "Expandir"}</button>
            </>}
        {b.enabled && <span className="text-[10px] text-center" style={{ color: `${C.ink}44` }}>{b.units}/{b.totalUnits} {b.unitLabel}{b.capstones ? ` +${b.capstones} integr.` : ""}{b.costUsd > 0 ? ` · $${b.costUsd.toFixed(2)}` : ""}</span>}
      </div>
    </div>
  );
}

/* Fases ORDENADAS de la corrida (para mostrar TODAS con su barra, no una sola). Se matchean por el label que pone `set()`. */
/* RUN_PHASES + activePhaseIdx se importan de `lib/corrida-run-store` (fuente única del riel/modal/badge). */

/* ── modal por libro: bullets numerados + % + control de corrida / gate + publicación ── */
function BookPhaseModal({ b, run, isActive, onClose, onRun, onRegen, onCancel, onGateNav, onReload, onForceUnlock, onFinish }: { b: EngineBookMetric; run: RunState | null; isActive: boolean; onClose: () => void; onRun: () => void; onRegen: () => void; onCancel: () => void; onGateNav: (t: "autopages" | "aprobaciones" | "publicacion" | "qa") => void; onReload: () => void; onForceUnlock: () => void; onFinish: () => void }) {
  const { bullets, pct } = bookChecklist(b);
  const [locked, setLocked] = useState<boolean | null>(null);
  const [price, setPrice] = useState("");
  const [isbn, setIsbn] = useState("");
  const [savingPub, setSavingPub] = useState(false);
  const [pubMsg, setPubMsg] = useState("");
  const [timing, setTiming] = useState<EngineCorridaTiming | null>(null);
  const [acting, setActing] = useState("");
  useEffect(() => {
    if (!isActive) { setLocked(null); setTiming(null); return; }
    let a = true;
    fetchDesignLock().then(l => { if (a) setLocked(l.locked); }).catch(() => { /* noop */ });
    fetchBookConfig().then(c => { if (a) { setPrice(c.backCover.price ?? ""); setIsbn(c.backCover.isbn ?? ""); } }).catch(() => { /* noop */ });
    fetchCorridaTiming().then(t => { if (a) setTiming(t); }).catch(() => { /* noop */ });
    return () => { a = false; };
  }, [isActive, b.format, run?.gate?.kind, run?.running]);
  const bl = bullets.map(x => x.n === 3 && locked !== null ? { ...x, done: locked, detail: locked ? "bloqueado" : "no bloqueado" } : x);
  const gate = run?.gate ?? null;
  const running = !!run?.running;
  const aIdx = run ? activePhaseIdx(run.phase) : -1;
  const fracActive = run && run.totalUnits > 0 ? run.unit / run.totalUnits : 0;
  const runPct = aIdx >= 0 ? Math.round(((aIdx + fracActive) / RUN_PHASES.length) * 100) : 0;
  const displayPct = running ? runPct : pct;   // mientras corre, el % refleja la EJECUCIÓN (no el estado viejo del libro)

  async function savePub() {
    setSavingPub(true); setPubMsg("");
    try { const c = await fetchBookConfig(); await saveBookConfig({ backCover: { ...c.backCover, price, isbn } }); setPubMsg("Guardado — impacta la contraportada del PDF."); onReload(); }
    catch { setPubMsg("No se pudo guardar."); }
    finally { setSavingPub(false); }
  }
  // Acciones INLINE de los gates: hacer el paso pendiente sin salir del timeline y seguir la corrida.
  async function doApproveInline() { setActing("approve"); try { await approveBook(true); onReload(); onRun(); } catch { /* noop */ } finally { setActing(""); } }
  async function doLockInline() { setActing("lock"); try { await updateDesignLock({ locked: true }); onReload(); onRun(); } catch { /* noop */ } finally { setActing(""); } }

  const gateColor = gate?.kind === "error" ? "#f87171" : gate?.kind === "publish" ? C.green : C.gold;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.68)", backdropFilter: "blur(4px)" }} />
      <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[560px] rounded-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative rounded-md overflow-hidden shrink-0" style={{ width: 44, aspectRatio: "1024/1536", background: `linear-gradient(135deg, ${b.palette.bg}, ${b.palette.accent})` }}>{b.coverUrl && <img src={b.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}</div>
          <div className="min-w-0">
            <h2 className="text-[16px] tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{b.label}</h2>
            <p className="text-[11px]" style={{ color: C.inkSoft }}>{running ? `Corriendo · ${displayPct}% de avance` : `${bookProgress(b).label} · ${pct}% de avance`}</p>
          </div>
          <button onClick={onClose} className="ml-auto w-8 h-8 inline-flex items-center justify-center rounded-full" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
        </div>

        {/* barra de % (en vivo mientras corre) */}
        <div className="h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: `${C.ink}14` }}><div className="h-full rounded-full transition-all" style={{ width: `${displayPct}%`, background: `linear-gradient(90deg, ${b.palette.accent}, ${C.teal})` }} /></div>

        {/* bullets numerados obligatorios */}
        <div className="flex flex-col gap-2 mb-4">
          {bl.map(x => (
            <div key={x.n} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] shrink-0" style={x.done ? { backgroundColor: C.green, color: "#04120f", fontWeight: 700 } : { border: `1px solid ${C.ink}33`, color: `${C.ink}66` }}>{x.done ? <Check className="w-3 h-3" /> : x.n}</span>
              <span className="text-[13px]" style={{ color: x.done ? C.ink : C.inkSoft }}>{x.label}</span>
              <span className="ml-auto text-[11px]" style={{ color: `${C.ink}55` }}>{x.detail}</span>
            </div>
          ))}
        </div>

        {/* tiempos de la corrida: automático (sin aprobaciones) + con aprobaciones (reloj de pared). Siempre visible. */}
        <div className="rounded-xl px-3.5 py-2.5 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] inline-flex items-center gap-1" style={{ color: `${C.ink}55` }}><Clock className="w-3 h-3" /> Tiempos</span>
          {isActive && timing && timing.startedAt ? (
            <>
              <span className="text-[12px]" style={{ color: C.inkSoft }}>Automático: <strong style={{ color: C.ink }}>{fmtDur(timing.autoMs)}</strong></span>
              <span className="text-[12px]" style={{ color: C.inkSoft }}>Con aprobaciones: <strong style={{ color: timing.finishedAt ? C.green : C.gold }}>{timing.finishedAt ? fmtDur(new Date(timing.finishedAt).getTime() - new Date(timing.startedAt).getTime()) : "en curso"}</strong></span>
              <button onClick={() => updateCorridaTiming({ reset: true }).then(setTiming).catch(() => { /* noop */ })} className="ml-auto text-[10px] hover:underline" style={{ color: `${C.ink}44` }}>reiniciar</button>
            </>
          ) : (
            <span className="text-[12px]" style={{ color: `${C.ink}55` }}>sin corridas aún — se mide al darle {isActive ? "Correr" : "Correr (abrí este libro primero)"}</span>
          )}
        </div>

        {/* corrida: progreso / gate */}
        {running ? (
          <div className="rounded-xl px-3.5 py-3 mb-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.violet}44` }}>
            <p className="text-[12px] inline-flex items-center gap-2" style={{ color: C.bright }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> {run?.phase}</p>
            {run?.detail && <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>{run.detail}</p>}
            {/* barras POR FASE (todas visibles): done=check · activa=spinner+barra+unit/total · pendiente=tenue */}
            <div className="mt-2.5 flex flex-col gap-1.5">
              {RUN_PHASES.map((p, idx) => {
                const state = aIdx < 0 ? "pending" : idx < aIdx ? "done" : idx === aIdx ? "active" : "pending";
                const frac = state === "done" ? 1 : state === "active" ? fracActive : 0;
                return (
                  <div key={p.key} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 inline-flex items-center justify-center">
                      {state === "done" ? <Check className="w-3 h-3" style={{ color: C.teal }} /> : state === "active" ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: C.violet }} /> : <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${C.ink}30` }} />}
                    </span>
                    <span className="text-[11px] w-[74px] shrink-0" style={{ color: state === "pending" ? `${C.ink}55` : C.ink }}>{p.label}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(frac * 100)}%`, background: state === "active" ? `linear-gradient(90deg, ${C.violet}, ${C.teal})` : C.teal }} />
                    </div>
                    {state === "active" && !!run && run.totalUnits > 0 && <span className="text-[10px] tabular-nums w-9 text-right shrink-0" style={{ color: `${C.ink}66` }}>{run.unit}/{run.totalUnits}</span>}
                  </div>
                );
              })}
            </div>
            {/* log de ejecución con hora (más reciente arriba) */}
            {!!run?.log?.length && (
              <div className="mt-2.5 rounded-lg max-h-40 overflow-y-auto px-2.5 py-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                {[...run.log].reverse().map((e, i) => (
                  <p key={run.log.length - i} className="font-mono text-[10px] leading-relaxed" style={{ color: `${C.ink}88` }}><span style={{ color: `${C.ink}55` }}>{fmtClock(e.ts)}</span> · {e.msg}</p>
                ))}
              </div>
            )}
            <div className="mt-2.5 flex items-center gap-3">
              <button onClick={onClose} className="text-[11px] inline-flex items-center gap-1 hover:underline" style={{ color: C.bright }}>Minimizar (sigue en segundo plano)</button>
              <button onClick={onCancel} className="text-[11px] inline-flex items-center gap-1" style={{ color: "#f87171" }}><X className="w-3 h-3" /> Cancelar corrida</button>
            </div>
          </div>
        ) : gate ? (
          <div className="rounded-xl px-3.5 py-3 mb-3" style={{ backgroundColor: C.bg, border: `1px solid ${gateColor}55` }}>
            <p className="text-[12px] inline-flex items-center gap-2" style={{ color: gateColor }}>{gate.kind === "error" ? <AlertTriangle className="w-3.5 h-3.5" /> : gate.kind === "publish" ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />} {gate.msg}</p>
            {gate.kind === "approve" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={doApproveInline} disabled={acting === "approve"} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] disabled:opacity-50" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>{acting === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar libro y seguir</button>
                <button onClick={() => onGateNav("aprobaciones")} className="text-[11px] hover:underline" style={{ color: C.bright }}>revisar aprobaciones →</button>
              </div>
            )}
            {gate.kind === "review" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => onGateNav("qa")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px]" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>Ir a QA → Revisión <ArrowRight className="w-3.5 h-3.5" /></button>
                <span className="text-[11px]" style={{ color: C.inkSoft }}>Resolvé los claims contestados y reanudá la corrida.</span>
              </div>
            )}
            {gate.kind === "lock" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => onGateNav("autopages")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px]" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>Ir a Auto Pages <ArrowRight className="w-3.5 h-3.5" /></button>
                <button onClick={doLockInline} disabled={acting === "lock"} title="Bloquear los diseños actuales y seguir la corrida" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] disabled:opacity-50" style={{ border: `1px solid ${C.green}55`, color: C.green }}>{acting === "lock" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Bloquear y seguir</button>
              </div>
            )}
            {gate.kind === "content" && /en curso/i.test(gate.msg) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => { setActing("unlock"); onForceUnlock(); }} disabled={acting === "unlock"} title="Liberar un candado que quedó tomado por una corrida anterior (sesión muerta) y reintentar" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] disabled:opacity-50" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>{acting === "unlock" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />} Liberar candado y reintentar</button>
              </div>
            )}
            {gate.kind === "publish" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => onGateNav("publicacion")} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px]" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>Ir a Publicación <ArrowRight className="w-3.5 h-3.5" /></button>
                <button onClick={onFinish} title="Cerrar la corrida: el libro ya está listo. Publicación es el paso manual del lanzamiento (aún mockup)." className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px]" style={{ border: `1px solid ${C.teal}55`, color: C.teal }}><Check className="w-3.5 h-3.5" /> Finalizar corrida</button>
              </div>
            )}
          </div>
        ) : null}

        {/* publicación (mini-form precio/ISBN, sólo para el libro activo) */}
        {isActive && (gate?.kind === "publish" || b.assembled) && (
          <div className="rounded-xl px-3.5 py-3 mb-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2 inline-flex items-center gap-1.5" style={{ color: C.green }}><Coins className="w-3.5 h-3.5" /> Publicación · precio + ISBN</p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1"><span className="text-[10px]" style={{ color: C.inkSoft }}>Precio (USD)</span><input value={price} onChange={e => setPrice(e.target.value)} placeholder="19.99" className="rounded-lg px-2.5 h-8 text-[12px] w-[100px] outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }} /></label>
              <label className="flex flex-col gap-1 flex-1 min-w-[160px]"><span className="text-[10px]" style={{ color: C.inkSoft }}>ISBN</span><input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-987-…" className="rounded-lg px-2.5 h-8 text-[12px] w-full outline-none" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }} /></label>
              <button onClick={savePub} disabled={savingPub} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] disabled:opacity-50" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 }}>{savingPub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar</button>
            </div>
            {pubMsg && <p className="text-[11px] mt-2" style={{ color: C.teal }}>{pubMsg}</p>}
            <button onClick={() => onGateNav("publicacion")} className="mt-2 text-[11px] inline-flex items-center gap-1 hover:underline" style={{ color: C.bright }}>Abrir ficha completa (/publicación) <ArrowRight className="w-3 h-3" /></button>
          </div>
        )}

        {/* correr / regenerar */}
        <div className="flex items-center justify-end gap-2">
          {!running && b.format === "master-book" && b.units > 0 && (
            <button onClick={onRegen} title="Elegí qué capítulos rehacer (relato + portadilla) — usalo si el contenido salió mal" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] hover:brightness-110" style={{ border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: D, fontWeight: 600 }}><RefreshCw className="w-3.5 h-3.5" /> Regenerar contenido</button>
          )}
          {!running && <button onClick={onRun} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[13px] text-white hover:brightness-110" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}><Play className="w-3.5 h-3.5" /> {gate ? "Reintentar" : "Correr"}</button>}
        </div>
      </div>
    </div>
  );
}

/* ── modal de página a tamaño grande (sin nada a los lados): la página respira ── */
function PagePreviewModal({ page, onClose }: { page: EngineCatalogPage; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const o = page.outputStatus;
  const v = encodeURIComponent(page.imageGeneratedAt ?? o.generatedAt ?? "");
  const real = o.generationMode === "openai_image";
  // El page.html se sirve por el MOTOR (/engine/...); Vite intercepta los .html del publicDir y devuelve el SPA.
  const htmlUrl = o.htmlPath ? `/engine/page-html/${encodeURIComponent(page.pageId)}?v=${v}` : null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center" style={{ backgroundColor: "rgba(6,8,16,0.88)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full flex items-center justify-between px-5 h-14 shrink-0" style={{ color: C.ink }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-[11px] shrink-0" style={{ fontFamily: D, fontWeight: 700 }}>Pág. {page.pageNumber}</span>
          <span className="text-[13px] truncate" style={{ color: C.inkSoft }}>{page.title}</span>
          {o.hasOutput && <span className="text-[9px] uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded" style={{ color: real ? C.teal : C.gold, border: `1px solid ${(real ? C.teal : C.gold)}44` }}>{real ? "real" : "placeholder"}</span>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {htmlUrl && <a href={htmlUrl} target="_blank" rel="noopener noreferrer" className="text-[12px] inline-flex items-center gap-1.5 hover:underline" style={{ color: C.bright }}><ExternalLink className="w-3.5 h-3.5" /> Abrir en pestaña</a>}
          <button onClick={onClose} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] transition-all hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><X className="w-3.5 h-3.5" /> Cerrar (Esc)</button>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full flex items-center justify-center pb-5 px-5" onClick={(e) => e.stopPropagation()}>
        {htmlUrl ? (
          /* aspecto 768×1152 (2:3): alto el del viewport, ancho proporcional, centrado, sin nada a los lados */
          <div style={{ height: "100%", aspectRatio: "768 / 1152", maxWidth: "100%", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8)", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
            <iframe title="página completa" src={htmlUrl} style={{ width: "768px", height: "1152px", border: "none", transformOrigin: "top left", display: "block" }}
              ref={(el) => { if (el) { const h = el.parentElement!.clientHeight; el.style.transform = `scale(${h / 1152})`; } }} />
          </div>
        ) : (
          <p className="text-sm" style={{ color: C.inkSoft }}>Esta página todavía no se generó.</p>
        )}
      </div>
    </div>
  );
}

/* ── nodo de NUBE en el árbol: acordeón; Azure trae Act. Certs + sus certs ── */
function CloudNode({ cloud, stage, onSelect, onActivate }: { cloud: EngineLibCloud; stage: StageId; onSelect: (s: StageId) => void; onActivate: (certId: string, bookId: string) => void }) {
  const isActive = cloud.status === "active";
  const [open, setOpen] = useState(isActive);
  const activeCerts = cloud.certs.filter(c => c.status === "active");
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-1.5 pl-4 pr-2 h-7 text-[12px] rounded-md transition-all hover:bg-white/5" aria-expanded={open}>
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}66` }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}66` }} />}
        <Cloud className="w-3.5 h-3.5 shrink-0" style={{ color: isActive ? C.blue : `${C.ink}40` }} />
        <span className="truncate" style={{ color: isActive ? C.ink : `${C.ink}55`, fontFamily: D, fontWeight: 600 }}>{cloud.label}</span>
        {!isActive && <span className="ml-auto text-[8px] uppercase tracking-wide shrink-0" style={{ color: `${C.ink}33` }}>próx</span>}
      </button>
      {open && (
        <div className="flex flex-col">
          {isActive ? (
            <>
              <button onClick={() => onSelect("catalogo")} className="w-full flex items-center gap-1.5 pl-8 pr-2 h-7 text-[12px] rounded-md transition-all hover:bg-white/5" style={{ color: stage === "catalogo" ? "#fff" : C.bright, fontWeight: 600 }}>
                <Plus className="w-3.5 h-3.5 shrink-0" /> Act. Certs
              </button>
              {activeCerts.map(cert => <CertNode key={cert.id} cert={cert} onActivate={onActivate} />)}
            </>
          ) : (
            <p className="pl-9 py-1 text-[11px]" style={{ color: `${C.ink}40` }}>Catálogo próximamente.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── nodo de CERTIFICACIÓN: acordeón de sus libros/formatos ── */
function CertNode({ cert, onActivate }: { cert: EngineLibCert; onActivate: (certId: string, bookId: string) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-1.5 pl-8 pr-2 h-7 text-[12px] rounded-md transition-all hover:bg-white/5" style={{ color: C.ink, fontFamily: D, fontWeight: 600 }} aria-expanded={open}>
        {open ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: `${C.ink}66` }} /> : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: `${C.ink}66` }} />}
        <span className="truncate">{cert.code}</span>
        <span className="ml-auto text-[9px] font-mono shrink-0" style={{ color: `${C.ink}40` }}>{cert.books.length}</span>
      </button>
      {open && (
        <div className="pl-11 flex flex-col">
          {cert.books.map(b => {
            const Icon = libIcon(b.icon);
            const current = b.status === "active";           // libro de trabajo actual
            const enabled = b.enabled ?? current;            // activado (switcheable)
            return (
              <button key={b.id} disabled={!enabled} onClick={() => enabled && !current && onActivate(cert.id, b.id)}
                className={`w-full flex items-center gap-1.5 h-7 text-[12px] rounded-md transition-all text-left disabled:cursor-default ${enabled && !current ? "hover:bg-white/5" : ""}`}
                style={{ color: current ? C.ink : enabled ? `${C.ink}88` : `${C.ink}30` }}
                title={current ? `${b.label} · libro de trabajo` : enabled ? `Cambiar a ${b.label}` : `${b.label} · próximamente`}>
                <Icon className="w-3 h-3 shrink-0" style={{ color: current ? C.violet : enabled ? `${C.ink}55` : `${C.ink}22` }} />
                <span className="truncate" style={{ fontWeight: current ? 600 : 400 }}>{b.label}</span>
                {current
                  ? <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: C.teal }} />
                  : enabled
                    ? <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: `${C.teal}66` }} />
                    : <span className="ml-auto text-[8px] uppercase tracking-wide shrink-0 px-1 rounded" style={{ color: `${C.ink}40`, border: `1px solid ${C.ink}1f` }}>próx</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── sidebar: árbol de biblioteca + secciones + motor/usuario (contiene todo) ── */
function Sidebar({ stage, onSelect, view, globalSection, onSelectGlobal, library, keyStatus, offline, onBack, onExit, onActivate }: {
  stage: StageId;
  onSelect: (s: StageId) => void;
  view: "global" | "book";
  globalSection: GlobalSectionId;
  onSelectGlobal: (g: GlobalSectionId) => void;
  library: EngineLibraryTree | null;
  keyStatus: EngineKeyStatus | null;
  offline: boolean;
  onBack: () => void;
  onExit: () => void;
  onActivate: (certId: string, bookId: string) => void;
}) {
  // Ambos libros muestran todas las secciones; "Exportar" ahora tiene su propia versión por libro
  // (Master = PDF del libro + PDF por capítulo; Atlas = export por-página). Ver dispatch de "exportar".
  const sections = SECTIONS;
  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen overflow-y-auto flex flex-col" style={{ backgroundColor: C.bgAlt, borderRight: `1px solid ${C.ink}14` }}>
      {/* marca */}
      <div className="px-4 h-14 flex items-center gap-2 shrink-0" style={{ borderBottom: `1px solid ${C.ink}12` }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.violet}1f`, border: `1px solid ${C.violet}44` }}><Wand2 className="w-4 h-4" style={{ color: C.violet }} /></span>
        <span className="truncate" style={{ fontFamily: D, fontWeight: 700 }}>InDesign AI</span>
      </div>

      <div className="flex-1 px-3 py-4 flex flex-col gap-5">
        {/* árbol de biblioteca */}
        <div>
          <p className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: `${C.ink}55` }}>Biblioteca</p>
          <div className="flex items-center gap-1.5 px-2 h-7 text-[12px]" style={{ color: C.inkSoft }}><Library className="w-3.5 h-3.5 shrink-0" style={{ color: C.blue }} /> Biblioteca Cloud</div>
          <div className="flex flex-col mt-0.5">
            {(library?.clouds ?? []).map(cloud => (
              <CloudNode key={cloud.id} cloud={cloud} stage={stage} onSelect={onSelect} onActivate={onActivate} />
            ))}
            {!library && <p className="pl-7 py-1 text-[11px]" style={{ color: `${C.ink}40` }}>Cargando biblioteca…</p>}
          </div>
        </div>

        {/* GLOBAL: Grounding (corpus único) · Dashboard de los 6 libros · Timeline */}
        <div>
          <p className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: `${C.ink}55` }}>Global</p>
          <nav className="flex flex-col gap-0.5">
            {GLOBAL_SECTIONS.map(g => {
              const on = view === "global" && globalSection === g.id;
              const Icon = g.icon;
              return (
                <button key={g.id} onClick={() => onSelectGlobal(g.id)}
                  className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-all text-left"
                  style={on ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600, border: `1px solid ${C.violet}55` } : { color: C.inkSoft, border: "1px solid transparent" }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: on ? C.bright : C.inkSoft }} />
                  <span className="truncate">{g.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* secciones del formato activo */}
        <div>
          <p className="px-2 font-mono text-[9px] uppercase tracking-[0.2em] mb-2" style={{ color: `${C.ink}55` }}>{library ? labelForBook(library.activeBookId) : "Visual Atlas"}</p>
          <nav className="flex flex-col gap-0.5">
            {sections.map(s => {
              // "generar" ya no está en el selector (se fusionó en Contenido): resaltar Contenido cuando se está generando.
              const on = view === "book" && (s.id === stage || (s.id === "contenido" && stage === "generar"));
              const Icon = s.icon;
              const disabled = !s.enabled;
              return (
                <button key={s.id} disabled={disabled} onClick={() => !disabled && onSelect(s.id)}
                  className="flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-[13px] transition-all text-left disabled:cursor-default"
                  style={on
                    ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600, border: `1px solid ${C.violet}55` }
                    : { color: disabled ? `${C.ink}33` : C.inkSoft, border: "1px solid transparent" }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: on ? C.bright : disabled ? `${C.ink}30` : C.inkSoft }} />
                  <span className="truncate">{s.label}</span>
                  {s.soon && <span className="ml-auto font-mono text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ color: `${C.ink}40`, border: `1px solid ${C.ink}1f` }}>C{s.soon}</span>}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* pie: motor + usuario */}
      <div className="px-3 py-3 shrink-0 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.ink}12` }}>
        <div className="rounded-lg px-2.5 py-2 text-[11px]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}12`, color: C.inkSoft }}>
          <p className="flex items-center gap-1.5"><KeyRound className="w-3 h-3 shrink-0" style={{ color: offline ? C.gold : keyStatus?.hasKey ? C.green : C.gold }} /> Motor · {offline ? "offline" : keyStatus ? (keyStatus.hasKey ? "OpenAI on" : "sin llave") : "…"}</p>
          {keyStatus && !offline && <p className="mt-1" style={{ color: `${C.ink}55` }}>{keyStatus.imageModel} · {keyStatus.store}</p>}
        </div>
        <div className="flex items-center gap-2 px-1.5">
          <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] shrink-0" style={{ backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 700 }}>DE</span>
          <div className="min-w-0 leading-tight">
            <p className="text-[12px] truncate" style={{ color: C.ink, fontWeight: 600 }}>Directora Editorial</p>
            <p className="text-[10px]" style={{ color: `${C.ink}55` }}>Admin · Estudio</p>
          </div>
          <button onClick={onExit} title="Salir" className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 shrink-0" style={{ color: C.inkSoft }}><LogOut className="w-3.5 h-3.5" /></button>
        </div>
        <button onClick={onBack} className="text-[11px] inline-flex items-center gap-1.5 px-1.5 transition-opacity hover:opacity-100" style={{ color: `${C.ink}55` }}><ArrowLeft className="w-3 h-3" /> Volver al Estudio</button>
      </div>
    </aside>
  );
}

/* ── migas de pan ── */
function Breadcrumb({ stage, bookLabel, globalSection = null }: { stage: StageId; bookLabel: string; globalSection?: GlobalSectionId | null }) {
  const crumbs = globalSection
    ? ["Biblioteca", "Azure", "AI-200", "Global", GLOBAL_SECTIONS.find(g => g.id === globalSection)?.label ?? globalSection]
    : stage === "catalogo"
    ? ["Biblioteca", "Azure", "Activar certificaciones"]
    : ["Biblioteca", "Azure", "AI-200", bookLabel, sectionLabel(stage)];
  return (
    <nav className="flex items-center gap-1.5 text-[12px] min-w-0 overflow-hidden" style={{ color: C.inkSoft }}>
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1.5 shrink-0">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: `${C.ink}30` }} />}
            <span className={last ? "" : "hidden sm:inline"} style={{ color: last ? C.ink : C.inkSoft, fontWeight: last ? 600 : 400 }}>{c}</span>
          </span>
        );
      })}
    </nav>
  );
}

/* ── selector de página compacto (libera el ancho del riel para los 2 bloques) ── */
/* ── flujo guiado: el orden de trabajo de UNA página (Contenido→Generar→QA) ── */
const FLOW_STEPS: { id: StageId; label: string; hint: string }[] = [
  { id: "contenido", label: "Contenido", hint: "Redacta / ancla el contenido" },
  { id: "generar", label: "Generar", hint: "Imagen + render premium" },
  { id: "qa", label: "QA + Aprobar", hint: "Veredicto + arte ≥ 9.5" },
];
function StepFlow({ stage, onSelect }: { stage: StageId; onSelect: (s: StageId) => void }) {
  const activeIdx = FLOW_STEPS.findIndex(s => s.id === stage);
  if (activeIdx < 0) return null; // Composer u otra etapa: sin riel de flujo
  return (
    <div className="flex items-center gap-1 flex-wrap rounded-xl px-2 py-1.5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      {FLOW_STEPS.map((s, i) => {
        const active = i === activeIdx, done = i < activeIdx;
        const col = active ? C.violet : done ? C.teal : `${C.ink}66`;
        return (
          <div key={s.id} className="flex items-center">
            <button onClick={() => onSelect(s.id)} title={s.hint} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[12px] transition-all hover:bg-white/5"
              style={active ? { backgroundColor: `${C.violet}22`, border: `1px solid ${C.violet}66`, color: "#fff", fontWeight: 600 } : { color: col, border: "1px solid transparent" }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0" style={{ backgroundColor: done ? C.teal : active ? C.violet : `${C.ink}1f`, color: done || active ? "#0a0a0e" : C.inkSoft, fontWeight: 800 }}>
                {done ? "✓" : i + 1}
              </span>
              {s.label}
            </button>
            {i < FLOW_STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 mx-0.5 shrink-0" style={{ color: `${C.ink}33` }} />}
          </div>
        );
      })}
      <span className="text-[11px] ml-2 hidden sm:inline" style={{ color: `${C.ink}55` }}>· {FLOW_STEPS[activeIdx]?.hint}</span>
    </div>
  );
}

function PageSelector({ pages, pageId, setPageId, loading, onDeleted }: {
  pages: EngineCatalogPage[]; pageId: string; setPageId: (id: string) => void; loading: boolean;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const current = pages.find(p => p.pageId === pageId) ?? null;
  const chip = current ? statusChip(current) : null;
  async function del(id: string, title: string) {
    if (!window.confirm(`¿Borrar la página ${id} “${title}”? Se elimina su contenido, imagen y aprobación. No se puede deshacer.`)) return;
    setDeleting(id);
    try { const r = await deleteEnginePage(id); if (r.ok) onDeleted(id); else window.alert(r.error ?? "No se pudo borrar."); }
    catch (e) { window.alert(String((e as Error).message || e)); }
    finally { setDeleting(null); }
  }
  return (
    <div className="relative" onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={loading || pages.length === 0}
        className="inline-flex items-center gap-2.5 h-10 pl-3 pr-2.5 rounded-xl text-left transition-all disabled:opacity-60 disabled:cursor-default max-w-[min(440px,80vw)]"
        style={{ backgroundColor: C.card, border: `1px solid ${open ? `${C.violet}66` : `${C.ink}1f`}` }}>
        <span className="font-mono text-[12px] shrink-0" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Pág. {current?.pageNumber ?? "—"}</span>
        <span className="text-[12px] truncate" style={{ color: C.inkSoft }}>{current ? <>{current.title}{current.subtitle ? <span style={{ color: `${C.ink}44` }}> · {current.subtitle}</span> : null}</> : (loading ? "Cargando…" : "Sin páginas")}</span>
        {chip && <span className="text-[8px] uppercase tracking-wide shrink-0 px-1.5 py-0.5 rounded" style={{ color: chip.color, border: `1px solid ${chip.color}44` }}>{chip.label}</span>}
        <ChevronDown className="w-4 h-4 shrink-0 transition-transform" style={{ color: C.inkSoft, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <ul role="listbox" aria-label="Páginas" className="absolute z-50 mt-1.5 left-0 w-[min(440px,90vw)] max-h-[60vh] overflow-y-auto rounded-xl p-1.5 shadow-2xl" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}1f` }}>
            {pages.map(p => {
              const on = p.pageId === pageId;
              const c = statusChip(p);
              const canDelete = true;   // ya no hay páginas reservadas: todo nace del grounding
              return (
                <li key={p.pageId} role="option" aria-selected={on} className="flex items-center gap-1">
                  <button type="button" onClick={() => { setPageId(p.pageId); setOpen(false); }}
                    className="flex-1 min-w-0 flex items-center gap-2.5 px-2.5 h-10 rounded-lg text-left transition-all hover:bg-white/5"
                    style={on ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}55` } : { border: "1px solid transparent" }}>
                    <span className="font-mono text-[12px] shrink-0" style={{ fontFamily: D, fontWeight: 700, color: on ? "#fff" : C.inkSoft }}>{p.pageNumber}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] truncate" style={{ color: on ? C.ink : C.inkSoft }}>{p.title}</span>
                      {p.subtitle && <span className="block text-[10px] truncate" style={{ color: `${C.ink}55` }}>{p.subtitle}</span>}
                    </span>
                    <span className="text-[8px] uppercase tracking-wide shrink-0" style={{ color: c.color }}>{c.label}</span>
                  </button>
                  {canDelete && (
                    <button type="button" title={`Borrar página ${p.pageId}`} disabled={deleting === p.pageId}
                      onClick={(e) => { e.stopPropagation(); void del(p.pageId, p.title); }}
                      className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/5 disabled:opacity-50" style={{ color: "#fca5a5" }}>
                      {deleting === p.pageId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ── etapa Dashboard (overview de la colección, datos reales del motor) ── */
/** Fecha/hora compacta de generación, ej. "12 jun 14:30". */
function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("es", { day: "2-digit", month: "short" })} ${d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Explicaciones robustas y concretas de cada métrica del Dashboard (mini-modales). */
const DASH_HELP: Record<string, MetricHelp> = {
  section: { title: "Dashboard · qué estás viendo", body: [
    "El estado editorial de la colección AI-200 de un vistazo, leído como un EMBUDO de producción: Seedeada → Generada → Production-ready (contenido) → Aprobada. Cada página avanza por esas etapas y el dashboard cuenta cuántas hay en cada una.",
    "La fila de arriba es ese embudo (4 KPIs en orden). Debajo hay dos paneles de detalle: el MOTOR DE INFOGRAFÍA (cómo le fue al QA de la IMAGEN) y READINESS (el detalle del veredicto de CONTENIDO, con la lista de páginas por estado).",
    "Las dos puntas del embudo —Production-ready y Aprobadas— NO son lo mismo: production-ready lo decide la máquina (contenido OK), aprobada la firma un humano. Por eso hoy ves 2 production-ready y 0 aprobadas: hay 2 candidatas que todavía nadie firmó. Cada métrica tiene su '?' con el detalle exacto.",
  ] },
  seeds: { title: "Seeds Visual Atlas", body: [
    "Páginas del Visual Atlas que ya tienen su CONTENIDO cargado (el 'seed': título, secciones, trampas y autocheck) — la materia prima verificada desde la que se genera la imagen. Es la primera etapa del embudo.",
    "8/70 = 8 seeds cargados de 70 páginas planificadas. Tener el seed NO significa que la imagen ya esté generada; es el paso anterior.",
  ] },
  outputs: { title: "Generadas", body: [
    "Segunda etapa del embudo: páginas que ya tienen una SALIDA en disco (page.html + imagen). Mide cuántas pasaron por el motor de generación.",
    "'con imagen real' = generadas con gpt-image-2, no un placeholder. Ojo: estar generada NO implica haber pasado el QA ni estar aprobada.",
  ] },
  aprobadas: { title: "Aprobadas", body: [
    "Última etapa del embudo: páginas con la FIRMA HUMANA en la sección Aprobaciones — el gate final antes de poder exportarlas al libro.",
    "Es una decisión MANUAL. Va DESPUÉS de production-ready: una página puede estar production-ready (la máquina la avala) y seguir sin aprobar porque nadie la firmó todavía. Esa es la diferencia entre los dos últimos KPIs.",
  ] },
  listas: { title: "Imagen conforme", body: [
    "Páginas cuya IMAGEN pasó el QA visual del agente: opción correcta bien resaltada, sin garabatos, sin recortes, estilo conforme al contrato.",
    "Es el QA del lado de la IMAGEN. Distinto de 'production-ready' (eso es el QA del CONTENIDO) y de 'aprobadas' (eso es humano). Acá lo certifica el agente automático.",
  ] },
  agenteRevision: { title: "A revisar · imagen", body: [
    "Páginas cuya IMAGEN quedó con una falla CRÍTICA tras agotar los re-rolls (opción mal resaltada, texto ilegible, contenido cortado). No se publican como conformes: van a revisión humana.",
    "OJO: es distinta de 'A revisar · contenido' del panel de Readiness, que es por el CONTENIDO (grounding/editorial), no por la imagen.",
  ] },
  rerolls: { title: "Re-rolls", body: [
    "Cuántas veces el agente tuvo que RE-GENERAR una imagen porque su propio QA la rechazó — en total y promedio por página.",
    "'0 · 1 prom' = cero re-generaciones, 1 intento promedio: todas salieron bien al primer intento. Más re-rolls = más costo.",
  ] },
  costo: { title: "Costo del lote", body: [
    "Gasto acumulado de gpt-image-2 para generar las imágenes de este lote, incluyendo los re-rolls. Ronda ~$0.07 por imagen en calidad media.",
    "No incluye el costo de texto (QA editorial/grounding), que es de centavos.",
  ] },
  readyProd: { title: "Production-ready · CONTENIDO", body: [
    "Tercera etapa del embudo: páginas cuyo VEREDICTO DE CONTENIDO da luz verde: grounding verificado + QA editorial aprobado + sin inconsistencias de libro.",
    "Es el semáforo de '¿se puede publicar?' del lado del contenido. Lo decide la MÁQUINA. No mira la imagen (de eso se encarga 'Imagen conforme') ni reemplaza la firma humana ('Aprobadas', la etapa siguiente). El detalle página por página está en el panel Readiness de abajo.",
  ] },
  readyRevision: { title: "A revisar · contenido", body: [
    "Páginas que todavía NO llegan a production-ready por algo del CONTENIDO: grounding sin verificar, QA editorial pendiente, o inconsistencias de libro.",
    "Distinta de 'A revisar · imagen' del motor de infografía (esa es por fallas de la IMAGEN).",
  ] },
  readyBlocked: { title: "Bloqueadas · CONTENIDO", body: [
    "Páginas con un problema que IMPIDE publicar: grounding contradicho o sin respaldo, o lenguaje de venta detectado.",
    "Más grave que 'necesita revisión': hay que corregir el contenido sí o sí antes de aprobar.",
  ] },
  groundingVerified: { title: "Grounding verified", body: [
    "Páginas cuyo grounding está en estado 'verified': cada afirmación está citada y chequeada contra su fuente por un segundo paso independiente.",
    "Es el ÚNICO estado de grounding que habilita production-ready. 'seeded' (sin grounding) o 'partial' no alcanzan.",
  ] },
};

/* ── tracks del catálogo (sub-secciones por familia de producto) + ayuda ── */
const CERT_TRACKS: { id: EngineCertTrack; label: string; hint: string }[] = [
  { id: "azure", label: "Azure", hint: "Infraestructura y core de la nube" },
  { id: "ai", label: "AI", hint: "Servicios cognitivos y machine learning" },
  { id: "data", label: "Data & Analytics", hint: "Datos, bases y Fabric" },
  { id: "security", label: "Security", hint: "Identidad, protección y SecOps" },
  { id: "devops", label: "DevOps & GitHub", hint: "CI/CD, automatización y GitHub" },
  { id: "m365", label: "Microsoft 365", hint: "Administración del puesto de trabajo" },
  { id: "power-platform", label: "Power Platform", hint: "Low-code, Power BI y automatización" },
  { id: "dynamics", label: "Dynamics 365", hint: "ERP y CRM de negocio" },
];
const LEVEL_LABEL: Record<EngineCertLevel, string> = {
  fundamentals: "Fund.", associate: "Assoc.", expert: "Expert", specialty: "Special.",
};
const CATALOG_HELP = {
  title: "Catálogo de certificaciones · qué haces aquí",
  body: [
    "Es el catálogo completo de certificaciones Microsoft del estudio (~56), bajo el nodo Azure. Están agrupadas en sub-secciones por familia: Azure, AI, Data, Security, DevOps & GitHub, Microsoft 365, Power Platform y Dynamics 365. Cada tarjeta muestra su nivel (Fundamentals/Associate/Expert/Specialty).",
    "Elige una cert y activa su primer libro. Activar NO genera contenido: crea un SHELL navegable (la cert + el formato elegido en estado vacío, listo para cargar seeds y generar). Es el mismo punto de arranque que tuvo AI-200 — nada de placeholders muertos.",
    "Una cert 'activa' ya está en producción y aparece en el árbol de la izquierda; una 'disponible' todavía no se activó. Al activar eliges con qué libro/formato arranca (Visual Atlas, Master Book, etc.).",
  ],
};

/** Estado de trabajo de un libro en la tarjeta de activación. Sin métrica o units=0 → "Por determinar". */
function bookStateLabel(m: EngineBookMetric | undefined): string {
  return m && m.units > 0 ? bookProgress(m).label : "Por determinar";
}
/** Color del pill según el estado (sin arrancar → gris/dorado; en curso → teal). */
function bookStateColor(label: string): string {
  if (label === "Por determinar") return C.gold;
  if (label === "Ensamblado") return C.teal;
  return C.teal;
}

/* ── tarjeta de una certificación en el catálogo ── */
function CertCard({ cert, metricByFmt, onActivate }: { cert: EngineLibCert; metricByFmt: Map<string, EngineBookMetric>; onActivate: () => void }) {
  const isActive = cert.status === "active";
  const activatedBooks = cert.books.filter(b => b.enabled ?? b.status === "active");
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ backgroundColor: C.card, border: `1px solid ${isActive ? `${C.teal}3a` : `${C.ink}14`}` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px]" style={{ color: C.bright, fontWeight: 700 }}>{cert.code}</p>
          <p className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>{cert.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full" style={{ color: isActive ? C.teal : C.gold, border: `1px solid ${isActive ? C.teal : C.gold}55` }}>{isActive ? "activa" : "disponible"}</span>
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded" style={{ color: `${C.ink}66`, border: `1px solid ${C.ink}1f` }}>{LEVEL_LABEL[cert.level]}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: C.inkSoft }}>
        <span>{cert.domains} dominios</span><span>·</span><span>{cert.pagesPlanned} págs</span><span>·</span><span>{cert.books.length} formatos</span>
      </div>
      <div className="flex items-center gap-1.5 text-[11px]" style={{ color: C.inkSoft }}>
        <BookOpen className="w-3.5 h-3.5" style={{ color: activatedBooks.length ? C.teal : `${C.ink}44` }} />
        <span>Libros activados: <strong style={{ color: activatedBooks.length ? C.ink : C.inkSoft }}>{activatedBooks.length}/{cert.books.length}</strong></span>
      </div>
      {activatedBooks.length > 0 && (
        <div className="flex flex-col gap-1">
          {activatedBooks.map(b => {
            const label = bookStateLabel(metricByFmt.get(b.id));
            const col = bookStateColor(label);
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
                <span className="text-[11px] truncate" style={{ color: C.ink }}>{b.label}</span>
                <span className="text-[9px] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full shrink-0" style={{ color: col, border: `1px solid ${col}44` }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onActivate} className="mt-auto inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-[12px] transition-all hover:brightness-110" style={{ color: "#fff", fontFamily: D, fontWeight: 600, backgroundColor: isActive ? C.card : C.violetBtn, border: isActive ? `1px solid ${C.violet}55` : "none" }}>
        <Plus className="w-3.5 h-3.5" /> {isActive ? "Activar otro libro" : "Activar certificación"}
      </button>
    </div>
  );
}

/* ── sección CATÁLOGO ("Act. Certs"): activar una cert nueva = shell para seedear ── */
const EMPTY_METRICS: Map<string, EngineBookMetric> = new Map();
function CatalogStage({ library, onActivated, onClose }: { library: EngineLibraryTree | null; onActivated: () => void; onClose: () => void }) {
  const [modal, setModal] = useState<EngineLibCert | null>(null);
  const [q, setQ] = useState("");
  // Estado de trabajo por libro — el endpoint está scoped al cert ACTIVO (AI-200), keyed por format.
  const [metrics, setMetrics] = useState<EngineBookMetric[]>([]);
  useEffect(() => {
    let alive = true;
    fetchLibraryMetrics().then(m => { if (alive) setMetrics(m.books); }).catch(() => { if (alive) setMetrics([]); });
    return () => { alive = false; };
  }, [library?.activeBookId]);   // refrescar al cambiar de libro activo (el estado se mueve)
  const azure = library?.clouds.find(c => c.id === "azure") ?? null;
  const activeCertId = library?.activeCertId ?? "";
  const activeMetricByFmt = useMemo(() => new Map(metrics.map(m => [m.format, m])), [metrics]);

  const t = q.trim().toLowerCase();
  const matches = (c: EngineLibCert) => !t || c.code.toLowerCase().includes(t) || c.name.toLowerCase().includes(t);
  const total = azure?.certs.length ?? 0;
  const shown = (azure?.certs ?? []).filter(matches).length;

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Biblioteca · Azure</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Activar certificaciones</h1>
            <SectionHelp title={CATALOG_HELP.title} body={CATALOG_HELP.body} />
          </div>
        </div>
        <button onClick={onClose} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] transition-all hover:bg-white/5 shrink-0" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}><ArrowLeft className="w-4 h-4" /> Volver</button>
      </div>

      {/* buscador */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
          <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Buscar código o certificación…" aria-label="Buscar certificación" className="rounded-lg pl-9 pr-3 h-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/60 w-[260px]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }} />
        </div>
        {q && <button onClick={() => setQ("")} className="inline-flex items-center gap-1 text-[12px]" style={{ color: C.bright }}><X className="w-3.5 h-3.5" /> Limpiar</button>}
        <span className="ml-auto text-[12px]" style={{ color: C.inkSoft }}>{shown} de {total}</span>
      </div>

      {!library && <p className="text-[13px]" style={{ color: C.inkSoft }}>Cargando catálogo…</p>}

      {CERT_TRACKS.map(tr => {
        const group = (azure?.certs ?? []).filter(c => c.track === tr.id && matches(c));
        if (group.length === 0) return null;
        return (
          <div key={tr.id}>
            <div className="flex items-center gap-2 mb-2.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>{tr.label}</p>
              <span className="text-[11px] hidden sm:inline" style={{ color: `${C.ink}44` }}>· {tr.hint}</span>
              <span className="ml-auto font-mono text-[10px]" style={{ color: `${C.ink}40` }}>{group.length}</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.map(cert => <CertCard key={cert.id} cert={cert} metricByFmt={cert.id === activeCertId ? activeMetricByFmt : EMPTY_METRICS} onActivate={() => setModal(cert)} />)}
            </div>
          </div>
        );
      })}
      {library && shown === 0 && <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay certificaciones que coincidan con «{q}».</p>}

      {modal && <ActivateModal cert={modal} onClose={() => setModal(null)} onDone={() => { setModal(null); onActivated(); }} />}
    </div>
  );
}

/* ── modal "¿qué libro activas?" (paso focalizado tras elegir la cert) ── */
/* Modal de confirmación para CAMBIAR el tipo de libro activo (NO arranca la cert — eso es ActivateModal). */
function SwitchBookModal({ label, busy, onConfirm, onClose }: { label: string; busy: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={busy ? undefined : onClose}>
      <div className="rounded-2xl p-5 w-full max-w-md" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Cambiar libro de trabajo</p>
        <h3 className="text-lg mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>¿Cambiar a {label}?</h3>
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: C.inkSoft }}>Vas a cambiar el libro de trabajo del estudio a <b style={{ color: C.ink }}>{label}</b> de AI-200. Todas las secciones (dashboard, contenido, generar, ensamblar…) van a operar sobre este libro. No activa ni arranca la certificación — solo cambia el libro en el que trabajás (la activación se hace en el Timeline).</p>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={busy} className="px-4 h-9 rounded-full text-[13px] disabled:opacity-60" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cancelar</button>
          <button onClick={onConfirm} disabled={busy} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Cambiar libro</button>
        </div>
      </div>
    </div>
  );
}

/* ── confirmación de costo de la corrida (reemplaza el window.confirm nativo) ── */
function RunConfirmModal({ kind, missing, unitLabel, detected, onContinue, onRegenDividers, onRegenDesign, onRegenAll, onClose }: { kind: "content" | "design" | "complete"; missing: number; unitLabel: string; detected: string; onContinue: () => void; onRegenDividers: () => void; onRegenDesign: () => void; onRegenAll: () => void; onClose: () => void }) {
  const regenBtn = "inline-flex items-center gap-2.5 px-4 py-2 rounded-xl text-[12.5px] text-left";
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-md" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Correr producción</p>
        <h3 className="text-lg mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>¿Cómo querés correr?</h3>
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: C.inkSoft }}>{kind === "complete"
          ? <>Barrido: el libro está listo, solo falta <b style={{ color: C.ink }}>{detected}</b>. «Continuar» va directo a eso y reusa lo hecho.</>
          : <>Faltan <b style={{ color: C.ink }}>~{missing} {unitLabel}</b> ({detected}). Elegí cómo seguir:</>}</p>
        <div className="flex flex-col gap-2 mt-4">
          <button onClick={onContinue} className="inline-flex items-center gap-2.5 text-white px-4 py-2.5 rounded-xl text-[12.5px] text-left hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            <Play className="w-4 h-4 shrink-0" /> <span><b>Continuar</b> — salta a lo que falta, reusa lo hecho (incluidas las figuras) <span style={{ opacity: 0.85 }}>(barato)</span></span>
          </button>
          <div className="font-mono text-[9px] uppercase tracking-[0.16em] mt-1.5" style={{ color: `${C.ink}44` }}>Regenerar (fuerza · gasta crédito)</div>
          <button onClick={onRegenDividers} className={regenBtn} style={{ border: `1px solid ${C.ink}26`, color: C.ink }}>
            <RefreshCw className="w-3.5 h-3.5 shrink-0" style={{ color: C.gold }} /> <span>Solo <b>portadillas</b> — reusa figuras y relato</span>
          </button>
          <button onClick={onRegenDesign} className={regenBtn} style={{ border: `1px solid ${C.ink}26`, color: C.ink }}>
            <RefreshCw className="w-3.5 h-3.5 shrink-0" style={{ color: C.gold }} /> <span><b>Portadillas + figuras</b> — reusa el relato</span>
          </button>
          <button onClick={onRegenAll} className={regenBtn} style={{ border: `1px solid ${C.gold}66`, color: C.gold }}>
            <RefreshCw className="w-3.5 h-3.5 shrink-0" /> <span><b>Todo de cero</b> — relato + portadillas + figuras de las 24</span>
          </button>
        </div>
        <p className="text-[11px] mt-3" style={{ color: `${C.ink}66` }}>Todas se detienen en cada gate humano (aprobar → bloquear diseños → publicar).</p>
        <div className="flex justify-end mt-2">
          <button onClick={onClose} className="px-4 h-9 rounded-full text-[13px]" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

/* ── selector de capítulos a REGENERAR (relato + portadilla con force) ── */
function RegenSelectModal({ onConfirm, onClose }: { onConfirm: (moduleIds: string[]) => void; onClose: () => void }) {
  const [mods, setMods] = useState<EngineModule[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());   // arranca vacío: el usuario elige qué rehacer
  const [err, setErr] = useState("");
  useEffect(() => {
    let a = true;
    fetchModules().then(r => { if (a) setMods(r.modules.filter(m => m.hasChapter)); }).catch(() => { if (a) setErr("No se pudieron cargar los capítulos."); });
    return () => { a = false; };
  }, []);
  const toggle = (id: string) => setSel(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const all = mods ?? [];
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-lg max-h-[85vh] flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Regenerar contenido</p>
        <h3 className="text-lg mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>¿Qué capítulos regenerar?</h3>
        <p className="text-[12px] mt-1 mb-3" style={{ color: C.inkSoft }}>Elegí los capítulos a rehacer: se re-genera su <b style={{ color: C.ink }}>relato + portadilla</b> con <b style={{ color: C.ink }}>force</b> (consume crédito de OpenAI). Los no marcados quedan intactos.</p>
        {err && <p className="text-[12px] mb-2" style={{ color: "#f87171" }}>{err}</p>}
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setSel(new Set(all.map(m => m.moduleId)))} className="text-[11px] hover:underline" style={{ color: C.bright }}>Todos</button>
          <button onClick={() => setSel(new Set())} className="text-[11px] hover:underline" style={{ color: C.bright }}>Ninguno</button>
          <span className="ml-auto text-[11px]" style={{ color: C.inkSoft }}>{sel.size}/{all.length} elegidos</span>
        </div>
        <div className="flex-1 overflow-y-auto rounded-lg min-h-[120px]" style={{ border: `1px solid ${C.ink}14` }}>
          {!mods ? <p className="text-[12px] p-3 inline-flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando capítulos…</p>
            : all.length === 0 ? <p className="text-[12px] p-3" style={{ color: C.inkSoft }}>No hay capítulos con contenido todavía.</p>
            : all.map(m => {
                const on = sel.has(m.moduleId);
                return (
                  <button key={m.moduleId} onClick={() => toggle(m.moduleId)} className="flex items-center gap-2.5 w-full text-left px-3 py-2 transition-colors" style={{ backgroundColor: on ? `${C.violet}14` : "transparent", borderBottom: `1px solid ${C.ink}0d` }}>
                    <span className="w-4 h-4 rounded inline-flex items-center justify-center shrink-0" style={on ? { backgroundColor: C.violetBtn, color: "#fff" } : { border: `1px solid ${C.ink}33` }}>{on && <Check className="w-3 h-3" />}</span>
                    <span className="text-[11px] font-mono shrink-0" style={{ color: C.inkSoft }}>{m.chapterNumber ? String(m.chapterNumber).padStart(2, "0") : "—"}</span>
                    <span className="text-[12px] truncate" style={{ color: C.ink }}>{m.moduleTitle}</span>
                  </button>
                );
              })}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 h-9 rounded-full text-[13px]" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cancelar</button>
          <button onClick={() => onConfirm([...sel])} disabled={sel.size === 0} title={sel.size === 0 ? "Marcá al menos un capítulo" : ""} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><RefreshCw className="w-3.5 h-3.5" /> {sel.size ? `Regenerar ${sel.size} capítulo${sel.size > 1 ? "s" : ""}` : "Regenerar"}</button>
        </div>
      </div>
    </div>
  );
}

function ActivateModal({ cert, onClose, onDone }: { cert: EngineLibCert; onClose: () => void; onDone: () => void }) {
  const available = cert.books.filter(b => b.status !== "active");
  const [bookId, setBookId] = useState(available[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    if (!bookId) return;
    setBusy(true); setErr("");
    try {
      const r = await activateCertBook(cert.id, bookId);
      if (!r.ok) { setErr(r.error ?? "No se pudo activar."); return; }
      onDone();
    } catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-full max-w-md" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Activar · {cert.code}</p>
        <h3 className="text-lg mt-0.5" style={{ fontFamily: D, fontWeight: 700 }}>¿Qué libro activas?</h3>
        <p className="text-[12px] mt-1 mb-3" style={{ color: C.inkSoft }}>{cert.name} — se crea el shell del formato elegido, listo para seedear.</p>
        {available.length === 0 ? (
          <p className="text-[13px] py-3" style={{ color: C.gold }}>Todos los formatos de esta certificación ya están activos.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {available.map(b => {
              const Icon = libIcon(b.icon);
              const on = b.id === bookId;
              return (
                <button key={b.id} onClick={() => setBookId(b.id)} className="flex items-center gap-2.5 text-left rounded-xl px-3 py-2.5 transition-all" style={{ backgroundColor: on ? `${C.violet}1a` : C.bg, border: `1px solid ${on ? `${C.violet}66` : `${C.ink}14`}` }}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: on ? C.violet : C.inkSoft }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{b.label}</p>
                    <p className="text-[11px] truncate" style={{ color: C.inkSoft }}>{b.state}</p>
                  </div>
                  {on && <Check className="w-4 h-4 shrink-0" style={{ color: C.violet }} />}
                </button>
              );
            })}
          </div>
        )}
        {err && <p className="text-[12px] mt-2" style={{ color: "#fca5a5" }}>{err}</p>}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 h-9 rounded-full text-[13px] transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cancelar</button>
          <button onClick={go} disabled={busy || !bookId || available.length === 0} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Activando…</> : <><Plus className="w-4 h-4" /> Activar libro</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Ensamblar del MASTER BOOK: capítulos → PDF documental (no láminas/9-rutas) ── */
// Bases de assets del engine — funciones del cert activo (no hardcodear: `ai-200` contamina AB-620 y viceversa).
const masterBookAsset = (c: string) => `/assets/cloudbooks-engine/${c}/master-book/_book`;
function EnsamblarMaster({ chapters, certId }: { chapters: EngineChapter[]; certId: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<EngineMasterAssembleResult | null>(null);
  const [err, setErr] = useState("");
  const [bigImg, setBigImg] = useState<string | null>(null);
  useEffect(() => { if (!bigImg) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBigImg(null); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [bigImg]);
  // Rutas = dominios en orden de aparición (por número de capítulo).
  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const rutasList: { domainId: string; label: string; chapters: EngineChapter[] }[] = [];
  for (const c of ordered) {
    let g = rutasList.find(r => r.domainId === c.seed.domainId);
    if (!g) { g = { domainId: c.seed.domainId, label: c.seed.domainLabel, chapters: [] }; rutasList.push(g); }
    g.chapters.push(c);
  }
  const figs = chapters.reduce((n, c) => n + (c.seed.graphics?.filter(g => g.imageUrl).length ?? 0), 0);
  // Estructura del libro ensamblado (front matter → capítulos por ruta → back matter). Espeja al Atlas.
  const structure: { label: string; detail: string; hi?: boolean }[] = [
    { label: "Portada", detail: "image-2 · paleta Master" },
    { label: "Créditos y copyright", detail: "matter" },
    { label: "Índice", detail: `${chapters.length} capítulos` },
    { label: "Prefacio", detail: "6 párrafos" },
    { label: "Mapeo de dominios", detail: `${rutasList.length} rutas` },
    { label: "Guía de estudio", detail: "cómo se comporta el examen" },
    { label: "Capítulos por ruta", detail: `${rutasList.length} rutas · ${chapters.length} capítulos · ${figs} figuras`, hi: true },
    { label: "Glosario", detail: "términos clave del corpus" },
    { label: "Bibliografía", detail: "fuentes citadas por los capítulos" },
    { label: "Contraportada", detail: "image-2 · paleta Master" },
  ];
  const covers = [{ label: "Portada", url: `${masterBookAsset(certId)}/cover.png` }, { label: "Contraportada", url: `${masterBookAsset(certId)}/backcover.png` }];
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try { const r = await assembleMasterBook(); setRes(r); if (r.ok && r.url) window.open(r.url, "_blank"); else if (!r.ok) setErr(r.error ?? "Error al ensamblar."); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="flex flex-col gap-5 max-w-[900px]">
      <div className="rounded-2xl p-6" style={{ background: `linear-gradient(120deg, ${C.violet}12, ${C.card})`, border: `1px solid ${C.violet}33` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>AI-200 · Master Book</p>
        <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Ensamblar el libro</h1>
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: C.inkSoft }}>El libro documental 6×9″: front matter + <b style={{ color: C.ink }}>capítulos por ruta</b> (divisor + exposición + figuras + puntos clave) + back matter. Folios continuos; el relleno dinámico ajusta las figuras para que no queden huecos.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MiniStat label="Capítulos" value={String(chapters.length)} />
        <MiniStat label="Rutas" value={String(rutasList.length)} />
        <MiniStat label="Figuras" value={String(figs)} />
      </div>

      {/* portada + contraportada (thumbnails) */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Tapas · Master Book</p>
        <div className="flex gap-4 flex-wrap">
          {covers.map(cv => (
            <button key={cv.label} onClick={() => setBigImg(cv.url)} className="flex flex-col gap-1.5 text-left group">
              <div className="rounded-lg overflow-hidden" style={{ width: 132, aspectRatio: "1024 / 1536", backgroundColor: C.bg, border: `1px solid ${C.ink}1f` }}>
                <img loading="lazy" src={cv.url} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} alt={cv.label} className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
              </div>
              <span className="text-[11px]" style={{ color: C.inkSoft }}>{cv.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* estructura del libro */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: C.violet }}>Estructura del libro</p>
        <div className="flex flex-col">
          {structure.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.ink}0c` : "none" }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono shrink-0" style={{ backgroundColor: s.hi ? `${C.violet}1f` : C.bg, border: `1px solid ${s.hi ? C.violet : `${C.ink}1f`}`, color: s.hi ? C.bright : C.inkSoft }}>{i + 1}</span>
              <span className="text-[13px]" style={{ color: C.ink, fontWeight: s.hi ? 700 : 600, fontFamily: D }}>{s.label}</span>
              <span className="text-[12px] ml-auto text-right" style={{ color: `${C.ink}66` }}>{s.detail}</span>
            </div>
          ))}
        </div>
      </div>

      {/* índice (TOC preview) por ruta */}
      {rutasList.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Índice · capítulos</p>
          <div className="flex flex-col gap-3">
            {rutasList.map((d, ri) => (
              <div key={d.domainId}>
                <p className="text-[11px] uppercase tracking-[0.05em] mb-1.5" style={{ color: C.violet, fontWeight: 700 }}>Ruta {ri + 1} · {d.label}</p>
                <div className="flex flex-col gap-1">
                  {d.chapters.map(c => (
                    <div key={c.seed.chapterId} className="flex items-baseline gap-2 text-[12.5px]">
                      <span style={{ color: C.ink }}>{c.seed.title}</span>
                      <span className="flex-1 border-b border-dotted self-center" style={{ borderColor: `${C.ink}1f` }} />
                      <span className="font-mono" style={{ color: `${C.ink}66` }}>{chapBadge(c.seed)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-5 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="min-w-0">
          <p className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>Generar el PDF del Master Book</p>
          <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>Arma el PDF completo con los capítulos persistidos.</p>
        </div>
        <button onClick={run} disabled={busy || chapters.length === 0} className="shrink-0 inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm text-white hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy && <Loader2 className="w-4 h-4 animate-spin" />} Ensamblar libro</button>
      </div>
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}
      {res?.ok && (
        <div className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: `${C.green}0e`, border: `1px solid ${C.green}33` }}>
          <p className="text-[13px]" style={{ color: C.ink }}>Listo: {res.pages} páginas · {res.chapters} capítulos.</p>
          {res.url && <a href={res.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: C.teal }}>Abrir PDF <ExternalLink className="w-3.5 h-3.5" /></a>}
        </div>
      )}
      {bigImg && (
        <div onClick={() => setBigImg(null)} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(8,12,20,0.86)" }}>
          <img src={bigImg} alt="tapa" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-lg block" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)", background: "#fff" }} />
          <button onClick={() => setBigImg(null)} title="Cerrar (Esc)" className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}><X className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}

/* ── Exportar del MASTER BOOK: PDF del libro completo + PDF por capítulo (no páginas sueltas) ── */
function MasterExportar({ chapters, setStage }: { chapters: EngineChapter[]; setStage: (s: StageId) => void }) {
  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const [bookBusy, setBookBusy] = useState(false);
  const [bookRes, setBookRes] = useState<EngineMasterAssembleResult | null>(null);
  const [bookErr, setBookErr] = useState("");
  const [chBusy, setChBusy] = useState<string>("");
  const [chUrls, setChUrls] = useState<Record<string, string>>({});
  const [chErr, setChErr] = useState<Record<string, string>>({});
  async function exportBook() {
    setBookBusy(true); setBookErr(""); setBookRes(null);
    try { const r = await assembleMasterBook(); setBookRes(r); if (r.ok && r.url) window.open(r.url, "_blank"); else if (!r.ok) setBookErr(r.error ?? "No se pudo ensamblar."); }
    catch (e) { setBookErr(String((e as Error).message || e)); } finally { setBookBusy(false); }
  }
  async function exportChapter(id: string) {
    setChBusy(id); setChErr(e => ({ ...e, [id]: "" }));
    try { const r = await renderChapter(id); if (r.ok && r.url) { setChUrls(u => ({ ...u, [id]: r.url! })); window.open(r.url, "_blank"); } else setChErr(e => ({ ...e, [id]: r.error ?? "no se pudo" })); }
    catch (e) { setChErr(x => ({ ...x, [id]: String((e as Error).message || e) })); } finally { setChBusy(""); }
  }
  return (
    <div className="flex flex-col gap-5 max-w-[900px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Exportar · Master Book</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Exportar</h1>
          <SectionHelp title="Exportar · Master Book" body={["El Master Book es un libro de texto: su salida principal es el PDF del libro completo (portada + matter + capítulos + glosario/bibliografía).", "También podés exportar el PDF de un capítulo suelto (divisor + exposición + figuras + folios) para revisarlo o compartirlo. No hay export por-página HTML/PNG (eso es del Atlas)."]} />
        </div>
        <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>El PDF del libro se arma en Ensamblar; acá lo generás/descargás y además exportás capítulos sueltos.</p>
      </div>
      <div className="rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.violet}33` }}>
        <div className="min-w-0">
          <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>PDF del libro completo</p>
          <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>Ensambla y descarga el Master Book (6×9″) con todos los capítulos persistidos.</p>
          {bookRes?.ok && <p className="text-[12px] mt-1" style={{ color: C.teal }}>Listo: {bookRes.pages} páginas · {bookRes.chapters} capítulos.</p>}
          {bookErr && <p className="text-[12px] mt-1" style={{ color: "#fca5a5" }}>{bookErr}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {bookRes?.ok && bookRes.url && <a href={bookRes.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: C.teal }}>Abrir <ExternalLink className="w-3.5 h-3.5" /></a>}
          <button onClick={exportBook} disabled={bookBusy || ordered.length === 0} className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm text-white hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{bookBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF del libro</button>
        </div>
      </div>
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>PDF por capítulo</p>
        {ordered.length === 0
          ? <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay capítulos todavía.</p>
          : <div className="flex flex-col gap-1.5">
            {ordered.map(c => (
              <div key={c.seed.chapterId} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                <span className="font-mono text-[11px] shrink-0" style={{ color: `${C.ink}66` }}>{chapBadge(c.seed)}</span>
                <span className="text-[13px] truncate flex-1" style={{ color: C.ink }}>{c.seed.title}</span>
                {chErr[c.seed.chapterId] && <span className="text-[11px]" style={{ color: "#fca5a5" }}>{chErr[c.seed.chapterId]}</span>}
                {chUrls[c.seed.chapterId] && <a href={chUrls[c.seed.chapterId]} target="_blank" rel="noreferrer" className="text-[11px]" style={{ color: C.teal }}>abrir</a>}
                <button onClick={() => exportChapter(c.seed.chapterId)} disabled={chBusy === c.seed.chapterId} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] shrink-0 hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>{chBusy === c.seed.chapterId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} PDF</button>
              </div>
            ))}
          </div>}
      </div>
      <button onClick={() => setStage("ensamblar")} className="self-start inline-flex items-center gap-2 text-[12px] px-3.5 h-9 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}><BookOpen className="w-3.5 h-3.5" /> Ir a Ensamblar libro <ArrowRight className="w-3.5 h-3.5" /></button>
    </div>
  );
}

/* ── Contenido/Generar/QA del MASTER BOOK: por CAPÍTULO (no lámina) ── */
const masterPagesBase = (c: string) => `/assets/cloudbooks-engine/${c}/master-book/pages`;
function MasterContentStages({ chapters, stage, setStage, onReload, initialChapterId, certId }: { chapters: EngineChapter[]; stage: StageId; setStage: (s: StageId) => void; onReload: () => void; initialChapterId?: string; certId: string }) {
  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const [selId, setSelId] = useState<string>(initialChapterId ?? "");
  // Deep-link desde el Dashboard: si cambia el capítulo pedido, seleccionarlo.
  useEffect(() => { if (initialChapterId) setSelId(initialChapterId); }, [initialChapterId]);
  const ch = ordered.find(c => c.seed.chapterId === selId) ?? ordered[0];
  const TABS: [StageId, string][] = [["contenido", "Contenido"], ["generar", "Generar"], ["qa", "QA editorial"]];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={ch?.seed.chapterId ?? ""} onChange={e => setSelId(e.target.value)} className="h-10 px-3 rounded-xl text-[13px] outline-none max-w-[420px]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
            {ordered.map(c => <option key={c.seed.chapterId} value={c.seed.chapterId}>{chapBadge(c.seed)} · {c.seed.title}</option>)}
          </select>
          <SectionHelp title="Contenido del Master Book" body={["Un capítulo por módulo del temario. Elegí el capítulo arriba; abajo ves su exposición (secciones), figuras y puntos clave.", "La generación del contenido corre por el pipeline documental (psicometría → autor → verify híbrido → supervisor). El QA acá es de PROSA, no de infografía."]} />
        </div>
        <span className="text-[11px]" style={{ color: `${C.ink}55` }}>{ordered.length} capítulos</span>
      </div>
      <div className="flex gap-1.5">
        {TABS.map(([s, l]) => <button key={s} onClick={() => setStage(s)} className="px-3 h-8 rounded-lg text-[12px] transition-all" style={stage === s ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600, border: `1px solid ${C.violet}55` } : { color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{l}</button>)}
      </div>
      <section className="min-w-0">
        {!ch && <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay capítulos generados. Groundeá un módulo desde Grounding.</p>}
        {ch && stage === "contenido" && <ContenidoMasterEditor ch={ch} onReload={onReload} certId={certId} />}
        {ch && stage === "generar" && <GenerarMasterView ch={ch} setStage={setStage} onReload={onReload} />}
        {ch && stage === "qa" && <QaMasterView ch={ch} />}
      </section>
    </div>
  );
}

function ContenidoMasterView({ ch, certId }: { ch: EngineChapter; certId: string }) {
  const s = ch.seed;
  const allFigs = (s.graphics ?? []).filter(g => g.imageUrl);
  const figNum = (gid: string) => allFigs.findIndex(g => g.id === gid) + 1;
  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.violet }}>{chapTitle(s)} · {s.domainLabel}</p>
        <h1 className="text-xl mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{s.title}</h1>
        {s.subtitle && <p className="text-[13px] mt-1 italic" style={{ color: C.inkSoft }}>{s.subtitle}</p>}
      </div>
      {(s.sections ?? []).map((sec, i) => {
        const figs = (s.graphics ?? []).filter(g => g.afterSectionId === sec.id && g.imageUrl);
        return (
          <div key={sec.id} className="rounded-xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}12` }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-1" style={{ color: `${C.ink}55` }}>Sección {i + 1}</p>
            <h3 className="text-[15px] mb-2" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{sec.heading}</h3>
            <div className="text-[13px] leading-relaxed prose-master" style={{ color: C.inkSoft }} dangerouslySetInnerHTML={{ __html: sec.prose }} />
            {figs.map(g => (
              <figure key={g.id} className="mt-3">
                <img src={`${masterPagesBase(certId)}/${s.chapterId}/graphic-${g.id}.png`} alt={g.spec} className="w-full rounded-lg" style={{ border: `1px solid ${C.ink}18` }} />
                <figcaption className="text-[11px] mt-1 italic" style={{ color: `${C.ink}66` }}>Figura {Number(s.chapterNumber)}.{figNum(g.id)} — {g.spec}</figcaption>
              </figure>
            ))}
          </div>
        );
      })}
      {(s.keyTakeaways ?? []).length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: `${C.teal}0e`, border: `1px solid ${C.teal}33` }}>
          <h3 className="text-[14px] mb-2" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Puntos clave</h3>
          <ul className="list-disc pl-5 flex flex-col gap-1">{(s.keyTakeaways ?? []).map((t, i) => <li key={i} className="text-[13px]" style={{ color: C.inkSoft }}>{t}</li>)}</ul>
        </div>
      )}
      {(s.sections ?? []).length === 0 && <p className="text-[13px]" style={{ color: C.inkSoft }}>Este capítulo todavía no tiene exposición escrita. Corré el pipeline documental desde Grounding (groundear el módulo).</p>}
    </div>
  );
}

/* ── Contenido EDITABLE del capítulo (Master): título/subtítulo + secciones (heading/prose) + specs + puntos clave ── */
function ContenidoMasterEditor({ ch, onReload, certId }: { ch: EngineChapter; onReload: () => void; certId: string }) {
  const s = ch.seed;
  const cid = s.chapterId;
  const [title, setTitle] = useState(s.title);
  const [subtitle, setSubtitle] = useState(s.subtitle ?? "");
  const [sections, setSections] = useState(() => (s.sections ?? []).map(x => ({ id: x.id, heading: x.heading, prose: x.prose })));
  const [takeaways, setTakeaways] = useState<string[]>(s.keyTakeaways ?? []);
  const [graphics, setGraphics] = useState(() => (s.graphics ?? []).map(g => ({ id: g.id, spec: g.spec })));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState("");
  // Re-sincronizar cuando cambia el capítulo seleccionado (no en cada render → sin perder ediciones).
  useEffect(() => {
    setTitle(s.title); setSubtitle(s.subtitle ?? "");
    setSections((s.sections ?? []).map(x => ({ id: x.id, heading: x.heading, prose: x.prose })));
    setTakeaways(s.keyTakeaways ?? []);
    setGraphics((s.graphics ?? []).map(g => ({ id: g.id, spec: g.spec })));
    setSavedAt(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);
  async function save() {
    setSaving(true); setErr("");
    try { await saveChapter(cid, { title, subtitle, keyTakeaways: takeaways.map(t => t.trim()).filter(Boolean), sections, graphics }); setSavedAt(Date.now()); onReload(); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSaving(false); }
  }
  const inp = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };
  const figForSection = (secId: string) => (s.graphics ?? []).filter(g => g.afterSectionId === secId && g.imageUrl);
  const SaveBtn = () => <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] text-white disabled:opacity-60" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar</button>;
  return (
    <div className="flex flex-col gap-4 max-w-[900px]">
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.violet }}>Editar {chapTitle(s)} · {s.domainLabel}</p>
          <div className="flex items-center gap-2">
            {savedAt > 0 && !saving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓</span>}
            <SaveBtn />
          </div>
        </div>
        <label className="flex flex-col gap-1"><span className="text-[11px]" style={{ color: `${C.ink}77` }}>Título</span><input value={title} onChange={e => setTitle(e.target.value)} className="h-9 px-3 rounded-lg text-[14px] outline-none" style={inp} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px]" style={{ color: `${C.ink}77` }}>Subtítulo</span><input value={subtitle} onChange={e => setSubtitle(e.target.value)} className="h-9 px-3 rounded-lg text-[13px] outline-none" style={inp} /></label>
      </div>
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}
      {sections.map((sec, i) => (
        <div key={sec.id} className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}12` }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] shrink-0" style={{ color: `${C.ink}55` }}>Sección {i + 1}</span>
            <input value={sec.heading} onChange={e => setSections(ss => ss.map((x, j) => j === i ? { ...x, heading: e.target.value } : x))} className="h-8 px-2 rounded-lg text-[14px] flex-1 outline-none" style={{ ...inp, fontWeight: 600 }} />
          </div>
          <textarea value={sec.prose} onChange={e => setSections(ss => ss.map((x, j) => j === i ? { ...x, prose: e.target.value } : x))} rows={6} spellCheck={false} className="w-full px-3 py-2 rounded-lg text-[12.5px] outline-none resize-y" style={{ ...inp, lineHeight: 1.6, fontFamily: "ui-monospace, monospace" }} />
          {figForSection(sec.id).map(g => (
            <div key={g.id} className="flex gap-2 items-start rounded-lg p-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}0d` }}>
              <img src={`${masterPagesBase(certId)}/${cid}/graphic-${g.id}.png`} alt={g.spec} className="w-20 rounded shrink-0" style={{ border: `1px solid ${C.ink}18` }} />
              <label className="flex flex-col gap-1 flex-1 min-w-0"><span className="text-[10px]" style={{ color: `${C.ink}66` }}>Figura {Number(s.chapterNumber)}.{i + 1} · spec (regenerá la imagen en Generar)</span><textarea value={(graphics.find(x => x.id === g.id)?.spec) ?? g.spec} onChange={e => setGraphics(gs => gs.map(x => x.id === g.id ? { ...x, spec: e.target.value } : x))} rows={2} className="w-full px-2 py-1 rounded text-[11px] outline-none resize-y" style={inp} /></label>
            </div>
          ))}
        </div>
      ))}
      {sections.length === 0 && <p className="text-[13px] rounded-xl px-4 py-3" style={{ color: C.inkSoft, backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>Este capítulo no tiene relato todavía. Corré el pipeline documental desde Grounding (Pipeline documental → Groundear módulo).</p>}
      <div className="rounded-xl p-4 flex flex-col gap-2" style={{ backgroundColor: `${C.teal}0e`, border: `1px solid ${C.teal}33` }}>
        <div className="flex items-center justify-between"><h3 className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Puntos clave</h3><button onClick={() => setTakeaways(t => [...t, ""])} className="inline-flex items-center gap-1 text-[11px]" style={{ color: C.bright }}><Plus className="w-3.5 h-3.5" /> Agregar</button></div>
        {takeaways.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={t} onChange={e => setTakeaways(ts => ts.map((x, j) => j === i ? e.target.value : x))} className="h-8 px-2 rounded-lg text-[12.5px] flex-1 outline-none" style={inp} />
            <button onClick={() => setTakeaways(ts => ts.filter((_, j) => j !== i))} title="Quitar" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: "#fca5a5", border: "1px solid rgba(252,165,165,0.27)" }}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {takeaways.length === 0 && <p className="text-[12px]" style={{ color: C.inkSoft }}>Sin puntos clave. Agregá 3-6.</p>}
      </div>
      <div className="self-start"><SaveBtn /></div>
    </div>
  );
}

function GenerarMasterView({ ch, setStage, onReload }: { ch: EngineChapter; setStage: (s: StageId) => void; onReload: () => void }) {
  const s = ch.seed;
  const secs = (s.sections ?? []).length;
  const figs = (s.graphics ?? []).length;
  const figsGen = (s.graphics ?? []).filter(g => g.imageUrl).length;
  const [busy, setBusy] = useState<"" | "divider" | "graphics" | "relato">("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [moduleId, setModuleId] = useState("");   // módulo del capítulo (para re-componer el relato)
  useEffect(() => { let a = true; fetchModules().then(r => { if (a) setModuleId(r.modules.find(m => m.chapterId === s.chapterId)?.moduleId ?? ""); }).catch(() => { /* noop */ }); return () => { a = false; }; }, [s.chapterId]);
  const runRelato = async () => {
    if (!moduleId) { setErr("No se pudo resolver el módulo de este capítulo."); return; }
    if (!window.confirm("¿Regenerar el RELATO del capítulo? Re-corre el pipeline documental (psicometría → autor → verify → supervisor) y sobreescribe la exposición. Consume crédito OpenAI.")) return;
    setBusy("relato"); setMsg(""); setErr("");
    try { const r = await groundModule(moduleId, true, true); if (r.error) setErr(r.error); else { setMsg(`Relato regenerado: ${r.author?.sections ?? 0} secciones · grounding ${r.grounding?.status ?? "—"}.`); onReload(); } }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  };
  const runDivider = async () => {
    setBusy("divider"); setMsg(""); setErr("");
    try { const r = await generateChapterDivider(s.chapterId, true); if (r.ok) { setMsg("Divisor regenerado."); onReload(); } else setErr(r.error ?? "Error al regenerar el divisor."); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  };
  const runGraphics = async () => {
    setBusy("graphics"); setMsg(""); setErr("");
    try { const r = await generateChapterGraphics(s.chapterId, true); const ok = r.results.filter(x => x.ok).length; setMsg(`Figuras regeneradas: ${ok}/${r.results.length}.`); onReload(); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  };
  return (
    <div className="flex flex-col gap-4 max-w-[760px]">
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.violet }}>Generar · {chapTitle(s)}</p>
        <h2 className="text-lg mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{s.title}</h2>
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: C.inkSoft }}>El Master Book es un formato de TEXTO: el relato se compone por el <b style={{ color: C.ink }}>pipeline documental</b> (psicometría → autor → verify híbrido → supervisor). Las imágenes son parcas: el <b style={{ color: C.ink }}>divisor</b> (apertura del capítulo) y las <b style={{ color: C.ink }}>figuras</b> complementarias.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <MiniStat label="Secciones (relato)" value={String(secs)} />
        <MiniStat label="Figuras" value={`${figsGen}/${figs}`} />
        <MiniStat label="Puntos clave" value={String((s.keyTakeaways ?? []).length)} />
      </div>
      {/* RELATO (primario): pipeline documental */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.violet}33` }}>
        <p className="text-[12px]" style={{ color: C.inkSoft }}>El <b style={{ color: C.ink }}>relato</b> es lo primario del Master: se compone por el pipeline documental (psicometría → autor → verify → supervisor). Regeneralo acá, o groundeá el módulo desde <b style={{ color: C.ink }}>Grounding</b>.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={runRelato} disabled={!!busy || !moduleId} title={moduleId ? "" : "Resolviendo el módulo…"} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] text-white hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy === "relato" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Regenerar relato</button>
          <span className="text-[11px]" style={{ color: `${C.ink}55` }}>{secs} secciones · {(s.keyTakeaways ?? []).length} puntos clave</span>
        </div>
      </div>
      {/* IMÁGENES (parcas): divisor + figuras */}
      <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}12` }}>
        <p className="text-[12px]" style={{ color: C.inkSoft }}>Imágenes del capítulo (image-2, ~US$0.07 c/u): el divisor de apertura y las figuras complementarias.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={runDivider} disabled={!!busy} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] text-white hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy === "divider" && <Loader2 className="w-4 h-4 animate-spin" />} Regenerar divisor</button>
          <button onClick={runGraphics} disabled={!!busy || figs === 0} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, color: C.ink, border: `1px solid ${C.ink}26` }}>{busy === "graphics" && <Loader2 className="w-4 h-4 animate-spin" />} Regenerar figuras</button>
          <button onClick={() => setStage("ensamblar")} className="ml-auto inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, color: C.teal, border: `1px solid ${C.teal}44` }}>Ensamblar libro</button>
        </div>
        {msg && <p className="text-[12px]" style={{ color: C.green }}>{msg}</p>}
        {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}
      </div>
    </div>
  );
}

function QaMasterView({ ch }: { ch: EngineChapter }) {
  const s = ch.seed;
  const [qa, setQa] = useState<EngineChapterQa | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let a = true; setLoading(true); fetchChapterQa(s.chapterId).then(q => { if (a) setQa(q); }).catch(() => { if (a) setQa(null); }).finally(() => { if (a) setLoading(false); }); return () => { a = false; }; }, [s.chapterId]);
  const vTone = (v: string) => v === "supported" ? C.teal : v === "contradicted" ? "#fca5a5" : v === "unsupported" ? C.gold : `${C.ink}66`;
  const vLabel: Record<string, string> = { supported: "respaldada", unsupported: "sin respaldo", contradicted: "contradicha", no_source: "sin fuente" };
  const gTone = (st: string) => st === "verified" ? C.teal : st === "partial" ? C.gold : st === "authored" ? C.bright : `${C.ink}66`;
  const bar = (label: string, score10: number) => (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1"><span style={{ color: `${C.ink}77` }}>{label}</span><span style={{ color: C.ink }}>{score10.toFixed(1)}/10</span></div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, score10 * 10))}%`, backgroundColor: score10 >= 7 ? C.teal : score10 >= 4 ? C.gold : "#fca5a5" }} /></div>
    </div>
  );
  return (
    <div className="flex flex-col gap-4 max-w-[820px]">
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: C.violet }}>QA editorial · {chapTitle(s)}</p>
        <h2 className="text-lg mt-1" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{s.title}</h2>
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: C.inkSoft }}>QA de PROSA (no de infografía): el verify híbrido chequea los claims críticos contra el corpus, y el supervisor juzga cobertura, contenido y alineación psicométrica. Sin autocheck/trampas (eso es del Atlas).</p>
      </div>
      {loading ? <p className="text-[13px] inline-flex items-center gap-2" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando QA…</p>
        : !qa ? <p className="text-[13px]" style={{ color: C.inkSoft }}>Este capítulo aún no tiene QA. Groundeá el módulo desde Grounding.</p>
        : <>
          <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Fidelidad · verify por claim</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: gTone(qa.groundingStatus), border: `1px solid ${gTone(qa.groundingStatus)}55` }}>grounding: {qa.groundingStatus}</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap text-[12px] mb-3">
              {["supported", "unsupported", "contradicted", "no_source"].map(v => (qa.checks.byVerdict[v] ? <span key={v} className="inline-flex items-center gap-1.5" style={{ color: vTone(v) }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: vTone(v) }} /> {qa.checks.byVerdict[v]} {vLabel[v]}</span> : null))}
              {qa.checks.total === 0 && <span style={{ color: C.inkSoft }}>Sin claims verificados en este capítulo.</span>}
            </div>
            {qa.checks.items.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-[320px] overflow-auto">
                {qa.checks.items.map((c, i) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5" style={{ color: vTone(c.verdict), border: `1px solid ${vTone(c.verdict)}55` }}>{vLabel[c.verdict] ?? c.verdict}</span>
                      <span className="text-[12px] flex-1 min-w-0" style={{ color: C.ink }}>{c.text}</span>
                    </div>
                    {c.note && <p className="text-[11px] mt-1 pl-1" style={{ color: `${C.ink}66` }}>{c.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Relevancia · supervisor</p>
            {qa.relevance ? (
              <div className="flex flex-col gap-3">
                <div className="grid sm:grid-cols-2 gap-4">
                  {bar("Cobertura", qa.relevance.coverageScore)}
                  {bar("Contenido (no genérico)", qa.relevance.contentScore)}
                </div>
                {qa.relevance.psychoAlignment != null && bar("Alineación psicométrica", qa.relevance.psychoAlignment)}
                {qa.relevance.gaps.length > 0 && <div><p className="text-[11px] mb-1" style={{ color: C.gold }}>Gaps de cobertura</p><ul className="list-disc pl-5 flex flex-col gap-0.5">{qa.relevance.gaps.map((g, i) => <li key={i} className="text-[12px]" style={{ color: C.inkSoft }}>{g}</li>)}</ul></div>}
                {qa.relevance.psychoGaps.length > 0 && <div><p className="text-[11px] mb-1" style={{ color: C.gold }}>Gaps psicométricos</p><ul className="list-disc pl-5 flex flex-col gap-0.5">{qa.relevance.psychoGaps.map((g, i) => <li key={i} className="text-[12px]" style={{ color: C.inkSoft }}>{g}</li>)}</ul></div>}
              </div>
            ) : <p className="text-[12px]" style={{ color: C.inkSoft }}>Sin datos de relevancia (capítulo groundeado antes de esta versión). Regenerá el relato (Generar → Regenerar relato) para calcularla.</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <MiniStat label="Secciones" value={String(qa.sections)} />
            <MiniStat label="Fuentes citadas" value={String(qa.sources)} />
            <MiniStat label="Claims verificados" value={String(qa.checks.total)} />
          </div>
        </>}
    </div>
  );
}

/* ── Dashboard del MASTER BOOK: modelo de CAPÍTULO (no láminas/infografía) ── */
function DashboardMaster({ chapters, setStage, onOpenChapter }: { chapters: EngineChapter[]; setStage: (s: StageId) => void; onOpenChapter: (id: string) => void }) {
  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const rutas = new Set(chapters.map(c => c.seed.domainId)).size;
  const conRelato = chapters.filter(c => (c.seed.sections?.length ?? 0) > 0).length;
  const conFiguras = chapters.filter(c => (c.seed.graphics ?? []).some(g => g.imageUrl)).length;
  const conPuntos = chapters.filter(c => (c.seed.keyTakeaways?.length ?? 0) > 0).length;
  // Agrupar por RUTA (dominio), en orden.
  const byRuta = new Map<string, { num: number; label: string; chapters: typeof ordered }>();
  for (const c of ordered) {
    const id = c.seed.domainId;
    if (!byRuta.has(id)) byRuta.set(id, { num: Number(id.replace(/\D/g, "")) || 0, label: (c.seed.domainLabel || id).replace(/^Ruta\s+\d+\s*[—–-]\s*/i, "").trim(), chapters: [] });
    byRuta.get(id)!.chapters.push(c);
  }
  const rutaGroups = [...byRuta.values()].sort((a, b) => a.num - b.num);
  // Métricas ricas: embudo (temario→capítulo→relato→aprobado), salud de QA, estado de libro.
  const [modulesTotal, setModulesTotal] = useState<number | null>(null);
  const [approvals, setApprovals] = useState<EngineApprovals | null>(null);
  const [qas, setQas] = useState<EngineChapterQa[] | null>(null);
  useEffect(() => {
    fetchModules().then(r => setModulesTotal(r.modules.length)).catch(() => { /* noop */ });
    fetchApprovals().then(setApprovals).catch(() => { /* noop */ });
    fetchChaptersQa().then(r => setQas(r.chapters)).catch(() => { /* noop */ });
  }, []);
  const total = modulesTotal ?? 24;
  const approvedCount = approvals ? chapters.filter(c => approvals.pages[c.seed.chapterId]?.approved).length : 0;
  const bookApproved = !!approvals?.book.approved;
  const funnel = [
    { label: "Temario", n: total, of: total },
    { label: "Con capítulo", n: chapters.length, of: total },
    { label: "Con relato", n: conRelato, of: total },
    { label: "Aprobados", n: approvedCount, of: chapters.length || total },
  ];
  const gCount = (st: string) => qas ? qas.filter(q => q.groundingStatus === st).length : 0;
  // Salud POR CAPÍTULO de la versión que EMBARCA (persistida): estado + score del verificador. Desacopla
  // "está bien lo que se publica" de "el último re-run falló" (esto último es concepto de corrida, no del store).
  const qaById = new Map((qas ?? []).map(q => [q.chapterId, q] as const));
  const gTone = (st: string) => st === "verified" ? C.teal : st === "partial" ? C.gold : st === "authored" ? C.bright : `${C.ink}66`;
  const gLabel: Record<string, string> = { verified: "verificado", partial: "parcial", authored: "borrador", unverified: "sin verificar" };
  const withRel = qas ? qas.filter(q => q.relevance) : [];
  const avgCov = withRel.length ? withRel.reduce((a, q) => a + (q.relevance!.coverageScore), 0) / withRel.length : null;
  const avgPsy = withRel.filter(q => q.relevance!.psychoAlignment != null).length ? withRel.reduce((a, q) => a + (q.relevance!.psychoAlignment ?? 0), 0) / withRel.filter(q => q.relevance!.psychoAlignment != null).length : null;
  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-5" style={{ background: `linear-gradient(120deg, ${C.violet}12, ${C.card})`, border: `1px solid ${C.violet}33` }}>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>AI-200 · Master Book</p>
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Construcción del libro</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[13px]" style={{ color: C.inkSoft }}>Del temario al PDF documental: {chapters.length} capítulo(s) escritos en {rutas} ruta(s).</p>
            <SectionHelp title="Dashboard · Master Book" body={["El Master Book se construye por CAPÍTULOS (un módulo del temario = un capítulo), agrupados en RUTAS (dominios del examen).", "Cada capítulo teje una exposición continua (relato), con figuras numeradas y puntos clave. Abrí Contenido para editarlos o Ensamblar libro para el PDF."]} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStage("contenido")} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm text-white transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Abrir Contenido <ArrowRight className="w-4 h-4" /></button>
          <button onClick={() => setStage("ensamblar")} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, color: C.ink, border: `1px solid ${C.ink}26` }}>Ensamblar libro</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <MiniStat label="Capítulos" value={String(chapters.length)} />
        <MiniStat label="Rutas" value={String(rutas)} />
        <MiniStat label="Con relato" value={String(conRelato)} />
        <MiniStat label="Con figuras" value={String(conFiguras)} />
        <MiniStat label="Con puntos clave" value={String(conPuntos)} />
      </div>
      {/* embudo de construcción */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Embudo de construcción</p>
        <div className="flex flex-col gap-2">
          {funnel.map(f => { const pct = f.of > 0 ? Math.round((f.n / f.of) * 100) : 0; return (
            <div key={f.label} className="flex items-center gap-3">
              <span className="text-[12px] w-28 shrink-0" style={{ color: C.inkSoft }}>{f.label}</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: C.violet }} /></div>
              <span className="font-mono text-[11px] w-14 text-right shrink-0" style={{ color: C.ink }}>{f.n}/{f.of}</span>
            </div>
          ); })}
        </div>
      </div>
      {/* salud de QA + estado del libro */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Salud de QA</p>
          {!qas ? <p className="text-[12px]" style={{ color: C.inkSoft }}>Cargando…</p> : qas.length === 0 ? <p className="text-[12px]" style={{ color: C.inkSoft }}>Sin capítulos.</p> : (
            <>
              <div className="flex items-center gap-3 flex-wrap text-[12px] mb-3">
                {gCount("verified") > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: C.teal }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.teal }} /> {gCount("verified")} verified</span>}
                {gCount("partial") > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: C.gold }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.gold }} /> {gCount("partial")} partial</span>}
                {gCount("authored") > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: C.bright }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.bright }} /> {gCount("authored")} authored</span>}
                {gCount("unverified") > 0 && <span className="inline-flex items-center gap-1.5" style={{ color: `${C.ink}66` }}><span className="w-2 h-2 rounded-full" style={{ backgroundColor: `${C.ink}66` }} /> {gCount("unverified")} unverified</span>}
              </div>
              <div className="flex items-center gap-4 text-[12px]" style={{ color: C.inkSoft }}>
                <span>cobertura prom: <strong style={{ color: C.ink }}>{avgCov != null ? avgCov.toFixed(1) : "—"}/10</strong></span>
                <span>psico prom: <strong style={{ color: C.ink }}>{avgPsy != null ? avgPsy.toFixed(1) : "—"}/10</strong></span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: `${C.ink}55` }}>{withRel.length}/{qas.length} con relevancia calculada</p>
            </>
          )}
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${bookApproved ? `${C.teal}44` : `${C.ink}14`}` }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Estado del libro</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: bookApproved ? C.teal : C.gold, border: `1px solid ${(bookApproved ? C.teal : C.gold)}55` }}>{bookApproved ? "aprobado" : "sin aprobar"}</span>
          </div>
          <div className="flex items-baseline gap-2"><span style={{ fontFamily: D, fontWeight: 800, fontSize: "1.6rem", color: C.ink }}>{approvedCount}</span><span className="text-[12px]" style={{ color: `${C.ink}55` }}>/ {chapters.length} capítulos aprobados</span></div>
          <button onClick={() => setStage("aprobaciones")} className="mt-3 inline-flex items-center gap-2 text-[12px] px-3.5 h-9 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.bright}44` }}><BadgeCheck className="w-3.5 h-3.5" /> Ir a Aprobaciones <ArrowRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <h2 className="text-[15px] mb-3" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Capítulos por ruta</h2>
        {rutaGroups.length === 0
          ? <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay capítulos generados todavía. Groundeá un módulo desde Grounding/Contenido.</p>
          : <div className="flex flex-col gap-4">
            {rutaGroups.map(g => (
              <div key={g.num}>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: C.violet }}>Ruta {g.num} · {g.label}</p>
                <div className="flex flex-col gap-1.5">
                  {g.chapters.map(c => (
                    <div key={c.seed.chapterId} role="button" tabIndex={0} onClick={() => onOpenChapter(c.seed.chapterId)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onOpenChapter(c.seed.chapterId); }} className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors hover:bg-white/5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                      <span className="font-mono text-[11px] shrink-0" style={{ color: `${C.ink}66` }}>{chapBadge(c.seed)}</span>
                      <span className="text-[13px] truncate flex-1" style={{ color: C.ink }}>{c.seed.title}</span>
                      {(() => {
                        const q = qaById.get(c.seed.chapterId);
                        if (!q) return null;
                        const contra = q.checks.byVerdict.contradicted ?? 0;
                        const unsup = q.checks.byVerdict.unsupported ?? 0;
                        const tone = gTone(q.groundingStatus);
                        return (
                          <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" title={`Salud de la versión que embarca${q.score != null ? ` · score ${q.score.toFixed(1)}/10` : ""}${contra ? ` · ${contra} contradicha(s)` : ""}${unsup ? ` · ${unsup} sin respaldo` : ""}`} style={{ color: tone, border: `1px solid ${tone}55` }}>
                            {gLabel[q.groundingStatus] ?? q.groundingStatus}{q.score != null ? ` · ${q.score.toFixed(1)}` : ""}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] shrink-0" style={{ color: (c.seed.sections?.length ?? 0) > 0 ? C.teal : `${C.ink}44` }}>{(c.seed.sections?.length ?? 0)} secc.</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}

function DashboardStage({ catalog, loading, reloadKey, onOpenContenido, onPick: _onPick, onOpenQa, setStage, bookLabel }: {
  catalog: EngineCatalog | null; loading: boolean; reloadKey: number; onOpenContenido: () => void; onPick: (id: string) => void; onOpenQa: () => void; setStage: (s: StageId) => void; bookLabel: string;
}) {
  const [rollup, setRollup] = useState<EngineQaRollup | null>(null);
  const [cov, setCov] = useState<EngineCoverageReport | null>(null);
  const [tree, setTree] = useState<EngineGroundingTree | null>(null);
  const [cost, setCost] = useState<EngineCost | null>(null);
  const [book, setBook] = useState<EngineBookOutline | null>(null);
  useEffect(() => {
    let a = true;
    fetchQaCockpit().then(r => { if (a) setRollup(r); }).catch(() => {});
    fetchEngineCoverage().then(c => { if (a) setCov(c); }).catch(() => {});
    fetchGroundingTree().then(t => { if (a) setTree(t); }).catch(() => {});
    fetchEngineCost().then(c => { if (a) setCost(c); }).catch(() => {});
    fetchBookOutline().then(b => { if (a) setBook(b); }).catch(() => {});
    return () => { a = false; };
  }, [reloadKey]);
  if (loading && !catalog) return <div className="rounded-2xl p-8 text-sm flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando colección…</div>;

  const pages = catalog?.pages ?? [];
  const total = cov?.totalSkills ?? catalog?.totalExpected ?? 98;
  // ── Embudo de construcción ──
  const grounded = cov?.coveredSkills ?? tree?.totals.covered ?? pages.length;
  const verified = tree?.totals.verified ?? pages.filter(p => p.groundingStatus === "verified").length;
  const generated = pages.filter(p => !!p.imageGeneratedAt).length;
  const conforme = pages.filter(p => p.imageQaOk === true).length;
  const approved = pages.filter(p => p.approved).length;
  const inBook = book?.laminas ?? pages.filter(p => p.approved && !p.approvalStale && !!p.imageGeneratedAt).length;
  const funnel: { label: string; n: number; color: string; target?: StageId }[] = [
    { label: "Temario", n: total, color: `${C.ink}88` },
    { label: "Groundeadas", n: grounded, color: C.blue, target: "grounding" },
    { label: "Verificadas", n: verified, color: C.teal, target: "grounding" },
    { label: "Generadas", n: generated, color: C.violet, target: "generar" },
    { label: "Conformes", n: conforme, color: C.bright, target: "qa" },
    { label: "Aprobadas", n: approved, color: C.green, target: "aprobaciones" },
    { label: "En el libro", n: inBook, color: C.teal, target: "ensamblar" },
  ];
  // % construido = promedio de las fracciones de etapa (post-temario)
  const stageFracs = [grounded, verified, generated, conforme, approved, inBook].map(n => total ? n / total : 0);
  const pctBuild = Math.round((stageFracs.reduce((s, x) => s + x, 0) / stageFracs.length) * 100);

  const dimHealth = rollup?.dimensions;
  const worklistN = rollup?.worklist.length ?? 0;
  // verificadas por ruta (del árbol)
  const verifiedByDomain: Record<string, number> = {};
  for (const d of tree?.domains ?? []) verifiedByDomain[d.id] = d.modules.reduce((s, m) => s + m.units.filter(u => u.groundingStatus === "verified").length, 0);
  const capPct = cost && cost.capUsd > 0 ? Math.min(100, Math.round((cost.spentUsd / cost.capUsd) * 100)) : 0;
  const biblio = book?.sections.some(s => /bibliograf/i.test(s.label));

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      {/* header + titular % construido */}
      <div className="rounded-2xl p-6 flex flex-wrap items-center justify-between gap-5" style={{ background: `linear-gradient(120deg, ${C.violet}12, ${C.card})`, border: `1px solid ${C.violet}33` }}>
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>AI-200 · {bookLabel}</p>
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Construcción del libro</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[13px]" style={{ color: C.inkSoft }}>Totales del libro: del temario al PDF. {inBook} de {total} unidades listas en el libro.</p>
            <SectionHelp title={DASH_HELP.section.title} body={DASH_HELP.section.body} />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="leading-none" style={{ fontFamily: D, fontWeight: 800, fontSize: "2.6rem", color: C.bright }}>{pctBuild}%</p>
            <p className="text-[11px]" style={{ color: `${C.ink}66` }}>construido</p>
          </div>
          <button onClick={onOpenContenido} className="inline-flex items-center gap-2 px-5 h-10 rounded-full text-sm text-white transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Abrir {bookLabel} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* embudo de construcción */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Embudo de construcción</p>
        <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
          {funnel.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-1 shrink-0">
              <button onClick={() => s.target && setStage(s.target)} disabled={!s.target} className="flex flex-col items-center justify-center rounded-xl px-3 py-2.5 min-w-[88px] transition-all disabled:cursor-default hover:bg-white/[0.03]" style={{ backgroundColor: C.bg, border: `1px solid ${s.color}33` }}>
                <span style={{ fontFamily: D, fontWeight: 800, fontSize: "1.5rem", color: s.color, lineHeight: 1 }}>{s.n}</span>
                <span className="text-[10px] mt-1" style={{ color: `${C.ink}88` }}>{s.label}</span>
                {i > 0 && <span className="text-[9px] mt-0.5" style={{ color: `${C.ink}44` }}>{total ? Math.round((s.n / total) * 100) : 0}%</span>}
              </button>
              {i < funnel.length - 1 && <span className="flex items-center" style={{ color: `${C.ink}26` }}><ChevronRight className="w-4 h-4" /></span>}
            </div>
          ))}
        </div>
      </div>

      {/* cockpit: salud por dimensión + estado operativo */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Salud de QA · cockpit</p>
          <button onClick={onOpenQa} className="text-[11px] inline-flex items-center gap-1.5" style={{ color: worklistN > 0 ? C.gold : C.teal }}>{worklistN > 0 ? <><AlertTriangle className="w-3.5 h-3.5" /> {worklistN} requieren acción</> : <><Check className="w-3.5 h-3.5" /> todo al día</>} → cockpit <ArrowRight className="w-3 h-3" /></button>
        </div>
        {dimHealth && rollup ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
              {DIM_NAMES.map(({ key, label }) => {
                const h = dimHealth[key]; const tot = h.ok + h.warn + h.bad + h.pending || 1;
                return <div key={key} className="rounded-xl p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}66` }}>{label}</p>
                  <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.card }}>
                    {(["ok", "warn", "bad", "pending"] as const).map(st => h[st] > 0 && <span key={st} style={{ width: `${(h[st] / tot) * 100}%`, background: DIM_COLOR(st) }} />)}
                  </div>
                  <div className="flex flex-wrap gap-x-2 mt-1.5 text-[10px]"><span style={{ color: C.teal }}>{h.ok} ok</span>{h.warn > 0 && <span style={{ color: C.gold }}>{h.warn} ⚠</span>}{h.bad > 0 && <span style={{ color: "#ef4444" }}>{h.bad} ✗</span>}{h.pending > 0 && <span style={{ color: `${C.ink}55` }}>{h.pending} pend</span>}</div>
                </div>;
              })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["lista", "por_aprobar", "regenerar", "revisar_contenido", "bloqueada"] as EngineOperationalStatus[]).map(s => {
                const n = (rollup.byStatus[s] ?? 0) + (s === "regenerar" ? (rollup.byStatus.generar ?? 0) : 0) + (s === "por_aprobar" ? (rollup.byStatus.reaprobar ?? 0) : 0);
                const m = OP_META[s];
                return <span key={s} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: m.color, border: `1px solid ${m.color}44` }}><span style={{ fontWeight: 700 }}>{n}</span> {m.label.toLowerCase()}</span>;
              })}
            </div>
          </>
        ) : <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Cargando salud…</p>}
      </div>

      {/* cobertura por ruta */}
      {cov && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Cobertura por ruta</p>
            <button onClick={() => setStage("grounding")} className="text-[11px]" style={{ color: C.bright }}>{cov.coveredSkills}/{cov.totalSkills} unidades → Grounding</button>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
            {cov.byDomain.map(d => {
              const vf = verifiedByDomain[d.domainId] ?? 0;
              return <div key={d.domainId} className="flex items-center gap-2.5">
                <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: C.inkSoft }}>{d.label}</span>
                <div className="w-24 shrink-0 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.bg }}>
                  <div className="h-full" style={{ width: `${d.total ? (d.covered / d.total) * 100 : 0}%`, background: d.covered ? C.teal : "transparent" }} />
                </div>
                <span className="text-[11px] font-mono shrink-0 tabular-nums w-16 text-right" style={{ color: d.covered ? C.ink : `${C.ink}44` }}>{d.covered}/{d.total}{vf > 0 ? ` ✓${vf}` : ""}</span>
              </div>;
            })}
          </div>
        </div>
      )}

      {/* costo + estado del libro */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Costo del mes</p>
          {cost ? (
            <>
              <div className="flex items-baseline gap-2"><span style={{ fontFamily: D, fontWeight: 800, fontSize: "1.6rem", color: C.ink }}>${cost.spentUsd.toFixed(2)}</span><span className="text-[12px]" style={{ color: `${C.ink}55` }}>/ ${cost.capUsd.toFixed(0)} tope · {cost.month}</span></div>
              <div className="h-1.5 rounded-full overflow-hidden mt-2 mb-2" style={{ backgroundColor: C.bg }}><div className="h-full rounded-full" style={{ width: `${capPct}%`, background: capPct > 80 ? "#ef4444" : capPct > 50 ? C.gold : C.teal }} /></div>
              <p className="text-[11px]" style={{ color: `${C.ink}66` }}>{rollup ? `imágenes $${rollup.cost.totalUsd.toFixed(2)} · ${rollup.cost.rerolls} re-rolls` : ""} · {cost.calls} llamadas este mes</p>
            </>
          ) : <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Cargando costo…</p>}
        </div>
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${book?.bookApproved ? `${C.teal}44` : `${C.ink}14`}` }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Estado del libro</p>
            {book && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: book.bookApproved ? C.teal : C.gold, border: `1px solid ${(book.bookApproved ? C.teal : C.gold)}55` }}>{book.bookApproved ? "aprobado" : "sin aprobar"}</span>}
          </div>
          {book ? (
            <>
              <div className="flex items-baseline gap-2"><span style={{ fontFamily: D, fontWeight: 800, fontSize: "1.6rem", color: C.ink }}>{book.laminas}</span><span className="text-[12px]" style={{ color: `${C.ink}55` }}>láminas en el libro · {book.dominios} dominio(s)</span></div>
              <p className="text-[11px] mt-1.5" style={{ color: `${C.ink}66` }}>{book.sections.length} secciones{biblio ? " · incluye bibliografía" : ""}</p>
              <button onClick={() => setStage("ensamblar")} className="mt-3 inline-flex items-center gap-2 text-[12px] px-3.5 h-9 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.bright}44` }}><BookOpen className="w-3.5 h-3.5" /> Ensamblar libro <ArrowRight className="w-3.5 h-3.5" /></button>
            </>
          ) : <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Cargando libro…</p>}
        </div>
      </div>

    </div>
  );
}

type MetricHelp = { title: string; body: string[] };
function KpiCard({ icon: Icon, label, value, hint, color, help }: { icon: typeof FileText; label: string; value: string; hint: string; color: string; help?: MetricHelp }) {
  return (
    <div className="rounded-2xl p-4 relative" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      {help && <div className="absolute top-3 right-3"><SectionHelp mini title={help.title} body={help.body} /></div>}
      <div className="flex items-center gap-2 mb-2"><Icon className="w-4 h-4" style={{ color }} /><span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}66` }}>{label}</span></div>
      <p style={{ fontFamily: D, fontWeight: 700, fontSize: "1.6rem", lineHeight: 1 }}>{value}</p>
      <p className="text-[11px] mt-1.5" style={{ color: C.inkSoft }}>{hint}</p>
    </div>
  );
}

function MiniStat({ label, value, help }: { label: string; value: string; help?: MetricHelp }) {
  return (
    <div className="rounded-xl p-3 relative" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
      {help && <div className="absolute top-2 right-2"><SectionHelp mini title={help.title} body={help.body} /></div>}
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-1 pr-5" style={{ color: `${C.ink}55` }}>{label}</p>
      <p style={{ fontFamily: D, fontWeight: 700, fontSize: "1.05rem" }}>{value}</p>
    </div>
  );
}

/* ── Crédito OpenAI: restante = Σ ingresos (recargas) − Σ gasto. Registrar recarga = suma un ingreso al ledger. ── */
function CreditCard({ onRecharge }: { onRecharge?: () => void }) {
  const [c, setC] = useState<EngineCredit | null>(null);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let a = true; fetchCredit().then(x => { if (a) setC(x); }).catch(() => { if (a) setC(null); }); return () => { a = false; }; }, []);
  async function save() {
    const n = parseFloat(val);
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(true);
    try { const r = await addCreditEvent(n, note.trim()); setC(r.credit); setEditing(false); setVal(""); setNote(""); onRecharge?.(); } catch { /* noop */ } finally { setBusy(false); }
  }
  if (!c) return null;
  const pct = c.balanceUsd > 0 ? Math.max(0, Math.min(100, (c.remainingUsd / c.balanceUsd) * 100)) : 0;
  const low = c.remainingUsd <= c.balanceUsd * 0.15;
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${low ? `${C.gold}55` : `${C.ink}14`}` }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Crédito OpenAI</p>
        {!editing && <button onClick={() => { setVal(""); setNote(""); setEditing(true); }} className="text-[11px] hover:underline" style={{ color: C.bright }}>Registrar recarga</button>}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px]" style={{ color: C.inkSoft }}>+$</span>
            <input type="number" step="0.01" placeholder="monto recargado" value={val} onChange={e => setVal(e.target.value)} className="h-9 w-32 px-2 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
            <input type="text" placeholder="nota (opcional)" value={note} onChange={e => setNote(e.target.value)} className="h-9 flex-1 min-w-[120px] px-2 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-white disabled:opacity-60" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Sumar recarga</button>
            <button onClick={() => setEditing(false)} className="text-[12px] px-2" style={{ color: C.inkSoft }}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span style={{ fontFamily: D, fontWeight: 800, fontSize: "1.7rem", color: low ? C.gold : C.ink }}>${c.remainingUsd.toFixed(2)}</span>
            <span className="text-[12px]" style={{ color: `${C.ink}66` }}>restante · ingresos ${c.balanceUsd.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: low ? C.gold : C.teal }} />
          </div>
          <p className="text-[11px] mt-2" style={{ color: `${C.ink}66` }}>Gastado (total): ${c.spentSinceUsd.toFixed(2)}</p>
        </>
      )}
    </div>
  );
}

/* ── Panel de control de costos y saldo: tiles + recarga (ingresos) + tabla de ingresos + desglose de gasto por modelo. ── */
function CostCreditPanel() {
  const [events, setEvents] = useState<EngineCreditEvent[]>([]);
  const [credit, setCredit] = useState<EngineCredit | null>(null);
  const [bd, setBd] = useState<EngineCostBreakdown | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let a = true;
    fetchCreditEvents().then(r => { if (a) setEvents(r.events); }).catch(() => {});
    fetchCredit().then(c => { if (a) setCredit(c); }).catch(() => {});
    fetchCostBreakdown().then(b => { if (a) setBd(b); }).catch(() => {});
    return () => { a = false; };
  }, [tick]);
  const money = (n: number): string => `$${n.toFixed(2)}`;
  const th = "text-left font-mono text-[9px] uppercase tracking-[0.14em] pb-1.5";
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Costos y saldo</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <MiniStat label="Restante" value={credit ? money(credit.remainingUsd) : "—"} />
        <MiniStat label="Ingresos totales" value={credit ? money(credit.balanceUsd) : "—"} />
        <MiniStat label="Gastado (total)" value={credit ? money(credit.spentSinceUsd) : "—"} />
        <MiniStat label="Gasto del mes" value={bd ? money(bd.monthUsd) : "—"} />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <CreditCard onRecharge={() => setTick(t => t + 1)} />
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: C.violet }}>Gasto por modelo</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead><tr>{["Modelo", "Llamadas", "Costo"].map(h => <th key={h} className={th} style={{ color: `${C.ink}55` }}>{h}</th>)}</tr></thead>
              <tbody>
                {(bd?.byModel ?? []).map(r => (
                  <tr key={r.key} style={{ borderTop: `1px solid ${C.ink}0f` }}>
                    <td className="py-1.5 pr-2" style={{ color: C.ink }}>{r.key}</td>
                    <td className="py-1.5 pr-2 tabular-nums" style={{ color: C.inkSoft }}>{r.calls}</td>
                    <td className="py-1.5 tabular-nums" style={{ color: C.ink }}>{money(r.costUsd)}</td>
                  </tr>
                ))}
                {bd && <tr style={{ borderTop: `1px solid ${C.ink}22` }}><td className="py-1.5 pr-2" style={{ color: C.ink, fontWeight: 700 }}>Total</td><td className="py-1.5 pr-2 tabular-nums" style={{ color: C.inkSoft }}>{bd.totalCalls}</td><td className="py-1.5 tabular-nums" style={{ color: C.ink, fontWeight: 700 }}>{money(bd.totalUsd)}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: C.violet }}>Ingresos de saldo</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11.5px]">
            <thead><tr>{["Fecha", "Monto", "Nota"].map(h => <th key={h} className={th} style={{ color: `${C.ink}55` }}>{h}</th>)}</tr></thead>
            <tbody>
              {events.length === 0 && <tr><td colSpan={3} className="py-2" style={{ color: `${C.ink}55` }}>Sin ingresos registrados.</td></tr>}
              {[...events].reverse().map((e, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${C.ink}0f` }}>
                  <td className="py-1.5 pr-2 whitespace-nowrap" style={{ color: C.inkSoft }} title={e.ts}>{new Date(e.ts).toLocaleDateString("es")}</td>
                  <td className="py-1.5 pr-2 tabular-nums" style={{ color: C.teal, fontWeight: 700 }}>+${e.amountUsd.toFixed(2)}</td>
                  <td className="py-1.5" style={{ color: C.inkSoft }}>{e.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── badge del motor en el header ── */
function EngineBadge({ keyStatus, offline }: { keyStatus: EngineKeyStatus | null; offline: boolean }) {
  const color = offline ? C.gold : keyStatus ? (keyStatus.hasKey ? C.green : C.bright) : C.inkSoft;
  const label = offline ? "Motor offline" : keyStatus ? `Motor · ${keyStatus.hasKey ? "OpenAI on" : "sin llave"}` : "Motor…";
  return (
    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-mono uppercase tracking-[0.12em]" style={{ border: `1px solid ${color}40`, color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

/* Acentos de las secciones del Visual Atlas (espeja el contrato: 6 acentos en orden). */
const MODULE_ACCENTS = ["#0078D4", "#7C3AED", "#119A8C", "#E8820C", "#C026D3", "#4F46E5", "#DB2777", "#B45309"];

/* Chip "anclado por zona": lee la VERIFICACIÓN del grounding (checks) por zona —
   supported/total → ● verificada / ◐ parcial / ○ sin respaldo. Si la página no tiene
   checks (groundeada antes de esta versión), cae a los claims del autor (citas). El
   detalle fino vive en Grounding→Árbol y la procedencia se compila en la Bibliografía. */
function AnchoredChip({ checks, claims, fields }: { checks: EngineProvenance["checks"]; claims: EngineProvenance["claims"]; fields: string[] }) {
  const match = (f: string) => fields.some(k => f.toLowerCase().includes(k));
  if (checks.length > 0) {
    const zone = checks.filter(c => match(c.field));
    if (zone.length === 0) return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ color: `${C.ink}66`, border: `1px solid ${C.ink}1f` }} title="El verificador no evaluó afirmaciones en esta zona">○ sin verificar</span>;
    const ok = zone.filter(c => c.verdict === "supported").length;
    const col = ok === zone.length ? C.teal : ok > 0 ? C.gold : "#fca5a5";
    const mark = ok === zone.length ? "●" : ok > 0 ? "◐" : "○";
    return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ color: col, border: `1px solid ${col}55` }} title="Afirmaciones de esta zona verificadas contra la fuente (independiente del autor)">{mark} {ok}/{zone.length} verificada{zone.length === 1 ? "" : "s"}</span>;
  }
  // Fallback (páginas sin checks): citas del autor.
  const zone = claims.filter(c => match(c.field));
  const cited = zone.filter(c => c.citation.kind === "source").length;
  if (zone.length === 0) return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ color: `${C.ink}66`, border: `1px solid ${C.ink}1f` }} title="Sin afirmación anclada a una fuente en esta zona (re-groundeá para verificar por zona)">○ sin anclar</span>;
  const col = cited > 0 ? C.teal : C.gold;
  return <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ color: col, border: `1px solid ${col}55` }} title="Citas del autor en esta zona (re-groundeá para verificar por zona)">{cited > 0 ? "●" : "◐"} {cited}/{zone.length} cita{zone.length === 1 ? "" : "s"}</span>;
}

/* Las 5 zonas del Visual Atlas, en orden, con su rol (para el mini-mapa y los "?"). */
const ATLAS_ZONES: { key: string; label: string; help: MetricHelp }[] = [
  { key: "hero", label: "Hero", help: { title: "HERO", body: ["El encabezado de la lámina: título + una línea de contexto (deck).", "Es lo primero que ve el lector; ubica el tema."] } },
  { key: "guide", label: "Guía", help: { title: "Banda guía", body: ["La pregunta guía que organiza la lámina (banda azul con pin).", "No es una afirmación a verificar, sino el hilo de estudio."] } },
  { key: "bloque", label: "Bloque", help: { title: "Bloque visual", body: ["El cuerpo: de 2 a 8 módulos numerados que espejan las secciones de la fuente; las unidades densas (≥7) salen en un spread de 2 páginas.", "Cada módulo enseña un eje del tema con su dato clave."] } },
  { key: "trampas", label: "Trampas", help: { title: "Riel de trampas", body: ["Los errores frecuentes del examen: Mito (rojo) vs Corrección (verde).", "La corrección se verifica contra la fuente."] } },
  { key: "autocheck", label: "Autocheck", help: { title: "Riel de autocheck", body: ["Una pregunta tipo examen con opciones; la correcta resaltada en verde + el porqué.", "La explicación se verifica contra la fuente."] } },
];

/* ── etapa Contenido: espejo del contrato visual (5 zonas) + procedencia de grounding ── */
function ContenidoStage({ seed, page, activeBookLabel, onOpenGrounding, onReload: _onReload, onPageCreated: _onPageCreated }: { seed: EngineSeed | null; page: EngineCatalogPage | null; activeBookLabel: string; onOpenGrounding: () => void; onReload: () => void; onPageCreated: (pageId: string) => void }) {
  const [outline, setOutline] = useState<EngineExamOutline | null>(null);
  const [prov, setProv] = useState<EngineProvenance | null>(null);
  const [metaOpen, setMetaOpen] = useState(false);
  useEffect(() => { let alive = true; fetchEngineSkills().then(o => { if (alive) setOutline(o); }).catch(() => {}); return () => { alive = false; }; }, []);
  useEffect(() => {
    let alive = true;
    if (!page) { setProv(null); return; }
    setProv(null);
    fetchEngineProvenance(page.pageId).then(p => { if (alive) setProv(p); }).catch(() => { if (alive) setProv(null); });
    return () => { alive = false; };
  }, [page?.pageId]);
  if (!page) return <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Selecciona una página.</div>;
  const ac = seed?.autocheck;
  const skillTitle = (id: string) => {
    for (const d of outline?.domains ?? []) for (const s of d.skills) if (s.id === id) return s.title;
    return id;
  };

  const grounded = !!prov?.grounded;
  const claims = grounded ? prov!.claims : [];
  const checks = grounded ? (prov!.checks ?? []) : [];
  const citedCount = claims.filter(c => c.citation.kind === "source").length;
  const modelCount = claims.filter(c => c.citation.kind === "model").length;
  const rel = prov?.relevance ?? null;
  const nMods = seed?.visualModules.length ?? 0;
  const gridCols = nMods >= 5 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  const gs = page.groundingStatus;
  const gsCol = gs === "verified" ? C.teal : gs === "partial" || gs === "authored" ? C.gold : gs === "unverified" ? "#fca5a5" : `${C.ink}99`;
  const relCol = rel ? (rel.status === "sufficient" ? C.teal : rel.status === "thin" ? C.gold : "#fca5a5") : C.inkSoft;
  const relLabel = rel ? (rel.status === "sufficient" ? "relevancia suficiente" : rel.status === "thin" ? "relevancia floja" : "fuera de tema") : "";
  const anatomyHelp: MetricHelp = { title: "Anatomía del Visual Atlas", body: ["La lámina se compone, de arriba a abajo, en 5 zonas fijas:", "1) Hero (título + contexto) · 2) Banda guía · 3) Bloque visual (2 a 8 módulos; las unidades densas —≥7— en spread de 2 páginas) · 4) Riel de trampas (Mito/Corrección) · 5) Riel de autocheck.", "Abajo editas cada zona en ese mismo orden; el chip muestra su anclado de grounding."] };

  return (
    <div className="flex flex-col gap-4">
      {/* ── tarjeta única: identidad + grounding, minimalista y colapsable ── */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: C.teal }}>{page.domain}</p>
            <h2 className="text-lg tracking-tight inline-flex items-center gap-1.5" style={{ fontFamily: D, fontWeight: 700 }}>
              {page.title}
              <SectionHelp title={anatomyHelp.title} body={anatomyHelp.body} mini />
            </h2>
            {seed?.subtitle && <p className="text-[12px] mt-0.5" style={{ color: C.inkSoft }}>{seed.subtitle}</p>}
          </div>
          <button onClick={() => setMetaOpen(o => !o)} className="shrink-0 inline-flex items-center gap-1 text-[10px] px-2 h-7 rounded-full transition-all hover:bg-white/5" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }} title={metaOpen ? "Ocultar detalle" : "Ver detalle"}>
            {metaOpen ? "menos" : "detalle"} <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: metaOpen ? "rotate(180deg)" : "none" }} />
          </button>
        </div>

        {/* esencial — siempre visible: estado + relevancia + skill + Ir a Grounding */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: gsCol, border: `1px solid ${gsCol}55` }}><ShieldCheck className="w-3.5 h-3.5" /> {gs}</span>
          {rel && <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: relCol, border: `1px solid ${relCol}55` }} title={rel.gaps.length ? `Brechas: ${rel.gaps.join(" · ")}` : "Sin brechas"}>{relLabel}{rel.gaps.length ? ` · ${rel.gaps.length} brecha${rel.gaps.length === 1 ? "" : "s"}` : ""}</span>}
          {page.skillIds[0] && <span className="text-[11px] px-2 h-7 rounded-full inline-flex items-center" style={{ backgroundColor: `${C.blue}14`, border: `1px solid ${C.blue}33`, color: C.blue }} title={page.skillIds.map(skillTitle).join(" · ")}>{skillTitle(page.skillIds[0])}</span>}
          <button onClick={onOpenGrounding} className="ml-auto inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}><Database className="w-3.5 h-3.5" /> Grounding</button>
        </div>

        {/* detalle — colapsable */}
        {metaOpen && (
          <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.ink}14` }}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: C.violet, border: `1px solid ${C.violet}33` }}><LayoutTemplate className="w-3.5 h-3.5" /> {activeBookLabel}</span>
              {grounded && <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}><Quote className="w-3.5 h-3.5" /> {claims.length} claims · {citedCount} fuente · {modelCount} modelo</span>}
              {grounded && <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }} title={prov!.sources.map(s => s.title).join("\n")}><Link2 className="w-3.5 h-3.5" /> {prov!.sources.length} fuente{prov!.sources.length === 1 ? "" : "s"}</span>}
            </div>
            {rel && rel.status !== "sufficient" && rel.gaps.length > 0 && (
              <p className="text-[11px] leading-snug" style={{ color: C.gold }}>Mejorá relevancia en Grounding → "Mejorar relevancia". Brechas: {rel.gaps.join(" · ")}</p>
            )}
            <p className="text-[10.5px]" style={{ color: `${C.ink}55` }}>La procedencia (citas y fuentes) se compila en la <strong style={{ color: `${C.ink}88` }}>Bibliografía</strong> al final del libro.</p>
          </div>
        )}
      </div>

      {/* ── ZONAS DEL VISUAL ATLAS (mismo orden que la lámina) ── */}
      {/* HERO · deck de contexto */}
      <Section label="HERO · Deck de contexto" help={ATLAS_ZONES[0]!.help}>
        <div className="flex items-center gap-2 mb-2"><AnchoredChip checks={checks} claims={claims} fields={["context", "hero", "title"]} /></div>
        <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}>{seed?.context ?? page.context}</p>
      </Section>

      {/* BANDA GUÍA · pregunta guía (no es una afirmación a verificar) */}
      <Section label="BANDA GUÍA · Pregunta guía" accent={C.blue} help={ATLAS_ZONES[1]!.help}>
        <p className="text-[13px] leading-relaxed inline-flex items-start gap-1.5" style={{ color: C.inkSoft }}><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.blue }} /> {seed?.guideQuestion ?? page.guideQuestion}</p>
      </Section>

      {/* BLOQUE VISUAL · N módulos */}
      {seed && (
        <Section label={`BLOQUE VISUAL · ${nMods} módulo${nMods === 1 ? "" : "s"} · grilla ${nMods <= 4 ? "2×2" : "2×3"}`} accent={C.violet} help={ATLAS_ZONES[2]!.help}>
          <div className="flex items-center gap-2 mb-2"><AnchoredChip checks={checks} claims={claims} fields={["module", "módulo", "modulo"]} /></div>
          <div className={`grid ${gridCols} gap-2`}>
            {seed.visualModules.map((m, i) => {
              const accent = MODULE_ACCENTS[i % MODULE_ACCENTS.length];
              return (
                <div key={m.num} className="rounded-lg p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                  <p className="text-[12px] flex items-center gap-1.5" style={{ color: C.ink, fontFamily: D, fontWeight: 600 }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] shrink-0" style={{ backgroundColor: accent, color: "#fff", fontWeight: 800 }}>{i + 1}</span>
                    {m.title}
                  </p>
                  <p className="text-[12px] mt-1 leading-snug" style={{ color: C.inkSoft }}>{m.description}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* RIEL DE TRAMPAS · Mito / Corrección */}
      {seed && (
        <Section label="RIEL DE TRAMPAS · Mito / Corrección" accent="#f87171" help={ATLAS_ZONES[3]!.help}>
          <div className="flex items-center gap-2 mb-2"><AnchoredChip checks={checks} claims={claims} fields={["trap", "trampa"]} /></div>
          <div className="flex flex-col gap-2.5">
            {seed.traps.map((t, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] shrink-0" style={{ backgroundColor: "rgba(248,113,113,0.12)", color: "#f87171", fontWeight: 800 }}>{i + 1}</span>
                <div className="text-[12px] leading-snug">
                  <p><span style={{ color: "#fca5a5", fontWeight: 700 }}>Mito: </span><span style={{ color: C.ink }}>{t.wrong}</span></p>
                  <p><span style={{ color: C.green, fontWeight: 700 }}>Corrección: </span><span style={{ color: C.inkSoft }}>{t.correction}</span></p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* RIEL AUTOCHECK · Verificación */}
      {ac && (
        <Section label="RIEL AUTOCHECK · Verificación" accent={C.blue} help={ATLAS_ZONES[4]!.help}>
          <div className="flex items-center gap-2 mb-2"><AnchoredChip checks={checks} claims={claims} fields={["autocheck", "check"]} /></div>
          <p className="text-[13px] mb-2.5" style={{ color: C.ink, fontWeight: 600 }}>{ac.question}</p>
          <div className="grid sm:grid-cols-2 gap-1.5 mb-3">
            {ac.options.map((o, i) => {
              const ok = i === ac.correctOption;
              return (
                <span key={i} className="inline-flex items-center gap-2 text-[12px] px-2.5 py-1.5 rounded-lg" style={ok ? { backgroundColor: `${C.green}1a`, border: `1px solid ${C.green}66`, color: C.green, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] shrink-0" style={{ backgroundColor: ok ? C.green : `${C.ink}1f`, color: ok ? "#08130c" : C.inkSoft, fontWeight: 800 }}>{String.fromCharCode(65 + i)}</span>
                  {o}
                </span>
              );
            })}
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: C.inkSoft }}><span style={{ color: C.green, fontWeight: 700 }}>Por qué: </span>{ac.explanation}</p>
          {ac.discardNotes.length > 0 && (
            <div className="mt-2 flex flex-col gap-0.5">
              {ac.discardNotes.map((d, i) => <p key={i} className="text-[11px] leading-snug" style={{ color: `${C.ink}66` }}>· {d}</p>)}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

/* ── sección GROUNDING: control de la materia prima (agnóstica del formato) ── */
/* ── Pipeline · 4 agentes: buscar → anclar → verificar → supervisar → poblar Contenido ── */
function PipelinePanel({ onPageCreated }: { onPageCreated: (id: string) => void }) {
  const [outline, setOutline] = useState<EngineExamOutline | null>(null);
  const [domainId, setDomainId] = useState("d1");
  const [persist, setPersist] = useState(true);
  const [allowSearch, setAllowSearch] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EngineGroundDomainResult | null>(null);
  const [err, setErr] = useState("");
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  useEffect(() => {
    let alive = true;
    fetchEngineSkills().then(o => { if (alive) { setOutline(o); if (o.domains.length) setDomainId(d => o.domains.some(x => x.id === d) ? d : o.domains[0].id); } }).catch(() => {});
    fetchRouteLocks().then(l => { if (alive) setLocks(l); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function run() {
    setRunning(true); setErr(""); setResult(null);
    try { setResult(await groundDomain(domainId, persist, allowSearch)); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setRunning(false); }
  }
  const dom = outline?.domains.find(d => d.id === domainId) ?? null;
  const skillCount = dom?.skills.length ?? 0;
  const locked = locks[domainId] === true;

  return (
    <div className="flex flex-col gap-4">
      <Section label="Buscar y groundear un dominio" help={{ title: "Pipeline · 4 agentes", body: [
        "Corre los 4 agentes por cada unidad del dominio, en su propio contexto (sin saturar la ventana): Buscador → Autor → Verificador de fidelidad → Supervisor de relevancia.",
        "El Buscador descubre y valida fuentes oficiales; el resultado puebla Contenido si activas “poblar”. Fidelidad ≠ relevancia: una página puede ser fiel y aún así pobre.",
      ] }}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 min-w-[220px] flex-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}66` }}>Dominio</span>
            <select value={domainId} onChange={e => setDomainId(e.target.value)} className="h-9 px-2.5 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink, colorScheme: "dark" }}>
              {(outline?.domains ?? []).map(d => <option key={d.id} value={d.id}>{d.id.toUpperCase()} · {d.label}</option>)}
            </select>
          </label>
          <label className="inline-flex items-center gap-1.5 text-[12px] h-9" style={{ color: C.inkSoft }}>
            <input type="checkbox" checked={persist} onChange={e => setPersist(e.target.checked)} /> Poblar Contenido
          </label>
          <label className="inline-flex items-center gap-1.5 text-[12px] h-9" style={{ color: C.inkSoft }} title="Sin API pública robusta de MS Learn: por default usa fuentes curadas + URLs propuestas por LLM, todas validadas por fetch real.">
            <input type="checkbox" checked={allowSearch} onChange={e => setAllowSearch(e.target.checked)} /> Buscar en MS Learn
          </label>
          <button onClick={run} disabled={running || skillCount === 0 || locked} title={locked ? "Ruta bloqueada: re-corré unidades puntuales desde el árbol o desbloqueá" : undefined} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-lg text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Corriendo 4 agentes…</> : locked ? <><Lock className="w-4 h-4" /> Ruta bloqueada</> : <><Sparkles className="w-4 h-4" /> Buscar y groundear ({skillCount})</>}
          </button>
        </div>
        {locked && <p className="text-[11px] mt-2" style={{ color: C.teal }}>Ruta bloqueada. Para tocarla, re-corré unidades puntuales desde el Árbol o desbloqueá la ruta ahí.</p>}
        {running && <p className="text-[11px] mt-2" style={{ color: `${C.ink}55` }}>Puede tardar: cada skill pasa por buscador + autor + verificador + supervisor. No cierres la pestaña.</p>}
        {err && <p className="text-[12px] mt-2" style={{ color: "#fca5a5" }}>{err}</p>}
      </Section>

      {result && (
        <>
          <Section label={`Resultado · ${result.domainLabel}`}>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <MiniStat label="Skills" value={String(result.total)} />
              <MiniStat label="Con fuentes" value={String(result.searched)} />
              <MiniStat label="Verified" value={String(result.verified)} />
              <MiniStat label="Relevantes" value={String(result.relevant)} />
              <MiniStat label="Páginas" value={String(result.persisted)} />
              <MiniStat label="Costo" value={`$${Math.max(0, result.spentAfterUsd - result.spentBeforeUsd).toFixed(3)}`} />
            </div>
            {result.failed > 0 && <p className="text-[11px] mt-2" style={{ color: C.gold }}>{result.failed} skill(s) con error o bloqueo — ver detalle abajo.</p>}
          </Section>
          <div className="flex flex-col gap-2">
            {result.skills.map(s => <PipelineSkillCard key={s.skillId} s={s} onPageCreated={onPageCreated} />)}
          </div>
        </>
      )}
    </div>
  );
}

/* ── tarjeta por skill: muestra los 4 agentes por separado (fidelidad ≠ relevancia) ── */
function PipelineSkillCard({ s, onPageCreated }: { s: EngineGroundSkillResult; onPageCreated: (id: string) => void }) {
  const gTone = (st: string) => st === "verified" ? C.teal : st === "partial" ? C.gold : "#fca5a5";
  const rTone = (st: string) => st === "sufficient" ? C.teal : st === "thin" ? C.gold : "#fca5a5";
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>{s.skillTitle}</span>
        <span className="font-mono text-[9px]" style={{ color: `${C.ink}44` }}>{s.skillId}</span>
        {s.error && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: "#fca5a5", border: "1px solid rgba(252,165,165,0.27)" }} title={s.error}>falló en: {s.step}</span>}
        {s.pageId && s.persisted && (
          <button onClick={() => onPageCreated(s.pageId!)} className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}>
            <ArrowRight className="w-3.5 h-3.5" /> Página {s.pageId} → Generar
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
        <AgentCell icon={Database} label="Buscador" tone={C.blue} value={s.search ? `${s.search.ingested} fuentes` : "—"} sub={s.search?.coverageNote ?? ""} />
        <AgentCell icon={FileText} label="Autor" tone={C.violet} value={s.author ? (s.author.outcome === "real" ? `${s.author.citedClaims} citadas` : s.author.outcome) : "—"} sub={s.author?.cached ? "cacheado" : s.author ? `${s.author.modelClaims} sin fuente` : ""} />
        <AgentCell icon={ShieldCheck} label="Fidelidad" tone={s.grounding ? gTone(s.grounding.status) : C.inkSoft} value={s.grounding ? s.grounding.status : "—"} sub={s.grounding ? `${s.grounding.score}/10${s.grounding.blocked ? " · bloqueada" : ""}` : ""} />
        <AgentCell icon={BadgeCheck} label="Relevancia" tone={s.relevance ? rTone(s.relevance.status) : C.inkSoft} value={s.relevance ? s.relevance.status : "—"} sub={s.relevance ? `${s.relevance.score}/10${s.relevance.gaps.length ? ` · ${s.relevance.gaps.length} gap` : ""}` : ""} />
      </div>
    </div>
  );
}
function AgentCell({ icon: Icon, label, tone, value, sub }: { icon: typeof FileText; label: string; tone: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 shrink-0" style={{ color: tone }} /><span className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: `${C.ink}55` }}>{label}</span></div>
      <p className="text-[12px] truncate" style={{ color: tone, fontWeight: 600 }}>{value}</p>
      {sub && <p className="text-[10px] truncate" style={{ color: `${C.ink}55` }} title={sub}>{sub}</p>}
    </div>
  );
}

/* ── Evidencia · capturas oficiales de las 9 rutas en MS Learn (prueba de alcance) ── */
function EvidenciaPanel() {
  const [ev, setEv] = useState<EngineEvidenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const load = () => { setLoading(true); fetchEvidence().then(setEv).catch(() => setEv(null)).finally(() => setLoading(false)); };
  useEffect(load, []);
  async function capture() {
    setCapturing(true); setErr("");
    try { const r = await captureEvidence(); setEv(r); if (!r.available) setErr(r.error ?? "No se pudo capturar."); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setCapturing(false); }
  }
  const shots = ev?.shots ?? [];
  return (
    <div className="flex flex-col gap-4">
      <Section label="Evidencia de fuentes · capturas oficiales" help={{ title: "Evidencia · capturas oficiales", body: [
        "Recibo visual de que el grounding llegó a la página REAL de cada ruta del AI-200 en MS Learn. Es prueba de ALCANCE (sitio correcto), no de grounding correcto (eso lo da el verificador).",
        "El commit de cada página es garantía extra: las páginas de Learn son YAML versionado en GitHub. Tocá una captura para verla grande.",
      ] }}>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={capture} disabled={capturing} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-lg text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {capturing ? <><Loader2 className="w-4 h-4 animate-spin" /> Capturando 9 rutas…</> : <><Maximize2 className="w-4 h-4" /> Capturar evidencia</>}
          </button>
          {ev?.capturedAt && <span className="text-[11px]" style={{ color: `${C.ink}55` }}>Última captura: {fmtWhen(ev.capturedAt)}</span>}
        </div>
        {capturing && <p className="text-[11px] mt-2" style={{ color: `${C.ink}55` }}>Abre cada página en Chrome headless, descarta cookies y guarda el PNG. Puede tardar ~20-40s.</p>}
        {err && <p className="text-[12px] mt-2" style={{ color: "#fca5a5" }}>{err}</p>}
      </Section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm py-3" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
      ) : shots.length === 0 ? (
        <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Sin capturas todavía. Tocá “Capturar evidencia”.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {shots.map(s => (
            <div key={s.id} className="rounded-xl overflow-hidden flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${s.ok ? `${C.ink}14` : "rgba(252,165,165,0.3)"}` }}>
              {s.ok && s.imagePath ? (
                <button onClick={() => setZoom(s.imagePath)} className="block w-full" style={{ height: 150, overflow: "hidden", backgroundColor: C.bg }} title="Ver grande">
                  <img src={s.imagePath} alt={s.label} style={{ width: "100%", objectFit: "cover", objectPosition: "top" }} />
                </button>
              ) : (
                <div className="flex items-center justify-center text-[11px] px-3 text-center" style={{ height: 150, color: "#fca5a5", backgroundColor: C.bg }}>{s.error ?? "sin captura"}</div>
              )}
              <div className="p-3 flex flex-col gap-1 min-w-0">
                <p className="text-[12px] truncate" style={{ color: C.ink, fontWeight: 600 }} title={s.label}>{s.label}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10px] truncate hover:underline" style={{ color: C.bright }}>{s.url}</a>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: `${C.ink}55` }}>
                  <span>{fmtWhen(s.capturedAt)}</span>
                  {s.gitCommit && <span className="font-mono truncate" title={`commit ${s.gitCommit}`}>· {s.gitCommit.slice(0, 7)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} onClick={() => setZoom(null)}>
          <img src={zoom} alt="captura oficial" style={{ maxWidth: "92%", maxHeight: "92%", objectFit: "contain", border: `1px solid ${C.ink}22`, borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

const GROUNDING_HELP = {
  title: "Grounding · qué controlas aquí",
  body: [
    "El grounding es la VERDAD del contenido, separada del formato del libro. Aquí recolectas y verificas la materia prima UNA vez; después la sección Contenido la conforma según el libro activo (Visual Atlas, Master Book, etc.).",
    "El PIPELINE corre 4 agentes por skill, en contexto acotado (por dominio para no saturar): BUSCADOR (descubre + valida + ingiere fuentes oficiales), AUTOR (redacta anclado), VERIFICADOR DE FIDELIDAD (¿cada afirmación citada y respaldada?) y SUPERVISOR DE RELEVANCIA (¿las fuentes cubren el skill y el contenido es pertinente, no genérico?). Fidelidad ≠ relevancia: una página puede ser fiel y aún así pobre.",
    "Las otras pestañas son los controles sueltos: FUENTES (ingesta + filtros fecha/enlace), COBERTURA & PROCEDENCIA (skill → cita → verificación) y QA DE RELEVANCIA (rollup). 'verified' + 'sufficient' es lo único que habilita production-ready.",
  ],
};
/* ── ÁRBOL de grounding (unifica Fuentes + Cobertura + Procedencia) ── */
const gTone = (st: string | null) => st === "verified" ? C.teal : st === "partial" || st === "authored" ? C.gold : st === "unverified" ? "#fca5a5" : `${C.ink}30`;
const rTone = (st: string | null) => st === "sufficient" ? C.teal : st === "thin" ? C.gold : st === "off_topic" ? "#fca5a5" : `${C.ink}30`;

function ArbolPanel({ isMaster = false }: { isMaster?: boolean }) {
  const [tree, setTree] = useState<EngineGroundingTree | null>(null);
  const [srcMap, setSrcMap] = useState<Map<string, EngineSource>>(new Map());
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState(""); const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const load = () => {
    setLoading(true);
    Promise.all([fetchGroundingTree(), fetchEngineSources()]).then(([t, s]) => {
      setTree(t);
      const m = new Map<string, EngineSource>(); s.sources.forEach(x => { if (x.url) m.set(x.url.replace(/\/+$/, ""), x); });
      setSrcMap(m);
    }).catch(() => setTree(null)).finally(() => setLoading(false));
  };
  useEffect(load, []);
  async function addUrl() { const v = url.trim(); if (!v) return; setBusy(true); setMsg(null); try { const r = await ingestSourceUrl(v); if (!r.ok) setMsg({ ok: false, text: r.error ?? "falló" }); else { setUrl(""); setMsg({ ok: true, text: `Ingerida: ${r.source?.title.slice(0, 50)}` }); load(); } } catch (e) { setMsg({ ok: false, text: String((e as Error).message || e) }); } finally { setBusy(false); } }
  async function addCsv() { const v = csv.trim(); if (!v) return; setBusy(true); setMsg(null); const isSheet = /docs\.google\.com\/spreadsheets/.test(v); try { const r = await ingestSourceCsv(isSheet ? { url: v } : { csv: v }); if (!r.ok) setMsg({ ok: false, text: r.error ?? "falló" }); else { setCsv(""); setMsg({ ok: true, text: `${r.sources?.length ?? 0} ingerida(s)` }); load(); } } catch (e) { setMsg({ ok: false, text: String((e as Error).message || e) }); } finally { setBusy(false); } }
  const t = tree?.totals;
  return (
    <div className="flex flex-col gap-4">
      {t && (
        <Section label="Árbol de grounding · AI-200 (ruta → módulo → unidad)">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <MiniStat label="Unidades" value={String(t.units)} />
            <MiniStat label="Con fuentes" value={String(t.ingested)} />
            {!isMaster && <MiniStat label="Con página" value={String(t.covered)} />}
            <MiniStat label="Verified" value={String(t.verified)} />
            <MiniStat label="Relevancia OK" value={String(t.sufficient)} />
            <MiniStat label="Sin evaluar" value={String(t.sinEvaluar)} />
          </div>
        </Section>
      )}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <button onClick={() => setIngestOpen(o => !o)} className="w-full flex items-center gap-1.5 text-left" aria-expanded={ingestOpen}>
          {ingestOpen ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}66` }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}66` }} />}
          <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: `${C.ink}66` }}>Ingerir fuente manual</span>
          {!ingestOpen && <span className="text-[11px] ml-1" style={{ color: `${C.ink}40` }}>URL · MS Learn · doc · web · CSV/Sheet</span>}
        </button>
        {ingestOpen && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2 mb-2">
              <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addUrl(); }} placeholder="https://learn.microsoft.com/…" className="flex-1 min-w-[240px] h-9 px-3 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
              <button onClick={addUrl} disabled={busy} className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] text-white disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Ingerir URL</button>
            </div>
            <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={2} placeholder={"titulo,url,nota — o pegá un link de Google Sheets"} className="w-full px-3 py-2 rounded-lg text-[12px] font-mono outline-none resize-y" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
            <button onClick={addCsv} disabled={busy} className="mt-2 inline-flex items-center gap-2 px-4 h-8 rounded-lg text-[12px] disabled:opacity-60" style={{ border: `1px solid ${C.bright}55`, color: C.bright }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ingerir CSV/Sheet</button>
            {msg && <p className="text-[12px] mt-2" style={{ color: msg.ok ? C.teal : "#fca5a5" }}>{msg.text}</p>}
          </div>
        )}
      </div>
      {loading ? <div className="flex items-center gap-2 text-sm py-3" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando árbol…</div>
        : !tree ? <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Motor no disponible.</p>
        : <div className="flex flex-col gap-2">{tree.domains.map(d => <TreeDomainNode key={d.id} d={d} srcMap={srcMap} onReload={load} isMaster={isMaster} />)}</div>}
    </div>
  );
}

function TreeDomainNode({ d, srcMap, onReload, isMaster = false }: { d: EngineTreeDomain; srcMap: Map<string, EngineSource>; onReload: () => void; isMaster?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [locking, setLocking] = useState(false);
  const unitCount = d.modules.reduce((n, m) => n + m.units.length, 0);
  const ingested = d.modules.reduce((n, m) => n + m.units.filter(u => u.sources.length).length, 0);
  async function ingestRuta() { setBusy(true); try { await ingestDomain(d.id); onReload(); } catch { /* */ } finally { setBusy(false); } }
  async function toggleLock() { setLocking(true); try { await setRouteLock(d.id, !d.locked); onReload(); } catch { /* */ } finally { setLocking(false); } }
  return (
    <div className="rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${d.locked ? `${C.teal}3a` : `${C.ink}14`}` }}>
      <div className="flex items-center gap-2 px-3 h-11">
        <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {open ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: `${C.ink}66` }} /> : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: `${C.ink}66` }} />}
          <span className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{d.label}</span>
          <span className="font-mono text-[10px] shrink-0" style={{ color: `${C.ink}44` }}>{ingested}/{unitCount} con fuentes</span>
          {d.locked && <span className="font-mono text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ color: C.teal, border: `1px solid ${C.teal}55` }}>bloqueada</span>}
        </button>
        <button onClick={ingestRuta} disabled={busy || d.locked} title={d.locked ? "Ruta bloqueada (no se re-ingiere la ruta completa)" : "Ingerir fuentes de toda la ruta (sin groundear)"} className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-lg hover:bg-white/5 disabled:opacity-40 shrink-0" style={{ border: `1px solid ${C.ink}1f`, color: C.bright }}>{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Ingerir ruta</button>
        <button onClick={toggleLock} disabled={locking} title={d.locked ? "Desbloquear ruta" : "Bloquear ruta (evita re-groundear toda la ruta por error)"} className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/5 disabled:opacity-60 shrink-0" style={{ border: `1px solid ${d.locked ? `${C.teal}55` : `${C.ink}1f`}` }}>{locking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" style={{ color: d.locked ? C.teal : `${C.ink}66` }} />}</button>
      </div>
      {open && <div className="px-3 pb-3 flex flex-col gap-2">{d.modules.map(m => <TreeModuleNode key={m.moduleId} m={m} srcMap={srcMap} onReload={onReload} isMaster={isMaster} />)}</div>}
    </div>
  );
}

function TreeModuleNode({ m, srcMap, onReload, isMaster = false }: { m: EngineTreeModule; srcMap: Map<string, EngineSource>; onReload: () => void; isMaster?: boolean }) {
  const [open, setOpen] = useState(false);
  const ingested = m.units.filter(u => u.sources.length).length;
  return (
    <div className="rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-3 h-9 text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}55` }} /> : <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}55` }} />}
        <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: C.inkSoft, fontWeight: 600 }}>{m.moduleTitle}</span>
        <span className="font-mono text-[9px] shrink-0" style={{ color: `${C.ink}40` }}>{ingested}/{m.units.length} u</span>
      </button>
      {open && <div className="px-2 pb-2 flex flex-col gap-1">{m.units.map(u => <TreeUnitNode key={u.skillId} u={u} srcMap={srcMap} onReload={onReload} isMaster={isMaster} />)}</div>}
    </div>
  );
}

function TreeUnitNode({ u, srcMap, onReload, isMaster = false }: { u: EngineTreeUnit; srcMap: Map<string, EngineSource>; onReload: () => void; isMaster?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [openSrc, setOpenSrc] = useState<string | null>(null);
  const [delMsg, setDelMsg] = useState("");
  async function ingest() { setBusy(true); try { await ingestSkill(u.skillId); onReload(); } catch { /* */ } finally { setBusy(false); } }
  async function delPage(pid: string) {
    if (!window.confirm(`¿Borrar la página ${pid}? Solo borra ESTA versión (la otra duplicada queda).`)) return;
    setDelMsg("");
    const r = await deleteEnginePage(pid).catch(e => ({ ok: false, error: String((e as Error).message || e) }));
    if (!r.ok) setDelMsg(r.error ?? "no se pudo borrar"); else onReload();
  }
  const dup = u.pageIds.length > 1;
  return (
    <div className="rounded-md" style={{ border: `1px solid ${C.ink}0d` }}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 px-2.5 h-8 text-left">
        {open ? <ChevronDown className="w-3 h-3 shrink-0" style={{ color: `${C.ink}44` }} /> : <ChevronRight className="w-3 h-3 shrink-0" style={{ color: `${C.ink}44` }} />}
        {u.kind === "exercise" && <span className="font-mono text-[7px] uppercase px-1 rounded shrink-0" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>ej</span>}
        <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: C.ink }}>{u.title}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full" title={`fuentes: ${u.sources.length}`} style={{ backgroundColor: u.sources.length ? C.blue : `${C.ink}22` }} />
          <span className="w-1.5 h-1.5 rounded-full" title={`grounding: ${u.groundingStatus ?? "—"}`} style={{ backgroundColor: gTone(u.groundingStatus) }} />
          <span className="w-1.5 h-1.5 rounded-full" title={`relevancia: ${u.relevanceStatus ?? "sin evaluar"}`} style={{ backgroundColor: rTone(u.relevanceStatus) }} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {u.url && <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-[10px] truncate hover:underline max-w-[60%]" style={{ color: C.bright }}>{u.url}</a>}
            <button onClick={ingest} disabled={busy} className="inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded-lg hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.ink}1f`, color: C.bright }}>{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />} Ingerir fuentes</button>
            {!isMaster && u.pageIds.length === 1 && <span className="text-[10px]" style={{ color: C.teal }}>página {u.pageIds[0]}</span>}
            {!isMaster && dup && (
              <span className="inline-flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[8px] uppercase tracking-wide px-1 rounded" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>duplicado</span>
                {u.pageIds.map(pid => (
                  <button key={pid} onClick={() => delPage(pid)} title={`Borrar la versión ${pid} (comparalo en Contenido antes)`} className="inline-flex items-center gap-1 text-[10px] px-1.5 h-5 rounded hover:bg-white/5" style={{ color: "#fca5a5", border: "1px solid rgba(252,165,165,0.27)" }}><Trash2 className="w-3 h-3" /> {pid}</button>
                ))}
              </span>
            )}
          </div>
          {delMsg && <p className="text-[10px]" style={{ color: "#fca5a5" }}>{delMsg}</p>}
          {/* fuentes curadas + corpus escrapeado */}
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: `${C.ink}55` }}>Fuentes · corpus</p>
            {u.curatedUrls.map(cu => {
              const s = srcMap.get(cu.replace(/\/+$/, ""));
              return (
                <div key={cu} className="rounded px-2 py-1.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}0d` }}>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s ? C.teal : `${C.ink}22` }} />
                    <span className="text-[11px] truncate flex-1 min-w-0" style={{ color: s ? C.ink : `${C.ink}66` }} title={cu}>{s?.title ?? cu}</span>
                    {s && <span className="font-mono text-[9px] shrink-0" style={{ color: `${C.ink}44` }}>{(s.text?.length ?? 0).toLocaleString()} ch</span>}
                    {s?.text && <button onClick={() => setOpenSrc(openSrc === s.id ? null : s.id)} className="text-[10px] px-1.5 py-0.5 rounded hover:bg-white/5 shrink-0" style={{ color: C.bright }}>{openSrc === s.id ? "ocultar" : "ver texto"}</button>}
                  </div>
                  {s?.text && openSrc === s.id && (
                    <div className="mt-1.5">
                      <p className="font-mono text-[9px] mb-1" style={{ color: `${C.ink}44` }}>Texto completo en el corpus · {(s.text.length).toLocaleString()} caracteres{s.text.length >= 20000 ? " (tope de 20.000 del scraper)" : ""}</p>
                      <pre className="text-[10px] whitespace-pre-wrap max-h-[360px] overflow-auto rounded p-2" style={{ backgroundColor: "#0c0c11", color: C.inkSoft, border: `1px solid ${C.ink}10` }}>{s.text}</pre>
                    </div>
                  )}
                </div>
              );
            })}
            {u.curatedUrls.length === 0 && <p className="text-[11px]" style={{ color: `${C.ink}44` }}>Sin fuentes curadas para esta unidad.</p>}
          </div>
          {/* relevancia + gaps */}
          {u.relevanceStatus && (
            <p className="text-[11px]"><span style={{ color: rTone(u.relevanceStatus), fontWeight: 600 }}>Relevancia: {u.relevanceStatus}</span>{u.relevanceGaps.length > 0 && <span style={{ color: `${C.ink}66` }}> · {u.relevanceGaps.join(" · ")}</span>}</p>
          )}
          {/* procedencia (claims → cita) */}
          {u.claims.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-[8px] uppercase tracking-[0.14em]" style={{ color: `${C.ink}55` }}>Procedencia · {u.claims.length} afirmaciones</p>
              {u.claims.slice(0, 8).map((c, i) => (
                <p key={i} className="text-[10px] leading-snug" style={{ color: `${C.ink}88` }}>
                  <span className="font-mono px-1 rounded" style={{ color: c.citationKind === "source" ? C.teal : C.gold, border: `1px solid ${c.citationKind === "source" ? C.teal : C.gold}44` }}>{c.citationKind}</span> {c.text.slice(0, 110)}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Productor: Guía de estudio (cómo se comporta el examen, del study guide oficial) ── */
function GuiaEstudioPanel() {
  const [cfg, setCfg] = useState<EngineBookConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [err, setErr] = useState("");
  useEffect(() => { let a = true; fetchBookConfig().then(c => { if (a) setCfg(c); }).catch(() => { if (a) setCfg(null); }); return () => { a = false; }; }, []);
  async function generate() {
    setBusy(true); setErr("");
    try {
      const r = await generateStudyGuide();
      if (!r.ok || !r.html) { setErr(r.error ?? "No se pudo generar."); return; }
      const next = await saveBookConfig({ blocks: { studyGuide: r.html } as EngineBookConfig["blocks"] });   // patch mínimo: el server deep-mergea, no pisa los otros bloques
      setCfg(next); setSavedAt(Date.now());
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(false); }
  }
  async function save() {
    if (!cfg) return; setSaving(true); setErr("");
    try { const r = await saveBookConfig({ blocks: { studyGuide: cfg.blocks.studyGuide } as EngineBookConfig["blocks"] }); setCfg(r); setSavedAt(Date.now()); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSaving(false); }
  }
  const inpStyle = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };
  const has = !!cfg?.blocks.studyGuide.trim();
  return (
    <Section label="GUÍA DE ESTUDIO · cómo se comporta el examen" accent={C.violet} help={{ title: "Guía de estudio", body: ["Ingiere el study guide oficial de Microsoft (learn.microsoft.com/.../study-guides/ai-200) y redacta, anclado SOLO a esa guía, una sección que explica cómo se comporta el examen: dominios, pesos y formato.", "Va en el libro después de la Introducción, antes del índice. Es texto editable: ajústalo y guarda. Regenerar lo sobrescribe."] }}>
      <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>El engine ingiere el <strong>study guide oficial</strong> y redacta cómo se comporta el examen (dominios · pesos · formato). Editá y guardá; aparece en el libro y en <strong>Ensamblar</strong>.</p>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <button onClick={generate} disabled={busy} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
          {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</> : <><Sparkles className="w-4 h-4" /> {has ? "Regenerar guía" : "Generar guía de estudio"}</>}
        </button>
        {has && <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] disabled:opacity-60" style={{ border: `1px solid ${C.violet}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Guardar</button>}
        {savedAt > 0 && !busy && !saving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓</span>}
      </div>
      {err && <p className="text-[12px] mb-2" style={{ color: "#fca5a5" }}>{err}</p>}
      {cfg && has && <textarea value={cfg.blocks.studyGuide} onChange={e => setCfg(c => c ? { ...c, blocks: { ...c.blocks, studyGuide: e.target.value } } : c)} rows={10} spellCheck={false} className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />}
      {cfg && !has && <p className="text-[12px] rounded-xl px-4 py-3" style={{ color: C.inkSoft, backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>Todavía no hay guía. Generala arriba — ingiere el study guide oficial y redacta la explicación.</p>}
    </Section>
  );
}

/* ── Productor: Intros por ruta (síntesis digerible de lo que el lector encontrará) ── */
function IntrosRutaPanel({ isMaster = false }: { isMaster?: boolean }) {
  const u = isMaster ? "capítulos" : "láminas";
  const [cfg, setCfg] = useState<EngineBookConfig | null>(null);
  const [routes, setRoutes] = useState<{ domainId: string; label: string; total: number; covered: number }[]>([]);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    let a = true;
    fetchBookConfig().then(c => { if (a) setCfg(c); }).catch(() => { if (a) setCfg(null); });
    fetchEngineCoverage().then(r => { if (a) setRoutes(r.byDomain); }).catch(() => { if (a) setRoutes([]); });
    return () => { a = false; };
  }, []);
  async function genRoute(domainId: string) {
    setBusy(domainId); setErr("");
    try {
      const r = await generateRouteIntro(domainId);
      if (!r.ok || !r.text) { setErr(`${domainId}: ${r.error ?? "no se pudo generar"}`); return; }
      // patch mínimo: el server deep-mergea por ruta → NO pisa la imageUrl del divisor ni las otras rutas
      const next = await saveBookConfig({ routeIntros: { [domainId]: { text: r.text } } as EngineBookConfig["routeIntros"] });
      setCfg(next);
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  }
  return (
    <Section label="INTROS POR RUTA · árbol de síntesis" accent={C.violet} help={{ title: "Intros por ruta", body: [`Por cada ruta (dominio) el engine redacta una síntesis digerible de lo que el lector encontrará en ${isMaster ? "el libro" : "el atlas"}.`, `Genera la síntesis aquí; en Ensamblar la copias, la condensas (≤2 págs), la formateas con tu marca y subes la imagen. En el libro va como divisor (abre-ruta) antes de ${isMaster ? "los capítulos" : "las láminas"} de cada ruta (con fallback de texto hasta que subas la imagen).`] }}>
      <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Generá la síntesis por ruta. En <strong>Ensamblar</strong> la copias, le das tratamiento de marca y subes la página formateada (con fallback de texto).</p>
      {err && <p className="text-[12px] mb-2" style={{ color: "#fca5a5" }}>{err}</p>}
      <div className="flex flex-col gap-2">
        {routes.map(rt => {
          const ri = cfg?.routeIntros?.[rt.domainId];
          const hasText = !!ri?.text.trim();
          return (
            <details key={rt.domainId} className="rounded-xl group" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
              <summary className="px-3.5 py-2.5 cursor-pointer flex items-center gap-2.5" style={{ listStyle: "none" }}>
                <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 shrink-0" style={{ color: C.inkSoft }} />
                <span className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>{rt.label}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{rt.covered}/{rt.total} {u}</span>
                {hasText ? <span className="ml-auto text-[10px]" style={{ color: C.teal }}>síntesis ✓</span> : <span className="ml-auto text-[10px]" style={{ color: `${C.ink}55` }}>sin síntesis</span>}
              </summary>
              <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.ink}0c` }}>
                <button onClick={() => genRoute(rt.domainId)} disabled={!!busy || rt.covered === 0} title={rt.covered === 0 ? `La ruta no tiene ${u} groundead${isMaster ? "os" : "as"} todavía` : ""} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] self-start hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.violet}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                  {busy === rt.domainId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {hasText ? "Regenerar síntesis" : "Generar síntesis"}
                </button>
                {hasText && <div className="rounded-lg px-3 py-2 text-[11.5px] whitespace-pre-wrap" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft, fontFamily: "ui-monospace, monospace", lineHeight: 1.5, maxHeight: 220, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: ri!.text }} />}
              </div>
            </details>
          );
        })}
        {routes.length === 0 && <p className="text-[12px]" style={{ color: C.inkSoft }}>Cargando rutas…</p>}
      </div>
    </Section>
  );
}

/* ── Pipeline documental del MASTER: módulo → (psicometría→autor→verify→supervisor) → capítulo ── */
function MasterPipelinePanel({ onChapterGrounded }: { onChapterGrounded?: (chapterId: string) => void }) {
  const [modules, setModules] = useState<EngineModule[] | null>(null);
  const [busy, setBusy] = useState("");
  const [results, setResults] = useState<Record<string, EngineGroundModuleResult>>({});
  const [err, setErr] = useState("");
  const load = () => fetchModules().then(r => setModules(r.modules)).catch(() => setModules([]));
  useEffect(() => { load(); }, []);
  const pct = (n: number) => `${Math.round(n <= 1 ? n * 100 : n)}%`;
  const tone = (s?: string) => s === "sufficient" || s === "grounded" || s === "verified" ? C.teal : s === "insufficient" || s === "ungrounded" || s === "contradicted" ? "#fca5a5" : C.gold;
  async function ground(moduleId: string, force: boolean) {
    if (force && !window.confirm("¿Regenerar el relato de este módulo? Re-corre autor + verify + supervisor (ignora la caché) y sobreescribe el capítulo.")) return;
    setBusy(moduleId); setErr("");
    try {
      const r = await groundModule(moduleId, true, force);
      setResults(x => ({ ...x, [moduleId]: r }));
      if (r.error) setErr(`${moduleId}: ${r.error}`);
      await load();
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  }
  const byDomain = new Map<string, { label: string; mods: EngineModule[] }>();
  for (const m of modules ?? []) { if (!byDomain.has(m.domainId)) byDomain.set(m.domainId, { label: m.domainLabel, mods: [] }); byDomain.get(m.domainId)!.mods.push(m); }
  const groups = [...byDomain.values()];
  return (
    <Section label="PIPELINE DOCUMENTAL · módulo → capítulo" accent={C.violet} help={{ title: "Pipeline documental", body: [
      "El Master Book se escribe por MÓDULO del temario: Psicometrista (cómo evalúa el examen) → Autor documental (teje el relato anclado a fuentes) → Verificador (fidelidad) → Supervisor (cobertura + alineación psicométrica) → persiste el capítulo.",
      "Groundeá un módulo para crear su capítulo; Regenerar re-corre el pipeline (ignora caché). Cada corrida consume crédito OpenAI (barato: ~centavos por módulo).",
    ] }}>
      {err && <p className="text-[12px] mb-2" style={{ color: "#fca5a5" }}>{err}</p>}
      {!modules ? <p className="text-[12px]" style={{ color: C.inkSoft }}>Cargando módulos…</p>
        : <div className="flex flex-col gap-4">
          {groups.map(g => (
            <div key={g.label}>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: C.violet }}>{g.label}</p>
              <div className="flex flex-col gap-2">
                {g.mods.map(m => {
                  const r = results[m.moduleId];
                  const running = busy === m.moduleId;
                  return (
                    <div key={m.moduleId} className="rounded-xl p-3" style={{ backgroundColor: C.bg, border: `1px solid ${m.hasChapter ? `${C.teal}33` : `${C.ink}14`}` }}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={m.hasChapter ? { color: C.teal, border: `1px solid ${C.teal}55` } : { color: `${C.ink}55`, border: `1px solid ${C.ink}1f` }}>{m.hasChapter ? `Cap ${m.chapterNumber}` : "sin capítulo"}</span>
                        <span className="text-[13px] flex-1 min-w-0 truncate" style={{ color: C.ink, fontWeight: 600 }}>{m.moduleTitle}</span>
                        <span className="font-mono text-[9px] shrink-0" style={{ color: `${C.ink}44` }}>{m.skills} skills</span>
                        <button onClick={() => ground(m.moduleId, m.hasChapter)} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] shrink-0 disabled:opacity-50 hover:bg-white/5" style={{ border: `1px solid ${C.violet}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {m.hasChapter ? "Regenerar" : "Groundear módulo"}
                        </button>
                        {m.hasChapter && m.chapterId && onChapterGrounded && <button onClick={() => onChapterGrounded(m.chapterId!)} className="inline-flex items-center gap-1 text-[12px] px-2.5 h-8 rounded-lg shrink-0 hover:bg-white/5" style={{ color: C.bright }}>Abrir <ArrowRight className="w-3.5 h-3.5" /></button>}
                      </div>
                      {running && <p className="text-[11px] mt-2" style={{ color: C.inkSoft }}>Corriendo el pipeline (psicometría → autor → verify → supervisor)…</p>}
                      {r && !running && (
                        <div className="flex items-center gap-3 flex-wrap text-[11px] mt-2 pt-2" style={{ borderTop: `1px solid ${C.ink}0c` }}>
                          {r.psychometrics && <span style={{ color: C.inkSoft }}>psico: {r.psychometrics.reasoningGoal}</span>}
                          {r.author && <span style={{ color: C.inkSoft }}>autor: {r.author.sections} secc · {r.author.graphics} fig{r.author.cached ? " · caché" : ""}</span>}
                          {r.grounding && <span style={{ color: tone(r.grounding.status) }}>grounding: {r.grounding.status} ({pct(r.grounding.score)})</span>}
                          {r.relevance && <span style={{ color: tone(r.relevance.status) }}>relev: {r.relevance.status} · psico {pct(r.relevance.psychoAlignment)}</span>}
                          {r.error && <span style={{ color: "#fca5a5" }}>{r.error}</span>}
                          {r.persisted && r.chapterId && onChapterGrounded && <button onClick={() => onChapterGrounded(r.chapterId!)} className="ml-auto inline-flex items-center gap-1 text-[11px]" style={{ color: C.teal }}>Abrir capítulo <ArrowRight className="w-3 h-3" /></button>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>}
    </Section>
  );
}

function GroundingStage({ reloadKey, onReload: _onReload, onPageCreated, activeBookLabel, isMaster = false, onChapterGrounded }: { reloadKey: number; onReload: () => void; onPageCreated: (id: string) => void; activeBookLabel: string; isMaster?: boolean; onChapterGrounded?: (chapterId: string) => void }) {
  // El Master (texto) no crea PÁGINAS del Atlas: su pipeline es DOCUMENTAL (módulo → capítulo) vía ground-module.
  const [panel, setPanel] = useState<"pipeline" | "moduledoc" | "arbol" | "relevancia" | "evidencia" | "guia" | "intros">(isMaster ? "moduledoc" : "pipeline");
  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Materia prima · agnóstica del formato</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Grounding</h1>
            <SectionHelp title={GROUNDING_HELP.title} body={GROUNDING_HELP.body} />
            <span title="El corpus/fuentes son COMPARTIDOS entre libros; el Pipeline documental escribe en el libro de trabajo activo." className="font-mono text-[10px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}>escribe en · {activeBookLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {((isMaster
          ? [["moduledoc", "Pipeline documental"], ["arbol", "Árbol · fuentes & cobertura"], ["relevancia", "QA de relevancia"], ["evidencia", "Evidencia · capturas"], ["guia", "Guía de estudio"], ["intros", "Intros por ruta"]]
          : [["pipeline", "Pipeline · 4 agentes"], ["arbol", "Árbol · fuentes & cobertura"], ["relevancia", "QA de relevancia"], ["evidencia", "Evidencia · capturas"], ["guia", "Guía de estudio"], ["intros", "Intros por ruta"]]) as [typeof panel, string][]).map(([id, label]) => {
          const active = panel === id;
          return (
            <button key={id} onClick={() => setPanel(id)} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] transition-all"
              style={active ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600, border: `1px solid ${C.violet}55` } : { color: C.inkSoft, border: "1px solid transparent" }}>
              {label}
            </button>
          );
        })}
      </div>
      {isMaster && panel === "moduledoc" && <MasterPipelinePanel onChapterGrounded={onChapterGrounded} />}
      {!isMaster && panel === "pipeline" && <PipelinePanel onPageCreated={onPageCreated} />}
      {panel === "arbol" && <ArbolPanel isMaster={isMaster} />}
      {panel === "relevancia" && <RelevanciaPanel reloadKey={reloadKey} />}
      {panel === "evidencia" && <EvidenciaPanel />}
      {panel === "guia" && <GuiaEstudioPanel />}
      {panel === "intros" && <IntrosRutaPanel isMaster={isMaster} />}
    </div>
  );
}

/* ── QA de relevancia: ¿las infografías generadas se llenan con info grndeada útil? ── */
function RelevanciaPanel({ reloadKey }: { reloadKey: number }) {
  const [tree, setTree] = useState<EngineGroundingTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"attn" | "all">("attn");
  const load = () => { setLoading(true); fetchGroundingTree().then(setTree).catch(() => setTree(null)).finally(() => setLoading(false)); };
  useEffect(load, [reloadKey]);
  async function improve(skillId: string) { setImproving(skillId); try { await improveRelevance(skillId); load(); } catch { /* */ } finally { setImproving(null); } }
  if (loading) return <div className="flex items-center gap-2 text-sm py-3" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando relevancia…</div>;
  if (!tree) return <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Motor no disponible.</p>;
  const t = tree.totals;
  const units = tree.domains.flatMap(d => d.modules.flatMap(m => m.units));
  const evaluated = units.filter(u => u.relevanceStatus);
  const attn = units.filter(u => u.relevanceStatus === "thin" || u.relevanceStatus === "off_topic");
  const list = filter === "attn" ? attn : evaluated;
  return (
    <div className="flex flex-col gap-4">
      <Section label="Resumen de relevancia (supervisor)" help={{ title: "QA de relevancia", body: [
        "El SUPERVISOR DE RELEVANCIA (distinto del verificador de fidelidad) juzga si las fuentes cubren la unidad y si el contenido es pertinente y completo. Solo 'suficiente' habilita production-ready.",
        "Si da 'thin' u 'off_topic', el botón 'Mejorar relevancia' corre 1 click: re-busca fuentes + re-redacta apuntando a los gaps + re-supervisa.",
      ] }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MiniStat label="Suficiente" value={`${t.sufficient}/${t.units}`} />
          <MiniStat label="Flojo" value={String(t.thin)} />
          <MiniStat label="Off-topic" value={String(t.offTopic)} />
          <MiniStat label="Sin evaluar" value={String(t.sinEvaluar)} />
        </div>
      </Section>
      <Section label={filter === "attn" ? `A mejorar · ${attn.length}` : `Evaluadas · ${evaluated.length}`}>
        <div className="flex items-center gap-1.5 mb-2.5">
          {([["attn", "A mejorar"], ["all", "Evaluadas"]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setFilter(k)} className="font-mono text-[10px] uppercase tracking-[0.12em] px-2.5 py-1 rounded-full transition-colors" style={{ color: filter === k ? C.ink : `${C.ink}66`, border: `1px solid ${filter === k ? `${C.violet}66` : `${C.ink}1a`}`, backgroundColor: filter === k ? `${C.violet}1a` : "transparent" }}>{lbl}</button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {list.map(u => {
            const tone = rTone(u.relevanceStatus);
            const fixable = u.relevanceStatus === "thin" || u.relevanceStatus === "off_topic";
            return (
              <div key={u.skillId} className="rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 shrink-0"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone }} /><span className="text-[10px] uppercase tracking-wide" style={{ color: tone }}>{u.relevanceStatus}</span></span>
                  <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: C.ink }}>{u.title}</span>
                  <span className="font-mono text-[9px] shrink-0 hidden sm:block" style={{ color: `${C.ink}44` }}>{u.skillId}</span>
                  {fixable && <button onClick={() => improve(u.skillId)} disabled={improving === u.skillId} className="inline-flex items-center gap-1 text-[11px] px-2 h-6 rounded-lg text-white disabled:opacity-60 shrink-0" style={{ backgroundColor: C.violetBtn, fontWeight: 600 }}>{improving === u.skillId ? <><Loader2 className="w-3 h-3 animate-spin" /> Mejorando…</> : <><Sparkles className="w-3 h-3" /> Mejorar</>}</button>}
                </div>
                {u.relevanceGaps.length > 0 && <p className="text-[10px] mt-1" style={{ color: `${C.ink}66` }}>Gaps: {u.relevanceGaps.join(" · ")}</p>}
              </div>
            );
          })}
          {list.length === 0 && <p className="text-[12px] py-2" style={{ color: `${C.ink}55` }}>{filter === "attn" ? "Nada a mejorar." : "Todavía no se evaluó ninguna unidad — corré el Pipeline o el supervisor."}</p>}
        </div>
      </Section>
    </div>
  );
}

/* ── Fuentes: corpus real de grounding (ingesta URL / CSV / Google Sheet) ── */
function FuentesPanel() {
  const [sources, setSources] = useState<EngineSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");        // filtro por enlace / texto
  const [since, setSince] = useState(""); // filtro por fecha (addedAt >= since)

  const load = () => { setLoading(true); fetchEngineSources().then(r => setSources(r.sources)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  async function addUrl() {
    const v = url.trim(); if (!v) return;
    setBusy(true); setMsg(null);
    try { const r = await ingestSourceUrl(v); if (!r.ok) setMsg({ ok: false, text: r.error ?? "falló" }); else { setUrl(""); setMsg({ ok: true, text: `Fuente ingerida: ${r.source?.title.slice(0, 60)}` }); load(); } }
    catch (e) { setMsg({ ok: false, text: String((e as Error).message || e) }); } finally { setBusy(false); }
  }
  async function addCsv() {
    const v = csv.trim(); if (!v) return;
    setBusy(true); setMsg(null);
    const isSheet = /docs\.google\.com\/spreadsheets/.test(v);
    try { const r = await ingestSourceCsv(isSheet ? { url: v } : { csv: v }); if (!r.ok) setMsg({ ok: false, text: r.error ?? "falló" }); else { setCsv(""); setMsg({ ok: true, text: `${r.sources?.length ?? 0} fuente(s) ingerida(s)` }); load(); } }
    catch (e) { setMsg({ ok: false, text: String((e as Error).message || e) }); } finally { setBusy(false); }
  }
  async function del(id: string) { await deleteEngineSource(id); load(); }

  const kindColor = (k: EngineSource["kind"]) => k === "mslearn" ? C.blue : k === "sheet" ? C.teal : k === "doc" ? C.violet : C.inkSoft;

  const ql = q.trim().toLowerCase();
  const filtered = sources.filter(s => {
    if (ql && !`${s.title} ${s.url ?? ""}`.toLowerCase().includes(ql)) return false;
    if (since && (!s.addedAt || s.addedAt.slice(0, 10) < since)) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4">
      <Section label="Ingerir fuentes (URL · MS Learn · doc · web)">
        <div className="flex flex-wrap gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addUrl(); }} placeholder="https://learn.microsoft.com/…" className="flex-1 min-w-[240px] h-10 px-3 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
          <button onClick={addUrl} disabled={busy} className="inline-flex items-center gap-2 px-4 h-10 rounded-lg text-sm text-white disabled:opacity-60 disabled:cursor-default" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Ingerir URL</button>
        </div>
      </Section>

      <Section label="Pegar CSV o URL de Google Sheet (pública)">
        <textarea value={csv} onChange={e => setCsv(e.target.value)} rows={3} placeholder={"titulo,url,nota\nACR tiers,https://learn.microsoft.com/…,Basic/Standard/Premium\n…  — o pegá un link de Google Sheets"} className="w-full px-3 py-2 rounded-lg text-[12px] font-mono outline-none resize-y" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
        <button onClick={addCsv} disabled={busy} className="mt-2 inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[13px] disabled:opacity-60 disabled:cursor-default" style={{ border: `1px solid ${C.bright}55`, color: C.bright }}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ingerir CSV / Sheet</button>
      </Section>

      {msg && <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: msg.ok ? C.teal : "#fca5a5", backgroundColor: msg.ok ? `${C.teal}10` : "rgba(248,113,113,0.1)", border: `1px solid ${msg.ok ? `${C.teal}33` : "rgba(248,113,113,0.25)"}` }}>{msg.text}</p>}

      <Section label={`Corpus de fuentes${sources.length ? ` · ${filtered.length}/${sources.length}` : ""}`}>
        {sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px] h-9 px-2.5 rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f` }}>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}55` }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrar por enlace o título…" className="flex-1 min-w-0 bg-transparent text-[12px] outline-none" style={{ color: C.ink }} />
            </div>
            <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f` }}>
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}55` }} />
              <input type="date" value={since} onChange={e => setSince(e.target.value)} title="Desde esta fecha de ingesta" className="bg-transparent text-[12px] outline-none" style={{ color: C.ink, colorScheme: "dark" }} />
            </div>
            {(q || since) && <button onClick={() => { setQ(""); setSince(""); }} className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg text-[11px] hover:bg-white/5" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}><X className="w-3.5 h-3.5" /> Limpiar</button>}
          </div>
        )}
        {loading ? (
          <div className="flex items-center gap-2 text-sm py-2" style={{ color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
        ) : sources.length === 0 ? (
          <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Sin fuentes todavía. Ingerí una URL de MS Learn o pegá un CSV.</p>
        ) : filtered.length === 0 ? (
          <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Ninguna fuente coincide con el filtro.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map(s => (
              <div key={s.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
                <span className="font-mono text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ color: kindColor(s.kind), border: `1px solid ${kindColor(s.kind)}44` }}>{s.kind}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] truncate" style={{ color: C.ink }}>{s.title}</p>
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10px] truncate block hover:underline" style={{ color: C.bright }}>{s.url}</a>}
                </div>
                <span className="font-mono text-[10px] shrink-0 tabular-nums hidden sm:block" style={{ color: `${C.ink}44` }}>{fmtWhen(s.addedAt)}</span>
                <span className="text-[10px] shrink-0" style={{ color: `${C.ink}44` }}>{(s.text?.length ?? 0).toLocaleString()} ch</span>
                <button onClick={() => del(s.id)} title="Quitar" className="shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-white/5" style={{ color: `${C.ink}55` }}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] mt-3" style={{ color: `${C.ink}44` }}>Este corpus alimenta la autoría anclada y la verificación de citas. Filtrá por enlace o por fecha de ingesta.</p>
      </Section>
    </div>
  );
}

/* ── Cobertura: skills cubiertas vs brechas + autoría anclada (corrida 11) ── */
function CoberturaPanel({ onReload, onPageCreated }: { onReload: () => void; onPageCreated: (pageId: string) => void }) {
  const [cov, setCov] = useState<EngineCoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<EngineSource[]>([]);
  const [authoring, setAuthoring] = useState<string | null>(null);
  const [result, setResult] = useState<EngineAuthoredPage | null>(null);
  const [authErr, setAuthErr] = useState("");
  useEffect(() => {
    setLoading(true);
    fetchEngineCoverage().then(setCov).catch(() => {}).finally(() => setLoading(false));
    fetchEngineSources().then(r => setSources(r.sources)).catch(() => {});
  }, []);
  const srcMap = new Map(sources.map(s => [s.id, s] as const));

  async function author(skillId: string) {
    setAuthoring(skillId); setAuthErr(""); setResult(null);
    try { setResult(await runAuthor(skillId)); } catch (e) { setAuthErr(String((e as Error).message || e)); } finally { setAuthoring(null); }
  }

  if (loading && !cov) return <div className="rounded-2xl p-8 text-sm flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Calculando cobertura…</div>;
  if (!cov) return <div className="rounded-2xl p-6 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Sin datos de cobertura.</div>;
  const pct = cov.totalSkills ? Math.round((cov.coveredSkills / cov.totalSkills) * 100) : 0;
  return (
    <div className="flex flex-col gap-4">
      <Section label="Cobertura de skills del examen">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[13px]" style={{ color: C.ink }}><strong style={{ fontFamily: D, fontWeight: 700, color: C.teal }}>{cov.coveredSkills}</strong>/{cov.totalSkills} skills con página</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full" style={{ color: cov.taxonomyStatus === "validated" ? C.teal : C.gold, border: `1px solid ${cov.taxonomyStatus === "validated" ? C.teal : C.gold}55` }}>taxonomía {cov.taxonomyStatus}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: `${C.ink}14` }}><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: C.teal }} /></div>
        {cov.byDomain.map(d => (
          <div key={d.domainId} className="flex items-center justify-between text-[12px] py-1">
            <span style={{ color: C.inkSoft }}>{d.label}</span>
            <span style={{ color: d.covered === d.total ? C.teal : C.gold, fontFamily: D, fontWeight: 600 }}>{d.covered}/{d.total}</span>
          </div>
        ))}
      </Section>

      {cov.gaps.length > 0 && (
        <Section label={`Brechas · ${cov.gaps.length} skills sin página`} accent={C.gold}>
          <div className="flex flex-col gap-1.5">
            {cov.gaps.map(g => (
              <div key={g.skillId} className="flex items-center gap-2 text-[12px]">
                <CircleDashed className="w-3.5 h-3.5 shrink-0" style={{ color: C.gold }} />
                <span className="flex-1 min-w-0 truncate" style={{ color: C.inkSoft }}>{g.title}</span>
                <button onClick={() => author(g.skillId)} disabled={!!authoring} className="shrink-0 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] transition-all hover:bg-white/5 disabled:opacity-50 disabled:cursor-default" style={{ border: `1px solid ${C.violet}55`, color: C.bright }}>
                  {authoring === g.skillId ? <><Loader2 className="w-3 h-3 animate-spin" /> Redactando…</> : <><Sparkles className="w-3 h-3" /> Redactar con IA</>}
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-3" style={{ color: `${C.ink}44` }}>La IA redacta cada brecha anclada al corpus de fuentes, con citas. Texto: ~centavos.</p>
        </Section>
      )}

      {authErr && <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{authErr}</p>}
      {result && <AuthoredResultCard result={result} srcMap={srcMap} onReload={onReload} onPageCreated={onPageCreated} />}
    </div>
  );
}

function AuthoredResultCard({ result: r, srcMap, onReload, onPageCreated }: { result: EngineAuthoredPage; srcMap: Map<string, EngineSource>; onReload: () => void; onPageCreated: (pageId: string) => void }) {
  const [grounding, setGrounding] = useState<EngineGroundingResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [vErr, setVErr] = useState("");
  const [persisting, setPersisting] = useState(false);
  const [persistMsg, setPersistMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setGrounding(null); setVErr(""); setPersistMsg(null); }, [r.skillId]);
  async function verify() {
    setVerifying(true); setVErr("");
    try { setGrounding(await verifyGroundingApi(r.skillId)); } catch (e) { setVErr(String((e as Error).message || e)); } finally { setVerifying(false); }
  }
  async function persist() {
    setPersisting(true); setPersistMsg(null);
    try {
      const res = await persistAuthored(r.skillId);
      if (res.ok && res.pageId) {
        setPersistMsg({ ok: true, text: `Página ${res.pageId} creada (grounding ${res.groundingStatus}). Abriendo Generar…` });
        onReload();
        setTimeout(() => onPageCreated(res.pageId!), 700);
      } else {
        setPersistMsg({ ok: false, text: res.error ?? res.reason ?? "No se pudo crear la página." });
      }
    } catch (e) { setPersistMsg({ ok: false, text: String((e as Error).message || e) }); }
    finally { setPersisting(false); }
  }
  if (r.outcome === "no_sources") return <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: C.gold, backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33` }}>{r.error} (pestaña Fuentes)</p>;
  if (r.outcome === "no_key") return <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: C.gold }}>{r.error}</p>;
  if (r.outcome === "failed" || !r.draft) return <p className="text-[12px]" style={{ color: "#fca5a5" }}>Autoría falló: {r.error}</p>;
  const d = r.draft;
  const citColor = (k: EngineCitation["kind"]) => k === "source" ? C.teal : k === "web" ? C.blue : C.gold;
  const verdictColor = (v: EngineClaimVerdict) => v === "supported" ? C.teal : v === "no_source" ? C.gold : "#fca5a5";
  const verdictMap = new Map((grounding?.checks ?? []).map(c => [c.claimId, c] as const));
  const gColor = !grounding ? C.inkSoft : grounding.groundingStatus === "verified" ? C.teal : grounding.groundingStatus === "partial" ? C.gold : "#fca5a5";
  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${C.violet}10, ${C.card})`, border: `1px solid ${C.violet}33` }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <h3 className="text-[15px] tracking-tight inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><Sparkles className="w-4 h-4" style={{ color: C.bright }} /> Borrador anclado · {r.skillTitle}</h3>
        <div className="flex items-center gap-2">
          {r.cached && <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full" style={{ color: `${C.ink}55`, border: `1px solid ${C.ink}1f` }}>cache</span>}
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>{r.citedClaims} citadas</span>
          {r.modelClaims > 0 && <span className="font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded" style={{ color: C.gold, border: `1px solid ${C.gold}44` }}>{r.modelClaims} sin fuente</span>}
        </div>
      </div>
      {r.coverageNote && <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>{r.coverageNote} <span style={{ color: `${C.ink}44` }}>· {r.model}</span></p>}

      {/* gate de grounding: verificación independiente de cada afirmación */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: `${gColor}0d`, border: `1px solid ${gColor}33` }}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-[12px] inline-flex items-center gap-1.5" style={{ fontFamily: D, fontWeight: 700, color: gColor }}>
            {grounding ? (grounding.groundingStatus === "verified" ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />) : <ShieldCheck className="w-4 h-4" style={{ opacity: 0.5 }} />}
            Grounding: {grounding ? grounding.groundingStatus : "sin verificar"}
          </span>
          {grounding && <span className="text-[11px]" style={{ color: C.inkSoft }}>{grounding.score}/10 · {grounding.supported} ok · {grounding.noSource} sin fuente{grounding.unsupported + grounding.contradicted > 0 ? ` · ${grounding.unsupported + grounding.contradicted} sin respaldo` : ""}</span>}
          {grounding?.blocked && <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded-full" style={{ color: "#fca5a5", border: "1px solid rgba(248,113,113,0.4)" }}>bloqueada</span>}
        </div>
        <button onClick={verify} disabled={verifying} className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] transition-all hover:bg-white/5 disabled:opacity-60 disabled:cursor-default" style={{ border: `1px solid ${C.bright}55`, color: C.bright }}>
          {verifying ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando…</> : <><ShieldCheck className="w-3.5 h-3.5" /> Verificar grounding</>}
        </button>
      </div>
      {grounding && <p className="text-[11px] mb-3" style={{ color: grounding.blocked ? "#fca5a5" : `${C.ink}66` }}>{grounding.reason}</p>}
      {vErr && <p className="text-[12px] mb-3" style={{ color: "#fca5a5" }}>{vErr}</p>}

      <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
        <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{d.title} <span style={{ color: C.blue }}>— {d.subtitle}</span></p>
        <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: C.inkSoft }}>{d.context}</p>
        <p className="text-[12px] mt-2" style={{ color: C.bright }}>Guía: <span style={{ color: C.inkSoft }}>{d.guideQuestion}</span></p>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-1" style={{ color: "#fca5a5" }}>Trampas · {d.traps.length}</p>
            {d.traps.map((t, i) => <p key={i} className="text-[11px] leading-snug mb-1"><span style={{ color: "#fca5a5", fontWeight: 600 }}>{t.wrong}</span> <span style={{ color: C.inkSoft }}>— {t.correction}</span></p>)}
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-1" style={{ color: C.blue }}>Autocheck</p>
            <p className="text-[11px]" style={{ color: C.ink }}>{d.autocheck.question}</p>
            {d.autocheck.options.map((o, i) => <p key={i} className="text-[11px]" style={{ color: i === d.autocheck.correctOption ? C.green : C.inkSoft, fontWeight: i === d.autocheck.correctOption ? 700 : 400 }}>{o}</p>)}
          </div>
        </div>
      </div>

      <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}55` }}>Afirmaciones + citas · {r.claims.length}</p>
      <div className="flex flex-col gap-2">
        {r.claims.map(c => {
          const src = c.citation.sourceId ? srcMap.get(c.citation.sourceId) : null;
          const col = citColor(c.citation.kind);
          const v = verdictMap.get(c.id);
          return (
            <div key={c.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${v ? `${verdictColor(v.verdict)}33` : `${C.ink}10`}` }}>
              <div className="flex items-start gap-2">
                <span className="font-mono text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ color: col, border: `1px solid ${col}44` }}>{c.citation.kind}</span>
                <p className="text-[12px] flex-1" style={{ color: C.ink }}>{c.text}</p>
                {v && <span className="font-mono text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ color: verdictColor(v.verdict), border: `1px solid ${verdictColor(v.verdict)}55` }}>{v.verdict}</span>}
              </div>
              {c.citation.quote && <p className="text-[11px] mt-1.5 italic leading-snug" style={{ color: C.inkSoft, borderLeft: `2px solid ${col}55`, paddingLeft: 8 }}>“{c.citation.quote}”</p>}
              {src && <a href={src.url ?? "#"} target={src.url ? "_blank" : undefined} rel="noopener noreferrer" className="text-[10px] mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: C.bright }}>{src.url && <ExternalLink className="w-3 h-3" />} {src.title}</a>}
              {v?.note && <p className="text-[10px] mt-1" style={{ color: `${C.ink}66` }}>{v.note}</p>}
              {c.citation.kind === "model" && !c.citation.quote && !v && <p className="text-[10px] mt-1" style={{ color: `${C.ink}55` }}>Sin fuente — apoyada en el modelo.</p>}
            </div>
          );
        })}
      </div>
      {/* acción real: crear la página (verifica grounding server-side; bloquea si no cierra) */}
      <div className="mt-4 pt-3 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: `1px solid ${C.ink}14` }}>
        <p className="text-[11px] leading-relaxed flex-1 min-w-[200px]" style={{ color: `${C.ink}66` }}>
          <strong style={{ color: C.ink }}>Crear página</strong> verifica el grounding y, si cierra (no contradicha/sin respaldo), persiste el borrador como página real lista para <strong style={{ color: C.bright }}>Generar</strong>.
        </p>
        <button onClick={persist} disabled={persisting} className="shrink-0 inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-default" style={{ background: `linear-gradient(135deg, ${C.violetBtn}, ${C.violet})`, color: "#fff", fontFamily: D, fontWeight: 600 }}>
          {persisting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando página…</> : <><Sparkles className="w-4 h-4" /> Crear página</>}
        </button>
      </div>
      {persistMsg && (
        <p className="text-[12px] mt-2 rounded-lg px-3 py-2" style={persistMsg.ok
          ? { color: C.green, backgroundColor: `${C.green}14`, border: `1px solid ${C.green}40` }
          : { color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{persistMsg.text}</p>
      )}
    </div>
  );
}

function Section({ label, accent, help, children }: { label: string; accent?: string; help?: MetricHelp; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5" style={{ color: accent ?? `${C.ink}66` }}>
          {accent && <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: accent }} />}{label}
        </p>
        {help && <SectionHelp mini title={help.title} body={help.body} />}
      </div>
      {children}
    </div>
  );
}

/* ── etapa QA (estructural + contrato de identidad) ── */
function ScoreCard({ title, subtitle, score, color, checks }: {
  title: string; subtitle?: string; score: number | undefined; color: string;
  checks: { name: string; ok: boolean; detail?: string }[] | null | undefined;
}) {
  const passed = score != null && score >= 9.9;
  return (
    <div className="rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${color}10, ${C.card})`, border: `1px solid ${passed ? `${color}55` : `${C.ink}14`}` }}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[15px] tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{title}</h3>
          {subtitle && <p className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}55` }}>{subtitle}</p>}
        </div>
        <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.1rem", color: passed ? color : C.gold }}>{score != null ? score.toFixed(1) : "—"}/10</span>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-1.5">
        {(checks ?? []).map((c, i) => (
          <span key={i} className="inline-flex items-start gap-1.5 text-[12px]" style={{ color: c.ok ? C.ink : C.inkSoft }}>
            {c.ok ? <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color }} /> : <X className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#f87171" }} />}
            <span>{c.name}{c.detail ? <span style={{ color: `${C.ink}55` }}> · {c.detail}</span> : null}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── veredicto premium: gates combinados en uno (production-ready / arte / blocked) ── */

/* ── Cockpit de QA: metadatos de estado/dimensión ── */
const OP_META: Record<EngineOperationalStatus, { label: string; color: string }> = {
  lista: { label: "Lista", color: C.teal },
  por_aprobar: { label: "Por aprobar", color: C.bright },
  regenerar: { label: "Regenerar", color: C.gold },
  generar: { label: "Generar", color: C.gold },
  revisar_contenido: { label: "Revisar contenido", color: "#fb923c" },
  bloqueada: { label: "Bloqueada", color: "#ef4444" },
  reaprobar: { label: "Reaprobar", color: C.gold },
};
const DIM_COLOR = (s: string): string => s === "ok" ? C.teal : s === "warn" ? C.gold : s === "bad" ? "#ef4444" : `${C.ink}55`;
const DIM_NAMES: { key: "fidelidad" | "calidad" | "consistencia" | "reproducibilidad"; label: string }[] = [
  { key: "fidelidad", label: "Fidelidad" }, { key: "calidad", label: "Calidad" },
  { key: "consistencia", label: "Consistencia" }, { key: "reproducibilidad", label: "Reproducibilidad" },
];

function OpBadge({ status }: { status: EngineOperationalStatus }) {
  const m = OP_META[status];
  return <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full shrink-0" style={{ color: m.color, border: `1px solid ${m.color}55` }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} /> {m.label}</span>;
}

function DimDetailModal({ title, dim, onClose }: { title: string; dim: EngineQaDimension; onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(6,8,16,0.8)", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-5 max-h-[80vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[15px] inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><span className="w-2 h-2 rounded-sm" style={{ background: DIM_COLOR(dim.status) }} /> {title}</h3>
          <button onClick={onClose} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px]" style={{ border: `1px solid ${C.ink}26`, color: C.ink }}><X className="w-3.5 h-3.5" /> Cerrar</button>
        </div>
        <p className="text-[12px] mb-3" style={{ color: DIM_COLOR(dim.status) }}>{dim.label}{dim.score != null ? ` · ${dim.score}/10` : ""}</p>
        <div className="flex flex-col gap-1.5">
          {dim.detail.length ? dim.detail.map((line, i) => (
            <p key={i} className="text-[12px] leading-snug" style={{ color: line.startsWith("⚠") ? C.gold : C.inkSoft }}>{line}</p>
          )) : <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Sin detalle.</p>}
        </div>
      </div>
    </div>
  );
}

function DimCard({ name, dim, onOpen }: { name: string; dim: EngineQaDimension; onOpen: () => void }) {
  const col = DIM_COLOR(dim.status);
  return (
    <button onClick={onOpen} className="text-left rounded-2xl p-4 transition-all hover:bg-white/[0.02]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: `${C.ink}66` }}>{name}</span>
        <span className="w-2 h-2 rounded-full" style={{ background: col }} />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700, color: dim.status === "pending" ? `${C.ink}55` : C.ink }}>{dim.score != null ? dim.score : "—"}</span>
        {dim.score != null && <span className="text-[11px]" style={{ color: `${C.ink}44` }}>/10</span>}
      </div>
      <p className="text-[11px] mt-1 leading-snug" style={{ color: col }}>{dim.label}</p>
      <p className="text-[10px] mt-1.5 inline-flex items-center gap-1" style={{ color: `${C.ink}55` }}>ver detalle <ChevronRight className="w-3 h-3" /></p>
    </button>
  );
}

/* ── Panel de QA POR RUTA: la cuadrilla de 7 expertos lee la ruta ensamblada y deja su veredicto escrito ── */
const PANEL_EXPERTS: { id: string; name: string; icon: string; kind: "visual" | "contenido" }[] = [
  { id: "production-editor", name: "Editor de producción", icon: "book-marked", kind: "visual" },
  { id: "typography", name: "Tipógrafo", icon: "type", kind: "visual" },
  { id: "sme-factcheck", name: "Linter técnico (SME)", icon: "shield-alert", kind: "contenido" },
  { id: "instructional-design", name: "Diseñador instruccional", icon: "graduation-cap", kind: "contenido" },
  { id: "grounding-fidelity", name: "Linter de fidelidad", icon: "file-search", kind: "contenido" },
  { id: "exam-alignment", name: "Alineación con examen", icon: "target", kind: "contenido" },
  { id: "reader-engagement", name: "Lector / abandono", icon: "smile", kind: "contenido" },
];
const PANEL_VERDICT: Record<string, { label: string; col: string }> = {
  ship: { label: "Listo", col: C.teal }, revise: { label: "Revisar", col: C.gold }, block: { label: "Bloqueado", col: "#fca5a5" },
};
const sevCol = (s: string): string => (s === "blocker" ? "#fca5a5" : s === "major" ? C.gold : `${C.ink}77`);
const scoreCol = (n: number | null): string => (n == null ? `${C.ink}55` : n >= 8 ? C.teal : n >= 6.5 ? C.gold : "#fca5a5");
const routeShort = (label: string): string => (label || "").replace(/^Ruta\s+\d+\s*[—–-]\s*/i, "").trim();

function PanelExpertCard({ e }: { e: RouteExpertVerdict }) {
  const meta = PANEL_EXPERTS.find(p => p.id === e.id);
  const Ic = AGENT_ICON[meta?.icon ?? ""] ?? Sparkles;
  const failed = !!e.error;
  return (
    <div className="rounded-xl p-3.5" style={{ backgroundColor: C.card, border: `1px solid ${failed ? "#fca5a533" : `${C.ink}14`}` }}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.violet}18`, border: `1px solid ${C.violet}33` }}>
          <Ic className="w-4 h-4" style={{ color: C.violet }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13px] truncate" style={{ fontFamily: D, fontWeight: 600, color: C.ink }}>{meta?.name ?? e.id}</p>
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded" style={{ color: `${C.ink}66`, border: `1px solid ${C.ink}1f` }}>{e.modality === "vision" ? "visual" : e.modality === "lint" ? "regla" : "texto"}</span>
            {(e.runs ?? 1) > 1 && <span className="font-mono text-[8px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded" title={`mediana de ${e.runs} corridas (estabiliza el juicio)`} style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>mediana ×{e.runs}</span>}
          </div>
          {failed ? (
            <p className="text-[11px] mt-0.5" style={{ color: "#fca5a5" }}>No pudo evaluar: {e.error}</p>
          ) : (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg leading-none" style={{ fontFamily: D, fontWeight: 700, color: scoreCol(e.score) }}>{e.score == null ? "—" : e.score.toFixed(1)}</span>
              <span className="text-[10px]" style={{ color: `${C.ink}55` }}>/10</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full ml-1" style={{ color: e.would_ship ? C.teal : C.gold, border: `1px solid ${(e.would_ship ? C.teal : C.gold)}55` }}>
                {e.would_ship ? "publicaría" : "revisaría"}
              </span>
            </div>
          )}
        </div>
      </div>
      {!failed && e.veredicto && <p className="text-[12px] leading-snug mt-2.5" style={{ color: C.inkSoft }}>{e.veredicto}</p>}
      {!failed && e.findings.length > 0 && (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {e.findings.map((f, i) => (
            <li key={i} className="text-[11px] leading-snug flex gap-2">
              <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: sevCol(f.severity) }} />
              <span style={{ color: `${C.ink}cc` }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.1em] mr-1" style={{ color: sevCol(f.severity) }}>{f.severity}</span>
                {f.issue}{f.where ? <span style={{ color: `${C.ink}66` }}> · {f.where}</span> : null}
                {f.fix ? <span style={{ color: C.teal }}> → {f.fix}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoutePanelTab({ hasKey }: { hasKey: boolean }) {
  const [routes, setRoutes] = useState<{ domainId: string; label: string; chapters: number }[]>([]);
  const [panels, setPanels] = useState<Record<string, RoutePanelRun[]>>({});
  const [sel, setSel] = useState<string>("");
  const [busy, setBusy] = useState<string>("");     // `panel:<id>` | `regen:<id>`
  const [armed, setArmed] = useState<string>("");    // dominio con regeneración armada (confirmación en 2 pasos)
  const [err, setErr] = useState<string>("");

  const loadPanels = () => fetchAllRoutePanels().then(r => setPanels(r.panels ?? {})).catch(() => setPanels({}));
  useEffect(() => {
    let a = true;
    fetchChapters().then(r => {
      if (!a) return;
      const m = new Map<string, { domainId: string; label: string; chapters: number }>();
      for (const c of r.chapters ?? []) {
        const id = c.seed.domainId;
        const e = m.get(id) ?? { domainId: id, label: c.seed.domainLabel || id, chapters: 0 };
        e.chapters += 1; m.set(id, e);
      }
      const list = [...m.values()].sort((x, y) => x.domainId.localeCompare(y.domainId, undefined, { numeric: true }));
      setRoutes(list);
      setSel(s => s || list[0]?.domainId || "");
    }).catch(() => setRoutes([]));
    loadPanels();
    return () => { a = false; };
  }, []);

  async function runPanel(domainId: string) {
    setBusy(`panel:${domainId}`); setErr("");
    try { const r = await runRoutePanelApi(domainId); if (!r.ok) setErr(r.error ?? "El panel falló."); await loadPanels(); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(""); }
  }
  async function regen(domainId: string) {
    setArmed(""); setBusy(`regen:${domainId}`); setErr("");
    try { const r = await regenerateRoute(domainId, true, true); if (r.panelError) setErr(`Regenerada, pero el panel falló: ${r.panelError}`); await loadPanels(); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setBusy(""); }
  }

  const hist = panels[sel] ?? [];
  const run = hist[0] ?? null;
  const selRoute = routes.find(r => r.domainId === sel);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl p-3.5 flex items-start gap-2.5" style={{ backgroundColor: `${C.violet}0e`, border: `1px solid ${C.violet}2a` }}>
        <Users className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.violet }} />
        <p className="text-[12px] leading-snug" style={{ color: C.inkSoft }}>
          Cada vez que se genera una ruta, la cuadrilla de <strong style={{ color: C.ink }}>7 expertos</strong> (2 visuales + 5 de contenido) la lee y deja su veredicto escrito. Da explicabilidad y un punto de mejora — y guarda la <strong style={{ color: C.ink }}>tendencia</strong> entre regeneraciones.
        </p>
      </div>
      {!hasKey && <p className="text-[12px]" style={{ color: C.gold }}>Sin llave OpenAI: correr el panel o regenerar no funcionará hasta configurarla.</p>}
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}

      <div className="grid md:grid-cols-[240px_1fr] gap-4">
        {/* lista de rutas */}
        <div className="flex flex-col gap-2">
          {routes.length === 0 && <p className="text-[12px]" style={{ color: `${C.ink}66` }}>No hay rutas con capítulos en el libro activo.</p>}
          {routes.map(r => {
            const last = panels[r.domainId]?.[0] ?? null;
            const active = r.domainId === sel;
            const vm = last ? PANEL_VERDICT[last.aggregate.verdict] : null;
            return (
              <button key={r.domainId} onClick={() => setSel(r.domainId)} className="rounded-xl p-3 text-left transition-all" style={{ backgroundColor: active ? `${C.violet}16` : C.card, border: `1px solid ${active ? C.violet : `${C.ink}14`}` }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] truncate" style={{ fontFamily: D, fontWeight: 600, color: C.ink }}>{routeShort(r.label)}</p>
                  {last && <span className="text-[15px] shrink-0" style={{ fontFamily: D, fontWeight: 700, color: scoreCol(last.aggregate.score) }}>{last.aggregate.score.toFixed(1)}</span>}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px]" style={{ color: `${C.ink}66` }}>{r.chapters} caps</span>
                  {vm && <><span style={{ color: `${C.ink}33` }}>·</span><span className="font-mono text-[9px] uppercase tracking-[0.12em]" style={{ color: vm.col }}>{vm.label}</span></>}
                  {!last && <><span style={{ color: `${C.ink}33` }}>·</span><span className="text-[10px]" style={{ color: `${C.ink}55` }}>sin evaluar</span></>}
                </div>
              </button>
            );
          })}
        </div>

        {/* detalle de la ruta seleccionada */}
        <div className="flex flex-col gap-3">
          {selRoute && (
            <div className="flex flex-wrap items-center gap-2.5">
              {run ? (
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl leading-none" style={{ fontFamily: D, fontWeight: 800, color: scoreCol(run.aggregate.score) }}>{run.aggregate.score.toFixed(1)}</span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: PANEL_VERDICT[run.aggregate.verdict].col }}>{PANEL_VERDICT[run.aggregate.verdict].label}</span>
                    <span className="text-[10px]" style={{ color: `${C.ink}66` }}>{run.aggregate.wouldShipCount}/{run.aggregate.total} publicaría{run.aggregate.blockers > 0 ? ` · ${run.aggregate.blockers} blocker${run.aggregate.blockers > 1 ? "s" : ""}` : ""}</span>
                  </div>
                </div>
              ) : <p className="text-[13px]" style={{ color: `${C.ink}88` }}>Esta ruta aún no fue evaluada por el panel.</p>}
              <div className="ml-auto flex items-center gap-2">
                <button disabled={!hasKey || !!busy} onClick={() => runPanel(sel)} className="h-9 px-3.5 rounded-lg text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                  {busy === `panel:${sel}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Correr panel
                </button>
                {armed === sel ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button disabled={!!busy} onClick={() => regen(sel)} className="h-9 px-3 rounded-lg text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40" style={{ backgroundColor: "#fca5a51f", border: "1px solid #fca5a566", color: "#fca5a5" }}>
                      {busy === `regen:${sel}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Confirmar
                    </button>
                    <button onClick={() => setArmed("")} className="h-9 px-2.5 rounded-lg text-[12px]" style={{ color: `${C.ink}88` }}>Cancelar</button>
                  </div>
                ) : (
                  <button disabled={!hasKey || !!busy} onClick={() => setArmed(sel)} className="h-9 px-3.5 rounded-lg text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40" style={{ backgroundColor: `${C.violet}18`, border: `1px solid ${C.violet}`, color: "#fff" }}>
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerar ruta
                  </button>
                )}
              </div>
            </div>
          )}
          {armed === sel && <p className="text-[11px]" style={{ color: C.gold }}>Regenerar re-groundea todos los capítulos de la ruta y el capítulo integrador bajo los prompts endurecidos (varias llamadas al modelo) y vuelve a correr el panel. Puede tardar.</p>}

          {busy === `regen:${sel}` && <p className="text-[12px] inline-flex items-center gap-1.5" style={{ color: C.violet }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerando la ruta y re-evaluando… no cierres la pestaña.</p>}

          {run && (
            <>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {PANEL_EXPERTS.map(pe => {
                  const e = run.experts.find(x => x.id === pe.id);
                  return e ? <PanelExpertCard key={pe.id} e={e} /> : null;
                })}
              </div>
              {/* tendencia entre regeneraciones */}
              {hist.length > 1 && (
                <div className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}66` }}>Tendencia · {hist.length} generaciones</p>
                  <div className="flex items-end gap-2 flex-wrap">
                    {[...hist].reverse().map(h => (
                      <div key={h.generation} className="flex flex-col items-center gap-1">
                        <span className="text-[13px]" style={{ fontFamily: D, fontWeight: 700, color: scoreCol(h.aggregate.score) }}>{h.aggregate.score.toFixed(1)}</span>
                        <span className="w-8 rounded-t" style={{ height: `${Math.max(4, h.aggregate.score * 5)}px`, backgroundColor: scoreCol(h.aggregate.score) }} />
                        <span className="text-[9px]" style={{ color: `${C.ink}55` }}>g{h.generation}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: `${C.ink}55` }}>Última corrida: gen {run.generation} · {run.pages} págs · {new Date(run.ts).toLocaleString("es")} · {run.model}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Cola de REVISIÓN HUMANA: claims contestados que el pipeline no resolvió solo (bloqueados / 'wrong' sin 2º voto) ── */
function ReviewQueueTab() {
  const [items, setItems] = useState<EngineClaimReview[] | null>(null);
  const [busy, setBusy] = useState("");
  const load = () => fetchClaimReviews().then(r => setItems(r.reviews)).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  async function resolve(id: string, status: "accepted" | "rejected" | "pending") {
    setBusy(id); try { await resolveClaimReview(id, status); await load(); } catch { /* noop */ } finally { setBusy(""); }
  }
  if (!items) return <div className="rounded-2xl p-8 text-sm flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Leyendo cola de revisión…</div>;
  const pending = items.filter(i => i.status === "pending");
  const kTone = (k: string) => k === "blocked" ? "#fca5a5" : C.gold;
  const kLabel: Record<string, string> = { blocked: "bloqueó el capítulo", unconfirmed: "sin 2º voto" };
  const sLabel: Record<string, string> = { pending: "pendiente", accepted: "correcto (gate se pasó)", rejected: "error real" };
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-[15px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Revisión humana de claims</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: pending.length ? C.gold : C.teal, border: `1px solid ${(pending.length ? C.gold : C.teal)}55` }}>{pending.length} pendiente(s)</span>
        </div>
        <p className="text-[12px]" style={{ color: C.inkSoft }}>Afirmaciones que el pipeline no pudo resolver solo (dato en disputa o falso positivo del gate). <b>Correcto</b> = el claim está bien y el gate se pasó; <b>Error real</b> = hay que corregir el capítulo.</p>
      </div>
      {items.length === 0
        ? <div className="rounded-2xl p-8 text-[13px] text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Sin claims en revisión. El pipeline resolvió todo. ✓</div>
        : <div className="flex flex-col gap-2">
          {items.map(it => (
            <div key={it.id} className="rounded-xl p-3.5 flex flex-col gap-2" style={{ backgroundColor: C.card, border: `1px solid ${it.status === "pending" ? `${kTone(it.kind)}44` : `${C.ink}12`}`, opacity: it.status === "pending" ? 1 : 0.6 }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px]" style={{ color: C.violet }}>{it.chapterNumber} · {it.domainLabel}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: kTone(it.kind), border: `1px solid ${kTone(it.kind)}55` }}>{kLabel[it.kind] ?? it.kind}</span>
                {it.status !== "pending" && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: it.status === "accepted" ? C.teal : "#fca5a5", border: `1px solid ${(it.status === "accepted" ? C.teal : "#fca5a5")}55` }}>{sLabel[it.status]}</span>}
              </div>
              <p className="text-[13px]" style={{ color: C.ink }}>«{it.claimText}»</p>
              {it.note && <p className="text-[12px]" style={{ color: C.inkSoft }}><span style={{ color: `${C.ink}66` }}>nota del verificador:</span> {it.note}</p>}
              <div className="flex items-center gap-2">
                <button disabled={busy === it.id} onClick={() => resolve(it.id, "accepted")} className="text-[12px] px-3 h-8 rounded-full transition-all hover:brightness-110 disabled:opacity-40" style={{ color: C.teal, border: `1px solid ${C.teal}55` }}>Correcto</button>
                <button disabled={busy === it.id} onClick={() => resolve(it.id, "rejected")} className="text-[12px] px-3 h-8 rounded-full transition-all hover:brightness-110 disabled:opacity-40" style={{ color: "#fca5a5", border: "1px solid #fca5a555" }}>Error real</button>
                {it.status !== "pending" && <button disabled={busy === it.id} onClick={() => resolve(it.id, "pending")} className="text-[12px] px-3 h-8 rounded-full transition-all hover:bg-white/5 disabled:opacity-40" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>Reabrir</button>}
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

/* ── QA = COCKPIT central de calidad: Tablero (operación) + Esta página (dossier) ── */
function QAStage({ qa, loading, onGenerate, pageId, recipeId, hasKey, onReload, setStage, setPageId, reloadKey }: {
  qa: EngineQASummary | null; loading: boolean; onGenerate: () => void;
  pageId: string; recipeId: string; hasKey: boolean; onReload: () => void;
  setStage: (s: StageId) => void; setPageId: (id: string) => void; reloadKey: number;
}) {
  const [tab, setTab] = useState<"tablero" | "pagina" | "ruta" | "revision">("tablero");
  const [rollup, setRollup] = useState<EngineQaRollup | null>(null);
  const [dossier, setDossier] = useState<EngineQaDossier | null>(null);
  const [detail, setDetail] = useState<{ title: string; dim: EngineQaDimension } | null>(null);
  const [ed, setEd] = useState<EngineEditorialQa | null>(null);
  const [edLoading, setEdLoading] = useState(false);
  const [edErr, setEdErr] = useState("");
  const [revLoading, setRevLoading] = useState(false);
  const [infoMan, setInfoMan] = useState<EngineInfographicManifest | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => { let a = true; fetchQaCockpit().then(r => { if (a) setRollup(r); }).catch(() => {}); return () => { a = false; }; }, [reloadKey]);
  function reloadDossier() { fetchQaDossier(pageId).then(setDossier).catch(() => setDossier(null)); }
  useEffect(() => { let a = true; setEd(null); setEdErr(""); fetchQaDossier(pageId).then(d => { if (a) setDossier(d); }).catch(() => { if (a) setDossier(null); }); fetchInfographicManifest(pageId).then(m => { if (a) setInfoMan(m); }).catch(() => { if (a) setInfoMan(null); }); return () => { a = false; }; }, [pageId, qa?.generatedAt, reloadKey]);

  function goAction(pid: string, target: EngineActionTarget) {
    setPageId(pid);
    if (target === "qa") setTab("pagina");
    else setStage(target as StageId);
  }
  async function runQa() { setEdLoading(true); setEdErr(""); try { setEd(await runEditorialQa(pageId)); onReload(); } catch (e) { setEdErr(String((e as Error).message || e)); } finally { setEdLoading(false); } }
  async function runRevise() { setRevLoading(true); setEdErr(""); try { const r = await runAutoRevise(pageId, recipeId, 3, 8); setEd(r.editorial); onReload(); } catch (e) { setEdErr(String((e as Error).message || e)); } finally { setRevLoading(false); } }
  async function approve() { setBusy("approve"); try { await approvePage(pageId, true); onReload(); reloadDossier(); } catch { /* noop */ } finally { setBusy(""); } }

  const tabBtn = (id: "tablero" | "pagina" | "ruta" | "revision", label: string) => (
    <button onClick={() => setTab(id)} className="px-4 h-9 rounded-full text-[13px] transition-all" style={tab === id ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>{label}</button>
  );

  if (loading && !rollup && !dossier) return <div className="rounded-2xl p-8 text-sm flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Leyendo QA…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">{tabBtn("tablero", "Tablero")}{tabBtn("pagina", "Esta página")}{tabBtn("ruta", "Por ruta")}{tabBtn("revision", "Revisión")}
        <span className="ml-auto text-[11px] inline-flex items-center gap-1.5" style={{ color: `${C.ink}55` }}><ShieldCheck className="w-3.5 h-3.5" /> Todas las señales de los agentes convergen acá</span>
      </div>

      {tab === "revision" ? (<ReviewQueueTab />) : tab === "ruta" ? (<RoutePanelTab hasKey={hasKey} />) : tab === "tablero" ? (
        rollup ? (
          <>
            {/* estado operativo (conteos) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(["lista", "por_aprobar", "regenerar", "revisar_contenido", "bloqueada"] as EngineOperationalStatus[]).map(s => {
                const n = (rollup.byStatus[s] ?? 0) + (s === "regenerar" ? (rollup.byStatus.generar ?? 0) : 0) + (s === "por_aprobar" ? (rollup.byStatus.reaprobar ?? 0) : 0);
                const m = OP_META[s];
                return <div key={s} className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${m.color}33` }}>
                  <p className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700, color: m.color }}>{n}</p>
                  <p className="text-[10px] mt-0.5 leading-tight" style={{ color: `${C.ink}77` }}>{m.label}</p>
                </div>;
              })}
            </div>
            {/* salud por dimensión */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {DIM_NAMES.map(({ key, label }) => {
                const h = rollup.dimensions[key];
                return <div key={key} className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}66` }}>{label}</p>
                  <div className="flex h-2 rounded-full overflow-hidden" style={{ backgroundColor: C.bg }}>
                    {(["ok", "warn", "bad", "pending"] as const).map(st => h[st] > 0 && <span key={st} style={{ width: `${(h[st] / rollup.total) * 100}%`, background: DIM_COLOR(st) }} />)}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px]">
                    <span style={{ color: C.teal }}>{h.ok} ok</span>{h.warn > 0 && <span style={{ color: C.gold }}>{h.warn} ⚠</span>}{h.bad > 0 && <span style={{ color: "#ef4444" }}>{h.bad} ✗</span>}{h.pending > 0 && <span style={{ color: `${C.ink}55` }}>{h.pending} pend.</span>}
                  </div>
                </div>;
              })}
            </div>
            {/* worklist: páginas que requieren acción */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${C.ink}10` }}>
                <span className="text-[12px]" style={{ color: C.inkSoft }}>Worklist · <span style={{ color: C.violet }}>{rollup.worklist.length}</span> página(s) requieren acción</span>
                <span className="text-[11px] inline-flex items-center gap-1.5" style={{ color: `${C.ink}55` }}><Coins className="w-3.5 h-3.5" style={{ color: C.gold }} /> ${rollup.cost.totalUsd.toFixed(2)} · {rollup.cost.rerolls} re-rolls</span>
              </div>
              {rollup.worklist.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] inline-flex items-center justify-center gap-2 w-full" style={{ color: C.teal }}><Check className="w-4 h-4" /> Todas las páginas listas.</p>
              ) : rollup.worklist.map(w => (
                <div key={w.pageId} className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-white/[0.02]" style={{ borderTop: `1px solid ${C.ink}0c` }} onClick={() => { setPageId(w.pageId); setTab("pagina"); }}>
                  <span className="font-mono text-[12px] shrink-0" style={{ color: C.ink, fontWeight: 700 }}>{w.pageNumber}</span>
                  <OpBadge status={w.operationalStatus} />
                  <span className="text-[12px] truncate flex-1 min-w-0" style={{ color: C.inkSoft }}>{w.title}</span>
                  <button onClick={e => { e.stopPropagation(); goAction(w.pageId, w.nextAction.target); }} className="shrink-0 inline-flex items-center gap-1.5 text-[11px] px-2.5 h-7 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.bright}44` }}>{w.nextAction.label} <ArrowRight className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </>
        ) : <p className="text-[13px]" style={{ color: C.inkSoft }}>Cargando tablero…</p>
      ) : (
        /* ── ESTA PÁGINA: dossier ── */
        dossier ? (
          <>
            <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: C.teal }}>Pág. {dossier.pageNumber} · estado operativo</p>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <OpBadge status={dossier.operationalStatus} />
                    <span className="text-[12px]" style={{ color: `${C.ink}77` }}>veredicto {dossier.verdict} · {dossier.combinedScore}/10</span>
                  </div>
                </div>
                {dossier.operationalStatus === "por_aprobar" || dossier.operationalStatus === "reaprobar" ? (
                  <button onClick={approve} disabled={busy === "approve"} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />} {dossier.operationalStatus === "reaprobar" ? "Reaprobar" : "Aprobar"}</button>
                ) : dossier.nextAction.target !== "qa" ? (
                  <button onClick={() => goAction(dossier.pageId, dossier.nextAction.target)} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.bright}55` }}>{dossier.nextAction.label} <ArrowRight className="w-3.5 h-3.5" /></button>
                ) : null}
              </div>
            </div>

            {/* 4 dimensiones */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DIM_NAMES.map(({ key, label }) => (
                <DimCard key={key} name={label} dim={dossier.dimensions[key]} onOpen={() => setDetail({ title: label, dim: dossier.dimensions[key] })} />
              ))}
            </div>

            {/* QA editorial (acción de Calidad) */}
            <div className="rounded-2xl p-5" style={{ background: `linear-gradient(120deg, ${C.violet}10, ${C.card})`, border: `1px solid ${C.violet}33` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                <h3 className="text-[14px] tracking-tight inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><Sparkles className="w-4 h-4" style={{ color: C.bright }} /> QA editorial · revisor LLM</h3>
                {ed?.overall != null && <VerdictPill verdict={ed.verdict} overall={ed.overall} />}
              </div>
              <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Puntúa el <strong style={{ color: C.ink }}>contenido</strong> (claridad, fidelidad de examen, autocheck, trampas). Alimenta la dimensión <strong style={{ color: C.ink }}>Calidad</strong>.</p>
              {!hasKey && <p className="text-[12px] mb-3 rounded-lg px-3 py-2" style={{ color: C.gold, backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33` }}>Requiere llave OpenAI (texto).</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={runQa} disabled={edLoading || revLoading} className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm text-white hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{edLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Evaluando…</> : <><Sparkles className="w-4 h-4" /> Evaluar con IA</>}</button>
                <button onClick={runRevise} disabled={revLoading || edLoading} className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}55`, color: C.bright }}>{revLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Revisando…</> : <><RefreshCw className="w-4 h-4" /> Auto-revisar</>}</button>
              </div>
              {edErr && <p className="text-[12px] mt-2" style={{ color: "#fca5a5" }}>{edErr}</p>}
              {ed && ed.outcome === "real" && ed.scores && (
                <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2">
                  <EdBar label="Claridad" v={ed.scores.claridad} />
                  <EdBar label="Fidelidad de examen" v={ed.scores.fidelidadExamen} />
                  <EdBar label="Coherencia" v={ed.scores.coherencia} />
                  <EdBar label="Autocheck correcto" v={ed.scores.autocheckCorrecto} />
                  <EdBar label="Trampas válidas" v={ed.scores.trampasValidas} />
                </div>
              )}
              {ed?.outcome === "real" && ed.summary && <p className="text-[12px] mt-3 leading-relaxed" style={{ color: C.inkSoft }}>{ed.summary} <span style={{ color: `${C.ink}44` }}>· {ed.model}</span></p>}
            </div>

            {/* imagen + agente de QA visual */}
            {infoMan && (
              <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-3" style={{ color: C.violet }}>Agente de QA · infografía</p>
                <AgentQACard pageId={pageId} qa={infoMan.qa} outcome={infoMan.outcome} attempts={infoMan.attempts} costUsd={infoMan.costUsd} imageUrl={infoMan.imageUrl} showImage />
              </div>
            )}
            {!infoMan && (
              <div className="rounded-2xl p-6 text-center flex flex-col items-center gap-3" style={{ backgroundColor: C.card, border: `1px dashed ${C.ink}26` }}>
                <ShieldCheck className="w-7 h-7" style={{ color: `${C.ink}33` }} />
                <p className="text-[13px] max-w-xs" style={{ color: C.inkSoft }}>Esta página todavía no se generó.</p>
                <button onClick={onGenerate} className="inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-sm" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><Sparkles className="w-4 h-4" /> Ir a Generar</button>
              </div>
            )}
          </>
        ) : <p className="text-[13px]" style={{ color: C.inkSoft }}>Cargando dossier…</p>
      )}

      {detail && <DimDetailModal title={detail.title} dim={detail.dim} onClose={() => setDetail(null)} />}
    </div>
  );
}

function VerdictPill({ verdict, overall }: { verdict: "approve" | "revise" | null; overall: number }) {
  const ok = verdict === "approve";
  const col = ok ? C.teal : C.gold;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] px-2.5 py-1 rounded-full" style={{ color: col, border: `1px solid ${col}55` }}>
      {ok ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {overall.toFixed(1)}/10 · {ok ? "aprobar" : "revisar"}
    </span>
  );
}

function EdBar({ label, v }: { label: string; v: number }) {
  const col = v >= 8 ? C.teal : v >= 6 ? C.gold : "#fca5a5";
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span style={{ color: C.inkSoft }}>{label}</span>
        <span style={{ color: col, fontFamily: D, fontWeight: 700 }}>{v.toFixed(1)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}>
        <div className="h-full rounded-full" style={{ width: `${v * 10}%`, backgroundColor: col }} />
      </div>
    </div>
  );
}

/* ── etapa Componer (mesa de decisión: una acción) ── */
function diagChips(d: EngineRecommendedAction["current"]) {
  const railTxt = d.railStatus === "tight" ? "rail apretado" : d.railStatus === "sparse" ? "rail holgado" : "rail ok";
  const railCol = d.railStatus === "ok" ? C.teal : d.railStatus === "tight" ? "#f87171" : C.gold;
  const visTxt = d.visualStatus === "dense" ? "visual denso" : d.visualStatus === "empty" ? "visual hueco" : "visual ok";
  const visCol = d.visualStatus === "ok" ? C.teal : d.visualStatus === "dense" ? "#f87171" : C.gold;
  return { railTxt, railCol, visTxt, visCol };
}

function DiagBox({ title, d, highlight }: { title: string; d: EngineRecommendedAction["current"]; highlight?: boolean }) {
  const c = diagChips(d);
  return (
    <div className="rounded-xl p-3 flex-1 min-w-[150px]" style={{ backgroundColor: C.bg, border: `1px solid ${highlight ? `${C.teal}55` : `${C.ink}14`}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}66` }}>{title}</span>
        <span style={{ fontFamily: D, fontWeight: 700, fontSize: "0.95rem", color: highlight ? C.teal : C.ink }}>{d.score}/10</span>
      </div>
      <p className="text-[12px]" style={{ color: C.ink, fontFamily: D, fontWeight: 600 }}>{d.recipeLabel}</p>
      <div className="flex flex-col gap-1 mt-1.5">
        <span className="text-[11px]" style={{ color: c.railCol }}>● {c.railTxt}</span>
        <span className="text-[11px]" style={{ color: c.visCol }}>● {c.visTxt}</span>
      </div>
    </div>
  );
}

function ActionRow({ icon: Icon, label, color, children }: { icon: typeof AlertTriangle; label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
      <p className="text-[13px] leading-relaxed" style={{ color: C.inkSoft }}><span style={{ color: C.ink, fontWeight: 600 }}>{label}:</span> {children}</p>
    </div>
  );
}

function ComponerStage({ decision, loading, generating, onApply, onRefresh }: {
  decision: EngineRecommendedAction | null;
  loading: boolean;
  generating: boolean;
  onApply: (toRecipe: string) => void;
  onRefresh: () => void;
}) {
  if (loading && !decision) return <div className="rounded-2xl p-8 text-sm flex items-center gap-2" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}><Loader2 className="w-4 h-4 animate-spin" /> Analizando la página…</div>;
  if (!decision) return <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Sin diagnóstico. <button onClick={onRefresh} className="underline" style={{ color: C.bright }}>Reintentar</button></div>;

  const sevColor = decision.severity === "high" ? "#f87171" : decision.severity === "warn" ? C.gold : C.teal;
  const isSwitch = decision.kind === "switch";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl p-6" style={{ background: `linear-gradient(120deg, ${sevColor}12, ${C.card})`, border: `1px solid ${sevColor}3a` }}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: sevColor }}>{isSwitch ? "Acción recomendada" : "Diagnóstico"}</p>
          <button onClick={onRefresh} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.bright }}><RefreshCw className="w-3.5 h-3.5" /> Recalcular</button>
        </div>
        <h2 className="text-xl tracking-tight mb-4" style={{ fontFamily: D, fontWeight: 700 }}>{isSwitch ? `Cambiar a “${decision.toLabel}”` : "Mantener la receta actual"}</h2>

        <div className="flex flex-col gap-2.5">
          <ActionRow icon={AlertTriangle} label="Causa" color={sevColor}>{decision.cause}</ActionRow>
          <ActionRow icon={ArrowRight} label="Efecto" color={C.teal}>{decision.effect}</ActionRow>
          <ActionRow icon={ShieldCheck} label="Riesgo" color={C.bright}>{decision.risk}</ActionRow>
        </div>

        <div className="flex items-stretch gap-2 mt-5">
          <DiagBox title="Actual" d={decision.current} />
          {isSwitch && <div className="flex items-center"><ArrowRight className="w-5 h-5" style={{ color: C.gold }} /></div>}
          {isSwitch && <DiagBox title="Proyección" d={decision.projected} highlight />}
        </div>

        {isSwitch && (
          <button onClick={() => onApply(decision.toRecipe)} disabled={generating} className="mt-5 inline-flex items-center justify-center gap-2 text-white px-6 h-11 rounded-full text-sm transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-default" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando…</> : <><Check className="w-4 h-4" /> Aplicar y generar</>}
          </button>
        )}
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2.5" style={{ color: `${C.ink}66` }}>Ranking de recetas · score · <span style={{ color: C.bright }}>clic para aplicar</span></p>
        <div className="flex flex-wrap gap-2">
          {decision.ranking.map(r => {
            const top = r.recipeId === decision.toRecipe;
            return (
              <button key={r.recipeId} onClick={() => onApply(r.recipeId)} disabled={generating} title={`Aplicar “${r.label}” y generar`} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] transition-all hover:brightness-125 disabled:opacity-60 disabled:cursor-default" style={top ? { backgroundColor: `${C.teal}1f`, border: `1px solid ${C.teal}`, color: C.ink, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                {r.label} <span style={{ color: top ? C.teal : `${C.ink}55` }}>{r.score}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] mt-2" style={{ color: `${C.ink}44` }}>Aplica la receta y regenera la página (imagen idempotente: no re-gasta si no cambió).</p>
      </div>
    </div>
  );
}

/* ── tira de métricas de Generar (pocas y accionables) ── */
function GenMetricsStrip({ pages, reloadKey }: { pages: EngineCatalogPage[]; reloadKey: number }) {
  const [cost, setCost] = useState<number | null>(null);
  useEffect(() => { let alive = true; fetchInfographicStats().then(s => { if (alive) setCost(s.totalCostUsd); }).catch(() => {}); return () => { alive = false; }; }, [reloadKey]);
  const generadas = pages.filter(p => p.imageGeneratedAt).length;
  const conformes = pages.filter(p => p.imageQaOk === true).length;
  const desact = pages.filter(p => p.needsRegen).length;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MiniStat label="Generadas" value={`${generadas}/${pages.length}`} help={{ title: "Generadas", body: ["Páginas que ya tienen su infografía generada (imagen + HTML).", "El resto está 'sin generar' — todavía no pasó por el motor de imagen."] }} />
      <MiniStat label="Conformes" value={String(conformes)} help={{ title: "Conformes", body: ["Imágenes que el agente de QA aprobó (sin fallas críticas ni de estilo).", "Una imagen 'needs_review' no cuenta como conforme: revisala o regenerala."] }} />
      <MiniStat label="Desactualizadas" value={String(desact)} help={{ title: "Desactualizadas", body: ["La imagen se generó ANTES del último cambio de contenido (re-grounding/edición).", "La imagen muestra contenido viejo → regenera para reflejar lo nuevo."] }} />
      <MiniStat label="Costo imágenes" value={cost == null ? "—" : `$${cost.toFixed(2)}`} help={{ title: "Costo de imágenes", body: ["Gasto acumulado en generación de infografías (image-2 + QA de visión) del lote."] }} />
    </div>
  );
}

/* ── etapa Generar: unifica "Esta página" + "Lote" (motor de imagen primero) ── */
function GenerarStage({ page, pages, reloadKey, recipes, recipeId, setRecipeId, generating, genResult, genErr, onGenerate, prediction, predictionLoading, hasKey, onReload }: {
  page: EngineCatalogPage | null;
  pages: EngineCatalogPage[];
  reloadKey: number;
  recipes: EngineRecipe[];
  recipeId: string;
  setRecipeId: (id: string) => void;
  generating: boolean;
  genResult: EngineGenerateResult | null;
  genErr: string;
  onGenerate: (force?: boolean) => void;
  prediction: EnginePrediction | null;
  predictionLoading: boolean;
  hasKey: boolean;
  onReload: () => void;
}) {
  const [force, setForce] = useState(false);
  const [mode, setMode] = useState<"page" | "lote">("page");
  const recipe = recipes.find(r => r.id === recipeId);
  const tab = (id: "page" | "lote", label: string) => (
    <button onClick={() => setMode(id)} className="px-4 h-9 rounded-full text-[13px] transition-all" style={mode === id ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>{label}</button>
  );

  return (
    <div className="flex flex-col gap-4">
      <GenMetricsStrip pages={pages} reloadKey={reloadKey} />
      <div className="flex items-center gap-2">{tab("page", "Esta página")}{tab("lote", "Lote")}</div>

      {mode === "lote" ? (
        <RunsStage pages={pages} reloadKey={reloadKey} onReload={onReload} />
      ) : !page ? (
        <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Selecciona una página.</div>
      ) : (
    <div className="flex flex-col gap-4">
      {/* aviso de desactualizada / aprobación vieja */}
      {(page.needsRegen || page.approvalStale) && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}44` }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
          <div className="text-[12px] leading-snug" style={{ color: C.ink }}>
            {page.needsRegen
              ? <p><strong style={{ color: C.gold }}>Imagen desactualizada.</strong> El contenido cambió después de generar esta infografía — regenerá para reflejar lo nuevo.{page.approvalStale && " Además, la aprobación es de la imagen anterior."}</p>
              : page.approvalStale && <p><strong style={{ color: C.gold }}>Aprobación anterior a la imagen actual.</strong> La imagen ya está al día; reaprueba en <strong style={{ color: C.ink }}>Aprobaciones</strong> para confirmar (no se borra sola).</p>}
          </div>
        </div>
      )}

      {/* Motor PRIMARIO: infografía image-2 + agente gobernado */}
      <InfographicPanel page={page} onReload={onReload} />

      <details className="rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <summary className="px-6 py-3 cursor-pointer text-[12px]" style={{ color: `${C.ink}77`, fontFamily: D, fontWeight: 600 }}>Avanzado · motor HTML (composer) — para formatos de texto: master book · cheat sheets · question bank</summary>
      <div className="p-6 pt-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5" style={{ color: C.violet }}>Receta de layout</p>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.inkSoft }}>Cambiá la receta y generá: la página cambia de forma observable. El render es <strong style={{ color: C.ink }}>determinista</strong>; la <strong style={{ color: C.ink }}>imagen real</strong> (OpenAI) entra al cargar la llave. Antes de gastarla, el <strong style={{ color: C.ink }}>QA predictivo</strong> estima el riesgo.</p>
        <div className="flex flex-wrap gap-2">
          {recipes.map(r => {
            const on = r.id === recipeId;
            return (
              <button key={r.id} onClick={() => setRecipeId(r.id)} className="px-3.5 h-9 rounded-full text-[13px] transition-all"
                style={on ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                {r.label}
              </button>
            );
          })}
        </div>
        {recipe && (
          <p className="text-[12px] mt-3 leading-relaxed" style={{ color: `${C.ink}88` }}>
            {recipe.desc} <span style={{ color: `${C.ink}55` }}>· visual {recipe.upperPct}% · {recipe.cards} tarjetas ({recipe.cols} col) · rail {recipe.railMode}{recipe.extras.length ? ` · +${recipe.extras.join(", ")}` : ""}</span>
          </p>
        )}

        {/* QA predictivo: riesgo estimado ANTES de gastar imagen (gate gpt-image) */}
        <PredictionPanel prediction={prediction} loading={predictionLoading} />

        <div className="flex flex-wrap items-center gap-4 mt-5">
          <button onClick={() => onGenerate(force)} disabled={generating} className="inline-flex items-center justify-center gap-2 text-white px-6 h-11 rounded-full text-sm transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-default" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</> : <><Sparkles className="w-4 h-4" /> Generar página {page.pageNumber}</>}
          </button>
          <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: C.inkSoft }}>
            <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} />
            Forzar regeneración de imagen
          </label>
          {hasKey && (
            <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: `${C.ink}66` }}>
              <Coins className="w-3.5 h-3.5" style={{ color: C.gold }} /> imagen real ~$0.08 (2 variantes) · idempotente: reusa si no cambió
            </span>
          )}
        </div>
        {genErr && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{genErr}</p>}
        <PipelineView generating={generating} genResult={genResult} />
        {page && <VariantsPanel pageId={page.pageId} recipeId={recipeId} hasKey={hasKey} onReload={onReload} />}
      </div>
      </details>
    </div>
      )}
    </div>
  );
}

/* ── Motor de INFOGRAFÍA: image-2 + agente QA gobernado (crítico/estilo/advisory) ── */
function InfographicPanel({ page, onReload }: { page: EngineCatalogPage; onReload: () => void }) {
  const [gen, setGen] = useState(false);
  const [res, setRes] = useState<EngineInfographicResult | null>(null);
  const [err, setErr] = useState("");
  const [force, setForce] = useState(true);
  async function generate() {
    setGen(true); setErr("");
    try { setRes(await generateInfographic(page.pageId, force)); onReload(); }
    catch (e) { setErr(String((e as Error).message || e)); }
    finally { setGen(false); }
  }

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Motor de infografía · agente gobernado</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>image-2 + QA</span>
      </div>
      <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.inkSoft }}>image-2 dibuja el cuerpo con tu <strong style={{ color: C.ink }}>contrato visual</strong>; un <strong style={{ color: C.ink }}>agente</strong> audita contenido y estilo (crítico/estilo/advisory), re-genera dirigido si falla y marca <strong style={{ color: C.ink }}>needs_review</strong> si no resuelve. Header/footer en HTML.</p>

      <div className="flex flex-wrap items-center gap-4">
        <button onClick={generate} disabled={gen} className="inline-flex items-center gap-2 text-white px-6 h-11 rounded-full text-sm hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
          {gen ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</> : <><Sparkles className="w-4 h-4" /> Generar infografía</>}
        </button>
        <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer" style={{ color: C.inkSoft }}>
          <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} /> Forzar (re-generar)
        </label>
      </div>
      {err && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{err}</p>}

      {res && <div className="mt-5"><AgentQACard pageId={page.pageId} qa={res.qa} outcome={res.outcome} attempts={res.attempts} costUsd={res.costUsd} imageUrl={res.imageUrl} /></div>}
    </div>
  );
}

/* ── Tarjeta del agente QA: outcome + controles gobernados + ancla + preview (reusable Generar/QA) ── */
function AgentQACard({ pageId, qa, outcome, attempts, costUsd, imageUrl, showImage = true }: {
  pageId: string; qa: EngineInfographicQa | null | undefined; outcome: EngineInfographicOutcome | undefined;
  attempts?: number; costUsd?: number; imageUrl?: string | null; showImage?: boolean;
}) {
  const [anchoring, setAnchoring] = useState(false);
  const [anchorMsg, setAnchorMsg] = useState("");
  const ready = outcome === "real" || outcome === "reused";
  const outColor = ready ? C.teal : outcome === "needs_review" ? C.gold : outcome ? "#ef4444" : C.inkSoft;
  const outLabel = outcome === "real" ? "Lista — QA conforme" : outcome === "reused" ? "Reusada (sin gasto)" : outcome === "needs_review" ? "Necesita revisión humana" : outcome === "no_key" ? "Sin llave OpenAI" : outcome === "capped" ? "Tope de costo" : outcome === "failed" ? "Falló" : "—";
  async function anchor() {
    setAnchoring(true); setAnchorMsg("");
    try { const r = await setStyleAnchor(pageId); setAnchorMsg(r.ok ? `Master fijado (${r.masterPageId}). Las próximas páginas heredan este estilo.` : "No se pudo fijar."); }
    catch { setAnchorMsg("Error al fijar master."); }
    finally { setAnchoring(false); }
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[13px] px-3 h-8 rounded-full" style={{ color: outColor, border: `1px solid ${outColor}55`, fontFamily: D, fontWeight: 600 }}>
          {ready ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {outLabel}
        </span>
        {(attempts != null || costUsd != null) && <span className="text-[12px] inline-flex items-center gap-1.5" style={{ color: `${C.ink}77` }}>{attempts ?? 0} intento(s) · <Coins className="w-3.5 h-3.5" style={{ color: C.gold }} /> ${(costUsd ?? 0).toFixed(2)}</span>}
      </div>
      {qa && (
        <div className="flex flex-col gap-2 rounded-xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
          <AgentControlRow label="Crítico — integridad de contenido" items={qa.criticalFailures} okText="respuesta correcta · sin garabatos · sin letra doble · sin bleed" sev="crit" />
          <AgentControlRow label="Estilo — premium" items={qa.styleFailures} okText="tarjetas blancas · saturación sobria · correcta en verde" sev="style" />
          <AgentControlRow label="Advisory — matices" items={qa.advisory} okText="numeración · bordes · pin OK" sev="adv" />
          <div className="text-[11px] flex flex-wrap gap-x-4 gap-y-1 pt-1.5 mt-0.5" style={{ color: `${C.ink}66`, borderTop: `1px solid ${C.ink}10` }}>
            <span>autocheck: resaltada <b style={{ color: C.ink }}>{qa.highlightedLetter ?? "?"}</b> / esperada <b style={{ color: C.ink }}>{qa.expectedLetter}</b></span>
            <span>bleed: {qa.contentBleed ? <b style={{ color: "#ef4444" }}>sí ⚠</b> : "no"}</span>
            <span title={qa.fidelityIssues?.length ? qa.fidelityIssues.join(" · ") : "Cada tarjeta dibuja solo lo que dice su texto"}>fidelidad imagen↔texto: {qa.fidelityIssues?.length ? <b style={{ color: C.gold }}>{qa.fidelityIssues.length} tarjeta(s) con íconos de más ⚠</b> : <b style={{ color: C.teal }}>ok</b>}</span>
          </div>
          {!!qa.fidelityIssues?.length && (
            <div className="text-[11px] rounded-lg px-2.5 py-1.5 mt-0.5" style={{ color: C.gold, backgroundColor: `${C.gold}10`, border: `1px solid ${C.gold}33` }}>
              <b>Fidelidad:</b> {qa.fidelityIssues.join(" · ")}. La imagen agrega servicios que el texto del seed no menciona — el agente re-genera dirigido para corregirlo.
            </div>
          )}
        </div>
      )}
      {showImage && imageUrl && <img src={imageUrl} alt="infografía" className="w-full rounded-xl" style={{ border: `1px solid ${C.ink}14` }} />}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={anchor} disabled={anchoring || !ready} title={!ready ? "Solo se puede fijar una página lista" : ""} className="inline-flex items-center gap-2 text-[13px] px-4 h-9 rounded-full disabled:opacity-45" style={{ color: C.ink, border: `1px solid ${C.ink}22`, fontFamily: D, fontWeight: 600 }}>
          {anchoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Fijar como master (ancla de estilo)
        </button>
        {anchorMsg && <span className="text-[12px]" style={{ color: C.teal }}>{anchorMsg}</span>}
      </div>
    </div>
  );
}

function AgentControlRow({ label, items, okText, sev }: { label: string; items: string[]; okText: string; sev: "crit" | "style" | "adv" }) {
  const failed = items.length > 0;
  const col = sev === "crit" ? "#ef4444" : sev === "style" ? C.gold : `${C.ink}88`;
  return (
    <div className="flex items-start gap-2 text-[12px]">
      {failed ? <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: col }} /> : <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.teal }} />}
      <div><span style={{ color: C.ink, fontWeight: 600 }}>{label}: </span><span style={{ color: failed ? col : `${C.ink}66` }}>{failed ? items.join(" · ") : okText}</span></div>
    </div>
  );
}

/* ── QA de CONTENIDO (agnóstico del render): grounding · editorial · riesgo · libro ── */
function ContentQACard({ verdict }: { verdict: EnginePremiumVerdict }) {
  const KEEP = ["technical", "content", "risk", "book"];
  const gates = verdict.gates.filter(g => KEEP.includes(g.id));
  if (!gates.length) return null;
  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1" style={{ color: C.violet }}>QA de contenido · independiente del render</p>
      <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Mide la <strong style={{ color: C.ink }}>verdad</strong> (anclaje a fuentes, calidad editorial, sin venta, coherencia de libro) — vale para cualquier motor. El QA visual lo hace el agente, arriba.</p>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {gates.map(g => (
          <div key={g.id} className="flex items-start gap-2 text-[12px]">
            {g.passed ? <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.teal }} /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: C.gold }} />}
            <div className="min-w-0">
              <div><span style={{ color: C.ink, fontWeight: 600 }}>{g.label}</span> <span style={{ color: `${C.ink}55` }}>{g.score.toFixed(1)}</span></div>
              <p className="leading-snug mt-0.5" style={{ color: `${C.ink}66` }}>{g.note}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── variantes premium: 2 cortes + score por visión + elección A/B ── */
function VariantsPanel({ pageId, recipeId, hasKey, onReload }: { pageId: string; recipeId: string; hasKey: boolean; onReload: () => void }) {
  const [res, setRes] = useState<EngineVariantsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => { setRes(null); setErr(""); setChosen(null); }, [pageId]);

  async function run() {
    setLoading(true); setErr(""); setChosen(null);
    try { setRes(await runVariants(pageId, recipeId)); } catch (e) { setErr(String((e as Error).message || e)); } finally { setLoading(false); }
  }
  async function choose(v: string) {
    setSelecting(v);
    try { const r = await selectVariantApi(pageId, recipeId, v); if (r.ok) { setChosen(v); onReload(); } else setErr(r.error ?? "no se pudo seleccionar"); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSelecting(null); }
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `${C.ink}55` }}>Variantes premium · A/B</p>
        <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-[13px] transition-all hover:bg-white/5 disabled:opacity-60 disabled:cursor-default" style={{ border: `1px solid ${C.bright}55`, color: C.bright }}>
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando 2 cortes…</> : <><Sparkles className="w-4 h-4" /> Generar 2 variantes</>}
        </button>
      </div>
      <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Dos cortes del bloque visual; un modelo de visión los puntúa (dirección de arte) y recomienda. Eliges A o B. <span style={{ color: `${C.ink}44` }}>~$0.08 (2 imágenes).</span></p>
      {!hasKey && <p className="text-[12px]" style={{ color: C.gold }}>Requiere llave OpenAI.</p>}
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}

      {res && (
        <div className="grid sm:grid-cols-2 gap-3">
          {res.variants.map(v => {
            const rec = res.recommended === v.variant;
            const isChosen = chosen === v.variant;
            return (
              <div key={v.variant} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${isChosen ? `${C.teal}66` : rec ? `${C.gold}55` : `${C.ink}12`}` }}>
                <div className="flex items-center justify-between gap-2 px-3 h-9" style={{ borderBottom: `1px solid ${C.ink}10` }}>
                  <span className="text-[12px]" style={{ fontFamily: D, fontWeight: 700 }}>Variante {v.variant.toUpperCase()}</span>
                  <div className="flex items-center gap-1.5">
                    {rec && <span className="font-mono text-[8px] uppercase px-1.5 py-0.5 rounded" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>recomendada</span>}
                    {v.visionScore != null && <span className="text-[11px]" style={{ fontFamily: D, fontWeight: 700, color: v.visionScore >= 7 ? C.teal : v.visionScore >= 5 ? C.gold : "#fca5a5" }}>{v.visionScore.toFixed(1)}/10</span>}
                  </div>
                </div>
                {v.imageUrl
                  ? <img src={v.imageUrl} alt={`variante ${v.variant}`} className="w-full block" style={{ background: "#fff", aspectRatio: "1536/1024", objectFit: "cover" }} />
                  : <div className="p-4 text-[12px]" style={{ color: "#fca5a5" }}>{v.outcome}: {v.notes}</div>}
                {v.notes && v.imageUrl && <p className="text-[11px] px-3 py-2 leading-snug" style={{ color: C.inkSoft }}>{v.notes}</p>}
                {v.imageUrl && (
                  <button onClick={() => choose(v.variant)} disabled={!!selecting} className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-[12px] transition-colors hover:bg-white/5 disabled:opacity-60" style={{ borderTop: `1px solid ${C.ink}10`, color: isChosen ? C.teal : C.bright }}>
                    {selecting === v.variant ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isChosen ? <Check className="w-3.5 h-3.5" /> : null}
                    {isChosen ? "Activa ✓" : "Usar esta"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {chosen && <p className="text-[11px] mt-3" style={{ color: C.teal }}>Variante {chosen.toUpperCase()} fijada como imagen de la página. Revisá el preview y el veredicto en QA.</p>}
    </div>
  );
}

/* ── pipeline editorial: flujo real por etapas con tiempos medidos ── */
const PIPELINE_STAGES = [
  { num: "01", label: "Imagen visual",              sub: "gpt-image-2 medium · bloque superior" },
  { num: "02", label: "Ensamblado HTML",            sub: "render determinista · receta" },
  { num: "03", label: "QA estructural + identidad", sub: "checks de layout y contrato" },
  { num: "04", label: "Guardar outputs",            sub: "/assets/cloudbooks-engine/…" },
  { num: "05", label: "Completado",                 sub: "page.html listo · static files" },
];

function stageColor(status: EnginePipelineStage["status"]): string {
  return status === "failed" ? "#fca5a5" : status === "skipped" ? C.gold : C.teal;
}

function QaBadge({ label, score, passed }: { label: string; score: number; passed: boolean }) {
  const col = passed ? C.teal : C.gold;
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.12em] px-2 py-1 rounded" style={{ color: col, border: `1px solid ${col}44` }}>
      {label} {score.toFixed(1)}/10 {passed ? "✓" : "⚠"}
    </span>
  );
}

function PipelineView({ generating, genResult }: { generating: boolean; genResult: EngineGenerateResult | null }) {
  const [runStep, setRunStep] = useState(0); // etapas completadas (1..5)
  useEffect(() => { if (generating) setRunStep(1); }, [generating]);
  useEffect(() => {
    if (generating || !genResult) return;
    let c = false;
    [2, 3, 4, 5].forEach((s, i) => setTimeout(() => { if (!c) setRunStep(s); }, 160 * (i + 1)));
    return () => { c = true; };
  }, [generating, genResult]);

  if (!generating && !genResult) return null;

  const stages = genResult?.pipeline ?? null;
  const done = !!genResult && !generating;
  const html = genResult?.htmlPath ?? null;
  const v = encodeURIComponent(genResult?.generatedAt ?? "");
  const hasImg = genResult?.image.outcome === "real" || genResult?.image.outcome === "reused";
  const htmlEngineUrl = html ? (() => { const m = html.match(/pages\/([^/]+)\/page\.html$/); return m ? `/engine/page-html/${encodeURIComponent(m[1])}?v=${v}` : `${html}?v=${v}`; })() : null;
  const files = html
    ? [
        { label: "page.html", url: htmlEngineUrl! },
        { label: "metadata.json", url: `${html.replace(/page\.html$/, "metadata.json")}?v=${v}` },
        { label: "qa-report.md", url: `${html.replace(/page\.html$/, "qa-report.md")}?v=${v}` },
        ...(hasImg ? [{ label: "upper-art.png", url: `${html.replace(/page\.html$/, "upper-art.png")}?v=${v}` }] : []),
      ]
    : [];

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: `${C.ink}55` }}>Pipeline editorial</p>
      <p className="text-[12px] mt-1 mb-4 leading-relaxed" style={{ color: `${C.ink}77` }}>Orquestación cerrada por etapas: imagen, ensamblado, QA y guardado. Muestra el flujo real que ejecuta el motor (sin simular agentes), con tiempos medidos.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {PIPELINE_STAGES.map((st, i) => {
          const real = stages?.[i];
          const stepNo = i + 1;
          const isDone = done ? runStep >= stepNo : false;
          const isActive = generating ? stepNo === 1 : (done && runStep === stepNo - 1);
          const col = isDone ? stageColor(real?.status ?? "done") : isActive ? C.teal : `${C.ink}30`;
          return (
            <div key={st.num} className="rounded-xl px-3 py-3 min-h-[84px] flex flex-col" style={{ backgroundColor: isDone ? `${col}12` : isActive ? `${C.teal}12` : C.bg, border: `1px solid ${isDone || isActive ? `${col}40` : `${C.ink}12`}` }}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.16em]" style={{ color: col, fontWeight: 700 }}>{st.num}</span>
                {isDone ? <Check className="w-3.5 h-3.5" style={{ color: col }} /> : isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: C.teal }} /> : <Clock className="w-3.5 h-3.5" style={{ color: `${C.ink}30` }} />}
              </div>
              <p className="text-[11px] mt-2.5" style={{ color: isDone || isActive ? C.ink : `${C.ink}44`, fontFamily: D, fontWeight: 600 }}>{st.label}</p>
              <p className="text-[9px] mt-1 leading-snug" style={{ color: isDone || isActive ? `${C.ink}66` : `${C.ink}33` }}>{real?.detail ?? st.sub}</p>
              {isDone && real && <p className="text-[9px] mt-auto pt-1.5 font-mono" style={{ color: `${C.ink}44` }}>{real.ms} ms</p>}
            </div>
          );
        })}
      </div>

      {done && genResult && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${C.ink}12` }}>
            <div>
              <p className="text-[12px]" style={{ color: C.teal, fontFamily: D, fontWeight: 700 }}>Completado · {(genResult.durationMs / 1000).toFixed(1)}s</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${C.ink}55` }}>receta {genResult.recipeLabel} · {genResult.generationMode} · {(genResult.bytes / 1024).toFixed(1)} KB</p>
            </div>
            <div className="flex items-center gap-2">
              <QaBadge label="estructural" score={genResult.structural.score} passed={genResult.structural.passed} />
              <QaBadge label="identidad" score={genResult.contract.score} passed={genResult.contract.passed} />
            </div>
          </div>

          {genResult.renderQa?.available && genResult.renderQa.overflow && (
            <div className="rounded-xl px-3 py-2.5 mt-3" style={{ backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)" }}>
              <p className="text-[12px] inline-flex items-center gap-1.5" style={{ color: "#fca5a5", fontWeight: 600 }}><AlertTriangle className="w-3.5 h-3.5" /> Truncado real (render headless) — el contenido no entra:</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {genResult.renderQa.overflows.map((o, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded" style={{ color: "#fca5a5", border: "1px solid rgba(248,113,113,0.35)" }}>{o.zone} · +{o.overBy}px</span>
                ))}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: `${C.ink}66` }}>Acortá ese contenido (o ajustá la receta) — la página queda bloqueada hasta que entre sin cortes.</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5 mt-4">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}55` }}>Checks estructurales</p>
              <div className="flex flex-col gap-1">
                {genResult.structural.checks.map(c => (
                  <span key={c.name} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: c.ok ? `${C.ink}cc` : "#fca5a5" }}>
                    {c.ok ? <Check className="w-3 h-3 shrink-0" style={{ color: C.teal }} /> : <X className="w-3 h-3 shrink-0" style={{ color: "#fca5a5" }} />} {c.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] mb-2" style={{ color: `${C.ink}55` }}>Archivos generados</p>
              <div className="flex flex-col gap-1.5">
                {files.map(f => (
                  <a key={f.label} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10` }}>
                    <FileCode2 className="w-3.5 h-3.5 shrink-0" style={{ color: C.bright }} />
                    <span className="text-[11px] flex-1 truncate" style={{ color: `${C.ink}88` }}>{f.label}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" style={{ color: `${C.ink}33` }} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── QA predictivo: riesgo estimado por geometría ANTES de gastar imagen ── */
function sevColor(s: EnginePrediction["worst"]): string {
  return s === "high" ? "#fca5a5" : s === "warn" ? C.gold : C.teal;
}
function PredictionPanel({ prediction, loading }: { prediction: EnginePrediction | null; loading: boolean }) {
  if (loading && !prediction) {
    return (
      <div className="mt-4 rounded-xl px-4 py-3 inline-flex items-center gap-2 text-[12px]" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluando riesgo de la receta…
      </div>
    );
  }
  if (!prediction) return null;
  const col = sevColor(prediction.worst);
  const Icon = prediction.worst === "ok" ? ShieldCheck : AlertTriangle;
  return (
    <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: `${col}0d`, border: `1px solid ${col}44` }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[12px] inline-flex items-center gap-1.5" style={{ fontFamily: D, fontWeight: 700, color: col }}>
          <Icon className="w-4 h-4" /> QA predictivo
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-0.5 rounded-full" style={{ color: col, border: `1px solid ${col}66` }}>
            {prediction.worst === "high" ? "riesgo alto" : prediction.worst === "warn" ? "revisable" : "bajo riesgo"}
          </span>
        </p>
        <span className="text-[11px]" style={{ color: prediction.safeToSpendImage ? C.teal : "#fca5a5" }}>
          {prediction.safeToSpendImage ? "imagen permitida" : "imagen bloqueada (gate)"}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 mb-2">
        {prediction.risks.map(r => {
          const rc = sevColor(r.severity);
          return (
            <span key={r.id} className="inline-flex items-start gap-1.5 text-[12px]" style={{ color: r.severity === "ok" ? C.inkSoft : C.ink }}>
              {r.severity === "ok"
                ? <Check className="w-3.5 h-3.5 mt-[1px] shrink-0" style={{ color: C.teal }} />
                : <span className="mt-[5px] w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: rc }} />}
              <span><strong style={{ color: rc, fontWeight: 600 }}>{r.label}</strong> <span style={{ color: `${C.ink}55` }}>— {r.detail}</span></span>
            </span>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: `${C.ink}77` }}>
        {prediction.summary} <span style={{ color: `${C.ink}44` }}>Estimado desde geometría y densidad, sin llamar a OpenAI. Si quieres saltar el gate, marca “Forzar regeneración”.</span>
      </p>
    </div>
  );
}

/* ── placeholder de etapa futura ── */
/* ── Generación batch: tabla con checklist para elegir qué páginas generar ── */
function RunsStage({ pages, onReload, reloadKey }: { pages: EngineCatalogPage[]; onReload: () => void; reloadKey: number }) {
  const [scope, setScope] = useState<"todo" | "custom" | "stale">("todo");
  const [custom, setCustom] = useState("");
  const [nav, setNav] = useState(0);
  const [force, setForce] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [outcome, setOutcome] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [res, setRes] = useState<EngineInfographicBatch | null>(null);
  const [err, setErr] = useState("");

  function reloadOutcomes() { fetchInfographicStats().then(s => { const m: Record<string, string> = {}; s.pages.forEach(p => { if (p.outcome) m[p.pageId] = p.outcome; }); setOutcome(m); }).catch(() => { /* noop */ }); }
  useEffect(() => { reloadOutcomes(); }, [reloadKey]);

  function customSet(): Set<string> {
    const s = custom.trim(); if (!s) return new Set();
    let ids: string[];
    if (s.includes("-") && !s.includes(",")) { const [a, b] = s.split("-").map(x => parseInt(x.trim(), 10)); ids = (Number.isFinite(a) && Number.isFinite(b)) ? Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => String(Math.min(a, b) + i).padStart(2, "0")) : []; }
    else ids = s.split(",").map(x => x.trim()).filter(Boolean).map(x => /^\d+$/.test(x) ? x.padStart(2, "0") : x);
    return new Set(ids);
  }
  const staleCount = pages.filter(p => p.needsRegen).length;
  const filtered = scope === "todo" ? pages
    : scope === "stale" ? pages.filter(p => p.needsRegen)
    : (() => { const set = customSet(); return pages.filter(p => set.has(p.pageId)); })();
  const filteredIds = filtered.map(p => p.pageId);
  const PER = 10;
  const navMax = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(nav, navMax - 1);
  const visible = filtered.slice(cur * PER, cur * PER + PER);
  const allMarked = filteredIds.length > 0 && filteredIds.every(id => selected.has(id));
  const visAllMarked = visible.length > 0 && visible.every(p => selected.has(p.pageId));

  function toggleRow(pid: string) { setSelected(s => { const n = new Set(s); if (n.has(pid)) n.delete(pid); else n.add(pid); return n; }); }
  function toggleVisible() { setSelected(s => { const n = new Set(s); if (visAllMarked) visible.forEach(p => n.delete(p.pageId)); else visible.forEach(p => n.add(p.pageId)); return n; }); }
  function toggleScope() { setSelected(s => { const n = new Set(s); if (allMarked) filteredIds.forEach(id => n.delete(id)); else filteredIds.forEach(id => n.add(id)); return n; }); }

  async function run() {
    const ids = [...selected].sort();
    if (!ids.length) { setErr("Marcá al menos una página en la tabla."); return; }
    setRunning(true); setErr(""); setRes(null);
    try { const r = await runInfographicBatch(ids, force); setRes(r); reloadOutcomes(); onReload(); } catch (e) { setErr(String((e as Error).message || e)); } finally { setRunning(false); }
  }

  const pill = (on: boolean) => on ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft };
  const oc = (o: string) => o === "real" || o === "reused" ? C.teal : o === "needs_review" ? C.gold : "#ef4444";
  const stateBadge = (p: EngineCatalogPage) => {
    const pid = p.pageId;
    if (p.needsRegen) return <span className="text-[11px] inline-flex items-center gap-1" style={{ color: C.gold }} title="El contenido cambió tras generar la imagen"><AlertTriangle className="w-3.5 h-3.5" /> Desactualizada</span>;
    if (outcome[pid] === "needs_review") return <span className="text-[11px] inline-flex items-center gap-1" style={{ color: C.gold }}><AlertTriangle className="w-3.5 h-3.5" /> Revisar</span>;
    if (outcome[pid] === "real" || outcome[pid] === "reused") return <span className="text-[11px] inline-flex items-center gap-1" style={{ color: C.teal }}><Check className="w-3.5 h-3.5" /> Generada</span>;
    return <span className="text-[11px]" style={{ color: `${C.ink}55` }}>sin generar</span>;
  };
  const cbox = (checked: boolean, onClick: () => void) => (
    <button onClick={e => { e.stopPropagation(); onClick(); }} className="w-4 h-4 rounded inline-flex items-center justify-center shrink-0 transition-all" style={{ border: `1px solid ${checked ? C.violet : `${C.ink}3f`}`, backgroundColor: checked ? C.violet : "transparent" }}>{checked && <Check className="w-3 h-3" style={{ color: "#fff" }} />}</button>
  );

  const ready = res ? res.pages.filter(p => p.outcome === "real" || p.outcome === "reused").length : 0;
  const nr = res ? res.pages.filter(p => p.outcome === "needs_review").length : 0;
  const failed = res ? res.pages.filter(p => p.outcome === "failed").length : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <p className="text-[13px]" style={{ color: C.inkSoft }}>Generá varias páginas de una. Marcá en la tabla y dale <strong style={{ color: C.ink }}>Procesar</strong>.</p>
        <SectionHelp title="Generar en lote · cómo funciona" body={[
          "Marcá en la tabla qué páginas procesar (o filtrá por alcance y marcá todas) y dale Procesar.",
          "Cada página pasa por image-2 + el agente de QA gobernado (re-roll correctivo; queda 'needs_review' si no resuelve). ~$0.07/página; si no cambió, la reusa sin gastar.",
          "Force regenera aunque no haya cambios — útil para refrescar tras un cambio de contrato.",
          "El filtro 'Desactualizadas' lista las que cambiaron de contenido tras generarse: regeneralas para reflejar lo nuevo.",
        ]} />
      </div>

      {/* alcance + acciones */}
      <div className="rounded-2xl p-5 flex flex-wrap items-center gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Alcance</span>
        <button onClick={() => { setScope("todo"); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={pill(scope === "todo")}>Todo ({pages.length})</button>
        <button onClick={() => { setScope("stale"); setNav(0); }} disabled={staleCount === 0} className="px-3 h-8 rounded-full text-[12px] disabled:opacity-40" style={pill(scope === "stale")} title="Solo las páginas cuyo contenido cambió tras generar la imagen">Desactualizadas ({staleCount})</button>
        <button onClick={() => { setScope("custom"); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={pill(scope === "custom")}>Personalizado</button>
        {scope === "custom" && <input value={custom} onChange={e => { setCustom(e.target.value); setNav(0); }} placeholder="01-08 · 01,03,05" className="h-8 px-3 rounded-lg text-[12px] outline-none w-40" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />}
        <label title="Regenera aunque la página ya esté hecha (re-roll / refresh). Sin esto, reutiliza las generadas sin gastar." className="inline-flex items-center gap-2 text-[12px] cursor-pointer ml-1" style={{ color: C.inkSoft }}><input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} /> Forzar</label>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && <button onClick={() => setSelected(new Set())} className="text-[12px]" style={{ color: `${C.ink}66` }}>limpiar</button>}
          <button onClick={toggleScope} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] hover:bg-white/5" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}>{allMarked ? "Desmarcar alcance" : `Marcar alcance (${filtered.length})`}</button>
          <button onClick={run} disabled={!selected.size || running} className="inline-flex items-center gap-2 text-white px-5 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
            {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando…</> : <><Layers className="w-4 h-4" /> Procesar ({selected.size})</>}
          </button>
        </div>
      </div>
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}

      {/* resultado del último proceso */}
      {res && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${C.teal}33` }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <MiniStat label="Listas" value={`${ready}/${res.pages.length}`} />
            <MiniStat label="Necesita revisión" value={String(nr)} />
            <MiniStat label="Fallidas" value={String(failed)} />
            <MiniStat label="Costo del proceso" value={`$${res.totalCostUsd.toFixed(2)}`} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {res.pages.map(p => (
              <span key={p.pageId} className="inline-flex items-center gap-1.5 text-[11px] rounded-lg px-2.5 py-1" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}10`, color: oc(p.outcome) }}>
                <span className="font-mono" style={{ color: C.ink, fontWeight: 600 }}>{p.pageId}</span> {p.outcome}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* tabla con checklist */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${C.ink}10` }}>
          <span className="text-[12px]" style={{ color: `${C.ink}66` }}>Mostrando {filtered.length ? cur * PER + 1 : 0}–{Math.min(cur * PER + PER, filtered.length)} de {filtered.length} · <span style={{ color: C.violet }}>{selected.size} marcadas</span></span>
          {navMax > 1 && <div className="flex items-center gap-2">
            <button onClick={() => setNav(n => Math.max(0, n - 1))} disabled={cur === 0} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowLeft className="w-4 h-4" /></button>
            <span className="text-[12px]" style={{ color: `${C.ink}66` }}>{cur + 1}/{navMax}</span>
            <button onClick={() => setNav(n => Math.min(navMax - 1, n + 1))} disabled={cur >= navMax - 1} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowRight className="w-4 h-4" /></button>
          </div>}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em]" style={{ color: `${C.ink}55` }}>
              <th className="pl-5 pr-2 py-2 font-normal w-0">{cbox(visAllMarked, toggleVisible)}</th>
              <th className="px-3 py-2 font-normal">Pág</th>
              <th className="px-3 py-2 font-normal">Dominio</th>
              <th className="px-3 py-2 font-normal">Título</th>
              <th className="px-5 py-2 font-normal text-right">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => {
              const on = selected.has(p.pageId);
              return (
                <tr key={p.pageId} className="cursor-pointer hover:bg-white/[0.02]" onClick={() => toggleRow(p.pageId)} style={{ borderTop: `1px solid ${C.ink}0c`, backgroundColor: on ? `${C.violet}0c` : "transparent" }}>
                  <td className="pl-5 pr-2 py-2.5">{cbox(on, () => toggleRow(p.pageId))}</td>
                  <td className="px-3 py-2.5 text-[12px] font-mono" style={{ color: C.ink }}>{p.pageNumber}</td>
                  <td className="px-3 py-2.5 text-[12px]" style={{ color: C.inkSoft }}>{p.domain || "—"}</td>
                  <td className="px-3 py-2.5 text-[13px]" style={{ color: C.ink }}>{p.title}</td>
                  <td className="px-5 py-2.5 text-right">{stateBadge(p)}</td>
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px]" style={{ color: C.inkSoft }}>No hay páginas en el alcance.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Contrato visual EN CASCADA (colección → libro → módulo) + manifiesto ── */
function ContratoStage({ pageId, reloadKey, page, setStage, isMaster = false, chapters = [], certId }: { pageId: string; reloadKey: number; page: EngineCatalogPage | null; setStage: (s: StageId) => void; isMaster?: boolean; chapters?: EngineChapter[]; certId: string }) {
  const [casc, setCasc] = useState<EngineContractCascade | null>(null);
  const [man, setMan] = useState<EngineInfographicManifest | null>(null);
  const [showPre, setShowPre] = useState(false);
  const [matter, setMatter] = useState<EngineMatterContract | null>(null);
  const [matterSaving, setMatterSaving] = useState(false);
  const [matterSaved, setMatterSaved] = useState(false);
  const [bookCfg, setBookCfg] = useState<EngineBookConfig | null>(null);  // identidad del Master (paleta/portada)
  // El Master (texto) no usa contrato image-2 ni manifiesto de infografía → no dispares esos fetches.
  useEffect(() => { if (!isMaster) return; let a = true; fetchBookConfig().then(c => { if (a) setBookCfg(c); }).catch(() => { if (a) setBookCfg(null); }); return () => { a = false; }; }, [isMaster, reloadKey]);
  useEffect(() => { if (isMaster) return; let a = true; fetchInfographicContract(pageId).then(c => { if (a) setCasc(c); }).catch(() => { if (a) setCasc(null); }); return () => { a = false; }; }, [pageId, reloadKey, isMaster]);
  useEffect(() => { if (isMaster) return; let a = true; fetchInfographicManifest(pageId).then(m => { if (a) setMan(m); }).catch(() => { if (a) setMan(null); }); return () => { a = false; }; }, [pageId, reloadKey, isMaster]);
  useEffect(() => { let a = true; fetchMatterContract().then(m => { if (a) setMatter(m); }).catch(() => { /* noop */ }); return () => { a = false; }; }, []);
  // Contrato de IMÁGENES del relato (solo master): cómo se crean las figuras que se suman al texto.
  const [img, setImg] = useState<EngineImageContract | null>(null);
  const [imgSaving, setImgSaving] = useState(false);
  const [imgSaved, setImgSaved] = useState(false);
  useEffect(() => { if (!isMaster) return; let a = true; fetchImageContract().then(x => { if (a) setImg(x); }).catch(() => { /* noop */ }); return () => { a = false; }; }, [isMaster]);
  const setI = <K extends keyof EngineImageContract>(k: K, v: EngineImageContract[K]) => { setImg(x => x ? { ...x, [k]: v } : x); setImgSaved(false); };
  async function saveImg() { if (!img) return; setImgSaving(true); try { setImg(await saveImageContract(img)); setImgSaved(true); } catch { /* noop */ } finally { setImgSaving(false); } }
  // Contrato de MARCA de las páginas de imagen (portadillas + hojas de ruta): hex de identidad congelados (solo master).
  const [brand, setBrand] = useState<EngineBrandContract | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);
  useEffect(() => { if (!isMaster) return; let a = true; fetchBrandContract().then(x => { if (a) setBrand(x); }).catch(() => { /* noop */ }); return () => { a = false; }; }, [isMaster]);
  const setB = <K extends keyof EngineBrandContract>(k: K, v: EngineBrandContract[K]) => { setBrand(x => x ? { ...x, [k]: v } : x); setBrandSaved(false); };
  async function saveBrand() { if (!brand) return; setBrandSaving(true); try { setBrand(await saveBrandContract(brand)); setBrandSaved(true); } catch { /* noop */ } finally { setBrandSaving(false); } }
  // Contrato EDITORIAL (voz del autor): reglas de estilo que obedece el autor (solo master).
  const [editorial, setEditorial] = useState<EngineEditorialContract | null>(null);
  const [edSaving, setEdSaving] = useState(false);
  const [edSaved, setEdSaved] = useState(false);
  useEffect(() => { if (!isMaster) return; let a = true; fetchEditorialContract().then(x => { if (a) setEditorial(x); }).catch(() => { /* noop */ }); return () => { a = false; }; }, [isMaster]);
  async function saveEditorial() { if (!editorial) return; setEdSaving(true); try { setEditorial(await saveEditorialContract(editorial)); setEdSaved(true); } catch { /* noop */ } finally { setEdSaving(false); } }
  const setM = (k: keyof EngineMatterContract, v: string | number) => { setMatter(m => m ? { ...m, [k]: v } : m); setMatterSaved(false); };
  async function saveMatter() { if (!matter) return; setMatterSaving(true); try { setMatter(await saveMatterContract(matter)); setMatterSaved(true); } catch { /* noop */ } finally { setMatterSaving(false); } }
  const scopeMeta = (s: EngineContractField["from"]) => s === "collection" ? { label: "Colección", col: C.blue } : s === "book" ? { label: "Libro/formato", col: C.violet } : { label: "Módulo", col: C.teal };
  const cnt = casc ? { c: casc.fields.filter(f => f.from === "collection").length, b: casc.fields.filter(f => f.from === "book").length, m: casc.fields.filter(f => f.from === "module").length } : null;
  // Identidad del Master: un capítulo de muestra para el preview tipográfico con texto REAL.
  const sample = isMaster ? (chapters.find(c => (c.seed.sections?.length ?? 0) > 0) ?? chapters[0]) : undefined;
  const firstSec = sample?.seed.sections?.[0];
  const proseSnippet = firstSec ? firstSec.prose.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280) : "";
  return (
    <div className="flex flex-col gap-5 max-w-[1100px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Contrato · identidad visual</p>
        <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Identidad visual de la colección</h1>
        {isMaster
          ? <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>El Master Book es un libro de <strong style={{ color: C.ink }}>texto</strong>: su identidad se rige por el contrato de <strong style={{ color: C.ink }}>Matter</strong> (tipografía del front/back matter — índice, prefacio, secciones, tablas), reproducible en toda la colección. El color de este libro sale de su tapa (en Ensamblar libro). El contrato de diagramación image-2 no aplica a este formato.</p>
          : <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>Dos contratos hermanos, ambos cascadean desde la <strong style={{ color: C.ink }}>colección</strong>: el del <strong style={{ color: C.ink }}>Atlas</strong> (image-2: paleta, iconografía, diagramas…) y el de <strong style={{ color: C.ink }}>Matter</strong> (tipografía del front/back matter — índice, secciones, tablas). El color de cada libro sale de su tapa (en Ensamblar libro); la tipografía se fija acá para toda la colección.</p>}
      </div>

      {/* Contrato de MATTER (colección, reproducible) */}
      {matter && (() => {
        const mfields: { k: keyof EngineMatterContract; label: string; step: number }[] = [
          { k: "titleSize", label: "Título portada", step: 1 }, { k: "h1Size", label: "Título sección", step: 1 }, { k: "h2Size", label: "Subtítulo", step: 1 }, { k: "bodySize", label: "Cuerpo", step: 0.5 },
          { k: "lineHeight", label: "Interlínea", step: 0.05 }, { k: "tocSize", label: "Índice", step: 0.5 }, { k: "tableSize", label: "Tablas", step: 0.5 },
        ];
        return (
          <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.violet}33` }}>
            <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Contrato · Matter (tipografía)</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>reproducible en toda la colección</span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>Tipografía y tamaños del front/back matter. Idéntico en <strong style={{ color: C.ink }}>todos</strong> los libros AI-200 → sin tipografías distintas en índices ni secciones.</p>
            <label className="flex flex-col gap-1 mb-3">
              <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Familia tipográfica (CSS)</span>
              <input value={matter.fontFamily} onChange={e => setM("fontFamily", e.target.value)} className="h-9 px-3 rounded-lg text-[12px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink, fontFamily: "ui-monospace, monospace" }} />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {mfields.map(f => (
                <label key={f.k} className="flex flex-col gap-1">
                  <span className="text-[11px]" style={{ color: `${C.ink}77` }}>{f.label}</span>
                  <input type="number" step={f.step} value={matter[f.k] as number} onChange={e => setM(f.k, parseFloat(e.target.value) || 0)} className="h-9 px-3 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
                </label>
              ))}
            </div>
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: "#fff", border: `1px solid ${C.ink}12` }}>
              <p style={{ fontFamily: matter.fontFamily, fontSize: matter.h1Size, fontWeight: 800, color: "#0F1B3D", margin: 0 }}>Título de sección</p>
              <p style={{ fontFamily: matter.fontFamily, fontSize: matter.bodySize, lineHeight: matter.lineHeight, color: "#44505F", marginTop: 6 }}>Párrafo de cuerpo de muestra para ver la tipografía del matter aplicada — así se verán los índices, el prefacio y las secciones en todos los libros de la colección.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveMatter} disabled={matterSaving} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{matterSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Guardar contrato</>}</button>
              {matterSaved && !matterSaving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓ · aplica a toda la colección</span>}
            </div>
          </div>
        );
      })()}

      {/* Contrato EDITORIAL (solo Master): la VOZ del autor — reglas de estilo que obedece en cada capítulo */}
      {isMaster && editorial && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.violet}33` }}>
          <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.violet }}>Contrato · Voz editorial</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>obedecida por el autor</span>
          </div>
          <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Reglas de <strong style={{ color: C.ink }}>cómo escribe</strong> el autor cada capítulo — se anexan a su system prompt. Para que el libro suene a <strong style={{ color: C.ink }}>libro editorial</strong>, sin muletillas, sin palabras inventadas.</p>
          <textarea value={editorial.voice} onChange={e => { setEditorial(v => v ? { ...v, voice: e.target.value } : v); setEdSaved(false); }} rows={7} className="w-full rounded-lg px-3 py-2.5 text-[12px] leading-relaxed outline-none resize-y" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
          <div className="flex items-center gap-3 mt-3">
            <button onClick={saveEditorial} disabled={edSaving} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{edSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Guardar voz</>}</button>
            {edSaved && !edSaving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓ · aplica al (re)generar capítulos</span>}
          </div>
        </div>
      )}

      {/* Contrato de MARCA (solo Master): hex de identidad de portadillas + hojas de ruta, congelados (sin drift de paleta) */}
      {isMaster && brand && (() => {
        const bfields: { k: keyof EngineBrandContract; label: string }[] = [
          { k: "dividerAccentHex", label: "Acento portadilla (CAPÍTULO · regla · olas · pie)" },
          { k: "dividerNavyHex", label: "Navy (caja del número · título)" },
          { k: "dividerCanvasHex", label: "Fondo portadilla" },
          { k: "dividerWaveBaseHex", label: "Olas · color base" },
          { k: "partBgHex", label: "Fondo hoja de ruta" },
          { k: "partAccentHex", label: "Acento hoja de ruta" },
          { k: "partAccent2Hex", label: "Glow olas (hoja de ruta)" },
        ];
        return (
          <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.green}33` }}>
            <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.green }}>Contrato · Marca (portadillas + hojas de ruta)</p>
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.green, border: `1px solid ${C.green}44` }}>identidad congelada · reproducible</span>
            </div>
            <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>Los colores de las páginas de imagen (el "CAPÍTULO", la caja del número, las olas y el pie "{"{"}code{"}"}"). Salen de <strong style={{ color: C.ink }}>este contrato</strong>, no de la paleta del libro → sin micro-cambios de marca entre capítulos. Se aplican al <strong style={{ color: C.ink }}>regenerar</strong> portadillas / hojas de ruta.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {bfields.map(f => (
                <label key={f.k} className="flex items-center gap-2.5">
                  <input type="color" value={brand[f.k]} onChange={e => setB(f.k, e.target.value)} className="w-9 h-9 rounded-lg shrink-0 cursor-pointer" style={{ backgroundColor: "transparent", border: `1px solid ${C.ink}1f` }} />
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-[11px] truncate" style={{ color: `${C.ink}77` }}>{f.label}</span>
                    <input value={brand[f.k]} onChange={e => setB(f.k, e.target.value)} className="h-7 px-2 rounded-md text-[12px] outline-none w-full" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink, fontFamily: "ui-monospace, monospace" }} />
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={saveBrand} disabled={brandSaving} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{brandSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Guardar contrato</>}</button>
              {brandSaved && !brandSaving && <span className="text-[11px]" style={{ color: C.green }}>guardado ✓ · aplica al regenerar portadillas/hojas de ruta</span>}
            </div>
          </div>
        );
      })()}

      {/* Contrato de IMÁGENES del relato (solo Master): cómo se crean las figuras que se suman al texto */}
      {isMaster && img && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.teal}33` }}>
          <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: C.teal }}>Contrato · Imágenes del relato</p>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>figuras complementarias del texto</span>
          </div>
          <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>Define <strong style={{ color: C.ink }}>cómo se crean las imágenes</strong> que se suman al relato (los diagramas de cada capítulo). Se aplica al <strong style={{ color: C.ink }}>regenerar figuras</strong> en la Galería.</p>
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Dirección de arte (una frase)</span>
            <input value={img.figureStyle} onChange={e => setI("figureStyle", e.target.value)} className="h-9 px-3 rounded-lg text-[12px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Fuente de paleta</span>
              <select value={img.paletteSource} onChange={e => setI("paletteSource", e.target.value as EngineImageContract["paletteSource"])} className="h-9 px-2 rounded-lg text-[12px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                <option value="cover">Desde la tapa (marca)</option>
                <option value="fixed">Fija (navy/azul)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Tamaño</span>
              <select value={img.figureSize} onChange={e => setI("figureSize", e.target.value)} className="h-9 px-2 rounded-lg text-[12px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }}>
                <option value="1536x1024">Apaisado (1536×1024)</option>
                <option value="1024x1536">Retrato (1024×1536)</option>
                <option value="1024x1024">Cuadrado (1024×1024)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Figuras por capítulo (máx.)</span>
              <input type="number" min={0} max={6} step={1} value={img.maxFiguresPerChapter} onChange={e => setI("maxFiguresPerChapter", Math.max(0, parseInt(e.target.value) || 0))} className="h-9 px-3 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px]" style={{ color: `${C.ink}77` }}>Elementos por figura (máx.)</span>
              <input type="number" min={2} max={12} step={1} value={img.maxElements} onChange={e => setI("maxElements", Math.max(2, parseInt(e.target.value) || 2))} className="h-9 px-3 rounded-lg text-[13px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />
            </label>
            <label className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={img.anchorConsistency} onChange={e => setI("anchorConsistency", e.target.checked)} />
              <span className="text-[12px]" style={{ color: C.inkSoft }}>Consistencia por ancla</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveImg} disabled={imgSaving} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{imgSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Guardar contrato</>}</button>
            {imgSaved && !imgSaving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓ · aplica al regenerar figuras</span>}
          </div>
        </div>
      )}

      {/* Identidad del Master: paleta + portada + preview tipográfico con texto REAL de un capítulo */}
      {isMaster && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: C.violet }}>Identidad del libro · Master Book</p>
          <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>Cómo se ve y se lee este libro: paleta, portada y la tipografía de Matter aplicada a texto real de un capítulo.</p>
          <div className="grid md:grid-cols-[132px_1fr] gap-5">
            <div>
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: "1024 / 1536", backgroundColor: C.bg, border: `1px solid ${C.ink}1f` }}>
                <img loading="lazy" src={bookCfg?.cover.imageUrl ?? `${masterBookAsset(certId)}/cover.png`} onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = "0"; }} alt="Portada del Master Book" className="w-full h-full object-cover" />
              </div>
              {bookCfg && (
                <div className="flex items-center gap-1.5 mt-2">
                  {[bookCfg.style.bg, bookCfg.style.accent, bookCfg.style.accent2].map((col, i) => (
                    <span key={i} title={col} className="w-6 h-6 rounded-md shrink-0" style={{ backgroundColor: col, border: `1px solid ${C.ink}22` }} />
                  ))}
                  <span className="font-mono text-[9px] ml-1" style={{ color: `${C.ink}55` }}>paleta</span>
                </div>
              )}
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${C.ink}12` }}>
              {matter && sample ? (
                <>
                  <p style={{ fontFamily: matter.fontFamily, fontSize: matter.h1Size, fontWeight: 800, color: "#0F1B3D", margin: 0 }}>{sample.seed.title}</p>
                  {firstSec && <p style={{ fontFamily: matter.fontFamily, fontSize: matter.h2Size, fontWeight: 700, color: "#1f2a44", marginTop: 10, marginBottom: 0 }}>{firstSec.heading}</p>}
                  {proseSnippet && <p style={{ fontFamily: matter.fontFamily, fontSize: matter.bodySize, lineHeight: matter.lineHeight, color: "#44505F", marginTop: 6 }}>{proseSnippet}…</p>}
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em]" style={{ color: "#94a3b8" }}>Cap {sample.seed.chapterNumber} · tipografía de Matter aplicada</p>
                </>
              ) : <p className="text-[12px]" style={{ color: C.inkSoft }}>Generá un capítulo (Grounding/Generar) para ver la tipografía aplicada a texto real.</p>}
            </div>
          </div>
        </div>
      )}

      {!isMaster && casc && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Contrato · Atlas (image-2) · cascada</p>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap text-[11px]">
              <span className="px-2 py-0.5 rounded-full" style={{ color: C.teal, border: `1px solid ${C.teal}44` }}>{casc.version}</span>
              <span style={{ color: `${C.ink}66` }}>{casc.certId} · {casc.format} · {casc.domainLabel || casc.domainId}</span>
            </div>
            {cnt && <div className="flex items-center gap-3 text-[11px]">
              <span style={{ color: C.blue }}>● {cnt.c} colección</span>
              {cnt.b > 0 && <span style={{ color: C.violet }}>● {cnt.b} libro</span>}
              <span style={{ color: C.teal }}>● {cnt.m} módulo</span>
            </div>}
          </div>
          <div className="flex flex-col gap-2">
            {casc.fields.map(f => <ContractFieldRow key={f.key} field={f} meta={scopeMeta(f.from)} />)}
          </div>
          <button onClick={() => setShowPre(v => !v)} className="text-[12px] mt-4 inline-flex items-center gap-1.5" style={{ color: C.bright }}>
            <ChevronDown className="w-3.5 h-3.5" style={{ transform: showPre ? "rotate(180deg)" : "" }} /> {showPre ? "Ocultar" : "Ver"} preámbulo efectivo ensamblado
          </button>
          {showPre && <pre className="text-[11px] leading-relaxed rounded-xl p-4 mt-2 overflow-auto max-h-[360px] whitespace-pre-wrap" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12`, color: `${C.ink}cc`, fontFamily: "ui-monospace, monospace" }}>{casc.preamble}</pre>}
        </div>
      )}

      {!isMaster && (
      <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Manifiesto de reproducibilidad · página {pageId}</p>
        {man ? (
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
            <ManRow k="Outcome" v={man.outcome ?? "—"} />
            <ManRow k="Versión del contrato" v={man.promptVersion ?? "—"} />
            <ManRow k="Intentos (re-roll)" v={String(man.attempts ?? "—")} />
            <ManRow k="Costo" v={man.costUsd != null ? `$${man.costUsd.toFixed(2)}` : "—"} />
            <ManRow k="Anclada a master" v={man.anchored ? (man.anchorMaster ?? "sí") : "no"} />
            <ManRow k="Generada" v={man.generatedAt ? new Date(man.generatedAt).toLocaleString() : "—"} />
          </div>
        ) : <p className="text-[12px]" style={{ color: C.inkSoft }}>Esta página no tiene infografía generada todavía.</p>}
        {/* estado de la imagen (frescura + QA) + enlace al cockpit */}
        {page && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${C.ink}10` }}>
            {page.imageQaOk != null && <span className="text-[11px] px-2.5 h-7 rounded-full inline-flex items-center gap-1.5" style={{ color: page.imageQaOk ? C.teal : C.gold, border: `1px solid ${(page.imageQaOk ? C.teal : C.gold)}55` }}><ShieldCheck className="w-3.5 h-3.5" /> QA imagen {page.imageQaOk ? "ok" : "a revisar"}</span>}
            {page.needsRegen && <span className="text-[11px] px-2.5 h-7 rounded-full inline-flex items-center gap-1.5" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}><AlertTriangle className="w-3.5 h-3.5" /> desactualizada</span>}
            {page.approved && (page.approvalStale ? <span className="text-[11px] px-2.5 h-7 rounded-full inline-flex items-center gap-1.5" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>aprob. vieja</span> : <span className="text-[11px] px-2.5 h-7 rounded-full inline-flex items-center gap-1.5" style={{ color: C.teal, border: `1px solid ${C.teal}55` }}><Check className="w-3.5 h-3.5" /> aprobada</span>)}
            <button onClick={() => setStage("qa")} className="ml-auto inline-flex items-center gap-1.5 text-[12px] px-2.5 h-7 rounded-full transition-all hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}><ShieldCheck className="w-3.5 h-3.5" /> Cockpit de QA <ArrowRight className="w-3 h-3" /></button>
          </div>
        )}
        {man && <a href={`/engine/infographic/${pageId}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] mt-3" style={{ color: C.bright }}><FileCode2 className="w-3.5 h-3.5" /> Ver manifiesto JSON completo <ExternalLink className="w-3 h-3" /></a>}
      </div>
      )}
    </div>
  );
}

function ContractFieldRow({ field, meta }: { field: EngineContractField; meta: { label: string; col: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl" style={{ border: `1px solid ${C.ink}10`, backgroundColor: C.bg }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ color: meta.col, border: `1px solid ${meta.col}55` }}>{meta.label}</span>
        <span className="text-[13px] flex-1 min-w-0" style={{ color: C.ink, fontWeight: 600 }}>{field.label}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: `${C.ink}55`, transform: open ? "rotate(180deg)" : "" }} />
      </button>
      {open && <p className="text-[11.5px] leading-relaxed px-3.5 pb-3 whitespace-pre-wrap" style={{ color: `${C.ink}99` }}>{field.value}</p>}
    </div>
  );
}
function ManRow({ k, v }: { k: string; v: string }) {
  return <div className="flex items-center justify-between gap-3 py-1" style={{ borderBottom: `1px solid ${C.ink}0c` }}><span style={{ color: `${C.ink}77` }}>{k}</span><span style={{ color: C.ink, fontWeight: 600 }}>{v}</span></div>;
}

/* ── Ensamblar libro: editor de composición + bloque aprobado → PDF ── */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("read")); r.readAsDataURL(file); });
}
function EdPanel({ title, desc, children, open }: { title: string; desc?: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="rounded-2xl group" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
      <summary className="px-5 py-3.5 cursor-pointer flex items-center gap-2" style={{ listStyle: "none" }}>
        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 shrink-0" style={{ color: C.inkSoft }} />
        <span className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{title}</span>
        {desc && <span className="text-[11px] ml-1" style={{ color: `${C.ink}55` }}>{desc}</span>}
      </summary>
      <div className="px-5 pb-5 pt-3 flex flex-col gap-3" style={{ borderTop: `1px solid ${C.ink}0c` }}>{children}</div>
    </details>
  );
}

function EnsamblarLibroStage({ reloadKey }: { reloadKey: number }) {
  const [outline, setOutline] = useState<EngineBookOutline | null>(null);
  const [cfg, setCfg] = useState<EngineBookConfig | null>(null);
  const [res, setRes] = useState<EngineAssembleResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [busy, setBusy] = useState("");
  const [genBusy, setGenBusy] = useState("");
  const [secBusy, setSecBusy] = useState("");
  const [routes, setRoutes] = useState<{ domainId: string; label: string; total: number; covered: number }[]>([]);
  const [err, setErr] = useState("");
  const [bigImg, setBigImg] = useState<string | null>(null);   // modal de vista grande de un asset
  // cache-buster: los assets tienen nombre FIJO (cover/route-intro-pN) → si el navegador cacheó un fallo
  // previo, no reintenta. Inicializar con un valor ÚNICO por carga garantiza un fetch fresco; sube tras cada upload.
  const [bust, setBust] = useState(() => Date.now());
  const bustUrl = (u: string) => `${u}${u.includes("?") ? "&" : "?"}v=${bust}`;
  useEffect(() => { let a = true; fetchBookOutline().then(o => { if (a) setOutline(o); }).catch(() => { if (a) setOutline(null); }); return () => { a = false; }; }, [reloadKey]);
  useEffect(() => { let a = true; fetchBookConfig().then(c => { if (a) setCfg(c); }).catch(() => { if (a) setCfg(null); }); return () => { a = false; }; }, []);
  useEffect(() => { let a = true; fetchEngineCoverage().then(r => { if (a) setRoutes(r.byDomain); }).catch(() => { if (a) setRoutes([]); }); return () => { a = false; }; }, []);
  useEffect(() => { if (!bigImg) return; const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBigImg(null); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [bigImg]);
  // Preview GLOBAL (embeber el PDF ensamblado) + páginas complementarias (PNG) — sin descargar.
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [ptab, setPtab] = useState<"hojas" | "extras">("hojas");
  const [comps, setComps] = useState<EngineBookPreview[]>([]);
  useEffect(() => { let a = true; fetchAssembledStatus().then(s => { if (a) setPdfUrl(s.url); }).catch(() => { /* noop */ }); fetchBookPreviews().then(r => { if (a) setComps(r.items); }).catch(() => { /* noop */ }); return () => { a = false; }; }, [reloadKey]);
  async function gen(section: EngineBookSection) {
    setGenBusy(section); setErr("");
    try {
      const r = await generateBookSection(section);
      if (!r.ok) { setErr(r.error ?? "No se pudo generar."); return; }
      setCfg(c => {
        if (!c) return c;
        if (section === "domainRows" && r.rows) return { ...c, domainMap: { ...c.domainMap, rows: r.rows } };
        if (section === "domainNote" && r.note != null) return { ...c, domainMap: { ...c.domainMap, note: r.note } };
        if (section === "collectionNote" && r.note != null) return { ...c, collection: { ...c.collection, note: r.note } };
        if (section === "backcover" && r.html != null) return { ...c, backCover: { ...c.backCover, html: r.html } };
        if (r.html != null && (section === "preface" || section === "intro" || section === "conclusions")) return { ...c, blocks: { ...c.blocks, [section]: r.html } };
        return c;
      });
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setGenBusy(""); }
  }
  async function assemble() {
    setRunning(true); setErr(""); setRes(null);
    try { const r = await assembleBook(); setRes(r); if (r.ok && r.url) { setPdfUrl(r.url); setPtab("hojas"); setPreviewOpen(true); } else if (!r.ok) setErr(r.error ?? "Falló el ensamblado."); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setRunning(false); }
  }
  function openPreview() { setPtab(pdfUrl ? "hojas" : "extras"); setPreviewOpen(true); fetchAssembledStatus().then(s => setPdfUrl(s.url)).catch(() => { /* noop */ }); }
  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      // patch SIN routeIntros (divisores → los maneja "Intros por ruta") ni blocks.studyGuide (→ "Guía de estudio").
      // El deep-merge del server preserva esos campos; este editor no los pisa con su snapshot de montaje.
      const { routeIntros, blocks, ...rest } = cfg; void routeIntros;
      const { studyGuide, ...blocksRest } = blocks; void studyGuide;
      const r = await saveBookConfig({ ...rest, blocks: blocksRest as EngineBookConfig["blocks"] });
      setCfg(r); setSavedAt(Date.now()); fetchBookOutline().then(setOutline).catch(() => { /* noop */ });
    }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSaving(false); }
  }
  async function onCover(file: File) {
    setBusy("cover");
    try { const r = await uploadBookCover(await fileToDataUrl(file)); if (r.ok) { setCfg(r.config); setBust(b => b + 1); fetchBookOutline().then(setOutline).catch(() => { /* noop */ }); } }
    catch { /* noop */ } finally { setBusy(""); }
  }
  async function onBack(file: File) {
    setBusy("back");
    try { const r = await uploadBookAsset(await fileToDataUrl(file), "backcover"); if (r.ok) { setCfg(c => c ? { ...c, backCover: { ...c.backCover, mode: "template", imageUrl: r.url } } : c); setBust(b => b + 1); } }
    catch { /* noop */ } finally { setBusy(""); }
  }
  async function onAddColl(file: File) {
    setBusy("coll");
    try { const r = await uploadBookAsset(await fileToDataUrl(file), `coll-${Date.now()}`); if (r.ok) setCfg(c => c ? { ...c, collection: { ...c.collection, items: [...c.collection.items, { id: String(Date.now()), coverUrl: r.url, title: "Nuevo libro", buyUrl: "" }] } } : c); }
    catch { /* noop */ } finally { setBusy(""); }
  }
  // ── secciones nuevas: guía de estudio · glosario · intros por ruta ──
  async function genStudyGuide() {
    setSecBusy("studyGuide"); setErr("");
    try { const r = await generateStudyGuide(); if (!r.ok || !r.html) { setErr(r.error ?? "No se pudo generar la guía."); return; } setCfg(c => c ? { ...c, blocks: { ...c.blocks, studyGuide: r.html! } } : c); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  async function genGlossary() {
    setSecBusy("glossary"); setErr("");
    try { const r = await generateGlossary(); if (!r.ok || !r.html) { setErr(r.error ?? "No se pudo generar el glosario."); return; } setCfg(c => c ? { ...c, blocks: { ...c.blocks, glossary: r.html! } } : c); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  async function genScenarioReview() {
    setSecBusy("scenarioReview"); setErr("");
    try { const r = await generateScenarioReview(); if (!r.ok || !r.html) { setErr(r.error ?? "No se pudieron generar los casos de examen."); return; } setCfg(c => c ? { ...c, blocks: { ...c.blocks, scenarioReview: r.html! } } : c); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  // Divisor de marca (imagen) por ruta — ancla canónica (ruta 3 = master). Genera desde la web, sin scripts.
  async function genDivider(domainId: string, regen: boolean) {
    if (regen && !window.confirm(`¿Regenerar el divisor de ${domainId}? Reemplaza la imagen actual (queda anclado al master).`)) return;
    setSecBusy(`div-${domainId}`); setErr("");
    try {
      const r = await generateRouteDivider(domainId, regen);
      if (!r.ok) { setErr(`${domainId}: ${r.error ?? "no se pudo generar el divisor"}`); return; }
      setCfg(c => c ? { ...c, routeIntros: { ...c.routeIntros, [domainId]: { ...(c.routeIntros[domainId] ?? { text: "" }), imageUrl: r.url ?? null } } } : c);
      setBust(b => b + 1);
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  async function genAllDividers() {
    if (!window.confirm("¿Generar los 9 divisores de marca? Genera la ruta 3 (master) y ancla las otras 8. Reemplaza los divisores actuales (~$0.6).")) return;
    setSecBusy("div-all"); setErr("");
    try {
      const r = await generateRouteDividersAll(false);
      const fails = r.results.filter(x => !x.ok);
      if (fails.length) setErr(`${fails.length} divisor(es) fallaron: ${fails.map(f => f.domainId).join(", ")}`);
      const fresh = await fetchBookConfig(); setCfg(fresh); setBust(b => b + 1);
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  // Plan de dominio = 9 rutas del atlas (desde el outline), no per-skill.
  async function genDomainMap() {
    setSecBusy("domainMap"); setErr("");
    try { const r = await generateDomainMap(); if (!r.ok || !r.rows) { setErr(r.error ?? "No se pudo generar el plan de dominio."); return; } setCfg(c => c ? { ...c, domainMap: { note: r.note ?? c.domainMap.note, rows: r.rows! } } : c); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  // Restaura un bloque editable al texto por defecto (neutro) — sin scripts.
  async function resetBlk(key: string) {
    setSecBusy(`reset-${key}`); setErr("");
    try { const c = await resetBookBlock(key); setCfg(c); }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  const resetBtn = (key: string) => (
    <button onClick={() => resetBlk(key)} disabled={!!secBusy} title="Volver al texto por defecto (español neutro)" className="inline-flex items-center gap-1 px-2 h-7 rounded-lg text-[11px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}>
      {secBusy === `reset-${key}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Restaurar
    </button>
  );
  async function genRouteIntroText(domainId: string) {
    setSecBusy(`ri-gen-${domainId}`); setErr("");
    try {
      const r = await generateRouteIntro(domainId);
      if (!r.ok || !r.text) { setErr(`${domainId}: ${r.error ?? "no se pudo generar"}`); return; }
      setCfg(c => c ? { ...c, routeIntros: { ...c.routeIntros, [domainId]: { ...(c.routeIntros[domainId] ?? { imageUrl: null, text: "" }), text: r.text! } } } : c);
    } catch (e) { setErr(String((e as Error).message || e)); } finally { setSecBusy(""); }
  }
  async function onRouteIntroUpload(domainId: string, file: File) {
    setBusy(`ri-${domainId}`); setErr("");
    try { const r = await uploadRouteIntro(domainId, await fileToDataUrl(file)); if (r.ok) { setCfg(r.config); setBust(b => b + 1); } }
    catch (e) { setErr(String((e as Error).message || e)); } finally { setBusy(""); }
  }

  const laminas = outline?.laminas ?? 0;
  const bookApproved = !!outline?.bookApproved;
  const byDomain: { domain: string; rows: { pageNumber: string; title: string }[] }[] = [];
  (outline?.toc ?? []).forEach(t => { let g = byDomain.find(d => d.domain === t.domain); if (!g) { g = { domain: t.domain, rows: [] }; byDomain.push(g); } g.rows.push({ pageNumber: t.pageNumber, title: t.title }); });

  const setStyle = (k: keyof EngineBookConfig["style"], v: string) => setCfg(c => c ? { ...c, style: { ...c.style, [k]: v } } : c);
  const setSection = (k: keyof EngineBookConfig["sections"], v: boolean) => setCfg(c => c ? { ...c, sections: { ...c.sections, [k]: v } } : c);
  const setBlock = (k: keyof EngineBookConfig["blocks"], v: string) => setCfg(c => c ? { ...c, blocks: { ...c.blocks, [k]: v } } : c);
  const tog = (on: boolean, onClick: () => void) => <button onClick={onClick} className="w-9 h-5 rounded-full relative transition-all shrink-0" style={{ backgroundColor: on ? C.violet : `${C.ink}26` }}><span className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: on ? "18px" : "2px", backgroundColor: "#fff" }} /></button>;
  const inpStyle = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink };
  const upBtn = (label: string, onPick: (f: File) => void, kind: string) => (
    <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg text-[12px] cursor-pointer hover:bg-white/5 self-start" style={{ border: `1px solid ${C.violet}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
      {busy === kind ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} {label}
      <input type="file" accept="image/*" className="hidden" onChange={async e => { const input = e.currentTarget; const f = input.files?.[0]; if (f) await onPick(f); input.value = ""; }} />
    </label>
  );
  const aiBtn = (section: EngineBookSection, label = "Generar con IA") => (
    <button onClick={() => gen(section)} disabled={!!genBusy} title="Redacta con IA anclado a las skills aprobadas; revisá y editá antes de guardar" className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
      {genBusy === section ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {label}
    </button>
  );
  const blockDefs: { k: keyof EngineBookConfig["blocks"]; sec: keyof EngineBookConfig["sections"]; label: string; ai?: EngineBookSection }[] = [
    { k: "copyright", sec: "copyright", label: "Copyright / créditos" },
    { k: "preface", sec: "preface", label: "Prefacio", ai: "preface" },
    { k: "intro", sec: "intro", label: "Introducción", ai: "intro" },
    { k: "conclusions", sec: "conclusions", label: "Conclusiones", ai: "conclusions" },
  ];

  return (
    <div className="flex flex-col gap-5 max-w-[1000px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Ensamblar libro</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Compón el libro completo</h1>
          <SectionHelp title="Ensamblar libro · para qué sirve" body={[
            "Aquí gobiernas TODO lo que no es atlas: subes tu portada (define el estilo), editas los bloques HTML (copyright, prefacio, intro, conclusiones), cargas la colección y el mapeo de dominios, y eliges la contraportada (auto o template).",
            "Se acopla al bloque aprobado: las láminas que entran son las que firmaste en Aprobaciones.",
            "Editá, dale Guardar, y Ensamblar arma el PDF 6×9\" con todo aplicado. El front/back matter es HTML determinista; las láminas, las infografías.",
          ]} />
        </div>
      </div>

      {/* status + ensamblar */}
      <div className="rounded-2xl p-5 flex flex-wrap items-center gap-4" style={{ backgroundColor: C.card, border: `1px solid ${laminas ? `${C.violet}33` : `${C.ink}14`}` }}>
        <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.violet}1a`, border: `1px solid ${C.violet}33` }}><BookOpen className="w-5 h-5" style={{ color: C.violet }} /></span>
        <div>
          <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{laminas} lámina{laminas === 1 ? "" : "s"} aprobada{laminas === 1 ? "" : "s"} · {outline?.dominios ?? 0} dominio(s)</p>
          <p className="text-[12px]" style={{ color: C.inkSoft }}>{bookApproved ? "Libro aprobado en Aprobaciones." : "El libro no está marcado como aprobado — puedes ensamblar el bloque aprobado igual."}</p>
        </div>
        <button onClick={assemble} disabled={!laminas || running} className="ml-auto inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
          {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Ensamblando…</> : <><BookOpen className="w-4 h-4" /> Ensamblar libro (PDF)</>}
        </button>
        {res?.ok && res.url && <a href={res.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.teal }}><Download className="w-3.5 h-3.5" /> descargar ({res.pages} págs)</a>}
      </div>
      {err && <p className="text-[12px]" style={{ color: "#fca5a5" }}>{err}</p>}
      {res?.ok && res.warnings && res.warnings.length > 0 && (
        <div className="text-[12px] rounded-xl px-4 py-3" style={{ color: C.gold, backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33` }}>
          <strong>El libro se armó con advertencias:</strong>
          <ul className="mt-1 list-disc ml-5">{res.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}
      {outline && !laminas && <p className="text-[12px] rounded-xl px-4 py-3" style={{ color: C.gold, backgroundColor: `${C.gold}12`, border: `1px solid ${C.gold}33` }}>No hay láminas aprobadas. Aprobá páginas en la sección <strong>Aprobaciones</strong> para armar el libro.</p>}

      {/* ── EDITOR DE COMPOSICIÓN ── */}
      {cfg && (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Editor de composición</p>
            <div className="flex items-center gap-3">
              <button onClick={openPreview} className="text-[12px] inline-flex items-center gap-1.5" style={{ color: C.bright }}><Eye className="w-3.5 h-3.5" /> Ver preview</button>
              {savedAt > 0 && !saving && <span className="text-[11px]" style={{ color: C.teal }}>guardado ✓</span>}
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 text-white px-4 h-9 rounded-full text-[13px] hover:brightness-110 disabled:opacity-60" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : <><Check className="w-4 h-4" /> Guardar cambios</>}</button>
            </div>
          </div>

          {/* Portada y estilo */}
          <EdPanel title="Portada y estilo" desc="subí tu tapa → la paleta del matter" open>
            <div className="flex items-start gap-4 flex-wrap">
              {/* Portada REAL (subida o generada con image-2): cfg.cover.imageUrl se puebla en ambos casos */}
              {cfg.cover.imageUrl
                ? <div className="flex flex-col items-center gap-1"><img src={bustUrl(cfg.cover.imageUrl)} alt="portada" onClick={() => setBigImg(bustUrl(cfg.cover.imageUrl!))} title="Ver grande" className="w-24 rounded-lg cursor-pointer" style={{ border: `1px solid ${C.ink}1f`, aspectRatio: "2/3", objectFit: "cover" }} /><span className="text-[9px]" style={{ color: `${C.ink}55` }}>Portada{cfg.cover.mode === "uploaded" ? " (subida)" : ""}</span></div>
                : <div className="w-24 h-36 rounded-lg flex items-center justify-center text-center text-[10px] px-2" style={{ backgroundColor: cfg.style.bg, color: "#fff" }}>Sin portada · generá en Auto Pages</div>}
              {/* Contraportada REAL (auto/template/generada) */}
              {cfg.backCover.imageUrl
                ? <div className="flex flex-col items-center gap-1"><img src={bustUrl(cfg.backCover.imageUrl)} alt="contraportada" onClick={() => setBigImg(bustUrl(cfg.backCover.imageUrl!))} title="Ver grande" className="w-24 rounded-lg cursor-pointer" style={{ border: `1px solid ${C.ink}1f`, aspectRatio: "2/3", objectFit: "cover" }} /><span className="text-[9px]" style={{ color: `${C.ink}55` }}>Contraportada</span></div>
                : <div className="w-24 h-36 rounded-lg flex items-center justify-center text-center text-[10px] px-2" style={{ backgroundColor: cfg.style.bg, color: `${"#fff"}88` }}>Sin contra · generá en Auto Pages</div>}
              <div className="flex flex-col gap-2">
                {upBtn(cfg.cover.mode === "uploaded" ? "Cambiar portada" : "Subir mi portada", onCover, "cover")}
                {cfg.cover.mode === "uploaded" && <button onClick={() => setCfg(c => c ? { ...c, cover: { ...c.cover, mode: "generated" } } : c)} className="text-[11px] self-start" style={{ color: `${C.ink}66` }}>usar portada generada</button>}
                {cfg.cover.palette.length > 0 && <div className="flex items-center gap-1.5 mt-1">{cfg.cover.palette.map((h, i) => <span key={i} className="w-5 h-5 rounded" title={h} style={{ backgroundColor: h, border: `1px solid ${C.ink}22` }} />)}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-1">
              {([["bg", "Fondo (tapa/contra)"], ["accent", "Acento"], ["accent2", "Acento 2"], ["text", "Texto"]] as [keyof EngineBookConfig["style"], string][]).map(([k, lbl]) => (
                <label key={k} className="flex items-center gap-2 text-[12px]" style={{ color: C.inkSoft }}>
                  <input type="color" value={cfg.style[k]} onChange={e => setStyle(k, e.target.value)} className="w-7 h-7 rounded cursor-pointer" style={{ background: "none", border: `1px solid ${C.ink}22` }} /> {lbl}
                </label>
              ))}
            </div>
          </EdPanel>

          {/* Bloques editables */}
          <EdPanel title="Bloques editables (HTML)" desc="copyright · prefacio · intro · conclusiones">
            {blockDefs.map(b => (
              <div key={b.k} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  {tog(cfg.sections[b.sec], () => setSection(b.sec, !cfg.sections[b.sec]))}
                  <span className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>{b.label}</span>
                  <span className="ml-auto flex items-center gap-1.5">
                    {cfg.sections[b.sec] && resetBtn(b.k)}
                    {b.ai ? (cfg.sections[b.sec] && aiBtn(b.ai)) : <span className="text-[10px]" style={{ color: `${C.ink}55` }}>sin IA · reproducible en la colección</span>}
                  </span>
                </div>
                {cfg.sections[b.sec] && <textarea value={cfg.blocks[b.k]} onChange={e => setBlock(b.k, e.target.value)} rows={5} spellCheck={false} className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />}
              </div>
            ))}
            <p className="text-[11px]" style={{ color: `${C.ink}55` }}>HTML directo: usa &lt;h1&gt;, &lt;p&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt;. Se insertan tal cual (determinismo).</p>
          </EdPanel>

          {/* Guía de estudio */}
          <EdPanel title="Guía de estudio" desc="cómo se comporta el examen · del study guide oficial">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.studyGuide, () => setSection("studyGuide", !cfg.sections.studyGuide))} Incluir la sección (después de la Introducción)</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={genStudyGuide} disabled={!!secBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                {secBusy === "studyGuide" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {cfg.blocks.studyGuide.trim() ? "Regenerar" : "Generar (ingiere el study guide oficial)"}
              </button>
              <span className="text-[10px]" style={{ color: `${C.ink}55` }}>se guarda con “Guardar cambios”</span>
            </div>
            <textarea value={cfg.blocks.studyGuide} onChange={e => setBlock("studyGuide", e.target.value)} rows={6} spellCheck={false} placeholder="Vacío = generala arriba. Ingiere el study guide oficial y redacta dominios · pesos · formato." className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />
          </EdPanel>

          {/* Intros por ruta */}
          <EdPanel title="Intros por ruta" desc="divisor por ruta · síntesis para copiar + subir página formateada">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.routeIntros, () => setSection("routeIntros", !cfg.sections.routeIntros))} Incluir divisores por ruta (con fallback de texto)</label>
            <p className="text-[11px]" style={{ color: `${C.ink}66` }}>Generá el <strong>divisor de marca</strong> automático (toma la paleta de tu portada; ruta 3 = master, las demás ancladas), o subí tu propia página diseñada. Mientras no haya imagen, el divisor usa el texto.</p>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <button onClick={genAllDividers} disabled={!!secBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.violet}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                {secBusy === "div-all" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Generar los 9 divisores de marca
              </button>
              <span className="text-[10px]" style={{ color: `${C.ink}55` }}>~$0.6 · reemplaza los divisores actuales</span>
            </div>
            <div className="flex flex-col gap-2">
              {routes.map(rt => {
                const ri = cfg.routeIntros[rt.domainId];
                const hasText = !!ri?.text.trim();
                const hasImg = !!ri?.imageUrl;
                return (
                  <div key={rt.domainId} className="rounded-lg p-3 flex flex-col gap-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[13px]" style={{ color: C.ink, fontWeight: 600 }}>{rt.label}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{rt.covered}/{rt.total}</span>
                      {hasImg ? <span className="text-[10px]" style={{ color: C.teal }}>imagen ✓</span> : hasText ? <span className="text-[10px]" style={{ color: C.gold }}>fallback texto</span> : <span className="text-[10px]" style={{ color: `${C.ink}55` }}>sin contenido</span>}
                      <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => genDivider(rt.domainId, hasImg)} disabled={!!secBusy} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.violet}55`, color: C.violet, fontFamily: D, fontWeight: 600 }}>
                          {secBusy === `div-${rt.domainId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} {hasImg ? "Regenerar divisor" : "Generar divisor"}
                        </button>
                        <button onClick={() => genRouteIntroText(rt.domainId)} disabled={!!secBusy || rt.covered === 0} title={rt.covered === 0 ? "La ruta no tiene láminas groundeadas todavía" : ""} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5 disabled:opacity-50" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                          {secBusy === `ri-gen-${rt.domainId}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} {hasText ? "Síntesis" : "Generar síntesis"}
                        </button>
                        {hasText && <button onClick={() => navigator.clipboard?.writeText(ri!.text)} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}>Copiar</button>}
                      </div>
                    </div>
                    {hasText && <div className="rounded-md px-3 py-2 text-[11px] whitespace-pre-wrap" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft, fontFamily: "ui-monospace, monospace", lineHeight: 1.5, maxHeight: 160, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: ri!.text }} />}
                    <div className="flex items-center gap-3">
                      {hasImg && (
                        <button onClick={() => setBigImg(bustUrl(ri!.imageUrl!))} title="Ver grande" className="shrink-0 relative group">
                          <img src={bustUrl(ri!.imageUrl!)} alt={`Intro ${rt.label}`} className="w-20 rounded block" style={{ border: `1px solid ${C.ink}1f`, background: "#fff", aspectRatio: "3/4", objectFit: "cover" }} onError={e => { (e.currentTarget.style.opacity = "0.25"); }} />
                          <span className="absolute inset-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition" style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}><Maximize2 className="w-4 h-4" /></span>
                        </button>
                      )}
                      {upBtn(hasImg ? "Cambiar página formateada" : "Subir página formateada", f => onRouteIntroUpload(rt.domainId, f), `ri-${rt.domainId}`)}
                    </div>
                  </div>
                );
              })}
              {routes.length === 0 && <p className="text-[12px]" style={{ color: C.inkSoft }}>Cargando rutas…</p>}
            </div>
          </EdPanel>

          {/* Casos de examen */}
          <EdPanel title="Casos de examen" desc="~30 casos tipo examen distribuidos por peso de dominio · hoja de respuestas al final · después de Conclusiones">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.scenarioReview, () => setSection("scenarioReview", !cfg.sections.scenarioReview))} Incluir la sección</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={genScenarioReview} disabled={!!secBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                {secBusy === "scenarioReview" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {cfg.blocks.scenarioReview.trim() ? "Regenerar casos" : "Generar casos (~30 por peso de dominio)"}
              </button>
              <span className="text-[10px]" style={{ color: `${C.ink}55` }}>razonamiento (no recall) · respuestas al final</span>
            </div>
            <textarea value={cfg.blocks.scenarioReview} onChange={e => setBlock("scenarioReview", e.target.value)} rows={6} spellCheck={false} placeholder="Vacío = generalo arriba. ~30 casos con código/YAML/KQL + 4 opciones, distribuidos por peso de dominio, con hoja de respuestas al final." className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />
          </EdPanel>

          {/* Glosario */}
          <EdPanel title="Glosario" desc="diccionario auto del corpus · al final, antes de la contraportada">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.glossary, () => setSection("glossary", !cfg.sections.glossary))} Incluir el glosario</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={genGlossary} disabled={!!secBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                {secBusy === "glossary" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} {cfg.blocks.glossary.trim() ? "Regenerar glosario" : "Generar glosario (~85 términos A→Z)"}
              </button>
              <span className="text-[10px]" style={{ color: `${C.ink}55` }}>se guarda con “Guardar cambios”</span>
            </div>
            <textarea value={cfg.blocks.glossary} onChange={e => setBlock("glossary", e.target.value)} rows={6} spellCheck={false} placeholder="Vacío = generalo arriba. Extrae términos clave del corpus groundeado y los define a nivel examen." className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />
          </EdPanel>

          {/* Colección */}
          <EdPanel title="Colección de la certificación" desc="cross-sell: portadas + enlaces de compra">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.collection, () => setSection("collection", !cfg.sections.collection))} Incluir la sección</label>
            <div className="flex items-center gap-2">
              <input value={cfg.collection.note} onChange={e => setCfg(c => c ? { ...c, collection: { ...c.collection, note: e.target.value } } : c)} placeholder="Texto de la sección" className="flex-1 h-9 px-3 rounded-lg text-[13px] outline-none" style={inpStyle} />
              {resetBtn("collectionNote")}
              {aiBtn("collectionNote", "IA")}
            </div>
            {cfg.collection.items.map(it => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg p-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}12` }}>
                <img src={it.coverUrl} alt="" className="w-10 h-14 rounded object-cover shrink-0" style={{ border: `1px solid ${C.ink}1f` }} />
                <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                  <input value={it.title} onChange={e => setCfg(c => c ? { ...c, collection: { ...c.collection, items: c.collection.items.map(x => x.id === it.id ? { ...x, title: e.target.value } : x) } } : c)} placeholder="Título" className="h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} />
                  <input value={it.buyUrl} onChange={e => setCfg(c => c ? { ...c, collection: { ...c.collection, items: c.collection.items.map(x => x.id === it.id ? { ...x, buyUrl: e.target.value } : x) } } : c)} placeholder="https://… enlace de compra" className="h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} />
                </div>
                <button onClick={() => setCfg(c => c ? { ...c, collection: { ...c.collection, items: c.collection.items.filter(x => x.id !== it.id) } } : c)} className="w-8 h-8 rounded-lg inline-flex items-center justify-center shrink-0" style={{ color: "#fca5a5" }}><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            {upBtn("Agregar libro (portada)", onAddColl, "coll")}
          </EdPanel>

          {/* Mapeo de dominios */}
          <EdPanel title="Mapeo de dominios" desc="tabla skill · dominio · dónde hacer foco">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.domainMap, () => setSection("domainMap", !cfg.sections.domainMap))} Incluir la sección</label>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5 text-[10px] uppercase tracking-[0.08em] px-1" style={{ color: `${C.ink}55` }}><span className="flex-1">Sección / Skill</span><span className="w-28">Dominio</span><span className="flex-1">Notas · foco</span><span className="w-8" /></div>
              {cfg.domainMap.rows.map((r, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <input value={r.skill} onChange={e => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, rows: c.domainMap.rows.map((x, j) => j === i ? { ...x, skill: e.target.value } : x) } } : c)} className="flex-1 h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} />
                  <input value={r.domain} onChange={e => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, rows: c.domainMap.rows.map((x, j) => j === i ? { ...x, domain: e.target.value } : x) } } : c)} className="w-28 h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} />
                  <input value={r.notes} onChange={e => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, rows: c.domainMap.rows.map((x, j) => j === i ? { ...x, notes: e.target.value } : x) } } : c)} className="flex-1 h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} />
                  <button onClick={() => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, rows: c.domainMap.rows.filter((_, j) => j !== i) } } : c)} className="w-8 h-8 rounded-md inline-flex items-center justify-center shrink-0" style={{ color: "#fca5a5" }}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, rows: [...c.domainMap.rows, { skill: "", domain: "", notes: "" }] } } : c)} className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: C.bright }}><Plus className="w-3.5 h-3.5" /> Agregar fila</button>
              <button onClick={genDomainMap} disabled={!!secBusy} title="Genera una fila por RUTA del atlas (las 9), desde el outline + lo groundeado" className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
                {secBusy === "domainMap" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Generar plan (9 rutas) con IA
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-[12px]" style={{ color: C.inkSoft }}>Explicación / contexto debajo de la tabla</span>
              {aiBtn("domainNote", "IA")}
            </div>
            <textarea value={cfg.domainMap.note} onChange={e => setCfg(c => c ? { ...c, domainMap: { ...c.domainMap, note: e.target.value } } : c)} rows={3} placeholder="Explicación / contexto debajo de la tabla" className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-y" style={inpStyle} />
          </EdPanel>

          {/* Bibliografía (automática del grounding) */}
          <EdPanel title="Bibliografía" desc="fuentes citadas · automática del grounding">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.bibliography, () => setSection("bibliography", !cfg.sections.bibliography))} Incluir la sección</label>
            <p className="text-[11px]" style={{ color: `${C.ink}77` }}>Se arma automáticamente con las fuentes citadas por las láminas aprobadas (grounding), en lista alfabética. No requiere edición.</p>
          </EdPanel>

          {/* Contraportada */}
          <EdPanel title="Contraportada" desc="autogenerada o template subido">
            <label className="flex items-center gap-2.5 text-[12px]" style={{ color: C.inkSoft }}>{tog(cfg.sections.backCover, () => setSection("backCover", !cfg.sections.backCover))} Incluir contraportada</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setCfg(c => c ? { ...c, backCover: { ...c.backCover, mode: "auto" } } : c)} className="px-3.5 h-9 rounded-full text-[13px]" style={cfg.backCover.mode === "auto" ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>Autogenerada</button>
              <button onClick={() => setCfg(c => c ? { ...c, backCover: { ...c.backCover, mode: "template" } } : c)} className="px-3.5 h-9 rounded-full text-[13px]" style={cfg.backCover.mode === "template" ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>Template (subir)</button>
            </div>
            {cfg.backCover.mode === "auto" && <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2"><span className="text-[12px]" style={{ color: C.inkSoft }}>Texto de la contraportada (HTML)</span><span className="flex items-center gap-1.5">{resetBtn("backcover")}{aiBtn("backcover")}</span></div>
              <textarea value={cfg.backCover.html} onChange={e => setCfg(c => c ? { ...c, backCover: { ...c.backCover, html: e.target.value } } : c)} rows={4} spellCheck={false} placeholder="Vacío = blurb por defecto" className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />
              <div className="flex gap-2 mt-1">
                <label className="flex-1 flex flex-col gap-1"><span className="text-[11px]" style={{ color: `${C.ink}77` }}>ISBN (código de barras)</span><input value={cfg.backCover.isbn} onChange={e => setCfg(c => c ? { ...c, backCover: { ...c.backCover, isbn: e.target.value } } : c)} className="h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} /></label>
                <label className="w-32 flex flex-col gap-1"><span className="text-[11px]" style={{ color: `${C.ink}77` }}>Precio (opcional)</span><input value={cfg.backCover.price} onChange={e => setCfg(c => c ? { ...c, backCover: { ...c.backCover, price: e.target.value } } : c)} placeholder="USD 19" className="h-8 px-2.5 rounded-md text-[12px] outline-none" style={inpStyle} /></label>
              </div>
              <p className="text-[10px]" style={{ color: `${C.ink}55` }}>El código de barras se dibuja del ISBN (decorativo; para imprenta real, reemplaza por el EAN-13 oficial).</p>
            </div>}
            {cfg.backCover.mode === "template" && <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {cfg.backCover.imageUrl && <img src={bustUrl(cfg.backCover.imageUrl)} alt="contra" onClick={() => setBigImg(bustUrl(cfg.backCover.imageUrl!))} title="Ver grande" className="w-20 rounded-lg cursor-pointer" style={{ border: `1px solid ${C.ink}1f` }} />}
                {upBtn(cfg.backCover.imageUrl ? "Cambiar template" : "Subir template", onBack, "back")}
              </div>
              {cfg.backCover.imageUrl && <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px]" style={{ color: C.inkSoft }}>Texto de venta (genera y cópialo a tu herramienta)</span>
                  <div className="flex items-center gap-2">{aiBtn("backcover")}<button onClick={() => navigator.clipboard?.writeText(cfg.backCover.html)} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11px] hover:bg-white/5" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}>Copiar</button></div>
                </div>
                <textarea value={cfg.backCover.html} onChange={e => setCfg(c => c ? { ...c, backCover: { ...c.backCover, html: e.target.value } } : c)} rows={5} spellCheck={false} placeholder="Genera el texto aquí y pégalo en tu diseño de contraportada" className="w-full px-3 py-2 rounded-lg text-[11.5px] outline-none resize-y" style={{ ...inpStyle, fontFamily: "ui-monospace, monospace", lineHeight: 1.5 }} />
                <p className="text-[11px]" style={{ color: `${C.ink}55` }}>Tu template se imprime <strong>tal cual</strong> en el libro. Este texto NO se superpone — es solo para copiar a tu herramienta de diseño.</p>
              </div>}
            </div>}
          </EdPanel>
        </>
      )}

      {/* estructura */}
      {outline && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-4" style={{ color: C.violet }}>Estructura del libro</p>
          <div className="flex flex-col">
            {outline.sections.map((s, i) => {
              const isLam = s.key === "laminas";
              return (
                <div key={s.key} className="flex items-center gap-3 py-2.5" style={{ borderTop: i ? `1px solid ${C.ink}0c` : "none" }}>
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-mono shrink-0" style={{ backgroundColor: isLam ? `${C.violet}1f` : C.bg, border: `1px solid ${isLam ? C.violet : `${C.ink}1f`}`, color: isLam ? C.bright : C.inkSoft }}>{i + 1}</span>
                  <span className="text-[13px]" style={{ color: C.ink, fontWeight: isLam ? 700 : 600, fontFamily: D }}>{s.label}</span>
                  <span className="text-[12px] ml-auto text-right" style={{ color: `${C.ink}66` }}>{s.detail}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* índice (TOC preview) */}
      {byDomain.length > 0 && (
        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: C.violet }}>Índice · láminas aprobadas</p>
          <div className="flex flex-col gap-3">
            {byDomain.map(d => (
              <div key={d.domain}>
                <p className="text-[11px] uppercase tracking-[0.05em] mb-1.5" style={{ color: C.violet, fontWeight: 700 }}>{d.domain || "—"}</p>
                <div className="flex flex-col gap-1">
                  {d.rows.map(r => (
                    <div key={r.pageNumber} className="flex items-baseline gap-2 text-[12.5px]">
                      <span style={{ color: C.ink }}>{r.title}</span>
                      <span className="flex-1 border-b border-dotted self-center" style={{ borderColor: `${C.ink}1f` }} />
                      <span className="font-mono" style={{ color: `${C.ink}66` }}>{r.pageNumber}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Modal de vista grande de un asset (portada · contraportada · intro de ruta) */}
      {bigImg && (
        <div onClick={() => setBigImg(null)} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(8,12,20,0.86)" }}>
          <img src={bigImg} alt="vista grande" onClick={e => e.stopPropagation()} className="max-w-full max-h-full rounded-lg block" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)", background: "#fff" }} />
          <button onClick={() => setBigImg(null)} title="Cerrar (Esc)" className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)" }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── PREVIEW del libro: Hojas (PDF embebido, sin descargar) + Complementarias (PNG) ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-[110] flex flex-col" style={{ background: "rgba(6,8,14,0.94)", backdropFilter: "blur(3px)" }} onClick={() => setPreviewOpen(false)}>
          <div className="flex items-center gap-3 px-5 h-14 shrink-0" onClick={e => e.stopPropagation()}>
            <span className="text-[14px] inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}><BookOpen className="w-4 h-4" style={{ color: C.violet }} /> Preview del libro</span>
            <div className="flex items-center gap-1.5 ml-2">
              <button onClick={() => setPtab("hojas")} className="h-8 px-3 rounded-full text-[12px]" style={ptab === "hojas" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : { border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Hojas (libro completo)</button>
              <button onClick={() => setPtab("extras")} className="h-8 px-3 rounded-full text-[12px]" style={ptab === "extras" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : { border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Páginas complementarias</button>
            </div>
            {pdfUrl && ptab === "hojas" && <a href={bustUrl(pdfUrl)} target="_blank" rel="noreferrer" className="text-[12px] inline-flex items-center gap-1.5" style={{ color: C.bright }}><ExternalLink className="w-3.5 h-3.5" /> Abrir aparte</a>}
            <button onClick={() => setPreviewOpen(false)} aria-label="Cerrar" className="ml-auto w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 min-h-0 px-4 pb-4" onClick={e => e.stopPropagation()}>
            {ptab === "hojas" ? (
              pdfUrl
                ? <iframe title="Libro (PDF)" src={bustUrl(pdfUrl)} className="w-full h-full rounded-lg" style={{ background: "#fff", border: `1px solid ${C.ink}1f` }} />
                : <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center" style={{ color: C.inkSoft }}>
                    <BookOpen className="w-8 h-8" style={{ color: `${C.ink}33` }} />
                    <p className="text-[14px]">Todavía no ensamblaste el libro.</p>
                    <button onClick={() => { setPreviewOpen(false); assemble(); }} disabled={running} className="h-10 px-5 rounded-full text-sm inline-flex items-center gap-2 text-white disabled:opacity-50" style={{ backgroundColor: C.violetBtn, fontFamily: D, fontWeight: 600 }}>{running ? <><Loader2 className="w-4 h-4 animate-spin" /> Ensamblando…</> : <><BookOpen className="w-4 h-4" /> Ensamblar y previsualizar</>}</button>
                  </div>
            ) : (
              comps.length
                ? <div className="w-full h-full overflow-y-auto"><div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                    {comps.map(it => (
                      <button key={it.url} onClick={() => setBigImg(bustUrl(it.url))} className="relative rounded-lg overflow-hidden text-left" style={{ aspectRatio: "2 / 3", background: "#0b0b12", border: `1px solid ${C.ink}1f` }} title={it.label}>
                        <img src={bustUrl(it.url)} alt={it.label} className="w-full h-full object-contain" />
                        <span className="absolute bottom-0 inset-x-0 text-[9px] px-1 py-0.5 truncate" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>{it.label}</span>
                      </button>
                    ))}
                  </div></div>
                : <div className="w-full h-full flex items-center justify-center text-[13px]" style={{ color: C.inkSoft }}>Sin páginas complementarias generadas todavía.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Cuadrilla IA: roster de agentes por dominio + métricas reales del ledger + total ── */
const AGENT_ICON: Record<string, typeof FileText> = {
  search: Search, pen: PenTool, "shield-check": ShieldCheck, "badge-check": BadgeCheck, scan: ScanSearch, gauge: Gauge,
  layout: LayoutTemplate, image: ImageIcon, "book-open": BookOpen, route: Route, list: List, map: MapPin,
  edit: Edit3, eye: Eye, palette: Palette, clipboard: ClipboardCheck,
  "book-marked": BookMarked, type: TypeIcon, "shield-alert": ShieldAlert, "graduation-cap": GraduationCap, "file-search": FileSearch, target: Target, "alert-triangle": AlertTriangle, smile: Smile,
};
/* Etapa de QA de cada agente que juzga el MASTER BOOK: "gate" = evalúa/gatea el contenido MIENTRAS se genera;
   "output" = juzga la ruta/libro YA ENSAMBLADO (panel por ruta + editor jefe). Se muestra como badge en la tarjeta. */
const QA_STAGE: Record<string, "gate" | "output"> = {
  verificador: "gate", supervisor: "gate", auditor: "gate", psicometrista: "gate",
  "production-editor": "output", typography: "output", "sme-factcheck": "output", "instructional-design": "output",
  "grounding-fidelity": "output", "exam-alignment": "output", "reader-engagement": "output", editorjefe: "output",
};
const QA_BADGE = { gate: { label: "gate", color: "#3b82f6" }, output: { label: "QA salida", color: "#2dd4bf" } } as const;
function agentTimeAgo(ts: string | null): string {
  if (!ts) return "nunca";
  const diff = Date.now() - Date.parse(ts);
  if (Number.isNaN(diff)) return "—";
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months === 1 ? "" : "es"}`;
}
/* ══ EL PROCESO (DAG interactivo) + RUNTIME de la cuadrilla ═══════════════════════════════
   DAG = diagrama acíclico dirigido del pipeline REAL trazado del motor. Runtime = duración real
   por agente (store `_agent-runtime.json`), agregada por día/semana/mes/trimestre + waterfall. */
const DOMAIN_COLOR: Record<string, string> = { conocimiento: "#3b82f6", creacion: "#8b5cf6", calidad: "#2dd4bf", sistema: "#94a3b8" };

type DagKind = "conocimiento" | "creacion" | "calidad" | "sistema";
interface DagNode { id: string; col: number; row: number; label: string; sub?: string; agentId?: string; kind: DagKind; desc: string }
interface DagEdge { from: string; to: string; gate?: "hard" | "soft" }

const DAG_NODES: DagNode[] = [
  // Col 0 — GROUNDING (Conocimiento), cadena en serie por módulo
  { id: "buscador", col: 0, row: 0, label: "Buscador", sub: "fuentes", agentId: "buscador", kind: "conocimiento", desc: "Asienta el corpus del dominio: descubre y valida las fuentes oficiales antes de escribir." },
  { id: "psicometrista", col: 0, row: 1, label: "Psicometrista", agentId: "psicometrista", kind: "conocimiento", desc: "Modela cómo el examen evalúa el módulo (verbos medidos, arquetipos de pregunta)." },
  { id: "autor", col: 0, row: 2, label: "Autor", agentId: "autor", kind: "conocimiento", desc: "Teje el relato del capítulo anclado a las fuentes, guiado por el perfil psicométrico." },
  { id: "verificador", col: 0, row: 3, label: "Verificador", agentId: "verificador", kind: "conocimiento", desc: "Extrae las afirmaciones de la PROSA y exige cita real: respaldada / sin respaldo / contradicha." },
  { id: "enriquecedor", col: 0, row: 4, label: "Enriquecedor", sub: "Autor", agentId: "autor", kind: "conocimiento", desc: "Agrega código/tablas/práctica y los re-verifica. Si falla, cae a la prosa sin enriquecer." },
  { id: "supervisor", col: 0, row: 5, label: "Supervisor", agentId: "supervisor", kind: "conocimiento", desc: "Cobertura y pertinencia + alineación psicométrica. Surfacea, no bloquea." },
  { id: "persist", col: 0, row: 6, label: "Persistir", kind: "sistema", desc: "Guarda el capítulo (seed + procedencia). Paso determinista." },
  // Col 1 — CREACIÓN / Diseño
  { id: "ilustrador", col: 1, row: 2, label: "Ilustrador", sub: "figuras", agentId: "ilustrador", kind: "creacion", desc: "Dibuja las figuras del capítulo (diagrama sobrio de un concepto)." },
  { id: "disenador", col: 1, row: 3, label: "Diseñador", sub: "portadilla", agentId: "disenador", kind: "creacion", desc: "Portadilla/divisor del capítulo, anclado al arte de la tapa." },
  { id: "capstone", col: 1, row: 4, label: "Cap. integrador", sub: "Autor · ruta", agentId: "autor", kind: "creacion", desc: "Teje todos los módulos groundeados de la ruta en un capítulo integrador de cierre (join de la ruta)." },
  { id: "partopener", col: 1, row: 5, label: "Hojas de ruta", sub: "Diseñador", agentId: "disenador", kind: "creacion", desc: "Portal de apertura de cada ruta (abre-parte)." },
  { id: "glosario", col: 1, row: 6, label: "Glosario", agentId: "glosario", kind: "creacion", desc: "Extrae y define los términos clave del libro." },
  // Col 2 — ENSAMBLADO (determinista)
  { id: "ensamblado", col: 2, row: 4, label: "Ensamblado", kind: "sistema", desc: "Arma el PDF de la ruta (capítulos integradores al final). Paso determinista, sin agente." },
  // Col 3 — QA PANEL POR RUTA (7 expertos, en serie)
  { id: "production-editor", col: 3, row: 0, label: "Editor prod.", agentId: "production-editor", kind: "calidad", desc: "Juzga la composición impresa de las páginas (visión)." },
  { id: "typography", col: 3, row: 1, label: "Tipógrafo", agentId: "typography", kind: "calidad", desc: "Calidad tipográfica de la página (visión)." },
  { id: "reader-engagement", col: 3, row: 2, label: "Lector", agentId: "reader-engagement", kind: "calidad", desc: "Riesgo de abandono del lector (texto)." },
  { id: "instructional-design", col: 3, row: 3, label: "Dis. instr.", agentId: "instructional-design", kind: "calidad", desc: "Diseño instruccional (texto, mediana de 3 corridas)." },
  { id: "exam-alignment", col: 3, row: 4, label: "Alin. examen", agentId: "exam-alignment", kind: "calidad", desc: "Alineación con los skills oficiales del examen (texto, mediana de 3)." },
  { id: "sme-factcheck", col: 3, row: 5, label: "Linter SME", sub: "sin LLM", agentId: "sme-factcheck", kind: "calidad", desc: "Chequeo técnico determinista (seguridad/CLI). Sin LLM → ~0 ms." },
  { id: "grounding-fidelity", col: 3, row: 6, label: "Linter fidelidad", sub: "sin LLM", agentId: "grounding-fidelity", kind: "calidad", desc: "Chequeo determinista de fidelidad al corpus. Sin LLM → ~0 ms." },
  // Col 4 — VEREDICTO (join)
  { id: "veredicto", col: 4, row: 3, label: "Veredicto", kind: "sistema", desc: "Agrega los 7 expertos → ship / revise / block. Paso determinista." },
];
const DAG_EDGES: DagEdge[] = [
  { from: "buscador", to: "psicometrista" }, { from: "psicometrista", to: "autor" }, { from: "autor", to: "verificador" },
  { from: "verificador", to: "enriquecedor", gate: "hard" }, { from: "enriquecedor", to: "supervisor", gate: "soft" }, { from: "supervisor", to: "persist" },
  { from: "persist", to: "ilustrador" }, { from: "persist", to: "disenador" }, { from: "persist", to: "capstone" },
  { from: "ilustrador", to: "ensamblado" }, { from: "disenador", to: "ensamblado" }, { from: "capstone", to: "ensamblado" }, { from: "partopener", to: "ensamblado" }, { from: "glosario", to: "ensamblado" },
  { from: "ensamblado", to: "production-editor" }, { from: "ensamblado", to: "typography" }, { from: "ensamblado", to: "reader-engagement" }, { from: "ensamblado", to: "instructional-design" }, { from: "ensamblado", to: "exam-alignment" }, { from: "ensamblado", to: "sme-factcheck" }, { from: "ensamblado", to: "grounding-fidelity" },
  { from: "production-editor", to: "veredicto" }, { from: "typography", to: "veredicto" }, { from: "reader-engagement", to: "veredicto" }, { from: "instructional-design", to: "veredicto" }, { from: "exam-alignment", to: "veredicto" }, { from: "sme-factcheck", to: "veredicto" }, { from: "grounding-fidelity", to: "veredicto" },
];
const DAG_NODEMAP: Record<string, DagNode> = Object.fromEntries(DAG_NODES.map((n) => [n.id, n]));
const DAG_COLX = [20, 255, 490, 700, 945];
const DAG_COLW = [150, 155, 135, 175, 140];
const DAG_ROWH = 64, DAG_NH = 46, DAG_TOP = 28;
const dagX = (n: DagNode) => DAG_COLX[n.col]!;
const dagY = (n: DagNode) => DAG_TOP + n.row * DAG_ROWH;
const dagW = (n: DagNode) => DAG_COLW[n.col]!;
function dagEdgePath(fromId: string, toId: string): string {
  const a = DAG_NODEMAP[fromId], b = DAG_NODEMAP[toId];
  if (!a || !b) return "";
  if (a.col === b.col) { const x1 = dagX(a) + dagW(a) / 2, y1 = dagY(a) + DAG_NH, x2 = dagX(b) + dagW(b) / 2, y2 = dagY(b); return `M${x1},${y1} L${x2},${y2}`; }
  const x1 = dagX(a) + dagW(a), y1 = dagY(a) + DAG_NH / 2, x2 = dagX(b), y2 = dagY(b) + DAG_NH / 2, mx = (x1 + x2) / 2;
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`;
}
function dagEdgeMid(fromId: string, toId: string): { x: number; y: number } {
  const a = DAG_NODEMAP[fromId], b = DAG_NODEMAP[toId];
  if (!a || !b) return { x: 0, y: 0 };
  if (a.col === b.col) return { x: dagX(a) + dagW(a) / 2, y: (dagY(a) + DAG_NH + dagY(b)) / 2 };
  return { x: (dagX(a) + dagW(a) + dagX(b)) / 2, y: (dagY(a) + dagY(b) + DAG_NH) / 2 };
}
const DAG_COLCAPS = [{ x: 20, label: "GROUNDING · SERIE" }, { x: 255, label: "CREACIÓN" }, { x: 490, label: "ENSAMBLADO" }, { x: 700, label: "QA · PANEL (7)" }, { x: 945, label: "VEREDICTO" }];
const DAG_HUMAN_GATES = [
  { id: "aprobar", label: "aprobar", x: (DAG_COLX[0]! + DAG_COLW[0]! + DAG_COLX[1]!) / 2, y: DAG_TOP + 6 * DAG_ROWH + DAG_NH / 2 },
  { id: "bloquear", label: "bloquear", x: (DAG_COLX[1]! + DAG_COLW[1]! + DAG_COLX[2]!) / 2, y: DAG_TOP + 5 * DAG_ROWH + DAG_NH / 2 },
  { id: "publicar", label: "publicar", x: DAG_COLX[4]! + DAG_COLW[4]! + 40, y: DAG_TOP + 3 * DAG_ROWH + DAG_NH / 2 },
];

function ProcesoDagView({ agents, isMaster }: { agents: EngineAgentStat[]; isMaster: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [rt, setRt] = useState<EngineAgentRuntime | null>(null);
  useEffect(() => { let a = true; fetchAgentRuntime("month").then((d) => { if (a) setRt(d); }).catch(() => { if (a) setRt(null); }); return () => { a = false; }; }, []);
  const agentById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);
  const rtMap = useMemo(() => { const m: Record<string, EngineRuntimeAgentStat> = {}; for (const s of rt?.agents ?? []) m[s.id] = s; return m; }, [rt]);
  const roleOf = (id: string) => { const a = agentById[id]; return a ? ((isMaster && a.masterRole) ? a.masterRole : a.role) : ""; };

  const infoNode = hovered ? DAG_NODEMAP[hovered] : null;
  const selAgent = selected ? agentById[selected] : undefined;
  const selStat = selected ? rtMap[selected] : undefined;

  return (
    <Section label="El proceso · cómo operan los agentes" accent={C.violet} help={{ title: "El proceso (DAG)", body: [
      "Diagrama acíclico dirigido del pipeline real. El contenido se genera EN SERIE por módulo (columna izquierda), pasa por una compuerta DURA (si el grounding bloquea, no se persiste) y una BLANDA (si el enriquecido falla, cae a la prosa). Luego se diseña, se ensambla, y la ruta se somete al panel de 7 expertos (FAN-OUT) que converge en un veredicto.",
      "Hacé clic en un agente para fijar su cadena y ver su runtime real; pasá el mouse para ver su rol.",
      "Los diamantes dorados son compuertas HUMANAS (aprobar · bloquear · publicar): nada se publica sin visto bueno.",
    ] }}>
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="overflow-x-auto rounded-xl flex-1 min-w-0" style={{ border: `1px solid ${C.ink}14`, backgroundColor: C.bg }}>
          <svg viewBox="0 0 1180 492" style={{ width: "100%", minWidth: 940, display: "block" }} role="img" aria-label="Diagrama del proceso de los agentes">
            <defs>
              <marker id="dagArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={`${C.ink}55`} /></marker>
              <marker id="dagArrowOn" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill={C.violet} /></marker>
            </defs>
            {DAG_COLCAPS.map((c, i) => (<text key={`c${i}`} x={c.x} y={14} style={{ fill: `${C.ink}55`, fontSize: 8.5, fontFamily: "monospace", letterSpacing: 0.8 }}>{c.label}</text>))}
            {DAG_EDGES.map((e, i) => {
              const on = selected !== null && (DAG_NODEMAP[e.from]?.agentId === selected || DAG_NODEMAP[e.to]?.agentId === selected);
              const dim = selected !== null && !on;
              return <path key={`e${i}`} d={dagEdgePath(e.from, e.to)} fill="none" stroke={on ? C.violet : `${C.ink}3a`} strokeWidth={on ? 2 : 1.2} markerEnd={on ? "url(#dagArrowOn)" : "url(#dagArrow)"} style={{ opacity: dim ? 0.15 : 1, transition: "opacity .2s" }} />;
            })}
            {DAG_EDGES.filter((e) => e.gate).map((e, i) => {
              const p = dagEdgeMid(e.from, e.to); const col = e.gate === "hard" ? "#f87171" : "#fbbf24";
              return (<g key={`gt${i}`}><rect x={p.x - 7} y={p.y - 7} width={14} height={14} transform={`rotate(45 ${p.x} ${p.y})`} fill={C.bg} stroke={col} strokeWidth={1.6} /><title>{e.gate === "hard" ? "Compuerta DURA: si el grounding bloquea, no se persiste (aborta)" : "Compuerta BLANDA: si el enriquecido falla, cae a la prosa del autor"}</title></g>);
            })}
            {DAG_NODES.map((n) => {
              const col = DOMAIN_COLOR[n.kind]!; const dim = selected !== null && n.agentId !== selected; const sel = !!n.agentId && n.agentId === selected;
              const Ic = n.agentId ? (AGENT_ICON[agentById[n.agentId]?.iconKey ?? ""] ?? Sparkles) : Layers;
              return (
                <g key={n.id} style={{ cursor: n.agentId ? "pointer" : "default", opacity: dim ? 0.3 : 1, transition: "opacity .2s" }}
                  onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered((h) => (h === n.id ? null : h))}
                  onClick={() => setSelected(n.agentId ? (selected === n.agentId ? null : n.agentId) : null)}>
                  <rect x={dagX(n)} y={dagY(n)} width={dagW(n)} height={DAG_NH} rx={9} fill={`${col}14`} stroke={sel ? col : `${col}55`} strokeWidth={sel ? 2.4 : 1.2} />
                  <foreignObject x={dagX(n) + 8} y={dagY(n) + 10} width={26} height={26}><div style={{ width: 26, height: 26, borderRadius: 7, background: `${col}22`, display: "flex", alignItems: "center", justifyContent: "center" }}><Ic style={{ width: 15, height: 15, color: col }} /></div></foreignObject>
                  <text x={dagX(n) + 42} y={dagY(n) + (n.sub ? 20 : 28)} style={{ fill: C.ink, fontSize: 12, fontWeight: 600 }}>{n.label}</text>
                  {n.sub && <text x={dagX(n) + 42} y={dagY(n) + 33} style={{ fill: `${C.ink}77`, fontSize: 9.5 }}>{n.sub}</text>}
                </g>
              );
            })}
            {DAG_HUMAN_GATES.map((g) => (
              <g key={g.id}><rect x={g.x - 9} y={g.y - 9} width={18} height={18} transform={`rotate(45 ${g.x} ${g.y})`} fill="#fbbf2422" stroke="#fbbf24" strokeWidth={1.6} /><text x={g.x} y={g.y + 23} textAnchor="middle" style={{ fill: "#fbbf24", fontSize: 8.5, fontFamily: "monospace" }}>{g.label}</text><title>Compuerta HUMANA: {g.label} (gate del pipeline)</title></g>
            ))}
          </svg>
        </div>
        <div className="lg:w-[264px] shrink-0 rounded-xl p-3.5 flex flex-col gap-2" style={{ border: `1px solid ${C.ink}14`, backgroundColor: C.card }}>
          {selected && selAgent ? (
            <>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${DOMAIN_COLOR[selAgent.domain]}1a` }}>{(() => { const Ic = AGENT_ICON[selAgent.iconKey] ?? Sparkles; return <Ic className="w-4 h-4" style={{ color: DOMAIN_COLOR[selAgent.domain] }} />; })()}</span>
                <div className="min-w-0"><p className="text-[13px] truncate" style={{ fontWeight: 700, color: C.ink }}>{selAgent.name}</p><p className="font-mono text-[9px] uppercase tracking-wide" style={{ color: `${C.ink}66` }}>{selAgent.model}</p></div>
              </div>
              <p className="text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>{roleOf(selAgent.id)}</p>
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                <MiniStat label="Corridas (mes)" value={selStat ? String(selStat.runs) : "—"} />
                <MiniStat label="p95" value={selStat ? fmtDur(selStat.p95) : "—"} />
                <MiniStat label="Promedio" value={selStat ? fmtDur(selStat.avgMs) : "—"} />
                <MiniStat label="Última" value={selStat?.lastRun ? agentTimeAgo(selStat.lastRun) : "—"} />
              </div>
              <p className="text-[10.5px] mt-1" style={{ color: `${C.ink}66` }}>Datos del mes. Mirá <strong style={{ color: C.violet }}>Runtime</strong> para el detalle por período y el waterfall de la última corrida.</p>
              <button onClick={() => setSelected(null)} className="text-[11px] mt-1 self-start px-2.5 h-7 rounded-full transition-colors hover:bg-white/5" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>Quitar selección</button>
            </>
          ) : infoNode ? (
            <>
              <p className="text-[13px]" style={{ fontWeight: 700, color: C.ink }}>{infoNode.label}{infoNode.sub ? ` · ${infoNode.sub}` : ""}</p>
              <p className="text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>{infoNode.desc}</p>
              {infoNode.agentId && <p className="text-[10.5px]" style={{ color: `${C.ink}66` }}>Hacé clic para fijarlo y ver su runtime real.</p>}
            </>
          ) : (
            <>
              <p className="text-[12px]" style={{ color: C.inkSoft }}>Pasá el mouse por un agente para ver su rol; hacé clic para fijar su cadena y su runtime real.</p>
              <div className="flex flex-col gap-1.5 mt-1">
                {(["conocimiento", "creacion", "calidad"] as const).map((k) => (<span key={k} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.inkSoft }}><span className="w-2.5 h-2.5 rounded-sm" style={{ background: DOMAIN_COLOR[k] }} />{k === "conocimiento" ? "Conocimiento" : k === "creacion" ? "Creación" : "Calidad"}</span>))}
                <span className="inline-flex items-center gap-1.5 text-[11px] mt-1" style={{ color: C.inkSoft }}><span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: "#f87171" }} /> Compuerta dura (bloquea)</span>
                <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.inkSoft }}><span className="inline-block w-2.5 h-2.5 rotate-45" style={{ background: "#fbbf24" }} /> Compuerta blanda / humana</span>
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}

const RT_ORDER = ["buscador", "psicometrista", "autor", "verificador", "supervisor", "ilustrador", "disenador", "glosario", "production-editor", "typography", "reader-engagement", "instructional-design", "exam-alignment", "sme-factcheck", "grounding-fidelity"];
const rtRank = (id: string) => { const i = RT_ORDER.indexOf(id); return i === -1 ? 999 : i; };

function RuntimeView() {
  const [period, setPeriod] = useState<EngineRuntimePeriod>("week");
  const [metric, setMetric] = useState<"avg" | "p95">("avg");
  const [rt, setRt] = useState<EngineAgentRuntime | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { let a = true; setRt(null); setErr(""); fetchAgentRuntime(period).then((d) => { if (a) setRt(d); }).catch((e) => { if (a) setErr(String((e as Error).message || e)); }); return () => { a = false; }; }, [period]);

  const periods: [EngineRuntimePeriod, string][] = [["day", "Día"], ["week", "Semana"], ["month", "Mes"], ["quarter", "Trimestre"]];
  const dcol = (d: string | null) => (d && rt?.domains[d as EngineAgentDomain]?.color) || C.violet;
  const agentsSorted = useMemo(() => [...(rt?.agents ?? [])].sort((a, b) => rtRank(a.id) - rtRank(b.id)), [rt]);
  const maxBar = Math.max(1, ...agentsSorted.map((a) => (metric === "avg" ? a.avgMs : a.p95)));
  const wf = useMemo(() => [...(rt?.lastCorrida ?? [])].sort((a, b) => (Date.parse(a.ts) - a.durationMs) - (Date.parse(b.ts) - b.durationMs)), [rt]);
  const wfStart = wf.length ? Math.min(...wf.map((r) => Date.parse(r.ts) - r.durationMs)) : 0;
  const wfEnd = wf.length ? Math.max(...wf.map((r) => Date.parse(r.ts))) : 1;
  const wfSpan = Math.max(1, wfEnd - wfStart);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Runtime de la cuadrilla</h2>
          <SectionHelp title="Runtime · qué es" body={[
            "El tiempo REAL que tarda cada agente, cronometrado en cada ejecución (generación por módulo o corrida del Master timeline) y guardado por día, semana, mes y trimestre.",
            "Las barras van en orden del pipeline (serie/jerarquía). El waterfall muestra la última corrida en el tiempo: quién corre después de quién y cuánto tardó.",
            "Se empieza a medir en la primera corrida posterior a esta actualización — no hay datos retroactivos.",
          ]} />
        </div>
        <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>Cuánto tarda cada agente, ejecutado por serie/jerarquía. Elegí el período; el waterfall es la línea de tiempo de la última corrida.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {periods.map(([id, lbl]) => (
          <button key={id} onClick={() => setPeriod(id)} className="px-3.5 h-9 rounded-full text-[13px] inline-flex items-center gap-1.5 transition-all" style={period === id ? { backgroundColor: `${C.teal}24`, border: `1px solid ${C.teal}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>{lbl}</button>
        ))}
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: `${C.ink}55` }}>{rt ? rt.periodKey : "…"}</span>
      </div>

      {err && <div className="rounded-2xl p-6 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: "#fca5a5" }}>No se pudo cargar el runtime: {err}</div>}
      {!rt && !err && <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Cargando runtime…</div>}
      {rt && rt.summary.runsTotal === 0 && (
        <div className="rounded-2xl p-8 flex flex-col items-center gap-2 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
          <Timer className="w-7 h-7" style={{ color: `${C.ink}44` }} />
          <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Sin ejecuciones en este período</p>
          <p className="text-[12px] max-w-[420px]" style={{ color: C.inkSoft }}>Las mediciones empiezan en la primera corrida (Master timeline o generación por módulo) posterior a la activación. Corré una y volvé acá.</p>
        </div>
      )}

      {rt && rt.summary.runsTotal > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Clock} label="Runtime total" value={fmtDur(rt.summary.totalMs)} hint={`${rt.summary.runsTotal.toLocaleString("es")} ejecuciones en el período`} color={C.teal} />
            <KpiCard icon={Users} label="Agentes activos" value={String(rt.summary.activeAgents)} hint="con al menos una ejecución" color={C.violet} />
            <KpiCard icon={Timer} label="Corrida más larga" value={fmtDur(rt.summary.longestRunMs)} hint={rt.summary.longestAgentName ?? "—"} color="#fbbf24" />
            <KpiCard icon={Activity} label="Ejecuciones" value={rt.summary.runsTotal.toLocaleString("es")} hint="spans cronometrados" color="#f472b6" />
          </div>

          <Section label="Runtime por agente · orden del pipeline (serie/jerarquía)" accent={C.teal}>
            <div className="flex items-center justify-end gap-1.5 mb-3">
              {(["avg", "p95"] as const).map((m) => (<button key={m} onClick={() => setMetric(m)} className="px-2.5 h-7 rounded-full text-[11px] transition-all" style={metric === m ? { backgroundColor: `${C.teal}22`, border: `1px solid ${C.teal}`, color: C.ink } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>{m === "avg" ? "Promedio" : "p95"}</button>))}
            </div>
            <div className="flex flex-col gap-2">
              {agentsSorted.map((a) => {
                const val = metric === "avg" ? a.avgMs : a.p95; const col = dcol(a.domain);
                const Ic = AGENT_ICON[a.iconKey] ?? Sparkles;
                return (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <span className="w-[150px] shrink-0 inline-flex items-center gap-1.5 min-w-0"><Ic className="w-3.5 h-3.5 shrink-0" style={{ color: col }} /><span className="text-[12px] truncate" style={{ color: C.ink }}>{a.name}</span></span>
                    <div className="flex-1 min-w-0 h-5 rounded-md relative overflow-hidden" style={{ backgroundColor: `${C.ink}0e` }}>
                      <div className="h-full rounded-md" style={{ width: `${Math.max(2, (val / maxBar) * 100)}%`, background: `linear-gradient(90deg, ${col}cc, ${col}88)`, transition: "width .25s" }} />
                      {metric === "avg" && a.p95 > a.avgMs && <span title={`p95 ${fmtDur(a.p95)}`} className="absolute top-0 bottom-0" style={{ left: `calc(${Math.min(100, (a.p95 / maxBar) * 100)}% - 1px)`, width: 2, background: `${col}`, opacity: 0.9 }} />}
                    </div>
                    <span className="w-[70px] shrink-0 text-right text-[12px] font-mono" style={{ color: C.inkSoft }}>{fmtDur(val)}</span>
                    <span className="w-[52px] shrink-0 text-right text-[10.5px]" style={{ color: `${C.ink}66` }}>{a.runs}×</span>
                  </div>
                );
              })}
            </div>
            {metric === "avg" && <p className="text-[10.5px] mt-3" style={{ color: `${C.ink}66` }}>La marca vertical señala el p95 (la cola lenta) de cada agente.</p>}
          </Section>

          <Section label="Última corrida · línea de tiempo (waterfall)" accent={C.violet} help={{ title: "Waterfall", body: ["Cada barra es un agente ejecutado en la última corrida, posicionado en el tiempo (inicio → fin). Muestra literalmente el orden por serie/jerarquía y cuánto ocupó cada uno.", "Los linters deterministas aparecen como marcas muy finas (~0 ms)."] }}>
            {wf.length === 0 ? (
              <p className="text-[12px]" style={{ color: C.inkSoft }}>Todavía no hay una corrida registrada para dibujar.</p>
            ) : (
              <>
                <p className="text-[11px] mb-3" style={{ color: `${C.ink}66` }}>{wf.length} spans · duración total {fmtDur(wfSpan)}</p>
                <div className="flex flex-col gap-1.5">
                  {wf.map((r, i) => {
                    const start = Date.parse(r.ts) - r.durationMs; const left = ((start - wfStart) / wfSpan) * 100; const width = Math.max(0.8, (r.durationMs / wfSpan) * 100); const col = dcol(r.domain);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-[130px] shrink-0 text-[11px] truncate" style={{ color: C.inkSoft }} title={`${r.agentName} · ${r.runContext}${r.moduleId ? ` · ${r.moduleId}` : r.routeId ? ` · ${r.routeId}` : ""}`}>{r.agentName}</span>
                        <div className="flex-1 min-w-0 h-5 relative rounded" style={{ backgroundColor: `${C.ink}08` }}>
                          <div className="absolute top-0.5 bottom-0.5 rounded flex items-center" style={{ left: `${left}%`, width: `${width}%`, background: `linear-gradient(90deg, ${col}dd, ${col}99)`, minWidth: 3 }} title={`${fmtDur(r.durationMs)} · ${new Date(r.ts).toLocaleTimeString("es")}`}>
                            {width > 14 && <span className="text-[9px] px-1 truncate" style={{ color: "#06060a", fontWeight: 700 }}>{fmtDur(r.durationMs)}</span>}
                          </div>
                        </div>
                        {width <= 14 && <span className="w-[48px] shrink-0 text-[10px] font-mono" style={{ color: `${C.ink}77` }}>{fmtDur(r.durationMs)}</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </Section>

          <Section label="Detalle por agente" accent={`${C.ink}55`}>
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.ink}14` }}>
              <table className="w-full text-[11.5px]" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                <thead><tr style={{ backgroundColor: C.bg }}>{["Agente", "Corridas", "p50", "p95", "Total", "Última"].map((h) => (<th key={h} className="text-left font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-2" style={{ color: `${C.ink}66`, borderBottom: `1px solid ${C.ink}14` }}>{h}</th>))}</tr></thead>
                <tbody>
                  {agentsSorted.map((a, i) => { const Ic = AGENT_ICON[a.iconKey] ?? Sparkles; return (
                    <tr key={a.id} style={{ borderBottom: i < agentsSorted.length - 1 ? `1px solid ${C.ink}0c` : "none" }}>
                      <td className="px-3 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Ic className="w-3.5 h-3.5 shrink-0" style={{ color: dcol(a.domain) }} /><span style={{ color: C.ink, fontWeight: 600 }}>{a.name}</span></span></td>
                      <td className="px-3 py-1.5" style={{ color: C.inkSoft }}>{a.runs}</td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: C.inkSoft }}>{fmtDur(a.p50)}</td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: C.inkSoft }}>{fmtDur(a.p95)}</td>
                      <td className="px-3 py-1.5 font-mono" style={{ color: C.ink }}>{fmtDur(a.totalMs)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: `${C.ink}88` }}>{a.lastRun ? agentTimeAgo(a.lastRun) : "—"}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </Section>

          <Section label={`Log de ejecuciones · últimas ${rt.lastRuns.length}`} accent={`${C.ink}55`}>
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.ink}14` }}>
              <table className="w-full text-[11.5px]" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                <thead><tr style={{ backgroundColor: C.bg }}>{["Cuándo", "Agente", "Duración", "Contexto", "Modelo"].map((h) => (<th key={h} className="text-left font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-2" style={{ color: `${C.ink}66`, borderBottom: `1px solid ${C.ink}14` }}>{h}</th>))}</tr></thead>
                <tbody>
                  {rt.lastRuns.map((r, i) => { const Ic = AGENT_ICON[r.iconKey] ?? Sparkles; const ctx = r.runContext + (r.moduleId ? ` · ${r.moduleId}` : r.routeId ? ` · ${r.routeId}` : ""); return (
                    <tr key={i} style={{ borderBottom: i < rt.lastRuns.length - 1 ? `1px solid ${C.ink}0c` : "none" }}>
                      <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: C.inkSoft }} title={new Date(r.ts).toLocaleString("es")}>{agentTimeAgo(r.ts)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Ic className="w-3.5 h-3.5 shrink-0" style={{ color: dcol(r.domain) }} /><span style={{ color: C.ink, fontWeight: 600 }}>{r.agentName}</span></span></td>
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap" style={{ color: r.ok ? C.ink : "#fca5a5" }}>{fmtDur(r.durationMs)}{!r.ok && " ⚠"}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] whitespace-nowrap" style={{ color: `${C.ink}88` }}>{ctx}</td>
                      <td className="px-3 py-1.5 font-mono text-[10px] whitespace-nowrap" style={{ color: `${C.ink}66` }}>{r.model || "—"}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function CuadrillaStage({ reloadKey, isMaster }: { reloadKey: number; isMaster: boolean }) {
  const unidad = isMaster ? "capítulo" : "lámina";
  const [data, setData] = useState<EngineAgentsRollup | null>(null);
  const [err, setErr] = useState("");
  const [contractOf, setContractOf] = useState<EngineAgentStat | null>(null);   // modal "contrato de actuación"
  const [activity, setActivity] = useState<EngineAgentActivity[]>([]);
  const [cuadView, setCuadView] = useState<"agentes" | "actividad" | "proceso" | "runtime">("agentes");   // toggle: roster · proceso (DAG) · runtime · operatoria
  useEffect(() => { let a = true; fetchAgents().then(d => { if (a) setData(d); }).catch(e => { if (a) setErr(String((e as Error).message || e)); }); fetchAgentActivity(40).then(r => { if (a) setActivity(r.activity); }).catch(() => { if (a) setActivity([]); }); return () => { a = false; }; }, [reloadKey]);
  if (err) return <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: "#fca5a5" }}>No se pudo cargar la cuadrilla: {err}</div>;
  if (!data) return <div className="rounded-2xl p-8 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, color: C.inkSoft }}>Cargando la cuadrilla…</div>;
  const order: EngineAgentDomain[] = ["conocimiento", "creacion", "calidad"];
  // Correlación con el Contrato: cada agente interviene según el formato. En el Master (texto) no
  // participan los de diagramación image-2 (scope "atlas"); en el Atlas no participa el pipeline
  // documental exclusivo (scope "master", p. ej. el Psicometrista). Los no aplicables se muestran aparte.
  const applies = (a: EngineAgentStat) => isMaster ? a.scope !== "atlas" : a.scope !== "master";
  const roleOf = (a: EngineAgentStat) => (isMaster && a.masterRole) ? a.masterRole : a.role;
  const applicable = data.agents.filter(applies);
  const excluded = data.agents.filter(a => !applies(a));
  const crew = {
    totalAgents: applicable.length,
    activeThisMonth: applicable.filter(a => a.activeThisMonth).length,
    byDomain: { conocimiento: applicable.filter(a => a.domain === "conocimiento").length, creacion: applicable.filter(a => a.domain === "creacion").length, calidad: applicable.filter(a => a.domain === "calidad").length },
    opsTotal: applicable.reduce((n, a) => n + a.opsTotal, 0),
    costTotalUsd: applicable.reduce((n, a) => n + a.costTotalUsd, 0),
  };
  return (
    <div className="flex flex-col gap-5 max-w-[1000px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Cuadrilla IA</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>La cuadrilla que opera el estudio</h1>
          <SectionHelp title="Cuadrilla IA · qué es" body={["Los agentes IA que producen el libro, agrupados por dominio (Conocimiento, Creación, Calidad). Cada uno tiene un trabajo y métricas REALES tomadas del ledger de costo: operaciones, gasto y última actividad.", "El motor procesa de a un agente por vez — no es un feed en vivo: el badge 'activo' marca quién trabajó este mes.", `Nada se publica sin el visto bueno humano (la Directora Editorial aprueba cada ${unidad}).`]} />
        </div>
        <p className="text-[13px] mt-1" style={{ color: C.inkSoft }}>Los agentes que producen el libro, con su trabajo y su actividad real. El motor corre de a uno por vez; acá ves lo que cada uno hizo.{isMaster && " El Master Book es de texto: intervienen los del pipeline documental; los de diagramación image-2 quedan fuera (ver abajo), en línea con su contrato (solo Matter)."}</p>
      </div>
      {/* Toggle: roster · El proceso (DAG) · Runtime · Actividad. Cada subsección se accede por botón. */}
      <div className="flex items-center gap-2 flex-wrap">
        {([["agentes", "Agentes", Users], ["proceso", "El proceso", Workflow], ["runtime", "Runtime", Activity], ["actividad", "Actividad reciente", Clock]] as const).map(([id, lbl, Ic]) => (
          <button key={id} onClick={() => setCuadView(id)} className="px-3.5 h-9 rounded-full text-[13px] inline-flex items-center gap-1.5 transition-all" style={cuadView === id ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><Ic className="w-3.5 h-3.5" />{lbl}</button>
        ))}
      </div>
      {cuadView === "proceso" && <ProcesoDagView agents={data.agents} isMaster={isMaster} />}
      {cuadView === "runtime" && <RuntimeView />}
      {cuadView === "agentes" && order.map(dom => {
        const meta = data.domains[dom];
        const list = applicable.filter(a => a.domain === dom);
        if (list.length === 0) return null;
        return (
          <Section key={dom} label={`${meta.label} · ${list.length} agentes`} accent={meta.color}>
            <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>{meta.blurb}</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {list.map((a: EngineAgentStat) => {
                const Ic = AGENT_ICON[a.iconKey] ?? Sparkles;
                return (
                  <div key={a.id} className="rounded-xl p-3 flex flex-col gap-2" style={{ backgroundColor: C.bg, border: `1px solid ${meta.color}22` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${meta.color}1a`, border: `1px solid ${meta.color}33` }}><Ic className="w-4 h-4" style={{ color: meta.color }} /></span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{a.name}</p>
                          {QA_STAGE[a.id] && <span className="font-mono text-[8px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded shrink-0" title={QA_STAGE[a.id] === "gate" ? "Gate de generación: gatea el contenido mientras se produce" : "QA de salida: juzga la ruta/libro ya ensamblado"} style={{ color: QA_BADGE[QA_STAGE[a.id]!].color, border: `1px solid ${QA_BADGE[QA_STAGE[a.id]!].color}55`, background: `${QA_BADGE[QA_STAGE[a.id]!].color}12` }}>{QA_BADGE[QA_STAGE[a.id]!].label}</span>}
                        </div>
                        <p className="font-mono text-[9.5px]" style={{ color: `${C.ink}55` }}>{a.model}</p>
                      </div>
                      <span className="ml-auto inline-flex items-center gap-1 text-[10px] shrink-0" style={{ color: a.activeThisMonth ? C.teal : `${C.ink}55` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: a.activeThisMonth ? C.teal : `${C.ink}33` }} />{a.activeThisMonth ? "activo" : "en pausa"}
                      </span>
                    </div>
                    <p className="text-[11.5px] leading-snug" style={{ color: C.inkSoft }}>{roleOf(a)}</p>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] pt-0.5" style={{ color: `${C.ink}77` }}>
                      <span><strong style={{ color: C.ink }}>{a.opsTotal.toLocaleString("es")}</strong> ops</span>
                      <span><strong style={{ color: C.ink }}>${a.costTotalUsd < 1 ? a.costTotalUsd.toFixed(3) : a.costTotalUsd.toFixed(2)}</strong></span>
                      <span>últ. {agentTimeAgo(a.lastActiveTs)}</span>
                      {a.opsMonth > 0 && <span style={{ color: meta.color }}>{a.opsMonth} este mes</span>}
                      {(a.contracts?.length ?? 0) > 0 && <button onClick={() => setContractOf(a)} className="ml-auto inline-flex items-center gap-1 text-[10.5px] px-2 h-6 rounded-full transition-colors hover:bg-white/5" style={{ border: `1px solid ${meta.color}44`, color: meta.color }}><FileText className="w-3 h-3" /> Ver contrato</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        );
      })}
      {/* Agentes que NO intervienen en este formato (correlación con el contrato del Master) */}
      {cuadView === "agentes" && isMaster && excluded.length > 0 && (
        <Section label={`No intervienen en el Master Book · ${excluded.length}`} accent={`${C.ink}55`}>
          <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Son agentes de <strong style={{ color: C.ink }}>diagramación image-2</strong> del Visual Atlas. El Master Book es un libro de texto: su contrato es solo <strong style={{ color: C.ink }}>Matter</strong> (tipografía), sin contrato image-2 — por eso quedan fuera de su cuadrilla.</p>
          <div className="grid sm:grid-cols-2 gap-2.5" style={{ opacity: 0.6 }}>
            {excluded.map((a: EngineAgentStat) => {
              const Ic = AGENT_ICON[a.iconKey] ?? Sparkles;
              return (
                <div key={a.id} className="rounded-xl p-3 flex items-center gap-2.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.ink}10`, border: `1px solid ${C.ink}1f` }}><Ic className="w-4 h-4" style={{ color: `${C.ink}77` }} /></span>
                  <div className="min-w-0">
                    <p className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{a.name}</p>
                    <p className="text-[11px] leading-snug" style={{ color: C.inkSoft }}>{a.role}</p>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ color: `${C.ink}66`, border: `1px solid ${C.ink}1f` }}>solo Atlas</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      {/* Actividad reciente (operatoria REAL del ledger, todos los libros). Se accede por el toggle de arriba. */}
      {cuadView === "actividad" && activity.length === 0 && (
        <p className="text-[13px] rounded-xl px-4 py-3" style={{ color: C.inkSoft, backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>Todavía no hay operaciones registradas en el ledger.</p>
      )}
      {cuadView === "actividad" && activity.length > 0 && (
        <Section label={`Actividad reciente · últimas ${activity.length}`}>
          <p className="text-[12px] mb-3" style={{ color: C.inkSoft }}>Las últimas operaciones de la cuadrilla, tomadas del ledger de costo: qué agente corrió, con qué propósito, sobre qué objetivo, en qué libro y cuándo. Es la operatoria REAL (incluye lo que corre ahora mismo).</p>
          <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${C.ink}14` }}>
            <table className="w-full text-[11.5px]" style={{ borderCollapse: "collapse", minWidth: 640 }}>
              <thead>
                <tr style={{ backgroundColor: C.bg }}>
                  {["Cuándo", "Agente", "Propósito", "Objetivo", "Libro", "Modelo", "Costo"].map(h => (
                    <th key={h} className="text-left font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-2" style={{ color: `${C.ink}66`, borderBottom: `1px solid ${C.ink}14` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activity.map((r, i) => {
                  const Ic = AGENT_ICON[r.iconKey] ?? Sparkles;
                  return (
                    <tr key={i} style={{ borderBottom: i < activity.length - 1 ? `1px solid ${C.ink}0c` : "none" }}>
                      <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: C.inkSoft }} title={new Date(r.ts).toLocaleString("es")}>{agentTimeAgo(r.ts)}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap"><span className="inline-flex items-center gap-1.5"><Ic className="w-3.5 h-3.5 shrink-0" style={{ color: C.violet }} /><span style={{ color: C.ink, fontWeight: 600 }}>{r.agentName}</span></span></td>
                      <td className="px-3 py-1.5" style={{ color: C.inkSoft }}>{r.purpose}</td>
                      <td className="px-3 py-1.5 font-mono text-[10.5px] whitespace-nowrap" style={{ color: `${C.ink}88` }}>{r.target || "—"}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap"><span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ color: `${C.ink}77`, border: `1px solid ${C.ink}1f` }}>{r.book === "master-book-ab" ? "sombra" : r.book === "master-book" ? "master" : r.book === "visual-atlas" ? "atlas" : (r.book || "—")}</span></td>
                      <td className="px-3 py-1.5 font-mono text-[10px] whitespace-nowrap" style={{ color: `${C.ink}66` }}>{r.model}</td>
                      <td className="px-3 py-1.5 whitespace-nowrap" style={{ color: `${C.ink}77` }}>${r.costUsd < 0.001 ? "0.000" : r.costUsd.toFixed(3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
      {/* TOTAL — el número de agentes que operan el estudio (pedido del usuario) */}
      {cuadView === "agentes" && (
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${C.violet}1f, ${C.teal}12)`, border: `1px solid ${C.violet}33` }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${C.violet}22`, border: `1px solid ${C.violet}44` }}><Users className="w-5 h-5" style={{ color: C.violet }} /></span>
          <div>
            <p className="text-[15px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>La cuadrilla: {crew.totalAgents} agentes {isMaster ? "arman el Master Book" : "operan el estudio"}</p>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>{crew.byDomain.conocimiento} Conocimiento · {crew.byDomain.creacion} Creación · {crew.byDomain.calidad} Calidad · {crew.activeThisMonth} activos este mes{isMaster && excluded.length > 0 ? ` · ${excluded.length} solo Atlas` : ""}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <MiniStat label="Agentes" value={String(crew.totalAgents)} />
          <MiniStat label="Activos este mes" value={String(crew.activeThisMonth)} />
          <MiniStat label="Operaciones (total)" value={crew.opsTotal.toLocaleString("es")} />
          <MiniStat label="Gasto (total)" value={`$${crew.costTotalUsd.toFixed(2)}`} />
        </div>
        <p className="text-[11px] mt-3" style={{ color: `${C.ink}66` }}>Y nada se publica sin el visto bueno humano: la Directora Editorial aprueba cada {unidad} antes de armar el libro.</p>
      </div>
      )}

      {/* ── MODAL: contrato de actuación (system prompt del agente) ── */}
      {contractOf && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ backgroundColor: "rgba(6,6,10,0.8)", backdropFilter: "blur(4px)" }} onClick={() => setContractOf(null)}>
          <div className="w-full max-w-[680px] max-h-[85vh] rounded-2xl flex flex-col overflow-hidden" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 px-5 h-14 shrink-0" style={{ borderBottom: `1px solid ${C.ink}14` }}>
              <FileText className="w-4 h-4" style={{ color: C.violet }} />
              <div className="min-w-0">
                <p className="text-[14px] truncate" style={{ fontFamily: D, fontWeight: 700 }}>Contrato de actuación · {contractOf.name}</p>
                <p className="text-[11px]" style={{ color: C.inkSoft }}>El system prompt con el que actúa el agente</p>
              </div>
              <button onClick={() => setContractOf(null)} aria-label="Cerrar" className="ml-auto w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto flex flex-col gap-3">
              {(contractOf.contracts ?? []).map((c, i) => (
                <div key={i}>
                  {(contractOf.contracts?.length ?? 0) > 1 && <p className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1.5" style={{ color: C.bright }}>{c.label}</p>}
                  <pre className="text-[12px] leading-relaxed whitespace-pre-wrap rounded-xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14`, color: "rgba(243,243,246,0.82)", fontFamily: "ui-monospace, monospace" }}>{c.prompt}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Galería: miniaturas + visor con zoom/pan + deslizar + aprobar/regenerar ── */
const pagesAssetBase = (c: string) => `/assets/cloudbooks-engine/${c}/visual-atlas/pages`;
const verOf = (v?: string | null) => (v ? Date.parse(v) || "" : "");
// Unidad densa (≥7 tarjetas) → spread de 2 páginas (pág 1 = las 6 primeras tarjetas; pág 2 = tarjetas restantes + trampas + autocheck); 2 imágenes infographic-A/-B.png.
const isSpreadPage = (p: EngineCatalogPage) => (p.visualModules?.length ?? 0) >= 7;
const partSuffix = (part?: "A" | "B") => (part ? `-${part}` : "");
const thumbUrl = (certId: string, id: string, v?: string | null, part?: "A" | "B") => `${pagesAssetBase(certId)}/${id}/thumb${partSuffix(part)}.webp?v=${verOf(v)}`;
const pngUrl = (certId: string, id: string, v?: string | null, part?: "A" | "B") => `${pagesAssetBase(certId)}/${id}/infographic${partSuffix(part)}.png?v=${verOf(v)}`;

function galStatus(p: EngineCatalogPage): { key: string; label: string; color: string } {
  if (!p.imageGeneratedAt) return { key: "nogen", label: "Sin generar", color: `${C.ink}55` };
  if (p.needsRegen) return { key: "stale", label: "Desactualizada", color: C.gold };
  if (p.approved && !p.approvalStale) return { key: "approved", label: "Aprobada", color: C.green };
  if (p.imageQaOk === false) return { key: "review", label: "A revisar", color: C.gold };
  return { key: "ready", label: "Conforme", color: C.teal };
}

/* ── Galería del MASTER BOOK: por CAPÍTULOS (1 visual = el divisor/apertura de cada capítulo) ── */
function GaleriaMasterCapitulos({ chapters, certId }: { chapters: EngineChapter[]; certId: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<"" | "divider" | "graphics" | "approve">("");
  const [msg, setMsg] = useState("");
  const [bust, setBust] = useState(0);
  const [gview, setGview] = useState<"hojas" | "contenido">("hojas");   // hojas = PDF real; contenido = vista web
  const [rendering, setRendering] = useState(false);
  const [tab, setTab] = useState<"caps" | "rutas">("caps");             // sub-sección: capítulos | hojas de ruta
  const [openers, setOpeners] = useState<Record<string, string | null>>({});  // part-opener.png por ruta (p1..p9)
  const [routeBox, setRouteBox] = useState<string | null>(null);        // lightbox de una hoja de ruta
  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const routes = [...new Map(ordered.map(c => [c.seed.domainId, c.seed.domainLabel])).entries()].map(([id, label]) => ({ id, label })).sort((a, b) => a.id.localeCompare(b.id));
  const dividerUrl = (id: string, v = 0) => `${masterPagesBase(certId)}/${id}/divider.png${v ? `?v=${v}` : ""}`;
  const chapterPdfUrl = (id: string, v = 0) => `${masterPagesBase(certId)}/${id}/chapter.pdf${v ? `?v=${v}` : ""}`;
  const loadAppr = () => fetchApprovals().then(a => { const m: Record<string, boolean> = {}; for (const [k, v] of Object.entries(a.pages)) m[k] = v.approved; setApproved(m); }).catch(() => { /* noop */ });
  useEffect(() => { loadAppr(); }, []);
  useEffect(() => { fetchDesignAssets().then(a => setOpeners(a.openers ?? {})).catch(() => { /* noop */ }); }, [bust]);
  const openerUrl = (id: string, v = 0) => { const u = openers[id]; return u ? `${u}${v ? `?v=${v}` : ""}` : null; };
  const cur = lightbox !== null ? ordered[lightbox] : null;
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowLeft") setLightbox(n => n === null ? n : Math.max(0, n - 1));
      else if (e.key === "ArrowRight") setLightbox(n => n === null ? n : Math.min(ordered.length - 1, n + 1));
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, ordered.length]);
  // Abre SIEMPRE en "contenido" (divisor + relato web): funciona aunque el chapter.pdf no esté renderizado
  // todavía (cap-02..05 tienen divisor pero no pdf → el iframe de "Hojas" saldría en blanco).
  useEffect(() => { setMsg(""); setGview("contenido"); }, [lightbox]);
  async function renderHojas() { if (!cur) return; setRendering(true); setMsg(""); try { const r = await renderChapter(cur.seed.chapterId); if (r.ok) { setBust(b => b + 1); setMsg("Hojas renderizadas."); } else setMsg(r.error ?? "No se pudieron renderizar las hojas."); } catch (e) { setMsg(String((e as Error).message || e)); } finally { setRendering(false); } }
  async function toggleApprove() { if (!cur) return; const id = cur.seed.chapterId; setBusy("approve"); try { await approvePage(id, !approved[id]); await loadAppr(); } catch { /* noop */ } finally { setBusy(""); } }
  async function regenDivider() { if (!cur) return; setBusy("divider"); setMsg(""); try { const r = await generateChapterDivider(cur.seed.chapterId, true); if (r.ok) { setBust(b => b + 1); setMsg("Divisor regenerado."); } else setMsg(r.error ?? "Error al regenerar el divisor."); } catch (e) { setMsg(String((e as Error).message || e)); } finally { setBusy(""); } }
  async function regenGraphics() { if (!cur) return; setBusy("graphics"); setMsg(""); try { const r = await generateChapterGraphics(cur.seed.chapterId, true); const ok = r.results.filter(x => x.ok).length; setBust(b => b + 1); setMsg(`Figuras regeneradas: ${ok}/${r.results.length}. Recargá para verlas.`); } catch (e) { setMsg(String((e as Error).message || e)); } finally { setBusy(""); } }
  const barBtn = { border: "1px solid rgba(255,255,255,0.22)", color: "#fff" } as const;
  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Galería · control de diseño</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Galería de capítulos</h1>
          <SectionHelp title="Galería · cómo usarla" body={["Una tarjeta por capítulo con su divisor. Click abre el capítulo COMPLETO en el visor: divisor + exposición + figuras + puntos clave.", "En el visor podés navegar (←/→), Aprobar/Revocar el capítulo y Regenerar el divisor o las figuras. Esc cierra."]} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <MiniStat label="Capítulos" value={String(chapters.length)} />
        <MiniStat label="Aprobados" value={String(ordered.filter(c => approved[c.seed.chapterId]).length)} />
        {/* sub-sección: capítulos | hojas de ruta */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setTab("caps")} className="h-8 px-3 rounded-l-lg text-[12px]" style={tab === "caps" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : { border: `1px solid ${C.ink}22`, color: C.inkSoft }}>Capítulos</button>
          <button onClick={() => setTab("rutas")} className="h-8 px-3 rounded-r-lg text-[12px]" style={tab === "rutas" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : { border: `1px solid ${C.ink}22`, color: C.inkSoft }}>Hojas de ruta</button>
        </div>
      </div>
      {tab === "caps" && (ordered.length === 0
        ? <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay capítulos generados todavía.</p>
        : <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {ordered.map((ch, i) => (
            <div key={ch.seed.chapterId} role="button" tabIndex={0} onClick={() => setLightbox(i)} className="group flex flex-col rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5 cursor-pointer" style={{ backgroundColor: C.card, border: `1px solid ${approved[ch.seed.chapterId] ? `${C.teal}55` : `${C.ink}14`}` }}>
              <div className="relative w-full" style={{ aspectRatio: "1024 / 1536", backgroundColor: C.bg }}>
                <img loading="lazy" src={dividerUrl(ch.seed.chapterId, bust)} onError={(e) => { const el = e.currentTarget as HTMLImageElement; el.style.opacity = "0"; }} alt={ch.seed.title} className="w-full h-full object-cover" />
                <span className="absolute top-1.5 left-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>{chapBadge(ch.seed)}</span>
                {approved[ch.seed.chapterId] && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: C.teal, color: "#04110d" }}><Check className="w-3 h-3" /></span>}
              </div>
              <div className="px-2 py-1.5 min-w-0">
                <p className="text-[11px] leading-tight truncate" style={{ color: C.ink, fontWeight: 600 }}>{ch.seed.title}</p>
                <p className="text-[9px] mt-0.5 truncate" style={{ color: C.inkSoft }}>{ch.seed.domainLabel}</p>
              </div>
            </div>
          ))}
        </div>)}
      {tab === "rutas" && (routes.length === 0
        ? <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay rutas con capítulos todavía.</p>
        : <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          {routes.map(r => {
            const url = openerUrl(r.id, bust);
            return (
              <div key={r.id} role="button" tabIndex={0} onClick={() => url && setRouteBox(r.id)} className="group flex flex-col rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, cursor: url ? "pointer" : "default" }}>
                <div className="relative w-full" style={{ aspectRatio: "1024 / 1536", backgroundColor: C.bg }}>
                  {url
                    ? <img loading="lazy" src={url} alt={r.label} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-center text-[10px] px-3" style={{ color: C.inkSoft }}>Sin hoja de ruta —<br />generá en Auto Pages o corré el libro</div>}
                  <span className="absolute top-1.5 left-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>Ruta {r.id.replace(/^p/, "")}</span>
                </div>
                <div className="px-2 py-1.5 min-w-0"><p className="text-[11px] leading-tight truncate" style={{ color: C.ink, fontWeight: 600 }}>{r.label}</p></div>
              </div>
            );
          })}
        </div>)}
      {lightbox !== null && cur && (
        <div className="fixed inset-0 z-[120] overflow-y-auto" style={{ backgroundColor: "rgba(6,6,10,0.96)" }} onClick={() => setLightbox(null)}>
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 h-14 flex-wrap" style={{ backgroundColor: "rgba(10,10,14,0.92)", borderBottom: "1px solid rgba(255,255,255,0.12)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(n => n === null ? n : Math.max(0, n - 1))} disabled={lightbox === 0} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={barBtn}><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-mono text-[11px]" style={{ color: "#fff" }}>{chapBadge(cur.seed)} · {lightbox + 1}/{ordered.length}</span>
            <button onClick={() => setLightbox(n => n === null ? n : Math.min(ordered.length - 1, n + 1))} disabled={lightbox === ordered.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30" style={barBtn}><ChevronRight className="w-4 h-4" /></button>
            {/* toggle Hojas (PDF real) / Contenido (vista web) */}
            <div className="flex items-center gap-1 ml-2">
              <button onClick={() => setGview("hojas")} className="h-8 px-2.5 rounded-l-lg text-[12px]" style={gview === "hojas" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : barBtn}>Hojas</button>
              <button onClick={() => setGview("contenido")} className="h-8 px-2.5 rounded-r-lg text-[12px]" style={gview === "contenido" ? { background: C.violetBtn, color: "#fff", fontWeight: 600 } : barBtn}>Contenido</button>
            </div>
            {msg && <span className="text-[11px] ml-2" style={{ color: C.teal }}>{msg}</span>}
            <span className="ml-auto flex items-center gap-2">
              {approved[cur.seed.chapterId]
                ? <button onClick={toggleApprove} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] disabled:opacity-60" style={{ backgroundColor: `${C.teal}2a`, border: `1px solid ${C.teal}`, color: "#fff", fontFamily: D, fontWeight: 600 }}>{busy === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobada</button>
                : <button onClick={toggleApprove} disabled={!!busy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] disabled:opacity-60" style={{ ...barBtn, fontFamily: D, fontWeight: 600 }}>{busy === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Aprobar</button>}
              <button onClick={regenDivider} disabled={!!busy} title="Re-genera el arte del divisor con IA · consume crédito" className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-60" style={barBtn}>{busy === "divider" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Regenerar divisor</button>
              <button onClick={regenGraphics} disabled={!!busy} title="Re-genera las figuras del capítulo con IA · consume crédito" className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-60" style={barBtn}>{busy === "graphics" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Regenerar figuras</button>
              <button onClick={() => setLightbox(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={barBtn} title="Cerrar (Esc)"><X className="w-4 h-4" /></button>
            </span>
          </div>
          {gview === "hojas" ? (
            <div className="p-4 sm:p-6 h-[calc(100vh-3.5rem)]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-end mb-2">
                <button onClick={renderHojas} disabled={rendering} title="Vuelve a maquetar las hojas del capítulo (PDF)" className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-60" style={barBtn}>{rendering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Renderizar hojas</button>
              </div>
              <iframe title={`Hojas · ${cur.seed.title}`} src={chapterPdfUrl(cur.seed.chapterId, bust)} className="w-full rounded-lg" style={{ height: "calc(100% - 2.5rem)", background: "#fff", border: `1px solid ${C.ink}1f` }} />
            </div>
          ) : (
            <div className="flex justify-center p-4 sm:p-6">
              <div className="w-full max-w-[840px]" onClick={e => e.stopPropagation()}>
                <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
                  <img src={dividerUrl(cur.seed.chapterId, bust)} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} alt={`Divisor · ${cur.seed.title}`} className="w-full block" />
                </div>
                <ContenidoMasterView ch={cur} certId={certId} />
              </div>
            </div>
          )}
        </div>
      )}
      {/* lightbox de una hoja de ruta (solo la portada de la ruta, sin capítulos) */}
      {routeBox && openerUrl(routeBox, bust) && (
        <div className="fixed inset-0 z-[120] overflow-y-auto flex items-start justify-center p-4 sm:p-8" style={{ backgroundColor: "rgba(6,6,10,0.96)" }} onClick={() => setRouteBox(null)}>
          <button onClick={() => setRouteBox(null)} className="fixed top-4 right-4 w-9 h-9 rounded-lg flex items-center justify-center z-10" style={{ border: "1px solid rgba(255,255,255,0.22)", color: "#fff" }} title="Cerrar (Esc)"><X className="w-4 h-4" /></button>
          <img src={openerUrl(routeBox, bust)!} alt="" className="w-full max-w-[840px] rounded-lg block" style={{ border: `1px solid ${C.ink}1f` }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function GaleriaStage({ pages, hasKey, onReload, setStage: _setStage, setPageId: _setPageId, certId }: { pages: EngineCatalogPage[]; reloadKey: number; onReload: () => void; hasKey: boolean; setStage: (s: StageId) => void; setPageId: (id: string) => void; certId: string }) {
  const [filter, setFilter] = useState<"all" | "ready" | "review" | "approved" | "stale" | "nogen">("all");
  const [q, setQ] = useState("");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const ordered = [...pages].sort((a, b) => a.pageId.localeCompare(b.pageId));
  const filtered = ordered.filter(p => {
    if (filter !== "all" && galStatus(p).key !== filter) return false;
    const s = q.trim().toLowerCase();
    if (s && !`${p.pageNumber} ${p.title}`.toLowerCase().includes(s)) return false;
    return true;
  });
  const gen = pages.filter(p => p.imageGeneratedAt).length;
  const conf = pages.filter(p => p.imageQaOk === true).length;
  const rev = pages.filter(p => p.imageGeneratedAt && p.imageQaOk === false).length;
  const appr = pages.filter(p => p.approved).length;
  const FILTERS: [typeof filter, string][] = [["all", "Todas"], ["ready", "Conformes"], ["review", "A revisar"], ["approved", "Aprobadas"], ["stale", "Desactualizadas"], ["nogen", "Sin generar"]];

  return (
    <div className="flex flex-col gap-5 max-w-[1200px]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Galería · control de diseño</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Galería de láminas</h1>
          <SectionHelp title="Galería · cómo usarla" body={["Miniaturas de todas las láminas para controlar el diseño de un vistazo. Click en una abre el visor a pantalla completa.", "En el visor: zoom/pan (rueda, ＋－, o arrastrar) para micro-detalles; flechas ←→ para deslizar entre páginas; Esc cierra.", "Toggle Imagen/Página: 'Imagen' es la infografía cruda; 'Página' es cómo va en el libro (header/footer/número). Podés Aprobar y Regenerar sin salir."]} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <MiniStat label="Generadas" value={`${gen}/${pages.length}`} />
        <MiniStat label="Conformes" value={String(conf)} />
        <MiniStat label="A revisar" value={String(rev)} />
        <MiniStat label="Aprobadas" value={String(appr)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, lbl]) => {
          const active = filter === k;
          return <button key={k} onClick={() => setFilter(k)} className="px-3 h-8 rounded-lg text-[12px] transition-all" style={active ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600, border: `1px solid ${C.violet}55` } : { color: C.inkSoft, border: `1px solid ${C.ink}1f` }}>{lbl}</button>;
        })}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar nº o título…" className="ml-auto h-8 px-3 rounded-lg text-[12px] outline-none" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink, minWidth: 180 }} />
      </div>
      {filtered.length === 0
        ? <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay láminas en este filtro.</p>
        : <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {filtered.map((p, i) => {
            const st = galStatus(p);
            const spread = isSpreadPage(p);
            const cardPart = spread ? "A" as const : undefined;
            return (
              <div key={p.pageId} role="button" tabIndex={0} onClick={() => setLightbox(i)} className="group flex flex-col rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5 cursor-pointer" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
                <div className="relative w-full" style={{ aspectRatio: "1024 / 1536", backgroundColor: C.bg }}>
                  {p.imageGeneratedAt
                    ? <img loading="lazy" src={thumbUrl(certId, p.pageId, p.imageGeneratedAt, cardPart)} onError={(e) => {
                        // Fallback en cadena: thumb-A → thumb (single viejo) → infographic.png. Así un spread
                        // recién groundeado pero aún sin imagen A/B muestra su thumb single previo, no roto.
                        const el = e.currentTarget as HTMLImageElement; const step = Number(el.dataset.fb || 0);
                        if (step === 0 && cardPart) { el.dataset.fb = "1"; el.src = thumbUrl(certId, p.pageId, p.imageGeneratedAt); }
                        else if (step <= 1) { el.dataset.fb = "2"; el.src = pngUrl(certId, p.pageId, p.imageGeneratedAt); }
                      }} alt={p.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: `${C.ink}44` }}>sin generar</div>}
                  <span className="absolute top-1.5 left-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}>{p.pageNumber}</span>
                  {spread && <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: C.violet, color: "#fff", letterSpacing: "0.05em" }}>SPREAD</span>}
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full" title={st.label} style={{ backgroundColor: st.color, boxShadow: "0 0 0 2px rgba(0,0,0,0.4)" }} />
                  {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} title="Ver la fuente oficial (MS Learn) — control de origen" className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.62)", color: "#fff" }}><ExternalLink className="w-3.5 h-3.5" /></a>}
                </div>
                <div className="px-2 py-1.5 min-w-0">
                  <p className="text-[11px] leading-tight truncate" style={{ color: C.ink, fontWeight: 600 }}>{p.title}</p>
                  <p className="text-[9px] mt-0.5" style={{ color: st.color }}>{st.label}</p>
                </div>
              </div>
            );
          })}
        </div>}
      {lightbox !== null && filtered[lightbox] && (
        <GaleriaLightbox pages={filtered} idx={lightbox} setIdx={setLightbox} onClose={() => setLightbox(null)} onReload={onReload} hasKey={hasKey} certId={certId} />
      )}
    </div>
  );
}

function GaleriaLightbox({ pages, idx, setIdx, onClose, onReload, hasKey, certId }: { pages: EngineCatalogPage[]; idx: number; setIdx: (n: number) => void; onClose: () => void; onReload: () => void; hasKey: boolean; certId: string }) {
  const [mode, setMode] = useState<"img" | "page">("img");
  const [part, setPart] = useState<"AB" | "A" | "B">("AB");   // qué parte de un spread se muestra (AB = ambas)
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState("");
  const p = pages[idx];
  const spread = isSpreadPage(p);

  useEffect(() => { setScale(1); setPan({ x: 0, y: 0 }); }, [idx, mode, part]);
  useEffect(() => { setPart("AB"); }, [idx]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIdx(Math.min(pages.length - 1, idx + 1));
      else if (e.key === "ArrowLeft") setIdx(Math.max(0, idx - 1));
      else if (e.key === "+" || e.key === "=") setScale(s => Math.min(4, s + 0.25));
      else if (e.key === "-") setScale(s => Math.max(1, s - 0.25));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [idx, pages.length, onClose, setIdx]);

  const st = galStatus(p);
  async function doApprove() { setBusy("appr"); try { await approvePage(p.pageId, !p.approved); onReload(); } catch { /* noop */ } finally { setBusy(""); } }
  async function doRegen() { setBusy("regen"); try { await generateInfographic(p.pageId, true); onReload(); } catch { /* noop */ } finally { setBusy(""); } }

  return (
    <div className="fixed inset-0 z-[120] flex flex-col" style={{ backgroundColor: "rgba(6,6,10,0.96)" }} onClick={onClose}>
      <div className="flex items-center gap-3 px-4 h-12 shrink-0" style={{ borderBottom: `1px solid ${C.ink}14` }} onClick={e => e.stopPropagation()}>
        <span className="font-mono text-[12px] px-2 py-0.5 rounded" style={{ backgroundColor: `${C.ink}14`, color: C.bright }}>{p.pageNumber}</span>
        <span className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{p.title}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ color: st.color, border: `1px solid ${st.color}55` }}>{st.label}</span>
        {p.sourceUrl && <a href={p.sourceUrl} target="_blank" rel="noreferrer" title="Ver la fuente oficial (MS Learn) — control de origen" className="inline-flex items-center gap-1 text-[11px] px-2 h-7 rounded-lg shrink-0 hover:bg-white/5" style={{ color: C.bright, border: `1px solid ${C.ink}1f` }}><ExternalLink className="w-3 h-3" /> Origen</a>}
        <div className="ml-3 flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${C.ink}1f` }}>
          {(["img", "page"] as const).map(m => <button key={m} onClick={() => setMode(m)} className="px-2.5 h-7 text-[11px]" style={mode === m ? { backgroundColor: `${C.violet}24`, color: "#fff", fontWeight: 600 } : { color: C.inkSoft }}>{m === "img" ? "Imagen" : "Página"}</button>)}
        </div>
        {spread && mode === "img" && (
          <div className="flex items-center rounded-lg overflow-hidden shrink-0" style={{ border: `1px solid ${C.violet}55` }} title="Spread de 2 páginas: A = módulos · B = trampas + autocheck">
            {([["AB", "Ambas"], ["A", "Pág 1"], ["B", "Pág 2"]] as const).map(([pp, lbl]) => <button key={pp} onClick={() => setPart(pp)} className="px-2.5 h-7 text-[11px]" style={part === pp ? { backgroundColor: `${C.violet}33`, color: "#fff", fontWeight: 700 } : { color: C.bright }}>{lbl}</button>)}
          </div>
        )}
        {spread && <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${C.violet}22`, color: C.bright }}>SPREAD</span>}
        <span className="ml-auto text-[11px] shrink-0" style={{ color: `${C.ink}66` }}>{idx + 1}/{pages.length}</span>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30" style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff" }}><ChevronLeft className="w-5 h-5" /></button>
        <button onClick={() => setIdx(Math.min(pages.length - 1, idx + 1))} disabled={idx === pages.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30" style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff" }}><ChevronRight className="w-5 h-5" /></button>
        {mode === "img"
          ? <div className="w-full h-full flex items-center justify-center"
            onWheel={(e) => setScale(s => Math.min(4, Math.max(1, s - e.deltaY * 0.0015)))}
            onMouseDown={(e) => { if (scale > 1) dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
            onMouseMove={(e) => { if (dragRef.current) setPan({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }); }}
            onMouseUp={() => { dragRef.current = null; }} onMouseLeave={() => { dragRef.current = null; }}
            style={{ cursor: scale > 1 ? "grab" : "default" }}>
            {p.imageGeneratedAt
              ? <div className="flex items-start justify-center gap-3 max-h-full" style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`, transition: dragRef.current ? "none" : "transform 0.08s" }}>
                  {spread && part === "AB"
                    ? (["A", "B"] as const).map(pp => (
                        <div key={pp} className="flex flex-col items-center gap-1">
                          <span className="text-[10px]" style={{ color: `${C.ink}66` }}>{pp === "A" ? "Pág 1 · 6 tarjetas" : "Pág 2 · tarjetas restantes + trampas + check"}</span>
                          <img src={pngUrl(certId, p.pageId, p.imageGeneratedAt, pp)} alt={pp} draggable={false} className="select-none" style={{ maxHeight: "82vh", width: "auto", boxShadow: "0 2px 14px rgba(0,0,0,0.4)" }} />
                        </div>
                      ))
                    : <img src={pngUrl(certId, p.pageId, p.imageGeneratedAt, spread ? (part as "A" | "B") : undefined)} alt={p.title} draggable={false} className="max-h-full max-w-full select-none" style={{ maxHeight: "86vh" }} />}
                </div>
              : <p className="text-[13px]" style={{ color: C.inkSoft }}>Esta lámina todavía no se generó.</p>}
          </div>
          : <div className="w-full h-full flex items-center justify-center p-2">
              {/* aspecto 768×1152 (2:3): cortado al tamaño de hoja, no infinito */}
              <div style={{ height: "100%", aspectRatio: "768 / 1152", maxWidth: "100%", borderRadius: 10, overflow: "hidden", background: "#fff", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.8)" }}>
                <iframe key={p.pageId} title="page" src={`/engine/page-html/${p.pageId}?v=${verOf(p.imageGeneratedAt)}`} style={{ width: "768px", height: "1152px", border: "none", backgroundColor: "#fff", transformOrigin: "top left", display: "block" }}
                  ref={(el) => { if (el) { const h = el.parentElement!.clientHeight; el.style.transform = `scale(${h / 1152})`; } }} />
              </div>
            </div>}
        {mode === "img" && p.imageGeneratedAt && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 h-9 rounded-full" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
            <button onClick={() => setScale(s => Math.max(1, s - 0.25))} className="w-7 h-7 flex items-center justify-center" style={{ color: "#fff" }}><ZoomOut className="w-4 h-4" /></button>
            <span className="text-[11px] w-10 text-center" style={{ color: "#fff" }}>{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(4, s + 0.25))} className="w-7 h-7 flex items-center justify-center" style={{ color: "#fff" }}><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} className="ml-1 px-2 h-7 text-[11px] rounded" style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>Ajustar</button>
          </div>
        )}
      </div>
      <div className="shrink-0 px-3 py-2 flex flex-col gap-2" style={{ borderTop: `1px solid ${C.ink}14` }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={doApprove} disabled={!!busy || !p.imageGeneratedAt} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-50" style={{ border: `1px solid ${p.approved ? C.gold : C.green}66`, color: p.approved ? C.gold : C.green, fontFamily: D, fontWeight: 600 }}>
            {busy === "appr" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {p.approved ? "Desaprobar" : "Aprobar"}
          </button>
          <button onClick={doRegen} disabled={!!busy || !hasKey} title={hasKey ? "Regenerar la imagen de esta lámina" : "Sin llave OpenAI"} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-50" style={{ border: `1px solid ${C.bright}44`, color: C.bright, fontFamily: D, fontWeight: 600 }}>
            {busy === "regen" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Regenerar
          </button>
          <span className="ml-auto text-[10px]" style={{ color: `${C.ink}55` }}>← → deslizar · rueda / ＋－ zoom · Esc cerrar</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {pages.map((pp, i) => (
            <button key={pp.pageId} onClick={() => setIdx(i)} title={`${pp.pageNumber} · ${pp.title}`} className="shrink-0 rounded overflow-hidden" style={{ width: 38, aspectRatio: "1024 / 1536", border: i === idx ? `2px solid ${C.violet}` : `1px solid ${C.ink}22`, opacity: i === idx ? 1 : 0.6 }}>
              {pp.imageGeneratedAt ? <img loading="lazy" src={thumbUrl(certId, pp.pageId, pp.imageGeneratedAt, isSpreadPage(pp) ? "A" : undefined)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" style={{ backgroundColor: C.bg }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Aprobaciones: gate humano con granularidad página + libro ── */
/** Estado operativo de aprobación de una página, derivado de los flags del catálogo. */
function apprStatus(p: EngineCatalogPage): { key: string; label: string; color: string; warn: boolean } {
  const hasImage = !!p.imageGeneratedAt;
  if (!hasImage) return { key: "nogen", label: "sin generar", color: `${C.ink}55`, warn: false };
  if (p.needsRegen) return { key: "stale", label: "Desactualizada", color: C.gold, warn: true };
  if (p.approved && p.approvalStale) return { key: "reappr", label: "Aprob. vieja", color: C.gold, warn: true };
  if (p.approved) return { key: "approved", label: "Aprobada", color: C.teal, warn: false };
  if (p.imageQaOk === false) return { key: "review", label: "Revisar QA", color: C.gold, warn: true };
  return { key: "ready", label: "Lista para aprobar", color: C.bright, warn: false };
}

/* ── Aprobaciones del MASTER BOOK: alistamiento por CAPÍTULO + firma de libro (no páginas/imágenes) ── */
function MasterAprobaciones({ chapters, reloadKey, onReload, setStage }: { chapters: EngineChapter[]; reloadKey: number; onReload: () => void; setStage: (s: StageId) => void }) {
  const [bookApproved, setBookApproved] = useState(false);
  const [pagesMap, setPagesMap] = useState<Record<string, { approved: boolean; at: string }>>({});
  const [bookBusy, setBookBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [stFilter, setStFilter] = useState<"all" | "pending" | "approved">("all");
  const [nav, setNav] = useState(0);
  const loadAppr = () => fetchApprovals().then(a => { setBookApproved(!!a.book.approved); setPagesMap(a.pages ?? {}); }).catch(() => { /* noop */ });
  useEffect(() => { loadAppr(); }, [reloadKey]);

  const ordered = [...chapters].sort((a, b) => chapSortKey(a.seed).localeCompare(chapSortKey(b.seed)));   // integrador ÚLTIMO en su ruta (sin número)
  const rows = ordered.map(c => {
    const s = c.seed;
    const sections = s.sections?.length ?? 0;
    const gTotal = s.graphics?.length ?? 0;
    const gReady = s.graphics?.filter(g => !!g.imageUrl).length ?? 0;
    const grounded = (c.provenance?.sourceIds?.length ?? 0) > 0;
    return { s, sections, gTotal, gReady, grounded, ready: sections > 0 && grounded, approved: !!pagesMap[s.chapterId]?.approved };
  });
  const readyCount = rows.filter(r => r.ready).length;
  const approvedCount = rows.filter(r => r.approved).length;
  const gReadyTotal = rows.reduce((a, r) => a + r.gReady, 0);
  const gAllTotal = rows.reduce((a, r) => a + r.gTotal, 0);
  const allReady = rows.length > 0 && readyCount === rows.length;

  const filtered = rows.filter(r => stFilter === "approved" ? r.approved : stFilter === "pending" ? !r.approved : true);
  const PER = 10;
  const navMax = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(nav, navMax - 1);
  const visible = filtered.slice(cur * PER, cur * PER + PER);

  async function setChApproved(id: string, val: boolean) { setBusyId(id); try { await approvePage(id, val); await loadAppr(); onReload(); } catch { /* noop */ } finally { setBusyId(""); } }
  async function bulkVisible(val: boolean) { const ids = visible.map(r => r.s.chapterId); if (!ids.length) return; setBulkBusy(true); try { await approvePages(ids, val); await loadAppr(); onReload(); } catch { /* noop */ } finally { setBulkBusy(false); } }
  async function toggleBook() { setBookBusy(true); try { await approveBook(!bookApproved); setBookApproved(v => !v); onReload(); } catch { /* noop */ } finally { setBookBusy(false); } }

  const chip = (k: typeof stFilter, label: string) => <button key={k} onClick={() => { setStFilter(k); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={stFilter === k ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>{label}</button>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Aprobaciones · Master Book</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Firma humana · capítulos y libro</h1>
          <SectionHelp title="Aprobaciones · Master Book" body={[
            "Firmás capítulo por capítulo Y el libro completo. Un capítulo aprobado queda firmado para publicar; 'Aprobar libro' habilita Ensamblar.",
            "Cada capítulo muestra su alistamiento: prosa (secciones), grounding (fuentes citadas) y gráficos generados. Un capítulo 'listo' tiene prosa y está groundeado.",
            "Usá los filtros (Todos/Pendientes/Aprobados) y las acciones masivas para firmar en tanda.",
          ]} />
        </div>
      </div>

      {/* gate de LIBRO */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${bookApproved ? `${C.teal}55` : `${C.ink}14`}` }}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bookApproved ? `${C.teal}1f` : `${C.ink}10`, border: `1px solid ${bookApproved ? `${C.teal}55` : `${C.ink}1f`}` }}><BadgeCheck className="w-5 h-5" style={{ color: bookApproved ? C.teal : `${C.ink}66` }} /></span>
          <div>
            <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Libro {bookApproved ? "aprobado" : "sin aprobar"}</p>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>{approvedCount}/{rows.length} capítulos aprobados · {readyCount} listos · {gReadyTotal}/{gAllTotal} gráficos generados</p>
          </div>
          <button onClick={toggleBook} disabled={bookBusy || (!bookApproved && rows.length === 0)} className="ml-auto inline-flex items-center gap-2 px-5 h-10 rounded-full text-[13px] hover:bg-white/5 disabled:opacity-60" style={bookApproved ? { border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 } : { backgroundColor: `${C.teal}1c`, border: `1px solid ${C.teal}66`, color: C.teal, fontFamily: D, fontWeight: 600 }}>
            {bookBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : bookApproved ? <X className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
            {bookApproved ? "Revocar libro" : "Aprobar libro"}
          </button>
        </div>
        {!allReady && rows.length > 0 && (
          <p className="text-[12px] mt-3 leading-snug inline-flex items-start gap-1.5" style={{ color: C.gold }}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {rows.length - readyCount} capítulo(s) sin completar (falta prosa o grounding). Podés aprobar igual, pero entrarían incompletos.</p>
        )}
      </div>

      {/* filtros + acciones masivas */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {chip("all", `Todos (${rows.length})`)}{chip("pending", `Pendientes (${rows.length - approvedCount})`)}{chip("approved", `Aprobados (${approvedCount})`)}
          <span className="ml-auto flex items-center gap-2">
            <button onClick={() => bulkVisible(true)} disabled={bulkBusy || visible.length === 0} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-50 hover:bg-white/5" style={{ border: `1px solid ${C.teal}55`, color: C.teal, fontFamily: D, fontWeight: 600 }}>{bulkBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Aprobar visibles</button>
            <button onClick={() => bulkVisible(false)} disabled={bulkBusy || visible.length === 0} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] disabled:opacity-50 hover:bg-white/5" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}>Revocar visibles</button>
          </span>
        </div>
      )}

      {/* lista de capítulos (paginada) con aprobar/revocar por capítulo */}
      <div className="flex flex-col gap-2">
        {visible.map(r => (
          <div key={r.s.chapterId} className="rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap" style={{ backgroundColor: C.card, border: `1px solid ${r.approved ? `${C.teal}44` : r.ready ? `${C.teal}22` : `${C.ink}14`}` }}>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full shrink-0" style={{ color: C.violet, border: `1px solid ${C.violet}44` }}>{chapBadge(r.s)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] truncate" style={{ color: C.ink, fontWeight: 600 }}>{r.s.title}</p>
              <p className="text-[11px] truncate" style={{ color: `${C.ink}66` }}>{r.s.domainLabel}</p>
            </div>
            <span className="text-[11px] inline-flex items-center gap-1" style={{ color: r.sections > 0 ? C.teal : `${C.ink}55` }}><FileText className="w-3.5 h-3.5" /> {r.sections} secc.</span>
            <span className="text-[11px] inline-flex items-center gap-1" style={{ color: r.grounded ? C.teal : C.gold }}><ShieldCheck className="w-3.5 h-3.5" /> {r.grounded ? "grounded" : "sin grounding"}</span>
            <span className="text-[11px] inline-flex items-center gap-1" style={{ color: r.gTotal === 0 ? `${C.ink}55` : r.gReady === r.gTotal ? C.teal : C.gold }}><ImageIcon className="w-3.5 h-3.5" /> {r.gReady}/{r.gTotal}</span>
            {!r.ready && <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ color: C.gold, border: `1px solid ${C.gold}55` }}>incompleto</span>}
            {r.approved
              ? <button onClick={() => setChApproved(r.s.chapterId, false)} disabled={busyId === r.s.chapterId} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] shrink-0 disabled:opacity-60" style={{ backgroundColor: `${C.teal}1c`, border: `1px solid ${C.teal}66`, color: C.teal, fontFamily: D, fontWeight: 600 }}>{busyId === r.s.chapterId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobada</button>
              : <button onClick={() => setChApproved(r.s.chapterId, true)} disabled={busyId === r.s.chapterId} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] shrink-0 disabled:opacity-60 hover:bg-white/5" style={{ border: `1px solid ${C.bright}55`, color: C.bright, fontFamily: D, fontWeight: 600 }}>{busyId === r.s.chapterId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Aprobar</button>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-[13px] rounded-xl px-4 py-3" style={{ color: C.inkSoft, backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>Todavía no hay capítulos. Generá contenido en <button onClick={() => setStage("grounding")} className="underline" style={{ color: C.bright }}>Grounding</button> y <button onClick={() => setStage("generar")} className="underline" style={{ color: C.bright }}>Generar</button>.</p>}
        {rows.length > 0 && filtered.length === 0 && <p className="text-[13px]" style={{ color: C.inkSoft }}>No hay capítulos en este filtro.</p>}
      </div>

      {/* paginación */}
      {navMax > 1 && (
        <div className="flex items-center gap-3 justify-center">
          <button onClick={() => setNav(n => Math.max(0, n - 1))} disabled={cur === 0} className="inline-flex items-center gap-1 text-[12px] px-3 h-8 rounded-lg disabled:opacity-40 hover:bg-white/5" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ChevronLeft className="w-3.5 h-3.5" /> Anterior</button>
          <span className="font-mono text-[11px]" style={{ color: `${C.ink}66` }}>{cur + 1} / {navMax}</span>
          <button onClick={() => setNav(n => Math.min(navMax - 1, n + 1))} disabled={cur >= navMax - 1} className="inline-flex items-center gap-1 text-[12px] px-3 h-8 rounded-lg disabled:opacity-40 hover:bg-white/5" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>Siguiente <ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {bookApproved && (
        <button onClick={() => setStage("ensamblar")} className="self-start inline-flex items-center gap-2 px-5 h-10 rounded-full text-[13px] text-white hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
          Ir a Ensamblar libro <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function AprobacionesStage({ pages, reloadKey, onReload, setStage, setPageId }: { pages: EngineCatalogPage[]; reloadKey: number; onReload: () => void; setStage: (s: StageId) => void; setPageId: (id: string) => void }) {
  const [scope, setScope] = useState<"todo" | "custom">("todo");
  const [custom, setCustom] = useState("");
  const [stFilter, setStFilter] = useState<"all" | "pending" | "approved" | "stale">("all");
  const [nav, setNav] = useState(0);
  const [bookApproved, setBookApproved] = useState(false);
  const [busy, setBusy] = useState("");
  const [bookBusy, setBookBusy] = useState(false);

  useEffect(() => { fetchApprovals().then(a => setBookApproved(!!a.book.approved)).catch(() => {}); }, [reloadKey]);

  function customSet(): Set<string> {
    const s = custom.trim(); if (!s) return new Set();
    let ids: string[];
    if (s.includes("-") && !s.includes(",")) { const [a, b] = s.split("-").map(x => parseInt(x.trim(), 10)); ids = (Number.isFinite(a) && Number.isFinite(b)) ? Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => String(Math.min(a, b) + i).padStart(2, "0")) : []; }
    else ids = s.split(",").map(x => x.trim()).filter(Boolean).map(x => /^\d+$/.test(x) ? x.padStart(2, "0") : x);
    return new Set(ids);
  }
  const scoped = scope === "todo" ? pages : (() => { const set = customSet(); return pages.filter(p => set.has(p.pageId)); })();
  const filtered = scoped.filter(p => {
    const st = apprStatus(p).key;
    if (stFilter === "approved") return st === "approved";
    if (stFilter === "pending") return st === "ready" || st === "review";
    if (stFilter === "stale") return st === "stale" || st === "reappr";
    return true;
  });
  const PER = 10;
  const navMax = Math.max(1, Math.ceil(filtered.length / PER));
  const cur = Math.min(nav, navMax - 1);
  const visible = filtered.slice(cur * PER, cur * PER + PER);

  const genPages = pages.filter(p => !!p.imageGeneratedAt);
  const approvedClean = pages.filter(p => p.approved && !p.approvalStale && !!p.imageGeneratedAt);
  const staleApproved = pages.filter(p => p.approved && p.approvalStale && !!p.imageGeneratedAt);
  const readyToApprove = pages.filter(p => { const k = apprStatus(p).key; return k === "ready" || k === "reappr"; });

  async function setApproved(pid: string, value: boolean) { setBusy(pid); try { await approvePage(pid, value); onReload(); } catch { /* noop */ } finally { setBusy(""); } }
  async function bulkVisible(value: boolean) { const ids = visible.filter(p => !!p.imageGeneratedAt).map(p => p.pageId); if (!ids.length) return; setBookBusy(true); try { await approvePages(ids, value); onReload(); } catch { /* noop */ } finally { setBookBusy(false); } }
  async function toggleBook() {
    setBookBusy(true);
    try { if (!bookApproved) { await approvePages(readyToApprove.map(p => p.pageId), true); await approveBook(true); } else { await approveBook(false); } onReload(); }
    catch { /* noop */ } finally { setBookBusy(false); }
  }

  const pill = (on: boolean) => on ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft };
  const stChip = (k: typeof stFilter, label: string) => <button key={k} onClick={() => { setStFilter(k); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={pill(stFilter === k)}>{label}</button>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Aprobaciones</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Firma humana · página y libro</h1>
          <SectionHelp title="Aprobaciones · para qué sirve" body={[
            "La aprobación humana es el GATE final: una página aprobada significa que su arte e información quedaron firmados para publicar/vender.",
            "El estado de cada fila sale de los flags del catálogo: Lista para aprobar · Aprobada · Aprob. vieja (el contenido cambió tras aprobar → reaprueba) · Desactualizada (la imagen es de contenido viejo → regenera) · Revisar (el QA de imagen no pasó) · sin generar.",
            "Podés aprobar igual una página con aviso (no se bloquea), pero el libro al día requiere imágenes frescas y aprobaciones vigentes.",
            "'Aprobar libro' firma todas las listas y habilita Ensamblar libro. Si una página queda con aprobación vieja, el libro la incluiría con contenido viejo — reaprueba o regenerá.",
          ]} />
        </div>
      </div>

      {/* gate de LIBRO */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: C.card, border: `1px solid ${bookApproved ? `${C.teal}55` : `${C.ink}14`}` }}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: bookApproved ? `${C.teal}1f` : `${C.ink}10`, border: `1px solid ${bookApproved ? `${C.teal}55` : `${C.ink}1f`}` }}><BadgeCheck className="w-5 h-5" style={{ color: bookApproved ? C.teal : `${C.ink}66` }} /></span>
          <div>
            <p className="text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>Libro {bookApproved ? "aprobado" : "sin aprobar"}</p>
            <p className="text-[12px]" style={{ color: C.inkSoft }}>{approvedClean.length} aprobadas al día · {genPages.length} generadas · {pages.length} en el libro{genPages.length < pages.length ? ` (faltan ${pages.length - genPages.length} por generar)` : ""}</p>
          </div>
          <button onClick={toggleBook} disabled={bookBusy || (!bookApproved && readyToApprove.length === 0)} className="ml-auto inline-flex items-center gap-2 px-5 h-10 rounded-full text-[13px] hover:bg-white/5 disabled:opacity-60" style={bookApproved ? { border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 } : { backgroundColor: `${C.teal}1c`, border: `1px solid ${C.teal}66`, color: C.teal, fontFamily: D, fontWeight: 600 }}>
            {bookBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : bookApproved ? <X className="w-4 h-4" /> : <BadgeCheck className="w-4 h-4" />}
            {bookApproved ? "Revocar libro" : `Aprobar libro (${readyToApprove.length})`}
          </button>
        </div>
        {staleApproved.length > 0 && (
          <p className="text-[12px] mt-3 leading-snug inline-flex items-start gap-1.5" style={{ color: C.gold }}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {staleApproved.length} página(s) con <strong>aprobación vieja</strong> (imagen de contenido anterior) entrarían al libro. Reaprobá o regenerá: {staleApproved.map(p => p.pageNumber).join(", ")}.</p>
        )}
      </div>

      {/* filtros */}
      <div className="rounded-2xl p-5 flex flex-wrap items-center gap-x-3 gap-y-2.5" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Alcance</span>
        <button onClick={() => { setScope("todo"); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={pill(scope === "todo")}>Todo ({pages.length})</button>
        <button onClick={() => { setScope("custom"); setNav(0); }} className="px-3 h-8 rounded-full text-[12px]" style={pill(scope === "custom")}>Rango / lista</button>
        {scope === "custom" && <input value={custom} onChange={e => { setCustom(e.target.value); setNav(0); }} placeholder="01-08 · 01,03,05" className="h-8 px-3 rounded-lg text-[12px] outline-none w-40" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />}
        <span className="w-px h-5 mx-1" style={{ backgroundColor: `${C.ink}1f` }} />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Estado</span>
        {stChip("all", "Todas")}{stChip("pending", "Pendientes")}{stChip("approved", "Aprobadas")}{stChip("stale", `Desactualizadas (${staleApproved.length + pages.filter(p => p.needsRegen).length})`)}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => bulkVisible(true)} disabled={bookBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.teal}55`, color: C.teal, fontFamily: D, fontWeight: 600 }}><Check className="w-3.5 h-3.5" /> Aprobar visibles</button>
          <button onClick={() => bulkVisible(false)} disabled={bookBusy} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 600 }}><X className="w-3.5 h-3.5" /> Revocar</button>
        </div>
      </div>

      {/* tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${C.ink}10` }}>
          <span className="text-[12px]" style={{ color: `${C.ink}66` }}>Mostrando {filtered.length ? cur * PER + 1 : 0}–{Math.min(cur * PER + PER, filtered.length)} de {filtered.length}</span>
          {navMax > 1 && <div className="flex items-center gap-2">
            <button onClick={() => setNav(n => Math.max(0, n - 1))} disabled={cur === 0} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowLeft className="w-4 h-4" /></button>
            <span className="text-[12px]" style={{ color: `${C.ink}66` }}>{cur + 1}/{navMax}</span>
            <button onClick={() => setNav(n => Math.min(navMax - 1, n + 1))} disabled={cur >= navMax - 1} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowRight className="w-4 h-4" /></button>
          </div>}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em]" style={{ color: `${C.ink}55` }}>
              <th className="px-5 py-2 font-normal">Pág</th>
              <th className="px-3 py-2 font-normal">Título</th>
              <th className="px-3 py-2 font-normal">Estado</th>
              <th className="px-5 py-2 font-normal text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => {
              const st = apprStatus(p); const tog = busy === p.pageId; const hasImage = !!p.imageGeneratedAt;
              return (
                <tr key={p.pageId} style={{ borderTop: `1px solid ${C.ink}0c` }}>
                  <td className="px-5 py-2.5 text-[12px] font-mono" style={{ color: C.ink }}>{p.pageNumber}</td>
                  <td className="px-3 py-2.5 text-[13px]" style={{ color: C.ink }}>{p.title}<span className="block text-[10px]" style={{ color: `${C.ink}55` }}>{p.domain}</span></td>
                  <td className="px-3 py-2.5"><span className="text-[11px] inline-flex items-center gap-1" style={{ color: st.color }}>{st.warn ? <AlertTriangle className="w-3.5 h-3.5" /> : st.key === "approved" ? <Check className="w-3.5 h-3.5" /> : null}{st.label}</span></td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      {st.key === "stale" && <button onClick={() => { setPageId(p.pageId); setStage("generar"); }} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px]" style={{ border: `1px solid ${C.gold}55`, color: C.gold }}><RefreshCw className="w-3.5 h-3.5" /> Regenerar</button>}
                      {st.key === "reappr" && <button onClick={() => setApproved(p.pageId, true)} disabled={tog} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] disabled:opacity-50" style={{ backgroundColor: `${C.gold}1a`, border: `1px solid ${C.gold}66`, color: C.gold, fontFamily: D, fontWeight: 600 }}>{tog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BadgeCheck className="w-3.5 h-3.5" />} Reaprobar</button>}
                      {st.key === "approved" && <button onClick={() => setApproved(p.pageId, false)} disabled={tog} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] disabled:opacity-50" style={{ backgroundColor: `${C.teal}1f`, border: `1px solid ${C.teal}`, color: C.teal, fontFamily: D, fontWeight: 600 }}>{tog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobada</button>}
                      {(st.key === "ready" || st.key === "review") && <button onClick={() => setApproved(p.pageId, true)} disabled={tog} title={st.key === "review" ? "El QA de imagen no pasó — puedes aprobar igual, pero conviene resolverlo" : "Aprobar"} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] disabled:opacity-50" style={{ border: `1px solid ${C.ink}2f`, color: C.bright, fontFamily: D, fontWeight: 600 }}>{tog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Aprobar</button>}
                      {!hasImage && <button onClick={() => { setPageId(p.pageId); setStage("generar"); }} className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px]" style={{ border: `1px solid ${C.ink}1f`, color: `${C.ink}88` }}><Sparkles className="w-3.5 h-3.5" /> Generar</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px]" style={{ color: C.inkSoft }}>No hay páginas en este filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Modal de ayuda (botón "?" — variante mini para métricas) ── */
function SectionHelp({ title, body, mini }: { title: string; body: string[]; mini?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title={`Qué significa: ${title}`} className={`${mini ? "w-[17px] h-[17px] text-[9px]" : "w-6 h-6 text-[12px]"} rounded-full inline-flex items-center justify-center shrink-0 transition-all hover:brightness-125`} style={{ border: `1px solid ${C.ink}2f`, color: C.inkSoft, fontFamily: D, fontWeight: 700 }}>?</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ backgroundColor: "#0009" }} onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="rounded-2xl p-6 max-w-lg w-full" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, boxShadow: "0 20px 60px #0007" }}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[16px] tracking-tight" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{title}</h3>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg inline-flex items-center justify-center hover:bg-white/5" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>
            <div className="text-[13px] leading-relaxed flex flex-col gap-2" style={{ color: C.inkSoft }}>{body.map((t, i) => <p key={i}>{t}</p>)}</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Exportar: tabla con alcance + 3 formatos por fila + bulk PDF/HTML ── */
function ExportarStage({ pages, reloadKey: _reloadKey, setStage }: { pages: EngineCatalogPage[]; reloadKey: number; setStage: (s: StageId) => void }) {
  const [scope, setScope] = useState<"todo" | "custom">("todo");
  const [onlyReady, setOnlyReady] = useState(false);
  const [custom, setCustom] = useState("");
  const [nav, setNav] = useState(0);
  const [exporting, setExporting] = useState("");
  const [urls, setUrls] = useState<Record<string, string>>({});

  const hasImg = (p: EngineCatalogPage) => !!p.imageGeneratedAt;
  const isReady = (p: EngineCatalogPage) => hasImg(p) && p.approved && !p.approvalStale && !p.needsRegen;

  function customSet(): Set<string> {
    const s = custom.trim(); if (!s) return new Set();
    let ids: string[];
    if (s.includes("-") && !s.includes(",")) { const [a, b] = s.split("-").map(x => parseInt(x.trim(), 10)); ids = (Number.isFinite(a) && Number.isFinite(b)) ? Array.from({ length: Math.abs(b - a) + 1 }, (_, i) => String(Math.min(a, b) + i).padStart(2, "0")) : []; }
    else ids = s.split(",").map(x => x.trim()).filter(Boolean).map(x => /^\d+$/.test(x) ? x.padStart(2, "0") : x);
    return new Set(ids);
  }
  const scoped = scope === "todo" ? pages : (() => { const set = customSet(); return pages.filter(p => set.has(p.pageId)); })();
  const target = onlyReady ? scoped.filter(isReady) : scoped;
  const targetGen = target.filter(hasImg);
  const warnCount = targetGen.filter(p => !p.approved || p.approvalStale || p.needsRegen).length;
  const PER = 10;
  const navMax = Math.max(1, Math.ceil(target.length / PER));
  const cur = Math.min(nav, navMax - 1);
  const visible = target.slice(cur * PER, cur * PER + PER);

  async function exportOne(pid: string, fmt: EngineExportFormat) {
    const key = `${pid}:${fmt}`;
    if (urls[key]) { window.open(urls[key], "_blank"); return; }
    setExporting(key);
    try {
      const r = await exportGranular([pid], fmt);
      const url = fmt === "pdf" ? r.pdfUrl : r.files?.[0]?.url;
      if (url) { setUrls(u => ({ ...u, [key]: url })); window.open(url, "_blank"); }
    } catch { /* noop */ } finally { setExporting(""); }
  }
  const pill = (on: boolean) => on ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.inkSoft };
  const fmtBtn = (pid: string, fmt: EngineExportFormat) => {
    const key = `${pid}:${fmt}`; const busy = exporting === key; const done = !!urls[key];
    return (
      <button key={fmt} onClick={() => exportOne(pid, fmt)} disabled={busy} title={done ? "Descargar de nuevo" : `Exportar ${fmt.toUpperCase()}`} className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-lg text-[11px] transition-all hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${done ? C.teal : `${C.ink}2f`}`, color: done ? C.teal : C.bright, fontFamily: D, fontWeight: 600 }}>
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <Download className="w-3 h-3" /> : null}{fmt.toUpperCase()}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: C.violet }}>Exportar</p>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Material listo para distribuir</h1>
          <SectionHelp title="Exportar · para qué sirve" body={[
            "Bajá cada página, un módulo o el alcance entero en HTML (web/edición), PNG (imagen para redes o vista previa) o PDF (impresión y muestras comerciales).",
            "Útil para: muestras de venta, revisión con terceros, entrega a imprenta, o publicar páginas sueltas del libro.",
            "El alcance (arriba) define qué páginas entran; la tabla va de 10 en 10. Por fila exportás un formato puntual; con los botones de la derecha bajás todo el alcance en PDF (un archivo) o HTML (uno por página).",
            "Los archivos se nombran CERT_modulo_titulo — por ej. AI200_modulo1_Tags_y_digest_SHA256.pdf — para mantener orden.",
          ]} />
        </div>
      </div>

      {/* alcance + bulk (PDF y HTML) */}
      <div className="rounded-2xl p-5 flex flex-wrap items-center gap-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: `${C.ink}66` }}>Alcance</span>
        <button onClick={() => { setScope("todo"); setNav(0); }} className="px-3.5 h-9 rounded-full text-[13px]" style={pill(scope === "todo")}>Todo ({pages.length})</button>
        <button onClick={() => { setScope("custom"); setNav(0); }} className="px-3.5 h-9 rounded-full text-[13px]" style={pill(scope === "custom")}>Rango / lista</button>
        {scope === "custom" && <input value={custom} onChange={e => { setCustom(e.target.value); setNav(0); }} placeholder="01-08  ·  01,03,05" className="h-9 px-3 rounded-xl text-[13px] outline-none w-44" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />}
        <button onClick={() => { setOnlyReady(o => !o); setNav(0); }} title="Solo páginas aprobadas y al día (sin desactualizar)" className="px-3.5 h-9 rounded-full text-[13px]" style={pill(onlyReady)}>Solo listas</button>
        <span className="text-[12px]" style={{ color: `${C.ink}55` }}>{target.length} págs</span>
      </div>

      {/* aviso de páginas sin aprobar / desactualizadas + aclaración granular vs libro */}
      <div className="flex flex-col gap-1.5">
        {warnCount > 0 && (
          <p className="text-[12px] leading-snug inline-flex items-start gap-1.5" style={{ color: C.gold }}><AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {warnCount} de las {targetGen.length} generadas en el alcance están <strong>sin aprobar o desactualizadas</strong>. Podés exportarlas igual; usá "Solo listas" para el export limpio.</p>
        )}
        <p className="text-[11px] leading-snug" style={{ color: `${C.ink}55` }}>Exportá cada página suelta (HTML/PNG/PDF) desde su fila. El <strong style={{ color: `${C.ink}88` }}>libro completo</strong> (portada, índice y <strong style={{ color: `${C.ink}88` }}>bibliografía</strong>) se arma en <button onClick={() => setStage("ensamblar")} className="underline" style={{ color: C.bright }}>Ensamblar libro</button>.</p>
      </div>

      {/* tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
        <div className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${C.ink}10` }}>
          <span className="text-[12px]" style={{ color: `${C.ink}66` }}>Mostrando {target.length ? cur * PER + 1 : 0}–{Math.min(cur * PER + PER, target.length)} de {target.length} <span style={{ color: `${C.ink}44` }}>· de 10 en 10</span></span>
          {navMax > 1 && <div className="flex items-center gap-2">
            <button onClick={() => setNav(n => Math.max(0, n - 1))} disabled={cur === 0} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowLeft className="w-4 h-4" /></button>
            <span className="text-[12px]" style={{ color: `${C.ink}66` }}>{cur + 1}/{navMax}</span>
            <button onClick={() => setNav(n => Math.min(navMax - 1, n + 1))} disabled={cur >= navMax - 1} className="w-8 h-8 rounded-lg inline-flex items-center justify-center disabled:opacity-40" style={{ border: `1px solid ${C.ink}1f`, color: C.inkSoft }}><ArrowRight className="w-4 h-4" /></button>
          </div>}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.1em]" style={{ color: `${C.ink}55` }}>
              <th className="px-5 py-2 font-normal">Pág</th>
              <th className="px-3 py-2 font-normal">Título</th>
              <th className="px-3 py-2 font-normal">Estado</th>
              <th className="px-5 py-2 font-normal text-right">Exportar</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(p => {
              const ready = hasImg(p);
              const badge = !ready ? { label: "sin generar", color: `${C.ink}55` }
                : p.needsRegen ? { label: "⚠ desactualizada", color: C.gold }
                : p.approvalStale ? { label: "⚠ aprob. vieja", color: C.gold }
                : p.approved ? { label: "aprobada", color: C.teal }
                : { label: "sin aprobar", color: `${C.ink}77` };
              return (
                <tr key={p.pageId} style={{ borderTop: `1px solid ${C.ink}0c` }}>
                  <td className="px-5 py-2.5 text-[12px] font-mono" style={{ color: C.ink }}>{p.pageNumber}</td>
                  <td className="px-3 py-2.5 text-[13px]" style={{ color: C.ink }}>{p.title}<span className="block text-[10px]" style={{ color: `${C.ink}55` }}>{p.domain}</span></td>
                  <td className="px-3 py-2.5 text-[11px]" style={{ color: badge.color }}>{badge.label}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-1.5 justify-end" style={{ opacity: ready ? 1 : 0.4, pointerEvents: ready ? "auto" : "none" }}>
                      {(["html", "png", "pdf"] as EngineExportFormat[]).map(f => fmtBtn(p.pageId, f))}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!visible.length && <tr><td colSpan={4} className="px-5 py-8 text-center text-[13px]" style={{ color: C.inkSoft }}>No hay páginas en el alcance.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

