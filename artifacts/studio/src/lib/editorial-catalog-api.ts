export type CatalogStatus = "active" | "planned";

export interface EditorialProviderSummary {
  id: string;
  name: string;
  shortName: string;
  badgeText: string;
  brandColor: string;
  status: CatalogStatus;
  description: string;
  certCount: number;
  activeCount: number;
}

export interface EditorialCertificationSummary {
  id: string;
  providerId: string;
  code: string;
  name: string;
  fullName: string;
  level: "Fundamentals" | "Associate" | "Expert" | "Specialty";
  status: CatalogStatus;
  estimatedPages: number;
  formats: number;
  activeFormats: number;
}

export interface EditorialFormatSummary {
  id: string;
  certificationId: string;
  name: string;
  label: string;
  status: CatalogStatus;
  route: string | null;
  contractId: string | null;
  productionOrder: number;
}

async function readJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function fetchEditorialProviders(): Promise<EditorialProviderSummary[]> {
  const data = await readJson<{ providers: EditorialProviderSummary[] }>("/api/catalog/providers");
  return data.providers;
}

export async function fetchProviderCertifications(providerId: string): Promise<EditorialCertificationSummary[]> {
  const data = await readJson<{ certifications: EditorialCertificationSummary[] }>(`/api/catalog/providers/${providerId}/certifications`);
  return data.certifications;
}

export async function fetchCertificationFormats(certificationId: string): Promise<EditorialFormatSummary[]> {
  const data = await readJson<{ formats: EditorialFormatSummary[] }>(`/api/catalog/certifications/${certificationId}/formats`);
  return data.formats;
}
