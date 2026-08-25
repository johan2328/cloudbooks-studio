import { searchSkillSources } from "./search-sources.js";
import { authorSkill } from "./author-page.js";
import { verifyGrounding } from "./verify-grounding.js";
import { superviseRelevance } from "./relevance-supervisor.js";
import { saveRelevance, getRelevanceBySkill } from "./relevance-store.js";
import { getSkill } from "../skills/ai-200-outline.js";
import type { RelevanceResult } from "../types.js";

/**
 * MEJORAR RELEVANCIA (remediación de 1 click, human-triggered). Cuando el
 * supervisor da `thin`/`off_topic`, corre el loop con los 4 agentes usando los
 * GAPS del último veredicto como feedback: re-busca fuentes → re-redacta el
 * contenido apuntando a los gaps → re-verifica fidelidad → re-supervisa
 * relevancia. Devuelve el nuevo RelevanceResult (y lo persiste).
 */
export async function improveRelevance(skillId: string): Promise<RelevanceResult> {
  const fail = (extra: Partial<RelevanceResult>): RelevanceResult => ({
    outcome: "failed", model: null, skillId, relevanceStatus: "thin", score: 0,
    coverageScore: 0, contentScore: 0, gaps: [], note: "", error: null, ...extra,
  });
  if (!getSkill(skillId)) return fail({ error: `skill_desconocida:${skillId}` });

  const prev = getRelevanceBySkill(skillId);
  const feedback = prev?.gaps ?? [];

  // 1) re-buscar fuentes (puede traer lo que faltaba para cubrir el skill)
  await searchSkillSources(skillId);
  // 2) re-redactar apuntando a los gaps (force + feedback)
  const authored = await authorSkill(skillId, true, feedback.length ? feedback : undefined);
  if (authored.outcome !== "real" || !authored.draft) {
    return fail({ relevanceStatus: prev?.status ?? "thin", gaps: feedback, error: authored.error ?? "no se pudo re-redactar", note: authored.error ?? "" });
  }
  // 3) re-verificar fidelidad (no bloquea acá, pero deja el grounding al día)
  await verifyGrounding(authored);
  // 4) re-supervisar relevancia y persistir
  const rel = await superviseRelevance(skillId, authored);
  saveRelevance(skillId, rel);
  return rel;
}
