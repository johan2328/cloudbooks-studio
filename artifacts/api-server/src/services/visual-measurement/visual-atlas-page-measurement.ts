import { pathToFileURL } from "url";

export interface VisualMeasurementRect {
  x: number;
  y: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}
export interface VisualMeasurementZoneUsage {
  usedHeight: number;
  freeBottomPx: number;
  occupancyPct: number;
}

export interface VisualMeasurementOverflowExample {
  tag: string;
  className: string;
  text: string;
  horizontalOverflowPx: number;
  verticalOverflowPx: number;
}

export interface VisualAtlasPageVisualMeasurement {
  version: "visual-measurement-v1";
  available: boolean;
  renderer: "playwright" | "unavailable";
  screenshotFile: string | null;
  page: {
    width: number;
    height: number;
    scrollWidth: number;
    scrollHeight: number;
    horizontalOverflowPx: number;
    verticalOverflowPx: number;
  };
  zones: Record<string, VisualMeasurementRect | null>;
  zoneUsage: Record<string, VisualMeasurementZoneUsage | null>;
  typography: {
    minFontPx: number | null;
    smallTextCount: number;
  };
  overflow: {
    count: number;
    examples: VisualMeasurementOverflowExample[];
  };
  warnings: string[];
  blockers: string[];
  score: number;
  note: string;
}

interface Logger {
  warn(obj: Record<string, unknown>, msg: string): void;
}

interface MeasureVisualAtlasPageArgs {
  htmlFilePath: string;
  screenshotFilePath: string;
  pageWidth: number;
  pageHeight: number;
  log: Logger;
}

