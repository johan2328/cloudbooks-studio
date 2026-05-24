import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useListPages, useGetSummary } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { LogOut, BookOpen, ChevronRight, Lock, ArrowRight, Layers } from "lucide-react";

/* ─── Catálogo estático de libros ─────────────────────────────────────────── */
interface Book {
  code: string;
  title: string;
  subtitle: string;
  status: "produccion" | "planificado" | "proximo";
  totalPages: number;
  lastBatch: string | null;
  href: string | null;
  live: boolean;
}

const AZURE_BOOKS: Book[] = [
  {
    code: "AI-200",
    title: "Visual Study Atlas",
    subtitle: "Azure AI Engineer Associate",
    status: "produccion",
    totalPages: 61,
    lastBatch: "Batch 01–10",
    href: "/biblioteca",
    live: true,
  },
  {
    code: "AZ-900",
    title: "Azure Fundamentals",
    subtitle: "Microsoft Azure Fundamentals",
    status: "planificado",
    totalPages: 48,
    lastBatch: null,
    href: null,
    live: false,
  },
  {
    code: "AI-900",
    title: "Azure AI Fundamentals",
    subtitle: "Microsoft Azure AI Fundamentals",
    status: "planificado",
    totalPages: 42,
    lastBatch: null,
    href: null,
    live: false,
  },
  {
    code: "DP-900",
    title: "Azure Data Fundamentals",
    subtitle: "Microsoft Azure Data Fundamentals",
    status: "planificado",
    totalPages: 44,
    lastBatch: null,
    href: null,
    live: false,
  },
  {
    code: "AZ-104",
    title: "Azure Administrator",
    subtitle: "Microsoft Azure Administrator",
    status: "planificado",
    totalPages: 72,
    lastBatch: null,
    href: null,
    live: false,
  },
];

const STATUS_CONFIG = {
  produccion: { label: "En producción",  dot: "bg-emerald-400", text: "text-emerald-400", ring: "ring-emerald-500/20" },
  planificado: { label: "Planificado",   dot: "bg-amber-400",   text: "text-amber-400",   ring: "ring-amber-500/20"  },
  proximo:     { label: "Próximamente",  dot: "bg-white/15",    text: "text-white/30",    ring: "ring-white/10"      },
};

