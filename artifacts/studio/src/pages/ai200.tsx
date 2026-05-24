import { useLocation } from "wouter";
import CatalogLayout from "@/components/CatalogLayout";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock, BookOpen, FileText, Target, HelpCircle, Table2, Zap, ChevronRight } from "lucide-react";
import { useListPages } from "@workspace/api-client-react";

interface Format {
  id: string;
  name: string;
  tagline: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "active" | "planned";
  href: string | null;
  color: string;
  bgActive: string;
  borderActive: string;
}

const FORMATS: Format[] = [
  {
    id: "master-book",
    name: "Master Book",
    tagline: "Comprensión profunda",
    role: "Texto completo del dominio con explicaciones detalladas, analogías y marcos conceptuales. Base de referencia del equipo editorial.",
    icon: BookOpen,
    status: "planned",
    href: null,
    color: "text-violet-600",
    bgActive: "bg-violet-50",
    borderActive: "border-violet-200",
  },
  {
    id: "visual-atlas",
    name: "Visual Atlas",
    tagline: "Lectura visual acelerada",
    role: "61 páginas organizadas en 13 batches por dominio. Comunicación visual densa y precisa. El formato en producción activa.",
    icon: FileText,
    status: "active",
    href: "/biblioteca",
    color: "text-blue-600",
    bgActive: "bg-blue-50",
    borderActive: "border-blue-200",
  },
  {
    id: "exam-traps",
    name: "Exam Traps Guide",
    tagline: "Trampas y distractores",
    role: "Guía de ambigüedades del examen: distractores frecuentes, señales de preguntas trampa y patrones de error por dominio.",
    icon: Target,
    status: "planned",
    href: null,
    color: "text-orange-600",
    bgActive: "bg-orange-50",
    borderActive: "border-orange-200",
  },
  {
    id: "question-bank",
    name: "Question Bank",
    tagline: "Práctica exhaustiva",
    role: "Banco de preguntas con explicación completa de por qué cada opción es correcta o incorrecta. Cubre todos los dominios del examen.",
    icon: HelpCircle,
    status: "planned",
    href: null,
    color: "text-emerald-600",
    bgActive: "bg-emerald-50",
    borderActive: "border-emerald-200",
  },
  {
    id: "cheat-sheets",
    name: "Cheat Sheets",
    tagline: "Repaso compacto",
    role: "Hojas de referencia rápida con tablas de decisión, comparativas de servicios y criterios de selección por escenario.",
    icon: Table2,
    status: "planned",
    href: null,
    color: "text-teal-600",
    bgActive: "bg-teal-50",
    borderActive: "border-teal-200",
  },
  {
    id: "rapid-review",
    name: "Rapid Review Pack",
    tagline: "Repaso final",
    role: "Sesión condensada de repaso para las últimas 48–72 horas antes del examen. Flashcards, síntesis y puntos críticos.",
    icon: Zap,
    status: "planned",
    href: null,
    color: "text-amber-600",
    bgActive: "bg-amber-50",
    borderActive: "border-amber-200",
  },
];

