import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { atomicWriteFileSync, withLock } from "../fs-safe.js";
import { getOutline, getSkill } from "../skills/ai-200-outline.js";
import { ensureSkillSources } from "../skills/skill-sources.js";
import { listSources } from "./source-store.js";
import type { AuthoredDraft, AuthoredPage, CitationKind, Claim, Source } from "../types.js";

/** Slug del módulo de una URL de MS Learn (…/modules/<slug>/…). */
function moduleSlug(url?: string | null): string {
  const m = (url ?? "").match(/\/modules\/([^/]+)/);
  return m ? m[1]! : "";
}

/**
 * FUENTES RELEVANTES POR DOMINIO (anti-contaminación del corpus global): el autor
 * debe leer SOLO las fuentes de la ruta/módulo de la skill, no las primeras 10 del
 * corpus global (que estaba dominado por ACR → unidades de AKS salían sobre ACR).
 * Score: 3 = mismo módulo de la skill · 2 = otro módulo de SU dominio · 0 = ajena.
 * Si hay ≥3 del dominio, usa SOLO esas; si la skill tiene pocas, completa con globales.
 */
export function relevantSources(skillId: string, sources: Source[]): Source[] {
  const skill = getSkill(skillId);
  const ownSlug = moduleSlug(skill?.url);
  const dom = getOutline().domains.find((d) => d.skills.some((s) => s.id === skillId));
  const domainSlugs = new Set((dom?.skills ?? []).map((s) => moduleSlug(s.url)).filter(Boolean));
  const score = (s: Source): number => {
    const slug = moduleSlug(s.url);
    if (ownSlug && slug === ownSlug) return 3;
    if (slug && domainSlugs.has(slug)) return 2;
    return 0;
  };
  const scored = sources.map((s) => ({ s, sc: score(s) })).sort((a, b) => b.sc - a.sc);
  // Si hay ≥2 fuentes del MÓDULO propio, usar SOLO esas: evita la fuga intra-dominio
  // (ej. Ruta 1 mezcla ACR + App Service en el mismo dominio → una unidad de App Service
  //  no debe leer fuentes de ACR aunque compartan ruta). El módulo es el alcance temático real.
  const own = scored.filter((x) => x.sc === 3).map((x) => x.s);
  if (own.length >= 2) return own.slice(0, 10);
  const relevant = scored.filter((x) => x.sc >= 2).map((x) => x.s);
  // NUNCA rellenar con fuentes FUERA del dominio: una lámina contaminada (tema equivocado)
  // es peor que una fina. Si hay ≥1 del dominio, usar SOLO esas. La canónica propia de la
  // unidad siempre está (ensureSkillSources la ingiere), así que esto casi nunca queda vacío.
  if (relevant.length >= 1) return relevant.slice(0, 10);
  // Sin NINGUNA fuente del dominio: devolver VACÍO a propósito → el autor falla (no_sources)
  // y la página NO se persiste con contenido equivocado. Contaminar es peor que faltar.
  return [];
}

/**
 * AUTORÍA ANCLADA: gpt-4o redacta el contenido de una página DESDE el skill +
 * el corpus de fuentes, devolviendo cada afirmación con su cita (a una fuente
 * del corpus, o marcada 'model' si nada la respalda). Rigor primero: sin
 * fuentes no redacta. Idempotente: cachea por (skill + versión + corpus).
 */

function cachePath(): string {
  return path.join(CONFIG.outputRoot, "_authored.json");
}
function readCache(): Record<string, AuthoredPage> {
  try { return JSON.parse(fs.readFileSync(cachePath(), "utf8")) as Record<string, AuthoredPage>; } catch { return {}; }
}
function writeCache(c: Record<string, AuthoredPage>): void {
  atomicWriteFileSync(cachePath(), JSON.stringify(c, null, 2), "author-cache");
}

