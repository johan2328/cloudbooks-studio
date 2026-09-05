import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion, useReducedMotion, useInView, type Variants } from "framer-motion";
import {
  ArrowRight, ArrowUpRight, Star, Check, CheckCircle2, ShieldCheck, Clock, BadgeCheck,
  BookOpen, Map, Crosshair, ListChecks, Zap, FlagTriangleRight,
  Database, Layers, Edit3, Eye, Shield, Package as Pkg, Search, RefreshCw,
  Route, Shapes, TrendingUp, Globe, Cloud, ShoppingCart, X, Lightbulb,
} from "lucide-react";
import { FaAws } from "react-icons/fa6";
import { VscAzure } from "react-icons/vsc";
import { SiGooglecloud } from "react-icons/si";
import { BookCover } from "@/components/book-cover";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";

/* ════════════════════════════════════════════════════════════════════════════
   LANDING V9 — refinamiento de v8 (negro)
   · Logos reales de proveedores (AWS, Azure, Google Cloud)
   · Metodología como PIPELINE narrado del proceso de producción + sello grande
   · Sin micro-texto, sin doble numeración, sin SVG dibujado a mano
   · Botón primario con menos fuerza · glows reducidos
   Idea de negocio (sin material concreto). ⚠️ // TODO_REAL donde aplique.  /v9
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.6)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", sky: "#38bdf8", amber: "#fbbf24", green: "#34d399",
  bright: "#c4b5fd", gold: "#fbbf24",
  deep: "linear-gradient(160deg,#7c3aed,#2563eb 60%,#111827)", deepText: "#eef2ff",
};
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } } };
const up: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
/* revelado con blur que "cae" hacia abajo (hacia la validación final) */
const blurDown: Variants = { hidden: { opacity: 0, y: -20, filter: "blur(8px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.75, ease: EASE } } };
const staggerDown: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.16, delayChildren: 0.05 } } };

const PRICE = { book: "5.99", pack: "19.99", packFull: "35.94" };
const SOC = { rating: "4.9", reviews: "180+", students: "1.440+", passRate: "92%", weeks: "3–4" }; // TODO_REAL (estudiantes −40%)

const FAQ = [
  { q: "¿El contenido está actualizado?", a: "Sí. Mientras la certificación esté vigente, si cambia reeditamos los libros y te los reenviamos sin costo (~1 semana)." },
  { q: "¿Está en español?", a: "Todo el contenido está en español (LATAM). Pronto disponible en inglés." },
  { q: "¿Me sirve para aprobar el examen?", a: "Cada colección cubre el temario oficial en seis formatos, auditados por un humano con un score de calidad superior a 9.7." },
  { q: "¿Puedo comprar un solo formato?", a: "Sí. Cada formato cuesta USD 5.99, o llévate el Collection Pack completo a USD 19.99." },
  { q: "¿Cómo recibo los libros?", a: "Acceso digital inmediato tras la compra, en cada uno de los formatos de la colección." },
  { q: "¿Qué certificaciones cubren?", a: "Empezamos por Azure. AWS y Google Cloud están en el roadmap del catálogo." },
];

const FORMATS = [
  { n: "01", icon: BookOpen,          label: "Master Book",   tag: "Aprendizaje profundo", color: C.blue,   desc: "Libro completo. Dominios, servicios y arquitectura." },
  { n: "02", icon: Map,               label: "Visual Atlas",  tag: "Estudio visual",        color: C.violet, desc: "Infografías, mapas de decisión y comparaciones." },
  { n: "03", icon: Crosshair,         label: "Exam Traps",    tag: "Criterio de examen",    color: C.teal,   desc: "Trampas, distractores y señales de respuesta." },
  { n: "04", icon: ListChecks,        label: "Question Bank", tag: "Práctica",              color: C.sky,    desc: "Preguntas con razonamiento y dificultad progresiva." },
  { n: "05", icon: Zap,               label: "Cheat Sheets",  tag: "Repaso",                color: C.amber,  desc: "Tablas de decisión, límites y señales rápidas." },
  { n: "06", icon: FlagTriangleRight, label: "Rapid Review",  tag: "Cierre",                color: C.green,  desc: "Checklist y mapas de memoria pre-examen." },
];

const PROVIDERS = [
  { name: "Microsoft Azure",     short: "Azure", Logo: VscAzure,      color: "#38bdf8", q: 100, status: "Disponible" },
  { name: "Amazon Web Services", short: "AWS",   Logo: FaAws,         color: "#FF9900", q: 100, status: "Disponible" },
  { name: "Google Cloud",        short: "GCP",   Logo: SiGooglecloud, color: "#34d399", q: 62,  status: "En curso" },
];

/* Dominios de la batería de agentes (múltiples agentes por dominio) */
const DOMAINS = [
  { label: "Conocimiento", color: "#3b82f6", role: "Fuentes oficiales, verificación de datos y arquitectura de aprendizaje." },
  { label: "Creación",     color: "#8b5cf6", role: "Voz editorial, narrativa, layout y dirección de arte." },
  { label: "Calidad",      color: "#2dd4bf", role: "Auditoría adversarial, scoring multidimensional y build final." },
];

/* El viaje de un libro — capítulos con handoff entre agentes */
const JOURNEY = [
  { act: "Acto I · Conocimiento", n: "01", agent: "Grounding",     icon: Database, color: "#3b82f6", what: "Reúne la documentación oficial del proveedor y verifica cada dato. Nada inventado.", handoff: "Le entrega una base verificada a", to: "Pedagogy" },
  { act: "Acto I · Conocimiento", n: "02", agent: "Pedagogy",      icon: Route,    color: "#3b82f6", what: "Diseña los objetivos de aprendizaje y traza la ruta de estudio que sí lleva a aprobar.", handoff: "Pasa el plan a", to: "Editorial" },
  { act: "Acto II · Creación",    n: "03", agent: "Editorial",     icon: Edit3,    color: "#8b5cf6", what: "Escribe con voz clara y estructura narrativa, no como un manual frío.", handoff: "Entrega el texto a", to: "Visual" },
  { act: "Acto II · Creación",    n: "04", agent: "Visual",        icon: Shapes,   color: "#8b5cf6", what: "Diseña layout, diagramas, color y tipografía para que entiendas en segundos.", handoff: "Manda la pieza a", to: "QA / Red Team" },
  { act: "Acto III · Calidad",    n: "05", agent: "QA / Red Team", icon: Shield,   color: "#2dd4bf", what: "Ataca el libro como si fuera el examen: busca errores y trampas, y le pone score.", handoff: "Si supera el umbral, lo arma", to: "Production" },
  { act: "Acto III · Calidad",    n: "06", agent: "Production",    icon: Pkg,      color: "#2dd4bf", what: "Genera y exporta el libro en cada uno de los seis formatos de la colección.", handoff: "Lo eleva al", to: "Editor humano" },
];

