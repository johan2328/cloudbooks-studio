/* ════════════════════════════════════════════════════════════════════════════
   LISTA DE ESPERA — mientras las ventas no estén abiertas, el checkout registra
   interés en vez de simular un cobro. Se guarda en localStorage del visitante.

   Por qué existe: el flujo anterior pedía número de tarjeta con autocompletado
   real (`autoComplete="cc-number"`), prometía "Procesado por Stripe" y "pago
   cifrado SSL", y confirmaba una compra que nunca cobró ni entregó nada. Eso no
   es una demo incompleta: es una experiencia con forma de fraude. Hasta que
   exista el backend de pagos (ver artifacts/studio/PAYMENTS_INTEGRATION.md),
   esto sólo anota a quién avisar.

   // TODO_REAL: POST al backend en vez de localStorage, para que la lista
   // sobreviva al navegador del visitante y se le pueda escribir de verdad.
   ════════════════════════════════════════════════════════════════════════════ */

export interface WaitlistEntry {
  id: string; name: string; cert: string; format: string; price: number;
  email: string; requestedAt: string; // ISO
}

const KEY = "cloudbooks_waitlist_v1";

export function getWaitlist(): WaitlistEntry[] {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as WaitlistEntry[]) : []; }
  catch { return []; }
}

export function joinWaitlist(entries: WaitlistEntry[]): void {
  const cur = getWaitlist();
  const byId = new Map(cur.map(e => [e.id, e]));
  for (const it of entries) byId.set(it.id, it);   // el pedido más reciente gana (puede cambiar el email)
  try { localStorage.setItem(KEY, JSON.stringify([...byId.values()])); }
  catch { /* modo privado o storage lleno: no es crítico, se pierde el registro local */ }
}

export function isOnWaitlist(id: string): boolean {
  return getWaitlist().some(e => e.id === id);
}
