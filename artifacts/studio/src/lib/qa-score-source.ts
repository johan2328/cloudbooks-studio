export type QaScoreMap = Record<string, number>;

export type QaScoreSource = "server" | "composer" | "none";

export interface QaScoreResolutionInput {
  serverScores: QaScoreMap | null;
  composerScores: QaScoreMap | null;
  generatedAt: string | null;
  composerUpdatedAt: string | null;
}

export interface QaScoreResolution {
  source: QaScoreSource;
  sourceLabel: string;
  sourceHint: string;
  activeScores: QaScoreMap | null;
  serverScores: QaScoreMap | null;
  composerScores: QaScoreMap | null;
  composerIsNewer: boolean;
  hasDivergence: boolean;
  serverTotal: number | null;
  composerTotal: number | null;
}

export function normalizeQaScoreToTen(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  let value = raw;
  while (value > 10) value /= 10;
  while (value < -10) value /= 10;
  value = Math.max(0, Math.min(10, value));
  return Number(value.toFixed(1));
}

export function qaScoreToHundred(raw: number): number {
  return Math.round(normalizeQaScoreToTen(raw) * 10);
}

export function normalizeQaScoreMap(scores: QaScoreMap | null): QaScoreMap | null {
  if (!scores) return null;
  const normalizedEntries = Object.entries(scores).map(([key, value]) => [key, normalizeQaScoreToTen(value)]);
  return Object.fromEntries(normalizedEntries) as QaScoreMap;
}

export function resolveQaScoreSource(input: QaScoreResolutionInput): QaScoreResolution {
  const normalizedServerScores = normalizeQaScoreMap(input.serverScores);
  const normalizedComposerScores = normalizeQaScoreMap(input.composerScores);

  const generatedAtMs = input.generatedAt ? Date.parse(input.generatedAt) : NaN;
  const composerUpdatedAtMs = input.composerUpdatedAt ? Date.parse(input.composerUpdatedAt) : NaN;

  const composerIsNewer = Number.isFinite(generatedAtMs) && Number.isFinite(composerUpdatedAtMs)
    ? composerUpdatedAtMs > generatedAtMs
    : Boolean(normalizedComposerScores);

  const source: QaScoreSource = normalizedServerScores
    ? "server"
    : normalizedComposerScores
      ? "composer"
      : "none";

  const activeScores = source === "composer"
    ? (normalizedComposerScores ?? null)
    : source === "server"
      ? (normalizedServerScores ?? null)
      : null;

  const serverTotal = normalizedServerScores?.total ?? null;
  const composerTotal = normalizedComposerScores?.total ?? null;

  const hasDivergence = composerIsNewer
    && serverTotal != null
    && composerTotal != null
    && Math.abs(composerTotal - serverTotal) >= 0.1;

  return {
    source,
    sourceLabel: source === "server" ? "QA SERVIDOR" : source === "composer" ? "DRAFT PENDIENTE" : "SIN SCORE",
    sourceHint: source === "server"
      ? (composerIsNewer && normalizedComposerScores
        ? "QA oficial persistido en servidor. El Composer tiene un draft posterior, pero no reemplaza el score hasta regenerar y medir pagina completa."
        : "Lectura consolidada desde el ultimo QA persistido en servidor.")
      : source === "composer"
        ? "El draft del Composer es mas nuevo que la ultima generacion. Regenera para consolidar este score."
        : "No hay score disponible todavia para esta pagina.",
    activeScores,
    serverScores: normalizedServerScores,
    composerScores: normalizedComposerScores,
    composerIsNewer,
    hasDivergence,
    serverTotal,
    composerTotal,
  };
}
