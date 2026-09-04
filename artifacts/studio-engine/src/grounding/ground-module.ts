import { getModule } from "../skills/ai-200-outline.js";
import { ensureDomainSources } from "../skills/skill-sources.js";
import { analyzeModule } from "./psychometrics.js";
import { authorChapter } from "./author-chapter.js";
import { verifyChapterClaims } from "./verify-chapter.js";
import { enrichAndGate } from "./enrich-chapter.js";
import { superviseChapter } from "./supervise-chapter.js";
import { upsertPersistedChapter } from "../chapter-store.js";
import { enqueueClaimReviews, type ClaimReviewInput } from "../book/claim-review-store.js";
import { verifyPractice } from "./verify-practice.js";
import { timeAgent } from "../agents/agent-runtime.js";
import { withRunContext, type RunContext } from "../agents/runtime-context.js";
import type { ChapterSeed, GroundModuleResult, PageProvenance, GroundingResult } from "../types.js";

/**
 * ORQUESTADOR DOCUMENTAL POR MÓDULO (Master Book). Espejo de `groundDomain`, pero
 * a nivel MÓDULO y produciendo un RELATO en vez de una lámina:
 *
 *   Psicometrista → (asienta corpus) → Autor documental → Verificador híbrido
 *     → Supervisor (+ alineación psicométrica) → (Persistir capítulo)
 *
 * v1 (vertical slice): persiste con el estado de grounding y lo SURFACEA (no veta
 * como el Atlas) para poder revisar el look & feel documental; el gate duro se
 * afina después. Reusa el corpus ingerido del Atlas (fuentes MS Learn).
 */
// El gate del grounding bloquea la persistencia de capítulos no verificados (contradichos o sin
// respaldo en la fuente), como el Atlas. Se puede desactivar (modo "surfacear") con GROUNDING_GATE=off.
const GATE = process.env.GROUNDING_GATE !== "off";

