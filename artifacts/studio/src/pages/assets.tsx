import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import type { AssetType, AssetSlotStatus, OutputPack } from "@/lib/types";
import {
  GITHUB_REPO, GITHUB_MANIFEST, GITHUB_QA_BATCH_RAW,
  getRawAssetUrl, getGithubBlobUrl,
} from "@/lib/demo-data";
import {
  FileText, Image, Globe, Shield, Package, Upload,
  CheckCircle2, Clock, AlertTriangle, Link2, RefreshCw,
  ChevronRight, Eye, Database, Zap, ArrowUpRight, ExternalLink,
  GitBranch, SquareTerminal, BookOpen, X, Loader2, Code2, Play,
  AlertCircle, Lock, HardDrive, Server, Settings, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Modos de fuente de asset ───────────────────────────────────────────── */
type AssetSourceMode = "public_raw" | "replit_static" | "private_proxy";

const SOURCE_MODE_CFG: Record<AssetSourceMode, {
  label: string; sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; border: string;
  status: "ok" | "warn" | "planned";
  statusLabel: string;
}> = {
  public_raw:     { label:"Raw GitHub",       sublabel:"raw.githubusercontent.com", icon:GitBranch, color:"text-blue-400",   bg:"bg-blue-500/10",    border:"border-blue-500/25",   status:"warn",    statusLabel:"Repo privado — bloqueado" },
  replit_static:  { label:"Replit /public",   sublabel:"/public/assets/cloudbooks",  icon:HardDrive, color:"text-teal-400",   bg:"bg-teal-500/10",    border:"border-teal-500/25",   status:"planned", statusLabel:"Pendiente sync" },
  private_proxy:  { label:"Proxy backend",    sublabel:"/api/assets/proxy?path=",    icon:Server,    color:"text-violet-400", bg:"bg-violet-500/10",  border:"border-violet-500/25", status:"planned", statusLabel:"Planificado" },
};

/* ── Utilidades de URL ──────────────────────────────────────────────────── */
function rawToBlob(rawUrl: string): string {
  return rawUrl
    .replace("https://raw.githubusercontent.com/", "https://github.com/")
    .replace(/\/([^/]+)\/main\//, "/$1/blob/main/");
}

/* ── Config por tipo de asset ───────────────────────────────────────────── */
const ASSET_CFG: Record<AssetType, {
  label: string; ext: string; icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; borderColor: string;
}> = {
  preview:   { label:"Preview",    ext:"PNG",  icon:Eye,      color:"text-violet-400",  bg:"bg-violet-500/10",  borderColor:"border-violet-500/20" },
  html:      { label:"HTML",       ext:"HTML", icon:Globe,    color:"text-blue-400",    bg:"bg-blue-500/10",    borderColor:"border-blue-500/20" },
  png:       { label:"Upper-art",  ext:"PNG",  icon:Image,    color:"text-teal-400",    bg:"bg-teal-500/10",    borderColor:"border-teal-500/20" },
  pdf:       { label:"PDF",        ext:"PDF",  icon:FileText, color:"text-amber-400",   bg:"bg-amber-500/10",   borderColor:"border-amber-500/20" },
  qa_report: { label:"QA Report",  ext:"MD",   icon:Shield,   color:"text-sky-400",     bg:"bg-sky-500/10",     borderColor:"border-sky-500/20" },
  contract:  { label:"Contrato",   ext:"MD",   icon:Package,  color:"text-emerald-400", bg:"bg-emerald-500/10", borderColor:"border-emerald-500/20" },
};

const STATUS_CFG: Record<AssetSlotStatus, {
  label: string; badge: string; dot: string;
}> = {
  pending:          { label:"Pendiente",          badge:"bg-white/[0.05] text-white/25 border-white/10",           dot:"bg-white/20"    },
  demo_available:   { label:"Demo",               badge:"bg-violet-500/15 text-violet-300 border-violet-500/25",   dot:"bg-violet-400"  },
  real_available:   { label:"Real · GitHub",      badge:"bg-blue-500/15 text-blue-300 border-blue-500/25",         dot:"bg-blue-400"    },
  approved:         { label:"Aprobado",           badge:"bg-emerald-500/15 text-emerald-300 border-emerald-500/25",dot:"bg-emerald-400" },
  needs_replacement:{ label:"Req. reemplazo",     badge:"bg-amber-500/15 text-amber-300 border-amber-500/25",      dot:"bg-amber-400"   },
  exported:         { label:"Exportado",          badge:"bg-teal-500/15 text-teal-300 border-teal-500/25",         dot:"bg-teal-400"    },
};

const ASSET_ORDER: AssetType[] = ["preview", "html", "png", "pdf", "qa_report", "contract"];

/* ── Placeholder de asset no disponible ─────────────────────────────────── */
function AssetUnavailablePlaceholder({
  filename, rawUrl, compact = false, onConfigure,
}: {
  filename?: string; rawUrl: string; compact?: boolean; onConfigure?: () => void;
}) {
  const blobUrl = rawToBlob(rawUrl);
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a1220] gap-1 px-1">
        <Lock className="w-3 h-3 text-amber-400/50" />
        <p className="text-[5px] text-white/25 text-center leading-tight">Repo privado</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
      <div className="w-12 h-12 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Lock className="w-5 h-5 text-amber-400/70" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-white/50 mb-1">Preview no disponible</p>
        <p className="text-[9px] text-white/30 leading-relaxed max-w-xs">
          El repositorio <span className="font-mono text-amber-400/70">{GITHUB_REPO}</span> es privado.
          raw.githubusercontent.com bloquea el acceso anónimo.
        </p>
      </div>
      {filename && (
        <p className="text-[8px] font-mono text-white/20">{filename}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <a href={blobUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
          <GitBranch className="w-3 h-3" />Abrir en GitHub
        </a>
        <a href={rawUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
          <ExternalLink className="w-3 h-3" />Ver fuente raw
        </a>
        {onConfigure && (
          <button onClick={onConfigure}
            className="flex items-center gap-1 h-7 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-sm text-[8px] text-amber-400 font-semibold transition-all">
            <Settings className="w-3 h-3" />Configurar fuente
          </button>
        )}
      </div>
      <p className="text-[7px] text-white/15">
        Opciones: hacer el repo público · sincronizar a /public/assets · configurar proxy con token
      </p>
    </div>
  );
}

/* ── ImageModal — vista inline de imagen raw ────────────────────────────── */
function ImageModal({ url, title, onClose, onConfigure }: {
  url: string; title: string; onClose: () => void; onConfigure?: () => void;
}) {
  const [imgStatus, setImgStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    setImgStatus("loading");
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, url]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0d1629] border border-white/[0.12] rounded-sm overflow-hidden flex flex-col max-w-4xl max-h-[90vh] w-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] shrink-0">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-[10px] font-bold text-white/60 flex-1 truncate">{title}</p>
          {imgStatus === "ok" && (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <ExternalLink className="w-2.5 h-2.5" />Abrir raw
              </a>
              <a href={rawToBlob(url)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <GitBranch className="w-2.5 h-2.5" />Ver en GitHub
              </a>
            </>
          )}
          <button onClick={onClose}
            className="h-6 w-6 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 rounded-sm text-white/40 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0a1220] min-h-48">
          {/* Loading skeleton — siempre presente, oculto tras carga */}
          {imgStatus === "loading" && (
            <div className="flex flex-col items-center gap-2 text-white/25">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-[9px]">Cargando imagen…</p>
            </div>
          )}
          {/* La imagen — oculta si hay error para no mostrar icono roto */}
          <img
            src={url}
            alt={title}
            className={cn(
              "max-w-full max-h-full object-contain rounded-sm border border-white/[0.06]",
              imgStatus === "ok" ? "block" : "hidden"
            )}
            onLoad={() => setImgStatus("ok")}
            onError={() => setImgStatus("error")}
          />
          {imgStatus === "error" && (
            <AssetUnavailablePlaceholder
              filename={url.split("/").pop()}
              rawUrl={url}
              onConfigure={onConfigure}
            />
          )}
        </div>

        {/* Footer */}
        {imgStatus !== "error" && (
          <div className="px-4 py-2 border-t border-white/[0.06] shrink-0">
            <p className="text-[7px] font-mono text-white/15 truncate">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ContentModal — carga y muestra md/json desde raw URL ───────────────── */
function ContentModal({ url, title, fileType, onClose, onConfigure }: {
  url: string; title: string; fileType: "md" | "json"; onClose: () => void; onConfigure?: () => void;
}) {
  const [content,  setContent]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true); setFetchErr(null); setContent(null);
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status} — ${r.statusText}`); return r.text(); })
      .then(text => {
        if (fileType === "json") {
          try { setContent(JSON.stringify(JSON.parse(text), null, 2)); }
          catch { setContent(text); }
        } else {
          setContent(text);
        }
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== "AbortError") { setFetchErr(String(err)); setLoading(false); }
      });
    return () => ctrl.abort();
  }, [url, fileType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0d1629] border border-white/[0.12] rounded-sm overflow-hidden flex flex-col max-w-3xl max-h-[90vh] w-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] shrink-0">
          {fileType === "json"
            ? <Code2 className="w-3.5 h-3.5 text-blue-400" />
            : <FileText className="w-3.5 h-3.5 text-sky-400" />
          }
          <p className="text-[10px] font-bold text-white/60 flex-1 truncate">{title}</p>
          {!fetchErr && (
            <>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <ExternalLink className="w-2.5 h-2.5" />Ver raw
              </a>
              <a href={rawToBlob(url)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <GitBranch className="w-2.5 h-2.5" />Ver fuente en GitHub
              </a>
            </>
          )}
          <button onClick={onClose}
            className="h-6 w-6 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 rounded-sm text-white/40 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#08101c] min-h-40">
          {loading && (
            <div className="flex items-center justify-center h-32 gap-2 text-white/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px]">Cargando desde GitHub raw…</span>
            </div>
          )}
          {fetchErr && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-10 h-10 rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Lock className="w-4 h-4 text-amber-400/70" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-white/50 mb-1">Contenido no disponible</p>
                <p className="text-[9px] text-white/30 leading-relaxed max-w-xs">
                  No se pudo cargar desde raw GitHub. El repositorio puede ser privado o requerir autenticación.
                </p>
                <p className="text-[8px] font-mono text-red-400/40 mt-1">{fetchErr}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <a href={rawToBlob(url)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                  <GitBranch className="w-3 h-3" />Abrir en GitHub
                </a>
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                  <ExternalLink className="w-3 h-3" />Ver raw URL
                </a>
                {onConfigure && (
                  <button onClick={() => { onClose(); onConfigure(); }}
                    className="flex items-center gap-1 h-7 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-sm text-[8px] text-amber-400 font-semibold transition-all">
                    <Settings className="w-3 h-3" />Configurar fuente
                  </button>
                )}
              </div>
              <p className="text-[7px] text-white/15">
                Opciones: hacer el repo público · usar proxy backend · sincronizar assets a /public
              </p>
            </div>
          )}
          {content && (
            <pre className={cn(
              "text-[9px] leading-relaxed whitespace-pre-wrap break-words",
              fileType === "json" ? "text-emerald-300/70 font-mono" : "text-white/60"
            )}>{content}</pre>
          )}
        </div>

        {!fetchErr && (
          <div className="px-4 py-2 border-t border-white/[0.06] shrink-0">
            <p className="text-[7px] font-mono text-white/15 truncate">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── SlotBadge ───────────────────────────────────────────────────────────── */
function SlotBadge({ status }: { status: AssetSlotStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 text-[7px] font-bold px-1.5 py-0.5 rounded-sm border", cfg.badge)}>
      <span className={cn("w-1 h-1 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

/* ── SlotRow con acciones diferenciadas por tipo ─────────────────────────── */
function SlotRow({ slot, onUpload, onLink, onApprove, onReplace, onPreviewImage, onViewContent }: {
  slot: OutputPack["slots"][AssetType];
  onUpload: () => void; onLink: () => void; onApprove: () => void; onReplace: () => void;
  onPreviewImage?: () => void;
  onViewContent?: () => void;
}) {
  const cfg    = ASSET_CFG[slot.type];
  const Icon   = cfg.icon;
  const hasUrl = !!slot.url;
  const isImg  = slot.type === "preview" || slot.type === "png";
  const isText = slot.type === "qa_report" || slot.type === "contract";
  const isHtml = slot.type === "html";
  const isPend = slot.status === "pending";
  const isReal = !slot.isDemo && slot.status !== "pending";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 border rounded-sm transition-all",
      isPend ? "bg-white/[0.02] border-white/[0.06]" :
      slot.status === "approved" ? "bg-emerald-500/5 border-emerald-500/15" :
      isReal ? "bg-blue-500/5 border-blue-500/15" :
      "bg-[#0d1629] border-white/[0.07]"
    )}>
      <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center border shrink-0", cfg.bg, cfg.borderColor)}>
        <Icon className={cn("w-4 h-4", cfg.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <p className={cn("text-[10px] font-bold", cfg.color)}>{cfg.label}</p>
          <span className="text-[7px] text-white/20 font-mono">.{cfg.ext}</span>
          <SlotBadge status={slot.status} />
        </div>
        <p className="text-[8px] font-mono text-white/25 truncate">
          {slot.note ?? slot.filename ?? "sin archivo"}
        </p>
      </div>

      {/* Acciones por tipo */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">

        {isImg && hasUrl && !isPend && (
          <>
            <button onClick={onPreviewImage}
              className="flex items-center gap-1 h-6 px-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-sm text-[8px] text-violet-400 font-semibold transition-all">
              <Eye className="w-2.5 h-2.5" />Ver imagen
            </button>
            <a href={rawToBlob(slot.url!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
              <GitBranch className="w-2.5 h-2.5" />GitHub
            </a>
          </>
        )}

        {isHtml && hasUrl && !isPend && (
          <>
            <button onClick={onPreviewImage}
              className="flex items-center gap-1 h-6 px-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
              <Play className="w-2.5 h-2.5" />Render preview
            </button>
            <a href={slot.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
              <Code2 className="w-2.5 h-2.5" />Ver raw
            </a>
            <a href={rawToBlob(slot.url!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
              <GitBranch className="w-2.5 h-2.5" />GitHub
            </a>
          </>
        )}

        {isText && hasUrl && !isPend && (
          <>
            <button onClick={onViewContent}
              className="flex items-center gap-1 h-6 px-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-sm text-[8px] text-sky-400 font-semibold transition-all">
              <FileText className="w-2.5 h-2.5" />Ver contenido
            </button>
            <a href={rawToBlob(slot.url!)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
              <GitBranch className="w-2.5 h-2.5" />GitHub
            </a>
          </>
        )}

        {isPend && (
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
function PageAssetCard({ pack, isSelected, onClick, onClickPreview }: {
  pack: OutputPack; isSelected: boolean; onClick: () => void; onClickPreview?: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const realCount  = Object.values(pack.slots).filter(s => !s.isDemo && s.status !== "pending").length;
  const pct        = Math.round((realCount / ASSET_ORDER.length) * 100);
  const previewUrl = pack.slots.preview.url;
  const isRaw      = !!previewUrl && previewUrl.includes("raw.githubusercontent");

  return (
    <button onClick={onClick} className={cn(
      "w-full text-left p-3 border rounded-sm transition-all",
      isSelected ? "bg-blue-500/10 border-blue-500/30" : "bg-[#0d1629] border-white/[0.07] hover:border-white/[0.15]"
    )}>
      <div className="flex items-start gap-2.5">
        {/* Thumbnail */}
        <div
          onClick={e => { e.stopPropagation(); onClickPreview?.(); }}
          className="w-10 h-10 bg-[#0a1220] border border-white/[0.08] rounded-sm shrink-0 overflow-hidden cursor-pointer hover:border-white/20 transition-all">
          {isRaw && !imgErr ? (
            <img src={previewUrl} alt=""
              className="w-full h-full object-cover"
              onError={() => setImgErr(true)} />
          ) : (
            /* Sin imagen rota — placeholder informativo */
            <AssetUnavailablePlaceholder rawUrl={previewUrl ?? ""} compact />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[7px] font-black text-white/20 tabular-nums">#{pack.pageNumber}</span>
            {isRaw && !imgErr && <GitBranch className="w-2 h-2 text-blue-400/50" />}
            {(imgErr || !isRaw) && <Lock className="w-2 h-2 text-amber-400/30" />}
          </div>
          <p className="text-[9px] font-semibold text-white/70 truncate mb-1">{pack.pageTitle}</p>
          <div className="flex items-center gap-1 mb-1.5">
            {ASSET_ORDER.map(type => {
              const slot = pack.slots[type];
              return (
                <div key={type} title={`${ASSET_CFG[type].label}: ${STATUS_CFG[slot.status].label}`}
                  className={cn("w-2 h-2 rounded-full", STATUS_CFG[slot.status].dot)} />
              );
            })}
          </div>
          <div className="flex items-center gap-2 text-[7px] text-white/25">
            <span className={pct > 0 ? "text-blue-400/50" : "text-white/20"}>{realCount} vinculados</span>
            <div className="flex-1 h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
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
  const [syncing, setSyncing]               = useState(false);
  const [sourceMode, setSourceMode]         = useState<AssetSourceMode>("public_raw");
  const [showSourceConfig, setShowSourceConfig] = useState(false);

  /* Modal state */
  const [imageModal,   setImageModal]   = useState<{ url: string; title: string } | null>(null);
  const [contentModal, setContentModal] = useState<{ url: string; title: string; fileType: "md" | "json" } | null>(null);

  const packs       = state.outputPacks;
  const selectedPack = packs.find(p => p.pageId === selectedPageId);
  const batch10     = packs.slice(0, 10);

  /* Stats */
  const realPreviews = batch10.filter(p => !p.slots.preview.isDemo && p.slots.preview.status !== "pending").length;
  const realHtml     = batch10.filter(p => !p.slots.html.isDemo && p.slots.html.status !== "pending").length;
  const realPng      = batch10.filter(p => !p.slots.png.isDemo && p.slots.png.status !== "pending").length;
  const realQa       = batch10.filter(p => !p.slots.qa_report.isDemo && p.slots.qa_report.status !== "pending").length;
  const realPdf      = batch10.filter(p => !p.slots.pdf.isDemo && p.slots.pdf.status !== "pending").length;

  const STATS = [
    { label:"Páginas catálogo",  value:packs.length, max:packs.length, color:"text-white/60",   sub:"detectadas" },
    { label:"Previews",          value:realPreviews, max:10,           color:"text-violet-400", sub:"vinculados · preview.png" },
    { label:"HTML",              value:realHtml,     max:10,           color:"text-blue-400",   sub:"vinculados · page.html" },
    { label:"Upper-art/PNG",     value:realPng,      max:10,           color:"text-teal-400",   sub:"vinculados · upper-art.png" },
    { label:"QA Reports",        value:realQa,       max:10,           color:"text-sky-400",    sub:"vinculados · qa-report.md" },
    { label:"PDF print-ready",   value:realPdf,      max:10,           color:"text-amber-400",  sub:"pendiente exportación" },
  ];

  /* Acciones globales */
  function syncFromGithub() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast({ title:"Sincronización completada", description:`${GITHUB_REPO} · 10 páginas · URLs vinculadas correctamente` });
    }, 2000);
  }
  function openManifestModal() {
    setContentModal({ url: GITHUB_MANIFEST, title:"MANIFEST.json — cloudbooks-assets", fileType:"json" });
  }
  function openQaBatchModal() {
    setContentModal({ url: GITHUB_QA_BATCH_RAW, title:"qa_visual_batch_v23d_final_01_10.md", fileType:"md" });
  }
  function approveAllBatch() {
    batch10.forEach(p => {
      (["preview","html","png","qa_report"] as AssetType[]).forEach(t => {
        if (p.slots[t].status === "real_available") approveAsset(p.pageId, t);
      });
    });
    toast({ title:"Batch 01-10 aprobado", description:"Preview · HTML · Upper-art · QA Report aprobados" });
  }

  const handleUpload  = (pid: string, t: AssetType) => { uploadAssetDemo(pid, t); toast({ title:`${t} cargado`, description:`Pág. ${pid}` }); };
  const handleLink    = (pid: string, t: AssetType) => { linkAsset(pid, t, `/outputs/ai200-p${pid}/output.${t}`, `ai200-p${pid}-real.${t}`); toast({ title:"Asset vinculado", description:`Pág. ${pid}` }); };
  const handleApprove = (pid: string, t: AssetType) => { approveAsset(pid, t); toast({ title:"Asset aprobado", description:`Pág. ${pid} — ${t}` }); };
  const handleReplace = (pid: string, t: AssetType) => { replaceAssetRequest(pid, t); toast({ title:"Reemplazo solicitado", description:`Pág. ${pid}` }); };

  const openImageModal = useCallback((slot: OutputPack["slots"][AssetType], pageId: string) => {
    if (!slot.url) return;
    const imgUrl = slot.type === "html"
      ? getRawAssetUrl(`ai-200/visual-atlas/pages/${pageId}/preview.png`)
      : slot.url;
    setImageModal({ url: imgUrl, title:`${ASSET_CFG[slot.type].label} · Pág. ${pageId} · ${slot.filename ?? ""}` });
  }, []);

  const openContentModal = useCallback((slot: OutputPack["slots"][AssetType], pageId: string) => {
    if (!slot.url) return;
    const fileType = slot.filename?.endsWith(".json") ? "json" : "md";
    setContentModal({ url: slot.url, title:`${slot.filename ?? slot.type} · Pág. ${pageId}`, fileType });
  }, []);

  return (
    <Layout title="Assets y Outputs — Visual Atlas AI-200">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* Modals */}
        {imageModal && (
          <ImageModal url={imageModal.url} title={imageModal.title}
            onClose={() => setImageModal(null)}
            onConfigure={() => { setImageModal(null); setShowSourceConfig(true); }} />
        )}
        {contentModal && (
          <ContentModal url={contentModal.url} title={contentModal.title} fileType={contentModal.fileType}
            onClose={() => setContentModal(null)}
            onConfigure={() => { setContentModal(null); setShowSourceConfig(true); }} />
        )}

        {/* ── Dashboard header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 shrink-0">

          {/* ── Diagnóstico de acceso ── */}
          <div className={cn("mb-4 border rounded-sm overflow-hidden", showSourceConfig ? "border-amber-500/25" : "border-white/[0.08]")}>
            {/* Banner principal */}
            <div className="flex items-start gap-4 p-3 bg-amber-500/5">
              <div className="flex items-center gap-2 shrink-0">
                <Lock className="w-4 h-4 text-amber-400/70" />
                <div>
                  <p className="text-[8px] font-bold text-amber-400/80 uppercase tracking-widest">Diagnóstico de acceso a assets</p>
                  <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-bold text-blue-300/80 hover:text-blue-300 transition-colors flex items-center gap-1">
                    {GITHUB_REPO}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Tabla de estado */}
              <div className="flex-1 grid grid-cols-4 gap-2 text-[8px]">
                {[
                  { label:"Assets versionados en GitHub",  value:"✓ Confirmado",          color:"text-emerald-400/80" },
                  { label:"Raw browser access",            value:"⚠ Bloqueado — repo privado", color:"text-amber-400" },
                  { label:"Replit render access",          value:"→ Requiere sync o proxy", color:"text-white/35" },
                  { label:"PDF print-ready",               value:"Pendiente exportación",   color:"text-white/25" },
                ].map(r => (
                  <div key={r.label}>
                    <p className="text-white/20 mb-0.5">{r.label}</p>
                    <p className={cn("font-semibold", r.color)}>{r.value}</p>
                  </div>
                ))}
              </div>

              <button onClick={() => setShowSourceConfig(v => !v)}
                className={cn("flex items-center gap-1 h-7 px-2.5 border rounded-sm text-[8px] font-semibold transition-all shrink-0",
                  showSourceConfig
                    ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                    : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white/40"
                )}>
                <Settings className="w-3 h-3" />
                {showSourceConfig ? "Cerrar config" : "Configurar fuente"}
              </button>
            </div>

            {/* Panel de configuración de modos — expandible */}
            {showSourceConfig && (
              <div className="border-t border-amber-500/15 p-4 bg-[#0a1220]">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-3">
                  Modo de fuente de assets — seleccionar estrategia
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(Object.keys(SOURCE_MODE_CFG) as AssetSourceMode[]).map(mode => {
                    const cfg = SOURCE_MODE_CFG[mode];
                    const ModeIcon = cfg.icon;
                    const isActive = sourceMode === mode;
                    return (
                      <button key={mode} onClick={() => setSourceMode(mode)}
                        className={cn("p-3 border rounded-sm text-left transition-all",
                          isActive ? cn(cfg.bg, cfg.border) : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                        )}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <ModeIcon className={cn("w-3.5 h-3.5", isActive ? cfg.color : "text-white/30")} />
                          <span className={cn("text-[9px] font-bold", isActive ? cfg.color : "text-white/40")}>{cfg.label}</span>
                          {isActive && <CheckCircle2 className={cn("w-3 h-3 ml-auto", cfg.color)} />}
                        </div>
                        <p className="text-[7px] font-mono text-white/25 mb-1">{cfg.sublabel}</p>
                        <span className={cn("inline-block text-[7px] px-1.5 py-0.5 rounded-sm font-semibold",
                          cfg.status === "ok"      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" :
                          cfg.status === "warn"    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20" :
                          "bg-white/[0.04] text-white/25 border border-white/10"
                        )}>{cfg.statusLabel}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Instrucciones por modo */}
                <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-3 text-[9px] text-white/35 leading-relaxed space-y-1">
                  {sourceMode === "public_raw" && <>
                    <p><span className="text-amber-400 font-semibold">Raw GitHub (activo):</span> Requiere que el repositorio sea público. Los navegadores no pueden acceder a raw.githubusercontent.com con repos privados.</p>
                    <p><span className="text-white/50">Acción:</span> En GitHub → repositorio <code className="bg-white/[0.05] px-1 rounded text-teal-400">cloudbooks-assets</code> → Settings → Danger Zone → Make public.</p>
                    <p className="text-white/20">Si el repo contiene solo assets (no código sensible), esta es la opción más simple.</p>
                  </>}
                  {sourceMode === "replit_static" && <>
                    <p><span className="text-teal-400 font-semibold">Replit /public (recomendado):</span> Copiar los assets al directorio <code className="bg-white/[0.05] px-1 rounded text-teal-400">artifacts/studio/public/assets/cloudbooks/</code>.</p>
                    <p><span className="text-white/50">Pasos:</span> 1) Clonar el repo localmente. 2) Copiar la carpeta <code className="bg-white/[0.05] px-1 rounded text-blue-400">ai-200/visual-atlas/</code> a <code className="bg-white/[0.05] px-1 rounded text-teal-400">public/assets/cloudbooks/</code>. 3) Usar <code className="bg-white/[0.05] px-1 rounded text-violet-400">syncGithubAssetsToStatic()</code> para automatizar.</p>
                    <p className="text-white/20">Las URLs pasarían de <code className="text-white/30">raw.githubusercontent.com/…</code> a <code className="text-teal-400">/assets/cloudbooks/…</code></p>
                  </>}
                  {sourceMode === "private_proxy" && <>
                    <p><span className="text-violet-400 font-semibold">Proxy backend (planificado):</span> El servidor Express recupera el asset de GitHub con un token y lo sirve al browser.</p>
                    <p><span className="text-white/50">Pasos:</span> 1) Añadir <code className="bg-white/[0.05] px-1 rounded text-teal-400">GITHUB_TOKEN</code> a los secretos. 2) Implementar <code className="bg-white/[0.05] px-1 rounded text-violet-400">GET /api/assets/proxy?path=…</code>. 3) Reemplazar las URLs raw del Studio por <code className="bg-white/[0.05] px-1 rounded text-blue-400">/api/assets/proxy?path=…</code>.</p>
                    <p className="text-white/20">Ver conector <code className="text-white/30">serveAssetViaProxy</code> en la sección Conectores para la especificación completa.</p>
                  </>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setLocation("/conectores")}
                    className="flex items-center gap-1.5 text-[8px] text-blue-400/50 hover:text-blue-400 transition-colors">
                    <ChevronRight className="w-3 h-3" />Ver conectores de asset source
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Acciones globales */}
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-3.5 h-3.5 text-blue-400/60" />
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex-1">
              Estado de assets · Visual Atlas AI-200 · Batch 01–10
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={syncFromGithub} disabled={syncing}
                className="flex items-center gap-1 h-7 px-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[8px] text-blue-400 font-semibold transition-all disabled:opacity-50">
                <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                {syncing ? "…" : "Sincronizar"}
              </button>
              <button onClick={openManifestModal}
                className="flex items-center gap-1 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <BookOpen className="w-3 h-3" />MANIFEST
              </button>
              <button onClick={openQaBatchModal}
                className="flex items-center gap-1 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
                <Shield className="w-3 h-3" />QA Batch
              </button>
              <button onClick={approveAllBatch}
                className="flex items-center gap-1 h-7 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-sm text-[8px] text-emerald-400 font-semibold transition-all">
                <CheckCircle2 className="w-3 h-3" />Aprobar batch
              </button>
              <button onClick={() => setLocation("/conectores")}
                className="flex items-center gap-1.5 h-7 px-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all">
                <Zap className="w-3 h-3" />Conectores
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2.5">
                <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
                <p className="text-[8px] text-white/25 mt-0.5">{s.label}</p>
                <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
                  <div className={cn("h-full rounded-full",
                    s.color.replace("text-","bg-").replace("/400","/50").replace("/60","/30"))}
                    style={{ width:`${Math.round((s.value / s.max) * 100)}%` }} />
                </div>
                <p className="text-[7px] text-white/15 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: page list */}
          <aside className="w-64 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Páginas Visual Atlas</p>
              <div className="flex items-center gap-1 text-[7px] text-amber-400/50">
                <Lock className="w-2.5 h-2.5" />privado
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {packs.map(pack => (
                <PageAssetCard key={pack.pageId} pack={pack}
                  isSelected={selectedPageId === pack.pageId}
                  onClick={() => setSelectedPageId(pack.pageId)}
                  onClickPreview={() => {
                    const url = pack.slots.preview.url;
                    if (url) setImageModal({ url, title:`Preview · Pág. ${pack.pageId} · ${pack.pageTitle}` });
                  }}
                />
              ))}
            </div>
          </aside>

          {/* Right: pack detail */}
          <div className="flex-1 overflow-y-auto">
            {selectedPack ? (
              <div className="p-5 space-y-4 max-w-3xl">

                {/* Pack header */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-[#0078d4] to-blue-600" />
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-4">
                      {/* Preview thumbnail */}
                      <button onClick={() => {
                        const url = selectedPack.slots.preview.url;
                        if (url) setImageModal({ url, title:`Preview · Pág. ${selectedPack.pageId} · ${selectedPack.pageTitle}` });
                      }}
                        className="w-24 h-16 bg-[#0a1220] rounded-sm border border-white/[0.07] shrink-0 overflow-hidden cursor-pointer hover:border-amber-500/20 transition-all group">
                        {selectedPack.slots.preview.url ? (
                          <PreviewThumb url={selectedPack.slots.preview.url} title={selectedPack.pageTitle} />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-0.5">
                            <Lock className="w-3 h-3 text-amber-400/30" />
                            <span className="text-[5px] text-white/15">pendiente</span>
                          </div>
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-[#0078d4]/20 text-[#0078d4]/80 border border-[#0078d4]/25 px-1.5 py-0.5 rounded-sm">
                            ACR · #{selectedPack.pageNumber}
                          </span>
                          <span className="text-[8px] text-white/25">Contrato <span className="font-semibold text-white/50">{selectedPack.contractVersion}</span></span>
                          {parseInt(selectedPack.pageId, 10) <= 10 && (
                            <span className="inline-flex items-center gap-1 text-[7px] bg-amber-500/10 text-amber-400/80 border border-amber-500/20 px-1.5 py-0.5 rounded-sm font-bold">
                              <Lock className="w-2 h-2" />Repo privado
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-white/80 mb-2">{selectedPack.pageTitle}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ASSET_ORDER.map(type => {
                            const slot = selectedPack.slots[type];
                            const cfg  = ASSET_CFG[type];
                            return (
                              <div key={type} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-[7px] font-semibold", cfg.bg, cfg.borderColor, cfg.color)}>
                                <span className={cn("w-1 h-1 rounded-full", STATUS_CFG[slot.status].dot)} />
                                {cfg.label}
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
                          <a href={getGithubBlobUrl(`ai-200/visual-atlas/pages/${selectedPack.pageId}`)}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 h-7 px-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[9px] text-blue-400 transition-all">
                            <GitBranch className="w-3 h-3" />Ver en GitHub
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* GitHub paths panel */}
                {parseInt(selectedPack.pageId, 10) <= 10 && (
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="w-3 h-3 text-blue-400/60" />
                      <p className="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest">
                        Rutas GitHub · pages/{selectedPack.pageId}/
                      </p>
                      <span className="ml-auto flex items-center gap-1 text-[7px] text-amber-400/60">
                        <Lock className="w-2.5 h-2.5" />acceso directo bloqueado
                      </span>
                    </div>
                    <p className="text-[8px] text-white/20 mb-3">
                      Links abren en GitHub (requiere login). Los botones de Vista / Ver contenido muestran el estado de acceso raw.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        ["preview.png",   "Preview miniatura", "img"],
                        ["page.html",     "HTML visual",       "html"],
                        ["upper-art.png", "Arte superior PNG", "img"],
                        ["metadata.json", "Metadatos",         "json"],
                        ["qa-report.md",  "Reporte QA",        "md"],
                      ] as const).map(([file, desc, kind]) => {
                        const rawUrl  = getRawAssetUrl(`ai-200/visual-atlas/pages/${selectedPack.pageId}/${file}`);
                        const blobUrl = getGithubBlobUrl(`ai-200/visual-atlas/pages/${selectedPack.pageId}/${file}`);
                        return (
                          <div key={file}
                            className="group flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] hover:bg-blue-500/10 border border-white/[0.05] hover:border-blue-500/20 rounded-sm transition-all">
                            <SquareTerminal className="w-3 h-3 text-white/20 group-hover:text-blue-400 shrink-0 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-mono text-white/50 group-hover:text-blue-300 transition-colors">{file}</p>
                              <p className="text-[7px] text-white/20">{desc}</p>
                            </div>
                            {(kind === "img") && (
                              <button onClick={() => setImageModal({ url: rawUrl, title:`${file} · Pág. ${selectedPack.pageId}` })}
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-violet-500/20 border border-violet-500/25 rounded-sm text-[7px] text-violet-400 font-semibold transition-all">
                                Vista
                              </button>
                            )}
                            {(kind === "md" || kind === "json") && (
                              <button onClick={() => setContentModal({ url: rawUrl, title:`${file} · Pág. ${selectedPack.pageId}`, fileType: kind })}
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-sky-500/20 border border-sky-500/25 rounded-sm text-[7px] text-sky-400 font-semibold transition-all">
                                Ver
                              </button>
                            )}
                            {kind === "html" && (
                              <a href={rawUrl} target="_blank" rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-blue-500/20 border border-blue-500/25 rounded-sm text-[7px] text-blue-400 font-semibold transition-all">
                                raw
                              </a>
                            )}
                            <a href={blobUrl} target="_blank" rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 shrink-0">
                              <ExternalLink className="w-2.5 h-2.5 text-white/20 hover:text-blue-400 transition-colors" />
                            </a>
                          </div>
                        );
                      })}
                      <div className="group flex items-center gap-2 px-2.5 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 rounded-sm transition-all">
                        <Package className="w-3 h-3 text-emerald-400/40 group-hover:text-emerald-400 shrink-0 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-mono text-white/50 group-hover:text-emerald-300 transition-colors">visual-atlas-v24.md</p>
                          <p className="text-[7px] text-white/20">Contrato editorial</p>
                        </div>
                        <button onClick={() => setContentModal({ url: getRawAssetUrl("ai-200/visual-atlas/contracts/visual-atlas-v24.md"), title:"visual-atlas-v24.md", fileType:"md" })}
                          className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-emerald-500/20 border border-emerald-500/25 rounded-sm text-[7px] text-emerald-400 font-semibold transition-all">
                          Ver
                        </button>
                        <a href={getGithubBlobUrl("ai-200/visual-atlas/contracts/visual-atlas-v24.md")} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 shrink-0">
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-400/20 hover:text-emerald-400 transition-colors" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slot list */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06]">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Output Pack · slots de asset</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {ASSET_ORDER.map(type => (
                      <SlotRow key={type} slot={selectedPack.slots[type]}
                        onUpload={() => handleUpload(selectedPack.pageId, type)}
                        onLink={() => handleLink(selectedPack.pageId, type)}
                        onApprove={() => handleApprove(selectedPack.pageId, type)}
                        onReplace={() => handleReplace(selectedPack.pageId, type)}
                        onPreviewImage={() => openImageModal(selectedPack.slots[type], selectedPack.pageId)}
                        onViewContent={() => openContentModal(selectedPack.slots[type], selectedPack.pageId)}
                      />
                    ))}
                  </div>
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

/* ── Thumbnail con manejo graceful de error ──────────────────────────────── */
function PreviewThumb({ url, title }: { url: string; title: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-0.5">
        <Lock className="w-3 h-3 text-amber-400/30" />
        <span className="text-[5px] text-white/15 text-center px-1 leading-tight">Repo privado</span>
      </div>
    );
  }
  return (
    <img src={url} alt={title}
      className="w-full h-full object-cover"
      onError={() => setErr(true)} />
  );
}
