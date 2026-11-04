import { defineConfig, devices } from "@playwright/test";

const PORT = 41731;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // Bundled Chromium lacks proprietary codecs, so CI targets real Chrome. Set
    // E2E_CHROME_CHANNEL=chrome locally when Chrome is installed.
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.E2E_CHROME_CHANNEL ?? (process.env.CI ? "chrome" : undefined),
      },
    },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse: another app on this port would silently become the test target.
    reuseExistingServer: false,
  },
});
