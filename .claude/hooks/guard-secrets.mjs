#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): GUARDIA DE SECRETOS. Bloquea 'git commit' si hay un .env staged.
// Motivo: el .env del engine tiene OPENAI_API_KEY / ENGINE_AZURE_IMAGE_KEY / ENGINE_KIMI_KEY.
// Hasta hoy .env solo estaba ignorado por el .gitignore anidado del engine, no por el de la raiz.
// ASCII-only. Lee el JSON del hook por stdin.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const deny = (reason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
  }));
  process.exit(0);
};

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  let cmd = "";
  try { cmd = String((JSON.parse(raw || "{}").tool_input || {}).command || ""); } catch { /* ignorar */ }
  if (!/\bgit\b[\s\S]*\bcommit\b/.test(cmd)) process.exit(0);

  let staged = "";
  try {
    staged = execSync("git diff --cached --name-only", { cwd: REPO, stdio: "pipe" }).toString();
  } catch { process.exit(0); } // sin repo/git -> no bloquear

  const offenders = staged.split("\n").map((s) => s.trim()).filter(Boolean)
    .filter((f) => /(^|\/)\.env($|\.)/.test(f) && !/\.env\.example$/.test(f));

  if (offenders.length) {
    deny(`Guardia de secretos: hay archivos .env en el staging (${offenders.join(", ")}). Sacalos con 'git restore --staged <archivo>' antes de commitear. Un .env de este repo contiene claves de OpenAI/Azure.`);
  }
  process.exit(0);
});
