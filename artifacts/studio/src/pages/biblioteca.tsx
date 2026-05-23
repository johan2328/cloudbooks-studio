import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useListPages, useListBatches, useGetSummary } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { statusColor, statusLabel, scoreColor, groundingDot, groundingLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, Filter, ChevronRight } from "lucide-react";
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

const STATUS_OPTIONS = ["pending", "generating", "review", "approved", "exported"];

export default function Biblioteca() {
  const [batch, setBatch] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [domain, setDomain] = useState<string>("");
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

  const { data: pages = [], isLoading: pagesLoading } = useListPages(
    { batch: batch || undefined, status: status || undefined, domain: domain || undefined },
    { query: { queryKey: ["listPages", batch, status, domain] } }
  );
  const { data: batches = [] } = useListBatches();
  const { data: summary } = useGetSummary();

  const filtered = useMemo(() => {
    if (!search) return pages;
    return pages.filter((p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.pageNumber.includes(search)
    );
  }, [pages, search]);

  return (
    <Layout title="Biblioteca de Infografías">
      {/* Stats strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-6">
        {summary ? (
          <>
            <StatChip label="Total" value={summary.total} />
            <StatChip label="Aprobadas" value={(summary.byStatus as Record<string, number>)["approved"] ?? 0} color="text-green-700" />
            <StatChip label="En revisión" value={(summary.byStatus as Record<string, number>)["review"] ?? 0} color="text-amber-700" />
            <StatChip label="Pendientes" value={(summary.byStatus as Record<string, number>)["pending"] ?? 0} color="text-gray-500" />
            <StatChip label="Exportadas" value={(summary.byStatus as Record<string, number>)["exported"] ?? 0} color="text-teal-700" />
            {summary.avgQaScore != null && (
              <StatChip label="Score QA prom." value={`${Math.round(summary.avgQaScore)}`} color="text-blue-700" />
            )}
          </>
        ) : (
          <div className="flex gap-4">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-4 w-16" />)}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar página..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-7 text-xs w-48"
            data-testid="input-search-pages"
          />
        </div>

        {/* Batch filter */}
        <select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-batch"
        >
          <option value="">Todos los batches</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.pageCount}p)</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-status"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>

        {/* Domain filter */}
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="h-7 text-xs border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
          data-testid="select-domain"
        >
          <option value="">Todos los dominios</option>
          {DOMAINS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {(batch || status || domain || search) && (
          <button
            onClick={() => { setBatch(""); setStatus(""); setDomain(""); setSearch(""); }}
            className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1"
            data-testid="button-clear-filters"
          >
            <Filter className="w-3 h-3" />
            Limpiar
          </button>
        )}

        <span className="ml-auto text-xs text-gray-400">{filtered.length} páginas</span>
      </div>

      {/* Grid */}
      <div className="p-6">
        {pagesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((page) => (
              <PageCard
                key={page.id}
                page={page}
                onClick={() => setLocation(`/contenido/${page.id}`)}
                onQA={() => setLocation(`/qa/${page.id}`)}
              />
            ))}
          </div>
        )}
        {!pagesLoading && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">No se encontraron páginas con los filtros aplicados.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</span>
      <span className={cn("text-sm font-bold", color ?? "text-gray-900")}>{value}</span>
    </div>
  );
}

function PageCard({ page, onClick, onQA }: { page: any; onClick: () => void; onQA: () => void }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-sm hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer group"
      data-testid={`card-page-${page.id}`}
      onClick={onClick}
    >
      {/* Thumbnail placeholder */}
      <div className="h-20 bg-gradient-to-br from-[#0d1629]/5 to-teal-50 border-b border-gray-100 flex items-center justify-center relative overflow-hidden">
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0d1629]/20">{page.pageNumber}</p>
        </div>
        {/* Grounding indicator */}
        <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full", groundingDot(page.groundingStatus))} title={groundingLabel(page.groundingStatus)} />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1 mb-1.5">
          <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium", statusColor(page.status))}>
            {statusLabel(page.status)}
          </span>
          {page.qaScore != null && (
            <span className={cn("text-xs font-bold", scoreColor(page.qaScore))}>{Math.round(page.qaScore)}</span>
          )}
        </div>
        <p className="text-[11px] font-medium text-gray-900 leading-tight line-clamp-2 mb-1">
          {page.title}
        </p>
        <p className="text-[9px] text-gray-400 truncate">{page.batch}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[9px] text-gray-300">{page.domain.split(" ").slice(0, 2).join(" ")}</p>
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
