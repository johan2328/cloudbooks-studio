import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, FileText, CheckSquare, Download, Palette,
  LogOut, ChevronRight, Layers, BookOpen, Activity,
  DollarSign, Shield, Map, HelpCircle, Table2, Zap,
} from "lucide-react";

/* ── Estructura de navegación del Studio ─────────────────────────────────── */

const NAV_PRODUCTION = [
  { href: "/contenido/1", label: "Contenido y Grounding", icon: Activity     },
  { href: "/generacion",  label: "Producción / Gen.",    icon: FileText      },
  { href: "/qa/1",        label: "QA y Aprobación",      icon: Shield        },
  { href: "/contrato",    label: "Contratos editoriales",icon: Palette       },
  { href: "/exportacion", label: "Exportación",           icon: Download      },
  { href: "/ejecuciones", label: "Costos y Ejecuciones", icon: DollarSign    },
];

const AI200_FORMATS = [
  { href: "/biblioteca", label: "Visual Atlas",       icon: Map,        badge: "01–10", active: true  },
  { href: null,          label: "Master Book",        icon: BookOpen,   badge: null,    active: false },
  { href: null,          label: "Exam Traps Guide",   icon: Shield,     badge: null,    active: false },
  { href: null,          label: "Question Bank",      icon: HelpCircle, badge: null,    active: false },
  { href: null,          label: "Cheat Sheets",       icon: Table2,     badge: null,    active: false },
  { href: null,          label: "Rapid Review Pack",  icon: Zap,        badge: null,    active: false },
];

