import puppeteer from "puppeteer-core";
import { closeBrowserHard } from "../render/browser-util.js";
import { CONFIG } from "../config.js";
import type { BookStyle } from "./book-config.js";

interface Bucket { n: number; r: number; g: number; b: number }
const hex = (r: number, g: number, b: number): string => "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
const lum = (c: Bucket): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const sat = (c: Bucket): number => { const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return mx === 0 ? 0 : (mx - mn) / mx; };

/**
 * Extrae la paleta dominante de una imagen (tapa) con Chrome headless: la dibuja
 * en un canvas chico, cuantiza colores y devuelve una sugerencia de estilo. Sin
 * dependencias nuevas (reusa puppeteer). Es SUGERENCIA — el usuario la ajusta.
 */
export async function extractPalette(dataUrl: string): Promise<{ palette: string[]; style: BookStyle } | null> {
  if (!CONFIG.chromePath) return null;
  const browser = await puppeteer.launch({ executablePath: CONFIG.chromePath, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  try {
    const p = await browser.newPage();
    const raw = (await p.evaluate(async (src: string) => {
      const g = globalThis as unknown as { Image: new () => { onload: () => void; onerror: () => void; src: string; width: number; height: number }; document: { createElement: (t: string) => { width: number; height: number; getContext: (c: string) => { drawImage: (...a: unknown[]) => void; getImageData: (...a: number[]) => { data: number[] } } } } };
      const img = new g.Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = src; });
      const W = 64, H = Math.max(1, Math.round(64 * (img.height || 1) / (img.width || 1)));
      const cv = g.document.createElement("canvas"); cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d"); ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      const map: Record<string, { n: number; r: number; g: number; b: number }> = {};
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3]! < 128) continue;
        const r = data[i]!, gg = data[i + 1]!, b = data[i + 2]!;
        const key = `${r >> 4},${gg >> 4},${b >> 4}`;
        const bk = map[key] ?? (map[key] = { n: 0, r: 0, g: 0, b: 0 });
        bk.n++; bk.r += r; bk.g += gg; bk.b += b;
      }
      return Object.values(map).map((b) => ({ n: b.n, r: Math.round(b.r / b.n), g: Math.round(b.g / b.n), b: Math.round(b.b / b.n) })).sort((a, b) => b.n - a.n).slice(0, 10);
    }, dataUrl)) as Bucket[];

    if (!raw.length) return null;
    const top = raw.slice(0, 8);
    // bg = el más oscuro y prominente (ancla de tapa/contraportada).
    const dark = [...top].sort((a, b) => (lum(a) - lum(b)) || (b.n - a.n));
    const bg = dark[0]!;
    // accent = el más saturado y presente.
    const byVivid = [...top].sort((a, b) => sat(b) * Math.log(b.n + 1) - sat(a) * Math.log(a.n + 1));
    const accent = byVivid[0]!;
    const accent2 = byVivid.find((c) => Math.abs(lum(c) - lum(accent)) > 24 || Math.hypot(c.r - accent.r, c.g - accent.g, c.b - accent.b) > 60) ?? accent;
    const palette = raw.slice(0, 6).map((c) => hex(c.r, c.g, c.b));
    const style: BookStyle = {
      bg: lum(bg) < 110 ? hex(bg.r, bg.g, bg.b) : "#061B49",   // si no hay oscuro claro, navy seguro
      accent: hex(accent.r, accent.g, accent.b),
      accent2: hex(accent2.r, accent2.g, accent2.b),
      text: "#0F1B3D",   // el cuerpo siempre legible (oscuro sobre blanco)
      onDark: "#FFFFFF",
    };
    return { palette, style };
  } catch {
    return null;
  } finally {
    await closeBrowserHard(browser);
  }
}
