import { expect, test, type Page } from "@playwright/test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';

async function open(page: Page) {
  await page.goto("/examples/features");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
}

async function openMenu(page: Page) {
  await page.locator(root).hover();
  await page.getByRole("button", { name: "Settings" }).click();
}

test("the settings menu drills into each section and returns", async ({ page }) => {
  await open(page);
  await openMenu(page);
  for (const section of ["captions", "chapters", "speed", "quality"]) {
    await expect(page.locator(`[data-menu="${section}"]`)).toBeVisible();
  }
  await page.locator('[data-menu="speed"]').click();
  await page.getByRole("menuitemradio", { name: "1.5×" }).click();
  await expect(page.locator('[data-menu="speed"]')).toContainText("1.5×");
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.playbackRate))
    .toBe(1.5);
});

test("the settings menu sits above its controls, inside the player", async ({ page }) => {
  await open(page);
  await openMenu(page);
  const menu = page.locator('[data-part="menu-content"]');
  await expect(menu).toHaveCSS("opacity", "1");
  const group = page.locator('[data-part="control-group"]', { has: menu });
  const [content, controls, player] = await Promise.all([menu.boundingBox(), group.boundingBox(), page.locator(root).boundingBox()]);
  expect(content!.y + content!.height).toBeLessThanOrEqual(controls!.y);
  expect(content!.y).toBeGreaterThanOrEqual(player!.y);
});

test("on a small player the settings menu is a sheet, and a long list scrolls inside it", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await open(page);
  await openMenu(page);
  const menu = page.locator('[data-part="menu-content"]');
  await expect(menu).toHaveCSS("opacity", "1");
  const player = (await page.locator(root).boundingBox())!;
  const sheet = (await menu.boundingBox())!;
  expect(sheet.x).toBeCloseTo(player.x + 8, 0);
  expect(sheet.width).toBeCloseTo(player.width - 16, 0);
  expect(sheet.y + sheet.height).toBeCloseTo(player.y + player.height - 8, 0);

  await page.locator('[data-menu="speed"]').click();
  // The list is taller than this player, so its last row only appears once scrolled to.
  const last = page.getByRole("menuitemradio").last();
  await last.scrollIntoViewIfNeeded();
  await expect
    .poll(async () => {
      const [row, content] = await Promise.all([last.boundingBox(), menu.boundingBox()]);
      return row!.y + row!.height <= content!.y + content!.height + 1 && content!.y >= player.y;
    })
    .toBe(true);
  // Only the panel scrolled. Scrolling the player itself would shift the video.
  expect(await page.locator(root).evaluate((element) => element.scrollTop)).toBe(0);
  await last.click();
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.playbackRate))
    .toBe(2);
});

test("captions draw from a real WebVTT file, without the browser drawing too", async ({ page }) => {
  await open(page);
  await page.locator(root).hover();
  await page.getByRole("button", { name: "Captions" }).click();
  await expect(page.locator(root)).toHaveAttribute("data-captions", "");
  await page.locator('[data-part="play-overlay"]').click().catch(() => {});
  await expect(page.locator('[data-part="caption-line"]').first()).toContainText("English caption", {
    timeout: 10_000,
  });
  const modes = await page
    .locator(video)
    .evaluate((element: HTMLVideoElement) =>
      Array.from(element.textTracks).map(({ mode }) => mode)
    );
  expect(modes).toEqual(["hidden", "disabled"]);
});

test("switching quality keeps the position", async ({ page }) => {
  await open(page);
  await page.locator('[data-part="play-overlay"]').click();
  await page.locator(video).evaluate((element: HTMLVideoElement) => {
    element.currentTime = 12;
  });
  await openMenu(page);
  await page.locator('[data-menu="quality"]').click();
  await page.getByRole("menuitemradio", { name: "360p" }).click();
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.currentSrc))
    .toContain("sample-360");
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThanOrEqual(12);
});

test("hovering the timeline previews a thumbnail and the chapter", async ({ page }) => {
  await open(page);
  const timeline = page.locator('[data-part="timeline"]');
  await page.locator(root).hover();
  const box = await timeline.boundingBox();
  if (!box) throw new Error("no timeline");
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height / 2);
  await expect(page.locator('[data-part="chapter-title"]')).toHaveText("Middle");
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height / 2);
  await expect(page.locator('[data-part="thumbnail"]')).toBeVisible();
});

test("the track shows gaps at chapter boundaries", async ({ page }) => {
  await open(page);
  await expect
    .poll(() =>
      page
        .locator('[data-part="timeline-track"]')
        .evaluate((element: HTMLElement) => element.style.maskImage)
    )
    .toContain("linear-gradient");
});

test("keyboard shortcuts work, and confirm what they did", async ({ page }) => {
  await open(page);
  await page.locator(root).click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press("m");
  await expect(page.locator('[data-part="hotkeys-feedback"]')).toHaveText("Muted");
  expect(await page.locator(video).evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await page.keyboard.press("5");
  await expect
    .poll(() => page.locator(video).evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(10);
});
