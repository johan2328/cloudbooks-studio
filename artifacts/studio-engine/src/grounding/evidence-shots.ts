import puppeteer, { type Browser } from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../config.js";
import { atomicWriteFileSync } from "../fs-safe.js";
import { getOutline } from "../skills/ai-200-outline.js";

/**
 * EVIDENCIA DE FUENTES (capturas oficiales). Recibo visual de que el grounding
 * llegó a la página REAL de cada ruta de aprendizaje en MS Learn: navega con el
 * Chrome headless que el motor ya tiene (puppeteer-core, config.chromePath, el
 * mismo del render/PDF — sin sumar dependencias), descarta el banner de cookies,
 * y guarda un PNG + metadata (URL, título, fecha, git commit de la página).
 *
 * Es prueba de ALCANCE (llegamos al sitio correcto), no de grounding correcto
 * (eso lo da el verificador). El git_commit_id es una garantía extra: las páginas
 * de Learn son YAML versionado en GitHub.
 */
export interface EvidenceShot {
  id: string;                // id de ruta (p1..p9)
  label: string;             // etiqueta de la ruta
  url: string;               // URL oficial de la ruta
  title: string | null;      // <title> de la página real
  imagePath: string | null;  // ruta pública del PNG (servida por Vite)
  gitCommit: string | null;  // commit de la página (prueba extra)
  capturedAt: string;
  ok: boolean;
  error: string | null;
}
export interface EvidenceResult {
  available: boolean;
  shots: EvidenceShot[];
  capturedAt: string | null;
  error: string | null;
}

function evidenceDir(): string { return path.join(CONFIG.outputRoot, "evidence"); }
function evidencePublic(id: string): string { return `${CONFIG.publicAssetsBase}/evidence/${id}.png`; }
function storePath(): string { return path.join(CONFIG.outputRoot, "_evidence.json"); }

/** Último set de capturas (lo que muestra el panel). */
export function listEvidence(): EvidenceResult {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as EvidenceResult; }
  catch { return { available: false, shots: [], capturedAt: null, error: null }; }
}

/** Captura las 9 rutas de aprendizaje del outline. Una sola corrida (batch). */
export async function captureEvidence(): Promise<EvidenceResult> {
  if (!CONFIG.chromePath) return { available: false, shots: [], capturedAt: null, error: "Sin Chrome headless (config.chromePath). Instalá Chrome/Edge o seteá ENGINE_CHROME_PATH." };
  const targets = getOutline().domains.filter((d) => d.url).map((d) => ({ id: d.id, label: d.label, url: d.url! }));
  fs.mkdirSync(evidenceDir(), { recursive: true });

  let browser: Browser;
  try {
    browser = await puppeteer.launch({ executablePath: CONFIG.chromePath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  } catch (err) {
    return { available: false, shots: [], capturedAt: null, error: `launch falló: ${String((err as Error)?.message ?? err)}` };
  }

  const capturedAt = new Date().toISOString();
  const shots: EvidenceShot[] = [];
  for (const t of targets) {
    const shot: EvidenceShot = { id: t.id, label: t.label, url: t.url, title: null, imagePath: null, gitCommit: null, capturedAt, ok: false, error: null };
    let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 1500, deviceScaleFactor: 1 });
      await page.goto(t.url, { waitUntil: "networkidle2", timeout: 30000 });
      // título + git commit desde el DOM (evaluate en STRING para evitar el bug __name de tsx)
      shot.title = await page.title().catch(() => null);
      shot.gitCommit = await page.evaluate(
        "(function(){var m=document.querySelector('meta[name=\\\"git_commit_id\\\"]');return m?m.getAttribute('content'):null;})()",
      ).catch(() => null) as string | null;
      // descartar banner de cookies (OneTrust) si aparece
      try {
        await page.evaluate("(function(){var b=document.querySelector('#onetrust-accept-btn-handler');if(b)b.click();})()");
        await new Promise((r) => setTimeout(r, 500));
      } catch { /* sin banner */ }
      const buf = await page.screenshot({ type: "png", fullPage: true });
      fs.writeFileSync(path.join(evidenceDir(), `${t.id}.png`), buf);
      shot.imagePath = evidencePublic(t.id);
      shot.ok = true;
    } catch (err) {
      shot.error = String((err as Error)?.message ?? err);
    } finally {
      if (page) { try { await page.close(); } catch { /* ignore */ } }
    }
    shots.push(shot);
  }
  try { await closeBrowserHard(browser); } catch { /* ignore */ }

  const result: EvidenceResult = { available: true, shots, capturedAt, error: null };
  atomicWriteFileSync(storePath(), JSON.stringify(result, null, 2), "evidence");
  return result;
}
