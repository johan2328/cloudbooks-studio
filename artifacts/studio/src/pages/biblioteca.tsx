import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  fetchStudioCatalog,
  type StudioCatalog,
  type StudioCatalogPage,
  type StudioOutputStatus,
} from "@/lib/studio-api";

type Tab = "output" | "contenido";
type RunState =
  | "success_with_real_upper_visual"
  | "success_with_placeholder_visual"
  | "legacy_fallback"
  | "failed_no_html"
  | "no_output";

function computeRunState(status: StudioOutputStatus | null | undefined): RunState {
  if (!status?.hasOutput) return "no_output";
  if (!status.files.html) return "failed_no_html";
  if (status.generationMode === "openai_image") return "success_with_real_upper_visual";
  if (status.generationMode === "placeholder_image") return "success_with_placeholder_visual";
  return "legacy_fallback";
}

function statusDot(status: StudioOutputStatus): ReactNode {
  const state = computeRunState(status);
  if (state === "success_with_real_upper_visual") return <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />;
  if (state === "success_with_placeholder_visual") return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />;
  if (state === "failed_no_html" || state === "legacy_fallback") return <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full bg-white/15 shrink-0" />;
}

function stateLabel(status: StudioOutputStatus): string {
  const state = computeRunState(status);
  if (state === "success_with_real_upper_visual") return status.files.approved ? "Aprobada" : "Output real";
  if (state === "success_with_placeholder_visual") return "Placeholder";
  if (state === "failed_no_html") return "Incompleta";
  if (state === "legacy_fallback") return "Legacy";
  return "Sin output";
}

