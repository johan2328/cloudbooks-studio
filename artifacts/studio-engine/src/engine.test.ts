import { test, after } from "node:test";
import assert from "node:assert/strict";

import { renderInspect, closeBrowser } from "./render/headless-qa.js";
import { estimateTextCost } from "./cost.js";
import { evaluateContentGates, type VerdictInputs } from "./premium-verdict.js";
import { tallyGrounding } from "./grounding/verify-grounding.js";
import { runContractChecks } from "./contract-checks.js";
import { renderComposerPage } from "./render/render-composer-page.js";
import { predictPage } from "./predict.js";
import { validateSeed } from "./validate-seed.js";
import { buildImagePrompt } from "./image/build-image-prompt.js";
import { getSeed } from "./seeds.js";
import { getRecipe } from "./recipes.js";
import { upsertPersistedPage, removePersistedPage, getPersistedPage } from "./page-store.js";
import type { ClaimCheck, PageSeed } from "./types.js";

// Fixture de prueba (los tests NO dependen del contenido de producción; las seeds
// estáticas 01-03 se retiraron en favor de las páginas groundeadas).
const seed: PageSeed = {
  pageId: "01", pageNumber: "01", totalPages: 122,
  domainLabel: "Ruta 1 — Alojamiento de aplicaciones en contenedores", batchLabel: "Test",
  title: "Azure Container Registry", subtitle: "Arquitectura y tiers",
  context: "ACR es el registro privado de imágenes de contenedor en Azure, con tiers Basic, Standard y Premium.",
  guideQuestion: "¿Qué tier elegir para producción con geo-replicación?",
  upperVisualAlt: "Diagrama de ACR",
  traps: [
    { wrong: "Basic soporta geo-replicación", correction: "La geo-replicación es exclusiva del tier Premium." },
    { wrong: "Los tags son inmutables", correction: "Los tags son mutables; el digest SHA-256 es inmutable." },
    { wrong: "ACR es público como Docker Hub", correction: "ACR es un registro privado con control de acceso por RBAC." },
  ],
  autocheck: {
    question: "¿Qué tier habilita private endpoint y geo-replicación?",
    options: ["A. Basic", "B. Standard", "C. Premium", "D. Free"],
    correctOption: 2,
    explanation: "Premium habilita private endpoints, geo-replicación y zone redundancy para producción.",
    discardNotes: ["A descartada: Basic es para desarrollo.", "B descartada: Standard no incluye geo-replicación."],
  },
  visualModules: [
    { num: "01", title: "Qué es ACR", description: "Registro privado de imágenes en Azure, consumido por AKS, App Service y Container Apps." },
    { num: "02", title: "Tiers", description: "Basic/Standard/Premium: límites de storage, webhooks, geo-replicación y private endpoint." },
    { num: "03", title: "Tags vs digest", description: "El tag es mutable; el digest SHA-256 es inmutable para reproducibilidad." },
    { num: "04", title: "Seguridad", description: "Managed identity para pull seguro; private endpoint para aislamiento de red." },
  ],
  skillIds: ["p1.acr.image-storage"],
};
const recipe = getRecipe("standard")!;

/* ── costo: estimación de texto ── */
test("estimateTextCost usa tarifas por modelo y cae a mini si es desconocido", () => {
  assert.ok(Math.abs(estimateTextCost("gpt-4o", 1000, 1000) - 0.0125) < 1e-9);
  assert.ok(Math.abs(estimateTextCost("gpt-4o-mini", 1000, 1000) - 0.00075) < 1e-9);
  assert.equal(estimateTextCost("modelo-raro", 1000, 1000), estimateTextCost("gpt-4o-mini", 1000, 1000));
  assert.equal(estimateTextCost("gpt-4o", 0, 0), 0);
});

