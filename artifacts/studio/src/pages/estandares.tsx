import { useState } from "react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  Shield, FileText, Globe, CheckSquare, Cpu, Download,
  CheckCircle2, AlertCircle, XCircle, Clock, Beaker,
} from "lucide-react";
import type { StandardStatus } from "@/domain/editorial-standards/types";
import {
  GLOBAL_RULES, FORMAT_CONTRACTS, DOMAIN_CONTRACTS,
  QA_GATES, GENERATION_POLICIES, EXPORT_POLICIES,
} from "@/domain/editorial-standards";

/* ─── Badge de estado ──────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: StandardStatus }) {
  const cfg: Record<StandardStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    active:       { label: "Activo",       cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", Icon: CheckCircle2 },
    validated:    { label: "Validado",     cls: "bg-teal-500/10   text-teal-400   border-teal-500/20",     Icon: CheckCircle2 },
    experimental: { label: "Experimental", cls: "bg-amber-500/10  text-amber-400  border-amber-500/20",    Icon: Beaker },
    pending:      { label: "Pendiente",    cls: "bg-white/[0.04]  text-white/30   border-white/10",        Icon: Clock },
  };
  const { label, cls, Icon } = cfg[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", cls)}>
      <Icon className="w-2.5 h-2.5" />{label}
    </span>
  );
}

/* ─── Tabs de navegación ───────────────────────────────────────────────────── */
const TABS = [
  { id: "global",     label: "Reglas globales",        icon: Shield },
  { id: "formats",    label: "Contratos por formato",  icon: FileText },
  { id: "domains",    label: "Contratos por dominio",  icon: Globe },
  { id: "qa",         label: "Gates de QA",            icon: CheckSquare },
  { id: "generation", label: "Políticas generación",   icon: Cpu },
  { id: "export",     label: "Políticas exportación",  icon: Download },
] as const;

