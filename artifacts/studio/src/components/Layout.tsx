import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FileText,
  Cpu,
  CheckSquare,
  Download,
  Palette,
  LogOut,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";

const STUDIO_NAV = [
  { href: "/biblioteca",  label: "Biblioteca",     icon: BookOpen    },
  { href: "/contenido/1", label: "Contenido",       icon: FileText    },
  { href: "/generacion",  label: "Generación",      icon: Cpu         },
  { href: "/qa/1",        label: "QA y Aprobación", icon: CheckSquare },
  { href: "/exportacion", label: "Exportación",     icon: Download    },
  { href: "/contrato",    label: "Contrato Visual", icon: Palette     },
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
          <Link href="/catalogo">
            <img
              src="/cloudbooks-logo-nobg.png"
              alt="CloudBooks"
              className="w-36 opacity-95 hover:opacity-100 transition-opacity"
              draggable={false}
            />
          </Link>
        </div>

        {/* Contexto jerárquico: CloudBooks > Azure > AI-200 */}
        <div className="px-3 pt-3 pb-2">
          {/* Back to catalog */}
          <Link
            href="/catalogo"
            className="flex items-center gap-1.5 text-[9px] text-white/30 hover:text-white/60 transition-colors mb-2 group"
            data-testid="nav-catalogo"
          >
            <LayoutGrid className="w-3 h-3 group-hover:text-blue-400 transition-colors" />
            <span>Biblioteca CloudBooks</span>
          </Link>

          {/* Breadcrumb path */}
          <div className="bg-white/[0.04] border border-white/[0.06] rounded-sm px-2.5 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[8px] text-[#0078d4]/70 font-semibold uppercase tracking-wider">Azure</span>
              <ChevronRight className="w-2.5 h-2.5 text-white/15" />
              <span className="text-[8px] text-white/50 font-semibold uppercase tracking-wider">AI-200</span>
            </div>
            <p className="text-[9px] text-white/40 leading-tight font-medium">Visual Study Atlas</p>
          </div>
        </div>

        <div className="mx-3 h-px bg-white/[0.05] mb-1" />

        {/* Nav items */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {STUDIO_NAV.map(({ href, label, icon: Icon }) => {
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
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 shrink-0",
                    active ? "text-blue-400" : "text-white/30"
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-white/[0.05]" />

        {/* User footer */}
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-600">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-semibold truncate leading-none">
                {user?.displayName}
              </p>
              <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">
                {user?.role}
              </p>
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

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {title && (
          <header className="bg-white border-b border-gray-200 px-6 py-2.5 shrink-0 flex items-center gap-2">
            {/* Mini breadcrumb in topbar */}
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="font-medium text-gray-300">CloudBooks</span>
              <ChevronRight className="w-3 h-3 text-gray-200" />
              <span className="text-[#0078d4]/60 font-medium">Azure</span>
              <ChevronRight className="w-3 h-3 text-gray-200" />
              <span className="text-gray-400 font-medium">AI-200 Visual Study Atlas</span>
              <ChevronRight className="w-3 h-3 text-gray-200" />
              <span className="font-semibold text-gray-700">{title}</span>
            </div>
          </header>
        )}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
