import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { CONFIG } from "../config.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { ingestUrl } from "../grounding/ingest.js";
import { listSources } from "../grounding/source-store.js";
import { listPersistedPages } from "../page-store.js";
import { getOutline, modulesForDomain } from "../skills/ai-200-outline.js";
import { certMetaByEngineId } from "../certifications.js";
import { certDomain } from "../cert-domain.js";

/**
 * GENERADORES DE SECCIONES DEL LIBRO (no-atlas) anclados al contenido groundeado:
 *  - Guía de estudio (cómo se comporta el examen) ← study guide oficial de MS Learn.
 *  - Intro por ruta (síntesis digerible de lo que el lector encontrará).
 *  - Glosario (términos clave del corpus).
 * Patrón: cost-guard + getOpenAI + español + devuelve HTML/texto listo para el bloque.
 */

// Guía de estudio oficial POR CERT (patrón MS Learn `.../study-guides/{code}`); AI-200 = idéntica. Barrido Fase 2b.
const studyGuideSlug = (): string => `study-guides/${CONFIG.certId.toLowerCase()}`;
const studyGuideUrl = (): string => `https://learn.microsoft.com/en-us/credentials/certifications/resources/${studyGuideSlug()}`;
const certCode = (): string => certMetaByEngineId(CONFIG.certId).code;
const SYS = "Sos editor de libros de certificación cloud (CloudBooks). Escribís en ESPAÑOL NEUTRO de Latinoamérica, claro y premium. PROHIBIDO el voseo argentino: NO uses formas como 'mantené', 'recorré', 'usá', 'tené', 'leé', 'fijate'; usá imperativo/segunda persona neutra (mantén, recorre, usa, ten, lee, fíjate). Devolvés SOLO el HTML/texto pedido, sin explicaciones ni ```.";

export interface SectionGenResult { ok: boolean; html?: string; text?: string; error?: string }

function clean(s: string): string {
  return s.trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
}

/** Texto groundeado de una ruta: títulos + contexto de sus unidades persistidas. */
function routeCorpus(domainId: string): { label: string; modules: string[]; units: { title: string; context: string }[] } {
  const domain = getOutline().domains.find((d) => d.id === domainId);
  const skillIds = new Set((domain?.skills ?? []).map((s) => s.id));
  const units = listPersistedPages()
    .filter((p) => (p.seed.skillIds ?? []).some((id) => skillIds.has(id)))
    .map((p) => ({ title: p.seed.title, context: p.seed.context }));
  const modules = modulesForDomain(domainId).map((m) => m.moduleTitle);
  return { label: domain?.label ?? domainId, modules, units };
}

