import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, FileText, Shield, Download, LogOut,
  ChevronRight, Sparkles, Activity, BookOpen,
} from "lucide-react";

const NAV_PRODUCTION = [
  { href: "/biblioteca",    label: "Visual Atlas",      icon: Map,       segment: "biblioteca" },
  { href: "/contenido/1",   label: "Contenido",         icon: Activity,  segment: "contenido" },
  { href: "/generacion",    label: "Generar",           icon: Sparkles,  segment: "generacion" },
  { href: "/qa/1",          label: "QA y Aprobación",   icon: Shield,    segment: "qa" },
  { href: "/exportacion",   label: "Exportación",       icon: Download,  segment: "exportacion" },
];

const NAV_GOVERNANCE = [
  { href: "/estandares",    label: "Estándares Editoriales", icon: BookOpen, segment: "estandares" },
  { href: "/contrato",      label: "Contrato Visual",        icon: FileText, segment: "contrato" },
];

interface LayoutProps { children: ReactNode; title?: string }

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  return (
    <div className="flex h-screen bg-[#0a1220] overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-48 bg-[#0d1629] flex flex-col shrink-0 border-r border-white/[0.05]">

        {/* Logo */}
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <Link href="/studio">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks"
              className="w-28 opacity-90 hover:opacity-100 transition-opacity" draggable={false} />
          </Link>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-[7px] font-bold text-teal-400/60 uppercase tracking-[0.2em]">Studio</span>
            <span className="text-white/10">·</span>
            <span className="text-[7px] text-white/20">AI-200 Visual Atlas</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">

          {/* Dashboard */}
          <div className="px-2 mb-1">
            <Link href="/studio" className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-all",
              location === "/studio" || location === "/"
                ? "bg-blue-600/15 text-white border-l-2 border-blue-400 pl-[10px]"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            )}>
              <LayoutDashboard className={cn("w-3.5 h-3.5 shrink-0",
                (location === "/studio" || location === "/") ? "text-blue-400" : "text-white/25")} />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1.5" />

          {/* AI-200 · Producción */}
          <div className="px-5 py-1">
            <span className="text-[7px] font-bold text-white/15 uppercase tracking-[0.18em]">AI-200 · Producción</span>
          </div>

          <div className="px-2 space-y-px">
            {NAV_PRODUCTION.map(({ href, label, icon: Icon, segment }) => {
              const active = location.startsWith(`/${segment}`);
              return (
                <Link key={href} href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-medium transition-all",
                    active
                      ? "bg-blue-600/15 text-white border-l-2 border-blue-400 pl-[10px]"
                      : "text-white/35 hover:text-white/70 hover:bg-white/5"
                  )}>
                  <Icon className={cn("w-3 h-3 shrink-0", active ? "text-blue-400" : "text-white/20")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-2" />

          {/* Gobernanza */}
          <div className="px-5 py-1">
            <span className="text-[7px] font-bold text-white/15 uppercase tracking-[0.18em]">Gobernanza</span>
          </div>

          <div className="px-2 space-y-px">
            {NAV_GOVERNANCE.map(({ href, label, icon: Icon, segment }) => {
              const active = location.startsWith(`/${segment}`);
              return (
                <Link key={href} href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-medium transition-all",
                    active
                      ? "bg-teal-600/15 text-white border-l-2 border-teal-500 pl-[10px]"
                      : "text-white/30 hover:text-white/60 hover:bg-white/5"
                  )}>
                  <Icon className={cn("w-3 h-3 shrink-0", active ? "text-teal-400" : "text-white/18")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-2" />

          {/* Modelo activo */}
          <div className="mx-2 bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2 space-y-1">
            <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Configuración activa</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              <span className="text-[8px] text-teal-300/70 font-semibold">gpt-4o-mini · texto/QA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              <span className="text-[8px] text-violet-300/70 font-semibold">gpt-image-2 medium</span>
            </div>
            <p className="text-[7px] text-white/15 leading-tight mt-0.5">
              High bloqueado · template v24 locked
            </p>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.05] px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-black text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-600">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-semibold truncate leading-none">{user?.displayName}</p>
              <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button onClick={() => { logout(); setLocation("/login"); }}
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
            <Link href="/studio" className="text-[9px] text-white/20 hover:text-white/50 transition-colors">Studio</Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <Link href="/biblioteca" className="text-[9px] text-[#0078d4]/50 hover:text-[#0078d4]/80 transition-colors">Visual Atlas AI-200</Link>
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
