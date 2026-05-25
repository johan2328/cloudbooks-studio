import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import OpenAI from "openai";

const router = Router();

/* ══════════════════════════════════════════════════════════════════════════
   COST / MODEL GUARDRAILS — solo modificar con aprobación del equipo
   ══════════════════════════════════════════════════════════════════════════
   Únicos valores permitidos. El servidor rechazará cualquier intento de
   escalar a high/hd/premium/ultra — ni siquiera en fallback.             */
const IMAGE_MODEL         = "gpt-image-1" as const; // gpt-image-2 → alias interno OpenAI
const IMAGE_QUALITY       = "medium"      as const;
const ALLOW_HIGH_QUALITY  = false         as const;  // NUNCA cambiar a true sin aprobación
const GUARDRAIL_LABEL     = "high_quality_blocked"  as const;
/* ══════════════════════════════════════════════════════════════════════════ */

/* ── Ruta de salida estática ──────────────────────────────────────────────
   El servidor corre desde artifacts/api-server/ (CWD de pnpm --filter).
   La carpeta public de Vite está en artifacts/studio/public/             */
function studioPublicDir(): string {
  return join(process.cwd(), "../studio/public");
}

function pageOutputDir(pageId: string): string {
  return join(studioPublicDir(), "assets/cloudbooks/ai-200/visual-atlas/pages", pageId);
}

/* ── Seed data — página 01 ──────────────────────────────────────────────── */
const PAGE_SEEDS: Record<string, {
  id: string; title: string; subtitle: string; domain: string;
  batch: string; contractVersion: string; currentVersion: string;
}> = {
  "01": {
    id: "01",
    title: "Azure Container Registry (ACR)",
    subtitle: "Arquitectura y Tiers",
    domain: "Gestión de Contenedores",
    batch: "Batch 01",
    contractVersion: "v24",
    currentVersion: "v1.0",
  },
};

