import { motion, type Variants } from "framer-motion";
import { Database, Route, Edit3, Shapes, Shield, Package as Pkg, ShieldCheck } from "lucide-react";

/* ════════════════════════════════════════════════════════════════════════════
   METODOLOGÍA — reactor de agentes por dominio + veredicto humano (Human Audit).
   Sección completa reutilizable (vive en Nuestra Labor).
   ════════════════════════════════════════════════════════════════════════════ */

const D = "'Space Grotesk','Inter',sans-serif";
const C = { bg: "#0a0a0e", ink: "#f3f3f6", inkSoft: "rgba(243,243,246,0.62)", violet: "#8b5cf6", blue: "#3b82f6", teal: "#2dd4bf", gold: "#fbbf24" };
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const up: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };
const staggerDown: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.16, delayChildren: 0.05 } } };
const blurDown: Variants = { hidden: { opacity: 0, y: -16, filter: "blur(6px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } } };

const METHOD = [
  { label: "Conocimiento", color: "#3b82f6", agents: [
    { icon: Database, name: "Grounding", role: "Trazabilidad técnica", desc: "Documentación oficial del proveedor, validación de fuentes y verificación del contenido base." },
    { icon: Route, name: "Pedagogy", role: "Arquitectura de aprendizaje", desc: "Diseño de objetivos, secuencia de contenido y rutas de estudio progresivas." },
  ] },
  { label: "Creación", color: "#8b5cf6", agents: [
    { icon: Edit3, name: "Editorial", role: "Voz y narrativa", desc: "Coherencia editorial, estructura narrativa y formato específico por colección." },
    { icon: Shapes, name: "Visual", role: "Dirección de arte", desc: "Layout, paleta, tipografía e iconografía. Aplicación rigurosa del contrato visual." },
  ] },
  { label: "Calidad", color: "#2dd4bf", agents: [
    { icon: Shield, name: "QA / Red Team", role: "Validación adversarial", desc: "Auditoría técnica, detección de errores y scoring multidimensional superior a 9.7." },
    { icon: Pkg, name: "Production", role: "Build y exportación", desc: "Generación final, exportación por formato y trazabilidad completa." },
  ] },
];

type AgentT = { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; name: string; role: string; desc: string };

function Agent({ a, color, left }: { a: AgentT; color: string; left: boolean }) {
  const Icon = a.icon;
  return (
    <div className={`relative rounded-lg p-4 ${left ? "md:mr-5" : "md:ml-5"}`} style={{ backgroundColor: "#0e0e15", border: `1px solid ${color}2e` }}>
      <div className={`absolute top-3 bottom-3 ${left ? "right-0" : "left-0"} w-[2px] rounded-full`} style={{ background: color, opacity: 0.5 }} />
      <div className={`flex items-start gap-3 ${left ? "md:flex-row-reverse md:text-right" : ""}`}>
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}1f`, border: `1px solid ${color}40` }}><Icon className="w-4 h-4" style={{ color }} /></span>
        <div className="min-w-0">
          <h3 className="text-base tracking-tight" style={{ fontFamily: D, fontWeight: 700 }}>{a.name}</h3>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] mt-0.5" style={{ color }}>{a.role}</p>
          <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: C.inkSoft }}>{a.desc}</p>
        </div>
      </div>
    </div>
  );
}

function DomainChip({ label, color }: { label: string; color: string }) {
  return (
    <div className="rounded-md px-3 py-1.5 text-center" style={{ backgroundColor: C.bg, border: `1px solid ${color}55` }}>
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] block" style={{ color }}>Dominio</span>
      <span className="text-[12px] uppercase" style={{ fontFamily: D, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

export function MethodologyReactor() {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.12 }} variants={stagger} className="mx-auto max-w-[1100px] px-6">
      <motion.div variants={up} className="text-center mb-14 max-w-3xl mx-auto">
        <p className="font-mono text-[12px] uppercase tracking-[0.28em] mb-4" style={{ color: C.teal }}>Método editorial</p>
        <h2 className="tracking-[-0.03em] leading-[1.05]" style={{ fontFamily: D, fontWeight: 700, fontSize: "clamp(2rem,4.8vw,3.6rem)" }}>
          Una <span style={{ backgroundImage: `linear-gradient(100deg,${C.violet},${C.blue} 55%,${C.teal})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>batería de agentes</span> de IA<br />Un solo <span style={{ color: C.gold }}>veredicto humano</span>
        </h2>
        <p className="text-base mt-5 leading-relaxed" style={{ color: C.inkSoft }}>Distribuidos por dominios, los agentes producen cada formato. Un editor humano valida y firma la entrega final antes de publicar.</p>
      </motion.div>

      <motion.div variants={staggerDown} className="flex flex-col max-w-[1000px] mx-auto">
        {METHOD.map((d, di) => (
          <motion.div key={d.label} variants={blurDown}>
            {di > 0 && <div className="hidden md:flex justify-center my-2"><div className="w-px h-7" style={{ background: `linear-gradient(${C.ink}33, ${d.color}55)` }} /></div>}
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 md:gap-0 items-center">
              <div className="md:hidden flex justify-center mb-2 -order-1"><DomainChip label={d.label} color={d.color} /></div>
              <Agent a={d.agents[0]} color={d.color} left={true} />
              <div className="hidden md:flex justify-center px-3"><DomainChip label={d.label} color={d.color} /></div>
              <Agent a={d.agents[1]} color={d.color} left={false} />
            </div>
          </motion.div>
        ))}

        {/* convergencia → Human Audit */}
        <motion.div variants={blurDown} className="flex flex-col items-center pt-8">
          <div className="w-px h-10" style={{ background: `linear-gradient(${C.teal}66, ${C.gold})` }} />
          <div className="relative w-[150px] h-[150px] mt-2">
            <motion.div className="absolute inset-0 rounded-full blur-xl" style={{ background: C.gold }} animate={{ opacity: [0.22, 0.45, 0.22], scale: [1, 1.06, 1] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} />
            <div className="absolute inset-0 rounded-full" style={{ background: "linear-gradient(135deg,#fcd34d,#d97706 55%,#92400e)", boxShadow: "inset 0 2px 8px rgba(255,255,255,0.4),inset 0 -4px 12px rgba(0,0,0,0.3)" }} />
            <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
              <motion.div className="absolute -top-1/4 bottom-[-25%] w-1/2"
                style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.6), transparent)", transform: "skewX(-18deg)" }}
                initial={{ x: "-180%" }} animate={{ x: ["-180%", "280%"] }}
                transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.4 }} />
            </div>
            <div className="absolute inset-[6px] rounded-full" style={{ border: "2px solid rgba(253,230,138,0.6)" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <ShieldCheck className="w-7 h-7 text-amber-950 mb-1" />
              <span className="text-lg text-amber-950 uppercase leading-none" style={{ fontFamily: D, fontWeight: 700 }}>Human</span>
              <span className="text-lg text-amber-950 uppercase leading-none mt-0.5" style={{ fontFamily: D, fontWeight: 700 }}>Audit</span>
              <div className="w-8 h-px bg-amber-900/40 my-1.5" />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-950/70">QA &gt; 9.7</span>
            </div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] mt-4" style={{ color: `${C.gold}99` }}>Auditoría humana · Cierre editorial</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
