import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useListPages, useListBatches, useGetSummary } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { statusColor, statusLabel, scoreColor, groundingDot, groundingLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, Filter, ChevronRight, Star, Lock, FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const DOMAINS = [
  "Conceptos Fundamentales de IA",
  "Azure AI Services",
  "Azure AI Vision",
  "Azure AI Language",
  "Azure AI Speech",
  "Azure AI Document Intelligence",
  "Azure AI Search",
  "Azure OpenAI Service",
];

const DOMAIN_COLORS: Record<string, string> = {
  "Azure AI Vision":                  "#0891b2",
  "Azure AI Language":                "#7c3aed",
  "Azure AI Speech":                  "#0d9488",
  "Azure AI Document Intelligence":   "#d97706",
  "Azure AI Search":                  "#2563eb",
  "Azure OpenAI Service":             "#059669",
  "Conceptos Fundamentales de IA":    "#64748b",
  "Azure AI Services":                "#1d4ed8",
};

const DOMAIN_INITIALS: Record<string, string> = {
  "Azure AI Vision":                  "VIS",
  "Azure AI Language":                "LNG",
  "Azure AI Speech":                  "SPH",
  "Azure AI Document Intelligence":   "DOC",
  "Azure AI Search":                  "SCH",
  "Azure OpenAI Service":             "OAI",
  "Conceptos Fundamentales de IA":    "RAI",
  "Azure AI Services":                "SVC",
};

const STATUS_OPTIONS = ["pending", "generating", "review", "approved", "exported"];

export default function Biblioteca() {
  const [batch, setBatch] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const { data: pages = [], isLoading } = useListPages(
    { batch: batch || undefined, status: status || undefined, domain: domain || undefined },
    { query: { queryKey: ["listPages", batch, status, domain] } }
  );
  const { data: batches = [] } = useListBatches();
  const { data: summary } = useGetSummary();

  const filtered = useMemo(() => {
    if (!search) return pages;
    const q = search.toLowerCase();
    return pages.filter((p) =>
      p.title.toLowerCase().includes(q) ||
      p.pageNumber.includes(q) ||
      p.domain.toLowerCase().includes(q)
    );
  }, [pages, search]);

  const batch01_10 = filtered.filter((p) => {
    const n = parseInt(p.pageNumber, 10);
    return n >= 1 && n <= 10 && !batch && !status && !domain && !search;
  });
  const rest = filtered.filter((p) => {
    const n = parseInt(p.pageNumber, 10);
    return !(n >= 1 && n <= 10 && !batch && !status && !domain && !search);
  });
  const showSplit = batch01_10.length > 0 && rest.length > 0;

  return (
    <Layout title="Biblioteca — AI-200 Visual Study Atlas">
      {/* Stats strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-6 overflow-x-auto">
        {summary ? (
          <>
            <StatChip label="Total páginas" value={`${summary.total}/61`} />
            <div className="w-px h-4 bg-gray-200" />
            <StatChip label="Exportadas" value={(summary.byStatus as Record<string, number>)["exported"] ?? 0} color="text-teal-700" dot="bg-teal-500" />
            <StatChip label="Aprobadas" value={(summary.byStatus as Record<string, number>)["approved"] ?? 0} color="text-green-700" dot="bg-green-500" />
            <StatChip label="En revisión" value={(summary.byStatus as Record<string, number>)["review"] ?? 0} color="text-amber-700" dot="bg-amber-400" />
            <StatChip label="Generando" value={(summary.byStatus as Record<string, number>)["generating"] ?? 0} color="text-blue-700" dot="bg-blue-400" />
            <StatChip label="Pendientes" value={(summary.byStatus as Record<string, number>)["pending"] ?? 0} color="text-gray-500" dot="bg-gray-300" />
            {summary.avgQaScore != null && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <StatChip label="Score QA promedio" value={`${Math.round(summary.avgQaScore)}/100`} color={scoreColor(Math.round(summary.avgQaScore))} />
              </>
            )}
          </>
        ) : (
          <div className="flex gap-4">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-4 w-20" />)}</div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs w-44" data-testid="input-search-pages" />
        </div>
        <select value={batch} onChange={(e) => setBatch(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-batch">
          <option value="">Todos los batches</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.pageCount}p</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-status">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={domain} onChange={(e) => setDomain(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-domain">
          <option value="">Todos los dominios</option>
          {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        {(batch || status || domain || search) && (
          <button onClick={() => { setBatch(""); setStatus(""); setDomain(""); setSearch(""); }}
            className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} página{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="p-6 space-y-8">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
          </div>
        ) : (
          <>
            {/* Primera colección evaluada */}
            {showSplit && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-teal-600" />
                    <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Primera colección editorial evaluada</h2>
                  </div>
                  <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-sm font-medium">Páginas 01–10 · Batch 01–02</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {batch01_10.map((page) => (
                    <PageCard key={page.id} page={page}
                      color={DOMAIN_COLORS[page.domain] ?? "#0d1629"}
                      initials={DOMAIN_INITIALS[page.domain] ?? "AI"}
                      onClick={() => setLocation(`/contenido/${page.id}`)}
                      onQA={() => setLocation(`/qa/${page.id}`)}
                      featured />
                  ))}
                </div>
              </section>
            )}

            {/* Resto del atlas */}
            {(showSplit ? rest : filtered).length > 0 && (
              <section>
                {showSplit && (
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Páginas 11–61 · En desarrollo</h2>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {(showSplit ? rest : filtered).map((page) => (
                    <PageCard key={page.id} page={page}
                      color={DOMAIN_COLORS[page.domain] ?? "#0d1629"}
                      initials={DOMAIN_INITIALS[page.domain] ?? "AI"}
                      onClick={() => setLocation(`/contenido/${page.id}`)}
                      onQA={() => setLocation(`/qa/${page.id}`)} />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-400">Sin páginas con los filtros aplicados.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function StatChip({ label, value, color, dot }: { label: string; value: string | number; color?: string; dot?: string }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {dot && <div className={cn("w-1.5 h-1.5 rounded-full", dot)} />}
      <span className="text-[10px] text-gray-400 font-medium">{label}</span>
      <span className={cn("text-sm font-bold tabular-nums", color ?? "text-gray-900")}>{value}</span>
    </div>
  );
}

function PageCard({ page, color, initials, onClick, onQA, featured }: {
  page: any; color: string; initials: string;
  onClick: () => void; onQA: () => void; featured?: boolean;
}) {
  const pageNum = parseInt(page.pageNumber, 10);
  const isHighScore = page.qaScore != null && page.qaScore >= 90;
  const isProductionReady = page.qaScore != null && page.qaScore >= 95;

  return (
    <div
      className={cn(
        "bg-white border rounded-sm hover:shadow-md transition-all cursor-pointer group flex flex-col",
        featured ? "border-gray-200 hover:border-teal-300" : "border-gray-100 hover:border-gray-300"
      )}
      data-testid={`card-page-${page.id}`}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden rounded-t-sm" style={{ height: 88 }}>
        {/* Background gradient */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`
        }} />

        {/* Mini infographic mockup */}
        <div className="absolute inset-0 p-2.5 flex flex-col gap-1">
          {/* Mini header */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="w-4 h-4 rounded-sm flex items-center justify-center text-[7px] font-bold text-white shrink-0"
              style={{ backgroundColor: color }}>
              {initials.slice(0, 2)}
            </div>
            <div className="flex-1 h-1.5 rounded-sm opacity-30" style={{ backgroundColor: color }} />
          </div>
          {/* Mini content lines */}
          <div className="flex gap-1 flex-1">
            <div className="flex-1 space-y-1">
              {[70, 90, 55, 80].map((w, i) => (
                <div key={i} className="h-1 rounded-sm bg-gray-200" style={{ width: `${w}%` }} />
              ))}
            </div>
            {/* Mini diagram */}
            <div className="w-10 flex flex-col gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3.5 rounded-sm border flex items-center justify-center"
                  style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: `${color}60` }} />
                </div>
              ))}
            </div>
          </div>
          {/* Mini footer: trampa + autocheck */}
          <div className="flex gap-1">
            <div className="flex-1 h-2.5 rounded-sm bg-red-100 border border-red-200" />
            <div className="flex-1 h-2.5 rounded-sm bg-teal-50 border border-teal-200" />
          </div>
        </div>

        {/* Page number watermark */}
        <div className="absolute top-1.5 right-2 text-xl font-black leading-none opacity-15"
          style={{ color }}>
          {page.pageNumber}
        </div>

        {/* Indicators */}
        <div className="absolute top-1.5 left-1.5 flex gap-0.5">
          {isProductionReady && (
            <div title="Listo para producción (≥95)" className="w-3.5 h-3.5 bg-green-500 rounded-sm flex items-center justify-center">
              <Lock className="w-2 h-2 text-white" />
            </div>
          )}
          {isHighScore && !isProductionReady && (
            <div title="Score alto (≥90)" className="w-3.5 h-3.5 bg-amber-400 rounded-sm flex items-center justify-center">
              <Star className="w-2 h-2 text-white" />
            </div>
          )}
        </div>

        {/* Grounding dot */}
        <div className={cn("absolute bottom-1.5 right-1.5 w-2 h-2 rounded-full border border-white",
          groundingDot(page.groundingStatus ?? "unverified"))}
          title={groundingLabel(page.groundingStatus ?? "unverified")} />
      </div>

      {/* Info */}
      <div className="p-2.5 flex-1 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-semibold tracking-wide",
            statusColor(page.status))}>
            {statusLabel(page.status)}
          </span>
          {page.qaScore != null && (
            <span className={cn("text-xs font-bold tabular-nums", scoreColor(page.qaScore))}>
              {Math.round(page.qaScore)}
            </span>
          )}
        </div>
        <p className="text-[10px] font-semibold text-gray-900 leading-tight line-clamp-2 flex-1">
          {page.title}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[9px] text-gray-300 font-medium">{page.batch}</p>
          <button
            onClick={(e) => { e.stopPropagation(); onQA(); }}
            className="text-[9px] text-teal-600 hover:text-teal-800 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            data-testid={`button-qa-${page.id}`}
          >
            QA <ChevronRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
