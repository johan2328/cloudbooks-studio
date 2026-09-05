import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "./config.js";
import { setActiveBook } from "./active-book.js";
import { atomicWriteFileSync } from "./fs-safe.js";
import { canonicalCerts, levelToEngine, type EnrichedCert } from "./certifications.js";
import type { CertLevel, CertTrack } from "./types.js";

/**
 * BIBLIOTECA MULTI-CLOUD (cloud → certificación → libro/formato).
 *
 * El árbol de la cabina se arma desde acá. Hoy solo Azure / AI-200 / Visual Atlas
 * tiene contenido real; el resto del catálogo son certificaciones ACTIVABLES:
 * al activar una se crea su SHELL (cert + formatos vacíos) lista para seedear —
 * el mismo punto de arranque que tuvo AI-200, no un placeholder muerto.
 *
 * - Registro estático (CATALOG): qué existe en cada nube (verdad de catálogo).
 * - Store de activación (_library-activations.json): qué activó el humano.
 *   El árbol mezcla ambos: una cert/lib "available" pasa a "active" al activarse.
 *
 * File-store ahora; Postgres en la corrida 17. Es el mapa CERTS de la corrida 22.
 */

export type CloudId = "azure" | "aws" | "gcp";
/** active = en producción · available = activable (shell) · coming_soon = aún no */
export type LibStatus = "active" | "available" | "coming_soon";

export interface LibBook {
  id: string;
  label: string;
  /** Clave de ícono que el frontend mapea a un ícono de lucide. */
  icon: string;
  status: LibStatus;
  state: string;
  /** Activado para producción (switcheable). Los no-activados salen en gris con tag "próx". */
  enabled?: boolean;
}
// CertLevel y CertTrack se movieron a types.ts (hoja sin imports) para romper el ciclo
// real library-catalog <-> certifications. Se re-exportan para no cambiar el import de
// quien ya los tomaba de aca.
export type { CertLevel, CertTrack } from "./types.js";

export interface LibCert {
  id: string;
  code: string;
  name: string;
  track: CertTrack;
  level: CertLevel;
  domains: number;
  pagesPlanned: number;
  status: LibStatus;
  books: LibBook[];
}
export interface LibCloud {
  id: CloudId;
  label: string;
  status: LibStatus;
  /** Las nubes coming_soon van vacías (solo visibles); Azure trae su catálogo. */
  certs: LibCert[];
}
export interface LibraryTree {
  clouds: LibCloud[];
  /** Cert + libro activos sobre los que opera el workspace (hoy fijo en AI-200). */
  activeCertId: string;
  activeBookId: string;
}

/** Los 6 formatos de libro de una certificación (mismos que el Visual Atlas). */
function bookSet(opts: { activeBook?: string }): LibBook[] {
  const active = opts.activeBook;
  const mk = (id: string, label: string, icon: string, state: string): LibBook => ({
    id, label, icon,
    status: id === active ? "active" : "available",
    state: id === active ? "Producción activa" : state,
  });
  return [
    mk("visual-atlas", "Visual Atlas", "LayoutTemplate", "Listo para activar"),
    mk("master-book", "Master Book", "BookOpen", "Planificación"),
    mk("exam-traps", "Exam Traps Guide", "AlertTriangle", "Pendiente de extracción"),
    mk("question-bank", "Question Bank", "CircleDashed", "Planificación"),
    mk("cheat-sheets", "Cheat Sheets", "FileText", "Planificación"),
    mk("rapid-review", "Rapid Review", "Sparkles", "Planificación"),
  ];
}

/** Convierte un cert canónico enriquecido en el nodo LibCert del árbol. AI-200 = activo (Atlas). */
function certToLib(c: EnrichedCert): LibCert {
  const id = c.code.toLowerCase();
  const active = id === "ai-200";
  return {
    id, code: c.code, name: c.title, track: c.track, level: levelToEngine(c.level), domains: c.domains, pagesPlanned: c.pages,
    status: active ? "active" : "available",
    books: bookSet(active ? { activeBook: "visual-atlas" } : {}),
  };
}

/** Catálogo (verdad de qué existe) DERIVADO del catálogo canónico de certs (fuente única). */
function getCatalog(): LibCloud[] {
  return [
    // Retiradas/Sustituidas SALEN del loop (árbol/grilla/métricas/activación); el cert activo nunca se filtra (no romper el workspace).
    { id: "azure", label: "Azure", status: "active", certs: canonicalCerts().filter((c) => c.code.toLowerCase() === CONFIG.certId || !/retir|sustitu/i.test(c.status)).map(certToLib) },
    { id: "aws", label: "AWS", status: "coming_soon", certs: [] },
    { id: "gcp", label: "GCP", status: "coming_soon", certs: [] },
  ];
}

// ── store de activación ──
interface Activations { certs: Record<string, { activatedAt: string; books: string[] }> }

function storePath(): string {
  return path.join(CONFIG.outputRoot, "_library-activations.json");
}
function readActivations(): Activations {
  try { return JSON.parse(fs.readFileSync(storePath(), "utf8")) as Activations; } catch { return { certs: {} }; }
}
function writeActivations(a: Activations): void {
  atomicWriteFileSync(storePath(), JSON.stringify(a, null, 2), "library-activations");
}