/* ── veredicto de CONTENIDO: grounding + editorial + riesgo + libro ── */
const good: VerdictInputs = { hasMarketing: false };   // seeded, sin editorial, sin marketing, libro ok
test("veredicto: seeded sin editorial → needs_human_art (grounding no verified)", () => {
  assert.equal(evaluateContentGates(good).verdict, "needs_human_art");
});
const ready: VerdictInputs = { grounding: "verified", relevanceStatus: "sufficient", editorialRan: true, editorialVerdict: "approve", bookConsistent: true };
test("veredicto: grounding verified + relevancia sufficient + editorial approve + libro ok → production_ready", () => {
  assert.equal(evaluateContentGates(ready).verdict, "production_ready");
});
test("veredicto: relevancia thin → needs_human_art (fiel pero pobre, señal distinta de grounding)", () => {
  assert.equal(evaluateContentGates({ ...ready, relevanceStatus: "thin" }).verdict, "needs_human_art");
});
test("veredicto: relevancia off_topic → blocked", () => {
  const r = evaluateContentGates({ ...ready, relevanceStatus: "off_topic" });
  assert.equal(r.verdict, "blocked");
  assert.equal(r.gates.find((g) => g.id === "relevance")?.passed, false);
});
test("veredicto: relevancia no evaluada (null) → needs_human_art pero NO bloquea (legacy)", () => {
  const r = evaluateContentGates({ ...ready, relevanceStatus: null });
  assert.equal(r.verdict, "needs_human_art");
  assert.equal(r.gates.find((g) => g.id === "relevance")?.passed, true);   // no-evaluada no falla el gate
});
test("veredicto: grounding partial (no verified) → needs_human_art", () => {
  assert.equal(evaluateContentGates({ ...ready, grounding: "partial" }).verdict, "needs_human_art");
});
test("veredicto: grounding seeded (null) → needs_human_art", () => {
  assert.equal(evaluateContentGates({ ...ready, grounding: null }).verdict, "needs_human_art");
});
test("veredicto: verified pero sin QA editorial → needs_human_art (editorial obligatorio)", () => {
  assert.equal(evaluateContentGates({ grounding: "verified" }).verdict, "needs_human_art");
});
test("veredicto: copy de marketing → riesgo comercial falla", () => {
  const r = evaluateContentGates({ ...ready, hasMarketing: true });
  assert.equal(r.gates.find((g) => g.id === "risk")?.passed, false);
});
test("veredicto: inconsistencia de libro → libro falla + no production_ready", () => {
  const r = evaluateContentGates({ ...ready, bookConsistent: false, bookIssueCount: 2 });
  assert.equal(r.gates.find((g) => g.id === "book")?.passed, false);
  assert.notEqual(r.verdict, "production_ready");
});

/* ── integración: grounding + editorial entran al veredicto de contenido ── */
test("veredicto: grounding unverified → blocked (gate técnico bloquea)", () => {
  const r = evaluateContentGates({ ...good, grounding: "unverified" });
  assert.equal(r.verdict, "blocked");
  assert.equal(r.gates.find((g) => g.id === "technical")?.passed, false);
});
test("veredicto: grounding verified → técnico 10/10", () => {
  assert.equal(evaluateContentGates({ ...good, grounding: "verified" }).gates.find((g) => g.id === "technical")?.score, 10);
});
test("veredicto: seed sin grounding (null) no bloquea por técnico", () => {
  assert.equal(evaluateContentGates(good).gates.find((g) => g.id === "technical")?.passed, true);
});
test("veredicto: QA editorial 'revise' → gate contenido falla", () => {
  const r = evaluateContentGates({ ...good, editorialRan: true, editorialVerdict: "revise", editorialOverall: 5 });
  assert.equal(r.gates.find((g) => g.id === "content")?.passed, false);
});
test("veredicto: QA editorial 'approve' → gate contenido pasa", () => {
  const r = evaluateContentGates({ ...good, editorialRan: true, editorialVerdict: "approve", editorialOverall: 9 });
  assert.equal(r.gates.find((g) => g.id === "content")?.passed, true);
});

/* ── page-store (corrida 21): persistir un draft → getSeed lo encuentra ── */
test("page-store: persistir página → getSeed la resuelve → remover la quita", () => {
  const pseudo = { ...seed, pageId: "99", pageNumber: "99", title: "Página persistida de prueba" };
  upsertPersistedPage({
    seed: pseudo,
    provenance: { pageId: "99", skillIds: ["x"], sourceIds: [], claims: [], checks: [], groundingStatus: "verified", updatedAt: null },
    persistedAt: "test",
  });
  try {
    assert.equal(getSeed("99")?.title, "Página persistida de prueba");
    assert.equal(getPersistedPage("99")?.provenance.groundingStatus, "verified");
  } finally {
    removePersistedPage("99");
  }
  assert.equal(getSeed("99"), null);
});

/* ── grounding gate ── */
const claim = (verdict: ClaimCheck["verdict"]): ClaimCheck => ({ claimId: "c", field: "context", text: "x", citationKind: "source", sourceId: "s", verdict, note: "" });
test("grounding: todas supported → verified, no bloquea", () => {
  const t = tallyGrounding([claim("supported"), claim("supported")]);
  assert.equal(t.groundingStatus, "verified");
  assert.equal(t.blocked, false);
});
test("grounding: una contradicha → unverified + blocked", () => {
  const t = tallyGrounding([claim("supported"), claim("contradicted")]);
  assert.equal(t.groundingStatus, "unverified");
  assert.equal(t.blocked, true);
});
test("grounding: sin respaldo (unsupported) → blocked", () => {
  assert.equal(tallyGrounding([claim("unsupported")]).blocked, true);
});
test("grounding: supported + no_source → partial, no bloquea", () => {
  const t = tallyGrounding([claim("supported"), claim("no_source")]);
  assert.equal(t.groundingStatus, "partial");
  assert.equal(t.blocked, false);
});

