import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CONFIG, pageOutputDir, pagePublicBase } from "../config.js";
import { getBookConfig } from "./book-config.js";
import { renderToPdf, TEXT_OVERRIDE, balanceFigures } from "./assemble-book.js";
import { getPersistedChapter } from "../chapter-store.js";
import { certMetaByEngineId } from "../certifications.js";
import { chapterHeading } from "./chapter-heading.js";
import { generateChapterDivider } from "./chapter-divider-gen.js";
import { codeVoiceBody } from "./chapter-portadilla.js";
import type { ChapterSeed, PracticeItem } from "../types.js";

/**
 * Correcciones de CONTENIDO en render (casuística codificada, durable, no re-genera): (1) NOMBRES canónicos
 * de laboratorio unificados entre capítulos; (2) CALCOS de terminología; (3) ERRORES TÉCNICOS que el panel
 * de expertos (SME + premortem) cazó y que el grounding dio por "verified" sin verificar. Se aplica a la prosa
 * Y a los bloques <pre>. Los prompts de author/enrich/capstone se endurecen para no repetirlos (generación futura).
 */
// FIXUPS DE DOMINIO por cert (fuera del núcleo agnóstico). AI-200 tiene su set (nombres de lab + correcciones
// ACR/App Service/JMESPath/Key Vault); un cert NUEVO arranca SIN reglas → NO se le inyecta rg-ai200/inference-app/etc.
// Extensible por `_fixups.{certId}.json` persistido (data-driven, mismo patrón default-en-código + override que el
// contrato editorial). Barrido cross-cert Fase 1.
function ai200Fixups(t: string): string {
  return t
    // (1) Nombres canónicos del laboratorio AI-200.
    .replace(/api-inferencia-app/g, "inference-app")
    .replace(/api-inferencia/g, "inference-api")
    .replace(/\bmiACR\b/g, "myregistry")
    .replace(/\brg-app\b/g, "rg-ai200")
    .replace(/\bmyResourceGroup\b/g, "rg-ai200")
    .replace(/myDocumentProcessor/g, "inference-app")
    .replace(/docprocessor/g, "inference-api")
    .replace(/myAppServicePlan|\bmyPlan\b|\bplan-app\b/g, "plan-inference")
    // (3a) private endpoints de ACR requieren Premium.
    .replace(/no son exclusivos de Premium; verifique la disponibilidad por región y SKU según sus requisitos de red/,
      "requieren el SKU Premium, igual que la geo‑replicación, los tokens con scope maps y las claves administradas por el cliente (CMK)")
    // (3b) Variable de ACR Tasks inválida.
    .replace(/\{\{\.BuildID\}\}/g, "{{.Run.ID}}")
    // (3c) Comando de purga inexistente.
    .replace(/az acr repository purge/g, "una tarea programada de ACR (acr purge)")
    // (3d) show-manifests deprecado + JMESPath roto.
    .replace(/az acr repository show-manifests --name myregistry --repository inference-api -o table/,
      "az acr manifest list-metadata --registry myregistry --name inference-api -o table")
    .replace(/az acr repository show-manifests --name myregistry --repository inference-api --query[^\n]*?-o tsv/,
      "az acr repository show --name myregistry --image inference-api:1.0.0 --query digest -o tsv")
    .replace(/az acr repository show-manifests\s+--name\s+(\S+)\s+--repository\s+(\S+)/g,
      "az acr manifest list-metadata --registry $1 --name $2")
    .replace(/az acr repository show-manifests/g, "az acr manifest list-metadata")
    // (3e) Referencia a Key Vault → sintaxis oficial de App Service.
    .replace(/--settings "KeyVaultSecretUri=[^"]*"/,
      "--settings MI_SECRET=\"@Microsoft.KeyVault(SecretUri=https://mivault.vault.azure.net/secrets/MI-SECRET/)\"")
    // (3f) Log Analytics: valor válido + diagnostic setting.
    .replace(/--application-logging true --web-server-logging filesystem/,
      "--application-logging filesystem --web-server-logging filesystem\naz monitor diagnostic-settings create --name inference-diag --resource $(az webapp show --name inference-app --resource-group rg-ai200 --query id -o tsv) --workspace $(az monitor log-analytics workspace show --resource-group rg-ai200 --workspace-name la-workspace --query id -o tsv) --logs \"[{category:AppServiceConsoleLogs,enabled:true}]\"")
    // (3g) JMESPath ANIDADO inválido → forma correcta.
    .replace(/\[\?tags\[\?@==\s*'([^']+)'\]\]\.digest/g, "[?contains(tags, '$1')].digest")
    // Misceláneos del laboratorio AI-200.
    .replace(/--container-image-name\b/g, "--deployment-container-image-name")
    .replace(/multilayout/g, "multi-arquitectura")
    .replace(/\bone self-hosted\b/g, "uno autoalojado")
    .replace(/&& gunicorn app:application/g, "&& gunicorn --bind=0.0.0.0:8000 app:application");
}

