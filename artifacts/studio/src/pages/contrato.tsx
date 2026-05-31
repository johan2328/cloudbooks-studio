import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  ShieldAlert,
  Sparkles,
  Layers,
} from "lucide-react";

import Layout from "@/components/Layout";
import { cn, formatDate } from "@/lib/utils";
import {
  fetchStudioContract,
  updateStudioContract,
  type StudioVisualContract,
} from "@/lib/studio-api";
import { useToast } from "@/hooks/use-toast";

const SECTION_CFG = {
  nonNegotiable: {
    label: "Reglas no negociables",
    icon: ShieldAlert,
    color: "text-red-400",
    bg: "bg-red-500/5 border-red-500/15",
    dot: "bg-red-400",
  },
  flexibleStorytelling: {
    label: "Reglas flexibles",
    icon: Sparkles,
    color: "text-blue-400",
    bg: "bg-blue-500/5 border-blue-500/15",
    dot: "bg-blue-400",
  },
  stableComponents: {
    label: "Componentes estables",
    icon: Layers,
    color: "text-teal-400",
    bg: "bg-teal-500/5 border-teal-500/15",
    dot: "bg-teal-400",
  },
} as const;

type SectionKey = keyof typeof SECTION_CFG;

function toMultiline(values: string[]) {
  return values.join("\n");
}

function fromMultiline(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function Contrato() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contract, setContract] = useState<StudioVisualContract | null>(null);
  const [version, setVersion] = useState("");
  const [changeNote, setChangeNote] = useState("");
  const [sections, setSections] = useState<Record<SectionKey, string>>({
    nonNegotiable: "",
    flexibleStorytelling: "",
    stableComponents: "",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchStudioContract()
      .then((data) => {
        if (!mounted) return;
        setContract(data);
        setVersion(data.version);
        setSections({
          nonNegotiable: toMultiline(data.nonNegotiable),
          flexibleStorytelling: toMultiline(data.flexibleStorytelling),
          stableComponents: toMultiline(data.stableComponents),
        });
      })
      .catch((err) => {
        if (!mounted) return;
        toast({
          title: "No se pudo cargar contrato",
          description: err instanceof Error ? err.message : String(err),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  const totals = useMemo(() => {
    if (!contract) return { active: 0, rules: 0, revisions: 0 };
    const rules =
      contract.nonNegotiable.length +
      contract.flexibleStorytelling.length +
      contract.stableComponents.length;
    return {
      active: 1,
      rules,
      revisions: contract.changelog.length,
    };
  }, [contract]);

  async function handleSave() {
    if (!contract) return;
    setSaving(true);
    try {
      const updated = await updateStudioContract({
        version: version.trim() || contract.version,
        nonNegotiable: fromMultiline(sections.nonNegotiable),
        flexibleStorytelling: fromMultiline(sections.flexibleStorytelling),
        stableComponents: fromMultiline(sections.stableComponents),
        changeNote: changeNote.trim() || undefined,
      });

      setContract(updated);
      setVersion(updated.version);
      setSections({
        nonNegotiable: toMultiline(updated.nonNegotiable),
        flexibleStorytelling: toMultiline(updated.flexibleStorytelling),
        stableComponents: toMultiline(updated.stableComponents),
      });
      setChangeNote("");
      toast({
        title: "Contrato actualizado en BD",
        description: `Version ${updated.version} guardada correctamente.`,
      });
    } catch (err) {
      toast({
        title: "No se pudo guardar contrato",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout title="Contrato editorial">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 flex items-center gap-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Contrato visual persistente</span>
            </div>
            <h1 className="text-sm font-black text-white">Contrato versionado · Visual Atlas</h1>
          </div>
          <div className="ml-auto flex gap-6">
            <div className="text-center">
              <p className="text-xl font-black tabular-nums text-emerald-400">{totals.active}</p>
              <p className="text-[8px] text-white/20">Contrato activo</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black tabular-nums text-white/60">{totals.rules}</p>
              <p className="text-[8px] text-white/20">Reglas totales</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black tabular-nums text-blue-300">{totals.revisions}</p>
              <p className="text-[8px] text-white/20">Revisiones</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px]">Cargando contrato desde API...</span>
            </div>
          ) : !contract ? (
            <div className="px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-sm text-[10px] text-red-200/80">
              No hay contrato disponible en base de datos.
            </div>
          ) : (
            <div className="max-w-6xl space-y-4">
              <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-5 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[9px] text-white/25 uppercase tracking-widest font-bold">Metadatos</p>
                    <p className="text-[11px] text-white/70 mt-1">
                      Ultima actualizacion: {formatDate(contract.updatedAt)}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-2">
                    <span className="text-[8px] text-white/30 uppercase tracking-widest font-bold">Version</span>
                    <input
                      value={version}
                      onChange={(event) => setVersion(event.target.value)}
                      className="bg-transparent text-[10px] font-semibold text-white/75 outline-none w-24"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(Object.keys(SECTION_CFG) as SectionKey[]).map((key) => {
                  const cfg = SECTION_CFG[key];
                  const Icon = cfg.icon;
                  return (
                    <div key={key} className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Icon className={cn("w-3 h-3", cfg.color)} />
                        <p className={cn("text-[9px] font-bold uppercase tracking-widest", cfg.color)}>{cfg.label}</p>
                      </div>
                      <textarea
                        value={sections[key]}
                        onChange={(event) =>
                          setSections((prev) => ({
                            ...prev,
                            [key]: event.target.value,
                          }))
                        }
                        className={cn(
                          "w-full h-52 resize-none rounded-sm border px-2.5 py-2 text-[9px] leading-relaxed",
                          "bg-white/[0.02] text-white/70 placeholder:text-white/20",
                          "focus:outline-none",
                          cfg.bg
                        )}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Registrar revision</p>
                <textarea
                  value={changeNote}
                  onChange={(event) => setChangeNote(event.target.value)}
                  placeholder="Describe la razon editorial de este cambio para el changelog..."
                  className="w-full h-20 resize-none rounded-sm border border-white/[0.08] bg-white/[0.02] px-2.5 py-2 text-[9px] text-white/65 placeholder:text-white/20 focus:outline-none focus:border-blue-500/35"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-[8px] text-white/25 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Los cambios se guardan en base de datos via `/api/contract`.
                  </div>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                      "h-8 px-3 rounded-sm text-[10px] font-bold border flex items-center gap-1.5 transition-all",
                      saving
                        ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
                        : "bg-blue-600/20 hover:bg-blue-600/30 border-blue-500/30 text-blue-200"
                    )}
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Guardar contrato
                  </button>
                </div>
              </div>

              <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300/80" />
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Changelog persistente</p>
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {contract.changelog.length === 0 ? (
                    <p className="text-[9px] text-white/25">Sin revisiones registradas aun.</p>
                  ) : (
                    contract.changelog
                      .slice()
                      .reverse()
                      .map((entry, index) => (
                        <div key={`${entry.version}-${entry.at}-${index}`} className="px-3 py-2 rounded-sm bg-white/[0.02] border border-white/[0.05]">
                          <p className="text-[9px] font-semibold text-blue-300/90">{entry.version}</p>
                          <p className="text-[9px] text-white/60 mt-0.5">{entry.note}</p>
                          <p className="text-[8px] text-white/25 mt-1">{formatDate(entry.at)}</p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
