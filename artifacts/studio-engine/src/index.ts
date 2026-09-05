import fs from "node:fs";
import { createApp } from "./server.js";
import { CONFIG } from "./config.js";
import { listSeeds } from "./seeds.js";
import { validateAllSeeds } from "./validate-seed.js";
import { closeBrowser } from "./render/headless-qa.js";
import { startCertSyncScheduler } from "./cert-sync-scheduler.js";

validateAllSeeds(listSeeds());

/**
 * Avisa FUERTE si el working root no parece el correcto.
 *
 * El modo de falla que cubre no es un crash sino un silencio: si `outputRoot` apunta
 * a un directorio equivocado, la biblioteca sale vacía, el motor lo toma como "no hay
 * libros todavía" y a la primera escritura MATERIALIZA ese árbol falso (los stores
 * hacen `mkdirSync`). Los libros reales siguen intactos en otro lado, pero nada lo
 * dice. Un root sin ningún `_book-config.*.json` es la señal barata de que pasó eso.
 *
 * Avisa, no aborta: un primer arranque legítimo tampoco tiene configs todavía.
 */
function warnSiElRootPareceEquivocado(): void {
  let configs = 0;
  try {
    configs = fs.readdirSync(CONFIG.outputRoot).filter((n) => /^_book-config\..+\.json$/.test(n)).length;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(`[studio-engine] AVISO: el working root NO EXISTE todavia -> ${CONFIG.outputRoot}`);
    // eslint-disable-next-line no-console
    console.warn(`[studio-engine]        Si esperabas encontrar tus libros, revisa ENGINE_OUTPUT_ROOT en .env.`);
    return;
  }
  if (configs === 0) {
    // eslint-disable-next-line no-console
    console.warn(`[studio-engine] AVISO: no hay ningun _book-config en ${CONFIG.outputRoot}`);
    // eslint-disable-next-line no-console
    console.warn(`[studio-engine]        Es normal en un primer arranque; si NO lo es, el root esta mal y el motor`);
    // eslint-disable-next-line no-console
    console.warn(`[studio-engine]        va a crear uno vacio en cuanto escriba. Revisa ENGINE_OUTPUT_ROOT.`);
  }
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => { void closeBrowser().finally(() => process.exit(0)); });
}

const app = createApp();

// Por defecto SOLO localhost (no toda la LAN). Para exponerlo a la red: ENGINE_HOST=0.0.0.0 (con firewall + token).
const HOST = process.env.ENGINE_HOST ?? "127.0.0.1";
app.listen(CONFIG.port, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[studio-engine] QA renderizada (headless): ${CONFIG.chromePath ? CONFIG.chromePath : "no disponible"} · variantes-siempre=${CONFIG.alwaysVariants}`);
  // eslint-disable-next-line no-console
  console.log(
    `[studio-engine] escuchando en http://${HOST}:${CONFIG.port}  ·  store=${CONFIG.store}  ·  openai=${CONFIG.openaiKey ? "on" : "off"}`,
  );
  // eslint-disable-next-line no-console
  console.log(`[studio-engine] salidas en ${CONFIG.outputRoot}`);
  warnSiElRootPareceEquivocado();
  startCertSyncScheduler();   // sync mensual del póster (chequeo diario por cambio de mes)
});
