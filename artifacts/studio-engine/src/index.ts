import { createApp } from "./server.js";
import { CONFIG } from "./config.js";
import { listSeeds } from "./seeds.js";
import { validateAllSeeds } from "./validate-seed.js";
import { closeBrowser } from "./render/headless-qa.js";
import { startCertSyncScheduler } from "./cert-sync-scheduler.js";

validateAllSeeds(listSeeds());

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
  startCertSyncScheduler();   // sync mensual del póster (chequeo diario por cambio de mes)
});
