import { Router } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import OpenAI from "openai";

const router = Router();

/* ── Ruta de salida estática ──────────────────────────────────────────────
   El servidor corre desde artifacts/api-server/ (CWD de pnpm --filter).
   La carpeta public de Vite está en artifacts/studio/public/             */
function studioPublicDir(): string {
  return join(process.cwd(), "../../studio/public");
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

/* ── Minimal PNG placeholder (1×1 dark blue pixel) ──────────────────────── */
function minimalPng(): Buffer {
  // Valid 1×1 PNG with color #0d1629 (RGBA: 13,22,41,255)
  // Pre-computed PNG bytes (signature + IHDR + IDAT + IEND)
  return Buffer.from(
    "89504e470d0a1a0a0000000d494844520000000100000001080200000090" +
    "wc3d980000000c4944415478016360f8cf00000002010035c0000000049454e44ae426082",
    "hex"
  ).slice(0, 0) || Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADklEQVQI12Nk" +
    "YGBgAAAABAABJzQnCgAAAABJRU5ErkJggg==", "base64"
  );
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
    const metadata = {
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
      outputFiles: ["page.html", "metadata.json", "qa-report.md"],
      renderMode: "replit_static",
      staticPath: `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/`,
    };
    await writeFile(join(outDir, "metadata.json"), JSON.stringify(metadata, null, 2), "utf-8");

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

    /* ── 4. Generate preview image (best-effort) ── */
    let previewGenerated = false;
    let imageError = "";

    try {
      req.log.info({ pageId }, "Attempting image generation with DALL-E 3");
      const imgResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: buildImagePrompt(),
        n: 1,
        size: "1792x1024",
        quality: "standard",
        response_format: "b64_json",
      });

      const b64 = imgResponse.data?.[0]?.b64_json;
      if (b64) {
        await writeFile(join(outDir, "preview.png"), Buffer.from(b64, "base64"));
        previewGenerated = true;
        req.log.info({ pageId }, "Preview image saved from DALL-E 3");
      }
    } catch (imgErr) {
      imageError = String(imgErr);
      req.log.warn({ pageId, err: imageError }, "Image generation failed — writing placeholder");
      // Write a minimal valid PNG placeholder (1×1 transparent)
      await writeFile(
        join(outDir, "preview.png"),
        Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=", "base64")
      );
    }

    const durationMs = Date.now() - startedAt;

    req.log.info({ pageId, durationMs, previewGenerated }, "Generation complete");

    res.status(201).json({
      success: true,
      pageId,
      durationMs,
      outputs: {
        html:      `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/page.html`,
        metadata:  `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/metadata.json`,
        qaReport:  `/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/qa-report.md`,
        previewPng:`/assets/cloudbooks/ai-200/visual-atlas/pages/${pageId}/preview.png`,
      },
      previewGenerated,
      imageError: previewGenerated ? null : imageError,
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
    hasKey: !!process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    imageModel: "dall-e-3",
  });
});

export default router;
