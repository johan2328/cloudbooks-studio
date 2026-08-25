import type { Source } from "../types.js";

/**
 * HOJA DE DATOS DUROS CURADA por módulo — "verdad congelada editable" (mismo patrón que `skill-titles-es.json`).
 *
 * Ancla los HECHOS que el modelo tiende a ALUCINAR y que el corpus MS Learn no fija de forma textual/única
 * (p. ej. Key Vault: el corpus tiene DOS framings del nivel FIPS y ninguno textual del valor exacto → el autor
 * cruza ambos e inventa un nivel). Se antepone como fuente sintética al corpus del autor/enrich/verificador Y
 * se inyecta al experto → la corrección deja de oscilar (whack-a-mole) y el dato sale correcto Y citable.
 *
 * Se keyea por el SLUG de módulo de MS Learn (lo que ya computan autor/enrich/verify desde la url), no por
 * moduleId, para atravesar el mismo pipeline sin threading extra. Cada `quote` es una oración CITABLE (el
 * verificador exige cita textual → debe poder copiarla) y `sourceUrl` la página real que la respalda.
 *
 * REVISIÓN HUMANA: esta hoja la audita el editor. Empezar CHICA (solo lo que el gate probó que se alucina);
 * el doble-voto del experto + la cola de revisión son la red si un hecho curado estuviera mal.
 */
export interface HardFact {
  /** Qué hecho ancla (rótulo legible). */
  claim: string;
  /** El valor correcto y vigente (resumen). */
  value: string;
  /** Página MS Learn que lo respalda (trazabilidad). */
  sourceUrl: string;
  /** Oración CITABLE textual (el verificador la valida como cita real). */
  quote: string;
}

