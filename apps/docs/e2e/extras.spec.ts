import { expect, test, type Page } from "@playwright/test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';

const ready = async (page: Page, path: string) => {
  await page.goto(path);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
};

async function start(page: Page, path: string) {
  await ready(page, path);
  // Muted, so autoplay policies can't interfere with the test.
  await page.locator(video).evaluate((element: HTMLVideoElement) => {
    element.muted = true;
  });
  await page.locator(root).hover();
  await page.locator('[data-part="play-overlay"]').click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
}

const seek = (page: Page, time: number) =>
  page.locator(video).evaluate((element: HTMLVideoElement, to) => {
    element.currentTime = to;
  }, time);

const position = (page: Page) =>
  page.locator(video).evaluate((element: HTMLVideoElement) => element.currentTime);

async function openMenu(page: Page) {
  await page.locator(root).hover();
  await page.locator('[data-part="menu-trigger"]').click();
}

test.describe("ambient", () => {
  test("lights the sides from the picture, and turns off from the menu", async ({ page }) => {
    await start(page, "/examples/ambient");
    await expect(page.locator(root)).toHaveAttribute("data-ambient", "");
    await expect
      .poll(() =>
        page.locator(root).evaluate((element) => element.style.getPropertyValue("--rv-ambient-left"))
      )
      .toMatch(/^rgb\(/);

    await openMenu(page);
    await page.locator('[data-menu="ambient"]').click();
    await expect(page.locator(root)).not.toHaveAttribute("data-ambient");
  });
});

test.describe("mini player", () => {
  test("floats the same video, and goes back without a jump", async ({ page }) => {
    await start(page, "/examples/mini-player");
    await page.locator(video).evaluate((element) => {
      (element as HTMLVideoElement & { marked?: boolean }).marked = true;
      const spacer = document.createElement("div");
      spacer.style.height = "3000px";
      document.body.append(spacer);
    });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);

    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect(page.locator(root)).toHaveAttribute("data-mini", "bottom-end");
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    expect(
      await page
        .locator(video)
        .evaluate((element) => (element as HTMLVideoElement & { marked?: boolean }).marked)
    ).toBe(true);
    await expect(page.locator(root)).toHaveAttribute("data-playing", "");

    await page.locator(root).hover();
    await page.locator('[data-part="mini-back"]').click();
    await expect(page.locator(root)).not.toHaveAttribute("data-mini");
    await expect(page.locator('[data-part="mini-slot"]')).toHaveCount(0);
  });

  test("closing pauses, and it stays put until scrolled back to", async ({ page }) => {
    await start(page, "/examples/mini-player");
    await page.evaluate(() => {
      const spacer = document.createElement("div");
      spacer.style.height = "3000px";
      document.body.append(spacer);
      window.scrollTo(0, 2000);
    });
    await expect(page.locator(root)).toHaveAttribute("data-mini", "bottom-end");

    await page.locator(root).hover();
    await page.locator('[data-part="mini-close"]').click();
    await expect(page.locator(root)).not.toHaveAttribute("data-mini");
    await expect(page.locator(root)).not.toHaveAttribute("data-playing");
  });
});

test.describe("screenshot", () => {
  test("saves the frame under its timestamp", async ({ page }) => {
    await ready(page, "/examples/screenshot");
    await seek(page, 5);
    await openMenu(page);
    const download = page.waitForEvent("download");
    await page.locator('[data-menu="screenshot"]').click();
    expect((await download).suggestedFilename()).toMatch(/^frame-00-00-05\.png$/);
    await expect(page.locator('[data-part="toast"]')).toBeVisible();
  });
});

