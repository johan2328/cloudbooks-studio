import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  switchBook, lockLibrary, unlockLibrary, fetchLibraryLock, fetchLibraryMetrics, fetchModules,
  groundModule, generateChapterDivider, generateRouteCapstone, renderChapter,
  generateChapterGraphics, generatePartOpeners, generateMasterGlossary,
  fetchDesignLock, assembleMasterBook, assembleBook, runRoutePanel as runRoutePanelApi,
  updateCorridaTiming, fetchClaimReviews, type EngineActivateResult, type EngineModule,
} from "./engine-api";

/**
 * STORE DE LA CORRIDA (nivel app). La corrida del Master timeline la orquesta el navegador
 * (runBook), pero antes vivía dentro del componente `BooksTimeline` → al navegar se desmontaba
 * y se perdía el seguimiento. Acá vive en un Context montado por ENCIMA del router (App.tsx),
 * así sobrevive a la navegación dentro de la SPA. Lo generado siempre es durable (cada paso
 * persiste en el motor y reusa-si-existe); un marcador en localStorage permite REANUDAR barato
 * tras recargar/cerrar la pestaña. No cubre seguir ejecutando con la pestaña cerrada.
 */

// ── Tipos del run (movidos desde estudio-indesign) ──
export type RunGate = { kind: "content" | "approve" | "review" | "lock" | "publish" | "error"; msg: string };
export interface RunLogEntry { ts: number; msg: string }
export interface RunState { format: string; phase: string; detail: string; gate: RunGate | null; running: boolean; log: RunLogEntry[]; unit: number; totalUnits: number }
export type RunOpts = { regenModuleIds?: string[]; regenDividers?: boolean; regenFigures?: boolean; resumeFrom?: "content" | "design" | "assemble" | "publish" };

// ── Fases + % (fuente única: la usan el riel, el modal y el badge) ──
export const RUN_PHASES: { key: string; label: string; re: RegExp }[] = [
  { key: "contenido", label: "Contenido", re: /contenido/i },
  { key: "capstones", label: "Capítulos integradores", re: /capstone|integrador/i },
  { key: "portadillas", label: "Portadillas", re: /portadilla/i },
  { key: "figuras", label: "Figuras", re: /figura/i },
  { key: "hojas", label: "Hojas de ruta", re: /hojas de ruta/i },
  { key: "glosario", label: "Glosario", re: /glosario/i },
  { key: "ensamblado", label: "Ensamblado", re: /ensambl/i },
  { key: "qa", label: "QA por ruta", re: /QA de ruta|panel/i },
];
/** Índice de la fase activa según el label del run (o -1 en "Abriendo…"/"Cancelando…"). */
export function activePhaseIdx(phase: string): number { return RUN_PHASES.findIndex(p => p.re.test(phase)); }
/** % de avance del run (misma fórmula en riel/modal/badge). */
export function runPctOf(run: RunState | null): number {
  if (!run) return 0;
  const i = activePhaseIdx(run.phase);
  const f = run.totalUnits > 0 ? run.unit / run.totalUnits : 0;
  return i >= 0 ? Math.round(((i + f) / RUN_PHASES.length) * 100) : 0;
}

// ── Marcador de reanudar (localStorage): sobrevive a recarga/cierre de pestaña ──
const MARK_KEY = "corrida_active";
export interface CorridaMarker { fmt: string; status: "running" | "gate"; phase: string; ts: number }
function readMarker(): CorridaMarker | null { try { const s = localStorage.getItem(MARK_KEY); return s ? (JSON.parse(s) as CorridaMarker) : null; } catch { return null; } }
function writeMarker(m: CorridaMarker): void { try { localStorage.setItem(MARK_KEY, JSON.stringify(m)); } catch { /* noop */ } }
function clearMarker(): void { try { localStorage.removeItem(MARK_KEY); } catch { /* noop */ } }

interface CorridaCtx {
  run: RunState | null;
  startRun: (fmt: string, opts?: RunOpts) => void;
  cancelRun: () => void;
  dismissRun: () => void;
  resumeRun: () => void;
  resumeInfo: CorridaMarker | null;
  progressVersion: number;
  wantsFocus: boolean;
  focusFormat: string | null;
  requestFocus: (fmt: string) => void;
  clearFocus: () => void;
}
const Ctx = createContext<CorridaCtx | null>(null);
export function useCorridaRun(): CorridaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCorridaRun fuera de CorridaRunProvider");
  return v;
}

