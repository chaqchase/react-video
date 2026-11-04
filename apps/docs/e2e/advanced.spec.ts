import { expect, test, type Page } from "@playwright/test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';
const adMedia = '[data-part="ad-media"]';

const videoProperty = <Value>(page: Page, read: (element: HTMLVideoElement) => Value) =>
  page.locator(video).evaluate(read);

async function start(page: Page, slug: string) {
  await page.goto(`/examples/${slug}`);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  // Muted, so autoplay policies can't interfere with the test.
  await page.getByRole("button", { name: "Mute" }).click();
  await page.locator('[data-part="play-overlay"]').click();
}

const expectAdvancing = async (page: Page) => {
  const from = await videoProperty(page, (element) => element.currentTime);
  await expect
    .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
    .toBeGreaterThan(from + 0.5);
};

const nearTheEnd = (page: Page) =>
  videoProperty(page, (element) => {
    element.currentTime = element.duration - 0.4;
  });

test.describe("playlist", () => {
  test("moves through the queue on one element, playing", async ({ page }) => {
    await start(page, "playlist");
    await expectAdvancing(page);
    await videoProperty(page, (element) => {
      element.dataset.same = "yes";
    });
    expect(await videoProperty(page, (element) => element.hasAttribute("poster"))).toBe(true);

    await page.locator(root).hover();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc)).toContain(
      "sample-270"
    );
    expect(await videoProperty(page, (element) => element.dataset.same)).toBe("yes");
    expect(await videoProperty(page, (element) => element.hasAttribute("poster"))).toBe(false);
    await expectAdvancing(page);

    await page.locator(root).hover();
    await page.getByRole("button", { name: "Previous" }).click();
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc)).toContain(
      "sample-360"
    );
  });

  test("counts down at the end, then plays the next one", async ({ page }) => {
    await start(page, "playlist");
    await expectAdvancing(page);
    await nearTheEnd(page);
    const card = page.getByRole("status");
    await expect(card).toContainText("The long ridge", { timeout: 10_000 });
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc), {
      timeout: 10_000,
    }).toContain("sample-270");
    await expect(card).toHaveCount(0);
    await expectAdvancing(page);
  });

  test("stays on the finished video when cancelled", async ({ page }) => {
    await start(page, "playlist");
    await expectAdvancing(page);
    await nearTheEnd(page);
    await page.getByRole("button", { name: "Cancel" }).click({ timeout: 10_000 });
    await page.waitForTimeout(3500);
    expect(await videoProperty(page, (element) => element.currentSrc)).toContain("sample-360");
  });

  test("skips the countdown when asked", async ({ page }) => {
    await start(page, "playlist");
    await expectAdvancing(page);
    await nearTheEnd(page);
    await page.getByRole("button", { name: "Play now" }).click({ timeout: 10_000 });
    await expect.poll(() => videoProperty(page, (element) => element.currentSrc)).toContain(
      "sample-270"
    );
    await expectAdvancing(page);
  });
});

