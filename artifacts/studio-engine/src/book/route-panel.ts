import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey, chatModelParams } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { listPersistedChapters, type PersistedChapter } from "../chapter-store.js";
import { assembleRoutePdf } from "./assemble-route.js";
import { rasterizePdf, samplePages } from "../render/rasterize-pdf.js";
import { fixContent } from "./render-chapter.js";   // el juez debe ver el texto CORREGIDO (como el PDF), no el crudo
import { securityLint, cliLint, lintScore, groundingCheck, type LintFinding } from "../qa/linters.js";   // chequeos DETERMINISTAS (sin LLM)
import { moduleSourcesFor } from "../grounding/enrich-chapter.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { chapterHeading } from "./chapter-heading.js";
import { AGENT_CONTRACTS } from "../agents/contracts.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { withRunContext } from "../agents/runtime-context.js";
import type { ChapterSeed, Source } from "../types.js";

/**
 * PANEL DE QA POR RUTA (productizado). Corre la cuadrilla de 7 expertos de `calidad` sobre una RUTA
 * ENSAMBLADA y su contenido, y emite un veredicto escrito + score por experto, más una agregación.
 *  - 2 VISUALES (production-editor, typography): leen las PÁGINAS RASTERIZADAS del PDF (visión).
 *  - 5 DE CONTENIDO (sme-factcheck, instructional-design, premortem, grounding-fidelity, exam-alignment):
 *    leen la prosa/práctica/claims + el corpus oficial + el outline (texto).
 * Cada experto usa su system prompt real de `agents/contracts.ts` (que cierra con el contrato de salida
 * JSON común). El costo se gatea con `wouldExceedCap` y se atribuye por label `panel-<id>` en el ledger,
 * así el rollup de la Cuadrilla lo imputa a cada agente registrado.
 */

export interface PanelFinding { severity: "blocker" | "major" | "minor"; issue: string; where: string; fix: string }
export interface ExpertVerdict {
  id: string;
  modality: "vision" | "text" | "lint";   // "lint" = chequeo determinista (sin LLM)
  score: number | null;
  would_ship: boolean;
  hasBlocker: boolean;                     // ¿este agente afirma un blocker? (mayoría-confirmado si corre N veces)
  findings: PanelFinding[];
  veredicto: string;
  error: string | null;
  runs?: number;                           // cuántas corridas se promediaron (mediana) para este veredicto
}
export interface PanelAggregate { score: number; verdict: "ship" | "revise" | "block"; wouldShipCount: number; total: number; blockers: number }
export interface PanelRun {
  generation: number;   // lo asigna el store al hacer append (1-based)
  ts: string;
  pages: number;
  model: string;
  experts: ExpertVerdict[];
  aggregate: PanelAggregate;
}

// Política de estabilidad por agente, calibrada con el test de varianza (3× sobre contenido idéntico):
//  runs=1 los estables (production 0.0, typography 0.3, reader-engagement 0.4, premortem 0.9);
//  runs=3 + mediana los ruidosos medios (sme 1.3, instructional 1.2, exam 1.7);
//  grounding (el más ruidoso, 2.3) pasa a LINTER determinista (0 LLM) → cero varianza.
// Roster PODADO (menos ruido, menos costo): lo OBJETIVO va a linters deterministas (grounding + técnico/seguridad);
// premortem se elimina (vago, redundante); quedan las lentes SUBJETIVAS (visual, pedagogía, engagement, examen).
// Exportado para que el test de invariantes valide contra la lista REAL en vez de duplicarla:
// los expertos con modality != "lint" fallan en runtime ("sin contrato para X", ver runExpert)
// si su id no tiene entrada en AGENT_CONTRACTS.
export const PANEL: { id: string; modality: "vision" | "text" | "lint"; runs: number }[] = [
  { id: "production-editor", modality: "vision", runs: 1 },       // visual (estable)
  { id: "typography", modality: "vision", runs: 1 },              // visual (estable)
  { id: "reader-engagement", modality: "text", runs: 1 },         // engagement (estable)
  { id: "instructional-design", modality: "text", runs: 3 },      // pedagogía (mediana)
  { id: "exam-alignment", modality: "text", runs: 3 },            // examen (mediana)
  { id: "sme-factcheck", modality: "lint", runs: 0 },             // → linter técnico determinista (seguridad + CLI)
  { id: "grounding-fidelity", modality: "lint", runs: 0 },        // → linter de recuperación determinista
];

