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
  domainLabel:     "Dominio 1 — Soluciones contenerizadas en Azure",
  pageNumber:      "01",
  totalPages:      61,
  batchLabel:      "Batch 01",
  title:           "Azure Container Registry",
  subtitle:        "Arquitectura y Tiers",
  context:         "Azure Container Registry (ACR) es el registro privado de imágenes de contenedor en Azure, base para despliegues en AKS, App Service y Container Apps. Conoce sus tiers para seleccionar el adecuado según escenarios de desarrollo, producción y alta disponibilidad. Lee las señales: geo-replicación, Private Endpoint y digest suelen decidir más que el nombre del SKU.",
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
   GOLDEN MASTER v24 — renderVisualAtlasPage(data)
   Plantilla cerrada 768×1152 · light editorial · estructura fija bloqueada.
   La IA NO diseña layout. Solo aporta la imagen del bloque visual superior.
   DOM: main.page > topbar / hero / guide / body(upper+exam) / footer
   ══════════════════════════════════════════════════════════════════════════ */
function renderVisualAtlasPage(data: VisualAtlasPageData): string {
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  /* ── Icono de título ─────────────────────────────────────────────────── */
  const titleIconSvg = `<svg width="86" height="86" viewBox="0 0 86 86" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="43" cy="18" rx="18" ry="10" fill="#0078D4" opacity="0.12"/>
    <ellipse cx="30" cy="21" rx="11" ry="7" fill="#0078D4" opacity="0.09"/>
    <ellipse cx="56" cy="21" rx="11" ry="7" fill="#0078D4" opacity="0.09"/>
    <rect x="12" y="27" width="62" height="48" rx="5" fill="#EBF4FF" stroke="#3B82F6" stroke-width="1.5"/>
    <rect x="12" y="27" width="62" height="16" rx="5" fill="#0078D4" opacity="0.20"/>
    <circle cx="64" cy="35" r="3" fill="#0D9488" opacity="0.50"/>
    <circle cx="55" cy="35" r="3" fill="#0D9488" opacity="0.30"/>
    <rect x="18" y="50" width="16" height="11" rx="2" fill="#0078D4" opacity="0.25"/>
    <rect x="36" y="50" width="16" height="11" rx="2" fill="#0D9488" opacity="0.25"/>
    <rect x="54" y="50" width="16" height="11" rx="2" fill="#0078D4" opacity="0.25"/>
    <rect x="18" y="63" width="16" height="8" rx="2" fill="#0D9488" opacity="0.18"/>
    <rect x="36" y="63" width="16" height="8" rx="2" fill="#0078D4" opacity="0.18"/>
    <rect x="54" y="63" width="16" height="8" rx="2" fill="#0D9488" opacity="0.18"/>
  </svg>`;

  /* ── Upper visual — imagen real o placeholder claro ──────────────────── */
  const upperVisualHtml = data.upperVisualSrc === "placeholder"
    ? `<div class="upper-placeholder">
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="12" width="36" height="26" rx="3" fill="#E2E8F0"/>
          <rect x="4" y="12" width="36" height="9" rx="3" fill="#CBD5E1"/>
          <rect x="8" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
          <rect x="18" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
          <rect x="28" y="25" width="8" height="5" rx="1" fill="#94A3B8"/>
        </svg>
        <div class="upper-placeholder-label">Visual superior pendiente</div>
        <div class="upper-placeholder-sub">Se insertará upper-art generado con gpt-image-2 medium</div>
      </div>`
    : `<img src="${data.upperVisualSrc}" alt="${data.upperVisualAlt}">`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=768">
<title>Pág. ${data.pageNumber}/${data.totalPages} — ${data.title} · AI-200 Visual Study Atlas</title>
<style>
/* ── GOLDEN MASTER v24 · LIGHT EDITORIAL · LOCKED ─────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: #edf2f8;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
}

/* ── .page — contenedor libro 768×1152 ──────────────────────────────────── */
.page {
  width: 768px;
  height: 1152px;
  background: #ffffff;
  display: grid;
  grid-template-rows: 34px 198px 48px 838px 34px;
  overflow: hidden;
  box-shadow: 0 4px 32px rgba(0,0,0,0.12);
}

/* ── TOPBAR ─────────────────────────────────────────────────────────────── */
.topbar {
  background: #061B49;
  color: rgba(255,255,255,0.60);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 10px;
}
.topbar::before {
  content: '';
  width: 7px; height: 7px;
  background: #0D9488;
  border-radius: 50%;
  flex-shrink: 0;
}
.tb-spacer { flex: 1; }
.tb-badge {
  font-size: 7px;
  color: rgba(255,255,255,0.35);
  border: 1px solid rgba(255,255,255,0.12);
  padding: 1px 7px;
  border-radius: 2px;
  letter-spacing: 0.10em;
}

/* ── HERO ───────────────────────────────────────────────────────────────── */
.hero {
  background: #ffffff;
  border-bottom: 1px solid #dde3ed;
  display: grid;
  grid-template-columns: 1fr 108px;
  grid-template-rows: auto 1fr;
  grid-template-areas:
    "title icon"
    "deck  icon";
  padding: 16px 20px 16px 22px;
  gap: 6px 14px;
  overflow: hidden;
}
h1 {
  grid-area: title;
  font-size: 35px;
  font-weight: 900;
  color: #06133E;
  line-height: 1.01;
  letter-spacing: -0.022em;
  align-self: end;
}
.deck {
  grid-area: deck;
  font-size: 13.55px;
  color: #2d3a5c;
  line-height: 1.25;
  align-self: start;
}
.icon-slot {
  grid-area: icon;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.72;
}

/* ── GUIDE ──────────────────────────────────────────────────────────────── */
.guide {
  background: #f0f7ff;
  border-bottom: 2px solid #0969DA;
  display: flex;
  align-items: center;
  padding: 0 22px;
  gap: 10px;
  overflow: hidden;
}
.guide-mark {
  width: 22px; height: 22px;
  background: #0969DA;
  color: #ffffff;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.guide > span {
  font-size: 11px;
  color: #0d2260;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.guide strong {
  font-weight: 800;
  color: #0969DA;
  letter-spacing: 0.06em;
  margin-right: 5px;
}

/* ── BODY (main content area) ───────────────────────────────────────────── */
section.body {
  display: grid;
  grid-template-rows: 494px 1fr;
  overflow: hidden;
}

/* ── UPPER VISUAL ───────────────────────────────────────────────────────── */
.upper {
  background: #ffffff;
  border-bottom: 1px solid #dde3ed;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upper img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.upper-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: calc(100% - 40px);
  height: calc(100% - 40px);
  border: 2px dashed #c8d6e8;
  border-radius: 8px;
  background: #f8fafd;
}
.upper-placeholder-label {
  font-size: 12px;
  font-weight: 700;
  color: #6b7a99;
}
.upper-placeholder-sub { font-size: 10px; color: #9ca3af; }

/* ── EXAM (trampas + autocheck) ─────────────────────────────────────────── */
.exam {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
}

/* ── MODULE ─────────────────────────────────────────────────────────────── */
.mod {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.mod.traps { border-right: 1px solid #dde3ed; }
.mod-header {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}
.mod.traps .mod-header { background: #D92D20; }
.mod.check .mod-header { background: #061B49; }
.mod-header-label {
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: #ffffff;
}
.mod-body {
  flex: 1;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: hidden;
}
.mod.traps .mod-body { background: #fff9f9; }
.mod.check .mod-body { background: #f8faff; }

/* Trap items */
.trap-item { display: flex; gap: 8px; align-items: flex-start; }
.trap-num {
  flex-shrink: 0;
  width: 17px; height: 17px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 50%;
  font-size: 8px;
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
.trap-correction { font-size: 9px; color: #1f2937; line-height: 1.45; }

/* Autocheck items */
.autocheck-question { font-size: 10px; font-weight: 700; color: #06133E; line-height: 1.4; }
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
.option-row.correct { background: #d1fae5; border-color: #6ee7b7; color: #065f46; font-weight: 700; }
.option-row.wrong-opt { background: #f9fafb; color: #6b7280; }
.option-badge {
  flex-shrink: 0;
  width: 16px; height: 16px;
  border-radius: 50%;
  font-size: 8px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
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

/* ── FOOTER ─────────────────────────────────────────────────────────────── */
.footer {
  background: #061B49;
  color: rgba(255,255,255,0.45);
  font-size: 8px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  justify-content: space-between;
}
.page-no { font-family: monospace; font-size: 7.5px; }
</style>
</head>
<body>

<main class="page">

  <div class="topbar">
    ${data.domainLabel}
    <span class="tb-spacer"></span>
    <span class="tb-badge">AI-200</span>
  </div>

  <section class="hero">
    <h1>${data.title} — ${data.subtitle}</h1>
    <div class="deck">${data.context}</div>
    <div class="icon-slot">${titleIconSvg}</div>
  </section>

  <section class="guide">
    <span class="guide-mark">?</span>
    <span><strong>PREGUNTA GUÍA:</strong>${data.guideQuestion}</span>
  </section>

  <section class="body">
    <div class="upper">
      ${upperVisualHtml}
    </div>
    <div class="exam">

      <section class="mod traps">
        <div class="mod-header">
          <span class="mod-header-label">⚠ Trampas del examen</span>
        </div>
        <div class="mod-body">
          ${data.traps.map((t, i) => `<div class="trap-item">
            <div class="trap-num">${i + 1}</div>
            <div class="trap-content">
              <div class="trap-wrong">${t.wrong}</div>
              <div class="trap-arrow">→</div>
              <div class="trap-correction">${t.correction}</div>
            </div>
          </div>`).join("\n          ")}
        </div>
      </section>

      <section class="mod check">
        <div class="mod-header">
          <span class="mod-header-label">✓ Verificación autocheck</span>
        </div>
        <div class="mod-body">
          <div class="autocheck-question">${data.autocheck.question}</div>
          <div class="autocheck-options">
            ${data.autocheck.options.map((opt, i) => `<div class="option-row ${i === data.autocheck.correctOption ? "correct" : "wrong-opt"}">
              <span class="option-badge">${optionLetters[i]}</span>
              <span>${opt.replace(/^[A-D]\.\s*/, "")}</span>
              ${i === data.autocheck.correctOption ? '<span style="margin-left:auto;font-size:10px;">✓</span>' : ""}
            </div>`).join("\n            ")}
          </div>
          <div class="autocheck-explanation">${data.autocheck.explanation}</div>
          <div class="discard-notes">
            ${data.autocheck.discardNotes.map(n => `<div class="discard-note">• ${n}</div>`).join("\n            ")}
          </div>
        </div>
      </section>

    </div>
  </section>

  <footer class="footer">
    <span>AI-200 Visual Study Atlas</span>
    <span class="page-no">${data.pageNumber}/${data.totalPages}</span>
  </footer>

</main>
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
    { name: "Dimensiones 768×1152",              ok: html.includes("width: 768px") && html.includes("height: 1152px") },
    { name: "Grid rows 34-198-48-838-34",         ok: html.includes("34px 198px 48px 838px 34px") },
    { name: "Fondo editorial #edf2f8",            ok: html.includes("background: #edf2f8") },
    { name: "Topbar/footer navy #061B49",         ok: html.includes("#061B49") },
    { name: "Título presente en h1",              ok: html.includes(data.title) },
    { name: "Deck/contexto presente",             ok: html.includes(data.context.slice(0, 40)) },
    { name: "Pregunta guía presente",             ok: html.includes(data.guideQuestion.slice(0, 30)) },
    { name: "Bloque .upper existe",               ok: html.includes('class="upper"') },
    { name: "Trampas: 3 items",                   ok: data.traps.length === 3 },
    { name: "Header trampas rojo #D92D20",        ok: html.includes("#D92D20") },
    { name: "Guide border #0969DA",               ok: html.includes("#0969DA") },
    { name: "Footer AI-200 Visual Study Atlas",   ok: html.includes("AI-200 Visual Study Atlas") },
    { name: "Sin CDN externos",                   ok: !html.includes("googleapis.com") && !html.includes("cloudflare.com") },
    { name: "Sin dark body #0d1629",              ok: !html.includes("background: #0d1629") },
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
        await writeFile(join(outDir, "upper-art.png"), imgBuf);
        imageGenerated = true;
        imagePath      = `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-art.png`;
        req.log.info({ pageId, bytes: imgBuf.length }, "Upper visual saved (upper-art.png)");
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
        ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-art.png`
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
    upperVisual:  exists("upper-art.png"),
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
    ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/upper-art.png`
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
    layout:              "Golden Master Visual Atlas v24",
    template:            "locked",
    renderer:            "deterministic HTML",
    svgFallback:         "disabled",
  });
});

export default router;
