import fs from "node:fs";
import path from "node:path";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { ingestUrl } from "./ingest.js";
import { listSources } from "./source-store.js";
import { examSignalBlock } from "./exam-signal.js";
import { atomicWriteFileSync, withLock } from "../fs-safe.js";
import { getModule, getSkill } from "../skills/ai-200-outline.js";
import type { PsychometricsResult, PsychoProfile } from "../types.js";

/**
 * PSICOMETRISTA (agente nuevo del Master Book). Modela CÓMO evalúa el examen un
 * módulo —no el contenido—: verbos medidos, arquetipos de pregunta, niveles
 * cognitivos y trampas que explota. Fuente: la guía de estudio oficial (skills-
 * measured) + el estilo conocido del AI-200. Honesto: el examen no publica ítems
 * → esto es un MODELO. Cacheado por módulo. Guía al autor del relato.
 */
const PSYCHO_VERSION = "psycho-v1";
// URL de la guía de estudio oficial POR CERT (patrón MS Learn `.../study-guides/{code}`); AI-200 = idéntica.
const studyGuideSlug = (): string => `study-guides/${CONFIG.certId.toLowerCase()}`;
const studyGuideUrl = (): string => `https://learn.microsoft.com/en-us/credentials/certifications/resources/${studyGuideSlug()}`;

const SYS = "Sos psicómetra de exámenes de certificación cloud (Microsoft). Analizás CÓMO evalúa el examen un tema —no el contenido—: qué verbos/acciones mide, qué formatos de pregunta usa, qué nivel cognitivo exige y qué confusiones explota. Sos honesto: el examen no publica sus ítems, así que MODELÁS desde las skills-measured oficiales y el estilo conocido del examen. Respondés SOLO JSON válido, en español neutro (sin voseo).";

function cachePath(): string {
  return path.join(CONFIG.outputRoot, `_psychometrics.${CONFIG.certId}.${CONFIG.format}.json`);
}
function readCache(): Record<string, PsychometricsResult> {
  try { return JSON.parse(fs.readFileSync(cachePath(), "utf8")) as Record<string, PsychometricsResult>; } catch { return {}; }
}
function writeCache(c: Record<string, PsychometricsResult>): void {
  atomicWriteFileSync(cachePath(), JSON.stringify(c, null, 2), "psychometrics-cache");
}

export async function analyzeModule(moduleId: string, force = false): Promise<PsychometricsResult> {
  const mod = getModule(moduleId);
  const base = (extra: Partial<PsychometricsResult>): PsychometricsResult =>
    ({ outcome: "failed", model: null, moduleId, profile: null, cached: false, error: null, ...extra });
  if (!mod) return base({ error: `modulo_desconocido:${moduleId}` });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });

  const key = `${moduleId}|${PSYCHO_VERSION}`;
  return withLock(`psycho:${key}`, async (): Promise<PsychometricsResult> => {
    const cache = readCache();
    if (!force && cache[key]) return { ...cache[key], cached: true };

    const openai = getOpenAI();
    if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
    if (wouldExceedCap(0.02)) return base({ error: "Tope mensual de costo alcanzado (texto)." });

    // Guía de estudio oficial (skills-measured) = fuente del comportamiento del examen.
    let guide = listSources().find((s) => (s.url ?? "").includes(studyGuideSlug()));
    if (!guide || !guide.text) { try { const r = await ingestUrl(studyGuideUrl(), "mslearn"); if (r.ok && r.source) guide = r.source; } catch { /* sigue con lo que haya */ } }
    const guideText = (guide?.text ?? "").slice(0, 6000);
    const units = mod.skillIds.map((id) => getSkill(id)?.title).filter(Boolean).join("; ");
    const CODE = CONFIG.certId.toUpperCase();

    const user = `Módulo del examen ${CODE}: "${mod.moduleTitle}" (ruta: ${mod.domainLabel}).
Unidades del módulo: ${units}

GUÍA DE ESTUDIO OFICIAL (skills-measured del ${CODE}), fuente del comportamiento del examen:
${guideText || `(no disponible; modelá desde el estilo conocido del ${CODE})`}${examSignalBlock(moduleId)}

Modelá el PERFIL PSICOMÉTRICO de este módulo (cómo lo evalúa el examen). Devolvé SOLO JSON:
{
 "measuredVerbs": ["configure","create","troubleshoot","choose", ...],
 "questionArchetypes": ["caso de escenario","elegir la acción correcta","completar código","ordenar pasos", ...],
 "cognitiveLevels": ["recordar","aplicar","analizar","evaluar", ...],
 "commonTraps": ["confusión frecuente que el examen explota", ...],
 "reasoningGoal": "1-2 frases: qué razonamiento debe construir el lector para rendir bien este módulo"
}`;
    try {
      const res = await openai.chat.completions.create({
        model: CONFIG.authorModel,
        messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
        response_format: { type: "json_object" }, ...chatModelParams(CONFIG.authorModel, 900, 0.3),
      });
      recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", pageId: moduleId, label: "psychometrics" });
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
      const arr = (v: unknown): string[] => Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];
      const profile: PsychoProfile = {
        measuredVerbs: arr(raw.measuredVerbs),
        questionArchetypes: arr(raw.questionArchetypes),
        cognitiveLevels: arr(raw.cognitiveLevels),
        commonTraps: arr(raw.commonTraps),
        reasoningGoal: String(raw.reasoningGoal ?? "").trim(),
      };
      const result: PsychometricsResult = { outcome: "real", model: CONFIG.authorModel, moduleId, profile, cached: false, error: null };
      const fresh = readCache(); fresh[key] = result; writeCache(fresh);
      return result;
    } catch (err) {
      return base({ outcome: "failed", model: CONFIG.authorModel, error: String((err as Error)?.message ?? err) });
    }
  });
}
