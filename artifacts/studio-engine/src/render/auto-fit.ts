import { renderComposerPage } from "./render-composer-page.js";
import { renderInspect } from "./headless-qa.js";
import type { FitParams, PageSeed, Recipe, RenderQa, StructuralCheck } from "../types.js";

/**
 * AUTO-FIT: renderiza, mide el truncado real (headless) y, si algo no entra,
 * aplica ajustes progresivos (más líneas de deck, fuente un toque menor, rail
 * más compacto) y vuelve a medir, hasta que ENTRA de verdad. Así "salir premium"
 * funciona solo. Sin headless, usa el render por defecto (no puede medir).
 */
// La escalera prueba de "más rico" a "más comprimido" y se queda con el PRIMERO
// que entra de verdad (medido headless). Arranca CON el párrafo de síntesis: en
// páginas con aire (p.ej. la 1) entra y llena el espacio explicando las tarjetas,
// y de paso aprieta el rail. En páginas densas el síntesis no entra → la escalera
// lo recorta y luego comprime el rail. Todo automático, sin intervención humana.
// GEOMETRÍA pura (sin síntesis): la escalera histórica. Mide y comprime hasta entrar.
const GEOMETRY_LADDER: FitParams[] = [
  {},                                                                 // default (deck 14/3 líneas)
  { deckLines: 4 },                                                   // +1 línea de contexto
  { deckFontPx: 13, deckLines: 4, expLines: 5 },                      // deck más chico
  { deckFontPx: 12, deckLines: 5, expLines: 5, railFontDelta: -0.5 }, // + rail font un toque
  { deckFontPx: 12, deckLines: 5, expLines: 5, railFontDelta: -1, railGapDelta: -1, railLeadDelta: -0.06 },   // + comprime rail (gaps/lead)
  { deckFontPx: 11, deckLines: 6, expLines: 6, railFontDelta: -1.5, railGapDelta: -2, railLeadDelta: -0.1 },  // + comprime más
  { deckFontPx: 11, deckLines: 7, expLines: 7, railFontDelta: -2, railGapDelta: -3, railLeadDelta: -0.13 },   // último recurso (rail al mínimo legible)
];

// Escalera CON síntesis: aprieta el rail (y achica la imagen al cap del director)
// para hacerle lugar al párrafo. CLAVE: el cap de imagen va SOLO en los peldaños
// con síntesis; el fallback es la geometría pura SIN cap → si la síntesis no entra,
// la imagen vuelve a tamaño completo y el rail se llena (sin huecos huérfanos).
function synthLadder(imageMaxH?: number): FitParams[] {
  const cap = imageMaxH ? { imageMaxH } : {};
  return [
    { synthLines: 4, railFontDelta: -1.5, railGapDelta: -3, railLeadDelta: -0.13, ...cap },
    { synthLines: 3, railFontDelta: -1.5, railGapDelta: -3, railLeadDelta: -0.13, ...cap },
    ...GEOMETRY_LADDER,   // fallback: imagen completa, sin síntesis, sin cap
  ];
}

export interface FitResult {
  html: string;
  structural: { passed: boolean; score: number; checks: StructuralCheck[] };
  renderQa: RenderQa;
  fitApplied: FitParams;
  attempts: number;
  fitted: boolean;
}

export async function autoFit(
  seed: PageSeed,
  recipe: Recipe,
  imageUrl: string | undefined,
  directive?: { synthesisText?: string; imageMaxH?: number },
): Promise<FitResult> {
  // Sin texto del agente → geometría pura. Con texto → escalera con síntesis (y
  // cap de imagen si el director lo pidió), con fallback a geometría si no entra.
  const synthesisText = directive?.synthesisText?.trim() || undefined;
  const ladder = synthesisText ? synthLadder(directive?.imageMaxH) : GEOMETRY_LADDER;
  let last: { html: string; structural: FitResult["structural"]; renderQa: RenderQa; fit: FitParams } | null = null;
  for (let i = 0; i < ladder.length; i++) {
    const fit = ladder[i]!;
    // Solo pasamos el texto de síntesis cuando el peldaño la enciende (synthLines>0);
    // en el fallback geométrico no, así no arrastra cap ni texto.
    const { html, structural } = renderComposerPage(seed, recipe, { imageUrl, fit, synthesisText: fit.synthLines ? synthesisText : undefined });
    const renderQa = await renderInspect(html);
    last = { html, structural, renderQa, fit };
    if (!renderQa.available || !renderQa.overflow) {
      return { html, structural, renderQa, fitApplied: fit, attempts: i + 1, fitted: true };
    }
  }
  // Agotamos la escalera y sigue desbordando: devolvemos el mejor intento (bloqueará el gate fit).
  const f = last!;
  return { html: f.html, structural: f.structural, renderQa: f.renderQa, fitApplied: f.fit, attempts: ladder.length, fitted: false };
}
