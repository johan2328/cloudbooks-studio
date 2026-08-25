import { readFileSync, existsSync } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFile, withLock } from "../fs-safe.js";
import { paletteFor } from "./palette-defs.js";

/**
 * CONFIG DEL LIBRO (composición editorial). Da GOBIERNO y DETERMINISMO sobre todo
 * lo que NO es atlas: portada subida + estilo derivado, bloques HTML editables
 * (copyright, prefacio, intro, conclusiones, contraportada), colección (cross-sell),
 * mapeo de dominios, y toggles de sección. Persistido en JSON por libro.
 */

export interface BookStyle { bg: string; accent: string; accent2: string; text: string; onDark: string }
export interface CollectionItem { id: string; coverUrl: string; title: string; buyUrl: string }
export interface DomainMapRow { skill: string; domain: string; notes: string }

/** Intro por ruta: imagen formateada (subida por el usuario) y/o texto-síntesis (generado, fallback). */
export interface RouteIntro { imageUrl: string | null; text: string }

export interface BookConfig {
  style: BookStyle;
  cover: { mode: "generated" | "uploaded"; imageUrl: string | null; palette: string[] };
  blocks: { copyright: string; preface: string; intro: string; conclusions: string; studyGuide: string; glossary: string; scenarioReview: string };
  /** Una intro por dominio/ruta (p1..p9): keyed por domainId. */
  routeIntros: Record<string, RouteIntro>;
  backCover: { mode: "auto" | "template"; imageUrl: string | null; html: string; isbn: string; price: string; overlay: { top: number; left: number; width: number; color: string; align: "left" | "center" | "right" } };
  collection: { note: string; items: CollectionItem[] };
  domainMap: { note: string; rows: DomainMapRow[] };
  sections: { copyright: boolean; preface: boolean; collection: boolean; domainMap: boolean; intro: boolean; studyGuide: boolean; routeIntros: boolean; conclusions: boolean; scenarioReview: boolean; glossary: boolean; bibliography: boolean; backCover: boolean };
  /** Ficha comercial del libro (Publicación · Plan G): generada por IA + editable, para vender en la tienda. */
  ficha: { synopsis: string; about: string[]; categories: string[]; tags: string[]; marketingBlurb: string; toc: string; samples: string[]; status: "borrador" | "listo" | "publicado"; updatedAt: string };
}

/** Contenido editable de la ficha comercial (sub-objeto `ficha` de BookConfig). */
export type FichaConfig = BookConfig["ficha"];

/** Estilo base (Visual Atlas) — navy/azul/violeta. La tapa puede override-arlo. */
const DEFAULT_STYLE: BookStyle = { bg: "#061B49", accent: "#2563EB", accent2: "#7C3AED", text: "#0F1B3D", onDark: "#FFFFFF" };

