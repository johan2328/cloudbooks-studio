import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import {
  Sparkles, CheckCircle2, AlertTriangle, Loader2, FileText,
  ArrowRight, Clock, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface OutputStatus {
  hasOutput: boolean;
  generationMode: "openai" | "fallback_html" | "none";
  generatedAt: string | null;
  files: { html: boolean; metadata: boolean; qaReport: boolean; previewPng: boolean; previewSvg: boolean };
  htmlPath: string | null;
  previewPath: string | null;
}

function getToken() { return localStorage.getItem("studio_token") ?? ""; }

export default function StudioDashboard() {
  const [, setLocation] = useLocation();
  const [outputStatus, setOutputStatus] = useState<OutputStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/studio/output-status/01", {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => setOutputStatus(d))
      .catch(() => setOutputStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const hasReal = outputStatus?.hasOutput === true;
  const genMode = outputStatus?.generationMode;

  return (
    <Layout>
      <div className="h-full overflow-y-auto bg-[#0a1220]">

        {/* Header */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4">
          <p className="text-[8px] font-bold text-teal-400/70 uppercase tracking-[0.2em] mb-0.5">
            CloudBooks Studio · MVP
          </p>
          <h1 className="text-base font-black text-white tracking-tight">
            Visual Atlas AI-200
          </h1>
          <p className="text-[10px] text-white/30 mt-0.5">
            61 infografías de certificación · gpt-4o + gpt-image-1 medium
          </p>
        </div>

        <div className="p-6 max-w-3xl space-y-5">

          {/* ── Estado de Página 01 ── */}
          <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                Página 01 · Azure Container Registry
              </span>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                  <span className="text-[10px] text-white/30">Verificando output real…</span>
                </div>
              ) : hasReal ? (
                <div className="space-y-4">
                  {/* Estado real */}
                  <div className={cn(
                    "flex items-start gap-3 px-4 py-3 rounded-sm border",
                    genMode === "openai"
                      ? "bg-emerald-500/8 border-emerald-500/20"
                      : "bg-blue-500/8 border-blue-500/20"
                  )}>
                    <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0",
                      genMode === "openai" ? "text-emerald-400" : "text-blue-400")} />
                    <div className="flex-1">
                      <p className={cn("text-[10px] font-bold",
                        genMode === "openai" ? "text-emerald-300" : "text-blue-300")}>
                        {genMode === "openai" ? "Output real generado por OpenAI" : "Output generado · HTML con fallback SVG"}
                      </p>
                      {outputStatus?.generatedAt && (
                        <p className="text-[9px] text-white/35 mt-0.5">
                          Generado el {new Date(outputStatus.generatedAt).toLocaleDateString("es-ES", {
                            day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {outputStatus?.files.html &&
                          <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-px rounded-sm font-bold">HTML ✓</span>}
                        {outputStatus?.files.metadata &&
                          <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-px rounded-sm font-bold">Metadata ✓</span>}
                        {outputStatus?.files.qaReport &&
                          <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-px rounded-sm font-bold">QA Report ✓</span>}
                        {(outputStatus?.files.previewSvg || outputStatus?.files.previewPng) &&
                          <span className="text-[7px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-px rounded-sm font-bold">
                            Preview {outputStatus?.files.previewPng ? "PNG ✓" : "SVG ✓"}
                          </span>}
                      </div>
                    </div>
                    {outputStatus?.htmlPath && (
                      <a href={outputStatus.htmlPath} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 h-7 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-[9px] text-white/50 hover:text-white/80 transition-all shrink-0">
                        <ExternalLink className="w-3 h-3" />Ver HTML
                      </a>
                    )}
                  </div>

                  {/* Preview si existe */}
                  {outputStatus?.previewPath && (
                    <div className="max-w-sm">
                      <p className="text-[8px] text-white/25 uppercase tracking-widest mb-1.5 font-bold">Preview generado</p>
                      <div className="rounded-sm border border-white/10 overflow-hidden bg-[#0a1220]">
                        <img src={outputStatus.previewPath}
                          alt="Preview real página 01"
                          className="w-full h-auto"
                          style={{ aspectRatio: "8.5/11", objectFit: "contain" }} />
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setLocation("/qa/1")}
                      className="flex items-center gap-1.5 h-8 px-3 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-[10px] font-bold rounded-sm transition-all">
                      Revisar QA <ArrowRight className="w-3 h-3" />
                    </button>
                    <button onClick={() => setLocation("/generacion")}
                      className="flex items-center gap-1.5 h-8 px-3 border border-white/10 hover:border-white/20 text-white/45 hover:text-white/70 text-[10px] font-medium rounded-sm transition-all">
                      Regenerar
                    </button>
                  </div>
                </div>
              ) : (
                /* Sin output real */
                <div className="space-y-4">
                  <div className="flex items-start gap-3 px-4 py-3 rounded-sm bg-white/[0.02] border border-white/[0.06]">
                    <Clock className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-white/50">Sin output real generado todavía</p>
                      <p className="text-[9px] text-white/30 mt-0.5 leading-relaxed">
                        Siguiente paso: generar página 01 con OpenAI.
                        El resultado se guardará en{" "}
                        <span className="font-mono text-white/40 text-[8px]">/public/assets/cloudbooks/ai-200/visual-atlas/pages/01/</span>
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setLocation("/generacion")}
                    className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all shadow-lg">
                    <Sparkles className="w-3.5 h-3.5" />
                    Generar página 01 con OpenAI
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Cómo funciona (solo si no hay output) ── */}
          {!hasReal && !loading && (
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">Flujo de producción</p>
              <div className="space-y-2">
                {[
                  { n: "1", label: "Generar página 01", sub: "GPT-4o genera HTML · gpt-image-1 medium genera preview", active: true },
                  { n: "2", label: "QA y Aprobación", sub: "Revisar score por 6 dimensiones · aprobar o solicitar corrección", active: false },
                  { n: "3", label: "Exportar", sub: "Descargar HTML, PNG o PDF de la página aprobada", active: false },
                ].map(step => (
                  <div key={step.n} className={cn(
                    "flex items-start gap-3 px-3 py-2.5 rounded-sm border",
                    step.active ? "border-teal-500/20 bg-teal-500/5" : "border-white/[0.05] bg-white/[0.01]"
                  )}>
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 mt-0.5",
                      step.active ? "bg-teal-500 text-white" : "bg-white/[0.06] text-white/20"
                    )}>{step.n}</span>
                    <div>
                      <p className={cn("text-[10px] font-semibold", step.active ? "text-teal-300" : "text-white/40")}>{step.label}</p>
                      <p className="text-[8px] text-white/25 mt-0.5">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Aviso sobre el resto de páginas ── */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-white/[0.015] border border-white/[0.04] rounded-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-white/15 shrink-0 mt-0.5" />
            <p className="text-[9px] text-white/25 leading-relaxed">
              <span className="font-semibold text-white/35">Páginas 02–61</span> — el contenido editorial está preparado (grounding verificado, conceptos, trampas de examen).
              La generación OpenAI se habilitará en batch una vez que página 01 esté aprobada.
            </p>
          </div>

        </div>
      </div>
    </Layout>
  );
}
