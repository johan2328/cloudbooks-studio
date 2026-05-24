import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { ChevronRight, LogOut } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

interface CatalogLayoutProps {
  crumbs: Crumb[];
  children: ReactNode;
}

export default function CatalogLayout({ crumbs, children }: CatalogLayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-[#0a1220] flex flex-col">
      {/* Topbar */}
      <header className="bg-[#0d1629] border-b border-white/[0.06] px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/catalogo">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 opacity-95 hover:opacity-100 transition-opacity" draggable={false} />
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <p className="text-white/40 text-[10px] uppercase tracking-[2.5px] font-medium">
            Consola Editorial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white/70 text-[10px] font-semibold leading-none">{user?.displayName}</p>
            <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
          </div>
          <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br from-blue-600 to-violet-600 shrink-0">
            {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <button onClick={handleLogout} className="text-white/20 hover:text-red-400 transition-colors ml-1" title="Cerrar sesión">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-[#0d1629] border-b border-white/[0.06] px-8 py-2 flex items-center gap-1.5 shrink-0">
        {crumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-white/10" />}
            {crumb.href ? (
              <Link href={crumb.href} className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[10px] font-semibold text-white/50">{crumb.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
