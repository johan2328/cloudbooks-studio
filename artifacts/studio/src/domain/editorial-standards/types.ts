/* ════════════════════════════════════════════════════════════════════════════
   Estándares Editoriales — Tipos de gobernanza
   ════════════════════════════════════════════════════════════════════════════ */

export type StandardStatus = "active" | "validated" | "experimental" | "pending";

/* ─── Reglas globales ─────────────────────────────────────────────────────── */
export interface GlobalRule {
  id: string;
  label: string;
  description: string;
  status: StandardStatus;
  enforced: boolean;
}

/* ─── Contrato por formato ────────────────────────────────────────────────── */
export interface FormatContract {
  id: string;
  name: string;
  slug: string;
  version: string;
  status: StandardStatus;
  description: string;
  keyConstraints: string[];
  activeCertifications: string[];
}

/* ─── Contrato por dominio / colección ───────────────────────────────────── */
export interface DomainContract {
  id: string;
  name: string;
  certCode?: string;
  provider: string;
  status: StandardStatus;
  description: string;
  activeFormats: string[];
  totalPages?: number;
}

/* ─── Gate de QA ─────────────────────────────────────────────────────────── */
export interface QAGate {
  id: string;
  label: string;
  description: string;
  blocksApproval: boolean;
  maxScoreIfFailed: number;
  status: StandardStatus;
}

/* ─── Política de generación ─────────────────────────────────────────────── */
export interface GenerationPolicy {
  formatId: string;
  formatName: string;
  textModel: string;
  imageModel: string | null;
  imageQuality: string | null;
  fallbackAllowed: boolean;
  fallbackApprovable: false;
  batchGating: boolean;
  status: StandardStatus;
}

/* ─── Política de exportación ────────────────────────────────────────────── */
export interface ExportPolicy {
  formatId: string;
  formatName: string;
  requiredFiles: string[];
  blockedByQA: boolean;
  metadataRequired: boolean;
  allowedFormats: string[];
  status: StandardStatus;
}

/* ─── Estándar editorial agregado ────────────────────────────────────────── */
export interface EditorialStandards {
  globalRules: GlobalRule[];
  formatContracts: FormatContract[];
  domainContracts: DomainContract[];
  qaGates: QAGate[];
  generationPolicies: GenerationPolicy[];
  exportPolicies: ExportPolicy[];
}