type TabId = typeof TABS[number]["id"];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EstandaresPage() {
  const [tab, setTab] = useState<TabId>("global");

  return (
    <Layout title="Estándares Editoriales">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-5 py-3 shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mb-0.5">
                CloudBooks · Gobernanza editorial
              </p>
              <h1 className="text-sm font-black text-white/85">Estándares Editoriales</h1>
              <p className="text-[9px] text-white/35 mt-0.5 max-w-xl">
                Capa de gobernanza que rige todos los productos CloudBooks. Define contratos por formato y dominio,
                gates de calidad, políticas de generación y exportación.
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-[7px] text-white/20 uppercase tracking-widest">Versión activa</p>
              <p className="text-[10px] font-bold text-teal-400">Visual Atlas v24</p>
              <p className="text-[8px] text-white/20">Golden Master Template</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 mt-3 -mb-3">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-[9px] font-semibold rounded-t-sm border-b-2 transition-all",
                  tab === id
                    ? "text-white border-teal-400 bg-teal-500/5"
                    : "text-white/30 border-transparent hover:text-white/60 hover:bg-white/[0.03]"
                )}>
                <Icon className="w-3 h-3" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Contenido del tab ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-4xl mx-auto">

            {/* ── Reglas globales ── */}
            {tab === "global" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Reglas que aplican a todos los productos CloudBooks, independientemente del formato, dominio o certificación.
                  Las reglas marcadas como <span className="text-red-400">enforced</span> están activamente bloqueadas en el sistema.
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {GLOBAL_RULES.map(rule => (
                    <div key={rule.id}
                      className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-4 py-3 flex items-start gap-4">
                      <div className="shrink-0 mt-0.5">
                        {rule.enforced
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          : <AlertCircle className="w-4 h-4 text-amber-400/60" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold text-white/80">{rule.label}</span>
                          <StatusBadge status={rule.status} />
                          {rule.enforced && (
                            <span className="text-[7px] px-1.5 py-0.5 rounded-sm border bg-red-500/8 text-red-400 border-red-500/20 font-bold">
                              enforced
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed">{rule.description}</p>
                      </div>
                      <span className="shrink-0 text-[7px] font-mono text-white/15">{rule.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Contratos por formato ── */}
            {tab === "formats" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Cada formato de producto CloudBooks tiene un contrato propio que define su estructura, restricciones visuales
                  y reglas de producción. Visual Atlas v24 es el único contrato actualmente activo.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {FORMAT_CONTRACTS.map(fc => (
                    <div key={fc.id}
                      className={cn(
                        "bg-[#0d1629] border rounded-sm p-4 space-y-2.5",
                        fc.status === "active" ? "border-teal-500/20" : "border-white/[0.07]"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-black text-white/85">{fc.name}</p>
                          <p className="text-[8px] text-white/25 font-mono">{fc.version}</p>
                        </div>
                        <StatusBadge status={fc.status} />
                      </div>
                      <p className="text-[8px] text-white/40 leading-relaxed">{fc.description}</p>
                      {fc.keyConstraints.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[7px] font-bold text-white/20 uppercase tracking-widest">Restricciones clave</p>
                          {fc.keyConstraints.map((c, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="text-white/15 text-[8px] shrink-0 mt-px">·</span>
                              <span className="text-[8px] text-white/40">{c}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {fc.activeCertifications.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/[0.05]">
                          <span className="text-[7px] text-white/20">En uso:</span>
                          {fc.activeCertifications.map(cert => (
                            <span key={cert}
                              className="text-[7px] bg-blue-500/10 text-blue-300 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-bold">
                              {cert}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Contratos por dominio ── */}
            {tab === "domains" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Contratos por colección o certificación específica. Definen qué formatos aplican, cuántas páginas
                  incluye el producto y su estado de producción actual.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {DOMAIN_CONTRACTS.map(dc => (
                    <div key={dc.id}
                      className={cn(
                        "bg-[#0d1629] border rounded-sm p-4 space-y-2",
                        dc.status === "active" ? "border-teal-500/20" : "border-white/[0.07]"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-white/85">{dc.name}</p>
                            {dc.certCode && (
                              <span className="text-[7px] font-bold font-mono bg-blue-600/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded-sm">
                                {dc.certCode}
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-white/25">{dc.provider}</p>
                        </div>
                        <StatusBadge status={dc.status} />
                      </div>
                      <p className="text-[8px] text-white/40 leading-relaxed">{dc.description}</p>
                      <div className="flex items-center gap-3 pt-1 border-t border-white/[0.05]">
                        {dc.totalPages && (
                          <span className="text-[8px] text-white/35">
                            <span className="font-bold text-white/60">{dc.totalPages}</span> páginas
                          </span>
                        )}
                        {dc.activeFormats.length > 0
                          ? dc.activeFormats.map(f => (
                            <span key={f}
                              className="text-[7px] bg-teal-500/10 text-teal-300 border border-teal-500/20 px-1.5 py-0.5 rounded-sm font-bold">
                              {f}
                            </span>
                          ))
                          : <span className="text-[7px] text-white/20">Sin formatos activos</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Gates de QA ── */}
            {tab === "qa" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Gates de calidad aplicados antes de aprobación editorial. Los gates que bloquean aprobación
                  impiden que la página pase al flujo de exportación sin cumplirlos.
                </p>
                <div className="space-y-2">
                  {QA_GATES.map(gate => (
                    <div key={gate.id}
                      className="bg-[#0d1629] border border-white/[0.07] rounded-sm px-4 py-3 flex items-start gap-4">
                      <div className="shrink-0 mt-0.5">
                        {gate.blocksApproval
                          ? <XCircle className="w-3.5 h-3.5 text-red-400" />
                          : <CheckCircle2 className="w-3.5 h-3.5 text-white/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold text-white/80">{gate.label}</span>
                          <StatusBadge status={gate.status} />
                          {gate.blocksApproval && (
                            <span className="text-[7px] px-1.5 py-0.5 rounded-sm border bg-red-500/8 text-red-400 border-red-500/20 font-bold">
                              bloquea aprobación
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed">{gate.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[7px] text-white/20">Máx si falla</p>
                        <p className={cn("text-[11px] font-black",
                          gate.maxScoreIfFailed >= 80 ? "text-white/40" :
                          gate.maxScoreIfFailed >= 50 ? "text-amber-400" : "text-red-400"
                        )}>
                          {gate.maxScoreIfFailed}/100
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Políticas de generación ── */}
            {tab === "generation" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Modelos, calidades y guardrails permitidos por formato. Ningún componente debe hardcodear
                  configuración de modelos — toda referencia proviene de este contrato.
                </p>
                <div className="space-y-2">
                  {GENERATION_POLICIES.map(pol => (
                    <div key={pol.formatId}
                      className={cn(
                        "bg-[#0d1629] border rounded-sm p-4",
                        pol.status === "active" ? "border-teal-500/20" : "border-white/[0.07]"
                      )}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black text-white/85">{pol.formatName}</span>
                        <StatusBadge status={pol.status} />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2">
                          <p className="text-[7px] text-white/20 uppercase tracking-widest mb-0.5">Texto / QA</p>
                          <p className="text-[9px] font-bold text-white/70 font-mono">{pol.textModel}</p>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2">
                          <p className="text-[7px] text-white/20 uppercase tracking-widest mb-0.5">Imagen</p>
                          {pol.imageModel
                            ? <p className="text-[9px] font-bold text-violet-300 font-mono">{pol.imageModel} {pol.imageQuality}</p>
                            : <p className="text-[9px] text-white/25">— no aplica</p>}
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2">
                          <p className="text-[7px] text-white/20 uppercase tracking-widest mb-0.5">Fallback</p>
                          <div className="flex items-center gap-1.5">
                            {pol.fallbackAllowed
                              ? <span className="text-[8px] text-amber-400">permitido</span>
                              : <span className="text-[8px] text-white/30">no permitido</span>}
                            <span className="text-white/10">·</span>
                            <span className="text-[8px] text-red-400">no aprobable</span>
                          </div>
                        </div>
                      </div>
                      {pol.batchGating && (
                        <p className="text-[8px] text-amber-400/60 mt-2">
                          · Batch gating activo — requiere aprobación de lote antes de generar
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Políticas de exportación ── */}
            {tab === "export" && (
              <div className="space-y-3">
                <p className="text-[9px] text-white/30 leading-relaxed">
                  Archivos obligatorios, formatos permitidos y gates de bloqueo antes de publicar un output.
                  La exportación solo se habilita cuando todos los archivos requeridos existen y el QA no bloquea.
                </p>
                <div className="space-y-2">
                  {EXPORT_POLICIES.map(pol => (
                    <div key={pol.formatId}
                      className={cn(
                        "bg-[#0d1629] border rounded-sm p-4",
                        pol.status === "active" ? "border-teal-500/20" : "border-white/[0.07]"
                      )}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-black text-white/85">{pol.formatName}</span>
                        <StatusBadge status={pol.status} />
                        {pol.blockedByQA && (
                          <span className="text-[7px] px-1.5 py-0.5 rounded-sm border bg-red-500/8 text-red-400 border-red-500/20 font-bold ml-auto">
                            bloqueado por QA
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2">
                          <p className="text-[7px] text-white/20 uppercase tracking-widest mb-1.5">Archivos requeridos</p>
                          <div className="space-y-0.5">
                            {pol.requiredFiles.map(f => (
                              <p key={f} className="text-[8px] font-mono text-white/50">{f}</p>
                            ))}
                          </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-3 py-2">
                          <p className="text-[7px] text-white/20 uppercase tracking-widest mb-1.5">Formatos de salida</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {pol.allowedFormats.map(f => (
                              <span key={f}
                                className="text-[7px] font-bold font-mono bg-white/[0.05] border border-white/[0.08] text-white/50 px-1.5 py-0.5 rounded-sm">
                                {f}
                              </span>
                            ))}
                          </div>
                          <p className="text-[7px] text-white/25 mt-2">
                            Metadata: {pol.metadataRequired ? "obligatoria" : "opcional"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </Layout>
  );
}
