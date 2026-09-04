import { useEffect, useMemo, useRef, useState, type PointerEvent as RPE } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, LogOut, Plus, Search, X, Trash2, BadgeCheck, RefreshCw, Upload, ShieldCheck, Clock, Layers, TrendingDown, LayoutGrid, Table2, Share2, ArrowRight, Info, Sparkles, Check, CloudDownload, AlertTriangle, PlusCircle, Eye, Route, Network, ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import {
  getAllCerts, getAllCertsFrom, addCustomCert, removeCustomCert, importCerts,
  CLOUDS, CERT_AREAS, CERT_LEVELS, CERT_STATUSES,
  AREA_COLOR, LEVEL_COLOR, STATUS_COLOR, type Certification,
  certHours, certModules, isEstimated, reductionRate, TRACKS,
} from "@/lib/certifications";
import { fetchCertifications, fetchCertSyncLog, runCertSync, runCertRemove, setCertStatus, type EngineCertification, type CertSyncLog } from "@/lib/engine-api";
import { logoutEstudio } from "@/lib/estudio-auth";

/** Cert del catálogo canónico (engine) → forma de la página. */
function fromEngineCert(e: EngineCertification): Certification {
  return { code: e.code, title: e.title, cloud: e.cloud, area: e.area, level: e.level, status: e.status, note: e.note };
}

/* ════════════════════════════════════════════════════════════════════════════
   ESTUDIO · CERTIFICACIONES — catálogo (ficha técnica) por nube + área + nivel.
   Ruta /estudio/certificaciones (protegida por el gate del estudio).
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", teal: "#2dd4bf", gold: "#fbbf24", bright: "#c4b5fd", green: "#34d399",
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px]" style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}45`, color }}>{label}</span>
  );
}

const EMPTY: Certification = { code: "", title: "", cloud: "Microsoft", area: "Cloud & AI Platforms", level: "Associate", status: "Activo", note: "" };

/* ════════════════════════════════════════════════════════════════════════════
   GRAFO DE RED — nodos = certificaciones, coloreados por paleta y agrupados en
   clústeres por área. 3 MODOS (setting): Perfil (rutas por track) · Progresión
   (escalera de nivel por área) · Relevancia (mapa de calor por perfil objetivo).
   SVG puro, layout determinista (phyllotaxis por hash/índice, sin Math.random).
   ════════════════════════════════════════════════════════════════════════════ */
type GraphMode = "perfil" | "progresion" | "demanda";
const GRAPH_W = 1000, GRAPH_H = 700;
const GOLDEN = 2.399963229728653; // ángulo áureo (rad) → phyllotaxis estable
const CLUSTER_CENTERS: Record<string, { x: number; y: number }> = {
  "Cloud & AI Platforms": { x: 250, y: 195 },
  "AI Business Solutions": { x: 750, y: 195 },
  "Security": { x: 250, y: 500 },
  "GitHub": { x: 750, y: 500 },
};
const LVL_RANK: Record<string, number> = { Fundamentals: 0, Business: 1, Associate: 2, Specialty: 2, Expert: 3 };
function areaOf(c: Certification): string { return CLUSTER_CENTERS[String(c.area)] ? String(c.area) : "Cloud & AI Platforms"; }
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface GNode { code: string; x: number; y: number; r: number; c: Certification; area: string }