/** Reglas de fixup PERSISTIDAS por-cert (data-driven, `_fixups.{certId}.json` = [{find, flags?, repl}]). Vacío = ninguna. */
function persistedFixups(t: string): string {
  try {
    const p = path.join(CONFIG.outputRoot, `_fixups.${CONFIG.certId}.json`);
    if (!existsSync(p)) return t;
    const rules = JSON.parse(readFileSync(p, "utf8")) as { find: string; flags?: string; repl: string }[];
    return rules.reduce((acc, r) => { try { return acc.replace(new RegExp(r.find, r.flags ?? "g"), r.repl); } catch { return acc; } }, t);
  } catch { return t; }
}

const CERT_FIXUP_FNS: Record<string, (t: string) => string> = { "ai-200": ai200Fixups };
/** Fixups de DOMINIO por cert = función registrada (default en código) + reglas persistidas (override data-driven). */
function applyCertFixups(t: string): string {
  const fn = CERT_FIXUP_FNS[CONFIG.certId] ?? ((x: string) => x);
  return persistedFixups(fn(t));
}

/**
 * Saneo del contenido generado: (a) NÚCLEO AGNÓSTICO (glifos de control, calcos de español, remisiones internas,
 * "Usted" a mitad de oración) — corre para CUALQUIER cert; (b) FIXUPS DE DOMINIO por cert (nombres de lab, comandos)
 * vía `applyCertFixups`. Un cert nuevo recibe SOLO el núcleo agnóstico → cero contaminación AI-200.
 * (Agnóstico y dominio operan sobre texto DISJUNTO — glifos/calcos vs identificadores/comandos — así que el orden es
 * equivalente al original y AI-200 queda idéntico.)
 */
export const fixContent = (t: string): string => applyCertFixups(String(t ?? "")
  // (0) SANEO DE GLIFOS: control-chars (C0/C1 salvo \t\n\r) + U+FFFD (una comilla tipográfica mal-codificada a byte de
  //     control salía "�" en el código). Determinista, agnóstico.
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f�]/g, "")
  // (2) Calcos de terminología (español).
  .replace(/\binofensivas\b/gi, "no sensibles").replace(/\binofensivos\b/gi, "no sensibles")
  .replace(/\binofensiva\b/gi, "no sensible").replace(/\binofensivo\b/gi, "no sensible")
  // (3h) Remisión rota: "Repase la sección s1" (id interno no visible) → genérico.
  .replace(/secci[oó]n\s+s\d+\b/gi, "sección correspondiente")
  // "sin filtre" → "sin filtro".
  .replace(/\bsin filtre\b/gi, "sin filtro")
  // "Usted"/"Ustedes" a MITAD de oración → minúscula (no toca inicio de oración ni siglas).
  .replace(/([a-záéíóúñü,;)]\s)Usted(es)?\b/g, "$1usted$2"));

/**
 * Divide una línea de comando en UN-flag-por-línea, SIN partir dentro de comillas (' o "): así "--bind"/
 * "--workers" que son args de gunicorn dentro de --startup-file NO se separan del string que los contiene.
 */
function splitFlagsPerLine(line: string): string {
  const indent = (/^\s*/.exec(line) ?? [""])[0];
  const s = line.trim();
  const parts: string[] = [];
  let start = 0, sq = false, dq = false, seenKeyEq = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i] ?? "";
    if (c === "'" && !dq) sq = !sq;
    else if (c === '"' && !sq) dq = !dq;
    else if (!sq && !dq && /\s/.test(c)) {
      if (s[i + 1] === "-" && s[i + 2] === "-" && /[A-Za-z]/.test(s[i + 3] ?? "")) {
        parts.push(s.slice(start, i)); start = i + 1;                   // corte por --flag
      } else if (/^[A-Z][A-Z0-9_]{2,}=/.test(s.slice(i + 1))) {         // corte por 2º+ KEY=VALUE (el 1º queda con su flag)
        if (seenKeyEq) { parts.push(s.slice(start, i)); start = i + 1; } else seenKeyEq = true;
      }
    }
  }
  parts.push(s.slice(start));
  return parts.map((p) => indent + p.trim()).filter((p, i) => i === 0 || p.trim()).join("\n");
}

/**
 * Normaliza los bloques de código a UN-flag-por-línea (unifica el formato: algunos venían de una línea larga
 * que hacía soft-wrap a mitad de token, otros ya venían un-flag-por-línea) → sin cortes feos ni backslash
 * (ilustrativo, como pidió el autor). Respeta las comillas (no parte valores como --startup-file "…").
 */
