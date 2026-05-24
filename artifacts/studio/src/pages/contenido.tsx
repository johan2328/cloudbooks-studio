import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetPage, useUpdatePage, getListPagesQueryKey, getGetPageQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { groundingLabel, groundingDot, formatDate, statusColorDark, statusLabel, scoreColorDark } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { Save, ChevronLeft, ChevronRight, ExternalLink, FlaskConical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const DOMAIN_COLORS: Record<string, string> = {
  "Azure AI Vision":                  "#0891b2",
  "Azure AI Language":                "#7c3aed",
  "Azure AI Speech":                  "#0d9488",
  "Azure AI Document Intelligence":   "#d97706",
  "Azure AI Search":                  "#2563eb",
  "Azure OpenAI Service":             "#059669",
  "Conceptos Fundamentales de IA":    "#64748b",
  "Azure AI Services":                "#1d4ed8",
};

interface FormValues {
  title: string;
  domain: string;
  groundingStatus: string;
  context: string;
  concepts: string;
  examTraps: string;
  autocheckQuestion: string;
  autocheckAnswer: string;
  autocheckExplanation: string;
  sources: string;
}

export default function Contenido() {
  const [, params] = useRoute("/contenido/:id");
  const id = parseInt(params?.id ?? "1", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: page, isLoading } = useGetPage(id, { query: { enabled: !!id, queryKey: getGetPageQueryKey(id) } });
  const updatePage = useUpdatePage();

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<FormValues>({
    defaultValues: {
      title: "", domain: "", groundingStatus: "unverified",
      context: "", concepts: "", examTraps: "",
      autocheckQuestion: "", autocheckAnswer: "", autocheckExplanation: "", sources: "",
    }
  });

  useEffect(() => {
    if (page) {
      reset({
        title: page.title ?? "",
        domain: page.domain ?? "",
        groundingStatus: page.groundingStatus ?? "unverified",
        context: page.context ?? "",
        concepts: page.concepts ?? "",
        examTraps: page.examTraps ?? "",
        autocheckQuestion: page.autocheckQuestion ?? "",
        autocheckAnswer: page.autocheckAnswer ?? "",
        autocheckExplanation: page.autocheckExplanation ?? "",
        sources: page.sources ?? "",
      });
    }
  }, [page, reset]);

  function onSubmit(values: FormValues) {
    updatePage.mutate({ id, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
        toast({ title: "Ficha guardada", description: `Pág. ${page?.pageNumber} — cambios persistidos.` });
      },
    });
  }

  if (isLoading) return (
    <Layout title="Contenido y Grounding">
      <div className="p-6 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
    </Layout>
  );

  if (!page) return (
    <Layout title="Contenido y Grounding">
      <div className="p-6 text-sm text-white/40">Página no encontrada.</div>
    </Layout>
  );

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < 61 ? id + 1 : null;
  const color = DOMAIN_COLORS[page.domain ?? ""] ?? "#0d1629";
  const isEvaluatedBatch = parseInt(page.pageNumber, 10) <= 10;

  return (
    <Layout title={`Ficha Editorial — Pág. ${page.pageNumber}`}>
      <div className="h-full overflow-hidden bg-[#0a1220] text-white/80">
        {/* ── Topbar ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-2 flex items-center gap-3 flex-wrap shrink-0">
          <button onClick={() => setLocation("/biblioteca")}
            className="text-[11px] text-white/35 hover:text-white/70 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" /> Biblioteca
          </button>
          <span className="text-white/10">·</span>
          {prevId && (
            <button onClick={() => setLocation(`/contenido/${prevId}`)}
              className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
              <ChevronLeft className="w-3 h-3" /> Anterior
            </button>
          )}
          {nextId && (
            <button onClick={() => setLocation(`/contenido/${nextId}`)}
              className="text-[11px] text-white/30 hover:text-white/60 flex items-center gap-0.5 transition-colors">
              Siguiente <ChevronRight className="w-3 h-3" />
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {isEvaluatedBatch && (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-sm">
                <FlaskConical className="w-2.5 h-2.5" /> Primera colección evaluada
              </span>
            )}
            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium", statusColorDark(page.status))}>
              {statusLabel(page.status)}
            </span>
            {page.qaScore != null && (
              <span className={cn("text-sm font-bold tabular-nums", scoreColorDark(page.qaScore))}>
                QA {Math.round(page.qaScore)}
              </span>
            )}
          </div>
        </div>

        <div className="flex h-[calc(100vh-98px)]">
          {/* ── Main form ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
              {/* Page identity */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: color }}>
                  {page.pageNumber}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-wide">{page.batch} · {page.domain}</p>
                  <p className="text-sm font-semibold text-white/90">{page.title}</p>
                </div>
              </div>

              {/* Title + Domain + Grounding */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Título técnico</Label>
                  <Input {...register("title")} data-testid="input-title"
                    className="bg-[#0d1629] border-white/10 text-white/80 text-sm font-medium focus-visible:ring-teal-500/50 placeholder:text-white/20" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Dominio Azure</Label>
                  <select {...register("domain")} data-testid="select-domain"
                    className="w-full h-9 text-sm border border-white/10 rounded-sm px-2 bg-[#0d1629] text-white/70 focus:outline-none focus:ring-1 focus:ring-teal-500/50">
                    {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Estado de Grounding</Label>
                  <select {...register("groundingStatus")} data-testid="select-grounding"
                    className="w-full h-9 text-sm border border-white/10 rounded-sm px-2 bg-[#0d1629] text-white/70 focus:outline-none focus:ring-1 focus:ring-teal-500/50">
                    <option value="unverified">Sin verificar</option>
                    <option value="partial">Verificación parcial</option>
                    <option value="verified">Verificado con Microsoft Learn</option>
                  </select>
                </div>
              </div>

              {/* Context */}
              <FieldBlock label="Contexto editorial"
                hint="Descripción técnica que informa al modelo generador — fuente: Microsoft Learn">
                <Textarea {...register("context")} rows={5} data-testid="input-context"
                  className="bg-[#0d1629] border-white/10 text-white/70 text-sm resize-none font-mono leading-relaxed focus-visible:ring-teal-500/50 placeholder:text-white/20" />
              </FieldBlock>

              {/* Concepts */}
              <FieldBlock label="Conceptos clave"
                hint="Separados por coma — máximo 8 para cumplir regla de densidad del contrato visual">
                <Textarea {...register("concepts")} rows={3} data-testid="input-concepts"
                  className="bg-[#0d1629] border-white/10 text-white/70 text-sm resize-none focus-visible:ring-teal-500/50 placeholder:text-white/20" />
              </FieldBlock>

              {/* Exam traps */}
              <FieldBlock label="Trampas de examen"
                hint="Usar numeración homogénea 1. 2. 3. — el contrato visual exige borde rojo y numeración consistente">
                <Textarea {...register("examTraps")} rows={4} data-testid="input-exam-traps"
                  className="bg-[#0d1629] border-red-500/20 text-white/70 text-sm resize-none focus-visible:ring-red-500/30 placeholder:text-red-400/30" />
              </FieldBlock>

              {/* Autocheck */}
              <div className="border border-teal-500/20 rounded-sm overflow-hidden bg-[#0d1629]/50">
                <div className="bg-teal-500/5 border-b border-teal-500/10 px-4 py-2.5 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <p className="text-[10px] font-bold text-teal-400/80 uppercase tracking-widest">Autocheck — zona fija inferior derecha</p>
                </div>
                <div className="p-4 space-y-3">
                  <FieldBlock label="Pregunta clínica de examen">
                    <Input {...register("autocheckQuestion")} data-testid="input-autocheck-question"
                      className="bg-[#0d1629] border-white/10 text-white/70 text-sm focus-visible:ring-teal-500/50 placeholder:text-white/20" />
                  </FieldBlock>
                  <FieldBlock label="Respuesta correcta">
                    <Input {...register("autocheckAnswer")} data-testid="input-autocheck-answer"
                      className="bg-[#0d1629] border-white/10 text-white/70 text-sm font-medium focus-visible:ring-teal-500/50 placeholder:text-white/20" />
                  </FieldBlock>
                  <FieldBlock label="Explicación (2-3 líneas)">
                    <Textarea {...register("autocheckExplanation")} rows={3} data-testid="input-autocheck-explanation"
                      className="bg-[#0d1629] border-white/10 text-white/70 text-sm resize-none focus-visible:ring-teal-500/50 placeholder:text-white/20" />
                  </FieldBlock>
                </div>
              </div>

              {/* Sources */}
              <FieldBlock label="Fuentes Microsoft Learn"
                hint="Una URL por línea — obligatorio para que el grounding sea 'Verificado'">
                <Textarea {...register("sources")} rows={2} data-testid="input-sources"
                  className="bg-[#0d1629] border-white/10 text-blue-400/70 text-sm resize-none font-mono focus-visible:ring-teal-500/50 placeholder:text-blue-400/30" />
              </FieldBlock>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={!isDirty || updatePage.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                  data-testid="button-save-content">
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {updatePage.isPending ? "Guardando..." : "Guardar ficha editorial"}
                </Button>
                <Button type="button" variant="outline" className="text-xs h-8 bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5"
                  onClick={() => setLocation(`/qa/${id}`)}>
                  Ver QA
                </Button>
                <Button type="button" variant="outline" className="text-xs h-8 bg-transparent border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5"
                  onClick={() => setLocation(`/generacion`)}>
                  Generar
                </Button>
              </div>
            </form>
          </div>

          {/* ── Side panel ── */}
          <div className="w-64 shrink-0 border-l border-white/[0.06] bg-[#0d1629] p-4 overflow-y-auto">
            {/* Grounding status */}
            <div className="mb-5">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Grounding</p>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("w-2.5 h-2.5 rounded-full", groundingDot(page.groundingStatus ?? "unverified"))} />
                <span className="text-sm font-semibold text-white/80">
                  {groundingLabel(page.groundingStatus ?? "unverified")}
                </span>
              </div>
              {page.groundingUpdatedAt && (
                <p className="text-[10px] text-white/25">Actualizado: {formatDate(page.groundingUpdatedAt)}</p>
              )}
              <p className="text-[9px] text-white/20 mt-2 leading-relaxed">
                El grounding debe ser "Verificado" para habilitar el preflight de generación.
              </p>
            </div>

            {/* Metadata */}
            <div className="border-t border-white/[0.06] pt-4 mb-5">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Metadatos</p>
              <div className="space-y-2">
                <InfoRow label="Batch" value={page.batch} />
                <InfoRow label="Página" value={`${page.pageNumber} / 61`} />
                <InfoRow label="Estado" value={statusLabel(page.status)} />
                {page.qaScore != null && (
                  <InfoRow label="Score QA" value={`${Math.round(page.qaScore)} / 100`} />
                )}
                <InfoRow label="Actualizado" value={formatDate(page.updatedAt)} />
              </div>
            </div>

            {/* Sources */}
            {page.sources && (
              <div className="border-t border-white/[0.06] pt-4 mb-5">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Fuentes</p>
                {page.sources.split("\n").filter(Boolean).map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-1.5 text-[9px] text-blue-400/60 hover:text-blue-300/80 mb-1.5 leading-tight transition-colors">
                    <ExternalLink className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                    <span className="truncate">{url.replace("https://learn.microsoft.com/es-es/", "learn.ms/…/")}</span>
                  </a>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Acciones rápidas</p>
              <div className="space-y-1.5">
                <ActionBtn label="Panel QA" onClick={() => setLocation(`/qa/${id}`)} />
                <ActionBtn label="Ir a Generación" onClick={() => setLocation(`/generacion`)} variant="teal" />
                {prevId && <ActionBtn label={`← Pág. ${String(id - 1).padStart(2, "0")}`} onClick={() => setLocation(`/contenido/${prevId}`)} />}
                {nextId && <ActionBtn label={`Pág. ${String(id + 1).padStart(2, "0")} →`} onClick={() => setLocation(`/contenido/${nextId}`)} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function FieldBlock({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1 block">{label}</Label>
      {hint && <p className="text-[9px] text-white/25 mb-1.5 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[9px] text-white/25 uppercase tracking-wide">{label}</span>
      <span className="text-[10px] text-white/60 font-semibold">{value}</span>
    </div>
  );
}

function ActionBtn({ label, onClick, variant }: { label: string; onClick: () => void; variant?: "teal" }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full text-left text-[10px] px-2.5 py-1.5 rounded-sm border transition-colors font-medium",
      variant === "teal"
        ? "border-teal-500/20 text-teal-400/70 hover:bg-teal-500/10"
        : "border-white/10 text-white/40 hover:bg-white/5"
    )}>
      {label}
    </button>
  );
}
