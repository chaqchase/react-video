import { expect, test, type Page } from "./test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';

const videoProperty = <Value>(page: Page, read: (element: HTMLVideoElement) => Value) =>
  page.locator(video).evaluate(read);

async function start(page: Page, slug: string) {
  await page.goto(`/examples/${slug}`);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  // Muted, so autoplay policies can't interfere with the test.
  await page.getByRole("button", { name: "Mute" }).click();
  await page.locator('[data-part="play-overlay"]').click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
}

const seek = (page: Page, time: number) =>
  page.locator(video).evaluate((element: HTMLVideoElement, to) => {
    element.currentTime = to;
  }, time);

test.describe("title", () => {
  test("keeps the description for while it's paused", async ({ page }) => {
    await page.goto("/examples/player-title");
    await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
    await page.locator(root).hover();
    await expect(page.locator('[data-part="title-text"]')).toHaveText("The Green Coast");
    await expect(page.locator('[data-part="title-eyebrow"]')).toHaveText("Season 1, Episode 1");
    const description = page.locator('[data-part="title-description"]');
    await expect(description).toHaveCSS("opacity", "1");

    await page.locator('[data-part="play-overlay"]').click();
    await expect(description).toHaveCSS("opacity", "0");
    await expect(description).toHaveCSS("max-height", "0px");
  });
});

test.describe("episodes", () => {
  test("browses by season and plays what's chosen", async ({ page }) => {
    await start(page, "episodes");
    await page.locator(root).hover();
    await page.getByRole("button", { name: "Episodes" }).click();

    const shelf = page.getByRole("dialog", { name: "Episodes" });
    await expect(shelf).toBeVisible();
    await expect(page.locator(root)).toHaveAttribute("data-episodes-open", "");
    await expect(page.locator('[data-part="controls"]')).toBeHidden();
    await expect(shelf.locator('[data-part="episode"]')).toHaveCount(4);
    await expect(page.locator('[data-part="episode"]:focus')).toHaveAttribute("aria-current", "true");

    await shelf.getByRole("button", { name: "Season 2" }).click();
    await expect(shelf.locator('[data-part="episode"]')).toHaveCount(2);
    await shelf.getByRole("button", { name: /Heavy Water/ }).click();

    await expect(shelf).toBeHidden();
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc)).toContain("episodes/5.mp4");
    await expect(page.locator('[data-part="title-text"]')).toHaveText("Heavy Water");
    expect(await videoProperty(page, (element) => element.paused)).toBe(false);
  });

  test("works from the keyboard, and keeps hotkeys out", async ({ page }) => {
    await start(page, "episodes");
    await page.locator(root).hover();
    const button = page.getByRole("button", { name: "Episodes" });
    await button.click();
    const tiles = page.locator('[data-part="episode"]');
    await expect(tiles.first()).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(tiles.nth(1)).toBeFocused();
    const before = await videoProperty(page, (element) => element.muted);
    await page.keyboard.press("m");
    expect(await videoProperty(page, (element) => element.muted)).toBe(before);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Episodes" })).toBeHidden();
    await expect(button).toBeFocused();
    await expect(page.locator('[data-part="controls"]')).toBeVisible();
  });

  test("closes on a click above the shelf, without pausing", async ({ page }) => {
    await start(page, "episodes");
    await page.locator(root).hover();
    await page.getByRole("button", { name: "Episodes" }).click();
    const box = await page.locator(root).boundingBox();
    if (!box) throw new Error("no player");
    await page.mouse.click(box.x + box.width / 2, box.y + 20);
    await expect(page.getByRole("dialog", { name: "Episodes" })).toBeHidden();
    expect(await videoProperty(page, (element) => element.paused)).toBe(false);
  });
});

test.describe("skip", () => {
  test("offers and skips the part being played", async ({ page }) => {
    await start(page, "skip");
    await expect(page.locator(root)).not.toHaveAttribute("data-skip", "");
    await seek(page, 5);
    const button = page.getByRole("button", { name: "Skip Intro" });
    await expect(button).toBeVisible();
    await button.click();
    await expect.poll(() => videoProperty(page, (element) => element.currentTime)).toBeGreaterThanOrEqual(12);
    await expect(button).toBeHidden();
  });

  test("stays up while the controls are hidden", async ({ page }) => {
    await start(page, "skip");
    await seek(page, 4);
    await page.mouse.move(0, 0);
    await expect(page.locator(root)).toHaveAttribute("data-controls", "hidden", { timeout: 6000 });
    await expect(page.getByRole("button", { name: "Skip Intro" })).toBeVisible();
  });

  test("moves on from credits when there's something next", async ({ page }) => {
    await start(page, "episodes");
    await seek(page, 11);
    await page.getByRole("button", { name: "Next Episode" }).click();
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc)).toContain("episodes/2.mp4");
  });
});

test.describe("info", () => {
  test("opens over the video, and returns focus", async ({ page }) => {
    await start(page, "info");
    await page.locator(root).hover();
    const button = page.getByRole("button", { name: "Info" });
    await button.click();
    const panel = page.getByRole("dialog", { name: "The Long Coast" });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("2024 · TV-PG · 1h 20m");
    await expect(panel).toContainText("A. Rivera, J. Okafor");
    await expect(page.locator('[data-part="info-body"]')).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(button).toBeFocused();
    expect(await videoProperty(page, (element) => element.paused)).toBe(false);
  });
});
