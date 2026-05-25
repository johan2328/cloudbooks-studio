import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import {
  FlaskConical, Zap, Shield, Download, Package,
  CheckCircle2, Clock, AlertCircle, ExternalLink, Code2, Database, Cpu,
} from "lucide-react";

interface Connector {
  id: string;
  name: string;
  signature: string;
  description: string;
  category: "grounding" | "generation" | "qa" | "export" | "storage";
  status: "ready" | "partial" | "planned";
  inputs: { name: string; type: string; required: boolean }[];
  outputs: { name: string; type: string }[];
  notes: string;
  model?: string;
  mockAvailable: boolean;
}

const CONNECTORS: Connector[] = [
  {
    id: "runGrounding",
    name: "runGrounding",
    signature: "runGrounding(pageId: string): Promise<GroundingResult>",
    description: "Verifica y consolida las fuentes de contenido para una página. Consulta Microsoft Learn, Azure docs y la arquitectura de referencia. Actualiza ContentSource[] y GroundingStatus.",
    category: "grounding",
    status: "partial",
    inputs: [
      { name: "pageId", type: "string", required: true },
    ],
    outputs: [
      { name: "groundingStatus", type: "'verified' | 'partial' | 'unverified'" },
      { name: "sources", type: "ContentSource[]" },
      { name: "groundingNote", type: "string" },
    ],
    notes: "Implementación parcial: la verificación de fuentes se hace manualmente. Automatización requiere integración con MS Learn API o web scraping aprobado.",
    mockAvailable: true,
  },
  {
    id: "generateVisualAtlasPage",
    name: "generateVisualAtlasPage",
    signature: "generateVisualAtlasPage(pageId: string, model?: string): Promise<GenerationRun>",
    description: "Genera el layout visual y contenido de una infografía usando GPT-4o. Aplica el Contrato Visual activo como system prompt. Devuelve un GenerationRun con el resultado y tokens consumidos.",
    category: "generation",
    status: "ready",
    model: "GPT-4o / GPT-4o-mini",
    inputs: [
      { name: "pageId", type: "string", required: true },
      { name: "model", type: "'gpt-4o' | 'gpt-4o-mini'", required: false },
    ],
    outputs: [
      { name: "run", type: "GenerationRun" },
      { name: "version", type: "string" },
      { name: "promptTokens", type: "number" },
      { name: "completionTokens", type: "number" },
    ],
    notes: "El conector está implementado en el servidor (routes/generation.ts). Requiere OPENAI_API_KEY en el entorno. Sin API key corre en modo demo con datos simulados.",
    mockAvailable: true,
  },
  {
    id: "runQA",
    name: "runQA",
    signature: "runQA(pageId: string): Promise<QAReport>",
    description: "Ejecuta el pipeline de QA sobre una página generada. Evalúa 6 dimensiones: dirección de arte, consistencia editorial, legibilidad, precisión técnica, densidad y riesgo comercial.",
    category: "qa",
    status: "partial",
    model: "GPT-4o (evaluador)",
    inputs: [
      { name: "pageId", type: "string", required: true },
    ],
    outputs: [
      { name: "report", type: "QAReport" },
      { name: "verdict", type: "'approved' | 'needs_revision'" },
      { name: "dimensions", type: "QADimensions" },
      { name: "defectsFound", type: "string[]" },
    ],
    notes: "El evaluador automático usa GPT-4o como red team. La aprobación final siempre requiere revisión humana. Score mínimo para pasar: 95/100 según Contrato Visual v24.",
    mockAvailable: true,
  },
  {
    id: "exportPage",
    name: "exportPage",
    signature: "exportPage(pageId: string, format: 'HTML' | 'PNG' | 'PDF'): Promise<ExportAsset>",
    description: "Exporta una página aprobada en el formato solicitado. Genera el asset desde el layout interno y lo almacena en object storage. Solo páginas con status 'approved' o 'exported' pueden ser exportadas.",
    category: "export",
    status: "planned",
    inputs: [
      { name: "pageId", type: "string", required: true },
      { name: "format", type: "'HTML' | 'PNG' | 'PDF'", required: true },
    ],
    outputs: [
      { name: "asset", type: "ExportAsset" },
      { name: "url", type: "string" },
      { name: "filename", type: "string" },
    ],
    notes: "Requiere implementación del renderer de infografías (React → HTML → PNG/PDF via Puppeteer o similar). Almacenamiento en Replit Object Storage.",
    mockAvailable: true,
  },
  {
    id: "exportCollection",
    name: "exportCollection",
    signature: "exportCollection(certificationId: string, format?: 'BOOK_PACK' | 'PDF'): Promise<ExportAsset[]>",
    description: "Exporta todas las páginas aprobadas de una certificación como colección completa. Genera un Book Pack ZIP con HTML, PNG y PDF organizados por batch.",
    category: "export",
    status: "planned",
    inputs: [
      { name: "certificationId", type: "string", required: true },
      { name: "format", type: "'BOOK_PACK' | 'PDF'", required: false },
    ],
    outputs: [
      { name: "assets", type: "ExportAsset[]" },
      { name: "archiveUrl", type: "string" },
      { name: "pageCount", type: "number" },
    ],
    notes: "Requiere que todas las páginas del batch estén aprobadas. Genera índice automático y tabla de contenidos. Tiempo estimado de exportación: 2-5 minutos para 61 páginas.",
    mockAvailable: false,
  },
  {
    id: "syncToProductionDB",
    name: "syncToProductionDB",
    signature: "syncToProductionDB(): Promise<SyncResult>",
    description: "Sincroniza el estado local del studio con la base de datos PostgreSQL de producción. Incluye páginas, runs, QA reports y logs de actividad.",
    category: "storage",
    status: "ready",
    inputs: [],
    outputs: [
      { name: "synced", type: "number" },
      { name: "errors", type: "string[]" },
    ],
    notes: "La API REST ya está operativa (api-server). El studio actualmente opera en modo local con localStorage. Conectar reemplazando el StudioProvider con llamadas a la API.",
    mockAvailable: false,
  },
  /* ── Asset / Output pipeline ───────────────────────────────────────────── */
  {
    id: "uploadOutputAsset",
    name: "uploadOutputAsset",
    signature: "uploadOutputAsset(pageId: string, assetType: AssetType, file: File): Promise<AssetSlot>",
    description: "Carga un archivo de output real (HTML, PNG o PDF) para un slot específico de una página. Valida el tipo MIME contra el assetType declarado. Almacena en object storage y actualiza el OutputPack de la página.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "pageId",    type: "string",    required: true  },
      { name: "assetType", type: "AssetType", required: true  },
      { name: "file",      type: "File",      required: true  },
    ],
    outputs: [
      { name: "slot",      type: "AssetSlot" },
      { name: "url",       type: "string"    },
      { name: "sizeKb",    type: "number"    },
    ],
    notes: "Implementación futura: Replit Object Storage o S3-compatible. El stub actual simula la carga con cambio de estado local. Validación MIME: html→text/html, png→image/png, pdf→application/pdf.",
    mockAvailable: true,
  },
  {
    id: "linkGeneratedHtml",
    name: "linkGeneratedHtml",
    signature: "linkGeneratedHtml(pageId: string, pathOrUrl: string): Promise<AssetSlot>",
    description: "Vincula un archivo HTML generado externamente (por el pipeline local o remoto) al slot HTML de una página. Acepta rutas locales del filesystem o URLs remotas.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "pageId",    type: "string", required: true },
      { name: "pathOrUrl", type: "string", required: true },
    ],
    outputs: [
      { name: "slot",     type: "AssetSlot" },
      { name: "verified", type: "boolean"   },
    ],
    notes: "Útil cuando el pipeline de generación produce el HTML en el filesystem local antes de subirlo a producción. Valida que la ruta o URL sea accesible antes de registrar el vínculo.",
    mockAvailable: true,
  },
  {
    id: "linkGeneratedPng",
    name: "linkGeneratedPng",
    signature: "linkGeneratedPng(pageId: string, pathOrUrl: string): Promise<AssetSlot>",
    description: "Vincula un archivo PNG generado externamente al slot PNG de una página. Acepta rutas locales (ej. /outputs/ai200-p01/page.png) o URLs remotas.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "pageId",    type: "string", required: true },
      { name: "pathOrUrl", type: "string", required: true },
    ],
    outputs: [
      { name: "slot",     type: "AssetSlot" },
      { name: "verified", type: "boolean"   },
    ],
    notes: "Espera PNG de alta resolución (mínimo 2480×3508 px, 300 DPI). Si el archivo no cumple los requisitos de resolución, el conector lo registra con advertencia pero no bloquea la vinculación.",
    mockAvailable: true,
  },
  {
    id: "linkGeneratedPdf",
    name: "linkGeneratedPdf",
    signature: "linkGeneratedPdf(pageId: string, pathOrUrl: string): Promise<AssetSlot>",
    description: "Vincula un archivo PDF generado externamente al slot PDF de una página. Acepta rutas locales o URLs remotas. El PDF debe ser vectorial y tener metadata editorial.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "pageId",    type: "string", required: true },
      { name: "pathOrUrl", type: "string", required: true },
    ],
    outputs: [
      { name: "slot",     type: "AssetSlot" },
      { name: "verified", type: "boolean"   },
    ],
    notes: "Valida que el PDF no sea rasterizado. El slot quedará en status 'real_available' hasta que un editor lo apruebe explícitamente desde el panel de Assets.",
    mockAvailable: true,
  },
  {
    id: "syncLocalBatchOutputs",
    name: "syncLocalBatchOutputs",
    signature: "syncLocalBatchOutputs(batchId: string): Promise<SyncBatchResult>",
    description: "Escanea un directorio local de outputs estructurado por batch e infiere qué assets existen para cada página. Actualiza en masa los OutputPacks del batch especificado sin requerir vinculación manual página por página.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "batchId", type: "string", required: true },
    ],
    outputs: [
      { name: "updated",  type: "number"   },
      { name: "skipped",  type: "number"   },
      { name: "errors",   type: "string[]" },
      { name: "manifest", type: "SyncManifest" },
    ],
    notes: "Convención de directorio esperada: /outputs/{batchId}/p{pageNumber}/{html|png|pdf}/. Ej: /outputs/Batch 01/p01/html/page.html. Si la estructura no coincide, los archivos se ignoran y se reportan en errors[].",
    mockAvailable: false,
  },
  {
    id: "publishApprovedAssets",
    name: "publishApprovedAssets",
    signature: "publishApprovedAssets(collectionId: string): Promise<PublishResult>",
    description: "Publica todos los assets con status 'approved' de una colección hacia el destino de distribución configurado (CDN, LMS, S3). Solo procesa slots en estado 'approved' — slots pendientes o demo se omiten.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "collectionId", type: "string", required: true },
    ],
    outputs: [
      { name: "published",    type: "number"       },
      { name: "omitted",      type: "number"       },
      { name: "urls",         type: "string[]"     },
      { name: "publishedAt",  type: "string"       },
    ],
    notes: "Requiere configuración del destino de distribución en variables de entorno (PUBLISH_DESTINATION, PUBLISH_TOKEN). La publicación es idempotente — re-publicar un asset ya publicado actualiza la versión sin duplicar.",
    mockAvailable: false,
  },
  /* ── Asset source — acceso a GitHub privado ────────────────────────────── */
  {
    id: "syncGithubAssetsToStatic",
    name: "syncGithubAssetsToStatic",
    signature: "syncGithubAssetsToStatic(batchId: string, token: string): Promise<SyncStaticResult>",
    description: "Descarga los assets del repositorio privado de GitHub (cloudbooks-assets) usando un token de acceso personal y los copia al directorio /public/assets/cloudbooks del Studio. Después del sync, el Studio sirve las imágenes y archivos desde Replit sin depender de raw.githubusercontent.com.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "batchId", type: "string", required: true  },
      { name: "token",   type: "string", required: true  },
    ],
    outputs: [
      { name: "copied",    type: "number"       },
      { name: "skipped",   type: "number"       },
      { name: "basePath",  type: "string"       },
      { name: "manifest",  type: "SyncManifest" },
    ],
    notes: "Solución recomendada para repositorios privados: copiar assets una vez al entorno de Replit. Después del sync, actualizar las URLs de los slots para apuntar a /assets/cloudbooks/{page}/... en lugar de raw.githubusercontent.com. Requiere GITHUB_TOKEN en secretos del entorno. Alternativa más simple: hacer el repo público (solo assets, no código sensible).",
    mockAvailable: false,
  },
  {
    id: "fetchPrivateGithubAsset",
    name: "fetchPrivateGithubAsset",
    signature: "fetchPrivateGithubAsset(path: string, token: string): Promise<AssetBuffer>",
    description: "Descarga un asset individual del repositorio privado de GitHub usando la API REST de GitHub (no raw URL). Útil para acceso puntual a un archivo sin necesidad de sincronización completa. Devuelve el buffer del archivo y sus metadatos.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "path",  type: "string", required: true },
      { name: "token", type: "string", required: true },
    ],
    outputs: [
      { name: "buffer",      type: "Buffer"  },
      { name: "contentType", type: "string"  },
      { name: "sizeKb",      type: "number"  },
      { name: "sha",         type: "string"  },
    ],
    notes: "Usa el endpoint GET /repos/{owner}/{repo}/contents/{path} de la API de GitHub con el header Authorization: Bearer {token}. El contenido se devuelve codificado en base64 y debe decodificarse. Límite de la API: 100MB por archivo. Para imágenes y markdown del Visual Atlas el límite no es un problema.",
    mockAvailable: false,
  },
  {
    id: "serveAssetViaProxy",
    name: "serveAssetViaProxy",
    signature: "serveAssetViaProxy(path: string): Promise<Response>",
    description: "Endpoint del servidor Express (GET /api/assets/proxy?path=...) que recupera el asset desde GitHub usando el token del servidor y lo sirve al browser del Studio. Permite que el frontend consuma assets de repos privados sin exponer el token. Cachea el resultado en memoria por 10 minutos.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "path", type: "string", required: true },
    ],
    outputs: [
      { name: "stream",      type: "ReadableStream" },
      { name: "contentType", type: "string"         },
      { name: "cacheHit",    type: "boolean"        },
    ],
    notes: "Implementar en artifacts/api-server/src/routes/assets.ts. El browser llama a /api/assets/proxy?path=ai-200/visual-atlas/pages/01/preview.png y el servidor hace el fetch autenticado a la API de GitHub y devuelve el binario. Reemplazar las raw URLs del Studio por /api/assets/proxy?path=... una vez implementado.",
    mockAvailable: false,
  },
  {
    id: "validateAssetUrl",
    name: "validateAssetUrl",
    signature: "validateAssetUrl(url: string, mode: AssetSourceMode): Promise<ValidationResult>",
    description: "Valida si una URL de asset es accesible desde el entorno actual según el modo de fuente configurado. Para public_raw verifica que raw.githubusercontent.com devuelva 200. Para replit_static verifica que el archivo exista en /public/assets/cloudbooks. Para private_proxy verifica que el endpoint /api/assets/proxy responda correctamente.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "url",  type: "string",          required: true },
      { name: "mode", type: "AssetSourceMode", required: true },
    ],
    outputs: [
      { name: "accessible",  type: "boolean"  },
      { name: "statusCode",  type: "number"   },
      { name: "latencyMs",   type: "number"   },
      { name: "suggestion",  type: "string"   },
    ],
    notes: "AssetSourceMode: 'public_raw' | 'replit_static' | 'private_proxy'. Correr este conector en el diagnóstico de acceso del panel Assets y Outputs para detectar automáticamente qué modo funciona en el entorno actual. Útil en el onboarding del equipo para verificar configuración sin salir del Studio.",
    mockAvailable: true,
  },
  /* ── Asset source — replit_static mode ───────────────────────────────── */
  {
    id: "syncFromPrivateGithubToStatic",
    name: "syncFromPrivateGithubToStatic",
    signature: "syncFromPrivateGithubToStatic(collectionId: string, githubToken: string): Promise<SyncStaticResult>",
    description: "Descarga los assets del repositorio privado cloudbooks-assets usando la API autenticada de GitHub y los copia al directorio estático del Studio (artifacts/studio/public/assets/cloudbooks/). Después del sync, el Studio sirve previews e imágenes sin depender de raw.githubusercontent.com ni exponer el token al browser. Equivale al comando: cp -r cloudbooks-assets/ai-200 studio/public/assets/cloudbooks/ai-200/",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "collectionId", type: "string", required: true },
      { name: "githubToken",  type: "string", required: true },
    ],
    outputs: [
      { name: "copied",      type: "number"       },
      { name: "skipped",     type: "number"       },
      { name: "staticBase",  type: "string"       },
      { name: "manifest",    type: "SyncManifest" },
    ],
    notes: "Requiere GITHUB_TOKEN en secretos del entorno. La ruta de destino es artifacts/studio/public/assets/cloudbooks/ que Vite sirve en /assets/cloudbooks/. Las URLs de los slots cambian automáticamente a /assets/cloudbooks/... después del sync. GitHub privado permanece como source of truth editorial.",
    mockAvailable: false,
  },
  {
    id: "validateStaticAsset",
    name: "validateStaticAsset",
    signature: "validateStaticAsset(path: string): Promise<StaticAssetValidation>",
    description: "Verifica si un asset ya existe en el directorio estático de Replit y si la URL correspondiente responde con HTTP 200. Útil para diagnosticar qué páginas están sincronizadas y cuáles aún no. Puede correrse sobre un batch completo para generar un reporte de estado.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "path", type: "string", required: true },
    ],
    outputs: [
      { name: "exists",      type: "boolean" },
      { name: "url",         type: "string"  },
      { name: "statusCode",  type: "number"  },
      { name: "sizeKb",      type: "number"  },
    ],
    notes: "Ejemplo: validateStaticAsset('ai-200/visual-atlas/pages/01/preview.png') comprueba /assets/cloudbooks/ai-200/visual-atlas/pages/01/preview.png. El Studio muestra 'No sincronizado aún' si este conector devuelve exists: false. Correr este conector para todos los slots de un pack antes de renderizar para cachear el estado de sync.",
    mockAvailable: true,
  },
  {
    id: "listStaticAssets",
    name: "listStaticAssets",
    signature: "listStaticAssets(collectionId: string): Promise<StaticAssetInventory>",
    description: "Genera un inventario completo de los assets estáticos disponibles para una colección. Escanea el directorio artifacts/studio/public/assets/cloudbooks/ e identifica qué páginas tienen sus assets sincronizados, cuáles están parcialmente sincronizadas y cuáles no tienen ningún asset.",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "collectionId", type: "string", required: true },
    ],
    outputs: [
      { name: "total",       type: "number"                 },
      { name: "synced",      type: "number"                 },
      { name: "partial",     type: "number"                 },
      { name: "missing",     type: "number"                 },
      { name: "inventory",   type: "PageAssetInventory[]"   },
    ],
    notes: "Usar antes de syncFromPrivateGithubToStatic para saber qué páginas ya tienen assets y no necesitan re-sincronización. También útil para el dashboard del Studio para mostrar el estado real de sync en lugar del estado calculado.",
    mockAvailable: true,
  },
  {
    id: "switchAssetSource",
    name: "switchAssetSource",
    signature: "switchAssetSource(mode: AssetSourceMode): Promise<void>",
    description: "Cambia el modo de fuente de assets del Studio en runtime. Actualiza la configuración activa para que todas las URLs de render se recalculen según el nuevo modo. 'replit_static' usa /assets/cloudbooks/, 'private_proxy' usa /api/assets/proxy?path=, 'public_raw' usa raw.githubusercontent.com (no recomendado para repos privados).",
    category: "storage",
    status: "planned",
    inputs: [
      { name: "mode", type: "AssetSourceMode", required: true },
    ],
    outputs: [
      { name: "previous", type: "AssetSourceMode" },
      { name: "current",  type: "AssetSourceMode" },
    ],
    notes: "AssetSourceMode: 'replit_static' (activo por defecto) | 'private_proxy' (planificado) | 'public_raw' (no usar con repos privados). El cambio persiste en localStorage y se aplica a todos los slots del Studio hasta que se cambie de nuevo. El Studio actual tiene el modo como estado de componente — migrar a studio-store para persistencia.",
    mockAvailable: true,
  },
];

