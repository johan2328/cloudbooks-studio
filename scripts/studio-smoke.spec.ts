import { expect, test, type Page } from "@playwright/test";

const now = "2026-06-06T12:00:00.000Z";

const page02 = {
  pageId: "02",
  pageNumber: "02",
  totalPages: 61,
  title: "Build y push hacia ACR: Local, nube y automatizacion",
  domain: "Dominio 1 - Soluciones contenerizadas en Azure",
  batch: "Batch 01-10",
  context:
    "Publicar imagenes en Azure Container Registry puede hacerse desde Docker local, desde Azure con az acr build o mediante ACR Tasks. La clave de examen es distinguir donde se ejecuta el build, que identidad tiene permiso AcrPush y cuando conviene evitar dependencia de Docker local.",
  guideQuestion: "Si no tienes Docker local, que mecanismo permite construir y publicar una imagen directamente en ACR?",
  contractVersion: "v24",
  groundingStatus: "seeded" as const,
  generationReady: true,
  visualModules: [
    {
      num: "01",
      title: "Build local",
      description: "El desarrollador construye la imagen localmente, autentica con az acr login y empuja con docker push.",
      idea: "Separar build local y push remoto.",
      recommendedDiagram: "Flujo codigo -> docker build -> az acr login -> docker push -> ACR.",
      maxMicrocopy: "Build local exige Docker instalado.",
      examSignal: "docker push no construye la imagen en Azure.",
    },
    {
      num: "02",
      title: "Build en Azure",
      description: "az acr build envia el contexto de codigo a Azure y ACR construye la imagen sin Docker local.",
      idea: "Mostrar construccion cloud server-side.",
      recommendedDiagram: "Codigo fuente -> az acr build -> build en Azure -> imagen en ACR.",
      maxMicrocopy: "Sin Docker local.",
      examSignal: "az acr build es la respuesta si no hay Docker local.",
    },
    {
      num: "03",
      title: "Permisos",
      description: "AcrPush permite publicar; AcrPull solo permite descargar imagenes.",
      idea: "Comparar permisos por direccion del flujo.",
      recommendedDiagram: "Identidad -> AcrPush/AcrPull -> publicar o descargar.",
      maxMicrocopy: "Push y pull no son equivalentes.",
      examSignal: "AcrPull no sirve para publicar.",
    },
    {
      num: "04",
      title: "ACR Tasks",
      description: "ACR Tasks automatiza builds por commit, schedule o actualizacion de imagen base.",
      idea: "Mostrar disparadores y resultado.",
      recommendedDiagram: "Commit/schedule/base image -> ACR Task -> imagen actualizada.",
      maxMicrocopy: "Automatizacion dentro del registro.",
      examSignal: "Task no reemplaza permisos de publicacion.",
    },
  ],
  traps: [
    {
      wrong: "Siempre necesitas Docker local",
      correction: "az acr build construye la imagen en Azure y la publica en ACR sin requerir Docker instalado en la maquina local.",
    },
    {
      wrong: "AcrPull permite hacer push",
      correction: "AcrPull solo descarga imagenes. Para publicar se requiere AcrPush o un rol con permisos equivalentes sobre el registro.",
    },
    {
      wrong: "Build y push son la misma operacion",
      correction: "Build crea la imagen; push la sube al registro. ACR Tasks puede orquestar ambas, pero siguen siendo responsabilidades distintas.",
    },
  ],
  autocheck: {
    question: "Quieres construir una imagen sin Docker local y dejarla publicada en ACR. Que comando revisas primero?",
    options: ["A. docker push", "B. az acr build", "C. az acr import", "D. az acr login"],
    correctOption: 1,
    explanation: "az acr build ejecuta el build en Azure usando el contexto de codigo y publica la imagen resultante en ACR.",
    discardNotes: [
      "docker push sube una imagen existente, no la construye en Azure.",
      "import copia imagenes entre registros, no compila codigo.",
    ],
  },
};

