import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useCart } from "@/lib/cart";
import { CommercialNav, LegalRow } from "./landing";
import { ChevronRight, Clock, Package, BookOpen, Map, ArrowRight, Plus } from "lucide-react";

const AZURE_CERTS = [
  {
    cert: "AI-200",
    title: "Azure AI Fundamentals",
    domain: "Inteligencia artificial en Azure",
    status: "active",
    packs: 3,
    desc: "Fundamentos de IA, Azure Cognitive Services, Azure OpenAI Service, visión, lenguaje, voz y toma de decisiones con IA.",
    formats: ["Master Book", "Visual Atlas", "Exam Traps Guide", "Question Bank", "Cheat Sheets", "Rapid Review Pack"],
    available: ["Master Book", "Visual Atlas", "Collection Pack"],
    eta: null,
  },
  {
    cert: "AZ-900",
    title: "Azure Fundamentals",
    domain: "Fundamentos de nube",
    status: "planned",
    packs: 0,
    desc: "Conceptos cloud, servicios core de Azure, soluciones y herramientas de gestión, seguridad y privacidad, precios y soporte.",
    formats: [],
    available: [],
    eta: "Q3 2026",
  },
  {
    cert: "AI-900",
    title: "Azure AI Fundamentals (Generativa)",
    domain: "IA generativa en Azure",
    status: "planned",
    packs: 0,
    desc: "IA generativa, Azure OpenAI, Copilot, modelos de lenguaje y aplicaciones de IA responsable.",
    formats: [],
    available: [],
    eta: "Q3 2026",
  },
  {
    cert: "DP-900",
    title: "Azure Data Fundamentals",
    domain: "Datos en la nube",
    status: "planned",
    packs: 0,
    desc: "Conceptos de datos, almacenamiento relacional, no relacional, analítica de datos y visualización en Azure.",
    formats: [],
    available: [],
    eta: "Q4 2026",
  },
  {
    cert: "AZ-104",
    title: "Azure Administrator",
    domain: "Administración Azure",
    status: "planned",
    packs: 0,
    desc: "Administración de identidades, gobernanza, almacenamiento, cómputo, redes virtuales y monitoreo en Azure.",
    formats: [],
    available: [],
    eta: "2027",
  },
  {
    cert: "AZ-305",
    title: "Azure Solutions Architect",
    domain: "Arquitectura cloud",
    status: "planned",
    packs: 0,
    desc: "Diseño de soluciones cloud-native, gestión de identidades, networking, continuidad de negocio y migración a Azure.",
    formats: [],
    available: [],
    eta: "2027",
  },
];

export default function Books() {
  const [, setLocation] = useLocation();
  const { add } = useCart();

  return (
    <div className="min-h-screen bg-white font-sans">
      <CommercialNav active="Books" />

      {/* Header */}
      <div className="bg-[#0d1629] pt-14">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-2 mb-4 text-[9px] text-white/25">
            <span className="hover:text-white/50 cursor-pointer" onClick={() => setLocation("/")}>Inicio</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/50">Azure Books</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Azure Books</h1>
          <p className="text-sm text-white/40 max-w-xl">Colecciones de certificación para el ecosistema Microsoft Azure. Una certificación, todos los formatos necesarios para aprobarla.</p>
        </div>
      </div>

      {/* Certs grid */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-4">
        {/* Active cert — featured */}
        {AZURE_CERTS.filter(c => c.status === "active").map(cert => (
          <div key={cert.cert} className="bg-white border border-gray-200 rounded-sm overflow-hidden shadow-sm">
            <div className="h-1 bg-gradient-to-r from-teal-500 to-blue-500" />
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-black text-teal-600 font-mono bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-sm">{cert.cert}</span>
                    <span className="text-[9px] font-bold text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse inline-block" /> DISPONIBLE
                    </span>
                    <span className="text-[9px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-sm">{cert.domain}</span>
                  </div>
                  <h2 className="text-xl font-black text-gray-900 mb-2">{cert.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-5 max-w-xl">{cert.desc}</p>

                  {/* 3 packages */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { icon: BookOpen, label:"Master Book",      color:"#2563eb", tag:"Aprendizaje profundo" },
                      { icon: Map,      label:"Visual Atlas",      color:"#7c3aed", tag:"Estudio visual"       },
                      { icon: Package,  label:"Collection Pack",   color:"#0d9488", tag:"Preparación completa", best: true },
                    ].map(p => {
                      const Icon = p.icon;
                      return (
                        <div key={p.label} className={cn(
                            "border rounded-sm px-3 py-3 transition-all",
                            p.best ? "border-teal-200 bg-teal-50/50" : "border-gray-200"
                          )}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <Icon className="w-3.5 h-3.5" style={{color:p.color}} />
                            <span className="text-[10px] font-bold text-gray-800">{p.label}</span>
                            {p.best && <span className="text-[7px] font-bold bg-teal-600 text-white px-1 py-px rounded-sm ml-auto">BEST VALUE</span>}
                          </div>
                          <p className="text-[9px] text-gray-400">{p.tag}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <button onClick={() => add({ id:`ai-200-${p.label.toLowerCase().replace(/\s+/g,'-')}`, name:p.label, cert:'AI-200', format:p.label, price: p.best?99:49 })}
                              className="flex items-center gap-1 text-[9px] font-semibold text-white bg-gray-900 hover:bg-gray-800 px-2 h-5 rounded-sm transition-colors">
                              <Plus className="w-3 h-3" /> Anadir
                            </button>
                            <button onClick={() => setLocation("/ai-200-packs")}
                              className="text-[9px] font-semibold opacity-60 hover:opacity-100 transition-opacity" style={{color:p.color}}>
                              Ver detalles
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
                <button onClick={() => setLocation("/ai-200-packs")}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold px-4 h-8 rounded-sm text-xs transition-all">
                  Ver todos los paquetes AI-200 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Planned certs */}
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-0.5">Próximamente</p>
          <div className="grid md:grid-cols-2 gap-3">
            {AZURE_CERTS.filter(c => c.status === "planned").map(cert => (
              <div key={cert.cert} className="bg-white border border-gray-100 rounded-sm p-4 flex items-start gap-4 opacity-60">
                <div className="w-12 h-12 rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-black text-gray-400 font-mono">{cert.cert}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-700">{cert.title}</span>
                    <Clock className="w-3 h-3 text-gray-300 shrink-0" />
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{cert.desc}</p>
                  <p className="text-[9px] text-gray-300 mt-1 font-medium">Disponible {cert.eta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#0d1629] border-t border-white/[0.06] py-6 mt-10">
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
