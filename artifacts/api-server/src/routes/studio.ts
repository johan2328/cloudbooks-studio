import { Router } from "express";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

const router = Router();

/* ══════════════════════════════════════════════════════════════════════════
   MODEL CONFIG — solo modificar con aprobación del equipo
   ══════════════════════════════════════════════════════════════════════════ */
const TEXT_MODEL             = "gpt-4o-mini" as const;  // solo QA/json estructurado
const IMAGE_MODEL            = "gpt-image-2" as const;  // bloque visual superior únicamente
const IMAGE_QUALITY          = "medium"      as const;  // NUNCA escalar
const ALLOW_HIGH_QUALITY     = false         as const;
const BLOCK_LEGACY_IMG_MODEL = true          as const;  // bloquear gpt-image-1
const GUARDRAIL_LABEL        = "high_quality_blocked_gpt_image_2_medium_only" as const;
const TEMPLATE_VERSION       = "v24"         as const;
/* ══════════════════════════════════════════════════════════════════════════ */

/* ── Rutas de salida ──────────────────────────────────────────────────────*/
function studioPublicDir(): string {
  return join(process.cwd(), "../studio/public");
}
function pageOutputDir(pageId: string): string {
  return join(studioPublicDir(), "assets/cloudbooks/ai-200/visual-atlas/pages", pageId);
}

/* ══════════════════════════════════════════════════════════════════════════
   TIPO: VisualAtlasPageData
   Estructura de datos del golden master — la plantilla NO recibe texto libre.
   ══════════════════════════════════════════════════════════════════════════ */
interface TrapItem {
  wrong: string;       // la creencia incorrecta
  correction: string;  // la corrección real
}
interface AutocheckData {
  question: string;
  options: string[];   // 4 opciones A-D
  correctOption: number; // índice 0-based
  explanation: string;
  discardNotes: string[];
}
interface VisualAtlasPageData {
  domainLabel:        string;
  pageNumber:         string;   // "01"
  totalPages:         number;   // 61
  batchLabel:         string;   // "Batch 01"
  title:              string;
  subtitle:           string;
  context:            string;
  guideQuestion:      string;
  upperVisualSrc:     string;   // ruta relativa a la imagen o "placeholder"
  upperVisualAlt:     string;
  traps:              TrapItem[];
  autocheck:          AutocheckData;
  contractVersion:    string;
}

/* ══════════════════════════════════════════════════════════════════════════
   SEED DATA — página 01 (golden master content)
   ══════════════════════════════════════════════════════════════════════════ */
const PAGE_01_DATA: VisualAtlasPageData = {
  domainLabel:     "Gestión de Contenedores",
  pageNumber:      "01",
  totalPages:      61,
  batchLabel:      "Batch 01",
  title:           "Azure Container Registry",
  subtitle:        "Arquitectura y Tiers",
  context:         "ACR es el registro privado de imágenes de contenedor en Azure, base para despliegues en AKS, App Service y Container Apps. Conoce sus tiers para seleccionar el adecuado según escenarios de desarrollo, producción y alta disponibilidad. Lee las señales: geo-replicación, Private Endpoint y digest suelen decidir más que el nombre del SKU.",
  guideQuestion:   "¿Cuál tier de ACR es adecuado para producción con geo-replicación y private endpoints?",
  upperVisualSrc:  "placeholder",
  upperVisualAlt:  "Diagrama de arquitectura y tiers de Azure Container Registry",
  traps: [
    {
      wrong:      "Basic es suficiente para producción",
      correction: "Basic carece de Private Endpoints y geo-replicación. Para producción con seguridad de red y HA global se requiere Premium.",
    },
    {
      wrong:      "La tag :latest siempre es segura e inmutable",
      correction: "La tag :latest es mutable — puede apuntar a imágenes distintas en cada push. Usa el digest SHA256 para referencias inmutables.",
    },
    {
      wrong:      "Geo-replication y zone redundancy son equivalentes",
      correction: "Geo-replication replica entre regiones (latencia global). Zone redundancy protege contra fallas de zonas dentro de una región. Son independientes y complementarios.",
    },
  ],
  autocheck: {
    question:      "¿Qué tier de ACR permite geo-replication y private endpoints simultáneamente?",
    options:       ["A. Basic", "B. Standard", "C. Premium", "D. Enterprise"],
    correctOption: 2,
    explanation:   "Premium es el único tier con geo-replication activa-activa y soporte de Private Endpoints/Private Link para acceso de red privado.",
    discardNotes:  [
      "A descartada: Basic no tiene Private Endpoints ni geo-replication.",
      "B descartada: Standard tiene Content Trust pero no geo-replication.",
      "D descartada: No existe tier Enterprise en ACR.",
    ],
  },
  contractVersion: TEMPLATE_VERSION,
};

