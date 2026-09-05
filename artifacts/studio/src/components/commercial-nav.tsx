import { useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";
import { ArrowRight, Globe, Search, ShoppingCart } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   NAVEGACIÓN COMERCIAL COMPARTIDA — barra superior + fila legal de la tienda.

   Vivían DENTRO de `pages/landing.tsx`, que las exportaba a otras cuatro páginas.
   Efecto: importar la barra arrastraba las 765 líneas de esa landing al bundle,
   incluida una landing completa que sólo se ve en `/portal` (ruta a la que ningún
   enlace del sitio lleva). Una página no debería ser la librería de componentes
   de las demás.

   Cambio de comportamiento deliberado: el botón "Studio" ya NO consulta la sesión
   (`useAuth`). Antes decía "Abrir Studio" si había usuario y "Studio" si no, y era
   el ÚNICO motivo por el que `lib/auth.tsx` —cockpit puro— era un módulo
   compartido con la tienda. Ahora navega siempre a `/login`, que redirige solo si
   ya hay sesión. Mismo destino, sin acoplar la tienda al cockpit.
   ════════════════════════════════════════════════════════════════════════════ */

export function translateHref() {
  if (typeof window === "undefined") return "#";
  return `https://translate.google.com/translate?sl=es&tl=en&u=${encodeURIComponent(window.location.href)}`;
}

/* ─── Fila legal compartida (Apple-style) ───────────────────────────────── */
export function LegalRow() {
  return (
    <div className="border-t border-white/[0.04] mt-5 pt-4 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[10px] text-white/30">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>Copyright © 2026 CloudBooks. Todos los derechos reservados.</span>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Política de privacidad</a>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Aviso legal</a>
        <span className="text-white/10">|</span>
        <a href="#" className="hover:text-white/60 transition-colors">Mapa del sitio</a>
      </div>
      <div className="flex items-center gap-3">
        <span>América Latina y el Caribe</span>
        <span className="text-white/10">|</span>
        <a
          href={translateHref()}
          target="_blank"
          rel="noopener noreferrer"
          title="Traducir esta página al inglés (Google Translate)"
          className="hover:text-white/60 transition-colors inline-flex items-center gap-1"
        >
          <Globe className="w-3 h-3" />
          English
        </a>
      </div>
    </div>
  );
}

/* ─── Nav comercial compartida ──────────────────────────────────────────── */
export function CommercialNav({ active }: { active?: string }) {
  const [, setLocation] = useLocation();
  const { count, setOpen: setCartOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0d1629]/95 backdrop-blur-sm border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-6">
          <button onClick={() => setLocation("/")} className="shrink-0">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 w-auto" draggable={false} />
          </button>
          <nav className="hidden md:flex items-center gap-5 ml-4">
            {[
              { label: "Inicio",         href: "/" },
              { label: "Nuestra Labor",  href: "/nuestra-labor" },
              { label: "Empresas",       href: "/empresas" },
              { label: "Demo",            href: "/demo" },
            ].map(({ label, href }) => (
              <a key={label} href={href}
                className={cn(
                  "text-xs font-medium tracking-wide transition-colors",
                  active === label ? "text-white/90" : "text-white/40 hover:text-white/80"
                )}>
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <a
              href={translateHref()}
              target="_blank"
              rel="noopener noreferrer"
              title="Traducir esta página al inglés (Google Translate)"
              className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors mr-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="font-mono tracking-wider">EN</span>
            </a>
            <button onClick={() => setLocation("/login")}
              className="flex items-center gap-1.5 border border-white/15 hover:border-white/30 text-white/60 hover:text-white/90 text-xs font-medium px-3 h-7 rounded-sm transition-all">
              Studio
            </button>
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-7 h-7 border border-white/15 hover:border-white/30 text-white/50 hover:text-white/90 rounded-sm transition-all"
              title="Buscar"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-7 h-7 border border-white/15 hover:border-amber-400/40 text-white/50 hover:text-amber-300 rounded-sm transition-all"
              title="Carrito"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {count}
                </span>
              )}
            </button>
            <button onClick={() => setLocation("/books")}
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold px-3 h-7 rounded-sm transition-all">
              Ver Books <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </header>

      {/* Modal búsqueda */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg mx-4 bg-[#0d1629] border border-white/10 rounded-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar certificaciones, formatos, conceptos..."
                className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 focus:outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") { setSearchOpen(false); setLocation("/books"); } }}
              />
              <span className="text-[10px] text-white/20 font-mono border border-white/10 px-1.5 py-0.5 rounded-sm">ESC</span>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Sugerencias rápidas</p>
              <div className="flex flex-wrap gap-2">
                {["AI-200", "AZ-900", "Visual Atlas", "Master Book", "Cheat Sheets"].map(s => (
                  <button key={s} onClick={() => { setSearchOpen(false); setLocation("/books"); }}
                    className="text-xs text-white/50 hover:text-white/80 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/10 px-2.5 h-6 rounded-sm transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