/* El director — secciones orquestadas hacia la firma humana */
const SECTIONS = [
  { act: "Conocimiento", color: "#3b82f6", agents: [{ icon: Database, name: "Grounding" }, { icon: Route, name: "Pedagogy" }], desc: "Grounding reúne y verifica las fuentes oficiales; Pedagogy traza la ruta de estudio que lleva a aprobar." },
  { act: "Creación",     color: "#8b5cf6", agents: [{ icon: Edit3, name: "Editorial" }, { icon: Shapes, name: "Visual" }], desc: "Editorial le da voz y estructura; Visual lo convierte en diagramas, color y tipografía para entender más rápido." },
  { act: "Calidad",      color: "#2dd4bf", agents: [{ icon: Shield, name: "QA / Red Team" }, { icon: Pkg, name: "Production" }], desc: "QA / Red Team ataca el libro buscando errores y le pone score; Production lo exporta en cada formato." },
];

/* Metodología editorial — dominios × agentes (estructura original, explicable) */
const METHOD = [
  { label: "Conocimiento", color: "#3b82f6", agents: [
    { icon: Database, name: "Grounding", role: "Trazabilidad técnica", desc: "Documentación oficial del proveedor, validación de fuentes y verificación del contenido base." },
    { icon: Route, name: "Pedagogy", role: "Arquitectura de aprendizaje", desc: "Diseño de objetivos, secuencia de contenido y rutas de estudio progresivas." },
  ] },
  { label: "Creación", color: "#8b5cf6", agents: [
    { icon: Edit3, name: "Editorial", role: "Voz y narrativa", desc: "Coherencia editorial, estructura narrativa y formato específico por colección." },
    { icon: Shapes, name: "Visual", role: "Dirección de arte", desc: "Layout, paleta, tipografía e iconografía. Aplicación rigurosa del contrato visual." },
  ] },
  { label: "Calidad", color: "#2dd4bf", agents: [
    { icon: Shield, name: "QA / Red Team", role: "Validación adversarial", desc: "Auditoría técnica, detección de errores y scoring multidimensional superior a 9.7." },
    { icon: Pkg, name: "Production", role: "Build y exportación", desc: "Generación final, exportación por formato y trazabilidad completa." },
  ] },
];

/* Red neuronal de agentes — nodos por dominio + sinapsis hacia el veredicto */
const NET = (() => {
  const W = 560, H = 230, per = 4;
  const layerX = [70, 235, 400];
  const colors = ["#3b82f6", "#8b5cf6", "#2dd4bf"];
  const nodes: { x: number; y: number; layer: number; color: string }[] = [];
  layerX.forEach((x, li) => {
    for (let r = 0; r < per; r++) {
      const y = 32 + r * ((H - 64) / (per - 1));
      nodes.push({ x, y, layer: li, color: colors[li] });
    }
  });
  const outX = W, outY = H / 2;
  const edges: { x1: number; y1: number; x2: number; y2: number; layer: number; color: string }[] = [];
  for (let li = 0; li < layerX.length - 1; li++) {
    const a = nodes.filter(n => n.layer === li);
    const b = nodes.filter(n => n.layer === li + 1);
    a.forEach(p => b.forEach(q => edges.push({ x1: p.x, y1: p.y, x2: q.x, y2: q.y, layer: li, color: colors[li] })));
  }
  nodes.filter(n => n.layer === layerX.length - 1).forEach(p => edges.push({ x1: p.x, y1: p.y, x2: outX, y2: outY, layer: 2, color: colors[2] }));
  return { W, H, nodes, edges, layerX, colors, outX, outY };
})();

/* Manifiesto del método — frases punzantes por agente */
const STEPS = [
  { n: "01", name: "Grounding",     domain: "Conocimiento", color: "#3b82f6", statement: "Cero invención. Cada dato, verificado en la fuente oficial." },
  { n: "02", name: "Pedagogy",      domain: "Conocimiento", color: "#3b82f6", statement: "Una ruta que lleva a aprobar, no a perderte." },
  { n: "03", name: "Editorial",     domain: "Creación",     color: "#8b5cf6", statement: "Escrito para entenderse, no para impresionar." },
  { n: "04", name: "Visual",        domain: "Creación",     color: "#8b5cf6", statement: "Diseñado para que entiendas en segundos." },
  { n: "05", name: "QA / Red Team", domain: "Calidad",      color: "#2dd4bf", statement: "Atacamos el libro como si fuéramos el examen." },
  { n: "06", name: "Production",    domain: "Calidad",      color: "#2dd4bf", statement: "Listo para estudiar, en todos los formatos." },
];

/* Pipeline de producción (proceso narrado) */
const PIPELINE = [
  { icon: Database, name: "Grounding",     domain: "Conocimiento", color: C.blue,   desc: "Partimos de la documentación oficial y verificamos cada dato. Nada inventado.", next: "Con la base sólida, diseñamos cómo se aprende." },
  { icon: Route,    name: "Pedagogy",      domain: "Conocimiento", color: C.blue,   desc: "Ordenamos el contenido en una ruta de estudio que de verdad lleva a aprobar.", next: "Con la ruta trazada, empieza la escritura." },
  { icon: Edit3,    name: "Editorial",     domain: "Creación",     color: C.violet, desc: "Lo escribimos con voz clara y estructura, no como un manual frío.", next: "El texto cobra forma visual." },
  { icon: Shapes,   name: "Visual",        domain: "Creación",     color: C.violet, desc: "Diseñamos cada página —diagramas, color y tipografía— para que entiendas más rápido.", next: "Antes de publicar, lo ponemos a prueba." },
  { icon: Shield,   name: "QA / Red Team", domain: "Calidad",      color: C.teal,   desc: "Atacamos el libro buscando errores y trampas antes de que lo haga el examen.", next: "Si supera el umbral de calidad, se construye." },
  { icon: Pkg,      name: "Production",    domain: "Calidad",      color: C.teal,   desc: "Lo dejamos listo para estudiar, exportado en cada formato.", next: "Y nada se publica sin el visto bueno humano." },
];

