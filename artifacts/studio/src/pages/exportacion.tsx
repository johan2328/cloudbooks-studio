import { useState } from "react";
import Layout from "@/components/Layout";
import { cn, statusColorDark, statusLabel, formatDateTime } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import { Download, FileText, Image, BookOpen, Globe, Package, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ExportAsset } from "@/lib/types";

const FORMAT_CFG: Record<ExportAsset["format"], { label: string; icon: React.ComponentType<{className?:string}>; color: string; bg: string }> = {
  HTML:      { label: "HTML interactivo", icon: Globe,     color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  PNG:       { label: "PNG 2x",           icon: Image,     color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
  PDF:       { label: "PDF print-ready",  icon: FileText,  color: "text-teal-400",    bg: "bg-teal-500/10 border-teal-500/20" },
  BOOK_PACK: { label: "Book Pack ZIP",    icon: BookOpen,  color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
};

export default function Exportacion() {
  const { state, exportPage } = useStudio();
  const { toast } = useToast();
  const [exporting, setExporting] = useState<string | null>(null);

  const approved  = state.pages.filter(p => p.status === "approved");
  const exported  = state.pages.filter(p => p.status === "exported");
  const all       = [...approved, ...exported];
  const notReady  = state.pages.filter(p => !["approved","exported"].includes(p.status) && parseInt(p.id,10) <= 10);

  function pageFilePath(pageId: string, file: string): string {
    const padded = pageId.padStart(2, "0");
    return `/assets/cloudbooks/ai-200/visual-atlas/pages/${padded}/${file}`;
  }

  function handleExport(pageId: string, format: ExportAsset["format"]) {
    const key = `${pageId}-${format}`;
    setExporting(key);

    if (format === "HTML") {
      window.open(pageFilePath(pageId, "page.html"), "_blank");
      exportPage(pageId, format);
      setTimeout(() => {
        setExporting(null);
        toast({ title: "HTML abierto", description: `Página ${pageId} — page.html en nueva pestaña` });
      }, 400);
    } else if (format === "PNG") {
      const a = document.createElement("a");
      a.href = pageFilePath(pageId, "upper-visual.png");
      a.download = `page-${pageId.padStart(2,"0")}-upper-visual.png`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      exportPage(pageId, format);
      setTimeout(() => {
        setExporting(null);
        toast({ title: "PNG descargado", description: `Página ${pageId} — upper-visual.png` });
      }, 400);
    } else if (format === "PDF") {
      const htmlUrl = pageFilePath(pageId, "page.html");
      window.open(htmlUrl, "_blank");
      exportPage(pageId, format);
      setTimeout(() => {
        setExporting(null);
        toast({
          title: "HTML abierto para PDF",
          description: "Usa Archivo → Imprimir → Guardar como PDF en el navegador",
        });
      }, 400);
    } else {
      exportPage(pageId, format);
      setTimeout(() => {
        setExporting(null);
        toast({ title: `Exportación ${format}`, description: `Página ${pageId} — ${FORMAT_CFG[format].label}` });
      }, 800);
    }
  }

  function handleExportAll(format: ExportAsset["format"]) {
    approved.forEach((p, i) => setTimeout(() => handleExport(p.id, format), i * 300));
    toast({ title: `Exportación masiva ${format} iniciada`, description: `${approved.length} páginas en cola` });
  }

  const totalExports = state.exports.length;

  return (
    <Layout title="Exportación">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4 flex-wrap shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-black tabular-nums text-emerald-400">{approved.length}</p>
              <p className="text-[8px] text-white/25">Aprobadas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black tabular-nums text-teal-400">{exported.length}</p>
              <p className="text-[8px] text-white/25">Exportadas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black tabular-nums text-white/30">{totalExports}</p>
              <p className="text-[8px] text-white/25">Assets generados</p>
            </div>
          </div>

          <div className="ml-auto flex gap-2">
            {(["HTML","PNG","PDF"] as const).map(fmt => {
              const cfg = FORMAT_CFG[fmt];
              const Icon = cfg.icon;
              return (
                <button key={fmt} onClick={() => handleExportAll(fmt)} disabled={approved.length === 0}
                  className={cn("flex items-center gap-1.5 h-8 px-3 rounded-sm text-[9px] font-bold border transition-all disabled:opacity-30", cfg.bg, cfg.color)}>
                  <Icon className="w-3 h-3" />Exportar todo · {fmt}
                </button>
              );
            })}
            <button onClick={() => handleExportAll("BOOK_PACK")} disabled={approved.length === 0}
              className="flex items-center gap-1.5 h-8 px-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[9px] font-bold rounded-sm hover:from-blue-500 hover:to-violet-500 disabled:opacity-30 transition-all">
              <Package className="w-3 h-3" />Book Pack ({all.length})
            </button>
          </div>
        </div>

        {/* Banner datos demo */}
        <div className="bg-amber-500/[0.06] border-b border-amber-500/20 px-6 py-2 flex items-center gap-2 shrink-0">
          <AlertTriangle className="w-3 h-3 text-amber-400/60 shrink-0" />
          <span className="text-[8px] text-amber-400/50 leading-relaxed">
            <span className="font-bold text-amber-400/70">Estados demo:</span> Los estados de aprobación vienen del store local (localStorage).
            Solo páginas con <span className="font-mono">approval.json</span> en disco son aprobaciones reales del servidor.
            Página 01 es la única con output real actualmente disponible.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {all.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Download className="w-10 h-10 text-white/10 mb-4" />
              <p className="text-sm font-semibold text-white/25">Sin páginas aprobadas todavía</p>
              <p className="text-xs text-white/15 mt-1">Aprueba páginas desde el panel QA para habilitarlas aquí</p>
            </div>
          ) : (
            <div className="p-6 space-y-6 max-w-5xl">

              {/* Páginas aprobadas / exportadas */}
              <div>
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-3">
                  Páginas disponibles para exportación
                </p>
                <div className="space-y-2">
                  {all.map(page => {
                    const pageExports = state.exports.filter(e => e.pageId === page.id);
                    return (
                      <div key={page.id} className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-4 py-3 flex items-center gap-4">
                        {/* Page info */}
                        <div className="w-8 text-center shrink-0">
                          <p className="text-[10px] font-black text-white/30 font-mono">#{page.id}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[10px] font-semibold text-white/70 truncate">{page.title}</p>
                            <span className={cn("text-[7px] font-bold px-1.5 py-0.5 rounded-sm border shrink-0", statusColorDark(page.status))}>
                              {statusLabel(page.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[8px] text-white/25">
                            <span>v{page.currentVersion}</span>
                            <span>Contrato {page.contractVersion}</span>
                            {page.qaScore != null && <span>QA {page.qaScore.toFixed(1)}</span>}
                            {pageExports.length > 0 && (
                              <span className="text-teal-400/60">{pageExports.length} export{pageExports.length > 1 ? "s" : ""}</span>
                            )}
                          </div>
                        </div>

                        {/* Export buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(["HTML","PNG","PDF"] as const).map(fmt => {
                            const cfg = FORMAT_CFG[fmt];
                            const Icon = cfg.icon;
                            const key = `${page.id}-${fmt}`;
                            const alreadyExported = pageExports.some(e => e.format === fmt);
                            return (
                              <button key={fmt} onClick={() => handleExport(page.id, fmt)}
                                disabled={exporting === key}
                                title={`Exportar ${fmt}`}
                                className={cn(
                                  "flex items-center gap-1 h-7 px-2.5 rounded-sm text-[8px] font-bold border transition-all",
                                  alreadyExported ? "bg-emerald-500/8 border-emerald-500/20 text-emerald-400/70" : cn(cfg.bg, cfg.color),
                                  exporting === key && "opacity-50 cursor-wait"
                                )}>
                                {alreadyExported ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                                {fmt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Páginas no listas */}
              {notReady.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-3 h-3 text-amber-400/50" />
                    <p className="text-[9px] font-bold text-white/15 uppercase tracking-widest">
                      Páginas batch 01–10 sin aprobar ({notReady.length})
                    </p>
                  </div>
                  <div className="space-y-1">
                    {notReady.map(page => (
                      <div key={page.id} className="flex items-center gap-3 px-4 py-2 bg-white/[0.015] border border-white/[0.04] rounded-sm opacity-50">
                        <span className="text-[9px] text-white/20 font-mono w-6">#{page.id}</span>
                        <p className="text-[9px] text-white/30 flex-1 truncate">{page.title}</p>
                        <span className={cn("text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", statusColorDark(page.status))}>
                          {statusLabel(page.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export history */}
              {state.exports.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-3">Assets exportados</p>
                  <div className="space-y-1.5">
                    {state.exports.map(asset => {
                      const cfg = FORMAT_CFG[asset.format];
                      const Icon = cfg.icon;
                      return (
                        <div key={asset.id} className="flex items-center gap-3 px-4 py-2.5 bg-[#0d1629] border border-white/[0.06] rounded-sm">
                          <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center border shrink-0", cfg.bg)}>
                            <Icon className={cn("w-3 h-3", cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-medium text-white/60 font-mono truncate">{asset.filename}</p>
                            <p className="text-[7px] text-white/20">Pág. {asset.pageId} · {asset.version}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400/60" />
                            <p className="text-[8px] text-white/20">{formatDateTime(asset.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
