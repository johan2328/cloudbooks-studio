import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import type { AssetType, AssetSlotStatus, OutputPack } from "@/lib/types";
import {
  FileText, Image, Download, Globe, Shield, Package, Upload,
  CheckCircle2, Clock, AlertTriangle, Link2, RefreshCw,
  ChevronRight, Eye, Database, Zap, ArrowUpRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Config por tipo de asset ───────────────────────────────────────────── */
const ASSET_CFG: Record<AssetType, {
  label: string; ext: string; icon: React.ComponentType<{className?:string}>;
  color: string; bg: string; borderColor: string;
}> = {
  preview:   { label:"Preview",    ext:"SVG/PNG", icon:Eye,      color:"text-violet-400",  bg:"bg-violet-500/10",  borderColor:"border-violet-500/20" },
  html:      { label:"HTML",       ext:"HTML",    icon:Globe,    color:"text-blue-400",    bg:"bg-blue-500/10",    borderColor:"border-blue-500/20" },
  png:       { label:"PNG 2x",     ext:"PNG",     icon:Image,    color:"text-teal-400",    bg:"bg-teal-500/10",    borderColor:"border-teal-500/20" },
  pdf:       { label:"PDF",        ext:"PDF",     icon:FileText, color:"text-amber-400",   bg:"bg-amber-500/10",   borderColor:"border-amber-500/20" },
  qa_report: { label:"QA Report",  ext:"JSON",    icon:Shield,   color:"text-sky-400",     bg:"bg-sky-500/10",     borderColor:"border-sky-500/20" },
  contract:  { label:"Contrato",   ext:"PDF/MD",  icon:Package,  color:"text-emerald-400", bg:"bg-emerald-500/10", borderColor:"border-emerald-500/20" },
};

/* ── Config por estado de slot ───────────────────────────────────────────── */
const STATUS_CFG: Record<AssetSlotStatus, {
  label: string; badge: string; dot: string; icon: React.ComponentType<{className?:string}>;
}> = {
  pending:          { label:"Pendiente",          badge:"bg-white/[0.05] text-white/25 border-white/10",          dot:"bg-white/20",    icon:Clock         },
  demo_available:   { label:"Demo disponible",    badge:"bg-violet-500/15 text-violet-300 border-violet-500/25",  dot:"bg-violet-400",  icon:Eye           },
  real_available:   { label:"Real cargado",       badge:"bg-blue-500/15 text-blue-300 border-blue-500/25",        dot:"bg-blue-400",    icon:Upload        },
  approved:         { label:"Aprobado",           badge:"bg-emerald-500/15 text-emerald-300 border-emerald-500/25",dot:"bg-emerald-400", icon:CheckCircle2  },
  needs_replacement:{ label:"Requiere reemplazo", badge:"bg-amber-500/15 text-amber-300 border-amber-500/25",     dot:"bg-amber-400",   icon:AlertTriangle },
  exported:         { label:"Exportado",          badge:"bg-teal-500/15 text-teal-300 border-teal-500/25",        dot:"bg-teal-400",    icon:ArrowUpRight  },
};

const ASSET_ORDER: AssetType[] = ["preview", "html", "png", "pdf", "qa_report", "contract"];

/* ── SlotBadge ───────────────────────────────────────────────────────────── */
function SlotBadge({ status, isDemo }: { status: AssetSlotStatus; isDemo: boolean }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", cfg.badge)}>
      <span className={cn("w-1 h-1 rounded-full shrink-0", cfg.dot)} />
      {isDemo && status === "demo_available" ? "Demo" : cfg.label}
    </span>
  );
}