/** Localiza una cert en el registro estático (deep clone para no mutar el const). */
function findCert(certId: string): { cloud: LibCloud; cert: LibCert } | null {
  for (const cloud of getCatalog()) {
    const cert = cloud.certs.find((c) => c.id === certId);
    if (cert) return { cloud, cert };
  }
  return null;
}

/** Libros activados por DEFECTO (siempre encendidos para producción, aunque el store esté vacío). */
const DEFAULT_ENABLED: Record<string, string[]> = { "ai-200": ["visual-atlas", "master-book"] };

/** Set de libros ACTIVADOS (enabled) de una cert: default + store de activaciones. */
function enabledBooksFor(certId: string, staticBooks: LibBook[], act: Activations): Set<string> {
  return new Set([
    ...staticBooks.filter((b) => b.status === "active").map((b) => b.id),   // el activo estático (Atlas)
    ...(DEFAULT_ENABLED[certId] ?? []),
    ...(act.certs[certId]?.books ?? []),
  ]);
}

/**
 * Árbol con las activaciones mezcladas. Distingue TRES estados por libro:
 *  - `status:"active"` = el libro de TRABAJO actual (CONFIG.format) → resaltado.
 *  - `enabled:true` (`status:"available"`) = activado, switcheable.
 *  - `enabled:false` (`status:"coming_soon"`) = "próx", en gris, no switcheable.
 */
export function buildLibraryTree(): LibraryTree {
  const act = readActivations();
  const clouds: LibCloud[] = getCatalog().map((cloud) => ({
    ...cloud,
    certs: cloud.certs.map((cert) => {
      const enabled = enabledBooksFor(cert.id, cert.books, act);
      const books = cert.books.map((b): LibBook => {
        const isEnabled = enabled.has(b.id);
        const isCurrent = cert.id === CONFIG.certId && b.id === CONFIG.format;
        return {
          ...b,
          enabled: isEnabled,
          status: isCurrent ? "active" : isEnabled ? "available" : "coming_soon",
          state: isCurrent ? "Producción activa" : isEnabled ? "Activado · listo" : b.state,
        };
      });
      const isActive = cert.status === "active" || !!act.certs[cert.id];
      return { ...cert, status: isActive ? ("active" as LibStatus) : cert.status, books };
    }),
  }));
  return { clouds, activeCertId: CONFIG.certId, activeBookId: CONFIG.format };
}

export interface ActivateResult { ok: boolean; tree: LibraryTree; error?: string }

/** Activa un LIBRO de una certificación → shell navegable listo para seedear. */
export function activateCertBook(certId: string, bookId: string): ActivateResult {
  const found = findCert(certId);
  if (!found) return { ok: false, tree: buildLibraryTree(), error: `cert_desconocida:${certId}` };
  if (!found.cert.books.some((b) => b.id === bookId)) {
    return { ok: false, tree: buildLibraryTree(), error: `libro_desconocido:${bookId}` };
  }
  const act = readActivations();
  const entry = act.certs[certId] ?? { activatedAt: new Date().toISOString(), books: [] };
  if (!entry.books.includes(bookId)) entry.books.push(bookId);
  act.certs[certId] = entry;
  writeActivations(act);
  // Activar un libro = ABRIRLO: reencamina el motor a operar sobre él (certId/format del store activo).
  setActiveBook(CONFIG.outputRoot, { certId, format: bookId });
  return { ok: true, tree: buildLibraryTree() };
}

/** ACTIVAR/DESACTIVAR un libro para producción (Timeline). NO cambia el libro de trabajo. */
export function enableBook(certId: string, bookId: string, enabled: boolean): ActivateResult {
  const found = findCert(certId);
  if (!found) return { ok: false, tree: buildLibraryTree(), error: `cert_desconocida:${certId}` };
  if (!found.cert.books.some((b) => b.id === bookId)) return { ok: false, tree: buildLibraryTree(), error: `libro_desconocido:${bookId}` };
  const act = readActivations();
  const entry = act.certs[certId] ?? { activatedAt: new Date().toISOString(), books: [] };
  if (enabled) { if (!entry.books.includes(bookId)) entry.books.push(bookId); }
  else { entry.books = entry.books.filter((b) => b !== bookId); }
  act.certs[certId] = entry;
  writeActivations(act);
  return { ok: true, tree: buildLibraryTree() };
}

/** CAMBIAR el libro de TRABAJO (árbol). Exige que el libro esté activado (enabled). NO activa. */
export function switchBook(certId: string, bookId: string): ActivateResult {
  const found = findCert(certId);
  if (!found) return { ok: false, tree: buildLibraryTree(), error: `cert_desconocida:${certId}` };
  if (!found.cert.books.some((b) => b.id === bookId)) return { ok: false, tree: buildLibraryTree(), error: `libro_desconocido:${bookId}` };
  const enabled = enabledBooksFor(certId, found.cert.books, readActivations());
  if (!enabled.has(bookId)) return { ok: false, tree: buildLibraryTree(), error: `libro_no_activado:${bookId}` };
  setActiveBook(CONFIG.outputRoot, { certId, format: bookId });
  return { ok: true, tree: buildLibraryTree() };
}
