import { existsSync } from "node:fs";
import path from "node:path";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { CONFIG, pageOutputDir } from "../config.js";
import { getSeed } from "../seeds.js";
import { getApprovals } from "../infographic-approvals.js";
import { certMetaByEngineId } from "../certifications.js";
import { getBookConfig } from "./book-config.js";

/**
 * GENERADOR CON IA por sección del libro. Redacta los bloques NO-atlas (prefacio,
 * intro, conclusiones, contraportada, notas, mapeo de dominios) anclado a las
 * skills/dominios APROBADOS. El humano revisa lo que llega al editor y aprueba.
 * Copyright NO se genera (reproducible entre libros de la colección).
 */

// Identidad del libro POR CERT + FORMATO (AI-200 conserva su título curado, byte-idéntico en el `ground` del LLM).
// `series` deriva del FORMATO activo: un Master Book NO debe rotularse "Visual Atlas" (evita el bleed atlas→master).
function book(): { cert: string; title: string; series: string; isMaster: boolean } {
  const m = certMetaByEngineId(CONFIG.certId);
  const isMaster = CONFIG.format === "master-book";
  return { cert: m.code, title: m.code === "AI-200" ? "Desarrollo en Azure de Soluciones de IA" : m.title, series: isMaster ? "Master Book" : "Visual Atlas", isMaster };
}

export type BookSection = "preface" | "intro" | "conclusions" | "backcover" | "collectionNote" | "domainNote" | "domainRows";
export interface BookGenResult { ok: boolean; html?: string; note?: string; rows?: { skill: string; domain: string; notes: string }[]; error?: string }

function ctx(): { count: number; domains: string[]; skills: { title: string; domain: string }[] } {
  if (CONFIG.format === "master-book") {
    // El Master NO tiene láminas aprobadas (su unidad es el capítulo): se ancla en las RUTAS del
    // mapa de dominios, ya curado por cert. Así el ground refleja el libro documental, no un atlas.
    const rows = getBookConfig().domainMap?.rows ?? [];
    const domains = [...new Set(rows.map((r) => r.skill).filter(Boolean))];
    return { count: domains.length, domains, skills: rows.map((r) => ({ title: r.skill, domain: r.skill })) };
  }
  const appr = getApprovals();
  const ids = Object.entries(appr.pages).filter(([, v]) => v.approved).map(([k]) => k).sort()
    .filter((id) => existsSync(path.join(pageOutputDir(id), "infographic.png")));
  const skills = ids.map((id) => { const s = getSeed(id); return { title: s?.title ?? id, domain: s?.domainLabel ?? "" }; });
  const domains = [...new Set(skills.map((s) => s.domain).filter(Boolean))];
  return { count: ids.length, domains, skills };
}

const SYS = "Sos editor de libros de certificación cloud (CloudBooks). Escribís en ESPAÑOL NEUTRO de Latinoamérica, claro y premium. PROHIBIDO el voseo argentino: NO uses formas como 'mantené', 'recorré', 'usá', 'tené', 'leé', 'fijate'; usá imperativo/segunda persona neutra (mantén, recorre, usa, ten, lee, fíjate). Devolvés SOLO el HTML pedido, sin explicaciones ni ```.";
const PROMPTS: Record<"preface" | "intro" | "conclusions" | "backcover", string> = {
  preface: `Escribí el PREFACIO del libro: 2 párrafos breves, tono editorial y motivador, sobre por qué un atlas visual (cada skill condensada en una lámina) supera a leer cientos de páginas. HTML: solo <p>…</p> (NO pongas <h1>, ya hay rótulo).`,
  intro: `Escribí "Cómo usar este atlas" en HTML: solo el CUERPO (NO pongas <h1>, ya hay rótulo) — un <p> introductorio (aclarando que cada skill es una lámina visual; la mayoría en una página y las unidades densas en dos páginas enfrentadas), una <ul class="feat"> con 4 <li> que empiecen con <strong>…</strong> — (Pregunta guía, Bloques numerados —hasta ocho—, Trampas del examen, Verificación autocheck), y un <p> de cierre sobre el método de estudio.`,
  conclusions: `Escribí el cierre "Antes del examen" en HTML: solo el CUERPO (NO pongas <h1>, ya hay rótulo) — un <p>, una <ul> con 3-4 <li> de tips concretos de repaso, y un <p> final motivador. Tono: criterio sobre memoria.`,
  backcover: `Escribí la CONTRAPORTADA (texto de venta) en HTML, con CUERPO: <p class="bc-blurb">… (2-3 frases gancho que vendan el libro y enganchen)</p>, luego <p class="bc-lead">Qué vas a dominar</p> y <ul class="bc-list"> con 4-5 <li> de beneficios concretos (qué aprende, las trampas del examen, los autochecks, la utilidad real). Marketing premium, persuasivo.`,
};
// Prompts del MASTER BOOK: libro documental (rutas → capítulos en profundidad), NO atlas visual.
// PROHIBIDO decir "atlas", "láminas" o "autochecks": este libro tiene capítulos, exposición y figuras.
const MASTER_PROMPTS: Record<"preface" | "intro" | "conclusions" | "backcover", string> = {
  preface: `Escribí el PREFACIO de un LIBRO DE ESTUDIO documental (Master Book), NO un atlas visual: 2-3 párrafos, tono editorial premium y motivador, sobre por qué este libro recorre el temario oficial EN PROFUNDIDAD —ruta por ruta, capítulo por capítulo, con exposición clara, figuras y criterio— y cómo acompaña de cero a nivel examen. NO uses las palabras "atlas", "lámina" ni "autocheck". HTML: solo <p>…</p> (NO pongas <h1>, ya hay rótulo).`,
  intro: `Escribí "Cómo usar este libro" para un Master Book documental en HTML: solo el CUERPO (NO pongas <h1>, ya hay rótulo) — un <p> introductorio (el libro se organiza en RUTAS y CAPÍTULOS que desarrollan cada tema en profundidad, con exposición, figuras y puntos clave), una <ul class="feat"> con 4 <li> que empiecen con <strong>…</strong> — (Capítulos por ruta, Exposición en profundidad, Figuras y diagramas, Puntos clave por capítulo), y un <p> de cierre sobre cómo estudiarlo (leer por ruta, apoyarse en las figuras, repasar los puntos clave). NO uses "atlas", "lámina" ni "autocheck".`,
  conclusions: `Escribí el cierre "Antes del examen" para un Master Book en HTML: solo el CUERPO (NO pongas <h1>, ya hay rótulo) — un <p>, una <ul> con 3-4 <li> de tips concretos de repaso (releer los puntos clave de cada capítulo, priorizar las rutas de mayor peso, practicar en el producto real), y un <p> final motivador. Tono: criterio sobre memoria. NO uses "atlas" ni "lámina".`,
  backcover: `Escribí la CONTRAPORTADA (texto de venta) de un Master Book en HTML, con CUERPO: <p class="bc-blurb">… (2-3 frases gancho)</p>, luego <p class="bc-lead">Qué vas a dominar</p> y <ul class="bc-list"> con 4-5 <li> de beneficios concretos (cobertura íntegra del temario, exposición en profundidad, figuras y diagramas, criterio de examen). Marketing premium, persuasivo. NO uses "atlas" ni "lámina".`,
};

