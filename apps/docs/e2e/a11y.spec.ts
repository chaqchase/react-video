import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "./test";

const root = '[data-part="root"]';
const video = '[data-part="media"]';
const group = '[role="group"][aria-label="Theme"]';
const announcer = '[data-part="announcer"]';
const openPanel = '[data-part="panel"][data-state="open"]';

async function ready(page: Page, path: string, width = 960) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await expect(page.locator(root)).toHaveAttribute("data-status", "ready", { timeout: 20_000 });
  // Muted, so autoplay policies can't interfere with the test.
  await page.locator(video).evaluate((element: HTMLVideoElement) => {
    element.muted = true;
  });
}

// Moved twice, since the controls wake on movement rather than on where the pointer is.
async function reveal(page: Page) {
  const box = await page.locator(root).boundingBox();
  if (!box) throw new Error("The player isn't on the page.");
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.35);
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await page.waitForTimeout(350);
}

async function start(page: Page) {
  await reveal(page);
  await page.locator('[data-part="play-overlay"]').click();
  await expect(page.locator(root)).toHaveAttribute("data-playing", "");
}

const axe = async (page: Page) => {
  // Legacy mode runs in this page, as in examples.spec.ts.
  const { violations } = await new AxeBuilder({ page }).setLegacyMode(true).include(root).analyze();
  return violations.map(({ id, nodes }) => `${id}: ${nodes[0]?.target.join(" ")}`);
};

const focused = (page: Page) =>
  page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.part ?? null);

// Safari on a Mac skips buttons on a plain Tab, unless the viewer has changed a setting.
const tab = (page: Page) =>
  page.keyboard.press(
    process.platform === "darwin" && page.context().browser()?.browserType().name() === "webkit" ? "Alt+Tab" : "Tab"
  );

async function tabTo(page: Page, part: string) {
  for (let press = 0; press < 40; press += 1) {
    await tab(page);
    if ((await focused(page)) === part) return;
  }
  throw new Error(`Tab never reached ${part}.`);
}

// Read from the page, so a new theme is covered without touching this file.
const themesOn = (page: Page) => page.locator(`${group} button`).allTextContents();

async function choose(page: Page, name: string) {
  await page.locator(group).getByRole("button", { name, exact: true }).click();
  await page.waitForTimeout(250);
  await reveal(page);
}

/** Tabs from the theme's own button until focus leaves the player, and describes each stop. */
async function walk(page: Page) {
  // Past the page's last stop, focus goes to the browser's own UI, and Firefox still reports the
  // last element as active. A stop after the player is what tells that apart from a real trap.
  await page.evaluate(() => {
    const after = document.createElement("button");
    after.textContent = "After the player";
    document.body.append(after);
  });
  const stops: {
    part: string;
    top: number;
    left: number;
    ring: boolean;
    inside: boolean;
    opacity: number;
  }[] = [];
  for (let press = 0; press < 40; press += 1) {
    await tab(page);
    await page.waitForTimeout(220);
    const stop = await page.evaluate((selector) => {
      const element = document.activeElement as HTMLElement | null;
      const player = element?.closest(selector);
      if (!element || !player) return null;
      const box = element.getBoundingClientRect();
      const frame = player.getBoundingClientRect();
      // A range input is invisible, so the skin rings the track it draws on.
      const painted = element.matches('input[type="range"]')
        ? element.closest('[data-part="timeline"], [data-part="volume-slider"]')?.querySelector('[data-part$="-track"]')
        : element;
      const style = painted ? getComputedStyle(painted) : null;
      let opacity = 1;
      for (let node = painted ?? null; node && node !== player; node = node.parentElement) {
        opacity *= Number(getComputedStyle(node).opacity);
      }
      return {
        part: element.dataset.part ?? element.tagName,
        top: box.top - frame.top,
        left: box.left - frame.left,
        ring: Boolean(style && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2),
        inside:
          box.right > frame.left && box.left < frame.right && box.bottom > frame.top && box.top < frame.bottom,
        opacity,
      };
    }, root);
    if (stop) stops.push(stop);
    else if (stops.length) return stops;
  }
  throw new Error("Tab never left the player.");
}