/* ── contrato de identidad sobre el HTML real ── */
test("contrato: una página renderizada pasa 10/10", () => {
  const { html } = renderComposerPage(seed, recipe, { imageUrl: "/x.png" });
  const c = runContractChecks(seed, recipe, html, "openai_image");
  assert.equal(c.passed, true);
  assert.equal(c.score, 10);
});
test("contrato: una fuente fuera de la escala tipográfica falla", () => {
  const { html } = renderComposerPage(seed, recipe, { imageUrl: "/x.png" });
  const tampered = html.replace("font-size:33px", "font-size:99px");
  const c = runContractChecks(seed, recipe, tampered, "openai_image");
  assert.equal(c.passed, false);
});

/* ── QA predictivo ── */
test("predict: devuelve worst válido y safeToSpendImage booleano", () => {
  const p = predictPage(seed, recipe);
  assert.ok(["ok", "warn", "high"].includes(p.worst));
  assert.equal(typeof p.safeToSpendImage, "boolean");
  assert.equal(p.safeToSpendImage, p.worst !== "high");
});

/* ── validación de seeds ── */
test("validateSeed: un seed real es válido", () => {
  assert.equal(validateSeed(seed).length, 0);
});
test("validateSeed: correctOption fuera de rango se detecta", () => {
  const bad = { ...seed, autocheck: { ...seed.autocheck, correctOption: 99 } };
  assert.ok(validateSeed(bad).length > 0);
});
test("validateSeed: sin trampas suficientes se detecta", () => {
  assert.ok(validateSeed({ ...seed, traps: [] }).some((e) => e.includes("trampas")));
});

/* ── idempotencia del prompt (base de la reutilización de imagen) ── */
test("buildImagePrompt es determinista y la variante difiere", () => {
  assert.equal(buildImagePrompt(seed, recipe).prompt, buildImagePrompt(seed, recipe).prompt);
  assert.notEqual(buildImagePrompt(seed, recipe).prompt, buildImagePrompt(seed, recipe, "a").prompt);
});

/* ── auto-fit: el render aplica los FitParams y el contrato sigue válido ── */
test("render aplica FitParams (deck font/líneas)", () => {
  const a = renderComposerPage(seed, recipe, { imageUrl: "/x.png" }).html;
  const b = renderComposerPage(seed, recipe, { imageUrl: "/x.png", fit: { deckFontPx: 11, deckLines: 6 } }).html;
  assert.ok(a.includes("-webkit-line-clamp:3"));
  assert.ok(b.includes("-webkit-line-clamp:6"));
  assert.ok(b.includes("font-size:11px"));
});
test("contrato sigue 10/10 con auto-fit aplicado (escala válida)", () => {
  const { html } = renderComposerPage(seed, recipe, { imageUrl: "/x.png", fit: { deckFontPx: 11, deckLines: 6, expLines: 6, railFontDelta: -1 } });
  assert.equal(runContractChecks(seed, recipe, html, "openai_image").passed, true);
});
test("auto-fit C: comprime el rail (gaps/lead) sin tocar la fuente; default no cambia", () => {
  const base = renderComposerPage(seed, recipe, { imageUrl: "/x.png" }).html;
  const baseFit = renderComposerPage(seed, recipe, { imageUrl: "/x.png", fit: {} }).html;
  assert.equal(base, baseFit); // el peldaño {} es idéntico al render actual (sin regresión)
  const tight = renderComposerPage(seed, recipe, { imageUrl: "/x.png", fit: { railGapDelta: -3, railLeadDelta: -0.13 } }).html;
  assert.notEqual(base, tight); // comprime de verdad
});
test("contrato 10/10 con el peldaño más agresivo del auto-fit (rail al mínimo)", () => {
  const { html } = renderComposerPage(seed, recipe, { imageUrl: "/x.png", fit: { deckFontPx: 11, deckLines: 7, expLines: 7, railFontDelta: -2, railGapDelta: -3, railLeadDelta: -0.13 } });
  assert.equal(runContractChecks(seed, recipe, html, "openai_image").passed, true);
});

/* ── QA renderizada (headless): mide truncado REAL (integración, salta sin Chrome) ── */
test("renderInspect detecta truncado real en una zona clampada", async () => {
  const html = `<div class="page" style="width:768px;height:1152px"><div class="ctx" style="height:24px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;font-size:14px;line-height:1.3">${"palabra ".repeat(120)}</div></div>`;
  const r = await renderInspect(html);
  if (!r.available) return; // sin Chrome (p.ej. CI sin browser) → no aplica
  assert.equal(r.overflow, true);
  assert.ok(r.overflows.some((o) => o.zone.includes("contexto")));
});
after(async () => { await closeBrowser(); });
