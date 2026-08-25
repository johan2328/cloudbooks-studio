import { CONFIG } from "../config.js";
import { getOpenAI, hasOpenAIKey } from "../openai-client.js";
import { recordTextSpend, wouldExceedCap } from "../cost.js";
import { listSources } from "./source-store.js";
import { scopedCorpus, moduleSlugsFor } from "./module-sources.js";
import { hardFactsText } from "../skills/domain-facts.js";
import { certDomain } from "../cert-domain.js";
import type { ClaimCheck, ClaimVerdict, GroundingResult, GroundingStatus, ChapterSeed, Source } from "../types.js";

/**
 * GATE DE FIDELIDAD del Master Book — reescrito para NO ser un falso positivo.
 * Antes: verificaba SOLO las claims que el AUTOR se auto-elegía (versión edulcorada de
 * la prosa) contra las primeras 10 fuentes, y "supported" salía de una sola opinión del
 * LLM sin exigir cita → un error en la prosa ("exactamente una vez") se colaba porque nunca
 * era una claim. Ahora:
 *  1) EXTRACTOR INDEPENDIENTE del autor saca las afirmaciones DURAS de la PROSA real.
 *  2) RETRIEVAL por relevancia (no las primeras 10) para que el doc que refuta esté en ventana.
 *  3) VERIFICADOR que exige una CITA TEXTUAL real de la fuente (se valida que exista en el corpus);
 *     "sin evidencia" (insufficient) o "supported sin cita" → unsupported (NO pasa). La ausencia de
 *     respaldo ya NO se disfraza de "verified".
 */

