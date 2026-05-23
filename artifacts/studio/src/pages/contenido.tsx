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
import { groundingLabel, groundingDot, formatDate, statusColor, statusLabel, scoreColor } from "@/lib/utils";
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
      <div className="p-6 text-sm text-gray-500">Página no encontrada.</div>
    </Layout>
  );

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < 61 ? id + 1 : null;
  const color = DOMAIN_COLORS[page.domain ?? ""] ?? "#0d1629";
  const isEvaluatedBatch = parseInt(page.pageNumber, 10) <= 10;

  return (
    <Layout title={`Ficha Editorial — Pág. ${page.pageNumber}`}>
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3 flex-wrap">
        <button onClick={() => setLocation("/biblioteca")}
          className="text-xs text-gray-400 hover:text-gray-900 flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Biblioteca
        </button>
        <span className="text-gray-200">|</span>
        {prevId && (
          <button onClick={() => setLocation(`/contenido/${prevId}`)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
            <ChevronLeft className="w-3 h-3" /> Anterior
          </button>
        )}
        {nextId && (
          <button onClick={() => setLocation(`/contenido/${nextId}`)}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
            Siguiente <ChevronRight className="w-3 h-3" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {isEvaluatedBatch && (
            <span className="flex items-center gap-1 text-[9px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-sm">
              <FlaskConical className="w-2.5 h-2.5" /> Primera colección evaluada
            </span>
          )}
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", statusColor(page.status))}>
            {statusLabel(page.status)}
          </span>
          {page.qaScore != null && (
            <span className={cn("text-sm font-bold tabular-nums", scoreColor(page.qaScore))}>
              QA {Math.round(page.qaScore)}
            </span>
          )}
        </div>
      </div>

      <div className="flex" style={{ minHeight: "calc(100vh - 106px)" }}>
        {/* Main form */}
        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
            {/* Page identity */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: color }}>
                {page.pageNumber}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">{page.batch} · {page.domain}</p>
                <p className="text-sm font-semibold text-gray-900">{page.title}</p>
              </div>
            </div>

            {/* Title + Domain + Grounding row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Título técnico</Label>
                <Input {...register("title")} data-testid="input-title" className="text-sm font-medium" />
              </div>
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Dominio Azure</Label>
                <select {...register("domain")} data-testid="select-domain"
                  className="w-full h-9 text-sm border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">Estado de Grounding</Label>
                <select {...register("groundingStatus")} data-testid="select-grounding"
                  className="w-full h-9 text-sm border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="unverified">Sin verificar</option>
                  <option value="partial">Verificación parcial</option>
                  <option value="verified">Verificado con Microsoft Learn</option>
                </select>
              </div>
            </div>

            {/* Context */}
            <FieldBlock
              label="Contexto editorial"
              hint="Descripción técnica que informa al modelo generador — fuente: Microsoft Learn">
              <Textarea {...register("context")} rows={5} data-testid="input-context"
                className="text-sm resize-none font-mono text-gray-700 leading-relaxed"
                placeholder="Descripción técnica del concepto para grounding del modelo generador..." />
            </FieldBlock>

            {/* Concepts */}
            <FieldBlock
              label="Conceptos clave"
              hint="Separados por coma — máximo 8 para cumplir regla de densidad del contrato visual">
              <Textarea {...register("concepts")} rows={3} data-testid="input-concepts"
                className="text-sm resize-none"
                placeholder="Concepto A, Concepto B, Concepto C..." />
            </FieldBlock>

            {/* Exam traps */}
            <FieldBlock
              label="Trampas de examen"
              hint="Usar numeración homogénea 1. 2. 3. — el contrato visual exige borde rojo y numeración consistente">
              <Textarea {...register("examTraps")} rows={4} data-testid="input-exam-traps"
                className="text-sm resize-none border-red-100 focus:ring-red-300 text-red-900 placeholder:text-red-200"
                placeholder="1. Primera trampa frecuente en examen AI-200&#10;2. Segunda trampa — concepto confundido&#10;3. Tercera trampa..." />
            </FieldBlock>

            {/* Autocheck — complete block */}
            <div className="border border-teal-200 rounded-sm overflow-hidden">
              <div className="bg-teal-50 border-b border-teal-100 px-4 py-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Autocheck — zona fija inferior derecha</p>
              </div>
              <div className="p-4 space-y-3 bg-white">
                <FieldBlock label="Pregunta clínica de examen">
                  <Input {...register("autocheckQuestion")} data-testid="input-autocheck-question"
                    className="text-sm" placeholder="¿Qué funcionalidad es exclusiva del tier Premium de...?" />
                </FieldBlock>
                <FieldBlock label="Respuesta correcta">
                  <Input {...register("autocheckAnswer")} data-testid="input-autocheck-answer"
                    className="text-sm font-medium" placeholder="La respuesta concisa y correcta" />
                </FieldBlock>
                <FieldBlock label="Explicación (2-3 líneas)">
                  <Textarea {...register("autocheckExplanation")} rows={3} data-testid="input-autocheck-explanation"
                    className="text-sm resize-none"
                    placeholder="Por qué esta respuesta es correcta — qué distingue esta opción de los distractores..." />
                </FieldBlock>
              </div>
            </div>

            {/* Sources */}
            <FieldBlock
              label="Fuentes Microsoft Learn"
              hint="Una URL por línea — obligatorio para que el grounding sea 'Verificado'">
              <Textarea {...register("sources")} rows={2} data-testid="input-sources"
                className="text-sm resize-none font-mono text-blue-700"
                placeholder="https://learn.microsoft.com/es-es/azure/..." />
            </FieldBlock>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={!isDirty || updatePage.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                data-testid="button-save-content">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {updatePage.isPending ? "Guardando..." : "Guardar ficha editorial"}
              </Button>
              <Button type="button" variant="outline" className="text-xs h-8"
                onClick={() => setLocation(`/qa/${id}`)}>
                Ver QA
              </Button>
              <Button type="button" variant="outline" className="text-xs h-8"
                onClick={() => setLocation(`/generacion`)}>
                Generar
              </Button>
            </div>
          </form>
        </div>

        {/* Side panel */}
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white p-4 overflow-y-auto">
          {/* Grounding status */}
          <div className="mb-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Grounding</p>
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", groundingDot(page.groundingStatus ?? "unverified"))} />
              <span className="text-sm font-semibold text-gray-900">
                {groundingLabel(page.groundingStatus ?? "unverified")}
              </span>
            </div>
            {page.groundingUpdatedAt && (
              <p className="text-[10px] text-gray-400">Actualizado: {formatDate(page.groundingUpdatedAt)}</p>
            )}
            <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">
              El grounding debe ser "Verificado" para habilitar el preflight de generación.
            </p>
          </div>

          {/* Metadata */}
          <div className="border-t border-gray-100 pt-4 mb-5">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Metadatos</p>
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

          {/* Sources quick view */}
          {page.sources && (
            <div className="border-t border-gray-100 pt-4 mb-5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fuentes</p>
              {page.sources.split("\n").filter(Boolean).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-[9px] text-blue-600 hover:text-blue-800 mb-1.5 leading-tight">
                  <ExternalLink className="w-2.5 h-2.5 shrink-0 mt-0.5" />
                  <span className="truncate">{url.replace("https://learn.microsoft.com/es-es/", "learn.ms/…/")}</span>
                </a>
              ))}
            </div>
          )}

          {/* Quick actions */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Acciones rápidas</p>
            <div className="space-y-1.5">
              <ActionBtn label="Panel QA" onClick={() => setLocation(`/qa/${id}`)} />
              <ActionBtn label="Ir a Generación" onClick={() => setLocation(`/generacion`)} variant="teal" />
              {prevId && <ActionBtn label={`← Pág. ${String(id - 1).padStart(2, "0")}`} onClick={() => setLocation(`/contenido/${prevId}`)} />}
              {nextId && <ActionBtn label={`Pág. ${String(id + 1).padStart(2, "0")} →`} onClick={() => setLocation(`/contenido/${nextId}`)} />}
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
      <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1 block">{label}</Label>
      {hint && <p className="text-[9px] text-gray-400 mb-1.5 leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-[10px] text-gray-700 font-semibold">{value}</span>
    </div>
  );
}

function ActionBtn({ label, onClick, variant }: { label: string; onClick: () => void; variant?: "teal" }) {
  return (
    <button onClick={onClick} className={cn(
      "w-full text-left text-[10px] px-2.5 py-1.5 rounded-sm border transition-colors font-medium",
      variant === "teal"
        ? "border-teal-200 text-teal-700 hover:bg-teal-50"
        : "border-gray-100 text-gray-600 hover:bg-gray-50"
    )}>
      {label}
    </button>
  );
}
