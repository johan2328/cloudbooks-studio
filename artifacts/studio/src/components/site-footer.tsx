import { useLocation } from "wouter";
import { Globe } from "lucide-react";
import { FaXTwitter, FaInstagram } from "react-icons/fa6";

/* ════════════════════════════════════════════════════════════════════════════
   SITE FOOTER — footer comercial compartido (marca oscura CloudBooks Editorial).
   Enlaces legales + ayuda + redes (X, Instagram — sin destino por ahora).
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = { bg: "#0a0a0e", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)", violet: "#8b5cf6" };

function Sep() { return <span aria-hidden style={{ color: "rgba(243,243,246,0.2)" }}>|</span>; }

export function SiteFooter() {
  const [, setLocation] = useLocation();
  const enHref = typeof window !== "undefined" ? `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}` : "#";
  const link = "hover:opacity-100 transition-opacity";

  return (
    <footer className="py-10" style={{ backgroundColor: C.bg, borderTop: `1px solid ${C.ink}1f` }}>
      <div className="mx-auto max-w-[1240px] px-6 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-baseline gap-2">
          <span style={{ fontFamily: D, fontWeight: 700, fontSize: "1.1rem", color: C.ink }}>CloudBooks</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: C.violet }}>Editorial</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: C.inkSoft }}>
          <span>© 2026 CloudBooks</span><Sep />
          <button onClick={() => setLocation("/aviso-legal")} className={link} style={{ opacity: 0.8, color: "inherit" }}>Aviso legal</button><Sep />
          <button onClick={() => setLocation("/politica-privacidad")} className={link} style={{ opacity: 0.8, color: "inherit" }}>Privacidad</button><Sep />
          <button onClick={() => setLocation("/ayuda")} className={link} style={{ opacity: 0.8, color: "inherit" }}>Ayuda y Soporte</button><Sep />
          <a href={enHref} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 ${link}`} style={{ opacity: 0.8 }} title="Traducir la página al inglés">
            <Globe className="w-3.5 h-3.5" /> English
          </a>
        </div>

        <div className="flex items-center gap-2.5">
          <button type="button" aria-label="X (Twitter)" className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
            <FaXTwitter className="w-3.5 h-3.5" />
          </button>
          <button type="button" aria-label="Instagram" className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/5" style={{ border: `1px solid ${C.ink}26`, color: C.inkSoft }}>
            <FaInstagram className="w-4 h-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