function card(id: string, role: string, targetZone: string, title: string, densityScore: number, visualRisk = "low") {
  return {
    id,
    pageId: "02",
    role,
    status: "selected",
    targetZone,
    title,
    claim: `${title}: lectura de examen aplicable a ACR.`,
    explanation: `${title} conecta accion, permiso y resultado esperado.`,
    diagramIntent: `Mini diagrama para ${title}`,
    examSignal: title,
    sourceRefs: ["studio-smoke-fixture"],
    formatAffinity: ["visual_atlas", "question_bank"],
    densityScore,
    visualRisk,
  };
}

const deck = {
  version: "editorial-card-deck-v1",
  pageId: "02",
  source: "grounding_locked",
  generatedAt: now,
  contentCutId: "smoke-cut-02",
  snapshotIds: [1],
  cards: [
    card("m1", "flow", "primary", "Build local", 9.0),
    card("m2", "decision", "primary", "Build en Azure", 9.2),
    card("m3", "comparison", "primary", "Permisos AcrPush/AcrPull", 9.1),
    card("m4", "flow", "primary", "ACR Tasks", 8.8),
    card("c1", "exam_signal", "complement", "Sin Docker local", 8.9),
    card("c2", "micro_case", "complement", "Pipeline hacia ACR", 8.8),
    card("r1", "trap", "rail", "AcrPull no publica", 8.7),
    card("r2", "autocheck", "rail", "az acr build", 8.9),
  ],
  selectedCardIds: ["m1", "m2", "m3", "m4", "c1", "c2", "r1", "r2"],
  rejectedCardIds: [],
};

const densityPlan = {
  version: "useful-density-agent-v1",
  targetScore: 9.5,
  score: 8.9,
  usefulDensityScore: 8.9,
  status: "ready",
  groundingNeeded: false,
  groundingRationale: "Fixture con cartas locked suficientes para comparar variantes.",
  nextAction: "regenerate_with_deck",
  problems: ["upper visual necesita mas protagonismo"],
  recommendations: ["Comparar variantes antes de gastar generacion real."],
  rejectedCards: [],
  layoutRecipe: {
    mode: "4P+2C",
    primaryCardIds: ["m1", "m2", "m3", "m4"],
    complementaryCardIds: ["c1", "c2"],
    railCardIds: ["r1", "r2"],
    upperCardCount: 6,
    railStrategy: "compact",
    promptDirective: "Componer cuatro cartas dominantes mas dos chips complementarios integrados.",
    reason: "deck listo para recomposicion controlada",
  },
};

const proposal = {
  source: "api_visual_atlas_composer_v1",
  pageId: "02",
  lockedReference: {
    pageId: "02",
    pageNumber: "02",
    contractId: "visual-atlas-v24",
    title: page02.title,
    domain: page02.domain,
    preservedZones: ["hero_title", "context_deck", "guide_question", "footer"],
  },
  recommendedTransition: {
    level: "composer_structural",
    reason: "La pagina necesita comparar variantes sin gastar una generacion completa.",
    unlockedCapabilities: ["comparar variantes", "aplicar draft", "regenerar con deck"],
    blockedCapabilities: ["canvas libre"],
  },
  draft: {
    pageId: "02",
    pageNumber: "02",
    mode: "composer",
    family: "architecture",
    blocks: [
      { id: "hero_title:10", type: "hero_title", variant: "full", required: true, minHeight: 88, maxHeight: 148, priority: 10, content: { title: page02.title, subtitle: page02.domain } },
      { id: "context_deck:20", type: "context_deck", variant: "short", required: true, minHeight: 68, maxHeight: 132, priority: 20, content: { context: page02.context } },
      { id: "guide_question:30", type: "guide_question", variant: "editorial_bar", required: true, minHeight: 34, maxHeight: 56, priority: 30, content: { question: page02.guideQuestion } },
      { id: "diagram_panel:40", type: "diagram_panel", variant: "single_focus", required: false, minHeight: 180, maxHeight: 360, priority: 40, content: { modules: page02.visualModules.slice(0, 2) } },
      { id: "comparison_panel:50", type: "comparison_panel", variant: "decision_matrix", required: false, minHeight: 160, maxHeight: 340, priority: 50, content: { modules: page02.visualModules.slice(2, 4) } },
      { id: "exam_traps:80", type: "exam_traps", variant: "standard", required: true, minHeight: 96, maxHeight: 200, priority: 80, content: { traps: page02.traps } },
      { id: "autocheck:90", type: "autocheck", variant: "full", required: true, minHeight: 96, maxHeight: 220, priority: 90, content: page02.autocheck },
    ],
    editorialDeck: deck,
    densityPlan,
    layoutRecipe: densityPlan.layoutRecipe,
    coverage: {
      technicalCore: true,
      examSignals: true,
      validationPresent: true,
      weakAreas: ["El nucleo tecnico necesita mas protagonismo."],
    },
    structuralValidation: {
      passed: true,
      missing: [],
      warnings: ["Fixture fuerza una pagina con margen de mejora para variantes."],
    },
    editorialValidation: {
      coverageScore: 8.5,
      readabilityScore: 8.4,
      usefulDensityScore: 8.6,
      examUtilityScore: 8.8,
      consistencyScore: 8.4,
      total: 8.5,
    },
  },
  nextActions: ["Comparar variantes", "Aplicar variante", "Generar con deck"],
};

