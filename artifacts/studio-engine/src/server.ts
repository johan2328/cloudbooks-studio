import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir } from "./config.js";
import { buildCatalog, buildKeyStatus } from "./catalog.js";
import { getSeed } from "./seeds.js";
import { deletePersistedPage, getProvenance, getPersistedPage, listPersistedPages, upsertPersistedPage } from "./page-store.js";
import { renumberPagesToCurriculum } from "./page-renumber.js";
import { stripCitationMarkers } from "./grounding/author-page.js";
import { totalUnits } from "./skills/ai-200-outline.js";
import { readOutputStatus } from "./output-status.js";
import { RECIPES, getRecipe } from "./recipes.js";
import { generatePage } from "./generate.js";
import { generateInfographicPage, setStyleAnchor, getInfographicManifest, getInfographicStats, runInfographicBatch } from "./generate-infographic.js";
import { backfillThumbs } from "./image/thumb.js";
import { auditCoverage } from "./grounding/audit-coverage.js";
import { resolveContract, domainIdForSeed } from "./contract/design-contract.js";
import { exportBookPdf, exportBook, type ExportFormat } from "./export-pdf.js";
import { getApprovals, setPageApproved, setPagesApproved, setBookApproved } from "./infographic-approvals.js";
import { assembleBook, bookOutline, frontMatterPreviewHtml } from "./book/assemble-book.js";
import { publishAssets } from "./book/publish-assets.js";
import { getBookConfig, saveBookConfig, saveBookAsset, DEFAULT_CONFIG, type BookConfig } from "./book/book-config.js";
import { extractPalette } from "./book/extract-palette.js";
import { generateBookSection, type BookSection } from "./book/book-generate.js";
import { generateStudyGuide, generateRouteIntro, generateGlossary, generateDomainMap, generateScenarioReview } from "./book/sections-gen.js";
import { generateRouteDivider, runRouteDividerBatch } from "./book/divider-gen.js";
import { getMatterContract, saveMatterContract, type MatterContract } from "./book/matter-contract.js";
import { getImageContract, saveImageContract, type ImageContract } from "./book/image-contract.js";
import { getBrandContract, saveBrandContract, type BrandContract } from "./book/brand-contract.js";
import { getEditorialContract, saveEditorialContract, type EditorialContract } from "./book/editorial-contract.js";
import { getCollectionTags, addCollectionTags } from "./book/collection-tags.js";
import { costStatus, costBreakdown } from "./cost.js";
import { creditStatus, setCreditAnchor } from "./credit.js";
import { listCreditEvents, addCreditEvent } from "./credit-events.js";
import { agentsRollup, recentActivity } from "./agents/agents-rollup.js";
import { agentRuntimeRollup, type Period } from "./agents/agent-runtime-rollup.js";
import { decide } from "./decide.js";
import { predictPage } from "./predict.js";
import { editorialQa, buildEditorialContext } from "./qa-editorial.js";
import { autoRevise } from "./auto-revise.js";
import { getOutline, setOutline, buildCoverage, allModules, chapterNumberForModule, modulesForDomain } from "./skills/ai-200-outline.js";
import { allExtraSources, setExtraSources } from "./grounding/extra-sources.js";
import { allExamSignal, setExamSignal } from "./grounding/exam-signal.js";
import { listSources, removeSource, getSource } from "./grounding/source-store.js";
import { ingestUrl, ingestCsvText, ingestSheetUrl } from "./grounding/ingest.js";
import { authorSkill } from "./grounding/author-page.js";
import { verifyGrounding } from "./grounding/verify-grounding.js";
import { persistAuthored } from "./grounding/persist-page.js";
import { searchSkillSources } from "./grounding/search-sources.js";
import { superviseRelevance } from "./grounding/relevance-supervisor.js";
import { saveRelevance, getRelevanceForPage } from "./grounding/relevance-store.js";
import { groundDomain } from "./grounding/ground-domain.js";
import { groundModule } from "./grounding/ground-module.js";
import { listPersistedChapters, getPersistedChapter, upsertPersistedChapter } from "./chapter-store.js";
import { chapterQa, chaptersQa } from "./chapter-qa.js";
import { listClaimReviews, resolveClaimReview, type ClaimReviewStatus } from "./book/claim-review-store.js";
import { generateChapterGraphics } from "./book/chapter-graphics.js";
import { generateChapterDivider, chapterDividerUrlIfExists } from "./book/chapter-divider-gen.js";
import { runPartOpenerBatch, generatePartOpener, partOpenerUrlIfExists } from "./book/part-opener-gen.js";
import { renderChapterPdf } from "./book/render-chapter.js";
import { assembleMasterBook } from "./book/assemble-master-book.js";
import { assembleRoutePdf } from "./book/assemble-route.js";
import { generateRouteCapstone } from "./grounding/capstone-chapter.js";
import { runRoutePanel } from "./book/route-panel.js";
import { getRoutePanelHistory, getAllRoutePanels, appendPanelRun } from "./book/route-panel-store.js";
import { generateBookCover, generateBookBackCover, selectCoverTake, selectBackCoverTake, listDesignAssets, getDesignAnchor, setDesignAnchorFromBook } from "./book/cover-gen.js";
import { getDesignLock, updateDesignLock } from "./book/design-lock.js";
import { getAllDesignNotes, setDesignNote } from "./book/design-notes.js";
import { getCorridaTiming, updateCorridaTiming } from "./book/corrida-timing.js";
import { generateFicha } from "./book/ficha-gen.js";
import { listBookPreviews } from "./book/book-previews.js";
import { getStorefront, getStorefrontCatalog } from "./book/storefront.js";
import { generateMasterGlossary } from "./book/master-matter.js";
import { proposeFamilyPalettes, paletteFor, applyActiveBookPalette } from "./book/palette-family.js";
import type { BookStyle } from "./book/book-config.js";
import { auditTopics } from "./grounding/topic-audit.js";
import { captureEvidence, listEvidence } from "./grounding/evidence-shots.js";
import { buildGroundingTree } from "./grounding/grounding-tree.js";
import { improveRelevance } from "./grounding/improve-relevance.js";
import { ensureSkillSources } from "./skills/skill-sources.js";
import { isRouteLocked, listRouteLocks, setRouteLock } from "./grounding/route-locks.js";
import { runBatch } from "./batch.js";
import { reviewBookConsistency } from "./book/editor-jefe.js";
import { saveBookReview, clearBookIssues } from "./book/book-review-store.js";
import { saveEditorial } from "./editorial-store.js";
import { premiumVerdict, contentReadiness } from "./premium-verdict.js";
import { pageQaDossier, qaCockpitRollup } from "./qa-cockpit.js";
import { buildLibraryTree, activateCertBook, enableBook, switchBook } from "./library-catalog.js";
import { getActiveBook } from "./active-book.js";
import { runWithBook } from "./book-context.js";
import { acquireBookLock, releaseBookLock, bookLockState } from "./book-lock.js";
import { libraryMetrics } from "./library-metrics.js";
import { canonicalCerts, removeCanonicalCert, setCanonicalCertStatus } from "./certifications.js";
import { runCertPosterSync, lastSyncLog, syncHistory } from "./cert-poster-sync.js";
import { generateVariants, selectVariant } from "./image/variants.js";
import { MEASURABLE_CONTRACT } from "./contract.js";
import { readQaSummary } from "./qa-summary.js";

const noStore = (res: Response) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
};

/**
 * App del motor. Todo bajo el prefijo /engine para no colisionar con /api
 * (api-server de Codex). El frontend lo alcanza vía proxy de Vite.
 */
