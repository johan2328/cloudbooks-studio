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
import { Save, ChevronLeft, ChevronRight } from "lucide-react";
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
    updatePage.mutate(
      { id, data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          toast({ title: "Guardado", description: "Contenido actualizado correctamente." });
        },
      }
    );
  }

  if (isLoading) return (
    <Layout title="Contenido y Grounding">
      <div className="p-6 space-y-3">
        {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    </Layout>
  );

  if (!page) return (
    <Layout title="Contenido y Grounding">
      <div className="p-6 text-sm text-gray-500">Página no encontrada.</div>
    </Layout>
  );

  const prevId = id > 1 ? id - 1 : null;
  const nextId = id < 61 ? id + 1 : null;

  return (
    <Layout title={`Contenido y Grounding — Pág. ${page.pageNumber}`}>
      {/* Topbar controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex items-center gap-3">
        <button
          onClick={() => setLocation("/biblioteca")}
          className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Biblioteca
        </button>
        <span className="text-gray-200">|</span>
        {prevId && (
          <button onClick={() => setLocation(`/contenido/${prevId}`)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
            <ChevronLeft className="w-3 h-3" /> Anterior
          </button>
        )}
        {nextId && (
          <button onClick={() => setLocation(`/contenido/${nextId}`)} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-0.5">
            Siguiente <ChevronRight className="w-3 h-3" />
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium", statusColor(page.status))}>
            {statusLabel(page.status)}
          </span>
          {page.qaScore != null && (
            <span className={cn("text-sm font-bold", scoreColor(page.qaScore))}>QA {Math.round(page.qaScore)}</span>
          )}
        </div>
      </div>

      <div className="flex h-full">
        {/* Main form */}
        <div className="flex-1 p-6 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-2xl">
            {/* Title + Domain */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Título</Label>
                <Input {...register("title")} data-testid="input-title" className="text-sm" />
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Dominio</Label>
                <select {...register("domain")} data-testid="select-domain" className="w-full h-9 text-sm border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
                  {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs font-medium text-gray-700 mb-1 block">Estado de Grounding</Label>
                <select {...register("groundingStatus")} data-testid="select-grounding" className="w-full h-9 text-sm border border-gray-200 rounded-sm px-2 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="unverified">Sin verificar</option>
                  <option value="partial">Parcial</option>
                  <option value="verified">Verificado</option>
                </select>
              </div>
            </div>

            <FieldBlock label="Contexto ampliado">
              <Textarea {...register("context")} rows={4} data-testid="input-context" className="text-sm resize-none" placeholder="Descripción detallada del concepto para informar a la IA..." />
            </FieldBlock>

            <FieldBlock label="Conceptos clave (separados por coma)">
              <Textarea {...register("concepts")} rows={3} data-testid="input-concepts" className="text-sm resize-none" placeholder="Concepto A, Concepto B, Concepto C..." />
            </FieldBlock>

            <FieldBlock label="Trampas del examen" hint="Errores comunes y conceptos confusos en el examen AI-200">
              <Textarea {...register("examTraps")} rows={3} data-testid="input-exam-traps" className="text-sm resize-none border-red-100 focus:ring-red-300" placeholder="Lista de trampas frecuentes y distractores..." />
            </FieldBlock>

            <div className="border border-dashed border-teal-200 rounded-sm p-4 space-y-3 bg-teal-50/30">
              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Autocheck</p>
              <FieldBlock label="Pregunta autocheck">
                <Input {...register("autocheckQuestion")} data-testid="input-autocheck-question" className="text-sm" placeholder="¿Qué característica diferencia a...?" />
              </FieldBlock>
              <FieldBlock label="Respuesta correcta">
                <Input {...register("autocheckAnswer")} data-testid="input-autocheck-answer" className="text-sm" />
              </FieldBlock>
              <FieldBlock label="Explicación">
                <Textarea {...register("autocheckExplanation")} rows={2} data-testid="input-autocheck-explanation" className="text-sm resize-none" />
              </FieldBlock>
            </div>

            <FieldBlock label="Fuentes Microsoft Learn (URLs)">
              <Textarea {...register("sources")} rows={2} data-testid="input-sources" className="text-sm resize-none font-mono" placeholder="https://learn.microsoft.com/es-es/..." />
            </FieldBlock>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={!isDirty || updatePage.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                data-testid="button-save-content"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {updatePage.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-xs h-8"
                onClick={() => setLocation(`/qa/${id}`)}
              >
                Ver QA
              </Button>
            </div>
          </form>
        </div>

        {/* Side panel */}
        <div className="w-64 shrink-0 border-l border-gray-200 bg-white p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Estado de Grounding</p>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", groundingDot(page.groundingStatus ?? "unverified"))} />
              <span className="text-sm font-medium text-gray-900">{groundingLabel(page.groundingStatus ?? "unverified")}</span>
            </div>

            {page.groundingUpdatedAt && (
              <p className="text-xs text-gray-400">Actualizado: {formatDate(page.groundingUpdatedAt)}</p>
            )}

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <InfoRow label="Batch" value={page.batch} />
              <InfoRow label="Págna" value={page.pageNumber} />
              <InfoRow label="Estado" value={statusLabel(page.status)} />
              {page.runCount !== undefined && <InfoRow label="Corridas" value={String(page.runCount)} />}
              <InfoRow label="Actualizado" value={formatDate(page.updatedAt)} />
            </div>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acciones rápidas</p>
            <div className="space-y-1.5">
              <button
                onClick={() => setLocation(`/qa/${id}`)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-sm hover:bg-gray-50 text-gray-700 border border-gray-100"
              >
                Abrir panel QA
              </button>
              <button
                onClick={() => setLocation(`/generacion`)}
                className="w-full text-left text-xs px-2 py-1.5 rounded-sm hover:bg-teal-50 text-teal-700 border border-teal-100"
              >
                Ir a Generación
              </button>
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
      <Label className="text-xs font-medium text-gray-700 mb-1 block">{label}</Label>
      {hint && <p className="text-[10px] text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs text-gray-700 font-medium">{value}</span>
    </div>
  );
}
