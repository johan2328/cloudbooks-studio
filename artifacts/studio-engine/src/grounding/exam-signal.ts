import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";

/**
 * BUFFER 3 — SEÑAL de comportamiento del examen por MÓDULO, destilada de fuentes de comunidad (ExamTopics,
 * YouTube; preferentemente del último mes). Es SEÑAL, NO un banco de preguntas: guarda los ARQUETIPOS de
 * pregunta, las TRAMPAS que explota y los SUBTEMAS calientes (énfasis) — nunca ítems verbatim. La consume el
 * PSICÓMETRA (`analyzeModule`) para modelar CÓMO evalúa el examen; el autor genera práctica ORIGINAL a partir
 * de ese perfil. Per-cert (`_exam-signal.{certId}.json`). Editable/re-coleccionable (la señal caduca).
 */
export interface ExamSignal {
  archetypes: string[];   // tipos/formas de pregunta que usa el examen para este tema
  traps: string[];        // confusiones o distractores que el examen explota
  hotTopics: string[];    // subtemas más preguntados (dónde poner el foco)
  emphasis?: string;      // 1 frase: dónde carga el examen en este módulo
  sources?: string[];     // procedencia de la señal (para trazabilidad; NO se citan en el libro)
  gatheredAt?: string;    // ISO; para saber si la señal está fresca (último mes)
}

function storePath(): string {
  return path.join(CONFIG.outputRoot, `_exam-signal.${CONFIG.certId}.json`);
}
function loadAll(): Record<string, ExamSignal> {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Record<string, ExamSignal>; } catch { return {}; }
}

/** Señal del módulo (null si no hay). */
export function getExamSignal(moduleId: string): ExamSignal | null {
  return loadAll()[moduleId] ?? null;
}

export function allExamSignal(): Record<string, ExamSignal> {
  return loadAll();
}

/** Bloque de prompt (español) con la señal del módulo para inyectar en el psicómetra. "" si no hay señal. */
export function examSignalBlock(moduleId: string): string {
  const s = getExamSignal(moduleId);
  if (!s) return "";
  const parts: string[] = [];
  if (s.archetypes?.length) parts.push(`- Arquetipos de pregunta observados: ${s.archetypes.join(" · ")}`);
  if (s.traps?.length) parts.push(`- Trampas/distractores que explota: ${s.traps.join(" · ")}`);
  if (s.hotTopics?.length) parts.push(`- Subtemas más preguntados: ${s.hotTopics.join(" · ")}`);
  if (s.emphasis) parts.push(`- Énfasis: ${s.emphasis}`);
  if (!parts.length) return "";
  return `\n\nSEÑAL DE COMUNIDAD (ExamTopics/YouTube — cómo se comporta el examen en la PRÁCTICA; usala para calibrar arquetipos, trampas y énfasis. Es SEÑAL, NO preguntas: NO reproduzcas ítems, modelá el PERFIL):\n${parts.join("\n")}`;
}

/** Setea (MERGE) la señal por módulo: `map` = {moduleId: ExamSignal}. Estampa gatheredAt si falta. */
export function setExamSignal(map: Record<string, ExamSignal>, at?: string): Record<string, ExamSignal> {
  const all = loadAll();
  for (const [mid, sig] of Object.entries(map)) {
    if (!sig) { delete all[mid]; continue; }
    all[mid] = {
      archetypes: (sig.archetypes ?? []).map(String),
      traps: (sig.traps ?? []).map(String),
      hotTopics: (sig.hotTopics ?? []).map(String),
      emphasis: sig.emphasis ? String(sig.emphasis) : undefined,
      sources: (sig.sources ?? []).map(String),
      gatheredAt: sig.gatheredAt ?? at,
    };
  }
  atomicWriteFileSync(storePath(), JSON.stringify(all, null, 2), "exam-signal");
  return all;
}
