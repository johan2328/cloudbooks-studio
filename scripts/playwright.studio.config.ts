import { defineConfig } from "@playwright/test";

const port = process.env.STUDIO_VERIFY_PORT ?? "4173";
const baseURL = process.env.STUDIO_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: ".",
  testMatch: /studio-smoke\.spec\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    channel: process.env.STUDIO_VERIFY_BROWSER_CHANNEL ?? (process.platform === "win32" ? "chrome" : undefined),
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.STUDIO_BASE_URL
    ? undefined
    : {
        command: "npm --workspace @workspace/studio run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          ...process.env,
          PORT: port,
          BASE_PATH: "/",
        },
      },
});
