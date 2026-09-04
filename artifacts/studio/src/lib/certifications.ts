/* ════════════════════════════════════════════════════════════════════════════
   CERTIFICACIONES — catálogo (ficha técnica) por nube + área + nivel de exigencia.
   Datos base extraídos del póster oficial de certificaciones Microsoft
   (LAST UPDATED JUNE 2026). El usuario puede sumar nuevas (se guardan local).
   ════════════════════════════════════════════════════════════════════════════ */

export type CertArea = "Cloud & AI Platforms" | "AI Business Solutions" | "Security" | "GitHub";
export type CertLevel = "Fundamentals" | "Associate" | "Expert" | "Specialty" | "Business";

export interface Certification {
  code: string;
  title: string;
  cloud: string;            // nube / ecosistema (Microsoft, AWS, Google Cloud…)
  area: CertArea | string;  // sección/categoría
  level: CertLevel | string;// nivel de exigencia
  status: string;           // Activo · Nuevo · Beta · Sustituida · Retirada
  note?: string;            // aclaraciones (transición, prerrequisitos, etc.)
  hours?: number;           // horas de preparación oficiales (MS Learn). Si falta → estimación por nivel.
  modules?: number;         // módulos / dominios / secciones. Si falta → estimación por nivel.
  custom?: boolean;         // true si la cargó el usuario
}

export const CLOUDS = ["Microsoft", "AWS", "Google Cloud"];
export const CERT_AREAS: CertArea[] = ["Cloud & AI Platforms", "AI Business Solutions", "Security", "GitHub"];
export const CERT_LEVELS: CertLevel[] = ["Fundamentals", "Associate", "Expert", "Specialty", "Business"];
export const CERT_STATUSES = ["Activo", "Nuevo", "Beta", "Sustituida", "Retirada"];

/* Estimación base por nivel (horas de prep · módulos) cuando la certificación no
   trae el dato oficial. Reemplazable cargando hours/modules reales por cert. */
export const LEVEL_HOURS: Record<string, number> = { Fundamentals: 10, Associate: 30, Expert: 45, Specialty: 24, Business: 8 };
export const LEVEL_MODULES: Record<string, number> = { Fundamentals: 6, Associate: 12, Expert: 16, Specialty: 9, Business: 5 };

export function certHours(c: Certification): number { return typeof c.hours === "number" ? c.hours : (LEVEL_HOURS[c.level] ?? 20); }
export function certModules(c: Certification): number { return typeof c.modules === "number" ? c.modules : (LEVEL_MODULES[c.level] ?? 8); }
export function isEstimated(c: Certification): boolean { return typeof c.hours !== "number" || typeof c.modules !== "number"; }

/* ── Modelo de ahorro con CloudBooks (no lineal, acotado 25%–30%) ──────────────
   La reducción crece con el volumen total de horas (más material → más
   redundancia y reorganización aprovechable) pero con rendimientos decrecientes
   y un techo: saturación exponencial.
       r(H) = rMin + (rMax − rMin)·(1 − e^(−H/τ))
   con rMin=0.25, rMax=0.30, τ=45 h. Así pocas horas ≈25% y grandes rutas →30%. */
export const RED_MIN = 0.25;
export const RED_MAX = 0.30;
export const RED_TAU = 45;
export function reductionRate(totalHours: number): number {
  if (totalHours <= 0) return RED_MIN;
  return RED_MIN + (RED_MAX - RED_MIN) * (1 - Math.exp(-totalHours / RED_TAU));
}

/* ── Intereses combinados (rutas orientadas al mercado) ────────────────────────
   Cada track es una secuencia curada de códigos; el grafo la resuelve contra el
   catálogo vigente (si un código no existe, se omite sin romper la ruta). */
