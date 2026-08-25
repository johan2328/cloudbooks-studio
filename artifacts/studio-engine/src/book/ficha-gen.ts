import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { wouldExceedCap, recordTextSpend } from "../cost.js";
import { getBookConfig, saveBookConfig, type FichaConfig } from "./book-config.js";
import { allModules, getOutline, getSkillTitleEs } from "../skills/ai-200-outline.js";
import { listPersistedChapters } from "../chapter-store.js";
import { listPersistedPages } from "../page-store.js";
import { certMetaByEngineId } from "../certifications.js";
import { listBookPreviews } from "./book-previews.js";
import { chapterHeading } from "./chapter-heading.js";

/**
 * FICHA COMERCIAL del libro (Publicación · Plan G). Un AGENTE redacta la copy de venta
 * (sinopsis, "acerca de", categorías, tags, blurb) desde el contenido REAL del libro; el
 * índice y las muestras se derivan de datos (sin LLM). Se persiste en `BookConfig.ficha`.
 * Molde = sections-gen.ts (getOpenAI + wouldExceedCap + recordTextSpend + json_object).
 */
const strip = (s: string): string => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Corpus real del libro para que el LLM lo resuma (capítulos del Master; módulos como fallback/Atlas). */
function bookCorpus(): string {
  const chapters = listPersistedChapters();
  if (chapters.length) {
    return chapters.slice(0, 14).map(c => {
      const kt = (c.seed.keyTakeaways ?? []).join("; ");
      return `• ${c.seed.title}${c.seed.subtitle ? ` — ${c.seed.subtitle}` : ""}\n${strip(c.seed.intro ?? "").slice(0, 380)}${kt ? `\nClaves: ${kt}` : ""}`;
    }).join("\n\n");
  }
  return allModules().map(m => `• ${m.moduleTitle} (${m.domainLabel})`).join("\n");
}

/** Nombre AMIGABLE del formato (nunca el slug crudo) — para que la copy no diga "visual-atlas". */
const FORMAT_LABELS: Record<string, string> = {
  "visual-atlas": "Visual Atlas (atlas visual)", "master-book": "Master Book (libro troncal)", "cheat-sheets": "Cheat Sheets",
  "exam-traps": "Exam Traps Guide", "question-bank": "Question Bank", "rapid-review": "Rapid Review",
};