export const DEFAULT_CONFIG: BookConfig = {
  style: DEFAULT_STYLE,
  cover: { mode: "generated", imageUrl: null, palette: [] },
  blocks: {
    copyright: `<p class="cp-brand">CloudBooks</p>
<p class="cp-sub">Visual Atlas — AI-200 · Desarrollo en Azure de Soluciones de IA</p>
<p>© 2026 CloudBooks. Todos los derechos reservados. Ninguna parte de esta obra puede reproducirse sin autorización escrita del editor.</p>
<p>Microsoft, Azure y los nombres de servicios son marcas de Microsoft Corporation. Esta obra es material de estudio independiente.</p>
<p>Primera edición · 2026.</p>`,
    preface: `<p>Estudiar para una certificación cloud suele significar leer cientos de páginas y memorizar lo que no se entiende. Este atlas nace de la idea contraria: <strong>una skill, una lámina</strong>, pensada para fijar el concepto y su trampa de un vistazo.</p>
<p>Cada página condensa lo esencial de un objetivo del examen AI-200 en una infografía: el concepto desarmado, el error frecuente y una verificación tipo examen. No reemplaza la documentación oficial — la <em>destila</em> para que rinda en el examen y en el trabajo real.</p>
<p>Úsalo como un mapa: no para leerlo de corrido, sino para ubicarte rápido, volver a lo que flaquea y llegar al examen con criterio en lugar de memoria. Cada lámina es una parada; las trampas, los desvíos donde caen los demás. Si entiendes por qué cada corrección es correcta, ya tienes media certificación.</p>
<p>El AI-200 cubre bastante terreno —contenedores, bases de datos vectoriales, mensajería e integración de servicios backend, con la seguridad y la observabilidad que un caso real exige— y por eso un mapa visual rinde más que un manual extenso: muestra el bosque sin perderte en cada árbol.</p>
<p>Recórrelo a tu ritmo, marca las láminas que más te cuesten y vuelve a ellas seguido. Cuando una trampa te resulte obvia de solo verla, esa batalla ya está ganada.</p>
<p>Cada ruta abre con una <strong>introducción</strong> que sintetiza lo que vas a encontrar, y al final del libro hay un <strong>glosario</strong> con los términos clave: si una lámina te pierde en la abstracción, vuelve al glosario para reorientarte.</p>`,
    intro: `<p>Este libro convierte cada skill del examen <strong>AI-200</strong> en una <strong>lámina visual</strong>: el concepto, sus matices y la trampa donde caen la mayoría, listos para fijar de un vistazo. La mayoría de las unidades entran en una página; las más densas se despliegan en dos páginas enfrentadas para que cada bloque respire.</p>
<ul class="feat">
  <li><strong>Pregunta guía</strong> — la idea que organiza la lámina.</li>
  <li><strong>Bloques numerados</strong> — el concepto desarmado en diagramas (hasta ocho por unidad, según lo que la fuente enseñe).</li>
  <li><strong>Trampas del examen</strong> — el mito frecuente y su corrección.</li>
  <li><strong>Verificación autocheck</strong> — una pregunta tipo examen con su respuesta.</li>
</ul>
<p>Recorre las láminas en orden o saltea al dominio que te falta. Lee primero la pregunta guía, estudia los bloques numerados, presta atención a las trampas y responde el autocheck tapando la respuesta. Cuando el autocheck te salga solo, esa skill está lista.</p>
<p>No se trata de memorizar las láminas, sino de entenderlas. Un diagrama bien leído vale más que diez definiciones sueltas: te permite reconstruir la respuesta aunque la pregunta venga disfrazada, que es justo lo que hace el examen.</p>
<p>Ten el atlas a mano mientras haces simulacros. Cada vez que falles una pregunta, busca la lámina del tema y vuelve a su trampa. Ese ida y vuelta entre práctica y lámina es lo que de verdad fija el conocimiento antes del día del examen.</p>`,
    conclusions: `<p>Llegaste al final del atlas. Estas últimas pasadas valen oro:</p>
<ul>
  <li>Repasa <strong>solo las trampas</strong> de cada lámina: son los errores que el examen busca.</li>
  <li>Resuelve los <strong>autochecks</strong> de corrido, tapando las respuestas; marca los que dudes.</li>
  <li>Vuelve a las láminas de los autochecks fallados — ahí está tu brecha real.</li>
  <li>El día del examen, lee cada pregunta buscando la trampa antes de elegir.</li>
</ul>
<p>El examen premia el criterio, no la memoria. Si entiendes <em>por qué</em> cada corrección es correcta, ya lo tienes.</p>
<p>Descansa la noche anterior y llega con tiempo. El examen no mide cuánto sabes bajo presión, sino cuánto entiendes con la cabeza clara: lee cada enunciado dos veces, descarta lo absurdo y elige lo que defenderías frente a un colega.</p>
<p>Y cuando lo apruebes, este atlas no deja de servir: las mismas láminas que te prepararon son la referencia que vas a abrir en el trabajo, cuando tengas que decidir el tier, la red o la identidad correcta para un caso real de producción. Éxitos.</p>`,
    studyGuide: "",
    glossary: "",
    scenarioReview: "",
  },
  routeIntros: {},
  backCover: { mode: "auto", imageUrl: null, html: "", isbn: "978-987-00000-0-0", price: "", overlay: { top: 12, left: 9, width: 55, color: "#0F1B3D", align: "left" } },
  collection: {
    note: "La colección completa AI-200 en CloudBooks — suma los otros formatos a tu preparación.",
    items: [],
  },
  domainMap: {
    note: "El examen AI-200 se organiza en dominios con peso distinto. Esta tabla mapea cada skill a su dominio y marca dónde poner el foco: priorizá los dominios de mayor peso y las skills con trampas frecuentes.",
    rows: [
      { skill: "Soluciones contenerizadas en Azure", domain: "Dominio 1", notes: "Empezá por acá: dominá Azure Container Registry —registro, push, tags vs digest, identidad administrada y Private Endpoints— y cómo se despliega en AKS y Container Apps. Es la base de todo el examen y donde más se cae, por confundir los tiers o creer que la tag :latest es inmutable. Si entendés cuándo conviene Premium y por qué, ya partís con ventaja." },
    ],
  },
  sections: { copyright: true, preface: true, collection: false, domainMap: true, intro: true, studyGuide: true, routeIntros: true, conclusions: true, scenarioReview: true, glossary: true, bibliography: true, backCover: true },
  ficha: { synopsis: "", about: [], categories: [], tags: [], marketingBlurb: "", toc: "", samples: [], status: "borrador", updatedAt: "" },
};

// Config namespaceada por LIBRO ACTIVO (cert+formato) → Master Book y Atlas no se pisan.
const FILE = (): string => path.join(CONFIG.outputRoot, `_book-config.${CONFIG.certId}.${CONFIG.format}.json`);
// El Atlas guardaba su config en el archivo global legacy; se lee de ahí hasta el 1er save (migración no destructiva).
const LEGACY_FILE = (): string => path.join(CONFIG.outputRoot, "_book-config.json");