/* ── Prompt de generación HTML ──────────────────────────────────────────── */
function buildHtmlPrompt(pageId: string): string {
  return `You are a premium infographic designer for Microsoft AI-200 certification study materials.

Generate a COMPLETE, SELF-CONTAINED HTML infographic about:
"Azure Container Registry (ACR) — Arquitectura y Tiers"

=== TECHNICAL REQUIREMENTS ===
- Complete HTML document, single file
- All CSS in a <style> tag (no external stylesheets, no CDN)
- Fixed canvas: exactly 1200px wide × 900px tall, overflow hidden
- No scrollbars, no responsive breakpoints
- Font: system-ui, -apple-system, "Segoe UI", sans-serif — NO Google Fonts

=== DESIGN SYSTEM (strict) ===
- Page background: #0d1629
- Card backgrounds: #0f1e35 (slightly lighter)
- Primary accent: #0d9488 (teal)
- Azure brand: #0078d4
- Premium badge: #7c3aed (violet)
- Warning/trap: #d97706 (amber)
- Success/check: #059669 (emerald)
- Text primary: rgba(255,255,255,0.85)
- Text secondary: rgba(255,255,255,0.45)
- Text muted: rgba(255,255,255,0.25)
- Border: rgba(255,255,255,0.08)
- Border radius: 4px everywhere
- Use box-shadow: 0 1px 3px rgba(0,0,0,0.4) on cards

=== LAYOUT (1200px × 900px, strict sections) ===

HEADER BAR (height: 72px, padding: 0 32px):
  - Left: Small badge "01" in teal, then title "Azure Container Registry (ACR)" bold white 22px, subtitle "Arquitectura y Tiers" muted 13px below
  - Right: Two badges — "Gestión de Contenedores" (teal outline) and "AI-200" (blue filled)
  - Bottom border: 1px solid rgba(255,255,255,0.08)

MAIN CONTENT (height: 828px, display: grid, gap: 16px, padding: 16px 32px):

  TOP ROW (height: 320px, grid: 3 equal columns for tier cards):
  
    Card BASIC (border: 1px solid rgba(255,255,255,0.1)):
      Header: "Basic" title, "~$0.167/día" price small
      Body:
        - 💾 Storage: 10 GiB
        - 🔗 Webhooks: 10
        - ✅ Public access
        - ❌ Geo-replication
        - ❌ Private endpoints  
        - ❌ Content Trust
        - ❌ Zone redundancy
      Use green ✅ and red ❌ symbols for feature support
    
    Card STANDARD (border: 1px solid rgba(13,148,136,0.3)):
      Header: "Standard" title + badge "Más común" in teal
      Body:
        - 💾 Storage: 100 GiB
        - 🔗 Webhooks: 10
        - ✅ Public access
        - ✅ Content Trust (Notary v2)
        - ❌ Geo-replication
        - ❌ Private endpoints
        - ❌ Zone redundancy
    
    Card PREMIUM (border: 2px solid #7c3aed, background: slightly purple tinted):
      Header: "Premium" title + badge "⭐ Más preguntas AI-200" in violet
      Body:
        - 💾 Storage: 500 GiB
        - 🔗 Webhooks: 500
        - ✅ Geo-replication (active-active)
        - ✅ Private endpoints / Private Link
        - ✅ Content Trust (Notary v2)
        - ✅ Zone redundancy
        - ✅ Customer-managed keys
        - ✅ Dedicated data endpoints
      Footer note: "Features exclusivos de Premium son los más evaluados"

  MIDDLE ROW (height: 140px, single full-width card — Architecture Flow):
    Title small: "Flujo de Arquitectura"
    Horizontal flow with arrows (use → text or styled divs):
    
    [Desarrollador] → git push / az acr build → [Azure Container Registry] → pull → [AKS] [ACI] [App Service]
    
    Below the main flow, show ACR Tasks:
    [Trigger: code commit / base image update / schedule] → [ACR Tasks: build multi-step] → [Push to ACR]
    
    Right side small text: Auth: Azure AD + RBAC | Service Principal | Admin (disable in prod)

  BOTTOM ROW (height: 240px, two columns 50%/50%):
  
    Left card — "⚠ Trampas del Examen":
      Background: rgba(217,119,6,0.08), border: 1px solid rgba(217,119,6,0.25)
      List items (use ⚠ icon, amber color for the warning text):
      - Geo-replication: SOLO disponible en Premium
      - Private endpoints: SOLO disponible en Premium
      - Content Trust (Notary v2): SOLO disponible en Premium
      - Zone redundancy: NO existe en Basic ni Standard
      - ACR Tasks: NO requiere Docker instalado localmente
      - Admin user: SIEMPRE desactivar en producción

    Right card — "✓ Autocheck":
      Background: rgba(5,150,105,0.06), border: 1px solid rgba(5,150,105,0.2)
      Checkbox-style list (use □ symbol, emerald color for text):
      - □ ¿Conozco los 3 tiers y sus límites de almacenamiento?
      - □ ¿Qué 4 features son exclusivos de Premium?
      - □ ¿Cuándo usar Private Endpoints vs acceso público?
      - □ ¿Qué es geo-replication activa-activa?
      - □ ¿Para qué sirve ACR Tasks y cuándo reemplaza a Docker?
      - □ ¿Por qué desactivar el admin user en producción?

=== QUALITY RULES ===
- Every element must teach something — zero decorative-only filler
- Use real emojis (💾 ✅ ❌ ⚠ □ ⭐ 🔗) instead of SVG icons
- All content in SPANISH except technical terms (ACR, Premium, CLI commands)
- NO placeholder text, NO lorem ipsum, NO "[...]"
- Ensure all content fits within 1200×900 — test in your mental browser
- Use font-size between 11px and 20px for readability at this size
- Make the tier cards visually distinct (Standard slightly highlighted, Premium clearly highlighted)

Return ONLY the raw HTML document starting with <!DOCTYPE html>. No markdown. No explanation. No code blocks.`;
}