// El digest debe reflejar el TEXTO RENDERIZADO, no el HTML crudo: si no, el juez ve falsos defectos de código
//  — placeholders `<principalId>`/`<sub>` borrados como tags (comando "vacío") y `&amp;&amp;` en vez de `&&`.
// Por eso: (1) quita SOLO tags HTML conocidos (el `\b` evita tocar `<principalId>`, `<inference-api>`, etc.),
//          (2) decodifica entidades (`&amp;`→`&`, `&lt;`→`<`, …) como hace el navegador al imprimir.
const HTML_TAGS = /<\/?(?:p|div|span|ul|ol|li|code|pre|table|thead|tbody|tr|td|th|h[1-6]|br|hr|strong|em|b|i|figure|figcaption|wbr)\b[^>]*>/gi;
const decodeEntities = (s: string): string =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ");
const strip = (h: unknown): string => decodeEntities(String(h ?? "").replace(HTML_TAGS, " ")).replace(/\s+/g, " ").trim();
const clampScore = (n: number): number => Math.max(0, Math.min(10, Math.round(n * 10) / 10));
/** Recorta en un LÍMITE de palabra/oración y marca el corte, para que un extracto no se lea como "contenido truncado".
 *  (El panel juzga el contenido, no debe penalizar el recorte que hacemos nosotros para acotar tokens.) */
function excerpt(text: unknown, max: number): string {
  const s = strip(text);
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const at = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(" "));
  return `${cut.slice(0, at > max * 0.6 ? at + 1 : max)} […extracto recortado, el libro continúa…]`;
}
const routeChaptersOf = (domainId: string): PersistedChapter[] =>
  listPersistedChapters()
    .filter((c) => c.seed.domainId === domainId)
    .sort((a, b) => (a.seed.chapterNumber || "").localeCompare(b.seed.chapterNumber || "", undefined, { numeric: true }));

// ── armado de contexto de CONTENIDO ──
// `rt` = TEXTO RENDERIZADO: aplica fixContent (las mismas correcciones deterministas del PDF: nombres canónicos,
// flags, JMESPath, "sin filtro", etc.) antes de limpiar → el juez evalúa lo que el lector VE, no el crudo del modelo.
const rt = (s: unknown): string => strip(fixContent(String(s ?? "")));
function chapterDigest(seed: ChapterSeed): string {
  const obj = seed.objectives?.length ? `Objetivos: ${seed.objectives.map(rt).join(" · ")}\n` : "";
  const pre = seed.prerequisites?.length ? `Prerrequisitos: ${seed.prerequisites.map(rt).join(" · ")}\n` : "";
  const secs = seed.sections.map((s) => `## ${strip(s.heading)}\n${excerpt(fixContent(s.prose), 6000)}`).join("\n\n");
  const keys = seed.keyTakeaways?.length ? `\nPuntos clave: ${seed.keyTakeaways.map(rt).join(" · ")}` : "";
  // Práctica con OPCIONES etiquetadas A/B/C y la correcta marcada por LETRA (como en el render): evita que el
  // juez confunda base-0 vs base-1 y reporte un falso "la clave no coincide con la explicación".
  const prac = seed.practice?.length
    ? seed.practice.map((p, i) => {
        const kind = p.kind ?? "single";
        let body: string;
        if (kind === "order") body = (p.steps ?? []).map((s, k) => `   ${k + 1}) ${rt(s)}`).join("\n") + "\n   (secuencia correcta arriba)";
        else if (kind === "build") body = `   Código: ${rt(p.template ?? "")}\n` + (p.blanks ?? []).map((b, k) => `   hueco ${k + 1}: ${b.options.map((o, j) => `${String.fromCharCode(65 + j)}) ${rt(o)}${j === b.correctIndex ? " ←" : ""}`).join(" ")}`).join("\n");
        else if (kind === "multi") body = p.options.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${rt(o)}${(p.correctIndices ?? []).includes(j) ? "   ← CORRECTA" : ""}`).join("\n");
        else body = p.options.map((o, j) => `   ${String.fromCharCode(65 + j)}) ${rt(o)}${j === p.correctIndex ? "   ← CORRECTA" : ""}`).join("\n");
        return `P${i + 1} [${kind}]. ${rt(p.question)}\n${body}\n   Explicación: ${rt(p.explanation)}`;
      }).join("\n\n")
    : "(sin práctica estructurada)";
  return `# ${chapterHeading(seed).label} · ${strip(seed.title)}\n${obj}${pre}${secs}${keys}\n\nPráctica:\n${prac}`;
}
function claimsDigest(chapters: PersistedChapter[]): string {
  const lines = chapters.flatMap((c) => c.provenance.claims.map((cl) => `- [cap ${c.seed.chapterNumber}/${cl.field}] ${rt(cl.text)}`));
  return lines.join("\n").slice(0, 16000) || "(la ruta no registró afirmaciones con procedencia)";
}
async function corpusDigest(chapters: PersistedChapter[]): Promise<string> {
  const seen = new Map<string, Source>();
  for (const c of chapters) {
    try { for (const s of await moduleSourcesFor(c.seed.skillIds)) seen.set(s.id, s); } catch { /* sigue */ }
  }
  const sources = [...seen.values()].slice(0, 12);
  if (!sources.length) return "(sin corpus disponible para esta ruta)";
  return sources.map((s) => `[${s.id}] ${s.title}${s.url ? ` — ${s.url}` : ""}\n${(s.text ?? "").slice(0, 2500)}`).join("\n\n---\n\n");
}
function skillsDigest(domainId: string): string {
  const dom = getOutline().domains.find((d) => d.id === domainId);
  if (!dom) return "(dominio sin skills-measured en el outline)";
  return dom.skills.map((s) => `- ${s.title}: ${(s.objectives ?? []).join("; ")}`).join("\n").slice(0, 8000);
}

