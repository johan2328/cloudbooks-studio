import { useState } from "react";
import { useLocation } from "wouter";
import { CommercialNav, LegalRow } from "./landing";
import { CheckCircle2, Mail, User, MessageSquare, Send, ArrowRight, Edit3, Eye, Shield, ChevronRight } from "lucide-react";

export default function NuestraLabor() {
  const [, setLocation] = useLocation();
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 5000);
    setForm({ name: "", email: "", subject: "", message: "" });
  }

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
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Como trabajamos.</h1>
          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            CloudBooks produce material de estudio para certificaciones cloud con un proceso editorial propio: agentes especializados generan, validan y refinan cada pagina. Un editor humano audita la entrega final.
          </p>
        </div>
      </div>

      {/* Pilares */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Edit3, title: "Produccion", desc: "Un agente por dominio del examen produce contenido estructurado, referenciado y verificable. Luego un editor humano valida coherencia, precision y calidad narrativa.", color: "#2563eb" },
            { icon: Eye,    title: "Validacion",  desc: "Cuatro dimensiones de QA tecnico por cada pagina: precision, coherencia con el examen, puntuacion didactica y completitud de referencias. Solo el material aprobado llega al lector.", color: "#0d9488" },
            { icon: Shield, title: "Actualizacion", desc: "Las colecciones se mantienen vigentes frente a cambios en la documentacion oficial Microsoft. Actualizaciones programadas y notificadas a los compradores.", color: "#7c3aed" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="bg-white/[0.03] border border-white/[0.06] rounded-sm p-6 hover:border-white/[0.12] transition-colors">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-4" style={{backgroundColor:`${s.color}15`,border:`1px solid ${s.color}30`}}>
                  <Icon className="w-5 h-5" style={{color:s.color}} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Contacto */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Contacto</p>
            <h2 className="text-2xl font-black text-white mb-4">Hablemos.</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-8">
              Para consultas sobre colecciones, licencias corporativas, soporte tecnico o propuestas de colaboracion. Respondemos en menos de 24 horas.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-white/40">Email</p>
                  <p className="text-sm text-white/80">hola@cloudbooks.editorial</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-sm p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-teal-400 mb-3" />
                <p className="text-sm font-bold text-white mb-1">Mensaje enviado</p>
                <p className="text-xs text-white/40">Te responderemos en menos de 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <input required type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                        className="w-full h-8 pl-8 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-sm text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                        placeholder="Tu nombre" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                        className="w-full h-8 pl-8 pr-3 bg-white/[0.04] border border-white/[0.08] rounded-sm text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                        placeholder="tu@email.com" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Asunto</label>
                  <select required value={form.subject} onChange={e => setForm(f => ({...f, subject: e.target.value}))}
                    className="w-full h-8 px-3 bg-white/[0.04] border border-white/[0.08] rounded-sm text-xs text-white/70 focus:outline-none focus:border-white/20 transition-colors appearance-none">
                    <option value="" className="bg-[#0d1629]">Selecciona un tema</option>
                    <option value="coleccion" className="bg-[#0d1629]">Consulta sobre una coleccion</option>
                    <option value="empresas" className="bg-[#0d1629]">Licencias corporativas</option>
                    <option value="soporte" className="bg-[#0d1629]">Soporte tecnico</option>
                    <option value="otro" className="bg-[#0d1629]">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Mensaje</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-white/20" />
                    <textarea required value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))}
                      rows={4}
                      className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-sm text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                      placeholder="Escribe tu mensaje..." />
                  </div>
                </div>
                <button type="submit"
                  className="w-full h-9 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold rounded-sm transition-all flex items-center justify-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Enviar mensaje
                </button>
                <p className="text-[9px] text-white/20 text-center">No compartimos tu informacion con terceros.</p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/[0.06] py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[9px] font-bold text-white/25 uppercase tracking-[0.2em] mb-2">Explora</p>
            <h3 className="text-lg font-black text-white">Conoce nuestras colecciones disponibles.</h3>
          </div>
          <button onClick={() => setLocation("/books")}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-semibold px-5 h-10 rounded-sm transition-all text-xs">
            Ver Books <ArrowRight className="w-3.5 h-3.5" />
          </button>
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
