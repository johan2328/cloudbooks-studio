import { useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { useStudio } from "@/lib/studio-store";
import { cn, actionLabel, actionColor, formatDateTime, statusLabel, statusColorDark } from "@/lib/utils";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, Download,
  Zap, FlaskConical, Shield, FileEdit, Filter, Upload, Link2, Package, Search,
} from "lucide-react";
import type { ActionType } from "@/lib/types";

const ACTION_ICONS: Record<ActionType, React.ComponentType<{className?:string}>> = {
  grounding_executed:     FlaskConical,
  generation_started:     Zap,
  generation_completed:   Zap,
  qa_executed:            Shield,
  page_approved:          CheckCircle2,
  revision_requested:     AlertTriangle,
  selective_regeneration: RefreshCw,
  page_exported:          Download,
  contract_updated:       FileEdit,
  asset_uploaded:         Upload,
  asset_linked:           Link2,
  asset_approved:         Package,
  asset_replaced:         RefreshCw,
};

const FILTER_OPTIONS: { value: ActionType | "all"; label: string }[] = [
  { value: "all",                   label: "Todas las acciones" },
  { value: "grounding_executed",    label: "Grounding" },
  { value: "generation_started",    label: "Generación" },
  { value: "qa_executed",           label: "QA" },
  { value: "page_approved",         label: "Aprobación" },
  { value: "revision_requested",    label: "Corrección" },
  { value: "selective_regeneration",label: "Regeneración" },
  { value: "page_exported",         label: "Exportación" },
  { value: "contract_updated",      label: "Contratos" },
  { value: "asset_uploaded",        label: "Asset cargado" },
  { value: "asset_linked",          label: "Asset vinculado" },
  { value: "asset_approved",        label: "Asset aprobado" },
  { value: "asset_replaced",        label: "Asset reemplazado" },
];

const USER_FILTERS = ["Todos los usuarios", "Ana García", "Carlos Méndez", "Laura Vidal", "Usuario activo", "Sistema"];

