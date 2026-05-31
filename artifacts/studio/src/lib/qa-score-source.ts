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

export function resolveQaScoreSource(input: QaScoreResolutionInput): QaScoreResolution {
  const generatedAtMs = input.generatedAt ? Date.parse(input.generatedAt) : NaN;
  const composerUpdatedAtMs = input.composerUpdatedAt ? Date.parse(input.composerUpdatedAt) : NaN;

  const composerIsNewer = Number.isFinite(generatedAtMs) && Number.isFinite(composerUpdatedAtMs)
    ? composerUpdatedAtMs > generatedAtMs
    : Boolean(input.composerScores);

  const useComposerProjection = Boolean(input.composerScores)
    && (!input.serverScores || composerIsNewer);

  const source: QaScoreSource = useComposerProjection
    ? "composer"
    : input.serverScores
      ? "server"
      : input.composerScores
        ? "composer"
        : "none";

  const activeScores = source === "composer"
    ? (input.composerScores ?? null)
    : source === "server"
      ? (input.serverScores ?? null)
      : null;

  const serverTotal = input.serverScores?.total ?? null;
  const composerTotal = input.composerScores?.total ?? null;

  const hasDivergence = composerIsNewer
    && serverTotal != null
    && composerTotal != null
    && Math.abs(composerTotal - serverTotal) >= 0.1;

  return {
    source,
    sourceLabel: source === "server" ? "QA SERVIDOR" : source === "composer" ? "DRAFT PENDIENTE" : "SIN SCORE",
    sourceHint: source === "server"
      ? "Lectura consolidada desde el ultimo QA persistido en servidor."
      : source === "composer"
        ? "El draft del Composer es mas nuevo que la ultima generacion. Regenera para consolidar este score."
        : "No hay score disponible todavia para esta pagina.",
    activeScores,
    serverScores: input.serverScores,
    composerScores: input.composerScores,
    composerIsNewer,
    hasDivergence,
    serverTotal,
    composerTotal,
  };
}

