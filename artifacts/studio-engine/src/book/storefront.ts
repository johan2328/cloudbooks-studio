import { runWithBook } from "../book-context.js";
import { getBookConfig } from "./book-config.js";
import { certMetaByEngineId } from "../certifications.js";
import type { FichaConfig } from "./book-config.js";

/**
 * ESCAPARATE PÚBLICO: la ficha comercial de UN libro para la página de tienda (`/libro/:id`).
 * Lee la config de ese cert/formato SIN cambiar el libro activo (ALS `runWithBook` → los getters
 * de CONFIG resuelven al libro pedido solo durante esta lectura; no persiste nada, flip-safe).
 * Gate: por defecto solo expone fichas `publicado`; `preview` (estudio) expone cualquier estado.
 */
export interface StorefrontView {
  published: boolean;
  code: string;
  certTitle: string;
  cover: string | null;
  back: string | null;
  price: string;
  isbn: string;
  ficha: FichaConfig;
}

/** Los 6 formatos de una cert (mismos ids que la biblioteca). */
const BOOK_FORMATS = ["visual-atlas", "master-book", "exam-traps", "question-bank", "cheat-sheets", "rapid-review"] as const;
const FORMAT_LABEL: Record<string, string> = {
  "visual-atlas": "Visual Atlas", "master-book": "Master Book", "exam-traps": "Exam Traps Guide",
  "question-bank": "Question Bank", "cheat-sheets": "Cheat Sheets", "rapid-review": "Rapid Review",
};

export interface StorefrontCatalogItem { bookId: string; label: string; price: string; published: boolean; cover: string | null }

/** Precio real + estado publicado + portada de los 6 libros de la cert (hermanos/colección en la tienda).
 *  Flip-safe: lee cada libro con `runWithBook`, sin tocar el libro activo. */
export function getStorefrontCatalog(certId: string): StorefrontCatalogItem[] {
  return BOOK_FORMATS.map((bookId) => runWithBook({ certId, format: bookId }, () => {
    const cfg = getBookConfig();
    return { bookId, label: FORMAT_LABEL[bookId] ?? bookId, price: cfg.backCover.price, published: cfg.ficha.status === "publicado", cover: cfg.cover.imageUrl };
  }));
}

export function getStorefront(certId: string, bookId: string, preview = false): { published: boolean; view?: StorefrontView } {
  return runWithBook({ certId, format: bookId }, () => {
    const cfg = getBookConfig();
    const isPublished = cfg.ficha.status === "publicado";
    if (!isPublished && !preview) return { published: false };
    const meta = certMetaByEngineId(certId);
    return {
      published: isPublished,
      view: {
        published: isPublished,
        code: meta.code,
        certTitle: meta.title,
        cover: cfg.cover.imageUrl,
        back: cfg.backCover.imageUrl,
        price: cfg.backCover.price,
        isbn: cfg.backCover.isbn,
        ficha: cfg.ficha,
      },
    };
  });
}
