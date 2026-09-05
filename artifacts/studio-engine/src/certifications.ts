import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import type { CertTrack, CertLevel } from "./types.js";

/**
 * CATÁLOGO CANÓNICO DE CERTIFICACIONES — fuente ÚNICA (engine). Reemplaza al viejo
 * MS_CERT_SEEDS y a la lista hardcodeada del studio. Base = el póster oficial de Microsoft
 * (LAST UPDATED JUNE 2026). Se persiste en `_certifications.json` para que el sync mensual
 * (cert-poster-sync) pueda agregar altas / marcar deprecaciones sin editar código.
 * `track`/`domains`/`pages` se derivan (mapeo por prefijo + plan del engine para codes conocidos).
 */
export type CanonArea = "Cloud & AI Platforms" | "AI Business Solutions" | "Security" | "GitHub";
export type CanonLevel = "Fundamentals" | "Associate" | "Expert" | "Specialty" | "Business";
export interface CanonCert {
  code: string; title: string; cloud: string;
  area: CanonArea | string; level: CanonLevel | string;
  status: string;            // Activo · Nuevo · Beta · Sustituida · Retirada
  note?: string;
}
/** Cert enriquecido que consumen el árbol (track/domains/pages) y la página (level/area/status/note originales). */
export interface EnrichedCert extends CanonCert { track: CertTrack; domains: number; pages: number }

