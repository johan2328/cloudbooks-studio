/**
 * MUTEX "BUSY" DE LIBRO ACTIVO (anti flip-hazard, T2).
 *
 * Una corrida (Master timeline) o cualquier flujo multi-request que opera sobre el libro
 * activo adquiere este lock al empezar; mientras esté tomado, `POST /engine/library/switch`
 * y `/activate` responden ocupado → no se puede flipar el libro entre requests de la corrida.
 * En memoria (un solo proceso). TTL de seguridad: un lock viejo (corrida colgada/crash) se
 * considera libre pasado `STALE_MS`, para no quedar trabado.
 */
export interface BookLockState { locked: boolean; holder: string | null; since: string | null }

const STALE_MS = 15 * 60 * 1000; // 15 min

let holder: string | null = null;
let sinceMs = 0;

function fresh(): boolean {
  return holder != null && Date.now() - sinceMs < STALE_MS;
}

/** Intenta tomar el lock. Devuelve true si quedó tomado por `who` (o ya estaba stale y se reasignó). */
export function acquireBookLock(who: string): boolean {
  if (fresh()) return false;
  holder = who || "corrida";
  sinceMs = Date.now();
  return true;
}

/** Libera el lock (idempotente). */
export function releaseBookLock(): void {
  holder = null;
  sinceMs = 0;
}

/** Estado actual del lock (stale = libre). */
export function bookLockState(): BookLockState {
  if (!fresh()) return { locked: false, holder: null, since: null };
  return { locked: true, holder, since: new Date(sinceMs).toISOString() };
}
