import { useLocation } from "wouter";
import { CommercialNav, LegalRow } from "./landing";
import {
  ChevronRight, ArrowRight, Layers, Wand2, Shield, Search,
  FileText, BarChart3, Package, Eye, PenLine, Database
} from "lucide-react";

export default function DemoPage() {
  const [, setLocation] = useLocation();

  const phases = [
    {
      num: "01",
      title: "Ingesta y dominio",
      desc: "Un agente de investigacion analiza la documentacion oficial Microsoft, examenes anteriores y comunidades tecnicas. Extrae dominios clave, servicios criticos y patrones de pregunta.",
      icon: Database,
      color: "#2563eb",
    },
    {
      num: "02",
      title: "Produccion por agente",
      desc: "Por cada dominio del examen, un agente especializado genera contenido estructurado: conceptos, arquitecturas, comparaciones y trampas de examen. Todo referenciado y verificable.",
      icon: Wand2,
      color: "#7c3aed",
    },
    {
      num: "03",
      title: "QA tecnico en 4D",
      desc: "Precision tecnica, coherencia con el examen, puntuacion didactica y completitud de referencias. Cada pagina recibe un score. Solo aprobadas pasan al siguiente paso.",
      icon: Shield,
      color: "#0d9488",
    },
    {
      num: "04",
      title: "Revision humana",
      desc: "Un editor humano audita la coleccion completa: consistencia narrativa, flujo logico, calidad visual y ajuste de tono. Aprobar, solicitar correccion o regenerar.",
      icon: PenLine,
      color: "#f59e0b",
    },
    {
      num: "05",
      title: "Seis formatos",
      desc: "Master Book, Visual Atlas, Exam Traps, Question Bank, Cheat Sheets y Rapid Review. Cada formato sirve un proposito distinto en el ciclo de preparacion.",
      icon: Package,
      color: "#ec4899",
    },
    {
      num: "06",
      title: "Mantenimiento activo",
      desc: "Microsoft actualiza la documentacion. CloudBooks actualiza las colecciones. Los compradores reciben la nueva version sin costo adicional.",
      icon: Layers,
      color: "#06b6d4",
    },
  ];

  const tools = [
    { icon: FileText, label: "Contenido", desc: "Contexto, conceptos clave, trampas y fuentes por pagina." },
    { icon: Wand2,    label: "Generacion", desc: "Disparar corridas OpenAI y revisar historial de salidas." },
    { icon: Shield,   label: "QA",         desc: "Cuatro dimensiones de score, preview, aprobar o rechazar." },
    { icon: BarChart3,label: "Contrato",   desc: "Reglas no negociables, storytelling flexible, changelog." },
    { icon: Search,   label: "Exportacion", desc: "Tabla de paginas aprobadas, acciones por formato." },
    { icon: Eye,      label: "Biblioteca", desc: "Grid de 61 infografias con filtros por batch, estado, dominio." },
  ];

  return (
    <div className="min-h-screen bg-[#0d1629] font-sans">
      <CommercialNav active="Demo" />

      {/* Header */}
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-5 text-[9px] text-white/25">
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/")}>Inicio</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Demo</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 max-w-2xl">
            Como funciona CloudBooks Studio.
          </h1>
          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            Un sistema editorial hibrido: agentes especializados producen, validan tecnicamente y generan seis formatos. Un editor humano audita y aprueba. El resultado se mantiene vigente automaticamente.
          </p>
        </div>
      </div>

      {/* Pipeline */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Pipeline editorial</p>

        <div className="relative">
          {/* Desktop connector line */}
          <div className="hidden md:block absolute left-4 top-0 bottom-0 w-px bg-white/[0.06]" />

          <div className="space-y-6">
            {phases.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.num} className="relative flex items-start gap-4 md:gap-6">
                  {/* Step dot */}
                  <div className="hidden md:flex shrink-0 w-8 h-8 rounded-sm items-center justify-center border" style={{backgroundColor:`${p.color}15`,borderColor:`${p.color}40`}}>
                    <span className="text-[10px] font-bold" style={{color:p.color}}>{p.num}</span>
                  </div>
                  <div className="md:hidden shrink-0 w-7 h-7 rounded-sm flex items-center justify-center border" style={{backgroundColor:`${p.color}15`,borderColor:`${p.color}40`}}>
                    <span className="text-[9px] font-bold" style={{color:p.color}}>{p.num}</span>
                  </div>

                  {/* Card */}
                  <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-sm p-5 hover:border-white/[0.12] transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-4 h-4" style={{color:p.color}} />
                      <h3 className="text-sm font-bold text-white">{p.title}</h3>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="bg-[#0a1220] border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Herramientas del studio</p>
          <h2 className="text-2xl font-black text-white mb-4">Seis modulos. Un flujo completo.</h2>
          <p className="text-sm text-white/50 max-w-xl leading-relaxed mb-8">
            Cada fase del pipeline cuenta con una interfaz dedicada en el studio. El equipo de 4 personas navega entre ellas segun el estado de la coleccion.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map(t => {
              const Icon = t.icon;
              return (
                <div key={t.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-5 hover:border-white/[0.12] transition-colors">
                  <div className="w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1">{t.label}</h3>
                  <p className="text-xs text-white/50 leading-relaxed">{t.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Equipo</p>
        <h2 className="text-2xl font-black text-white mb-4">Cuatro roles. Un objetivo.</h2>
        <p className="text-sm text-white/50 max-w-xl leading-relaxed mb-8">
          Cada miembro del equipo tiene un rol definido en el pipeline. No hay duplicacion: cada etapa tiene un dueno.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { role: "Arquitecto",   desc: "Define contrato visual, estructura de dominios y pautas de calidad." },
            { role: "Productor",    desc: "Dispara generaciones, cura contexto y gestiona batches de paginas." },
            { role: "QA Tecnico",   desc: "Audita precision, coherencia con examen y completitud de referencias." },
            { role: "Editor Human", desc: "Audita narrativa, consistencia visual y ajuste de tono editorial." },
          ].map(m => (
            <div key={m.role} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-5">
              <h3 className="text-sm font-bold text-white mb-2">{m.role}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white mb-1">Explora las colecciones disponibles.</p>
            <p className="text-xs text-white/40">Azure es la primera linea editorial activa. Seis formatos por certificacion.</p>
          </div>
          <button onClick={() => setLocation("/books")}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-sm shrink-0">
            Colecciones disponibles <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] bg-[#080e1a]">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <LegalRow />
        </div>
      </footer>
    </div>
  );
}