const reflowCodeBlocks = (html: string): string =>
  String(html ?? "").replace(/<pre([^>]*)>([\s\S]*?)<\/pre>/gi, (_m, _attrs: string, bodyRaw: string) => {
    // 0) SANEO DEL CÓDIGO: comillas tipográficas → rectas y guiones largos/medios → hyphen (en CLI/config deben ser
    //    ASCII rectos; los control-chars ya los quitó fixContent). NO se aplica a la prosa (ahí “ ” — son válidos).
    const body = bodyRaw
      .replace(/[“”„‟″]/g, '"')
      .replace(/[‘’‚‛′]/g, "'")
      .replace(/[–—]/g, "-");
    // 1) un-flag-por-línea (parte las líneas largas; respeta comillas).
    const lines = body.split("\n").flatMap((line) =>
      (line.match(/\s(?:--[A-Za-z]|[A-Z][A-Z0-9_]{2,}=)/g) || []).length < 2 ? [line] : splitFlagsPerLine(line).split("\n"));
    // 2) COPY-PASTE ejecutable: continuación con `\` dentro de un comando + línea en blanco entre comandos distintos.
    const blank = (l: string): boolean => !l.trim();
    const cont = (l: string): boolean => /^\s*(--|[A-Z][A-Z0-9_]{2,}=)/.test(l);          // flag o KEY=VALUE de env
    const head = (l: string): boolean => /^\s*(az|docker|kubectl|helm|bash|sh|pwsh|curl|kubelogin)\b/.test(l);
    const out: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "", next = lines[i + 1];
      if (head(line) && out.length && !blank(out[out.length - 1] ?? "")) out.push("");     // separador entre comandos
      const lastOfCmd = next === undefined || blank(next) || !cont(next);
      out.push(!blank(line) && !line.trim().startsWith("#") && !lastOfCmd ? line.replace(/\s*$/, " \\") : line);
    }
    // 3) cada COMANDO (grupo separado por línea en blanco) en un <span.cmd> break-inside:avoid → el salto de
    //    página cae ENTRE comandos, nunca a mitad de uno (y los bloques largos igual fluyen entre spans).
    // Se juntan los comandos SIN "\n\n" (que bajo white-space:pre-wrap dejaba 2 líneas muertas por frontera y quedaba
    // huérfano al partir página); la separación entre comandos la da el margen CSS `pre .cmd + .cmd`.
    const grouped = out.join("\n").split(/\n\s*\n+/).map((g) => g.trim() ? `<span class="cmd">${g}</span>` : "").filter(Boolean).join("");
    // SANEO: se DESCARTAN los attrs del <pre> del LLM (style=/class=) → TODOS los bloques de código caen al MISMO
    // box claro (`pre:not(.scn-code)`); antes un `<pre style="background:#…;color:#fff">` del modelo salía oscuro.
    return `<pre>${grouped}</pre>`;
  });

/**
 * RENDER DE CAPÍTULO del Master Book (Frente E). Emula el libro del Atlas:
 *  - PÁGINA 1 = DIVISOR de imagen full-bleed (generado, estilo Atlas); si no hay, cae a un
 *    opener con marca de agua + la intro legible.
 *  - CUERPO = secciones con títulos del Atlas + gráficos NUMERADOS ("Figura N") inline +
 *    "Puntos clave" alineados a la IZQUIERDA. El intro NO se repite (vive en el divisor).
 *  - FOLIOS (numeración de páginas) dibujados con pdf-lib como en el Atlas (el divisor sin folio).
 * Reusa renderToPdf + matterCss del libro (mismo estilo tipográfico).
 */
const PAGE_W = 6 * 72;       // 432 pt
const PAGE_H = 9.3 * 72;     // 669.6 pt
const FOLIO_RGB = rgb(0.55, 0.6, 0.66);   // gris claro CANÓNICO (unificado con assemble-book/assemble-route)