export interface Track { id: string; name: string; desc: string; codes: string[]; }
export const TRACKS: Track[] = [
  { id: "data-agentic-ai",    name: "Data & Agentic AI Professional", desc: "De fundamentos de datos al desarrollo de soluciones de IA agentiva en Azure.", codes: ["DP-900", "AI-900", "DP-600", "AI-103", "AI-200"] },
  { id: "ai-engineer",        name: "Azure AI Engineer",              desc: "Construí, desplegá y operá soluciones de IA en Azure.",                      codes: ["AI-900", "AI-103", "AI-200", "AI-300"] },
  { id: "security-architect", name: "Cloud Security Architect",       desc: "De los fundamentos de seguridad a la arquitectura de ciberseguridad.",       codes: ["SC-900", "AZ-500", "SC-200", "SC-100"] },
  { id: "solutions-architect",name: "Azure Solutions Architect",      desc: "Diseñá infraestructura y soluciones en Azure de punta a punta.",             codes: ["AZ-900", "AZ-104", "AZ-305"] },
  { id: "devops",             name: "DevOps Engineer en Azure",       desc: "Automatización, CI/CD y entrega continua sobre Azure.",                      codes: ["AZ-900", "AZ-104", "AZ-204", "AZ-400"] },
  { id: "data-engineer",      name: "Data Engineer en Azure",         desc: "Ingeniería de datos y analítica con Fabric y bases de datos.",               codes: ["DP-900", "DP-600", "DP-700", "DP-300"] },
  { id: "fabric",             name: "Fabric Analytics Engineer",      desc: "Analítica e ingeniería de datos sobre Microsoft Fabric.",                    codes: ["DP-900", "DP-600", "DP-700"] },
  { id: "power-platform",     name: "Power Platform Maker",           desc: "Apps, automatización y arquitectura low-code en Power Platform.",            codes: ["PL-900", "PL-200", "PL-400", "PL-600"] },
  { id: "m365-admin",         name: "Microsoft 365 Administrator",    desc: "Identidades, endpoints y colaboración en Microsoft 365.",                    codes: ["MS-102", "MD-102", "MS-700"] },
  { id: "identity",           name: "Identity & Access Specialist",   desc: "Gestión de identidades, accesos y seguridad de la información.",             codes: ["SC-900", "SC-300", "SC-401"] },
  { id: "soc-analyst",        name: "Security Operations (SOC)",      desc: "Detección, respuesta y operaciones de seguridad.",                           codes: ["SC-900", "SC-200", "SC-500"] },
  { id: "github-dev",         name: "GitHub Developer & Copilot",     desc: "Flujo de desarrollo moderno con GitHub, Actions y Copilot.",                 codes: ["GH-900", "GH-200", "GH-300", "GH-600"] },
  { id: "agentic-business",   name: "Agentic AI Business Solutions",  desc: "Copilotos y agentes de IA para soluciones de negocio.",                      codes: ["AB-900", "AB-100", "AB-410", "AB-620"] },
  { id: "ai-business-leader", name: "AI Business Leader",             desc: "Liderá la transformación con IA desde el negocio.",                          codes: ["AB-900", "AB-730", "AB-731"] },
  { id: "dynamics-consultant",name: "Dynamics 365 Functional Consultant", desc: "Consultoría funcional en CRM y Dynamics 365.",                          codes: ["PL-900", "MB-280", "MB-230"] },
  { id: "fullstack-azure",    name: "Full-Stack Azure Developer",      desc: "Desarrollo cloud completo: apps, IA y entrega continua en Azure.",           codes: ["AZ-900", "AZ-204", "AI-103", "AZ-400"] },
  { id: "mlops",              name: "AIOps / MLOps Engineer",          desc: "Operación de modelos e IA en producción a escala.",                          codes: ["AI-900", "AI-103", "AI-300"] },
  { id: "modern-workplace",   name: "Modern Workplace Architect",      desc: "Identidad, dispositivos y colaboración segura en Microsoft 365.",            codes: ["SC-900", "MD-102", "MS-700", "MS-102"] },
  { id: "bi-analyst",         name: "Cloud Data & BI Analyst",         desc: "De datos a tableros: analítica de negocio con Power BI y Fabric.",           codes: ["DP-900", "PL-300", "DP-600"] },
  { id: "copilot-lead",       name: "Copilot Adoption Lead",           desc: "Adopción de Copilot y productividad asistida por IA en la organización.",    codes: ["AB-900", "AB-730", "MS-700"] },
];

export const AREA_COLOR: Record<string, string> = {
  "Cloud & AI Platforms": "#3b82f6",
  "AI Business Solutions": "#8b5cf6",
  "Security": "#2dd4bf",
  "GitHub": "#fbbf24",
};
export const LEVEL_COLOR: Record<string, string> = {
  Fundamentals: "#34d399",
  Associate: "#3b82f6",
  Expert: "#fbbf24",
  Specialty: "#8b5cf6",
  Business: "#2dd4bf",
};
export const STATUS_COLOR: Record<string, string> = {
  Activo: "#34d399",
  Nuevo: "#c4b5fd",
  Beta: "#fbbf24",
  Sustituida: "#94a3b8",
  Retirada: "#fb923c",   // baja del catálogo (reversible): botón "Retirar" o chequeo del póster — naranja. Incluye las que MS retiró.
};

const M = "Microsoft";

