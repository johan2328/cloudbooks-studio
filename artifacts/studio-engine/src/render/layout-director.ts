import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { renderShot } from "./headless-qa.js";
import type { LayoutDirective, PageSeed, Recipe } from "../types.js";

/**
 * DIRECTOR DE MAQUETACIÓN (agente). Como un director de arte sobre InDesign: mira
 * la página YA renderizada (visión) y DECIDE el juicio de diseño que una regla no
 * puede — ¿respira bien o hay aire desperdiciado? Si sobra aire, REDACTA una
 * síntesis (prosa de 3-5 líneas, no repite las tarjetas) y, si conviene, sugiere
 * achicar la imagen para hacerle lugar. La GEOMETRÍA (si entra) la valida la regla
 * después; acá solo va el criterio. El humano aprueba el resultado.
 *
 * Límites de la imagen (alto): 380–470px (el render base la deja en ~491px).
 */
const IMG_MIN = 380;
const IMG_MAX = 470;

const breathe = (rationale: string, ran = false): LayoutDirective => ({
  decision: "breathe", synthesis: null, imageMaxHeightPx: null, rationale, ran,
});

export async function directLayout(seed: PageSeed, recipe: Recipe, html: string): Promise<LayoutDirective> {
  if (!hasOpenAIKey()) return breathe("sin llave OpenAI");
  if (wouldExceedCap(0.004)) return breathe("tope de costo alcanzado");
  const openai = getOpenAI();
  if (!openai) return breathe("cliente OpenAI no disponible");

  const shot = await renderShot(html);
  if (!shot) return breathe("sin render headless (no se puede juzgar con visión)");

  const cards = seed.visualModules.slice(0, recipe.cards);
  const content = [
    `Título: ${seed.title}`,
    `Subtítulo: ${seed.subtitle}`,
    `Contexto: ${seed.context}`,
    `Tarjetas (ya están en la imagen, NO las repitas):`,
    ...cards.map((m) => `  - ${m.title}: ${m.description}`),
  ].join("\n");

  const sys =
    "Sos DIRECTOR DE ARTE/MAQUETACIÓN de una colección premium de estudio (estilo atlas visual, como un diseñador trabajando en InDesign). " +
    "Mirás una página YA renderizada y emitís una directiva de diseño. Respondés SOLO JSON.";
  const rubric =
`La página tiene: cintillo, hero (título+contexto), pregunta guía, un BLOQUE VISUAL superior grande (4 tarjetas), y abajo dos tarjetas de rail (Trampas del examen + Verificación autocheck), y footer.
Juzgá el BALANCE VERTICAL y el aire:
- Si está ajustada/llena y NO querés tocar nada → {"decision":"breathe"}.
- Si el rail se ve esparcido/aireado o la página pide un cierre → {"decision":"synthesize"}.
Si elegís synthesize:
- REDACTÁ una síntesis de 3 a 5 líneas de CONTENIDO DE ESTUDIO que enseñe la ESENCIA del tema: un take-away de nivel superior que conecte los conceptos y le sirva al que estudia para el examen. Tono editorial, afirmativo.
- PROHIBIDO ABSOLUTO: mencionar la página, la maqueta, el diseño, el "balance", el "espacio", el "vacío", "la estructura visual" o cómo se ve. NADA de meta-comentario. Solo enseñás el tema, como un párrafo de cierre de un libro.
- NO repitas los títulos ni las descripciones de las tarjetas; aportá criterio, no una lista.
- El rail suele estar lleno, así que para hacerle lugar a la síntesis CASI SIEMPRE hay que achicar un poco la imagen: devolvé imageMaxHeightPx entre ${IMG_MIN} y ${IMG_MAX} (recomendado ~440). Devolvé null SOLO si ves espacio vertical vacío evidente debajo del rail.
Contenido de la página (para anclar la síntesis, en español):
${content}
Devolvé EXACTO: {"decision":"breathe"|"synthesize","synthesis": string|null,"imageMaxHeightPx": number|null,"rationale":"1 frase"}`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.visionModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: rubric },
          { type: "image_url", image_url: { url: `data:image/png;base64,${shot.toString("base64")}`, detail: "high" } },
        ] },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 320,
    });
    recordTextSpend(CONFIG.visionModel, res.usage, { kind: "vision", pageId: seed.pageId, label: "layout-director" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { decision?: unknown; synthesis?: unknown; imageMaxHeightPx?: unknown; rationale?: unknown };
    const rationale = typeof raw.rationale === "string" ? raw.rationale : "";
    if (raw.decision !== "synthesize") return { ...breathe(rationale || "respira bien", true) };
    const synthesis = typeof raw.synthesis === "string" ? raw.synthesis.trim() : "";
    if (!synthesis) return breathe("decidió sintetizar pero no redactó texto", true);
    let imageMaxHeightPx: number | null = null;
    const n = Number(raw.imageMaxHeightPx);
    if (Number.isFinite(n) && n > 0) imageMaxHeightPx = Math.max(IMG_MIN, Math.min(IMG_MAX, Math.round(n)));
    return { decision: "synthesize", synthesis, imageMaxHeightPx, rationale, ran: true };
  } catch (err) {
    return breathe(`director falló: ${String((err as Error)?.message ?? err)}`, false);
  }
}