// ── normalización del veredicto de un experto ──
function normalizeVerdict(id: string, modality: "vision" | "text" | "lint", raw: Record<string, unknown>): ExpertVerdict {
  const scoreN = Number(raw.score);
  const score = Number.isFinite(scoreN) ? clampScore(scoreN) : null;
  const sev = (v: unknown): PanelFinding["severity"] => {
    const s = String(v ?? "").toLowerCase();
    return s === "blocker" ? "blocker" : s === "major" ? "major" : "minor";
  };
  const findings: PanelFinding[] = Array.isArray(raw.findings)
    ? (raw.findings as Array<Record<string, unknown>>)
        .map((f) => ({ severity: sev(f.severity), issue: strip(f.issue), where: strip(f.where), fix: strip(f.fix) }))
        .filter((f) => f.issue)
        .slice(0, 12)
    : [];
  return { id, modality, score, would_ship: Boolean(raw.would_ship), hasBlocker: findings.some((f) => f.severity === "blocker"), findings, veredicto: strip(raw.veredicto).slice(0, 1400), error: null };
}

async function runExpert(exp: { id: string; modality: "vision" | "text" | "lint" }, domainId: string, userText: string, images: Buffer[] | null): Promise<ExpertVerdict> {
  const base: ExpertVerdict = { id: exp.id, modality: exp.modality, score: null, would_ship: false, hasBlocker: false, findings: [], veredicto: "", error: null };
  if (!hasOpenAIKey()) return { ...base, error: "sin llave OpenAI" };
  const openai = getOpenAI();
  if (!openai) return { ...base, error: "cliente OpenAI no disponible" };
  if (wouldExceedCap(0.02)) return { ...base, error: "tope de costo alcanzado" };
  const sys = AGENT_CONTRACTS[exp.id]?.[0]?.prompt;
  if (!sys) return { ...base, error: `sin contrato para ${exp.id}` };

  const model = exp.modality === "vision" ? CONFIG.visionModel : CONFIG.authorModel;
  const content = images && images.length
    ? [{ type: "text" as const, text: userText }, ...images.map((b) => ({ type: "image_url" as const, image_url: { url: `data:image/png;base64,${b.toString("base64")}`, detail: "high" as const } }))]
    : userText;
  try {
    const res = await openai.chat.completions.create({
      model,
      messages: [{ role: "system", content: sys }, { role: "user", content }],
      response_format: { type: "json_object" },
      ...chatModelParams(model, 6000, 0.2),   // holgado: los modelos de razonamiento (gpt-5*) gastan tokens de razonamiento; 2200 truncaba el veredicto
    });
    recordTextSpend(model, res.usage, { kind: exp.modality === "vision" ? "vision" : "text", pageId: domainId, label: `panel-${exp.id}` });
    if (res.choices[0]?.finish_reason === "length") return { ...base, error: "veredicto truncado (length)" };
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
    return normalizeVerdict(exp.id, exp.modality, raw);
  } catch (err) {
    return { ...base, error: String((err as Error)?.message ?? err) };
  }
}