export function createApp(): Express {
  const app = express();
  // CORS SOLO a orígenes locales (Vite en 5173) → bloquea drive-by/CSRF desde otras webs.
  app.use(cors({ origin: [/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/] }));
  app.use(express.json({ limit: "16mb" }));

  // FIJA el libro activo por request (anti flip-hazard, T2): CONFIG.certId/format resuelven al
  // libro capturado al inicio del request y quedan inmunes a un switch concurrente en otra pestaña.
  // Los mutadores (switch/activate) actualizan su propio pin vía setActiveBook→pinCurrentBook.
  app.use((_req: Request, _res: Response, next: NextFunction) => runWithBook(getActiveBook(CONFIG.outputRoot), () => next()));

  // Token opcional (defensa en profundidad). Si ENGINE_TOKEN está seteado, las MUTACIONES
  // (POST/PUT/PATCH/DELETE) exigen el header x-engine-token; el proxy de Vite lo inyecta.
  // Si no está seteado (default), no se exige nada → no rompe el flujo local.
  const ENGINE_TOKEN = process.env.ENGINE_TOKEN ?? "";
  if (ENGINE_TOKEN) {
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === "GET" || req.method === "OPTIONS" || req.path === "/engine/health") { next(); return; }
      if (req.get("x-engine-token") === ENGINE_TOKEN) { next(); return; }
      res.status(401).json({ error: "unauthorized" });
    });
  }

  app.get("/engine/health", (_req: Request, res: Response) => {
    res.json({ ok: true, engine: "studio-engine-v1", store: CONFIG.store, ts: new Date().toISOString() });
  });

  app.get("/engine/key-status", (_req: Request, res: Response) => {
    noStore(res);
    res.json(buildKeyStatus());
  });

  app.get("/engine/catalog", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await buildCatalog());
    } catch (err) {
      res.status(500).json({ error: "catalog_failed", detail: String(err) });
    }
  });

  // ── Biblioteca multi-cloud (cloud → cert → libro) + activación de certs ──
  app.get("/engine/library", (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(buildLibraryTree());
    } catch (err) {
      res.status(500).json({ error: "library_failed", detail: String(err) });
    }
  });

  app.post("/engine/library/activate", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; bookId?: string };
      const certId = String(body.certId ?? "").trim();
      const bookId = String(body.bookId ?? "").trim();
      if (!certId || !bookId) { res.status(400).json({ ok: false, error: "Falta 'certId' o 'bookId'." }); return; }
      noStore(res);
      const lock = bookLockState();
      if (lock.locked) { res.json({ ok: false, busy: true, holder: lock.holder, tree: buildLibraryTree(), error: `Hay una corrida en curso (${lock.holder}). Esperá a que termine.` }); return; }
      const r = activateCertBook(certId, bookId);
      res.status(r.ok ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // CAMBIAR el libro de TRABAJO (árbol). Exige que esté activado; NO activa.
  // Métricas de los 6 libros de la familia (Dashboard global + Timeline). Lectura directa por formato.
  app.get("/engine/library-metrics", (_req: Request, res: Response) => {
    try { noStore(res); res.json(libraryMetrics()); }
    catch (err) { res.status(500).json({ error: "library_metrics_failed", detail: String(err) }); }
  });

  // Catálogo canónico de certificaciones (fuente ÚNICA: árbol/Act.Certs + página de certificaciones).
  app.get("/engine/certifications", (_req: Request, res: Response) => {
    try { noStore(res); res.json({ certs: canonicalCerts() }); }
    catch (err) { res.status(500).json({ error: "certifications_failed", detail: String(err) }); }
  });

  // Sync mensual con el póster oficial (auto-agrega altas, NUNCA auto-deprecia; log auditado).
  app.post("/engine/certifications/sync", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      const log = await runCertPosterSync({ trigger: "manual" });
      // Siempre 200: el sync "corrió"; si falló (póster/visión) el detalle va en log.ok/log.error.
      res.json({ ok: log.ok, log, certs: canonicalCerts() });
    } catch (err) { res.status(500).json({ ok: false, error: "cert_sync_failed", detail: String(err) }); }
  });
  // Último log + historial del sync (para el badge "última sync" y el panel de cambios).
  app.get("/engine/certifications/sync-log", (_req: Request, res: Response) => {
    try { noStore(res); res.json({ last: lastSyncLog(), history: syncHistory() }); }
    catch (err) { res.status(500).json({ error: "cert_sync_log_failed", detail: String(err) }); }
  });
  // Descartar un code del canónico (limpiar un falso-add del sync). NO borra libros/activaciones.
  app.post("/engine/certifications/remove", (req: Request, res: Response) => {
    try {
      noStore(res);
      const code = String((req.body ?? {}).code ?? "").trim();
      if (!code) { res.status(400).json({ ok: false, error: "Falta 'code'." }); return; }
      const removed = removeCanonicalCert(code);
      res.json({ ok: removed, removed, certs: canonicalCerts() });
    } catch (err) { res.status(500).json({ ok: false, error: "cert_remove_failed", detail: String(err) }); }
  });
  // Cambiar el status de un cert canónico (retirar/reactivar). Es la REVERSA de la baja automática del sync.
  app.post("/engine/certifications/status", (req: Request, res: Response) => {
    try {
      noStore(res);
      const code = String((req.body ?? {}).code ?? "").trim();
      const status = String((req.body ?? {}).status ?? "").trim();
      const VALID = new Set(["Activo", "Nuevo", "Beta", "Sustituida", "Retirada"]);
      if (!code || !VALID.has(status)) { res.status(400).json({ ok: false, error: "code/status inválido" }); return; }
      const ok = setCanonicalCertStatus(code, status);
      res.json({ ok, certs: canonicalCerts() });
    } catch (err) { res.status(500).json({ ok: false, error: "cert_status_failed", detail: String(err) }); }
  });

  app.post("/engine/library/switch", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; bookId?: string };
      const certId = String(body.certId ?? "").trim();
      const bookId = String(body.bookId ?? "").trim();
      if (!certId || !bookId) { res.status(400).json({ ok: false, error: "Falta 'certId' o 'bookId'." }); return; }
      noStore(res);
      const lock = bookLockState();
      if (lock.locked) { res.json({ ok: false, busy: true, holder: lock.holder, tree: buildLibraryTree(), error: `Hay una corrida en curso (${lock.holder}). Esperá a que termine.` }); return; }
      const r = switchBook(certId, bookId);
      res.status(r.ok ? 200 : 422).json(r);
    } catch (err) { res.status(500).json({ ok: false, error: String(err) }); }
  });

  // ── Lock "busy" de la corrida (anti flip): tomar/soltar/leer. Mientras esté tomado,
  //    switch/activate responden ocupado (no se flipa el libro entre requests de la corrida). ──
  app.post("/engine/library/lock", (req: Request, res: Response) => {
    noStore(res);
    const who = String((req.body ?? {}).holder ?? "corrida").trim() || "corrida";
    const ok = acquireBookLock(who);
    res.json({ ok, state: bookLockState() });
  });
  app.post("/engine/library/unlock", (_req: Request, res: Response) => {
    noStore(res);
    releaseBookLock();
    res.json({ ok: true, state: bookLockState() });
  });
  app.get("/engine/library/lock", (_req: Request, res: Response) => {
    noStore(res);
    res.json(bookLockState());
  });

  // ACTIVAR/DESACTIVAR un libro para producción (Timeline). NO cambia el libro de trabajo.
  app.post("/engine/library/enable", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; bookId?: string; enabled?: boolean };
      const certId = String(body.certId ?? "").trim();
      const bookId = String(body.bookId ?? "").trim();
      if (!certId || !bookId) { res.status(400).json({ ok: false, error: "Falta 'certId' o 'bookId'." }); return; }
      noStore(res);
      const r = enableBook(certId, bookId, body.enabled !== false);
      res.status(r.ok ? 200 : 422).json(r);
    } catch (err) { res.status(500).json({ ok: false, error: String(err) }); }
  });

  app.get("/engine/output-status/:pageId", async (req: Request, res: Response) => {
    try {
      noStore(res);
      const pageId = String(req.params.pageId ?? "");
      res.json(await readOutputStatus(pageId));
    } catch (err) {
      res.status(500).json({ error: "output_status_failed", detail: String(err) });
    }
  });

  // Sirve el page.html de una página a través del motor. Vite intercepta los .html
  // del publicDir y devuelve el SPA (404); proxeado por /engine se sirve tal cual.
  app.get("/engine/page-html/:pageId", (req: Request, res: Response) => {
    try {
      const pageId = String(req.params.pageId ?? "");
      const file = path.join(pageOutputDir(pageId), "page.html");
      if (!existsSync(file)) { res.status(404).type("html").send("<!doctype html><meta charset='utf-8'><body style='font-family:system-ui;color:#64748b;padding:24px'>Esta página todavía no se generó.</body>"); return; }
      noStore(res);
      res.type("html").send(readFileSync(file, "utf8"));
    } catch (err) {
      res.status(500).type("html").send(`<!doctype html><body>Error: ${String(err)}</body>`);
    }
  });

  app.get("/engine/seed/:pageId", (req: Request, res: Response) => {
    const pageId = String(req.params.pageId ?? "");
    const seed = getSeed(pageId);
    if (!seed) {
      res.status(404).json({ error: "seed_missing", pageId });
      return;
    }
    noStore(res);
    res.json(seed);
  });

  app.get("/engine/recipes", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ recipes: RECIPES });
  });

  // Taxonomía de skills del examen (ancla de cobertura del grounding).
  app.get("/engine/skills", (_req: Request, res: Response) => {
    noStore(res);
    res.json(getOutline());
  });

  // Cobertura: qué skills cubre cada página y qué brechas quedan.
  app.get("/engine/skills/coverage", (_req: Request, res: Response) => {
    noStore(res);
    res.json(buildCoverage());
  });

  // ── Corpus de fuentes (grounding) ──
  app.get("/engine/sources", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ sources: listSources() });
  });

  app.post("/engine/sources/url", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { url?: string; kind?: string };
      const url = String(body.url ?? "").trim();
      if (!url) { res.status(400).json({ ok: false, error: "Falta 'url'." }); return; }
      const r = await ingestUrl(url, body.kind as never);
      noStore(res);
      res.status(r.ok ? 201 : 422).json(r);
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.post("/engine/sources/csv", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { csv?: string; url?: string };
      const sheetUrl = String(body.url ?? "").trim();
      const csv = String(body.csv ?? "");
      const r = sheetUrl ? await ingestSheetUrl(sheetUrl) : ingestCsvText(csv);
      noStore(res);
      res.status(r.ok ? 201 : 422).json(r);
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  app.delete("/engine/sources/:id", (req: Request, res: Response) => {
    noStore(res);
    res.json({ ok: removeSource(String(req.params.id ?? "")) });
  });

  // Autoría anclada: gpt-4o redacta una skill desde el corpus, con citas. Texto.
  app.post("/engine/author", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillId?: string; force?: boolean };
      const skillId = String(body.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      noStore(res);
      res.json(await authorSkill(skillId, Boolean(body.force)));
    } catch (err) {
      res.status(500).json({ error: "author_failed", detail: String(err) });
    }
  });

  // Grounding gate: verifica cada afirmación del draft contra su fuente (gate).
  app.post("/engine/verify-grounding", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillId?: string };
      const skillId = String(body.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      const authored = await authorSkill(skillId); // cacheado tras corrida 11
      noStore(res);
      res.json(await verifyGrounding(authored));
    } catch (err) {
      res.status(500).json({ error: "verify_failed", detail: String(err) });
    }
  });

  // ── Pipeline de grounding · 4 agentes (Buscador → Autor → Verificador → Supervisor) ──
  // Buscador: descubre + valida (fetch real) + confirma relevancia → ingiere fuentes de la skill.
  app.post("/engine/search-sources", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillId?: string; allowMsLearnSearch?: boolean };
      const skillId = String(body.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      noStore(res);
      const r = await searchSkillSources(skillId, { allowMsLearnSearch: Boolean(body.allowMsLearnSearch) });
      res.status(r.outcome === "real" ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ error: "search_failed", detail: String(err) });
    }
  });

  // Supervisor de relevancia: ¿las fuentes cubren el skill y el contenido es pertinente? (distinto de fidelidad)
  app.post("/engine/relevance", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillId?: string };
      const skillId = String(body.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      const authored = await authorSkill(skillId);   // cacheado
      const r = await superviseRelevance(skillId, authored);
      saveRelevance(skillId, r);
      noStore(res);
      res.status(r.outcome === "real" ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ error: "relevance_failed", detail: String(err) });
    }
  });

  // Evidencia de fuentes: capturas oficiales de las 9 rutas en MS Learn (prueba de alcance).
  app.get("/engine/evidence", (_req: Request, res: Response) => {
    noStore(res);
    res.json(listEvidence());
  });
  app.post("/engine/evidence/capture", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      const r = await captureEvidence();
      res.status(r.available ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ available: false, error: "evidence_failed", detail: String(err) });
    }
  });

  // Orquestador por DOMINIO: corre los 4 agentes por cada skill (contexto acotado) y puebla Contenido.
  app.post("/engine/ground-domain", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { domainId?: string; persist?: boolean; skillIds?: string[]; allowMsLearnSearch?: boolean };
      const domainId = String(body.domainId ?? "");
      if (!domainId) { res.status(400).json({ error: "Falta 'domainId'." }); return; }
      const skillIds = Array.isArray(body.skillIds) ? body.skillIds.map(String).filter(Boolean).slice(0, 20) : undefined;
      // Candado: si la ruta está bloqueada, solo se permite re-correr unidades puntuales
      // (con skillIds) — NO re-groundear toda la ruta.
      if (isRouteLocked(domainId) && (!skillIds || skillIds.length === 0)) {
        res.status(423).json({ error: "ruta_bloqueada", detail: "Ruta bloqueada: re-corré unidades puntuales (skillIds) o desbloqueá la ruta. No se re-groundea la ruta completa." });
        return;
      }
      noStore(res);
      const r = await groundDomain(domainId, { persist: body.persist !== false, skillIds, allowMsLearnSearch: Boolean(body.allowMsLearnSearch) });
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: "ground_domain_failed", detail: String(err) });
    }
  });

  // Orquestador DOCUMENTAL por MÓDULO (Master Book): psicometría → autor de relato → verify híbrido → supervisor → capítulo.
  app.post("/engine/ground-module", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { moduleId?: string; persist?: boolean; force?: boolean };
      const moduleId = String(body.moduleId ?? "");
      if (!moduleId) { res.status(400).json({ error: "Falta 'moduleId'." }); return; }
      noStore(res);
      const r = await groundModule(moduleId, { persist: body.persist !== false, force: body.force === true });
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: "ground_module_failed", detail: String(err) });
    }
  });

  // Capítulos persistidos del Master Book (formato activo).
  app.get("/engine/chapters", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ chapters: listPersistedChapters() });
  });
  // QA de PROSA por capítulo (Master): verify por claim + grounding + relevancia + psico, sin re-LLM.
  app.get("/engine/chapters-qa", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ chapters: chaptersQa() });
  });
  app.get("/engine/chapter-qa/:chapterId", (req: Request, res: Response) => {
    const q = chapterQa(String(req.params.chapterId));
    if (!q) { res.status(404).json({ error: "capitulo_no_encontrado" }); return; }
    noStore(res);
    res.json(q);
  });
  // COLA DE REVISIÓN HUMANA de claims contestados (bloqueados / 'wrong' sin 2º voto). Read-only + resolver.
  app.get("/engine/claim-reviews", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ reviews: listClaimReviews() });
  });
  app.post("/engine/claim-review/resolve", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { id?: string; status?: string; resolvedBy?: string };
      const id = String(body.id ?? "");
      const status = String(body.status ?? "") as ClaimReviewStatus;
      if (!id || !["pending", "accepted", "rejected"].includes(status)) { res.status(400).json({ error: "id_o_status_invalido" }); return; }
      const item = await resolveClaimReview(id, status, body.resolvedBy);
      if (!item) { res.status(404).json({ error: "revision_no_encontrada" }); return; }
      res.json(item);
    } catch (err) {
      res.status(500).json({ error: "resolve_claim_review_failed", detail: String(err) });
    }
  });
  // Módulos del temario (unidad de autoría del Master Book) + si ya tienen capítulo persistido.
  app.get("/engine/modules", (_req: Request, res: Response) => {
    noStore(res);
    // Solo capítulos NORMALES: el integrador (capstone) no es un módulo del temario y no lleva número → excluirlo
    // del lookup módulo→capítulo evita que su chapterNumber (congelado, colisionante) secuestre la clave de un módulo real.
    const byNum = new Map(listPersistedChapters().filter(c => !c.seed.moduleId.startsWith("capstone-")).map(c => [c.seed.chapterNumber, c.seed.chapterId]));
    const modules = allModules().map(m => {
      const chapterNumber = chapterNumberForModule(m.moduleId);
      const chapterId = chapterNumber ? (byNum.get(chapterNumber) ?? null) : null;
      return { moduleId: m.moduleId, moduleTitle: m.moduleTitle, domainId: m.domainId, domainLabel: m.domainLabel, skills: m.skillIds.length, chapterNumber, chapterId, hasChapter: !!chapterId };
    });
    res.json({ modules });
  });
  // Outline (temario) por cert: leer y SETEAR (onboarding data-driven, persistido `_outline.{cert}.json`). Barrido cross-cert.
  app.get("/engine/outline", (req: Request, res: Response) => {
    noStore(res);
    res.json({ outline: getOutline(String((req.query.certId as string) ?? CONFIG.certId)) });
  });
  app.post("/engine/outline", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; outline?: { domains?: unknown } };
      const certId = String(body.certId ?? CONFIG.certId);
      if (!body.outline || !Array.isArray(body.outline.domains)) { res.status(400).json({ error: "outline invalido: falta 'domains'" }); return; }
      noStore(res);
      res.json({ ok: true, outline: setOutline(certId, body.outline as Parameters<typeof setOutline>[1]) });
    } catch (err) {
      res.status(500).json({ error: "set_outline_failed", detail: String(err) });
    }
  });
  // Buffer 2 — enlaces complementarios curados por unidad (`_extra-sources.{cert}.json`). 3-buffers de grounding.
  app.get("/engine/extra-sources", (req: Request, res: Response) => {
    noStore(res);
    const certId = String((req.query.certId as string) ?? CONFIG.certId);
    res.json({ extraSources: runWithBook({ certId, format: CONFIG.format }, () => allExtraSources()) });
  });
  app.post("/engine/extra-sources", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; map?: Record<string, string[]> };
      if (!body.map || typeof body.map !== "object") { res.status(400).json({ error: "falta 'map' {skillId:[urls]}" }); return; }
      const certId = String(body.certId ?? CONFIG.certId);
      noStore(res);
      res.json({ ok: true, extraSources: runWithBook({ certId, format: CONFIG.format }, () => setExtraSources(body.map!)) });
    } catch (err) { res.status(500).json({ error: "set_extra_sources_failed", detail: String(err) }); }
  });
  // Buffer 3 — señal de examen por módulo (arquetipos/trampas/hot-topics, `_exam-signal.{cert}.json`). 3-buffers.
  app.get("/engine/exam-signal", (req: Request, res: Response) => {
    noStore(res);
    const certId = String((req.query.certId as string) ?? CONFIG.certId);
    res.json({ examSignal: runWithBook({ certId, format: CONFIG.format }, () => allExamSignal()) });
  });
  app.post("/engine/exam-signal", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { certId?: string; map?: Record<string, unknown> };
      if (!body.map || typeof body.map !== "object") { res.status(400).json({ error: "falta 'map' {moduleId:signal}" }); return; }
      const certId = String(body.certId ?? CONFIG.certId);
      noStore(res);
      res.json({ ok: true, examSignal: runWithBook({ certId, format: CONFIG.format }, () => setExamSignal(body.map as Parameters<typeof setExamSignal>[0])) });
    } catch (err) { res.status(500).json({ error: "set_exam_signal_failed", detail: String(err) }); }
  });
  app.get("/engine/chapter/:chapterId", (req: Request, res: Response) => {
    const ch = getPersistedChapter(String(req.params.chapterId));
    if (!ch) { res.status(404).json({ error: "capitulo_no_encontrado" }); return; }
    noStore(res);
    res.json(ch);
  });
  // Editar (patch) campos whitelisted del capítulo: título/subtítulo/intro, secciones (heading/prose),
  // spec de gráficos y puntos clave. NO toca skillIds/psychometrics/claims/checks. Edición de prosa → updatedAt.
  app.post("/engine/chapter/:chapterId", (req: Request, res: Response) => {
    const chapterId = String(req.params.chapterId);
    const ch = getPersistedChapter(chapterId);
    if (!ch) { res.status(404).json({ error: "capitulo_no_encontrado" }); return; }
    const body = (req.body ?? {}) as { title?: string; subtitle?: string; intro?: string; keyTakeaways?: string[]; sections?: { id: string; heading?: string; prose?: string }[]; graphics?: { id: string; spec?: string }[] };
    const seed = { ...ch.seed };
    if (typeof body.title === "string") seed.title = body.title;
    if (typeof body.subtitle === "string") seed.subtitle = body.subtitle;
    if (typeof body.intro === "string") seed.intro = body.intro;
    if (Array.isArray(body.keyTakeaways)) seed.keyTakeaways = body.keyTakeaways.map(String);
    if (Array.isArray(body.sections)) {
      const patch = new Map(body.sections.map(s => [s.id, s]));
      seed.sections = seed.sections.map(sec => {
        const p = patch.get(sec.id); if (!p) return sec;
        return { ...sec, heading: typeof p.heading === "string" ? p.heading : sec.heading, prose: typeof p.prose === "string" ? p.prose : sec.prose };
      });
    }
    if (Array.isArray(body.graphics)) {
      const patch = new Map(body.graphics.map(g => [g.id, g]));
      seed.graphics = seed.graphics.map(g => { const p = patch.get(g.id); return p && typeof p.spec === "string" ? { ...g, spec: p.spec } : g; });
    }
    upsertPersistedChapter({ ...ch, seed, provenance: { ...ch.provenance, updatedAt: new Date().toISOString() } });
    noStore(res);
    res.json(getPersistedChapter(chapterId));
  });

  // Generar los gráficos complementarios (parcos) de un capítulo del Master Book.
  app.post("/engine/chapter-graphics/generate", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { chapterId?: string; force?: boolean };
      const chapterId = String(body.chapterId ?? "");
      if (!chapterId) { res.status(400).json({ error: "Falta 'chapterId'." }); return; }
      noStore(res);
      res.json({ results: await generateChapterGraphics(chapterId, body.force === true) });
    } catch (err) {
      res.status(500).json({ error: "chapter_graphics_failed", detail: String(err) });
    }
  });

  // Generar el DIVISOR de imagen (página de apertura, estilo Atlas) de un capítulo.
  app.post("/engine/chapter-divider/generate", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { chapterId?: string; force?: boolean };
      const chapterId = String(body.chapterId ?? "");
      if (!chapterId) { res.status(400).json({ error: "Falta 'chapterId'." }); return; }
      noStore(res);
      res.json(await generateChapterDivider(chapterId, body.force === true));
    } catch (err) {
      res.status(500).json({ error: "chapter_divider_failed", detail: String(err) });
    }
  });

  // Maquetar un capítulo del Master Book a PDF (divisor + relato + gráficos inline + folios).
  app.post("/engine/render-chapter", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { chapterId?: string };
      const chapterId = String(body.chapterId ?? "");
      if (!chapterId) { res.status(400).json({ error: "Falta 'chapterId'." }); return; }
      noStore(res);
      res.json(await renderChapterPdf(chapterId));
    } catch (err) {
      res.status(500).json({ error: "render_chapter_failed", detail: String(err) });
    }
  });

  // Generar los ABRE-PARTES (Portal oscuro) de las rutas que tienen capítulos.
  app.post("/engine/part-openers/generate", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { domainId?: string; force?: boolean };
      noStore(res);
      if (body.domainId) res.json({ results: [await generatePartOpener(String(body.domainId), body.force === true)] });
      else res.json(await runPartOpenerBatch(body.force === true));
    } catch (err) {
      res.status(500).json({ error: "part_openers_failed", detail: String(err) });
    }
  });

  // Agente de paleta: propone la familia de paletas (para aprobar en la sección cross).
  app.get("/engine/palette-family", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ palettes: proposeFamilyPalettes() });
  });
  // Aplica una paleta al LIBRO ACTIVO (default: la canónica de su formato) → fluye aguas abajo.
  app.post("/engine/book-palette/apply", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { style?: BookStyle };
      noStore(res);
      const style = body.style ?? paletteFor(CONFIG.format);
      res.json({ ok: true, style: await applyActiveBookPalette(style) });
    } catch (err) {
      res.status(500).json({ error: "book_palette_apply_failed", detail: String(err) });
    }
  });

  // Generar el GLOSARIO del Master Book (términos del relato de los capítulos).
  app.post("/engine/master-book/glossary", async (_req: Request, res: Response) => {
    try { noStore(res); res.json(await generateMasterGlossary()); }
    catch (err) { res.status(500).json({ error: "master_glossary_failed", detail: String(err) }); }
  });

  // Ensamblar el Master Book completo (portada + copyright + índice + partes + capítulos + glosario + referencias, con folios).
  app.post("/engine/assemble-master-book", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { chapterIds?: string[] };
      const chapterIds = Array.isArray(body.chapterIds) ? body.chapterIds.map(String).filter(Boolean) : undefined;
      noStore(res);
      const dl = getDesignLock();
      if (!dl.locked && dl.pieces.length > 0) { res.json({ ok: false, error: "Diseños sin bloquear: aprobaste piezas en Auto Pages pero no bloqueaste el diseño. Bloqueá para ensamblar." }); return; }
      res.json(await assembleMasterBook(chapterIds));
    } catch (err) {
      res.status(500).json({ error: "assemble_master_book_failed", detail: String(err) });
    }
  });

  // Render por RUTA: ensambla una ruta completa (hoja de ruta + capítulos + capstone) como cuadernillo.
  app.post("/engine/render-route", async (req: Request, res: Response) => {
    try {
      const domainId = String((req.body as { domainId?: string })?.domainId ?? "").trim();
      if (!domainId) { res.status(400).json({ error: "domainId requerido" }); return; }
      noStore(res);
      res.json(await assembleRoutePdf(domainId));
    } catch (err) {
      res.status(500).json({ error: "render_route_failed", detail: String(err) });
    }
  });

  // Capstone de RUTA: teje los módulos de la ruta en un proyecto integrador end-to-end (se persiste como capítulo).
  app.post("/engine/route-capstone", async (req: Request, res: Response) => {
    try {
      const domainId = String((req.body as { domainId?: string })?.domainId ?? "").trim();
      const force = Boolean((req.body as { force?: boolean })?.force);
      if (!domainId) { res.status(400).json({ error: "domainId requerido" }); return; }
      noStore(res);
      res.json(await generateRouteCapstone(domainId, force));
    } catch (err) {
      res.status(500).json({ error: "route_capstone_failed", detail: String(err) });
    }
  });

  // ── PANEL DE QA POR RUTA (observabilidad + regenerar) ──
  // Historial de veredictos de UNA ruta (más reciente primero; para la pestaña "Por ruta").
  app.get("/engine/route-panel/:domainId", (req: Request, res: Response) => {
    noStore(res);
    res.json({ domainId: req.params.domainId, runs: getRoutePanelHistory(String(req.params.domainId)) });
  });
  // Historial de TODAS las rutas de una (para pintar el panel completo).
  app.get("/engine/route-panels", (_req: Request, res: Response) => {
    noStore(res);
    res.json({ panels: getAllRoutePanels() });
  });
  // Corre el panel de 7 expertos sobre una ruta YA generada (ensambla + rasteriza + evalúa) y lo persiste.
  app.post("/engine/run-route-panel", async (req: Request, res: Response) => {
    try {
      const domainId = String((req.body as { domainId?: string })?.domainId ?? "").trim();
      if (!domainId) { res.status(400).json({ error: "domainId requerido" }); return; }
      noStore(res);
      const r = await runRoutePanel(domainId);
      if (!r.ok || !r.run) { res.json({ ok: false, domainId, error: r.error ?? "panel_falló" }); return; }
      const saved = await appendPanelRun(domainId, r.run);
      res.json({ ok: true, domainId, run: saved });
    } catch (err) {
      res.status(500).json({ error: "run_route_panel_failed", detail: String(err) });
    }
  });
  // REGENERAR una ruta entera bajo los prompts endurecidos (re-groundea módulos + capstone) y re-evalúa con el panel.
  app.post("/engine/regenerate-route", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { domainId?: string; force?: boolean; runPanel?: boolean };
      const domainId = String(body.domainId ?? "").trim();
      const force = body.force !== false;   // por defecto FUERZA (regenerar de verdad, no reusar caché)
      if (!domainId) { res.status(400).json({ error: "domainId requerido" }); return; }
      const mods = modulesForDomain(domainId);
      if (!mods.length) { res.status(404).json({ error: `ruta_desconocida:${domainId}` }); return; }
      noStore(res);
      const modules: Array<{ moduleId: string; persisted: boolean; chapterId: string | null; step: string; error: string | null }> = [];
      for (const m of mods) {
        try {
          const gr = await groundModule(m.moduleId, { persist: true, force });
          modules.push({ moduleId: m.moduleId, persisted: gr.persisted, chapterId: gr.chapterId, step: gr.step, error: gr.error });
          // Fase 0.C: generar figuras del capítulo (audita specs-trampa + genera) TRAS enriquecer. Best-effort.
          if (gr.chapterId && gr.persisted) { try { await generateChapterGraphics(gr.chapterId, force); } catch { /* figuras no-fatal */ } }
        } catch (e) {
          modules.push({ moduleId: m.moduleId, persisted: false, chapterId: null, step: "error", error: String(e) });
        }
      }
      const capstone = await generateRouteCapstone(domainId, true);
      const assemble = await assembleRoutePdf(domainId);
      let panel = null;
      let panelError: string | null = null;
      if (body.runPanel !== false) {
        const r = await runRoutePanel(domainId);
        if (r.ok && r.run) panel = await appendPanelRun(domainId, r.run);
        else panelError = r.error ?? "panel_falló";
      }
      res.json({ ok: true, domainId, modules, capstone, assemble, panel, panelError });
    } catch (err) {
      res.status(500).json({ error: "regenerate_route_failed", detail: String(err) });
    }
  });

  // Gate de correctitud temática: ¿el contenido de cada lámina trata el tema de su unidad?
  app.post("/engine/topic-audit", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      const r = await auditTopics();
      res.status(r.ok ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ error: "topic_audit_failed", detail: String(err) });
    }
  });

  // Candado por ruta (evita re-groundear toda la ruta por error).
  app.get("/engine/route-locks", (_req: Request, res: Response) => {
    noStore(res);
    res.json(listRouteLocks());
  });
  app.post("/engine/route-lock", (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { domainId?: string; locked?: boolean };
    const domainId = String(body.domainId ?? "");
    if (!domainId) { res.status(400).json({ error: "Falta 'domainId'." }); return; }
    setRouteLock(domainId, body.locked !== false);
    noStore(res);
    res.json({ ok: true, domainId, locked: body.locked !== false });
  });

  // Árbol unificado Ruta→Módulo→Unidad (fuentes + cobertura + grounding + relevancia).
  app.get("/engine/grounding-tree", (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(buildGroundingTree());
    } catch (err) {
      res.status(500).json({ error: "grounding_tree_failed", detail: String(err) });
    }
  });

  // Procedencia de UNA página: claims + citas + fuentes resueltas + relevancia.
  // Alimenta la cinta de grounding de la sección Contenido (sin un 2º fetch).
  app.get("/engine/provenance/:pageId", (req: Request, res: Response) => {
    try {
      const pageId = String(req.params.pageId ?? "");
      const page = getPersistedPage(pageId);
      if (!page) {
        // Página sin procedencia: respuesta vacía honesta, no 404.
        noStore(res);
        res.json({ pageId, grounded: false, groundingStatus: null, skillIds: [], claims: [], checks: [], sources: [], relevance: null });
        return;
      }
      const prov = page.provenance;
      // Fuentes citadas: por sourceId del corpus + URLs sueltas (citas web sin sourceId).
      const ids = new Set<string>(prov.sourceIds ?? []);
      for (const c of prov.claims) if (c.citation.kind === "source" && c.citation.sourceId) ids.add(c.citation.sourceId);
      const sources = [...ids].map((id) => {
        const s = getSource(id);
        return s ? { id: s.id, title: s.title, url: s.url, kind: s.kind } : { id, title: id, url: null, kind: "doc" as const };
      });
      const webCites = prov.claims
        .filter((c) => c.citation.kind === "web" && !c.citation.sourceId && c.citation.url)
        .map((c) => ({ id: c.citation.url!, title: c.citation.url!, url: c.citation.url, kind: "web" as const }));
      const rel = getRelevanceForPage(prov.skillIds);
      noStore(res);
      res.json({
        pageId,
        grounded: true,
        groundingStatus: prov.groundingStatus,
        skillIds: prov.skillIds,
        claims: prov.claims,
        checks: prov.checks ?? [],
        sources: [...sources, ...webCites],
        relevance: rel ? { status: rel.status, score: rel.score, gaps: rel.gaps } : null,
      });
    } catch (err) {
      res.status(500).json({ error: "provenance_failed", detail: String(err) });
    }
  });

  // Ingerir las fuentes curadas de una skill (unidad) al corpus — SIN LLM, para evaluar el scraping.
  app.post("/engine/ingest-skill", async (req: Request, res: Response) => {
    try {
      const skillId = String((req.body as { skillId?: string })?.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      noStore(res);
      res.json(await ensureSkillSources(skillId));
    } catch (err) {
      res.status(500).json({ error: "ingest_skill_failed", detail: String(err) });
    }
  });

  // Ingerir las fuentes de TODAS las unidades de una ruta (loop, sin LLM).
  app.post("/engine/ingest-domain", async (req: Request, res: Response) => {
    try {
      const domainId = String((req.body as { domainId?: string })?.domainId ?? "");
      const domain = getOutline().domains.find((d) => d.id === domainId);
      if (!domain) { res.status(400).json({ error: "Dominio desconocido." }); return; }
      if (isRouteLocked(domainId)) { res.status(423).json({ error: "ruta_bloqueada", detail: "Ruta bloqueada: no se re-ingiere la ruta completa. Ingerí fuentes por unidad o desbloqueá." }); return; }
      const results = [];
      for (const s of domain.skills) results.push(await ensureSkillSources(s.id));
      const ingested = results.reduce((n, r) => n + r.ingested.length, 0);
      noStore(res);
      res.json({ domainId, units: results.length, ingested, results });
    } catch (err) {
      res.status(500).json({ error: "ingest_domain_failed", detail: String(err) });
    }
  });

  // Remediación de relevancia (1 click): re-busca + re-redacta con gaps + re-supervisa.
  app.post("/engine/improve-relevance", async (req: Request, res: Response) => {
    try {
      const skillId = String((req.body as { skillId?: string })?.skillId ?? "");
      if (!skillId) { res.status(400).json({ error: "Falta 'skillId'." }); return; }
      noStore(res);
      const r = await improveRelevance(skillId);
      res.status(r.outcome === "real" ? 200 : 422).json(r);
    } catch (err) {
      res.status(500).json({ error: "improve_relevance_failed", detail: String(err) });
    }
  });

  // Editor-jefe (#6): revisa consistencia editorial entre páginas del libro.
  app.post("/engine/book-review", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageIds?: string[] };
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String).filter(Boolean).slice(0, 30) : [];
      const review = await reviewBookConsistency(pageIds);
      saveBookReview(review);   // el veredicto premium lee estos issues → gatea production_ready
      noStore(res);
      res.json(review);
    } catch (err) {
      res.status(500).json({ error: "book_review_failed", detail: String(err) });
    }
  });

  // Marcar resueltos los issues de libro de una página (tras corregir/aprobar).
  app.post("/engine/book-review/clear", (req: Request, res: Response) => {
    const pageId = String((req.body as { pageId?: string })?.pageId ?? "");
    if (pageId) clearBookIssues(pageId);
    noStore(res);
    res.json({ ok: !!pageId });
  });

  // Lote (camino al libro): por cada skill → redactar+anclar+verificar → generar
  // (imagen de dominio reusada) → editorial → veredicto. Reporta verified/art/blocked.
  app.post("/engine/batch", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillIds?: string[]; recipeId?: string; approveArt?: boolean };
      const skillIds = Array.isArray(body.skillIds) ? body.skillIds.map(String).filter(Boolean).slice(0, 20) : [];
      if (skillIds.length === 0) { res.status(400).json({ error: "Falta 'skillIds' (array)." }); return; }
      const r = await runBatch(skillIds, String(body.recipeId ?? "standard"), { approveArt: Boolean(body.approveArt) });
      noStore(res);
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: "batch_failed", detail: String(err) });
    }
  });

  // Persistir borrador anclado → PÁGINA real (cierra grounding↔generación).
  // Verifica el grounding gate; si bloquea, NO crea la página (rigor en origen).
  app.post("/engine/persist-authored", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { skillId?: string; pageId?: string };
      const skillId = String(body.skillId ?? "");
      if (!skillId) { res.status(400).json({ ok: false, error: "Falta 'skillId'." }); return; }
      const r = await persistAuthored(skillId, body.pageId ? String(body.pageId) : undefined);
      noStore(res);
      res.status(r.ok ? 201 : 422).json(r);
    } catch (err) {
      res.status(500).json({ ok: false, error: "persist_failed", detail: String(err) });
    }
  });

  // Borrar una página (todas son creadas por la IA; ya no hay seeds reservadas).
  app.delete("/engine/page/:pageId", (req: Request, res: Response) => {
    const pageId = String(req.params.pageId ?? "");
    const ok = deletePersistedPage(pageId);
    noStore(res);
    res.status(ok ? 200 : 404).json({ ok, pageId });
  });

  // Limpia marcadores de cita ("[0dd288d3f404]") que el autor pudo pegar en el TEXTO
  // de páginas ya persistidas. No re-groundea: solo sanea el seed. Idempotente.
  app.post("/engine/sanitize-pages", (_req: Request, res: Response) => {
    try {
      const clean = stripCitationMarkers;
      const total = totalUnits();
      let changed = 0;
      for (const p of listPersistedPages()) {
        const s = p.seed;
        const before = JSON.stringify(s);
        s.totalPages = total;   // corrige el conteo viejo (70) al total real del temario
        s.title = clean(s.title); s.subtitle = clean(s.subtitle); s.context = clean(s.context);
        s.guideQuestion = clean(s.guideQuestion); s.upperVisualAlt = clean(s.upperVisualAlt);
        s.traps = s.traps.map((t) => ({ wrong: clean(t.wrong), correction: clean(t.correction) }));
        s.autocheck = {
          ...s.autocheck,
          question: clean(s.autocheck.question),
          options: s.autocheck.options.map(clean),
          explanation: clean(s.autocheck.explanation),
          discardNotes: s.autocheck.discardNotes.map(clean),
        };
        s.visualModules = s.visualModules.map((m) => ({ ...m, title: clean(m.title), description: clean(m.description) }));
        if (JSON.stringify(s) !== before) { upsertPersistedPage(p); changed++; }
      }
      noStore(res);
      res.json({ ok: true, changed, total: listPersistedPages().length });
    } catch (err) {
      res.status(500).json({ error: "sanitize_failed", detail: String(err) });
    }
  });

  // Renumerar todas las páginas a su unidad del temario (01 = primera unidad).
  app.post("/engine/renumber-pages", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await renumberPagesToCurriculum());
    } catch (err) {
      res.status(500).json({ error: "renumber_failed", detail: String(err) });
    }
  });

  app.post("/engine/generate", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; recipeId?: string; force?: boolean };
      const pageId = String(body.pageId ?? "");
      const recipeId = String(body.recipeId ?? "standard");
      if (!getSeed(pageId)) {
        res.status(404).json({ error: "seed_missing", pageId });
        return;
      }
      const result = await generatePage(pageId, recipeId, Boolean(body.force));
      noStore(res);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: "generate_failed", detail: String(err) });
    }
  });

  // Motor de INFOGRAFÍA (image-2 dibuja el cuerpo, HTML el header/footer).
  app.post("/engine/generate-infographic", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; force?: boolean };
      const pageId = String(body.pageId ?? "");
      if (!getSeed(pageId)) { res.status(404).json({ error: "seed_missing", pageId }); return; }
      const result = await generateInfographicPage(pageId, Boolean(body.force));
      noStore(res);
      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: "infographic_failed", detail: String(err) });
    }
  });

  // Manifiesto/QA de una página de infografía (para el QA stage del cockpit).
  app.get("/engine/infographic/:pageId", (req: Request, res: Response) => {
    noStore(res);
    const m = getInfographicManifest(String(req.params.pageId ?? ""));
    if (!m) { res.status(404).json({ error: "no_infographic" }); return; }
    res.json(m);
  });

  // Stats agregadas de infografía (para el dashboard).
  app.get("/engine/infographic-stats", (_req: Request, res: Response) => {
    noStore(res);
    res.json(getInfographicStats());
  });

  // Auditoría de cobertura: módulos generados vs ejes reales de la fuente (Corrida 36).
  app.get("/engine/audit-coverage", (_req: Request, res: Response) => {
    noStore(res);
    res.json(auditCoverage());
  });

  // Backfill de thumbnails (thumb.webp) para las páginas ya generadas (galería).
  app.post("/engine/backfill-thumbs", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await backfillThumbs());
    } catch (err) {
      res.status(500).json({ error: "backfill_thumbs_failed", detail: String(err) });
    }
  });

  // Contrato visual EN CASCADA (colección → libro/formato → módulo) resuelto para
  // una página (o default d1). Devuelve cada campo con su nivel de procedencia.
  const contractHandler = (req: Request, res: Response): void => {
    const pageId = String(req.params.pageId ?? "");
    const seed = pageId ? getSeed(pageId) : null;
    const domainId = seed ? domainIdForSeed(seed) : "d1";
    const r = resolveContract(CONFIG.certId, CONFIG.format, domainId);
    noStore(res);
    res.json({ version: CONFIG.infographicPromptVersion, certId: r.certId, format: r.format, domainId: r.domainId, domainLabel: seed?.domainLabel ?? "", fields: r.fields, preamble: r.preamble });
  };
  app.get("/engine/infographic-contract", contractHandler);
  app.get("/engine/infographic-contract/:pageId", contractHandler);

  // Lote (sección Runs): corre el motor de infografía sobre varias páginas.
  app.post("/engine/infographic-batch", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageIds?: string[]; force?: boolean };
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String).filter(Boolean).slice(0, 80) : [];
      if (!pageIds.length) { res.status(400).json({ error: "sin_pageIds" }); return; }
      noStore(res);
      res.json(await runInfographicBatch(pageIds, Boolean(body.force)));
    } catch (err) {
      res.status(500).json({ error: "batch_failed", detail: String(err) });
    }
  });

  // Exportar granular: formato (pdf/png/html) × alcance (lista de páginas).
  app.post("/engine/export", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageIds?: string[]; format?: string };
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String).filter(Boolean).slice(0, 200) : [];
      const fmt = (["pdf", "png", "html"].includes(String(body.format)) ? body.format : "pdf") as ExportFormat;
      noStore(res);
      res.json(await exportBook(pageIds, fmt));
    } catch (err) {
      res.status(500).json({ error: "export_failed", detail: String(err) });
    }
  });

  // Ensamblar libro (sección aparte): PDF completo (acoplado al bloque aprobado).
  app.post("/engine/export-pdf", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageIds?: string[] };
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String).filter(Boolean).slice(0, 200) : [];
      noStore(res);
      res.json(await exportBookPdf(pageIds));
    } catch (err) {
      res.status(500).json({ error: "export_failed", detail: String(err) });
    }
  });

  // ── Aprobaciones (granularidad página + libro) ──
  app.get("/engine/approvals", (_req: Request, res: Response) => {
    noStore(res);
    res.json(getApprovals());
  });
  app.post("/engine/approve", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; approved?: boolean };
      if (!body.pageId) { res.status(400).json({ error: "sin_pageId" }); return; }
      noStore(res);
      res.json(await setPageApproved(String(body.pageId), Boolean(body.approved)));
    } catch (err) { res.status(500).json({ error: "approve_failed", detail: String(err) }); }
  });
  app.post("/engine/approve-pages", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageIds?: string[]; approved?: boolean };
      const pageIds = Array.isArray(body.pageIds) ? body.pageIds.map(String).filter(Boolean).slice(0, 200) : [];
      noStore(res);
      res.json(await setPagesApproved(pageIds, Boolean(body.approved)));
    } catch (err) { res.status(500).json({ error: "approve_failed", detail: String(err) }); }
  });
  app.post("/engine/approve-book", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { approved?: boolean };
      noStore(res);
      res.json(await setBookApproved(Boolean(body.approved)));
    } catch (err) { res.status(500).json({ error: "approve_failed", detail: String(err) }); }
  });

  // ── Ensamblar libro (front/back matter + bloque aprobado → PDF) ──
  app.get("/engine/book-outline", (_req: Request, res: Response) => {
    noStore(res);
    res.json(bookOutline());
  });
  app.post("/engine/assemble-book", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      const dl = getDesignLock();
      if (!dl.locked && dl.pieces.length > 0) { res.json({ ok: false, error: "Diseños sin bloquear: aprobaste piezas en Auto Pages pero no bloqueaste el diseño. Bloqueá para ensamblar." }); return; }
      res.json(await assembleBook());
    } catch (err) { res.status(500).json({ error: "assemble_failed", detail: String(err) }); }
  });

  // ── Composición del libro (BookConfig: bloques editables, colección, mapeo, estilo) ──
  // PUBLICACION DE ASSETS: materializa en `publishRoot` SOLO lo que la tienda sirve (portada,
  // contratapa, muestras y el config de cada libro PUBLICADO), espejando rutas para no cambiar URLs.
  // `dryRun` devuelve el manifiesto sin copiar. Ver docs/ARCHITECTURE.md (Fase 2').
  app.post("/engine/publish-assets", (req: Request, res: Response) => {
    try {
      const dryRun = Boolean((req.body as { dryRun?: boolean } | undefined)?.dryRun);
      noStore(res);
      res.json(publishAssets(dryRun));
    } catch (err) { res.status(500).json({ ok: false, error: "publish_failed", detail: String(err) }); }
  });

  app.get("/engine/book-config", (_req: Request, res: Response) => { noStore(res); res.json(getBookConfig()); });
  app.post("/engine/book-config", async (req: Request, res: Response) => {
    try { noStore(res); res.json(await saveBookConfig((req.body ?? {}) as Partial<BookConfig>)); }
    catch (err) { res.status(500).json({ error: "config_failed", detail: String(err) }); }
  });
  // Restaura UN bloque editable al texto por DEFECTO (neutro) — para volver atrás sin scripts.
  app.post("/engine/book-config/reset-block", async (req: Request, res: Response) => {
    try {
      const key = String((req.body as { key?: string })?.key ?? "");
      const cfg = getBookConfig();
      let patch: Partial<BookConfig>;
      if (key === "copyright" || key === "preface" || key === "intro" || key === "conclusions") {
        patch = { blocks: { ...cfg.blocks, [key]: DEFAULT_CONFIG.blocks[key] } };
      } else if (key === "collectionNote") {
        patch = { collection: { ...cfg.collection, note: DEFAULT_CONFIG.collection.note } };
      } else if (key === "backcover") {
        patch = { backCover: { ...cfg.backCover, html: DEFAULT_CONFIG.backCover.html } };   // "" → usa el fallback neutro del ensamblado
      } else { res.status(400).json({ error: "bad_key" }); return; }
      noStore(res);
      res.json(await saveBookConfig(patch));
    } catch (err) { res.status(500).json({ error: "reset_failed", detail: String(err) }); }
  });
  // Sube la tapa: guarda + autoextrae paleta (sugerencia) + setea cover/style en el config.
  app.post("/engine/book-cover", async (req: Request, res: Response) => {
    try {
      const dataUrl = String((req.body as { dataUrl?: string })?.dataUrl ?? "");
      const url = await saveBookAsset(dataUrl, "cover");
      if (!url) { res.status(400).json({ error: "bad_image" }); return; }
      const pal = await extractPalette(dataUrl);
      const patch: Partial<BookConfig> = { cover: { mode: "uploaded", imageUrl: url, palette: pal?.palette ?? [] } };
      if (pal) patch.style = pal.style;
      noStore(res);
      res.json({ ok: true, url, palette: pal?.palette ?? [], config: await saveBookConfig(patch) });
    } catch (err) { res.status(500).json({ error: "cover_failed", detail: String(err) }); }
  });
  // Genera la tapa con image-2 ANCLADA al ancla de marca. `count` (1..3) = N variantes (primera vez=3 para elegir).
  app.post("/engine/book-cover/generate", async (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { force?: boolean; count?: number };
      noStore(res);
      res.json(await generateBookCover(Boolean(b.force ?? true), Number(b.count ?? 1)));
    } catch (err) { res.status(500).json({ error: "cover_generate_failed", detail: String(err) }); }
  });
  app.post("/engine/book-backcover/generate", async (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { force?: boolean; count?: number };
      noStore(res);
      res.json(await generateBookBackCover(Boolean(b.force ?? true), Number(b.count ?? 1)));
    } catch (err) { res.status(500).json({ error: "backcover_generate_failed", detail: String(err) }); }
  });
  // Restaurar/elegir una toma previa como la activa (portada/contra).
  app.post("/engine/book-cover/select", async (req: Request, res: Response) => {
    try { noStore(res); const take = String((req.body as { take?: string })?.take ?? ""); res.json(await selectCoverTake(take)); }
    catch (err) { res.status(500).json({ error: "cover_select_failed", detail: String(err) }); }
  });
  app.post("/engine/book-backcover/select", async (req: Request, res: Response) => {
    try { noStore(res); const take = String((req.body as { take?: string })?.take ?? ""); res.json(await selectBackCoverTake(take)); }
    catch (err) { res.status(500).json({ error: "backcover_select_failed", detail: String(err) }); }
  });
  // Assets de diseño del libro activo: portada/contra (activa + historial) + abre-partes y divisores PERSISTIDOS.
  app.get("/engine/design-assets", (_req: Request, res: Response) => {
    try {
      noStore(res);
      const domains = [...new Set(allModules().map(m => m.domainId))];
      const openers: Record<string, string | null> = {};
      for (const d of domains) openers[d] = partOpenerUrlIfExists(d);
      const dividers: Record<string, string | null> = {};
      for (const c of listPersistedChapters()) dividers[c.seed.chapterId] = chapterDividerUrlIfExists(c.seed.chapterId);
      res.json({ ...listDesignAssets(), openers, dividers });
    } catch (err) { res.status(500).json({ error: "design_assets_failed", detail: String(err) }); }
  });
  // Bloqueo de diseños del libro activo (aprobaciones persistidas + lock). El GATE del armado lo cablea Plan D.
  app.get("/engine/design-lock", (_req: Request, res: Response) => {
    try { noStore(res); res.json(getDesignLock()); }
    catch (err) { res.status(500).json({ error: "design_lock_failed", detail: String(err) }); }
  });
  app.post("/engine/design-lock", (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { pieces?: string[]; locked?: boolean };
      noStore(res);
      res.json(updateDesignLock({ pieces: Array.isArray(b.pieces) ? b.pieces : undefined, locked: typeof b.locked === "boolean" ? b.locked : undefined }));
    } catch (err) { res.status(500).json({ error: "design_lock_update_failed", detail: String(err) }); }
  });
  // Cronometraje de la corrida por libro (tiempo automático activo + reloj de pared con aprobaciones).
  app.get("/engine/corrida-timing", (_req: Request, res: Response) => {
    try { noStore(res); res.json(getCorridaTiming()); }
    catch (err) { res.status(500).json({ error: "corrida_timing_failed", detail: String(err) }); }
  });
  app.post("/engine/corrida-timing", (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { startIfUnset?: boolean; addMs?: number; finish?: boolean; reset?: boolean };
      noStore(res);
      res.json(updateCorridaTiming({ startIfUnset: b.startIfUnset, addMs: Number(b.addMs) || 0, finish: b.finish, reset: b.reset }));
    } catch (err) { res.status(500).json({ error: "corrida_timing_update_failed", detail: String(err) }); }
  });
  // Catálogo de tienda de una cert: precio real + estado publicado de sus 6 libros (hermanos/colección). Flip-safe.
  app.get("/engine/storefront/:certId", (req: Request, res: Response) => {
    try {
      noStore(res);
      res.json({ items: getStorefrontCatalog(String(req.params.certId ?? "").trim().toLowerCase()) });
    } catch (err) { res.status(500).json({ error: "storefront_catalog_failed", detail: String(err) }); }
  });
  // Escaparate público: ficha comercial de UN libro para la tienda (/libro/:id). Flip-safe (no cambia el libro activo).
  // Solo expone fichas 'publicado'; ?preview=1 (estudio) expone cualquier estado.
  app.get("/engine/storefront/:certId/:bookId", (req: Request, res: Response) => {
    try {
      noStore(res);
      const certId = String(req.params.certId ?? "").trim().toLowerCase();
      const bookId = String(req.params.bookId ?? "").trim().toLowerCase();
      const preview = String(req.query.preview ?? "") === "1";
      res.json(getStorefront(certId, bookId, preview));
    } catch (err) { res.status(500).json({ error: "storefront_failed", detail: String(err) }); }
  });
  // Páginas previsualizables del libro activo (selector "Echa un vistazo" de la ficha): portada/contra/rutas/capítulos/láminas ya generados (solo PNG).
  app.get("/engine/book-previews", (_req: Request, res: Response) => {
    try { noStore(res); res.json({ items: listBookPreviews() }); }
    catch (err) { res.status(500).json({ error: "book_previews_failed", detail: String(err) }); }
  });
  // Estado del PDF ensamblado del libro ACTIVO → para el preview global (embeber sin re-render). Flip-safe (path directo).
  app.get("/engine/assembled-status", (_req: Request, res: Response) => {
    try {
      noStore(res);
      const slug = CONFIG.certId.replace(/[^a-z0-9]/gi, "").toUpperCase();
      const rel = CONFIG.format === "master-book"
        ? path.join(CONFIG.certId, CONFIG.format, "_export", `${slug}_master_book.pdf`)
        : path.join("_export", `${slug}_libro.pdf`);
      const abs = path.join(CONFIG.outputRoot, rel);
      res.json({ url: existsSync(abs) ? `${CONFIG.publicAssetsBase}/${rel.replace(/\\/g, "/")}` : null });
    } catch (err) { res.status(500).json({ error: "assembled_status_failed", detail: String(err) }); }
  });
  // Ficha comercial: el agente "Redactor de ficha" genera sinopsis/acerca/categorías/tags/blurb (LLM) + índice/muestras (datos). Persiste en book-config.ficha.
  app.post("/engine/book-ficha/generate", async (req: Request, res: Response) => {
    try {
      const parts = (req.body as { parts?: string[] })?.parts;
      noStore(res);
      res.json(await generateFicha(Array.isArray(parts) ? parts : undefined));
    } catch (err) { res.status(500).json({ ok: false, error: "book_ficha_failed", detail: String(err) }); }
  });
  // Notas de mejora por pieza de diseño (F2): se appendean al prompt de image-2 en la regeneración.
  app.get("/engine/design-notes", (_req: Request, res: Response) => {
    try { noStore(res); res.json({ notes: getAllDesignNotes() }); }
    catch (err) { res.status(500).json({ error: "design_notes_failed", detail: String(err) }); }
  });
  app.post("/engine/design-note", (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { assetKey?: string; note?: string };
      const assetKey = String(b.assetKey ?? "").trim();
      if (!assetKey) { res.status(400).json({ ok: false, error: "Falta 'assetKey'." }); return; }
      noStore(res);
      res.json({ ok: true, notes: setDesignNote(assetKey, String(b.note ?? "")) });
    } catch (err) { res.status(500).json({ ok: false, error: "design_note_set_failed", detail: String(err) }); }
  });
  // Ancla de marca GLOBAL: leer / sembrar desde otra cert (identidad de la siguiente colección).
  app.get("/engine/design-anchor", (_req: Request, res: Response) => {
    try { noStore(res); res.json(getDesignAnchor()); }
    catch (err) { res.status(500).json({ error: "design_anchor_failed", detail: String(err) }); }
  });
  app.post("/engine/design-anchor/set", async (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { certId?: string; format?: string };
      const certId = String(b.certId ?? "").trim(), format = String(b.format ?? "").trim();
      if (!certId || !format) { res.status(400).json({ ok: false, error: "Falta 'certId' o 'format'." }); return; }
      noStore(res);
      res.json(await setDesignAnchorFromBook(certId, format));
    } catch (err) { res.status(500).json({ ok: false, error: "design_anchor_set_failed", detail: String(err) }); }
  });
  // Sube un asset genérico (portada de colección / template de contraportada) → devuelve su URL.
  app.post("/engine/book-asset", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { dataUrl?: string; name?: string };
      const url = await saveBookAsset(String(body.dataUrl ?? ""), body.name || `asset-${Date.now()}`);
      if (!url) { res.status(400).json({ error: "bad_image" }); return; }
      noStore(res); res.json({ ok: true, url });
    } catch (err) { res.status(500).json({ error: "asset_failed", detail: String(err) }); }
  });
  // Preview del front/back matter (HTML) para el editor.
  app.get("/engine/book-preview", (_req: Request, res: Response) => { noStore(res); res.type("html").send(frontMatterPreviewHtml()); });
  // Contrato visual de MATTER (nivel colección, reproducible). Vive en Contrato.
  app.get("/engine/matter-contract", (_req: Request, res: Response) => { noStore(res); res.json(getMatterContract()); });
  app.post("/engine/matter-contract", async (req: Request, res: Response) => {
    try { noStore(res); res.json(await saveMatterContract((req.body ?? {}) as Partial<MatterContract>)); }
    catch (err) { res.status(500).json({ error: "matter_failed", detail: String(err) }); }
  });
  // Pool de etiquetas/categorías de la colección (reutilizables entre los 6 libros de la cert).
  app.get("/engine/collection-tags", (_req: Request, res: Response) => { noStore(res); res.json(getCollectionTags()); });
  app.post("/engine/collection-tags", async (req: Request, res: Response) => {
    try { noStore(res); const b = (req.body ?? {}) as { categories?: string[]; tags?: string[] }; res.json(await addCollectionTags({ categories: b.categories, tags: b.tags })); }
    catch (err) { res.status(500).json({ error: "collection_tags_failed", detail: String(err) }); }
  });
  // Contrato de IMÁGENES del relato (figuras del Master): estilo/paleta/tamaño/cantidad.
  app.get("/engine/image-contract", (_req: Request, res: Response) => { noStore(res); res.json(getImageContract()); });
  app.post("/engine/image-contract", async (req: Request, res: Response) => {
    try { noStore(res); res.json(await saveImageContract((req.body ?? {}) as Partial<ImageContract>)); }
    catch (err) { res.status(500).json({ error: "image_contract_failed", detail: String(err) }); }
  });
  // Contrato de MARCA de las páginas de imagen (portadillas + hojas de ruta): hex de identidad congelados.
  app.get("/engine/brand-contract", (_req: Request, res: Response) => { noStore(res); res.json(getBrandContract()); });
  app.post("/engine/brand-contract", async (req: Request, res: Response) => {
    try { noStore(res); res.json(await saveBrandContract((req.body ?? {}) as Partial<BrandContract>)); }
    catch (err) { res.status(500).json({ error: "brand_contract_failed", detail: String(err) }); }
  });
  // Contrato EDITORIAL (voz del autor): reglas de estilo que se anexan al system del autor.
  app.get("/engine/editorial-contract", (_req: Request, res: Response) => { noStore(res); res.json(getEditorialContract()); });
  app.post("/engine/editorial-contract", async (req: Request, res: Response) => {
    try { noStore(res); res.json(await saveEditorialContract((req.body ?? {}) as Partial<EditorialContract>)); }
    catch (err) { res.status(500).json({ error: "editorial_contract_failed", detail: String(err) }); }
  });

  // Generador con IA por sección (el humano revisa lo que llega al editor).
  app.post("/engine/book-generate", async (req: Request, res: Response) => {
    try {
      const section = String((req.body as { section?: string })?.section ?? "") as BookSection;
      if (!["preface", "intro", "conclusions", "backcover", "collectionNote", "domainNote", "domainRows"].includes(section)) { res.status(400).json({ error: "bad_section" }); return; }
      noStore(res);
      const r = await generateBookSection(section);
      // PERSISTIR server-side (antes solo devolvía → el ensamblado seguía usando el default del otro cert).
      // Guarda el bloque en su ubicación de la config del libro activo.
      if (r.ok) {
        const cfg = getBookConfig();
        if ((section === "preface" || section === "intro" || section === "conclusions") && r.html) {
          await saveBookConfig({ blocks: { ...cfg.blocks, [section]: r.html } });
        } else if (section === "backcover" && r.html) {
          await saveBookConfig({ backCover: { ...cfg.backCover, html: r.html } });
        } else if (section === "collectionNote" && r.note) {
          await saveBookConfig({ collection: { ...cfg.collection, note: r.note } });
        } else if (section === "domainNote" && r.note) {
          await saveBookConfig({ domainMap: { ...cfg.domainMap, note: r.note } });
        } else if (section === "domainRows" && r.rows) {
          await saveBookConfig({ domainMap: { ...cfg.domainMap, rows: r.rows } });
        }
      }
      res.json(r);
    } catch (err) { res.status(500).json({ error: "generate_failed", detail: String(err) }); }
  });

  // Generar bloques NUEVOS del libro: guía de estudio (groundeada del study guide) o glosario (del corpus).
  app.post("/engine/book-section/generate", async (req: Request, res: Response) => {
    try {
      const section = String((req.body as { section?: string })?.section ?? "");
      noStore(res);
      if (section === "studyGuide") {   // guía de estudio: genera + guarda en cfg.blocks.studyGuide (persistencia server-side, sin round-trip del cliente)
        const r = await generateStudyGuide();
        if (r.ok && r.html) await saveBookConfig({ blocks: { ...getBookConfig().blocks, studyGuide: r.html } });
        res.json(r);
      }
      else if (section === "glossary") {   // glosario del corpus: genera + guarda en cfg.blocks.glossary (antes NO persistía → el assembly renderizaba el glosario viejo)
        const r = await generateGlossary();
        if (r.ok && r.html) await saveBookConfig({ blocks: { ...getBookConfig().blocks, glossary: r.html } });
        res.json(r);
      }
      else if (section === "domainMap") {   // plan de dominio = 9 rutas (desde el outline): genera + guarda en cfg.domainMap
        const r = await generateDomainMap();
        if (r.ok && r.rows) await saveBookConfig({ domainMap: { rows: r.rows, note: r.note ?? "" } });
        res.json(r);
      }
      else if (section === "scenarioReview") {   // repaso de escenarios: genera + guarda en cfg.blocks.scenarioReview
        const r = await generateScenarioReview();
        if (r.ok && r.html) await saveBookConfig({ blocks: { ...getBookConfig().blocks, scenarioReview: r.html } });
        res.json(r);
      }
      else res.status(400).json({ error: "bad_section" });
    } catch (err) { res.status(500).json({ error: "section_gen_failed", detail: String(err) }); }
  });

  // Generar la síntesis-intro de una ruta (texto fallback + lo que el usuario copia).
  app.post("/engine/route-intro/generate", async (req: Request, res: Response) => {
    try {
      const domainId = String((req.body as { domainId?: string })?.domainId ?? "");
      if (!domainId) { res.status(400).json({ error: "Falta domainId." }); return; }
      noStore(res);
      res.json(await generateRouteIntro(domainId));
    } catch (err) { res.status(500).json({ error: "route_intro_failed", detail: String(err) }); }
  });

  // Subir la página de intro YA FORMATEADA de una ruta (reemplaza el texto fallback).
  app.post("/engine/route-intro/upload", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { domainId?: string; dataUrl?: string };
      const domainId = String(body.domainId ?? "");
      if (!domainId) { res.status(400).json({ error: "Falta domainId." }); return; }
      const url = await saveBookAsset(String(body.dataUrl ?? ""), `route-intro-${domainId}`);
      if (!url) { res.status(400).json({ error: "bad_image" }); return; }
      const cfg = getBookConfig();
      const prev = cfg.routeIntros[domainId] ?? { imageUrl: null, text: "" };
      noStore(res);
      res.json({ ok: true, url, config: await saveBookConfig({ routeIntros: { ...cfg.routeIntros, [domainId]: { ...prev, imageUrl: url } } }) });
    } catch (err) { res.status(500).json({ error: "route_intro_upload_failed", detail: String(err) }); }
  });

  // Generar el DIVISOR de marca (imagen gpt-image) de UNA ruta — ancla canónica, reproducible.
  app.post("/engine/route-divider/generate", async (req: Request, res: Response) => {
    try {
      const b = (req.body ?? {}) as { domainId?: string; force?: boolean };
      const domainId = String(b.domainId ?? "");
      if (!domainId) { res.status(400).json({ error: "Falta domainId." }); return; }
      noStore(res);
      res.json(await generateRouteDivider(domainId, b.force === true));
    } catch (err) { res.status(500).json({ error: "route_divider_failed", detail: String(err) }); }
  });

  // Generar los 9 divisores (master primero + 8 ancladas).
  app.post("/engine/route-dividers/generate-all", async (req: Request, res: Response) => {
    try {
      const force = (req.body as { force?: boolean })?.force === true;
      noStore(res);
      res.json(await runRouteDividerBatch(force));
    } catch (err) { res.status(500).json({ error: "route_dividers_failed", detail: String(err) }); }
  });

  // Fijar una página aprobada como MASTER de estilo (ancla para las demás).
  app.post("/engine/style-anchor", async (req: Request, res: Response) => {
    const pageId = String((req.body as { pageId?: string })?.pageId ?? "");
    const r = await setStyleAnchor(pageId);
    noStore(res);
    res.status(r.ok ? 200 : 404).json(r);
  });

  app.get("/engine/cost", (_req: Request, res: Response) => {
    noStore(res);
    res.json(costStatus());
  });

  // CUADRILLA DE AGENTES: roster + métricas reales por agente (del ledger) + total. Read-only.
  app.get("/engine/agents", (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(agentsRollup());
    } catch (err) {
      res.status(500).json({ error: "agents_failed", detail: String(err) });
    }
  });

  // ACTIVIDAD RECIENTE (operatoria): últimas operaciones del ledger del libro activo, atribuidas a su agente. Read-only.
  app.get("/engine/agent-activity", (req: Request, res: Response) => {
    try {
      noStore(res);
      const limit = Number((req.query.limit as string) ?? 40) || 40;
      res.json({ activity: recentActivity(limit) });
    } catch (err) {
      res.status(500).json({ error: "agent_activity_failed", detail: String(err) });
    }
  });

  // RUNTIME por agente (duración real): agregado por día/semana/mes/trimestre + timeline + waterfall de la última corrida. Read-only.
  app.get("/engine/agent-runtime", (req: Request, res: Response) => {
    try {
      noStore(res);
      const q = String(req.query.period ?? "week");
      const period: Period = (["day", "week", "month", "quarter"].includes(q) ? q : "week") as Period;
      res.json(agentRuntimeRollup(period));
    } catch (err) {
      res.status(500).json({ error: "agent_runtime_failed", detail: String(err) });
    }
  });

  // CRÉDITO OpenAI: saldo anclado + gasto acumulado desde el ancla → restante. Global (no por libro).
  app.get("/engine/credit", (_req: Request, res: Response) => {
    try { noStore(res); res.json(creditStatus()); }
    catch (err) { res.status(500).json({ error: "credit_failed", detail: String(err) }); }
  });
  // Re-anclar el saldo (recarga de crédito): setea balanceUsd con anchoredAt = ahora.
  app.post("/engine/credit", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { balanceUsd?: number; anchoredAt?: string };
      const bal = Number(body.balanceUsd);
      if (!Number.isFinite(bal) || bal < 0) { res.status(400).json({ error: "balanceUsd inválido" }); return; }
      noStore(res);
      res.json(setCreditAnchor(bal, typeof body.anchoredAt === "string" ? body.anchoredAt : undefined));
    } catch (err) { res.status(500).json({ error: "credit_set_failed", detail: String(err) }); }
  });

  // INGRESOS DE SALDO (recargas): ledger append-only. Fuente de verdad del restante (Σ ingresos − Σ gasto).
  app.get("/engine/credit-events", (_req: Request, res: Response) => {
    try { noStore(res); res.json({ events: listCreditEvents() }); }
    catch (err) { res.status(500).json({ error: "credit_events_failed", detail: String(err) }); }
  });
  // Registrar una recarga (+amountUsd). No sobrescribe: agrega un ingreso al ledger.
  app.post("/engine/credit-events", (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { amountUsd?: number; note?: string };
      const amt = Number(body.amountUsd);
      if (!Number.isFinite(amt) || amt <= 0) { res.status(400).json({ error: "amountUsd inválido (debe ser > 0)" }); return; }
      noStore(res);
      const event = addCreditEvent(amt, typeof body.note === "string" ? body.note : "");
      res.json({ event, credit: creditStatus() });
    } catch (err) { res.status(500).json({ error: "credit_event_add_failed", detail: String(err) }); }
  });

  // Desglose de costos (lifetime) por modelo / kind / libro, para el panel de costos. Read-only.
  app.get("/engine/cost-breakdown", (_req: Request, res: Response) => {
    try { noStore(res); res.json(costBreakdown()); }
    catch (err) { res.status(500).json({ error: "cost_breakdown_failed", detail: String(err) }); }
  });

  // Variantes premium: genera 2 cortes + score por visión + recomendación.
  app.post("/engine/variants", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; recipeId?: string };
      const pageId = String(body.pageId ?? "");
      if (!getSeed(pageId)) { res.status(404).json({ error: "seed_missing", pageId }); return; }
      noStore(res);
      res.json(await generateVariants(pageId, String(body.recipeId ?? "standard")));
    } catch (err) {
      res.status(500).json({ error: "variants_failed", detail: String(err) });
    }
  });

  // Elegir una variante como imagen activa (copia + re-render, sin gastar).
  app.post("/engine/select-variant", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; recipeId?: string; variant?: string };
      const pageId = String(body.pageId ?? "");
      if (!getSeed(pageId)) { res.status(404).json({ error: "seed_missing", pageId }); return; }
      noStore(res);
      res.json(await selectVariant(pageId, String(body.recipeId ?? "standard"), String(body.variant ?? "a")));
    } catch (err) {
      res.status(500).json({ error: "select_failed", detail: String(err) });
    }
  });

  app.get("/engine/decide/:pageId", (req: Request, res: Response) => {
    const pageId = String(req.params.pageId ?? "");
    const seed = getSeed(pageId);
    if (!seed) {
      res.status(404).json({ error: "seed_missing", pageId });
      return;
    }
    const recipeId = String((req.query.recipe ?? "standard") as string);
    noStore(res);
    res.json(decide(seed, recipeId));
  });

  app.get("/engine/predict/:pageId", (req: Request, res: Response) => {
    const pageId = String(req.params.pageId ?? "");
    const seed = getSeed(pageId);
    if (!seed) {
      res.status(404).json({ error: "seed_missing", pageId });
      return;
    }
    const recipeId = String((req.query.recipe ?? "standard") as string);
    const recipe = getRecipe(recipeId) ?? RECIPES[0]!;
    noStore(res);
    res.json(predictPage(seed, recipe));
  });

  app.get("/engine/contract", (_req: Request, res: Response) => {
    noStore(res);
    res.json(MEASURABLE_CONTRACT);
  });

  app.get("/engine/qa/:pageId", async (req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await readQaSummary(String(req.params.pageId ?? "")));
    } catch (err) {
      res.status(500).json({ error: "qa_failed", detail: String(err) });
    }
  });

  // Readiness de CONTENIDO agregada (rollup del Dashboard): veredicto por página + motivos.
  app.get("/engine/content-readiness", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await contentReadiness());
    } catch (err) {
      res.status(500).json({ error: "readiness_failed", detail: String(err) });
    }
  });

  // COCKPIT DE QA: rollup operativo (estados + salud por dimensión + worklist). Read-only.
  app.get("/engine/qa-cockpit", async (_req: Request, res: Response) => {
    try {
      noStore(res);
      res.json(await qaCockpitRollup());
    } catch (err) {
      res.status(500).json({ error: "qa_cockpit_failed", detail: String(err) });
    }
  });

  // COCKPIT DE QA: dossier de una página (4 dimensiones + estado + próxima acción).
  app.get("/engine/qa-cockpit/:pageId", async (req: Request, res: Response) => {
    try {
      const pageId = String(req.params.pageId ?? "");
      if (!getSeed(pageId)) { res.status(404).json({ error: "seed_missing", pageId }); return; }
      noStore(res);
      res.json(await pageQaDossier(pageId));
    } catch (err) {
      res.status(500).json({ error: "qa_dossier_failed", detail: String(err) });
    }
  });

  // Veredicto de CONTENIDO: grounding + editorial + riesgo + libro (el QA visual lo da el agente).
  app.get("/engine/premium-verdict/:pageId", async (req: Request, res: Response) => {
    try {
      const pageId = String(req.params.pageId ?? "");
      if (!getSeed(pageId)) { res.status(404).json({ error: "seed_missing", pageId }); return; }
      noStore(res);
      res.json(await premiumVerdict(pageId));
    } catch (err) {
      res.status(500).json({ error: "verdict_failed", detail: String(err) });
    }
  });

  // QA editorial (LLM) — gasta tokens de texto (barato). Bajo demanda.
  app.post("/engine/qa-editorial/:pageId", async (req: Request, res: Response) => {
    try {
      const pageId = String(req.params.pageId ?? "");
      const seed = getSeed(pageId);
      if (!seed) {
        res.status(404).json({ error: "seed_missing", pageId });
        return;
      }
      const qa = await editorialQa(seed, buildEditorialContext(pageId));   // chequea técnica vs fuentes si hay grounding
      saveEditorial(pageId, qa);   // alimenta el veredicto premium (gate editorial)
      noStore(res);
      res.json(qa);
    } catch (err) {
      res.status(500).json({ error: "qa_editorial_failed", detail: String(err) });
    }
  });

  // Auto-revisión acotada — 1 llamada LLM + N regeneraciones (imagen idempotente).
  app.post("/engine/auto-revise", async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as { pageId?: string; recipeId?: string; maxAttempts?: number; threshold?: number };
      const pageId = String(body.pageId ?? "");
      if (!getSeed(pageId)) {
        res.status(404).json({ error: "seed_missing", pageId });
        return;
      }
      const recipeId = String(body.recipeId ?? "standard");
      const maxAttempts = Math.max(1, Math.min(4, Number(body.maxAttempts ?? 3)));
      const threshold = Math.max(0, Math.min(10, Number(body.threshold ?? 8)));
      const rev = await autoRevise(pageId, recipeId, maxAttempts, threshold);
      saveEditorial(pageId, rev.editorial);   // mantiene el gate editorial al día
      noStore(res);
      res.json(rev);
    } catch (err) {
      res.status(500).json({ error: "auto_revise_failed", detail: String(err) });
    }
  });

  return app;
}