/* ── El Reactor: red neuronal de agentes en canvas (cinemático) ─────────────── */
function Reactor({ reduce, hoverDom }: { reduce: boolean; hoverDom: number | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hoverRef = useRef<number | null>(hoverDom);
  useEffect(() => { hoverRef.current = hoverDom; }, [hoverDom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const colors = ["#3b82f6", "#8b5cf6", "#2dd4bf"];
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    type N = { bx: number; by: number; r: number; layer: number; phase: number };
    const nodes: N[] = [];
    const centers = [{ x: 0.17, y: 0.5 }, { x: 0.45, y: 0.5 }, { x: 0.72, y: 0.5 }];
    centers.forEach((c, li) => {
      for (let i = 0; i < 8; i++) {
        const ang = rnd(0, Math.PI * 2), rad = rnd(0.05, 0.2);
        nodes.push({ bx: c.x + Math.cos(ang) * rad * 0.7, by: c.y + Math.sin(ang) * rad * 1.25, r: rnd(2.2, 4), layer: li, phase: rnd(0, Math.PI * 2) });
      }
    });
    const coreN = { x: 0.92, y: 0.5 };

    type E = { a: number; b: number; layer: number };
    const edges: E[] = [];
    for (let li = 0; li < 2; li++) {
      const A = nodes.map((n, i) => ({ n, i })).filter(o => o.n.layer === li);
      const B = nodes.map((n, i) => ({ n, i })).filter(o => o.n.layer === li + 1);
      A.forEach(a => { for (let k = 0; k < 2; k++) { const b = B[Math.floor(rnd(0, B.length))]; edges.push({ a: a.i, b: b.i, layer: li }); } });
    }
    nodes.forEach((n, i) => { if (n.layer === 2 && Math.random() < 0.7) edges.push({ a: i, b: -1, layer: 2 }); });

    type S = { e: number; t: number; sp: number };
    const sigs: S[] = [];
    let spawn = 0, flare = 0, last = 0, raf = 0, W = 0, H = 0, dpr = 1, alive = true;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (ev: MouseEvent) => { const rect = canvas.getBoundingClientRect(); mouse.tx = (ev.clientX - rect.left) / rect.width; mouse.ty = (ev.clientY - rect.top) / rect.height; };
    const onLeave = () => { mouse.tx = 0.5; mouse.ty = 0.5; };
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", resize);

    const bez = (a: { x: number; y: number }, b: { x: number; y: number }, t: number) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 22, it = 1 - t;
      return { x: it * it * a.x + 2 * it * t * mx + t * t * b.x, y: it * it * a.y + 2 * it * t * my + t * t * b.y };
    };

    const frame = (time: number) => {
      const dt = Math.min((time - (last || time)) / 1000, 0.05); last = time;
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      const ox = mouse.x - 0.5, oy = mouse.y - 0.5, hov = hoverRef.current;
      ctx.clearRect(0, 0, W, H);

      const pos = nodes.map(n => {
        const fx = Math.sin(time * 0.0004 + n.phase) * 0.006, fy = Math.cos(time * 0.00045 + n.phase) * 0.006, par = 12 + n.layer * 10;
        return { x: (n.bx + fx) * W + ox * par, y: (n.by + fy) * H + oy * par };
      });
      const core = { x: coreN.x * W + ox * 8, y: coreN.y * H + oy * 8 };
      const getB = (e: E) => (e.b === -1 ? core : pos[e.b]);

      edges.forEach(e => {
        const a = pos[e.a], b = getB(e), dim = hov !== null && hov !== e.layer;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 22;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = colors[e.layer]; ctx.globalAlpha = dim ? 0.04 : 0.13; ctx.lineWidth = 1; ctx.stroke();
      });
      ctx.globalAlpha = 1;

      if (!reduce) {
        spawn -= dt;
        if (spawn <= 0) {
          spawn = rnd(0.08, 0.16);
          let pool = edges.map((_, i) => i);
          if (hov !== null) { const pf = pool.filter(i => edges[i].layer === hov); if (pf.length) pool = pf; }
          sigs.push({ e: pool[Math.floor(rnd(0, pool.length))], t: 0, sp: rnd(0.5, 0.9) });
        }
      }
      for (let i = sigs.length - 1; i >= 0; i--) {
        const s = sigs[i]; s.t += s.sp * dt; const e = edges[s.e];
        if (s.t >= 1) { if (e.b === -1) flare = 1; sigs.splice(i, 1); continue; }
        const p = bez(pos[e.a], getB(e), s.t), dim = hov !== null && hov !== e.layer;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = colors[e.layer]; ctx.globalAlpha = dim ? 0.25 : 1; ctx.shadowBlur = 12; ctx.shadowColor = colors[e.layer]; ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }

      pos.forEach((p, i) => {
        const n = nodes[i], dim = hov !== null && hov !== n.layer, r = n.r * (1 + Math.sin(time * 0.002 + n.phase) * 0.12);
        ctx.beginPath(); ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2); ctx.strokeStyle = colors[n.layer]; ctx.globalAlpha = dim ? 0.12 : 0.45; ctx.lineWidth = 1.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = colors[n.layer]; ctx.globalAlpha = dim ? 0.3 : 1; ctx.shadowBlur = 12; ctx.shadowColor = colors[n.layer]; ctx.fill(); ctx.shadowBlur = 0;
      });
      ctx.globalAlpha = 1;

      flare = Math.max(0, flare - dt * 1.8);
      const halo = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, 46 + flare * 34);
      halo.addColorStop(0, `rgba(251,191,36,${0.3 + flare * 0.4})`); halo.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(core.x, core.y, 46 + flare * 34, 0, Math.PI * 2); ctx.fill();
      const cr = 11 + Math.sin(time * 0.003) * 1.2 + flare * 6;
      ctx.beginPath(); ctx.arc(core.x, core.y, cr, 0, Math.PI * 2); ctx.fillStyle = "#fbbf24"; ctx.shadowBlur = 24; ctx.shadowColor = "#fbbf24"; ctx.fill(); ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(core.x, core.y, cr, 0, Math.PI * 2); ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = "center"; ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillStyle = "rgba(251,191,36,0.85)"; ctx.fillText("HUMAN AUDIT", core.x, core.y + cr + 16);
      ctx.fillStyle = "rgba(251,191,36,0.5)"; ctx.fillText("QA 9.7+", core.x, core.y + cr + 28);

      if (alive && !reduce) raf = requestAnimationFrame(frame);
    };

    if (reduce) frame(0); else raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(ents => ents.forEach(e => {
      if (e.isIntersecting) { if (!reduce && !raf) { alive = true; last = 0; raf = requestAnimationFrame(frame); } }
      else { alive = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    }), { threshold: 0.05 });
    io.observe(canvas);

    return () => { alive = false; if (raf) cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("resize", resize); canvas.removeEventListener("mousemove", onMove); canvas.removeEventListener("mouseleave", onLeave); };
  }, [reduce]);

  return <canvas ref={canvasRef} className="block w-full h-full" />;
}