// ── Wrappers de los LINTERS deterministas del panel (usan la librería qa/linters) → cero ruido, cero LLM ──
function lintVerdict(id: string, findings: LintFinding[], veredicto: string): ExpertVerdict {
  return {
    id, modality: "lint", score: lintScore(findings),
    would_ship: !findings.some((f) => f.severity === "blocker" || f.severity === "major"),
    hasBlocker: findings.some((f) => f.severity === "blocker"),
    findings: findings.slice(0, 12), veredicto, error: null, runs: 1,
  };
}
/** grounding-fidelity: recuperación determinista de las afirmaciones (renderizadas) contra el corpus. */
function groundingVerdict(chapters: PersistedChapter[], corpus: string): ExpertVerdict {
  const claims = chapters.flatMap((c) => c.provenance.claims.map((cl) => ({ ch: c.seed.chapterNumber, text: rt(cl.text) })));
  const g = groundingCheck(claims, corpus);
  return { id: "grounding-fidelity", modality: "lint", score: g.score, would_ship: g.findings.length === 0, hasBlocker: false, findings: g.findings, veredicto: g.veredicto, error: null, runs: 1 };
}
/** sme-factcheck: chequeo técnico determinista (seguridad + CLI) sobre el contenido renderizado. */
function technicalVerdict(contentDigest: string): ExpertVerdict {
  const findings = [...securityLint(contentDigest), ...cliLint(contentDigest)];
  const veredicto = findings.length
    ? `Linter técnico determinista: ${findings.length} hallazgo(s) de seguridad/CLI. Sin ruido de juez.`
    : "Linter técnico determinista: sin problemas de seguridad ni de CLI detectados. Sin ruido de juez.";
  return lintVerdict("sme-factcheck", findings, veredicto);
}

/** Corre un experto `runs` veces → MEDIANA (score + findings + veredicto del run mediano) + MAYORÍA (would_ship, hasBlocker). */
async function runExpertRepeated(exp: { id: string; modality: "vision" | "text" | "lint" }, domainId: string, userText: string, images: Buffer[] | null, runs: number): Promise<ExpertVerdict> {
  if (runs <= 1) { const r = await runExpert(exp, domainId, userText, images); return { ...r, runs: 1 }; }
  const results: ExpertVerdict[] = [];
  for (let i = 0; i < runs; i++) results.push(await runExpert(exp, domainId, userText, images));
  const ok = results.filter((r) => typeof r.score === "number") as (ExpertVerdict & { score: number })[];
  if (!ok.length) return { ...(results.find((r) => r.error) ?? results[0]!), runs: 0 };
  const sorted = [...ok].sort((a, b) => a.score - b.score);
  const rep = sorted[Math.floor((sorted.length - 1) / 2)]!;   // run MEDIANO: aporta score + findings + veredicto representativos
  const shipVotes = ok.filter((r) => r.would_ship).length;
  const blockVotes = ok.filter((r) => r.hasBlocker).length;
  return { ...rep, would_ship: shipVotes * 2 >= ok.length, hasBlocker: blockVotes * 2 > ok.length, runs: ok.length };
}

/** Agregación PURA de los veredictos → score + veredicto global (testeable, sin fs/red). */
export function aggregatePanel(experts: ExpertVerdict[]): PanelAggregate {
  const scored = experts.filter((e) => typeof e.score === "number") as (ExpertVerdict & { score: number })[];
  const mean = scored.length ? scored.reduce((a, e) => a + e.score, 0) / scored.length : 0;
  const blockers = experts.filter((e) => e.hasBlocker).length;   // agentes con blocker MAYORÍA-confirmado (no findings sueltos de una sola corrida)
  const wouldShipCount = experts.filter((e) => e.would_ship).length;
  const total = experts.length;
  const score = Math.round(mean * 10) / 10;
  // Un blocker (o media baja) BLOQUEA; media <8 o minoría dispuesta a publicar → revisión; si no, listo.
  const verdict: PanelAggregate["verdict"] =
    blockers > 0 || score < 6.5 ? "block" : score < 8 || wouldShipCount < Math.ceil(total * 0.75) ? "revise" : "ship";
  return { score, verdict, wouldShipCount, total, blockers };
}

