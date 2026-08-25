import { upsertSource, sourceId, hashText } from "./source-store.js";
import type { Source, SourceKind } from "../types.js";

/** Tope de texto guardado por fuente (suficiente para anclar, evita stores enormes). */
const MAX_TEXT = 20000;

const stripTags = (s: string) => s.replace(/<[^>]+>/g, " ");

/**
 * HTML → Markdown LIGERO (preserva la estructura del documento, no la aplana).
 * Conserva títulos/secciones (#/##/###), listas (-) y bloques de código (```),
 * con saltos de línea reales. Así el autor del Atlas VE las secciones de la
 * fuente y puede espejarlas en los módulos de la página (en vez de inventarlas),
 * y el verificador puede anclar por sección.
 */
export function htmlToText(html: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  // Preferir el CONTENIDO principal. El <article> es MÁS específico que <main>.
  const article = h.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ?? h.match(/<main\b[\s\S]*?<\/main>/i)?.[0];
  if (article) h = article;
  // Cortar desde el primer <h1> (toda la barra de acciones/TOC va antes).
  const h1 = h.search(/<h1[\s>]/i);
  if (h1 > 0) h = h.slice(h1);
  // Quitar cromo aunque venga dentro del main/article.
  h = h
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // ── PRESERVAR ESTRUCTURA → Markdown ligero ──
  h = h
    // bloques de código (antes del strip general; conserva el cuerpo)
    .replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_m, code) => `\n\n\`\`\`\n${stripTags(code).trim()}\n\`\`\`\n\n`)
    // encabezados → #/##/###/####
    .replace(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi, (_m, t) => `\n\n# ${stripTags(t).trim()}\n\n`)
    .replace(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi, (_m, t) => `\n\n## ${stripTags(t).trim()}\n\n`)
    .replace(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi, (_m, t) => `\n\n### ${stripTags(t).trim()}\n\n`)
    .replace(/<h4\b[^>]*>([\s\S]*?)<\/h4>/gi, (_m, t) => `\n\n#### ${stripTags(t).trim()}\n\n`)
    // ítems de lista → "- "
    .replace(/<li\b[^>]*>/gi, "\n- ").replace(/<\/li>/gi, "")
    // cierres de bloque → newline
    .replace(/<\/(p|div|tr|ul|ol|section|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    // resto de tags fuera
    .replace(/<[^>]+>/g, " ");

  // Entidades + normalizar espacios CONSERVANDO los saltos de línea.
  let out = h
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")        // colapsa espacios/tabs, NO saltos
    .replace(/ *\n */g, "\n")       // limpia espacios alrededor de los saltos
    .replace(/\n{3,}/g, "\n\n")     // máx 2 saltos seguidos
    .trim();
  // FIN DEL CONTENIDO: la sección de Feedback ("Was this page helpful?") es el
  // widget de feedback, no contenido. Cortamos desde ahí (lo más temprano).
  const cut = out.search(/\n#{1,6}\s*Feedback\b|Was this page helpful\?/i);
  if (cut > 0) out = out.slice(0, cut).trim();
  return out;
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return og[1].trim();
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return t?.[1] ? t[1].replace(/\s+/g, " ").trim() : null;
}

export function inferKind(url: string): SourceKind {
  if (/learn\.microsoft\.com/i.test(url)) return "mslearn";
  if (/\/docs?\.|\/documentation|developer\./i.test(url)) return "doc";
  return "web";
}

/** Fetch + extracción de texto de una URL (MS Learn / docs / web). Real. */
export async function ingestUrl(
  url: string,
  kind?: SourceKind,
): Promise<{ ok: true; source: Source } | { ok: false; error: string }> {
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "URL inválida (debe empezar con http/https)" };
  let res: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    res = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "CloudBooksEngine/1.0 (grounding)" } });
    clearTimeout(timer);
  } catch (err) {
    const error = `fetch falló: ${String((err as Error)?.message ?? err)}`;
    console.warn(`[ingest] ${url} → ${error}`);
    return { ok: false, error };
  }
  if (!res.ok) {
    console.warn(`[ingest] ${url} → HTTP ${res.status} ${res.statusText} (fuente NO ingerida)`);
    return { ok: false, error: `HTTP ${res.status} ${res.statusText}` };
  }
  const ct = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  const isHtml = /html|xml/i.test(ct) || /^\s*<(?:!doctype|html)/i.test(raw);
  const text = (isHtml ? htmlToText(raw) : raw).slice(0, MAX_TEXT);
  if (text.length < 40) {
    console.warn(`[ingest] ${url} → texto extraíble insuficiente (${text.length} chars)`);
    return { ok: false, error: "La fuente no tiene texto extraíble suficiente." };
  }
  const title = (isHtml ? extractTitle(raw) : null) ?? url;
  const k = kind ?? inferKind(url);
  const source = upsertSource({ id: sourceId(url, title), kind: k, title, url, text, hash: hashText(text) });
  return { ok: true, source };
}

/** Parser CSV robusto (campos entrecomillados, comas y saltos dentro de comillas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}

const HEADER_RE = /title|t[ií]tulo|titulo|url|link|enlace|fuente|source|text|texto|nota|tema/i;

/** Ingerir CSV pegado: cada fila → una fuente (mapeo flexible de columnas). */
export function ingestCsvText(csv: string): { ok: true; sources: Source[] } | { ok: false; error: string } {
  const rows = parseCsv(csv);
  if (!rows.length) return { ok: false, error: "CSV vacío" };
  const head = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  const hasHeader = head.some((h) => HEADER_RE.test(h));
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const ti = hasHeader ? col(["title", "título", "titulo", "tema", "fuente", "source"]) : 0;
  const ui = hasHeader ? col(["url", "link", "enlace"]) : 1;
  const xi = hasHeader ? col(["text", "texto", "nota", "notas", "detalle"]) : 2;
  const body = hasHeader ? rows.slice(1) : rows;
  const sources: Source[] = [];
  for (const r of body) {
    const title = (ti >= 0 ? r[ti] ?? "" : r[0] ?? "").trim();
    const url = ((ui >= 0 ? r[ui] ?? "" : "").trim()) || null;
    const text = ((xi >= 0 ? r[xi] ?? "" : "").trim()) || r.join(" · ");
    if (!title && !url && !text.trim()) continue;
    const label = title || text.slice(0, 60) || (url ?? "fuente");
    sources.push(upsertSource({ id: sourceId(url, label), kind: "sheet", title: label, url, text: text.slice(0, MAX_TEXT), hash: hashText(text) }));
  }
  if (!sources.length) return { ok: false, error: "No se detectaron filas con datos." };
  return { ok: true, sources };
}

/** Convierte una URL de Google Sheets a su export CSV (la hoja debe ser pública). */
export function sheetUrlToCsv(url: string): string | null {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m?.[1]) return null;
  const gid = (url.match(/[#&?]gid=(\d+)/) ?? [])[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

export async function ingestSheetUrl(url: string): Promise<{ ok: true; sources: Source[] } | { ok: false; error: string }> {
  const csvUrl = sheetUrlToCsv(url);
  if (!csvUrl) return { ok: false, error: "No parece una URL de Google Sheets." };
  let res: Response;
  try {
    res = await fetch(csvUrl, { headers: { "user-agent": "CloudBooksEngine/1.0" } });
  } catch (err) {
    return { ok: false, error: `fetch falló: ${String((err as Error)?.message ?? err)}` };
  }
  if (!res.ok) return { ok: false, error: `HTTP ${res.status} (¿la hoja es pública / 'cualquiera con el link'?)` };
  return ingestCsvText(await res.text());
}