const esc = (s: unknown): string => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function chapterCss(accent: string): string {
  return `.ch-kicker{font-family:'Segoe UI','Segoe UI Web',system-ui,sans-serif;font-size:8.5pt;letter-spacing:.16em;text-transform:uppercase;color:${accent};font-weight:700;margin:0 0 .1in}`
    + `.ch-sub{font-style:italic;color:#5A6472;margin:.02in 0 .22in;font-size:11.5pt}`
    // TIPOGRAFÍA ROBUSTA: todo el cuerpo del capítulo en SERIF justificado a nivel CONTENEDOR con orphans/widows
    // (no depende de que el LLM envuelva en <p>); títulos/kicker en sans; el código alineado a la izquierda.
    + `.ch-body{font-family:Georgia,"Times New Roman",serif;text-align:justify;text-align-last:left;hyphens:auto;hyphenate-limit-chars:6 3 2;overflow-wrap:break-word;orphans:2;widows:2}`
    + `.ch-body h1,.ch-body h2,.ch-kicker,.ch-keys-h{font-family:'Segoe UI','Segoe UI Web',system-ui,sans-serif;text-align:left;hyphens:none}`
    + `.ch-body li{text-align:justify;text-align-last:left}.ch-body pre,.scn-code{text-align:left;hyphens:none}`
    // Encabezado de sección con EYEBROW verde de marca; break-inside:avoid → la barra NO se separa de su título.
    + `.ch-h2{break-after:avoid;break-inside:avoid;color:#0F1B3D}`
    + `.ch-h2::before{content:"";display:block;width:26px;height:3px;background:${accent};border-radius:2px;margin:0 0 7px}`
    + `.ch-fig{margin:.22in 0;text-align:center;break-inside:avoid}`
    + `.ch-fig img{display:block;margin:0 auto;max-width:100%;max-height:4.6in;height:auto;border:1px solid ${accent}22;border-radius:8px}`
    + `.ch-fig figcaption{font-family:'Segoe UI','Segoe UI Web',system-ui,sans-serif;font-size:8pt;color:#7A828C;margin-top:.06in;font-style:italic;text-align:center;text-align-last:center}`
    // Código: inline y en bloque envuelven en el margen; cada COMANDO (.cmd) es indivisible (break-inside:avoid, regla
    // BLANDA → si un comando solo es más alto que la página, Chrome la relaja y lo parte igual); el salto cae ENTRE
    // comandos. Los huecos al pie los rellena `balanceCode` (encoge el font). break-word evita "{{.Run.ID}}" partido.
    + `code{font-family:Consolas,"Cascadia Mono","Courier New",monospace;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;font-size:.92em;white-space:normal;overflow-wrap:break-word;background:${accent}24;padding:.03em .24em;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone}`
    + `pre{white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;break-inside:auto}`
    + `pre .cmd{display:block;break-inside:avoid}`
    + `pre .cmd + .cmd{margin-top:.62em}`
    + `pre:not(.scn-code){background:#F6F8FB;border:1px solid #DBE2EC;border-radius:8px;padding:10px 13px;font-family:Consolas,"Cascadia Mono","Courier New",monospace;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0;font-size:10px;line-height:1.55;color:#26303F;margin:14px 0}`
    + `pre code{background:none;padding:0;white-space:inherit}`
    // Cierre del capítulo: "Puntos clave" en TARJETA con acento verde de marca.
    + `.ch-keys-box{margin:.3in 0 .1in;padding:.16in .2in .1in;background:${accent}0a;border:1px solid ${accent}30;border-radius:11px;break-inside:auto}`
    // Objetivos de aprendizaje (apertura del capítulo): tarjeta navy tenue para distinguir de "Puntos clave" (verde, cierre).
    + `.ch-obj-box{margin:.05in 0 .28in;padding:.14in .2in .1in;background:#0F1B3D0a;border:1px solid #0F1B3D22;border-left:3px solid #0F1B3D;border-radius:9px;break-inside:avoid}`
    + `.ch-obj-h{margin:0 0 .02in;color:#0F1B3D}.ch-obj-box .ch-obj-h::before{display:none}`
    + `.ch-obj-lead{font-style:italic;color:#5A6472;margin:0 0 .06in;font-size:10.5pt}`
    + `.ch-prereq{margin:0 0 .22in;padding:.06in .14in;background:#F6F8FB;border-radius:7px;font-size:10.5pt;color:#44505F;text-align:left}.ch-prereq-l{font-weight:700;color:#0F1B3D}.ch-prereq-r{display:block;margin-top:.04in;font-style:italic;color:#5A6472}`
    + `.ch-keys-h{margin:0 0 .04in;color:${accent};break-after:avoid}.ch-keys-box .ch-keys-h::before{display:none}`
    + `.ch-keys{padding-left:1.15em;margin:0}.ch-keys li{text-align:left;margin:.05in 0;break-inside:avoid}`
    // Soluciones de la práctica: tarjeta NEUTRA (gris) — distinta de Puntos clave (verde); la respuesta va acá, no junto a la opción.
    + `.ch-sol-box{margin:.22in 0 .1in;padding:.14in .18in .08in;background:#F6F8FB;border:1px solid #E1E6EF;border-radius:11px;break-inside:auto}`
    + `.ch-sol-h{margin:0 0 .06in;color:#0F1B3D;break-after:avoid}.ch-sol-box .ch-sol-h::before{display:none}`
    + `.ch-sol{margin:.07in 0;text-align:left;break-inside:avoid}.ch-sol-a{display:block;margin-bottom:.03in;font-weight:700;color:#0F1B3D}`
    // Estos <p> deben ir a la IZQUIERDA (líneas cortas → justificar abre ríos); sube la especificidad para ganarle a `.pg-body p{text-align:justify}` del matter.
    + `.ch-body p.ch-prereq,.ch-body p.ch-sol{text-align:left}`
    + `.ch-open{position:relative}.ch-wm{position:absolute;top:38%;left:-.3in;right:-.3in;text-align:center;font-family:'Segoe UI',sans-serif;font-weight:900;font-size:96pt;letter-spacing:.06em;color:${accent}0f;z-index:0}.ch-open>*{position:relative;z-index:1}`
    // Callouts: "Trampa del examen" (rojo) y "Tip / En el laboratorio" (acento). Rompen el muro de prosa.
    + `.exam-trap,.tip{margin:.2in 0;padding:.12in .16in;border-radius:0 7px 7px 0;break-inside:auto}`
    + `.exam-trap{border-left:3px solid #C1443B;background:#FBECEA}`
    + `.tip{border-left:3px solid ${accent};background:${accent}12}`
    + `.exam-trap .lab,.tip .lab{font-family:'Segoe UI','Segoe UI Web',system-ui,sans-serif;font-size:8pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0 0 .05in;break-after:avoid}`
    + `.exam-trap .lab{color:#C1443B}.tip .lab{color:${accent}}`
    + `.exam-trap p,.tip p{margin:.03in 0}`
    // Práctica multi-formato (order/build/multi): pista, hueco de 'build' y opciones por hueco.
    + `.scn-hint{font-weight:400;font-style:italic;color:#6B7480}`
    + `.scn-blank{display:inline-block;min-width:1.3em;padding:0 .28em;border-bottom:2px solid ${accent};color:${accent};font-weight:700;text-align:center}`
    + `.scn-blanks{margin-top:.06in}.scn-blanks .scn-opt{font-size:.95em}`
    + `.scn-fill{margin-right:.7em;white-space:nowrap}`;
}