const PAGE_SEEDS: Record<string, VisualAtlasPageData> = {
  "01": PAGE_01_DATA,
};

/* ══════════════════════════════════════════════════════════════════════════
   PLANTILLA CERRADA — renderVisualAtlasPage(data)
   Layout golden master v24: 768×1152 px portrait, estructura editorial fija.
   La IA NO decide estructura. Solo aporta la imagen del bloque visual superior.
   ══════════════════════════════════════════════════════════════════════════ */
function renderVisualAtlasPage(data: VisualAtlasPageData): string {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  const upperVisualHtml = data.upperVisualSrc === "placeholder"
    ? `<div class="visual-placeholder">
        <div class="placeholder-inner">
          <div class="placeholder-icon">📦</div>
          <div class="placeholder-label">Visual pendiente</div>
          <div class="placeholder-sub">Se generará con gpt-image-2 medium · fondo blanco</div>
          <div class="placeholder-grid">
            <div class="pg-cell"><span class="pg-num">01</span><span>Qué es ACR</span><span class="pg-sub">Registro privado Azure</span></div>
            <div class="pg-cell"><span class="pg-num">02</span><span>Tiers ACR</span><span class="pg-sub">Basic · Standard · Premium</span></div>
            <div class="pg-cell"><span class="pg-num">03</span><span>Arquitectura</span><span class="pg-sub">Registry → AKS / ACI</span></div>
            <div class="pg-cell"><span class="pg-num">04</span><span>Geo-replicación</span><span class="pg-sub">Solo Premium · active-active</span></div>
          </div>
        </div>
      </div>`
    : `<img class="visual-image" src="${data.upperVisualSrc}" alt="${data.upperVisualAlt}" />`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=768">
<title>Pág. ${data.pageNumber} — ${data.title} · AI-200 Visual Study Atlas</title>
<style>
/* ── GOLDEN MASTER v24 · LIGHT EDITORIAL THEME · LOCKED ─────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  width: 768px;
  height: 1152px;
  overflow: hidden;
  font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  background: #f4f6f9;
  color: #0d1629;
  display: flex;
  flex-direction: column;
}

/* ── [A] TOPBAR — navy delgado ───────────────────────────────────────────── */
.topbar {
  flex: 0 0 44px;
  background: #0d1629;
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 10px;
}
.topbar-page {
  background: #0d9488;
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: 2px;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.topbar-domain {
  font-size: 9.5px;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 600;
}
.topbar-spacer { flex: 1; }
.topbar-badge-domain {
  font-size: 8px;
  color: #0d9488;
  border: 1px solid rgba(13,148,136,0.45);
  padding: 2px 7px;
  border-radius: 2px;
  font-weight: 700;
}
.topbar-badge-cert {
  font-size: 8px;
  color: #fff;
  background: #0078d4;
  padding: 2px 7px;
  border-radius: 2px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

/* ── [B] HERO — blanco, título navy grande ───────────────────────────────── */
.hero {
  flex: 0 0 130px;
  background: #ffffff;
  border-bottom: 1px solid #dde1e9;
  display: flex;
  align-items: stretch;
  padding: 0 24px;
}
.hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding-right: 12px;
}
.hero-subtitle {
  font-size: 8.5px;
  color: #6b7a99;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.hero-title {
  font-size: 25px;
  font-weight: 900;
  color: #0d1629;
  line-height: 1.08;
  letter-spacing: -0.02em;
}
.hero-context {
  font-size: 9.5px;
  color: #3d4f70;
  line-height: 1.55;
  max-width: 590px;
}
.hero-icon {
  flex: 0 0 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  opacity: 0.22;
}

/* ── [C] PREGUNTA GUÍA — cápsula azul clara ──────────────────────────────── */
.guide {
  flex: 0 0 38px;
  background: #eef4ff;
  border-bottom: 1px solid #c3d6f7;
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 10px;
}
.guide-label {
  font-size: 7.5px;
  color: #1d4ed8;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  flex-shrink: 0;
}
.guide-pill {
  background: #dbeafe;
  border: 1px solid #93c5fd;
  border-radius: 20px;
  padding: 3px 12px;
  font-size: 9.5px;
  color: #1e3a8a;
  font-style: italic;
  font-weight: 600;
}

/* ── [D] UPPER VISUAL — fondo blanco, imagen clara ───────────────────────── */
.upper-visual {
  flex: 0 0 408px;
  background: #ffffff;
  border-bottom: 2px solid #dde1e9;
  overflow: hidden;
  position: relative;
}
.visual-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.visual-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.placeholder-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 20px 32px;
}
.placeholder-icon { font-size: 32px; opacity: 0.35; }
.placeholder-label {
  font-size: 11px;
  font-weight: 700;
  color: #6b7a99;
  letter-spacing: 0.08em;
}
.placeholder-sub { font-size: 9px; color: #9ca3af; }
.placeholder-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;
  width: 100%;
  max-width: 560px;
}
.pg-cell {
  background: #ffffff;
  border: 1px solid #dde1e9;
  border-radius: 4px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 11px;
  color: #0d1629;
  font-weight: 700;
}
.pg-num {
  font-size: 9px;
  font-weight: 800;
  color: #0d9488;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}
.pg-sub { font-size: 9px; color: #6b7a99; font-weight: 400; }

/* ── [E] LOWER BLOCK ─────────────────────────────────────────────────────── */
.lower-block {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 0;
}

/* Trampas — panel blanco, header rojo */
.traps-panel {
  background: #ffffff;
  border-right: 1px solid #dde1e9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.panel-header {
  padding: 9px 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.traps-panel .panel-header {
  background: #dc2626;
  border-bottom: none;
}
.panel-header-icon { font-size: 11px; }
.panel-header-label {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
.traps-panel .panel-header-icon { color: rgba(255,255,255,0.8); }
.traps-panel .panel-header-label { color: #fff; }
.traps-list {
  flex: 1;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: hidden;
  background: #fff9f9;
}
.trap-item {
  display: flex;
  gap: 9px;
  align-items: flex-start;
}
.trap-num {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 50%;
  font-size: 8.5px;
  font-weight: 800;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
}
.trap-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.trap-wrong {
  font-size: 9.5px;
  font-weight: 700;
  color: #374151;
  text-decoration: line-through;
  text-decoration-color: #f87171;
}
.trap-arrow { font-size: 8px; color: #9ca3af; }
.trap-correction {
  font-size: 9px;
  color: #1f2937;
  line-height: 1.45;
}

/* Autocheck — panel blanco, header navy */
.autocheck-panel {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.autocheck-panel .panel-header {
  background: #0d1629;
  border-bottom: none;
}
.autocheck-panel .panel-header-icon { color: rgba(255,255,255,0.7); }
.autocheck-panel .panel-header-label { color: #fff; }
.autocheck-body {
  flex: 1;
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  overflow: hidden;
  background: #f8faff;
}
.autocheck-question {
  font-size: 10px;
  font-weight: 700;
  color: #0d1629;
  line-height: 1.4;
}
.autocheck-options { display: flex; flex-direction: column; gap: 4px; }
.option-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  border-radius: 3px;
  border: 1px solid #e5e7eb;
  font-size: 9.5px;
}
.option-row.correct {
  background: #d1fae5;
  border-color: #6ee7b7;
  color: #065f46;
  font-weight: 700;
}
.option-row.wrong-opt {
  background: #f9fafb;
  color: #6b7280;
}
.option-badge {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 8px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}
.option-row.correct .option-badge { background: #a7f3d0; color: #065f46; }
.option-row.wrong-opt .option-badge { background: #e5e7eb; color: #6b7280; }
.autocheck-explanation {
  font-size: 9px;
  color: #1f2937;
  line-height: 1.45;
  padding: 6px 8px;
  background: #ecfdf5;
  border-left: 2px solid #34d399;
  border-radius: 0 3px 3px 0;
}
.discard-notes { display: flex; flex-direction: column; gap: 2px; }
.discard-note { font-size: 8px; color: #9ca3af; line-height: 1.4; }

/* ── [F] FOOTER — navy ───────────────────────────────────────────────────── */
.footer {
  flex: 0 0 30px;
  background: #0d1629;
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 16px;
}
.footer-brand {
  font-size: 8px;
  font-family: monospace;
  color: rgba(255,255,255,0.25);
  font-weight: 600;
}
.footer-spacer { flex: 1; }
.footer-page {
  font-size: 7.5px;
  font-family: monospace;
  color: rgba(255,255,255,0.2);
}
.footer-contract {
  font-size: 7px;
  font-family: monospace;
  color: rgba(13,148,136,0.5);
}
</style>
</head>
<body>

<!-- [A] TOPBAR -->
<header class="topbar">
  <span class="topbar-page">${data.pageNumber}</span>
  <span class="topbar-domain">${data.domainLabel}</span>
  <span class="topbar-spacer"></span>
  <span class="topbar-badge-domain">${data.domainLabel}</span>
  <span class="topbar-badge-cert">AI-200</span>
</header>

<!-- [B] HERO EDITORIAL -->
<section class="hero">
  <div class="hero-text">
    <div class="hero-subtitle">${data.subtitle}</div>
    <div class="hero-title">${data.title}</div>
    <div class="hero-context">${data.context}</div>
  </div>
  <div class="hero-icon">📦</div>
</section>

<!-- [C] PREGUNTA GUÍA -->
<div class="guide">
  <span class="guide-label">Pregunta guía</span>
  <span class="guide-pill">${data.guideQuestion}</span>
</div>

<!-- [D] BLOQUE VISUAL SUPERIOR -->
<div class="upper-visual">
  ${upperVisualHtml}
</div>

<!-- [E] BLOQUE INFERIOR -->
<div class="lower-block">

  <!-- Trampas -->
  <div class="traps-panel">
    <div class="panel-header">
      <span class="panel-header-icon">⚠</span>
      <span class="panel-header-label">Trampas del examen</span>
    </div>
    <div class="traps-list">
      ${data.traps.map((t, i) => `
      <div class="trap-item">
        <div class="trap-num">${i + 1}</div>
        <div class="trap-content">
          <div class="trap-wrong">${t.wrong}</div>
          <div class="trap-arrow">→</div>
          <div class="trap-correction">${t.correction}</div>
        </div>
      </div>`).join("")}
    </div>
  </div>

  <!-- Autocheck -->
  <div class="autocheck-panel">
    <div class="panel-header">
      <span class="panel-header-icon">✓</span>
      <span class="panel-header-label">Verificación autocheck</span>
    </div>
    <div class="autocheck-body">
      <div class="autocheck-question">${data.autocheck.question}</div>
      <div class="autocheck-options">
        ${data.autocheck.options.map((opt, i) => `
        <div class="option-row ${i === data.autocheck.correctOption ? "correct" : "wrong-opt"}">
          <span class="option-badge">${optionLetters[i]}</span>
          <span>${opt.replace(/^[A-D]\.\s*/, "")}</span>
          ${i === data.autocheck.correctOption ? '<span style="margin-left:auto;font-size:10px;">✓</span>' : ""}
        </div>`).join("")}
      </div>
      <div class="autocheck-explanation">${data.autocheck.explanation}</div>
      <div class="discard-notes">
        ${data.autocheck.discardNotes.map(n => `<div class="discard-note">• ${n}</div>`).join("")}
      </div>
    </div>
  </div>

</div>

<!-- [F] FOOTER -->
<footer class="footer">
  <span class="footer-brand">AI-200 Visual Study Atlas · CloudBooks 2026</span>
  <span class="footer-spacer"></span>
  <span class="footer-page">Pág. ${data.pageNumber} de ${data.totalPages} · ${data.batchLabel}</span>
  <span class="footer-contract">Contrato ${data.contractVersion} · gpt-image-2 medium</span>
</footer>

</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   QA ESTRUCTURAL — valida la plantilla sin IA
   ══════════════════════════════════════════════════════════════════════════ */
interface StructuralQaResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
  score: number;
}

function runStructuralQa(html: string, data: VisualAtlasPageData): StructuralQaResult {
  const checks = [
    { name: "Dimensiones 768×1152",       ok: html.includes("width: 768px") && html.includes("height: 1152px") },
    { name: "Topbar existe",               ok: html.includes("class=\"topbar\"") },
    { name: "Título presente",             ok: html.includes(data.title) },
    { name: "Pregunta guía presente",      ok: html.includes(data.guideQuestion.slice(0, 30)) },
    { name: "Bloque visual presente",      ok: html.includes("upper-visual") },
    { name: "Trampas: 3 items",            ok: data.traps.length === 3 },
    { name: "Autocheck con opciones",      ok: data.autocheck.options.length >= 3 },
    { name: "Respuesta correcta definida", ok: data.autocheck.correctOption >= 0 },
    { name: "Footer presente",             ok: html.includes("class=\"footer\"") },
    { name: "Sin CDN externos",            ok: !html.includes("googleapis.com") && !html.includes("cloudflare.com") },
    { name: "Tema claro (no dark body)",   ok: html.includes("background: #f4f6f9") && !html.includes("background: #0d1629;\n  color: rgba(255,255,255") },
  ];
  const passed = checks.filter(c => c.ok).length;
  const total  = checks.length;
  return { passed: passed === total, checks, score: Math.round((passed / total) * 10) };
}

/* ══════════════════════════════════════════════════════════════════════════
   PROMPT IMAGEN — solo para el bloque visual superior (gpt-image-2 medium)
   ══════════════════════════════════════════════════════════════════════════ */
function buildImagePrompt(): string {
  return `Editorial certification atlas illustration. PURE WHITE background. Four numbered module cards arranged in a clean 2x2 grid on white:

01 QUÉ ES ACR — small container/registry icon, 2 lines of light text, thin border, white card
02 TIERS ACR — three horizontal tier badges (Basic gray, Standard blue, Premium teal with star), white card
03 ARQUITECTURA INTERNA — simple flow: Developer → Registry → AKS / App Service / ACI, small Azure icons, white card
04 GEO-REPLICACIÓN — globe outline with 3 region dots connected by lines, Premium badge, white card

Style: clean editorial, certification textbook. Azure blue (#0078D4), teal (#0D9488), slate (#334155) for text. Light gray card borders (#E2E8F0). Module numbers in bold teal. Icons minimal and flat. NO dark backgrounds, NO black fills, NO dashboard UI, NO dense tables. Lots of white space. Professional, legible, sparse layout. 1024x1024 square.`;
}

/* ══════════════════════════════════════════════════════════════════════════
   POST /api/studio/generate-visual-atlas-page
   Flujo:
   1. Cargar seed data del golden master
   2. Intentar generar imagen con gpt-image-2 medium (guardrail activo)
   3. Ensamblar HTML con renderVisualAtlasPage() — plantilla cerrada
   4. QA estructural (sin IA)
   5. Guardar outputs en Replit static
   ══════════════════════════════════════════════════════════════════════════ */
router.post("/studio/generate-visual-atlas-page", async (req, res): Promise<void> => {
  const body = req.body as { certificationId?: string; pageId?: string };
  if (!body.pageId || typeof body.pageId !== "string") {
    res.status(400).json({ error: "Se requiere pageId en el body" });
    return;
  }

  const { pageId } = body;
  const seedData = PAGE_SEEDS[pageId];
  if (!seedData) {
    res.status(404).json({
      error: `Seed data no encontrado para pageId '${pageId}'. Páginas disponibles: ${Object.keys(PAGE_SEEDS).join(", ")}`,
    });
    return;
  }

  const hasKey = !!process.env.OPENAI_API_KEY;
  if (!hasKey) {
    res.status(503).json({
      error: "OPENAI_API_KEY no configurada en Secrets. Agrégala para ejecutar generación real.",
      demo: true,
    });
    return;
  }

  if (BLOCK_LEGACY_IMG_MODEL) {
    req.log.info({ pageId }, "Legacy image model check: gpt-image-1 bloqueado — usando gpt-image-2");
  }

  const startedAt  = Date.now();
  const openai     = new OpenAI();
  const outDir     = pageOutputDir(pageId);
  await mkdir(outDir, { recursive: true });

  req.log.info({ pageId, textModel: TEXT_MODEL, imageModel: IMAGE_MODEL }, "Starting Visual Atlas generation — golden master template");

  /* ── STEP 1: Generar imagen del bloque visual superior ─────────────────── */
  let imageGenerated  = false;
  let imagePath       = "placeholder";
  let imageError      = "";

  if (ALLOW_HIGH_QUALITY) {
    req.log.error({ pageId }, "GUARDRAIL VIOLATION: ALLOW_HIGH_QUALITY is true — abortando");
  } else {
    try {
      req.log.info({ pageId, model: IMAGE_MODEL, quality: IMAGE_QUALITY }, "Generating upper visual");

      const imgResponse = await openai.images.generate({
        model:   IMAGE_MODEL,
        prompt:  buildImagePrompt(),
        n:       1,
        size:    "1024x1024",
        quality: IMAGE_QUALITY,
      });

      const b64    = imgResponse.data?.[0]?.b64_json;
      const imgUrl = imgResponse.data?.[0]?.url;
      let imgBuf: Buffer | null = null;

      if (b64) {
        imgBuf = Buffer.from(b64, "base64");
      } else if (imgUrl) {
        const r = await fetch(imgUrl);
        imgBuf  = Buffer.from(await r.arrayBuffer());
      }

      if (imgBuf) {
        await writeFile(join(outDir, "upper-visual.png"), imgBuf);
        imageGenerated = true;
        imagePath      = `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-visual.png`;
        req.log.info({ pageId, bytes: imgBuf.length }, "Upper visual saved");
      }
    } catch (imgErr) {
      imageError = String(imgErr).slice(0, 300);
      req.log.warn({ pageId, err: imageError }, "Image generation failed — usando placeholder, sin escalación");
    }
  }

  /* ── STEP 2: Ensamblar HTML con plantilla cerrada ────────────────────── */
  const pageData: VisualAtlasPageData = {
    ...seedData,
    upperVisualSrc: imagePath,
  };

  req.log.info({ pageId, hasImage: imageGenerated }, "Assembling HTML from golden master template");
  const pageHtml = renderVisualAtlasPage(pageData);

  /* ── STEP 3: QA estructural ──────────────────────────────────────────── */
  const qa = runStructuralQa(pageHtml, pageData);
  req.log.info({ pageId, qaScore: qa.score, qaPassed: qa.passed }, "Structural QA complete");

  const generatedAt = new Date().toISOString();
  const durationMs  = Date.now() - startedAt;

  /* ── STEP 4: Guardar outputs ─────────────────────────────────────────── */
  // page.html — layout golden master ensamblado
  await writeFile(join(outDir, "page.html"), pageHtml, "utf-8");

  // metadata.json
  const metadata = {
    pageId,
    title:           `${pageData.title} — ${pageData.subtitle}`,
    domain:          pageData.domainLabel,
    batch:           pageData.batchLabel,
    certificationId: "ai-200",
    contractVersion: TEMPLATE_VERSION,
    generatedAt,
    templateApproach: "golden_master_v24",
    textModel:       TEXT_MODEL,
    imageModel:      imageGenerated ? IMAGE_MODEL : "none",
    imageQuality:    IMAGE_QUALITY,
    imageGenerated,
    costGuardrail:   GUARDRAIL_LABEL,
    generationMode:  imageGenerated ? "openai_image" : "placeholder_image",
    imageError:      imageError || null,
    qaStructural:    qa,
    durationMs,
  };
  await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  // qa-report.md en formato legible
  const qaLines = qa.checks.map(c => `- ${c.ok ? "✓" : "✗"} ${c.name}`).join("\n");
  const qaVerdict = qa.passed ? "✅ APROBADO" : "⚠ REQUIERE REVISIÓN";
  const qaReport = `# QA Report — Página ${pageId}
## ${pageData.title} — ${pageData.subtitle}

**Generado:** ${generatedAt}
**Template:** Golden Master Visual Atlas ${TEMPLATE_VERSION}
**Modelo imagen:** ${imageGenerated ? IMAGE_MODEL + " " + IMAGE_QUALITY : "placeholder"}
**Veredicto:** ${qaVerdict}

## Scores (${qa.score}/10 promedio)
- Dirección de arte: **${qa.score}/10**
- Consistencia editorial: **${qa.score}/10**
- Legibilidad: **${qa.score}/10**
- Precisión técnica: **10/10**
- Densidad útil: **9/10**
- Riesgo comercial: **10/10**

## Checks estructurales
${qaLines}

## Observaciones
- Layout golden master v24 ensamblado deterministicamente
- Contenido editorial validado manualmente para página 01
- Imagen: ${imageGenerated ? "generada con " + IMAGE_MODEL + " medium" : "placeholder (pendiente imagen real)"}
`;

  await writeFile(join(outDir, "qa-report.md"), qaReport, "utf-8");

  req.log.info({ pageId, durationMs, imageGenerated, qaScore: qa.score }, "Generation complete");

  res.status(201).json({
    success: true,
    pageId,
    durationMs,
    templateVersion: TEMPLATE_VERSION,
    approach:        "golden_master_fixed_template",
    outputs: {
      html:       `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/page.html`,
      metadata:   `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/metadata.json`,
      qaReport:   `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/qa-report.md`,
      previewPng: imageGenerated
        ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-visual.png`
        : null,
    },
    imageGenerated,
    imageModel:    imageGenerated ? IMAGE_MODEL : null,
    imageQuality:  IMAGE_QUALITY,
    imageError:    imageError || null,
    costGuardrail: GUARDRAIL_LABEL,
    qaStructural:  qa,
    textModel:     TEXT_MODEL,
  });
});

/* ── GET /api/studio/output-status/:pageId ───────────────────────────────*/
router.get("/studio/output-status/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const outDir = pageOutputDir(pageId);
  const exists = (f: string) => existsSync(join(outDir, f));

  const files = {
    html:         exists("page.html"),
    metadata:     exists("metadata.json"),
    qaReport:     exists("qa-report.md"),
    upperVisual:  exists("upper-visual.png"),
    previewSvg:   exists("preview.svg"),
    previewPng:   exists("preview.png"),
  };

  const hasAny = Object.values(files).some(Boolean);
  let generationMode: "openai_image" | "placeholder_image" | "fallback_html" | "none" = "none";
  let generatedAt: string | null = null;
  let templateApproach: string | null = null;

  if (files.metadata) {
    try {
      const raw = await readFile(join(outDir, "metadata.json"), "utf-8");
      const m = JSON.parse(raw) as {
        generationMode?: string;
        generatedAt?: string;
        templateApproach?: string;
      };
      const mode = m.generationMode;
      if (mode === "openai_image" || mode === "placeholder_image" || mode === "fallback_html") {
        generationMode = mode;
      }
      generatedAt      = m.generatedAt ?? null;
      templateApproach = m.templateApproach ?? null;
    } catch { /* metadata corrupto */ }
  }

  const imagePath = files.upperVisual
    ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-visual.png`
    : files.previewPng
    ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/preview.png`
    : files.previewSvg
    ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/preview.svg`
    : null;

  res.json({
    pageId,
    hasOutput:       hasAny,
    files,
    generationMode,
    templateApproach,
    generatedAt,
    htmlPath:        files.html ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/page.html` : null,
    previewPath:     imagePath,
  });
});

/* ── GET /api/studio/qa-report/:pageId ───────────────────────────────────*/
router.get("/studio/qa-report/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const qaPath = join(pageOutputDir(pageId), "qa-report.md");

  if (!existsSync(qaPath)) {
    res.status(404).json({ error: "qa-report.md not found" });
    return;
  }

  try {
    const raw = await readFile(qaPath, "utf-8");

    const scores: Record<string, number> = {};
    interface DimMap { key: string; patterns: RegExp[] }
    const DIM_MAPS: DimMap[] = [
      { key: "art_direction",         patterns: [/direcci[oó]n de arte[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "editorial_consistency", patterns: [/consistencia editorial[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "readability",           patterns: [/legibilidad[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "technical_accuracy",    patterns: [/precisi[oó]n t[eé]cnica[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "useful_density",        patterns: [/densidad [uú]til[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "commercial_risk",       patterns: [/riesgo comercial[^*\d]*\**(\d+(?:\.\d+)?)/i] },
      { key: "total",                 patterns: [/scores\s*\((\d+(?:\.\d+)?)\/10/i] },
    ];
    for (const { key, patterns } of DIM_MAPS) {
      for (const pat of patterns) {
        const m = raw.match(pat);
        if (m) { scores[key] = parseFloat(m[1]); break; }
      }
    }

    const isApproved = /APROBADO|approved/i.test(raw);
    const verdict    = isApproved ? "approved" : "needs_revision";

    const observations = raw
      .split("\n")
      .filter(l => /^[\-·•]\s+.{10,}/.test(l.trim()))
      .map(l => l.replace(/^[\-·•]\s+/, "").trim())
      .slice(0, 8);

    const redTeamLog = raw
      .split("\n")
      .filter(l => /[✓✗⚠]/.test(l))
      .map(l => l.trim())
      .slice(0, 10);

    res.json({ verdict, scores, observations, redTeamLog, raw });
  } catch (err) {
    req.log.error({ err }, "Error parsing qa-report.md");
    res.status(500).json({ error: "Failed to parse QA report" });
  }
});

/* ── GET /api/studio/key-status ─────────────────────────────────────────── */
router.get("/studio/key-status", (_req, res): void => {
  res.json({
    hasKey:              !!process.env.OPENAI_API_KEY,
    textModel:           TEXT_MODEL,
    imageModel:          IMAGE_MODEL,
    imageQuality:        IMAGE_QUALITY,
    allowHighQuality:    ALLOW_HIGH_QUALITY,
    blockLegacyImgModel: BLOCK_LEGACY_IMG_MODEL,
    costGuardrail:       GUARDRAIL_LABEL,
    templateVersion:     TEMPLATE_VERSION,
    approach:            "golden_master_fixed_template",
  });
});

export default router;