test.describe("loop", () => {
  test("goes back to the start of a section, and marks it on the timeline", async ({ page }) => {
    await start(page, "/examples/loop");
    await page.locator(video).evaluate((element: HTMLVideoElement) => element.pause());
    await seek(page, 4);
    await openMenu(page);
    await page.locator('[data-menu="loop"]').click();
    await page.locator('[data-part="menu-item"][data-inset]').first().click();

    await seek(page, 6);
    await openMenu(page);
    await page.locator('[data-menu="loop"]').click();
    await page.locator('[data-part="menu-item"][data-inset]').last().click();
    await expect(page.locator(root)).toHaveAttribute("data-loop", "section");
    await expect(page.locator('[data-part="loop-range"]')).toBeAttached();

    await seek(page, 5.5);
    await page.locator(video).evaluate((element: HTMLVideoElement) => element.play());
    await expect.poll(() => position(page), { timeout: 5_000 }).toBeLessThan(5);
  });
});

test.describe("shortcuts", () => {
  test("opens on ? with the real keys, and Esc closes it", async ({ page }) => {
    await ready(page, "/examples/shortcuts");
    await page.locator(root).hover();
    await page.locator('[data-part="play-overlay"]').focus();
    await page.keyboard.press("?");
    const sheet = page.locator('[data-panel="shortcuts"]');
    await expect(sheet).toHaveAttribute("data-state", "open");
    await expect(sheet.locator('[data-part="shortcut-key"]').first()).toBeVisible();
    await expect(page.locator(root)).not.toHaveAttribute("data-controls", "hidden");

    await page.keyboard.press("Escape");
    await expect(page.locator('[data-panel="shortcuts"][data-state="open"]')).toHaveCount(0);
  });
});

test.describe("stats", () => {
  test("reads real figures while open", async ({ page }) => {
    await start(page, "/examples/stats");
    await openMenu(page);
    await page.locator('[data-menu="stats"]').click();
    const panel = page.locator('[data-part="stats"]');
    await expect(panel.locator('[data-stat="video"] dd')).toHaveText(/^\d+×\d+$/);
    await expect(panel.locator('[data-stat="engine"] dd')).not.toHaveText("");

    await panel.locator('[data-part="stats-action"]').last().click();
    await expect(page.locator(root)).not.toHaveAttribute("data-stats");
  });
});

test.describe("share", () => {
  test("opens at the link's time, and copies a link to the current one", async ({ page }) => {
    await ready(page, "/examples/share?t=12");
    await expect.poll(() => position(page)).toBeCloseTo(12, 0);

    await page.evaluate(() => {
      const copied: string[] = [];
      Object.assign(window, { copied });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (text: string) => void copied.push(text) },
      });
    });
    await page.locator(root).hover();
    await page.locator('[data-part="share"]').click();
    await expect(page.locator('[data-part="toast"]')).toBeVisible();
    const copied = await page.evaluate(() => (window as unknown as { copied: string[] }).copied[0]);
    expect(new URL(copied ?? "").searchParams.get("t")).toBe("12");
  });
});

test.describe("fit", () => {
  test("switches a wide player between contain and cover", async ({ page }) => {
    await ready(page, "/examples/fit");
    await page.locator(root).hover();
    await expect(page.locator(root)).toHaveAttribute("data-fit", "contain");
    await page.locator('[data-part="fit"]').click();
    await expect(page.locator(root)).toHaveAttribute("data-fit", "cover");
    await expect(page.locator(video)).toHaveCSS("object-fit", "cover");
  });
});

test.describe("transcript", () => {
  test("follows the video, seeks on a press, and changes with the captions", async ({ page }) => {
    await ready(page, "/examples/transcript");
    const cues = page.locator('[data-part="transcript-cue"]');
    await expect(cues).toHaveCount(7);

    await seek(page, 12.5);
    await expect(page.locator('[data-part="transcript-cue"][aria-current="true"]')).toContainText(
      "Everything here"
    );

    await cues.nth(1).click();
    await expect.poll(() => position(page)).toBeCloseTo(4, 0);

    await openMenu(page);
    await page.locator('[data-menu="captions"]').click();
    await page.locator('[data-part="menu-radio-item"]', { hasText: "العربية" }).click();
    await expect(page.locator('[data-part="transcript-list"]')).toHaveAttribute("lang", "ar");
    await expect(cues.first()).toContainText("في عرض المحيط");
  });
});
