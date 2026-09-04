#!/usr/bin/env node
// PostToolUse (Edit|Write): si se toco un .ts del studio-engine, corre el typecheck de ESE paquete
// y recuerda reiniciar el engine (corre en modo start sin watch: sin restart, el fix no toma efecto).
// ASCII-only a proposito. Lee el JSON del hook por stdin.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = path.resolve(fileURLToPath(new URL("../../artifacts/studio-engine", import.meta.url)));

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  let file = "";
  try {
    const j = JSON.parse(raw || "{}");
    file = (j.tool_input && j.tool_input.file_path) || (j.tool_response && j.tool_response.filePath) || "";
  } catch { /* payload ilegible -> no bloquear */ }

  const norm = String(file).replace(/\\/g, "/");
  if (!/artifacts\/studio-engine\/.*\.tsx?$/.test(norm)) process.exit(0); // no es del engine: silencio

  let errors = "";
  try {
    execSync("node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json", { cwd: ENGINE, stdio: "pipe" });
  } catch (e) {
    errors = `${String(e.stdout ?? "")}${String(e.stderr ?? "")}`.trim();
  }

  const restart = "Recorda REINICIAR el engine para que el cambio .ts tome efecto: matar el PID del puerto 8790 y arrancar con 'node --env-file=.env --import tsx src/index.ts'.";
  const head = errors ? errors.split("\n").slice(0, 12).join("\n") : "";
  const msg = errors ? `typecheck FALLO en studio-engine:\n${head}\n\n${restart}` : `typecheck OK en studio-engine. ${restart}`;
  process.stdout.write(JSON.stringify({ systemMessage: msg }));
});
