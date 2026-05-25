import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Sparkles, CheckCircle2, XCircle, Loader2, Key,
  ChevronRight, Clock, Code2, FileText, Shield, Eye,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type RealStep = "idle" | "validating_key" | "generating_html" | "running_qa" | "saving_outputs" | "done" | "error";

interface GenerationResult {
  pageId: string;
  durationMs: number;
  outputs: { html: string; metadata: string; qaReport: string; previewPng: string };
  previewGenerated: boolean;
  previewMode?: "gpt-image-1" | "svg_fallback";
  generationMode?: "openai" | "fallback_html";
  imageError: string | null;
  qaVerdict: string;
  tokens: { prompt: number; completion: number };
  model: string;
}

const STEPS: { key: RealStep; label: string; sub: string }[] = [
  { key: "validating_key",  label: "Verificando API key",  sub: "OPENAI_API_KEY desde Secrets" },
  { key: "generating_html", label: "Generando HTML",       sub: "GPT-4o · Contrato Visual Atlas v24" },
  { key: "running_qa",      label: "QA automático",        sub: "Análisis de 6 dimensiones" },
  { key: "saving_outputs",  label: "Guardando outputs",    sub: "/public/assets/cloudbooks/…" },
  { key: "done",            label: "Completado",           sub: "Assets disponibles en Replit static" },
];

function getToken() { return localStorage.getItem("studio_token") ?? ""; }

