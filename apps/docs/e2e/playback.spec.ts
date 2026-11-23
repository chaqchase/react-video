import { expect, test } from "./test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';

test("plays and pauses from the button, and time advances", async ({ page }) => {
  await page.goto("/examples/basic");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
  await expect(page.locator(root)).toHaveAttribute("data-started", "");
  await expect(page.locator('[data-part="current-time"]')).not.toHaveText("0:00", {
    timeout: 10_000,
  });

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.locator(root)).toHaveAttribute("data-paused", "");
  const stopped = await page.locator(video).evaluate((el: HTMLVideoElement) => el.paused);
  expect(stopped).toBe(true);
});

test("moves past a broken source to one that works", async ({ page }) => {
  await page.goto("/examples/fallback");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
  await expect(page.locator(root)).not.toHaveAttribute("data-error", "");

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
});

test("reports a failed source instead of loading forever", async ({ page }) => {
  await page.goto("/examples/failed-source");
  await expect(page.locator(root)).toHaveAttribute("data-status", "error");
  await expect(page.locator(root)).toHaveAttribute("data-error", "");
  await expect(page.locator(root).getByRole("alert")).not.toBeEmpty();
});

test("loads a new source when src changes", async ({ page }) => {
  await page.goto("/examples/source-change");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
  const first = await page.locator(video).evaluate((el: HTMLVideoElement) => el.currentSrc);

  await page.getByRole("button", { name: "High" }).click();
  await expect
    .poll(() => page.locator(video).evaluate((el: HTMLVideoElement) => el.currentSrc))
    .not.toBe(first);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
});
