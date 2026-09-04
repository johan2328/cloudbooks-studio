/* ════════════════════════════════════════════════════════════════════════════
   Acceso al Estudio (gate simple de prototipo).
   ⚠️ La clave vive en el cliente: NO es seguridad real, solo una compuerta de
   demo. Para producción, mover la verificación a un backend.
   ════════════════════════════════════════════════════════════════════════════ */

const KEY = "cloudbooks_estudio_v1";
const PASS = "123456joh";

export function isEstudioAuthed(): boolean {
  try {
    return localStorage.getItem(KEY) === "ok";
  } catch {
    return false;
  }
}

export function loginEstudio(pwd: string): boolean {
  if (pwd === PASS) {
    try { localStorage.setItem(KEY, "ok"); } catch { /* ignore */ }
    return true;
  }
  return false;
}

export function logoutEstudio(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