/** Cuerpo del capítulo: secciones + figuras numeradas ("Figura N.M") + puntos clave. Sin intro. */
const PRAC_LET = ["A", "B", "C", "D", "E", "F"];
const pracCv = (s: unknown): string => codeVoiceBody(esc(fixContent(String(s ?? ""))));
/** Baraja DETERMINISTA de los pasos de un 'order' (por texto): el libro sale igual en cada render (no Math.random). */
function orderShuffle(steps: string[]): string[] { return [...steps].sort((a, b) => a.localeCompare(b, "es")); }
/** Plantilla de 'build' con los huecos [[N]] convertidos a un blank rotulado. Se escapa como código (literal). */
function renderBuildTemplate(t: string): string { return esc(t).replace(/\[\[(\d+)\]\]/g, '<span class="scn-blank">$1</span>'); }

/** Render de UN ejercicio de práctica según su formato (single/multi/order/build). NUNCA revela la correcta. */
function renderPracticeItem(p: PracticeItem, i: number): string {
  const kind = p.kind ?? "single";
  const q = pracCv(p.question);
  if (kind === "order") {
    const rows = orderShuffle(p.steps ?? []).map((s, j) => `<li class="scn-opt"><span class="scn-let">${PRAC_LET[j] ?? "·"}</span> ${pracCv(s)}</li>`).join("");
    return `<div class="scn"><p class="scn-q">Escenario ${i + 1}. ${q} <span class="scn-hint">(ordene los pasos)</span></p><ul class="scn-opts">${rows}</ul></div>`;
  }
  if (kind === "build") {
    const blanks = (p.blanks ?? []).map((b, k) => `<li class="scn-opt"><span class="scn-let">${k + 1}</span> ${(b.options ?? []).map((o, j) => `<span class="scn-fill">${PRAC_LET[j] ?? "·"}) ${pracCv(o)}</span>`).join(" ")}</li>`).join("");
    return `<div class="scn"><p class="scn-q">Escenario ${i + 1}. ${q} <span class="scn-hint">(complete los huecos)</span></p><pre class="scn-code">${renderBuildTemplate(p.template ?? "")}</pre><ul class="scn-opts scn-blanks">${blanks}</ul></div>`;
  }
  const hint = kind === "multi" ? ` <span class="scn-hint">(elija todas las que apliquen)</span>` : "";
  const rows = (p.options ?? []).map((o, j) => `<li class="scn-opt"><span class="scn-let">${PRAC_LET[j] ?? "·"}</span> ${pracCv(o)}</li>`).join("");
  return `<div class="scn"><p class="scn-q">Escenario ${i + 1}. ${q}${hint}</p><ul class="scn-opts">${rows}</ul></div>`;
}

/** Filas de "Soluciones" por kind (respuesta/orden/valores correctos + explicación), con code voice + fixContent. */
export function solutionRows(practice: PracticeItem[]): string {
  return practice.map((p, i) => {
    const kind = p.kind ?? "single";
    let ans: string;
    if (kind === "order") ans = `orden correcto: ${(p.steps ?? []).map((s, k) => `${k + 1}) ${pracCv(s)}`).join(" → ")}`;
    else if (kind === "build") ans = `valores: ${(p.blanks ?? []).map((b, k) => `hueco ${k + 1} = ${pracCv(b.options?.[b.correctIndex] ?? "")}`).join("; ")}`;
    else if (kind === "multi") ans = `respuestas correctas: ${(p.correctIndices ?? []).map((k) => PRAC_LET[k] ?? "·").join(", ")}`;
    else ans = `respuesta correcta: ${PRAC_LET[p.correctIndex] ?? "·"}`;
    return `<p class="ch-sol"><span class="ch-sol-a">Escenario ${i + 1} · ${ans}.</span> ${pracCv(p.explanation)}</p>`;
  }).join("");
}

