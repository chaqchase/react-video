import { expect, test, type Page } from "./test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';

const videoProperty = <Value>(page: Page, read: (element: HTMLVideoElement) => Value) =>
  page.locator(video).evaluate(read);

async function play(page: Page, slug: string) {
  await page.goto(`/examples/${slug}`);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  // Muted, so autoplay policies can't interfere with the test.
  await page.getByRole("button", { name: "Mute" }).click();
  await page.locator('[data-part="play-overlay"]').click();
  await expect(page.locator(root)).toHaveAttribute("data-started", "", { timeout: 20_000 });
}

async function pickQuality(page: Page, label: string) {
  await page.locator(root).hover();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-menu="quality"]').click();
  await page.getByRole("menuitemradio", { name: label }).click();
}

test("Apple's browsers get native HLS unless told otherwise", async ({ page, browserName }) => {
  test.skip(browserName !== "webkit", "Other browsers always use the engine");
  await play(page, "hls");
  const source = await videoProperty(page, (element) => element.currentSrc);
  expect(source).toContain("master.m3u8");
  const start = await videoProperty(page, (element) => element.currentTime);
  await expect
    .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
    .toBeGreaterThan(start + 1);
});

test("subtitles from a DASH manifest can be turned on and switched", async ({ page }) => {
  await play(page, "dash-captions");
  await page.locator(root).hover();
  await page.getByRole("button", { name: "Captions" }).click();
  const line = page.locator('[data-part="caption-line"]').first();
  await expect(line).toContainText("English caption", { timeout: 15_000 });

  await page.locator(root).hover();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('[data-menu="captions"]').click();
  await page.getByRole("menuitemradio", { name: "العربية" }).click();
  await expect(line).not.toContainText("English caption", { timeout: 15_000 });
  await expect(line).toContainText(/\p{Script=Arabic}/u);
});

for (const slug of ["hls-engine", "dash"]) {
  test.describe(slug, () => {
    test("plays through the engine and advances", async ({ page }) => {
      await play(page, slug);
      // Engines play through Media Source, where the source is a blob URL.
      const source = await videoProperty(page, (element) => element.currentSrc);
      expect(source).toMatch(/^blob:/);
      const start = await videoProperty(page, (element) => element.currentTime);
      await expect
        .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
        .toBeGreaterThan(start + 1);
    });

    test("lists every level, and a manual choice takes effect", async ({ page }) => {
      await play(page, slug);
      await page.locator(root).hover();
      await page.getByRole("button", { name: "Settings" }).click();
      await page.locator('[data-menu="quality"]').click();
      const items = page.getByRole("menuitemradio");
      await expect(items).toHaveText(["Auto", "720p", "360p", "270p"]);
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");

      await pickQuality(page, "270p");
      await expect
        .poll(() => videoProperty(page, (element) => element.videoHeight), { timeout: 20_000 })
        .toBe(270);
      await expect(page.locator('[data-menu="quality"]')).toContainText("270p");
    });

    test("seeks into the stream", async ({ page }) => {
      await play(page, slug);
      await page.locator(root).hover();
      const box = await page.locator('[data-part="timeline"]').boundingBox();
      if (!box) throw new Error("no timeline");
      await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
      await expect
        .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
        .toBeGreaterThan(20);
      await expect(page.locator(root)).toHaveAttribute("data-playing", "");
    });
  });
}

test("engines aren't downloaded for sources that don't need them", async ({ page }) => {
  const bodies: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/_next/static/")) return;
    if (!response.url().endsWith(".js") && !response.url().includes(".js?")) return;
    bodies.push(await response.text().catch(() => ""));
  });
  await page.goto("/examples/engine-unused");
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready");
  await page.waitForLoadState("networkidle");
  expect(bodies.length).toBeGreaterThan(0);
  for (const body of bodies) {
    expect(body).not.toContain("hlsFragLoaded");
    expect(body).not.toContain("MediaPlayerEvents");
  }
});

test("a missing manifest reports an error rather than spinning", async ({ page }) => {
  await page.route("**/media/hls/master.m3u8", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("/examples/hls-engine");
  await expect(page.locator(root).getByRole("alert")).toBeVisible({ timeout: 30_000 });
});

test.describe("live", () => {
  test("shows the pill and no timeline without a DVR window", async ({ page }) => {
    await play(page, "live");
    await expect(page.locator(root)).toHaveAttribute("data-live", "");
    await expect(page.locator(root)).not.toHaveAttribute("data-dvr", "");
    await expect(page.locator('[data-part="live"]')).toBeVisible();
    await expect(page.locator('[data-part="timeline"]')).toBeHidden();
    await expect(page.locator('[data-part="time"]')).toBeHidden();
    await expect
      .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
      .toBeGreaterThan(0);
  });

  test("has no settings button when a stream has nothing to set", async ({ page }) => {
    await play(page, "live");
    await expect(page.locator(root)).toHaveAttribute("data-live", "");
    await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
  });

  test("keeps the settings button while a DVR window can change speed", async ({ page }) => {
    await play(page, "live-dvr");
    await expect(page.locator(root)).toHaveAttribute("data-dvr", "");
    await page.locator(root).hover();
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("menuitem").first()).toBeVisible();
  });

  test("scrubs back through a DVR window, then returns to the edge", async ({ page }) => {
    await play(page, "live-dvr");
    await expect(page.locator(root)).toHaveAttribute("data-dvr", "");
    await page.locator(root).hover();
    await expect(page.locator('[data-part="live"]')).toHaveAttribute("data-edge", "");
    const edgeTime = await videoProperty(page, (element) => element.currentTime);

    const box = await page.locator('[data-part="timeline"]').boundingBox();
    if (!box) throw new Error("no timeline");
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height / 2);
    await expect
      .poll(() => videoProperty(page, (element) => element.currentTime), { timeout: 15_000 })
      .toBeLessThan(edgeTime - 20);
    await expect(page.locator('[data-part="live"]')).not.toHaveAttribute("data-edge", "");

    await page.getByRole("button", { name: "Go to live" }).click();
    await expect(page.locator('[data-part="live"]')).toHaveAttribute("data-edge", "", {
      timeout: 15_000,
    });
  });
});
