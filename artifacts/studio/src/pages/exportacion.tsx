import { useListPages } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, statusColorDark } from "@/lib/utils";
import { Download, FileText, Image, BookOpen, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Exportacion() {
  const { data: pages = [], isLoading } = useListPages({ status: "approved" }, { query: { queryKey: ["listPages", "approved"] } });
  const { data: exported = [] } = useListPages({ status: "exported" }, { query: { queryKey: ["listPages", "exported"] } });
  const { toast } = useToast();
  const { toast: toastExported } = useToast();

  const allApproved = [...pages, ...exported];

  function handleExport(format: string, pageNum?: string) {
    toast({
      title: `Exportación ${format} iniciada`,
      description: pageNum
        ? `Página ${pageNum} — ${format} (demo)`
        : `${allApproved.length} páginas — ${format} (demo)`,
    });
  }

  return (
    <Layout title="Exportación">
      {/* Header actions */}
      <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{pages.length} aprobadas · {exported.length} exportadas</span>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            onClick={() => handleExport("Book Pack completo")}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-8"
            data-testid="button-export-book"
            disabled={allApproved.length === 0}
          >
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Exportar Book Pack ({allApproved.length})
          </Button>
          <Button
            onClick={() => handleExport("PDF")}
            variant="outline"
            className="text-xs h-8 border-white/[0.08] text-white/40 hover:bg-white/[0.03] bg-transparent"
            data-testid="button-export-pdf-all"
            disabled={allApproved.length === 0}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            PDF completo
          </Button>
        </div>
      </div>

      <div className="p-6 bg-[#0a1220]">
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 bg-white/[0.04]" />)}</div>
        ) : allApproved.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/[0.06] rounded-sm bg-[#0d1629]">
            <p className="text-sm text-white/25 mb-1">Sin páginas aprobadas</p>
            <p className="text-xs text-white/15">Aprueba páginas en el panel QA para habilitarlas aquí.</p>
          </div>
        ) : (
          <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                <tr>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Pág.</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Título</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Dominio</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Batch</th>
                  <th className="text-left px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Estado</th>
                  <th className="text-right px-4 py-2.5 text-[10px] text-white/25 font-semibold uppercase tracking-wide">Formatos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {allApproved.map((page) => (
                  <tr key={page.id} className="hover:bg-white/[0.02] group" data-testid={`row-export-${page.id}`}>
                    <td className="px-4 py-2.5 font-mono text-white/20 font-bold">{page.pageNumber}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-white/70 font-medium truncate max-w-xs">{page.title}</p>
                    </td>
                    <td className="px-4 py-2.5 text-white/30 truncate max-w-40">{page.domain}</td>
                    <td className="px-4 py-2.5 text-white/20">{page.batch}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-medium", statusColorDark(page.status))}>
                        {page.status === "exported" ? "Exportada" : "Aprobada"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ExportBtn icon={Globe} label="HTML" onClick={() => handleExport("HTML", page.pageNumber)} />
                        <ExportBtn icon={Image} label="PNG" onClick={() => handleExport("PNG", page.pageNumber)} />
                        <ExportBtn icon={FileText} label="PDF" onClick={() => handleExport("PDF", page.pageNumber)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Export note */}
        <div className="mt-4 text-[10px] text-white/15 bg-white/[0.02] border border-dashed border-white/[0.06] rounded-sm px-4 py-3">
          Exportación demostrativa — Los formatos reales (HTML/PNG/PDF/Book Pack) se activarán cuando el pipeline de generación esté conectado a OpenAI.
        </div>
      </div>
    </Layout>
  );
}

function ExportBtn({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-0.5 px-1.5 py-1 rounded-sm text-[10px] text-white/30 hover:bg-white/[0.06] hover:text-white/60 border border-white/[0.06] transition-colors"
    >
      <Icon className="w-2.5 h-2.5" />
      {label}
    </button>
  );
}
