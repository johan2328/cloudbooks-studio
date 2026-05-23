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
  { href: "/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/contenido/1", label: "Contenido y Grounding", icon: FileText },
  { href: "/generacion", label: "Generación", icon: Cpu },
  { href: "/qa/1", label: "QA y Aprobación", icon: CheckSquare },
  { href: "/exportacion", label: "Exportación", icon: Download },
  { href: "/contrato", label: "Contrato Visual", icon: Palette },
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
      <aside className="w-56 bg-[#0d1629] flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-2 border-teal-400 rounded-sm flex items-center justify-center shrink-0">
              <div className="w-2 h-2 bg-teal-400 rounded-sm" />
            </div>
            <div>
              <p className="text-white text-xs font-bold tracking-tight leading-none">AI-200 Studio</p>
              <p className="text-gray-500 text-[9px] tracking-widest uppercase leading-none mt-0.5">Prod. Editorial</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location.startsWith(href.split("/")[1] ? `/${href.split("/")[1]}` : href);
            return (
              <Link key={href} href={href}>
                <a
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs font-medium transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  )}
                  data-testid={`nav-${href.replace("/", "")}`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{label}</span>
                </a>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-600 rounded-sm flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[10px] font-medium truncate leading-none">{user?.displayName}</p>
              <p className="text-gray-500 text-[9px] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        {title && (
          <header className="bg-white border-b border-gray-200 px-6 py-3 shrink-0">
            <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
          </header>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
