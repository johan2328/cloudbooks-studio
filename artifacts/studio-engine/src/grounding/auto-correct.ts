import { authorSkill } from "./author-page.js";
import { verifyGrounding } from "./verify-grounding.js";
import type { AuthoredPage, GroundingResult } from "../types.js";

export interface AutoCorrectResult {
  authored: AuthoredPage;
  grounding: GroundingResult;
  attempts: number;        // re-redacciones correctivas hechas
  resolved: boolean;       // true = quedó no-bloqueado (verified/partial)
}

/** Afirmaciones que el verificador marcó sin respaldo o contradichas. */
function failedAssertions(g: GroundingResult): string[] {
  return g.checks
    .filter((c) => c.verdict === "unsupported" || c.verdict === "contradicted")
    .map((c) => `[${c.field}] "${c.text}" — ${c.verdict}${c.note ? ` (${c.note})` : ""}`);
}

/**
 * AUTO-CORRECCIÓN DE GROUNDING (agente acotado, no parche).
 *
 * Redacta + verifica. Si el grounding BLOQUEA (alguna afirmación sin respaldo),
 * NO escala al humano de inmediato: le devuelve al autor EXACTAMENTE qué frases
 * fallaron y le pide re-redactar ancladas al corpus; re-verifica. Repite hasta
 * resolver o agotar `maxAttempts`. El humano interviene SOLO si el sistema no
 * pudo (lo puntual), no en cada bloqueo. Idempotente: la versión corregida queda
 * cacheada como la autoría de la skill.
 */
export async function autoGroundCorrect(skillId: string, maxAttempts = 4): Promise<AutoCorrectResult> {
  let authored = await authorSkill(skillId);
  let grounding = await verifyGrounding(authored);
  let attempts = 0;

  while (grounding.blocked && authored.outcome === "real" && attempts < maxAttempts) {
    const failed = failedAssertions(grounding);
    if (failed.length === 0) break;                       // bloqueo sin frases accionables → escalar
    authored = await authorSkill(skillId, true, failed);  // re-redacta con el feedback puntual
    if (authored.outcome !== "real") break;
    grounding = await verifyGrounding(authored);
    attempts++;
  }

  return { authored, grounding, attempts, resolved: !grounding.blocked };
}