function corpusHash(sources: Source[]): string {
  const sig = sources.map((s) => `${s.id}:${s.hash ?? ""}`).sort().join("|");
  return crypto.createHash("sha256").update(sig).digest("hex").slice(0, 12);
}
function domainLabelFor(skillId: string): string {
  for (const d of getOutline().domains) if (d.skills.some((s) => s.id === skillId)) return d.label;
  return "";
}
function clampInt(n: unknown, lo: number, hi: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}

/** Quita un bloque de OBJETIVOS DUPLICADO dentro de la PROSA (los modelos a veces lo pegan pese a la regla
 *  anti-duplicación del contrato): un <p> cuyo texto arranca con "Objetivos medibles/del capítulo…" o
 *  "Al terminar este capítulo…", seguido de su lista <ul>/<ol> INMEDIATA. Anclado al heading → seguro en campos
 *  cortos (title/intro/objectives/keyTakeaways) y NO toca la caja de render `<ul class="ch-keys">` (que se arma
 *  aparte desde el campo `objectives`). Los objetivos reales viven una sola vez, en su propia caja. */
function stripDuplicatedObjectives(s: string): string {
  return String(s ?? "").replace(
    /<p\b[^>]*>\s*(?:<(?:strong|b)>\s*)?(?:Objetivos\s+(?:medibles|del\s+cap.tulo)|Al\s+terminar\s+este\s+cap.tulo)[\s\S]*?<\/p>\s*<(ul|ol)\b[^>]*>[\s\S]*?<\/\1>/gi,
    "",
  );
}

/** Quita marcadores de cita que el modelo a veces pega en el TEXTO (ej. "[0dd288d3f404]"):
 *  ids de fuente entre corchetes / paréntesis. Las citas viven en `claims`, NO en el draft.
 *  Además saca el bloque de objetivos duplicado de la prosa (chokepoint compartido autor/enrich/capstone). */