export default function AI200Collection() {
  const [, setLocation] = useLocation();
  const pagesQuery = useListPages();
  const pages = pagesQuery.data ?? [];
  const approved = pages.filter(p => p.status === "approved").length;
  const avgQA = pages.filter(p => p.qaScore && p.qaScore > 0).length > 0
    ? (pages.reduce((s, p) => s + (p.qaScore ?? 0), 0) / pages.filter(p => p.qaScore && p.qaScore > 0).length).toFixed(1)
    : "—";

  return (
    <CatalogLayout crumbs={[
      { label: "Biblioteca", href: "/catalogo" },
      { label: "Azure", href: "/azure" },
      { label: "AI-200 Certification Collection" },
    ]}>
      <div className="px-8 py-8 max-w-5xl mx-auto w-full">

        {/* Collection header */}
        <div className="bg-white border border-blue-200 rounded-sm px-6 py-5 mb-6 flex items-start gap-5 shadow-sm">
          <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
            AI<br className="hidden" />200
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold bg-[#0078d4] text-white px-1.5 py-0.5 rounded-sm tracking-wider uppercase">Azure · Associate</span>
              <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> En producción
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">AI-200 Certification Collection</h1>
            <p className="text-xs text-gray-500 mt-0.5">Azure AI Fundamentals · 6 formatos editoriales · {pages.length} páginas en Visual Atlas</p>
          </div>
          {/* Live stats */}
          <div className="hidden md:flex items-center gap-5 shrink-0">
            {[
              { label: "Infografías", value: pages.length.toString() },
              { label: "Aprobadas", value: approved.toString() },
              { label: "Score QA", value: avgQA },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-[8px] text-gray-400 uppercase tracking-wider font-medium">{s.label}</p>
                <p className="text-base font-bold text-blue-600 leading-none mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formats grid */}
        <div className="mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Formatos de la colección</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              const isActive = fmt.status === "active";
              return (
                <div
                  key={fmt.id}
                  className={cn(
                    "bg-white border rounded-sm flex flex-col transition-all",
                    isActive
                      ? `${fmt.borderActive} shadow-sm hover:shadow-md`
                      : "border-gray-200 opacity-70"
                  )}
                >
                  {/* Header */}
                  <div className={cn(
                    "px-4 pt-4 pb-3 border-b",
                    isActive ? `${fmt.bgActive} ${fmt.borderActive}` : "bg-gray-50/50 border-gray-100"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={cn("w-4 h-4", isActive ? fmt.color : "text-gray-300")} />
                      {!isActive && <Lock className="w-3 h-3 text-gray-300" />}
                      {isActive && (
                        <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Activo
                        </span>
                      )}
                    </div>
                    <p className={cn("text-sm font-bold leading-tight", isActive ? "text-gray-900" : "text-gray-500")}>
                      {fmt.name}
                    </p>
                    <p className={cn("text-[10px] mt-0.5 font-medium", isActive ? fmt.color : "text-gray-400")}>
                      {fmt.tagline}
                    </p>
                  </div>
                  {/* Role description */}
                  <div className="px-4 py-3 flex-1">
                    <p className="text-[10px] text-gray-500 leading-relaxed">{fmt.role}</p>
                    {isActive && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-gray-400">Progreso · {approved}/{pages.length} páginas</span>
                          <span className="text-[9px] font-bold text-blue-600">
                            {pages.length > 0 ? Math.round((approved / pages.length) * 100) : 0}%
                          </span>
                        </div>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                            style={{ width: `${pages.length > 0 ? Math.round((approved / pages.length) * 100) : 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                  {/* CTA */}
                  <div className="px-4 pb-4">
                    {isActive ? (
                      <button
                        onClick={() => fmt.href && setLocation(fmt.href)}
                        className="w-full flex items-center justify-center gap-2 h-8 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-semibold rounded-sm transition-all shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Abrir estudio
                        <ArrowRight className="w-3 h-3 ml-auto" />
                      </button>
                    ) : (
                      <div className="w-full flex items-center justify-center h-8 bg-gray-100 text-gray-400 text-xs font-medium rounded-sm cursor-not-allowed gap-1.5">
                        <Lock className="w-3 h-3" />
                        En preparación
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estructura de la colección */}
        <div className="mt-8 bg-white border border-gray-200 rounded-sm p-5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Estructura de la colección</p>
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {FORMATS.map((fmt, i) => {
              const Icon = fmt.icon;
              const isActive = fmt.status === "active";
              return (
                <div key={fmt.id} className="flex items-stretch shrink-0">
                  <div className={cn(
                    "flex flex-col items-center gap-1.5 px-3 py-3 border rounded-sm min-w-[100px] text-center",
                    isActive ? `${fmt.bgActive} ${fmt.borderActive}` : "bg-gray-50 border-gray-200"
                  )}>
                    <Icon className={cn("w-4 h-4 mb-0.5", isActive ? fmt.color : "text-gray-300")} />
                    <p className={cn("text-[9px] font-bold leading-tight", isActive ? "text-gray-800" : "text-gray-400")}>
                      {fmt.name}
                    </p>
                    <p className={cn("text-[8px] leading-tight", isActive ? fmt.color : "text-gray-300")}>
                      {fmt.tagline}
                    </p>
                    {isActive && (
                      <span className="mt-1 text-[7px] bg-emerald-100 text-emerald-600 font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
                        Activo
                      </span>
                    )}
                  </div>
                  {i < FORMATS.length - 1 && (
                    <div className="flex items-center px-0.5 shrink-0">
                      <ChevronRight className="w-3 h-3 text-gray-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-400 mt-3 border-t border-gray-100 pt-2.5 leading-relaxed">
            La ruta de estudio progresa desde la comprensión profunda (Master Book) hasta el repaso final pre-examen (Rapid Review Pack). 
            El Visual Atlas es el punto de entrada visual acelerada — diseñado para ser el formato más eficiente por hora de estudio.
          </p>
        </div>

      </div>
    </CatalogLayout>
  );
}
