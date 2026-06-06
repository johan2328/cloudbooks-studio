import type { VisualAtlasPageData, VisualModule } from "../../lib/visual-atlas-types";
import type {
  DensityPlan,
  EditorialCard,
  EditorialCardDeck,
  EditorialCardRole,
  EditorialCardZone,
  FormatAffinity,
  VisualAtlasLayoutMode,
  VisualAtlasLayoutRecipe,
} from "./types";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundOne(value: number): number {
  return Number(value.toFixed(1));
}

function compact(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const sentence = normalized.match(/^.{1,180}?[.!?](\s|$)/)?.[0]?.trim();
  const source = sentence && sentence.length <= maxChars ? sentence : normalized;
  return source.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
}

function normalizeSemantic(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()[\]{}"'`´]/g, " ")
    .replace(/\b(mito|correccion|respuesta|pregunta|guia|correcta|opcion)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSemanticallyRepeated(value: string, references: string[]): boolean {
  const normalized = normalizeSemantic(value);
  if (normalized.length < 18) return false;
  return references.some((reference) => {
    const ref = normalizeSemantic(reference);
    if (ref.length < 18) return false;
    return normalized === ref || normalized.includes(ref) || ref.includes(normalized);
  });
}

function diagramIntentFor(moduleItem: VisualModule, fallback: string): string {
  const text = `${moduleItem.title} ${moduleItem.description}`.toLowerCase();
  if (moduleItem.recommendedDiagram) return moduleItem.recommendedDiagram;
  if (/(tier|sku|basic|standard|premium|compar)/.test(text)) return "matriz comparativa con checks, excepciones y decision de examen";
  if (/(build|push|task|yaml|trigger|automat)/.test(text)) return "flujo operacional con origen, comando, ejecucion y resultado";
  if (/(identity|identidad|token|rol|permiso|acrpull|acrpush)/.test(text)) return "arbol de decision de identidad y permiso minimo";
  if (/(dns|network|firewall|endpoint|private|vnet|red)/.test(text)) return "boundary diagram de red con ruta permitida y bloqueo";
  if (/(geo|region|zone|zona|replic|map)/.test(text)) return "mapa regional con decision de resiliencia y latencia";
  if (/(retention|cleanup|policy|lifecycle|limpieza|ciclo)/.test(text)) return "ciclo operativo con politica, accion automatica y resultado";
  return fallback;
}

function roleFor(moduleItem: VisualModule): EditorialCardRole {
  const text = `${moduleItem.title} ${moduleItem.description}`.toLowerCase();
  if (/(tier|sku|basic|standard|premium|compar)/.test(text)) return "comparison";
  if (/(identity|identidad|token|rol|permiso|acrpull|acrpush|decision)/.test(text)) return "decision";
  if (/(build|push|task|yaml|trigger|automat|flow|flujo)/.test(text)) return "flow";
  if (/(dns|network|firewall|endpoint|private|vnet|red|geo|region|map)/.test(text)) return "flow";
  return "concept";
}

function scoreCard(card: Pick<EditorialCard, "role" | "claim" | "diagramIntent" | "examSignal" | "formatAffinity">): number {
  const diagramBonus = card.diagramIntent.length > 28 ? 1.1 : 0.2;
  const examBonus = card.examSignal.length > 18 ? 0.8 : 0;
  const roleBonus = ["decision", "comparison", "flow", "trap", "autocheck"].includes(card.role) ? 0.8 : 0.35;
  const reuseBonus = Math.min(0.8, card.formatAffinity.length * 0.16);
  const claimPenalty = card.claim.length < 38 ? 0.45 : 0;
  const genericDiagramPenalty = card.diagramIntent.toLowerCase().includes("mini-diagrama editorial") ? 0.5 : 0;
  return roundOne(clamp(7.1 + diagramBonus + examBonus + roleBonus + reuseBonus - claimPenalty - genericDiagramPenalty, 5.8, 9.8));
}

function makeCard(args: {
  pageId: string;
  id: string;
  role: EditorialCardRole;
  targetZone: EditorialCardZone;
  title: string;
  claim: string;
  explanation: string;
  diagramIntent: string;
  examSignal: string;
  formatAffinity: FormatAffinity[];
  sourceRefs?: string[];
}): EditorialCard {
  const base = {
    pageId: args.pageId,
    id: args.id,
    role: args.role,
    status: "candidate" as const,
    targetZone: args.targetZone,
    title: compact(args.title, 58),
    claim: compact(args.claim, 118),
    explanation: compact(args.explanation, 190),
    diagramIntent: compact(args.diagramIntent, 150),
    examSignal: compact(args.examSignal, 120),
    sourceRefs: args.sourceRefs ?? ["seed-editorial"],
    formatAffinity: args.formatAffinity,
  };
  const densityScore = scoreCard(base);
  return {
    ...base,
    densityScore,
    visualRisk: densityScore >= 8.8 ? "low" : densityScore >= 7.4 ? "medium" : "high",
  };
}

export function buildEditorialCardDeck(pageId: string, data: VisualAtlasPageData): EditorialCardDeck {
  const moduleCards = data.visualModules.slice(0, 4).map((moduleItem, idx) => makeCard({
    pageId,
    id: `m${idx + 1}-${moduleItem.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28)}`,
    role: roleFor(moduleItem),
    targetZone: "primary",
    title: moduleItem.title,
    claim: moduleItem.idea ?? moduleItem.description,
    explanation: moduleItem.description,
    diagramIntent: diagramIntentFor(moduleItem, "mini-diagrama causa-efecto con takeaways legibles"),
    examSignal: moduleItem.examSignal ?? data.traps[0]?.wrong ?? data.guideQuestion,
    formatAffinity: ["visual_atlas", "master_book", "cheat_sheet", "rapid_review"],
  }));

  const trapCards = data.traps.slice(0, 3).map((trap, idx) => makeCard({
    pageId,
    id: `trap-${idx + 1}`,
    role: "trap",
    targetZone: idx === 0 ? "rail" : "reserve",
    title: `Mito ${idx + 1}`,
    claim: trap.wrong,
    explanation: trap.correction,
    diagramIntent: "contraste visual mito versus correccion con senal de peligro discreta",
    examSignal: trap.wrong,
    formatAffinity: ["visual_atlas", "exam_traps", "question_bank", "rapid_review"],
  }));

  const answer = data.autocheck.options[data.autocheck.correctOption] ?? "respuesta correcta";
  const validationCard = makeCard({
    pageId,
    id: "autocheck-core",
    role: "autocheck",
    targetZone: "rail",
    title: "Validacion",
    claim: data.autocheck.question,
    explanation: `${answer}: ${data.autocheck.explanation}`,
    diagramIntent: "seleccion de respuesta con justificacion breve y descarte de distractores",
    examSignal: answer,
    formatAffinity: ["visual_atlas", "question_bank", "rapid_review"],
  });

  const guideCard = makeCard({
    pageId,
    id: "guide-decision",
    role: "exam_signal",
    targetZone: "complement",
    title: "Decision de examen",
    claim: data.guideQuestion,
    explanation: compact(data.context, 170),
    diagramIntent: "regla de decision compacta que conecta pregunta guia con el nucleo visual",
    examSignal: data.guideQuestion,
    formatAffinity: ["visual_atlas", "exam_traps", "cheat_sheet", "rapid_review"],
  });

  const contextCard = makeCard({
    pageId,
    id: "context-insight",
    role: "micro_case",
    targetZone: "complement",
    title: "Caso minimo",
    claim: compact(data.context, 118),
    explanation: "Usa este caso como puente entre el diagrama y una pregunta de seleccion multiple.",
    diagramIntent: "micro-caso con condicion, decision y consecuencia",
    examSignal: data.traps[1]?.wrong ?? data.guideQuestion,
    formatAffinity: ["visual_atlas", "master_book", "question_bank"],
  });

  const repetitionRefs = [
    data.guideQuestion,
    data.autocheck.question,
    data.autocheck.options[data.autocheck.correctOption] ?? "",
    data.autocheck.explanation,
    ...data.traps.flatMap((trap) => [trap.wrong, trap.correction]),
  ];

  const cards = [...moduleCards, guideCard, contextCard, ...trapCards, validationCard]
    .map((card) => {
      if (card.targetZone !== "complement") return card;
      const repeated = isSemanticallyRepeated(card.claim, repetitionRefs) || isSemanticallyRepeated(card.examSignal, repetitionRefs);
      return repeated
        ? {
          ...card,
          targetZone: "reserve" as const,
          densityScore: roundOne(Math.max(5.8, card.densityScore - 1.2)),
          visualRisk: "high" as const,
        }
        : card;
    })
    .sort((a, b) => b.densityScore - a.densityScore)
    .slice(0, 14);
  const selectedCardIds = cards
    .filter((card) => card.targetZone === "primary" || card.targetZone === "complement" || card.targetZone === "rail")
    .map((card) => card.id)
    .slice(0, 8);
  const rejectedCardIds = cards.filter((card) => !selectedCardIds.includes(card.id)).map((card) => card.id);

  return {
    version: "editorial-card-deck-v1",
    pageId,
    source: "seed",
    generatedAt: new Date().toISOString(),
    cards: cards.map((card) => ({
      ...card,
      status: selectedCardIds.includes(card.id) ? "selected" : "rejected",
      targetZone: selectedCardIds.includes(card.id) ? card.targetZone : "reserve",
    })),
    selectedCardIds,
    rejectedCardIds,
  };
}

function chooseLayoutMode(primaryCards: EditorialCard[], complementCards: EditorialCard[], railCards: EditorialCard[], problems: string[]): VisualAtlasLayoutMode {
  const hasDominantDecision = primaryCards.some((card) => card.role === "decision" || card.role === "comparison" || card.role === "flow");
  if (railCards.length >= 3 && !problems.some((problem) => problem.includes("baja densidad"))) return "Rail Dense";
  if (railCards.length >= 2 && problems.some((problem) => problem.includes("rail"))) return "Rail Compact";
  if (primaryCards.length >= 4 && complementCards.length >= 2) return "4P+2C";
  if (hasDominantDecision && complementCards.length >= 2) return "3P+1D+2C";
  return "4P";
}

export function evaluateUsefulDensity(data: VisualAtlasPageData, deck: EditorialCardDeck): DensityPlan {
  const cards = deck.cards;
  const primaryCards = cards.filter((card) => card.status === "selected" && card.targetZone === "primary").slice(0, 4);
  const complementCards = cards.filter((card) => card.status === "selected" && card.targetZone === "complement").slice(0, 2);
  const railCards = cards.filter((card) => card.status === "selected" && card.targetZone === "rail").slice(0, 3);
  const genericPrimary = primaryCards.filter((card) => card.claim.length < 48 || card.diagramIntent.length < 34).length;
  const weakComplementCards = complementCards.filter((card) =>
    card.sourceRefs.every((ref) => ref === "seed-editorial" || ref === "composer-draft")
    || card.visualRisk !== "low"
    || card.claim.length < 58
  ).length;
  const repeatedGuide = cards.some((card) =>
    card.role !== "exam_signal"
    && card.claim.toLowerCase().replace(/[?¿]/g, "") === data.guideQuestion.toLowerCase().replace(/[?¿]/g, "")
  );
  const railTextLoad =
    data.traps.reduce((sum, item) => sum + item.wrong.length + item.correction.length, 0)
    + data.autocheck.question.length
    + data.autocheck.explanation.length
    + data.autocheck.discardNotes.join(" ").length;

  const problems: string[] = [];
  if (primaryCards.length < 4) problems.push("faltan cuatro cartas primarias para sostener el upper visual");
  if (genericPrimary > 0) problems.push(`${genericPrimary} carta(s) primaria(s) tienen poco material diagramable`);
  if (complementCards.length < 2 || weakComplementCards > 0) problems.push("faltan cartas complementarias con grounding real; no usar filler HTML");
  if (repeatedGuide) problems.push("hay repeticion entre pregunta guia y contenido de cartas");
  if (railTextLoad < 470) problems.push("rail inferior con baja densidad util; no debe crecer para cerrar la pagina");

  const groundingNeeded = genericPrimary > 0 || cards.length < 8 || complementCards.length < 2 || weakComplementCards > 0;
  const avgSelected = cards
    .filter((card) => card.status === "selected")
    .reduce((sum, card, _, arr) => sum + card.densityScore / Math.max(1, arr.length), 0);
  const status = railTextLoad < 470
    ? "rail_first"
    : groundingNeeded
      ? "grounding_required"
      : "ready";
  const scoreCap = groundingNeeded ? 8.7 : status === "rail_first" ? 8.8 : 9.6;
  const score = roundOne(clamp(avgSelected - problems.length * 0.26 + complementCards.length * 0.12, 6.2, scoreCap));
  const usefulDensityScore = roundOne(clamp(score - (railTextLoad < 470 ? 0.55 : 0), 6.0, Math.min(9.5, scoreCap)));
  const mode = chooseLayoutMode(primaryCards, complementCards, railCards, problems);
  const railStrategy = mode === "Rail Dense" || railTextLoad > 780
    ? "dense"
    : mode === "Rail Compact" || railTextLoad < 560
      ? "compact"
      : "standard";
  const layoutRecipe: VisualAtlasLayoutRecipe = {
    mode,
    primaryCardIds: primaryCards.map((card) => card.id),
    complementaryCardIds: complementCards.map((card) => card.id),
    railCardIds: railCards.map((card) => card.id),
    upperCardCount: primaryCards.length + complementCards.length,
    railStrategy,
    promptDirective: mode === "4P+2C"
      ? "Use four dominant cards plus two compact complementary cards inside the upper image; complementary cards must add new exam value, not repeat guide/autocheck."
      : mode === "3P+1D+2C"
        ? "Use three primary cards, one dominant decision/map/comparison card and two compact complementary cards inside the upper image."
        : mode === "Rail Dense"
          ? "Use four strong primary cards and keep the rail dense only because it contains real exam material."
          : mode === "Rail Compact"
            ? "Keep traps/autocheck compact; solve useful density inside the upper visual and selected cards, not with HTML filler."
            : "Use four strong primary cards with large readable labels and no fake filler.",
    reason: problems[0] ?? "deck con densidad suficiente para recomposicion controlada",
  };

  return {
    version: "useful-density-agent-v1",
    targetScore: 9.5,
    score,
    usefulDensityScore,
    status,
    groundingNeeded,
    groundingRationale: groundingNeeded
      ? "Hay tarjetas genericas o poco diagramables; grounding puntual debe aportar insight, ejemplo, trampa y regla causal."
      : "El deck base alcanza para componer sin grounding adicional.",
    nextAction: status === "rail_first"
      ? "compact_rail"
      : groundingNeeded
        ? "run_selective_grounding"
        : "regenerate_with_deck",
    problems,
    recommendations: [
      railStrategy === "compact"
        ? "Mantener rail compacto; no usar traps/autocheck para absorber aire de pagina."
        : railStrategy === "dense"
          ? "Rail denso permitido solo porque hay lectura real de examen."
          : "Rail estandar permitido solo si aporta lectura real.",
      complementCards.length >= 2
        ? "Usar dos cartas complementarias dentro del upper visual, no como cajas HTML de relleno."
        : "Si persiste hueco, pedir grounding selectivo para crear cartas complementarias reales.",
      "Regenerar upper desde cartas seleccionadas; no escalar ni estirar composicion previa.",
    ],
    rejectedCards: cards
      .filter((card) => card.status === "rejected")
      .map((card) => ({ cardId: card.id, reason: card.densityScore < 8 ? "baja densidad o poca reutilizacion" : "fuera del cupo editorial de la pagina" })),
    layoutRecipe,
  };
}

export function buildDensityPackage(pageId: string, data: VisualAtlasPageData): {
  editorialDeck: EditorialCardDeck;
  densityPlan: DensityPlan;
  layoutRecipe: VisualAtlasLayoutRecipe;
} {
  const editorialDeck = data.editorialDeck ?? buildEditorialCardDeck(pageId, data);
  const densityPlan = data.densityPlan ?? evaluateUsefulDensity(data, editorialDeck);
  return {
    editorialDeck,
    densityPlan,
    layoutRecipe: data.layoutRecipe ?? densityPlan.layoutRecipe,
  };
}