export default function Actividad() {
  const { state } = useStudio();
  const [filterType, setFilterType] = useState<ActionType | "all">("all");
  const [filterUser, setFilterUser] = useState("Todos los usuarios");
  const [search, setSearch] = useState("");

  const logs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return state.actionLog
      .filter(l => filterType === "all" || l.actionType === filterType)
      .filter(l => filterUser === "Todos los usuarios" || l.userName === filterUser)
      .filter((log) => {
        if (!term) return true;
        const haystack = [
          log.userName,
          log.pageTitle,
          log.pageNumber,
          log.result,
          log.note,
          actionLabel(log.actionType),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
  }, [filterType, filterUser, search, state.actionLog]);

  /* Stats */
  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = state.actionLog.filter(l => l.createdAt.startsWith(today));
  const approvals = state.actionLog.filter(l => l.actionType === "page_approved").length;
  const gens = state.actionLog.filter(l => l.actionType === "generation_completed").length;
  const revisions = state.actionLog.filter(l => l.actionType === "revision_requested").length;

  return (
    <Layout title="Historial de actividad">
      <div className="h-full overflow-y-auto bg-[#0a1220]">
        {/* Header */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Auditoría editorial</span>
          </div>
          <h1 className="text-sm font-black text-white">Historial de actividad</h1>
          <p className="text-[10px] text-white/25 mt-0.5">Registro completo de acciones del equipo sobre páginas, generaciones, QA y contratos</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-px bg-white/[0.04] border-b border-white/[0.04]">
          {[
            { label: "Acciones totales", value: state.actionLog.length, color: "text-white" },
            { label: "Páginas aprobadas", value: approvals, color: "text-emerald-400" },
            { label: "Generaciones completadas", value: gens, color: "text-violet-400" },
            { label: "Correcciones solicitadas", value: revisions, color: "text-amber-400" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[#0d1629] px-5 py-3">
              <p className={cn("text-xl font-black tabular-nums", kpi.color)}>{kpi.value}</p>
              <p className="text-[9px] text-white/25 mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>

        <div className="flex min-h-0">
          {/* Sidebar filtros */}
          <aside className="w-52 shrink-0 border-r border-white/[0.06] bg-[#0d1629] p-4 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Filter className="w-3 h-3 text-white/20" />
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Tipo de acción</p>
              </div>
              <div className="space-y-px">
                {FILTER_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setFilterType(opt.value)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-sm text-[10px] transition-colors",
                      filterType === opt.value
                        ? "bg-blue-500/15 text-blue-400 border-l-2 border-blue-400 pl-[8px]"
                        : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                    )}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Usuario</p>
              <div className="space-y-px">
                {USER_FILTERS.map(u => (
                  <button key={u} onClick={() => setFilterUser(u)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-sm text-[10px] transition-colors",
                      filterUser === u
                        ? "bg-blue-500/15 text-blue-400 border-l-2 border-blue-400 pl-[8px]"
                        : "text-white/35 hover:text-white/60 hover:bg-white/[0.03]"
                    )}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Buscar</p>
              <label className="flex items-center gap-2 h-8 px-2.5 rounded-sm bg-white/[0.03] border border-white/[0.08]">
                <Search className="w-3 h-3 text-white/20" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pagina, usuario o accion"
                  className="w-full bg-transparent text-[10px] text-white/70 placeholder:text-white/20 outline-none"
                />
              </label>
            </div>

            <div className="border-t border-white/[0.05] pt-4">
              <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Estado del equipo</p>
              <div className="space-y-1.5">
                {["Ana García", "Carlos Méndez", "Laura Vidal"].map((u, i) => {
                  const userLogs = state.actionLog.filter(l => l.userName === u);
                  const lastLog = userLogs[0];
                  return (
                    <div key={u} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-[7px] font-black text-white shrink-0">
                        {u.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] text-white/60 font-medium truncate">{u}</p>
                        <p className="text-[7px] text-white/20 truncate">
                          {lastLog ? actionLabel(lastLog.actionType) : "Sin actividad"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Log list */}
          <div className="flex-1 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-20">
                <Activity className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-sm text-white/25">Sin actividad para este filtro</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                <div className="px-6 py-3 bg-[#0d1629] border-b border-white/[0.04]">
                  <p className="text-[9px] text-amber-300/80">
                    La auditoria actual funciona como registro operativo de sesion del Studio. Todavia no es una bitacora persistida en base de datos.
                  </p>
                </div>
                {logs.map((log, i) => {
                  const Icon = ACTION_ICONS[log.actionType] ?? Activity;
                  const color = actionColor(log.actionType);
                  return (
                    <div key={log.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-white/[0.015] transition-colors"
                      data-testid={`log-${log.id}`}>
                      {/* Timeline dot + line */}
                      <div className="flex flex-col items-center shrink-0 mt-0.5">
                        <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center", color.replace("text-","bg-").replace("400","500/15"))}>
                          <Icon className={cn("w-3 h-3", color)} />
                        </div>
                        {i < logs.length - 1 && (
                          <div className="w-px flex-1 bg-white/[0.04] mt-1" style={{minHeight:"12px"}} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className={cn("text-[10px] font-bold", color)}>{actionLabel(log.actionType)}</span>
                              {log.pageNumber && (
                                <span className="text-[9px] text-white/20 font-mono">Pág. {log.pageNumber}</span>
                              )}
                              <span className="text-[9px] text-white/20">·</span>
                              <span className="text-[9px] text-white/35">{log.userName}</span>
                            </div>
                            {log.pageTitle && (
                              <p className="text-[10px] text-white/60 font-medium leading-snug mb-1 truncate max-w-lg">
                                {log.pageTitle}
                              </p>
                            )}
                            <p className="text-[9px] text-white/35 leading-snug">{log.result}</p>
                            {log.note && (
                              <p className="text-[9px] text-amber-400/60 mt-0.5 italic">"{log.note}"</p>
                            )}
                          </div>
                          <span className="text-[9px] text-white/20 shrink-0 tabular-nums">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-4 border-t border-white/[0.04]">
              <p className="text-[9px] text-white/15">
                {logs.length} entrada{logs.length !== 1 ? "s" : ""} — registro persistente en sesión · Futuro: sincronización con DB en tiempo real
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