/** GUÍA DE ESTUDIO: ingiere el study guide oficial y redacta "cómo se comporta el examen". */
export async function generateStudyGuide(): Promise<SectionGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.03)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  // Asegurar el study guide en el corpus.
  let src = listSources().find((s) => (s.url ?? "").includes(studyGuideSlug()));
  if (!src || !src.text) { try { const r = await ingestUrl(studyGuideUrl(), "mslearn"); if (r.ok && r.source) src = r.source; } catch { /* sigue con lo que haya */ } }
  const guideText = (src?.text ?? "").slice(0, 9000);
  if (!guideText) return { ok: false, error: "No se pudo leer el study guide oficial (red)." };
  // El copy no debe nombrar un formato específico: "atlas" solo para el Visual Atlas; el resto usa "libro".
  const bookNoun = CONFIG.format === "visual-atlas" ? "atlas" : "libro";
  const user = `Esta es la GUÍA DE ESTUDIO oficial del examen ${certCode()} (Microsoft):\n\n${guideText}\n\nRedactá, anclado SOLO a esta guía, una sección de libro "Cómo se comporta el examen" que oriente al lector ANTES de estudiar el ${bookNoun}. HTML: <h1>Cómo se comporta el examen</h1>, luego <p> de contexto, y donde aplique una <ul class="feat"> con los DOMINIOS y su PESO (%), más <p> sobre el formato (tipos de pregunta, duración si figura, cómo se evalúa) y un <p> de cierre sobre cómo usar este ${bookNoun} para preparar cada dominio. Concreto, fiel a la guía, sin inventar pesos que no estén.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: SYS }, { role: "user", content: user }], temperature: 0.4, max_tokens: 1200 });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "study-guide" });
    const html = clean(res.choices[0]?.message?.content ?? "");
    return html ? { ok: true, html } : { ok: false, error: "Respuesta vacía." };
  } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
}

/** INTRO POR RUTA: síntesis digerible de lo que el lector encontrará en esa ruta del atlas. */
export async function generateRouteIntro(domainId: string): Promise<SectionGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.03)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  const rc = routeCorpus(domainId);
  if (rc.units.length === 0) return { ok: false, error: "La ruta no tiene unidades groundeadas todavía." };
  const corpus = `Ruta: ${rc.label}\nMódulos: ${rc.modules.join(" · ")}\nLáminas (título — contexto):\n${rc.units.slice(0, 30).map((u) => `- ${u.title}: ${u.context}`).join("\n")}`;
  const user = `${corpus}\n\nRedactá la PÁGINA INTRODUCTORIA de esta ruta del atlas: una entrada digerible y sintética (máx ~2 páginas, 4-6 párrafos) que le quite abstracción a las láminas que siguen. Decí, sin tecnicismos de más: de qué trata la ruta, los módulos/temas que abarca, el hilo de aprendizaje (en qué orden conviene leerla), y qué va a poder hacer el lector al terminarla. HTML: <h1>${rc.label}</h1> + <p>…</p> (podés usar una <ul> breve si ayuda). Cálido y orientador, no un índice.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: SYS }, { role: "user", content: user }], temperature: 0.6, max_tokens: 1100 });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "route-intro" });
    const html = clean(res.choices[0]?.message?.content ?? "");
    return html ? { ok: true, text: html } : { ok: false, error: "Respuesta vacía." };
  } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
}

/** GLOSARIO: extrae 30-40 términos clave del corpus groundeado y los define (nivel examen). */
export async function generateGlossary(): Promise<SectionGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.02)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  const pages = listPersistedPages();
  if (pages.length === 0) return { ok: false, error: "No hay contenido groundeado todavía." };
  const corpus = pages.slice(0, 98).map((p) => {
    const mods = p.seed.visualModules.map((m) => `${m.title}: ${m.description}`).join(" | ");
    return `[${p.seed.title}] ${p.seed.context} ${mods}`;
  }).join("\n").slice(0, 17000);
  // Términos difíciles obligatorios = vocabulario AI-200 (Azure); otros certs no los fuerzan (usan su propio corpus).
  const mustInclude = CONFIG.certId === "ai-200"
    ? " Incluí SÍ O SÍ los términos difíciles y muy examinables que aparezcan en el contenido: pgvector, HNSW, IVFFlat, DiskANN, VectorDistance, KEDA, RU (Request Units), niveles de consistencia, peek-lock, dead-letter, change feed, OpenTelemetry, span, traza distribuida, KQL."
    : "";
  const user = `Contenido del atlas (títulos, contexto y módulos de las láminas):\n${corpus}\n\nExtraé entre 80 y 90 TÉRMINOS TÉCNICOS CLAVE que aparecen en este contenido (servicios de Azure, conceptos, siglas) y definí cada uno en 1-2 frases claras y precisas a nivel examen ${certCode()}, en ESPAÑOL NEUTRO sin voseo. Cubrí buena variedad de las rutas del atlas, sin repetir NINGÚN término (cada uno UNA sola vez).${mustInclude} Devolvé SOLO JSON: {"terms":[{"term":"...","definition":"..."}]} — ordenados alfabéticamente por término, SIN duplicados.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Sos editor técnico. Devolvés SOLO JSON válido y COMPLETO (cerrá todas las llaves). Generá EXACTAMENTE la cantidad de términos pedida, ni más ni menos." }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.3, max_tokens: 10000 });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", label: "glossary" });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { terms?: any[] };
    const seenTerm = new Set<string>();
    const terms = (Array.isArray(raw.terms) ? raw.terms : [])
      .map((t) => ({ term: String(t?.term ?? "").trim(), definition: String(t?.definition ?? "").trim() }))
      .filter((t) => t.term && t.definition)
      .filter((t) => { const k = t.term.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\s+/g, " ").trim(); if (seenTerm.has(k)) return false; seenTerm.add(k); return true; })   // dedupe por nombre normalizado (sin paréntesis)
      .sort((a, b) => a.term.localeCompare(b.term, "es"));
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (terms.length === 0) return { ok: false, error: "El modelo no devolvió términos." };
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<dl class="gloss">${terms.map((t) => `<dt>${esc(t.term)}</dt><dd>${esc(t.definition)}</dd>`).join("")}</dl>`;
    return { ok: true, html };
  } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
}