/** moduleId (comentario) → slug de módulo de MS Learn → hechos duros. */
const FACTS_BY_SLUG: Record<string, HardFact[]> = {
  // p8.keyvault — /modules/manage-app-secrets-key-vault
  "manage-app-secrets-key-vault": [
    {
      claim: "Nivel FIPS — Key Vault Standard",
      value: "protección por software, FIPS 140-2 Level 1",
      sourceUrl: "https://learn.microsoft.com/azure/key-vault/keys/about-keys",
      quote: "En el nivel Standard de Azure Key Vault las claves se protegen por software con módulos criptográficos validados FIPS 140-2 Level 1.",
    },
    {
      claim: "Nivel FIPS — Key Vault Premium",
      value: "HSM compartido, FIPS 140-2 Level 2",
      sourceUrl: "https://learn.microsoft.com/azure/key-vault/keys/about-keys",
      quote: "El nivel Premium de Azure Key Vault protege las claves con módulos de seguridad de hardware (HSM) validados FIPS 140-2 Level 2.",
    },
    {
      claim: "Nivel FIPS — Managed HSM",
      value: "HSM dedicado de un solo inquilino, FIPS 140-3 Level 3",
      sourceUrl: "https://learn.microsoft.com/azure/key-vault/managed-hsm/overview",
      quote: "Azure Key Vault Managed HSM usa HSM dedicados de un solo inquilino validados FIPS 140-3 Level 3; FIPS 140-3 Level 3 corresponde a Managed HSM, no al nivel Premium del almacén.",
    },
    {
      claim: "Orden de la cadena DefaultAzureCredential",
      value: "Environment → Workload Identity → Managed Identity → Visual Studio → VS Code → Azure CLI → Azure PowerShell → Azure Developer CLI → Interactive Browser",
      sourceUrl: "https://learn.microsoft.com/dotnet/api/azure.identity.defaultazurecredential",
      quote: "DefaultAzureCredential intenta las credenciales en este orden: EnvironmentCredential, WorkloadIdentityCredential, ManagedIdentityCredential, VisualStudioCredential, VisualStudioCodeCredential, AzureCliCredential, AzurePowerShellCredential, AzureDeveloperCliCredential e InteractiveBrowserCredential.",
    },
    {
      claim: "get_secret() sin versión",
      value: "devuelve la versión HABILITADA más reciente",
      sourceUrl: "https://learn.microsoft.com/python/api/overview/azure/keyvault-secrets-readme",
      quote: "Si no se especifica una versión, get_secret devuelve la versión habilitada más reciente del secreto.",
    },
  ],
  // p2.scale — /modules/scale-containers-azure-container-apps. Verificado contra la doc (el experto sin-corpus
  // bloqueaba estos como "errores" cuando el contenido era correcto: 1000 réplicas por CLI, 0.25/0.5 combo válido).
  "scale-containers-azure-container-apps": [
    {
      claim: "Máximo de réplicas por revisión — Azure Container Apps",
      value: "hasta 300 desde el portal y 1000 por CLI/ARM (programático)",
      sourceUrl: "https://learn.microsoft.com/azure/container-apps/scale-app",
      quote: "En Azure Container Apps el número de réplicas por revisión se limita a 300 desde el portal y a 1000 mediante la CLI de Azure o de forma programática.",
    },
    {
      claim: "Combinaciones válidas de CPU y memoria — Container Apps (plan de Consumo)",
      value: "pares fijos con ratio 1 vCPU : 2 GiB; mínimo 0.25 vCPU/0.5 GiB, hasta 2 vCPU/4 GiB",
      sourceUrl: "https://learn.microsoft.com/azure/container-apps/containers",
      quote: "En el plan de Consumo de Azure Container Apps la CPU y la memoria se asignan en pares fijos con proporción 1 vCPU por 2 GiB; 0.25 vCPU con 0.5 GiB es la combinación mínima válida y el máximo en Consumo es 2 vCPU con 4 GiB.",
    },
    {
      claim: "Regla de escalado HTTP — Azure Container Apps (KEDA)",
      value: "escala por solicitudes CONCURRENTES por réplica (concurrentRequests); se promedia en ventanas de ~15 s",
      sourceUrl: "https://learn.microsoft.com/azure/container-apps/scale-app",
      quote: "La regla de escalado HTTP de Azure Container Apps escala según el número de solicitudes concurrentes por réplica; la plataforma evalúa ese promedio en ventanas de aproximadamente 15 segundos.",
    },
  ],
};

/** Hechos duros para el conjunto de slugs de módulo de un capítulo (une los de todos sus módulos). */
export function hardFactsForSlugs(slugs: Iterable<string>): HardFact[] {
  const out: HardFact[] = [];
  for (const s of slugs) { const f = FACTS_BY_SLUG[s]; if (f) out.push(...f); }
  return out;
}

/** Texto plano de los hechos para PROMPTS (experto). Cada línea es una regla dura citable. Vacío si no hay. */
export function hardFactsText(slugs: Iterable<string>): string {
  const facts = hardFactsForSlugs(slugs);
  if (!facts.length) return "";
  return facts.map((f) => `• ${f.claim}: ${f.value}. «${f.quote}» [${f.sourceUrl}]`).join("\n");
}

/** Fuente sintética con los hechos, para ANTEPONER al corpus (autor/enrich/verify). null si no hay hechos.
 *  El `text` incluye las quotes VERBATIM → el matcher de cita del verificador las encuentra ("supported" real). */
export function hardFactsSource(slugs: Iterable<string>): Source | null {
  const facts = hardFactsForSlugs(slugs);
  if (!facts.length) return null;
  const text = facts.map((f) => `${f.claim}: ${f.value}. ${f.quote}`).join("\n");
  return {
    id: "curated-hard-facts",
    kind: "doc",
    title: "Datos duros verificados (curados por el editor)",
    url: "https://learn.microsoft.com/azure/_curated/hard-facts",
    text,
    hash: null,
    addedAt: "2026-01-01T00:00:00.000Z",
  };
}
