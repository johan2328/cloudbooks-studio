import { AsyncLocalStorage } from "node:async_hooks";

/**
 * CONTEXTO DE LIBRO POR OPERACIÓN (anti flip-hazard, T2).
 *
 * El motor tiene UN libro activo singleton (`active-book.ts`) que `CONFIG.certId/format`
 * leen en vivo. Si el libro flipa (switchBook desde otra pestaña) MIENTRAS una operación
 * está en vuelo (p.ej. una generación con `await`), los writes/costos posteriores caerían
 * en el libro equivocado. Este ALS **fija** el libro al INICIO del request y lo mantiene
 * para toda su continuación async → `CONFIG.certId/format` resuelven al libro fijado,
 * inmunes a flips concurrentes. `active-book.setActiveBook` actualiza el pin del request
 * actual (vía `pinCurrentBook`) para que los mutadores (switch/activate) vean su cambio.
 *
 * NO importa config.ts ni active-book.ts (evita ciclos): solo async_hooks.
 */
export interface BookRef { certId: string; format: string }

const als = new AsyncLocalStorage<{ book: BookRef }>();

/** Corre `fn` con `book` fijado para TODA su continuación async. */
export function runWithBook<T>(book: BookRef, fn: () => T): T {
  return als.run({ book: { certId: book.certId, format: book.format } }, fn);
}

/** El libro fijado para el request/operación actual, si hay uno. */
export function currentBook(): BookRef | undefined {
  return als.getStore()?.book;
}

/** Reemplaza el pin del request actual (lo usa setActiveBook para que el mutador vea su cambio). */
export function pinCurrentBook(book: BookRef): void {
  const s = als.getStore();
  if (s) s.book = { certId: book.certId, format: book.format };
}