/** How far each control takes clicks around its centre, for checking real target sizes. */
const hitAreas = (page: Page) =>
  page.evaluate((selector) => {
    const player = document.querySelector(selector);
    if (!player) return [];
    const controls = player.querySelectorAll<HTMLElement>(
      '[data-control], [role^="menuitem"], [data-part="timeline"], [data-part="volume-slider"]'
    );
    return [...controls].flatMap((element) => {
      if (element.closest('[aria-hidden="true"]')) return [];
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height || style.visibility === "hidden" || style.display === "none") return [];
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const takes = (atX: number, atY: number) => {
        const hit = document.elementFromPoint(atX, atY);
        return Boolean(hit && (hit === element || element.contains(hit)));
      };
      // Under a sheet, or scrolled away in a list, which is a different question.
      if (!takes(x, y)) return [];
      const reach = (stepX: number, stepY: number) => {
        let distance = 0;
        while (distance < 90 && takes(x + stepX * (distance + 0.5), y + stepY * (distance + 0.5))) {
          distance += 0.5;
        }
        return distance;
      };
      return [
        {
          part: element.dataset.part ?? element.tagName,
          width: Math.round(reach(1, 0) + reach(-1, 0) + 0.5),
          height: Math.round(reach(0, 1) + reach(0, -1) + 0.5),
        },
      ];
    });
  }, root);

/** Every animated property in the player from now until `until` finishes, by frame. */
async function animatedWhile(page: Page, until: () => Promise<void>) {
  await page.evaluate(() => {
    const seen = new Set<string>();
    const look = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        if (!effect?.target?.closest('[data-part="root"]')) continue;
        // A spinner is how a wait looks, so it slows rather than stops.
        if ((animation as CSSAnimation).animationName === "rv-spin") continue;
        for (const frame of effect.getKeyframes()) {
          for (const property of Object.keys(frame)) {
            if (["offset", "computedOffset", "easing", "composite"].includes(property)) continue;
            const part = (effect.target as HTMLElement).dataset.part ?? effect.target.tagName;
            seen.add(`${part}${effect.pseudoElement ?? ""} ${property}`);
          }
        }
      }
      (window as unknown as { rvLook: number }).rvLook = requestAnimationFrame(look);
    };
    look();
    (window as unknown as { rvSeen: Set<string> }).rvSeen = seen;
  });
  await until();
  return page.evaluate(() => {
    const state = window as unknown as { rvLook: number; rvSeen: Set<string> };
    cancelAnimationFrame(state.rvLook);
    return [...state.rvSeen];
  });
}

