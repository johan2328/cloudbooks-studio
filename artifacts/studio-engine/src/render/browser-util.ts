import { spawnSync } from "node:child_process";
import type { Browser } from "puppeteer-core";

/**
 * Cierre DURO de un browser de puppeteer. En Windows, `browser.close()` desconecta el DevTools pero suele
 * DEJAR VIVOS los procesos chrome.exe hijos (renderer/gpu/utility): se acumulan render tras render y ahogan
 * la RAM (bug real: 43 huérfanos tras ~24 renders → thrashing → una corrida de 5 min tardaba 33).
 *
 * Fix: en Windows matamos el ÁRBOL de procesos con `taskkill /T` MIENTRAS el proceso padre sigue vivo (así no
 * quedan huérfanos reparentados). Para cuando llamamos a esto, el PDF ya está en memoria (buffers), así que un
 * kill duro es seguro. En POSIX, `close()` + SIGKILL al proceso raíz alcanza. Todo best-effort (nunca tira).
 */
export async function closeBrowserHard(browser: Browser): Promise<void> {
  const proc = browser.process();
  const pid = proc?.pid;
  if (process.platform === "win32" && pid) {
    // taskkill /T mata el pid Y toda su descendencia de una; /F fuerza. El pid es del browser (aún vivo) → sin reuse.
    try { spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", timeout: 15000 }); return; }
    catch { /* si taskkill no está, cae al close abajo */ }
  }
  try { await browser.close(); } catch { /* ya cerrado/desconectado */ }
  try { if (proc && !proc.killed) proc.kill("SIGKILL"); } catch { /* best-effort */ }
}