/* ── SlotRow: fila de un asset dentro del detalle ───────────────────────── */
function SlotRow({ slot, onUpload, onLink, onApprove, onReplace }: {
  slot: OutputPack["slots"][AssetType];
  onUpload: () => void; onLink: () => void; onApprove: () => void; onReplace: () => void;
}) {
  const cfg      = ASSET_CFG[slot.type];
  const stCfg    = STATUS_CFG[slot.status];
  const Icon     = cfg.icon;
  const StatusIcon = stCfg.icon;
  const isReal   = !slot.isDemo && (slot.status === "real_available" || slot.status === "approved" || slot.status === "exported");
  const isPending = slot.status === "pending";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border rounded-sm transition-all",
      slot.status === "pending" ? "bg-white/[0.02] border-white/[0.06]" :
      slot.status === "demo_available" ? "bg-violet-500/5 border-violet-500/15" :
      slot.status === "approved" ? "bg-emerald-500/5 border-emerald-500/15" :
      "bg-[#0d1629] border-white/[0.07]"
    )}>
      {/* Icon + type */}
      <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center border shrink-0", cfg.bg, cfg.borderColor)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</p>
          <span className="text-[7px] text-white/20 font-mono">.{cfg.ext}</span>
          <SlotBadge status={slot.status} isDemo={slot.isDemo} />
          {slot.isDemo && (
            <span className="text-[7px] bg-violet-500/10 text-violet-400/60 border border-violet-500/15 px-1 py-px rounded-sm font-semibold">DEMO</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[8px] text-white/25">
          {slot.filename ? (
            <span className="font-mono text-white/40 truncate">{slot.filename}</span>
          ) : (
            <span className="italic">sin archivo</span>
          )}
          {slot.sizeKb && <span>{slot.sizeKb} KB</span>}
          {slot.note && <span className="text-white/20">· {slot.note}</span>}
        </div>
      </div>
      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isPending && (
          <>
            <button onClick={onUpload} title="Cargar asset real"
              className="flex items-center gap-1 h-6 px-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
              <Upload className="w-2.5 h-2.5" />Cargar
            </button>
            <button onClick={onLink} title="Vincular ruta/URL"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <Link2 className="w-2.5 h-2.5" />Vincular
            </button>
          </>
        )}
        {slot.status === "demo_available" && (
          <button onClick={onUpload}
            className="flex items-center gap-1 h-6 px-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-sm text-[8px] text-violet-400 font-semibold transition-all">
            <Upload className="w-2.5 h-2.5" />Reemplazar con real
          </button>
        )}
        {slot.status === "real_available" && (
          <button onClick={onApprove}
            className="flex items-center gap-1 h-6 px-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 rounded-sm text-[8px] text-emerald-400 font-semibold transition-all">
            <CheckCircle2 className="w-2.5 h-2.5" />Aprobar
          </button>
        )}
        {(slot.status === "approved" || slot.status === "exported") && (
          <button onClick={onReplace}
            className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 rounded-sm text-[8px] text-white/30 font-semibold transition-all">
            <RefreshCw className="w-2.5 h-2.5" />Reemplazar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── PageAssetCard: card de página en el grid principal ─────────────────── */
function PageAssetCard({ pack, isSelected, onClick }: {
  pack: OutputPack; isSelected: boolean; onClick: () => void;
}) {
  const realCount  = Object.values(pack.slots).filter(s => !s.isDemo && s.status !== "pending").length;
  const totalSlots = ASSET_ORDER.length;
  const demoCount  = Object.values(pack.slots).filter(s => s.isDemo && s.status === "demo_available").length;
  const pct        = Math.round((realCount / totalSlots) * 100);

  return (
    <button onClick={onClick} className={cn(
      "w-full text-left p-3 border rounded-sm transition-all",
      isSelected ? "bg-blue-500/10 border-blue-500/30" : "bg-[#0d1629] border-white/[0.07] hover:border-white/[0.15] hover:bg-[#0d1629]"
    )}>
      <div className="flex items-start gap-2.5">
        {/* Page number badge */}
        <div className="w-8 h-8 bg-[#0078d4]/15 border border-[#0078d4]/25 rounded-sm flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-[#0078d4]/80">#{pack.pageNumber}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-semibold text-white/70 truncate mb-1">{pack.pageTitle}</p>
          {/* Slot mini-indicators */}
          <div className="flex items-center gap-1 mb-1.5">
            {ASSET_ORDER.map(type => {
              const slot = pack.slots[type];
              const dot  = STATUS_CFG[slot.status].dot;
              return (
                <div key={type} title={`${ASSET_CFG[type].label}: ${STATUS_CFG[slot.status].label}${slot.isDemo ? " (demo)" : ""}`}
                  className={cn("w-2 h-2 rounded-full border transition-all", dot,
                    slot.isDemo && slot.status === "demo_available" ? "border-violet-500/40 opacity-60" : "border-transparent"
                  )} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[7px] text-white/25">
            <span>{demoCount} demo</span>
            <span>·</span>
            <span>{realCount} real</span>
            <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden ml-1">
              <div className={cn("h-full rounded-full", pct > 0 ? "bg-blue-500/60" : "bg-white/10")} style={{ width: `${pct}%` }} />
            </div>
            <span className="font-mono">{pct}%</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export default function Assets() {
  const { state, uploadAssetDemo, linkAsset, approveAsset, replaceAssetRequest } = useStudio();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedPageId, setSelectedPageId] = useState<string>("01");

  const packs = state.outputPacks;
  const selectedPack = packs.find(p => p.pageId === selectedPageId);

  /* ── Migration stats ── */
  const totalPages  = packs.length;
  const demoPrev    = packs.filter(p => p.slots.preview.status === "demo_available").length;
  const realHtml    = packs.filter(p => !p.slots.html.isDemo && p.slots.html.status !== "pending").length;
  const realPng     = packs.filter(p => !p.slots.png.isDemo && p.slots.png.status !== "pending").length;
  const realPdf     = packs.filter(p => !p.slots.pdf.isDemo && p.slots.pdf.status !== "pending").length;
  const contractOk  = packs.filter(p => p.slots.contract.status === "approved").length;
  const fullyReal   = packs.filter(p =>
    ["html","png","pdf"].every(t => {
      const s = p.slots[t as AssetType];
      return !s.isDemo && s.status !== "pending";
    })
  ).length;

  const STATS = [
    { label:"Páginas catálogo",      value:totalPages,  max:totalPages,  color:"text-white/60",    sub:"detectadas" },
    { label:"Previews demo",         value:demoPrev,    max:totalPages,  color:"text-violet-400",  sub:"disponibles" },
    { label:"HTML reales cargados",  value:realHtml,    max:totalPages,  color:"text-blue-400",    sub:"de 10" },
    { label:"PNG reales cargados",   value:realPng,     max:totalPages,  color:"text-teal-400",    sub:"de 10" },
    { label:"PDF reales cargados",   value:realPdf,     max:totalPages,  color:"text-amber-400",   sub:"de 10" },
    { label:"Packs completos",       value:fullyReal,   max:totalPages,  color:"text-emerald-400", sub:"HTML+PNG+PDF" },
  ];

  function handleUpload(pageId: string, assetType: AssetType) {
    uploadAssetDemo(pageId, assetType);
    toast({ title:`Asset ${assetType.toUpperCase()} cargado (demo)`, description:`Pág. ${pageId} — simulando carga de asset real` });
  }
  function handleLink(pageId: string, assetType: AssetType) {
    linkAsset(pageId, assetType, `/outputs/ai200-p${pageId}/output.${assetType}`, `ai200-p${pageId}-real.${assetType}`);
    toast({ title:`Asset vinculado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()} vinculado a ruta local` });
  }
  function handleApprove(pageId: string, assetType: AssetType) {
    approveAsset(pageId, assetType);
    toast({ title:`Asset aprobado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()} aprobado para producción` });
  }
  function handleReplace(pageId: string, assetType: AssetType) {
    replaceAssetRequest(pageId, assetType);
    toast({ title:`Reemplazo solicitado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()} marcado como "requiere reemplazo"` });
  }

  return (
    <Layout title="Assets y Outputs — Visual Atlas 01–10">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Migration Dashboard ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-4 h-4 text-blue-400" />
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Estado de migración · Visual Atlas AI-200 · Batch 01–10</p>
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setLocation("/conectores")}
                className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all">
                <Zap className="w-3 h-3" />Ver conectores
              </button>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2.5">
                <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
                <p className="text-[8px] text-white/25 mt-0.5">{s.label}</p>
                <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
                  <div className={cn("h-full rounded-full transition-all", s.color.replace("text-","bg-").replace("/400","/50").replace("/60","/30"))}
                    style={{ width: `${Math.round((s.value / s.max) * 100)}%` }} />
                </div>
                <p className="text-[7px] text-white/15 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Próxima acción */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-sm">
            <AlertTriangle className="w-3 h-3 text-amber-400/60 shrink-0" />
            <p className="text-[9px] text-amber-300/60">
              <span className="font-bold">Próxima acción:</span> Subir outputs reales HTML/PNG/PDF o conectar pipeline generador desde página 01 ·
              Contrato Visual Atlas v24 asignado · {demoPrev} previews demo disponibles como referencia
            </p>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: page grid ── */}
          <aside className="w-64 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Páginas Visual Atlas</p>
                <div className="flex items-center gap-2 text-[7px] text-white/20">
                  <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-400 opacity-60 inline-block" />demo</span>
                  <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />real</span>
                  <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />ok</span>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {packs.map(pack => (
                <PageAssetCard key={pack.pageId} pack={pack}
                  isSelected={selectedPageId === pack.pageId}
                  onClick={() => setSelectedPageId(pack.pageId)} />
              ))}
            </div>
          </aside>

          {/* ── Right: pack detail ── */}
          <div className="flex-1 overflow-y-auto">
            {selectedPack ? (
              <div className="p-5 space-y-4 max-w-3xl">
                {/* Pack header */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#0078d4] to-violet-600" />
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-16 bg-[#0a1220] rounded-sm border border-white/[0.07] flex flex-col items-center justify-center shrink-0 overflow-hidden">
                        <div className="w-full h-3 flex items-center px-1.5 gap-1" style={{ backgroundColor:"#0078d420" }}>
                          <span className="text-[5px] font-black text-[#0078d4]/70">ACR</span>
                          <span className="text-[4px] text-white/20 ml-auto">#{selectedPack.pageNumber}</span>
                        </div>
                        {[60, 80, 45, 70, 55].map((w, i) => (
                          <div key={i} className="h-px bg-white/10 rounded-full my-0.5" style={{ width: `${w}%` }} />
                        ))}
                        <div className="text-[5px] text-violet-400/50 mt-0.5 font-medium">DEMO PREVIEW</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-[#0078d4]/20 text-[#0078d4]/80 border border-[#0078d4]/25 px-1.5 py-0.5 rounded-sm">ACR · #{selectedPack.pageNumber}</span>
                          <span className="text-[8px] text-white/25">Contrato <span className="text-white/50 font-semibold">{selectedPack.contractVersion}</span></span>
                          {selectedPack.lastGenerationVersion && (
                            <span className="text-[8px] text-white/20">Versión <span className="font-mono text-white/40">{selectedPack.lastGenerationVersion}</span></span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-white/80 mb-2">{selectedPack.pageTitle}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ASSET_ORDER.map(type => {
                            const slot = selectedPack.slots[type];
                            const cfg  = ASSET_CFG[type];
                            return (
                              <div key={type} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[7px] font-semibold", cfg.bg, cfg.borderColor, cfg.color)}>
                                <span className={cn("w-1 h-1 rounded-full", STATUS_CFG[slot.status].dot, slot.isDemo && "opacity-50")} />
                                {cfg.label}
                                {slot.isDemo && <span className="opacity-50">·D</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <button onClick={() => setLocation(`/qa/${parseInt(selectedPack.pageId, 10)}`)}
                        className="flex items-center gap-1.5 h-8 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all shrink-0">
                        Ver en QA <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Output Pack slots */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Output Pack · slots de asset</p>
                    <div className="flex items-center gap-1 text-[8px] text-white/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 opacity-60 inline-block" /> Demo &nbsp;
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" /> Real cargado &nbsp;
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Aprobado
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {ASSET_ORDER.map(type => (
                      <SlotRow key={type} slot={selectedPack.slots[type]}
                        onUpload={() => handleUpload(selectedPack.pageId, type)}
                        onLink={() => handleLink(selectedPack.pageId, type)}
                        onApprove={() => handleApprove(selectedPack.pageId, type)}
                        onReplace={() => handleReplace(selectedPack.pageId, type)}
                      />
                    ))}
                  </div>
                </div>

                {/* Connector reference */}
                <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest">Conectores disponibles para esta página</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { fn:`uploadOutputAsset("${selectedPack.pageId}", "html", file)`,   desc:"Cargar HTML generado" },
                      { fn:`uploadOutputAsset("${selectedPack.pageId}", "png", file)`,    desc:"Cargar PNG 2x" },
                      { fn:`uploadOutputAsset("${selectedPack.pageId}", "pdf", file)`,    desc:"Cargar PDF print-ready" },
                      { fn:`linkGeneratedHtml("${selectedPack.pageId}", pathOrUrl)`,      desc:"Vincular HTML local/remoto" },
                      { fn:`linkGeneratedPng("${selectedPack.pageId}", pathOrUrl)`,       desc:"Vincular PNG local/remoto" },
                      { fn:`syncLocalBatchOutputs("Batch 01")`,                           desc:"Sync batch completo" },
                    ].map(c => (
                      <div key={c.fn} className="bg-white/[0.02] border border-white/[0.05] rounded-sm px-2.5 py-2">
                        <p className="text-[8px] font-mono text-blue-400/70 truncate">{c.fn}</p>
                        <p className="text-[7px] text-white/25 mt-0.5">{c.desc}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setLocation("/conectores")}
                    className="mt-3 flex items-center gap-1.5 text-[8px] text-blue-400/50 hover:text-blue-400 transition-colors">
                    <ChevronRight className="w-3 h-3" />Ver especificación completa de conectores
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-white/20">Selecciona una página</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