export interface DomainMapGenResult { ok: boolean; rows?: { skill: string; domain: string; notes: string }[]; note?: string; error?: string }

/** PLAN DE DOMINIO: una fila por RUTA del atlas (las 9), con "dónde hacer foco". Reemplaza la tabla
 *  hardcoded por una derivada del outline vivo (rutas/módulos) + las unidades realmente groundeadas. */
export async function generateDomainMap(): Promise<DomainMapGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.03)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  const domains = getOutline().domains;
  const pages = listPersistedPages();
  const countByDom = new Map<string, number>();
  for (const d of domains) {
    const sids = new Set(d.skills.map((s) => s.id));
    countByDom.set(d.id, pages.filter((p) => (p.seed.skillIds ?? []).some((id) => sids.has(id))).length);
  }
  const summary = domains.map((d) => {
    const mods = modulesForDomain(d.id).map((m) => m.moduleTitle).join(", ");
    return `${d.label} (${countByDom.get(d.id) ?? 0} láminas) — módulos: ${mods || "—"}`;
  }).join("\n");
  const user = `Estas son las RUTAS del atlas visual ${certCode()} con sus módulos:\n${summary}\n\nGenerá el PLAN DE ESTUDIO POR DOMINIO. Por CADA ruta, una frase de "dónde hacer foco" (~25-40 palabras), en ESPAÑOL NEUTRO sin voseo (usá "prioriza/domina/repasa", no "priorizá/dominá"): qué priorizar, el concepto núcleo y la trampa típica de esa ruta. Devolvé SOLO JSON {"routes":[{"label":"<rótulo EXACTO de la ruta>","focus":"..."}]}, en el MISMO orden y una por ruta.`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Sos editor técnico. Devolvés SOLO JSON válido." }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.4, max_tokens: 1600 });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "domain-map" });
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { routes?: any[] };
    const arr = Array.isArray(raw.routes) ? raw.routes : [];
    const byLabel = new Map<string, string>();
    for (const r of arr) byLabel.set(String(r?.label ?? "").trim().toLowerCase(), String(r?.focus ?? "").trim());
    /* eslint-enable @typescript-eslint/no-explicit-any */
    // Mapeo por ÍNDICE (el modelo responde en orden, una por ruta); fallback por label.
    const rows = domains.map((d, i) => {
      const focus = String(arr[i]?.focus ?? "").trim() || byLabel.get(d.label.trim().toLowerCase()) || "";
      return { skill: d.label, domain: `${countByDom.get(d.id) ?? 0} láminas`, notes: focus };
    }).filter((r) => r.notes);
    if (rows.length === 0) return { ok: false, error: "El modelo no devolvió focos por ruta." };
    // Nota de pesos: AI-200 tiene su detalle curado (4 dominios oficiales); otros certs, una nota genérica.
    const note = CONFIG.certId === "ai-200"
      ? "Mapa de las rutas del atlas AI-200: qué cubre cada una y dónde poner el foco al estudiar. OJO: el peso en el examen NO es proporcional al número de láminas. Los cuatro dominios oficiales pesan aproximadamente: contenedores 20-25%, datos y vectores 25-30%, integración de servicios backend (Service Bus, Event Grid y Functions — Ruta 7) 20-25%, y seguridad y observabilidad 20-25%. La integración backend pesa MÁS de lo que su cantidad de láminas sugiere: dedícale tiempo extra. Prioriza las rutas con más trampas y las que te resulten nuevas."
      : `Mapa de las rutas del ${certCode()}: qué cubre cada una y dónde poner el foco al estudiar. El peso en el examen NO es proporcional al número de láminas: prioriza las rutas de mayor peso, las que tengan más trampas y las que te resulten nuevas.`;
    return { ok: true, rows, note };
  } catch (err) { return { ok: false, error: String((err as Error)?.message ?? err) }; }
}

