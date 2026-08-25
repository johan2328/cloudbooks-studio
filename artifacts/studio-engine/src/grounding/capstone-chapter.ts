import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { getEditorialContract } from "../book/editorial-contract.js";
import { certDomain } from "../cert-domain.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { stripCitationMarkers } from "./author-page.js";
import { normalizePractice } from "./enrich-chapter.js";
import { listPersistedChapters, upsertPersistedChapter } from "../chapter-store.js";
import { timeAgent } from "../agents/agent-runtime.js";
import type { ChapterSeed, ProseSection, PageProvenance } from "../types.js";

/**
 * CAPSTONE DE RUTA (agente nuevo). Teje TODOS los módulos ya groundeados de una ruta en UN
 * proyecto integrador end-to-end: un escenario real que atraviesa la arquitectura, las decisiones
 * "cuándo usar qué", el código y una práctica tipo examen. NO introduce hechos nuevos: sintetiza
 * lo que los capítulos de la ruta ya afirmaron (verificados aguas arriba). Se persiste como un
 * ChapterSeed sintético con chapterNumber alto → el render por ruta lo coloca ÚLTIMO.
 * Voz gobernada por el contrato editorial (mismo autor, mismo tono de libro).
 */
const sysPrompt = (): string =>
  "Eres autor documental de CloudBooks y estás escribiendo el CAPÍTULO INTEGRADOR (capstone) que cierra una RUTA completa de una certificación cloud. " +
  "No enseñas un tema nuevo: TEJES los módulos de la ruta en UN proyecto real end-to-end, en ESPAÑOL NEUTRO de Latinoamérica. " +
  "El lector debe ver cómo las piezas encajan en una solución que podría llevar a producción, con decisiones justificadas. " +
  `La PRÁCTICA del capstone NO repite ítems de un solo concepto ya practicados en los capítulos previos: son 2-3 casos INTEGRADORES multi-restricción que obligan a COMBINAR y SECUENCIAR decisiones (${certDomain().capstoneScenarioEg}), o un despliegue que falla por varias causas a diagnosticar. Responde SOLO JSON válido.`;

export interface CapstoneResult { ok: boolean; chapterId?: string; seed?: ChapterSeed; model?: string; error?: string }

