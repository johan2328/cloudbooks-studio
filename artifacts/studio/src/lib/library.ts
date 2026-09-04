/* ════════════════════════════════════════════════════════════════════════════
   BIBLIOTECA del cliente (demo) — lo que se "compra" en el checkout se guarda
   aquí en localStorage y se lee en /mi-biblioteca. // TODO_REAL: órdenes en backend.
   ════════════════════════════════════════════════════════════════════════════ */

export interface OwnedBook {
  id: string; name: string; cert: string; format: string; price: number;
  order: string; purchasedAt: string; // ISO
}

const KEY = "cloudbooks_library_v1";

export function getLibrary(): OwnedBook[] {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as OwnedBook[]) : []; }
  catch { return []; }
}

export function addToLibrary(items: OwnedBook[]): void {
  const cur = getLibrary();
  const byId = new Map(cur.map(b => [b.id, b]));
  for (const it of items) if (!byId.has(it.id)) byId.set(it.id, it);
  localStorage.setItem(KEY, JSON.stringify([...byId.values()]));
}

export function ownsBook(id: string): boolean {
  return getLibrary().some(b => b.id === id);
}
