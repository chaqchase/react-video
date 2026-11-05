import { expect, test, type Page } from "@playwright/test";

const root = '[data-part="root"]';
const group = '[role="group"][aria-label="Theme"]';

async function open(page: Page, width = 960) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/examples/themes");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
}

// Read from the page, so a new theme is covered without touching this file.
const themesOn = (page: Page) => page.locator(`${group} button`).allTextContents();

async function choose(page: Page, name: string) {
  await page.locator(group).getByRole("button", { name, exact: true }).click();
  await page.locator(root).hover();
}

const outOfFrame = (page: Page, selector: string) =>
  page.locator(root).evaluate((element, target) => {
    const frame = element.getBoundingClientRect();
    return [...element.querySelectorAll<HTMLElement>(target)]
      .filter((control) => {
        const box = control.getBoundingClientRect();
        if (!box.width || getComputedStyle(control).visibility === "hidden") return false;
        return box.left < frame.left - 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.bottom > frame.bottom + 1;
      })
      .map((control) => control.dataset.part);
  }, selector);

test.describe("themes", () => {
  for (const width of [960, 560, 360]) {
    test(`keep every control inside the frame at ${width}px`, async ({ page }) => {
      await open(page, width);
      const themes = await themesOn(page);
      expect(themes.length).toBeGreaterThan(10);
      for (const theme of themes) {
        await choose(page, theme);
        const outside = await outOfFrame(page, '[data-part="controls"] [data-control], [data-part="timeline"]');
        expect(outside, theme).toEqual([]);
      }
    });
  }

  test("open their menu inside the frame", async ({ page }) => {
    await open(page);
    for (const theme of await themesOn(page)) {
      await choose(page, theme);
      await page.locator('[data-part="menu-trigger"]').click();
      await expect(page.locator('[data-part="menu-content"]'), theme).toBeVisible();
      expect(await outOfFrame(page, '[data-part="menu-content"]'), theme).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.locator('[data-part="menu-content"]'), theme).toBeHidden();
    }
  });

  test("keep play and pause working from the keyboard", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Mute" }).first().click({ force: true });
    for (const theme of await themesOn(page)) {
      await choose(page, theme);
      await expect(page.locator(root), theme).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
      // The large button goes away once it's started, and some themes don't have one at all.
      const play = page.locator(root).getByRole("button", { name: "Play", exact: true }).locator("visible=true").first();
      await play.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(root), theme).toHaveAttribute("data-playing", "");
      const pause = page.locator(root).getByRole("button", { name: "Pause", exact: true });
      await pause.focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(root), theme).not.toHaveAttribute("data-playing", "");
    }
  });

  test("hide what can't be used when the video fails", async ({ page }) => {
    await page.route("**/media/sample-*.mp4", (route) => route.abort());
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto("/examples/themes");
    await expect(page.locator(root)).toHaveAttribute("data-status", "error", { timeout: 20_000 });
    for (const theme of await themesOn(page)) {
      await page.locator(group).getByRole("button", { name: theme, exact: true }).click();
      await expect(page.locator(root), theme).toHaveAttribute("data-status", "error", { timeout: 20_000 });
      await expect(page.locator('[data-part="timeline"]'), theme).toBeHidden();
      await expect(page.locator('[data-part="transport"] [data-part="play-pause"]'), theme).toBeHidden();
    }
  });

  // The timeline runs left to right in every language, so the times can't swap ends around it.
  for (const name of ["Twitch", "Spotify", "Minimal"]) {
    test(`${name} keeps each time at its own end of the timeline in Arabic`, async ({ page }) => {
      await open(page);
      await page.locator(root).evaluate((element) => element.setAttribute("dir", "rtl"));
      await choose(page, name);
      const box = (selector: string) => page.locator(selector).first().boundingBox();
      const [current, timeline] = await Promise.all([box('[data-part="current-time"]'), box('[data-part="timeline"]')]);
      expect(current!.x).toBeLessThan(timeline!.x);
    });
  }
});

test.describe("vertical video", () => {
  test("takes the shape of the video", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto("/examples/vertical");
    await expect(page.locator(root)).toHaveAttribute("data-orientation", "portrait");
    const box = await page.locator(root).boundingBox();
    expect(box!.height).toBeGreaterThan(box!.width);
    expect(box!.width / box!.height).toBeCloseTo(9 / 16, 1);
  });

  test("opens its menu above the button", async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto("/examples/vertical");
    await page.locator(root).hover();
    const trigger = page.locator('[data-part="menu-trigger"]');
    await trigger.click();
    const menu = page.locator('[data-part="menu-content"]');
    await expect(menu).toBeVisible();
    const [menuBox, triggerBox] = await Promise.all([menu.boundingBox(), trigger.boundingBox()]);
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(triggerBox!.y);
    expect(await outOfFrame(page, '[data-part="menu-content"]')).toEqual([]);
  });

  test("doesn't grow an empty volume pill on a narrow landscape player", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/examples/themes");
    await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
    const volume = page.locator('[data-part="volume"]');
    const before = await volume.boundingBox();
    await volume.hover();
    await page.waitForTimeout(300);
    expect((await volume.boundingBox())!.width).toBeCloseTo(before!.width, 0);
  });
});