const strip = (h: unknown): string => String(h ?? "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim();
const norm = (s: unknown): string => strip(s).toLowerCase();

/** Params compatibles por familia: los GPT-5/o* rechazan `temperature`≠1 y usan `max_completion_tokens`
 *  (y consumen tokens de razonamiento → presupuesto amplio). El resto (gpt-4.1) mantiene su comportamiento. */
function qaParams(maxTokens: number): Record<string, number> {
  return /^(gpt-5|o[0-9])/.test(CONFIG.qaModel)
    ? { max_completion_tokens: maxTokens * 4 }
    : { temperature: 0.1, max_tokens: maxTokens };
}

export interface ProseClaim { id: string; text: string }

/** Extrae, con un rol INDEPENDIENTE del autor, las afirmaciones DURAS y chequeables del relato. */
async function extractProseClaims(seed: ChapterSeed): Promise<ProseClaim[]> {
  const openai = getOpenAI();
  if (!openai) return [];
  const body = (seed.sections ?? []).map((s) => `## ${strip(s.heading)}\n${strip(s.prose)}`).join("\n\n").slice(0, 60000);
  const sys = "Sos un EXTRACTOR de afirmaciones factuales verificables (rol INDEPENDIENTE del autor). Del relato, listá las afirmaciones DURAS y chequeables: números/límites, semántica de entrega (exactly-once/at-least-once, orden), defaults, comportamientos de servicios, nombres de APIs/roles/puertos, cifrado. NADA de opiniones, generalidades ni 'es importante'. Extraé cada afirmación TAL CUAL la sostiene el texto — aunque parezca dudosa NO la corrijas, extraela como está. Máx 12. Respondés SOLO JSON.";
  const user = `RELATO:\n${body}\n\nDevolvé {"claims":[{"id":"p1","text":"la afirmación tal cual"}]}`;
  try {
    const res = await openai.chat.completions.create({ model: CONFIG.qaModel, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, ...qaParams(1400) });
    recordTextSpend(CONFIG.qaModel, res.usage, { kind: "text", pageId: seed.chapterId, label: "extract-claims" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { claims?: { id?: string; text?: string }[] };
    return (raw.claims ?? []).map((c, i) => ({ id: String(c.id || `p${i + 1}`), text: strip(c.text) })).filter((c) => c.text.length >= 10).slice(0, 12);
  } catch { return []; }
}

/** Selección de fuentes RELEVANTES por solape de tokens con las afirmaciones (en vez de las primeras 10). */
function rankSources<T extends { id: string; title: string; text?: string | null }>(claims: ProseClaim[], sources: T[], k = 8): T[] {
  const qset = new Set(norm(claims.map((c) => c.text).join(" ")).split(/[^a-záéíóúñü0-9]+/).filter((w) => w.length > 4));
  return sources
    .map((s) => {
      const words = norm(`${s.title} ${s.text ?? ""}`).split(/[^a-záéíóúñü0-9]+/);
      let hits = 0; for (const w of words) if (qset.has(w)) hits++;
      return { s, score: hits };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => x.s);
}

/** Fuentes DEL MÓDULO (helper UNIFICADO `scopedCorpus`): corpus del CAPÍTULO + hoja de datos duros antepuesta.
 *  El verificador chequea contra las fuentes del capítulo (no un top-8 global de las 250) → el pasaje que
 *  respalda la afirmación entra en ventana, y la hoja curada permite CITA REAL de los datos que el corpus no fija. */
async function moduleScopedSources(skillIds: string[]): Promise<Source[]> {
  return scopedCorpus(skillIds);
}

/** EXPERTO ESCÉPTICO: juzga cada afirmación contra el conocimiento de Azure del modelo (rol independiente,
 *  SIN corpus). Caza lo incorrecto/desactualizado que la fuente no refuta (exactly-once, base64, HSM, puertos…).
 *  SEVERIDAD: distingue 'wrong' (error factual DURO → bloquea) de 'imprecise' (matiz/buena práctica → NO bloquea,
 *  se surfacea). Antes conflacionaba ambos en 'incorrect' → un nitpick (p.ej. tag vs digest) tiraba el capítulo entero. */
async function expertFactCheck(chapterId: string, claims: ProseClaim[], facts = "", model = CONFIG.qaModel): Promise<Map<string, { verdict: string; note: string }>> {
  const out = new Map<string, { verdict: string; note: string }>();
  const openai = getOpenAI();
  if (!openai) return out;
  const dp = certDomain();
  const sys = `Sos un ${dp.expert}, escéptico y riguroso, revisando un LIBRO DE ESTUDIO de certificación. Para CADA afirmación técnica clasificá su exactitud según el comportamiento OFICIAL y ACTUAL de ${dp.platformShort}:\n`
    + `• 'wrong' = FACTUALMENTE INCORRECTA, DESACTUALIZADA o PELIGROSA: contradice cómo funciona ${dp.platformShort} y quien la siga se equivoca. ${dp.wrongExamples} Poné la corrección en 'note'.\n`
    + `• 'imprecise' = CORRECTA como se ENSEÑA a nivel de certificación, pero se podría afinar o le falta un matiz avanzado de buenas prácticas. NO es un error: el lector que la siga NO se equivoca. ${dp.impreciseExamples} Poné el matiz en 'note'.\n`
    + "• 'correct' = correcta y vigente, sin reparos. • 'dubious' = depende del contexto / no seguro.\n"
    + "REGLA CLAVE: 'wrong' es SOLO para lo objetivamente FALSO o desactualizado, NO para lo que 'podría ser mejor'. Ante 'esto se podría afinar pero no está mal' → 'imprecise', nunca 'wrong'. Respondés SOLO JSON.";
  // HOJA DE DATOS DUROS (curada): la VERDAD para los hechos que el corpus no fija de forma textual/única.
  // Juzgar contra ELLA (no contra la memoria del modelo) mata la oscilación del experto sin-corpus.
  const factsBlock = facts ? `\n\nTABLA OFICIAL DE DATOS DUROS VERIFICADOS (autoritativa; si un claim COINCIDE con ella es 'correct'; si la CONTRADICE es 'wrong' contra ESTOS valores exactos, no contra tu memoria):\n${facts}` : "";
  const user = `AFIRMACIONES:\n${claims.map((c) => `(id ${c.id}) "${c.text}"`).join("\n")}${factsBlock}\n\nDevolvé {"verdicts":[{"id":"...","verdict":"correct|wrong|imprecise|dubious","note":"corrección si wrong, matiz si imprecise"}]}`;
  try {
    const res = await openai.chat.completions.create({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, ...qaParams(1800) });
    recordTextSpend(model, res.usage, { kind: "text", pageId: chapterId, label: "verify-expert" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { verdicts?: { id?: string; verdict?: string; note?: string }[] };
    for (const v of raw.verdicts ?? []) out.set(String(v.id), { verdict: String(v.verdict ?? ""), note: strip(v.note) });
  } catch { /* si falla, el experto no aporta veredicto (queda solo el corpus) */ }
  return out;
}

/** SEGUNDO VOTO independiente sobre los claims que el 1er experto marcó 'wrong'. Un 'wrong' solo BLOQUEA si
 *  este juez distinto ("demostrá que es FALSA") también lo halla incorrecto → mata el falso positivo del juez
 *  sin-corpus (marca blancos distintos por corrida). Fail-closed: si el 2º voto no opina o falla, se CONSERVA
 *  el bloqueo (default a exactitud). Solo un 'keep' EXPLÍCITO rescata un claim. */
async function confirmWrong(chapterId: string, wrong: ProseClaim[], first: Map<string, { verdict: string; note: string }>, facts: string, model = CONFIG.qaModel): Promise<Set<string>> {
  const out = new Set<string>();
  const openai = getOpenAI();
  if (!openai || wrong.length === 0) { for (const c of wrong) out.add(c.id); return out; }
  const dp = certDomain();
  const factsBlock = facts ? `\n\nTABLA OFICIAL DE DATOS DUROS (la verdad; si el claim COINCIDE con ella, es correcto → 'keep'):\n${facts}` : "";
  const sys = `Sos un ${dp.expert2}, independiente. Otro revisor marcó estas afirmaciones como POSIBLEMENTE incorrectas. CONFIRMÁ con rigor: 'confirmed' SOLO si la afirmación es OBJETIVAMENTE FALSA o DESACTUALIZADA según el comportamiento oficial y actual de ${dp.platformShort} (o contradice la tabla de datos duros). Si es correcta como se enseña a nivel certificación, o es un matiz de 'se podría afinar', o NO estás seguro → 'keep'. Ante la duda, 'keep'. Respondés SOLO JSON.`;
  const user = `AFIRMACIONES (con la objeción del 1er revisor):\n${wrong.map((c) => `(id ${c.id}) "${c.text}" — objeción: ${first.get(c.id)?.note || ""}`).join("\n")}${factsBlock}\n\nDevolvé {"verdicts":[{"id":"...","decision":"confirmed|keep"}]}`;
  try {
    const res = await openai.chat.completions.create({ model, messages: [{ role: "system", content: sys }, { role: "user", content: user }], response_format: { type: "json_object" }, ...qaParams(1200) });
    recordTextSpend(model, res.usage, { kind: "text", pageId: chapterId, label: "verify-confirm-wrong" });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { verdicts?: { id?: string; decision?: string }[] };
    const decided = new Set<string>();
    for (const v of raw.verdicts ?? []) { const id = String(v.id); decided.add(id); if (String(v.decision) === "confirmed") out.add(id); }
    for (const c of wrong) if (!decided.has(c.id)) out.add(c.id);   // el 2º voto no opinó sobre este → fail-closed (bloquea)
  } catch { for (const c of wrong) out.add(c.id); }   // 2º voto falló → conservar el bloqueo (no dejar pasar por un error de red)
  return out;
}

export async function verifyChapterClaims(chapterId: string, seed: ChapterSeed, opts: { claims?: ProseClaim[]; model?: string } = {}): Promise<GroundingResult> {
  // Modelo VERIFICADOR. Default = qaModel (Luna). El caller puede pedir OTRO (independiente del autor/enrich) — p.ej.
  // la verificación de la PRÁCTICA corre en `practiceVerifyModel` (terra) para no ser el mismo modelo que la escribió.
  const model = opts.model ?? CONFIG.qaModel;
  const base = (extra: Partial<GroundingResult>): GroundingResult => ({
    outcome: "failed", model: null, skillId: chapterId, groundingStatus: "unverified", score: 0,
    total: 0, supported: 0, unsupported: 0, contradicted: 0, noSource: 0, blocked: true,
    reason: "", checks: [], error: null, ...extra,
  });
  if (!hasOpenAIKey()) return base({ outcome: "no_key", error: "Sin llave OpenAI." });
  const openai = getOpenAI();
  if (!openai) return base({ outcome: "no_key", error: "Cliente OpenAI no disponible." });
  if (wouldExceedCap(0.03)) return base({ outcome: "failed", model: CONFIG.qaModel, error: "Tope mensual de costo alcanzado." });

  // 1) Afirmaciones extraídas de la PROSA (independiente del autor). `opts.claims` permite reusar un set
  //    ESTABLE (p. ej. re-chequeo de salud sin re-extraer) → evita el "blanco móvil" del whack-a-mole.
  const claims = (opts.claims && opts.claims.length) ? opts.claims : await extractProseClaims(seed);
  if (claims.length === 0) return base({ outcome: "no_claims", blocked: false, groundingStatus: "unverified", reason: "No se pudieron extraer afirmaciones verificables del relato." });

  // Fuentes DEL MÓDULO (como el autor/enrich), a alta fidelidad. Fallback a global solo si el módulo no tiene fuentes.
  const scoped = await moduleScopedSources(seed.skillIds ?? []);
  const sources = scoped.length ? scoped : listSources();
  const checks: ClaimCheck[] = claims.map((c) => ({
    claimId: c.id, field: "section", text: c.text, citationKind: "source", sourceId: null,
    verdict: "no_source" as ClaimVerdict, note: "",
  }));

  if (sources.length > 0) {
    // 2) Con fuentes DEL MÓDULO: usar TODAS (≤~12) a ALTA fidelidad (8000 chars) → el pasaje que respalda
    //    la afirmación entra en ventana. Sin scope (fallback global): rankear top-8 a 2600 como antes.
    const picked = scoped.length ? scoped.slice(0, 12) : rankSources(claims, sources);
    // Fuentes del módulo → texto COMPLETO (el scrape topa ~20k) para que el pasaje que respalda entre en ventana;
    // fallback global (sin scope) → 2600 por costo (son 250 fuentes irrelevantes en su mayoría).
    const corpus = picked.map((s) => `[${s.id}] ${s.title}\n${scoped.length ? (s.text ?? "") : (s.text ?? "").slice(0, 2600)}`).join("\n---\n");
    const claimsBlock = claims.map((a) => `(id ${a.id}) "${a.text}"`).join("\n");
    const sys = "Sos un verificador de hechos INDEPENDIENTE y escéptico para una editorial de certificación cloud. Para CADA afirmación juzgás SOLO contra las FUENTES. 'supported' SOLO si podés copiar una ORACIÓN TEXTUAL de una fuente que la respalde — incluí esa oración exacta en 'quote'. 'contradicted' si una fuente dice lo CONTRARIO — incluí la 'quote'. Si NINGUNA fuente la respalda textualmente → 'insufficient' (quote vacío). Ante la duda NO es 'supported'. NO uses tu conocimiento propio, SOLO las fuentes dadas. Respondés SOLO JSON.";
    const user = `FUENTES:\n${corpus}\n\nAFIRMACIONES:\n${claimsBlock}\n\nDevolvé {"verdicts":[{"id":"...","verdict":"supported|contradicted|insufficient","quote":"oración textual de la fuente, o vacío","sourceId":"id de la fuente entre [] o vacío"}]}`;
    try {
      const res = await openai.chat.completions.create({
        model, messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        response_format: { type: "json_object" }, ...qaParams(2200),
      });
      recordTextSpend(model, res.usage, { kind: "text", pageId: chapterId, label: "verify-chapter" });
      const raw = JSON.parse(res.choices[0]?.message?.content ?? "{}") as { verdicts?: { id?: string; verdict?: string; quote?: string; sourceId?: string }[] };
      const byId = new Map((raw.verdicts ?? []).map((v) => [String(v.id), v] as const));
      const corpusNorm = norm(corpus);
      for (const c of checks) {
        const v = byId.get(c.claimId);
        const quote = norm(v?.quote);
        // "supported" SOLO si la cita EXISTE de verdad en el corpus (mata la lenidad/alucinación del LLM).
        const quoteReal = quote.length >= 24 && corpusNorm.includes(quote.slice(0, 60));
        if (v?.verdict === "contradicted") { c.verdict = "contradicted"; c.sourceId = String(v.sourceId ?? "").replace(/[[\]]/g, "") || null; }
        else if (v?.verdict === "supported" && quoteReal) { c.verdict = "supported"; c.sourceId = String(v.sourceId ?? "").replace(/[[\]]/g, "") || null; }
        else { c.verdict = "unsupported"; }   // insufficient, o supported sin cita real → NO pasa (ausencia ≠ verified)
        c.note = strip(v?.quote ?? "").slice(0, 200);
      }
    } catch (err) {
      return base({ outcome: "failed", model: CONFIG.qaModel, error: String((err as Error)?.message ?? err) });
    }
  }

  // 4) EXPERTO ESCÉPTICO (con la hoja de datos duros) — separa el error DURO (bloquea) del matiz (surfacea).
  const facts = hardFactsText(moduleSlugsFor(seed.skillIds ?? []));
  const expert = await expertFactCheck(chapterId, claims, facts, model);
  // DOBLE-VOTO: un 'wrong' del experto solo BLOQUEA si un 2º juez independiente lo confirma (reduce el falso
  // positivo del juez sin-corpus). Los 'wrong' NO confirmados NO bloquean → se surfacean para revisión humana.
  const firstWrong = claims.filter((c) => { const e = expert.get(c.id); return !!e && (e.verdict === "wrong" || e.verdict === "incorrect"); });
  const confirmedWrong = firstWrong.length ? await confirmWrong(chapterId, firstWrong, expert, facts, model) : new Set<string>();
  const precisionNotes: string[] = [];
  for (const c of checks) {
    const e = expert.get(c.claimId);
    if (!e) continue;
    const isWrong = e.verdict === "wrong" || e.verdict === "incorrect";   // "incorrect" = legacy → duro
    if (isWrong && confirmedWrong.has(c.claimId) && c.verdict !== "supported") {
      c.verdict = "contradicted"; c.note = `[error] ${e.note || "afirmación incorrecta o desactualizada"}`.slice(0, 220);
    } else if (isWrong && confirmedWrong.has(c.claimId) && c.verdict === "supported") {
      // El CORPUS lo respalda con cita REAL (quoteReal, L174) → el experto SIN-corpus NO puede bloquearlo: evita el
      // falso positivo del conocimiento general del modelo por sobre la fuente OFICIAL (p.ej. el mensaje A2A incluye
      // conversation history, que el spec general niega). Se surfacea para revisión humana, NO bloquea.
      const n = e.note || "el experto lo objeta pero el corpus lo respalda con cita";
      c.note = `[revisar·corpus>experto] ${n}`.slice(0, 220);
      precisionNotes.push(`«${c.text.slice(0, 60)}…» corpus-respaldado; objeción del experto (no bloquea): ${n}`.slice(0, 160));
    } else if (isWrong && c.verdict !== "contradicted") {
      // 1er voto 'wrong' NO confirmado por el 2º → NO bloquea; se surfacea como sospecha para revisión humana.
      const n = e.note || "posible error, sin 2º voto confirmatorio";
      c.note = `[revisar·no-confirmado] ${n}`.slice(0, 220);
      precisionNotes.push(`«${c.text.slice(0, 60)}…» ${n}`.slice(0, 160));
    } else if (e.verdict === "imprecise" && c.verdict !== "contradicted") {
      // Nitpick de buenas prácticas: NO cambia el veredicto (queda su estado de corpus) → NO bloquea; solo se surfacea.
      const n = e.note || "se puede afinar";
      c.note = `[precisión] ${n}`.slice(0, 220);
      precisionNotes.push(`«${c.text.slice(0, 60)}…» ${n}`.slice(0, 160));
    }
  }

  // Tally: SOLO bloquea el ERROR factual DURO (contradicho por fuente o marcado 'wrong' por el experto). La falta
  // de respaldo en el corpus baja a "partial" pero NO bloquea (hueco de fuente); las imprecisiones se surfacean.
  const total = checks.length;
  const supported = checks.filter((c) => c.verdict === "supported").length;
  const contradicted = checks.filter((c) => c.verdict === "contradicted").length;
  const unsupported = checks.filter((c) => c.verdict === "unsupported").length;
  const noSource = checks.filter((c) => c.verdict === "no_source").length;
  const blocked = contradicted > 0;
  const groundingStatus: GroundingStatus = blocked ? "unverified" : (unsupported === 0 && noSource === 0 && supported === total) ? "verified" : "partial";
  const score = total ? Math.round(((supported + 0.5 * (noSource + unsupported)) / total) * 100) / 10 : 0;
  const bad = checks.filter((c) => c.verdict === "contradicted").slice(0, 3).map((c) => `«${c.text.slice(0, 70)}…»${c.note ? ` ${c.note}` : ""}`).join(" | ");
  const reasonBase = blocked
    ? `Bloqueada: ${contradicted} afirmación(es) incorrecta(s)/contradicha(s). ${bad}`
    : groundingStatus === "verified"
      ? "Verificada: todas respaldadas y sin errores factuales."
      : `Parcial: ${supported}/${total} respaldadas; ${unsupported} sin respaldo en la fuente (posible hueco de corpus, no error).`;
  // Las imprecisiones NO bloquean, pero se surfacean para revisión humana (transparencia del gate afinado).
  const reason = precisionNotes.length
    ? `${reasonBase} · ${precisionNotes.length} nota(s) de precisión (no bloquean): ${precisionNotes.slice(0, 2).join(" ; ")}`
    : reasonBase;
  return { outcome: "real", model, skillId: chapterId, checks, error: null, groundingStatus, score, total, supported, unsupported, contradicted, noSource, blocked, reason };
}
