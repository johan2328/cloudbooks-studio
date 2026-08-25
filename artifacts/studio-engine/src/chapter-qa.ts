import { getPersistedChapter, listPersistedChapters, type PersistedChapter } from "./chapter-store.js";

/**
 * QA de PROSA del Master Book, armado DESDE el capítulo persistido (SIN re-LLM):
 * fidelidad (verify por claim), estado de grounding, relevancia (cobertura/contenido),
 * alineación psicométrica y fuentes citadas. Hermano de `qa-cockpit` (Atlas), pero
 * sobre el chapter-store en vez de los seeds/imágenes.
 */
export interface ChapterQaDossier {
  chapterId: string; chapterNumber: string; title: string; domainLabel: string;
  groundingStatus: string;
  /** Score 0-10 al persistir (null en capítulos previos a la métrica). Salud numérica de lo que embarca. */
  score: number | null;
  checks: { total: number; byVerdict: Record<string, number>; items: { field: string; text: string; verdict: string; sourceId: string | null; note: string }[] };
  sources: number;
  relevance: { status: string; score: number; coverageScore: number; contentScore: number; gaps: string[]; psychoAlignment: number | null; psychoGaps: string[] } | null;
  sections: number;
  updatedAt: string | null;
}

function dossierOf(ch: PersistedChapter): ChapterQaDossier {
  const checks = ch.provenance.checks ?? [];
  const byVerdict: Record<string, number> = {};
  for (const c of checks) byVerdict[c.verdict] = (byVerdict[c.verdict] ?? 0) + 1;
  return {
    chapterId: ch.seed.chapterId, chapterNumber: ch.seed.chapterNumber, title: ch.seed.title, domainLabel: ch.seed.domainLabel,
    groundingStatus: ch.provenance.groundingStatus,
    score: ch.provenance.score ?? null,
    checks: {
      total: checks.length, byVerdict,
      items: checks.map((c) => ({ field: c.field, text: c.text, verdict: c.verdict, sourceId: c.sourceId, note: c.note })),
    },
    sources: ch.provenance.sourceIds?.length ?? 0,
    relevance: ch.relevance
      ? { status: ch.relevance.status, score: ch.relevance.score, coverageScore: ch.relevance.coverageScore, contentScore: ch.relevance.contentScore, gaps: ch.relevance.gaps ?? [], psychoAlignment: ch.relevance.psychoAlignment ?? null, psychoGaps: ch.relevance.psychoGaps ?? [] }
      : null,
    sections: ch.seed.sections?.length ?? 0,
    updatedAt: ch.provenance.updatedAt,
  };
}

export function chapterQa(chapterId: string): ChapterQaDossier | null {
  const ch = getPersistedChapter(chapterId);
  return ch ? dossierOf(ch) : null;
}

export function chaptersQa(): ChapterQaDossier[] {
  return listPersistedChapters().map(dossierOf);
}
