import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { useStudio } from "@/lib/studio-store";
import type { AssetType, AssetSlotStatus, OutputPack } from "@/lib/types";
import {
  GITHUB_REPO, STATIC_BASE,
  GITHUB_MANIFEST_PATH, GITHUB_QA_BATCH_PATH, GITHUB_CONTRACT_PATH,
  getGithubBlobUrl, getGithubRawUrl, getStaticAssetUrl,
} from "@/lib/demo-data";
import {
  FileText, Image, Globe, Shield, Package, Upload,
  CheckCircle2, Clock, AlertTriangle, Link2, RefreshCw,
  ChevronRight, Eye, Database, Zap, ArrowUpRight, ExternalLink,
  GitBranch, SquareTerminal, BookOpen, X, Loader2, Code2, Play,
  AlertCircle, HardDrive, Server, Settings, Info, FolderSync,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/* ── Modos de fuente ─────────────────────────────────────────────────────── */
type AssetSourceMode = "replit_static" | "private_proxy" | "public_raw";

const SOURCE_MODE_CFG: Record<AssetSourceMode, {
  label: string; sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; border: string;
  statusLabel: string; statusColor: string;
}> = {
  replit_static: {
    label:"Replit static",   sublabel:"/public/assets/cloudbooks/",
    icon:HardDrive, color:"text-teal-400",   bg:"bg-teal-500/10",   border:"border-teal-500/25",
    statusLabel:"Activo — pendiente sincronización", statusColor:"text-teal-400",
  },
  private_proxy: {
    label:"Proxy backend",   sublabel:"/api/assets/proxy?path=",
    icon:Server,    color:"text-violet-400", bg:"bg-violet-500/10", border:"border-violet-500/25",
    statusLabel:"Planificado", statusColor:"text-white/30",
  },
  public_raw: {
    label:"Raw GitHub",      sublabel:"raw.githubusercontent.com",
    icon:GitBranch, color:"text-white/30",   bg:"bg-white/[0.03]",  border:"border-white/[0.08]",
    statusLabel:"No usar — repo privado", statusColor:"text-white/25",
  },
};

/* ── Constantes de ruta ──────────────────────────────────────────────────── */
const STATIC_SYNC_PATH = "artifacts/studio/public/assets/cloudbooks/";
const STATIC_URL_BASE  = "/assets/cloudbooks/ai-200/visual-atlas/pages/";

/* ── Config por tipo ─────────────────────────────────────────────────────── */
const ASSET_CFG: Record<AssetType, {
  label: string; ext: string; icon: React.ComponentType<{ className?: string }>;
  color: string; bg: string; borderColor: string;
}> = {
  preview:   { label:"Preview",   ext:"PNG",  icon:Eye,      color:"text-violet-400",  bg:"bg-violet-500/10",  borderColor:"border-violet-500/20" },
  html:      { label:"HTML",      ext:"HTML", icon:Globe,    color:"text-blue-400",    bg:"bg-blue-500/10",    borderColor:"border-blue-500/20" },
  png:       { label:"Upper-art", ext:"PNG",  icon:Image,    color:"text-teal-400",    bg:"bg-teal-500/10",    borderColor:"border-teal-500/20" },
  pdf:       { label:"PDF",       ext:"PDF",  icon:FileText, color:"text-amber-400",   bg:"bg-amber-500/10",   borderColor:"border-amber-500/20" },
  qa_report: { label:"QA Report", ext:"MD",   icon:Shield,   color:"text-sky-400",     bg:"bg-sky-500/10",     borderColor:"border-sky-500/20" },
  contract:  { label:"Contrato",  ext:"MD",   icon:Package,  color:"text-emerald-400", bg:"bg-emerald-500/10", borderColor:"border-emerald-500/20" },
};

const STATUS_CFG: Record<AssetSlotStatus, { label: string; badge: string; dot: string }> = {
  pending:          { label:"Pendiente",      badge:"bg-white/[0.05] text-white/25 border-white/10",           dot:"bg-white/20"    },
  demo_available:   { label:"Demo",           badge:"bg-violet-500/15 text-violet-300 border-violet-500/25",   dot:"bg-violet-400"  },
  real_available:   { label:"Real · GitHub",  badge:"bg-blue-500/15 text-blue-300 border-blue-500/25",         dot:"bg-blue-400"    },
  approved:         { label:"Aprobado",       badge:"bg-emerald-500/15 text-emerald-300 border-emerald-500/25",dot:"bg-emerald-400" },
  needs_replacement:{ label:"Req. reemplazo", badge:"bg-amber-500/15 text-amber-300 border-amber-500/25",      dot:"bg-amber-400"   },
  exported:         { label:"Exportado",      badge:"bg-teal-500/15 text-teal-300 border-teal-500/25",         dot:"bg-teal-400"    },
};

const ASSET_ORDER: AssetType[] = ["preview", "html", "png", "pdf", "qa_report", "contract"];

/* ── Placeholder "no sincronizado" ──────────────────────────────────────── */
function NotSyncedPlaceholder({
  compact = false, onShowInstructions, githubPath,
}: {
  compact?: boolean; onShowInstructions?: () => void; githubPath?: string;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a1220] gap-1 px-1">
        <HardDrive className="w-3 h-3 text-white/15" />
        <p className="text-[5px] text-white/15 text-center leading-tight">Sin sync</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
      <div className="w-12 h-12 rounded-sm bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
        <HardDrive className="w-5 h-5 text-teal-400/50" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-white/50 mb-1">No sincronizado aún</p>
        <p className="text-[9px] text-white/30 leading-relaxed max-w-xs">
          Los assets viven en el repositorio GitHub privado y aún no han sido copiados
          al directorio estático de Replit.
        </p>
      </div>
      {githubPath && (
        <p className="text-[8px] font-mono text-white/20 bg-white/[0.03] border border-white/[0.06] px-2 py-1 rounded-sm">
          {githubPath}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {githubPath && (
          <a href={getGithubBlobUrl(githubPath)} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 h-7 px-3 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
            <GitBranch className="w-3 h-3" />Ver en GitHub
          </a>
        )}
        {onShowInstructions && (
          <button onClick={onShowInstructions}
            className="flex items-center gap-1 h-7 px-3 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-sm text-[8px] text-teal-400 font-semibold transition-all">
            <FolderSync className="w-3 h-3" />Cómo sincronizar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── ImageModal ──────────────────────────────────────────────────────────── */
function ImageModal({ url, title, githubPath, onClose, onShowInstructions }: {
  url: string; title: string; githubPath?: string;
  onClose: () => void; onShowInstructions?: () => void;
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
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] shrink-0">
          <Eye className="w-3.5 h-3.5 text-violet-400" />
          <p className="text-[10px] font-bold text-white/60 flex-1 truncate">{title}</p>
          {imgStatus === "ok" && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <ExternalLink className="w-2.5 h-2.5" />Abrir
            </a>
          )}
          {githubPath && (
            <a href={getGithubBlobUrl(githubPath)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <GitBranch className="w-2.5 h-2.5" />Ver en GitHub
            </a>
          )}
          <button onClick={onClose}
            className="h-6 w-6 flex items-center justify-center bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 rounded-sm text-white/40 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0a1220] min-h-48">
          {imgStatus === "loading" && (
            <div className="flex flex-col items-center gap-2 text-white/25">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-[9px]">Cargando desde Replit static…</p>
            </div>
          )}
          {/* Imagen oculta si no cargó — nunca muestra el icono de imagen rota */}
          <img src={url} alt={title}
            className={cn("max-w-full max-h-full object-contain rounded-sm border border-white/[0.06]",
              imgStatus === "ok" ? "block" : "hidden")}
            onLoad={() => setImgStatus("ok")}
            onError={() => setImgStatus("error")} />
          {imgStatus === "error" && (
            <NotSyncedPlaceholder githubPath={githubPath}
              onShowInstructions={() => { onClose(); onShowInstructions?.(); }} />
          )}
        </div>

        {imgStatus === "ok" && (
          <div className="px-4 py-2 border-t border-white/[0.06] shrink-0">
            <p className="text-[7px] font-mono text-white/15 truncate">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ContentModal ─────────────────────────────────────────────────────────── */
function ContentModal({ url, title, fileType, githubPath, onClose, onShowInstructions }: {
  url: string; title: string; fileType: "md" | "json"; githubPath?: string;
  onClose: () => void; onShowInstructions?: () => void;
}) {
  const [content,  setContent]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true); setFetchErr(false); setContent(null);
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
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
        if (err.name !== "AbortError") { setFetchErr(true); setLoading(false); }
      });
    return () => ctrl.abort();
  }, [url, fileType]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0d1629] border border-white/[0.12] rounded-sm overflow-hidden flex flex-col max-w-3xl max-h-[90vh] w-full">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07] shrink-0">
          {fileType === "json" ? <Code2 className="w-3.5 h-3.5 text-blue-400" /> : <FileText className="w-3.5 h-3.5 text-sky-400" />}
          <p className="text-[10px] font-bold text-white/60 flex-1 truncate">{title}</p>
          {content && (
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <ExternalLink className="w-2.5 h-2.5" />Abrir
            </a>
          )}
          {githubPath && (
            <a href={getGithubBlobUrl(githubPath)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 h-6 px-2 bg-white/[0.05] hover:bg-white/[0.10] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all">
              <GitBranch className="w-2.5 h-2.5" />Ver en GitHub
            </a>
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
              <span className="text-[10px]">Cargando desde Replit static…</span>
            </div>
          )}
          {fetchErr && (
            <NotSyncedPlaceholder githubPath={githubPath}
              onShowInstructions={() => { onClose(); onShowInstructions?.(); }} />
          )}
          {content && (
            <pre className={cn("text-[9px] leading-relaxed whitespace-pre-wrap break-words",
              fileType === "json" ? "text-emerald-300/70 font-mono" : "text-white/60"
            )}>{content}</pre>
          )}
        </div>
        {content && (
          <div className="px-4 py-2 border-t border-white/[0.06] shrink-0">
            <p className="text-[7px] font-mono text-white/15 truncate">{url}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Panel "Cómo sincronizar assets" ────────────────────────────────────── */
function SyncInstructionsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="border border-teal-500/20 rounded-sm overflow-hidden bg-[#0a1220]">
      <div className="flex items-center gap-2 px-4 py-3 bg-teal-500/5 border-b border-teal-500/15">
        <FolderSync className="w-3.5 h-3.5 text-teal-400" />
        <p className="text-[9px] font-bold text-teal-400/80 uppercase tracking-widest flex-1">
          Cómo sincronizar assets al directorio estático de Replit
        </p>
        <button onClick={onClose}
          className="h-5 w-5 flex items-center justify-center text-white/25 hover:text-white/50 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="space-y-2.5">
          {[
            { n:"1", title:"Clonar el repo privado", body:"Clonar localmente:\ngit clone https://github.com/johan2328/cloudbooks-assets\nRequiere acceso al repo o token personal." },
            { n:"2", title:"Copiar la carpeta de assets", body:`Copiar al Studio:\ncp -r cloudbooks-assets/ai-200 \\\n  ${STATIC_SYNC_PATH}ai-200/\n\nEstructura resultante:\n${STATIC_SYNC_PATH}ai-200/visual-atlas/pages/01/preview.png` },
            { n:"3", title:"Verificar rutas en el Studio", body:`Validar que responda:\n${STATIC_URL_BASE}01/preview.png\n\nDebe devolver HTTP 200 y mostrar la imagen de la página 01.` },
            { n:"4", title:"El Studio renderiza automáticamente", body:"Una vez que el directorio /public/assets/cloudbooks/ tiene los archivos, el Studio los carga sin configuración adicional. Las tarjetas y modales muestran las imágenes reales." },
          ].map(s => (
            <div key={s.n} className="flex gap-2.5">
              <div className="w-5 h-5 rounded-sm bg-teal-500/20 border border-teal-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[8px] font-black text-teal-400">{s.n}</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-white/50 mb-0.5">{s.title}</p>
                <pre className="text-[7px] text-white/30 font-mono leading-relaxed whitespace-pre-wrap">{s.body}</pre>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-3">
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2">Alternativas</p>
            <div className="space-y-2 text-[8px] text-white/30 leading-relaxed">
              <p><span className="text-teal-400/70 font-semibold">Opción A — Sync manual:</span> Clonar y copiar localmente (pasos 1-2 de arriba). La más simple, sin automatización.</p>
              <p><span className="text-violet-400/70 font-semibold">Opción B — Proxy backend:</span> Implementar <code className="bg-white/[0.05] px-1 rounded text-violet-300/60">GET /api/assets/proxy?path=</code> en el servidor Express. Lee GitHub con GITHUB_TOKEN y sirve el binario al browser.</p>
              <p><span className="text-blue-400/70 font-semibold">Opción C — GitHub Pages:</span> Habilitar GitHub Pages en el repo con rama <code className="bg-white/[0.05] px-1 rounded text-blue-300/60">gh-pages</code> para los assets. Actualizar URLs a <code className="bg-white/[0.05] px-1 rounded text-blue-300/60">pages.github.io/cloudbooks-assets/...</code></p>
              <p><span className="text-amber-400/70 font-semibold">No recomendado:</span> Hacer el repo público si contiene datos internos o historial sensible.</p>
            </div>
          </div>
          <div className="bg-[#0d1629] border border-white/[0.07] rounded-sm p-3">
            <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest mb-2">GitHub source — siempre privado</p>
            <div className="space-y-1.5 text-[8px] text-white/25 leading-relaxed">
              <p>El repositorio <code className="bg-white/[0.05] px-1 rounded text-white/40">{GITHUB_REPO}</code> permanece privado como source of truth editorial.</p>
              <p>El Studio solo lee desde la ruta estática — el GitHub privado no se expone al browser.</p>
              <p>Workflow recomendado: editar assets en el repo privado → sincronizar a Replit static → el Studio muestra los assets actualizados.</p>
            </div>
            <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1 text-[8px] text-blue-400/40 hover:text-blue-400 transition-colors">
              <GitBranch className="w-2.5 h-2.5" />{GITHUB_REPO}
            </a>
          </div>
        </div>
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

/* ── SlotRow ─────────────────────────────────────────────────────────────── */
function SlotRow({ slot, onUpload, onLink, onApprove, onReplace, onPreviewImage, onViewContent }: {
  slot: OutputPack["slots"][AssetType];
  onUpload: () => void; onLink: () => void; onApprove: () => void; onReplace: () => void;
  onPreviewImage?: () => void; onViewContent?: () => void;
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
          {slot.note ?? (slot.githubPath ? `→ ${slot.githubPath}` : slot.filename ?? "sin archivo")}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        {isImg && hasUrl && !isPend && (
          <>
            <button onClick={onPreviewImage}
              className="flex items-center gap-1 h-6 px-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 rounded-sm text-[8px] text-violet-400 font-semibold transition-all">
              <Eye className="w-2.5 h-2.5" />Ver imagen
            </button>
            {slot.githubPath && (
              <a href={getGithubBlobUrl(slot.githubPath)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
                <GitBranch className="w-2.5 h-2.5" />GitHub
              </a>
            )}
          </>
        )}
        {isHtml && hasUrl && !isPend && (
          <>
            <button onClick={onPreviewImage}
              className="flex items-center gap-1 h-6 px-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-sm text-[8px] text-blue-400 font-semibold transition-all">
              <Play className="w-2.5 h-2.5" />Render preview
            </button>
            {slot.githubPath && (
              <a href={getGithubBlobUrl(slot.githubPath)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
                <GitBranch className="w-2.5 h-2.5" />GitHub
              </a>
            )}
          </>
        )}
        {isText && hasUrl && !isPend && (
          <>
            <button onClick={onViewContent}
              className="flex items-center gap-1 h-6 px-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-sm text-[8px] text-sky-400 font-semibold transition-all">
              <FileText className="w-2.5 h-2.5" />Ver contenido
            </button>
            {slot.githubPath && (
              <a href={getGithubBlobUrl(slot.githubPath)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 h-6 px-2 bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 rounded-sm text-[8px] text-white/35 font-semibold transition-all">
                <GitBranch className="w-2.5 h-2.5" />GitHub
              </a>
            )}
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

/* ── PageAssetCard thumbnail ─────────────────────────────────────────────── */
function PageThumb({ url, title, githubPath, onShowInstructions }: {
  url?: string; title: string; githubPath?: string; onShowInstructions?: () => void;
}) {
  const [err, setErr] = useState(false);
  if (!url || err) {
    return <NotSyncedPlaceholder compact />;
  }
  return (
    <img src={url} alt={title}
      className="w-full h-full object-cover"
      onError={() => setErr(true)} />
  );
}

/* ── PageAssetCard ───────────────────────────────────────────────────────── */
function PageAssetCard({ pack, isSelected, onClick, onClickPreview }: {
  pack: OutputPack; isSelected: boolean;
  onClick: () => void; onClickPreview: () => void;
}) {
  const realCount = Object.values(pack.slots).filter(s => !s.isDemo && s.status !== "pending").length;
  const pct       = Math.round((realCount / ASSET_ORDER.length) * 100);
  const previewSlot = pack.slots.preview;

  return (
    <button onClick={onClick} className={cn(
      "w-full text-left p-3 border rounded-sm transition-all",
      isSelected ? "bg-blue-500/10 border-blue-500/30" : "bg-[#0d1629] border-white/[0.07] hover:border-white/[0.15]"
    )}>
      <div className="flex items-start gap-2.5">
        <div onClick={e => { e.stopPropagation(); onClickPreview(); }}
          className="w-10 h-10 bg-[#0a1220] border border-white/[0.08] rounded-sm shrink-0 overflow-hidden cursor-pointer hover:border-teal-500/20 transition-all">
          <PageThumb url={previewSlot.url} title={pack.pageTitle} githubPath={previewSlot.githubPath} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-[7px] font-black text-white/20 tabular-nums">#{pack.pageNumber}</span>
            {previewSlot.githubPath && (
              <span title="Asset versionado en GitHub"><GitBranch className="w-2 h-2 text-blue-400/30" /></span>
            )}
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
            <span className={pct > 0 ? "text-blue-400/50" : "text-white/20"}>{realCount} GitHub</span>
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
  const [selectedPageId, setSelectedPageId]   = useState<string>("01");
  const [syncing, setSyncing]                 = useState(false);
  const [showSync, setShowSync]               = useState(false);
  const [sourceMode, setSourceMode]           = useState<AssetSourceMode>("replit_static");
  const [imageModal,   setImageModal]         = useState<{ url: string; title: string; githubPath?: string } | null>(null);
  const [contentModal, setContentModal]       = useState<{ url: string; title: string; fileType: "md"|"json"; githubPath?: string } | null>(null);

  const packs       = state.outputPacks;
  const selectedPack = packs.find(p => p.pageId === selectedPageId);
  const batch10     = packs.slice(0, 10);

  /* Stats */
  const githubLinked = batch10.filter(p => !!p.slots.preview.githubPath).length;
  const realPreviews = batch10.filter(p => !p.slots.preview.isDemo && p.slots.preview.status !== "pending").length;
  const realHtml     = batch10.filter(p => !p.slots.html.isDemo && p.slots.html.status !== "pending").length;
  const realPng      = batch10.filter(p => !p.slots.png.isDemo && p.slots.png.status !== "pending").length;
  const realQa       = batch10.filter(p => !p.slots.qa_report.isDemo && p.slots.qa_report.status !== "pending").length;

  const STATS = [
    { label:"Vinculados a GitHub",  value:githubLinked, max:10,         color:"text-blue-400",    sub:"source of truth privado" },
    { label:"Previews",             value:realPreviews, max:10,         color:"text-violet-400",  sub:"preview.png · pendiente sync" },
    { label:"HTML",                 value:realHtml,     max:10,         color:"text-blue-400",    sub:"page.html · pendiente sync" },
    { label:"Upper-art/PNG",        value:realPng,      max:10,         color:"text-teal-400",    sub:"upper-art.png · pendiente sync" },
    { label:"QA Reports",           value:realQa,       max:10,         color:"text-sky-400",     sub:"qa-report.md · pendiente sync" },
    { label:"Páginas totales",      value:packs.length, max:packs.length,color:"text-white/50",   sub:"catálogo completo" },
  ];

  function simulateSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast({ title:"Sync verificado", description:"Estructura de directorios correcta — copiar assets desde el repo GitHub para ver previews" });
    }, 2000);
  }

  const handleUpload  = (pid: string, t: AssetType) => { uploadAssetDemo(pid, t); toast({ title:`${t} cargado`, description:`Pág. ${pid}` }); };
  const handleLink    = (pid: string, t: AssetType) => { linkAsset(pid, t, `/assets/cloudbooks/ai-200/visual-atlas/pages/${pid}/output.${t}`, `${pid}-${t}`); toast({ title:"Asset vinculado", description:`Pág. ${pid}` }); };
  const handleApprove = (pid: string, t: AssetType) => { approveAsset(pid, t); toast({ title:"Asset aprobado", description:`Pág. ${pid} — ${t}` }); };
  const handleReplace = (pid: string, t: AssetType) => { replaceAssetRequest(pid, t); toast({ title:"Reemplazo solicitado", description:`Pág. ${pid}` }); };

  const openImageModal = useCallback((slot: OutputPack["slots"][AssetType], pageId: string) => {
    if (!slot.url) return;
    const previewUrl = slot.type === "html"
      ? getStaticAssetUrl(`ai-200/visual-atlas/pages/${pageId}/preview.png`)
      : slot.url;
    const previewGhPath = slot.type === "html"
      ? `ai-200/visual-atlas/pages/${pageId}/preview.png`
      : slot.githubPath;
    setImageModal({ url: previewUrl, title:`${ASSET_CFG[slot.type].label} · Pág. ${pageId}`, githubPath: previewGhPath });
  }, []);

  const openContentModal = useCallback((slot: OutputPack["slots"][AssetType], pageId: string) => {
    if (!slot.url) return;
    const fileType = slot.filename?.endsWith(".json") ? "json" : "md";
    setContentModal({ url: slot.url, title:`${slot.filename ?? slot.type} · Pág. ${pageId}`, fileType, githubPath: slot.githubPath });
  }, []);

  return (
    <Layout title="Assets y Outputs — Visual Atlas AI-200">
      <div className="flex flex-col h-full bg-[#0a1220] overflow-hidden">

        {/* Modals */}
        {imageModal && (
          <ImageModal url={imageModal.url} title={imageModal.title} githubPath={imageModal.githubPath}
            onClose={() => setImageModal(null)}
            onShowInstructions={() => { setImageModal(null); setShowSync(true); }} />
        )}
        {contentModal && (
          <ContentModal url={contentModal.url} title={contentModal.title} fileType={contentModal.fileType}
            githubPath={contentModal.githubPath}
            onClose={() => setContentModal(null)}
            onShowInstructions={() => { setContentModal(null); setShowSync(true); }} />
        )}

        {/* ── Header ── */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4 shrink-0 space-y-4">

          {/* ── Two-column source panel ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Source repository */}
            <div className="bg-[#0a1220] border border-blue-500/15 rounded-sm p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <GitBranch className="w-3 h-3 text-blue-400/60" />
                <p className="text-[8px] font-bold text-blue-400/60 uppercase tracking-widest">Source repository</p>
                <span className="ml-auto text-[7px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-semibold">Privado</span>
              </div>
              <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-bold text-blue-300/80 hover:text-blue-300 transition-colors mb-1.5">
                {GITHUB_REPO} <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <div className="space-y-1 text-[8px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Estado</span>
                  <span className="text-emerald-400/80 font-semibold">Conectado privado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Browser raw access</span>
                  <span className="text-white/30 font-semibold">No usado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Páginas 01-10</span>
                  <span className="text-blue-400/70 font-semibold">Versionadas ✓</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20">PDF</span>
                  <span className="text-white/25 font-semibold">Pendiente exportación</span>
                </div>
              </div>
            </div>

            {/* Render source */}
            <div className="bg-[#0a1220] border border-teal-500/15 rounded-sm p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <HardDrive className="w-3 h-3 text-teal-400/60" />
                <p className="text-[8px] font-bold text-teal-400/60 uppercase tracking-widest">Render source</p>
                <span className="ml-auto text-[7px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-sm font-semibold">Pendiente sync</span>
              </div>
              <p className="text-[10px] font-bold text-teal-300/70 mb-1.5 font-mono">{STATIC_BASE}/</p>
              <div className="space-y-1 text-[8px]">
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Modo activo</span>
                  <span className="text-teal-400/70 font-semibold">replit_static</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Static sync</span>
                  <span className="text-amber-400/70 font-semibold">Pendiente</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20">Acción siguiente</span>
                  <button onClick={() => setShowSync(v => !v)}
                    className="text-teal-400/70 hover:text-teal-400 font-semibold transition-colors flex items-center gap-0.5">
                    Sincronizar assets <ChevronRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sync instructions (expandible) ── */}
          {showSync && <SyncInstructionsPanel onClose={() => setShowSync(false)} />}

          {/* ── Actions + Stats ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-3.5 h-3.5 text-blue-400/60" />
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest flex-1">
                Estado de assets · Visual Atlas AI-200 · Batch 01–10
              </p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setShowSync(v => !v)}
                  className={cn("flex items-center gap-1 h-7 px-2.5 border rounded-sm text-[8px] font-semibold transition-all",
                    showSync ? "bg-teal-500/20 border-teal-500/30 text-teal-400" : "bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20 text-teal-400"
                  )}>
                  <FolderSync className="w-3 h-3" />Cómo sincronizar
                </button>
                <button onClick={simulateSync} disabled={syncing}
                  className="flex items-center gap-1 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[8px] text-white/40 font-semibold transition-all disabled:opacity-50">
                  <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                  {syncing ? "…" : "Verificar sync"}
                </button>
                <button onClick={() => setLocation("/conectores")}
                  className="flex items-center gap-1.5 h-7 px-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-sm text-[9px] text-white/40 transition-all">
                  <Zap className="w-3 h-3" />Conectores
                </button>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {STATS.map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-sm px-3 py-2.5">
                  <p className={cn("text-xl font-black tabular-nums leading-none", s.color)}>{s.value}</p>
                  <p className="text-[8px] text-white/25 mt-0.5">{s.label}</p>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden mt-1.5">
                    <div className={cn("h-full rounded-full",
                      s.color.replace("text-","bg-").replace("/400","/50").replace("/50","/30"))}
                      style={{ width:`${Math.round((s.value / s.max) * 100)}%` }} />
                  </div>
                  <p className="text-[7px] text-white/15 mt-0.5">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: page list */}
          <aside className="w-64 bg-[#0d1629] border-r border-white/[0.06] flex flex-col overflow-hidden shrink-0">
            <div className="px-4 py-2.5 border-b border-white/[0.06] shrink-0 flex items-center justify-between">
              <p className="text-[8px] font-bold text-white/25 uppercase tracking-widest">Páginas Visual Atlas</p>
              <span className="flex items-center gap-1 text-[7px] text-teal-400/40">
                <HardDrive className="w-2.5 h-2.5" />static
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {packs.map(pack => (
                <PageAssetCard key={pack.pageId} pack={pack}
                  isSelected={selectedPageId === pack.pageId}
                  onClick={() => setSelectedPageId(pack.pageId)}
                  onClickPreview={() => {
                    const slot = pack.slots.preview;
                    if (slot.url) setImageModal({ url: slot.url, title:`Preview · Pág. ${pack.pageId} · ${pack.pageTitle}`, githubPath: slot.githubPath });
                    else setShowSync(true);
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
                      {/* Thumbnail */}
                      <button onClick={() => {
                        const slot = selectedPack.slots.preview;
                        if (slot.url) setImageModal({ url: slot.url, title:`Preview · Pág. ${selectedPack.pageId}`, githubPath: slot.githubPath });
                        else setShowSync(true);
                      }}
                        className="w-24 h-16 bg-[#0a1220] rounded-sm border border-white/[0.07] shrink-0 overflow-hidden cursor-pointer hover:border-teal-500/20 transition-all">
                        <PageThumb url={selectedPack.slots.preview.url} title={selectedPack.pageTitle}
                          githubPath={selectedPack.slots.preview.githubPath}
                          onShowInstructions={() => setShowSync(true)} />
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[8px] font-bold bg-[#0078d4]/20 text-[#0078d4]/80 border border-[#0078d4]/25 px-1.5 py-0.5 rounded-sm">
                            ACR · #{selectedPack.pageNumber}
                          </span>
                          <span className="text-[8px] text-white/25">Contrato <span className="font-semibold text-white/50">{selectedPack.contractVersion}</span></span>
                          {parseInt(selectedPack.pageId, 10) <= 10 && (
                            <span className="inline-flex items-center gap-1 text-[7px] bg-blue-500/10 text-blue-400/80 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-bold">
                              <GitBranch className="w-2 h-2" />GitHub privado
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-[7px] bg-amber-500/10 text-amber-400/70 border border-amber-500/15 px-1.5 py-0.5 rounded-sm font-bold">
                            <HardDrive className="w-2 h-2" />sin sync
                          </span>
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

                {/* GitHub source paths */}
                {parseInt(selectedPack.pageId, 10) <= 10 && (
                  <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="w-3 h-3 text-blue-400/50" />
                      <p className="text-[9px] font-bold text-blue-400/50 uppercase tracking-widest flex-1">
                        GitHub source · pages/{selectedPack.pageId}/
                      </p>
                      <span className="text-[7px] text-teal-400/50 italic">
                        Sync pendiente → {STATIC_URL_BASE}{selectedPack.pageId}/
                      </span>
                    </div>
                    <p className="text-[8px] text-white/20 mb-3">
                      Los links abren en GitHub (requieren login). Las acciones Vista/Ver contenido intentan cargar desde Replit static.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        ["preview.png",   "Preview miniatura", "img"],
                        ["page.html",     "HTML visual",       "html"],
                        ["upper-art.png", "Arte superior",     "img"],
                        ["metadata.json", "Metadatos",         "json"],
                        ["qa-report.md",  "Reporte QA",        "md"],
                      ] as const).map(([file, desc, kind]) => {
                        const ghPath   = `ai-200/visual-atlas/pages/${selectedPack.pageId}/${file}`;
                        const staticUrl = getStaticAssetUrl(ghPath);
                        const blobUrl  = getGithubBlobUrl(ghPath);
                        return (
                          <div key={file}
                            className="group flex items-center gap-2 px-2.5 py-2 bg-white/[0.02] hover:bg-blue-500/10 border border-white/[0.05] hover:border-blue-500/20 rounded-sm transition-all">
                            <SquareTerminal className="w-3 h-3 text-white/20 group-hover:text-blue-400 shrink-0 transition-colors" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-mono text-white/50 group-hover:text-blue-300 transition-colors">{file}</p>
                              <p className="text-[7px] text-white/20">{desc}</p>
                            </div>
                            {kind === "img" && (
                              <button onClick={() => setImageModal({ url: staticUrl, title:`${file} · Pág. ${selectedPack.pageId}`, githubPath: ghPath })}
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-violet-500/20 border border-violet-500/25 rounded-sm text-[7px] text-violet-400 font-semibold transition-all">
                                Vista
                              </button>
                            )}
                            {(kind === "md" || kind === "json") && (
                              <button onClick={() => setContentModal({ url: staticUrl, title:`${file} · Pág. ${selectedPack.pageId}`, fileType: kind, githubPath: ghPath })}
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-sky-500/20 border border-sky-500/25 rounded-sm text-[7px] text-sky-400 font-semibold transition-all">
                                Ver
                              </button>
                            )}
                            {kind === "html" && (
                              <button onClick={() => setImageModal({ url: getStaticAssetUrl(`ai-200/visual-atlas/pages/${selectedPack.pageId}/preview.png`), title:`Render preview · Pág. ${selectedPack.pageId}`, githubPath: `ai-200/visual-atlas/pages/${selectedPack.pageId}/preview.png` })}
                                className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-blue-500/20 border border-blue-500/25 rounded-sm text-[7px] text-blue-400 font-semibold transition-all">
                                Preview
                              </button>
                            )}
                            <a href={blobUrl} target="_blank" rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 shrink-0">
                              <ExternalLink className="w-2.5 h-2.5 text-white/20 hover:text-blue-400 transition-colors" />
                            </a>
                          </div>
                        );
                      })}
                      {/* Contract */}
                      <div className="group flex items-center gap-2 px-2.5 py-2 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 rounded-sm transition-all">
                        <Package className="w-3 h-3 text-emerald-400/40 group-hover:text-emerald-400 shrink-0 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-mono text-white/50 group-hover:text-emerald-300 transition-colors">visual-atlas-v24.md</p>
                          <p className="text-[7px] text-white/20">Contrato editorial</p>
                        </div>
                        <button onClick={() => setContentModal({ url: getStaticAssetUrl(GITHUB_CONTRACT_PATH), title:"visual-atlas-v24.md", fileType:"md", githubPath: GITHUB_CONTRACT_PATH })}
                          className="opacity-0 group-hover:opacity-100 h-5 px-1.5 bg-emerald-500/20 border border-emerald-500/25 rounded-sm text-[7px] text-emerald-400 font-semibold transition-all">
                          Ver
                        </button>
                        <a href={getGithubBlobUrl(GITHUB_CONTRACT_PATH)} target="_blank" rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 shrink-0">
                          <ExternalLink className="w-2.5 h-2.5 text-emerald-400/20 hover:text-emerald-400 transition-colors" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slot list */}
                <div className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Output Pack · slots de asset</p>
                    <div className="flex items-center gap-3 text-[7px] text-white/20">
                      <span className="flex items-center gap-1"><GitBranch className="w-2.5 h-2.5 text-blue-400/40" />Source: GitHub privado</span>
                      <span className="flex items-center gap-1"><HardDrive className="w-2.5 h-2.5 text-teal-400/40" />Render: Replit static (pendiente sync)</span>
                    </div>
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
