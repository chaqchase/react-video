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
    // Headless browsers still reach the speakers, so each project is muted without the page knowing.
    // Bundled Chromium lacks proprietary codecs, so CI targets real Chrome. Locally,
    // set E2E_CHROME_CHANNEL=chrome, or E2E_CHROME_PATH to any Chromium browser's binary.
    {
      name: "chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.E2E_CHROME_CHANNEL ?? (process.env.CI ? "chrome" : undefined),
        launchOptions: {
          args: ["--mute-audio"],
          ...(process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : {}),
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: { firefoxUserPrefs: { "media.volume_scale": "0.0" } },
      },
    },
    // WebKit has no such option, so `e2e/test.ts` silences it.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `pnpm exec next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // Never reuse: another app on this port would silently become the test target.
    reuseExistingServer: false,
  },
});