/** Genera y PERSISTE el capstone de una ruta. Idempotente por (ruta + modelo): re-generar sobreescribe. */
export async function generateRouteCapstone(domainId: string, force = false): Promise<CapstoneResult> {
  return timeAgent("autor", "route-capstone", () => generateRouteCapstoneInner(domainId, force), { routeId: domainId, runContext: "route" });
}
async function generateRouteCapstoneInner(domainId: string, force = false): Promise<CapstoneResult> {
  const dom = getOutline().domains.find((d) => d.id === domainId);
  if (!dom) return { ok: false, error: `ruta_desconocida:${domainId}` };
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI." };

  const routeChapters = listPersistedChapters().filter((c) => c.seed.domainId === domainId && !c.seed.moduleId.startsWith("capstone-"));
  if (routeChapters.length === 0) return { ok: false, error: "La ruta no tiene capítulos persistidos que integrar." };

  // El integrador NO lleva número de capítulo (con numeración global cualquier número colisiona con el capítulo
  // real que ya lo posee): se identifica por su RUTA ("Ruta N · Proyecto integrador", ver book/chapter-heading).
  // El orden ÚLTIMO de la ruta lo garantiza el ensamblador (comparador isCap), no un número artificial.
  const capstoneId = `cap-zz-capstone-${domainId}`;   // "zz" → id que ordena último; sin número de capítulo
  if (!force) {
    const existing = listPersistedChapters().find((c) => c.seed.chapterId === capstoneId);
    if (existing) return { ok: true, chapterId: capstoneId, seed: existing.seed };
  }

  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Cliente OpenAI no disponible." };
  if (wouldExceedCap(0.05)) return { ok: false, error: "Tope mensual de costo alcanzado (texto)." };

  const routeLabel = (dom.label ?? domainId).replace(/^Ruta \d+\s*[—–-]\s*/, "").trim();
  // Ingredientes = lo que la ruta YA enseñó (títulos + secciones + puntos clave verificados). El capstone sintetiza, no inventa.
  const material = routeChapters
    .map((c, i) => {
      const secs = c.seed.sections.map((s) => `   · ${s.heading}`).join("\n");
      const keys = c.seed.keyTakeaways.map((k) => `   ✓ ${k}`).join("\n");
      return `MÓDULO ${i + 1}: ${c.seed.title}\n  Secciones:\n${secs}${keys ? `\n  Puntos clave:\n${keys}` : ""}`;
    })
    .join("\n\n");

  const user = `Escribe el CAPÍTULO INTEGRADOR (capstone) que cierra la ruta completa:

RUTA: ${routeLabel}
Certificación: ${getOutline().certLabel}

MÓDULOS DE LA RUTA (los ingredientes que YA se enseñaron — el capstone los teje, no introduce temas nuevos):
${material}

Construye UN proyecto realista end-to-end que atraviese TODOS esos módulos: un escenario concreto (empresa/necesidad), la arquitectura de la solución (qué servicios y cómo se conectan), las decisiones de diseño "cuándo conviene cada opción", el flujo de construcción con comandos/código donde aporte, y una práctica final tipo examen. El lector debe terminar viendo la ruta como UNA solución coherente, no como módulos sueltos.

Devuelve EXACTAMENTE este JSON:
{
 "title": "título del capstone EN ESPAÑOL (ej. 'Proyecto integrador: <algo concreto de la ruta>'; mantén nombres de producto)",
 "subtitle": "subtítulo (frase breve que nombre el escenario)",
 "intro": "<p>1-2 párrafos cortos: el escenario y qué se va a construir integrando la ruta</p>",
 "objectives": ["5 objetivos de aprendizaje MEDIBLES e INTEGRATIVOS del capstone (verbo de acción; COMBINAN las habilidades de la ruta en la solución end-to-end); texto plano, sin HTML", "..."],
 "sections": [
   {"heading":"El escenario","prose":"<p>varios párrafos cortos</p>"},
   {"heading":"Arquitectura de la solución","prose":"<p>...</p>"},
   {"heading":"Decisiones de diseño","prose":"<p>...</p>"},
   {"heading":"Construcción paso a paso","prose":"<p>... con código en <pre class=\\"scn-code\\"> donde aporte</p>"}
 ],
 "keyTakeaways": ["qué se lleva el lector del proyecto integrador", "..."],
 "practice": [{"question":"escenario integrador de 2-3 frases con una decisión","options":["opción en texto plano","opción en texto plano","opción en texto plano"],"correctIndex":1,"explanation":"por qué la correcta y por qué las otras no"}]
}
Reglas: 4 a 5 sections de PROSA con headings propios (los pone el sistema como <h2>, NO repitas el heading dentro de la prosa ni el título del capítulo como primera sección; NO metas la práctica como sección: va en el campo 'practice' estructurado). Cada sección en VARIOS párrafos CORTOS separados en <p> (nunca un muro de texto). Puedes usar <ul>/<li>, y una tabla HTML <table class="dmap"> con <thead>/<tbody> para el "cuándo usar qué" (columnas: <th>Escenario</th><th>Opción recomendada</th>; celdas <td class="s">…</td><td class="d">…</td>). CÓDIGO: los comandos de VARIAS LÍNEAS o largos van en <pre class="scn-code">…</pre> (NO inline, y SIN barra invertida de continuación); reserva <code> solo para tokens cortos. Prosa premium de LIBRO, concreta, con SKUs/límites reales que ya aparecieron en la ruta. PROHIBIDO inventar servicios o valores que la ruta no mencionó, y sin corchetes de cita.`;

  const ed = getEditorialContract();
  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.authorModel,
      messages: [{ role: "system", content: `${sysPrompt()} ${ed.voice} ${ed.paragraphs} ${ed.practice} ${ed.pedagogy}` }, { role: "user", content: user }],
      response_format: { type: "json_object" }, ...chatModelParams(CONFIG.authorModel, 8000, 0.5),
    });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", pageId: capstoneId, label: "route-capstone" });
    if (res.choices[0]?.finish_reason === "length") return { ok: false, error: "El capstone truncó (length)." };
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    const clean = (v: unknown): string => stripCitationMarkers(String(v ?? ""));

    const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
    const sections: ProseSection[] = rawSections
      .map((o, i) => {
        const s = (o ?? {}) as Record<string, unknown>;
        return { id: `s${i + 1}`, heading: clean(s.heading) || `Parte ${i + 1}`, prose: stripCitationMarkers(String(s.prose ?? "")), claimRefs: [], critical: false };
      })
      .filter((s) => s.prose && !/pr[áa]ctica/i.test(s.heading))   // la práctica va estructurada aparte, no como sección
      .map((s, i) => ({ ...s, id: `s${i + 1}` }));
    if (sections.length === 0) return { ok: false, error: "El capstone no devolvió secciones." };

    // Objetivos medibles del capstone: preferir los del modelo; si son <3, completar con los objetivos de los módulos
    // de la ruta (dedupe). Garantiza que la portadilla del capstone NUNCA quede sin el bloque "Objetivos de aprendizaje".
    const modelObjectives = Array.isArray(raw.objectives) ? raw.objectives.map((o) => clean(o)).filter(Boolean) : [];
    const fromRoute = [...new Set(routeChapters.flatMap((c) => c.seed.objectives ?? []).map((o) => clean(o)).filter(Boolean))];
    const objectives = (modelObjectives.length >= 3 ? modelObjectives : [...modelObjectives, ...fromRoute]).slice(0, 5);

    const seed: ChapterSeed = {
      chapterId: capstoneId,
      chapterNumber: "",   // el integrador no lleva número (se identifica por ruta; ver book/chapter-heading)
      moduleId: `capstone-${domainId}`,
      domainId,
      domainLabel: routeLabel,
      title: clean(raw.title) || `Proyecto integrador — ${routeLabel}`,
      subtitle: clean(raw.subtitle) || "Cierre integrador de la ruta",
      intro: stripCitationMarkers(String(raw.intro ?? "")),
      objectives,
      skillIds: routeChapters.flatMap((c) => c.seed.skillIds),
      sections,
      graphics: [],   // el capstone se apoya en prosa + tabla de decisión; sin figuras generadas (no bloquea el render)
      psychometrics: { measuredVerbs: [], questionArchetypes: [], cognitiveLevels: [], commonTraps: [], reasoningGoal: `Integrar la ruta ${routeLabel} en una solución end-to-end.` },
      keyTakeaways: Array.isArray(raw.keyTakeaways) ? raw.keyTakeaways.map((t) => clean(t)).filter(Boolean).slice(0, 8) : [],
      practice: normalizePractice(raw.practice),
    };

    const provenance: PageProvenance = { pageId: capstoneId, skillIds: seed.skillIds, sourceIds: [], claims: [], checks: [], groundingStatus: "unverified", updatedAt: new Date().toISOString() };
    upsertPersistedChapter({ seed, provenance, persistedAt: new Date().toISOString() });
    return { ok: true, chapterId: capstoneId, seed, model: CONFIG.authorModel };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}
