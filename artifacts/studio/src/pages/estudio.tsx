import { useState } from "react";
import { useLocation } from "wouter";
import { Lock, LogOut, ArrowRight, Wand2, ClipboardList, ShieldCheck, ArrowLeft, BadgeCheck } from "lucide-react";
import { isEstudioAuthed, loginEstudio, logoutEstudio } from "@/lib/estudio-auth";

/* ════════════════════════════════════════════════════════════════════════════
   ESTUDIO — acceso interno (marca CloudBooks Editorial, oscuro).
   Login simple (clave) → dos secciones: InDesign AI · Armado de fichas de libros.
   Ruta /estudio.
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = {
  bg: "#0a0a0e", bgAlt: "#101016", card: "#15151d", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)",
  violet: "#8b5cf6", violetBtn: "#6d28d9", blue: "#3b82f6", teal: "#2dd4bf", gold: "#fbbf24", bright: "#c4b5fd",
};

const SECTIONS = [
  {
    id: "indesign", to: "/estudio/indesign", icon: Wand2, color: "#8b5cf6",
    title: "InDesign AI", kicker: "Diseño & maquetación",
    desc: "Maquetación de libros asistida por IA: a partir del contenido base, genera las páginas con el contrato visual de cada formato.",
  },
  {
    id: "fichas", to: "/publicacion", icon: ClipboardList, color: "#2dd4bf",
    title: "Armado de fichas de libros", kicker: "Publicación",
    desc: "Carga y edición de fichas: portada y contraportada, índice, metadatos, autores, páginas de muestra y despacho.",
  },
  {
    id: "certs", to: "/estudio/certificaciones", icon: BadgeCheck, color: "#fbbf24",
    title: "Certificaciones", kicker: "Catálogo",
    desc: "Catálogo de certificaciones por nube, área y nivel de exigencia, con notas de transición. Cargá nuevas certificaciones.",
  },
];

export default function Estudio() {
  const [, setLocation] = useLocation();
  const [authed, setAuthed] = useState(isEstudioAuthed());
  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const inputCls = "w-full rounded-xl px-4 h-11 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500/60";
  const inputStyle = { backgroundColor: C.bg, border: `1px solid ${C.ink}1f`, color: C.ink } as const;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loginEstudio(pwd)) { setAuthed(true); setError(""); setPwd(""); }
    else setError("Clave incorrecta. Intentá de nuevo.");
  }

  /* ── LOGIN ── */
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)", background: `radial-gradient(120% 90% at 50% -10%, ${C.bgAlt}, ${C.bg})` }}>
        <div className="w-full max-w-[400px]">
          {/* marca */}
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2 mb-8 mx-auto">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
          </button>

          <div className="rounded-2xl p-7" style={{ backgroundColor: C.card, border: `1px solid ${C.ink}14` }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${C.violet}1f`, border: `1px solid ${C.violet}40` }}><Lock className="w-4 h-4" style={{ color: C.violet }} /></span>
              <h1 className="text-lg tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>Acceso al estudio</h1>
            </div>
            <p className="text-[13px] mb-6" style={{ color: C.inkSoft }}>Plataforma editorial interna. Ingresá tu clave para continuar.</p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-user" className="text-[12px]" style={{ color: C.inkSoft }}>Usuario</label>
                <input id="e-user" name="username" autoComplete="username" value={user} onChange={e => setUser(e.target.value)} className={inputCls} style={inputStyle} placeholder="Tu usuario" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="e-pass" className="text-[12px]" style={{ color: C.inkSoft }}>Clave</label>
                <input id="e-pass" name="password" type="password" autoComplete="current-password" value={pwd} onChange={e => { setPwd(e.target.value); setError(""); }} className={inputCls} style={inputStyle} placeholder="••••••••" autoFocus />
              </div>
              {error && (
                <p className="text-[12px] rounded-lg px-3 py-2" style={{ color: "#fca5a5", backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>{error}</p>
              )}
              <button type="submit" className="mt-1 inline-flex items-center justify-center gap-2 text-white h-11 rounded-full text-sm transition-all hover:brightness-110" style={{ fontFamily: D, fontWeight: 600, backgroundColor: C.violetBtn }}>
                Entrar al estudio <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <button onClick={() => setLocation("/")} className="mt-5 mx-auto flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-100" style={{ color: C.inkSoft, opacity: 0.8 }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al sitio
          </button>
        </div>
      </div>
    );
  }

  /* ── HUB ── */
  return (
    <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.ink, fontFamily: "var(--app-font-sans)" }}>
      {/* barra superior */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.ink}1f` }}>
        <div className="mx-auto max-w-[1100px] px-6 h-16 flex items-center justify-between">
          <button onClick={() => setLocation("/")} className="flex items-baseline gap-2">
            <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.02em" }}>CloudBooks</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Estudio</span>
          </button>
          <button onClick={() => { logoutEstudio(); setAuthed(false); }} className="inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition-all hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
            <LogOut className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-6 pt-14 pb-24">
        <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: C.violet }}>Estudio editorial</p>
        <h1 className="tracking-[-0.03em]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4.5vw,3.2rem)" }}>¿Qué vas a crear hoy?</h1>
        <p className="text-base mt-4 max-w-2xl leading-relaxed" style={{ color: C.inkSoft }}>De la certificación al libro listo para vender: maquetá con IA, armá su ficha comercial y goberná el catálogo. Nada se publica sin tu visto bueno.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setLocation(s.to)}
                className="group text-left rounded-2xl p-7 flex flex-col transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70"
                style={{ background: `linear-gradient(160deg, ${s.color}14, ${C.card} 62%)`, border: `1px solid ${s.color}33` }}>
                <span className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${s.color}1f`, border: `1px solid ${s.color}45` }}>
                  <Icon className="w-6 h-6" style={{ color: s.color }} />
                </span>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] mb-1.5" style={{ color: s.color }}>{s.kicker}</p>
                <h2 className="text-xl tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{s.title}</h2>
                <p className="text-[14px] leading-relaxed mt-2.5 flex-1" style={{ color: C.inkSoft }}>{s.desc}</p>
                <span className="inline-flex items-center gap-2 text-sm mt-6" style={{ color: C.bright, fontFamily: D, fontWeight: 600 }}>
                  Abrir <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
