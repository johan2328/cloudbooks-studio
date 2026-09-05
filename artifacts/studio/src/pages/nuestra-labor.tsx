import { useLocation } from "wouter";
import { CommercialNav, LegalRow } from "@/components/commercial-nav";
import { ArrowRight, ChevronRight, Users, Layers, Route } from "lucide-react";

export default function NuestraLaborPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0d1629] font-sans">
      <CommercialNav active="Nuestra Labor" />

      {/* Header */}
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-5 text-[9px] text-white/25">
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/")}>Inicio</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Nuestra Labor</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 max-w-2xl">
            Una comunidad afectada por materiales dispersos.
          </h1>
          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            Miles de personas intentan certificarse en cloud cada mes. La mayoria enfrenta documentacion extensa sin priorizacion, cursos desactualizados, dumps sin contexto y resumenes de calidad variable. No existe una ruta clara ni un estandar de calidad medible.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {[
            { num: "+", label: "Candidatos",        desc: "Cada mes intentan certificarse en Azure, AWS y GCP. La demanda crece." },
            { num: "6", label: "Formatos dispersos", desc: "Documentacion, cursos, dumps, resumenes, videos, foros. Sin integracion." },
            { num: "0", label: "Rutas claras",       desc: "Ningun producto editorial ofrece una secuencia completa de estudio validada." },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-6 hover:border-white/[0.12] transition-colors">
              <span className="text-3xl font-black text-white/20 block mb-3">{s.num}</span>
              <h3 className="text-base font-bold text-white mb-2">{s.label}</h3>
              <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* What we solve */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">La problematica</p>
            <h2 className="text-2xl font-black text-white mb-4">Fragmentacion que no deja avanzar.</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              El ecosistema de preparacion cloud esta atomizado. Un candidato tipico consulta 4 o 5 fuentes distintas, cada una con su propio formato, calidad y nivel de actualizacion. El resultado: horas invertidas en curacion, no en aprendizaje.
            </p>
            <div className="space-y-4">
              {[
                { icon: Layers, title: "Fuentes sin coherencia", desc: "Documentacion oficial, cursos, dumps y resumenes no comparten estructura ni estandar de calidad." },
                { icon: Route,  title: "Sin ruta integrada",      desc: "Ningun producto ofrece una secuencia completa de cero al examen con todos los formatos necesarios." },
                { icon: Users,  title: "Sin validacion tecnica",  desc: "La mayoria del material no pasa por revision sistematica de precision ni pertinencia al examen." },
              ].map(b => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{b.title}</h4>
                      <p className="text-xs text-white/50">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-sm p-6 shadow-2xl shadow-black/40">
            <div className="absolute -inset-px rounded-sm bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
            <div className="relative">
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-4">Nuestra respuesta</p>
              <div className="space-y-4">
                {[
                  { step: "1", title: "Colecciones integrales por certificacion", desc: "Cada certificacion se cubre con seis formatos complementarios, producidos desde cero." },
                  { step: "2", title: "Validacion tecnica en cuatro dimensiones", desc: "Precision, coherencia con examen, puntuacion didactica y completitud de referencias." },
                  { step: "3", title: "Mantenimiento frente a cambios oficiales", desc: "Microsoft actualiza. Nosotros actualizamos. Los compradores reciben la nueva version sin costo adicional." },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-sm bg-white/[0.06] border border-white/[0.10] flex items-center justify-center shrink-0 text-[10px] font-bold text-white/30">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{item.title}</h4>
                      <p className="text-xs text-white/45">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setLocation("/books")}
                className="mt-8 w-full flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/70 hover:text-white text-xs font-medium px-4 h-9 rounded-sm transition-all">
                Ver colecciones <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
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
