import { expect, test, type Page } from "@playwright/test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';
const timeline = '[data-part="timeline"]';

async function open(page: Page) {
  await page.goto("/examples/player");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
}

async function start(page: Page) {
  await open(page);
  await page.locator('[data-part="play-overlay"]').click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
  await expect(page.locator(root)).toHaveAttribute("data-started", "");
}

const currentTime = (page: Page) =>
  page.locator(video).evaluate((element: HTMLVideoElement) => element.currentTime);
const isPaused = (page: Page) =>
  page.locator(video).evaluate((element: HTMLVideoElement) => element.paused);

test("the overlay starts playback and then gets out of the way", async ({ page }) => {
  await start(page);
  const overlay = page.locator('[data-part="play-overlay"]');
  await expect(overlay).toHaveAttribute("data-state", "started");
  await expect(overlay).toBeHidden();
});

test("clicking the video toggles playback", async ({ page }) => {
  await start(page);
  const box = await page.locator(video).boundingBox();
  if (!box) throw new Error("no video box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
  await expect(page.locator(root)).toHaveAttribute("data-paused", "");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 3);
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
});

test("dragging the timeline seeks, keeps showing as playing, and resumes", async ({ page }) => {
  await start(page);
  const box = await page.locator(timeline).boundingBox();
  if (!box) throw new Error("no timeline box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.2, y);
  await page.mouse.down();
  await expect(page.locator(root)).toHaveAttribute("data-scrubbing", "");
  await page.mouse.move(box.x + box.width * 0.4, y, { steps: 5 });
  await page.mouse.move(box.x + box.width * 0.5, y, { steps: 5 });
  await expect.poll(() => isPaused(page)).toBe(true);
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.mouse.up();
  await expect(page.locator(root)).not.toHaveAttribute("data-scrubbing", "");
  await expect.poll(() => isPaused(page)).toBe(false);
  await expect.poll(() => currentTime(page)).toBeGreaterThan(14);
  expect(await currentTime(page)).toBeLessThan(25);
});

test("the timeline works from the keyboard", async ({ page }) => {
  await open(page);
  const input = page.getByRole("slider", { name: "Seek" });
  await input.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => currentTime(page)).toBeCloseTo(5, 0);
  await page.keyboard.press("PageUp");
  await expect.poll(() => currentTime(page)).toBeGreaterThan(29);
  await page.keyboard.press("Home");
  await expect.poll(() => currentTime(page)).toBeCloseTo(0, 0);
  await expect(input).toHaveAttribute("aria-valuetext", /of 0:30/);
});

test("the controls hide while playing and return on movement", async ({ page }) => {
  await start(page);
  const box = await page.locator(root).boundingBox();
  if (!box) throw new Error("no root box");
  await page.mouse.move(box.x + 40, box.y + 40);
  await page.mouse.move(box.x + 60, box.y + 60);
  await expect(page.locator(root)).toHaveAttribute("data-controls", "shown");
  await expect(page.locator(root)).toHaveAttribute("data-controls", "hidden", { timeout: 6000 });
  const controls = page.locator('[data-part="controls"]');
  await expect(controls).toHaveCSS("opacity", "0");
  await page.mouse.move(box.x + 100, box.y + 100);
  await expect(page.locator(root)).toHaveAttribute("data-controls", "shown");
  await expect(controls).toHaveCSS("opacity", "1");
});

test("the controls stay up while paused", async ({ page }) => {
  await open(page);
  await page.waitForTimeout(3500);
  await expect(page.locator(root)).toHaveAttribute("data-controls", "shown");
});

test("Tab reveals hidden controls", async ({ page }) => {
  await start(page);
  await expect(page.locator(root)).toHaveAttribute("data-controls", "hidden", { timeout: 6000 });
  await page.getByRole("button", { name: "Pause" }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(root)).toHaveAttribute("data-controls", "shown");
});

test("mute and the volume slider change real volume", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Mute" }).click();
  await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();
  expect(await page.locator(video).evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await page.getByRole("button", { name: "Unmute" }).click();

  await page.locator('[data-part="volume"]').hover();
  const slider = page.getByRole("slider", { name: "Volume" });
  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveAttribute("aria-valuetext", "95%");
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.volume))
    .toBeCloseTo(0.95, 2);
});

test("fullscreen toggles on the player's root", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "Playwright's WebKit doesn't enter fullscreen headless");
  await open(page);
  await page.getByRole("button", { name: "Fullscreen" }).click();
  await expect(page.locator(root)).toHaveAttribute("data-fullscreen", "");
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(page.locator(root)).not.toHaveAttribute("data-fullscreen", "");
});

test("a narrow player fits, with no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await open(page);
  await expect(page.locator('[data-part="duration"]')).toBeHidden();
  await expect(page.locator('[data-part="volume-slider"]')).toBeHidden();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const row = await page.locator('[data-part="control-row"]').boundingBox();
  const player = await page.locator(root).boundingBox();
  if (!row || !player) throw new Error("no boxes");
  expect(row.x + row.width).toBeLessThanOrEqual(player.x + player.width);
});

test("reduced motion removes movement from the controls", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await expect(page.locator(root)).toHaveAttribute("data-controls", "hidden", { timeout: 6000 });
  await expect(page.locator('[data-part="controls"]')).toHaveCSS("transform", "none");
});
