import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

/**
 * Utilidades de file-store seguro (sin dependencias):
 *  - escritura ATÓMICA (temp + rename) → nunca queda un archivo a medias.
 *  - lock ASYNC in-process por clave → serializa operaciones que cruzan un await
 *    (p. ej. read → llamada LLM → write) y evita clobber/doble gasto.
 *  - logging real en vez de catch {} silencioso.
 * Cross-process (varias instancias) lo cubre Postgres en el deploy.
 */

let seq = 0;

export function atomicWriteFileSync(file: string, data: string | Buffer, label = "store"): boolean {
  const tmp = `${file}.tmp-${process.pid}-${seq++}`;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file); // atómico dentro del mismo filesystem
    return true;
  } catch (err) {
    console.error(`[fs-safe] write failed (${label}): ${file} ::`, err);
    try { fs.rmSync(tmp, { force: true }); } catch { /* ignore */ }
    return false;
  }
}

export async function atomicWriteFile(file: string, data: string | Buffer, label = "store"): Promise<boolean> {
  const tmp = `${file}.tmp-${process.pid}-${seq++}`;
  try {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(tmp, data);
    await fsp.rename(tmp, file);
    return true;
  } catch (err) {
    console.error(`[fs-safe] write failed (${label}): ${file} ::`, err);
    try { await fsp.rm(tmp, { force: true }); } catch { /* ignore */ }
    return false;
  }
}

/** Mutex async in-process por clave. Serializa fn contra otras con la misma clave. */
const chains = new Map<string, Promise<unknown>>();
export function withLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
  const prev = chains.get(key) ?? Promise.resolve();
  const result = prev.then(() => fn(), () => fn());
  chains.set(key, result.then(() => undefined, () => undefined));
  return result;
}
