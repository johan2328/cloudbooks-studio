import { useState, useEffect, type ElementType } from "react";
import Layout from "@/components/Layout";
import { useLocation } from "wouter";
import {
  Sparkles, CheckCircle2, XCircle, Loader2, Key,
  ChevronRight, Clock, Code2, FileText, Shield, Eye,
  ExternalLink, Lock, ImageIcon, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  fetchStudioCatalog,
  getPageIdFromLocation,
  type StudioCatalog,
  type StudioCatalogPage,
} from "@/lib/studio-api";

type RunStep = "idle" | "generating_image" | "assembling_html" | "running_qa" | "saving" | "done" | "error";

interface KeyStatus {
  hasKey: boolean;
  textModel: string;
  imageModel: string;
  imageQuality: string;
  allowHighQuality: boolean;
  blockLegacyImgModel: boolean;
  costGuardrail: string;
  templateVersion: string;
  approach: string;
}

interface GenerationResult {
  pageId: string;
  durationMs: number;
  templateVersion: string;
  approach: string;
  outputs: {
    html: string;
    metadata: string;
    qaReport: string;
    previewPng: string | null;
  };
  imageGenerated: boolean;
  imageModel: string | null;
  imageQuality: string;
  imageError: string | null;
  costGuardrail: string;
  qaStructural: {
    passed: boolean;
    score: number;
    checks: { name: string; ok: boolean }[];
  };
  textModel: string;
}

const STEPS: { key: RunStep; label: string; sub: string }[] = [
  { key: "generating_image", label: "Imagen visual",     sub: "gpt-image-2 medium · bloque superior" },
  { key: "assembling_html",  label: "Ensamblando HTML",  sub: "Plantilla golden master v24 — sin IA libre" },
  { key: "running_qa",       label: "QA estructural",    sub: "10 checks de layout y contenido" },
  { key: "saving",           label: "Guardando outputs", sub: "/public/assets/cloudbooks/…" },
  { key: "done",             label: "Completado",        sub: "page.html listo · static files" },
];

const STEP_NUMBERS: Record<RunStep, string> = {
  idle: "00",
  generating_image: "01",
  assembling_html: "02",
  running_qa: "03",
  saving: "04",
  done: "05",
  error: "!!",
};

function getToken() { return localStorage.getItem("studio_token") ?? ""; }
function authHdr() { return { Authorization: `Bearer ${getToken()}` }; }

function humanGuardrail(status: KeyStatus | null): string {
  if (!status) return "gpt-image-2 medium only";
  if (status.allowHighQuality) return "gpt-image-2 high habilitado";
  return "gpt-image-2 medium only · high bloqueado por costo";
}