/** Redacta la copy de venta con el LLM (agente "Redactor de ficha") y la persiste. */
export async function generateFichaCopy(): Promise<{ ok: boolean; ficha?: FichaConfig; error?: string }> {
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI." };
  const openai = getOpenAI(); if (!openai) return { ok: false, error: "Cliente OpenAI no disponible." };
  if (wouldExceedCap(0.02)) return { ok: false, error: "Tope de costo mensual alcanzado." };
  const meta = certMetaByEngineId(CONFIG.certId);
  const fmtLabel = FORMAT_LABELS[CONFIG.format] ?? CONFIG.format;
  const user = `Certificación: ${meta.code} — ${meta.title} (nivel ${meta.level}). Formato del libro: ${fmtLabel}.
Contenido REAL del libro (resumen de capítulos/temas):
${bookCorpus()}

Redactá la FICHA COMERCIAL para vender este libro en una tienda online. Español neutro (LATAM, sin voseo), tono vendedor pero honesto y concreto. NO uses el identificador técnico del formato (ej. "visual-atlas") en el texto; usá el nombre editorial. IMPORTANTE: este libro es un ${fmtLabel} — NO lo llames con el nombre de OTRO formato (si es un Master Book NO lo llames "Atlas" ni "Atlas Visual"; si es un Visual Atlas NO lo llames "Master Book"). Devolvé SOLO JSON válido:
{"synopsis": "2-3 párrafos que enganchen: de qué trata, para quién es y qué logra (para el examen y para el trabajo)",
 "about": ["4-6 bullets de 'qué vas a dominar' — concretos, orientados a resultados"],
 "categories": ["EXACTAMENTE 3 categorías AMPLIAS de tienda (dominios generales, NO tecnologías puntuales), ej. 'Azure', 'Inteligencia Artificial', 'Desarrollo cloud'"],
 "tags": ["6-10 keywords de búsqueda en minúsculas"],
 "marketingBlurb": "1 frase de gancho, máx 18 palabras"}`;
  let content = "{}";
  try {
    const res = await openai.chat.completions.create({
      model: CONFIG.authorModel,
      messages: [
        { role: "system", content: "Sos editor de marketing de libros técnicos de certificación. Devolvés SOLO JSON válido, sin markdown." },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" }, temperature: 0.5, max_tokens: 1100,
    });
    recordTextSpend(CONFIG.authorModel, res.usage, { kind: "text", label: "ficha-copy" });
    content = res.choices[0]?.message?.content ?? "{}";
  } catch (e) { return { ok: false, error: `El modelo falló: ${String((e as Error)?.message ?? e)}` }; }

  let p: { synopsis?: unknown; about?: unknown; categories?: unknown; tags?: unknown; marketingBlurb?: unknown };
  try { p = JSON.parse(content); } catch { return { ok: false, error: "Respuesta no-JSON del modelo." }; }
  const arr = (v: unknown): string[] => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : [];
  const cur = getBookConfig().ficha;
  const ficha: FichaConfig = {
    ...cur,
    synopsis: typeof p.synopsis === "string" ? p.synopsis.trim() : cur.synopsis,
    about: arr(p.about).length ? arr(p.about) : cur.about,
    categories: arr(p.categories).length ? arr(p.categories) : cur.categories,
    tags: arr(p.tags).length ? arr(p.tags) : cur.tags,
    marketingBlurb: typeof p.marketingBlurb === "string" ? p.marketingBlurb.trim() : cur.marketingBlurb,
    updatedAt: new Date().toISOString(),
  };
  await saveBookConfig({ ficha });
  return { ok: true, ficha };
}

/** Índice desde el contenido real, EN ESPAÑOL. Master = capítulos (ya ES); Atlas = ruta (ES) → láminas (ES). SIN LLM. */
export function buildFichaToc(): string {
  const chapters = listPersistedChapters();
  if (CONFIG.format === "master-book" && chapters.length) {
    return chapters.map(c => chapterHeading(c.seed).isCapstone ? c.seed.title : `${c.seed.chapterNumber}. ${c.seed.title}`).join("\n");
  }
  // Atlas: por ruta (domainLabel ya es ES) → láminas con título ES (getSkillTitleEs; si no, el título de la lámina persistida; nunca el moduleTitle EN de Microsoft).
  const seedTitleBySkill = new Map<string, string>();
  for (const p of listPersistedPages()) { const sid = p.seed.skillIds?.[0]; if (sid && !seedTitleBySkill.has(sid)) seedTitleBySkill.set(sid, p.seed.title); }
  const domains = getOutline().domains;
  if (domains.length) {
    const lines: string[] = [];
    for (const d of domains) {
      const units = d.skills.map(s => getSkillTitleEs(s.id) ?? seedTitleBySkill.get(s.id) ?? s.title).filter(Boolean);
      if (!units.length) continue;
      lines.push(d.label);
      for (const u of units) lines.push(`  · ${u}`);
    }
    if (lines.length) return lines.join("\n");
  }
  // Fallback (cert sin outline): módulos del temario.
  const byDom = new Map<string, string[]>();
  for (const m of allModules()) { const a = byDom.get(m.domainLabel) ?? []; a.push(m.moduleTitle); byDom.set(m.domainLabel, a); }
  return [...byDom.entries()].map(([dom, mods]) => `${dom}\n${mods.map(t => `  · ${t}`).join("\n")}`).join("\n");
}

/** Muestras SUGERIDAS: portada, contra, 1 apertura y VARIAS páginas INTERNAS de contenido
 *  (láminas del Atlas / divisores de capítulo del Master), para que la vista previa muestre el
 *  interior y no solo tapas/aperturas. SIN LLM. El usuario cura el set final con el selector. */
export function pickFichaSamples(): string[] {
  const previews = listBookPreviews();
  const covers = previews.filter(p => p.kind === "cover" || p.kind === "back").map(p => p.url);
  const openers = previews.filter(p => p.kind === "route").map(p => p.url);
  const inner = previews.filter(p => p.kind === "lamina" || p.kind === "chapter").map(p => p.url);
  // portada + contra + 1 apertura + hasta 7 páginas internas (prioriza el contenido)
  const out = [...covers, ...openers.slice(0, 1), ...inner.slice(0, 7)];
  // si no hay páginas internas (libro sin contenido), completar con las aperturas restantes
  if (!inner.length) out.push(...openers.slice(1, 8));
  return [...new Set(out)].slice(0, 10);
}

/** Orquesta la ficha: copy (LLM) + toc + samples (datos). `parts` filtra qué generar. */
export async function generateFicha(parts?: string[]): Promise<{ ok: boolean; ficha: FichaConfig; error?: string }> {
  const want = (p: string) => !parts || parts.length === 0 || parts.includes(p);
  let error: string | undefined;
  if (want("copy")) { const r = await generateFichaCopy(); if (!r.ok) error = r.error; }
  const patch: Partial<FichaConfig> = {};
  if (want("toc")) patch.toc = buildFichaToc();
  if (want("samples")) patch.samples = pickFichaSamples();
  if (Object.keys(patch).length) { await saveBookConfig({ ficha: { ...getBookConfig().ficha, ...patch, updatedAt: new Date().toISOString() } }); }
  return { ok: !error, ficha: getBookConfig().ficha, error };
}