const CATEGORY_CFG = {
  grounding:   { label: "Grounding", color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20",   icon: FlaskConical },
  generation:  { label: "Generación", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", icon: Cpu },
  qa:          { label: "QA",        color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   icon: Shield },
  export:      { label: "Exportación", color: "text-teal-400",  bg: "bg-teal-500/10 border-teal-500/20",   icon: Download },
  storage:     { label: "Almacenamiento", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Database },
};

const STATUS_CFG = {
  ready:   { label: "Implementado", icon: CheckCircle2, color: "text-emerald-400" },
  partial: { label: "Parcial",      icon: AlertCircle,  color: "text-amber-400" },
  planned: { label: "Planificado",  icon: Clock,        color: "text-white/30" },
};

export default function Conectores() {
  return (
    <Layout title="Conectores del pipeline">
      <div className="h-full overflow-y-auto bg-[#0a1220]">
        {/* Header */}
        <div className="bg-[#0d1629] border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-2 mb-0.5">
            <Code2 className="w-4 h-4 text-teal-400" />
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Pipeline — Preparado para integración</span>
          </div>
          <h1 className="text-sm font-black text-white">Conectores del pipeline</h1>
          <p className="text-[10px] text-white/25 mt-0.5">
            Interfaces definidas para integración futura con OpenAI y servicios de exportación. Sin llamadas reales a API todavía.
          </p>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-px bg-white/[0.04] border-b border-white/[0.04]">
          {[
            { label: "Implementados", value: CONNECTORS.filter(c => c.status === "ready").length, color: "text-emerald-400" },
            { label: "Parciales", value: CONNECTORS.filter(c => c.status === "partial").length, color: "text-amber-400" },
            { label: "Planificados", value: CONNECTORS.filter(c => c.status === "planned").length, color: "text-white/30" },
          ].map(s => (
            <div key={s.label} className="bg-[#0d1629] px-5 py-3">
              <p className={cn("text-xl font-black tabular-nums", s.color)}>{s.value}</p>
              <p className="text-[9px] text-white/25 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Connectors list */}
        <div className="p-6 space-y-4 max-w-4xl">
          <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-amber-400 mb-0.5">Modo demo activo — sin llamadas reales a OpenAI</p>
              <p className="text-[9px] text-white/30 leading-relaxed">
                Los conectores con "Simulación disponible" funcionan con datos demo en el studio actual. Para activar integración real: añadir <code className="bg-white/[0.05] px-1 rounded text-teal-400">OPENAI_API_KEY</code> en los secretos del entorno.
              </p>
            </div>
          </div>

          {CONNECTORS.map(connector => {
            const cat = CATEGORY_CFG[connector.category];
            const statusCfg = STATUS_CFG[connector.status];
            const StatusIcon = statusCfg.icon;
            const CatIcon = cat.icon;
            return (
              <div key={connector.id} className="bg-[#0d1629] border border-white/[0.08] rounded-sm overflow-hidden"
                data-testid={`connector-${connector.id}`}>
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-start gap-4">
                  <div className={cn("w-8 h-8 rounded-sm flex items-center justify-center shrink-0 border", cat.bg)}>
                    <CatIcon className={cn("w-3.5 h-3.5", cat.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <code className="text-sm font-bold text-white font-mono">{connector.name}</code>
                      <span className={cn("text-[9px] px-1.5 py-0.5 rounded-sm font-semibold border", cat.bg, cat.color)}>{cat.label}</span>
                      <span className={cn("flex items-center gap-1 text-[9px] font-semibold", statusCfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                      {connector.mockAvailable && (
                        <span className="text-[9px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-sm font-semibold">
                          Simulación disponible
                        </span>
                      )}
                    </div>
                    <code className="text-[9px] text-teal-300/60 font-mono leading-relaxed block">
                      {connector.signature}
                    </code>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 py-4 grid grid-cols-3 gap-5">
                  {/* Description */}
                  <div className="col-span-3">
                    <p className="text-[10px] text-white/50 leading-relaxed">{connector.description}</p>
                  </div>

                  {/* Inputs */}
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Parámetros de entrada</p>
                    {connector.inputs.length === 0 ? (
                      <p className="text-[9px] text-white/20">Sin parámetros</p>
                    ) : (
                      <div className="space-y-1">
                        {connector.inputs.map(inp => (
                          <div key={inp.name} className="flex items-baseline gap-2">
                            <code className="text-[9px] text-blue-300/70 font-mono">{inp.name}</code>
                            <code className="text-[8px] text-white/20 font-mono">{inp.type}</code>
                            {inp.required && <span className="text-[7px] text-red-400/60">req.</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outputs */}
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Salida</p>
                    <div className="space-y-1">
                      {connector.outputs.map(out => (
                        <div key={out.name} className="flex items-baseline gap-2">
                          <code className="text-[9px] text-emerald-300/70 font-mono">{out.name}</code>
                          <code className="text-[8px] text-white/20 font-mono">{out.type}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest mb-2">Notas de integración</p>
                    <p className="text-[9px] text-white/30 leading-relaxed">{connector.notes}</p>
                    {connector.model && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Cpu className="w-2.5 h-2.5 text-violet-400" />
                        <span className="text-[8px] text-violet-400/70 font-mono">{connector.model}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Architecture note */}
          <div className="bg-[#0d1629] border border-white/[0.06] rounded-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Arquitectura de integración</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-semibold text-white/50 mb-2">Para conectar OpenAI</p>
                <div className="space-y-1.5 text-[9px] text-white/30">
                  <p>1. Añadir <code className="text-teal-400">OPENAI_API_KEY</code> a los secretos del entorno</p>
                  <p>2. El servidor detecta la key automáticamente al iniciar</p>
                  <p>3. Las llamadas a <code className="text-violet-400">generateVisualAtlasPage</code> usarán la API real</p>
                  <p>4. Sin key → modo demo con datos simulados (comportamiento actual)</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-semibold text-white/50 mb-2">Para migrar localStorage → DB</p>
                <div className="space-y-1.5 text-[9px] text-white/30">
                  <p>1. La API REST está operativa en <code className="text-blue-400">/api</code></p>
                  <p>2. Reemplazar <code className="text-teal-400">StudioProvider</code> con hooks de <code className="text-teal-400">api-client-react</code></p>
                  <p>3. El reducer de acciones se convierte en mutaciones React Query</p>
                  <p>4. localStorage actúa como caché optimista durante la transición</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