test.describe("axe", () => {
  for (const width of [960, 360]) {
    test(`finds nothing in any theme at ${width}px, with its controls and menus open`, async ({ page }) => {
      test.setTimeout(300_000);
      await ready(page, "/examples/themes", width);
      const themes = await themesOn(page);
      expect(themes.length).toBeGreaterThan(10);
      for (const theme of themes) {
        await choose(page, theme);
        expect(await axe(page), `${theme}, controls`).toEqual([]);
        const trigger = page.locator('[data-part="menu-trigger"]').first();
        if (!(await trigger.count())) continue;
        await trigger.click({ force: true });
        await page.waitForTimeout(300);
        expect(await axe(page), `${theme}, menu`).toEqual([]);
        const sub = page.locator('[data-part="menu-item"][data-sub]').first();
        if (await sub.count()) {
          await sub.click({ force: true });
          await page.waitForTimeout(300);
          expect(await axe(page), `${theme}, submenu`).toEqual([]);
          await page.keyboard.press("Escape");
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
    });
  }

  const panels: [slug: string, part: string][] = [
    ["episodes", "episodes-button"],
    ["info", "info-button"],
  ];
  for (const [slug, part] of panels) {
    test(`finds nothing with ${slug} open`, async ({ page }) => {
      await ready(page, `/examples/${slug}`);
      await reveal(page);
      await page.locator(`[data-part="${part}"]`).click();
      await expect(page.locator(openPanel)).toBeVisible();
      await page.waitForTimeout(400);
      expect(await axe(page)).toEqual([]);
    });
  }

  test("finds nothing with the shortcuts open", async ({ page }) => {
    await ready(page, "/examples/shortcuts");
    await reveal(page);
    await page.locator('[data-part="play-overlay"]').focus();
    await page.keyboard.press("?");
    await expect(page.locator(openPanel)).toBeVisible();
    await page.waitForTimeout(400);
    expect(await axe(page)).toEqual([]);
  });

  test("finds nothing during an ad", async ({ page }) => {
    await ready(page, "/examples/ads");
    await reveal(page);
    await page.locator('[data-part="play-overlay"]').click();
    await expect(page.locator(root)).toHaveAttribute("data-ad", "", { timeout: 10_000 });
    await reveal(page);
    expect(await axe(page)).toEqual([]);
  });
});

test.describe("keyboard", () => {
  test("plays, pauses, and replays without a pointer", async ({ page }) => {
    await ready(page, "/examples/player");
    await tabTo(page, "play-overlay");
    await page.keyboard.press("Enter");
    await expect(page.locator(root)).toHaveAttribute("data-playing", "");
    // The overlay it was on has gone, so focus has to land on what took over.
    await expect.poll(() => focused(page)).toBe("play-pause");

    await page.keyboard.press("Enter");
    await expect(page.locator(root)).not.toHaveAttribute("data-playing", "");

    await page.locator(video).evaluate((element: HTMLVideoElement) => {
      element.currentTime = element.duration - 0.2;
    });
    await page.keyboard.press("Enter");
    await expect(page.locator(root)).toHaveAttribute("data-ended", "", { timeout: 10_000 });
    await expect.poll(() => focused(page)).toBe("play-overlay");
    await page.keyboard.press("Enter");
    await expect.poll(() => focused(page)).toBe("play-pause");
  });

  test("lets the controls hide after play, and any key brings them back", async ({ page }) => {
    await ready(page, "/examples/player");
    await tabTo(page, "play-overlay");
    await page.keyboard.press("Enter");
    await expect(page.locator(root)).toHaveAttribute("data-controls", "hidden", { timeout: 10_000 });
    await tab(page);
    await expect(page.locator(root)).not.toHaveAttribute("data-controls", "hidden");
  });

  test("keeps the controls up while another control has focus", async ({ page }) => {
    await ready(page, "/examples/player");
    await start(page);
    await tabTo(page, "menu-trigger");
    await page.waitForTimeout(4500);
    await expect(page.locator(root)).not.toHaveAttribute("data-controls", "hidden");
  });

  test("shows no ring after a click, only after a key", async ({ page, browserName }) => {
    await ready(page, "/examples/player");
    await start(page);
    const ringed = () => page.evaluate(() => Boolean(document.querySelector(":focus-visible")));
    // Safari doesn't focus a button that's clicked, so there's nothing to hand over.
    if (browserName !== "webkit") expect(await focused(page)).toBe("play-pause");
    expect(await ringed()).toBe(false);
    await tab(page);
    expect(await ringed()).toBe(true);
  });

  test("doesn't ring the picture when it's clicked and a key follows", async ({ page }) => {
    await ready(page, "/examples/player");
    await start(page);
    // Above the transport and below the top controls, so this lands on the picture itself.
    const box = await page.locator(video).boundingBox();
    if (!box) throw new Error("The video has no box.");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 4);
    await expect.poll(() => focused(page)).toBe("media");
    await page.keyboard.press("m");
    const outline = await page.locator(video).evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).toBe("none");
  });

  const walked: [name: string, theme: string | null][] = [
    ["the default player", null],
    ["YouTube", "YouTube"],
    ["TikTok", "TikTok"],
  ];
  for (const [name, theme] of walked) {
    test(`walks ${name} without a trap, and every stop is seen`, async ({ page }) => {
      test.setTimeout(60_000);
      await ready(page, "/examples/themes");
      await page.locator(group).getByRole("button", { name: theme ?? "Apple TV", exact: true }).focus();
      if (theme) await page.keyboard.press("Enter");
      const stops = await walk(page);
      const parts = stops.map(({ part }) => part);
      expect(parts).toContain("timeline-input");
      expect(parts).not.toContain("media");
      expect(parts.some((part) => part === "play-overlay" || part === "play-pause")).toBe(true);
      for (const stop of stops) {
        expect(stop.inside, `${stop.part} is in the frame`).toBe(true);
        expect(stop.ring, `${stop.part} has a ring`).toBe(true);
        expect(stop.opacity, `${stop.part} can be seen`).toBeGreaterThan(0.9);
      }
    });
  }

  // Themes that move controls with `order` keep DOM order, and CSS can't yet fix that reliably.
  test("follows reading order in the looks whose layout matches the DOM", async ({ page }) => {
    test.setTimeout(60_000);
    await ready(page, "/examples/themes");
    await page.locator(group).getByRole("button", { name: "TikTok", exact: true }).click();
    await page.waitForTimeout(250);
    await page.locator(group).getByRole("button", { name: "TikTok", exact: true }).focus();
    const stops = await walk(page);
    const column = stops.filter(({ part }) => part !== "timeline-input" && part !== "play-overlay");
    const tops = column.map(({ top }) => top);
    expect(tops).toEqual([...tops].sort((above, below) => above - below));
  });

  test("closes a menu with Escape and returns to its button", async ({ page }) => {
    await ready(page, "/examples/player");
    await tabTo(page, "menu-trigger");
    await page.keyboard.press("Enter");
    await expect(page.locator('[role="menu"]').first()).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => focused(page)).toBe("menu-item");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => focused(page)).toBe("menu-radio-item");
    await page.keyboard.press("Escape");
    await expect.poll(() => focused(page)).toBe("menu-item");
    await page.keyboard.press("Escape");
    await expect.poll(() => focused(page)).toBe("menu-trigger");
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
  });

  for (const [slug, part] of [
    ["episodes", "episodes-button"],
    ["info", "info-button"],
  ] as const) {
    test(`returns from ${slug} to its button, and Tab can leave the player`, async ({ page }) => {
      test.setTimeout(45_000);
      await ready(page, `/examples/${slug}`);
      await tabTo(page, part);
      await page.keyboard.press("Enter");
      await expect(page.locator(openPanel)).toBeVisible();
      await expect
        .poll(() => page.evaluate((selector) => Boolean(document.activeElement?.closest(selector)), openPanel))
        .toBe(true);
      await page.keyboard.press("Escape");
      await expect(page.locator(openPanel)).toHaveCount(0);
      await expect.poll(() => focused(page)).toBe(part);
    });
  }

  test("returns from the shortcuts to where they were asked for", async ({ page }) => {
    await ready(page, "/examples/shortcuts");
    await tabTo(page, "menu-trigger");
    await page.keyboard.press("?");
    await expect(page.locator(openPanel)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(openPanel)).toHaveCount(0);
    await expect.poll(() => focused(page)).toBe("menu-trigger");
  });

  test("moves past an ad with the keyboard alone", async ({ page }) => {
    await ready(page, "/examples/ads");
    await tabTo(page, "play-overlay");
    await page.keyboard.press("Enter");
    await expect(page.locator(root)).toHaveAttribute("data-ad", "", { timeout: 10_000 });
    await expect.poll(() => focused(page)).toBe("play-pause");
    await expect(page.locator(announcer)).toContainText("Ad");
  });

  test("opens the compact volume with Tab, and not with a hover", async ({ page }) => {
    await ready(page, "/examples/player", 360);
    await reveal(page);
    const widthOf = () =>
      page.locator('[data-part="volume-slider"]').evaluate((element) => element.getBoundingClientRect().width);
    await page.locator('[data-part="mute-button"], [data-part="mute"]').first().hover();
    await page.waitForTimeout(350);
    expect(await widthOf()).toBeLessThan(2);

    await tabTo(page, "volume-input");
    await page.waitForTimeout(350);
    expect(await widthOf()).toBeGreaterThan(50);
    const value = await page.evaluate(() => document.activeElement?.getAttribute("aria-valuetext"));
    expect(value).toBeTruthy();
  });

  test("mirrors in Arabic", async ({ page }) => {
    await ready(page, "/examples/i18n");
    await page.getByRole("button", { name: "Arabic" }).click();
    await expect(page.locator(root)).toHaveAttribute("dir", "rtl");
    await expect(page.locator(root)).toHaveAttribute("lang", "ar");
    await tabTo(page, "menu-trigger");
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowLeft");
    await expect.poll(() => focused(page)).toBe("menu-radio-item");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => focused(page)).toBe("menu-item");
  });
});

