import { useState } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/lib/cart";
import { CommercialNav, LegalRow } from "./landing";
import { cn } from "@/lib/utils";
import {
  BookOpen, Map, Package, CheckCircle2, ChevronRight,
  AlertTriangle, HelpCircle, FileText, Zap, ArrowRight, Info, Plus,
} from "lucide-react";

const FORMATS_DETAIL = [
  { icon: BookOpen,     id:"master",    label:"Master Book",        color:"#2563eb", desc:"Guía completa estructurada por dominios del examen. Narración técnica, ejemplos y referencias a documentación oficial." },
  { icon: Map,          id:"atlas",     label:"Visual Atlas",        color:"#7c3aed", desc:"61 infografías técnicas. Una por concepto clave. Trampas visuales, autochecks y diagramas de decisión.", badge:"En producción" },
  { icon: AlertTriangle,id:"traps",     label:"Exam Traps Guide",    color:"#dc2626", desc:"Análisis de patrones de error recurrentes. Cada trampa explicada con señuelo, contexto y respuesta correcta." },
  { icon: HelpCircle,   id:"qbank",     label:"Question Bank",       color:"#0d9488", desc:"Banco de preguntas estilo examen con explicaciones detalladas. Filtrable por dominio, dificultad y tipo." },
  { icon: FileText,     id:"sheets",    label:"Cheat Sheets",        color:"#d97706", desc:"Resúmenes de referencia rápida por dominio. Una hoja por área, densidad máxima, sin texto superfluo." },
  { icon: Zap,          id:"rapid",     label:"Rapid Review Pack",   color:"#059669", desc:"Revisión intensiva para los últimos días. Resumen de resúmenes, focalizado en alta frecuencia de examen." },
];

const STUDY_PATH = [
  { step:"01", action:"Aprender",       format:"Master Book",       desc:"Dominio completo del temario por bloques" },
  { step:"02", action:"Comprender",     format:"Visual Atlas",       desc:"Visualizar y fijar conceptos con infografías" },
  { step:"03", action:"Entrenar",       format:"Exam Traps Guide",   desc:"Identificar señuelos y respuestas trampa" },
  { step:"04", action:"Practicar",      format:"Question Bank",      desc:"Simular el examen con feedback por pregunta" },
  { step:"05", action:"Memorizar",      format:"Cheat Sheets",       desc:"Consolidar conceptos clave antes del examen" },
  { step:"06", action:"Cerrar",         format:"Rapid Review Pack",  desc:"Revisión final de alta frecuencia de aparición" },
];