const catalog = {
  source: "server_seed_and_output_status",
  totalExpected: 61,
  availableSeeds: ["01", "02", "03", "04"],
  pages: [
    {
      ...page02,
      outputStatus: {
        pageId: "02",
        hasOutput: true,
        generationMode: "openai_image",
        generationStatus: "image_generated",
        imageFailure: null,
        templateApproach: "golden_master_fixed_template",
        layoutRevision: "visual-atlas-2026-06-06-layout-recipes",
        currentLayoutRevision: "visual-atlas-2026-06-06-layout-recipes",
        generatedAt: now,
        approvedAt: null,
        files: { html: true, metadata: true, qaReport: true, upperVisual: true, previewPng: false, previewSvg: false, approved: false },
        htmlPath: "/assets/cloudbooks/ai-200/visual-atlas/pages/02/page.html",
        previewPath: null,
      },
    },
  ],
};

const qaReport = {
  verdict: "needs_revision",
  scores: {
    total: 8.7,
    art_direction: 8.4,
    editorial_consistency: 8.5,
    readability: 8.8,
    technical_accuracy: 10.0,
    useful_density: 8.6,
    commercial_risk: 8.8,
  },
  observations: ["Hay margen para recomponer el nucleo visual sin bloquear variantes."],
  redTeamLog: ["Caso fixture: salida real suficiente para comparar variantes sin gastar Image 2."],
  generatedAt: now,
  layoutEvidence: {
    page: { width: 768, height: 1152 },
    zonesPresent: { hero: true, upper: true, examRail: true, footer: true },
    upper: { rowHeight: 506, slotHeight: 470, slotWidth: 736, freeVerticalPx: 42, imageSlotSharePct: 76 },
    examRail: { rowHeight: 220, sharePct: 29, trapItems: 3, autocheckOptions: 4, discardNotes: 2, fillerBlocks: 0, trapChars: 410, autocheckChars: 360, densityBand: "balanced" },
    projectedVsReal: { expectedBodyHeight: 760, measuredBodyHeight: 768, bodyDeltaPx: 8, expectedUpperRowHeight: 506, upperDeltaPx: 0 },
    warnings: [],
    blockers: [],
    score: 8.1,
  },
  visualMeasurement: {
    version: "visual-measurement-v1",
    available: true,
    renderer: "playwright",
    screenshotFile: null,
    page: { width: 768, height: 1152, scrollWidth: 768, scrollHeight: 1152, horizontalOverflowPx: 0, verticalOverflowPx: 0 },
    zones: {},
    zoneUsage: { exam_rail: { usedHeight: 188, freeBottomPx: 28, occupancyPct: 85 } },
    typography: { minFontPx: 8, smallTextCount: 0 },
    overflow: { count: 0, examples: [] },
    upperImageContent: { available: true, contentWidthPct: 88, contentHeightPct: 81, contentAreaPct: 71, bottomWhitespacePct: 8, rightWhitespacePct: 6 },
    warnings: [],
    blockers: [],
    score: 8.0,
    note: "Fixture visual para smoke test sin OpenAI.",
  },
};

