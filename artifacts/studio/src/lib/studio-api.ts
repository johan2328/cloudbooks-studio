export type GenerationMode = "openai_image" | "placeholder_image" | "fallback_html" | "none";

export interface StudioOutputStatus {
  pageId: string;
  hasOutput: boolean;
  generationMode: GenerationMode;
  templateApproach: string | null;
  generatedAt: string | null;
  approvedAt: string | null;
  files: {
    html: boolean;
    metadata: boolean;
    qaReport: boolean;
    upperVisual: boolean;
    previewPng: boolean;
    previewSvg: boolean;
    approved: boolean;
  };
  htmlPath: string | null;
  previewPath: string | null;
}

export interface StudioVisualModule {
  num: string;
  title: string;
  description: string;
}

export interface StudioTrap {
  wrong: string;
  correction: string;
}

export interface StudioAutocheck {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  discardNotes: string[];
}

export interface StudioCatalogPage {
  pageId: string;
  pageNumber: string;
  totalPages: number;
  title: string;
  domain: string;
  batch: string;
  context: string;
  guideQuestion: string;
  contractVersion: string;
  groundingStatus: "seeded";
  generationReady: boolean;
  visualModules: StudioVisualModule[];
  traps: StudioTrap[];
  autocheck: StudioAutocheck;
  outputStatus: StudioOutputStatus;
}

export interface StudioCatalog {
  source: "server_seed_and_output_status";
  totalExpected: number;
  availableSeeds: string[];
  pages: StudioCatalogPage[];
}

export interface StudioRuntimeInfo {
  gitSha: string | null;
  gitBranch: string | null;
  gitDirty: boolean;
  syncCommand: string;
  secretsSource: string;
}

export interface StudioKeyStatus {
  hasKey: boolean;
  textModel: string;
  imageModel: string;
  imageQuality: string;
  allowHighQuality: boolean;
  blockLegacyImgModel: boolean;
  costGuardrail: string;
  templateVersion: string;
  approach: string;
  runtime: StudioRuntimeInfo;
}

export function getStudioToken(): string {
  return localStorage.getItem("studio_token") ?? "";
}

export function authHeaders(): HeadersInit {
  const token = getStudioToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStudioCatalog(): Promise<StudioCatalog> {
  const res = await fetch("/api/studio/visual-atlas-pages", { headers: authHeaders() });
  if (!res.ok) throw new Error(`No se pudo cargar el catalogo operativo (${res.status})`);
  return res.json() as Promise<StudioCatalog>;
}

export async function fetchStudioKeyStatus(): Promise<StudioKeyStatus> {
  const res = await fetch("/api/studio/key-status", { headers: authHeaders() });
  if (!res.ok) throw new Error(`No se pudo cargar el runtime del Studio (${res.status})`);
  return res.json() as Promise<StudioKeyStatus>;
}

export function getPageIdFromLocation(defaultPageId = "01"): string {
  const raw = new URLSearchParams(window.location.search).get("page") ?? defaultPageId;
  const num = parseInt(raw, 10);
  if (!Number.isFinite(num) || num < 1) return defaultPageId;
  return String(num).padStart(2, "0");
}
