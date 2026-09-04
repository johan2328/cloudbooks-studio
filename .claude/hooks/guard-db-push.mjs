#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): bloquea empujes de esquema a una base de datos VIVA.
// 'drizzle-kit push' (lib/db) y 'scripts/post-merge.sh' aplican el esquema sin migracion revisable.
// ASCII-only. Lee el JSON del hook por stdin.
const PATTERNS = [
  /drizzle-kit\s+push/i,
  /\bdb\b[\s\S]*run\s+push(-force)?\b/i,
  /pnpm[\s\S]*--filter[\s\S]*db[\s\S]*push/i,
  /post-merge\.sh/i,
];

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  let cmd = "";
  try { cmd = String((JSON.parse(raw || "{}").tool_input || {}).command || ""); } catch { /* ignorar */ }
  if (!PATTERNS.some((re) => re.test(cmd))) process.exit(0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "Bloqueado: este comando empuja el esquema a una base de datos VIVA (drizzle-kit push / post-merge). No es reversible ni revisable como una migracion. Si de verdad hace falta, que lo corra una persona a mano con confirmacion explicita.",
    },
  }));
  process.exit(0);
});
