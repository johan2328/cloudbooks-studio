import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Cloud,
  Download,
  FileText,
  HelpCircle,
  History,
  LayoutDashboard,
  Layers,
  Lock,
  LogOut,
  Map,
  Blocks,
  Package,
  Pin,
  PinOff,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const BOOK_FORMATS = [
  { label: "Master Book", icon: BookOpen, enabled: false },
  { label: "Visual Atlas", icon: Map, enabled: true },
  { label: "Exam Traps Guide", icon: Shield, enabled: false },
  { label: "Question Bank", icon: HelpCircle, enabled: false },
  { label: "Cheat Sheets", icon: FileText, enabled: false },
  { label: "Rapid Review Pack", icon: Zap, enabled: false },
];

const NAV_PRODUCTION = [
  { href: "/biblioteca", label: "Overview", icon: Map, segment: "biblioteca" },
  { href: "/contenido-base", label: "Contenido", icon: Activity, segment: "contenido-base" },
  { href: "/composer/01", label: "Composer", icon: Blocks, segment: "composer" },
  { href: "/generacion", label: "Generacion", icon: Sparkles, segment: "generacion" },
  { href: "/qa/1", label: "QA editorial", icon: Shield, segment: "qa" },
  { href: "/actividad", label: "Runs", icon: History, segment: "actividad" },
  { href: "/contrato", label: "Contrato", icon: FileText, segment: "contrato" },
  { href: "/exportacion", label: "Exportacion", icon: Download, segment: "exportacion" },
];

const NAV_GOVERNANCE = [
  { href: "/estandares", label: "Estandares Editoriales", icon: BookOpen, segment: "estandares" },
];

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

