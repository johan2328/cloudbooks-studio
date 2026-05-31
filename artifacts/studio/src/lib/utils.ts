import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { PageStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/* ─── Estados normalizados (9 estados de producción) ─────────────────────── */
export function statusLabel(status: string): string {
  switch (status) {
    case "draft":             return "Borrador";
    case "grounding_pending": return "Grounding pendiente";
    case "grounded":          return "Grounded";
    case "generating":        return "Generando";
    case "qa_pending":        return "QA pendiente";
    case "qa_review":         return "En revisión QA";
    case "needs_revision":    return "Requiere ajuste";
    case "approved":          return "Aprobada";
    case "exported":          return "Exportada";
    /* Legacy API values */
    case "pending":           return "Pendiente";
    case "review":            return "En revisión";
    default: return status;
  }
}

export function statusColorDark(status: string): string {
  switch (status) {
    case "approved":          return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case "exported":          return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
    case "qa_review":         return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "generating":        return "bg-violet-500/10 text-violet-400 border border-violet-500/20";
    case "grounded":          return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
    case "qa_pending":        return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
    case "needs_revision":    return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "grounding_pending": return "bg-orange-500/10 text-orange-400 border border-orange-500/20";
    case "draft":             return "bg-white/5 text-white/30 border border-white/10";
    /* Legacy */
    case "pending":           return "bg-white/5 text-white/40 border border-white/10";
    case "review":            return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    default:                  return "bg-white/5 text-white/40";
  }
}

export function statusDot(status: string): string {
  switch (status) {
    case "approved":          return "bg-emerald-500";
    case "exported":          return "bg-teal-400";
    case "qa_review":         return "bg-blue-400";
    case "generating":        return "bg-violet-400";
    case "grounded":          return "bg-cyan-400";
    case "qa_pending":        return "bg-sky-400";
    case "needs_revision":    return "bg-amber-400";
    case "grounding_pending": return "bg-orange-400";
    case "draft":             return "bg-white/20";
    default:                  return "bg-white/20";
  }
}

/* ─── Legacy (portal comercial) ─────────────────────────────────────────── */
export function statusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800 border border-green-200";
    case "exported": return "bg-teal-100 text-teal-800 border border-teal-200";
    case "review":   return "bg-amber-100 text-amber-800 border border-amber-200";
    case "generating": return "bg-blue-100 text-blue-800 border border-blue-200";
    case "pending":  return "bg-gray-100 text-gray-600 border border-gray-200";
    default:         return "bg-gray-100 text-gray-600";
  }
}

/* ─── Grounding ──────────────────────────────────────────────────────────── */
export function groundingLabel(g: string): string {
  switch (g) {
    case "verified": return "Verificado";
    case "partial":  return "Parcial";
    default:         return "Sin verificar";
  }
}

export function groundingDot(g: string): string {
  switch (g) {
    case "verified": return "bg-emerald-500";
    case "partial":  return "bg-amber-400";
    default:         return "bg-white/20";
  }
}

/* ─── QA Scores ──────────────────────────────────────────────────────────── */
export function scoreColor(score: number): string {
  if (score >= 90) return "text-green-700";
  if (score >= 75) return "text-amber-700";
  return "text-red-600";
}

export function scoreColorDark(score: number): string {
  if (score >= 95) return "text-emerald-400";
  if (score >= 90) return "text-teal-400";
  if (score >= 75) return "text-amber-400";
  return "text-red-400";
}

/* ─── Fechas ─────────────────────────────────────────────────────────────── */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("es-ES", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/* ─── Action type labels ─────────────────────────────────────────────────── */
export function actionLabel(type: string): string {
  switch (type) {
    case "grounding_executed":    return "Grounding ejecutado";
    case "generation_started":    return "Generación iniciada";
    case "generation_completed":  return "Generación completada";
    case "qa_executed":           return "QA ejecutado";
    case "page_approved":         return "Página aprobada";
    case "revision_requested":    return "Corrección solicitada";
    case "selective_regeneration":return "Regeneración selectiva";
    case "page_exported":         return "Página exportada";
    case "contract_updated":      return "Contrato actualizado";
    case "asset_uploaded":        return "Asset cargado";
    case "asset_linked":          return "Asset vinculado";
    case "asset_approved":        return "Asset aprobado";
    case "asset_replaced":        return "Asset reemplazado";
    case "composer_draft_saved":  return "Composer guardado";
    case "composer_autofix_applied": return "Composer autofix";
    default: return type;
  }
}

export function actionColor(type: string): string {
  switch (type) {
    case "grounding_executed":    return "text-cyan-400";
    case "generation_started":    return "text-violet-400";
    case "generation_completed":  return "text-violet-300";
    case "qa_executed":           return "text-blue-400";
    case "page_approved":         return "text-emerald-400";
    case "revision_requested":    return "text-amber-400";
    case "selective_regeneration":return "text-sky-400";
    case "page_exported":         return "text-teal-400";
    case "contract_updated":      return "text-white/50";
    case "asset_uploaded":        return "text-blue-400";
    case "asset_linked":          return "text-cyan-400";
    case "asset_approved":        return "text-emerald-400";
    case "asset_replaced":        return "text-amber-400";
    case "composer_draft_saved":  return "text-violet-300";
    case "composer_autofix_applied": return "text-fuchsia-300";
    default: return "text-white/30";
  }
}

/* ─── Utility: status ordering for kanban-style sort ────────────────────── */
const STATUS_ORDER: Record<PageStatus, number> = {
  draft: 0, grounding_pending: 1, grounded: 2, generating: 3,
  qa_pending: 4, qa_review: 5, needs_revision: 6, approved: 7, exported: 8,
};

export function compareByStatus(a: PageStatus, b: PageStatus): number {
  return (STATUS_ORDER[a] ?? 0) - (STATUS_ORDER[b] ?? 0);
}