test.describe("ads", () => {
  const tracked = (page: Page) => {
    const events: string[] = [];
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (pathname.startsWith("/ads/track/")) events.push(pathname.split("/").pop() as string);
    });
    return events;
  };

  test("shows the ad first, locks seeking, then lets the viewer skip", async ({ page }) => {
    const events = tracked(page);
    await start(page, "ads");
    await expect(page.locator(root)).toHaveAttribute("data-ad", "", { timeout: 10_000 });
    await expect(page.locator(adMedia)).toBeVisible();
    await expect(page.locator('[data-part="ad-label"]')).toContainText("Ad");
    await expect
      .poll(() => page.locator(adMedia).evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeGreaterThan(0.2);
    expect(await videoProperty(page, (element) => element.paused)).toBe(true);
    await expect.poll(() => events).toEqual(expect.arrayContaining(["impression", "start"]));

    await expect(page.locator('[data-part="timeline-input"]')).toBeDisabled();
    await expect(page.getByRole("link", { name: "Learn more" })).toHaveAttribute(
      "href",
      "https://github.com/chaqchase/react-video-kit"
    );

    await page.getByRole("button", { name: "Skip ad" }).click({ timeout: 10_000 });
    await expect(page.locator(root)).not.toHaveAttribute("data-ad", "");
    await expect(page.locator(adMedia)).toBeHidden();
    await expect.poll(() => events).toContain("skip");
    await expectAdvancing(page);
    await expect(page.locator('[data-part="timeline-input"]')).toBeEnabled();
    expect(events).not.toContain("complete");
  });

  test("returns to the content when an ad finishes", async ({ page }) => {
    const events = tracked(page);
    await start(page, "ads");
    await expect(page.locator(adMedia)).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => page.locator(adMedia).evaluate((element: HTMLVideoElement) => element.currentTime))
      .toBeGreaterThan(0.2);
    await page.locator(adMedia).evaluate((element: HTMLVideoElement) => {
      element.currentTime = element.duration - 0.3;
    });
    await expect(page.locator(root)).not.toHaveAttribute("data-ad", "", { timeout: 10_000 });
    await expectAdvancing(page);
    await expect.poll(() => events).toContain("complete");
  });

  test("follows a wrapper, adding its tracking", async ({ page }) => {
    const events = tracked(page);
    await start(page, "ads-wrapper");
    await expect(page.locator(adMedia)).toBeVisible({ timeout: 10_000 });
    await expect
      .poll(() => events, { timeout: 10_000 })
      .toEqual(expect.arrayContaining(["wrapper-impression", "impression"]));
  });

  test("plays the content straight away when there's no ad", async ({ page }) => {
    await start(page, "ads-empty");
    await expectAdvancing(page);
    await expect(page.locator(root)).not.toHaveAttribute("data-ad", "");
  });

  test("fails open when the ad is blocked", async ({ page }) => {
    await page.route("**/ads/preroll.xml", (route) => route.abort("blockedbyclient"));
    await start(page, "ads");
    await expectAdvancing(page);
    await expect(page.locator(root)).not.toHaveAttribute("data-ad", "");
  });

  test("fails open when the ad's file is missing", async ({ page }) => {
    await page.route("**/media/ad.mp4", (route) => route.fulfill({ status: 404 }));
    await start(page, "ads");
    await expectAdvancing(page);
    await expect(page.locator(root)).not.toHaveAttribute("data-ad", "");
  });
});

test.describe("protected playback", () => {
  test.skip(({ browserName }) => browserName === "webkit", "WebKit has no Clear Key");

  test("decrypts Clear Key and plays", async ({ page }) => {
    await start(page, "drm");
    await expectAdvancing(page);
    expect(await videoProperty(page, (element) => element.mediaKeys !== null)).toBe(true);
    await expect
      .poll(() => videoProperty(page, (element) => element.getVideoPlaybackQuality().totalVideoFrames))
      .toBeGreaterThan(5);
    expect(await videoProperty(page, (element) => element.videoWidth)).toBe(640);
  });

  test("really is encrypted: it says so without the key", async ({ page }) => {
    await page.goto("/examples/drm-missing");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(root)).toHaveAttribute("data-status", "error");
    expect(await videoProperty(page, (element) => element.currentTime)).toBe(0);
  });
});

test.describe("alternate tracks through an engine", () => {
  const openMenu = async (page: Page, menu: string) => {
    await page.locator(root).hover();
    await page.getByRole("button", { name: "Settings" }).click();
    await page.locator(`[data-menu="${menu}"]`).click();
  };

  test("lists alternate audio, and switching keeps playing", async ({ page }) => {
    await start(page, "hls-tracks");
    await expectAdvancing(page);
    await openMenu(page, "audio");
    const items = page.getByRole("menuitemradio");
    await expect(items).toHaveText(["English", "Español"]);
    await expect(page.getByRole("menuitemradio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    const loaded = page.waitForResponse(/audio-es-\d+\.ts/, { timeout: 15_000 });
    await page.getByRole("menuitemradio", { name: "Español" }).click();
    await loaded;
    await expectAdvancing(page);
    await expect(page.locator('[data-menu="audio"]')).toContainText("Español");
  });

  test("shows subtitles delivered by the engine, drawn by our renderer", async ({ page }) => {
    await start(page, "hls-tracks");
    await expectAdvancing(page);
    await openMenu(page, "captions");
    await page.getByRole("menuitemradio", { name: "English" }).click();
    await expect(page.locator('[data-part="captions"]')).toContainText("Engine subtitle at", {
      timeout: 15_000,
    });
  });
});