export function stripCitationMarkers(s: string): string {
  return stripDuplicatedObjectives(String(s ?? ""))
    .replace(/\s*[\[(]\s*(?:fuente|source)?\s*:?\s*[0-9a-f]{6,16}\s*[\])]/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeDraft(raw: any): AuthoredDraft | null {
  const d = raw?.draft;
  if (!d || typeof d !== "object") return null;
  const clean = (v: unknown) => stripCitationMarkers(String(v ?? ""));
  const traps = Array.isArray(d.traps) ? d.traps.slice(0, 3).map((t: any) => ({ wrong: clean(t?.wrong), correction: clean(t?.correction) })) : [];
  const ac = d.autocheck ?? {};
  const options = Array.isArray(ac.options) ? ac.options.map(clean).slice(0, 6) : [];
  const modules = Array.isArray(d.visualModules)
    ? d.visualModules.slice(0, 8).map((m: any, i: number) => ({ num: String(m?.num ?? String(i + 1).padStart(2, "0")), title: clean(m?.title), description: clean(m?.description) }))
    : [];
  return {
    title: clean(d.title),
    subtitle: clean(d.subtitle),
    context: clean(d.context),
    guideQuestion: clean(d.guideQuestion),
    traps,
    autocheck: {
      question: clean(ac.question),
      options,
      correctOption: clampInt(ac.correctOption, 0, Math.max(0, options.length - 1)),
      explanation: clean(ac.explanation),
      discardNotes: Array.isArray(ac.discardNotes) ? ac.discardNotes.map(clean).slice(0, 4) : [],
    },
    visualModules: modules,
  };
}

function normalizeClaims(raw: any, validIds: Set<string>): { claims: Claim[]; cited: number; model: number } {
  const arr = Array.isArray(raw?.claims) ? raw.claims : [];
  const claims: Claim[] = [];
  let cited = 0, model = 0;
  for (let i = 0; i < arr.length; i++) {
    const c = arr[i] ?? {};
    const cit = c.citation ?? {};
    let kind: CitationKind = cit.kind === "source" ? "source" : cit.kind === "web" ? "web" : "model";
    let sourceId: string | null = cit.sourceId ? String(cit.sourceId) : null;
    if (kind === "source" && (!sourceId || !validIds.has(sourceId))) { kind = "model"; sourceId = null; } // cita inválida → degradar a model
    if (kind === "source") cited++; else model++;
    claims.push({ id: `c${i + 1}`, field: String(c.field ?? "context"), text: String(c.text ?? ""), citation: { kind, sourceId, quote: String(cit.quote ?? ""), url: cit.url ? String(cit.url) : null } });
  }
  return { claims, cited, model };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function authorSkill(skillId: string, force = false, feedback?: string[]): Promise<AuthoredPage> {
  const hasFeedback = !!feedback && feedback.length > 0;
  force = force || hasFeedback;   // una re-redacción correctiva nunca usa cache
  const skill = getSkill(skillId);
  const base = (extra: Partial<AuthoredPage>): AuthoredPage => ({
    outcome: "failed", model: null, skillId, skillTitle: skill?.title ?? skillId,
    draft: null, claims: [], sourceIds: [], citedClaims: 0, modelClaims: 0, coverageNote: "", cached: false, error: null, ...extra,
  });
  if (!skill) return base({ outcome: "failed", error: `skill_desconocida:${skillId}` });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });
  // Anticipatorio: auto-ingiere las fuentes oficiales mapeadas de la skill ANTES
  // de redactar (el sistema alimenta el corpus, no el humano a mano).
  await ensureSkillSources(skillId);
  // Anti-contaminación: SOLO las fuentes de la ruta/módulo de la skill (no el top-10 global).
  const sources = relevantSources(skillId, listSources());
  if (sources.length === 0) return base({ outcome: "no_sources", error: "Skill sin fuentes mapeadas; ingerí fuentes (pestaña Fuentes) para anclar." });

  const key = crypto.createHash("sha256").update(`${skillId}|${CONFIG.authorVersion}|${CONFIG.authorModel}|${corpusHash(sources)}`).digest("hex").slice(0, 16);

  // Serializamos por clave: dos autorías de la MISMA skill no doble-gastan ni se pisan.
  return withLock(`author:${key}`, async (): Promise<AuthoredPage> => {
  const cache = readCache();
  const hit = cache[key];
  if (!force && hit) return { ...hit, cached: true };

  const openai = getOpenAI();
  if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
  if (wouldExceedCap(0.03)) return base({ outcome: "failed", error: "Tope mensual de costo alcanzado (texto)." });

  const usable = sources.slice(0, 10);
  const validIds = new Set(usable.map((s) => s.id));
  // CAUSA RAÍZ de la sub-extracción (Corrida 36): truncar la unidad PROPIA a 3500 chars dejaba
  // afuera sus ejes finales (KEDA tenía 6 secciones en 10.5K → el autor solo veía 2). La unidad
  // propia (su URL = skill.url) va COMPLETA (tope 16K); las secundarias quedan acotadas para no
  // inflar el costo. Así el autor SÍ ve todos los ejes y puede reflejarlos.
  const ownUrl = (skill.url ?? "").split("?")[0];
  const corpusText = usable.map((s) => {
    const isOwn = !!ownUrl && (s.url ?? "").split("?")[0] === ownUrl;
    return `[${s.id}] ${s.title}${s.url ? ` — ${s.url}` : ""}\n${(s.text ?? "").slice(0, isOwn ? 16000 : 3500)}`;
  }).join("\n\n---\n\n");

  const feedbackBlock = hasFeedback
    ? `\nCORRECCIÓN (intento previo): estas afirmaciones NO quedaron respaldadas por el corpus:\n${feedback!.map((f) => `- ${f}`).join("\n")}\nRe-redactá la página para que CADA afirmación (contexto, correcciones de trampa, explicación) esté respaldada por una fuente del corpus. Eliminá o suavizá lo que no puedas respaldar; NO afirmes más allá de las fuentes.\n`
    : "";

  const sys =
    "Sos editor técnico jefe de CloudBooks, autor de páginas de estudio para certificación cloud (Microsoft Azure). " +
    "Redactás contenido riguroso y ANCLADO a fuentes. Cada afirmación factual cita una fuente del corpus (por sourceId) con un fragmento textual; " +
    "si ninguna fuente la respalda, marcás la cita kind='model' y la usás solo si es imprescindible. Respondés SOLO JSON válido, en español.";
  const user =
`Redactá la página de estudio para esta skill del examen.

Skill: ${skill.title} (${skillId})
Objetivos: ${skill.objectives.join("; ")}
Dominio: ${domainLabelFor(skillId)}

CORPUS DE FUENTES (única verdad permitida; citá por sourceId):
${corpusText}
${feedbackBlock}
Devolvé EXACTAMENTE este JSON:
{
 "draft": {
   "title": "título corto del tema EN ESPAÑOL — TRADUCÍ el título oficial del skill al español; NUNCA lo copies en inglés (p.ej. 'Configure application settings' → 'Ajustes de la aplicación'); los nombres propios de producto (Container Apps, ACR, KEDA, Cosmos DB) se mantienen; máx 40 caracteres; debe ser una FRASE NOMINAL COMPLETA Y CERRADA — PROHIBIDO terminar en preposición o conjunción ('en','con','y','de','para','a'); si no entra completo, redactá uno más corto pero con sentido cerrado (p.ej. NO 'Exposición de aplicaciones en' → SÍ 'Exposición de apps en AKS'); sin 'Uso de'/'Cómo'", "subtitle": "subtema ESPECÍFICO de esta página (NO repitas el nombre del dominio/módulo; p.ej. 'Aislamiento de red', no 'Cómputo contenerizado')",
   "context": "3-5 frases de contexto técnico CON ESPECIFICIDAD (nombres de servicios/SKUs, límites o números concretos, cuándo aplica y cuándo no)",
   "guideQuestion": "una pregunta guía de examen",
   "traps": [{"wrong":"mito frecuente","correction":"corrección precisa CON el porqué técnico (no solo 'es falso')"}],
   "autocheck": {"question":"pregunta","options":["A. ...","B. ...","C. ...","D. ..."],"correctOption":0,"explanation":"por qué es correcta, con el mecanismo concreto","discardNotes":["A descartada: ...","B descartada: ..."]},
   "visualModules": [{"num":"01","title":"concepto","description":"explicación SUSTANCIAL de 1-2 frases completas que ENSEÑA el concepto (qué es + el dato clave a recordar para el examen); NO un rótulo suelto ni un 'brief'"}]
 },
 "claims": [
   {"field":"context","text":"afirmación factual concreta","citation":{"kind":"source","sourceId":"<id del corpus>","quote":"fragmento textual de esa fuente","url":null}}
 ],
 "coverageNote": "1 frase: qué tan bien el corpus cubre la skill"
}
Reglas: exactamente 3 traps; 4 opciones en autocheck; y ENTRE 2 Y 8 visualModules — la cantidad la decide la FUENTE, no un número fijo. ESTRUCTURA (CRÍTICO para completitud): los visualModules deben CUBRIR TODOS los ejes que enseña la unidad PROPIA (la fuente cuyo título coincide con el skill). El texto fuente viene en Markdown con encabezados ('##','###'). PRIMERO enumerá TODAS las secciones de contenido '##' de la unidad propia EN SU ORDEN, IGNORANDO los encabezados que NO son ejes de contenido ('Additional resources','Best practices','Knowledge check','Summary','Introduction','Prerequisites','Clean up','Next unit','References' y los 'Code fragment/sample' — estos NO cuentan como sección; el code fragment se funde con la sección que ejemplifica). LUEGO generá UN módulo por cada eje REAL de contenido (title = el tema de la sección; description = lo que esa sección enseña). GRANULARIDAD (preferí MÁS tarjetas a menos, para no perder contenido evaluable): cada sub-tema conceptualmente DISTINTO —un encabezado de contenido propio, o un concepto que el examen evalúa por separado— va en SU PROPIA tarjeta. NO colapses sub-temas distintos en una sola tarjeta genérica ni descartes ninguno. Agrupá ÚNICAMENTE variaciones TRIVIALES del MISMO procedimiento (ej. "desplegar por portal / por CLI / por VS Code" → 1 tarjeta "Métodos de despliegue"; pero "autenticación", "fuentes de imagen", "actualización continua", "comportamiento de pull" SON distintos → tarjetas separadas). CONTEO: si la unidad tiene 7 u 8 sub-temas distintos, usá 7 u 8 (la unidad DENSA se renderiza como SPREAD de 2 páginas — NO la comprimas a 4-6 perdiendo contenido); si tiene 4-6 distintos, usá 4-6; si es GENUINAMENTE corta (2-3), usá 2-3 sin relleno. Solo si quedaran MÁS de 8 sub-temas distintos, agrupá los más afines hasta 8. PROHIBIDO colapsar una unidad rica de 7-8 sub-temas en 3-4: NINGÚN eje puede quedar sin representar. Cada afirmación técnica del draft debe tener su claim con cita kind='source' y quote REAL del corpus. TRAMPAS ANCLADAS (crítico): la CORRECCIÓN de cada trampa es un HECHO que se verifica contra la fuente — debe estar RESPALDADA por el corpus (tiene que existir un fragmento textual que la diga). Si no podés respaldar la corrección de una concepción errónea con el documento, ELEGÍ OTRA trampa cuya corrección SÍ esté explícita en la fuente. No inventes correcciones que el documento no afirme (p.ej. no digas "ACR usa namespaces" si la fuente no lo dice). Lo mismo para la explicación del autocheck: respaldada por la fuente. PROHIBIDO en el TEXTO del draft: NO escribas ids de fuente, corchetes de cita ni marcadores como "[0dd288d3f404]" dentro de title/subtitle/context/guideQuestion/traps/autocheck/visualModules — el texto va LIMPIO para el lector; las citas (sourceId + quote) van EXCLUSIVAMENTE en el array 'claims'. REGLA DE RIGOR: NO afirmes lo que el corpus no respalda — preferí redactar el contenido apoyándote solo en lo que las fuentes dicen, para que TODOS los claims sean 'source' (estado 'verified'). Usá 'model' solo como último recurso e imprescindible; si dudás, omití la afirmación. PROFUNDIDAD (nivel examen real): concreto y accionable, sin generalidades vagas ni relleno; cada description debe enseñar algo que el lector pueda recordar y aplicar, con el detalle técnico que distingue (un SKU, un límite, una condición). La inversión está en el CUERPO: que las tarjetas valgan la página.`;

  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.authorModel,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 12000, // gpt-5.6-luna es RAZONAMIENTO: max_completion_tokens comparte pensamiento+JSON (piso 4000). 4096/8192 podían quedar justos en unidades ricas (hasta 8 módulos + 20+ claims con quote); 12000 deja margen. Trunca → 'length' → falla (no persiste seed cortado)
    });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", pageId: skillId, label: "author" });
    if (res.choices[0]?.finish_reason === "length") {
      return base({ outcome: "failed", model: CONFIG.authorModel, error: "El autor truncó la respuesta (length). Subí max_tokens." });
    }
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    const draft = normalizeDraft(raw);
    if (!draft) return base({ outcome: "failed", model: CONFIG.authorModel, error: "El autor no devolvió un draft válido." });
    const { claims, cited, model } = normalizeClaims(raw, validIds);
    const result: AuthoredPage = {
      outcome: "real", model: CONFIG.authorModel, skillId, skillTitle: skill.title,
      draft, claims, sourceIds: usable.map((s) => s.id), citedClaims: cited, modelClaims: model,
      coverageNote: String(raw.coverageNote ?? ""), cached: false, error: null,
    };
    const fresh = readCache();   // re-read antes de escribir → no clobber de otra autoría
    fresh[key] = result;
    writeCache(fresh);
    return result;
  } catch (err) {
    return base({ outcome: "failed", model: CONFIG.authorModel, error: String((err as Error)?.message ?? err) });
  }
  });
}