function CertNetworkGraph({ certs }: { certs: Certification[] }) {
  const [mode, setMode] = useState<GraphMode>("perfil");
  const [profileId, setProfileId] = useState(TRACKS[0].id);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const movedRef = useRef(false);
  const profile = TRACKS.find(t => t.id === profileId) ?? TRACKS[0];

  // ── layout determinista: phyllotaxis alrededor del centro de cada área ──
  const nodes = useMemo(() => {
    const byArea = new Map<string, Certification[]>();
    for (const a of Object.keys(CLUSTER_CENTERS)) byArea.set(a, []);
    for (const c of certs) byArea.get(areaOf(c))!.push(c);
    const map = new Map<string, GNode>();
    for (const [a, list] of byArea) {
      const center = CLUSTER_CENTERS[a];
      const sorted = [...list].sort((x, y) => (LVL_RANK[String(x.level)] ?? 2) - (LVL_RANK[String(y.level)] ?? 2) || x.code.localeCompare(y.code));
      const spread = list.length <= 8 ? 22 : 17;   // clústeres chicos → más separación (menos solape)
      sorted.forEach((c, i) => {
        const rad = spread * Math.sqrt(i + 0.6);
        const ang = i * GOLDEN;
        const r = 5 + Math.min(1, certHours(c) / 45) * 9;
        map.set(c.code, { code: c.code, x: center.x + rad * Math.cos(ang), y: center.y + rad * Math.sin(ang), r, c, area: a });
      });
    }
    return map;
  }, [certs]);

  // radio del halo POR clúster = extensión real de sus nodos (clústeres chicos → halos chicos, sin solaparse)
  const haloR = useMemo(() => {
    const m = new Map<string, number>();
    for (const [a, ctr] of Object.entries(CLUSTER_CENTERS)) {
      let mx = 38;
      for (const n of nodes.values()) if (n.area === a) mx = Math.max(mx, Math.hypot(n.x - ctr.x, n.y - ctr.y) + n.r);
      m.set(a, clampN(mx + 20, 58, 132));
    }
    return m;
  }, [nodes]);

  // DEMANDA: en cuántos perfiles del mercado (TRACKS) aparece cada cert.
  const demand = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TRACKS) for (const c of t.codes) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, []);
  const maxDemand = useMemo(() => Math.max(1, ...[...demand.values()]), [demand]);

  // ── aristas según modo ──
  const edges = useMemo(() => {
    const out: { a: string; b: string; kind: "track" | "sel" | "prog" }[] = [];
    const has = (code: string) => nodes.has(code);
    if (mode === "perfil") {
      for (const t of TRACKS) for (let i = 0; i < t.codes.length - 1; i++) {
        if (has(t.codes[i]) && has(t.codes[i + 1])) out.push({ a: t.codes[i], b: t.codes[i + 1], kind: t.id === profileId ? "sel" : "track" });
      }
    } else if (mode === "progresion") {
      // escalera: cada nodo → el nodo MÁS CERCANO del siguiente nivel presente en su área (flecha ascendente)
      const byArea = new Map<string, GNode[]>();
      for (const n of nodes.values()) { const a = byArea.get(n.area) ?? []; a.push(n); byArea.set(n.area, a); }
      for (const arr of byArea.values()) {
        const rankOf = (n: GNode) => LVL_RANK[String(n.c.level)] ?? 2;
        const ranks = [...new Set(arr.map(rankOf))].sort((a, b) => a - b);
        for (const n of arr) {
          const nr = rankOf(n);
          const nextRank = ranks.find(r => r > nr);
          if (nextRank == null) continue;
          const cands = arr.filter(m => rankOf(m) === nextRank);
          let best: GNode | null = null, bd = Infinity;
          for (const m of cands) { const d = Math.hypot(m.x - n.x, m.y - n.y); if (d < bd) { bd = d; best = m; } }
          if (best) out.push({ a: n.code, b: best.code, kind: "prog" });
        }
      }
    }
    // demanda: sin aristas (mapa de calor por frecuencia)
    return out;
  }, [nodes, mode, profileId, profile.codes]);

  // adyacencia (para resaltar vecinos al hacer hover)
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of edges) { (m.get(e.a) ?? m.set(e.a, new Set()).get(e.a)!).add(e.b); (m.get(e.b) ?? m.set(e.b, new Set()).get(e.b)!).add(e.a); }
    return m;
  }, [edges]);

  const inProfile = useMemo(() => new Set(profile.codes), [profile.codes]);

  const focusCode = hover ?? pinned;
  function isTop(code: string): boolean {
    if (focusCode === code) return true;
    if (hover && (hover === code || adj.get(hover)?.has(code))) return true;
    if (mode === "perfil") return inProfile.has(code);
    if (mode === "demanda") return (demand.get(code) ?? 0) >= 2;
    return false;
  }
  function nodeVis(code: string): { op: number; scale: number } {
    if (focusCode) {
      const near = focusCode === code || adj.get(focusCode)?.has(code);
      return { op: near ? 1 : 0.12, scale: focusCode === code ? 1.25 : 1 };
    }
    if (mode === "demanda") { const d = (demand.get(code) ?? 0) / maxDemand; return { op: 0.28 + 0.72 * d, scale: 0.7 + 1.1 * d }; }
    if (mode === "perfil") return { op: inProfile.has(code) ? 1 : 0.4, scale: inProfile.has(code) ? 1.12 : 1 };
    return { op: 0.92, scale: 1 };
  }
  function edgeVis(e: { a: string; b: string; kind: string }): { op: number; w: number; col: string } {
    if (focusCode) { const on = e.a === focusCode || e.b === focusCode; return { op: on ? 0.85 : 0.05, w: on ? 2 : 1, col: C.teal }; }
    if (e.kind === "sel") return { op: 0.85, w: 2.4, col: C.teal };
    if (e.kind === "prog") return { op: 0.5, w: 1.6, col: C.bright };
    return { op: 0.1, w: 1, col: C.inkSoft };   // track de fondo
  }
  const showLabel = (code: string) => view.k > 1.55 || isTop(code);

  // ── zoom / pan (SVG nativo, sin dep) ──
  function toSvg(clientX: number, clientY: number) {
    const el = svgRef.current; if (!el) return { x: GRAPH_W / 2, y: GRAPH_H / 2 };
    const r = el.getBoundingClientRect();
    return { x: (clientX - r.left) / r.width * GRAPH_W, y: (clientY - r.top) / r.height * GRAPH_H };
  }
  function zoomAt(sx: number, sy: number, factor: number) {
    setView(v => { const k = clampN(v.k * factor, 0.5, 4); const wx = (sx - v.tx) / v.k, wy = (sy - v.ty) / v.k; return { k, tx: sx - wx * k, ty: sy - wy * k }; });
  }
  function reset() { setPinned(null); setView({ k: 1, tx: 0, ty: 0 }); }
  function fitTo(codes: string[]) {
    const pts = codes.map(c => nodes.get(c)).filter(Boolean) as GNode[];
    if (pts.length < 1) return;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 60, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 60;
    const k = clampN(Math.min(GRAPH_W / (maxX - minX), GRAPH_H / (maxY - minY)), 0.5, 4);
    setView({ k, tx: GRAPH_W / 2 - (minX + maxX) / 2 * k, ty: GRAPH_H / 2 - (minY + maxY) / 2 * k });
  }
  function focusNode(code: string) {
    const n = nodes.get(code); if (!n) return;
    const k = Math.max(view.k, 1.9);
    setPinned(code);
    setView({ k, tx: GRAPH_W / 2 - n.x * k, ty: GRAPH_H / 2 - n.y * k });
  }
  useEffect(() => {
    const el = svgRef.current; if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); const s = toSvg(e.clientX, e.clientY); zoomAt(s.x, s.y, e.deltaY < 0 ? 1.18 : 1 / 1.18); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);
  function onPointerDown(e: RPE) { dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty }; movedRef.current = false; setDragging(true); }
  function onPointerMove(e: RPE) {
    const d = dragRef.current; if (!d) return;
    const el = svgRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 3) movedRef.current = true;
    const dx = (e.clientX - d.x) / r.width * GRAPH_W, dy = (e.clientY - d.y) / r.height * GRAPH_H;
    setView(v => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  }
  function onPointerUp() { dragRef.current = null; setDragging(false); }

  // ── datos del panel de interés ──
  const routeCerts = profile.codes.map(c => nodes.get(c)?.c).filter(Boolean) as Certification[];
  const rH = Math.round(routeCerts.reduce((s, c) => s + certHours(c), 0));
  const rM = routeCerts.reduce((s, c) => s + certModules(c), 0);
  const rr = reductionRate(rH);
  const rcb = Math.round(rH * (1 - rr));
  const rsaved = rH - rcb;
  const detail = focusCode ? nodes.get(focusCode)?.c ?? null : null;
  const detailProfiles = detail ? TRACKS.filter(t => t.codes.includes(detail.code)) : [];
  const detailStepIdx = detail ? profile.codes.indexOf(detail.code) : -1;

  const ordered = [...nodes.values()].sort((a, b) => Number(isTop(a.code)) - Number(isTop(b.code)));
  const ctrlBtn = "w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-white/10";
  const ctrlStyle = { backgroundColor: `${C.bg}cc`, border: `1px solid ${C.ink}22`, color: C.inkSoft } as const;

  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: `radial-gradient(130% 150% at 0% 0%, ${C.violet}12, ${C.bgAlt})`, border: `1px solid ${C.ink}14` }}>
      {/* controles: modo + perfil */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([["perfil", "Perfil"], ["progresion", "Progresión"], ["demanda", "Demanda"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} className="px-3 h-8 rounded-full text-[12px] transition-all"
            style={mode === m ? { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
            {label}
          </button>
        ))}
        {mode === "perfil" && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px]" style={{ color: C.inkSoft }}>Perfil:</span>
            <select value={profileId} onChange={e => { setProfileId(e.target.value); setPinned(null); }} aria-label="Perfil objetivo" className="rounded-lg px-2.5 h-8 text-[12px] outline-none max-w-[240px]" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink }}>
              {TRACKS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <span className="ml-auto text-[11px]" style={{ color: `${C.ink}55` }}>
          {mode === "perfil" ? "Elegí un perfil → su ruta resaltada" : mode === "progresion" ? "Color = nivel · flechas suben de nivel" : "Tamaño+brillo = en cuántos perfiles se pide"}
        </span>
      </div>

      {/* lienzo con zoom/pan */}
      <div className="relative rounded-xl overflow-hidden" style={{ border: `1px solid ${C.ink}0f` }}>
        <svg ref={svgRef} viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} width="100%" role="img" aria-label="Grafo de red de certificaciones"
          style={{ display: "block", touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
          <defs>
            <marker id="cbArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" fill={C.bright} />
            </marker>
          </defs>
          <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
            {/* halos de clúster (radio dinámico por extensión real) */}
            {Object.entries(CLUSTER_CENTERS).map(([a, ctr]) => {
              const hr = haloR.get(a) ?? 100;
              return (
                <g key={a}>
                  <circle cx={ctr.x} cy={ctr.y} r={hr} fill={`${AREA_COLOR[a]}0d`} stroke={`${AREA_COLOR[a]}22`} />
                  <text x={ctr.x} y={ctr.y - hr - 8} textAnchor="middle" style={{ fontFamily: D, fontWeight: 700, fontSize: 12, fill: AREA_COLOR[a] }}>{a}</text>
                </g>
              );
            })}
            {/* aristas */}
            {edges.map((e, i) => {
              const na = nodes.get(e.a), nb = nodes.get(e.b); if (!na || !nb) return null;
              const v = edgeVis(e);
              const arrow = mode === "progresion" && e.kind === "prog" && !focusCode;
              return <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={v.col} strokeWidth={v.w} strokeOpacity={v.op} strokeLinecap="round" pointerEvents="none" markerEnd={arrow ? "url(#cbArrow)" : undefined} />;
            })}
            {/* nodos (enfatizados al final = encima) */}
            {ordered.map(n => {
              const v = nodeVis(n.code);
              // en progresión el color = NIVEL (la posición ya dice el área); en perfil/demanda = área
              const fill = mode === "progresion" ? (LEVEL_COLOR[String(n.c.level)] ?? C.inkSoft) : (AREA_COLOR[n.area] ?? C.inkSoft);
              const stroke = mode === "progresion" ? `${C.ink}55` : (LEVEL_COLOR[String(n.c.level)] ?? C.ink);
              const rr2 = n.r * v.scale;
              return (
                <g key={n.code} style={{ cursor: "pointer" }} opacity={v.op}
                  onMouseEnter={() => setHover(n.code)} onMouseLeave={() => setHover(h => h === n.code ? null : h)}
                  onClick={() => { if (!movedRef.current) setPinned(p => p === n.code ? null : n.code); }}>
                  <title>{`${n.code} — ${n.c.title}\n${n.c.level} · ${certHours(n.c)} h · ${n.area}`}</title>
                  <circle cx={n.x} cy={n.y} r={rr2} fill={fill} stroke={pinned === n.code ? "#fff" : stroke} strokeWidth={pinned === n.code ? 2.5 : 1.5} />
                  {showLabel(n.code) && (
                    <text x={n.x} y={n.y + rr2 + 8} textAnchor="middle" pointerEvents="none"
                      style={{ fontFamily: D, fontWeight: 700, fontSize: 7.5, fill: C.ink, stroke: C.bg, strokeWidth: 2.4, strokeLinejoin: "round", paintOrder: "stroke" }}>{n.code}</text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {/* controles de zoom (overlay) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          <button aria-label="Acercar" title="Acercar" className={ctrlBtn} style={ctrlStyle} onClick={() => zoomAt(GRAPH_W / 2, GRAPH_H / 2, 1.25)}><ZoomIn className="w-4 h-4" /></button>
          <button aria-label="Alejar" title="Alejar" className={ctrlBtn} style={ctrlStyle} onClick={() => zoomAt(GRAPH_W / 2, GRAPH_H / 2, 1 / 1.25)}><ZoomOut className="w-4 h-4" /></button>
          <button aria-label="Ajustar al perfil" title="Ajustar al perfil" className={ctrlBtn} style={ctrlStyle} onClick={() => fitTo(profile.codes)}><Maximize2 className="w-4 h-4" /></button>
          <button aria-label="Reiniciar vista" title="Reiniciar vista" className={ctrlBtn} style={ctrlStyle} onClick={reset}><RotateCcw className="w-4 h-4" /></button>
        </div>
        <div className="absolute bottom-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.bg}cc`, border: `1px solid ${C.ink}18`, color: C.inkSoft }}>
          {Math.round(view.k * 100)}% · rueda para zoom · arrastrá para mover
        </div>
      </div>

      {/* leyenda (adapta al modo) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
        {Object.entries(mode === "progresion" ? LEVEL_COLOR : AREA_COLOR).map(([k, col]) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.inkSoft }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: col }} /> {k}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: `${C.ink}55` }}>
          <svg width="34" height="14" aria-hidden><circle cx="5" cy="7" r="3" fill={C.inkSoft} /><circle cx="16" cy="7" r="4.5" fill={C.inkSoft} /><circle cx="29" cy="7" r="6" fill={C.inkSoft} /></svg>
          {mode === "demanda" ? "tamaño ∝ demanda" : "tamaño ∝ horas"}
        </span>
        <span className="text-[10px] ml-auto" style={{ color: `${C.ink}44` }}>{mode === "progresion" ? "color = nivel · posición = área" : "color = área · borde = nivel"}</span>
      </div>

      {/* panel de interés (apilado, debajo) */}
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        {/* col izq: perfil / progresión / demanda */}
        <div className="rounded-xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
          {mode === "progresion" ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-1.5 inline-flex items-center gap-1.5" style={{ color: C.bright }}><TrendingDown className="w-3.5 h-3.5" style={{ transform: "rotate(180deg)" }} /> Escalera de nivel</p>
              <p className="text-[12px] leading-relaxed" style={{ color: C.inkSoft }}>Cada nodo se colorea por <strong style={{ color: C.ink }}>nivel</strong> y las <strong style={{ color: C.ink }}>flechas suben</strong> al siguiente nivel dentro de su área: Fundamentals → Associate/Specialty → Expert. Muestra cómo escalar en cada familia. Elegí «Perfil» para una ruta de mercado, o «Demanda» para ver las certs más transversales.</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
                {Object.entries(LEVEL_COLOR).map(([lv, col]) => (
                  <span key={lv} className="text-[11px] inline-flex items-center gap-1" style={{ color: C.inkSoft }}><span className="w-2 h-2 rounded-full" style={{ background: col }} />{lv}: <strong style={{ color: C.ink }}>{[...nodes.values()].filter(n => String(n.c.level) === lv).length}</strong></span>
                ))}
              </div>
            </>
          ) : mode === "demanda" ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1 inline-flex items-center gap-1.5" style={{ color: C.gold }}><TrendingDown className="w-3.5 h-3.5" /> Demanda del mercado</p>
              <p className="text-[12px] leading-relaxed mb-2.5" style={{ color: C.inkSoft }}>Tamaño y brillo = en cuántos de los {TRACKS.length} perfiles del mercado aparece cada certificación. Las más grandes son las <strong style={{ color: C.ink }}>más transversales</strong> (mayor retorno por estudiarlas).</p>
              <div className="flex flex-col gap-1">
                {[...demand.entries()].filter(([c]) => nodes.has(c)).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([code, n]) => (
                  <button key={code} onClick={() => focusNode(code)} className="flex items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/5">
                    <span className="font-mono text-[11px] w-14 shrink-0" style={{ fontWeight: 700, color: C.bright }}>{code}</span>
                    <span className="text-[11px] truncate flex-1" style={{ color: C.inkSoft }}>{nodes.get(code)?.c.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ color: C.gold, border: `1px solid ${C.gold}44` }}>{n} perfiles</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-1 inline-flex items-center gap-1.5" style={{ color: C.teal }}><Sparkles className="w-3.5 h-3.5" /> Perfil objetivo</p>
              <h3 className="text-[15px] tracking-tight" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{profile.name}</h3>
              <p className="text-[12px] leading-relaxed mt-1" style={{ color: C.inkSoft }}>{profile.desc}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {profile.codes.map((code, i) => {
                  const present = nodes.has(code);
                  return (
                    <button key={code} disabled={!present} onClick={() => focusNode(code)} title={present ? "Enfocar en el grafo" : "No está en el catálogo actual"}
                      className="inline-flex items-center gap-1 rounded-full pl-1 pr-2 py-0.5 text-[11px] transition-all disabled:opacity-40 hover:brightness-125"
                      style={{ backgroundColor: present ? `${C.teal}14` : `${C.ink}0e`, border: `1px solid ${present ? `${C.teal}44` : `${C.ink}22`}`, color: present ? C.teal : `${C.ink}66` }}>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px]" style={{ background: present ? C.teal : `${C.ink}33`, color: "#0a0a0e", fontWeight: 700 }}>{i + 1}</span>
                      <span className="font-mono" style={{ fontWeight: 700 }}>{code}</span>
                      {i < profile.codes.length - 1 && <ArrowRight className="w-3 h-3 -mr-1" style={{ color: `${C.ink}44` }} />}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {[
                  { l: "Pasos", v: String(routeCerts.length) },
                  { l: "Módulos", v: String(rM) },
                  { l: "Horas oficiales", v: `${rH} h` },
                  { l: "Con CloudBooks", v: `${rcb} h`, hi: true },
                ].map(s => (
                  <div key={s.l} className="rounded-lg px-2.5 py-1.5 text-center min-w-[72px]" style={{ backgroundColor: C.card, border: `1px solid ${s.hi ? `${C.green}55` : `${C.ink}14`}` }}>
                    <p className="leading-none" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.05rem", color: s.hi ? C.green : C.ink }}>{s.v}</p>
                    <p className="font-mono text-[8px] uppercase tracking-[0.12em] mt-1" style={{ color: `${C.ink}55` }}>{s.l}</p>
                  </div>
                ))}
                <div className="flex items-center px-2 text-[11px]" style={{ color: C.green }}>Ahorrás {rsaved} h (−{(rr * 100).toFixed(0)}%)</div>
              </div>
            </>
          )}
        </div>

        {/* col der: detalle del nodo (hover / click fija) */}
        <div className="rounded-xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${detail ? `${C.bright}33` : `${C.ink}14`}` }}>
          {detail ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[14px]" style={{ fontFamily: D, fontWeight: 700, color: C.bright }}>{detail.code}</span>
                <Badge label={String(detail.level)} color={LEVEL_COLOR[detail.level] ?? C.inkSoft} />
                <Badge label={String(detail.status)} color={STATUS_COLOR[detail.status] ?? C.inkSoft} />
                {pinned === detail.code && <span className="text-[10px] inline-flex items-center gap-1" style={{ color: C.inkSoft }}>fijado <button onClick={() => setPinned(null)} className="underline">soltar</button></span>}
              </div>
              <p className="text-[13px] mt-1" style={{ color: C.ink }}>{detail.title}</p>
              <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>{certHours(detail)} h · {certModules(detail)} módulos · {String(detail.area)}</p>
              {detail.note && <p className="text-[11px] mt-1.5 leading-snug" style={{ color: `${C.ink}66` }}>{detail.note}</p>}
              {detailStepIdx >= 0 && <p className="text-[11px] mt-2" style={{ color: C.teal }}>● Paso {detailStepIdx + 1} de {profile.codes.length} en «{profile.name}»</p>}
              {detailProfiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] mb-1" style={{ color: `${C.ink}55` }}>Aparece en {detailProfiles.length} perfil(es):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detailProfiles.map(t => (
                      <button key={t.id} onClick={() => { setProfileId(t.id); if (mode !== "perfil") setMode("perfil"); }} className="text-[11px] px-2 py-0.5 rounded-full transition-all hover:brightness-125"
                        style={{ backgroundColor: t.id === profileId ? `${C.teal}22` : `${C.violet}14`, border: `1px solid ${t.id === profileId ? C.teal : `${C.violet}44`}`, color: t.id === profileId ? C.teal : C.bright }}>{t.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center h-full min-h-[80px]">
              <span className="text-[12px]" style={{ color: C.inkSoft }}>Pasá el cursor por un nodo (o clic para fijarlo) para ver la certificación, su rol en el perfil y en qué otros perfiles aparece.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EstudioCertificaciones() {
  const [, setLocation] = useLocation();
  const [refresh, setRefresh] = useState(0);
  // Fuente ÚNICA: el catálogo canónico del engine (/engine/certifications) + la capa custom (localStorage).
  // Fallback offline al built-in si el engine no responde. Arranca con el built-in para render instantáneo.
  const [all, setAll] = useState<Certification[]>(() => getAllCerts());
  useEffect(() => {
    let alive = true;
    fetchCertifications()
      .then(r => { if (alive) setAll(getAllCertsFrom(r.certs.map(fromEngineCert))); })
      .catch(() => { if (alive) setAll(getAllCerts()); });
    return () => { alive = false; };
  }, [refresh]);

  // Sync mensual con el póster oficial (altas automáticas; nunca auto-deprecia).
  const [syncLog, setSyncLog] = useState<CertSyncLog | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncPanel, setSyncPanel] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchCertSyncLog().then(r => { if (alive) setSyncLog(r.last); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  async function doSync() {
    setSyncing(true);
    try {
      const r = await runCertSync();
      setSyncLog(r.log);
      setAll(getAllCertsFrom(r.certs.map(fromEngineCert)));
      setSyncPanel(true);
    } catch {
      // engine offline u otro error de red: reflejar como log de error mínimo
      setSyncLog({ ranAt: new Date().toISOString(), trigger: "manual", ok: false, passes: 0, extractedUnion: 0, confirmed: 0, added: [], retired: [], reviewMissing: [], unconfirmed: [], suspectMisread: [], error: "No se pudo contactar al motor (¿engine apagado?)." });
      setSyncPanel(true);
    } finally { setSyncing(false); }
  }
  function fmtSyncDate(iso: string): string {
    try { return new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso.slice(0, 16).replace("T", " "); }
  }
  const [discarding, setDiscarding] = useState<string | null>(null);
  async function doDiscard(code: string) {
    setDiscarding(code);
    try {
      const r = await runCertRemove(code);
      setAll(getAllCertsFrom(r.certs.map(fromEngineCert)));
      // sacar el code del panel para reflejar el descarte
      setSyncLog(l => l ? { ...l, added: l.added.filter(a => a.code !== code) } : l);
    } catch { /* engine offline: no-op visual */ }
    finally { setDiscarding(null); }
  }
  const [reverting, setReverting] = useState<string | null>(null);
  // Reactivar un cert retirado (revierte la baja automática del sync → status "Activo"). Red de seguridad ante mala lectura.
  async function doRevert(code: string) {
    setReverting(code);
    try {
      const r = await setCertStatus(code, "Activo");
      setAll(getAllCertsFrom(r.certs.map(fromEngineCert)));
      setSyncLog(l => l ? { ...l, retired: (l.retired ?? []).filter(x => x.code !== code) } : l);
    } catch { /* engine offline: no-op visual */ }
    finally { setReverting(null); }
  }
  const [retiring, setRetiring] = useState<string | null>(null);
  // Retirar un cert (baja suave reversible → "Retirada"): sale del árbol/grilla/métricas. Desde la tabla o el modal del chequeo.
  async function doRetire(code: string) {
    setRetiring(code);
    try {
      const r = await setCertStatus(code, "Retirada");
      setAll(getAllCertsFrom(r.certs.map(fromEngineCert)));
      setSyncLog(l => l ? { ...l, retired: (l.retired ?? []).filter(x => x.code !== code) } : l);
    } catch { /* engine offline: no-op visual */ }
    finally { setRetiring(null); }
  }
  // Retirar TODAS las candidatas propuestas por el último chequeo del póster.
  async function doRetireAll(codes: string[]) {
    setRetiring("*");
    try {
      let certs: EngineCertification[] | null = null;
      for (const code of codes) { try { const r = await setCertStatus(code, "Retirada"); certs = r.certs; } catch { /* seguir con la próxima */ } }
      if (certs) setAll(getAllCertsFrom(certs.map(fromEngineCert)));
      setSyncLog(l => l ? { ...l, retired: [] } : l);
    } finally { setRetiring(null); }
  }

  const [q, setQ] = useState("");
  const [cloud, setCloud] = useState("Microsoft");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"tabla" | "mapa" | "grafo">("tabla");
  const [graphKind, setGraphKind] = useState<"linear" | "red">("linear");
  const [methodOpen, setMethodOpen] = useState(false);
  const [trackId, setTrackId] = useState(TRACKS[0].id);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Certification>(EMPTY);
  const [formErr, setFormErr] = useState("");

  const [updating, setUpdating] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMsg, setImportMsg] = useState("");

  function doImport() {
    let parsed: unknown;
    try { parsed = JSON.parse(importText); } catch { setImportMsg("JSON inválido. Pegá un arreglo de certificaciones."); return; }
    const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray((parsed as { certs?: unknown }).certs) ? (parsed as { certs: Certification[] }).certs : null);
    if (!list) { setImportMsg("El JSON debe ser un arreglo, o un objeto { \"certs\": [...] }."); return; }
    const r = importCerts(list as Certification[]);
    setRefresh(n => n + 1);
    setImportMsg(`Listo: ${r.added} agregada(s), ${r.updated} actualizada(s)${r.skipped ? `, ${r.skipped} omitida(s)` : ""}. No se borró ninguna existente.`);
  }
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setImportText(String(reader.result || "")); setImportMsg(""); };
    reader.readAsText(file);
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all.filter(c =>
      (!t || c.code.toLowerCase().includes(t) || c.title.toLowerCase().includes(t)) &&
      (!cloud || c.cloud === cloud) &&
      (!area || c.area === area) &&
      (!level || c.level === level) &&
      (!status || c.status === status)
    );
  }, [all, q, cloud, area, level, status]);

  const kpi = useMemo(() => {
    const H = filtered.reduce((s, c) => s + certHours(c), 0);
    const M = filtered.reduce((s, c) => s + certModules(c), 0);
    const r = reductionRate(H);
    const cb = Math.round(H * (1 - r));
    return { n: filtered.length, H: Math.round(H), M, r, cb, saved: Math.round(H) - cb };
  }, [filtered]);

  const mapAreas = useMemo(() => {
    const seen: string[] = [];
    for (const c of filtered) if (!seen.includes(String(c.area))) seen.push(String(c.area));
    return seen;
  }, [filtered]);

  /* ruta acelerada de un interés combinado (track) resuelto contra el catálogo */
  const codeMap = useMemo(() => {
    const m = new Map<string, Certification>();
    for (const c of all) m.set(c.code.toLowerCase(), c);
    return m;
  }, [all]);
  const track = TRACKS.find(t => t.id === trackId) ?? TRACKS[0];
  const route = useMemo(() => {
    const chosen = track.codes.map(code => codeMap.get(code.toLowerCase())).filter(Boolean) as Certification[];
    const H = chosen.reduce((s, c) => s + certHours(c), 0);
    const M = chosen.reduce((s, c) => s + certModules(c), 0);
    const r = reductionRate(H);
    const cb = Math.round(H * (1 - r));
    return { chosen, H: Math.round(H), M, r, cb, saved: Math.round(H) - cb };
  }, [track, codeMap]);

  const inputCls = "rounded-lg px-3 h-10 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/60";
  const inputStyle = { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink } as const;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) { setFormErr("Código y título son obligatorios."); return; }
    if (all.some(c => c.code.toLowerCase() === form.code.trim().toLowerCase())) { setFormErr("Ya existe una certificación con ese código."); return; }
    addCustomCert({ ...form, code: form.code.trim(), title: form.title.trim(), note: form.note?.trim() || undefined });
    setAdding(false); setForm(EMPTY); setFormErr(""); setRefresh(n => n + 1);
  }

  function del(code: string) {
    removeCustomCert(code);
    setRefresh(n => n + 1);
  }

  const selStyle = { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.ink } as const;

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* barra superior */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1280px] px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <button onClick={() => setLocation("/estudio")} className="inline-flex items-center gap-1.5 text-sm transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.85 }}>
              <ArrowLeft className="w-4 h-4" /> Estudio
            </button>
            <span className="hidden sm:block w-px h-5" style={{ backgroundColor: `${C.ink}1f` }} />
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: C.gold }} />
              <span className="truncate" style={{ fontFamily: D, fontWeight: 700 }}>Certificaciones</span>
            </div>
          </div>
          <button onClick={() => { logoutEstudio(); setLocation("/estudio"); }} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] mb-1.5" style={{ color: C.gold }}>Catálogo · Ficha técnica</p>
            <h1 className="text-2xl sm:text-3xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Certificaciones</h1>
            <p className="text-[14px] mt-2 max-w-xl leading-relaxed" style={{ color: C.inkSoft }}>Por nube, área y nivel de exigencia. Cargá nuevas certificaciones y dejá notas de transición.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex flex-col items-end gap-1">
              <button onClick={doSync} disabled={syncing} className="inline-flex items-center gap-2 px-4 h-11 rounded-full text-sm transition-all hover:bg-white/5 disabled:opacity-60" style={{ border: `1px solid ${C.teal}45`, color: C.teal }}>
                <CloudDownload className={`w-4 h-4 ${syncing ? "animate-pulse" : ""}`} /> {syncing ? "Chequeando póster…" : "Chequear póster ahora"}
              </button>
              <button onClick={() => syncLog && setSyncPanel(true)} disabled={!syncLog} className="text-[10px] inline-flex items-center gap-1 disabled:opacity-50 hover:underline underline-offset-2" style={{ color: `${C.ink}66` }}>
                <Clock className="w-3 h-3" />
                {syncLog ? `última sync: ${fmtSyncDate(syncLog.ranAt)}${syncLog.ok ? (syncLog.added.length ? ` · +${syncLog.added.length}` : "") : " · error"}` : "sin sync aún"}
              </button>
            </div>
            <button onClick={() => { setImportText(""); setImportMsg(""); setUpdating(true); }} className="inline-flex items-center gap-2 px-4 h-11 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
              <RefreshCw className="w-4 h-4" /> Actualizar catálogo
            </button>
            <button onClick={() => { setForm(EMPTY); setFormErr(""); setAdding(true); }} className="inline-flex items-center gap-2 text-white px-5 h-11 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
              <Plus className="w-4 h-4" /> Agregar certificación
            </button>
          </div>
        </div>

        {/* filtros */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: C.inkSoft }} />
            <input value={q} onChange={e => setQ(e.target.value)} type="search" placeholder="Buscar código o título…" aria-label="Buscar certificación" className={`${inputCls} pl-9 w-[240px]`} style={inputStyle} />
          </div>
          <select value={cloud} onChange={e => setCloud(e.target.value)} aria-label="Nube" className={inputCls} style={selStyle}>
            {/* Solo Microsoft está disponible; AWS/Google Cloud quedan "próximamente" y no se pueden filtrar aún. */}
            <option value="">Toda nube</option>{CLOUDS.map(c => <option key={c} value={c} disabled={c !== "Microsoft"}>{c}{c !== "Microsoft" ? " (próximamente)" : ""}</option>)}
          </select>
          <select value={area} onChange={e => setArea(e.target.value)} aria-label="Área" className={inputCls} style={selStyle}>
            <option value="">Toda área</option>{CERT_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={level} onChange={e => setLevel(e.target.value)} aria-label="Nivel" className={inputCls} style={selStyle}>
            <option value="">Todo nivel</option>{CERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Estado" className={inputCls} style={selStyle}>
            <option value="">Todo estado</option>{CERT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(q || cloud || area || level || status) && (
            <button onClick={() => { setQ(""); setCloud(""); setArea(""); setLevel(""); setStatus(""); }} className="inline-flex items-center gap-1 text-[12px]" style={{ color: C.bright }}><X className="w-3.5 h-3.5" /> Limpiar</button>
          )}
          <span className="ml-auto text-[12px]" style={{ color: C.inkSoft }}>{filtered.length} de {all.length}</span>
        </div>

        {/* KPI — horas de preparación y ahorro con CloudBooks (según filtro) */}
        <div className="rounded-2xl p-5 mb-5" style={{ background: `linear-gradient(120deg, ${C.violet}10, ${C.bgAlt})`, border: `1px solid ${C.ink}14` }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" style={{ color: C.teal }} />
              <h2 className="text-[15px] tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Preparación y ahorro con CloudBooks</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px]" style={{ color: `${C.ink}66` }}>según el filtro actual · {kpi.n} cert.</span>
              <button onClick={() => setMethodOpen(true)} className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: C.bright }}><Info className="w-3.5 h-3.5" /> ¿Cómo se calcula?</button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: "Módulos a estudiar", v: String(kpi.M), icon: Layers, color: C.violet },
              { l: "Horas oficiales*", v: `${kpi.H} h`, icon: Clock, color: C.bright },
              { l: "Reducción CloudBooks", v: `${(kpi.r * 100).toFixed(1)}%`, icon: TrendingDown, color: C.teal },
              { l: "Horas con CloudBooks", v: `${kpi.cb} h`, icon: Clock, color: C.green },
            ].map(card => (
              <div key={card.l} className="rounded-xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
                <card.icon className="w-4 h-4 mb-2" style={{ color: card.color }} />
                <p className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}55` }}>{card.l}</p>
                <p className="leading-none mt-1" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.4rem", color: C.ink }}>{card.v}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="w-24 text-[11px] shrink-0" style={{ color: C.inkSoft }}>Oficial</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}12` }}><div className="h-full rounded-full" style={{ width: "100%", backgroundColor: `${C.ink}40` }} /></div>
              <span className="w-16 text-right text-[11px]" style={{ color: C.inkSoft }}>{kpi.H} h</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-[11px] shrink-0" style={{ color: C.teal }}>CloudBooks</span>
              <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}12` }}><div className="h-full rounded-full" style={{ width: `${kpi.H ? (kpi.cb / kpi.H) * 100 : 0}%`, background: `linear-gradient(90deg, ${C.teal}, ${C.green})` }} /></div>
              <span className="w-16 text-right text-[11px]" style={{ color: C.green }}>{kpi.cb} h</span>
            </div>
            <p className="text-[12px] mt-1" style={{ color: C.inkSoft }}>Ahorro estimado: <strong style={{ color: C.green }}>{kpi.saved} h</strong> ({(kpi.r * 100).toFixed(1)}%).</p>
          </div>

          <p className="text-[11px] leading-relaxed mt-4" style={{ color: `${C.ink}55` }}>
            *Horas estimadas por nivel salvo carga oficial por certificación. Detalle del cálculo en <button onClick={() => setMethodOpen(true)} className="underline underline-offset-2" style={{ color: C.bright }}>«¿Cómo se calcula?»</button>.
          </p>
        </div>

        {/* vista: tabla / mapa */}
        <div className="flex items-center gap-2 mb-4">
          {([["tabla", "Tabla", Table2], ["mapa", "Mapa", LayoutGrid], ["grafo", "Grafo", Share2]] as const).map(([v, label, Icon]) => (
            <button key={v} onClick={() => setView(v)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] transition-all"
              style={view === v ? { backgroundColor: `${C.violet}24`, border: `1px solid ${C.violet}`, color: "#fff", fontWeight: 600 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* tabla */}
        {view === "tabla" && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.ink}14` }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left" style={{ minWidth: 920 }}>
              <thead>
                <tr style={{ backgroundColor: C.bgAlt }}>
                  {["Código", "Título", "Nube", "Área", "Nivel", "Horas", "Módulos", "Estado", "Nota", ""].map(h => (
                    <th key={h} className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: `${C.ink}66`, borderBottom: `1px solid ${C.ink}14` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={`${c.code}-${i}`} className="align-top transition-colors hover:bg-white/[0.025]" style={{ borderBottom: `1px solid ${C.ink}0f` }}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-[12px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{c.code}</span>
                      {c.custom && <span className="ml-2 text-[9px] uppercase tracking-wider" style={{ color: C.bright }}>tuya</span>}
                    </td>
                    <td className="px-4 py-3 text-[13px] max-w-[320px]" style={{ color: C.ink }}>{c.title}</td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: C.inkSoft }}>{c.cloud}</td>
                    <td className="px-4 py-3"><Badge label={String(c.area)} color={AREA_COLOR[c.area] ?? C.inkSoft} /></td>
                    <td className="px-4 py-3"><Badge label={String(c.level)} color={LEVEL_COLOR[c.level] ?? C.inkSoft} /></td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: C.inkSoft }}>{certHours(c)} h{isEstimated(c) && <span className="ml-1 text-[9px]" style={{ color: `${C.ink}40` }}>est.</span>}</td>
                    <td className="px-4 py-3 text-[12px] whitespace-nowrap" style={{ color: C.inkSoft }}>{certModules(c)}</td>
                    <td className="px-4 py-3"><Badge label={c.status} color={STATUS_COLOR[c.status] ?? C.inkSoft} /></td>
                    <td className="px-4 py-3 text-[12px] max-w-[260px] leading-relaxed" style={{ color: c.note ? C.inkSoft : `${C.ink}33` }}>{c.note ?? "—"}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {["Activo", "Nuevo", "Beta"].includes(c.status) && (
                        <button onClick={() => doRetire(c.code)} disabled={retiring === c.code} aria-label={`Retirar ${c.code}`} title="Retirar (baja suave reversible: sale del árbol/grilla)" className="inline-flex items-center gap-1 rounded-lg px-2 h-8 text-[11px] font-semibold transition-colors hover:bg-white/5 disabled:opacity-40" style={{ color: "#fb923c", border: `1px solid #fb923c55` }}><AlertTriangle className="w-3.5 h-3.5" />{retiring === c.code ? "…" : "Retirar"}</button>
                      )}
                      {c.status === "Retirada" && (
                        <button onClick={() => doRevert(c.code)} disabled={reverting === c.code} aria-label={`Reactivar ${c.code}`} title="Reactivar (revertir a Activo)" className="inline-flex items-center gap-1 rounded-lg px-2 h-8 text-[11px] font-semibold transition-colors hover:bg-white/5 disabled:opacity-40" style={{ color: "#34d399", border: `1px solid #34d39955` }}><RotateCcw className="w-3.5 h-3.5" />{reverting === c.code ? "…" : "Reactivar"}</button>
                      )}
                      {c.custom && (
                        <button onClick={() => del(c.code)} aria-label={`Eliminar ${c.code}`} className="inline-flex w-8 h-8 items-center justify-center rounded-lg transition-colors hover:bg-white/5 ml-1" style={{ color: "#f87171" }}><Trash2 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: C.inkSoft }}>No hay certificaciones que coincidan con el filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* mapa visual por certificación */}
        {view === "mapa" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {mapAreas.map(a => (
              <div key={a}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: AREA_COLOR[a] ?? C.inkSoft }} />
                  <p className="text-[12px]" style={{ fontFamily: D, fontWeight: 700, color: AREA_COLOR[a] ?? C.ink }}>{a}</p>
                  <span className="text-[10px]" style={{ color: `${C.ink}44` }}>{filtered.filter(c => String(c.area) === a).length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {filtered.filter(c => String(c.area) === a).map((c, i) => {
                    const lc = LEVEL_COLOR[c.level] ?? C.inkSoft;
                    return (
                      <div key={`${c.code}-${i}`} className="rounded-xl p-3" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14`, borderLeft: `3px solid ${AREA_COLOR[a] ?? C.inkSoft}` }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{c.code}</span>
                          <span className="text-[10px]" style={{ color: lc }}>{c.level}</span>
                        </div>
                        <p className="text-[11px] mt-1 leading-snug line-clamp-2" style={{ color: C.inkSoft }}>{c.title}</p>
                        <div className="flex items-center gap-3 mt-2.5 text-[11px]" style={{ color: C.ink }}>
                          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" style={{ color: C.bright }} /> {certHours(c)} h</span>
                          <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" style={{ color: C.bright }} /> {certModules(c)} mód.</span>
                          {isEstimated(c) && <span className="ml-auto text-[9px]" style={{ color: `${C.ink}40` }}>est.</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {mapAreas.length === 0 && <p className="col-span-full px-4 py-12 text-center text-sm" style={{ color: C.inkSoft }}>No hay certificaciones que coincidan con el filtro.</p>}
          </div>
        )}

        {/* grafo de rutas: intereses combinados del mercado → ruta acelerada */}
        {view === "grafo" && (
          <div>
            <style>{`
              .cb-scroll{ scrollbar-width: thin; scrollbar-color: #8b5cf6 rgba(243,243,246,0.06); }
              .cb-scroll::-webkit-scrollbar{ height: 9px; }
              .cb-scroll::-webkit-scrollbar-track{ background: rgba(243,243,246,0.06); border-radius: 9999px; }
              .cb-scroll::-webkit-scrollbar-thumb{ background: linear-gradient(90deg,#8b5cf6,#2dd4bf); border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
              .cb-scroll::-webkit-scrollbar-thumb:hover{ background: linear-gradient(90deg,#a78bfa,#5eead4); background-clip: padding-box; }
            `}</style>
            {cloud && cloud !== "Microsoft" ? (
              <div className="rounded-2xl flex flex-col items-center justify-center text-center py-16 px-6" style={{ backgroundColor: C.card, border: `1px dashed ${C.ink}26` }}>
                <Share2 className="w-9 h-9 mb-4" style={{ color: `${C.ink}33` }} />
                <p className="text-lg" style={{ fontFamily: D, fontWeight: 700 }}>Rutas para {cloud}: próximamente</p>
                <p className="mt-1.5 text-sm max-w-md" style={{ color: C.inkSoft }}>Por ahora el grafo de rutas cubre el ecosistema Microsoft. Cambiá la nube a Microsoft (o «Toda nube») para ver los intereses combinados.</p>
                <button onClick={() => setCloud("Microsoft")} className="mt-6 inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Ver rutas de Microsoft</button>
              </div>
            ) : (
            <>
            {/* sub-toggle: grafo lineal (ruta) vs grafo de red (clústeres) */}
            <div className="flex items-center gap-2 mb-5">
              {([["linear", "Ruta (lineal)", Route], ["red", "Red (clústeres)", Network]] as const).map(([k, label, Icon]) => (
                <button key={k} onClick={() => setGraphKind(k)} className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-[13px] transition-all"
                  style={graphKind === k ? { backgroundColor: `${C.teal}24`, border: `1px solid ${C.teal}`, color: "#fff", fontWeight: 600 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>

            {graphKind === "red" && <CertNetworkGraph certs={all.filter(c => c.cloud === "Microsoft")} />}

            {graphKind === "linear" && (<>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: `${C.ink}66` }}>Intereses del mercado</p>
            <div className="flex flex-wrap gap-2 mb-7">
              {TRACKS.map(t => {
                const on = t.id === trackId;
                return (
                  <button key={t.id} onClick={() => setTrackId(t.id)} className="px-3.5 h-9 rounded-full text-[13px] transition-all"
                    style={on ? { backgroundColor: C.violetBtn, color: "#fff", fontFamily: D, fontWeight: 600 } : { backgroundColor: C.card, border: `1px solid ${C.ink}1f`, color: C.inkSoft }}>
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl p-6 relative" style={{ background: `radial-gradient(130% 150% at 0% 0%, ${C.violet}16, ${C.bgAlt})`, border: `1px solid ${C.ink}14` }}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-7">
                <div className="max-w-lg">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5 inline-flex items-center gap-2" style={{ color: C.teal }}><Sparkles className="w-3.5 h-3.5" /> Ruta acelerada</p>
                  <h2 className="text-xl sm:text-2xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{track.name}</h2>
                  <p className="text-[13px] mt-1.5 leading-relaxed" style={{ color: C.inkSoft }}>{track.desc}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { l: "Pasos", v: String(route.chosen.length) },
                    { l: "Módulos", v: String(route.M) },
                    { l: "Horas oficiales", v: `${route.H} h` },
                    { l: "Con CloudBooks", v: `${route.cb} h`, hi: true },
                  ].map(s => (
                    <div key={s.l} className="rounded-xl px-3.5 py-2 text-center min-w-[84px]" style={{ backgroundColor: C.bg, border: `1px solid ${s.hi ? `${C.green}55` : `${C.ink}14`}` }}>
                      <p className="leading-none" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.15rem", color: s.hi ? C.green : C.ink }}>{s.v}</p>
                      <p className="font-mono text-[9px] uppercase tracking-[0.14em] mt-1" style={{ color: `${C.ink}55` }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {route.chosen.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm" style={{ color: C.inkSoft }}>Las certificaciones de este interés no están en el catálogo actual.</p>
              ) : (
                <>
                  <div className="cb-scroll flex items-stretch overflow-x-auto pt-4 pb-9 px-4">
                    {route.chosen.map((c, i) => {
                      const lc = LEVEL_COLOR[c.level] ?? C.inkSoft;
                      return (
                        <div key={c.code} className="flex items-center shrink-0">
                          <div className="relative rounded-2xl p-4 w-[212px] h-[150px] flex flex-col" style={{ backgroundColor: C.card, border: `1px solid ${lc}45`, boxShadow: `0 12px 26px -20px ${lc}` }}>
                            <span className="absolute -top-3 -left-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px]" style={{ background: lc, color: "#0a0a0e", fontFamily: D, fontWeight: 700 }}>{i + 1}</span>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-mono text-[13px] whitespace-nowrap" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{c.code}</span>
                              <span className="text-[9px] uppercase tracking-wide shrink-0" style={{ color: lc }}>{c.level}</span>
                            </div>
                            <p className="text-[12px] leading-snug line-clamp-3 flex-1" style={{ color: C.inkSoft }}>{c.title}</p>
                            <div className="flex items-center gap-3 text-[11px] mt-2" style={{ color: C.ink }}>
                              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" style={{ color: C.bright }} /> {certHours(c)} h</span>
                              <span className="inline-flex items-center gap-1"><Layers className="w-3.5 h-3.5" style={{ color: C.bright }} /> {certModules(c)}</span>
                            </div>
                          </div>
                          <div className="w-8 flex items-center justify-center shrink-0"><ArrowRight className="w-5 h-5" style={{ color: i < route.chosen.length - 1 ? `${C.ink}40` : C.gold }} /></div>
                        </div>
                      );
                    })}
                    <div className="shrink-0 self-stretch rounded-2xl p-4 w-[200px] flex flex-col justify-center" style={{ background: `linear-gradient(150deg, #fde68a, ${C.gold} 55%, #b45309)`, color: "#3b1d00", boxShadow: `0 12px 28px -18px ${C.gold}` }}>
                      <span className="font-mono text-[9px] uppercase tracking-[0.2em]">Certificado</span>
                      <span className="mt-1" style={{ fontFamily: D, fontWeight: 700, fontSize: "1.7rem", lineHeight: 1 }}>{route.cb} h</span>
                      <span className="text-[11px] mt-0.5">con CloudBooks</span>
                      <span className="text-[11px] mt-2 font-semibold">Ahorrás {route.saved} h (−{(route.r * 100).toFixed(0)}%)</span>
                    </div>
                  </div>

                  <p className="text-[12px] mt-4" style={{ color: C.inkSoft }}>
                    Preparación autodidacta estimada: <strong style={{ color: C.ink }}>{route.H} h</strong> · con CloudBooks: <strong style={{ color: C.green }}>{route.cb} h</strong>. <button onClick={() => setMethodOpen(true)} className="underline underline-offset-2" style={{ color: C.bright }}>¿Cómo se calcula?</button>
                  </p>
                </>
              )}
            </div>
            </>)}
            </>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL: agregar certificación ── */}
      {adding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setAdding(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.65)", backdropFilter: "blur(4px)" }} />
          <form onClick={e => e.stopPropagation()} onSubmit={save} className="relative w-full max-w-[560px] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Nueva certificación</h2>
              <button type="button" onClick={() => setAdding(false)} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-code" className="text-[12px]" style={{ color: C.inkSoft }}>Código *</label>
                <input id="f-code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ej. AZ-204" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-cloud" className="text-[12px]" style={{ color: C.inkSoft }}>Nube</label>
                <select id="f-cloud" value={form.cloud} onChange={e => setForm(f => ({ ...f, cloud: e.target.value }))} className={inputCls} style={selStyle}>
                  {CLOUDS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-title" className="text-[12px]" style={{ color: C.inkSoft }}>Título *</label>
                <input id="f-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Ej. Azure Developer Associate" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-area" className="text-[12px]" style={{ color: C.inkSoft }}>Área / categoría</label>
                <select id="f-area" value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} className={inputCls} style={selStyle}>
                  {CERT_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-level" className="text-[12px]" style={{ color: C.inkSoft }}>Nivel de exigencia</label>
                <select id="f-level" value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className={inputCls} style={selStyle}>
                  {CERT_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-hours" className="text-[12px]" style={{ color: C.inkSoft }}>Horas oficiales <span style={{ color: `${C.ink}55` }}>(MS Learn)</span></label>
                <input id="f-hours" type="number" min={0} value={form.hours ?? ""} onChange={e => setForm(f => ({ ...f, hours: e.target.value === "" ? undefined : Number(e.target.value) }))} className={inputCls} style={inputStyle} placeholder="Si lo dejás vacío, se estima por nivel" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-modules" className="text-[12px]" style={{ color: C.inkSoft }}>Módulos / secciones</label>
                <input id="f-modules" type="number" min={0} value={form.modules ?? ""} onChange={e => setForm(f => ({ ...f, modules: e.target.value === "" ? undefined : Number(e.target.value) }))} className={inputCls} style={inputStyle} placeholder="Si lo dejás vacío, se estima por nivel" />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-status" className="text-[12px]" style={{ color: C.inkSoft }}>Estado</label>
                <select id="f-status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls} style={selStyle}>
                  {CERT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-note" className="text-[12px]" style={{ color: C.inkSoft }}>Nota <span style={{ color: `${C.ink}55` }}>(transición, prerrequisitos, aclaraciones)</span></label>
                <textarea id="f-note" rows={3} value={form.note ?? ""} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="rounded-lg px-3 py-2.5 text-sm outline-none transition-colors resize-y focus-visible:ring-2 focus-visible:ring-violet-500/60" style={inputStyle} placeholder="Ej. Reemplaza a la certificación X a partir de…" />
              </div>
            </div>

            {formErr && <p className="text-[12px] mt-4 rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{formErr}</p>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button type="button" onClick={() => setAdding(false)} className="px-4 h-10 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cancelar</button>
              <button type="submit" className="inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><Plus className="w-4 h-4" /> Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL: metodología del ahorro ── */}
      {methodOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setMethodOpen(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.65)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[600px] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg tracking-tight inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><TrendingDown className="w-4 h-4" style={{ color: C.teal }} /> Metodología del ahorro</h2>
              <button onClick={() => setMethodOpen(false)} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>

            <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.inkSoft }}>
              El tiempo oficial de preparación asume autoestudio sobre fuentes fragmentadas (documentación, cursos, dumps). CloudBooks reduce ese tiempo por cuatro vías concretas:
            </p>
            <ul className="text-[13px] leading-relaxed mb-5 flex flex-col gap-2.5" style={{ color: C.ink }}>
              {[
                ["Fuente única curada", "Una sola colección alineada al temario; sin saltar entre materiales ni reconciliar versiones."],
                ["Poda de redundancia", "Se elimina contenido repetido y de bajo rendimiento para el examen."],
                ["Ruta estructurada", "Secuencia por dominios que evita repasar lo ya dominado."],
                ["Recuerdo activo + repaso espaciado", "Question Bank y Rapid Review elevan la retención por hora estudiada."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-2.5"><Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: C.teal }} /><span><strong>{t}</strong> — <span style={{ color: C.inkSoft }}>{d}</span></span></li>
              ))}
            </ul>

            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}14` }}>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: `${C.ink}66` }}>Modelo</p>
              <p className="font-mono text-[13px]" style={{ color: C.bright }}>r(H) = 0.25 + 0.05·(1 − e^(−H/45))</p>
              <p className="font-mono text-[13px] mt-1" style={{ color: C.bright }}>ahorro = H · r(H)</p>
              <p className="text-[12px] mt-3 leading-relaxed" style={{ color: C.inkSoft }}>
                No es lineal a propósito: el ahorro marginal <strong style={{ color: C.ink }}>crece con el volumen</strong> de horas (más material → más redundancia y reorganización aprovechable) pero <strong style={{ color: C.ink }}>satura</strong> hacia un techo, porque hay un núcleo de estudio irreducible. Por eso queda <strong style={{ color: C.ink }}>acotado entre 25% y 30%</strong>: ~25% en rutas cortas, ~30% en rutas largas. La escala τ = 45 h marca a qué volumen se alcanza la mitad del rango.
              </p>
            </div>

            <p className="text-[11px] leading-relaxed flex items-start gap-2" style={{ color: `${C.ink}66` }}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: C.teal }} />
              Rango conservador y resultado estimado: varía por persona y base previa. Las horas oficiales son estimadas por nivel salvo que cargues el dato oficial de Microsoft Learn por certificación.
            </p>

            <div className="flex justify-end mt-5">
              <button onClick={() => setMethodOpen(false)} className="px-5 h-10 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: cambios del sync con el póster oficial ── */}
      {syncPanel && syncLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setSyncPanel(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.65)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[640px] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg tracking-tight inline-flex items-center gap-2" style={{ fontFamily: D, fontWeight: 700 }}><CloudDownload className="w-4 h-4" style={{ color: C.teal }} /> Sync con el póster oficial</h2>
              <button onClick={() => setSyncPanel(false)} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: C.inkSoft }}>
              {fmtSyncDate(syncLog.ranAt)} · {syncLog.trigger === "scheduler" ? "automático (mensual)" : "manual"} · {syncLog.passes} lecturas de visión · {syncLog.extractedUnion} códigos leídos, {syncLog.confirmed} confirmados.
            </p>

            {syncLog.error && (
              <div className="rounded-xl px-4 py-3 mb-4 text-[13px] flex items-start gap-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>{syncLog.error}</span>
              </div>
            )}

            {/* Altas aplicadas */}
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2 inline-flex items-center gap-1.5" style={{ color: C.green }}>
                <PlusCircle className="w-3.5 h-3.5" /> Altas nuevas (aplicadas · status «Nuevo») · {syncLog.added.length}
              </p>
              {syncLog.added.length === 0 ? (
                <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Sin altas nuevas en esta corrida.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {syncLog.added.map(a => (
                    <div key={a.code} className="rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.green}33` }}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{a.code}</span>
                        {a.level && <span className="text-[10px]" style={{ color: C.bright }}>{a.level}</span>}
                        {a.title && <span className="text-[12px] truncate flex-1" style={{ color: C.inkSoft }}>{a.title}</span>}
                        <button onClick={() => doDiscard(a.code)} disabled={discarding === a.code} title="Descartar esta alta (sacarla del catálogo)" className="ml-auto inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full transition-colors hover:bg-white/5 disabled:opacity-50" style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.35)" }}>
                          <Trash2 className="w-3 h-3" /> {discarding === a.code ? "…" : "Descartar"}
                        </button>
                      </div>
                      <p className="text-[11px] mt-1 leading-snug" style={{ color: `${C.ink}66` }}>{a.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Candidatas a retiro: no aparecieron en el póster (PROPUESTA — el humano confirma con botón) */}
            <div className="mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2 inline-flex items-center gap-1.5" style={{ color: C.gold }}>
                <AlertTriangle className="w-3.5 h-3.5" /> No aparecieron en el póster — retirá si corresponde · {(syncLog.retired ?? []).length}
              </p>
              {(syncLog.retired ?? []).length === 0 ? (
                <p className="text-[12px]" style={{ color: `${C.ink}55` }}>Todas las certificaciones vigentes del catálogo aparecieron en el póster.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => doRetireAll((syncLog.retired ?? []).map(m => m.code))} disabled={retiring === "*"} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 h-7 text-[11px] font-semibold transition-colors hover:bg-white/5 disabled:opacity-40" style={{ color: "#fb923c", border: `1px solid #fb923c55` }}><AlertTriangle className="w-3.5 h-3.5" />{retiring === "*" ? "Retirando…" : `Retirar todas (${(syncLog.retired ?? []).length})`}</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(syncLog.retired ?? []).map(m => (
                      <span key={m.code} title={m.note} className="inline-flex items-center gap-1.5 rounded-full pl-2 pr-1 py-0.5 text-[11px]" style={{ backgroundColor: `${C.gold}14`, border: `1px solid ${C.gold}40`, color: C.gold }}>
                        <span className="font-mono" style={{ fontWeight: 700 }}>{m.code}</span>
                        <button onClick={() => doRetire(m.code)} disabled={retiring === m.code || retiring === "*"} title="Retirar (baja suave reversible)" className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-white/10 disabled:opacity-40" style={{ color: "#fb923c" }}><AlertTriangle className="w-3 h-3" />{retiring === m.code ? "…" : "Retirar"}</button>
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] mt-2 leading-relaxed flex items-start gap-1.5" style={{ color: `${C.ink}66` }}>
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: C.teal }} />
                    No se retira nada solo: vos confirmás. La baja es suave y reversible (vuelve a «Activo» con "Reactivar" en la tabla). Nunca se borra el cert.
                  </p>
                </>
              )}
            </div>

            {/* Posibles misreads (confirmados pero adyacentes a un code existente → NO agregados) */}
            {syncLog.suspectMisread?.length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2 inline-flex items-center gap-1.5" style={{ color: "#f87171" }}>
                  <AlertTriangle className="w-3.5 h-3.5" /> Posible mala lectura (NO agregados) · {syncLog.suspectMisread.length}
                </p>
                <div className="flex flex-col gap-2">
                  {syncLog.suspectMisread.map(s => (
                    <div key={s.code} className="rounded-lg px-3 py-2" style={{ backgroundColor: C.bg, border: "1px solid rgba(248,113,113,0.28)" }}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px]" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{s.code}</span>
                        {s.title && <span className="text-[12px] truncate" style={{ color: C.inkSoft }}>{s.title}</span>}
                      </div>
                      <p className="text-[11px] mt-1 leading-snug" style={{ color: `${C.ink}66` }}>{s.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No confirmadas (ruido de visión) */}
            {syncLog.unconfirmed.length > 0 && (
              <div className="mb-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] mb-2 inline-flex items-center gap-1.5" style={{ color: `${C.ink}66` }}>
                  <Eye className="w-3.5 h-3.5" /> Leídas 1 sola vez (ignoradas, probable ruido) · {syncLog.unconfirmed.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {syncLog.unconfirmed.map(u => (
                    <span key={u.code} title={u.note} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-mono" style={{ backgroundColor: `${C.ink}0e`, border: `1px solid ${C.ink}22`, color: `${C.ink}77` }}>{u.code}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-5">
              <button onClick={() => setSyncPanel(false)} className="px-5 h-10 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: actualizar catálogo (import combina, no borra) ── */}
      {updating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setUpdating(false)}>
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(6,6,10,0.65)", backdropFilter: "blur(4px)" }} />
          <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[600px] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}1f` }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Actualizar catálogo</h2>
              <button onClick={() => setUpdating(false)} aria-label="Cerrar" className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: C.inkSoft }}><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[13px] leading-relaxed mb-4" style={{ color: C.inkSoft }}>
              Pegá o subí un <strong style={{ color: C.ink }}>JSON</strong> (arreglo de certificaciones). Se hace <strong style={{ color: C.bright }}>upsert por código</strong>: agrega las nuevas y actualiza las existentes — <strong style={{ color: C.ink }}>nunca borra</strong> lo previamente cargado, así no se pierde lo asociado en las fichas.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <label className="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm cursor-pointer transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
                <Upload className="w-4 h-4" /> Subir .json
                <input type="file" accept="application/json,.json" onChange={onImportFile} className="hidden" />
              </label>
              <span className="text-[11px]" style={{ color: `${C.ink}55` }}>o pegá el contenido abajo</span>
            </div>

            <textarea value={importText} onChange={e => { setImportText(e.target.value); setImportMsg(""); }} rows={8} spellCheck={false}
              placeholder={'[\n  { "code": "AZ-204", "title": "Azure Developer Associate", "cloud": "Microsoft", "area": "Cloud & AI Platforms", "level": "Associate", "status": "Activo", "note": "" }\n]'}
              className="w-full rounded-xl px-3.5 py-3 text-[12px] font-mono outline-none transition-colors resize-y focus-visible:ring-2 focus-visible:ring-violet-500/60"
              style={{ backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink }} />

            {importMsg && <p className="text-[12px] mt-3 rounded-lg px-3 py-2" style={{ color: C.teal, backgroundColor: `${C.teal}14`, border: `1px solid ${C.teal}33` }}>{importMsg}</p>}

            <p className="text-[11px] leading-relaxed mt-4 flex items-start gap-2" style={{ color: `${C.ink}66` }}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: C.teal }} />
              El grounding automático al póster oficial de Microsoft (o de AWS / Google Cloud) se ejecuta del lado del servidor; acá podés combinar manualmente un export sin riesgo de perder datos.
            </p>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button onClick={() => setUpdating(false)} className="px-4 h-10 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>Cerrar</button>
              <button onClick={doImport} disabled={!importText.trim()} className="inline-flex items-center gap-2 text-white px-5 h-10 rounded-full text-sm transition-all hover:brightness-110 disabled:opacity-50" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}><RefreshCw className="w-4 h-4" /> Importar (combinar)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
