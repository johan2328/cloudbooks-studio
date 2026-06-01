import { execSync } from "node:child_process";

function readGitValue(command: string): string | null {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim() || null;
  } catch {
    return null;
  }
}

export function getRuntimeInfo() {
  const gitSha = readGitValue("git rev-parse --short HEAD");
  const gitBranch = readGitValue("git rev-parse --abbrev-ref HEAD");
  const gitDirty = readGitValue("git status --porcelain") ? true : false;

  return {
    gitSha,
    gitBranch,
    gitDirty,
    syncCommand: "npm run sync:replit",
    secretsSource: "replit_secrets_only",
  };
}