export async function generateBookSection(key: BookSection): Promise<BookGenResult> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI cargada." };
  const openai = getOpenAI();
  if (!openai) return { ok: false, error: "Sin cliente OpenAI." };
  const c = ctx();
  const BOOK = book();
  const ground = BOOK.isMaster
    ? `Libro: ${BOOK.title} — ${BOOK.series}, certificación ${BOOK.cert}. Libro de estudio DOCUMENTAL organizado en ${c.count} rutas, cada una con capítulos en profundidad (exposición, figuras y puntos clave). Rutas: ${c.domains.join(" · ") || "(varias)"}.`
    : `Libro: ${BOOK.title} — ${BOOK.series}, certificación ${BOOK.cert}. ${c.count} láminas. Dominios: ${c.domains.join(" · ") || "(varios)"}. Skills cubiertas: ${c.skills.map((s) => s.title).slice(0, 40).join(", ") || "(en preparación)"}.`;

  try {
    if (key === "domainRows") {
      const user = `Para el libro de la certificación ${BOOK.cert}, generá el MAPEO DE DOMINIOS. Estas son las skills y su dominio:\n${c.skills.map((s) => `- ${s.title} → ${s.domain}`).join("\n") || "(sin skills aprobadas)"}\nDevolvé JSON {"rows":[{"skill","domain","notes"}]} — una fila por skill, agrupadas por dominio; "notes" = "dónde hacer foco": un PÁRRAFO BREVE (1-2 frases, ~25-40 palabras) que explique qué priorizar, el concepto clave y la trampa típica de esa skill. Español.`;
      const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: "Sos editor técnico. Devolvés SOLO JSON válido." }, { role: "user", content: user }], response_format: { type: "json_object" }, temperature: 0.4, max_tokens: 1600 });
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { rows?: unknown };
      const rows = Array.isArray(raw.rows) ? raw.rows.map((r) => { const o = r as Record<string, unknown>; return { skill: String(o.skill ?? ""), domain: String(o.domain ?? ""), notes: String(o.notes ?? "") }; }).filter((r) => r.skill) : [];
      return rows.length ? { ok: true, rows } : { ok: false, error: "El modelo no devolvió filas." };
    }

    if (key === "collectionNote" || key === "domainNote") {
      const ask = key === "collectionNote"
        ? `Escribí UNA frase (sin HTML) invitando a sumar los otros formatos/libros de la colección ${BOOK.cert} de CloudBooks a la preparación.`
        : `Escribí UN párrafo (sin HTML) que explique para qué sirve la tabla de mapeo de dominios y cómo priorizar el estudio según el peso de cada dominio del examen ${BOOK.cert}.`;
      const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: SYS }, { role: "user", content: `${ground}\n\n${ask}` }], temperature: 0.6, max_tokens: 300 });
      const note = (res.choices[0]?.message?.content ?? "").trim().replace(/<[^>]+>/g, "").trim();
      return note ? { ok: true, note } : { ok: false, error: "Respuesta vacía." };
    }

    const prompts = BOOK.isMaster ? MASTER_PROMPTS : PROMPTS;
    const res = await openai.chat.completions.create({ model: CONFIG.authorModel, messages: [{ role: "system", content: SYS }, { role: "user", content: `${ground}\n\n${prompts[key]}` }], temperature: 0.6, max_tokens: 900 });
    const html = (res.choices[0]?.message?.content ?? "").trim().replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();
    return html ? { ok: true, html } : { ok: false, error: "Respuesta vacía." };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}