test.describe("target size", () => {
  test("every control in every theme takes clicks across 24px at 360px", async ({ page }) => {
    test.setTimeout(120_000);
    await ready(page, "/examples/themes", 360);
    for (const theme of await themesOn(page)) {
      await choose(page, theme);
      const areas = await hitAreas(page);
      expect(areas.length, theme).toBeGreaterThan(0);
      // A pixel of slack: adjacent 24px boxes can read 23 where their hit tests meet.
      const small = areas.filter(({ width, height }) => width < 23 || height < 23);
      expect(small, theme).toEqual([]);
    }
  });
});

test.describe("announcements", () => {
  test("has a polite region from the start, out of sight", async ({ page }) => {
    await ready(page, "/examples/player");
    const region = page.locator(announcer);
    await expect(region).toHaveAttribute("aria-live", "polite");
    await expect(region).toHaveAttribute("aria-atomic", "true");
    const box = await region.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(1);
    expect(box?.height).toBeLessThanOrEqual(1);
  });

  test("says a shortcut's result, and a repeat still changes the text", async ({ page }) => {
    await ready(page, "/examples/player");
    await start(page);
    const feedback = page.locator('[data-part="hotkeys-feedback"]');
    await expect(feedback).toHaveAttribute("role", "status");
    await page.keyboard.press("ArrowRight");
    await expect(feedback).toHaveText("+5s");
    const first = await feedback.evaluate((element) => element.textContent);
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => feedback.evaluate((element) => element.textContent)).not.toBe(first);
  });

  test("says a skip button has come, while focus stays put", async ({ page }) => {
    await ready(page, "/examples/skip");
    await start(page);
    const before = await focused(page);
    await page.locator(video).evaluate((element: HTMLVideoElement) => {
      element.currentTime = 6;
    });
    await expect(page.locator(announcer)).toContainText("Skip");
    expect(await focused(page)).toBe(before);
  });

  test("doesn't change during ordinary playback", async ({ page }) => {
    await ready(page, "/examples/player");
    await page.locator(announcer).evaluate((element) => {
      const state = window as unknown as { rvChanges: number };
      state.rvChanges = 0;
      new MutationObserver(() => {
        state.rvChanges += 1;
      }).observe(element, { childList: true, characterData: true, subtree: true });
    });
    await start(page);
    await page.waitForTimeout(2500);
    expect(await page.evaluate(() => (window as unknown as { rvChanges: number }).rvChanges)).toBe(0);
  });
});