const AZURE_CERTS = [
  { label: "AI-200", href: "/ai-200", active: true  },
  { label: "AZ-900", href: null,      active: false },
  { label: "AI-900", href: null,      active: false },
  { label: "DP-900", href: null,      active: false },
  { label: "AZ-104", href: null,      active: false },
  { label: "AZ-305", href: null,      active: false },
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

  /* Helpers para determinar si sección de biblioteca está abierta */
  const inBiblioteca = location.startsWith("/catalogo") || location.startsWith("/azure") ||
    location.startsWith("/ai-200") || location.startsWith("/biblioteca");
  const inAI200 = location.startsWith("/ai-200") || location.startsWith("/biblioteca");

  return (
    <div className="flex h-screen bg-[#0a1220] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-56 bg-[#0d1629] flex flex-col shrink-0 border-r border-white/[0.05]">

        {/* Logo + contexto Studio */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <Link href="/studio">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks"
              className="w-32 opacity-90 hover:opacity-100 transition-opacity" draggable={false} />
          </Link>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[7px] font-bold text-teal-400/60 uppercase tracking-[0.2em]">Studio</span>
            <span className="text-white/10">·</span>
            <span className="text-[7px] text-white/20">Producción editorial</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">

          {/* ── Dashboard ──────────────────────────────────────────────── */}
          <div className="px-2 mb-1">
            <Link href="/studio" className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-all",
              location === "/studio" || location === "/"
                ? "bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white border-l-2 border-blue-400 pl-[10px]"
                : "text-white/40 hover:text-white/75 hover:bg-white/5"
            )}>
              <LayoutDashboard className={cn("w-3.5 h-3.5 shrink-0",
                (location === "/studio" || location === "/") ? "text-blue-400" : "text-white/25")} />
              <span>Dashboard Studio</span>
            </Link>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1" />

          {/* ── Biblioteca editorial ────────────────────────────────────── */}
          <div className="px-2 mb-0.5">
            <div className="px-3 py-1 flex items-center gap-2">
              <Layers className="w-2.5 h-2.5 text-white/15 shrink-0" />
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Biblioteca editorial</span>
            </div>

            {/* Azure */}
            <div className="pl-3 mt-0.5">
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-sm text-[9px] font-bold transition-colors",
                inBiblioteca ? "text-[#0078d4]/80" : "text-[#0078d4]/35"
              )}>
                <ChevronRight className="w-2.5 h-2.5 shrink-0 text-white/10" />
                <span>Azure</span>
              </div>

              {/* Certificaciones Azure */}
              <div className="pl-3 mt-0.5 space-y-px">
                {AZURE_CERTS.map(cert => (
                  <div key={cert.label}>
                    {cert.active ? (
                      <Link href={cert.href!}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-semibold transition-colors",
                          inAI200 ? "text-white/80 bg-white/[0.05]" : "text-white/30 hover:text-white/60"
                        )}>
                        <ChevronRight className="w-2 h-2 shrink-0 text-white/10" />
                        <span>{cert.label}</span>
                        <span className="ml-auto text-[6px] bg-emerald-500/20 text-emerald-400 px-1 py-px rounded-sm font-bold tracking-wide border border-emerald-500/20">Activo</span>
                      </Link>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] text-white/15 cursor-not-allowed">
                        <ChevronRight className="w-2 h-2 shrink-0 text-white/8" />
                        <span>{cert.label}</span>
                        <span className="ml-auto text-[6px] text-white/15">plan.</span>
                      </div>
                    )}

                    {/* AI-200 → formatos expandidos */}
                    {cert.label === "AI-200" && inAI200 && (
                      <div className="pl-3 mt-0.5 space-y-px">
                        {AI200_FORMATS.map(fmt => {
                          const Icon = fmt.icon;
                          const isActiveFmt = fmt.href && location.startsWith(fmt.href);
                          return (
                            <div key={fmt.label}>
                              {fmt.active && fmt.href ? (
                                <Link href={fmt.href}
                                  className={cn(
                                    "flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[8px] font-medium transition-colors",
                                    isActiveFmt ? "text-blue-400 bg-blue-500/10" : "text-white/30 hover:text-blue-300/70"
                                  )}>
                                  <Icon className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">{fmt.label}</span>
                                  {fmt.badge && (
                                    <span className="ml-auto text-[6px] bg-blue-500/20 text-blue-300 px-1 py-px rounded-sm font-bold tracking-wide border border-blue-500/20 shrink-0">{fmt.badge}</span>
                                  )}
                                </Link>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 text-[8px] text-white/12 cursor-not-allowed">
                                  <Icon className="w-2.5 h-2.5 shrink-0 text-white/8" />
                                  <span className="truncate">{fmt.label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1" />

          {/* ── Producción ─────────────────────────────────────────────── */}
          <div className="px-2">
            <div className="px-3 py-1 flex items-center gap-2">
              <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Producción</span>
              <span className="text-[6px] text-blue-400/40 font-bold">AI-200</span>
            </div>
            <div className="space-y-px">
              {NAV_PRODUCTION.map(({ href, label, icon: Icon }) => {
                const segment = href.split("/")[1];
                const active = segment ? location.startsWith(`/${segment}`) : location === href;
                const isDisabled = href === "/ejecuciones";
                return (
                  <div key={href}>
                    {isDisabled ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] text-white/20 cursor-not-allowed">
                        <Icon className="w-3 h-3 shrink-0 text-white/10" />
                        <span className="truncate">{label}</span>
                        <span className="ml-auto text-[6px] text-white/15">pronto</span>
                      </div>
                    ) : (
                      <Link href={href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-medium transition-all",
                          active
                            ? "bg-gradient-to-r from-blue-600/20 to-violet-600/10 text-white border-l-2 border-blue-400 pl-[10px]"
                            : "text-white/35 hover:text-white/70 hover:bg-white/5"
                        )}>
                        <Icon className={cn("w-3 h-3 shrink-0", active ? "text-blue-400" : "text-white/20")} />
                        <span className="truncate">{label}</span>
                      </Link>
                    )}
                  </div>
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
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-black text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-600">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-semibold truncate leading-none">{user?.displayName}</p>
              <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button onClick={handleLogout}
              className="text-white/20 hover:text-red-400 transition-colors" title="Cerrar sesión">
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {title && (
          <header className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-2 shrink-0 flex items-center gap-1.5">
            <Link href="/studio" className="text-[9px] text-white/20 hover:text-white/50 transition-colors font-medium">Studio</Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <Link href="/catalogo" className="text-[9px] text-white/20 hover:text-white/50 transition-colors font-medium">Biblioteca</Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <Link href="/azure" className="text-[9px] text-[#0078d4]/40 hover:text-[#0078d4]/80 transition-colors font-medium">Azure</Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <Link href="/ai-200" className="text-[9px] text-white/30 hover:text-white/60 transition-colors font-medium">AI-200</Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <span className="text-[9px] font-semibold text-white/60">{title}</span>
          </header>
        )}
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
