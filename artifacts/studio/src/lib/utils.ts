import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function statusColor(status: string): string {
  switch (status) {
    case "approved": return "bg-green-100 text-green-800 border border-green-200";
    case "exported": return "bg-teal-100 text-teal-800 border border-teal-200";
    case "review": return "bg-amber-100 text-amber-800 border border-amber-200";
    case "generating": return "bg-blue-100 text-blue-800 border border-blue-200";
    case "pending": return "bg-gray-100 text-gray-600 border border-gray-200";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "approved": return "Aprobada";
    case "exported": return "Exportada";
    case "review": return "En revisión";
    case "generating": return "Generando";
    case "pending": return "Pendiente";
    default: return status;
  }
}

export function groundingLabel(g: string): string {
  switch (g) {
    case "verified": return "Verificado";
    case "partial": return "Parcial";
    default: return "Sin verificar";
  }
}

export function groundingDot(g: string): string {
  switch (g) {
    case "verified": return "bg-green-500";
    case "partial": return "bg-amber-400";
    default: return "bg-gray-300";
  }
}

export function scoreColor(score: number): string {
  if (score >= 90) return "text-green-700";
  if (score >= 75) return "text-amber-700";
  return "text-red-600";
}

/* Tema oscuro — Studio */
export function statusColorDark(status: string): string {
  switch (status) {
    case "approved": return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case "exported": return "bg-teal-500/10 text-teal-400 border border-teal-500/20";
    case "review": return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "generating": return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
    case "pending": return "bg-white/5 text-white/40 border border-white/10";
    default: return "bg-white/5 text-white/40";
  }
}

export function scoreColorDark(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-amber-400";
  return "text-red-400";
}

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