/* ─── Componente principal ────────────────────────────────────────────────── */
export default function Catalogo() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const pagesQuery  = useListPages();
  const statsQuery  = useGetSummary();

  const pages    = pagesQuery.data  ?? [];
  const stats    = statsQuery.data;
  const approved = pages.filter((p) => p.status === "approved").length;
  const avgScore = pages.length > 0
    ? (pages.reduce((s, p) => s + (p.qaScore ?? 0), 0) / pages.filter(p => p.qaScore).length).toFixed(1)
    : "—";

  function handleLogout() {
    logout();
    setLocation("/login");
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">

      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <header className="bg-[#0d1629] border-b border-white/[0.06] px-8 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-8" draggable={false} />
          <div className="h-4 w-px bg-white/10" />
          <div>
            <p className="text-white/60 text-[10px] uppercase tracking-[2.5px] font-medium leading-none">
              Biblioteca de Certificaciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white/70 text-[10px] font-semibold leading-none">{user?.displayName}</p>
            <p className="text-white/25 text-[8px] capitalize leading-none mt-0.5">{user?.role}</p>
          </div>
          <div className="w-6 h-6 rounded-sm flex items-center justify-center text-[9px] font-bold text-white bg-gradient-to-br from-blue-600 to-violet-600">
            {user?.displayName?.slice(0, 2).toUpperCase() ?? "??"}
          </div>
          <button onClick={handleLogout} className="text-white/20 hover:text-red-400 transition-colors ml-1" title="Cerrar sesión">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Breadcrumb path ───────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-8 py-2 flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-gray-800">CloudBooks</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-[10px] text-gray-400">Biblioteca de Certificaciones</span>
      </div>

      {/* ── Contenido principal ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-6xl w-full mx-auto">

        {/* ── Proveedor: Microsoft Azure ─────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {/* Azure badge */}
            <div className="flex items-center gap-2 bg-[#0078d4]/10 border border-[#0078d4]/20 rounded-sm px-3 py-1.5">
              <div className="w-3.5 h-3.5 rounded-sm bg-[#0078d4] flex items-center justify-center">
                <span className="text-white text-[7px] font-bold">Az</span>
              </div>
              <span className="text-[11px] font-semibold text-[#0078d4]">Microsoft Azure</span>
            </div>
            <span className="text-[10px] text-gray-400">{AZURE_BOOKS.length} libros en catálogo</span>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] text-gray-300 italic">Proveedor activo</span>
          </div>

          {/* Book cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {AZURE_BOOKS.map((book) => (
              <BookCard
                key={book.code}
                book={book}
                liveStats={book.live ? { pages: pages.length, approved, avgScore: avgScore.toString() } : null}
                onOpen={() => book.href && setLocation(book.href)}
              />
            ))}
          </div>
        </div>

        {/* ── Arquitectura editorial ─────────────────────────────────────── */}
        <div className="mt-8 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-gray-400" />
            <h2 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Arquitectura editorial</h2>
          </div>
          <div className="bg-white border border-gray-200 rounded-sm p-5">
            <div className="flex items-start gap-3 overflow-x-auto pb-1">
              {[
                { label: "Proveedor Cloud",     value: "Azure / AWS / GCP", active: true  },
                { label: "Certificación",        value: "AI-200 / AZ-900 / …", active: false },
                { label: "Libro editorial",      value: "Visual Study Atlas", active: false },
                { label: "Dominio / Batch",      value: "13 batches · 61 pág.", active: false },
                { label: "Infografía",           value: "Layout · Contenido · QA", active: false },
                { label: "Output",               value: "PNG · HTML · PDF", active: false },
              ].map((item, i, arr) => (
                <div key={item.label} className="flex items-center gap-2 shrink-0">
                  <div className={cn(
                    "px-3 py-2 rounded-sm border text-center min-w-[110px]",
                    item.active ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
                  )}>
                    <p className={cn("text-[9px] uppercase tracking-wider font-bold mb-0.5",
                      item.active ? "text-blue-500" : "text-gray-400")}>{item.label}</p>
                    <p className="text-[10px] text-gray-700 font-medium">{item.value}</p>
                  </div>
                  {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-400 mt-3 border-t border-gray-100 pt-2">
              Cada libro contiene dominios temáticos, infografías organizadas en batches, historial de generación IA, registros QA multidimensional y un Contrato Visual versionado.
            </p>
          </div>
        </div>

        {/* ── Futuros proveedores ────────────────────────────────────────── */}
        <div className="border border-dashed border-gray-200 rounded-sm px-5 py-4 flex items-center gap-4">
          <Lock className="w-4 h-4 text-gray-300 shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-gray-400">Próximas familias cloud</p>
            <p className="text-[9px] text-gray-300 mt-0.5">
              AWS Certification Atlas · Google Cloud Certification Atlas — en hoja de ruta, no disponibles aún
            </p>
          </div>
          <div className="flex gap-2">
            {["AWS", "GCP"].map(p => (
              <div key={p} className="px-2.5 py-1 rounded-sm border border-dashed border-gray-200 text-[9px] font-semibold text-gray-300 uppercase tracking-wider">
                {p}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ─── Book card ───────────────────────────────────────────────────────────── */
interface LiveStats {
  pages: number;
  approved: number;
  avgScore: string;
}

function BookCard({ book, liveStats, onOpen }: { book: Book; liveStats: LiveStats | null; onOpen: () => void }) {
  const cfg = STATUS_CONFIG[book.status];
  const progress = liveStats ? Math.round((liveStats.approved / book.totalPages) * 100) : 0;

  return (
    <div className={cn(
      "bg-white border rounded-sm flex flex-col transition-all",
      book.live
        ? "border-blue-200 shadow-sm hover:shadow-md hover:border-blue-300"
        : "border-gray-200 opacity-70"
    )}>
      {/* Card header */}
      <div className={cn(
        "px-4 pt-4 pb-3 border-b",
        book.live ? "border-blue-100 bg-gradient-to-r from-blue-50/60 to-violet-50/30" : "border-gray-100 bg-gray-50/50"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm",
                book.live ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              )}>
                {book.code}
              </span>
              <div className={cn("flex items-center gap-1 text-[9px] font-medium", cfg.text)}>
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </div>
            </div>
            <p className={cn("text-sm font-bold leading-tight", book.live ? "text-gray-900" : "text-gray-500")}>
              {book.title}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{book.subtitle}</p>
          </div>
          {!book.live && <Lock className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />}
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
        <Stat label="Infografías" value={book.totalPages.toString()} />
        <Stat
          label="Aprobadas"
          value={liveStats ? `${liveStats.approved}` : "—"}
          sub={liveStats ? `/ ${book.totalPages}` : undefined}
        />
        <Stat
          label="Score QA"
          value={liveStats ? liveStats.avgScore : "—"}
          highlight={liveStats != null}
        />
      </div>

      {/* Progress bar + batch */}
      <div className="px-4 py-3">
        {book.live && liveStats ? (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] text-gray-400 font-medium">Progreso editorial</span>
              <span className="text-[9px] font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5">Último batch: <span className="text-gray-600 font-medium">{book.lastBatch}</span></p>
          </>
        ) : (
          <p className="text-[9px] text-gray-300 italic">
            {book.status === "planificado" ? "Pendiente de planificación editorial" : "No disponible aún"}
          </p>
        )}
      </div>

      {/* CTA */}
      <div className="px-4 pb-4 mt-auto">
        {book.live ? (
          <button
            onClick={onOpen}
            className="w-full flex items-center justify-center gap-2 h-8 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold rounded-sm transition-all shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Abrir estudio
            <ArrowRight className="w-3 h-3 ml-auto" />
          </button>
        ) : (
          <div className="w-full flex items-center justify-center h-8 bg-gray-100 text-gray-400 text-xs font-medium rounded-sm cursor-not-allowed gap-1.5">
            <Lock className="w-3 h-3" />
            Planificado
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[8px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold leading-none", highlight ? "text-blue-600" : "text-gray-700")}>
        {value}
        {sub && <span className="text-gray-400 text-xs font-normal ml-0.5">{sub}</span>}
      </p>
    </div>
  );
}
