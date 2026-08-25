import { autoGroundCorrect } from "./auto-correct.js";
import { getOutline, getSkill, getSkillTitleEs, pageNumberForSkill, totalUnits } from "../skills/ai-200-outline.js";
import { listPersistedPages, upsertPersistedPage } from "../page-store.js";
import { relocatePage } from "../page-renumber.js";
import type { GroundingStatus, PageProvenance, PageSeed } from "../types.js";

export interface PersistAuthoredResult {
  ok: boolean;
  pageId: string | null;
  skillId: string;
  groundingStatus: GroundingStatus | null;
  groundingScore: number | null;
  blocked: boolean;
  reason: string;
  error: string | null;
}

function domainLabelFor(skillId: string): string {
  for (const d of getOutline().domains) if (d.skills.some((s) => s.id === skillId)) return d.label;
  return "Dominio — AI-200";
}

/**
 * Título corto para el hero (33px/900): los seeds usan títulos de tema (~24
 * chars). Un título autoral largo desborda el hero (el auto-fit no toca el
 * título). Preferimos el del draft si entra; si no, el de la skill (curado y
 * corto); en último caso, recortamos por palabra. Máx ~34 chars.
 */
const TITLE_MAX = 30;
// Cierra el título: si el recorte por palabra dejó una preposición/artículo/conjunción colgando
// ("Llamar herramientas desde", "Entradas, salidas y"), la elimina → frase nominal cerrada.
const TITLE_STOP = new Set(["en","con","de","del","para","por","a","al","y","o","u","e","sin","desde","hacia","entre","sobre","tras","mediante","según","segun","ante","bajo","contra","la","el","las","los","un","una","su","sus","como","cómo","que","según"]);
function dropTrailingPrep(s: string): string {
  const words = s.trim().replace(/[,;:\s]+$/, "").split(/\s+/);
  while (words.length > 1) {
    const last = (words[words.length - 1] ?? "").toLowerCase().replace(/[.,;:]/g, "");
    if (!TITLE_STOP.has(last)) break;
    words.pop();
  }
  return words.join(" ").replace(/[,;:\s]+$/, "").trim();
}
function conciseTitle(draftTitle: string, skillTitle: string): string {
  const clean = (s: string) => s.replace(/^(uso de|cómo|como|introducción a|guía de|gestión de)\s+/i, "").trim();
  const dt = clean(draftTitle);
  const pick = (): string => {
    if (dt && dt.length <= TITLE_MAX) return dt;
    const st = clean(skillTitle);
    if (st && st.length <= TITLE_MAX + 6) return st;
    // recorte por palabra para no cortar a la mitad
    const words = dt.split(/\s+/);
    let out = "";
    for (const w of words) { if ((out + " " + w).trim().length > TITLE_MAX) break; out = (out + " " + w).trim(); }
    return out || dt.slice(0, TITLE_MAX);
  };
  return dropTrailingPrep(pick());
}

// HOMOLOGACIÓN DE TÉRMINOS: usar el nombre de producto en inglés "Adaptive Card(s)" —NO "tarjetas
// adaptativas" ni "tarjetas Adaptive Cards"— de forma consistente en toda la página. Determinista,
// corre al persistir → estable ante re-grounding y aplica a rutas futuras.
function normalizeTerms(s: string): string {
  const ac = (_m: string, g1: string) => (g1.toLowerCase() === "tarjetas" ? "Adaptive Cards" : "Adaptive Card");
  return s
    .replace(/\b(tarjetas?)\s+adaptativas?\b/gi, ac)
    .replace(/\b(tarjetas?)\s+Adaptive(?:\s+Cards?)?\b/gi, ac);
}
function deepNormalize<T>(v: T): T {
  if (typeof v === "string") return normalizeTerms(v) as unknown as T;
  if (Array.isArray(v)) return v.map((x) => deepNormalize(x)) as unknown as T;
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) o[k] = deepNormalize((v as Record<string, unknown>)[k]);
    return o as T;
  }
  return v;
}

