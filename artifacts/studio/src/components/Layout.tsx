import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Cpu,
  CheckSquare,
  Download,
  Palette,
  LogOut,
  ChevronRight,
  LayoutGrid,
  Layers,
  BookOpen,
} from "lucide-react";

const TOOLS_NAV = [
  { href: "/contenido/1", label: "Contenido",       icon: FileText    },
  { href: "/generacion",  label: "Generación",       icon: Cpu         },
  { href: "/qa/1",        label: "QA y Aprobación",  icon: CheckSquare },
  { href: "/exportacion", label: "Exportación",      icon: Download    },
  { href: "/contrato",    label: "Contrato Visual",  icon: Palette     },
];

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="flex h-screen bg-[#f0f2f5] overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-52 bg-[#0d1629] flex flex-col shrink-0">

        {/* Logo */}
        <div className="flex items-center justify-center px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <Link href="/">
            <img
              src="/cloudbooks-logo-nobg.png"
              alt="CloudBooks"
              className="w-34 opacity-95 hover:opacity-100 transition-opacity"
              draggable={false}
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">

          {/* ── Inicio ──────────────────────────────────────────────────── */}
          <div className="px-2 mb-1">
            <Link
              href="/"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-all",
                location === "/" || location === "/portal"
                  ? "bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white border-l-2 border-blue-400 pl-[10px]"
                  : "text-white/40 hover:text-white/75 hover:bg-white/5"
              )}
            >
              <Home className={cn("w-3.5 h-3.5 shrink-0", (location === "/" || location === "/portal") ? "text-blue-400" : "text-white/30")} />
              <span>Inicio</span>
            </Link>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1.5" />

          {/* ── Biblioteca ──────────────────────────────────────────────── */}
          <div className="px-2 mb-1">
            <div className="px-3 py-1.5 flex items-center gap-2">
              <LayoutGrid className="w-3 h-3 text-white/20 shrink-0" />
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Biblioteca</span>
            </div>

            {/* Árbol: Biblioteca → Azure → AI-200 → Visual Atlas */}
            <Link
              href="/catalogo"
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-medium transition-colors",
                location.startsWith("/catalogo")
                  ? "text-white/80 bg-white/[0.05]"
                  : "text-white/35 hover:text-white/60"
              )}
            >
              <Layers className="w-3 h-3 shrink-0 text-white/20" />
              <span>Clouds y certificaciones</span>
            </Link>

            {/* Azure branch */}
            <div className="pl-4 mt-0.5">
              <Link
                href="/azure"
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-medium transition-colors",
                  location.startsWith("/azure")
                    ? "text-[#0078d4]/90 bg-[#0078d4]/10"
                    : "text-[#0078d4]/45 hover:text-[#0078d4]/80"
                )}
              >
                <ChevronRight className="w-2.5 h-2.5 shrink-0 text-white/15" />
                <span>Azure</span>
              </Link>

              {/* AI-200 branch */}
              <div className="pl-4 mt-0.5">
                <Link
                  href="/ai-200"
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-medium transition-colors",
                    location.startsWith("/ai-200")
                      ? "text-white/80 bg-white/[0.05]"
                      : "text-white/30 hover:text-white/60"
                  )}
                >
                  <ChevronRight className="w-2.5 h-2.5 shrink-0 text-white/15" />
                  <span>AI-200 Collection</span>
                </Link>

                {/* Visual Atlas (active format) */}
                <div className="pl-4 mt-0.5">
                  <Link
                    href="/biblioteca"
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-semibold transition-colors",
                      location.startsWith("/biblioteca")
                        ? "text-blue-400 bg-blue-500/10"
                        : "text-white/30 hover:text-blue-300"
                    )}
                  >
                    <ChevronRight className="w-2.5 h-2.5 shrink-0 text-white/15" />
                    <BookOpen className="w-2.5 h-2.5 shrink-0" />
                    <span>Visual Atlas</span>
                    <span className="ml-auto text-[7px] bg-blue-500/20 text-blue-300 px-1 py-px rounded-sm font-bold tracking-wide border border-blue-500/20">01–10</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1.5" />

          {/* ── Herramientas — formato activo ───────────────────────────── */}
          <div className="px-2">
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Herramientas</span>
              <span className="text-[7px] text-blue-400/50 font-medium">Visual Atlas</span>
            </div>
            <div className="space-y-0.5">
              {TOOLS_NAV.map(({ href, label, icon: Icon }) => {
                const segment = href.split("/")[1];
                const active = segment
                  ? location.startsWith(`/${segment}`)
                  : location === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-all",
                      active
                        ? "bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white border-l-2 border-blue-400 pl-[10px]"
                        : "text-white/40 hover:text-white/75 hover:bg-white/5"
                    )}
                    data-testid={`nav-${segment || href.replace("/", "")}`}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-blue-400" : "text-white/30")} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.05]" />

        {/* User */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-600">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-semibold truncate leading-none">{user?.displayName}</p>
              <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-white/20 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
              data-testid="button-logout"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {title && (
          <header className="bg-white border-b border-gray-200 px-6 py-2.5 shrink-0 flex items-center gap-1.5">
            <Link href="/catalogo" className="text-[10px] text-gray-300 hover:text-blue-500 transition-colors font-medium">Biblioteca</Link>
            <ChevronRight className="w-3 h-3 text-gray-200" />
            <Link href="/azure" className="text-[10px] text-[#0078d4]/50 hover:text-[#0078d4] transition-colors font-medium">Azure</Link>
            <ChevronRight className="w-3 h-3 text-gray-200" />
            <Link href="/ai-200" className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors font-medium">AI-200</Link>
            <ChevronRight className="w-3 h-3 text-gray-200" />
            <span className="text-[10px] text-gray-400 font-medium">Visual Atlas</span>
            <ChevronRight className="w-3 h-3 text-gray-200" />
            <span className="text-[10px] font-semibold text-gray-800">{title}</span>
          </header>
        )}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