async function readJsonOrThrow<T>(res: Response, label: string): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  const bodyText = await res.text();
  if (!contentType.includes("application/json")) {
    const preview = bodyText.replace(/\s+/g, " ").slice(0, 180);
    throw new Error(`${label} devolvio ${res.status} ${res.statusText || ""} con content-type '${contentType || "desconocido"}'. Respuesta no JSON: ${preview}`);
  }
  try {
    return JSON.parse(bodyText) as T;
  } catch (err) {
    throw new Error(`${label} devolvio JSON invalido: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export default function Generacion() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep]         = useState<RunStep>("idle");
  const [error, setError]       = useState<string | null>(null);
  const [result, setResult]     = useState<GenerationResult | null>(null);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const pageId = getPageIdFromLocation("01");
  const page: StudioCatalogPage | undefined = catalog?.pages.find((p) => p.pageId === pageId) ?? catalog?.pages[0];
  const pageOptions = catalog?.pages ?? [];

  useEffect(() => {
    fetch("/api/studio/key-status", { headers: authHdr() })
      .then(r => r.json())
      .then((d: KeyStatus) => { setKeyStatus(d); setKeyChecked(true); })
      .catch(() => { setKeyChecked(true); });

    fetchStudioCatalog()
      .then(setCatalog)
      .catch((err) => setCatalogError(err instanceof Error ? err.message : String(err)));
  }, []);

  const isRunning = ["generating_image", "assembling_html", "running_qa", "saving"].includes(step);
  const hasKey    = keyStatus?.hasKey ?? false;
  const canGenerate = keyChecked && hasKey && !!page?.generationReady;

  async function generate() {
    if (!page?.generationReady) {
      setError("Seed productivo no disponible para esta pagina.");
      setStep("error");
      return;
    }

    setStep("generating_image");
    setError(null);
    setResult(null);

    try {
      // Re-verificar key
      const keyRes  = await fetch("/api/studio/key-status", { headers: authHdr() });
      const keyData = await readJsonOrThrow<KeyStatus>(keyRes, "key-status");
      if (!keyData.hasKey) {
        setError("OPENAI_API_KEY no configurada en Secrets. Ir a Replit → Secrets → agregar OPENAI_API_KEY.");
        setStep("error");
        return;
      }
      setKeyStatus(keyData);

      // Lanzar generación
      setStep("generating_image");
      const genRes = await fetch("/api/studio/generate-visual-atlas-page", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHdr() },
        body: JSON.stringify({ certificationId: "ai-200", pageId: page?.pageId ?? pageId }),
      });

      setStep("assembling_html");
      await new Promise(r => setTimeout(r, 200));
      setStep("running_qa");
      await new Promise(r => setTimeout(r, 200));

      if (!genRes.ok) {
        const err = await readJsonOrThrow<{ error?: string; detail?: string }>(genRes, "generate-visual-atlas-page");
        throw new Error(err.error ?? `HTTP ${genRes.status}`);
      }

      setStep("saving");
      const data = await readJsonOrThrow<GenerationResult>(genRes, "generate-visual-atlas-page");
      await new Promise(r => setTimeout(r, 150));

      setResult(data);
      setStep("done");

      const qaLabel = data.qaStructural.passed ? "QA ✓" : `QA ${data.qaStructural.score}/10`;
      toast({
        title: "Generación completada",
        description: `Pág. ${data.pageId} · ${(data.durationMs / 1000).toFixed(1)}s · ${qaLabel}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep("error");
      toast({ title: "Error en generación", description: msg, variant: "destructive" });
    }
  }

  return (
    <Layout title={`Generar pagina ${page?.pageNumber ?? pageId}`}>
      <div className="h-full overflow-y-auto bg-[#0a1220]">

        {/* ── Header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[8px] font-bold text-teal-400/60 uppercase tracking-[0.2em] mb-0.5">
              Plantilla golden master · Layout cerrado
            </p>
            <h1 className="text-sm font-black text-white tracking-tight">
              Pagina {page?.pageNumber ?? pageId} - {page?.title ?? "Seed no disponible"}
            </h1>
            {page && (
              <p className="text-[9px] text-white/30 mt-0.5 truncate">{page.domain}</p>
            )}
          </div>

          {/* Page selector */}
          {pageOptions.length > 0 && (
            <label className="flex items-center gap-2 h-9 px-2.5 rounded-sm bg-white/[0.03] border border-white/[0.08]">
              <span className="text-[8px] font-bold text-white/25 uppercase tracking-wider">Pagina</span>
              <select
                value={page?.pageId ?? pageId}
                onChange={(event) => setLocation(`/generacion?page=${event.target.value}`)}
                disabled={isRunning}
                className="bg-transparent text-[10px] font-bold text-white/70 outline-none disabled:opacity-40"
              >
                {pageOptions.map((p) => (
                  <option key={p.pageId} value={p.pageId} className="bg-[#0d1629] text-white">
                    {p.pageNumber} - {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Key badge */}
          {!keyChecked ? (
            <span className="flex items-center gap-1 text-[8px] text-white/25 border border-white/10 px-2 py-1 rounded-sm">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />Verificando…
            </span>
          ) : hasKey ? (
            <span className="flex items-center gap-1 text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-sm font-semibold">
              <Key className="w-2.5 h-2.5" />OPENAI_API_KEY ✓
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[8px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-sm font-semibold">
              <Key className="w-2.5 h-2.5" />Sin API key
            </span>
          )}

          {/* Único botón primario */}
          <button
            onClick={generate}
            disabled={isRunning || !canGenerate}
            className={cn(
              "flex items-center gap-2 h-9 px-5 rounded-sm text-[10px] font-bold transition-all",
              isRunning
                ? "bg-teal-600/20 border border-teal-500/30 text-teal-300 cursor-not-allowed"
                : !canGenerate
                ? "bg-white/5 border border-white/10 text-white/25 cursor-not-allowed"
                : "bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white shadow-lg"
            )}>
            {isRunning
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Generando…</>
              : <><Sparkles className="w-3.5 h-3.5" />Generar pagina {page?.pageNumber ?? pageId}</>}
          </button>
        </div>

        {/* ── Guardrail banner ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.05] px-6 py-1.5 flex items-center gap-3">
          <Lock className="w-2.5 h-2.5 text-teal-400/40 shrink-0" />
          <span className="text-[8px] text-white/25">
            <span className="text-teal-400/60 font-semibold">Layout bloqueado:</span>{" "}
            formato libro 768×1152 · estructura editorial local v24 · la IA no redesigna la página
          </span>
          <span className="ml-auto text-[7px] font-semibold text-teal-300/50">
            {humanGuardrail(keyStatus)}
          </span>
        </div>

        <div className="p-6 max-w-6xl space-y-5">

          {/* ── Config panel (solo en idle) ── */}
          {step === "idle" && (
            <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.05]">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">
                  Configuración de generación
                </p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {([
                  {
                    label: "Layout",
                    value: "Golden Master Visual Atlas v24",
                    note:  "Plantilla fija — la IA no decide estructura",
                    icon:  Lock,
                    color: "text-teal-400",
                  },
                  {
                    label: "Template",
                    value: "locked",
                    note:  "768×1152 px · 6 secciones editoriales fijas",
                    icon:  Lock,
                    color: "text-teal-400",
                  },
                  {
                    label: "Modelo texto",
                    value: keyStatus?.textModel ?? "gpt-4o-mini",
                    note:  "Solo QA/json estructurado — no genera layout",
                    icon:  FileText,
                    color: "text-blue-400",
                  },
                  {
                    label: "Modelo imagen",
                    value: `${keyStatus?.imageModel ?? "gpt-image-2"} ${keyStatus?.imageQuality ?? "medium"}`,
                    note:  "Solo bloque visual superior · gpt-image-1 bloqueado",
                    icon:  ImageIcon,
                    color: "text-violet-400",
                  },
                  {
                    label: "High quality",
                    value: "blocked",
                    note:  "ALLOW_HIGH_QUALITY = false permanentemente",
                    icon:  XCircle,
                    color: "text-red-400/70",
                  },
                  {
                    label: "Output path",
                    value: `/pages/${page?.pageId ?? pageId}/page.html`,
                    note:  "Static files · public/assets/cloudbooks/…",
                    icon:  FileText,
                    color: "text-white/30",
                  },
                ] as ConfigRow[]).map(c => (
                  <div key={c.label} className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2.5 flex gap-2.5">
                    <c.icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", c.color)} />
                    <div className="min-w-0">
                      <p className="text-[7px] text-white/25 uppercase tracking-widest font-bold">{c.label}</p>
                      <p className="text-[9.5px] font-semibold text-white/70 mt-0.5 font-mono leading-tight">{c.value}</p>
                      <p className="text-[7px] text-white/20 mt-0.5 leading-snug">{c.note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {!hasKey && keyChecked && (
                <div className="mx-4 mb-4 flex items-start gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                  <Key className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold text-amber-400">OPENAI_API_KEY no configurada</p>
                    <p className="text-[8px] text-amber-400/50 mt-0.5 leading-snug">
                      Replit → Secrets (ícono de candado) → agregar{" "}
                      <span className="font-mono">OPENAI_API_KEY</span>
                    </p>
                  </div>
                </div>
              )}
              {catalogError && (
                <div className="mx-4 mb-4 flex items-start gap-2 px-3 py-2.5 bg-red-500/8 border border-red-500/20 rounded-sm">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold text-red-300">Catalogo operativo no disponible</p>
                    <p className="text-[8px] text-red-300/55 mt-0.5 leading-snug">{catalogError}</p>
                  </div>
                </div>
              )}
              {keyChecked && hasKey && !page?.generationReady && (
                <div className="mx-4 mb-4 flex items-start gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold text-amber-400">Seed no disponible para esta pagina</p>
                    <p className="text-[8px] text-amber-400/50 mt-0.5 leading-snug">
                      La generacion solo se habilita cuando el servidor expone seed productivo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Pipeline steps ── */}
          {step !== "idle" && (
            <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Pipeline editorial</p>
                  <p className="text-[9px] text-white/35 mt-1 max-w-2xl leading-relaxed">
                    Orquestacion cerrada por etapas: imagen, ensamblado, QA y salida final. No simula agentes conversando; muestra el flujo real que hoy ejecuta el sistema.
                  </p>
                </div>
                <div className="text-[8px] text-teal-300/55 font-semibold">
                  {page ? `Pag. ${page.pageNumber} · ${page.domain}` : "Pipeline activo"}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                {STEPS.map((s, i) => {
                  const activeIdx = STEPS.findIndex(x => x.key === step);
                  const isDone    = step === "done" ? true : i < activeIdx;
                  const isActive  = s.key === step && step !== "done";
                  return (
                    <div key={s.key} className="relative">
                      <div className={cn(
                        "h-full min-h-[88px] rounded-sm border px-3 py-3 transition-all",
                        isDone   ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        isActive ? "bg-teal-500/15 border-teal-500/30 text-teal-300 animate-pulse" :
                        step === "error" && i === activeIdx
                                 ? "bg-red-500/10 border-red-500/20 text-red-400"
                                 : "bg-white/[0.02] border-white/[0.06] text-white/20"
                      )}>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[8px] font-black tracking-[0.18em] opacity-70">{STEP_NUMBERS[s.key]}</span>
                          {isDone   ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                           isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                      <Clock className="w-3.5 h-3.5" />}
                        </div>
                        <p className="mt-3 text-[10px] font-bold">{s.label}</p>
                        <p className="mt-1 text-[8px] leading-relaxed opacity-75">{s.sub}</p>
                      </div>
                      {i < STEPS.length - 1 && (
                        <span className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-white/10">
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {step === "error" && error && (
                <div className="flex items-start gap-2.5 bg-red-500/8 border border-red-500/20 rounded-sm px-3 py-3">
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[9px] font-bold text-red-400 mb-0.5">Error en generación</p>
                    <p className="text-[8px] text-red-300/60 leading-relaxed">{error}</p>
                  </div>
                  <button onClick={() => setStep("idle")} className="text-white/20 hover:text-white/50 shrink-0">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Resultado ── */}
          {step === "done" && result && (
            <div className="bg-[#0d1629] border border-emerald-500/15 rounded-sm overflow-hidden">

              {/* Result header */}
              <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-emerald-400">
                    Completado · {(result.durationMs / 1000).toFixed(1)}s
                  </p>
                  <p className="text-[7px] text-white/20 mt-0.5">
                    Plantilla {result.templateVersion} · {result.textModel} + {result.imageModel ?? "placeholder"} medium
                  </p>
                </div>
                <span className={cn(
                  "text-[7px] px-2 py-0.5 rounded-sm font-bold border",
                  result.qaStructural.passed
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/25"
                )}>
                  QA {result.qaStructural.score}/10 {result.qaStructural.passed ? "✓" : "⚠"}
                </span>
              </div>

              <div className="p-4 grid grid-cols-2 gap-4">

                {/* QA checks */}
                <div>
                  <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest mb-2">
                    Checks estructurales
                  </p>
                  <div className="space-y-1">
                    {result.qaStructural.checks.map(c => (
                      <div key={c.name} className="flex items-center gap-1.5">
                        {c.ok
                          ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          : <XCircle className="w-2.5 h-2.5 text-red-400 shrink-0" />}
                        <span className={cn(
                          "text-[8px]",
                          c.ok ? "text-white/40" : "text-red-400/80"
                        )}>{c.name}</span>
                      </div>
                    ))}
                  </div>

                  {result.imageError && (
                    <div className="mt-3 px-2 py-1.5 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                      <p className="text-[7.5px] text-amber-400/80 font-semibold">Imagen: placeholder activo</p>
                      <p className="text-[7px] text-amber-400/50 mt-0.5 leading-snug">
                        {result.imageError.slice(0, 120)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Archivos generados */}
                <div>
                  <p className="text-[7px] font-bold text-white/25 uppercase tracking-widest mb-2">
                    Archivos generados
                  </p>
                  <div className="space-y-1.5">
                    {([
                      [result.outputs.html,     "page.html",      Code2,    "text-blue-400"],
                      [result.outputs.metadata, "metadata.json",  FileText, "text-teal-400"],
                      [result.outputs.qaReport, "qa-report.md",   Shield,   "text-sky-400"],
                      ...(result.outputs.previewPng
                        ? [[result.outputs.previewPng, "upper-art.png", Eye, "text-violet-400"] as const]
                        : []),
                    ] as [string | null, string, typeof Code2, string][])
                      .filter(([url]) => !!url)
                      .map(([url, label, Icon, color]) => (
                        <a key={label} href={url!} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] transition-colors group">
                          <Icon className={cn("w-3 h-3 shrink-0", color)} />
                          <span className="text-[9px] text-white/50 group-hover:text-white/80 transition-colors flex-1 truncate">{label}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-white/15 group-hover:text-white/40 shrink-0 transition-colors" />
                        </a>
                      ))}
                  </div>

                  <div className="mt-3 px-2 py-1.5 bg-teal-500/6 border border-teal-500/15 rounded-sm">
                    <p className="text-[7px] text-teal-400/60 font-mono leading-relaxed">
                      Layout: golden master v24<br />
                      Estructura: plantilla TypeScript<br />
                      Imagen: {result.imageGenerated ? `${result.imageModel} ${result.imageQuality}` : "placeholder"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "done" && !result && (
            <div className="bg-[#0d1629] border border-emerald-500/15 rounded-sm p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-emerald-300">Generacion completada</p>
                  <p className="text-[8px] text-white/35 mt-1 leading-relaxed">
                    El servidor termino el proceso, pero no devolvio el detalle de checklist al panel. Puedes revisar el output real en Overview o pasar directo a QA editorial.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={`/assets/cloudbooks/ai-200/visual-atlas/pages/${page?.pageId ?? pageId}/page.html`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-7 px-3 rounded-sm bg-blue-500/10 border border-blue-500/20 text-[8px] font-bold text-blue-300 hover:bg-blue-500/18 inline-flex items-center"
                    >
                      Abrir HTML real
                    </a>
                    <button onClick={() => setLocation("/biblioteca")}
                      className="h-7 px-3 rounded-sm bg-white/[0.04] border border-white/[0.08] text-[8px] font-bold text-white/45 hover:text-white/75">
                      Ver en Overview
                    </button>
                    <button onClick={() => setLocation(`/qa/${parseInt(page?.pageId ?? pageId, 10)}`)}
                      className="h-7 px-3 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-300 hover:bg-emerald-500/18">
                      Revisar QA
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </Layout>
  );
}

/* tipos internos */
interface ConfigRow {
  label: string;
  value: string;
  note: string;
  icon: ElementType;
  color: string;
}