export const BUILTIN_CERTS: Certification[] = [
  /* ── Cloud & AI Platforms ── */
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

  /* ── AI Business Solutions ── */
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
  { code: "AB-620", title: "AI Agent Builder Associate", cloud: M, area: "AI Business Solutions", level: "Associate", status: "Beta" },
  { code: "AB-730", title: "AI Business Professional", cloud: M, area: "AI Business Solutions", level: "Business", status: "Activo" },
  { code: "AB-731", title: "AI Transformation Leader", cloud: M, area: "AI Business Solutions", level: "Business", status: "Activo" },

  /* ── Security ── */
  { code: "SC-900", title: "Security, Compliance, and Identity Fundamentals", cloud: M, area: "Security", level: "Fundamentals", status: "Activo" },
  { code: "AZ-500", title: "Azure Security Engineer Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-200", title: "Security Operations Analyst Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-300", title: "Identity and Access Administrator Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-401", title: "Information Security Administrator Associate", cloud: M, area: "Security", level: "Associate", status: "Activo" },
  { code: "SC-500", title: "Cloud and AI Security Engineer Associate", cloud: M, area: "Security", level: "Associate", status: "Beta" },
  { code: "SC-100", title: "Cybersecurity Architect Expert", cloud: M, area: "Security", level: "Expert", status: "Activo", note: "Tiene prerrequisitos." },
  { code: "SC-730", title: "Cybersecurity Business Professional", cloud: M, area: "Security", level: "Business", status: "Beta" },

  /* ── GitHub ── */
  { code: "GH-900", title: "GitHub Foundations", cloud: M, area: "GitHub", level: "Fundamentals", status: "Activo" },
  { code: "GH-100", title: "GitHub Administration", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-200", title: "GitHub Actions", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-300", title: "GitHub Copilot", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-500", title: "GitHub Advanced Security", cloud: M, area: "GitHub", level: "Specialty", status: "Activo" },
  { code: "GH-600", title: "GitHub Agentic AI Developer", cloud: M, area: "GitHub", level: "Specialty", status: "Beta" },
];

/* ── certificaciones cargadas por el usuario (localStorage) ── */
const KEY = "cloudbooks_certs_custom_v1";

export function getCustomCerts(): Certification[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as Certification[]) : [];
    return arr.map(c => ({ ...c, custom: true }));
  } catch {
    return [];
  }
}

export function addCustomCert(c: Certification): void {
  const list = getCustomCerts();
  list.push({ ...c, custom: true });
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function removeCustomCert(code: string): void {
  const list = getCustomCerts().filter(c => c.code.toLowerCase() !== code.toLowerCase());
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/* Catálogo efectivo: lo cargado por el usuario SOBRESCRIBE al built-in por código
   (mismo code → gana la versión custom). Nunca se borra una certificación por una
   actualización: solo se agrega o se actualiza. */
/** Mezcla lo custom (localStorage) SOBRE una base dada (mismo code → gana custom). */
export function getAllCertsFrom(base: Certification[]): Certification[] {
  const custom = getCustomCerts();
  const overridden = new Set(custom.map(c => c.code.toLowerCase()));
  return [...base.filter(c => !overridden.has(c.code.toLowerCase())), ...custom];
}
/** Catálogo efectivo OFFLINE (base built-in + custom). La página prefiere el canónico del engine. */
export function getAllCerts(): Certification[] {
  return getAllCertsFrom(BUILTIN_CERTS);
}

/* Importación que COMBINA (no reemplaza): upsert por código contra lo custom.
   Útil para "actualizar el catálogo" desde un JSON (póster Microsoft u otra nube)
   sin perder lo previamente agregado/editado. */
export function importCerts(incoming: Certification[]): { added: number; updated: number; skipped: number } {
  const custom = getCustomCerts();
  const byCode = new Map(custom.map(c => [c.code.toLowerCase(), c]));
  const builtinCodes = new Set(BUILTIN_CERTS.map(c => c.code.toLowerCase()));
  let added = 0, updated = 0, skipped = 0;
  for (const raw of incoming) {
    const code = (raw?.code ?? "").trim();
    const title = (raw?.title ?? "").trim();
    if (!code || !title) { skipped++; continue; }
    const key = code.toLowerCase();
    const next: Certification = {
      code, title,
      cloud: raw.cloud || "Microsoft",
      area: raw.area || "Cloud & AI Platforms",
      level: raw.level || "Associate",
      status: raw.status || "Activo",
      note: raw.note?.trim() || undefined,
      hours: typeof raw.hours === "number" ? raw.hours : undefined,
      modules: typeof raw.modules === "number" ? raw.modules : undefined,
      custom: true,
    };
    if (byCode.has(key)) { byCode.set(key, { ...byCode.get(key), ...next }); updated++; }
    else { byCode.set(key, next); if (builtinCodes.has(key)) updated++; else added++; }
  }
  try { localStorage.setItem(KEY, JSON.stringify([...byCode.values()])); } catch { /* ignore */ }
  return { added, updated, skipped };
}
