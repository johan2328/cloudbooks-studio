import { useLocation } from "wouter";
import CatalogLayout from "@/components/CatalogLayout";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock, BookOpen } from "lucide-react";
import { useListPages } from "@workspace/api-client-react";

interface Cert {
  code: string;
  name: string;
  fullName: string;
  level: "Fundamentals" | "Associate" | "Expert" | "Specialty";
  status: "active" | "planned";
  formats: number;
  activeFormats: number;
  estimatedPages: number;
  href: string | null;
}

const CERTS: Cert[] = [
  {
    code: "AI-200",
    name: "Azure AI Engineer",
    fullName: "Azure AI Engineer Associate",
    level: "Associate",
    status: "active",
    formats: 6,
    activeFormats: 1,
    estimatedPages: 61,
    href: "/ai-200",
  },
  {
    code: "AZ-900",
    name: "Azure Fundamentals",
    fullName: "Microsoft Azure Fundamentals",
    level: "Fundamentals",
    status: "planned",
    formats: 6,
    activeFormats: 0,
    estimatedPages: 48,
    href: null,
  },
  {
    code: "AI-900",
    name: "Azure AI Fundamentals",
    fullName: "Microsoft Azure AI Fundamentals",
    level: "Fundamentals",
    status: "planned",
    formats: 6,
    activeFormats: 0,
    estimatedPages: 42,
    href: null,
  },
  {
    code: "DP-900",
    name: "Azure Data Fundamentals",
    fullName: "Microsoft Azure Data Fundamentals",
    level: "Fundamentals",
    status: "planned",
    formats: 6,
    activeFormats: 0,
    estimatedPages: 44,
    href: null,
  },
  {
    code: "AZ-104",
    name: "Azure Administrator",
    fullName: "Microsoft Azure Administrator",
    level: "Associate",
    status: "planned",
    formats: 6,
    activeFormats: 0,
    estimatedPages: 72,
    href: null,
  },
  {
    code: "AZ-305",
    name: "Azure Solutions Architect",
    fullName: "Azure Solutions Architect Expert",
    level: "Expert",
    status: "planned",
    formats: 6,
    activeFormats: 0,
    estimatedPages: 80,
    href: null,
  },
];

const LEVEL_CONFIG = {
  Fundamentals: { color: "text-sky-400",  bg: "bg-sky-500/10",   border: "border-sky-500/20",   label: "Fundamentals"  },
  Associate:    { color: "text-blue-400", bg: "bg-blue-500/10",  border: "border-blue-500/20",  label: "Associate"     },
  Expert:       { color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", label: "Expert"     },
  Specialty:    { color: "text-teal-400", bg: "bg-teal-500/10",  border: "border-teal-500/20",  label: "Specialty"     },
};

export default function Azure() {
  const [, setLocation] = useLocation();
  const pagesQuery = useListPages();
  const pages = pagesQuery.data ?? [];
  const approved = pages.filter((p) => p.status === "approved").length;
  const total = pages.length;
  const avgQA = pages.filter(p => p.qaScore && p.qaScore > 0).length > 0
    ? (pages.reduce((s, p) => s + (p.qaScore ?? 0), 0) / pages.filter(p => p.qaScore && p.qaScore > 0).length).toFixed(1)
    : null;

  return (
    <CatalogLayout crumbs={[
      { label: "Biblioteca", href: "/catalogo" },
      { label: "Azure" },
    ]}>
      <div className="px-8 py-8 max-w-5xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded bg-[#0078d4] flex items-center justify-center text-white text-sm font-bold shrink-0">
            Az
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Microsoft Azure</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {CERTS.length} certificaciones · {CERTS.filter(c => c.status === "active").length} en producción · 6 formatos editoriales por colección
            </p>
          </div>
        </div>

        {/* Certs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-8">
          {CERTS.map((cert) => {
            const lvl = LEVEL_CONFIG[cert.level];
            const isActive = cert.status === "active";

            return (
              <div
                key={cert.code}
                className={cn(
                  "bg-[#0d1629] border rounded-sm flex flex-col transition-all",
                  isActive
                    ? "border-white/[0.08] hover:border-white/[0.15] shadow-sm hover:shadow-md"
                    : "border-white/[0.04] opacity-65"
                )}
              >
                {/* Card header */}
                <div className={cn(
                  "px-4 pt-4 pb-3 border-b",
                  isActive
                    ? "bg-blue-500/5 border-white/[0.06]"
                    : "bg-white/[0.02] border-white/[0.04]"
                )}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={cn("text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm",
                      isActive ? "bg-blue-600 text-white" : "bg-white/[0.08] text-white/30")}>
                      {cert.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm border", lvl.bg, lvl.border, lvl.color)}>
                        {lvl.label}
                      </span>
                      {!isActive && <Lock className="w-3 h-3 text-white/15" />}
                    </div>
                  </div>
                  <p className={cn("text-sm font-bold leading-tight", isActive ? "text-white" : "text-white/30")}>
                    {cert.name}
                  </p>
                  <p className="text-[9px] text-white/20 mt-0.5">{cert.fullName}</p>
                </div>

                {/* Stats */}
                <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-white/[0.04] text-center">
                  <div>
                    <p className="text-[8px] text-white/20 uppercase tracking-wider font-medium">Formatos</p>
                    <p className="text-xs font-bold text-white/60 mt-0.5">{cert.formats}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/20 uppercase tracking-wider font-medium">Infografías</p>
                    <p className="text-xs font-bold text-white/60 mt-0.5">
                      {isActive ? total : cert.estimatedPages + "*"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] text-white/20 uppercase tracking-wider font-medium">Score QA</p>
                    <p className={cn("text-xs font-bold mt-0.5", isActive && avgQA ? "text-blue-400" : "text-white/15")}>
                      {isActive && avgQA ? avgQA : "—"}
                    </p>
                  </div>
                </div>

                {/* Progress (only AI-200) */}
                {isActive && (
                  <div className="px-4 py-2.5 border-b border-white/[0.04]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-white/30">Visual Atlas — {approved}/{total} aprobadas</span>
                      <span className="text-[9px] font-bold text-blue-400">{total > 0 ? Math.round((approved / total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                        style={{ width: `${total > 0 ? Math.round((approved / total) * 100) : 0}%` }} />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="px-4 py-3 mt-auto">
                  {isActive ? (
                    <button
                      onClick={() => cert.href && setLocation(cert.href)}
                      className="w-full flex items-center justify-center gap-2 h-8 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold rounded-sm transition-all shadow-sm"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Ver colección
                      <ArrowRight className="w-3 h-3 ml-auto" />
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center h-8 bg-white/[0.03] text-white/15 text-xs font-medium rounded-sm cursor-not-allowed gap-1.5 border border-white/[0.04]">
                      <Lock className="w-3 h-3" />
                      Planificado
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Nota estimados */}
        <p className="text-[9px] text-white/15 mb-1">* Estimado de infografías para planificación editorial.</p>

      </div>
    </CatalogLayout>
  );
}
