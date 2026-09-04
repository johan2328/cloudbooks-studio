/* ════════════════════════════════════════════════════════════════════════════
   OPINIONES de clientes (demo) — guardadas en localStorage. Solo puede opinar
   quien tiene el libro en su biblioteca (ver lib/library → ownsBook).
   // TODO_REAL: validar compra en backend con cuenta/login y moderación.
   ════════════════════════════════════════════════════════════════════════════ */

export interface UserReview {
  id: string; productId: string; name: string;
  rating: number; title: string; body: string; date: string; // ISO
}

const KEY = "cloudbooks_reviews_v1";

function readAll(): UserReview[] {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as UserReview[]) : []; }
  catch { return []; }
}

export function getReviews(productId: string): UserReview[] {
  return readAll().filter(r => r.productId === productId).sort((a, b) => b.date.localeCompare(a.date));
}

export function addReview(r: Omit<UserReview, "id" | "date">): UserReview {
  const review: UserReview = { ...r, id: `rv-${Date.now().toString(36)}`, date: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify([review, ...readAll()]));
  return review;
}

/* ── Votos "Útil" (positivo, abierto a cualquiera, 1 por dispositivo) ──────── */
const HKEY = "cloudbooks_helpful_v1";

function readVotes(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(HKEY) || "{}"); } catch { return {}; }
}

export function hasVotedHelpful(id: string): boolean {
  return !!readVotes()[id];
}

/** Alterna el voto "Útil". Devuelve el nuevo estado (true = votado). */
export function toggleHelpful(id: string): boolean {
  const v = readVotes();
  const next = !v[id];
  if (next) v[id] = true; else delete v[id];
  localStorage.setItem(HKEY, JSON.stringify(v));
  return next;
}
