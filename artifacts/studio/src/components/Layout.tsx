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
} from "lucide-react";

const NAV = [
  { href: "/biblioteca",  label: "Biblioteca",      icon: BookOpen   },
  { href: "/contenido/1", label: "Contenido",        icon: FileText   },
  { href: "/generacion",  label: "Generación",       icon: Cpu        },
  { href: "/qa/1",        label: "QA y Aprobación",  icon: CheckSquare },
  { href: "/exportacion", label: "Exportación",      icon: Download   },
  { href: "/contrato",    label: "Contrato Visual",  icon: Palette    },
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
    <div className="flex h-screen bg-[#f8f9fb] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 bg-[#0d1629] flex flex-col shrink-0">

        {/* Brand — logo PNG centered, bg matches logo background */}
        <div className="flex items-center justify-center px-4 pt-5 pb-4 border-b border-white/[0.06]">
          <Link href="/biblioteca">
            <img
              src="/cloudbooks-logo-nobg.png"
              alt="CloudBooks"
              className="w-36 opacity-95 hover:opacity-100 transition-opacity"
              draggable={false}
            />
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
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
                    active ? "text-blue-400" : "text-white/35"
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

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {title && (
          <header className="bg-white border-b border-gray-200 px-6 py-2.5 shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
          </header>
        )}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
