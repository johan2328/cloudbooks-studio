import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { getEditorialContract } from "../book/editorial-contract.js";
import { certDomain } from "../cert-domain.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { atomicWriteFileSync, withLock } from "../fs-safe.js";
import { getModule, getSkill, getSkillTitleEs, chapterNumberForModule } from "../skills/ai-200-outline.js";
import { stripCitationMarkers } from "./author-page.js";
import { scopedCorpus } from "./module-sources.js";
import type { AuthoredChapter, ChapterSeed, Citation, CitationKind, Claim, GraphicSpec, ProseSection, PsychoProfile, Source } from "../types.js";

/**
 * AUTOR DOCUMENTAL (agente nuevo). Teje las unidades de un MÓDULO en un RELATO
 * continuo y profundo (no una ficha por unidad), escrito para CONSTRUIR el
 * razonamiento del perfil psicométrico. Ancla las afirmaciones críticas a fuentes
 * (claims con cita). Decide con PARQUEDAD dónde un gráfico complementario fija un
 * concepto (el peso visual vive en el Atlas). Molde: sections-gen + author-page.
 * Idempotente: cachea por (módulo + versión + corpusHash).
 */
const CHAPTER_AUTHOR_VERSION = "chapter-author-v12-depthfloor";
const MAX_GRAPHICS = 3;

const SYS = "Eres autor documental de CloudBooks: escribes el LIBRO MAESTRO (documental) de una certificación cloud. Tejes varias unidades del temario en un RELATO continuo y profundo —no una ficha por tema—, en ESPAÑOL NEUTRO de Latinoamérica, claro y premium. Escribes para CONSTRUIR el razonamiento que el examen evalúa, no para repetir la documentación. Cada afirmación factual crítica cita una fuente del corpus por sourceId. Respondes SOLO JSON válido.";

function corpusHash(sources: Source[]): string {
  const sig = sources.map((s) => `${s.id}:${s.hash ?? ""}`).sort().join("|");
  return crypto.createHash("sha256").update(sig).digest("hex").slice(0, 12);
}
function cachePath(): string { return path.join(CONFIG.outputRoot, `_authored-chapters.${CONFIG.certId}.${CONFIG.format}.json`); }
function readCache(): Record<string, AuthoredChapter> { try { return JSON.parse(fs.readFileSync(cachePath(), "utf8")) as Record<string, AuthoredChapter>; } catch { return {}; } }
function writeCache(c: Record<string, AuthoredChapter>): void { atomicWriteFileSync(cachePath(), JSON.stringify(c, null, 2), "chapter-author-cache"); }

/** Fuentes del MÓDULO (helper UNIFICADO `scopedCorpus`): canónicas de sus unidades + hoja de datos duros
 *  antepuesta. Autor/enrich/verify comparten la misma ancla. `limit` recorta solo las fuentes MS Learn. */
async function moduleSources(skillIds: string[]): Promise<Source[]> {
  return scopedCorpus(skillIds, { limit: 10 });
}