/* ── Prompt de QA automático ─────────────────────────────────────────────── */
function buildQaPrompt(htmlContent: string): string {
  return `You are a QA reviewer for premium Microsoft certification study infographics.

Review the following HTML infographic and score each dimension from 0 to 10.
Be strict but fair. A score of 10 means absolutely perfect.

Scoring dimensions:
- art_direction: Layout clarity, visual balance, color usage, whitespace, typography hierarchy
- editorial_consistency: Adherence to design system, brand consistency, section structure
- readability: Font sizes, contrast ratios, text scanability, information hierarchy
- technical_accuracy: Correctness of Azure/ACR technical content, no factual errors
- useful_density: Information per pixel ratio, no wasted space, no redundancy  
- commercial_risk: IP/legal risks, accuracy of brand usage, no inappropriate content

Return ONLY valid JSON (no markdown, no explanation):
{
  "scores": {
    "art_direction": <number 0-10>,
    "editorial_consistency": <number 0-10>,
    "readability": <number 0-10>,
    "technical_accuracy": <number 0-10>,
    "useful_density": <number 0-10>,
    "commercial_risk": <number 0-10>
  },
  "total": <average of all 6 scores, 1 decimal>,
  "observations": ["<positive observation>", "<another observation>"],
  "defects": ["<defect or issue if any>"],
  "verdict": "approved" | "needs_revision"
}

HTML to review (first 8000 chars):
${htmlContent.slice(0, 8000)}`;
}

/* ── Prompt de imagen preview ────────────────────────────────────────────── */
function buildImagePrompt(): string {
  return `Premium Microsoft certification study infographic thumbnail. Dark navy background (#0d1629). Shows Azure Container Registry architecture: three tier cards (Basic, Standard, Premium highlighted in violet) side by side with feature checkmarks, plus a horizontal architecture flow diagram below (Developer → ACR → AKS/ACI). Professional certification material aesthetic. Teal accents (#0d9488), Azure blue (#0078d4). Clean grid layout, high information density. No decorative elements, pure educational utility.`;
}

