import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";

/**
 * Puntúa un bloque visual generado con un modelo de VISIÓN (dirección de arte).
 * Rúbrica premium del golden master: llena el marco, flat Azure line, paleta
 * navy/azul/teal, 4 cards 2×2 balanceadas, SIN texto de párrafo/marca, sin 3D.
 * Es señal de arte (la aprobación final sigue siendo humana, corrida 15).
 */
export async function visionScore(buffer: Buffer, concepts?: string[]): Promise<{ score: number | null; notes: string }> {
  if (!hasOpenAIKey()) return { score: null, notes: "sin llave OpenAI" };
  const openai = getOpenAI();
  if (!openai) return { score: null, notes: "cliente OpenAI no disponible" };
  if (wouldExceedCap(0.005)) return { score: null, notes: "tope de costo alcanzado" };

  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  const n = Math.max(2, Math.min(8, concepts?.length || 4));   // la fuente decide (2–8)
  const grid = n === 2 ? "2 columnas altas" : n === 3 ? "2 arriba + 1 ancha abajo" : n === 4 ? "grilla 2x2" : n === 5 ? "fila de 3 + fila de 2 centrada" : n === 6 ? "grilla 2x3" : n === 7 ? "fila de 4 + fila de 3 centrada" : "grilla 2x4";
  const sys =
    "Sos director de arte + editor de una colección premium de certificación cloud (Azure). " +
    `Evaluás un BLOQUE VISUAL de ${n} TARJETAS explicativas (cada una con título y caption legibles) de un atlas de estudio. Respondés SOLO JSON.`;
  const coherence = concepts && concepts.length
    ? `\nCOHERENCIA: las ${n} tarjetas deben representar estos conceptos, en orden: ${concepts.map((c, i) => `${i + 1}) ${c}`).join("  ")}. Bajá fuerte el score si una tarjeta no corresponde a su concepto.`
    : "";
  const rubric =
`Puntuá este bloque visual premium (0-10). Formato correcto: ${n} tarjetas en ${grid}; cada tarjeta = badge de número + TÍTULO corto + diagrama flat Azure line + una CAPTION de 2-3 líneas que explica el concepto. NO penalices que sean ${n} (y no 4): el conteo correcto lo decide la fuente (entre 2 y 8).
PREMIÁ: infografía Microsoft Azure COLORIDA, plana y nítida (iconografía Azure, secciones de color con tinte suave, headers numerados); TEXTO LEGIBLE y bien escrito en español (títulos y captions); buen contraste texto/fondo; tarjetas balanceadas que llenan su área.
PENALIZÁ FUERTE: texto ILEGIBLE o mal escrito (garabateado/gibberish), captions vacías o cortadas, tarjetas desbalanceadas, marca de página filtrada; rellenos GLOSSY/brillo, glow/sombra/3D, estilo fotográfico, fondo oscuro; o lo contrario, gris/lavado sin color. El color Azure limpio es BUENO; penalizá solo el neón chillón o el desbalance.${coherence}
Devolvé: {"score": number 0-10, "notes": "1 frase: principal acierto o defecto (legibilidad/coherencia)"}`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.visionModel,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: rubric },
          { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
        ] },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 200,
    });
    recordTextSpend(CONFIG.visionModel, res.usage, { kind: "vision", label: "vision-score" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { score?: unknown; notes?: unknown };
    const n = Number(raw.score);
    const score = Number.isFinite(n) ? Math.max(0, Math.min(10, Math.round(n * 10) / 10)) : null;
    return { score, notes: typeof raw.notes === "string" ? raw.notes : "" };
  } catch (err) {
    return { score: null, notes: `visión falló: ${String((err as Error)?.message ?? err)}` };
  }
}
