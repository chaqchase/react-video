import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Registry import stays out of the browser bundle; only the slugs matter here.
const SLUGS = [
  "basic",
  "player",
  "fallback",
  "failed-source",
  "failed-player",
  "source-change",
  "features",
  "hls",
  "hls-engine",
  "dash",
  "dash-captions",
  "engine-unused",
  "live",
  "live-dvr",
  "hls-tracks",
  "compose-ready",
  "compose-parts",
  "compose-headless",
  "speed",
  "quality",
  "captions",
  "chapters",
  "thumbnails",
  "idle",
  "gestures",
  "hotkeys",
  "fullscreen",
  "pip",
  "recovery",
  "autoplay",
  "persistence",
  "media-session",
  "analytics",
  "google-analytics",
  "errors",
  "i18n",
  "airplay",
  "chromecast",
  "custom-plugin",
  "playlist",
  "ads",
  "ads-wrapper",
  "ads-empty",
  "drm",
  "drm-missing",
  "episodes",
  "skip",
  "info",
  "player-title",
  "vertical",
  "themes",
  "ambient",
  "mini-player",
  "screenshot",
  "loop",
  "shortcuts",
  "stats",
  "share",
  "fit",
  "transcript",
];

for (const slug of SLUGS) {
  test.describe(`example: ${slug}`, () => {
    test("renders without console or hydration errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });

      await page.goto(`/examples/${slug}`);
      await expect(page.locator('[data-part="root"]')).toBeVisible();
      expect(errors).toEqual([]);
    });

    test("has no detectable accessibility violations", async ({ page }) => {
      await page.goto(`/examples/${slug}`);
      await expect(page.locator('[data-part="root"]')).toBeVisible();
      // Legacy mode runs in this page. The default also opens a blank one to report
      // from, and that's what occasionally hangs when many pages are busy at once.
      const { violations } = await new AxeBuilder({ page })
        .setLegacyMode(true)
        .include('[data-part="root"]')
        .analyze();
      expect(violations.map(({ id }) => id)).toEqual([]);
    });
  });
}