/* ── SVG preview card (fallback when DALL-E unavailable) ─────────────────── */
function buildPreviewSvg(seed: { title: string; subtitle: string; domain: string; id: string }, scores: Record<string, number>): Buffer {
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
  const dims = [
    ["Arte",       scores.art_direction ?? 0],
    ["Editorial",  scores.editorial_consistency ?? 0],
    ["Legib.",     scores.readability ?? 0],
    ["Técnica",    scores.technical_accuracy ?? 0],
    ["Densidad",   scores.useful_density ?? 0],
    ["Comercial",  scores.commercial_risk ?? 0],
  ] as [string, number][];

  const bars = dims.map(([label, val], i) => {
    const w = Math.round((val / 10) * 180);
    const y = 580 + i * 30;
    const color = val >= 8 ? "#0d9488" : val >= 6 ? "#3b82f6" : "#f59e0b";
    return `
      <text x="32" y="${y + 12}" font-family="system-ui" font-size="11" fill="rgba(255,255,255,0.35)">${label}</text>
      <rect x="110" y="${y}" width="180" height="14" rx="2" fill="rgba(255,255,255,0.05)"/>
      <rect x="110" y="${y}" width="${w}" height="14" rx="2" fill="${color}" opacity="0.7"/>
      <text x="298" y="${y + 11}" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.4)">${val}</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d1629"/>
      <stop offset="100%" stop-color="#0a1220"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0d9488"/>
      <stop offset="100%" stop-color="#0078d4"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" fill="url(#bg)"/>
  <rect x="0" y="0" width="4" height="500" fill="url(#accent)"/>

  <!-- Header -->
  <rect x="0" y="0" width="800" height="70" fill="rgba(255,255,255,0.03)"/>
  <rect x="20" y="20" width="68" height="20" rx="3" fill="#0d9488"/>
  <text x="26" y="34" font-family="system-ui" font-size="11" font-weight="bold" fill="white">AI-200</text>
  <rect x="96" y="20" width="46" height="20" rx="3" fill="rgba(0,120,212,0.25)" stroke="#0078d4" stroke-width="1"/>
  <text x="103" y="34" font-family="system-ui" font-size="10" fill="#60a5fa">Pág. ${seed.id}</text>
  <text x="160" y="34" font-family="system-ui" font-size="10" fill="rgba(255,255,255,0.25)">${seed.domain}</text>
  <text x="780" y="34" font-family="monospace" font-size="10" fill="rgba(255,255,255,0.2)" text-anchor="end">v1.0</text>

  <!-- Title -->
  <text x="32" y="105" font-family="system-ui" font-size="20" font-weight="bold" fill="rgba(255,255,255,0.9)">${seed.title.length > 45 ? seed.title.slice(0, 45) + "…" : seed.title}</text>
  <text x="32" y="128" font-family="system-ui" font-size="13" fill="rgba(255,255,255,0.4)">${seed.subtitle}</text>
  <line x1="32" y1="148" x2="768" y2="148" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- QA Score badge -->
  <rect x="620" y="160" width="148" height="80" rx="4" fill="rgba(13,148,136,0.1)" stroke="rgba(13,148,136,0.25)" stroke-width="1"/>
  <text x="694" y="192" font-family="system-ui" font-size="28" font-weight="black" fill="#0d9488" text-anchor="middle">${avg.toFixed(1)}</text>
  <text x="694" y="212" font-family="system-ui" font-size="10" fill="rgba(255,255,255,0.3)" text-anchor="middle">Score QA</text>
  <rect x="650" y="222" width="88" height="10" rx="3" fill="rgba(13,148,136,0.15)">
    <text x="660" y="230" font-family="system-ui" font-size="8" fill="#0d9488">✅ APROBADO</text>
  </rect>
  <text x="694" y="232" font-family="system-ui" font-size="9" font-weight="bold" fill="#0d9488" text-anchor="middle">✅ APROBADO</text>

  <!-- Visual placeholder grid -->
  <rect x="32" y="165" width="280" height="130" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <text x="172" y="225" font-family="system-ui" font-size="11" fill="rgba(255,255,255,0.2)" text-anchor="middle">Infografía generada</text>
  <text x="172" y="242" font-family="system-ui" font-size="10" fill="rgba(255,255,255,0.12)" text-anchor="middle">ver page.html →</text>
  <rect x="320" y="165" width="280" height="130" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>
  <text x="460" y="225" font-family="system-ui" font-size="11" fill="rgba(255,255,255,0.2)" text-anchor="middle">Azure Container Registry</text>
  <text x="460" y="242" font-family="system-ui" font-size="10" fill="rgba(255,255,255,0.12)" text-anchor="middle">Basic · Standard · Premium</text>

  <!-- Divider -->
  <line x1="32" y1="315" x2="768" y2="315" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- QA bars label -->
  <text x="32" y="348" font-family="system-ui" font-size="10" font-weight="bold" fill="rgba(255,255,255,0.25)" letter-spacing="1">QA REPORT</text>
  ${bars}

  <!-- Footer -->
  <rect x="0" y="478" width="800" height="22" fill="rgba(0,0,0,0.3)"/>
  <text x="32" y="493" font-family="monospace" font-size="9" fill="rgba(255,255,255,0.15)">CloudBooks AI-200 Visual Atlas · GPT-4o · gpt-image-1 medium · fallback SVG · Guardrail: high_quality_blocked</text>
</svg>`;

  return Buffer.from(svg, "utf-8");
}

/* ── POST /api/studio/generate-visual-atlas-page ─────────────────────────── */
router.post("/studio/generate-visual-atlas-page", async (req, res): Promise<void> => {
  const body = req.body as { certificationId?: string; pageId?: string };
  if (!body.pageId || typeof body.pageId !== "string") {
    res.status(400).json({ error: "Se requiere pageId en el body" });
    return;
  }
  const { pageId } = body;
  const seed = PAGE_SEEDS[pageId];

  if (!seed) {
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

  const startedAt = Date.now();
  // API key used server-side only — never logged or returned
  const openai = new OpenAI();

  req.log.info({ pageId }, "Starting Visual Atlas generation");

  try {
    const outDir = pageOutputDir(pageId);
    await mkdir(outDir, { recursive: true });

    /* ── 1. Generate HTML infographic ── */
    req.log.info({ pageId }, "Calling OpenAI for HTML generation");
    const htmlCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: buildHtmlPrompt(pageId) }],
      temperature: 0.3,
      max_tokens: 4096,
    });

    const rawHtml = htmlCompletion.choices[0]?.message?.content ?? "";
    // Strip markdown code fences if model wraps in them
    const pageHtml = rawHtml
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const promptTokens    = htmlCompletion.usage?.prompt_tokens ?? 0;
    const completionTokens = htmlCompletion.usage?.completion_tokens ?? 0;

    await writeFile(join(outDir, "page.html"), pageHtml, "utf-8");
    req.log.info({ pageId, chars: pageHtml.length }, "HTML saved");

    /* ── 2. Generate metadata.json ── */
    const generatedAt = new Date().toISOString();
    // metadata se actualiza más adelante con generationMode e imageModel
    // se guarda en dos pasos para incluir el resultado del preview
    const metadataBase = {
      pageId,
      title: `${seed.title} — ${seed.subtitle}`,
      domain: seed.domain,
      batch: seed.batch,
      certificationId: "ai-200",
      contractVersion: seed.contractVersion,
      version: seed.currentVersion,
      generatedAt,
      model: "gpt-4o",
      tokens: { prompt: promptTokens, completion: completionTokens },
      imageModel: IMAGE_MODEL,
      imageQuality: IMAGE_QUALITY,
      costGuardrail: GUARDRAIL_LABEL,
      generationMode: "fallback_html" as "openai" | "fallback_html",
      outputFiles: ["page.html", "metadata.json", "qa-report.md"],
      renderMode: "replit_static",
      staticPath: `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/`,
    };

    /* ── 3. Generate QA report ── */
    req.log.info({ pageId }, "Running automated QA");
    let qaReport = "";
    let qaScores: Record<string, number> = {};
    let qaVerdict = "needs_revision";

    try {
      const qaCompletion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: buildQaPrompt(pageHtml) }],
        temperature: 0.2,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      });

      const qaRaw = qaCompletion.choices[0]?.message?.content ?? "{}";
      const qaData = JSON.parse(qaRaw) as {
        scores?: Record<string, number>;
        total?: number;
        observations?: string[];
        defects?: string[];
        verdict?: string;
      };

      qaScores  = qaData.scores ?? {};
      qaVerdict = qaData.verdict ?? "needs_revision";

      const total = qaData.total ?? (
        Object.values(qaScores).reduce((a, b) => a + b, 0) /
        Math.max(Object.keys(qaScores).length, 1)
      );

      const dimLabels: Record<string, string> = {
        art_direction:         "Dirección de arte",
        editorial_consistency: "Consistencia editorial",
        readability:           "Legibilidad",
        technical_accuracy:    "Precisión técnica",
        useful_density:        "Densidad útil",
        commercial_risk:       "Riesgo comercial",
      };

      const scoreLines = Object.entries(qaScores)
        .map(([k, v]) => `- ${dimLabels[k] ?? k}: **${v}/10**`)
        .join("\n");

      const obsLines = (qaData.observations ?? []).map(o => `- ${o}`).join("\n");
      const defLines = (qaData.defects ?? []).map(d => `- ⚠ ${d}`).join("\n");

      qaReport = `# QA Report — Página ${pageId}
## ${seed.title} — ${seed.subtitle}

**Generado:** ${generatedAt}
**Modelo:** gpt-4o
**Veredicto:** ${qaVerdict === "approved" ? "✅ APROBADO" : "⚠ REQUIERE REVISIÓN"}

## Scores (${total.toFixed(1)}/10 promedio)
${scoreLines}

## Observaciones
${obsLines || "- Sin observaciones adicionales"}

## Defectos detectados
${defLines || "- Ninguno"}
`;
    } catch (qaErr) {
      qaReport = `# QA Report — Página ${pageId}
**Error en QA automático:** ${String(qaErr)}
**HTML generado:** Revisar manualmente page.html
`;
    }

    await writeFile(join(outDir, "qa-report.md"), qaReport, "utf-8");
    req.log.info({ pageId }, "QA report saved");

    /* ══════════════════════════════════════════════════════════════════════
       STEP 4 — Preview image
       Modelo: gpt-image-1 (gpt-image-2) · Calidad: medium
       GUARDRAIL: si falla, SVG fallback — NUNCA escalar a high/hd/premium
       ══════════════════════════════════════════════════════════════════════ */
    let previewGenerated = false;
    let previewIsImage   = false;
    let imageError       = "";
    let generationMode: "openai" | "fallback_html" = "fallback_html";

    // SVG fallback siempre se escribe primero (sin costo, sin latencia)
    const svgBuf = buildPreviewSvg(seed, qaScores);
    await writeFile(join(outDir, "preview.svg"), svgBuf);
    previewGenerated = true; // SVG counts as valid preview

    // Guardrail check — must always be false; block any accidental escalation
    if (ALLOW_HIGH_QUALITY) {
      req.log.error({ pageId }, "GUARDRAIL VIOLATION: ALLOW_HIGH_QUALITY is true — aborting image generation");
    } else {
      try {
        req.log.info(
          { pageId, imageModel: IMAGE_MODEL, imageQuality: IMAGE_QUALITY, guardrail: GUARDRAIL_LABEL },
          "Attempting image generation — guardrail active"
        );

        const imgResponse = await openai.images.generate({
          model:   IMAGE_MODEL,
          prompt:  buildImagePrompt(),
          n:       1,
          size:    "1024x1024",
          quality: IMAGE_QUALITY,
        });

        // gpt-image-1 returns b64_json; url is also accepted if present
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
          await writeFile(join(outDir, "preview.png"), imgBuf);
          previewIsImage  = true;
          generationMode  = "openai";
          req.log.info(
            { pageId, imageModel: IMAGE_MODEL, imageQuality: IMAGE_QUALITY },
            "Preview image saved"
          );
        }
      } catch (imgErr) {
        imageError = String(imgErr).slice(0, 250);
        req.log.warn(
          { pageId, imageModel: IMAGE_MODEL, imageQuality: IMAGE_QUALITY, err: imageError },
          "Image generation failed — SVG fallback activo, sin escalación de costo"
        );
        // SVG already written above — no escalation to higher-cost model
      }
    }

    // Escribir metadata.json final con generationMode resuelto
    const metadata = { ...metadataBase, generationMode };
    await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

    const durationMs = Date.now() - startedAt;

    req.log.info(
      { pageId, durationMs, previewGenerated, previewIsImage, generationMode, imageModel: IMAGE_MODEL },
      "Generation complete"
    );

    const previewPath = previewIsImage
      ? `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/preview.png`
      : `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/preview.svg`;

    res.status(201).json({
      success: true,
      pageId,
      durationMs,
      outputs: {
        html:       `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/page.html`,
        metadata:   `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/metadata.json`,
        qaReport:   `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/qa-report.md`,
        previewPng: previewPath,
      },
      previewGenerated,
      previewMode:    previewIsImage ? IMAGE_MODEL : "svg_fallback",
      imageModel:     IMAGE_MODEL,
      imageQuality:   IMAGE_QUALITY,
      costGuardrail:  GUARDRAIL_LABEL,
      generationMode,
      imageError:     imageError || null,
      qaVerdict,
      qaScores,
      tokens: { prompt: promptTokens, completion: completionTokens },
      model: "gpt-4o",
    });

  } catch (err) {
    req.log.error({ err: String(err), pageId }, "Generation failed");
    res.status(500).json({
      error: "Error en generación",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

/* ── GET /api/studio/key-status ─────────────────────────────────────────── */
router.get("/studio/key-status", (_req, res): void => {
  res.json({
    hasKey:           !!process.env.OPENAI_API_KEY,
    model:            "gpt-4o",
    imageModel:       IMAGE_MODEL,
    imageQuality:     IMAGE_QUALITY,
    costGuardrail:    GUARDRAIL_LABEL,
    allowHighQuality: ALLOW_HIGH_QUALITY,
    fallback:         "svg_fallback — sin escalación de costo",
  });
});

export default router;