async function installStudioFixtures(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("studio_token", "demo-token-1");
    window.localStorage.setItem("studio_user", JSON.stringify({
      id: 1,
      username: "directora",
      displayName: "Directora Editorial",
      role: "Admin",
    }));
  });

  await page.route("**/api/studio/**", async (route) => {
    await route.fulfill({ status: 404, json: { error: "studio_smoke_unhandled_route", url: route.request().url() } });
  });
  await page.route("**/api/studio/visual-atlas-pages", async (route) => {
    await route.fulfill({ json: catalog });
  });
  await page.route("**/api/studio/composer/pages", async (route) => {
    await route.fulfill({
      json: {
        source: "api_visual_atlas_composer_v1",
        pages: [{ pageId: "02", pageNumber: "02", family: "architecture", recommendedTransition: "composer_structural", totalScore: 8.5, missing: [] }],
      },
    });
  });
  await page.route("**/api/studio/composer/proposal/02", async (route) => {
    await route.fulfill({ json: proposal });
  });
  await page.route("**/api/studio/composer/draft/02", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 404, json: { error: "composer_draft_missing", pageId: "02" } });
      return;
    }
    await route.fulfill({ json: { pageId: "02", pageNumber: "02", family: "architecture", transitionLevel: "composer_structural", draft: proposal.draft, note: "smoke", updatedByName: "Smoke", updatedAt: now } });
  });
  await page.route("**/api/studio/composer/actions/02**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { logs: [] } });
      return;
    }
    await route.fulfill({
      json: {
        log: {
          id: "smoke-log",
          pageId: "02",
          kind: "shortcut",
          action: "Smoke",
          status: "ok",
          beforeTotal: 8.5,
          afterTotal: 8.8,
          delta: 0.3,
          changedBlocks: 1,
          note: "Smoke action",
          userName: "Smoke",
          createdAt: now,
        },
      },
    });
  });
  await page.route("**/api/studio/output-status/02", async (route) => {
    await route.fulfill({ json: catalog.pages[0].outputStatus });
  });
  await page.route("**/api/studio/qa-report/02", async (route) => {
    await route.fulfill({ json: qaReport });
  });
  await page.route("**/api/studio/key-status", async (route) => {
    await route.fulfill({
      json: {
        hasKey: true,
        textModel: "gpt-4o-mini",
        imageModel: "gpt-image-2",
        imageQuality: "medium",
        allowHighQuality: false,
        blockLegacyImgModel: true,
        costGuardrail: "medium_only",
        templateVersion: "v24",
        approach: "golden_master_fixed_template",
        runtime: { gitSha: "smoke", gitBranch: "main", gitDirty: false, syncCommand: "npm run verify:studio", secretsSource: "fixture" },
      },
    });
  });
}

test("Composer variants are comparable and actionable without Replit/API/OpenAI", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/404|favicon/i.test(msg.text())) pageErrors.push(msg.text());
  });
  await installStudioFixtures(page);

  await page.goto("/composer/02");

  await expect(page.getByText("Mesa de decision editorial")).toBeVisible();
  await expect(page.getByText("Variantes comparables")).toBeVisible();
  await expect(page.getByText("Draft actual")).toBeVisible();
  await expect(page.getByText("Nucleo visual dominante")).toBeVisible();
  await expect(page.getByText("Rail compacto").first()).toBeVisible();
  await expect(page.getByText("Decision dominante")).toBeVisible();
  await expect(page.getByText(/Visual \d+%/).first()).toBeVisible();
  await expect(page.getByText(/Rail \d+%/).first()).toBeVisible();

  const variantsPanel = page.locator("section").filter({ hasText: "Variantes comparables" }).first();
  await variantsPanel.getByRole("button", { name: /Aplicar/ }).first().click();

  await expect(page.getByText(/Variante aplicada:/).first()).toBeVisible();
  await expect(page.getByText(/no se gasto Image 2 todavia/).first()).toBeVisible();

  await page.goto("/qa/02");
  await expect(page.getByText(/QA Y APROBACION|QA Y APROBACIÓN/i)).toBeVisible();
  await expect(page.getByText(/Score por dimension|Score por dimensión/i)).toBeVisible();

  expect(pageErrors, pageErrors.join("\n")).toEqual([]);
});