export default function Generacion() {
  const { toast } = useToast();
  const [step, setStep]     = useState<RealStep>("idle");
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    fetch("/api/studio/key-status", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then((d: { hasKey: boolean }) => { setHasKey(d.hasKey); setKeyChecked(true); })
      .catch(() => { setHasKey(false); setKeyChecked(true); });
  }, []);

  const isRunning = ["validating_key", "generating_html", "running_qa", "saving_outputs"].includes(step);

  async function generate() {
    setStep("validating_key");
    setError(null);
    setResult(null);

    try {
      const keyRes = await fetch("/api/studio/key-status", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const keyData = await keyRes.json() as { hasKey: boolean };
      if (!keyData.hasKey) {
        setError("OPENAI_API_KEY no configurada en Secrets. Ir a Replit → Secrets (ícono de candado) → agregar OPENAI_API_KEY.");
        setStep("error");
        return;
      }
      setHasKey(true);
      setStep("generating_html");

      const genRes = await fetch("/api/studio/generate-visual-atlas-page", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ certificationId: "ai-200", pageId: "01" }),
      });

      setStep("running_qa");
      await new Promise(r => setTimeout(r, 300));

      if (!genRes.ok) {
        const err = await genRes.json() as { error: string };
        throw new Error(err.error ?? `HTTP ${genRes.status}`);
      }

      setStep("saving_outputs");
      const data = await genRes.json() as GenerationResult;
      await new Promise(r => setTimeout(r, 300));

      setResult(data);
      setStep("done");
      setPreviewKey(k => k + 1);
      toast({ title: "Generación completada", description: `Pág. 01 · ${(data.durationMs / 1000).toFixed(1)}s · ${data.model}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("error");
      toast({ title: "Error en generación", description: msg, variant: "destructive" });
    }
  }

  return (
    <Layout title="Generar página 01">
      <div className="h-full overflow-y-auto bg-[#0a1220]">

        {/* Header */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 flex items-center gap-4">
          <div className="flex-1">
            <p className="text-[8px] font-bold text-teal-400/70 uppercase tracking-[0.2em] mb-0.5">
              Generación real · OpenAI API
            </p>
            <h1 className="text-sm font-black text-white tracking-tight">
              Página 01 — Azure Container Registry
            </h1>
          </div>

          {/* Key status */}
          {!keyChecked ? (
            <span className="flex items-center gap-1 text-[8px] text-white/25 border border-white/10 px-2 py-1 rounded-sm">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />Verificando key…
            </span>
          ) : hasKey ? (
            <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-sm font-semibold">
              <Key className="w-2.5 h-2.5" />OPENAI_API_KEY ✓
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-sm font-semibold">
              <Key className="w-2.5 h-2.5" />Sin OPENAI_API_KEY
            </span>
          )}

          {/* Botón primario único */}
          <button
            onClick={generate}
            disabled={isRunning || !keyChecked}
            className={cn(
              "flex items-center gap-2 h-9 px-5 rounded-sm text-[10px] font-bold transition-all",
              isRunning
                ? "bg-teal-600/20 border border-teal-500/30 text-teal-300 cursor-not-allowed"
                : !hasKey && keyChecked
                ? "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white shadow-lg"
            )}>
            {isRunning
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando…</>
              : <><Sparkles className="w-3.5 h-3.5" />Generar página 01</>}
          </button>
        </div>

        {/* Guardrail info */}
        <div className="bg-amber-500/5 border-b border-amber-500/12 px-6 py-2 flex items-center gap-2">
          <span className="text-[8px] text-amber-400/60">
            <span className="font-bold text-amber-400/80">Guardrail activo:</span>{" "}
            gpt-image-1 medium únicamente · high/hd bloqueados · si imagen falla → fallback SVG sin escalar costo
          </span>
        </div>

        <div className="p-6 max-w-3xl space-y-5">

          {/* Pipeline steps — visible cuando hay actividad */}
          {step !== "idle" && (
            <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4 space-y-3">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Pipeline</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {STEPS.map((s, i) => {
                  const activeIdx = STEPS.findIndex(x => x.key === step);
                  const isDone    = step === "done" ? true : i < activeIdx;
                  const isActive  = s.key === step && step !== "done";
                  const isErr     = step === "error" && i === activeIdx;
                  return (
                    <div key={s.key} className="flex items-center gap-1.5">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[9px] font-medium border transition-all",
                        isDone  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        isActive ? "bg-teal-500/15 border-teal-500/30 text-teal-300 animate-pulse" :
                        isErr   ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                   "bg-white/[0.02] border-white/[0.06] text-white/20"
                      )}>
                        {isDone  ? <CheckCircle2 className="w-3 h-3" /> :
                         isActive ? <Loader2 className="w-3 h-3 animate-spin" /> :
                         isErr   ? <XCircle className="w-3 h-3" /> :
                                   <Clock className="w-3 h-3" />}
                        {s.label}
                      </div>
                      {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-white/10 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {/* Error */}
              {step === "error" && error && (
                <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-sm px-3 py-3">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-red-400 mb-0.5">Error en generación</p>
                    <p className="text-[8px] text-red-300/60 leading-relaxed">{error}</p>
                  </div>
                  <button onClick={() => setStep("idle")} className="text-white/20 hover:text-white/50 shrink-0 transition-colors">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Resultado */}
          {step === "done" && result && (
            <div className="bg-[#0d1629] border border-emerald-500/15 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-emerald-500/10 flex items-center gap-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <p className="text-[9px] font-bold text-emerald-400 flex-1">
                  Generación completada · {(result.durationMs / 1000).toFixed(1)}s · {result.model}
                </p>
                <span className={cn(
                  "text-[7px] px-2 py-0.5 rounded-sm font-bold border",
                  result.qaVerdict === "approved"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                )}>
                  QA: {result.qaVerdict === "approved" ? "Aprobado" : "Revisar"}
                </span>
                <span className="text-[7px] text-white/20 font-mono">
                  {((result.tokens.prompt + result.tokens.completion) / 1000).toFixed(1)}k tokens
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">
                {/* Preview */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest">Preview</p>
                    <span className={cn(
                      "text-[7px] px-1.5 py-0.5 rounded-sm border font-semibold",
                      result.previewMode === "gpt-image-1"
                        ? "bg-teal-500/15 text-teal-400 border-teal-500/20"
                        : "bg-white/5 text-white/35 border-white/10"
                    )}>
                      {result.previewMode === "gpt-image-1" ? "gpt-image-1 medium" : "SVG fallback"}
                    </span>
                    {result.imageError && (
                      <span className="text-[7px] text-amber-400/60 ml-auto">
                        Imagen falló → SVG generado
                      </span>
                    )}
                  </div>
                  <div className="aspect-video bg-[#0a1220] border border-white/[0.07] rounded-sm overflow-hidden">
                    <img key={previewKey}
                      src={`${result.outputs.previewPng}?v=${previewKey}`}
                      alt="Preview generado"
                      className="w-full h-full object-contain" />
                  </div>
                </div>

                {/* Archivos generados */}
                <div>
                  <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest mb-2">Archivos generados</p>
                  <div className="space-y-1.5">
                    {([
                      [result.outputs.html,      "page.html",      Code2,    "text-blue-400"],
                      [result.outputs.metadata,  "metadata.json",  FileText, "text-teal-400"],
                      [result.outputs.qaReport,  "qa-report.md",   Shield,   "text-sky-400"],
                      [result.outputs.previewPng,
                        result.outputs.previewPng.endsWith(".svg") ? "preview.svg (fallback)" : "preview.png",
                        Eye, "text-violet-400"],
                    ] as [string, string, typeof Code2, string][]).map(([url, label, Icon, color]) => (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors group">
                        <Icon className={cn("w-3 h-3 shrink-0", color)} />
                        <span className="text-[9px] text-white/50 group-hover:text-white/80 transition-colors flex-1 truncate">{label}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-white/15 group-hover:text-white/40 shrink-0 transition-colors" />
                      </a>
                    ))}
                  </div>

                  {result.generationMode === "fallback_html" && (
                    <div className="mt-3 px-2.5 py-2 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                      <p className="text-[8px] text-amber-400/80 font-semibold">FALLBACK HTML</p>
                      <p className="text-[7px] text-amber-400/50 mt-0.5 leading-snug">
                        El HTML fue generado pero no con el modelo de imagen premium.
                        El contenido escrito es real. La imagen es SVG generado localmente.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Estado inicial — sin actividad */}
          {step === "idle" && (
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-5 space-y-4">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Configuración de generación</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Modelo HTML",    value: "gpt-4o",         note: "Genera HTML completo de la infografía" },
                  { label: "Modelo imagen",  value: "gpt-image-1",    note: "medium quality · fallback SVG si falla" },
                  { label: "Contrato",       value: "Visual Atlas v24",note: "61 páginas · batch 01–10 activo" },
                  { label: "Output path",    value: "/pages/01/",      note: "Replit static files" },
                ].map(c => (
                  <div key={c.label} className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2.5">
                    <p className="text-[7px] text-white/25 uppercase tracking-widest font-bold">{c.label}</p>
                    <p className="text-[10px] font-semibold text-white/70 mt-0.5 font-mono">{c.value}</p>
                    <p className="text-[7px] text-white/20 mt-0.5">{c.note}</p>
                  </div>
                ))}
              </div>
              {!hasKey && keyChecked && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                  <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold text-amber-400">OPENAI_API_KEY no configurada</p>
                    <p className="text-[8px] text-amber-400/50 mt-0.5 leading-snug">
                      Ve a Replit → Secrets (ícono de candado en el panel izquierdo) → agrega{" "}
                      <span className="font-mono">OPENAI_API_KEY</span> con tu API key de OpenAI.
                    </p>
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