export interface RunRoutePanelResult { ok: boolean; run?: PanelRun; error?: string }

/** Ensambla la ruta, la rasteriza, junta su contenido/corpus/outline y corre los 7 expertos (secuencial, gateado). */
export async function runRoutePanel(domainId: string): Promise<RunRoutePanelResult> {
  const chapters = routeChaptersOf(domainId);
  if (!chapters.length) return { ok: false, error: "La ruta no tiene capítulos persistidos." };
  if (!hasOpenAIKey()) return { ok: false, error: "Sin llave OpenAI." };

  const asm = await assembleRoutePdf(domainId);
  if (!asm.ok || !asm.path) return { ok: false, error: asm.error ?? "El ensamblado de la ruta falló." };

  let images: Buffer[] = [];
  try { images = samplePages(await rasterizePdf(asm.path, { scale: 2 }), 10); } catch { images = []; }   // los visuales degradan si no hay páginas
  const pages = asm.pages ?? images.length;

  const dom = getOutline().domains.find((d) => d.id === domainId);
  const routeLabel = (dom?.label ?? domainId).replace(/^Ruta \d+\s*[—–-]\s*/, "").trim();
  const head = `RUTA: ${routeLabel} — ${chapters.length} capítulos, ${pages} páginas.\n\n`;
  // Nota anti-falso-positivo SOLO para los agentes de contenido (los visuales leen el PDF real, no este texto).
  const excerptNote = "NOTA: te paso el contenido como TEXTO extraído; cualquier corte marcado con '[…extracto recortado…]' es de mi extracto, NO un defecto del libro — no lo reportes como 'contenido truncado' ni 'comando cortado'. En la práctica, la opción marcada '← CORRECTA' ES la clave real; no la juzgues como inconsistente por su posición.\n\n";
  const joined = chapters.map((c) => chapterDigest(c.seed)).join("\n\n———\n\n");
  const contentDigest = joined.length > 90000 ? `${joined.slice(0, 90000)}\n\n[…ruta recortada en el extracto…]` : joined;

  const corpus = await corpusDigest(chapters);   // una vez: lo usa el linter determinista de grounding
  const experts: ExpertVerdict[] = [];
  // Contexto de corrida ambiente (ruta) → cada experto cronometrado se atribuye a esta ruta.
  await withRunContext({ runContext: "route", routeId: domainId }, async () => {
    for (const exp of PANEL) {
      if (exp.modality === "lint") {   // chequeos DETERMINISTAS sin LLM (cero ruido): grounding + técnico (seguridad/CLI)
        experts.push(await timeAgent(exp.id, `panel-${exp.id}`, async () => (exp.id === "grounding-fidelity" ? groundingVerdict(chapters, corpus) : technicalVerdict(contentDigest))));
        continue;
      }
      let userText: string;
      let imgs: Buffer[] | null = null;
      if (exp.modality === "vision") {
        if (!images.length) { experts.push({ id: exp.id, modality: exp.modality, score: null, would_ship: false, hasBlocker: false, findings: [], veredicto: "", error: "sin páginas rasterizadas" }); continue; }
        imgs = images;
        userText = `${head}Juzgá la COMPOSICIÓN IMPRESA de estas páginas (muestra representativa de la ruta ensamblada).`;
      } else if (exp.id === "exam-alignment") {
        userText = `${head}${excerptNote}SKILLS-MEASURED OFICIALES DE LA RUTA:\n${skillsDigest(domainId)}\n\nCONTENIDO DE LA RUTA:\n${contentDigest}`;
      } else {
        userText = `${head}${excerptNote}CONTENIDO DE LA RUTA (prosa + práctica por capítulo):\n${contentDigest}`;
      }
      // runs>1 → mediana + mayoría (estabiliza a los agentes ruidosos); runs=1 → una corrida (los estables).
      experts.push(await timeAgent(exp.id, `panel-${exp.id}`, () => runExpertRepeated(exp, domainId, userText, imgs, exp.runs)));
    }
  });

  const run: PanelRun = { generation: 0, ts: new Date().toISOString(), pages, model: CONFIG.authorModel, experts, aggregate: aggregatePanel(experts) };
  return { ok: true, run };
}