export function CorridaRunProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<RunState | null>(null);
  const [progressVersion, setProgressVersion] = useState(0);
  const [wantsFocus, setWantsFocus] = useState(false);
  const [focusFormat, setFocusFormat] = useState<string | null>(null);
  const [resumeInfo, setResumeInfo] = useState<CorridaMarker | null>(null);
  const runningRef = useRef(false);   // guard de re-entrada (no el state → sin closure stale)
  const cancelRef = useRef(false);
  const holdLockRef = useRef(false);
  const initRef = useRef(false);

  // Init (una vez, StrictMode-safe): si hay marcador → ofrecer reanudar y NO soltar el lock;
  // si no hay → la sesión previa murió sin su finally → cualquier lock "busy" es stale → soltarlo.
  useEffect(() => {
    if (initRef.current) return; initRef.current = true;
    const m = readMarker();
    if (m) setResumeInfo(m);
    else unlockLibrary().catch(() => { /* noop */ });
  }, []);

  const requestFocus = useCallback((fmt: string) => { setFocusFormat(fmt); setWantsFocus(true); }, []);
  const clearFocus = useCallback(() => { setWantsFocus(false); setFocusFormat(null); }, []);

  const cancelRun = useCallback(() => {
    cancelRef.current = true;
    setRun(prev => (prev && prev.running ? { ...prev, phase: "Cancelando…", detail: "Se detiene al terminar el paso en curso (puede tardar unos minutos)." } : prev));
  }, []);
  // Cierra/oculta la corrida (gate terminal como Publicación, o descartar la vista): limpia run + marcador → sale del "loop".
  const dismissRun = useCallback(() => {
    cancelRef.current = false;
    runningRef.current = false;
    clearMarker();
    setRun(null);
  }, []);

  /** Corre las fases automatizables del libro y SE DETIENE en el próximo gate humano. Serializada.
   *  `regenModuleIds`: re-genera SOLO esos módulos (relato + portadilla) con force. */
  const startRun = useCallback(async (fmt: string, opts: RunOpts = {}) => {
    if (runningRef.current) return;
    runningRef.current = true;
    setResumeInfo(null);
    const regenIds = opts.regenModuleIds ?? null;
    const forceContent = !!regenIds && regenIds.length > 0;   // reintento: regenera SOLO los módulos elegidos (relato)
    const regenDividers = !!opts.regenDividers || forceContent;   // forzar portadillas (solo-portadillas / port+figs / todo)
    const regenFigures = !!opts.regenFigures || forceContent;     // forzar figuras (port+figs / todo)
    // Reanudar por barrido: saltar fases ya completas. "design" = 1a integradores + 1b portadillas/figuras/hojas/glosario.
    const resumeFrom = opts.resumeFrom ?? "content";
    const skipDesign = resumeFrom === "assemble" || resumeFrom === "publish";
    const skipQA = resumeFrom === "publish";
    cancelRef.current = false;
    setRun(null);   // arranca el log de esta corrida en limpio
    const bump = () => setProgressVersion(v => v + 1);   // refresca métricas del timeline en las fronteras de fase
    const metricOf = async (f: string) => (await fetchLibraryMetrics()).books.find(x => x.format === f);
    const set = (phase: string, detail = "", gate: RunGate | null = null, running = true, logMsg?: string, prog?: { unit: number; totalUnits: number }) => {
      // marcador de reanudar: gate approve/lock → esperando decisión; otro gate (error/content/publish) → limpiar; corriendo → running
      if (gate && (gate.kind === "approve" || gate.kind === "lock")) writeMarker({ fmt, status: "gate", phase: gate.kind, ts: Date.now() });
      else if (gate) clearMarker();
      else if (running) writeMarker({ fmt, status: "running", phase, ts: Date.now() });
      setRun(prev => {
        const keep = prev && prev.format === fmt ? prev : null;
        const log = keep?.log ? [...keep.log] : [];
        if (logMsg) log.push({ ts: Date.now(), msg: logMsg });
        return { format: fmt, phase, detail, gate, running, log, unit: prog?.unit ?? keep?.unit ?? 0, totalUnits: prog?.totalUnits ?? keep?.totalUnits ?? 0 };
      });
    };
    const t0 = performance.now(); let finished = false; holdLockRef.current = false;   // cronómetro del tramo activo + lock anti-flip
    try {
    set("Abriendo el libro…", "", null, true, "Corrida iniciada · abriendo el libro");
    let sw: EngineActivateResult;
    // Switch ANTES de tomar el lock (para no bloquear el propio switch); si otra corrida lo tiene → busy.
    try { sw = await switchBook("ai-200", fmt); } catch { set("", "", { kind: "error", msg: "No se pudo contactar al motor." }, false); return; }
    // Candado ocupado: si lo tiene una corrida del MISMO libro es casi seguro un STALE de una sesión muerta
    // (la pestaña se cerró/navegó y su `finally` no corrió). runningRef ya garantiza que no hay corrida viva en
    // ESTA pestaña → lo robamos y reintentamos una vez (misma semántica que "Reanudar" del badge).
    if (!sw.ok && sw.busy) {
      try { const lk = await fetchLibraryLock(); if (lk.holder === `corrida:${fmt}`) { await unlockLibrary(); sw = await switchBook("ai-200", fmt); } } catch { /* noop */ }
    }
    if (!sw.ok) { set("", "", { kind: sw.busy ? "content" : "error", msg: sw.error ?? "No se pudo abrir el libro (¿activado?)." }, false); return; }
    // Tomar el lock "busy": bloquea switch/activate de otras pestañas mientras corre la corrida.
    try { holdLockRef.current = (await lockLibrary(`corrida:${fmt}`)).ok; } catch { holdLockRef.current = false; }
    if (!holdLockRef.current) { set("", "", { kind: "content", msg: "Otra corrida está en curso. Esperá a que termine." }, false); return; }
    bump();
    let m = await metricOf(fmt);
    if (!m) { set("", "", { kind: "error", msg: "Sin métricas del libro." }, false); return; }
    const isMaster = fmt === "master-book";

    // 1) Contenido (automatable) — confirmación ya hecha en startRun/startRegen. forceContent = reintento total.
    if (m.units < m.totalUnits || forceContent) {
      if (isMaster) {
        let mods: EngineModule[] = [];
        try { const all = (await fetchModules()).modules; mods = forceContent ? all.filter(x => regenIds!.includes(x.moduleId)) : all.filter(x => !x.hasChapter); } catch { /* vacío */ }
        const total = m.totalUnits || mods.length;   // el contador va sobre el TOTAL del libro (24), con el nº real de capítulo
        for (let i = 0; i < mods.length; i++) {
          if (cancelRef.current) { set("", "", { kind: "content", msg: `Cancelado (${i}/${mods.length} en esta corrida).` }, false, `Cancelado (${i}/${mods.length} en esta corrida)`); bump(); return; }
          const chNo = mods[i].chapterNumber || String(i + 1);
          const chNum = parseInt(chNo, 10) || (i + 1);
          const verb = forceContent ? "Regenerando contenido" : "Generando contenido";
          set(verb, `Capítulo ${chNo} · ${mods[i].moduleTitle}`, null, true, `${verb} · capítulo ${chNo}: ${mods[i].moduleTitle} (${i + 1} de ${mods.length})`, { unit: chNum, totalUnits: total });
          try {
            const gr = await groundModule(mods[i].moduleId, true, forceContent);
            // Homologación: generar/regenerar el divisor (olas, anclado a cap-01) para que el capítulo use
            // el diseño aprobado y APAREZCA en la galería (que keya por divider.png, no por el chapter.pdf).
            if (gr.chapterId) { set("Diseñando portadilla", `Capítulo ${chNo} · ${mods[i].moduleTitle}`, null, true, `Portadilla lista · capítulo ${chNo}`, { unit: chNum, totalUnits: total }); try { await generateChapterDivider(gr.chapterId, forceContent); } catch { /* seguir */ } }
          } catch { /* seguir con el resto */ }
        }
        m = (await metricOf(fmt)) ?? m;
        set("Contenido completo", `${mods.length} capítulos procesados`, null, true, `Contenido completo · ${mods.length} capítulos`, { unit: total, totalUnits: total });
      } else {
        set("", "", { kind: "content", msg: "El contenido del Atlas se completa desde Grounding/Generación." }, false, "El Atlas se completa desde Grounding/Generación"); return;
      }
    }

    // 1c) REVISIÓN HUMANA — GATE de exactitud: si el pipeline dejó claims CONTESTADOS sin resolver (bloqueados
    //     o 'wrong' que el 2º voto no confirmó), pausá para adjudicarlos ANTES de invertir en diseño/figuras y
    //     aprobar. Acota el riesgo de exactitud a un puñado de claims por libro. Resolver en QA → Revisión y reanudar.
    if (isMaster && !cancelRef.current) {
      let pendingReviews = 0;
      try { pendingReviews = (await fetchClaimReviews()).reviews.filter(r => r.status === "pending").length; } catch { pendingReviews = 0; }
      if (pendingReviews > 0) { set("", "", { kind: "review", msg: `${pendingReviews} claim(s) en revisión humana. Resolvelos en QA → Revisión para continuar.` }, false, `Gate: revisión humana (${pendingReviews} claim(s))`); bump(); return; }
    }

    // 1a) Capstones por ruta (proyecto integrador que teje los módulos ya groundeados, CON objetivos). El ensamblador
    //     los ordena ÚLTIMOS por ruta y les genera el divisor inline → solo hace falta su seed. Idempotente:
    //     force=false reusa el existente; forceContent lo regenera. Un fallo de una ruta NO corta la corrida.
    if (isMaster && !cancelRef.current && !skipDesign) {
      let capRoutes: string[] = [];
      try { capRoutes = [...new Set((await fetchModules()).modules.map(x => x.domainId).filter(Boolean))]; } catch { /* sin rutas */ }
      for (let i = 0; i < capRoutes.length; i++) {
        if (cancelRef.current) break;
        set("Tejiendo capítulo integrador", `Ruta ${capRoutes[i]} (${i + 1}/${capRoutes.length})`, null, true, `Capítulo integrador · ruta ${capRoutes[i]} (${i + 1}/${capRoutes.length})`, { unit: i + 1, totalUnits: capRoutes.length });
        try { await generateRouteCapstone(capRoutes[i], forceContent); } catch { /* seguir con la próxima ruta */ }
      }
      bump();
    }

    // 1b) Assets de diseño del Master (productor completo): portadillas faltantes + hojas de ruta (abre-partes)
    // + glosario + FIGURAS por capítulo. Homologa el libro y llena galería/Auto Pages. Idempotente (reusa lo existente).
    if (isMaster && !skipDesign) {
      try {
        const chs = (await fetchModules()).modules.filter(x => x.hasChapter && x.chapterId);
        for (let i = 0; i < chs.length; i++) {
          if (cancelRef.current) { set("", "", { kind: "content", msg: `Cancelado en diseño (${i}/${chs.length}).` }, false, `Cancelado en diseño (${i}/${chs.length})`); bump(); return; }
          const chNo = chs[i].chapterNumber || String(i + 1);
          set("Diseñando portadillas", `Capítulo ${chNo}`, null, true, `Portadilla · capítulo ${chNo}`, { unit: parseInt(chNo, 10) || (i + 1), totalUnits: chs.length });
          try { const dr = await generateChapterDivider(chs[i].chapterId!, regenDividers && !forceContent); if (!dr.ok && dr.error) set("Diseñando portadillas", `Capítulo ${chNo}`, null, true, `⚠ Portadilla cap ${chNo} falló: ${dr.error}`, { unit: parseInt(chNo, 10) || (i + 1), totalUnits: chs.length }); } catch { /* seguir */ }   // force solo si el usuario pidió portadillas y NO hubo content-force (que ya la regenera)
          try { await renderChapter(chs[i].chapterId!); } catch { /* seguir */ }   // chapter.pdf → que "Hojas" abra en la galería
          set("Generando figuras", `Capítulo ${chNo}`, null, true, `Figuras · capítulo ${chNo}`, { unit: parseInt(chNo, 10) || (i + 1), totalUnits: chs.length });
          try { await generateChapterGraphics(chs[i].chapterId!, regenFigures); } catch { /* figuras no-fatal · force solo si el usuario pidió figuras (port+figs / todo); si no, reusa */ }
        }
        // Portadillas de los CAPSTONES (no son módulos → no entran en el loop de arriba; el ensamblador igual las genera,
        // pero acá quedan listas para la galería). Reusa si ya existen; force sólo en "Regenerar → Todos".
        const capRts = [...new Set(chs.map(x => x.domainId).filter(Boolean))];
        for (let k = 0; k < capRts.length; k++) {
          if (cancelRef.current) break;
          const capId = `cap-zz-capstone-${capRts[k]}`;
          set("Diseñando portadillas", `Capítulo integrador · ruta ${capRts[k]}`, null, true, `Portadilla del capítulo integrador · ruta ${capRts[k]} (${k + 1}/${capRts.length})`, { unit: k + 1, totalUnits: capRts.length });
          try { await generateChapterDivider(capId, regenDividers); } catch { /* seguir (el capstone puede no existir) */ }
          try { await renderChapter(capId); } catch { /* seguir */ }
        }
      } catch { /* seguir */ }
      if (cancelRef.current) { set("", "", { kind: "content", msg: "Cancelado antes de las hojas de ruta." }, false, "Cancelado"); bump(); return; }
      set("Diseñando hojas de ruta", "Abre-partes por ruta", null, true, "Generando hojas de ruta (abre-partes)");
      try { await generatePartOpeners(undefined, false); } catch { /* seguir */ }
      set("Generando glosario", "Términos clave del libro", null, true, "Generando glosario");
      try { await generateMasterGlossary(); } catch { /* seguir */ }
      bump();
    }

    // 2) Aprobado — GATE humano
    const complete = m.units >= m.totalUnits;
    const approved = complete && (m.approved >= m.totalUnits || m.bookApproved);
    if (!approved) { set("", "", { kind: "approve", msg: "Contenido listo. Aprobá el libro para continuar." }, false, "Gate: aprobar contenido"); bump(); return; }

    // 3) Diseños bloqueados — GATE (design-lock de Auto Pages)
    let locked = false;
    try { locked = (await fetchDesignLock()).locked; } catch { locked = false; }
    if (!locked) { set("", "", { kind: "lock", msg: "Bloqueá los diseños en Auto Pages para poder ensamblar." }, false, "Gate: bloquear diseños (Auto Pages)"); return; }

    // 4) Ensamblado
    if (!m.assembled) {
      set("Ensamblando el PDF…", "", null, true, "Ensamblando el PDF…");
      try {
        const r = isMaster ? await assembleMasterBook() : await assembleBook();
        if (!r.ok) { set("", "", { kind: "error", msg: r.error ?? "Falló el ensamblado." }, false, `Error de ensamblado: ${r.error ?? "desconocido"}`); bump(); return; }
      } catch { set("", "", { kind: "error", msg: "Falló el ensamblado." }, false, "Error: falló el ensamblado"); return; }
      m = (await metricOf(fmt)) ?? m;
    }

    // 4b) QA de salida — panel de ruta por dominio (observabilidad de QA). Corre POR CADA RUTA del libro completo: el
    //     panel reasambla la ruta (aplica los últimos cambios de render: fixContent/CSS/figuras) y la juzga con los 7
    //     expertos, dejando veredictos + su métrica (agents-rollup/actividad). Así "lo nuevo" impacta cada módulo, aunque
    //     el libro ya estuviera ensamblado. Cada panel respeta el tope de costo mensual (bail interno) y un fallo de una
    //     ruta NO corta la corrida.
    if (isMaster && complete && !cancelRef.current && !skipQA) {
      let routes: string[] = [];
      try { routes = [...new Set((await fetchModules()).modules.map(x => x.domainId).filter(Boolean))]; } catch { /* sin rutas → se salta el QA */ }
      for (let i = 0; i < routes.length; i++) {
        if (cancelRef.current) { set("", "", { kind: "content", msg: `Cancelado en QA (${i}/${routes.length} rutas).` }, false, `Cancelado en QA (${i}/${routes.length} rutas)`); bump(); return; }
        set("QA de ruta (panel)", `Ruta ${routes[i]} (${i + 1}/${routes.length})`, null, true, `Panel de QA · ruta ${routes[i]} (${i + 1}/${routes.length})`, { unit: i + 1, totalUnits: routes.length });
        try { await runRoutePanelApi(routes[i]); } catch { /* seguir con la próxima ruta */ }
      }
      bump();
    }

    // 5) Publicación — GATE humano final
    finished = true;
    set("", "", { kind: "publish", msg: "Libro ensamblado. Cargá precio/ISBN y completá la ficha." }, false, "Ensamblado listo — falta publicar");
    bump();
    } finally {
      if (holdLockRef.current) unlockLibrary().catch(() => { /* noop */ });
      const seg = Math.round(performance.now() - t0);
      updateCorridaTiming({ startIfUnset: true, addMs: seg, finish: finished }).catch(() => { /* noop */ });
      if (finished) clearMarker();
      runningRef.current = false;
    }
  }, []);

  /** Reanuda tras recarga: si el marcador es "running", suelta el lock stale y re-lanza (reusa lo hecho). */
  const resumeRun = useCallback(() => {
    const m = readMarker();
    if (!m || m.status !== "running") { setResumeInfo(null); return; }
    setResumeInfo(null);
    unlockLibrary().catch(() => { /* noop */ }).finally(() => { void startRun(m.fmt, {}); });
  }, [startRun]);

  const value: CorridaCtx = { run, startRun, cancelRun, dismissRun, resumeRun, resumeInfo, progressVersion, wantsFocus, focusFormat, requestFocus, clearFocus };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ── Badge flotante app-wide: "Volver a la corrida" / "Reanudar". Paleta local (los tokens C/D no se exportan). ──
