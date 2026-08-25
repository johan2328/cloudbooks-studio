import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { ledgerEntries, type LedgerEntry } from "./cost.js";
import { creditStatus, type CreditStatus } from "./credit.js";
import { buildLibraryTree } from "./library-catalog.js";
import { paletteFor } from "./book/palette-family.js";
import { allModules, totalUnits as totalSkillUnits } from "./skills/ai-200-outline.js";

/**
 * MÉTRICAS DE LOS 6 LIBROS de la familia (Dashboard global + Timeline). Lee cada formato por
 * PATH DIRECTO (sin flipear el libro activo): el ledger trae `format`; capítulos/aprobaciones/
 * ensamblado/portada se leen de sus rutas namespaceadas; la paleta es estática.
 */
export interface BookMetric {
  format: string; label: string; enabled: boolean; isActive: boolean;
  costUsd: number; ops: number;
  units: number; totalUnits: number; unitLabel: string;   // hechas / esperadas · "capítulos" (Master) | "láminas" (Atlas)
  capstones: number;   // capítulos integradores (cap-zz-capstone-*), contados APARTE de units (no inflan el 24)
  approved: number; bookApproved: boolean;
  assembled: boolean; coverUrl: string | null;
  palette: { bg: string; accent: string; accent2: string };
  lastActivity: string | null;
}
export interface LibraryMetrics { books: BookMetric[]; credit: CreditStatus; totalCostUsd: number }

const round2 = (n: number): number => Math.round(n * 100) / 100;
function readJson<T>(p: string): T | null { try { return JSON.parse(fs.readFileSync(p, "utf8")) as T; } catch { return null; } }

/** Atribuye una entrada del ledger a un formato (igual que agents-rollup): `format` si existe;
 *  si no (legacy), heurística por label/pageId del pipeline documental → master-book, else visual-atlas. */
const MASTER_LABELS = new Set(["chapter-author", "psychometrics", "verify-chapter", "supervise-chapter", "chapter-divider-text", "master-glossary", "part-opener-hook"]);
function bookOf(e: LedgerEntry): string {
  if (e.format) return e.format;
  if (MASTER_LABELS.has(e.label) || e.pageId.startsWith("cap-")) return "master-book";
  return "visual-atlas";
}

function unitsFor(certId: string, fmt: string): { units: number; capstones: number; unitLabel: string } {
  const root = CONFIG.outputRoot;
  const chapters = readJson<Record<string, { seed?: { moduleId?: string } }>>(path.join(root, `_chapters.${certId}.${fmt}.json`));
  if (chapters && Object.keys(chapters).length) {
    // Los capstones (moduleId "capstone-*") se cuentan APARTE: no son módulos del temario, no deben inflar `units` a 33.
    let units = 0, capstones = 0;
    for (const v of Object.values(chapters)) {
      if (String(v?.seed?.moduleId ?? "").startsWith("capstone-")) capstones++; else units++;
    }
    return { units, capstones, unitLabel: "capítulos" };
  }
  // láminas: dirs de página con infografía renderizada bajo el formato
  const pagesDir = path.join(root, certId, fmt, "pages");
  let withImg = 0;
  try { for (const d of fs.readdirSync(pagesDir)) if (fs.existsSync(path.join(pagesDir, d, "infographic.png"))) withImg++; } catch { /* sin dir */ }
  return { units: withImg, capstones: 0, unitLabel: "láminas" };
}

function metricFor(certId: string, fmt: string, label: string, enabled: boolean, isActive: boolean, ledger: LedgerEntry[]): BookMetric {
  const root = CONFIG.outputRoot;
  const mine = ledger.filter((e) => bookOf(e) === fmt && (!e.certId || e.certId === certId));
  const costUsd = round2(mine.reduce((s, e) => s + e.estCostUsd, 0));
  const lastActivity = mine.reduce<string | null>((mx, e) => (!mx || e.ts > mx ? e.ts : mx), null);
  const { units, capstones, unitLabel } = unitsFor(certId, fmt);
  // Total ESPERADO: Master = módulos del temario (capítulos); resto = unidades/láminas del outline.
  const totalUnits = fmt === "master-book" ? allModules().length : totalSkillUnits();

  // Approvals namespaceado por libro (`_approvals.{cert}.{format}.json`); fallback al legacy global mientras no se haya migrado.
  const apprNs = path.join(root, `_approvals.${certId}.${fmt}.json`);
  const appr = readJson<{ pages?: Record<string, { approved: boolean }>; books?: Record<string, { approved: boolean }> }>(fs.existsSync(apprNs) ? apprNs : path.join(root, "_approvals.json"));
  const isMasterFmt = fmt === "master-book";
  // El mapa `pages` es global: los ids cap-* son del Master; los numéricos, del Atlas (dueño de las láminas).
  const approved = appr?.pages
    ? Object.entries(appr.pages).filter(([id, v]) => v.approved && (isMasterFmt ? (id.startsWith("cap-") && !id.startsWith("cap-zz-capstone-")) : fmt === "visual-atlas" && /^\d/.test(id))).length
    : 0;
  const bookApproved = !!appr?.books?.[fmt]?.approved;

  // ensamblado: Master namespaceado; Atlas global
  const assembled = isMasterFmt
    ? fs.existsSync(path.join(root, certId, fmt, "_export", "AI200_master_book.pdf"))
    : fmt === "visual-atlas" ? fs.existsSync(path.join(root, "_export", "AI200_libro.pdf")) : false;

  const coverPath = path.join(root, certId, fmt, "_book", "cover.png");
  const coverUrl = fs.existsSync(coverPath) ? `${CONFIG.publicAssetsBase}/${certId}/${fmt}/_book/cover.png` : null;

  const pal = paletteFor(fmt);
  return { format: fmt, label, enabled, isActive, costUsd, ops: mine.length, units, totalUnits, unitLabel, capstones, approved, bookApproved, assembled, coverUrl, palette: { bg: pal.bg, accent: pal.accent, accent2: pal.accent2 }, lastActivity };
}

export function libraryMetrics(): LibraryMetrics {
  const tree = buildLibraryTree();
  const cert = tree.clouds.flatMap((c) => c.certs).find((c) => c.id === CONFIG.certId);
  const ledger = ledgerEntries();
  const books = (cert?.books ?? []).map((b) => metricFor(CONFIG.certId, b.id, b.label, b.enabled ?? false, b.id === tree.activeBookId, ledger));
  const totalCostUsd = round2(books.reduce((s, b) => s + b.costUsd, 0));
  return { books, credit: creditStatus(), totalCostUsd };
}
