import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ChevronLeft,
  FileSearch,
  FileText,
  Loader2,
  Search,
  Shield,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn, scoreColorDark } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";

interface RealQA {
  verdict: string;
  scores: Record<string, number>;
  observations: string[];
  redTeamLog: string[];
  raw?: string;
}

const QA_DIMS = [
  { key: "art_direction", label: "Direccion de arte" },
  { key: "editorial_consistency", label: "Consistencia editorial" },
  { key: "readability", label: "Legibilidad" },
  { key: "technical_accuracy", label: "Precision tecnica" },
  { key: "useful_density", label: "Densidad util" },
  { key: "commercial_risk", label: "Seguridad comercial" },
] as const;

function dimensionMeaning(key: string, score: number): string {
  switch (key) {
    case "art_direction":
      if (score >= 9) return "La composicion visual ya se acerca a una pieza lista para produccion.";
      if (score >= 7) return "La direccion de arte es correcta en estructura, pero todavia puede ganar presencia, equilibrio y fuerza editorial.";
      return "La pagina necesita una mejora visual clara en composicion, jerarquia o impacto.";
    case "editorial_consistency":
      if (score >= 9) return "La familia visual, la tipografia y las reglas editoriales se perciben estables.";
      if (score >= 7) return "La consistencia general es buena, aunque aun hay variaciones visibles entre modulos o assets.";
      return "La pagina transmite demasiada variacion en estilo, etiquetas o recursos visuales.";
    case "readability":
      if (score >= 9) return "Se lee con soltura a tamano real y mantiene buena jerarquia.";
      if (score >= 7) return "La lectura es funcional, pero todavia hay zonas que pueden respirar mejor o ganar claridad.";
      return "La legibilidad todavia no sostiene una lectura comoda a tamano real.";
    case "technical_accuracy":
      if (score >= 9) return "El contenido tecnico esta alineado con el criterio esperado para certificacion.";
      if (score >= 7) return "La base tecnica es buena, pero conviene revisar algun matiz o formulacion.";
      return "Todavia hay riesgo tecnico o ambiguedad conceptual.";
    case "useful_density":
      if (score >= 9) return "La pagina usa muy bien el espacio: mucha utilidad sin sentirse sobrecargada.";
      if (score >= 7) return "La densidad es aceptable, pero aun hay huecos o zonas con poco rendimiento editorial.";
      return "La pagina desperdicia espacio o no reparte bien la carga informativa.";
    case "commercial_risk":
      if (score >= 9) return "Puntaje alto aqui significa riesgo comercial bajo: no se detecta nada que devalue el producto.";
      if (score >= 7) return "El riesgo comercial es controlado, aunque todavia hay detalles de acabado que pueden restar premium.";
      return "Hay riesgo visible de percepcion pobre o falta de acabado premium.";
    default:
      return "Sin comentario adicional.";
  }
}

function getToken() {
  return localStorage.getItem("studio_token") ?? "";
}

function authHdr() {
  return { Authorization: `Bearer ${getToken()}` };
}

export default function QAReportPage() {
  const [, params] = useRoute("/qa-report/:id");
  const pageNum = params?.id ? String(parseInt(params.id, 10)).padStart(2, "0") : "01";
  const [, setLocation] = useLocation();
  const { getPage } = useStudio();
  const page = getPage(pageNum);

  const [report, setReport] = useState<RealQA | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/studio/qa-report/${pageNum}`, { headers: authHdr() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [pageNum]);

  const filteredObservations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return report?.observations ?? [];
    return (report?.observations ?? []).filter((item) => item.toLowerCase().includes(term));
  }, [report, search]);

  const filteredRedTeam = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return report?.redTeamLog ?? [];
    return (report?.redTeamLog ?? []).filter((item) => item.toLowerCase().includes(term));
  }, [report, search]);

  return (
    <Layout title={`QA Report · Pag. ${pageNum}`}>
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setLocation(`/qa/${parseInt(pageNum, 10)}`)}
            className="text-white/25 hover:text-white/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">QA Report · Pag. {pageNum}</p>
            <p className="text-xs font-bold text-white/75 truncate">{page?.title ?? `Pagina ${pageNum}`}</p>
          </div>
          <button
            onClick={() => setLocation(`/qa/${parseInt(pageNum, 10)}`)}
            className="flex items-center gap-1.5 h-8 px-3 border border-white/[0.08] rounded-sm text-[9px] text-white/40 hover:text-white/70 transition-all"
          >
            <Shield className="w-3 h-3" />
            Volver a QA
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-5xl mx-auto space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 py-8">
                <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                <span className="text-[10px] text-white/30">Cargando reporte QA…</span>
              </div>
            ) : !report ? (
              <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-6 text-center space-y-3">
                <FileText className="w-8 h-8 text-white/10 mx-auto" />
                <p className="text-sm font-bold text-white/45">QA report no disponible</p>
                <p className="text-[10px] text-white/25">Genera la pagina y vuelve a correr QA para obtener reporte estructurado.</p>
              </div>
            ) : (
              <>
                <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Dictamen del servidor</p>
                        <p className={cn(
                          "text-sm font-black mt-1",
                          report.verdict === "approved" ? "text-emerald-300" : "text-amber-300"
                        )}>
                          {report.verdict === "approved" ? "Aprobable" : "Requiere revision"}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-sm border border-white/[0.08] bg-white/[0.02] flex items-center justify-center">
                        <FileSearch className="w-4 h-4 text-white/35" />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3 mt-4">
                      {QA_DIMS.map((dim) => {
                        const rawValue = report.scores[dim.key] ?? 0;
                        const value = rawValue * 10;
                        return (
                          <div key={dim.key} className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[9px] text-white/55">{dim.label}</span>
                              <span className={cn("text-[9px] font-bold", scoreColorDark(value))}>{value.toFixed(0)}/100</span>
                            </div>
                            <p className="mt-1.5 text-[8px] text-white/32 leading-relaxed">
                              {dimensionMeaning(dim.key, rawValue)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Buscar dentro del reporte</p>
                    <label className="mt-3 flex items-center gap-2 h-9 px-3 rounded-sm bg-white/[0.03] border border-white/[0.08]">
                      <Search className="w-3.5 h-3.5 text-white/20" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar hallazgo, criterio o termino..."
                        className="w-full bg-transparent text-[10px] text-white/70 placeholder:text-white/20 outline-none"
                      />
                    </label>
                    <p className="text-[9px] text-white/30 mt-3 leading-relaxed">
                      Este visor deja de mostrarte JSON crudo y organiza observaciones, checks y texto original del reporte generado.
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Observaciones</p>
                    <div className="space-y-2">
                      {filteredObservations.length > 0 ? filteredObservations.map((item) => (
                        <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/60 leading-relaxed">
                          {item}
                        </div>
                      )) : (
                        <p className="text-[10px] text-white/25">No hay coincidencias para ese termino.</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Checks estructurales y red team</p>
                    <div className="space-y-2">
                      {filteredRedTeam.length > 0 ? filteredRedTeam.map((item) => (
                        <div key={item} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05] text-[10px] text-white/60 leading-relaxed">
                          {item}
                        </div>
                      )) : (
                        <p className="text-[10px] text-white/25">No hay coincidencias para ese termino.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest mb-3">Texto original del reporte</p>
                  <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-white/55 font-mono bg-[#0a1220] border border-white/[0.05] rounded-sm p-3 max-h-[420px] overflow-auto">
                    {report.raw ?? "Sin contenido raw"}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
