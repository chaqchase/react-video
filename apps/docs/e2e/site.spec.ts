import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const noErrors = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
};

const violations = async (page: Page, exclude: string[] = []) => {
  // Legacy mode runs in this page. The default also opens a blank one to report from,
  // and that's what occasionally hangs when many pages are busy at once.
  let builder = new AxeBuilder({ page }).setLegacyMode(true);
  for (const selector of exclude) builder = builder.exclude(selector);
  const { violations: found } = await builder.analyze();
  return found.flatMap(({ id, nodes }) => nodes.map(({ target }) => `${id}: ${target.join(" ")}`));
};

test.describe("home", () => {
  test("playing the video causes no React commits", async ({ page }) => {
    await page.goto("/");
    const video = page.locator("video").first();
    await video.evaluate((element: HTMLVideoElement) => {
      element.muted = true;
      return element.play();
    });
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0);
    // Whatever starting playback rendered has settled by now.
    await page.waitForTimeout(500);
    const before = await page.evaluate(() => (window as unknown as { __rvkCommits: number }).__rvkCommits);
    const from = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { timeout: 15_000 })
      .toBeGreaterThan(from + 2);
    const after = await page.evaluate(() => (window as unknown as { __rvkCommits: number }).__rvkCommits);
    expect(after - before).toBe(0);
  });

  test("nothing plays until it's asked to", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".rv-root").first()).toBeVisible();
    await page.waitForTimeout(1000);
    const videos = await page.locator("video").evaluateAll((elements) =>
      (elements as HTMLVideoElement[]).map(({ paused, currentTime, autoplay, loop }) => ({ paused, currentTime, autoplay, loop }))
    );
    expect(videos.length).toBeGreaterThan(0);
    for (const video of videos) {
      expect(video).toEqual({ paused: true, currentTime: 0, autoplay: false, loop: false });
    }
  });

  test("dark is the default, whatever the system prefers", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");
  });

  for (const theme of ["dark", "light"] as const) {
    test(`has no accessibility violations in the ${theme} theme`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
      await page.goto("/");
      await expect(page.locator("html")).toHaveClass(new RegExp(theme));
      await expect(page.locator(".rv-root").first()).toBeVisible();
      // Text that scrolls in stays translucent until then, so finish the page first.
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await violations(page)).toEqual([]);
    });
  }
});