export interface ScenarioGenResult { ok: boolean; html?: string; count?: number; error?: string }

/** Dominios oficiales del AI-200 con su peso → reparto de los ~30 casos por peso (agrupan las 9 rutas). */
type CaseDomain = { label: string; weight: string; routes: string[]; n: number };
const AI200_CASE_DOMAINS: CaseDomain[] = [
  { label: "Soluciones en contenedores", weight: "20-25%", routes: ["p1", "p2", "p3"], n: 7 },
  { label: "Gestión de datos y búsqueda vectorial", weight: "25-30%", routes: ["p4", "p5", "p6"], n: 8 },
  { label: "Integración de servicios backend", weight: "20-25%", routes: ["p7"], n: 7 },
  { label: "Seguridad y observabilidad", weight: "20-25%", routes: ["p8", "p9"], n: 8 },
];
// Reparto de casos por dominio del examen. AI-200 = curado (4 dominios oficiales agrupan las 9 rutas); otros
// certs = cada dominio del outline vivo es un grupo, con ~30 casos repartidos por su peso (weightPct). Fase 2b.
function caseDomains(): CaseDomain[] {
  if (CONFIG.certId === "ai-200") return AI200_CASE_DOMAINS;
  const domains = getOutline().domains;
  const totalW = domains.reduce((s, d) => s + (d.weightPct || 0), 0) || 1;
  return domains.map((d) => ({
    label: d.label,
    weight: `${d.weightPct ?? 0}%`,
    routes: [d.id],
    n: Math.max(3, Math.round((30 * (d.weightPct || 0)) / totalW)),
  }));
}

/** CASOS DE EXAMEN: ~30 casos de ESCENARIO/código distribuidos por el PESO de cada dominio en el examen.
 *  Las preguntas NO muestran la respuesta; al final va una HOJA DE RESPUESTAS con la correcta + explicación. */