/* ── "El Sello": coreografía de aprobación (se estampa una vez) ──────────────── */
function Sello({ reduce }: { reduce: boolean }) {
  const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
  const dots = [
    { x: 13, c: "#3b82f6", label: "Conocimiento", delay: 0.25 },
    { x: 39, c: "#8b5cf6", label: "Creación", delay: 0.6 },
    { x: 65, c: "#2dd4bf", label: "Calidad", delay: 0.95 },
  ];
  return (
    <div className="absolute inset-0">
      {/* haz que hila los dominios */}
      <div className="absolute left-[9%] right-[12%] top-1/2 h-[2px] rounded-full overflow-hidden" style={{ marginTop: -1, backgroundColor: "rgba(243,243,246,0.08)" }}>
        <motion.div className="h-full w-full origin-left rounded-full" style={{ background: "linear-gradient(90deg,#3b82f6,#8b5cf6,#2dd4bf,#fbbf24)" }}
          initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: 1 }} transition={{ duration: reduce ? 0 : 1.4, ease }} />
      </div>
      {/* nodos por dominio */}
      {dots.map((d, i) => (
        <div key={i} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${d.x}%` }}>
          <motion.div className="flex flex-col items-center"
            initial={{ opacity: reduce ? 1 : 0, scale: reduce ? 1 : 0.4 }} animate={{ opacity: 1, scale: 1 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 16, delay: d.delay }}>
            <span className="w-4 h-4 rounded-full" style={{ background: d.c, boxShadow: `0 0 18px ${d.c}` }} />
            <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] whitespace-nowrap" style={{ color: d.c }}>{d.label}</span>
          </motion.div>
        </div>
      ))}
      {/* barrido de auditoría (red team) */}
      {!reduce && (
        <motion.div className="absolute top-[12%] bottom-[12%] w-[2px] pointer-events-none" style={{ background: "linear-gradient(180deg,transparent,#2dd4bf,transparent)", boxShadow: "0 0 18px #2dd4bf" }}
          initial={{ left: "8%", opacity: 0 }} animate={{ left: ["8%", "90%"], opacity: [0, 1, 0] }} transition={{ duration: 0.7, delay: 1.5, ease: "easeInOut" }} />
      )}
      {/* sello — se estampa una vez */}
      <div className="absolute top-1/2 left-[89%] -translate-x-1/2 -translate-y-1/2">
        {!reduce && (
          <motion.div className="absolute rounded-full border-2 pointer-events-none" style={{ width: 116, height: 116, left: -58, top: -58, borderColor: "#fbbf24" }}
            initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: [0.7, 2.3], opacity: [0.65, 0] }} transition={{ duration: 0.8, delay: 2.3, ease }} />
        )}
        <motion.div className="relative" style={{ width: 116, height: 116 }}
          initial={{ scale: reduce ? 1 : 1.9, opacity: reduce ? 1 : 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 13, delay: 2.15 }}>
          <div className="absolute inset-0 rounded-full blur-lg opacity-30" style={{ background: "#fbbf24" }} />
          <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg,#fcd34d,#d97706 55%,#92400e)", boxShadow: "inset 0 2px 8px rgba(255,255,255,0.4),inset 0 -4px 12px rgba(0,0,0,0.3)" }} />
          <div className="absolute inset-[5px] rounded-full" style={{ border: "2px solid rgba(253,230,138,0.6)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-6 h-6 text-amber-950 mb-0.5" />
            <span className="text-base text-amber-950 uppercase leading-none" style={{ fontFamily: D, fontWeight: 700 }}>Human</span>
            <span className="text-base text-amber-950 uppercase leading-none mt-0.5" style={{ fontFamily: D, fontWeight: 700 }}>Audit</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-950/70 mt-1">QA 9.7+</span>
          </div>
          {!reduce && (
            <motion.div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9), transparent 60%)" }}
              initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0] }} transition={{ duration: 0.5, delay: 2.3 }} />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/* ── Tarjeta de agente + chip de dominio (metodología) ──────────────────────── */
type AgentT = { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; name: string; role: string; desc: string };
function Agent({ a, color, left }: { a: AgentT; color: string; left: boolean }) {
  const Icon = a.icon;
  return (
    <div className={`relative rounded-lg p-4 ${left ? "md:mr-5" : "md:ml-5"}`} style={{ backgroundColor: "#0e0e15", border: `1px solid ${color}2e` }}>
      <div className={`absolute top-3 bottom-3 ${left ? "right-0" : "left-0"} w-[2px] rounded-full`} style={{ background: color, opacity: 0.5 }} />
      <div className={`flex items-start gap-3 ${left ? "md:flex-row-reverse md:text-right" : ""}`}>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}40` }}><Icon className="w-4 h-4" style={{ color }} /></span>
        <div className="min-w-0">
          <h3 className="text-base tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{a.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] mt-0.5" style={{ color }}>{a.role}</p>
          <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: C.inkSoft }}>{a.desc}</p>
        </div>
      </div>
    </div>
  );
}
function DomainChip({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-md px-3 py-1.5 text-center" style={{ backgroundColor: C.bg, border: `1px solid ${color}55` }}>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] block" style={{ color }}>Dominio</span>
      <span className="text-[12px] uppercase" style={{ fontFamily: D, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

/* La sección "Método editorial" ahora se renderiza como imagen: public/metodo-editorial.png */

export default function LandingV34() {
  const [, setLocation] = useLocation();
  const reduce = useReducedMotion();
  const enHref = typeof window !== "undefined"
    ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}`
    : "#";

  /* carrito de compras — contexto compartido (sincroniza con colecciones/checkout) */
  const { add, count, setOpen: setCartOpen } = useCart();
  const [faqOpen, setFaqOpen] = useState(false);
  const [hoverDom, setHoverDom] = useState<number | null>(null);
  const [hoverSec, setHoverSec] = useState<number | null>(null);
  /* viaje de un libro: etapa activa según scroll */
  const [activeStage, setActiveStage] = useState(0);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { const i = Number((e.target as HTMLElement).dataset.idx); if (!Number.isNaN(i)) setActiveStage(i); } });
    }, { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    chapterRefs.current.forEach(el => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);
  const reveal = reduce ? {} : { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.2 } };
  // `as const`: sin el literal, `ease` se ensancha a `string` y no matchea el tipo `Easing` de framer-motion.
  const floatA = reduce ? {} : { animate: { y: [0, -8, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const } };
  const floatB = reduce ? {} : { animate: { y: [0, 8, 0] }, transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const } };

  return (
    <div className="lp19 min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      <style>{`.lp19 a:focus-visible,.lp19 button:focus-visible{outline:2px solid ${C.violet};outline-offset:3px;border-radius:10px}`}</style>
      {/* ═══════════════ NAV ═══════════════ */}
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
            <a href={enHref} target="_blank" rel="noopener noreferrer" title="Traducir la página al inglés"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
              <Globe className="w-3.5 h-3.5" /> EN
            </a>
            <button onClick={() => setCartOpen(true)} aria-label="Abrir carrito" className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
              <ShoppingCart className="w-4 h-4" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: C.violetBtn }}>{count}</span>
              )}
            </button>
            {/* El boton "Estudio" llevaba al cockpit interno de produccion desde el header
                PUBLICO: no le sirve a un comprador y le anuncia a cada visitante que hay
                un panel interno. El acceso sigue existiendo escribiendo /estudio. */}
          </div>
        </div>
      </header>

      {/* Carrito: panel compartido montado globalmente (CartPanel en App). */}

      {/* ═══════════════ HERO + figura premium ═══════════════ */}
      <section className="pt-28 lg:pt-36 pb-20" style={{ background: `radial-gradient(120% 80% at 100% 0%, ${C.bgAlt}, ${C.bg})` }}>
        <motion.div variants={stagger} initial={reduce ? undefined : "hidden"} animate={reduce ? undefined : "show"}
          className="mx-auto max-w-[1280px] px-6 grid lg:grid-cols-[1.02fr_1.1fr] gap-12 lg:gap-10 items-center">
          <div>
            <motion.div variants={up} className="inline-flex items-center gap-2 mb-7 px-3 h-7 rounded-full" style={{ backgroundColor: `${C.violet}1f`, color: C.bright }}>
              <Lightbulb className="w-3.5 h-3.5" style={{ opacity: 0.85 }} strokeWidth={1.75} />
              <span className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ fontWeight: 600 }}>Libros para el aprendizaje acelerado</span>
            </motion.div>
            <motion.h1 variants={up} className="tracking-[-0.045em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(3rem,6.6vw,5.4rem)", lineHeight: 0.92 }}>
              Apruébalo<CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.violet} strokeWidth={3} /><br />
              <span style={{ fontWeight: 400, backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>A la primera</span>
            </motion.h1>
            <motion.p variants={up} className="mt-7 text-xl max-w-xl" style={{ color: C.inkSoft, fontWeight: 400, lineHeight: 1.5 }}>
              Se producen colecciones de estudio completas por certificación cloud. Seis formatos que cubren
              todo el ciclo de preparación profesional.
            </motion.p>
            <motion.div variants={up} className="mt-9 flex flex-wrap items-center gap-5">
              <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 text-white px-6 rounded-full text-base transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, height: "3rem", backgroundColor: C.violetBtn }}>
                Comprar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => setLocation("/demo")} className="text-base" style={{ color: C.inkSoft, fontWeight: 500, textDecoration: "underline", textUnderlineOffset: "5px", textDecorationColor: `${C.ink}33` }}>Ver demo</button>
            </motion.div>
            <motion.div variants={up} className="mt-8 flex items-center gap-4">
              <div className="flex items-center gap-1">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" style={{ color: C.gold }} />)}</div>
              <span className="text-sm" style={{ color: C.inkSoft }}><b style={{ color: C.ink }}>{SOC.rating}</b> · {SOC.reviews} valoraciones · <b style={{ color: C.ink }}>{SOC.students}</b> estudiantes</span>{/* TODO_REAL */}
            </motion.div>
          </div>

          {/* Ventana de producto + chips — composición ladeada coherente */}
          <motion.div variants={up} className="relative">
            <div className="relative mx-auto lg:ml-auto lg:mr-0 max-w-[440px]" style={{ transform: "perspective(1600px) rotateY(-13deg) rotateX(1deg)", transformOrigin: "center" }}>
            <div className="absolute -inset-2 rounded-[2rem] opacity-[0.12] blur-2xl" style={{ background: `linear-gradient(120deg,${C.violet},${C.blue})` }} />
            <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: "#0e0e15", border: `1px solid ${C.ink}1f`, boxShadow: "0 24px 60px -34px rgba(0,0,0,0.7)", opacity: 0.74 }}>
              <div className="flex items-center gap-3 px-4 h-11 border-b" style={{ borderColor: `${C.ink}14`, backgroundColor: "#0b0b11" }}>
                <div className="flex gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400/70" /><span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" /><span className="w-2.5 h-2.5 rounded-full bg-green-400/70" /></div>
                <div className="ml-2 flex items-center gap-2 flex-1 max-w-[240px] h-6 px-2.5 rounded-md" style={{ backgroundColor: "#16161f" }}>
                  <Search className="w-3.5 h-3.5" style={{ color: C.inkSoft }} /><span className="text-[11px]" style={{ color: C.inkSoft }}>Buscar en la biblioteca…</span>
                </div>
                <span className="ml-auto font-mono text-[11px]" style={{ color: C.violet }}>CloudBooks</span>
              </div>
              <div className="p-5">
                <p className="text-sm mb-4" style={{ fontFamily: D, fontWeight: 700 }}>Certificaciones cloud</p>
                <div className="space-y-2.5">
                  {PROVIDERS.map(p => {
                    const Logo = p.Logo;
                    return (
                      <div key={p.short} className="flex items-center gap-3 rounded-xl p-3" style={{ backgroundColor: "#14141c", border: `1px solid ${C.ink}10` }}>
                        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${p.color}1f` }}><Logo size={18} color={p.color} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-tight">{p.name}</p>
                          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}><div className="h-full rounded-full" style={{ width: `${p.q}%`, background: p.color }} /></div>
                        </div>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${p.color}1f`, color: p.color }}>{p.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <motion.div {...floatA} className="absolute -top-4 -left-4 hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.violet}55`, boxShadow: "0 12px 28px -18px rgba(0,0,0,0.7)" }}>
              <Map className="w-4 h-4" style={{ color: C.violet }} /><span className="text-xs" style={{ fontWeight: 600 }}>Visual Atlas</span>
            </motion.div>
            <motion.div {...floatB} className="absolute -top-3 right-2 hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.blue}55`, boxShadow: "0 12px 28px -18px rgba(0,0,0,0.7)" }}>
              <BookOpen className="w-4 h-4" style={{ color: C.blue }} /><span className="text-xs" style={{ fontWeight: 600 }}>Master Book</span>
            </motion.div>
            <motion.div {...floatB} className="absolute -bottom-4 left-6 hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.teal}55`, boxShadow: "0 12px 28px -18px rgba(0,0,0,0.7)" }}>
              <Crosshair className="w-4 h-4" style={{ color: C.teal }} /><span className="text-xs" style={{ fontWeight: 600 }}>Exam Traps</span>
            </motion.div>
            <motion.div {...floatA} className="absolute -bottom-3 right-4 hidden sm:flex items-center gap-2 px-3 h-9 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.amber}55`, boxShadow: "0 12px 28px -18px rgba(0,0,0,0.7)" }}>
              <Zap className="w-4 h-4" style={{ color: C.amber }} /><span className="text-xs" style={{ fontWeight: 600 }}>Cheat Sheets</span>
            </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ EL PROBLEMA ═══════════════ */}
      <section className="py-24 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(90deg,transparent,#f8717140,transparent)" }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1240px] px-6 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <motion.p variants={up} className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: "#f87171" }}>El problema</motion.p>
            <motion.h2 variants={up} className="tracking-[-0.03em] leading-[0.98] mb-6" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4.5vw,3.4rem)" }}>
              Estudiar certificaciones cloud está <span style={{ color: "#f87171" }}>fragmentado</span>
            </motion.h2>
            <motion.p variants={up} className="text-lg leading-relaxed mb-7" style={{ color: C.inkSoft, fontWeight: 400 }}>
              Documentación extensa sin priorización, cursos desactualizados, dumps sin contexto y resúmenes de
              calidad inconsistente. Sin una ruta clara ni un estándar de calidad medible.
            </motion.p>
            <div className="space-y-3">
              {["Fuentes sin coherencia editorial entre sí", "Formatos de estudio aislados, sin ruta integrada", "Sin validación técnica sistemática del contenido"].map(t => (
                <motion.div key={t} variants={up} className="flex items-start gap-3">
                  <span className="mt-1.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f8717122" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "#f87171" }} /></span>
                  <p className="text-base" style={{ color: C.ink, fontWeight: 400 }}>{t}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <motion.div variants={up} className="rounded-2xl p-8" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}1f` }}>
            <p className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: C.inkSoft }}>Fuentes típicas de preparación</p>
            <p className="text-[12px] mb-6" style={{ color: `${C.ink}55` }}>Qué tanto te acercan, por sí solas, a aprobar:</p>
            <div className="space-y-5">
              {[
                { src: "Documentación oficial", q: 40, note: "Muy extensa, sin priorización" },
                { src: "Cursos en plataformas", q: 55, note: "Calidad y actualización variables" },
                { src: "Dumps de preguntas", q: 25, note: "Sin contexto ni explicación" },
                { src: "Resúmenes de terceros", q: 35, note: "Inconsistentes, sin estándar" },
              ].map((r, i) => (
                <div key={r.src}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="text-[13px] font-medium" style={{ color: C.ink }}>{r.src}</span>
                    <span className="text-[13px]" style={{ color: "#f87171", fontFamily: D, fontWeight: 700 }}>{r.q}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${C.ink}14` }}>
                    <motion.div className="h-full rounded-full" style={{ background: "#f87171", opacity: 0.7 }}
                      initial={{ width: reduce ? `${r.q}%` : 0 }} whileInView={{ width: `${r.q}%` }} viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }} />
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: C.inkSoft }}>{r.note}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ 6 FORMATOS — numeración única, sin micro-texto ═══════════════ */}
      <section className="py-24 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.violet}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1240px] px-6">
          <motion.div variants={up} className="max-w-3xl mb-10">
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: C.violet }}>Sistema editorial</p>
            <h2 className="tracking-[-0.03em] leading-[0.98]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.2rem,5vw,3.8rem)" }}>
              <span style={{ color: C.ink }}>Seis formatos</span>. <span style={{ fontWeight: 300, color: C.inkSoft }}>Una ruta completa de estudio</span>
            </h2>
            <p className="text-lg mt-5 leading-relaxed" style={{ color: C.inkSoft, fontWeight: 400 }}>
              Cada colección CloudBooks se produce en seis formatos complementarios, diseñados para cubrir todo el
              ciclo de preparación: comprensión profunda, estudio visual, práctica de examen y repaso final.
            </p>
          </motion.div>

          {/* cinta de la colección: portadas reales etiquetadas */}
          <div className="flex justify-center items-start gap-4 sm:gap-6 mt-12 flex-wrap">
            {FORMATS.map((f, i) => {
              const cid = `AI-200-${f.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <motion.div key={f.n} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -10 }}
                  className="flex flex-col items-center" style={{ width: "clamp(96px,14vw,150px)" }}>
                  <button onClick={() => setLocation(`/libro/${cid}`)} aria-label={f.label} className="w-full">
                    <div className="relative w-full rounded-lg overflow-hidden transition-shadow" style={{ aspectRatio: "1023 / 1537", boxShadow: `0 22px 48px -18px ${f.color}aa`, border: `1px solid ${f.color}40` }}>
                      <BookCover id={cid} color={f.color} format={f.label} cert="AI-200" />
                    </div>
                  </button>
                  <p className="mt-3 text-[14px] text-center leading-tight" style={{ fontFamily: D, fontWeight: 700 }}>{f.label}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-center mt-0.5" style={{ color: f.color }}>{f.tag}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* ═══════════════ METODOLOGÍA — batería reactiva de agentes ═══════════════ */}
      <section className="py-28 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.teal}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1100px] px-6">
          <motion.div variants={up} className="text-center mb-14 max-w-3xl mx-auto">
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: C.teal }}>Método editorial</p>
            <h2 className="tracking-[-0.03em] leading-[1.05]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4.8vw,3.6rem)" }}>
              Una <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>batería de agentes</span> de IA<br />Un solo <span style={{ color: C.gold }}>veredicto humano</span>
            </h2>
            <p className="text-base mt-5 leading-relaxed" style={{ color: C.inkSoft }}>Cada libro se levanta sobre tres pilares —y lo cierra un editor humano que valida y firma la entrega antes de publicar.</p>
          </motion.div>

          <motion.div variants={up} className="max-w-[1000px] mx-auto">
            {/* tres movimientos (lenguaje editorial de Nuestra Labor) */}
            <div className="grid sm:grid-cols-3 gap-x-10 gap-y-12">
              {[
                { n: "01", t: "Conocimiento", c: C.blue,   a: "Grounding · Pedagogy",       d: "Reunimos las fuentes oficiales, verificamos cada dato y trazamos la ruta de estudio que lleva a aprobar." },
                { n: "02", t: "Creación",     c: C.violet, a: "Editorial · Visual",         d: "Voz, narrativa y dirección de arte: cada formato se escribe y compone bajo un contrato editorial estricto." },
                { n: "03", t: "Calidad",      c: C.teal,   a: "QA / Red Team · Production", d: "Auditoría adversarial, scoring multidimensional y build final. Lo firma un editor humano antes de publicar." },
              ].map(m => (
                <div key={m.n} className="pt-6" style={{ borderTop: `2px solid ${m.c}` }}>
                  <span className="block tabular-nums leading-[0.85]" style={{ fontFamily: D, fontWeight: 800, fontSize: "clamp(2.8rem,5vw,4rem)", WebkitTextStroke: `1.6px ${m.c}`, color: "transparent" }}>{m.n}</span>
                  <h3 className="text-2xl tracking-tight mt-4" style={{ fontFamily: D, fontWeight: 700, color: C.ink }}>{m.t}</h3>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] mt-2" style={{ color: m.c }}>{m.a}</p>
                  <p className="text-[15px] leading-relaxed mt-3" style={{ color: C.inkSoft }}>{m.d}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <button onClick={() => setLocation("/nuestra-labor")} className="group inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: C.bright }}>
                Ver cómo lo hacemos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ PRECIOS ═══════════════ */}
      <section className="py-24 relative">
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${C.violet}40,transparent)` }} />
        <motion.div {...reveal} variants={stagger} className="mx-auto max-w-[1240px] px-6">
          <motion.div variants={up} className="mb-12 max-w-2xl">
            <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-3" style={{ color: C.violet }}>Precios</p>
            <h2 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4.5vw,3.4rem)" }}>Elige tu paquete</h2>
            <p className="text-lg mt-3" style={{ color: C.inkSoft }}>Compra un formato suelto a $5.99 o llévate la colección completa con el mejor precio.</p>
          </motion.div>

          <div className="grid md:grid-cols-[1fr_1fr_1.25fr] gap-5 items-stretch">
            {/* Master Book */}
            <motion.div variants={up} className="group rounded-2xl p-7 flex flex-col transition-transform duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(165deg, ${C.blue}14, ${C.card} 62%)`, border: `1px solid ${C.blue}3a` }}>
              <div className="h-1 w-10 rounded-full mb-5" style={{ background: C.blue }} />
              <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4" style={{ color: C.blue }} /><p className="font-mono text-[12px] uppercase tracking-wider" style={{ color: C.blue }}>Aprendizaje profundo</p></div>
              <h3 className="text-2xl mb-3" style={{ fontFamily: D, fontWeight: 700 }}>Master Book</h3>
              <p className="text-sm leading-relaxed flex-1" style={{ color: C.inkSoft }}>Construye criterio técnico con explicaciones completas de dominios, servicios, arquitecturas, límites y decisiones de examen.</p>
              <div className="mt-5 flex items-baseline gap-1"><span className="text-sm" style={{ color: C.inkSoft }}>USD</span><span style={{ fontFamily: D, fontWeight: 700, fontSize: "2.4rem" }}>{PRICE.book}</span><span className="text-sm" style={{ color: C.inkSoft }}>/ formato</span></div>
              <button onClick={() => add({ id: "AI-200-master-book", name: "Master Book", cert: "AI-200", format: "Master Book", price: 5.99 })} className="mt-5 w-full h-11 rounded-full text-sm text-white transition-all hover:brightness-110 hover:scale-[1.02]" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.blue }}>Comprar Master Book</button>
            </motion.div>

            {/* Visual Atlas */}
            <motion.div variants={up} className="group rounded-2xl p-7 flex flex-col transition-transform duration-300 hover:-translate-y-1" style={{ background: `linear-gradient(165deg, ${C.violet}1f, ${C.card} 60%)`, border: `1px solid ${C.violet}55` }}>
              <div className="h-1 w-10 rounded-full mb-5" style={{ background: C.violet }} />
              <div className="flex items-center gap-2 mb-2"><Map className="w-4 h-4" style={{ color: C.violet }} /><p className="font-mono text-[12px] uppercase tracking-wider" style={{ color: C.violet }}>Estudio visual</p><span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.violet}26`, color: C.bright }}>POPULAR</span></div>
              <h3 className="text-2xl mb-3" style={{ fontFamily: D, fontWeight: 700 }}>Visual Atlas</h3>
              <p className="text-sm leading-relaxed flex-1" style={{ color: C.inkSoft }}>Estudio visual acelerado de conceptos. Diagramas, mapas de decisión, comparaciones y autochecks para comprender más rápido.</p>
              <div className="mt-5 flex items-baseline gap-1"><span className="text-sm" style={{ color: C.inkSoft }}>USD</span><span style={{ fontFamily: D, fontWeight: 700, fontSize: "2.4rem" }}>{PRICE.book}</span><span className="text-sm" style={{ color: C.inkSoft }}>/ formato</span></div>
              <button onClick={() => add({ id: "AI-200-visual-atlas", name: "Visual Atlas", cert: "AI-200", format: "Visual Atlas", price: 5.99 })} className="mt-5 w-full h-11 rounded-full text-sm text-white transition-all hover:brightness-110 hover:scale-[1.02]" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>Comprar Visual Atlas</button>
            </motion.div>

            {/* Collection Pack destacado */}
            <motion.div variants={up} className="relative rounded-2xl p-8 flex flex-col overflow-hidden md:-my-2 md:scale-[1.015]" style={{ background: C.deep, color: C.deepText, boxShadow: `0 22px 50px -30px ${C.violet}` }}>
              <div className="absolute top-5 right-5 text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: C.gold, color: "#0d1629", fontFamily: D }}>MEJOR VALOR</div>
              <div className="flex items-center gap-2 mb-2"><Pkg className="w-4 h-4" style={{ color: C.gold }} /><p className="font-mono text-[12px] uppercase tracking-wider" style={{ color: `${C.deepText}cc` }}>Preparación completa</p></div>
              <h3 className="text-2xl mb-3" style={{ fontFamily: D, fontWeight: 700 }}>Collection Pack</h3>
              <p className="text-sm leading-relaxed" style={{ color: `${C.deepText}d9` }}>Todo lo necesario para preparar y aprobar: los seis formatos de la colección, juntos y al mejor precio.</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-sm" style={{ color: `${C.deepText}99` }}>USD</span>
                <span style={{ fontFamily: D, fontWeight: 700, fontSize: "3rem", lineHeight: 1, color: C.gold }}>{PRICE.pack}</span>
                <span className="line-through text-lg" style={{ color: `${C.deepText}80` }}>{PRICE.packFull}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${C.gold}26`, color: C.gold }}>−44%</span>
              </div>
              <div className="mt-4 pt-4 grid grid-cols-2 gap-x-3 gap-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.16)" }}>
                {FORMATS.map(f => (<div key={f.n} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 shrink-0" style={{ color: C.gold }} /><span className="text-[12px]" style={{ color: `${C.deepText}e6` }}>{f.label}</span></div>))}
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.07)" }}>
                <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.gold }} />
                <p className="text-[12px] leading-snug" style={{ color: `${C.deepText}e6` }}>
                  <b>Actualizaciones mientras la cert esté vigente.</b> Si cambia, reeditamos los libros y te los reenviamos sin costo (~1 semana).
                </p>
              </div>
              <button onClick={() => add({ id: "AI-200-collection-pack", name: "Collection Pack AI-200", cert: "AI-200", format: "Collection Pack", price: 19.99 })} className="group mt-5 w-full h-12 rounded-full text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]" style={{ fontFamily: D, fontWeight: 700, backgroundColor: C.gold, color: "#0d1629" }}>
                Comprar Collection Pack <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>

          <motion.div variants={up} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: C.inkSoft }}>
            <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: C.gold }} /><b style={{ color: C.ink }}>{SOC.passRate}</b> aprueba a la primera{/* TODO_REAL */}</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: C.green }} />Auditoría humana en cada libro</span>
            <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4" style={{ color: C.gold }} />Reediciones gratuitas al actualizarse la certificación</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ CTA FINAL ═══════════════ */}
      <section className="relative overflow-hidden" style={{ background: C.deep, color: C.deepText }}>
        <motion.div {...reveal} variants={stagger} className="relative mx-auto max-w-4xl px-6 py-24 text-center">
          <motion.h2 variants={up} className="tracking-[-0.04em] leading-[0.92] mx-auto max-w-[16ch]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2.6rem,6vw,5rem)" }}>
            Empieza hoy. <span style={{ color: C.gold }}>Certifícate en pocos días<CheckCircle2 aria-hidden className="inline-block" style={{ width: "0.18em", height: "0.18em", verticalAlign: "baseline", marginLeft: "0.06em" }} color={C.gold} strokeWidth={3} /></span>
          </motion.h2>
          <motion.p variants={up} className="mt-6 text-lg max-w-xl mx-auto leading-relaxed" style={{ color: `${C.deepText}cc` }}>
            Colecciones de estudio completas, auditadas por humanos, para cada certificación cloud. Desde $5.99.
          </motion.p>
          <motion.div variants={up} className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <button onClick={() => setLocation("/colecciones")} className="group flex items-center gap-2 px-8 h-14 rounded-full text-base transition-all hover:scale-[1.03]" style={{ fontFamily: D, fontWeight: 700, backgroundColor: C.gold, color: "#0d1629" }}>Ver colecciones <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></button>
            <button onClick={() => setLocation("/demo")} className="px-7 h-14 rounded-full text-base border transition-all hover:bg-white/10" style={{ fontFamily: D, fontWeight: 500, borderColor: `${C.deepText}55` }}>Ver demo</button>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════ FAQ (modal desde el footer) ═══════════════ */}
      {faqOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto py-16 px-4">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={() => setFaqOpen(false)} />
          <motion.div initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            className="relative w-full max-w-[680px] rounded-2xl p-7" style={{ backgroundColor: C.bgAlt, border: `1px solid ${C.ink}1f` }}>
            <div className="flex items-center justify-between mb-6">
              <h2 style={{ fontFamily: D, fontWeight: 700, fontSize: "1.5rem" }}>Preguntas frecuentes</h2>
              <button onClick={() => setFaqOpen(false)} aria-label="Cerrar" className="w-9 h-9 flex items-center justify-center rounded-full" style={{ color: C.inkSoft, border: `1px solid ${C.ink}1f` }}><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-5">
              {FAQ.map(f => (
                <div key={f.q} className="border-t pt-4" style={{ borderColor: `${C.ink}1f` }}>
                  <h3 className="text-base mb-1.5" style={{ fontFamily: D, fontWeight: 700 }}>{f.q}</h3>
                  <p className="text-[15px] leading-relaxed" style={{ color: C.inkSoft }}>{f.a}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* ═══════════════ FOOTER ═══════════════ */}
      <SiteFooter />
    </div>
  );
}
