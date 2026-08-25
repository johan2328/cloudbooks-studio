import puppeteer, { type Browser } from "puppeteer-core";
import { CONFIG } from "../config.js";
import { closeBrowserHard } from "./browser-util.js";

/**
 * QA RENDERIZADA (verdad, no estimación): renderiza el HTML en un Chrome real
 * y MIDE el desborde/truncado por zona (scrollHeight > clientHeight). Es lo que
 * convierte "10/10 mentiroso" en una falla real cuando el contenido se corta.
 * Browser único reusado; graceful si no hay Chrome (available:false).
 */

let browserP: Promise<Browser | null> | null = null;

async function getBrowser(): Promise<Browser | null> {
  if (!CONFIG.chromePath) return null;
  if (!browserP) {
    browserP = puppeteer
      .launch({ executablePath: CONFIG.chromePath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] })
      .catch((err) => { console.error("[headless] launch failed:", err); browserP = null; return null; });
  }
  return browserP;
}

export async function closeBrowser(): Promise<void> {
  const b = browserP ? await browserP : null;
  browserP = null;
  if (b) { try { await closeBrowserHard(b); } catch { /* ignore */ } }
}

/**
 * Screenshot de la página renderizada (elemento .page) para que el director de
 * maquetación la JUZGUE con visión. El bloque visual usa aspect-ratio, así que
 * su alto es correcto aunque la imagen no cargue por setContent → el balance/aire
 * se ve bien. Devuelve PNG, o null si no hay Chrome.
 */
export async function renderShot(html: string): Promise<Buffer | null> {
  const browser = await getBrowser();
  if (!browser) return null;
  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 768, height: 1152, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
    const el = await page.$(".page");
    if (!el) return null;
    return Buffer.from(await el.screenshot({ type: "png" }));
  } catch {
    return null;
  } finally {
    if (page) { try { await page.close(); } catch { /* ignore */ } }
  }
}

export interface RenderInspect {
  available: boolean;
  overflow: boolean;                              // alguna zona trunca/desborda
  overflows: { zone: string; overBy: number }[];  // px que se pierden por zona
  pageOverflow: boolean;                          // el contenido excede el lienzo
  error: string | null;
}

const ZONES = [
  { sel: ".ctx", zone: "contexto (hero)" },
  { sel: ".exp", zone: "explicación (autocheck)" },
  { sel: ".cdesc", zone: "descripción de tarjeta" },
  { sel: ".traps", zone: "rail de trampas" },
  { sel: ".auto", zone: "rail de autocheck" },
  { sel: ".upper", zone: "bloque visual" },
  { sel: ".hero", zone: "hero" },
];

export async function renderInspect(html: string): Promise<RenderInspect> {
  const browser = await getBrowser();
  if (!browser) return { available: false, overflow: false, overflows: [], pageOverflow: false, error: "headless no disponible (sin Chrome)" };
  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: 768, height: 1152 });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 10000 });
    const data = await page.evaluate((zones: { sel: string; zone: string }[]) => {
      const doc = (globalThis as unknown as { document: { querySelector(s: string): { scrollHeight: number; clientHeight: number } | null } }).document;
      const out: { zone: string; overBy: number }[] = [];
      for (const z of zones) {
        const el = doc.querySelector(z.sel);
        if (el) { const over = el.scrollHeight - el.clientHeight; if (over > 2) out.push({ zone: z.zone, overBy: over }); }
      }
      const pageEl = doc.querySelector(".page");
      const pageOverflow = pageEl ? pageEl.scrollHeight > pageEl.clientHeight + 2 : false;
      return { overflows: out, pageOverflow };
    }, ZONES);
    return { available: true, overflow: data.overflows.length > 0, overflows: data.overflows, pageOverflow: data.pageOverflow, error: null };
  } catch (err) {
    return { available: true, overflow: false, overflows: [], pageOverflow: false, error: String((err as Error)?.message ?? err) };
  } finally {
    if (page) { try { await page.close(); } catch { /* ignore */ } }
  }
}