export default function Biblioteca() {
  const [, setLocation] = useLocation();
  const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
  const [selectedPageId, setSelectedPageId] = useState("01");
  const [tab, setTab] = useState<Tab>("output");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchStudioCatalog()
      .then((data) => {
        if (!mounted) return;
        setCatalog(data);
        setSelectedPageId(data.pages[0]?.pageId ?? "01");
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const pages = catalog?.pages ?? [];
  const page = useMemo(
    () => pages.find((p) => p.pageId === selectedPageId) ?? pages[0],
    [pages, selectedPageId],
  );

  return (
    <Layout title="Visual Atlas">
      <div className="flex h-full overflow-hidden bg-[#0a1220]">
        <aside className="w-56 bg-[#0d1629] border-r border-white/[0.05] flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <p className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">Visual Atlas · AI-200</p>
            <p className="text-[8px] text-white/30 mt-0.5">
              {catalog ? `${catalog.availableSeeds.length}/${catalog.totalExpected} seeds productivos` : "Cargando catalogo real"}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-3 flex items-center gap-2 text-[9px] text-white/30">
                <Loader2 className="w-3 h-3 animate-spin" /> Cargando desde API...
              </div>
            )}

            {error && (
              <div className="m-3 p-3 bg-red-500/8 border border-red-500/20 rounded-sm">
                <p className="text-[9px] font-bold text-red-300">No se pudo cargar catalogo</p>
                <p className="text-[8px] text-red-300/60 mt-1 leading-snug">{error}</p>
              </div>
            )}

            {pages.map((p) => {
              const active = p.pageId === selectedPageId;
              return (
                <button
                  key={p.pageId}
                  onClick={() => { setSelectedPageId(p.pageId); setTab("output"); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 border-b border-white/[0.04] flex items-start gap-2.5 transition-all",
                    active ? "bg-blue-500/10 border-l-2 border-l-blue-400 pl-[10px]" : "border-l-2 border-l-transparent hover:bg-white/[0.03]",
                  )}
                >
                  <span className="text-[8px] font-bold text-white/25 font-mono mt-0.5 w-4 shrink-0">{p.pageNumber}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-[9px] leading-snug line-clamp-2", active ? "text-white/85" : "text-white/45")}>
                      {p.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {statusDot(p.outputStatus)}
                      <span className="text-[7px] text-white/20">{stateLabel(p.outputStatus)}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {!loading && pages.length === 0 && !error && (
              <div className="m-3 p-3 bg-amber-500/8 border border-amber-500/20 rounded-sm">
                <p className="text-[9px] font-bold text-amber-300">Sin seeds productivos</p>
                <p className="text-[8px] text-white/35 mt-1 leading-snug">Agrega seeds en el servidor antes de mostrar paginas en Studio.</p>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {!page ? (
            <div className="p-6 text-sm text-white/40">No hay paginas productivas disponibles.</div>
          ) : (
            <>
              <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 shrink-0 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider">Pag. {page.pageNumber}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[7px] text-[#0078d4]/50">{page.batch}</span>
                    <span className="text-white/10">·</span>
                    <span className="text-[7px] text-white/20">Contrato {page.contractVersion}</span>
                  </div>
                  <h2 className="text-sm font-bold text-white/85 truncate">{page.title}</h2>
                  <p className="text-[9px] text-white/25 mt-0.5 truncate">{page.domain}</p>
                </div>

                <button
                  onClick={() => setLocation(`/generacion?page=${page.pageId}`)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-sm text-[10px] font-bold transition-all shrink-0 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white"
                >
                  <Sparkles className="w-3 h-3" />
                  Generar pagina {page.pageNumber}
                </button>
              </div>

              <div className="flex border-b border-white/[0.06] bg-[#0d1629] shrink-0">
                {([["output", "Output real"], ["contenido", "Contenido editorial"]] as [Tab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={cn(
                      "px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider transition-all",
                      tab === id ? "border-b-2 border-blue-400 text-blue-300 bg-blue-500/5" : "text-white/25 hover:text-white/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === "output" ? <OutputPanel page={page} setLocation={setLocation} /> : <ContentPanel page={page} />}
            </>
          )}
        </main>
      </div>
    </Layout>
  );
}

function OutputPanel({ page, setLocation }: { page: StudioCatalogPage; setLocation: (to: string) => void }) {
  const status = page.outputStatus;
  const runState = computeRunState(status);
  const isRealVisual = runState === "success_with_real_upper_visual";

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-3xl space-y-5">
        {runState === "no_output" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 px-4 py-4 bg-white/[0.02] border border-white/[0.06] rounded-sm">
              <Clock className="w-4 h-4 text-white/20 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-white/45">Sin output generado todavia</p>
                <p className="text-[9px] text-white/30 mt-1 leading-relaxed">
                  Esta pagina tiene seed productivo y esta lista para generacion real.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLocation(`/generacion?page=${page.pageId}`)}
              className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />Generar pagina {page.pageNumber}
            </button>
          </div>
        )}

        {runState === "failed_no_html" && (
          <Notice tone="red" icon={<XCircle className="w-4 h-4" />} title="Generacion incompleta">
            Existe algun archivo de salida, pero falta page.html. Regenera desde el pipeline real.
          </Notice>
        )}

        {runState === "legacy_fallback" && (
          <Notice tone="amber" icon={<AlertTriangle className="w-4 h-4" />} title="Fallback legacy">
            Esta salida no cumple el contrato productivo actual. Regenera con golden master y gpt-image-2 medium.
          </Notice>
        )}

        {(runState === "success_with_real_upper_visual" || runState === "success_with_placeholder_visual") && (
          <>
            <div className={cn(
              "flex items-start gap-3 px-4 py-3 rounded-sm border",
              isRealVisual ? "bg-emerald-500/8 border-emerald-500/20" : "bg-amber-500/8 border-amber-500/20",
            )}>
              <CheckCircle2 className={cn("w-4 h-4 mt-0.5 shrink-0", isRealVisual ? "text-emerald-400" : "text-amber-400")} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-[10px] font-bold", isRealVisual ? "text-emerald-300" : "text-amber-300")}>
                  {isRealVisual ? "Output real con upper visual premium" : "Output con placeholder"}
                </p>
                <p className="text-[9px] text-white/35 mt-0.5">
                  {status.generatedAt ? new Date(status.generatedAt).toLocaleString("es-ES") : "Fecha no disponible"}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <Chip label="HTML 768x1152" ok={status.files.html} />
                  <Chip label="Metadata" ok={status.files.metadata} />
                  <Chip label="QA Report" ok={status.files.qaReport} />
                  <Chip label="Upper visual" ok={status.files.upperVisual} />
                  <Chip label="Aprobacion" ok={status.files.approved} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {status.htmlPath && (
                <a href={status.htmlPath} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 h-9 px-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white text-[10px] font-bold rounded-sm transition-all shadow-sm">
                  <ExternalLink className="w-3.5 h-3.5" />Abrir tamano real
                </a>
              )}
              {status.files.qaReport && (
                <a href={`/api/studio/qa-report/${page.pageId}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 h-9 px-3 border border-white/[0.08] text-white/35 hover:text-white/60 text-[9px] font-medium rounded-sm transition-all">
                  <FileText className="w-3 h-3" />QA Report
                </a>
              )}
              <button
                onClick={() => setLocation(`/qa/${parseInt(page.pageId, 10)}`)}
                className="flex items-center gap-1.5 h-9 px-3 border border-white/[0.08] text-white/35 hover:text-white/60 text-[9px] font-medium rounded-sm transition-all">
                <Shield className="w-3 h-3" />Revisar QA
              </button>
            </div>

            {status.htmlPath && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Preview - Golden Master</p>
                  <span className={cn(
                    "text-[7px] px-1.5 py-px rounded-sm border font-bold",
                    isRealVisual ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400/70 border-amber-500/15",
                  )}>
                    {isRealVisual ? "upper_visual_real" : "upper_visual_placeholder"}
                  </span>
                </div>
                <div className="rounded-sm border border-white/10 overflow-hidden bg-[#edf2f8] relative" style={{ width: 320, height: 480 }}>
                  <iframe
                    src={status.htmlPath}
                    title={`Pagina ${page.pageNumber} - golden master`}
                    scrolling="no"
                    style={{
                      width: 768,
                      height: 1152,
                      transform: "scale(0.4167)",
                      transformOrigin: "top left",
                      border: "none",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ContentPanel({ page }: { page: StudioCatalogPage }) {
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-2xl space-y-4">
        <Section title="Pregunta guia">
          <p className="text-[10px] text-white/65 leading-relaxed">{page.guideQuestion}</p>
        </Section>

        <Section title="Contexto editorial">
          <p className="text-[10px] text-white/55 leading-relaxed">{page.context}</p>
        </Section>

        <Section title="Modulos visuales">
          <div className="grid grid-cols-2 gap-2">
            {page.visualModules.map((m) => (
              <div key={m.num} className="bg-white/[0.02] border border-white/[0.05] rounded-sm p-2">
                <p className="text-[8px] font-bold text-teal-300/80">{m.num} · {m.title}</p>
                <p className="text-[8px] text-white/35 mt-1 leading-snug">{m.description}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Trampas de examen">
          <ul className="space-y-2">
            {page.traps.map((trap, i) => (
              <li key={trap.wrong} className="flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 text-red-400/70 shrink-0 mt-0.5" />
                <span className="text-[9px] text-white/50 leading-snug">
                  <strong className="text-red-300/80">{i + 1}. {trap.wrong}.</strong> {trap.correction}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Autocheck">
          <p className="text-[10px] text-white/65 leading-relaxed">{page.autocheck.question}</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {page.autocheck.options.map((option, idx) => (
              <span
                key={option}
                className={cn(
                  "text-[9px] border rounded-sm px-2 py-1",
                  idx === page.autocheck.correctOption
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                    : "bg-white/[0.02] border-white/[0.06] text-white/40",
                )}
              >
                {option}
              </span>
            ))}
          </div>
          <p className="text-[9px] text-white/40 mt-2 leading-snug">{page.autocheck.explanation}</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
      <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-2.5">{title}</p>
      {children}
    </div>
  );
}

function Notice({ tone, icon, title, children }: { tone: "red" | "amber"; icon: ReactNode; title: string; children: ReactNode }) {
  const styles = tone === "red"
    ? "bg-red-500/8 border-red-500/20 text-red-300"
    : "bg-amber-500/8 border-amber-500/20 text-amber-300";
  return (
    <div className={cn("flex items-start gap-3 px-4 py-4 border rounded-sm", styles)}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] font-bold">{title}</p>
        <p className="text-[9px] text-white/35 mt-1 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Chip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={cn(
      "text-[7px] font-bold px-1.5 py-px rounded-sm border",
      ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/25 border-white/10",
    )}>
      {ok ? `${label} ok` : label}
    </span>
  );
}