function usePinnedCollection() {
  const [pinned, setPinned] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("cloudbooks.collectionPinned") !== "false";
  });

  useEffect(() => {
    window.localStorage.setItem("cloudbooks.collectionPinned", pinned ? "true" : "false");
  }, [pinned]);

  return { pinned, setPinned };
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [cloudTreeOpen, setCloudTreeOpen] = useState(true);
  const [azureOpen, setAzureOpen] = useState(true);
  const [ai200Open, setAi200Open] = useState(true);
  const { pinned: collectionPinned, setPinned: setCollectionPinned } = usePinnedCollection();

  return (
    <div className="flex h-screen bg-[#0a1220] overflow-hidden">
      <aside className="w-60 bg-[#0d1629] flex flex-col shrink-0 border-r border-white/[0.05]">
        <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <Link href="/studio">
            <img
              src="/cloudbooks-logo-nobg.png"
              alt="CloudBooks"
              className="w-28 opacity-90 hover:opacity-100 transition-opacity"
              draggable={false}
            />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-2 mb-1">
            {collectionPinned && (
              <Link
                href="/ai-200"
                className="mb-2 flex items-center gap-2 px-3 py-2 rounded-sm bg-violet-500/10 border border-violet-500/15 text-[10px] font-semibold text-violet-100/90 hover:bg-violet-500/16 transition-all"
              >
                <Pin className="w-3 h-3 text-violet-300 shrink-0" />
                <span className="truncate">AI-200 anclado</span>
              </Link>
            )}

            <Link
              href="/studio"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-semibold transition-all",
                location === "/studio" || location === "/"
                  ? "bg-blue-600/15 text-white border-l-2 border-blue-400 pl-[10px]"
                  : "text-white/48 hover:text-white/78 hover:bg-white/5",
              )}
            >
              <LayoutDashboard className={cn("w-3.5 h-3.5 shrink-0", location === "/studio" || location === "/" ? "text-blue-400" : "text-white/28")} />
              <span>Dashboard</span>
            </Link>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-1.5" />

          <div className="px-5 py-1">
            <span className="text-[7px] font-bold text-white/18 uppercase tracking-[0.18em]">Coleccion</span>
          </div>

          <div className="px-2 space-y-px">
            <button
              onClick={() => setCloudTreeOpen((value) => !value)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-[11px] font-semibold text-white/64 hover:text-white/88 hover:bg-white/5 transition-all"
            >
              {cloudTreeOpen ? <ChevronDown className="w-3 h-3 text-white/26" /> : <ChevronRight className="w-3 h-3 text-white/26" />}
              <BookOpen className="w-3 h-3 text-white/36" />
              <span>Biblioteca Cloud</span>
            </button>

            {cloudTreeOpen && (
              <div className="ml-4 pl-2 border-l border-white/[0.06] space-y-px">
                <button
                  onClick={() => setAzureOpen((value) => !value)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[10px] font-medium text-white/52 hover:text-white/78 hover:bg-white/5 transition-all"
                >
                  {azureOpen ? <ChevronDown className="w-2.5 h-2.5 text-white/20" /> : <ChevronRight className="w-2.5 h-2.5 text-white/20" />}
                  <Cloud className="w-3 h-3 text-blue-300/55" />
                  <span>Azure</span>
                </button>

                {azureOpen && (
                  <div className="ml-4 pl-2 border-l border-white/[0.05] space-y-px">
                    <button
                      onClick={() => setAi200Open((value) => !value)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-[10px] font-semibold text-white/66 hover:text-white/88 hover:bg-white/5 transition-all"
                    >
                      {ai200Open ? <ChevronDown className="w-2.5 h-2.5 text-white/20" /> : <ChevronRight className="w-2.5 h-2.5 text-white/20" />}
                      <Layers className="w-3 h-3 text-violet-300/65" />
                      <span>AI-200</span>
                    </button>

                    {ai200Open && (
                      <div className="ml-4 pl-2 border-l border-white/[0.05] space-y-px">
                        {BOOK_FORMATS.map(({ label, icon: Icon, enabled }) => {
                          const active = enabled && location.startsWith("/biblioteca");
                          const item = (
                            <div
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-sm text-[9px] font-semibold transition-all",
                                enabled
                                  ? active
                                    ? "bg-blue-600/15 text-white"
                                    : "text-blue-100/68 hover:text-white/92 hover:bg-white/5"
                                  : "text-white/22",
                              )}
                            >
                              <Icon className={cn("w-2.5 h-2.5 shrink-0", enabled ? "text-blue-300/75" : "text-white/15")} />
                              <span className="truncate">{label}</span>
                              {!enabled && <Lock className="w-2 h-2 ml-auto text-white/12" />}
                            </div>
                          );

                          return enabled ? (
                            <Link key={label} href="/biblioteca">
                              {item}
                            </Link>
                          ) : (
                            <div key={label} title="Formato planificado">
                              {item}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1">
              <Link
                href="/ai-200"
                className={cn(
                  "mt-1 flex-1 flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-medium transition-all",
                  location.startsWith("/ai-200")
                    ? "bg-violet-600/15 text-white border-l-2 border-violet-400 pl-[10px]"
                    : "text-white/42 hover:text-white/74 hover:bg-white/5",
                )}
              >
                <Package className={cn("w-3 h-3 shrink-0", location.startsWith("/ai-200") ? "text-violet-300" : "text-white/24")} />
                <span>AI-200 Collection</span>
              </Link>

              <button
                type="button"
                onClick={() => setCollectionPinned((value) => !value)}
                title={collectionPinned ? "Desanclar coleccion" : "Anclar coleccion"}
                className="mt-1 h-8 w-8 rounded-sm border border-white/[0.06] text-white/30 hover:text-violet-200 hover:border-violet-400/20 hover:bg-violet-500/10 transition-all flex items-center justify-center"
              >
                {collectionPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-2" />

          <div className="px-5 py-1">
            <span className="text-[7px] font-bold text-white/18 uppercase tracking-[0.18em]">Visual Atlas</span>
          </div>

          <div className="px-2 space-y-px">
            {NAV_PRODUCTION.map(({ href, label, icon: Icon, segment }) => {
              const active = location.startsWith(`/${segment}`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-medium transition-all",
                    active
                      ? "bg-blue-600/15 text-white border-l-2 border-blue-400 pl-[10px]"
                      : "text-white/40 hover:text-white/74 hover:bg-white/5",
                  )}
                >
                  <Icon className={cn("w-3 h-3 shrink-0", active ? "text-blue-400" : "text-white/22")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-2" />

          <div className="px-5 py-1">
            <span className="text-[7px] font-bold text-white/18 uppercase tracking-[0.18em]">Gobernanza</span>
          </div>

          <div className="px-2 space-y-px">
            {NAV_GOVERNANCE.map(({ href, label, icon: Icon, segment }) => {
              const active = location.startsWith(`/${segment}`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] font-medium transition-all",
                    active
                      ? "bg-teal-600/15 text-white border-l-2 border-teal-500 pl-[10px]"
                      : "text-white/36 hover:text-white/66 hover:bg-white/5",
                  )}
                >
                  <Icon className={cn("w-3 h-3 shrink-0", active ? "text-teal-400" : "text-white/18")} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mx-3 h-px bg-white/[0.05] my-2" />

          <div className="mx-2 bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2 space-y-1">
            <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Configuracion activa</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
              <span className="text-[8px] text-teal-300/70 font-semibold">gpt-4o-mini · texto/QA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
              <span className="text-[8px] text-violet-300/70 font-semibold">gpt-image-2 medium</span>
            </div>
            <p className="text-[7px] text-white/15 leading-tight mt-0.5">High bloqueado · template v24 locked</p>
          </div>
        </nav>

        <div className="border-t border-white/[0.05] px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-black text-white shrink-0 bg-gradient-to-br from-blue-600 to-violet-600">
              {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/75 text-[10px] font-semibold truncate leading-none">{user?.displayName}</p>
              <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={() => {
                logout();
                setLocation("/login");
              }}
              className="text-white/20 hover:text-red-400 transition-colors"
              title="Cerrar sesion"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {title && (
          <header className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-2 shrink-0 flex items-center gap-1.5">
            <Link href="/studio" className="text-[9px] text-white/20 hover:text-white/50 transition-colors">
              Studio
            </Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <Link href="/ai-200" className="text-[9px] text-[#0078d4]/50 hover:text-[#0078d4]/80 transition-colors">
              AI-200 Collection
            </Link>
            <ChevronRight className="w-2.5 h-2.5 text-white/10" />
            <span className="text-[9px] font-semibold text-white/60">{title}</span>
          </header>
        )}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