const BC = { card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)", violet: "#8b5cf6", gold: "#fbbf24", track: "rgba(243,243,246,0.10)" };
const GATE_LABEL: Record<string, string> = { approve: "Esperando tu aprobación", lock: "Bloqueá los diseños (Auto Pages)", publish: "Listo para publicar", error: "Se detuvo con un error", content: "Detenida" };

export function CorridaBadge() {
  const { run, resumeInfo, resumeRun, requestFocus, dismissRun } = useCorridaRun();
  const [, setLocation] = useLocation();
  const goto = (fmt: string) => { setLocation("/estudio/indesign"); requestFocus(fmt); };

  const gateActive = run?.gate && ["approve", "lock", "publish"].includes(run.gate.kind);
  const active = !!run && (run.running || !!gateActive);
  if (!active && !resumeInfo) return null;

  const shell = (accent: string, children: ReactNode) => (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 100, width: 300, maxWidth: "calc(100vw - 32px)", background: BC.card, border: `1px solid ${accent}55`, borderRadius: 14, padding: "12px 14px", boxShadow: "0 16px 40px -18px rgba(0,0,0,0.75)", fontFamily: "'Inter',sans-serif" }}>{children}</div>
  );
  const btn = (label: string, accent: string, onClick: () => void) => (
    <button onClick={onClick} style={{ marginTop: 10, width: "100%", height: 34, borderRadius: 9, background: `${accent}22`, border: `1px solid ${accent}`, color: BC.ink, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{label}</button>
  );

  if (active && run) {
    const gate = run.gate;
    const accent = gate ? BC.gold : BC.violet;
    const pct = runPctOf(run);
    const title = gate ? (GATE_LABEL[gate.kind] ?? run.phase) : (run.phase || "Corrida en curso");
    return shell(accent, <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, boxShadow: `0 0 0 3px ${accent}22`, flexShrink: 0 }} />
        <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: accent, fontFamily: "monospace" }}>{gate ? "Corrida · tu decisión" : "Corrida en curso"}</span>
        {!gate && <span style={{ marginLeft: "auto", fontSize: 12, color: BC.inkSoft, fontVariantNumeric: "tabular-nums" }}>{pct}%</span>}
      </div>
      <p style={{ marginTop: 6, fontSize: 13, color: BC.ink, fontWeight: 600, lineHeight: 1.25 }}>{title}</p>
      {run.detail && <p style={{ marginTop: 2, fontSize: 11.5, color: BC.inkSoft, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{run.detail}</p>}
      {!gate && <div style={{ marginTop: 8, height: 5, borderRadius: 999, background: BC.track, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}aa)`, transition: "width .3s" }} /></div>}
      {btn("Volver a la corrida", accent, () => goto(run.format))}
      {gate?.kind === "publish" && <button onClick={() => dismissRun()} style={{ marginTop: 6, width: "100%", height: 30, borderRadius: 8, background: "transparent", border: `1px solid ${BC.inkSoft}`, color: BC.inkSoft, fontSize: 12, cursor: "pointer" }}>Finalizar corrida</button>}
    </>);
  }

  // Reanudar tras recarga
  const m = resumeInfo!;
  const isRunning = m.status === "running";
  const accent = isRunning ? BC.violet : BC.gold;
  return shell(accent, <>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: accent, fontFamily: "monospace" }}>{isRunning ? "Corrida interrumpida" : "Corrida · tu decisión"}</span>
    </div>
    <p style={{ marginTop: 6, fontSize: 13, color: BC.ink, fontWeight: 600, lineHeight: 1.25 }}>{isRunning ? "Quedó a medias al recargar" : (GATE_LABEL[m.phase] ?? "Esperando tu decisión")}</p>
    <p style={{ marginTop: 2, fontSize: 11.5, color: BC.inkSoft }}>{isRunning ? "Reanudar salta lo ya generado (reusa)." : "Volvé para aprobar y seguir."}</p>
    {isRunning ? btn("Reanudar", accent, () => resumeRun()) : btn("Volver a la corrida", accent, () => goto(m.fmt))}
  </>);
}
