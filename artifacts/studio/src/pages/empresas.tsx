import { useState } from "react";
import { useLocation } from "wouter";
import { CommercialNav, LegalRow } from "./landing";
import { CheckCircle2, Mail, User, MessageSquare, Send, ArrowRight, Edit3, Eye, Shield, ChevronRight, Users, Briefcase, GraduationCap } from "lucide-react";

export default function EmpresasPage() {
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
    <div className="min-h-screen bg-[#0a1220] font-sans">
      <CommercialNav active="Empresas" />

      {/* Header */}
      <div className="pt-14">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-2 mb-5 text-[9px] text-white/25">
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/")}>Inicio</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Empresas</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4 max-w-2xl">
            Material de estudio con coherencia editorial.
          </h1>
          <p className="text-sm text-white/40 max-w-xl leading-relaxed">
            No resumimos contenido ajeno. Cada coleccion se construye desde cero: agentes especializados por dominio generan, validan y refinan cada pagina. Un editor humano audita la entrega final.
          </p>
        </div>
      </div>

      {/* Pilares */}
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <div className="grid md:grid-cols-3 gap-4 mb-12">
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

        {/* Licencias + Contacto */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Licencias */}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Licencias corporativas</p>
            <h2 className="text-2xl font-black text-white mb-4">Formacion cloud para equipos tecnicos.</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-6">
              Licencias de volumen para departamentos de TI, academias y consultoras. Rutas de estudio adaptadas, reportes de progreso y soporte directo.
            </p>
            <div className="space-y-3 mb-8">
              {[
                { icon: Users,          title: "Licencias de volumen",    desc: "Desde 5 licencias con descuentos escalonados. Asignacion flexible." },
                { icon: Briefcase,      title: "Rutas corporativas",      desc: "Secuencia de formatos adaptada al ritmo del equipo." },
                { icon: GraduationCap,  title: "Seguimiento de progreso", desc: "Dashboard de avance por certificacion y dominio." },
              ].map(b => {
                const Icon = b.icon;
                return (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{b.title}</h4>
                      <p className="text-xs text-white/50">{b.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative bg-white/[0.04] border border-white/[0.08] rounded-sm p-6">
              <div className="absolute -inset-px rounded-sm bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none" />
              <div className="relative">
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-4">Planes de licenciamiento</p>
                <div className="space-y-3">
                  {[
                    { plan: "Starter", seats: "5 \u2014 20", discount: "10%",  highlight: false },
                    { plan: "Growth",  seats: "21 \u2014 50", discount: "20%",  highlight: true },
                    { plan: "Enterprise", seats: "50+",  discount: "Contactar", highlight: false },
                  ].map(p => (
                    <div key={p.plan} className={
                      "flex items-center justify-between rounded-sm px-3 py-2.5 border " +
                      (p.highlight ? "bg-amber-500/5 border-amber-400/20" : "bg-white/[0.02] border-white/[0.06]")
                    }>
                      <div>
                        <span className="text-xs font-bold text-white/80">{p.plan}</span>
                        <span className="text-[9px] text-white/30 ml-2">{p.seats} licencias</span>
                      </div>
                      <span className={"text-[10px] font-bold " + (p.highlight ? "text-amber-400" : "text-white/40")}>{p.discount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Contacto</p>
            <h2 className="text-2xl font-black text-white mb-4">Hablemos.</h2>
            <p className="text-sm text-white/50 leading-relaxed mb-8">
              Para consultas sobre colecciones, licencias corporativas, soporte tecnico o propuestas de colaboracion. Respondemos en menos de 24 horas.
            </p>

            <div className="bg-white/[0.03] border border-white/[0.08] rounded-sm p-6">
              {sent ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-white mb-1">Mensaje enviado</h3>
                  <p className="text-xs text-white/40">Gracias por contactarnos. Te responderemos en menos de 24 horas.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm h-9 pl-9 pr-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                        placeholder="Tu nombre completo"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm h-9 pl-9 pr-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                        placeholder="tu@empresa.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Asunto</label>
                    <div className="relative">
                      <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                      <select
                        required
                        value={form.subject}
                        onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm h-9 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-white/20 appearance-none"
                      >
                        <option value="" className="bg-[#0a1220] text-white/40">Selecciona un asunto</option>
                        <option value="licencias" className="bg-[#0a1220]">Licencias corporativas</option>
                        <option value="coleccion" className="bg-[#0a1220]">Consulta sobre coleccion</option>
                        <option value="soporte" className="bg-[#0a1220]">Soporte tecnico</option>
                        <option value="colaboracion" className="bg-[#0a1220]">Propuesta de colaboracion</option>
                        <option value="otro" className="bg-[#0a1220]">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/40 uppercase tracking-wider mb-1.5">Mensaje</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm p-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
                      placeholder="Describe tu consulta o necesidad..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 hover:text-blue-200 text-xs font-medium px-4 h-9 rounded-sm transition-all"
                  >
                    Enviar mensaje <Send className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>

            <div className="mt-6 flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-white/40">Email directo</p>
                <p className="text-sm text-white/80">hola@cloudbooks.editorial</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white mb-1">Explora nuestras colecciones individuales.</p>
            <p className="text-xs text-white/40">Cada certificacion incluye seis formatos complementarios validados tecnicamente.</p>
          </div>
          <button onClick={() => setLocation("/books")}
            className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white/70 hover:text-white text-xs font-medium px-4 h-9 rounded-sm transition-all shrink-0">
            Ver Books <ArrowRight className="w-3 h-3" />
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