export async function buildChapterBody(chapterId: string, c: ChapterSeed, opts: { solutions?: boolean; skipObjectives?: boolean } = {}): Promise<string> {
  const chNo = Number(c.chapterNumber) || 1;
  let figN = 0;
  const parts: string[] = [];
  // De-dup de títulos: el título del capítulo ya vive en la portadilla/divisor; si la 1ª sección
  // (o una sección repetida) lo re-titula, se omite ese <h2> y se conserva la prosa (sin encabezado doble).
  const norm = (x: string): string => String(x ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const titleN = norm(c.title);
  const seenH = new Set<string>();
  // HARDENING: si el enrich trunca y deja un <pre> SIN CERRAR, la monoespaciada contagia toda la prosa que
  // sigue. Se descarta el bloque de código truncado del final y se re-balancean cierres faltantes.
  const fixPre = (html: string): string => {
    let h = String(html ?? "");
    const cnt = (s: string, re: RegExp): number => (s.match(re) ?? []).length;
    if (cnt(h, /<pre\b/gi) > cnt(h, /<\/pre>/gi)) {
      const idx = h.toLowerCase().lastIndexOf("<pre");
      if (idx >= 0 && !/<\/pre>/i.test(h.slice(idx))) h = h.slice(0, idx).replace(/\s+$/, "");   // último <pre> abierto → truncado → descartar
      const miss = cnt(h, /<pre\b/gi) - cnt(h, /<\/pre>/gi);
      if (miss > 0) h += "</pre>".repeat(miss);   // por si quedara alguno sin cerrar
    }
    return h;
  };
  // Código ILUSTRATIVO (decisión editorial): dentro de <pre>, quitar las barras invertidas de continuación
  // de línea (`\`) al final de cada renglón. Queda multilínea prolijo (no copy-paste de shell). Solo toca <pre>.
  const stripPreBackslashes = (html: string): string =>
    fixPre(String(html ?? "")).replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, (b) => b.replace(/[ \t]*\\(\s*\r?\n)/g, "$1").replace(/[ \t]*\\(\s*<\/pre>)/i, "$1"));
  // Si la prosa ARRANCA repitiendo el título de la sección (o del capítulo) —común cuando un pase de
  // enriquecido re-emite el heading—, se elimina ese encabezado inicial para no duplicar el título.
  const stripLeadingDupHead = (prose: string, headingN: string): string => {
    let p = String(prose ?? "").replace(/^\s+/, "");
    for (let k = 0; k < 2; k++) {
      const m = p.match(/^\s*(?:<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>|<p[^>]*>\s*<strong>([\s\S]*?)<\/strong>\s*<\/p>)\s*/i);
      if (!m) break;
      const inner = norm(m[1] ?? m[2] ?? "");
      if (inner && (inner === headingN || inner === titleN)) { p = p.slice(m[0].length).replace(/^\s+/, ""); continue; }
      break;
    }
    return p;
  };
  // Normalizador: la prosa que el LLM deja SUELTA (texto fuera de bloque) se envuelve en <p> (partiendo por
  // líneas en blanco) → hereda 13px/orphans/justificado como cualquier <p>. Preserva bloques (pre/table/div/ul/h/p).
  const BLOCK = /(?:<pre[\s\S]*?<\/pre>|<table[\s\S]*?<\/table>|<div[\s\S]*?<\/div>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<figure[\s\S]*?<\/figure>|<blockquote[\s\S]*?<\/blockquote>|<h[1-6][\s\S]*?<\/h[1-6]>|<p[\s\S]*?<\/p>)/gi;
  const wrapText = (t: string): string => String(t).split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean).map((c2) => `<p>${c2}</p>`).join("");
  const normalizeProse = (html: string): string => {
    const src = String(html ?? "");
    let out = "", last = 0; BLOCK.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = BLOCK.exec(src))) { out += wrapText(src.slice(last, m.index)) + m[0]; last = m.index + m[0].length; }
    out += wrapText(src.slice(last));
    return out || src;
  };
  // Puntos de corte en tokens largos (constantes WEBSITES_ENABLE_APP_SERVICE_STORAGE, URLs, FQDNs tipo
  // server.postgres.database.azure.com, image refs): inserta <wbr> tras _ / . : - → rompen en un punto natural (sin ríos).
  const insertWbr = (html: string): string =>
    // <wbr> (ancho cero, invisible) tras _ / . : - en tokens ≥16 chars. Con code{white-space:normal} también rompe
    // identificadores largos dentro de <code> (p. ej. last_response_headers), que antes quedaban nowrap y estiraban la línea.
    String(html ?? "").replace(/[^\s<>"=]{16,}/g, (tok) => /[_/.:-]/.test(tok) ? tok.replace(/([_/.:-])(?=[^\s<>])/g, "$1<wbr>") : tok);
  // DISEÑO INSTRUCCIONAL: objetivos medibles + prerrequisitos al INICIO (orientan la atención y la autoevaluación).
  // El autor a veces mete tags HTML (<code>…</code>) en estos campos cortos → se ESCAPARÍAN como texto literal;
  // se quitan y luego codeVoiceBody vuelve a estilar los comandos detectados (az/docker/…).
  const plainField = (t: string): string => fixContent(t).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  // Cierra cada ítem de lista con punto (los campos vienen como frases sin puntuación terminal).
  const withPeriod = (t: string): string => { const s = String(t ?? "").trim(); return s && !/[.!?…]$/.test(s) ? `${s}.` : s; };
  // Anti-duplicación de rótulos: quita de la PROSA un <p> que arranque con "Puntos clave"/"Trampa del examen"
  // (esos van UNA vez: el box de keyTakeaways y el callout .exam-trap). El <p class="lab"> del callout NO matchea
  // (tiene atributo → no es `<p>` pelado), así el callout legítimo se conserva.
  const stripInlineDupLabels = (html: string): string =>
    String(html ?? "").replace(/<p>\s*(?:<(?:strong|b|em)>\s*)?(?:Puntos\s+clave|Trampa\s+del\s+examen)\b[\s\S]*?<\/p>/gi, "");
  // Separadores sueltos: el autor a veces mete <hr> → cae al default gris del navegador (no cumple función).
  // El separador real de sección es el eyebrow verde (.ch-h2::before), así que se quitan los <hr> de la prosa.
  const stripHr = (html: string): string => String(html ?? "").replace(/<hr\b[^>]*>/gi, "");
  // Cierre de la prosa: FLECHAS → sueltas al INICIO de párrafo (marcador aleatorio del modelo) → fuera.
  // NOTA: NO se desenvuelve el <code> que abre un párrafo — decisión del usuario: el comando queda como pastilla
  // monoespaciada SOMBREADA (regla `code{}` de chapterCss), integrada en la oración; desenvolverlo lo dejaba como
  // prosa plana sin sombrear al inicio (se leía roto).
  const finishProse = (html: string): string => String(html ?? "")
    .replace(/(<p[^>]*>)\s*(?:→|⟶|⇒|▸|»|-&gt;|->)\s+/gi, "$1");
  // NOTA: la banda "Qué construirá" (c.buildGoal) se retiró — quedaba redundante con "Objetivos de aprendizaje"
  // (la meta práctica ya está implícita ahí) y sumaba un 3.º bloque sombreado a la portadilla. El dato sigue en el
  // seed (author lo genera); solo no se renderiza. Portadilla = 2 bloques: Objetivos + Antes de empezar.
  if (c.objectives?.length && !opts.skipObjectives) {
    parts.push(`<div class="ch-obj-box"><h2 class="ch-h2 ch-obj-h">Objetivos de aprendizaje</h2><p class="ch-obj-lead">Al terminar este capítulo, usted podrá:</p><ul class="ch-keys">${c.objectives.map((o) => `<li>${codeVoiceBody(esc(withPeriod(plainField(o))))}</li>`).join("")}</ul></div>`);
  }
  if (c.prerequisites?.length) {
    parts.push(`<p class="ch-prereq"><span class="ch-prereq-l">Antes de empezar:</span> ${c.prerequisites.map((p) => codeVoiceBody(esc(plainField(p)))).join(" · ")}.${c.prereqRemedy ? ` <span class="ch-prereq-r">${codeVoiceBody(esc(withPeriod(plainField(c.prereqRemedy))))}</span>` : ""}</p>`);
  }
  for (const s of c.sections) {
    const hN = norm(s.heading);
    const dupHeading = !hN || hN === titleN || seenH.has(hN);
    seenH.add(hN);
    parts.push(`${dupHeading ? "" : `<h2 class="ch-h2">${esc(s.heading)}</h2>`}${insertWbr(finishProse(codeVoiceBody(reflowCodeBlocks(normalizeProse(stripLeadingDupHead(stripHr(stripPreBackslashes(stripInlineDupLabels(fixContent(s.prose)))), hN))))))}`);
    for (const g of c.graphics.filter((x) => x.afterSectionId === s.id && x.imageUrl)) {
      const file = path.join(pageOutputDir(chapterId), `graphic-${g.id}.png`);
      if (!existsSync(file)) continue;
      figN++;
      const b64 = (await readFile(file)).toString("base64");
      const cap = g.caption?.trim() ? ` — ${esc(g.caption.trim())}` : "";   // leyenda del lector; NUNCA el brief (g.spec)
      parts.push(`<figure class="ch-fig" data-fig="${figN}"><img src="data:image/png;base64,${b64}"/><figcaption>Figura ${chNo}.${figN}${cap}</figcaption></figure>`);
    }
  }
  if (c.keyTakeaways.length) {
    parts.push(`<div class="ch-keys-box"><h2 class="ch-h2 ch-keys-h">Puntos clave</h2><ul class="ch-keys">${c.keyTakeaways.map((t) => `<li>${codeVoiceBody(esc(withPeriod(fixContent(t))))}</li>`).join("")}</ul></div>`);
  }
  // Práctica ESTRUCTURADA: escenarios con opciones A/B/C SIN revelar la correcta; la resolución va en el
  // bloque "Soluciones" aparte (para que el lector piense antes de ver la respuesta).
  if (c.practice?.length) {
    parts.push(`<h2 class="ch-h2">Práctica</h2>` + c.practice.map((p, i) => renderPracticeItem(p, i)).join(""));
    // Las Soluciones NO van inline (spoilean): salvo que se pidan, van a un APÉNDICE al final de la ruta/libro.
    if (opts.solutions !== false) parts.push(`<div class="ch-sol-box"><h2 class="ch-h2 ch-sol-h">Soluciones</h2>${solutionRows(c.practice)}</div>`);
  }
  return `<div class="sheet pg"><div class="pg-body ch-body">${parts.join("")}</div></div>`;
}

export interface RenderChapterResult { ok: boolean; chapterId?: string; url?: string; path?: string; pages?: number; error?: string }

export async function renderChapterPdf(chapterId: string): Promise<RenderChapterResult> {
  if (!CONFIG.chromePath) return { ok: false, error: "Sin Chrome headless: no se puede renderizar." };
  const ch = getPersistedChapter(chapterId);
  if (!ch) return { ok: false, error: "Capítulo no encontrado." };
  const cfg = getBookConfig();
  const c = ch.seed;
  const accent = cfg.style.accent || "#2563EB";
  const CH_CSS = chapterCss(accent);
  const dividerPng = path.join(pageOutputDir(chapterId), "divider.png");
  // Homologación: si falta el divisor de imagen (olas, anclado a cap-01), generarlo antes de
  // renderizar para no caer al opener de texto. Idempotente (reusa si ya existe) y guardado por
  // tope de costo; si falla, cae al fallback legible. Evita que la corrida produzca capítulos fuera de diseño.
  if (!existsSync(dividerPng)) {
    try { await generateChapterDivider(chapterId); } catch { /* best-effort: cae al fallback de texto */ }
  }
  const hasDivider = existsSync(dividerPng);

  const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath ?? undefined, headless: true, args: ["--no-sandbox", "--disable-gpu"], protocolTimeout: 300000 });
  let bodyBuf: Buffer, openerBuf: Buffer | null = null;
  try {
    bodyBuf = await renderToPdf(browser, await balanceFigures(browser, await buildChapterBody(chapterId, c), ".6in .55in", `${TEXT_OVERRIDE}${CH_CSS}`, cfg), ".6in .55in", `${TEXT_OVERRIDE}${CH_CSS}`, cfg);
    if (!hasDivider) {
      // Fallback: opener con marca de agua + intro legible (lo que iría en la sección introductoria).
      const opener = `<div class="sheet pg"><div class="pg-body ch-open"><div class="ch-wm">${esc(certMetaByEngineId(CONFIG.certId).code)}</div><p class="ch-kicker">${esc(chapterHeading(c).label)} · ${esc(c.domainLabel)}</p><h1>${esc(c.title)}</h1><p class="ch-sub">${esc(c.subtitle)}</p>${c.intro}</div></div>`;
      openerBuf = await renderToPdf(browser, opener, ".6in .55in", `${TEXT_OVERRIDE}${CH_CSS}`, cfg);
    }
  } finally {
    await closeBrowserHard(browser);
  }

  // Ensamblado con pdf-lib: [divisor imagen | opener] + cuerpo, y folios en el cuerpo (el divisor sin folio).
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  let dividerPages = 0;
  if (hasDivider) {
    const png = await out.embedPng(await readFile(dividerPng));
    const pg = out.addPage([PAGE_W, PAGE_H]);
    pg.drawImage(png, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
    dividerPages = 1;
  } else if (openerBuf) {
    const oDoc = await PDFDocument.load(openerBuf);
    const cp = await out.copyPages(oDoc, oDoc.getPageIndices());
    cp.forEach((p) => out.addPage(p));
    dividerPages = cp.length;
  }
  const bDoc = await PDFDocument.load(bodyBuf);
  const bp = await out.copyPages(bDoc, bDoc.getPageIndices());
  bp.forEach((p) => out.addPage(p));

  const pages = out.getPages();
  for (let i = dividerPages; i < pages.length; i++) {
    const folio = String(i - dividerPages + 1);
    const w = font.widthOfTextAtSize(folio, 8.5);
    pages[i]!.drawText(folio, { x: (PAGE_W - w) / 2, y: 21, size: 8.5, font, color: FOLIO_RGB });
  }

  const dir = pageOutputDir(chapterId);
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, "chapter.pdf");
  await writeFile(outPath, await out.save());
  return { ok: true, chapterId, url: `${pagePublicBase(chapterId)}/chapter.pdf`, path: outPath, pages: pages.length };
}
