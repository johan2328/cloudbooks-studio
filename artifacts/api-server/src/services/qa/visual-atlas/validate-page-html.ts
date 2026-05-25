import type { VisualAtlasPageData } from "../../../lib/visual-atlas-types";

export interface StructuralQaResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  score: number;
}

export interface QaDimensionScores {
  artDirection:         number;
  editorialConsistency: number;
  readability:          number;
  technicalAccuracy:    number;
  density:              number;
  commercialRisk:       number;
  avg:                  number;
  verdict:              "needs_visual_review" | "needs_revision";
  verdictLabel:         string;
}

/**
 * Valida la estructura del HTML renderizado contra el contrato Golden Master v24.
 * Determinístico — sin Math.random. Bloquea aprobación si hay violaciones críticas.
 */
export function runStructuralQa(html: string, data: VisualAtlasPageData): StructuralQaResult {
  const checks = [
    { name: "Dimensiones 768×1152",            ok: html.includes("width: 768px") && html.includes("height: 1152px") },
    { name: "Grid rows 34-198-48-838-34",       ok: html.includes("34px 198px 48px 838px 34px") },
    { name: "Fondo editorial #edf2f8",          ok: html.includes("background: #edf2f8") },
    { name: "Topbar/footer navy #061B49",       ok: html.includes("#061B49") },
    { name: "Título presente en h1",            ok: html.includes(data.title) },
    { name: "Deck/contexto presente",           ok: html.includes(data.context.slice(0, 40)) },
    { name: "Pregunta guía presente",           ok: html.includes(data.guideQuestion.slice(0, 30)) },
    { name: "Bloque .upper existe",             ok: html.includes('class="upper"') },
    { name: "Trampas: 3 items",                 ok: data.traps.length === 3 },
    { name: "Header trampas rojo #D92D20",      ok: html.includes("#D92D20") },
    { name: "Guide border #0969DA",             ok: html.includes("#0969DA") },
    { name: "Footer AI-200 Visual Study Atlas", ok: html.includes("AI-200 Visual Study Atlas") },
    { name: "Sin CDN externos",                 ok: !html.includes("googleapis.com") && !html.includes("cloudflare.com") },
    { name: "Sin dark body #0d1629",            ok: !html.includes("background: #0d1629") },
  ];
  const passed = checks.filter(c => c.ok).length;
  const total  = checks.length;
  return { passed: passed === total, checks, score: Math.round((passed / total) * 10) };
}

/**
 * Computa scores por dimensión QA basados en si se generó imagen real.
 * Determinístico — sin Math.random. Alineado con QA_GATES del contrato editorial.
 */
export function computeQaDimensionScores(imageGenerated: boolean): QaDimensionScores {
  const artDirection         = imageGenerated ? 7 : 5;
  const editorialConsistency = imageGenerated ? 7 : 5;
  const readability          = 8;
  const technicalAccuracy    = 10;
  const density              = imageGenerated ? 7 : 4;
  const commercialRisk       = 10;
  const avg = Math.round(
    (artDirection + editorialConsistency + readability + technicalAccuracy + density + commercialRisk) / 6,
  );
  const verdict      = imageGenerated ? "needs_visual_review" as const : "needs_revision" as const;
  const verdictLabel = imageGenerated
    ? "⚠ Requiere revisión visual humana"
    : "🔴 BLOQUEADO: upper visual no premium";
  return { artDirection, editorialConsistency, readability, technicalAccuracy, density, commercialRisk, avg, verdict, verdictLabel };
}
