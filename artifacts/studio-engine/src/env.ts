import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Cargador mínimo de .env (sin dependencias). Solo setea variables que no
 * existan ya en process.env (Replit Secrets tienen prioridad).
 */
export function loadDotEnv(): void {
  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.resolve(dir, "..", ".env");
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m || line.trimStart().startsWith("#")) continue;
      const key = m[1]!;
      let val = m[2] ?? "";
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* noop */
  }
}
