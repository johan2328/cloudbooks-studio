import { existsSync } from "node:fs";
import path from "node:path";
import { CONFIG, pageOutputDir, pagePublicBase } from "../config.js";
import { getOutline } from "../skills/ai-200-outline.js";
import { listPersistedPages } from "../page-store.js";
import { listPersistedChapters } from "../chapter-store.js";
import { getBookConfig } from "./book-config.js";
import { bookCoverUrl, bookCoverFileForActive, bookBackCoverUrl, bookBackCoverFileForActive } from "./cover-gen.js";
import { partOpenerUrlIfExists } from "./part-opener-gen.js";
import { chapterDividerUrlIfExists } from "./chapter-divider-gen.js";
import { chapterHeading } from "./chapter-heading.js";

/**
 * PÁGINAS PREVISUALIZABLES del libro ACTIVO (para el selector de "Echa un vistazo" de la ficha).
 * Solo imágenes PNG (nada de chapter.pdf). Agrupadas por ruta/capítulo para curar la selección.
 */
export interface BookPreviewItem { kind: "cover" | "back" | "route" | "chapter" | "lamina"; id: string; label: string; url: string; group: string }

/** URL de la lámina (single `infographic.png` o la 1ª página del spread `infographic-A.png`), o null. */
function laminaUrl(pageId: string): string | null {
  const dir = pageOutputDir(pageId);
  for (const f of ["infographic.png", "infographic-A.png"]) {
    if (existsSync(path.join(dir, f))) return `${pagePublicBase(pageId)}/${f}`;
  }
  return null;
}

export function listBookPreviews(): BookPreviewItem[] {
  const out: BookPreviewItem[] = [];
  if (bookCoverFileForActive()) out.push({ kind: "cover", id: "cover", label: "Portada", url: bookCoverUrl(), group: "Portadas" });
  if (bookBackCoverFileForActive()) out.push({ kind: "back", id: "back", label: "Contraportada", url: bookBackCoverUrl(), group: "Portadas" });

  const domains = getOutline().domains;
  if (CONFIG.format === "master-book") {
    for (const d of domains) {
      const po = partOpenerUrlIfExists(d.id);
      if (po) out.push({ kind: "route", id: d.id, label: `Abre-ruta · ${d.label}`, url: po, group: d.label });
    }
    for (const c of listPersistedChapters()) {
      const dv = chapterDividerUrlIfExists(c.seed.chapterId);
      if (dv) { const hd = chapterHeading(c.seed); out.push({ kind: "chapter", id: c.seed.chapterId, label: hd.tocLabel, url: dv, group: hd.label }); }
    }
    return out;
  }

  // Atlas: divisores de ruta + láminas, agrupadas por ruta.
  const cfg = getBookConfig();
  const domainBySkill = new Map<string, string>();
  const labelByDomain = new Map<string, string>();
  for (const d of domains) { labelByDomain.set(d.id, d.label); for (const s of d.skills) domainBySkill.set(s.id, d.id); }
  for (const d of domains) {
    const ri = cfg.routeIntros[d.id]?.imageUrl;
    if (ri) out.push({ kind: "route", id: d.id, label: `Divisor · ${d.label}`, url: ri, group: d.label });
  }
  for (const p of listPersistedPages()) {
    const url = laminaUrl(p.seed.pageId);
    if (!url) continue;
    const did = p.seed.skillIds?.[0] ? domainBySkill.get(p.seed.skillIds[0]) : undefined;
    out.push({ kind: "lamina", id: p.seed.pageId, label: p.seed.title, url, group: (did && labelByDomain.get(did)) || "Láminas" });
  }
  return out;
}
