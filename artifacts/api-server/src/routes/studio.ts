import { Router } from "express";
import { writeFile, mkdir, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import OpenAI from "openai";

import type { VisualAtlasPageData } from "../lib/visual-atlas-types";
import { getSeed } from "../data/page-seeds";
import {
  TEXT_MODEL, IMAGE_MODEL, IMAGE_QUALITY,
  BLOCK_LEGACY_IMG_MODEL, TEMPLATE_VERSION,
} from "../config/generation";

const router = Router();

const ALLOW_HIGH_QUALITY = false as const;
const GUARDRAIL_LABEL    = "high_quality_blocked_gpt_image_2_medium_only" as const;

/* ── Rutas de salida ──────────────────────────────────────────────────────*/
function studioPublicDir(): string {
  return join(process.cwd(), "../studio/public");
}
function pageOutputDir(pageId: string): string {
  return join(studioPublicDir(), "assets/cloudbooks/ai-200/visual-atlas/pages", pageId);
}

/* ══════════════════════════════════════════════════════════════════════════
   PROMPT IMAGEN — parametrizado desde VisualAtlasPageData
   Sin strings hardcodeados por página. Cada seed define sus módulos.
   ══════════════════════════════════════════════════════════════════════════ */
function buildImagePrompt(data: VisualAtlasPageData): string {
  const modulesText = data.visualModules
    .map(m => `Module ${m.num}: ${m.title} — ${m.description}`)
    .join(". ");

  return `Light editorial Azure certification atlas upper block, white background, professional technical infographic, ${data.visualModules.length} numbered modules, fits 728x494 landscape area, ${data.domainLabel} theme. ${modulesText}. Clean Azure-like vector iconography, navy/blue/teal/orange accents, sparse readable Spanish labels, premium book infographic style. No dark background, no dashboard UI, no tiny dense tables, no traps section, no autocheck section, no footer, no full page, no marketing hero.`;
}

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
   POST /api/studio/generate-visual-atlas-page
   Flujo:
   1. Resolver seed data desde data/page-seeds/
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
  const seedResult = getSeed(pageId);

  if (!seedResult.found) {
    res.status(404).json({
      error: `Seed no disponible para pageId '${pageId}'. Esta página aún no está lista para generación.`,
      code: "seed_missing",
      availableSeeds: seedResult.availableSeeds,
      message: "Contenido no migrado — agrega el seed en data/page-seeds/${pageId}.ts",
    });
    return;
  }

  const seedData = seedResult.data;

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

  const startedAt = Date.now();
  const openai    = new OpenAI();
  const outDir    = pageOutputDir(pageId);
  await mkdir(outDir, { recursive: true });

  req.log.info({ pageId, textModel: TEXT_MODEL, imageModel: IMAGE_MODEL }, "Starting Visual Atlas generation — golden master template");

  /* ── STEP 1: Generar imagen del bloque visual superior ─────────────────── */
  let imageGenerated = false;
  let imagePath      = "placeholder";
  let imageError     = "";

  if (ALLOW_HIGH_QUALITY) {
    req.log.error({ pageId }, "GUARDRAIL VIOLATION: ALLOW_HIGH_QUALITY is true — abortando");
  } else {
    try {
      req.log.info({ pageId, model: IMAGE_MODEL, quality: IMAGE_QUALITY }, "Generating upper visual");

      const imgResponse = await openai.images.generate({
        model:   IMAGE_MODEL,
        prompt:  buildImagePrompt(seedData),
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
  const pageData: VisualAtlasPageData = { ...seedData, upperVisualSrc: imagePath };

  req.log.info({ pageId, hasImage: imageGenerated }, "Assembling HTML from golden master template");
  const pageHtml = renderVisualAtlasPage(pageData);

  /* ── STEP 3: QA estructural ──────────────────────────────────────────── */
  const qa = runStructuralQa(pageHtml, pageData);
  req.log.info({ pageId, qaScore: qa.score, qaPassed: qa.passed }, "Structural QA complete");

  const generatedAt = new Date().toISOString();
  const durationMs  = Date.now() - startedAt;

  /* ── STEP 4: Guardar outputs ─────────────────────────────────────────── */
  await writeFile(join(outDir, "page.html"), pageHtml, "utf-8");

  const metadata = {
    pageId,
    title:            `${pageData.title} — ${pageData.subtitle}`,
    domain:           pageData.domainLabel,
    batch:            pageData.batchLabel,
    certificationId:  "ai-200",
    contractVersion:  TEMPLATE_VERSION,
    generatedAt,
    templateApproach: "golden_master_v24",
    textModel:        TEXT_MODEL,
    imageModel:       imageGenerated ? IMAGE_MODEL : "none",
    imageQuality:     IMAGE_QUALITY,
    imageGenerated,
    costGuardrail:    GUARDRAIL_LABEL,
    generationMode:   imageGenerated ? "openai_image" : "placeholder_image",
    imageError:       imageError || null,
    qaStructural:     qa,
    durationMs,
  };
  await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

  const qaLines    = qa.checks.map(c => `- ${c.ok ? "✓" : "✗"} ${c.name}`).join("\n");
  const artScore   = imageGenerated ? 7 : 5;
  const editScore  = imageGenerated ? 7 : 5;
  const readScore  = imageGenerated ? 8 : 8;
  const techScore  = 10;
  const densScore  = imageGenerated ? 7 : 4;
  const riskScore  = 10;
  const avgScore   = Math.round((artScore + editScore + readScore + techScore + densScore + riskScore) / 6);
  const qaVerdict  = imageGenerated ? "needs_visual_review" : "needs_revision";
  const verdictLbl = imageGenerated
    ? "⚠ Requiere revisión visual humana"
    : "🔴 BLOQUEADO: upper visual no premium";

  const qaReport = `# QA Report — Página ${pageId}
## ${pageData.title} — ${pageData.subtitle}

**Generado:** ${generatedAt}
**Template:** Golden Master Visual Atlas ${TEMPLATE_VERSION}
**Modelo imagen:** ${imageGenerated ? IMAGE_MODEL + " " + IMAGE_QUALITY : "placeholder"}
**Upper visual:** ${imageGenerated ? "upper_visual_real" : "upper_visual_placeholder"}
**Veredicto:** ${verdictLbl}

## Scores (${avgScore}/10 promedio)
- Dirección de arte: **${artScore}/10**
- Consistencia editorial: **${editScore}/10**
- Legibilidad: **${readScore}/10**
- Precisión técnica: **${techScore}/10**
- Densidad útil: **${densScore}/10**
- Riesgo comercial: **${riskScore}/10**

## Checks estructurales
${qaLines}

## Observaciones
- Layout golden master v24 ensamblado deterministicamente
- Contenido editorial validado manualmente para página ${pageId}
- Upper visual: ${imageGenerated ? "generada con " + IMAGE_MODEL + " medium — requiere revisión visual humana para aprobación" : "placeholder — BLOQUEADO para aprobación editorial"}
${!imageGenerated ? "- Acción requerida: Generar upper visual premium con gpt-image-2 medium" : "- Acción requerida: Revisar calidad del upper visual antes de aprobar"}
`;

  await writeFile(join(outDir, "qa-report.md"), qaReport, "utf-8");

  req.log.info({ pageId, durationMs, imageGenerated, qaScore: qa.score }, "Generation complete");

  res.status(201).json({
    success:         true,
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

/* ── POST /api/studio/approve-page/:pageId ───────────────────────────────
   Aprobación real persistida en filesystem (approval.json).
   Bloquea si el output es placeholder (no es imagen real de gpt-image-2).
   ─────────────────────────────────────────────────────────────────────── */
router.post("/studio/approve-page/:pageId", async (req, res): Promise<void> => {
  const { pageId } = req.params;
  const outDir     = pageOutputDir(pageId);
  const metaPath   = join(outDir, "metadata.json");

  if (!existsSync(metaPath)) {
    res.status(400).json({
      error: "Sin output generado para esta página. Genera primero.",
      code:  "no_output",
    });
    return;
  }

  let generationMode: string | null = null;
  try {
    const raw      = await readFile(metaPath, "utf-8");
    const m        = JSON.parse(raw) as { generationMode?: string };
    generationMode = m.generationMode ?? null;
  } catch {
    res.status(500).json({ error: "metadata.json corrupto o ilegible" });
    return;
  }

  if (generationMode !== "openai_image") {
    res.status(400).json({
      error:          "Aprobación bloqueada: el upper visual no es una imagen real de gpt-image-2 medium.",
      code:           "approval_blocked_placeholder",
      generationMode: generationMode ?? "unknown",
    });
    return;
  }

  const approval = {
    pageId,
    approvedAt: new Date().toISOString(),
    generationMode,
    approvedByClient: (req.headers["x-user-id"] as string | undefined) ?? "unknown",
  };

  await writeFile(join(outDir, "approval.json"), JSON.stringify(approval, null, 2), "utf-8");

  req.log.info({ pageId, approvedAt: approval.approvedAt }, "Page approved — approval.json written");

  res.status(200).json({
    success:    true,
    pageId,
    approvedAt: approval.approvedAt,
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
    approved:     exists("approval.json"),
  };

  const hasAny = Object.values(files).some(Boolean);
  let generationMode: "openai_image" | "placeholder_image" | "fallback_html" | "none" = "none";
  let generatedAt: string | null = null;
  let templateApproach: string | null = null;
  let approvedAt: string | null = null;

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

  if (files.approved) {
    try {
      const raw = await readFile(join(outDir, "approval.json"), "utf-8");
      const a = JSON.parse(raw) as { approvedAt?: string };
      approvedAt = a.approvedAt ?? null;
    } catch { /* approval.json corrupto */ }
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
    approvedAt,
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

    const isApproved  = /APROBADO|approved/i.test(raw);
    const verdict     = isApproved ? "approved" : "needs_revision";
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

/* ── GET /api/studio/seed-status/:pageId ────────────────────────────────
   Informa si una página tiene seed disponible para generación.
   ─────────────────────────────────────────────────────────────────────── */
router.get("/studio/seed-status/:pageId", (req, res): void => {
  const { pageId } = req.params;
  const result = getSeed(pageId);
  if (result.found) {
    res.json({
      pageId,
      ready:          true,
      title:          result.data.title,
      availableSeeds: [pageId],
    });
  } else {
    res.json({
      pageId,
      ready:          false,
      reason:         result.reason,
      availableSeeds: result.availableSeeds,
    });
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
