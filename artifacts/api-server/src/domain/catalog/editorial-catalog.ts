export type CatalogStatus = "active" | "planned";

export interface EditorialProvider {
  id: string;
  name: string;
  shortName: string;
  badgeText: string;
  brandColor: string;
  status: CatalogStatus;
  description: string;
}

export interface EditorialCertification {
  id: string;
  providerId: string;
  code: string;
  name: string;
  fullName: string;
  level: "Fundamentals" | "Associate" | "Expert" | "Specialty";
  status: CatalogStatus;
  estimatedPages: number;
}

export interface EditorialFormat {
  id: string;
  certificationId: string;
  name: string;
  label: string;
  status: CatalogStatus;
  route: string | null;
  contractId: string | null;
  productionOrder: number;
}

export const EDITORIAL_PROVIDERS: EditorialProvider[] = [
  {
    id: "azure",
    name: "Microsoft Azure",
    shortName: "Azure",
    badgeText: "Az",
    brandColor: "#0078d4",
    status: "active",
    description: "Colecciones editoriales para certificaciones Microsoft Azure. Proveedor activo.",
  },
  {
    id: "aws",
    name: "Amazon Web Services",
    shortName: "AWS",
    badgeText: "AW",
    brandColor: "#FF9900",
    status: "planned",
    description: "Colecciones para certificaciones AWS. En hoja de ruta.",
  },
  {
    id: "gcp",
    name: "Google Cloud Platform",
    shortName: "GCP",
    badgeText: "GC",
    brandColor: "#4285F4",
    status: "planned",
    description: "Colecciones para certificaciones Google Cloud. En hoja de ruta.",
  },
];

export const EDITORIAL_CERTIFICATIONS: EditorialCertification[] = [
  {
    id: "ai-200",
    providerId: "azure",
    code: "AI-200",
    name: "Azure AI Engineer",
    fullName: "Azure AI Engineer Associate",
    level: "Associate",
    status: "active",
    estimatedPages: 61,
  },
  {
    id: "az-900",
    providerId: "azure",
    code: "AZ-900",
    name: "Azure Fundamentals",
    fullName: "Microsoft Azure Fundamentals",
    level: "Fundamentals",
    status: "planned",
    estimatedPages: 48,
  },
  {
    id: "ai-900",
    providerId: "azure",
    code: "AI-900",
    name: "Azure AI Fundamentals",
    fullName: "Microsoft Azure AI Fundamentals",
    level: "Fundamentals",
    status: "planned",
    estimatedPages: 42,
  },
  {
    id: "dp-900",
    providerId: "azure",
    code: "DP-900",
    name: "Azure Data Fundamentals",
    fullName: "Microsoft Azure Data Fundamentals",
    level: "Fundamentals",
    status: "planned",
    estimatedPages: 44,
  },
  {
    id: "az-104",
    providerId: "azure",
    code: "AZ-104",
    name: "Azure Administrator",
    fullName: "Microsoft Azure Administrator",
    level: "Associate",
    status: "planned",
    estimatedPages: 72,
  },
  {
    id: "az-305",
    providerId: "azure",
    code: "AZ-305",
    name: "Azure Solutions Architect",
    fullName: "Azure Solutions Architect Expert",
    level: "Expert",
    status: "planned",
    estimatedPages: 80,
  },
];

const AI200_FORMATS: Array<Omit<EditorialFormat, "certificationId">> = [
  { id: "master-book", name: "Master Book", label: "Aprendizaje profundo", status: "planned", route: null, contractId: null, productionOrder: 1 },
  { id: "visual-atlas", name: "Visual Atlas", label: "Estudio visual acelerado", status: "active", route: "/biblioteca", contractId: "visual-atlas-v24", productionOrder: 2 },
  { id: "exam-traps", name: "Exam Traps Guide", label: "Trampas y distractores", status: "planned", route: null, contractId: null, productionOrder: 3 },
  { id: "question-bank", name: "Question Bank", label: "Practica exhaustiva", status: "planned", route: null, contractId: null, productionOrder: 4 },
  { id: "cheat-sheets", name: "Cheat Sheets", label: "Repaso compacto", status: "planned", route: null, contractId: null, productionOrder: 5 },
  { id: "rapid-review", name: "Rapid Review Pack", label: "Cierre pre-examen", status: "planned", route: null, contractId: null, productionOrder: 6 },
];

export const EDITORIAL_FORMATS: EditorialFormat[] = AI200_FORMATS.map((format) => ({
  ...format,
  certificationId: "ai-200",
}));

export function getProviderSummary() {
  return EDITORIAL_PROVIDERS.map((provider) => {
    const certifications = EDITORIAL_CERTIFICATIONS.filter((cert) => cert.providerId === provider.id);
    return {
      ...provider,
      certCount: certifications.length,
      activeCount: certifications.filter((cert) => cert.status === "active").length,
    };
  });
}

export function getCertificationSummary(providerId: string) {
  return EDITORIAL_CERTIFICATIONS
    .filter((cert) => cert.providerId === providerId)
    .map((cert) => {
      const formats = EDITORIAL_FORMATS.filter((format) => format.certificationId === cert.id);
      return {
        ...cert,
        formats: formats.length || 6,
        activeFormats: formats.filter((format) => format.status === "active").length,
      };
    });
}
