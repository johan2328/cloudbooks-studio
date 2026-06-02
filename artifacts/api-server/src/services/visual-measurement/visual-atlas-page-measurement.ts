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

export interface VisualMeasurementUpperImageContent {
  available: boolean;
  contentWidthPct: number | null;
  contentHeightPct: number | null;
  contentAreaPct: number | null;
  bottomWhitespacePct: number | null;
  rightWhitespacePct: number | null;
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
  upperImageContent: VisualMeasurementUpperImageContent;
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
  upperImageContent: VisualMeasurementUpperImageContent;
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
  const measureUpperImageContent = () => {
    const img = document.querySelector('[data-zone="upper_visual"] img');
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) {
      return {
        available: false,
        contentWidthPct: null,
        contentHeightPct: null,
        contentAreaPct: null,
        bottomWhitespacePct: null,
        rightWhitespacePct: null
      };
    }
    const canvas = document.createElement("canvas");
    const maxW = 384;
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        available: false,
        contentWidthPct: null,
        contentHeightPct: null,
        contentAreaPct: null,
        bottomWhitespacePct: null,
        rightWhitespacePct: null
      };
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    let marked = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const i = (y * canvas.width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        const nonWhite = a > 20 && (r < 246 || g < 246 || b < 246) && (Math.max(r, g, b) - Math.min(r, g, b) > 8 || Math.min(r, g, b) < 238);
        if (!nonWhite) continue;
        marked += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (marked === 0 || maxX < minX || maxY < minY) {
      return {
        available: true,
        contentWidthPct: 0,
        contentHeightPct: 0,
        contentAreaPct: 0,
        bottomWhitespacePct: 100,
        rightWhitespacePct: 100
      };
    }
    const contentWidth = maxX - minX + 1;
    const contentHeight = maxY - minY + 1;
    return {
      available: true,
      contentWidthPct: round((contentWidth / canvas.width) * 100),
      contentHeightPct: round((contentHeight / canvas.height) * 100),
      contentAreaPct: round((marked / (canvas.width * canvas.height)) * 100),
      bottomWhitespacePct: round(((canvas.height - maxY - 1) / canvas.height) * 100),
      rightWhitespacePct: round(((canvas.width - maxX - 1) / canvas.width) * 100)
    };
  };
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
    },
    upperImageContent: measureUpperImageContent()
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
    upperImageContent: {
      available: false,
      contentWidthPct: null,
      contentHeightPct: null,
      contentAreaPct: null,
      bottomWhitespacePct: null,
      rightWhitespacePct: null,
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
  if (raw.page.verticalOverflowPx > 6) blockers.push(`Overflow vertical de ${raw.page.verticalOverflowPx}px: la pagina completa excede el formato libro.`);
  if (raw.overflow.count > 0) warnings.push(`${raw.overflow.count} elemento(s) con overflow interno detectado.`);
  if (raw.typography.smallTextCount > 0) warnings.push(`${raw.typography.smallTextCount} texto(s) por debajo de 7.5px detectados.`);
  const upperUsage = raw.zoneUsage.upper_visual;
  if (upperUsage && upperUsage.occupancyPct < 78) warnings.push(`Upper visual ocupa ${upperUsage.occupancyPct}% de su zona real.`);
  const examUsage = raw.zoneUsage.exam_rail;
  if (examUsage && examUsage.freeBottomPx > 58) warnings.push(`Rail inferior deja ${examUsage.freeBottomPx}px libres al fondo.`);
  const examZone = raw.zones.exam_rail;
  const footerZone = raw.zones.footer;
  if (examZone && footerZone && examZone.bottom > footerZone.y + 1) {
    blockers.push(`Rail/autocheck invade footer: rail termina en ${examZone.bottom}px y footer inicia en ${footerZone.y}px.`);
  }
  if (raw.overflow.count > 0 && examUsage && examUsage.freeBottomPx < 8) {
    blockers.push("Overflow interno dentro del rail inferior: posible autocheck cortado o pisando footer.");
  }
  if ((raw.typography.smallTextCount > 0 || raw.overflow.count > 0) && upperUsage && upperUsage.occupancyPct >= 82) {
    warnings.push("Densidad falsa: el upper parece ocupado, pero contiene microtexto u overflow.");
  }
  if (raw.upperImageContent.available) {
    if ((raw.upperImageContent.contentHeightPct ?? 100) < 78) {
      warnings.push(`Upper visual con aire interno: contenido ocupa ${raw.upperImageContent.contentHeightPct}% de la altura del PNG.`);
    }
    if ((raw.upperImageContent.bottomWhitespacePct ?? 0) > 14) {
      warnings.push(`Upper visual deja ${raw.upperImageContent.bottomWhitespacePct}% de blanco inferior dentro del PNG.`);
    }
    if ((raw.upperImageContent.contentAreaPct ?? 100) < 16) {
      warnings.push(`Upper visual con densidad grafica baja: area marcada ${raw.upperImageContent.contentAreaPct}%.`);
    }
  }

  const internalBlankPenalty = raw.upperImageContent.available
    ? Math.min(1.1, Math.max(0, 78 - (raw.upperImageContent.contentHeightPct ?? 78)) * 0.05)
    : 0;
  const penalty = blockers.length * 2.1 + warnings.length * 0.38 + Math.min(1.4, raw.typography.smallTextCount * 0.09) + internalBlankPenalty;
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
