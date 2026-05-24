/* ─── Estados de producción normalizados ─────────────────────────────────── */
export type PageStatus =
  | "draft"
  | "grounding_pending"
  | "grounded"
  | "generating"
  | "qa_pending"
  | "qa_review"
  | "needs_revision"
  | "approved"
  | "exported";

export type GroundingStatus = "unverified" | "partial" | "verified";

/* ─── Asset layer ────────────────────────────────────────────────────────── */
export type AssetSlotStatus =
  | "pending"             // slot vacío, asset real no cargado
  | "demo_available"      // preview simulado disponible
  | "real_available"      // asset real cargado, pendiente de aprobación
  | "approved"            // asset aprobado para uso en producción
  | "needs_replacement"   // asset existente requiere reemplazo
  | "exported";           // asset exportado/publicado

export type AssetType = "preview" | "html" | "png" | "pdf" | "qa_report" | "contract";

export interface AssetSlot {
  type: AssetType;
  status: AssetSlotStatus;
  isDemo: boolean;          // true = contenido simulado
  filename?: string;
  url?: string;             // ruta local o URL remota
  sizeKb?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  note?: string;
}

export interface OutputPack {
  pageId: string;
  pageNumber: string;
  pageTitle: string;
  contractVersion: string;
  lastGenerationAt?: string;
  lastGenerationVersion?: string;
  slots: Record<AssetType, AssetSlot>;
}

/* ─── Entidades del modelo operativo ────────────────────────────────────── */

export interface CloudProvider {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export interface Certification {
  id: string;
  providerId: string;
  code: string;
  name: string;
  level: "fundamental" | "associate" | "expert";
  status: "active" | "planned";
  totalPages: number;
}

export interface EditorialFormat {
  id: string;
  certificationId: string;
  name: string;
  slug: string;
  status: "active" | "pending" | "planned";
  totalSlots: number;
}

export interface ContentSource {
  id: string;
  pageId: string;
  url: string;
  title: string;
  type: "ms_learn" | "official_doc" | "architecture_center" | "blog";
  verifiedAt: string;
}

export interface AtlasPage {
  id: string;           // "01"–"61"
  pageNumber: string;
  title: string;
  domain: string;
  batch: string;        // "Batch 01" … "Batch 13"
  certificationId: string;
  formatId: string;
  status: PageStatus;
  groundingStatus: GroundingStatus;
  groundingNote?: string;
  groundedAt?: string;
  sources: string[];
  qaScore?: number;
  currentVersion: string;
  contractVersion: string;
  lastRevision?: string;
}

export interface GenerationRun {
  id: string;
  pageId: string;
  type: "full_generation" | "selective_regeneration";
  status: "queued" | "running" | "completed" | "failed";
  model: string;
  version: string;
  note?: string;
  createdAt: string;
  completedAt?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface QADimensions {
  artDirection: number;
  editorialConsistency: number;
  readability: number;
  technicalAccuracy: number;
  density: number;
  commercialRisk: number;
  total: number;
}

export interface QAReport {
  id: string;
  pageId: string;
  dimensions: QADimensions;
  observations: string[];
  redTeamLog: string[];
  defectsFound: string[];
  verdict: "approved" | "needs_revision";
  createdAt: string;
  reviewer: string;
}

export interface ExportAsset {
  id: string;
  pageId: string;
  format: "HTML" | "PNG" | "PDF" | "BOOK_PACK";
  filename: string;
  version: string;
  createdAt: string;
}

export type ActionType =
  | "grounding_executed"
  | "generation_started"
  | "generation_completed"
  | "qa_executed"
  | "page_approved"
  | "revision_requested"
  | "selective_regeneration"
  | "page_exported"
  | "contract_updated"
  | "asset_uploaded"
  | "asset_linked"
  | "asset_approved"
  | "asset_replaced";

export interface UserActionLog {
  id: string;
  actionType: ActionType;
  pageId?: string;
  pageTitle?: string;
  pageNumber?: string;
  userId: string;
  userName: string;
  result: string;
  note?: string;
  createdAt: string;
}

export interface ContractVersion {
  id: string;
  name: string;
  version: string;
  scope: string;
  appliesTo: string[];
  status: "active" | "draft" | "archived";
  nonNegotiable: string[];
  flexible: string[];
  stableComponents: string[];
  lastUpdated: string;
  changelog: { version: string; note: string; at: string; author: string }[];
}

/* ─── Estado global del store ────────────────────────────────────────────── */
export interface StudioState {
  pages: AtlasPage[];
  runs: GenerationRun[];
  qaReports: QAReport[];
  actionLog: UserActionLog[];
  contracts: ContractVersion[];
  exports: ExportAsset[];
  outputPacks: OutputPack[];
}

/* ─── Acciones del reducer ───────────────────────────────────────────────── */
export type StudioAction =
  | { type: "EXECUTE_GROUNDING"; pageId: string; userId: string; userName: string }
  | { type: "START_GENERATION"; pageId: string; userId: string; userName: string; model?: string }
  | { type: "COMPLETE_GENERATION"; pageId: string; runId: string }
  | { type: "EXECUTE_QA"; pageId: string; userId: string; userName: string }
  | { type: "APPROVE_PAGE"; pageId: string; userId: string; userName: string }
  | { type: "REQUEST_REVISION"; pageId: string; userId: string; userName: string; note: string }
  | { type: "REGENERATE_SELECTIVE"; pageId: string; userId: string; userName: string }
  | { type: "EXPORT_PAGE"; pageId: string; format: ExportAsset["format"]; userId: string; userName: string }
  | { type: "UPDATE_CONTRACT"; contractId: string; changeNote: string; userId: string; userName: string }
  | { type: "UPLOAD_ASSET_DEMO"; pageId: string; assetType: AssetType; userId: string; userName: string }
  | { type: "LINK_ASSET"; pageId: string; assetType: AssetType; url: string; filename: string; userId: string; userName: string }
  | { type: "APPROVE_ASSET"; pageId: string; assetType: AssetType; userId: string; userName: string }
  | { type: "REPLACE_ASSET_REQUEST"; pageId: string; assetType: AssetType; userId: string; userName: string }
  | { type: "HYDRATE"; state: StudioState };
