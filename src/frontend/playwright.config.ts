import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:13000",
    browserName: "chromium",
    trace: "retain-on-failure",
    timezoneId: "Asia/Krasnoyarsk",
  },
  webServer: [
    {
      command: "bun scripts/e2e-api.ts",
      url: "http://127.0.0.1:18080/api/v1/health",
      timeout: 180000,
      reuseExistingServer: false,
    },
    {
      command: "bun run dev --port 13000",
      url: "http://127.0.0.1:13000",
      env: { API_ORIGIN: "http://127.0.0.1:18080" },
      timeout: 180000,
      reuseExistingServer: false,
    },
  ],
});
