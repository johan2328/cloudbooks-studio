import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import type { AssetType, AssetSlotStatus, OutputPack } from "@/lib/types";
import {
  GITHUB_REPO, GITHUB_MANIFEST, GITHUB_QA_BATCH,
} from "@/lib/demo-data";
import {
  FileText, Image, Download, Globe, Shield, Package, Upload,
  CheckCircle2, Clock, AlertTriangle, Link2, RefreshCw,
  ChevronRight, Eye, Database, Zap, ArrowUpRight, ExternalLink,
  GitBranch, GitCommit, SquareTerminal, BookOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Config por tipo de asset ───────────────────────────────────────────── */
const ASSET_CFG: Record<AssetType, {
  label: string; ext: string; icon: React.ComponentType<{className?:string}>;
  color: string; bg: string; borderColor: string;
}> = {
  preview:   { label:"Preview",    ext:"PNG",    icon:Eye,      color:"text-violet-400",  bg:"bg-violet-500/10",  borderColor:"border-violet-500/20" },
  html:      { label:"HTML",       ext:"HTML",   icon:Globe,    color:"text-blue-400",    bg:"bg-blue-500/10",    borderColor:"border-blue-500/20" },
  png:       { label:"Upper-art",  ext:"PNG",    icon:Image,    color:"text-teal-400",    bg:"bg-teal-500/10",    borderColor:"border-teal-500/20" },
  pdf:       { label:"PDF",        ext:"PDF",    icon:FileText, color:"text-amber-400",   bg:"bg-amber-500/10",   borderColor:"border-amber-500/20" },
  qa_report: { label:"QA Report",  ext:"MD",     icon:Shield,   color:"text-sky-400",     bg:"bg-sky-500/10",     borderColor:"border-sky-500/20" },
  contract:  { label:"Contrato",   ext:"MD/PDF", icon:Package,  color:"text-emerald-400", bg:"bg-emerald-500/10", borderColor:"border-emerald-500/20" },
};

/* ── Config por estado de slot ───────────────────────────────────────────── */
const STATUS_CFG: Record<AssetSlotStatus, {
  label: string; badge: string; dot: string; icon: React.ComponentType<{className?:string}>;
}> = {
  pending:          { label:"Pendiente",           badge:"bg-white/[0.05] text-white/25 border-white/10",           dot:"bg-white/20",    icon:Clock         },
  demo_available:   { label:"Demo disponible",     badge:"bg-violet-500/15 text-violet-300 border-violet-500/25",   dot:"bg-violet-400",  icon:Eye           },
  real_available:   { label:"Real en GitHub",      badge:"bg-blue-500/15 text-blue-300 border-blue-500/25",         dot:"bg-blue-400",    icon:GitBranch     },
  approved:         { label:"Aprobado",            badge:"bg-emerald-500/15 text-emerald-300 border-emerald-500/25",dot:"bg-emerald-400", icon:CheckCircle2  },
  needs_replacement:{ label:"Requiere reemplazo",  badge:"bg-amber-500/15 text-amber-300 border-amber-500/25",      dot:"bg-amber-400",   icon:AlertTriangle },
  exported:         { label:"Exportado",           badge:"bg-teal-500/15 text-teal-300 border-teal-500/25",         dot:"bg-teal-400",    icon:ArrowUpRight  },
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

/* ── SlotRow ─────────────────────────────────────────────────────────────── */
function SlotRow({ slot, onUpload, onLink, onApprove, onReplace }: {
  slot: OutputPack["slots"][AssetType];
  onUpload: () => void; onLink: () => void; onApprove: () => void; onReplace: () => void;
}) {
  const cfg      = ASSET_CFG[slot.type];
  const stCfg    = STATUS_CFG[slot.status];
  const Icon     = cfg.icon;
  const isReal   = !slot.isDemo && (slot.status === "real_available" || slot.status === "approved" || slot.status === "exported");
  const isPending = slot.status === "pending";
  const hasGithub = !!slot.url && slot.url.includes("github");

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border rounded-sm transition-all",
      slot.status === "pending"        ? "bg-white/[0.02] border-white/[0.06]" :
      slot.status === "demo_available" ? "bg-violet-500/5 border-violet-500/15" :
      slot.status === "approved"       ? "bg-emerald-500/5 border-emerald-500/15" :
      isReal                           ? "bg-blue-500/5 border-blue-500/15" :
      "bg-[#0d1629] border-white/[0.07]"
    )}>
      {/* Icon */}
      <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center border shrink-0", cfg.bg, cfg.borderColor)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</p>
          <span className="text-[7px] text-white/20 font-mono">.{cfg.ext}</span>
          <SlotBadge status={slot.status} isDemo={slot.isDemo} />
          {hasGithub && (
            <span className="inline-flex items-center gap-0.5 text-[7px] bg-white/[0.04] text-white/30 border border-white/10 px-1.5 py-0.5 rounded-sm font-semibold">
              <GitBranch className="w-2 h-2" />GitHub
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[8px] text-white/25 flex-wrap">
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
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {hasGithub && slot.url && (
          <a href={slot.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
            <ExternalLink className="w-2.5 h-2.5" />Abrir
          </a>
        )}
        {isPending && (
          <>
            <button onClick={onUpload}
              className="flex items-center gap-1 h-6 px-2 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
              <Upload className="w-2.5 h-2.5" />Cargar
            </button>
            <button onClick={onLink}
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <Link2 className="w-2.5 h-2.5" />Vincular
            </button>
          </>
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

/* ── PageAssetCard ───────────────────────────────────────────────────────── */
function PageAssetCard({ pack, isSelected, onClick }: {
  pack: OutputPack; isSelected: boolean; onClick: () => void;
}) {
  const [imgOk, setImgOk] = useState(true);
  const realCount  = Object.values(pack.slots).filter(s => !s.isDemo && s.status !== "pending").length;
  const totalSlots = ASSET_ORDER.length;
  const demoCount  = Object.values(pack.slots).filter(s => s.isDemo && s.status === "demo_available").length;
  const pct        = Math.round((realCount / totalSlots) * 100);
  const previewUrl = pack.slots.preview.url;
  const isGithub   = !!previewUrl && previewUrl.includes("raw.githubusercontent");

  return (
    <button onClick={onClick} className={cn(
      "w-full text-left p-3 border rounded-sm transition-all",
      isSelected ? "bg-blue-500/10 border-blue-500/30" : "bg-[#0d1629] border-white/[0.07] hover:border-white/[0.15]"
    )}>
      <div className="flex items-start gap-2.5">
        {/* Preview thumbnail */}
        <div className="w-10 h-10 bg-[#0a1220] border border-white/[0.08] rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
          {isGithub && imgOk ? (
            <img
              src={previewUrl}
              alt={`Preview pág. ${pack.pageNumber}`}
              className="w-full h-full object-cover"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="w-6 h-1 bg-[#0078d4]/20 rounded-full mb-0.5" />
              <div className="w-4 h-0.5 bg-white/10 rounded-full" />
              <span className="text-[5px] text-white/20 mt-0.5">#{pack.pageNumber}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[7px] font-black text-white/20 tabular-nums">#{pack.pageNumber}</span>
            {isGithub && <GitBranch className="w-2 h-2 text-blue-400/50 shrink-0" />}
          </div>
          <p className="text-[9px] font-semibold text-white/70 truncate mb-1">{pack.pageTitle}</p>
          {/* Slot dots */}
          <div className="flex items-center gap-1 mb-1.5">
            {ASSET_ORDER.map(type => {
              const slot = pack.slots[type];
              const dot  = STATUS_CFG[slot.status].dot;
              return (
                <div key={type} title={`${ASSET_CFG[type].label}: ${STATUS_CFG[slot.status].label}`}
                  className={cn("w-2 h-2 rounded-full border transition-all", dot,
                    slot.isDemo && slot.status === "demo_available" ? "border-violet-500/40 opacity-60" : "border-transparent"
                  )} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[7px] text-white/25">
            {demoCount > 0 ? <span>{demoCount} demo</span> : <span className="text-blue-400/50">{realCount} real</span>}
            <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden ml-1">
              <div className={cn("h-full rounded-full", pct >= 80 ? "bg-emerald-500/60" : pct > 0 ? "bg-blue-500/60" : "bg-white/10")}
                style={{ width:`${pct}%` }} />
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
  const [syncing, setSyncing] = useState(false);

  const packs = state.outputPacks;
  const selectedPack = packs.find(p => p.pageId === selectedPageId);

  /* ── Stats reales desde GitHub ── */
  const batch10       = packs.slice(0, 10);
  const totalPages    = packs.length;
  const realPreviews  = batch10.filter(p => !p.slots.preview.isDemo && p.slots.preview.status !== "pending").length;
  const realHtml      = batch10.filter(p => !p.slots.html.isDemo && p.slots.html.status !== "pending").length;
  const realPng       = batch10.filter(p => !p.slots.png.isDemo && p.slots.png.status !== "pending").length;
  const realQaReport  = batch10.filter(p => !p.slots.qa_report.isDemo && p.slots.qa_report.status !== "pending").length;
  const realPdf       = batch10.filter(p => !p.slots.pdf.isDemo && p.slots.pdf.status !== "pending").length;

  const STATS = [
    { label:"Páginas catálogo",    value:totalPages,   max:totalPages, color:"text-white/60",    sub:"detectadas" },
    { label:"Previews reales",     value:realPreviews, max:10,         color:"text-violet-400",  sub:"GitHub · preview.png" },
    { label:"HTML reales",         value:realHtml,     max:10,         color:"text-blue-400",    sub:"GitHub · page.html" },
    { label:"Upper-art/PNG",       value:realPng,      max:10,         color:"text-teal-400",    sub:"GitHub · upper-art.png" },
    { label:"QA Reports reales",   value:realQaReport, max:10,         color:"text-sky-400",     sub:"GitHub · qa-report.md" },
    { label:"PDF reales cargados", value:realPdf,      max:10,         color:"text-amber-400",   sub:"pendiente exportación" },
  ];

  /* ── Acciones GitHub simuladas ── */
  function syncFromGithub() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast({ title:"Sincronización completada", description:`${GITHUB_REPO} · 10 páginas · 50 assets verificados · MANIFEST.json leído` });
    }, 2000);
  }

  function openManifest()  { window.open(GITHUB_MANIFEST, "_blank"); }
  function openQaBatch()   { window.open(GITHUB_QA_BATCH, "_blank"); }
  function openRepo()      { window.open(`https://github.com/${GITHUB_REPO}`, "_blank"); }

  function approveAllBatch() {
    batch10.forEach(p => {
      if (p.slots.preview.status === "real_available") approveAsset(p.pageId, "preview");
      if (p.slots.html.status    === "real_available") approveAsset(p.pageId, "html");
      if (p.slots.png.status     === "real_available") approveAsset(p.pageId, "png");
      if (p.slots.qa_report.status === "real_available") approveAsset(p.pageId, "qa_report");
    });
    toast({ title:"Batch 01-10 aprobado", description:"Preview · HTML · Upper-art · QA Report aprobados en las 10 páginas" });
  }

  function handleUpload(pageId: string, assetType: AssetType) {
    uploadAssetDemo(pageId, assetType);
    toast({ title:`Asset ${assetType.toUpperCase()} cargado`, description:`Pág. ${pageId}` });
  }
  function handleLink(pageId: string, assetType: AssetType) {
    linkAsset(pageId, assetType, `/outputs/ai200-p${pageId}/output.${assetType}`, `ai200-p${pageId}-real.${assetType}`);
    toast({ title:`Asset vinculado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()}` });
  }
  function handleApprove(pageId: string, assetType: AssetType) {
    approveAsset(pageId, assetType);
    toast({ title:`Asset aprobado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()} aprobado para producción` });
  }
  function handleReplace(pageId: string, assetType: AssetType) {
    replaceAssetRequest(pageId, assetType);
    toast({ title:`Reemplazo solicitado`, description:`Pág. ${pageId} — ${assetType.toUpperCase()}` });
  }

  return (
    <Layout title="Assets y Outputs — Visual Atlas AI-200">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* ── Dashboard + GitHub source panel ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 shrink-0">

          {/* GitHub source banner */}
          <div className="flex items-start gap-4 mb-4 p-3 bg-blue-500/5 border border-blue-500/15 rounded-sm">
            <div className="flex items-center gap-2 shrink-0">
              <GitBranch className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-[8px] font-bold text-blue-400/80 uppercase tracking-widest">Fuente de assets</p>
                <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-bold text-blue-300/90 hover:text-blue-300 transition-colors flex items-center gap-1">
                  {GITHUB_REPO}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-2 text-[8px]">
              <div>
                <p className="text-white/20 mb-0.5">Ruta base</p>
                <p className="font-mono text-white/45">ai-200/visual-atlas/pages/</p>
              </div>
              <div>
                <p className="text-white/20 mb-0.5">Archivos por página</p>
                <p className="font-mono text-white/45">page.html · preview.png · upper-art.png · metadata.json · qa-report.md</p>
              </div>
              <div>
                <p className="text-white/20 mb-0.5">Docs de contrato</p>
                <p className="font-mono text-white/45">contracts/visual-atlas-v24.md</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={syncFromGithub} disabled={syncing}
                className="flex items-center gap-1 h-7 px-2.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 rounded-sm text-[8px] text-blue-400 font-semibold transition-all disabled:opacity-50">
                <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </button>
              <button onClick={openManifest}
                className="flex items-center gap-1 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <BookOpen className="w-3 h-3" />MANIFEST
              </button>
              <button onClick={openQaBatch}
                className="flex items-center gap-1 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <Shield className="w-3 h-3" />QA Batch
              </button>
              <button onClick={approveAllBatch}
                className="flex items-center gap-1 h-7 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-sm text-[8px] text-emerald-400 font-semibold transition-all">
                <CheckCircle2 className="w-3 h-3" />Aprobar batch
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-3.5 h-3.5 text-blue-400/60" />
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex-1">
              Estado de assets · Visual Atlas AI-200 · Batch 01–10 · Fuente: GitHub {GITHUB_REPO}
            </p>
            <button onClick={() => setLocation("/conectores")}
              className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all">
              <Zap className="w-3 h-3" />Ver conectores
            </button>
          </div>
          <div className="grid grid-cols-6 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2.5">
                <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
                <p className="text-[8px] text-white/25 mt-0.5">{s.label}</p>
                <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
                  <div className={cn("h-full rounded-full transition-all",
                    s.color.replace("text-","bg-").replace("/400","/50").replace("/60","/30"))}
                    style={{ width:`${Math.round((s.value / s.max) * 100)}%` }} />
                </div>
                <p className="text-[7px] text-white/15 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Status note */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-sm">
            <CheckCircle2 className="w-3 h-3 text-emerald-400/60 shrink-0" />
            <p className="text-[9px] text-emerald-300/60">
              <span className="font-bold">Assets reales vinculados:</span> 10 previews · 10 HTML · 10 upper-art · 10 QA reports confirmados en GitHub ·
              Pendiente: <span className="font-semibold">0/10 PDF</span> (sin generar) ·
              Contrato Visual Atlas v24 aprobado
            </p>
            <button onClick={openRepo}
              className="ml-auto flex items-center gap-1 h-5 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[7px] text-white/30 font-semibold transition-all shrink-0">
              <ExternalLink className="w-2 h-2" />Abrir repo
            </button>
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
                  <span className="flex items-center gap-0.5"><GitBranch className="w-2 h-2 text-blue-400" />real</span>
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
                  <div className="h-1 bg-gradient-to-r from-[#0078d4] to-blue-600" />
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      {/* Preview image */}
                      <div className="w-24 h-16 bg-[#0a1220] rounded-sm border border-white/[0.07] shrink-0 overflow-hidden">
                        {selectedPack.slots.preview.url ? (
                          <img
                            src={selectedPack.slots.preview.url}
                            alt={`Preview ${selectedPack.pageTitle}`}
                            className="w-full h-full object-cover"
                            onError={e => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = "none";
                              t.parentElement!.innerHTML = `<div class="flex flex-col items-center justify-center h-full"><div class="text-[7px] text-white/20 text-center px-1">Preview<br/>no cargó</div></div>`;
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-0.5">
                            {[60, 80, 45, 70, 55].map((w, i) => (
                              <div key={i} className="h-px bg-white/10 rounded-full" style={{ width:`${w}%` }} />
                            ))}
                            <span className="text-[5px] text-white/15 mt-0.5">PENDIENTE</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-[#0078d4]/20 text-[#0078d4]/80 border border-[#0078d4]/25 px-1.5 py-0.5 rounded-sm">
                            ACR · #{selectedPack.pageNumber}
                          </span>
                          <span className="text-[8px] text-white/25">Contrato <span className="text-white/50 font-semibold">{selectedPack.contractVersion}</span></span>
                          {selectedPack.lastGenerationVersion && (
                            <span className="text-[8px] text-white/20">Versión <span className="font-mono text-white/40">{selectedPack.lastGenerationVersion}</span></span>
                          )}
                          {parseInt(selectedPack.pageId, 10) <= 10 && (
                            <span className="inline-flex items-center gap-1 text-[7px] bg-blue-500/10 text-blue-400/80 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-bold">
                              <GitBranch className="w-2 h-2" />Real en GitHub
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-white/80 mb-2">{selectedPack.pageTitle}</p>
                        {/* Slot chips */}
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

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => setLocation(`/qa/${parseInt(selectedPack.pageId, 10)}`)}
                          className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all">
                          Ver en QA <ChevronRight className="w-3 h-3" />
                        </button>
                        {parseInt(selectedPack.pageId, 10) <= 10 && (
                          <a href={`https://github.com/${GITHUB_REPO}/tree/main/ai-200/visual-atlas/pages/${selectedPack.pageId}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 h-7 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[9px] text-blue-400 transition-all">
                            <GitBranch className="w-3 h-3" />Abrir en GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GitHub paths panel — solo páginas 01-10 */}
                {parseInt(selectedPack.pageId, 10) <= 10 && (
                  <div className="bg-[#0d1629] border border-blue-500/15 rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <GitBranch className="w-3 h-3 text-blue-400/60" />
                      <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest">
                        Rutas GitHub · {GITHUB_REPO} · pages/{selectedPack.pageId}/
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        ["page.html",       "HTML visual completo",   "html"],
                        ["preview.png",     "Preview miniatura",      "preview"],
                        ["upper-art.png",   "Arte superior PNG",      "png"],
                        ["metadata.json",   "Metadatos de la página", null],
                        ["qa-report.md",    "Reporte QA completo",    "qa_report"],
                      ].map(([file, desc]) => (
                        <a key={file as string}
                          href={`https://github.com/${GITHUB_REPO}/blob/main/ai-200/visual-atlas/pages/${selectedPack.pageId}/${file}`}
                          target="_blank" rel="noopener noreferrer"
                          className="group flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] hover:bg-blue-500/10 border border-white/[0.05] hover:border-blue-500/20 rounded-sm transition-all">
                          <SquareTerminal className="w-3 h-3 text-white/20 group-hover:text-blue-400 shrink-0 transition-colors" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[8px] font-mono text-white/50 group-hover:text-blue-300 transition-colors">{file}</p>
                            <p className="text-[7px] text-white/20">{desc}</p>
                          </div>
                          <ExternalLink className="w-2.5 h-2.5 text-white/10 group-hover:text-blue-400 shrink-0 transition-colors" />
                        </a>
                      ))}
                      <a href={`https://github.com/${GITHUB_REPO}/blob/main/ai-200/visual-atlas/contracts/visual-atlas-v24.md`}
                        target="_blank" rel="noopener noreferrer"
                        className="group flex items-center gap-2 px-2.5 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/25 rounded-sm transition-all">
                        <Package className="w-3 h-3 text-emerald-400/40 group-hover:text-emerald-400 shrink-0 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-mono text-white/50 group-hover:text-emerald-300 transition-colors">visual-atlas-v24.md</p>
                          <p className="text-[7px] text-white/20">Contrato editorial aprobado</p>
                        </div>
                        <ExternalLink className="w-2.5 h-2.5 text-emerald-400/20 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      </a>
                    </div>
                  </div>
                )}

                {/* Output Pack slots */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Output Pack · slots de asset</p>
                    <div className="flex items-center gap-3 text-[8px] text-white/20">
                      <span className="flex items-center gap-1"><GitBranch className="w-2.5 h-2.5 text-blue-400" />Real en GitHub</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Aprobado</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/20 inline-block" />Pendiente</span>
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
                      { fn:`uploadOutputAsset("${selectedPack.pageId}", "pdf", file)`,    desc:"Cargar PDF print-ready" },
                      { fn:`linkGeneratedHtml("${selectedPack.pageId}", githubRawUrl)`,   desc:"Vincular HTML desde GitHub raw" },
                      { fn:`linkGeneratedPng("${selectedPack.pageId}", githubRawUrl)`,    desc:"Vincular PNG desde GitHub raw" },
                      { fn:`syncLocalBatchOutputs("Batch 01")`,                           desc:"Sync batch completo" },
                      { fn:`publishApprovedAssets("${selectedPack.pageId}")`,             desc:"Publicar assets aprobados" },
                      { fn:`approveAsset("${selectedPack.pageId}", "html")`,              desc:"Aprobar HTML real" },
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
