import { CONFIG } from "../config.js";
import { verifyChapterClaims, type ProseClaim } from "./verify-chapter.js";
import type { ChapterSeed, PracticeItem } from "../types.js";
import type { ClaimReviewInput } from "../book/claim-review-store.js";

/**
 * GATE INDEPENDIENTE DE LA PRÁCTICA. La práctica (respuestas + CLI de las explicaciones) es la sección de mayor
 * apuesta del libro y hasta ahora NO se verificaba (se trataba como "editorial"). Acá se verifica en un modelo
 * INDEPENDIENTE del autor/enrich (`CONFIG.practiceVerifyModel`, p.ej. gpt-5.6-terra) reutilizando TODO el pipeline
 * de grounding (corpus scopeado + hoja de datos duros + experto escéptico + doble-voto fail-closed) vía
 * `verifyChapterClaims({ claims, model })`. Los ítems cuya respuesta/CLI resulta CONTRADICHA se DROPEAN (la práctica
 * es editorial → se quita el ítem malo, NO se bloquea el capítulo) y se encolan a revisión humana.
 */
const clip = (s: unknown, n: number): string => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

/** Un claim por ítem que codifica la RESPUESTA/SECUENCIA/VALORES CORRECTOS + su justificación (incluye el CLI, que es
 *  lo que más alucina) para que el verificador independiente juzgue si lo marcado como correcto realmente lo es.
 *  Maneja los formatos del examen: single (opción), multi (varias), order (secuencia az), build (valores de huecos). */
export function extractPracticeClaims(practice: PracticeItem[]): ProseClaim[] {
  const claims: ProseClaim[] = [];
  practice.forEach((p, i) => {
    const id = `pr${i + 1}`;
    const q = clip(p.question, 360);
    const why = clip(p.explanation, 320);
    if (!q) return;
    const kind = p.kind ?? "single";
    if (kind === "order") {
      const steps = (p.steps ?? []).map((s) => clip(s, 120)).filter(Boolean);
      if (steps.length < 2) return;
      claims.push({ id, text: `Escenario: «${q}». La SECUENCIA CORRECTA de pasos es, en este orden: ${steps.map((s, k) => `${k + 1}) ${s}`).join("; ")}. Justificación: ${why}` });
    } else if (kind === "build") {
      const fills = (p.blanks ?? []).map((b, k) => `hueco ${k + 1} = «${clip(b.options?.[b.correctIndex] ?? "", 100)}»`).filter((f) => !f.endsWith("«»"));
      if (!fills.length) return;
      claims.push({ id, text: `Para completar el código «${clip(p.template ?? "", 280)}» (${q}), los valores CORRECTOS de los huecos son: ${fills.join("; ")}. Justificación: ${why}` });
    } else if (kind === "multi") {
      const opts = p.options ?? [];
      const correct = (p.correctIndices ?? []).map((k) => clip(opts[k] ?? "", 120)).filter(Boolean);
      if (!correct.length) return;
      claims.push({ id, text: `Escenario: «${q}». Las respuestas CORRECTAS (todas las que aplican) son: ${correct.map((c) => `«${c}»`).join(", ")}. Justificación: ${why}` });
    } else {
      const correct = (p.options ?? [])[p.correctIndex] ?? "";
      if (!correct) return;
      claims.push({ id, text: `En el escenario: «${q}», la respuesta CORRECTA es «${clip(correct, 220)}». Justificación: ${why}` });
    }
  });
  return claims;
}

export interface PracticeVerifyResult { kept: PracticeItem[]; reviews: ClaimReviewInput[]; checked: number; dropped: number }

/** Verifica la práctica de un capítulo de forma INDEPENDIENTE y DROPEA los ítems cuya respuesta/CLI el verificador
 *  halla incorrecta (contradicted). NO bloquea el capítulo. Devuelve la práctica saneada + los ítems a revisar. */
export async function verifyPractice(chapterId: string, seed: ChapterSeed): Promise<PracticeVerifyResult> {
  const practice = seed.practice ?? [];
  if (!practice.length) return { kept: [], reviews: [], checked: 0, dropped: 0 };
  const claims = extractPracticeClaims(practice);
  if (!claims.length) return { kept: practice, reviews: [], checked: 0, dropped: 0 };

  const g = await verifyChapterClaims(chapterId, seed, { claims, model: CONFIG.practiceVerifyModel });
  const byId = new Map(g.checks.map((c) => [c.claimId, c] as const));
  const kept: PracticeItem[] = [];
  const reviews: ClaimReviewInput[] = [];
  let dropped = 0;
  practice.forEach((item, i) => {
    const check = byId.get(`pr${i + 1}`);
    if (check?.verdict === "contradicted") {
      // Respuesta/CLI incorrecta confirmada → DROP + encolar (no se muestra un ejercicio con la respuesta mal).
      dropped++;
      reviews.push({ claimText: `[práctica] ${clip(item.question, 160)}`, verdict: "contradicted", note: check.note || "respuesta/CLI incorrecta según el verificador independiente", sourceId: check.sourceId ?? null, kind: "practice" });
    } else {
      kept.push(item);
      // 'wrong' NO confirmado por el 2º voto → se conserva el ítem pero se surfacea para revisión humana.
      if ((check?.note || "").startsWith("[revisar")) {
        reviews.push({ claimText: `[práctica] ${clip(item.question, 160)}`, verdict: check!.verdict, note: check!.note, sourceId: check!.sourceId ?? null, kind: "practice" });
      }
    }
  });
  return { kept, reviews, checked: claims.length, dropped };
}