const M = "Microsoft";
/** Base del póster (la más completa/actual). El sync mensual la actualiza en `_certifications.json`. */
const BUILTIN_CANON: CanonCert[] = [
  // ── Cloud & AI Platforms ──
  { code: "AZ-900", title: "Azure Fundamentals", cloud: M, area: "Cloud & AI Platforms", level: "Fundamentals", status: "Activo" },
  { code: "AI-900", title: "Azure AI Fundamentals", cloud: M, area: "Cloud & AI Platforms", level: "Fundamentals", status: "Retirada", note: "MS la retiró a fin de junio de 2026. La reemplaza AI-901." },
  { code: "AI-901", title: "Azure AI Fundamentals", cloud: M, area: "Cloud & AI Platforms", level: "Fundamentals", status: "Nuevo", note: "Nueva (beta, marzo 2026). Reemplaza a AI-900." },
  { code: "DP-900", title: "Azure Data Fundamentals", cloud: M, area: "Cloud & AI Platforms", level: "Fundamentals", status: "Activo" },
  { code: "AZ-104", title: "Azure Administrator Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "AZ-204", title: "Azure Developer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "AZ-700", title: "Azure Network Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "AZ-800/AZ-801", title: "Windows Server Hybrid Administrator Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo", note: "Requiere aprobar dos exámenes: AZ-800 y AZ-801. Se retiran en septiembre de 2026; los reemplaza AZ-802." },
  { code: "AZ-802", title: "Windows Server Administrator Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Nuevo", note: "Reemplaza a AZ-800/AZ-801 (se retiran en septiembre de 2026)." },
  { code: "AZ-305", title: "Azure Solutions Architect Expert", cloud: M, area: "Cloud & AI Platforms", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "AZ-400", title: "DevOps Engineer Expert", cloud: M, area: "Cloud & AI Platforms", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "AI-102", title: "Azure AI Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Sustituida", note: "Será reemplazada por AI-103." },
  { code: "AI-103", title: "Azure AI Apps and Agents Developer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Nuevo", note: "Reemplaza a AI-102 (en beta)." },
  { code: "AI-200", title: "Azure AI Cloud Developer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Beta" },
  { code: "AI-300", title: "Machine Learning Operations Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "DP-300", title: "Azure Database Administrator Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "DP-600", title: "Fabric Analytics Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "DP-700", title: "Fabric Data Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "DP-750", title: "Azure Databricks Data Engineer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "DP-800", title: "SQL AI Developer Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "PL-300", title: "Power BI Data Analyst Associate", cloud: M, area: "Cloud & AI Platforms", level: "Associate", status: "Activo" },
  { code: "AZ-120", title: "Azure for SAP Workloads Specialty", cloud: M, area: "Cloud & AI Platforms", level: "Specialty", status: "Activo" },
  { code: "AZ-140", title: "Azure Virtual Desktop Specialty", cloud: M, area: "Cloud & AI Platforms", level: "Specialty", status: "Activo" },
  { code: "DP-420", title: "Azure Cosmos DB Developer Specialty", cloud: M, area: "Cloud & AI Platforms", level: "Specialty", status: "Activo" },
  // ── AI Business Solutions ──
  { code: "AB-900", title: "Microsoft 365 Copilot and Agent Administration Fundamentals", cloud: M, area: "AI Business Solutions", level: "Fundamentals", status: "Activo" },
  { code: "PL-900", title: "Power Platform Fundamentals", cloud: M, area: "AI Business Solutions", level: "Fundamentals", status: "Activo" },
  { code: "MD-102", title: "Endpoint Administrator Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MS-102", title: "Microsoft 365 Administrator Expert", cloud: M, area: "AI Business Solutions", level: "Expert", status: "Activo" },
  { code: "MS-700", title: "Teams Administrator Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MS-721", title: "Collaboration Communications Systems Engineer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-230", title: "Dynamics 365 Customer Service Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-240", title: "Dynamics 365 Field Service Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-280", title: "Dynamics 365 Customer Experience Analyst Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-310", title: "Dynamics 365 Finance Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-330", title: "Dynamics 365 Supply Chain Management Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-335", title: "Dynamics 365 Supply Chain Management Functional Consultant Expert", cloud: M, area: "AI Business Solutions", level: "Expert", status: "Activo" },
  { code: "MB-500", title: "Dynamics 365 Finance and Operations Apps Developer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-700", title: "Dynamics 365 Finance and Operations Apps Solution Architect Expert", cloud: M, area: "AI Business Solutions", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "MB-800", title: "Dynamics 365 Business Central Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "MB-820", title: "Dynamics 365 Business Central Developer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "PL-200", title: "Power Platform Functional Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "PL-400", title: "Power Platform Developer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "PL-500", title: "Power Automate RPA Developer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "PL-600", title: "Power Platform Solution Architect Expert", cloud: M, area: "AI Business Solutions", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "AB-100", title: "Agentic AI Business Solutions Architect", cloud: M, area: "AI Business Solutions", level: "Expert", status: "Beta", note: "Tiene prerrequisitos." },
  { code: "AB-210", title: "Dynamics 365 Sales AI Consultant Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Beta" },
  { code: "AB-250", title: "Dynamics 365 Contact Center AI Engineer Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Beta" },
  { code: "AB-410", title: "Intelligent Applications Builder Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Beta" },
  { code: "AB-620", title: "AI Agent Builder Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Activo" },
  { code: "AB-730", title: "AI Business Professional", cloud: M, area: "AI Business Solutions", level: "Business", status: "Activo" },
  { code: "AB-731", title: "AI Transformation Leader", cloud: M, area: "AI Business Solutions", level: "Business", status: "Activo" },
  // ── Security ──
  { code: "SC-900", title: "Security, Compliance, and Identity Fundamentals", cloud: M, area: "Security", level: "Fundamentals", status: "Activo" },
  { code: "AZ-500", title: "Azure Security Engineer Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-200", title: "Security Operations Analyst Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-300", title: "Identity and Access Administrator Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-401", title: "Information Security Administrator Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-500", title: "Cloud and AI Security Engineer Associate", cloud: M, area: "Security", level: "Associate", status: "Beta" },
  { code: "SC-100", title: "Cybersecurity Architect Expert", cloud: M, area: "Security", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "SC-730", title: "Cybersecurity Business Professional", cloud: M, area: "Security", level: "Business", status: "Beta" },
  // ── GitHub ──
  { code: "GH-900", title: "GitHub Foundations", cloud: M, area: "GitHub", level: "Fundamentals", status: "Activo" },
  { code: "GH-100", title: "GitHub Administration", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-200", title: "GitHub Actions", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-300", title: "GitHub Copilot", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-500", title: "GitHub Advanced Security", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-600", title: "GitHub Agentic AI Developer", cloud: M, area: "GitHub", level: "Specialty", status: "Beta" },
];

// Plan del engine (domains, pages) para codes conocidos — preserva los valores previos de MS_CERT_SEEDS.
const ENGINE_PLAN: Record<string, [number, number]> = {
  "AZ-900": [6, 48], "AZ-104": [5, 70], "AZ-204": [5, 72], "AZ-700": [4, 60], "AZ-800/AZ-801": [5, 66], "AZ-305": [4, 78], "AZ-140": [4, 52], "AZ-120": [4, 54],
  "AI-200": [9, 98], "AI-900": [5, 44], "AI-102": [5, 64],
  "DP-900": [4, 44], "DP-300": [5, 64], "DP-420": [4, 56], "DP-600": [4, 60], "DP-700": [4, 62],
  "SC-900": [4, 46], "AZ-500": [4, 66], "SC-200": [4, 60], "SC-300": [4, 58], "SC-100": [4, 72],
  "AZ-400": [5, 74], "GH-900": [4, 40], "GH-100": [4, 48], "GH-200": [4, 50], "GH-300": [4, 44], "GH-500": [4, 50],
  "MS-102": [5, 70], "MD-102": [5, 62], "MS-700": [4, 58], "MS-721": [4, 56],
  "PL-900": [4, 44], "PL-200": [5, 62], "PL-300": [4, 60], "PL-400": [5, 64], "PL-500": [4, 56], "PL-600": [4, 70],
  "MB-230": [4, 56], "MB-240": [4, 54], "MB-280": [4, 54], "MB-310": [5, 62], "MB-330": [5, 62], "MB-335": [4, 66], "MB-500": [5, 64], "MB-700": [4, 72], "MB-800": [4, 58], "MB-820": [4, 58],
};
const LEVEL_DOMAINS: Record<string, number> = { fundamentals: 5, associate: 4, expert: 4, specialty: 4 };

/** Nivel del póster (capitalizado, con "Business") → nivel del engine (lowercase, 4). Para el árbol. */
export function levelToEngine(level: string): CertLevel {
  const l = level.toLowerCase();
  return l === "fundamentals" || l === "associate" || l === "expert" || l === "specialty" ? (l as CertLevel) : "associate"; // "Business" → associate para el árbol
}
function trackFor(code: string): CertTrack {
  if (code.startsWith("AZ-400")) return "devops";
  if (code.startsWith("AZ-500")) return "security";
  const p = (code.split(/[-/]/)[0] ?? code).toUpperCase();
  switch (p) {
    case "AZ": return "azure";
    case "AI": case "AB": return "ai";
    case "DP": return "data";
    case "SC": return "security";
    case "GH": return "devops";
    case "MS": case "MD": return "m365";
    case "PL": return "power-platform";
    case "MB": return "dynamics";
    default: return "azure";
  }
}
function domainsFor(code: string, level: CertLevel): number { return ENGINE_PLAN[code]?.[0] ?? LEVEL_DOMAINS[level] ?? 4; }
function pagesFor(code: string, level: CertLevel): number { return ENGINE_PLAN[code]?.[1] ?? domainsFor(code, level) * 14; }

function storePath(): string { return path.join(CONFIG.outputRoot, "_certifications.json"); }
function load(): CanonCert[] {
  try {
    if (existsSync(storePath())) {
      const arr = JSON.parse(readFileSync(storePath(), "utf8")) as CanonCert[];
      if (Array.isArray(arr) && arr.length) return arr;
    }
  } catch { /* corrupto → built-in */ }
  return BUILTIN_CANON;
}

/** Catálogo canónico ENRIQUECIDO (track/level-engine/domains/pages) — lo consumen el árbol y la página. */
export function canonicalCerts(): EnrichedCert[] {
  return load().map((c) => {
    const el = levelToEngine(c.level);   // solo para calcular domains/pages; el `level` devuelto queda capitalizado
    return { ...c, track: trackFor(c.code), domains: domainsFor(c.code, el), pages: pagesFor(c.code, el) };
  });
}

/** Escribe el catálogo canónico (lo usa el sync mensual del póster). */
export function saveCanonicalCerts(list: CanonCert[]): void {
  atomicWriteFileSync(storePath(), JSON.stringify(list, null, 2), "certifications");
}

/** El catálogo canónico crudo (con status/note original, sin enriquecer) — base para el diff del póster. */
export function rawCanonicalCerts(): CanonCert[] { return load(); }

/** Metadata de identidad de un cert por su id de engine (code en minúsculas, ej. "ai-200"). Para E3 cross-cert. */
export interface CertMeta { code: string; title: string; level: string }
export function certMetaByEngineId(certId: string): CertMeta {
  const cid = certId.toLowerCase();
  const c = load().find((x) => x.code.toLowerCase() === cid);
  return c ? { code: c.code, title: c.title, level: String(c.level) } : { code: certId.toUpperCase(), title: certId.toUpperCase(), level: "Associate" };
}

/** Descarta un code del canónico (limpiar un falso-add del sync). Devuelve true si existía. */
export function removeCanonicalCert(code: string): boolean {
  const target = code.trim().toUpperCase();
  const list = load();
  const next = list.filter((c) => c.code.toUpperCase() !== target);
  if (next.length === list.length) return false;
  saveCanonicalCerts(next);
  return true;
}

/** Cambia el status de un code canónico (retirar/reactivar). Devuelve true si el code existía.
 *  Persiste TODO el canon (igual que removeCanonicalCert): si el code era built-in, materializa el store. */
export function setCanonicalCertStatus(code: string, status: string): boolean {
  const target = code.trim().toUpperCase();
  const list = load();
  let hit = false;
  const next = list.map((c) => (c.code.toUpperCase() === target ? ((hit = true), { ...c, status }) : c));
  if (!hit) return false;
  saveCanonicalCerts(next);
  return true;
}