test.describe("captions", () => {
  for (const width of [360, 480, 640, 960]) {
    test(`clear the transport at ${width}px`, async ({ page }) => {
      await ready(page, "/examples/captions", width);
      await start(page);
      await page.waitForTimeout(800);
      await page.keyboard.press("k");
      await reveal(page);
      const measured = await page.evaluate(() => ({
        transport: document
          .querySelector('[data-part="transport"] [data-part="play-pause"]')
          ?.getBoundingClientRect().bottom,
        line: document.querySelector('[data-part="caption-line"]')?.getBoundingClientRect().top,
      }));
      expect(measured.line).toBeDefined();
      expect(measured.line).toBeGreaterThanOrEqual(measured.transport ?? 0);
    });
  }
});

test.describe("captions in themes", () => {
  test("stay clear of the controls in every theme at 360px", async ({ page }) => {
    test.setTimeout(180_000);
    await ready(page, "/examples/themes", 360);
    for (const theme of await themesOn(page)) {
      await ready(page, "/examples/themes", 360);
      await choose(page, theme);
      // The default look has no room for a long cue at this size, and its text stays on top.
      const themed = await page.locator(root).evaluate((element) => element.className.includes("rv-theme-"));
      if (!themed) continue;
      await page.locator(video).evaluate((element: HTMLVideoElement) => element.play());
      await reveal(page);
      const toggle = page.locator('[data-part="captions-toggle"]').first();
      if ((await toggle.getAttribute("aria-pressed")) !== "true") await toggle.click({ force: true });
      await page.locator(video).evaluate((element: HTMLVideoElement) => {
        element.currentTime = 3;
        element.pause();
      });
      await expect(page.locator('[data-part="caption-line"]').first()).toBeVisible();
      await reveal(page);
      const covered = await page.evaluate((selector) => {
        const player = document.querySelector(selector);
        const lines = [...(player?.querySelectorAll('[data-part="caption-line"]') ?? [])].map((line) =>
          line.getBoundingClientRect()
        );
        const top = Math.min(...lines.map((line) => line.top));
        const bottom = Math.max(...lines.map((line) => line.bottom));
        const left = Math.min(...lines.map((line) => line.left));
        const right = Math.max(...lines.map((line) => line.right));
        return [...(player?.querySelectorAll<HTMLElement>('[data-control], [data-part="timeline-track"]') ?? [])]
          .filter((control) => {
            const style = getComputedStyle(control);
            const box = control.getBoundingClientRect();
            if (!box.width || !box.height || style.visibility === "hidden" || Number(style.opacity) < 0.1) return false;
            return box.left < right && box.right > left && box.top < bottom && box.bottom > top;
          })
          .map((control) => control.dataset.part);
      }, root);
      expect(covered, theme).toEqual([]);
    }
  });
});