/**
 * PERSISTIR BORRADOR → PÁGINA (corrida 21). Cierra el abismo grounding↔generación:
 * 1) recupera el borrador anclado de la skill (cacheado por la autoría);
 * 2) lo verifica con el grounding gate (verificador independiente);
 * 3) si el gate BLOQUEA (afirmación contradicha/sin respaldo) → NO persiste
 *    (rigor en la creación de página, no solo en la aprobación final);
 * 4) si pasa (verified/partial), convierte el draft en PageSeed + procedencia y
 *    lo guarda en el page-store, generable como cualquier seed.
 * Idempotente por skill: re-persistir actualiza la misma página.
 */
export async function persistAuthored(skillId: string, requestedPageId?: string): Promise<PersistAuthoredResult> {
  const skill = getSkill(skillId);
  const fail = (extra: Partial<PersistAuthoredResult>): PersistAuthoredResult => ({
    ok: false, pageId: null, skillId, groundingStatus: null, groundingScore: null, blocked: false, reason: "", error: null, ...extra,
  });
  if (!skill) return fail({ error: `skill_desconocida:${skillId}` });

  // Anticipatorio: redacta + verifica y, si algo no cierra, AUTO-CORRIGE (re-redacta
  // las frases sin respaldo contra el corpus) antes de escalar al humano.
  const ac = await autoGroundCorrect(skillId);
  const authored = ac.authored;
  if (authored.outcome !== "real" || !authored.draft) {
    return fail({ error: authored.error ?? "Sin borrador: redactá la skill primero (Redactar con IA)." });
  }

  const grounding = ac.grounding;
  if (grounding.outcome === "failed" || grounding.outcome === "no_key") {
    return fail({ error: grounding.error ?? "No se pudo verificar el grounding." });
  }
  if (grounding.blocked) {
    return fail({
      blocked: true, groundingStatus: grounding.groundingStatus, groundingScore: grounding.score,
      reason: `${grounding.reason} (tras ${ac.attempts} auto-corrección/es)`,
      error: "Grounding sigue bloqueado tras auto-corrección: falta fuente o requiere revisión humana.",
    });
  }

  // NUMERACIÓN POR UNIDAD: el id de la página = su posición en el temario oficial
  // (página 01 = primera unidad). Es función pura del skill → idempotente y estable.
  const existing = listPersistedPages().find((p) => p.provenance.skillIds.includes(skillId)) ?? null;
  const pageId = requestedPageId?.trim() || pageNumberForSkill(skillId) || existing?.seed.pageId || skillId;
  // Self-heal: si la página de esta skill vivía en otro id (numeración vieja), reubicarla
  // (mover output + re-keyear aprobación/editorial/book-review) en vez de duplicar.
  if (existing && existing.seed.pageId !== pageId) await relocatePage(existing.seed.pageId, pageId);

  const d = deepNormalize(authored.draft);   // homologa términos ("tarjetas adaptativas" → "Adaptive Cards") en TODO el draft
  // Título DETERMINISTA del mapa ES (no el del autor): consistente y a prueba de re-grounding.
  const title = getSkillTitleEs(skillId) ?? conciseTitle(d.title, skill.title);
  const seed: PageSeed = {
    pageId,
    pageNumber: pageId,
    totalPages: totalUnits(),   // total real de unidades de contenido del temario AI-200T00
    domainLabel: domainLabelFor(skillId),
    batchLabel: "Autoría IA",
    title,
    subtitle: d.subtitle,
    context: d.context,
    guideQuestion: d.guideQuestion,
    upperVisualAlt: `Diagrama de ${title}`,
    traps: d.traps,
    autocheck: d.autocheck,
    visualModules: d.visualModules,
    skillIds: [skillId],
  };

  const provenance: PageProvenance = {
    pageId,
    skillIds: [skillId],
    sourceIds: authored.sourceIds,
    claims: authored.claims,
    checks: grounding.checks,   // veredicto por zona (context/module/trampa/autocheck) → anclado real
    groundingStatus: grounding.groundingStatus,
    updatedAt: new Date().toISOString(),
  };

  upsertPersistedPage({ seed, provenance, persistedAt: new Date().toISOString() });

  return {
    ok: true, pageId, skillId,
    groundingStatus: grounding.groundingStatus, groundingScore: grounding.score,
    blocked: false, reason: grounding.reason, error: null,
  };
}
