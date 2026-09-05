import type { EngineStorefront, EngineFicha } from "@/lib/engine-api";

/* ════════════════════════════════════════════════════════════════════════════
   FICHA PUBLICADA — fallback ESTÁTICO, sin engine.

   Por qué existe: la ficha del libro (portada, sinopsis, índice, muestras,
   precio, páginas) se pedía sólo a `/engine/storefront/...`. En producción el
   engine no existe —es la fábrica y corre local—, así que la llamada fallaba y
   la tienda caía a datos inventados: páginas de muestra SINTÉTICAS dibujadas en
   el cliente, precio del mock estático y sin portada real.

   Pero el subconjunto publicado ya viaja dentro del build: `publish-assets`
   copia, por cada libro con `ficha.status === "publicado"`, su portada, su
   contratapa, sus muestras y el propio `_book-config.{cert}.{format}.json`.
   O sea: el dato real ya estaba ahí, sólo que nadie lo leía.

   Precedencia: engine (si responde, gana — trae lo último) → este estático →
   mock de `catalog.ts`. Así la tienda muestra producto real por diseño y no por
   tener la fábrica encendida.
   ════════════════════════════════════════════════════════════════════════════ */

type Cfg = {
  cover?: { imageUrl?: string | null };
  backCover?: { imageUrl?: string | null; price?: string };
  ficha?: Partial<EngineFicha> & { status?: string };
};

const base = (): string => (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

/** Lee el `_book-config` publicado de un libro. `null` si no está publicado o no viajó al build. */
export async function fetchPublishedBook(
  certId: string,
  bookId: string,
): Promise<NonNullable<EngineStorefront["view"]> | null> {
  const url = `${base()}/assets/cloudbooks-engine/_book-config.${encodeURIComponent(certId)}.${encodeURIComponent(bookId)}.json`;
  let cfg: Cfg;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    cfg = (await res.json()) as Cfg;
  } catch {
    return null;   // 404, HTML del SPA en vez de JSON, o sin red
  }

  const ficha = cfg.ficha ?? {};
  // Sólo lo PUBLICADO: un borrador que quedó en el árbol no debe llegar a la tienda.
  if (ficha.status !== "publicado") return null;

  return {
    published: true,
    code: "",          // no vive en el config; libro.tsx cae a su valor estático
    certTitle: "",     // idem
    cover: cfg.cover?.imageUrl ?? null,
    back: cfg.backCover?.imageUrl ?? null,
    price: cfg.backCover?.price ?? "",
    isbn: "",
    ficha: {
      synopsis: ficha.synopsis ?? "",
      about: ficha.about ?? [],
      toc: ficha.toc ?? "",
      samples: ficha.samples ?? [],
      pages: ficha.pages ?? 0,
      categories: ficha.categories ?? [],
      tags: ficha.tags ?? [],
      marketingBlurb: ficha.marketingBlurb ?? "",
      updatedAt: ficha.updatedAt ?? "",
      status: "publicado",
    } as EngineFicha,
  };
}
