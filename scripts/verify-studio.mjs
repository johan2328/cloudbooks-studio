import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function localNodeScript(...segments) {
  const scriptPath = path.join(process.cwd(), "node_modules", ...segments);
  if (!existsSync(scriptPath)) {
    throw new Error(`Missing local script: ${scriptPath}. Run npm install first.`);
  }
  return scriptPath;
}

function executable(name) {
  if (process.platform !== "win32") return name;
  if (name === "npm") return `${name}.cmd`;
  return name;
}

function run(label, command, args, options = {}) {
  console.log(`\n[verify:studio] ${label}`);
  const commandLine = [command, ...args].join(" ");
  const result = command === "npm" && process.platform === "win32"
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
        stdio: "inherit",
        shell: false,
        env: { ...process.env, ...options.env },
        cwd: options.cwd ?? process.cwd(),
      })
    : spawnSync(executable(command), args, {
        stdio: "inherit",
        shell: false,
        env: { ...process.env, ...options.env },
        cwd: options.cwd ?? process.cwd(),
      });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${label} failed with exit code ${process.exitCode}`);
  }
}

async function waitForUrl(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Server is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function ensureStudioServer() {
  const port = process.env.STUDIO_VERIFY_PORT ?? "4173";
  const baseUrl = process.env.STUDIO_BASE_URL ?? `http://127.0.0.1:${port}`;
  try {
    const response = await fetch(baseUrl);
    if (response.ok) {
      console.log(`\n[verify:studio] Reusing Studio server at ${baseUrl}`);
      return { baseUrl, child: null };
    }
  } catch {
    // No existing server; start one below.
  }

  console.log(`\n[verify:studio] Starting Studio server at ${baseUrl}`);
  const childArgs = ["--workspace", "@workspace/studio", "run", "dev"];
  const child = process.platform === "win32"
    ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npm", ...childArgs].join(" ")], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: port,
          BASE_PATH: "/",
        },
        stdio: "inherit",
        shell: false,
      })
    : spawn("npm", childArgs, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: port,
          BASE_PATH: "/",
        },
        stdio: "inherit",
        shell: false,
      });

  child.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[verify:studio] Studio server exited with code ${code}`);
    }
    if (signal) {
      console.error(`[verify:studio] Studio server exited with signal ${signal}`);
    }
  });

  await waitForUrl(baseUrl);
  return { baseUrl, child };
}

function stopChild(child) {
  if (!child || child.killed) return;
  child.kill();
}

let studioServer = null;

try {
  run("Studio typecheck", "npm", ["--workspace", "@workspace/studio", "run", "typecheck"]);
  run("Studio production build", "npm", ["--workspace", "@workspace/studio", "run", "build"], {
    env: {
      PORT: process.env.PORT ?? "4173",
      BASE_PATH: process.env.BASE_PATH ?? "/",
    },
  });

  if (process.env.STUDIO_VERIFY_SKIP_BROWSER === "1") {
    console.log("\n[verify:studio] Browser smoke skipped by STUDIO_VERIFY_SKIP_BROWSER=1");
    process.exit(0);
  }

  studioServer = await ensureStudioServer();

  if (process.env.STUDIO_VERIFY_INSTALL_BROWSER === "1") {
    run("Ensure Playwright Chromium", process.execPath, [
      localNodeScript("@playwright", "test", "cli.js"),
      "install",
      "chromium",
    ]);
  }
  run("Studio browser smoke", process.execPath, [
    localNodeScript("@playwright", "test", "cli.js"),
    "test",
    "--config",
    "scripts/playwright.studio.config.ts",
    "--reporter=line",
  ], {
    env: {
      STUDIO_BASE_URL: studioServer.baseUrl,
    },
  });

  console.log("\n[verify:studio] OK");
} catch (err) {
  console.error(`\n[verify:studio] FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(process.exitCode || 1);
} finally {
  stopChild(studioServer?.child);
}