export async function groundModule(moduleId: string, opts: { persist?: boolean; force?: boolean; runContext?: RunContext } = {}): Promise<GroundModuleResult> {
  const mod = getModule(moduleId);
  if (!mod) throw new Error(`modulo_desconocido:${moduleId}`);
  const persist = opts.persist !== false;
  const force = opts.force === true;   // re-generar (ignorar caché de psicometría/autor)
  const r: GroundModuleResult = {
    moduleId, moduleTitle: mod.moduleTitle, domainId: mod.domainId,
    search: null, psychometrics: null, author: null, grounding: null, enrich: null, relevance: null,
    chapterId: null, persisted: false, step: "psychometrics", error: null,
  };
  // Contexto de corrida ambiente → cada `timeAgent` de abajo etiqueta su run con este módulo.
  await withRunContext({ runContext: opts.runContext ?? "module", moduleId }, async () => {
    try {
      // Asienta el corpus del dominio (fuentes de las unidades) — reuso del ingest del Atlas.
      await timeAgent("buscador", "ensure-sources", () => ensureDomainSources(mod.domainId));

      // 1) PSICOMETRISTA — cómo evalúa el examen este módulo.
      const psy = await timeAgent("psicometrista", "psychometrics", () => analyzeModule(moduleId, force));
      if (psy.profile) r.psychometrics = { verbs: psy.profile.measuredVerbs.length, archetypes: psy.profile.questionArchetypes.length, reasoningGoal: psy.profile.reasoningGoal };

      // 2) AUTOR DOCUMENTAL — teje el relato guiado por el perfil psicométrico.
      r.step = "author";
      const authored = await timeAgent("autor", "chapter-author", () => authorChapter(moduleId, psy.profile, force));
      r.author = { outcome: authored.outcome, sections: authored.seed?.sections.length ?? 0, graphics: authored.seed?.graphics.length ?? 0, citedClaims: authored.citedClaims, cached: authored.cached };
      if (authored.outcome !== "real" || !authored.seed) { r.error = authored.error ?? "el autor no produjo capítulo"; return; }
      r.chapterId = authored.seed.chapterId;
      const seed = authored.seed;

      // 3) ENRIQUECEDOR GATEADO — agrega código/tablas/callouts/práctica y VERIFICA internamente (el código es lo
      // que más alucina). La verificación del AUTOR ya NO corre acá: era REDUNDANTE con la interna del enrich y la
      // verificación (kimi, razonamiento) es CARA (~2.5 min); el grounding del autor se computa LAZY, solo si el
      // enrich cae a fallback. El gate DURO corre después, sobre el grounding del seed elegido (GROUNDING_GATE=off lo apaga).
      r.step = "enrich";
      let finalSeed: ChapterSeed = seed;
      let finalGrounding: GroundingResult;
      const enr = await timeAgent("autor", "enrich-chapter", () => enrichAndGate(seed, { force }));
      r.enrich = { applied: enr.enriched, ok: enr.ok, repairs: enr.repairs, escalated: enr.escalated, model: enr.model, reason: enr.ok ? `enriquecido verificado${enr.escalated ? " (escalada)" : ""}` : (enr.error ?? "no aplicado") };
      if (enr.ok && enr.enriched && enr.grounding) {
        finalSeed = enr.seed;
        finalGrounding = enr.grounding;
      } else {
        // Enrich rechazado por el gate → se conserva la PROSA del autor (verificada), pero RESCATAMOS la
        // PRÁCTICA del enrich: los ejercicios son editoriales (no se gatean por grounding), el rechazo fue por
        // la prosa/código, no por la práctica → no hay razón para perderlos. Verificación lazy del autor.
        r.step = "verify";
        const rescuedPractice = enr.seed?.practice;
        finalSeed = (rescuedPractice && rescuedPractice.length) ? { ...seed, practice: rescuedPractice } : seed;
        finalGrounding = await timeAgent("verificador", "verify-chapter", () => verifyChapterClaims(seed.chapterId, seed));
      }
      r.grounding = { status: finalGrounding.groundingStatus, score: finalGrounding.score, blocked: finalGrounding.blocked, reason: finalGrounding.reason };

      // GATE DE PRÁCTICA (independiente, CONFIG.practiceVerifyModel = terra): la práctica NO pasaba por ningún gate.
      // Acá se verifican respuestas/CLI en un modelo DISTINTO del autor/enrich; los ítems incorrectos se DROPEAN (no
      // bloquea el capítulo — la práctica es editorial) y se encolan a revisión humana. Solo con el gate encendido.
      let practiceReviews: ClaimReviewInput[] = [];
      if (GATE) {
        try {
          const pv = await timeAgent("verificador", "verify-practice", () => verifyPractice(finalSeed.chapterId, finalSeed));
          if (pv.dropped) finalSeed = { ...finalSeed, practice: pv.kept };
          practiceReviews = pv.reviews;
        } catch { /* la verificación de práctica NO debe romper el grounding */ }
      }

      // COLA DE REVISIÓN HUMANA: encolá los claims CONTESTADOS que el pipeline no resolvió solo —contradichos
      // que bloquean, y 'wrong' que el 2º voto NO confirmó (disputa genuina)— para adjudicación humana acotada.
      // Corre en AMBOS caminos (bloqueo y persistencia); la cola NO debe romper el grounding.
      try {
        const toReview: ClaimReviewInput[] = [];
        for (const c of finalGrounding.checks) {
          if (c.verdict === "contradicted") toReview.push({ claimText: c.text, verdict: c.verdict, note: c.note, sourceId: c.sourceId, kind: "blocked" });
          else if ((c.note || "").startsWith("[revisar")) toReview.push({ claimText: c.text, verdict: c.verdict, note: c.note, sourceId: c.sourceId, kind: "unconfirmed" });
        }
        toReview.push(...practiceReviews);   // ítems de práctica dropeados/sospechosos → misma cola de revisión
        await enqueueClaimReviews({ chapterId: finalSeed.chapterId, chapterNumber: finalSeed.chapterNumber, title: finalSeed.title, domainLabel: finalSeed.domainLabel }, toReview);
      } catch { /* la cola de revisión NO debe romper el grounding */ }

      // GATE DURO (post-reparación): recién ACÁ se bloquea. Si tras enriquecer + reparar el grounding SIGUE con
      // errores factuales (o el enrich falló y quedó la prosa del autor con un error no reparable), no se persiste.
      if (GATE && finalGrounding.blocked) {
        r.step = "blocked";
        r.error = `Grounding bloqueado tras enriquecido/reparación (no se persiste): ${finalGrounding.reason}`;
        return;
      }

      // 4) SUPERVISOR — cobertura/pertinencia + alineación psicométrica.
      r.step = "supervise";
      const rel = await timeAgent("supervisor", "supervise-chapter", () => superviseChapter(finalSeed));
      // ── ANTI VEREDICTO-FANTASMA (P0) ────────────────────────────────────────────────
      // El base de fallo de superviseChapter devuelve relevanceStatus "thin" con score 0. Registrado
      // tal cual, un FALLO del supervisor (sin llave, tope de costo, error del modelo) queda
      // INDISTINGUIBLE de un capítulo genuinamente flojo. Un error no es un veredicto.
      // (Fix durable pendiente: un estado `unknown` propio en RelevanceResult.)
      const relFailed = rel.outcome !== "real";
      const relNote = relFailed ? `SUPERVISOR SIN VEREDICTO (${rel.outcome}): ${rel.error ?? "sin detalle"}` : "";
      if (relFailed) {
        r.error = `${r.error ? `${r.error} · ` : ""}${relNote}`;
      } else {
        r.relevance = { status: rel.relevanceStatus, score: rel.score, psychoAlignment: rel.psychoAlignment ?? 0, gaps: rel.gaps };
      }

      // 5) PERSISTIR CAPÍTULO (seed + procedencia).
      if (persist) {
        r.step = "persist";
        const provenance: PageProvenance = {
          pageId: finalSeed.chapterId,
          skillIds: mod.skillIds,
          sourceIds: authored.sourceIds,
          claims: authored.claims,
          checks: finalGrounding.checks,
          groundingStatus: finalGrounding.groundingStatus,
          score: finalGrounding.score,
          updatedAt: new Date().toISOString(),
        };
        upsertPersistedChapter({
          seed: finalSeed, provenance, persistedAt: new Date().toISOString(),
          // Si el supervisor no emitió veredicto, se persiste el marcador al frente de `gaps` para que
          // el cockpit/humano vea que este "thin" NO es un juicio real (ver ANTI VEREDICTO-FANTASMA).
          relevance: { status: rel.relevanceStatus, score: rel.score, coverageScore: rel.coverageScore, contentScore: rel.contentScore, gaps: relFailed ? [relNote, ...rel.gaps] : rel.gaps, psychoAlignment: rel.psychoAlignment, psychoGaps: rel.psychoGaps },
        });
        r.persisted = true;
      }
      r.step = "done";
    } catch (err) {
      r.error = String((err as Error)?.message ?? err);
    }
  });
  return r;
}