test.describe("right to left", () => {
  for (const theme of ["TikTok", "Instagram"]) {
    test(`${theme}'s volume opens into the frame, and focus doesn't move the picture`, async ({ page }) => {
      await ready(page, "/examples/themes", 360);
      await choose(page, theme);
      await page.locator(root).evaluate((element) => element.setAttribute("dir", "rtl"));
      await page.locator('[data-part="volume-input"]').focus();
      await page.waitForTimeout(250);
      const measured = await page.locator(root).evaluate((element) => {
        const frame = element.getBoundingClientRect();
        const box = element.querySelector('[data-part="volume-input"]')?.getBoundingClientRect();
        return { scroll: element.scrollLeft, left: (box?.left ?? 0) - frame.left, right: frame.right - (box?.right ?? 0) };
      });
      expect(measured.scroll).toBe(0);
      expect(measured.left).toBeGreaterThanOrEqual(0);
      expect(measured.right).toBeGreaterThanOrEqual(0);
    });
  }
});

test.describe("viewer preferences", () => {
  // A system colour resolves to a real value on a probe, which the skin's can be compared with.
  const system = (page: Page, colour: string) =>
    page.evaluate((name) => {
      const probe = document.body.appendChild(document.createElement("div"));
      probe.style.cssText = `forced-color-adjust:none;background:${name}`;
      const value = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return value;
    }, colour);

  test("forced colours keep the timeline, the buttons, and the ring", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await ready(page, "/examples/player");
    await reveal(page);
    const highlight = await system(page, "Highlight");
    const fill = await page
      .locator('[data-part="timeline-progress"], [data-part="timeline-fill"]')
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(fill).toBe(highlight);

    const button = page.locator('[data-part="menu-trigger"]');
    expect(await button.evaluate((element) => getComputedStyle(element).borderTopStyle)).toBe("solid");

    await tabTo(page, "menu-trigger");
    const ring = await button.evaluate((element) => {
      const style = getComputedStyle(element);
      return { color: style.outlineColor, width: style.outlineWidth };
    });
    expect(ring).toEqual({ color: highlight, width: "3px" });
    expect(await axe(page)).toEqual([]);
  });

  test("forced colours don't draw dark icons on a dark frame in a bare theme", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await ready(page, "/examples/themes");
    await choose(page, "YouTube");
    const button = await page.locator('[data-part="menu-trigger"]').evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, color: style.color };
    });
    expect(button.background).toBe(await system(page, "ButtonFace"));
    expect(button.color).toBe(await system(page, "ButtonText"));
  });

  test("more contrast thickens the ring", async ({ page }) => {
    await page.emulateMedia({ contrast: "more" });
    await ready(page, "/examples/player");
    await tabTo(page, "menu-trigger");
    const width = await page
      .locator('[data-part="menu-trigger"]')
      .evaluate((element) => getComputedStyle(element).outlineWidth);
    expect(width).toBe("3px");
    expect(await axe(page)).toEqual([]);
  });

  test("reduced transparency removes the blur", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Only Chromium can emulate this setting.");
    const session = await page.context().newCDPSession(page);
    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
    });
    await ready(page, "/examples/player");
    await reveal(page);
    await page.locator('[data-part="menu-trigger"]').click();
    await page.waitForTimeout(300);
    const blurred = await page.locator(root).evaluate((element) =>
      [...element.querySelectorAll<HTMLElement>("*")]
        .filter((node) => {
          const style = getComputedStyle(node);
          return style.backdropFilter !== "none" && style.backdropFilter !== "";
        })
        .map((node) => node.dataset.part ?? node.tagName)
    );
    expect(blurred).toEqual([]);
  });

  test("reduced motion stops anything moving in the menu and the panels", async ({ page }) => {
    test.setTimeout(45_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page, "/examples/episodes");
    await start(page);
    await reveal(page);
    const moved = await animatedWhile(page, async () => {
      await page.locator('[data-part="episodes-button"]').click();
      await page.waitForTimeout(450);
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(450);
      await reveal(page);
      await page.locator('[data-part="menu-trigger"]').click();
      await page.waitForTimeout(350);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(350);
    });
    const motion = moved.filter((entry) => / (transform|translate|scale|rotate|left|top|width|height)$/.test(entry));
    expect(motion).toEqual([]);
  });

  test("nothing starts on its own", async ({ page }) => {
    await ready(page, "/examples/player");
    await page.waitForTimeout(1200);
    expect(await page.locator(video).evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  });
});