export default function AI200Packs() {
  const [, setLocation] = useLocation();
  const { add } = useCart();
  const [showDemoMsg, setShowDemoMsg] = useState<string | null>(null);

  function handleAction(pack: string) {
    add({ id: `ai-200-${pack.toLowerCase().replace(/\s+/g,'-')}`, name: pack, cert: 'AI-200', format: pack, price: pack === 'Collection Pack' ? 99 : 49 });
    setShowDemoMsg(pack);
    setTimeout(() => setShowDemoMsg(null), 3000);
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <CommercialNav active="Books" />

      {/* Header breadcrumb */}
      <div className="bg-[#0d1629] pt-14">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-5 text-[9px] text-white/25">
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/")}>Inicio</span>
            <ChevronRight className="w-3 h-3" />
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/books")}>Azure Books</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">AI-200 Certification Collection</span>
          </div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="text-xs font-black text-teal-400 font-mono bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded-sm">AI-200</span>
            <span className="text-[9px] text-white/30">Azure AI Fundamentals</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">AI-200 Certification Collection</h1>
          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            Colección completa de preparación para la certificación Azure AI Fundamentals. Elige el paquete que mejor se adapta a tus necesidades.
          </p>
        </div>
      </div>

      {/* Demo notice */}
      {showDemoMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#0d1629] border border-blue-500/30 text-white text-xs px-4 py-3 rounded-sm shadow-xl">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Compra de <strong>{showDemoMsg}</strong> — funcionalidad de pago próximamente.</span>
        </div>
      )}

      {/* ── 3 Packages ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-5 items-start">

          {/* Master Book */}
          <div className="bg-white border border-gray-200 rounded-sm overflow-hidden flex flex-col">
            <div className="h-1 bg-blue-600" />
            <div className="p-5 flex-1 flex flex-col">
              <div className="w-10 h-10 rounded-sm bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Aprendizaje profundo</p>
              <h2 className="text-xl font-black text-gray-900 mb-3">Master Book</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Comprensión profunda de cada dominio, servicio, arquitectura y decisión técnica del examen AI-200.
              </p>
              <div className="space-y-2 mb-5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Incluye</p>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">Master Book completo · PDF + digital</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">Estructura por dominios del examen oficial</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">Actualizaciones durante 12 meses</p>
                </div>
              </div>
              <div className="mt-auto">
                <button onClick={() => handleAction("Master Book")}
                  className="w-full h-10 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-sm text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                  Obtener Master Book
                </button>
                <p className="text-[9px] text-gray-300 text-center mt-2">Disponible próximamente</p>
              </div>
            </div>
          </div>

          {/* Visual Atlas */}
          <div className="bg-white border border-violet-200 rounded-sm overflow-hidden flex flex-col shadow-md">
            <div className="h-1 bg-gradient-to-r from-violet-500 to-blue-500" />
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-sm bg-violet-50 border border-violet-100 flex items-center justify-center">
                  <Map className="w-5 h-5 text-violet-600" />
                </div>
                <span className="text-[8px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-sm">EN PRODUCCIÓN</span>
              </div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Estudio visual</p>
              <h2 className="text-xl font-black text-gray-900 mb-3">Visual Atlas</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                Páginas infográficas, diagramas, trampas visuales, autochecks y mapas de decisión para estudiar más rápido. 61 páginas · 13 batches.
              </p>
              <div className="space-y-2 mb-5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Incluye</p>
                {[
                  "Visual Atlas completo · 61 infografías",
                  "Trampas visuales por concepto",
                  "Autochecks y mapas de decisión",
                  "Actualizaciones durante 12 meses",
                ].map(i => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-600">{i}</p>
                  </div>
                ))}
              </div>
              <div className="mt-auto">
                <button onClick={() => handleAction("Visual Atlas")}
                  className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white rounded-sm text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                  Obtener Visual Atlas
                </button>
                <p className="text-[9px] text-gray-300 text-center mt-2">Disponible próximamente</p>
              </div>
            </div>
          </div>

          {/* Collection Pack — BEST VALUE */}
          <div className="bg-[#0d1629] rounded-sm overflow-hidden flex flex-col shadow-xl ring-2 ring-teal-500/30">
            <div className="h-1 bg-gradient-to-r from-teal-400 to-blue-500" />
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-sm bg-teal-400/15 border border-teal-400/25 flex items-center justify-center">
                  <Package className="w-5 h-5 text-teal-400" />
                </div>
                <span className="text-[8px] font-bold bg-teal-400/20 text-teal-300 border border-teal-400/30 px-1.5 py-0.5 rounded-sm">BEST VALUE</span>
              </div>
              <p className="text-[9px] font-bold text-teal-400/60 uppercase tracking-widest mb-1">Preparación completa</p>
              <h2 className="text-xl font-black text-white mb-3">Collection Pack</h2>
              <p className="text-sm text-white/50 leading-relaxed mb-5">
                Todo lo necesario para preparar y aprobar la certificación: aprendizaje profundo, estudio visual, trampas de examen, práctica exhaustiva, hojas de repaso y revisión final.
              </p>
              <div className="space-y-2 mb-5">
                <p className="text-[9px] font-bold text-teal-400/50 uppercase tracking-widest">Incluye los 6 formatos</p>
                {FORMATS_DETAIL.map(f => {
                  const Icon = f.icon;
                  return (
                    <div key={f.id} className="flex items-center gap-2.5">
                      <Icon className="w-3 h-3 shrink-0" style={{color:`${f.color}80`}} />
                      <p className="text-[10px] text-white/55">{f.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-auto">
                <button onClick={() => handleAction("Collection Pack")}
                  className="w-full h-11 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white rounded-sm text-sm font-bold transition-all flex items-center justify-center gap-2">
                  Obtener Collection Pack <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[9px] text-white/25 text-center mt-2">Disponible próximamente</p>
              </div>
            </div>
          </div>
        </div>

        {/* Collection Pack detail note */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-sm px-4 py-3 flex items-start gap-3">
          <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Exam Traps Guide, Question Bank, Cheat Sheets y Rapid Review Pack</strong> no están disponibles como productos individuales. Se incluyen únicamente en el Collection Pack como parte de la preparación completa.
          </p>
        </div>
      </div>

      {/* ── Ruta de estudio (inside Collection Pack) ───────────────────── */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <div className="bg-white border border-gray-200 rounded-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Ruta de estudio incluida</p>
              <h3 className="text-sm font-bold text-gray-900">De cero al examen en seis etapas — Collection Pack</h3>
            </div>
            <span className="text-[9px] font-bold bg-teal-100 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-sm">6 FORMATOS</span>
          </div>
          <div className="divide-y divide-gray-50">
            {STUDY_PATH.map((s, i) => {
              const f = FORMATS_DETAIL[i];
              const Icon = f.icon;
              return (
                <div key={s.step} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                    style={{backgroundColor:`${f.color}12`,border:`1px solid ${f.color}25`}}>
                    <span className="text-[9px] font-black tabular-nums" style={{color:f.color}}>{s.step}</span>
                  </div>
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{color:`${f.color}80`}} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold uppercase tracking-wide" style={{color:f.color}}>{s.action}</span>
                      <span className="text-[9px] text-gray-400">·</span>
                      <span className="text-[9px] font-medium text-gray-500">{s.format}</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Formatos detail ──────────────────────────────────────────────── */}
      <div className="bg-gray-50 border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-5">Detalle de formatos · Collection Pack</p>
          <div className="grid md:grid-cols-3 gap-3">
            {FORMATS_DETAIL.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.id} className="bg-white border border-gray-200 rounded-sm p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-0.5 h-full" style={{backgroundColor:f.color}} />
                  <div className="flex items-start gap-3 pl-3">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{color:f.color}} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-xs font-bold text-gray-900">{f.label}</h4>
                        {f.badge && <span className="text-[7px] font-bold bg-violet-100 text-violet-700 border border-violet-200 px-1 py-px rounded-sm">{f.badge.toUpperCase()}</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0d1629] border-t border-white/[0.06] py-6">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-center">
            <img src="/cloudbooks-logo-nobg.png" alt="CloudBooks" className="h-16 w-auto opacity-70" draggable={false} />
          </div>
          <LegalRow />
        </div>
      </footer>
    </div>
  );
}
