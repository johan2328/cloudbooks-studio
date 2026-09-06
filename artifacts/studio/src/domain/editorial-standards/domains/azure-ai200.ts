import { DOMAIN_CONTRACTS } from "../data";
import type { DomainContract } from "../types";

/**
 * Contrato de colección AI-200: Azure AI Developer.
 * 61 infografías en 13 batches, formato Visual Atlas v24, estado activo.
 */
export const AI200_DOMAIN: DomainContract = DOMAIN_CONTRACTS.find(
  d => d.certCode === "AI-200",
)!;

export { DOMAIN_CONTRACTS };