export async function authorChapter(moduleId: string, profile: PsychoProfile | null, force = false): Promise<AuthoredChapter> {
  const mod = getModule(moduleId);
  const base = (extra: Partial<AuthoredChapter>): AuthoredChapter => ({
    outcome: "failed", model: null, moduleId, moduleTitle: mod?.moduleTitle ?? moduleId,
    seed: null, claims: [], sourceIds: [], citedClaims: 0, modelClaims: 0, coverageNote: "", cached: false, error: null, ...extra,
  });
  if (!mod) return base({ error: `modulo_desconocido:${moduleId}` });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });

  const sources = await moduleSources(mod.skillIds);
  if (sources.length === 0) return base({ outcome: "no_sources", error: "Módulo sin fuentes ingeridas; groundeá el Atlas o ingerí fuentes primero." });

  // El hash del CONTRATO EDITORIAL entra en la cache-key → editar voice/paragraphs/practice/pedagogy invalida lo
  // cacheado (antes un cambio de contrato se ignoraba silenciosamente: bug de "el contrato no se aplica").
  const edHash = crypto.createHash("sha256").update(JSON.stringify(getEditorialContract())).digest("hex").slice(0, 8);
  const key = crypto.createHash("sha256").update(`${moduleId}|${CHAPTER_AUTHOR_VERSION}|${CONFIG.authorModel}|${corpusHash(sources)}|${edHash}`).digest("hex").slice(0, 16);
  return withLock(`chapter-author:${key}`, async (): Promise<AuthoredChapter> => {
    const cache = readCache();
    if (!force && cache[key]) return { ...cache[key], cached: true };

    const openai = getOpenAI();
    if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
    if (wouldExceedCap(0.05)) return base({ error: "Tope mensual de costo alcanzado (texto)." });

    const validIds = new Set(sources.map((s) => s.id));
    // Fuente COMPLETA (el scrape ya topa ~20k chars): no truncar → el autor ve todo el material del módulo,
    // incluidas las secciones/detalles del final que antes quedaban fuera de la ventana (bug de truncación).
    const corpusText = sources.map((s) => `[${s.id}] ${s.title}${s.url ? ` — ${s.url}` : ""}\n${s.text ?? ""}`).join("\n\n---\n\n");
    const clean = (v: unknown) => stripCitationMarkers(String(v ?? ""));
    // PARIDAD DE TÍTULOS CON EL ATLAS: el heading de cada sección = el título determinista de la
    // unidad en el Atlas (skill-titles-es), una sección por unidad y en el orden del temario.
    const atlasUnits = mod.skillIds.map((id) => ({ id, title: getSkillTitleEs(id) ?? getSkill(id)?.title ?? id }));
    const unitsList = atlasUnits.map((u, i) => `${i + 1}. ${u.title}`).join("\n");
    const psy = profile
      ? `PERFIL PSICOMÉTRICO del módulo (escribí el relato para construir ESTE razonamiento):
- Verbos que mide el examen: ${profile.measuredVerbs.join(", ") || "—"}
- Arquetipos de pregunta: ${profile.questionArchetypes.join(", ") || "—"}
- Niveles cognitivos: ${profile.cognitiveLevels.join(", ") || "—"}
- Trampas que explota: ${profile.commonTraps.join(" · ") || "—"}
- Objetivo de razonamiento: ${profile.reasoningGoal || "—"}`
      : "PERFIL PSICOMÉTRICO: (no disponible — escribí para comprensión profunda y aplicable al examen)";

    const dp = certDomain();
    const user = `Escribí el CAPÍTULO documental del módulo del examen ${CONFIG.certId.toUpperCase()}.

Módulo: ${mod.moduleTitle}
Ruta/dominio: ${mod.domainLabel}

UNIDADES del capítulo (usá EXACTAMENTE estos títulos como heading de cada sección —coinciden con el Visual Atlas—, UNA sección por unidad y EN ESTE ORDEN):
${unitsList}

${psy}

CORPUS DE FUENTES — tu ANCLA DE EXACTITUD, NO una jaula: consumilo COMPLETO para que los HECHOS sean correctos y actuales, y citá por sourceId las afirmaciones factuales críticas. PERO enseñá con LIBERTAD más allá de lo que el corpus dice literalmente —ejemplos propios, analogías, contexto del mundo real, comparaciones, ritmo— para lograr una enseñanza PAUSADA, PROFUNDA, DIDÁCTICA y ENTRETENIDA. NO te limites a parafrasear la fuente; usala como cimiento de exactitud y construí encima. Lo único prohibido es afirmar algo FALSO o desactualizado (eso lo verifica un gate aparte); todo lo correcto que sume a la enseñanza es bienvenido aunque no esté textual en el corpus:
${corpusText}

Escribí un RELATO documental que teja las unidades en una narrativa continua y profunda (NO una ficha por unidad). Construí el razonamiento del perfil psicométrico: explicá el PORQUÉ, las decisiones de diseño, cuándo conviene cada opción, y desactivá las trampas del examen DENTRO del relato. ENSEÑÁ COMO UN GRAN PROFESOR: PAUSADO (presentá cada idea antes de profundizar, sin saltos ni densidad de ficha), PROFUNDO y PROFUSO (desarrollá a fondo, con ejemplos concretos y casos del mundo real), DIDÁCTICO (analogías, el porqué antes del cómo, anticipá la duda del lector, conectá con lo que ya sabe) y ENTRETENIDO (voz humana, gancho, que el estudiante NO abandone). Tenés LIBERTAD para ilustrar, comparar y contextualizar MÁS ALLÁ del corpus —siempre con exactitud—: el corpus ancla los HECHOS, vos construís la ENSEÑANZA. Prosa premium, concreta, nivel examen real. HILO CONCRETO: tejé un ejemplo/escenario RECURRENTE a lo largo del capítulo (un equipo o proyecto real enfrentando el problema del módulo), para que sea una historia con la que el lector se identifica, no una enumeración abstracta. ARCO DE CADA SECCIÓN (guía flexible, no camisa de fuerza): abrí por lo que está EN JUEGO (el problema o la decisión real) → construí el concepto (el porqué antes del cómo, anticipando la duda del lector) → demostralo con un ejemplo concreto/worked example → cerrá con el criterio de decisión o la trampa de examen. REGLA DE ORO libertad↔exactitud (crítica): la libertad es para EXPLICAR (analogías, ejemplos, ritmo, escenarios, contexto). Pero los DATOS TÉCNICOS DUROS —números, límites, defaults, nombres exactos de comandos/flags/roles/puertos, comportamientos de servicios, cifrado— deben ser CORRECTOS y anclados en el corpus o en conocimiento sólido. Si NO estás seguro de un dato específico, enseñá el CONCEPTO sin inventar el número/flag: MEJOR OMITIR el dato que afirmarlo mal.

Devolvé EXACTAMENTE este JSON:
{
 "chapterTitle": "título del capítulo EN ESPAÑOL (traducí el título del módulo; mantené los nombres de producto: ${dp.titleProductEg})",
 "subtitle": "subtítulo del capítulo (frase breve)",
 "intro": "<p>1-2 párrafos de apertura: por qué importa el módulo y qué va a poder razonar el lector al terminarlo</p>",
 "buildGoal": "UNA frase concreta de qué CONSTRUYE o LOGRA el lector al terminar (orientación práctica, ej. ${dp.buildGoalEg}). Texto plano, sin tags.",
 "objectives": ["3-5 objetivos de aprendizaje OBSERVABLES y medibles, con verbo de acción (ej. ${dp.objectivesEg}). Texto PLANO, SIN tags HTML (nada de <code>). NO sinopsis en futuro."],
 "prerequisites": ["qué TENER LISTO o HABER HECHO antes — ACCIONES concretas, NO una lista de tecnologías sueltas (ej. ${dp.prereqEg}). Texto plano. Vacío si el capítulo no asume base."],
 "prereqRemedy": "UNA frase de repaso para quien NO cumple la base, con remisión concreta (ej. ${dp.prereqRemedyEg}). Cadena vacía si no aplica.",
 "sections": [
   {"prose":"<p>prosa extensa en HTML (párrafos; <ul>/<li> y <code> si ayudan). Enseña con profundidad, no un resumen</p>","critical":true}
 ],
 "graphics": [
   {"afterSectionIndex":2,"kind":"flujo|arquitectura|comparación|línea-de-tiempo|secuencia","spec":"brief para el modelo de imagen: qué mostrar (1 concepto)","caption":"LEYENDA para el lector: frase descriptiva de la figura (ej. ${dp.graphicsCaptionEg}). NO imperativos ni 'que muestre'.","rationale":"por qué fija el conocimiento acá"}
 ],
 "keyTakeaways": ["punto clave para fijar", "..."],
 "claims": [
   {"text":"afirmación factual CRÍTICA del relato","citation":{"kind":"source","sourceId":"<id del corpus>","quote":"fragmento textual de esa fuente","url":null}}
 ],
 "coverageNote": "1 frase: qué tan bien el corpus cubre el módulo"
}
Reglas: devuelve EXACTAMENTE ${atlasUnits.length} sections — UNA por unidad, en el MISMO orden que la lista de UNIDADES de arriba (no agregues, fusiones ni reordenes; el heading lo pone el sistema con el título del Atlas, NO lo escribas). Cada sección desarrolla su unidad EN PROFUNDIDAD y con COBERTURA COMPLETA de sus aspectos importantes (NO un resumen): el porqué, las decisiones de diseño, cuándo conviene cada opción y sus trade-offs, límites/SKUs/números concretos, AL MENOS un worked example con el razonamiento de sus pasos, casos borde y errores comunes, y las trampas del examen — todo en varios párrafos CORTOS y progresivos (una idea por <p>), con transiciones que hilan el conjunto. APROVECHA TODA la fuente del corpus: si el corpus cubre un aspecto relevante de la unidad, desarróllalo; una sección que solo roza el tema o deja fuera aspectos que la fuente sí trae es un DEFECTO. La brevedad es por PÁRRAFO, NO por sección: VOS, el autor, sos el DUEÑO de la PROFUNDIDAD del capítulo (no la dejes para un paso posterior). Cada sección es un PISO de 6 a 9 párrafos SUSTANCIALES de explicación (sin contar el código), ~350-550 palabras; una sección de 2-4 párrafos está INCOMPLETA y es un DEFECTO grave (te faltó desarrollar el porqué, los trade-offs, el worked example, los casos borde o la trampa). Entregá el capítulo YA profundo. GRÁFICOS (los numera el sistema como "Figura N", complementarios y PARCOS): hasta ${MAX_GRAPHICS}, SOLO donde un diagrama esquemático fija un concepto que la prosa sola no fija — el peso visual vive en el Visual Atlas, este libro es el RELATO. REGLAS DE GRÁFICOS (obligatorias): (a) NUNCA en secciones consecutivas — deja al menos una sección SIN gráfico entre dos gráficos; (b) el ÚLTIMO párrafo de la sección que PRECEDE a un gráfico DEBE mencionarlo explícitamente ("como ilustra el diagrama a continuación…", "la figura siguiente resume…") — un gráfico nunca queda suelto sin reseña en el texto que lo precede; (c) ubica el gráfico donde además ayude a que la página no quede semivacía. Cada 'claim' es un hecho crítico con cita 'source' y quote REAL del corpus (no inventes). 3 a 6 keyTakeaways. PROHIBIDO escribir ids de fuente o corchetes de cita en el texto del relato (van en 'claims'). ANTI-DUPLICACIÓN: los objetivos y los prerrequisitos van SOLO en sus campos ('objectives'/'prerequisites'/'prereqRemedy'); NUNCA repitas dentro de la prosa una lista de "Objetivos…" ni una línea de "Prerrequisitos:" (el sistema ya los muestra al inicio del capítulo). CÓDIGO en la prosa: cada comando en su propia línea dentro de <pre>; NUNCA pegues dos comandos en la misma línea ni concatenes la salida de un log al comando (una cosa por línea). PRECISIÓN DE CLI (CRÍTICO — un error acá DESCARTA el capítulo entero en el gate de fidelidad): usá SOLO la forma CANÓNICA y VIGENTE del comando; NO inventes nombres EXACTOS de flags/parámetros. Si NO estás 100% seguro del nombre exacto de un flag, NO lo escribas: describí en palabras qué hace (${dp.precisionEg}) en vez de arriesgar un flag que podría estar mal o desactualizado. Un solo flag inventado o desactualizado hace FALLAR el gate y tira todo el capítulo. Regla práctica: en la prosa prioridad al CONCEPTO y al comando base; el comando exacto, completo y VERIFICADO lo agrega el paso de enriquecido posterior — no hace falta que exhibas cada flag acá.`;

    const ed = getEditorialContract();
    try {
      const res = await openai.chat.completions.create({
        model: CONFIG.authorModel,
        messages: [{ role: "system", content: `${SYS} ${ed.voice} ${ed.paragraphs} ${ed.pedagogy}` }, { role: "user", content: user }],
        response_format: { type: "json_object" }, ...chatModelParams(CONFIG.authorModel, 12000, 0.5),
      });
      recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", pageId: moduleId, label: "chapter-author" });
      if (res.choices[0]?.finish_reason === "length") return base({ outcome: "failed", model: CONFIG.authorModel, error: "El autor truncó la respuesta (length). Subí max_tokens." });
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;

      const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
      // Heading DETERMINISTA = título del Atlas de la unidad (paridad de títulos entre libros); prose del autor, por índice.
      const sections: ProseSection[] = atlasUnits.map((u, i) => {
        const o = (rawSections[i] ?? {}) as Record<string, unknown>;
        return { id: `s${i + 1}`, heading: u.title, prose: stripCitationMarkers(String(o.prose ?? "")), claimRefs: [], critical: o.critical !== false };
      }).filter((s) => s.prose);
      const nSec = sections.length;
      if (nSec === 0) return base({ outcome: "failed", model: CONFIG.authorModel, error: "El autor no devolvió secciones." });

      const rawGraphics = Array.isArray(raw.graphics) ? raw.graphics : [];
      const graphics: GraphicSpec[] = rawGraphics.slice(0, MAX_GRAPHICS).map((g, i) => {
        const o = (g ?? {}) as Record<string, unknown>;
        const idx = Math.max(1, Math.min(nSec, Math.round(Number(o.afterSectionIndex ?? nSec)) || nSec));
        return { id: `g${i + 1}`, afterSectionId: `s${idx}`, kind: clean(o.kind) || "diagrama", spec: clean(o.spec), caption: clean(o.caption), rationale: clean(o.rationale), imageUrl: null };
      }).filter((g) => g.spec);

      const rawClaims = Array.isArray(raw.claims) ? raw.claims : [];
      const claims: Claim[] = [];
      let cited = 0, model = 0;
      for (let i = 0; i < rawClaims.length; i++) {
        const c = (rawClaims[i] ?? {}) as Record<string, unknown>;
        const cit = (c.citation ?? {}) as Record<string, unknown>;
        let kind: CitationKind = cit.kind === "source" ? "source" : cit.kind === "web" ? "web" : "model";
        let sourceId: string | null = cit.sourceId ? String(cit.sourceId) : null;
        if (kind === "source" && (!sourceId || !validIds.has(sourceId))) { kind = "model"; sourceId = null; }
        if (kind === "source") cited++; else model++;
        const citation: Citation = { kind, sourceId, quote: String(cit.quote ?? ""), url: cit.url ? String(cit.url) : null };
        claims.push({ id: `c${i + 1}`, field: "section", text: String(c.text ?? "").trim(), citation });
      }

      const chNum = chapterNumberForModule(moduleId) ?? "01";
      const seed: ChapterSeed = {
        chapterId: `cap-${chNum}`,
        chapterNumber: chNum,
        moduleId,
        domainId: mod.domainId,
        domainLabel: mod.domainLabel,
        title: clean(raw.chapterTitle) || mod.moduleTitle,
        subtitle: clean(raw.subtitle),
        intro: stripCitationMarkers(String(raw.intro ?? "")),
        skillIds: mod.skillIds,
        sections,
        graphics,
        psychometrics: profile ?? { measuredVerbs: [], questionArchetypes: [], cognitiveLevels: [], commonTraps: [], reasoningGoal: "" },
        keyTakeaways: Array.isArray(raw.keyTakeaways) ? raw.keyTakeaways.map((t) => clean(t)).filter(Boolean).slice(0, 8) : [],
        objectives: Array.isArray(raw.objectives) ? raw.objectives.map((t) => clean(t)).filter(Boolean).slice(0, 6) : [],
        prerequisites: Array.isArray(raw.prerequisites) ? raw.prerequisites.map((t) => clean(t)).filter(Boolean).slice(0, 5) : [],
        prereqRemedy: clean(raw.prereqRemedy) || undefined,
        buildGoal: clean(raw.buildGoal) || undefined,
      };
      const result: AuthoredChapter = {
        outcome: "real", model: CONFIG.authorModel, moduleId, moduleTitle: mod.moduleTitle, seed,
        claims, sourceIds: sources.map((s) => s.id), citedClaims: cited, modelClaims: model,
        coverageNote: String(raw.coverageNote ?? ""), cached: false, error: null,
      };
      const fresh = readCache(); fresh[key] = result; writeCache(fresh);
      return result;
    } catch (err) {
      return base({ outcome: "failed", model: CONFIG.authorModel, error: String((err as Error)?.message ?? err) });
    }
  });
}