/** Merge superficial con defaults para tolerar configs viejas/parciales. */
function withDefaults(p: Partial<BookConfig> | null): BookConfig {
  if (!p) return structuredClone(DEFAULT_CONFIG);
  const d = DEFAULT_CONFIG;
  return {
    style: { ...d.style, ...(p.style ?? {}) },
    cover: { ...d.cover, ...(p.cover ?? {}) },
    blocks: { ...d.blocks, ...(p.blocks ?? {}) },
    routeIntros: { ...d.routeIntros, ...(p.routeIntros ?? {}) },
    backCover: { ...d.backCover, ...(p.backCover ?? {}) },
    collection: { ...d.collection, ...(p.collection ?? {}) },
    domainMap: { ...d.domainMap, ...(p.domainMap ?? {}) },
    sections: { ...d.sections, ...(p.sections ?? {}) },
    ficha: { ...d.ficha, ...(p.ficha ?? {}) },
  };
}

function stylesEqual(a: BookStyle, b: BookStyle): boolean {
  return a.bg === b.bg && a.accent === b.accent && a.accent2 === b.accent2 && a.text === b.text && a.onDark === b.onDark;
}

/** Config CRUDA persistida (sin auto-paleta) — base para el merge de saveBookConfig. */
function loadRawConfig(): BookConfig {
  try {
    if (existsSync(FILE())) return withDefaults(JSON.parse(readFileSync(FILE(), "utf8")) as Partial<BookConfig>);
    // Migración no destructiva: el Atlas tenía su config en el archivo global legacy.
    if (CONFIG.format === "visual-atlas" && existsSync(LEGACY_FILE())) {
      return withDefaults(JSON.parse(readFileSync(LEGACY_FILE(), "utf8")) as Partial<BookConfig>);
    }
  } catch { /* corrupto → defaults */ }
  return structuredClone(DEFAULT_CONFIG);
}

export function getBookConfig(): BookConfig {
  const cfg = loadRawConfig();
  // Auto-paleta por formato: si el estilo nunca se customizó (== DEFAULT_STYLE), el libro adopta la
  // paleta canónica de SU formato (Atlas azul→teal, Master teal→verde, …). NO se persiste; si el
  // usuario aplica paleta o sube portada, cfg.style ≠ DEFAULT_STYLE y se respeta.
  if (stylesEqual(cfg.style, DEFAULT_STYLE)) cfg.style = { ...paletteFor(CONFIG.format) };
  return cfg;
}

/** Merge RECURSIVO: combina el patch sobre la base por sub-objeto (no reemplaza el contenedor
 *  entero). Arrays y primitivos se reemplazan; objetos planos se fusionan en profundidad.
 *  Así un patch parcial de `blocks`/`routeIntros[pN]` NO pisa los hermanos (glosario, imageUrl, etc.). */
function deepMerge<T>(base: T, patch: Partial<T>): T {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const out: any = { ...(base as any) };
  for (const k of Object.keys(patch as object)) {
    const pv: any = (patch as any)[k];
    const bv: any = out[k];
    if (pv === undefined) continue;
    if (pv && typeof pv === "object" && !Array.isArray(pv) && bv && typeof bv === "object" && !Array.isArray(bv)) {
      out[k] = deepMerge(bv, pv);
    } else { out[k] = pv; }
  }
  return out as T;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export async function saveBookConfig(patch: Partial<BookConfig>): Promise<BookConfig> {
  // withLock + deep-merge: read-modify-write atómico (serializa saves concurrentes) y NO pisa
  // sub-objetos hermanos al recibir un patch parcial (evita borrar divisores / casos / glosario).
  return withLock("book-config", async () => {
    const next = withDefaults(deepMerge(loadRawConfig(), patch));
    await atomicWriteFile(FILE(), JSON.stringify(next, null, 2), "book-config");
    return next;
  });
}

/** Decodifica un data URL de imagen y lo guarda en {certId}/_book/<name>.<ext> (ancla de marca
 *  POR-CERT). Devuelve su URL pública. Namespaced por cert → subir una canonical no pisa otras certs. */
export async function saveBookAsset(dataUrl: string, name: string): Promise<string | null> {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  const ext = m[1]!.toLowerCase() === "jpeg" ? "jpg" : m[1]!.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const safe = name.replace(/[^a-zA-Z0-9_-]/g, "");
  const dir = path.join(CONFIG.outputRoot, CONFIG.certId, "_book");
  await fsp.mkdir(dir, { recursive: true });
  const fname = `${safe}.${ext}`;
  await fsp.writeFile(path.join(dir, fname), Buffer.from(m[2]!, "base64"));
  return `${CONFIG.publicAssetsBase}/${CONFIG.certId}/_book/${fname}`;
}