export async function generateScenarioReview(): Promise<ScenarioGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  if (wouldExceedCap(0.12)) return { ok: false, error: "Tope mensual de costo alcanzado." };
  const allDomains = getOutline().domains;
  const pages = listPersistedPages();
  const routeTopics = (routeIds: string[]): string => routeIds.map((rid) => {
    const d = allDomains.find((x) => x.id === rid);
    const sids = new Set((d?.skills ?? []).map((s) => s.id));
    const titles = pages.filter((p) => (p.seed.skillIds ?? []).some((id) => sids.has(id))).map((p) => p.seed.title);
    return `${d?.label ?? rid}: ${(titles.length ? titles : modulesForDomain(rid).map((m) => m.moduleTitle)).slice(0, 12).join("; ")}`;
  }).join("\n");

  type Case = { route: string; code: string; question: string; options: string[]; correct: number; explanation: string };
  const groups: { dom: CaseDomain; cases: Case[] }[] = [];
  for (const g of caseDomains()) {
    const user = `Dominio del examen ${certCode()}: "${g.label}" (peso ${g.weight} del examen). Sus rutas y temas:\n${routeTopics(g.routes)}\n\nGenerá EXACTAMENTE ${g.n} preguntas de ESCENARIO tipo examen para ESTE dominio, repartidas entre sus rutas/temas. NO definiciones ni recall: cada caso es un CASO REAL con un fragmento CORTO de código, YAML, comando CLI o consulta KQL (3-8 líneas) con un problema, hueco o decisión, y se pregunta qué falla / qué falta / en qué orden / qué elegir. 4 opciones plausibles (distractores creíbles), UNA correcta (índice 0-3) y una explicación de 1-2 frases. Español neutro de LATAM, SIN voseo. Datos técnicamente correctos. Devolvé SOLO JSON:
{"cases":[{"route":"<ruta/tema breve>","lang":"yaml|bash|sql|kql|json|csharp|python","code":"<fragmento, \\n entre líneas>","question":"<pregunta>","options":["...","...","...","..."],"correct":0,"explanation":"..."}]}`;
    try {
      const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: `Sos examinador ${certCode()} experto en ${certDomain().platformShort}. Preguntas de escenario realistas y técnicamente correctas. SOLO JSON válido y COMPLETO.` }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.5, max_tokens: 7000 });
      recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "scenario-cases" });
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { cases?: any[] };
      const cases: Case[] = (Array.isArray(raw.cases) ? raw.cases : []).map((s: any) => ({
        route: String(s?.route ?? "").trim(),
        code: String(s?.code ?? "").trim(),
        question: String(s?.question ?? "").trim(),
        options: (Array.isArray(s?.options) ? s.options : []).map((o: any) => String(o ?? "").trim()).filter(Boolean),
        correct: Number.isInteger(s?.correct) && s.correct >= 0 && s.correct < 4 ? s.correct : 0,
        explanation: String(s?.explanation ?? "").trim(),
      })).filter((s: Case) => s.question && s.options.length === 4 && s.code);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      if (cases.length) groups.push({ dom: g, cases });
    } catch { /* dominio falla → se saltea, no rompe la sección */ }
  }
  const total = groups.reduce((s, x) => s + x.cases.length, 0);
  if (total === 0) return { ok: false, error: "El modelo no devolvió casos." };

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const letter = (i: number) => String.fromCharCode(65 + i);
  let nidx = 0;
  const keyRows: string[] = [];
  const body = groups.map(({ dom, cases }) => {
    const items = cases.map((c) => {
      nidx++;
      keyRows.push(`<div class="scn-key-row"><b>${nidx}.</b> <span class="scn-key-a">${letter(c.correct)}</span> — ${esc(c.explanation)}</div>`);
      const opts = c.options.map((o, i) => `<li class="scn-opt"><b>${letter(i)}.</b> ${esc(o)}</li>`).join("");
      return `<div class="scn"><div class="scn-h"><span class="scn-n">${nidx}</span><span class="scn-r">${esc(c.route)}</span></div><pre class="scn-code">${esc(c.code)}</pre><p class="scn-q">${esc(c.question)}</p><ol class="scn-opts">${opts}</ol></div>`;
    }).join("");
    return `<h2 class="scn-dom">${esc(dom.label)} · peso del examen ${esc(dom.weight)}</h2>${items}`;
  }).join("");
  const key = `<h2 class="scn-key-h">Hoja de respuestas</h2><div class="scn-key">${keyRows.join("")}</div>`;
  const html = `<p>Casos tipo examen ${certCode()}, distribuidos por el peso de cada dominio en el examen: un caso real con código o configuración donde hay que razonar qué falla, qué falta o qué elegir — el formato en que realmente pregunta el ${certCode()}. <strong>Las respuestas, con su explicación, están al final de la sección, en la hoja de respuestas.</strong></p>${body}${key}`;
  return { ok: true, html, count: total };
}