interface PlaywrightBrowser {
  newPage(options: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<PlaywrightPage>;
  close(): Promise<void>;
}

interface PlaywrightPage {
  goto(url: string, options: { waitUntil: "load" | "networkidle"; timeout: number }): Promise<unknown>;
  evaluate<T>(script: string): Promise<T>;
  screenshot(options: { path: string; fullPage: boolean; animations: "disabled" }): Promise<unknown>;
  close(): Promise<void>;
}

interface PlaywrightModule {
  chromium: {
    launch(options: { headless: boolean }): Promise<PlaywrightBrowser>;
  };
}

interface BrowserMeasurementRaw {
  page: VisualAtlasPageVisualMeasurement["page"];
  zones: Record<string, VisualMeasurementRect | null>;
  zoneUsage: Record<string, VisualMeasurementZoneUsage | null>;
  typography: VisualAtlasPageVisualMeasurement["typography"];
  overflow: VisualAtlasPageVisualMeasurement["overflow"];
}

const MEASURE_SCRIPT = `(() => {
  const round = (value) => Math.round(value * 10) / 10;
  const rectToJson = (rect) => ({
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    bottom: round(rect.bottom),
    right: round(rect.right)
  });
  const pageEl = document.querySelector(".page") || document.body;
  const pageRect = pageEl.getBoundingClientRect();
  const zoneNames = ["topbar", "hero", "guide", "body", "upper_visual", "exam_rail", "footer"];
  const zones = {};
  const zoneUsage = {};
  for (const name of zoneNames) {
    const el = document.querySelector('[data-zone="' + name + '"]');
    if (!el) {
      zones[name] = null;
      zoneUsage[name] = null;
      continue;
    }
    const rect = el.getBoundingClientRect();
    zones[name] = rectToJson(rect);
    const children = Array.from(el.children)
      .map((child) => child.getBoundingClientRect())
      .filter((childRect) => childRect.width > 2 && childRect.height > 2);
    if (children.length === 0) {
      zoneUsage[name] = { usedHeight: 0, freeBottomPx: round(rect.height), occupancyPct: 0 };
      continue;
    }
    const minTop = Math.min(...children.map((childRect) => childRect.top));
    const maxBottom = Math.max(...children.map((childRect) => childRect.bottom));
    const usedHeight = Math.max(0, maxBottom - minTop);
    zoneUsage[name] = {
      usedHeight: round(usedHeight),
      freeBottomPx: round(Math.max(0, rect.bottom - maxBottom)),
      occupancyPct: rect.height > 0 ? round((usedHeight / rect.height) * 100) : 0
    };
  }
  const visibleElements = Array.from(document.querySelectorAll("*"))
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 3 && rect.height > 3 && style.visibility !== "hidden" && style.display !== "none";
    });
  const overflowExamples = [];
  for (const el of visibleElements) {
    const horizontalOverflowPx = Math.max(0, el.scrollWidth - el.clientWidth);
    const verticalOverflowPx = Math.max(0, el.scrollHeight - el.clientHeight);
    if (horizontalOverflowPx > 2 || verticalOverflowPx > 2) {
      overflowExamples.push({
        tag: el.tagName.toLowerCase(),
        className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
        text: (el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 100),
        horizontalOverflowPx: round(horizontalOverflowPx),
        verticalOverflowPx: round(verticalOverflowPx)
      });
    }
    if (overflowExamples.length >= 8) break;
  }
  let minFontPx = null;
  let smallTextCount = 0;
  for (const el of visibleElements) {
    const text = (el.textContent || "").replace(/\\s+/g, " ").trim();
    if (text.length < 2 || el.children.length > 0) continue;
    const fontSize = parseFloat(window.getComputedStyle(el).fontSize || "0");
    if (!Number.isFinite(fontSize) || fontSize <= 0) continue;
    minFontPx = minFontPx == null ? fontSize : Math.min(minFontPx, fontSize);
    if (fontSize < 7.5) smallTextCount += 1;
  }
  return {
    page: {
      width: round(pageRect.width),
      height: round(pageRect.height),
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      horizontalOverflowPx: round(Math.max(0, document.documentElement.scrollWidth - pageRect.width)),
      verticalOverflowPx: round(Math.max(0, document.documentElement.scrollHeight - pageRect.height))
    },
    zones,
    zoneUsage,
    typography: {
      minFontPx: minFontPx == null ? null : round(minFontPx),
      smallTextCount
    },
    overflow: {
      count: overflowExamples.length,
      examples: overflowExamples
    }
  };
})()`;

function unavailableMeasurement(note: string): VisualAtlasPageVisualMeasurement {
  return {
    version: "visual-measurement-v1",
    available: false,
    renderer: "unavailable",
    screenshotFile: null,
    page: {
      width: 0,
      height: 0,
      scrollWidth: 0,
      scrollHeight: 0,
      horizontalOverflowPx: 0,
      verticalOverflowPx: 0,
    },
    zones: {},
    zoneUsage: {},
    typography: {
      minFontPx: null,
      smallTextCount: 0,
    },
    overflow: {
      count: 0,
      examples: [],
    },
    warnings: ["Medicion visual real no disponible en este runtime."],
    blockers: [],
    score: 0,
    note,
  };
}

function scoreMeasurement(raw: BrowserMeasurementRaw, expectedWidth: number, expectedHeight: number): Pick<VisualAtlasPageVisualMeasurement, "warnings" | "blockers" | "score"> {
  const warnings: string[] = [];
  const blockers: string[] = [];
  if (Math.abs(raw.page.width - expectedWidth) > 2 || Math.abs(raw.page.height - expectedHeight) > 2) {
    blockers.push(`Canvas renderizado fuera de contrato: ${raw.page.width}x${raw.page.height}.`);
  }
  if (raw.page.horizontalOverflowPx > 2) blockers.push(`Overflow horizontal de ${raw.page.horizontalOverflowPx}px.`);
  if (raw.page.verticalOverflowPx > 6) warnings.push(`Scroll vertical de ${raw.page.verticalOverflowPx}px; revisar corte de pagina.`);
  if (raw.overflow.count > 0) warnings.push(`${raw.overflow.count} elemento(s) con overflow interno detectado.`);
  if (raw.typography.smallTextCount > 0) warnings.push(`${raw.typography.smallTextCount} texto(s) por debajo de 7.5px detectados.`);
  const upperUsage = raw.zoneUsage.upper_visual;
  if (upperUsage && upperUsage.occupancyPct < 78) warnings.push(`Upper visual ocupa ${upperUsage.occupancyPct}% de su zona real.`);
  const examUsage = raw.zoneUsage.exam_rail;
  if (examUsage && examUsage.freeBottomPx > 58) warnings.push(`Rail inferior deja ${examUsage.freeBottomPx}px libres al fondo.`);

  const penalty = blockers.length * 1.6 + warnings.length * 0.35 + Math.min(1.2, raw.typography.smallTextCount * 0.08);
  return {
    warnings,
    blockers,
    score: Math.max(0, Math.round((10 - penalty) * 10) / 10),
  };
}

async function loadPlaywright(log: Logger): Promise<PlaywrightModule | null> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
    const mod = await dynamicImport("playwright");
    const playwright = mod as Partial<PlaywrightModule>;
    return playwright.chromium ? (playwright as PlaywrightModule) : null;
  } catch (err) {
    log.warn({ err: String(err) }, "Playwright unavailable; skipping real visual measurement");
    return null;
  }
}

export async function measureVisualAtlasPageVisuals(args: MeasureVisualAtlasPageArgs): Promise<VisualAtlasPageVisualMeasurement> {
  const playwright = await loadPlaywright(args.log);
  if (!playwright) {
    return unavailableMeasurement("Playwright no esta instalado o no puede abrir Chromium en este runtime.");
  }

  let browser: PlaywrightBrowser | null = null;
  let page: PlaywrightPage | null = null;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    page = await browser.newPage({
      viewport: { width: args.pageWidth, height: args.pageHeight },
      deviceScaleFactor: 2,
    });
    await page.goto(pathToFileURL(args.htmlFilePath).href, { waitUntil: "load", timeout: 30_000 });
    const raw = await page.evaluate<BrowserMeasurementRaw>(MEASURE_SCRIPT);
    await page.screenshot({ path: args.screenshotFilePath, fullPage: false, animations: "disabled" });
    const scored = scoreMeasurement(raw, args.pageWidth, args.pageHeight);
    return {
      version: "visual-measurement-v1",
      available: true,
      renderer: "playwright",
      screenshotFile: args.screenshotFilePath,
      ...raw,
      ...scored,
      note: "Medicion visual real tomada con Chromium headless sobre page.html.",
    };
  } catch (err) {
    args.log.warn({ err: String(err) }, "Visual measurement failed");
    return unavailableMeasurement(`Fallo medicion visual real: ${String(err).slice(0, 180)}`);
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}