test.describe("plugin gallery", () => {
  const card = (page: Page, title: string) => page.getByRole("button", { name: `Add ${title} to your player` });

  test("adds up what's selected, and carries it to the playground", async ({ page }) => {
    await page.goto("/plugins");
    await card(page, "Speed").click();
    await expect(card(page, "Speed")).toHaveAttribute("aria-pressed", "true");
    await card(page, "Fullscreen").click();
    await expect(page.getByText("2 plugins", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Try them" }).click();
    await expect(page).toHaveURL(/\/playground\?.*p=/);
    await expect(page.getByRole("switch", { name: "Speed" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Fullscreen" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Quality" })).not.toBeChecked();
  });

  test("filters by group and by search", async ({ page }) => {
    await page.goto("/plugins");
    await page.getByRole("radio", { name: "Casting" }).click();
    await expect(card(page, "AirPlay")).toBeVisible();
    await expect(card(page, "Speed")).toHaveCount(0);
    await page.getByRole("radio", { name: "All" }).click();
    await page.getByPlaceholder("Search plugins").fill("dvr");
    await expect(card(page, "Live")).toBeVisible();
    await expect(card(page, "AirPlay")).toHaveCount(0);
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/plugins");
    await expect(page.getByRole("heading", { name: "Plugins", level: 1 })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});

test.describe("playground", () => {
  const code = (page: Page) => page.locator("#playground-code pre");

  test("a toggle changes the player, the code, the size, and the URL", async ({ page }) => {
    const errors = noErrors(page);
    await page.goto("/playground");
    await expect(page.locator(".rv-root")).toBeVisible();
    await expect(page.locator(".rv-root").getByRole("button", { name: /Fullscreen/i })).toBeVisible();
    await expect(code(page)).toContainText("fullscreen()");

    await page.getByRole("switch", { name: "Fullscreen" }).click();
    await expect(page.locator(".rv-root").getByRole("button", { name: /Fullscreen/i })).toHaveCount(0);
    await expect(code(page)).not.toContainText("fullscreen()");
    await expect(page).toHaveURL(/p=/);
    await expect(page).not.toHaveURL(/fullscreen/);
    expect(errors).toEqual([]);
  });

  test("the player stays in view while the options scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/playground");
    await expect(page.locator(".rv-root")).toBeInViewport();
    await page.getByRole("switch", { name: "Chromecast" }).scrollIntoViewIfNeeded();
    await expect(page.locator(".rv-root")).toBeInViewport();
  });

  test("a source that needs a plugin turns it on and explains why", async ({ page }) => {
    await page.goto("/playground");
    await page.getByRole("radio", { name: "HLS" }).click();
    const toggle = page.getByRole("switch", { name: "HLS" });
    await expect(toggle).toBeChecked();
    await expect(toggle).toBeDisabled();
    await expect(code(page)).toContainText(`from "react-video-kit/hls"`);
    await expect(code(page)).toContainText(".m3u8");
  });

  test("a shared link reproduces the player", async ({ page }) => {
    await page.goto("/playground");
    await page.getByRole("radio", { name: "Minimal" }).click();
    await page.getByRole("switch", { name: "Speed" }).click();
    await page.getByRole("radio", { name: "Accent #0a84ff" }).click();
    await expect(page).toHaveURL(/accent=/);
    const url = page.url();

    await page.goto(url);
    await expect(page.getByRole("radio", { name: "Minimal" })).toBeChecked();
    await expect(page.getByRole("switch", { name: "Speed" })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: "Accent #0a84ff" })).toBeChecked();
    await expect(page.locator(".rv-root")).toBeVisible();
  });

  test("has no accessibility violations", async ({ page }) => {
    await page.goto("/playground");
    await expect(page.locator(".rv-root")).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});

test.describe("docs", () => {
  test("a demo switches between its preview and its source", async ({ page }) => {
    await page.goto("/docs/v4/plugins/speed");
    const figure = page.locator("figure").first();
    await expect(figure.locator(".rv-root")).toBeVisible();
    await figure.getByRole("tab", { name: "Code" }).click();
    await expect(figure.locator("pre")).toContainText(`from "react-video-kit/speed"`);
    await expect(figure.locator(".rv-root")).toBeHidden();
    await figure.getByRole("tab", { name: "Preview" }).click();
    await expect(figure.locator(".rv-root")).toBeVisible();
  });

  test("a plugin page shows its API from the types", async ({ page }) => {
    await page.goto("/docs/v4/plugins/speed");
    await expect(page.getByRole("row", { name: /rates/ }).first()).toBeVisible();
    await expect(page.getByRole("row", { name: /faster/ })).toBeVisible();
  });

  test("the token editor changes the player, and writes the CSS", async ({ page }) => {
    await page.goto("/docs/v4/theming");
    const player = page.locator(".rv-root").first();
    await expect(player).toBeVisible();
    const control = player.getByRole("button", { name: "Mute" });
    const before = await control.evaluate((node) => node.getBoundingClientRect().width);
    await page.getByRole("slider", { name: "--rv-control-size" }).fill("50");
    await expect
      .poll(() => control.evaluate((node) => node.getBoundingClientRect().width))
      .toBeGreaterThan(before);
    await expect(page.locator(".code-line", { hasText: "--rv-control-size: 50px" })).toBeVisible();
  });

  test("search leads with the page about a word, and the dialog opens it", async ({ page, request }) => {
    const queries = [
      ["captions", "/docs/v4/plugins/captions"],
      ["hotkeys", "/docs/v4/plugins/hotkeys"],
      ["keyboard", "/docs/v4/plugins/hotkeys"],
      ["idle", "/docs/v4/plugins/idle"],
      ["dash", "/docs/v4/plugins/dash"],
      ["theming", "/docs/v4/theming"],
    ];
    for (const [query, url] of queries) {
      const results = await (await request.get(`/api/search?query=${query}`)).json();
      expect(results[0]?.url, query).toBe(url);
    }
    await page.goto("/docs/v4");
    await page.getByRole("button", { name: /search/i }).first().click();
    await page.getByPlaceholder(/search/i).fill("captions");
    await expect(page.getByRole("dialog").getByRole("option").first()).toContainText("Captions");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/docs\/v4\/plugins\/captions/);
  });

  test("the alpha notice appears on version 4 only", async ({ page }) => {
    await page.goto("/docs/v4");
    await expect(page.getByText(/can still change between/)).toBeVisible();
    await page.goto("/docs/v3");
    await expect(page.getByText(/can still change between/)).toHaveCount(0);
  });

  for (const path of ["/docs/v4", "/docs/v4/getting-started", "/docs/v4/plugins", "/docs/v4/plugins/captions", "/docs/v4/theming", "/docs/v4/migration", "/docs/v3"]) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await violations(page)).toEqual([]);
    });
  }

  test("every page in the sitemap renders, without errors or accessibility violations", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "One browser is enough to find a page that doesn't render.");
    test.setTimeout(400_000);
    const response = await page.request.get("/sitemap.xml");
    const urls = [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url as string).pathname);
    expect(urls.length).toBeGreaterThan(50);
    const errors = noErrors(page);
    const found: string[] = [];
    // Scroll-tied text starts translucent, and this test never scrolls.
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const url of urls) {
      const visit = await page.goto(url);
      expect(visit?.status(), url).toBe(200);
      await expect(page.locator("body"), url).toBeVisible();
      // Colours can't be judged partway through an entrance.
      // A scroll-driven or paused animation never finishes, so the wait has a limit.
      await page.evaluate(() =>
        Promise.race([
          Promise.allSettled(
            document
              .getAnimations()
              .filter((animation) => animation.playState === "running" && animation.effect?.getTiming().iterations !== Infinity)
              .map((animation) => animation.finished)
          ),
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
      );
      // Code is by far the slowest part to check, and the pages above cover its colours.
      found.push(...(await violations(page, ["pre"])).map((violation) => `${url} ${violation}`));
    }
    expect(errors).toEqual([]);
    expect(found).toEqual([]);
  });
});

test("the autoplay demo waits to be asked", async ({ page }) => {
  await page.goto("/docs/v4/plugins/autoplay");
  await expect(page.locator("#demo-autoplay video")).toHaveCount(0);
  await page.getByRole("button", { name: "Start this demo" }).click();
  await expect(page.locator("#demo-autoplay video")).toHaveCount(1);
});

test.describe("tokens", () => {
  // The skin scales these by the player's size, and that must never replace a consumer's value.
  for (const [name, width] of [["compact", 400], ["default", 640], ["large", 1000]] as const) {
    test(`--rv-control-size applies to a ${name} player`, async ({ page }) => {
      await page.setViewportSize({ width: Math.max(width + 40, 500), height: 800 });
      await page.goto("/examples/player");
      const root = page.locator(".rv-root");
      const play = root.locator('[data-part="mute"]');
      await root.evaluate((element, size) => {
        element.style.width = `${size}px`;
      }, width);
      await expect(play).toBeVisible();
      const size = () => play.evaluate((node) => node.getBoundingClientRect().width);
      const before = await size();
      await root.evaluate((element) => element.style.setProperty("--rv-control-size", "60px"));
      await expect.poll(size).toBeGreaterThan(before * 1.4);
    });
  }
});
