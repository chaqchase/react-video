import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Registry import stays out of the browser bundle; only the slugs matter here.
const SLUGS = [
  "basic",
  "player",
  "fallback",
  "failed-source",
  "source-change",
  "features",
  "hls",
  "hls-engine",
  "dash",
  "engine-unused",
  "live",
  "live-dvr",
  "hls-tracks",
  "playlist",
  "ads",
  "ads-wrapper",
  "ads-empty",
  "drm",
  "drm-missing",
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
      const { violations } = await new AxeBuilder({ page })
        .include('[data-part="root"]')
        .analyze();
      expect(violations.map(({ id }) => id)).toEqual([]);
    });
  });
}
