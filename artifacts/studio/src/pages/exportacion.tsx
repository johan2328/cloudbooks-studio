import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Download, ExternalLink, FileText, Image, Loader2, Shield, XCircle } from "lucide-react";

import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { fetchStudioCatalog, type StudioCatalog, type StudioCatalogPage } from "@/lib/studio-api";

function pageAsset(pageId: string, file: string): string {
  return `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId.padStart(2, "0")}/${file}`;
}

function downloadUrl(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function Exportacion() {
  const [, setLocation] = useLocation();
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStudioCatalog()
      .then(setCatalog)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const pages = catalog?.pages ?? [];
  const exportable = useMemo(
    () => pages.filter((p) => p.outputStatus.hasOutput && p.outputStatus.files.html),
    [pages],
  );
  const approved = exportable.filter((p) => p.outputStatus.files.approved);
  const withUpperPng = exportable.filter((p) => p.outputStatus.files.upperVisual);

  return (
    <Layout title="Exportacion">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 flex items-center gap-4 shrink-0">
          {[
            { label: "HTML reales", value: exportable.length, color: "text-blue-400" },
            { label: "PNG visual asset", value: withUpperPng.length, color: "text-violet-400" },
            { label: "Aprobadas", value: approved.length, color: "text-emerald-400" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={cn("text-lg font-black tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[8px] text-white/25">{s.label}</p>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              disabled={exportable.length === 0}
              onClick={() => exportable.forEach((p, i) => setTimeout(() => window.open(p.outputStatus.htmlPath ?? pageAsset(p.pageId, "page.html"), "_blank"), i * 250))}
              className="flex items-center gap-1.5 h-8 px-3 rounded-sm bg-blue-500/10 border border-blue-500/20 text-[9px] font-bold text-blue-300 disabled:opacity-30"
            >
              <FileText className="w-3 h-3" />Abrir HTML reales
            </button>
            <button
              disabled={withUpperPng.length === 0}
              onClick={() => withUpperPng.forEach((p, i) => setTimeout(() => downloadUrl(pageAsset(p.pageId, "upper-art.png"), `ai200-p${p.pageId}-upper-art.png`), i * 250))}
              className="flex items-center gap-1.5 h-8 px-3 rounded-sm bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-300 disabled:opacity-30"
            >
              <Image className="w-3 h-3" />Descargar PNG visual asset
            </button>
          </div>
        </div>

        <div className="bg-blue-500/[0.06] border-b border-blue-500/15 px-6 py-2 shrink-0">
          <p className="text-[8px] text-blue-200/55 leading-relaxed">
            Exportacion conectada a outputs reales del servidor. El PNG disponible hoy es el <span className="font-mono">upper-art.png</span>
            generado por gpt-image-2 medium. PNG print-ready de pagina completa todavia requiere renderer server-side.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-2 text-[10px] text-white/35">
              <Loader2 className="w-4 h-4 animate-spin" />Cargando outputs reales...
            </div>
          )}

          {error && (
            <div className="bg-red-500/8 border border-red-500/20 rounded-sm p-4 flex items-start gap-3">
              <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
              <div>
                <p className="text-[10px] font-bold text-red-300">No se pudo cargar el catalogo de outputs</p>
                <p className="text-[9px] text-red-300/60 mt-1">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && exportable.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[360px] text-center">
              <Download className="w-10 h-10 text-white/10 mb-4" />
              <p className="text-sm font-semibold text-white/30">Sin outputs reales exportables</p>
              <p className="text-xs text-white/18 mt-1">Genera una pagina desde Visual Atlas para habilitar HTML y PNG visual asset.</p>
            </div>
          )}

          {exportable.length > 0 && (
            <div className="max-w-5xl space-y-3">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Paginas con output real</p>
              {exportable.map((page) => <ExportRow key={page.pageId} page={page} setLocation={setLocation} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ExportRow({ page, setLocation }: { page: StudioCatalogPage; setLocation: (to: string) => void }) {
  const status = page.outputStatus;
  const htmlUrl = status.htmlPath ?? pageAsset(page.pageId, "page.html");
  const pngUrl = pageAsset(page.pageId, "upper-art.png");

  return (
    <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-4 py-3 flex items-center gap-4">
      <div className="w-8 text-center shrink-0">
        <p className="text-[10px] font-black text-white/30 font-mono">#{page.pageNumber}</p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[10px] font-semibold text-white/75 truncate">{page.title}</p>
          {status.files.approved && (
            <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-sm border bg-emerald-500/10 border-emerald-500/20 text-emerald-300">
              aprobada
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[8px] text-white/25">
          <span>{status.generationMode}</span>
          <span>{status.generatedAt ? new Date(status.generatedAt).toLocaleDateString("es-ES") : "sin fecha"}</span>
          <span>{status.files.upperVisual ? "PNG visual asset disponible" : "sin PNG visual asset"}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 h-7 px-2.5 rounded-sm text-[8px] font-bold border bg-blue-500/10 border-blue-500/20 text-blue-300"
        >
          <ExternalLink className="w-2.5 h-2.5" />HTML
        </a>
        <button
          disabled={!status.files.upperVisual}
          onClick={() => downloadUrl(pngUrl, `ai200-p${page.pageId}-upper-art.png`)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-sm text-[8px] font-bold border bg-violet-500/10 border-violet-500/20 text-violet-300 disabled:opacity-30"
        >
          <Image className="w-2.5 h-2.5" />PNG visual asset
        </button>
        <button
          onClick={() => setLocation(`/qa/${parseInt(page.pageId, 10)}`)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-sm text-[8px] font-bold border bg-white/[0.03] border-white/[0.08] text-white/40"
        >
          <Shield className="w-2.5 h-2.5" />QA editorial
        </button>
        <button
          disabled
          title="Pendiente: PNG de pagina completa generado por renderer server-side"
          className="flex items-center gap-1 h-7 px-2.5 rounded-sm text-[8px] font-bold border bg-white/[0.02] border-white/[0.05] text-white/18 cursor-not-allowed"
        >
          <Image className="w-2.5 h-2.5" />PNG pagina completa
        </button>
      </div>
    </div>
  );
}
