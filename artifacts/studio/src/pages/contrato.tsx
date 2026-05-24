import { useState } from "react";
import Layout from "@/components/Layout";
import { cn, formatDate } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import { ShieldAlert, Sparkles, Layers, Clock, Star, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ContractVersion } from "@/lib/types";

const SECTION_CFG = {
  nonNegotiable:    { label: "Reglas no negociables", icon: ShieldAlert, color: "text-red-400",     bg: "bg-red-500/5 border-red-500/15",     dot: "bg-red-400" },
  flexible:         { label: "Reglas flexibles",       icon: Sparkles,   color: "text-blue-400",    bg: "bg-blue-500/5 border-blue-500/15",   dot: "bg-blue-400" },
  stableComponents: { label: "Componentes estables",   icon: Layers,     color: "text-teal-400",    bg: "bg-teal-500/5 border-teal-500/15",   dot: "bg-teal-400" },
} as const;

function ContractCard({ contract, isSelected, onSelect, onUpdate }: {
  contract: ContractVersion;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (note: string) => void;
}) {
  const [expanded, setExpanded]     = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateNote, setUpdateNote] = useState("");

  function handleUpdate() {
    if (!updateNote.trim()) return;
    onUpdate(updateNote.trim());
    setUpdateNote("");
    setShowUpdate(false);
  }

  return (
    <div className={cn(
      "bg-[#0d1629] border rounded-sm overflow-hidden transition-all",
      isSelected ? "border-blue-500/30" : "border-white/[0.07] hover:border-white/[0.12]"
    )}>
      {/* Header */}
      <div className="px-5 py-4 cursor-pointer flex items-start gap-4" onClick={onSelect}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <span className="text-xs font-black text-white/80">{contract.name}</span>
            <span className="text-[10px] font-bold bg-blue-600/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-sm">
              {contract.version}
            </span>
            <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-sm border",
              contract.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
              contract.status === "draft"  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                             "bg-white/[0.05] text-white/25 border-white/10")}>
              {contract.status === "active" ? "Activo" : contract.status === "draft" ? "Borrador" : "Archivado"}
            </span>
          </div>
          <p className="text-[9px] text-white/40 leading-relaxed mb-2">{contract.scope}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {contract.appliesTo.map(a => (
              <span key={a} className="text-[7px] bg-white/[0.04] border border-white/[0.06] text-white/30 px-1.5 py-0.5 rounded-sm">{a}</span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right space-y-1">
          <p className="text-[8px] text-white/20">Actualizado</p>
          <p className="text-[9px] font-semibold text-white/40">{formatDate(contract.lastUpdated)}</p>
          <div className="flex items-center justify-end gap-1 text-[7px] text-white/20">
            <Clock className="w-2.5 h-2.5" />
            {contract.changelog.length} revisiones
          </div>
        </div>
      </div>

      {/* Expanded detail */}
      {isSelected && (
        <div className="border-t border-white/[0.06]">
          {/* Sections */}
          <div className="grid grid-cols-3 gap-px bg-white/[0.03]">
            {(["nonNegotiable", "flexible", "stableComponents"] as const).map(key => {
              const cfg = SECTION_CFG[key];
              const Icon = cfg.icon;
              const rules = contract[key];
              return (
                <div key={key} className={cn("p-4 border-r border-white/[0.04] last:border-0")}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Icon className={cn("w-3 h-3 shrink-0", cfg.color)} />
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest", cfg.color)}>{cfg.label}</p>
                    <span className="ml-auto text-[8px] text-white/20">{rules.length}</span>
                  </div>
                  <div className="space-y-2">
                    {rules.map((rule, i) => (
                      <div key={i} className={cn("flex items-start gap-2 px-2.5 py-1.5 rounded-sm border text-[9px]", cfg.bg)}>
                        <div className={cn("w-1 h-1 rounded-full shrink-0 mt-1.5", cfg.dot)} />
                        <p className="text-white/55 leading-relaxed">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Changelog + Update */}
          <div className="border-t border-white/[0.06] px-5 py-4 flex gap-6">
            {/* Changelog */}
            <div className="flex-1 min-w-0">
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2 hover:text-white/50 transition-colors">
                <Clock className="w-3 h-3" />Changelog
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {(expanded ? contract.changelog : contract.changelog.slice(0, 2)).map((entry, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <span className="text-[8px] font-bold text-blue-400/60 font-mono shrink-0 w-12">{entry.version}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-white/50 leading-snug">{entry.note}</p>
                    <p className="text-[7px] text-white/20 mt-0.5">{entry.author} · {formatDate(entry.at)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Register update */}
            <div className="shrink-0 w-52">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Registrar revisión</p>
              {!showUpdate ? (
                <button onClick={() => setShowUpdate(true)}
                  className="h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all w-full">
                  Nueva revisión de contrato
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea value={updateNote} onChange={e => setUpdateNote(e.target.value)}
                    placeholder="Describe el cambio registrado…"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-sm px-2.5 py-2 text-[9px] text-white/60 placeholder:text-white/20 resize-none h-16 focus:outline-none focus:border-blue-500/40" />
                  <div className="flex gap-1.5">
                    <button onClick={handleUpdate} disabled={!updateNote.trim()}
                      className="flex-1 h-7 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-sm text-[8px] font-bold text-blue-300 transition-all disabled:opacity-30">
                      Confirmar
                    </button>
                    <button onClick={() => setShowUpdate(false)}
                      className="h-7 px-2 text-white/20 hover:text-white/50 transition-colors text-[9px]">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Contrato() {
  const { state, updateContract } = useStudio();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>("contract-atlas");

  const active  = state.contracts.filter(c => c.status === "active");
  const draft   = state.contracts.filter(c => c.status === "draft");
  const total   = state.contracts.reduce((sum, c) => sum + c.nonNegotiable.length + c.flexible.length + c.stableComponents.length, 0);

  return (
    <Layout title="Contratos editoriales">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* Header */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 flex items-center gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Sistema de contratos editoriales</span>
            </div>
            <h1 className="text-sm font-black text-white">Contratos versionados · AI-200 Collection</h1>
          </div>
          <div className="ml-auto flex gap-6">
            {[
              { label: "Contratos activos", value: active.length, color: "text-emerald-400" },
              { label: "En borrador",       value: draft.length,  color: "text-amber-400" },
              { label: "Reglas totales",    value: total,         color: "text-white/50" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={cn("text-xl font-black tabular-nums", s.color)}>{s.value}</p>
                <p className="text-[8px] text-white/20">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Red team target */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-2 flex items-center gap-3">
          <Star className="w-3 h-3 text-teal-400" />
          <span className="text-[9px] font-semibold text-teal-300/70">Score red team objetivo ≥ 9.5 / 10 antes de producción</span>
          <span className="text-white/10">·</span>
          <span className="text-[9px] text-white/25">Score QA mínimo para aprobación: 95/100 (Contrato Visual v24)</span>
        </div>

        {/* Contracts list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 max-w-5xl">
          {state.contracts.map(contract => (
            <ContractCard
              key={contract.id}
              contract={contract}
              isSelected={selectedId === contract.id}
              onSelect={() => setSelectedId(selectedId === contract.id ? null : contract.id)}
              onUpdate={(note) => {
                updateContract(contract.id, note);
                toast({ title: "Contrato actualizado", description: `${contract.name} — nueva revisión registrada en el changelog` });
              }}
            />
          ))}

          {/* Note */}
          <div className="px-4 py-3 bg-white/[0.02] border border-white/[0.05] rounded-sm flex items-start gap-2">
            <CheckCircle2 className="w-3 h-3 text-white/15 shrink-0 mt-0.5" />
            <p className="text-[9px] text-white/20 leading-relaxed">
              Los contratos son el sistema normativo del Production Studio. Cada página generada debe cumplir el contrato de su formato antes de pasar a aprobación. Las revisiones se registran en el changelog con autor y fecha.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
