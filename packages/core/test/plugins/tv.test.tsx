import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler } from "react";
import { describe, expect, it, vi } from "vitest";
import { createPlayer } from "../../src/core/player";
import { definePlugin } from "../../src/core/plugin";
import type { AnyPlugin, Player } from "../../src/core/types";
import { VideoPlayer } from "../../src/player/video-player";
import { episodes } from "../../src/plugins/episodes/index";
import { hotkeys } from "../../src/plugins/hotkeys/index";
import { i18n } from "../../src/plugins/i18n/index";
import { idle } from "../../src/plugins/idle/index";
import { info } from "../../src/plugins/info/index";
import { playlist, type PlaylistItem } from "../../src/plugins/playlist/index";
import { skip, type SkipSegment } from "../../src/plugins/skip/index";
import { Title } from "../../src/ui/parts/title";
import { advance } from "../helpers/fake-media";

const settle = async () => {
  await act(async () => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

const items: PlaylistItem[] = [
  { src: "/one.mp4", title: "One", eyebrow: "Episode 1", description: "The first.", season: "Season 1", duration: 90 },
  { src: "/two.mp4", title: "Two", season: "Season 1", duration: 3900, thumbnail: "/two.jpg" },
  { src: "/three.mp4", title: "Three", season: "Season 2", duration: 45 },
];

async function shown(plugins: AnyPlugin[], props: Parameters<typeof VideoPlayer>[0] = {}) {
  const player = createPlayer({ plugins, src: props.src });
  const { container } = render(<VideoPlayer {...props} player={player} />);
  await settle();
  const video = container.querySelector("video") as HTMLVideoElement;
  const root = container.querySelector<HTMLElement>(".rv-root") as HTMLElement;
  return { player, container, video, root };
}

const part = (container: Element, name: string) =>
  container.querySelector<HTMLElement>(`[data-part="${name}"]`);
const tiles = (container: Element) => [...container.querySelectorAll<HTMLElement>('[data-part="episode"]')];
const press = (target: Element, key: string) => fireEvent.keyDown(target, { key, bubbles: true });

describe("Title", () => {
  it("renders only the lines it's given", () => {
    const { container, rerender } = render(<Title title="Name" />);
    expect(part(container, "title-text")?.textContent).toBe("Name");
    expect(part(container, "title-eyebrow")).toBeNull();
    expect(part(container, "title-description")).toBeNull();

    rerender(<Title eyebrow="Series" description="About it." />);
    expect(part(container, "title-text")).toBeNull();
    expect(part(container, "title-eyebrow")?.textContent).toBe("Series");
    expect(part(container, "title-description")?.textContent).toBe("About it.");
  });

  it("takes all three on the ready-made player", async () => {
    const { container } = await shown([], {
      src: "/video.mp4",
      title: "Name",
      eyebrow: "Series",
      description: "About it.",
    });
    const row = container.querySelector('[data-position="details"]');
    expect(row?.querySelector('[data-part="title-text"]')?.textContent).toBe("Name");
    expect(row?.querySelector('[data-part="title-eyebrow"]')?.textContent).toBe("Series");
    expect(row?.querySelector('[data-part="title-description"]')?.textContent).toBe("About it.");
  });

  it("shows with a description alone, and renders nothing with no props or plugin", async () => {
    const alone = await shown([], { src: "/video.mp4", description: "About it." });
    expect(part(alone.container, "title-description")?.textContent).toBe("About it.");

    const none = await shown([], { src: "/video.mp4" });
    expect(part(none.container, "title")).toBeNull();
  });
});

describe("playlist metadata", () => {
  it("fills the title slot from the current item, and follows the queue", async () => {
    const { container, player } = await shown([playlist({ items })]);
    expect(part(container, "title-text")?.textContent).toBe("One");
    expect(part(container, "title-eyebrow")?.textContent).toBe("Episode 1");
    expect(part(container, "title-description")?.textContent).toBe("The first.");

    act(() => player.plugin(playlist).commands.next());
    await settle();
    expect(part(container, "title-text")?.textContent).toBe("Two");
    expect(part(container, "title-eyebrow")).toBeNull();
    expect(part(container, "title-description")).toBeNull();
  });

  it("leaves it out for an item with nothing to say, and props on the player win", async () => {
    const bare = await shown([playlist({ items: [{ src: "/a.mp4" }, { src: "/b.mp4" }] })]);
    expect(part(bare.container, "title")).toBeNull();

    const named = await shown([playlist({ items })], { title: "From the prop" });
    expect(part(named.container, "title-text")?.textContent).toBe("From the prop");
  });
});

describe("episodes", () => {
  it("can't be installed without a playlist", () => {
    expect(() => createPlayer({ plugins: [episodes()] })).toThrow(/playlist/);
  });

  it("doesn't read progress until it first opens", async () => {
    const progress = vi.fn(() => 0.5);
    const { player } = await shown([playlist({ items }), episodes({ progress })]);
    expect(progress).not.toHaveBeenCalled();
    act(() => player.plugin(episodes).commands.open());
    await settle();
    expect(progress).toHaveBeenCalled();
  });

  it("has no button with a single item, and no shelf until it first opens", async () => {
    const single = await shown([playlist({ items: [items[0] as PlaylistItem] }), episodes()]);
    expect(part(single.container, "episodes-button")).toBeNull();

    const { container } = await shown([playlist({ items }), episodes()]);
    expect(part(container, "episodes-button")).not.toBeNull();
    expect(part(container, "panel")).toBeNull();
  });

  it("opens on the season that's playing, and writes state to the root", async () => {
    const { container, player, root } = await shown([playlist({ items, start: 2 }), episodes()]);
    const button = part(container, "episodes-button") as HTMLElement;
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    await settle();
    expect(player.plugin(episodes).state()).toMatchObject({ open: true, season: "Season 2" });
    expect(root.hasAttribute("data-episodes-open")).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Episodes" })).toBeTruthy();
    expect(tiles(container).map((tile) => tile.querySelector('[data-part="episode-title"]')?.textContent)).toEqual(["Three"]);

    // Browsing another season doesn't stick, because it reopens on what's playing.
    act(() => player.plugin(episodes).commands.setSeason("Season 1"));
    await settle();
    expect(tiles(container)).toHaveLength(2);
    act(() => player.plugin(episodes).commands.close());
    await settle();
    expect(root.hasAttribute("data-episodes-open")).toBe(false);
    act(() => player.plugin(episodes).commands.toggle());
    await settle();
    expect(player.plugin(episodes).state().season).toBe("Season 2");
  });

  it("offers seasons only when there are several, and all items when none have one", async () => {
    const several = await shown([playlist({ items }), episodes()]);
    act(() => several.player.plugin(episodes).commands.open());
    await settle();
    const pills = several.container.querySelectorAll<HTMLElement>('[data-part="episodes-season"]');
    expect([...pills].map((pill) => pill.textContent)).toEqual(["Season 1", "Season 2"]);
    expect(pills[0]?.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(pills[1] as HTMLElement);
    await settle();
    expect(several.player.plugin(episodes).state().season).toBe("Season 2");
    expect(pills[1]?.getAttribute("aria-pressed")).toBe("true");

    const none = await shown([
      playlist({ items: [{ src: "/a.mp4", title: "A" }, { src: "/b.mp4", title: "B" }] }),
      episodes(),
    ]);
    act(() => none.player.plugin(episodes).commands.open());
    await settle();
    expect(part(none.container, "episodes-seasons")).toBeNull();
    expect(tiles(none.container)).toHaveLength(2);
  });

  it("plays what's selected and closes, and only closes for what's already playing", async () => {
    const { container, player } = await shown([playlist({ items }), episodes()]);
    act(() => player.plugin(episodes).commands.open());
    await settle();
    fireEvent.click(tiles(container)[0] as HTMLElement);
    await settle();
    expect(player.plugin(episodes).state().open).toBe(false);
    expect(player.plugin(playlist).state().index).toBe(0);
    expect(player.getState().media.paused).toBe(true);

    act(() => player.plugin(episodes).commands.open());
    await settle();
    fireEvent.click(tiles(container)[1] as HTMLElement);
    await settle();
    expect(player.plugin(episodes).state().open).toBe(false);
    expect(player.plugin(playlist).state().index).toBe(1);
    expect(player.getState().media.source?.src).toBe("/two.mp4");
    expect(player.getState().media.paused).toBe(false);
  });

  it("marks what's playing, and shows runtimes and progress", async () => {
    const progress = vi.fn((_: PlaylistItem, index: number) => (index === 1 ? 0.5 : index === 0 ? 0.9 : null));
    const { container, player, video } = await shown([playlist({ items }), episodes({ progress })]);
    await player.commands.play();
    advance(video, 15);
    await settle();
    act(() => player.plugin(episodes).commands.open());
    await settle();
    const [first, second] = tiles(container) as [HTMLElement, HTMLElement];

    expect(first.getAttribute("aria-current")).toBe("true");
    expect(part(first, "episode-playing")).not.toBeNull();
    expect(part(first, "episode-meta")?.textContent).toBe("Now playing");
    // The one that's playing reports its real position, not what `progress` says.
    expect(first.querySelector<HTMLElement>('[data-part="episode-progress"] > span')?.style.transform).toBe("scaleX(0.25)");

    expect(second.hasAttribute("aria-current")).toBe(false);
    expect(part(second, "episode-meta")?.textContent).toContain("1");
    expect(second.querySelector("img")?.getAttribute("src")).toBe("/two.jpg");
    expect(second.querySelector<HTMLElement>('[data-part="episode-progress"] > span')?.style.transform).toBe("scaleX(0.5)");
    expect(progress).toHaveBeenCalled();
  });

  it("moves focus in, along the tiles with the arrows, and back on Escape", async () => {
    const { container, player } = await shown([playlist({ items }), episodes()]);
    const button = part(container, "episodes-button") as HTMLElement;
    fireEvent.click(button);
    await settle();
    const [first, second] = tiles(container) as [HTMLElement, HTMLElement];
    expect(document.activeElement).toBe(first);

    press(first, "ArrowRight");
    expect(document.activeElement).toBe(second);
    press(second, "ArrowRight");
    expect(document.activeElement).toBe(second);
    press(second, "Home");
    expect(document.activeElement).toBe(first);
    press(first, "End");
    expect(document.activeElement).toBe(second);
    await settle();
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);

    press(second, "Escape");
    await settle();
    expect(player.plugin(episodes).state().open).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("closes from its button and from a click outside the sheet", async () => {
    const { container, player } = await shown([playlist({ items }), episodes()]);
    act(() => player.plugin(episodes).commands.open());
    await settle();
    fireEvent.click(part(container, "panel-close") as HTMLElement);
    await settle();
    expect(player.plugin(episodes).state().open).toBe(false);

    act(() => player.plugin(episodes).commands.open());
    await settle();
    fireEvent.click(part(container, "panel-sheet") as HTMLElement);
    await settle();
    expect(player.plugin(episodes).state().open).toBe(true);
    fireEvent.click(part(container, "panel") as HTMLElement);
    await settle();
    expect(player.plugin(episodes).state().open).toBe(false);
  });

  it("keeps hotkeys out, and leaves them working once closed", async () => {
    const { container, player, root } = await shown([playlist({ items }), episodes(), hotkeys()]);
    act(() => player.plugin(episodes).commands.open());
    await settle();
    const tile = tiles(container)[0] as HTMLElement;
    press(tile, "m");
    press(tile, "k");
    await settle();
    expect(player.getState().media.muted).toBe(false);
    expect(player.getState().media.paused).toBe(true);

    act(() => player.plugin(episodes).commands.close());
    await settle();
    root.focus();
    press(root, "m");
    await settle();
    expect(player.getState().media.muted).toBe(true);
  });

  it("keeps the controls up while open", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
    try {
      const player = createPlayer({ plugins: [playlist({ items }), episodes(), idle({ mouseTimeout: 100 })] });
      render(<VideoPlayer player={player} />);
      await act(async () => {
        vi.advanceTimersByTime(0);
        await Promise.resolve();
      });
      await act(async () => {
        await player.commands.play();
      });
      const wait = async () => {
        for (const step of [100, 100, 100, 100]) {
          await act(async () => {
            vi.advanceTimersByTime(step);
            await Promise.resolve();
          });
        }
      };
      act(() => player.plugin(episodes).commands.open());
      (document.activeElement as HTMLElement).blur();
      await wait();
      expect(player.plugin(idle).state().visible).toBe(true);

      act(() => player.plugin(episodes).commands.close());
      // Keyboard focus on the button it returned to would pin them too, as it should.
      (document.activeElement as HTMLElement).blur();
      await wait();
      expect(player.plugin(idle).state().visible).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("doesn't re-render during playback", async () => {
    const player = createPlayer({ plugins: [playlist({ items }), episodes(), skip({ segments: [{ start: 100, end: 110 }] }), info()] });
    let commits = 0;
    const { container } = render(
      <Profiler id="player" onRender={() => { commits += 1; }}>
        <VideoPlayer player={player} />
      </Profiler>
    );
    await settle();
    await player.commands.play();
    await settle();
    act(() => player.plugin(episodes).commands.open());
    await settle();
    const video = container.querySelector("video") as HTMLVideoElement;
    commits = 0;
    for (let second = 1; second <= 20; second += 1) {
      act(() => advance(video, 1));
    }
    await settle();
    expect(commits).toBe(0);
  });
});

describe("skip", () => {
  const parts: SkipSegment[] = [
    { kind: "intro", start: 5, end: 20 },
    { kind: "recap", start: 25, end: 30 },
    { kind: "credits", start: 50, end: 60 },
    { start: 35, end: 40, label: "Skip the song" },
  ];

  const at = async (player: Player, video: HTMLVideoElement, time: number) => {
    act(() => {
      advance(video, time - video.currentTime);
      player.clock.sync();
    });
    await settle();
  };

  it("offers the part at the current position, by kind or by label", async () => {
    const { container, player, video, root } = await shown([skip({ segments: parts })], { src: "/video.mp4" });
    await player.commands.play();
    await settle();
    expect(part(container, "skip")).toBeNull();

    const expected: [number, string][] = [
      [6, "Skip Intro"],
      [26, "Skip Recap"],
      [36, "Skip the song"],
      [51, "Skip Credits"],
    ];
    for (const [time, text] of expected) {
      await at(player, video, time);
      const button = part(container, "skip");
      expect(button?.textContent).toBe(text);
      expect(button?.getAttribute("data-state")).toBe("visible");
      expect(root.hasAttribute("data-skip")).toBe(true);
    }
  });

  it("fades out with its last text, between parts", async () => {
    const { container, player, video, root } = await shown([skip({ segments: parts })], { src: "/video.mp4" });
    await player.commands.play();
    await at(player, video, 6);
    await at(player, video, 21);
    const button = part(container, "skip");
    expect(button?.getAttribute("data-state")).toBe("hidden");
    expect(button?.textContent).toBe("Skip Intro");
    expect(root.hasAttribute("data-skip")).toBe(false);
  });

  it("seeks to the end of the part", async () => {
    const { container, player, video } = await shown([skip({ segments: parts })], { src: "/video.mp4" });
    await player.commands.play();
    await at(player, video, 6);
    fireEvent.click(part(container, "skip") as HTMLElement);
    await settle();
    expect(video.currentTime).toBe(20);
    expect(player.plugin(skip).state().active).toBe(-1);
  });

  it("writes to the store only when the part changes", async () => {
    const { player, video } = await shown([skip({ segments: parts })], { src: "/video.mp4" });
    await player.commands.play();
    await settle();
    const before = player.getState().skip;
    await at(player, video, 2);
    await at(player, video, 3);
    await at(player, video, 4);
    expect(player.getState().skip).toBe(before);
    await at(player, video, 6);
    const during = player.getState().skip;
    expect(during).not.toBe(before);
    await at(player, video, 7);
    await at(player, video, 8);
    expect(player.getState().skip).toBe(during);
  });

  it("moves on to the next item from credits, and says so", async () => {
    const queue = [{ src: "/one.mp4" }, { src: "/two.mp4" }];
    const { container, player, video } = await shown([
      playlist({ items: queue }),
      skip({ segments: [{ kind: "credits", start: 50, end: 60 }] }),
    ]);
    await player.commands.play();
    await at(player, video, 51);
    expect(part(container, "skip")?.textContent).toBe("Next Episode");
    fireEvent.click(part(container, "skip") as HTMLElement);
    await settle();
    expect(player.plugin(playlist).state().index).toBe(1);
    expect(player.getState().media.source?.src).toBe("/two.mp4");

    // There's nothing after this one, so its credits are only skipped.
    await at(player, video, 51);
    expect(part(container, "skip")?.textContent).toBe("Skip Credits");
  });

  it("picks parts for each source, and can replace them", async () => {
    const segments = vi.fn((source: { src: string }) =>
      source.src === "/one.mp4" ? [{ kind: "intro" as const, start: 5, end: 10 }] : null
    );
    const { player, video } = await shown([playlist({ items: [{ src: "/one.mp4" }, { src: "/two.mp4" }] }), skip({ segments })]);
    await player.commands.play();
    await settle();
    const { state, commands } = player.plugin(skip);
    expect(state().segments).toHaveLength(1);

    act(() => player.plugin(playlist).commands.next());
    await settle();
    expect(state().segments).toHaveLength(0);

    act(() => commands.setSegments([{ kind: "recap", start: 0, end: 9 }]));
    await at(player, video, 1);
    expect(state().active).toBe(0);
  });

  it("does nothing during an ad, whose clock isn't this video's", async () => {
    const adBreak = definePlugin("ad-break", () => ({
      commands: (context) => ({ start: () => context.lock("ads", ["seek", "rate"]) }),
    }));
    const { container, player, video } = await shown([adBreak(), skip({ segments: parts })], { src: "/video.mp4" });
    await player.commands.play();
    await at(player, video, 6);
    expect(player.plugin(skip).state().active).toBe(0);

    let finish = () => {};
    act(() => {
      finish = player.plugin(adBreak).commands.start();
    });
    await settle();
    expect(player.plugin(skip).state().active).toBe(-1);
    expect(part(container, "skip")?.getAttribute("data-state")).toBe("hidden");

    act(() => finish());
    await settle();
    expect(player.plugin(skip).state().active).toBe(0);
  });

  it("skips by itself with no button, once per part", async () => {
    const { container, player, video } = await shown([skip({ segments: parts, auto: true })], { src: "/video.mp4" });
    await player.commands.play();
    await at(player, video, 6);
    expect(part(container, "skip")).toBeNull();
    expect(video.currentTime).toBe(20);

    // Going back means they want to see it.
    act(() => player.commands.seek(6));
    await settle();
    await at(player, video, 7);
    expect(video.currentTime).toBe(7);
  });

  it("translates through i18n", async () => {
    const { container, player, video } = await shown(
      [i18n({ locale: "fr", strings: { skipIntro: "Ignorer" } }), skip({ segments: parts })],
      { src: "/video.mp4" }
    );
    await player.commands.play();
    await at(player, video, 6);
    expect(part(container, "skip")?.textContent).toBe("Ignorer");
  });
});

describe("info", () => {
  const content = {
    title: "Name",
    eyebrow: "Series",
    description: "About it.",
    artwork: "/art.jpg",
    facts: ["2024", "TV-PG"],
    credits: [
      { role: "Directed by", names: "A. Rivera" },
      { role: "Written by", names: ["A. Rivera", "J. Okafor"] },
    ],
  };

  it("shows what it's given, moves focus in, and returns it", async () => {
    const { container, player, root } = await shown([info(content)], { src: "/video.mp4" });
    expect(part(container, "panel")).toBeNull();
    const button = part(container, "info-button") as HTMLElement;
    fireEvent.click(button);
    await settle();

    expect(root.hasAttribute("data-info-open")).toBe(true);
    expect(screen.getByRole("dialog", { name: "Name" })).toBeTruthy();
    expect(part(container, "info-title")?.textContent).toBe("Name");
    expect(part(container, "info-eyebrow")?.textContent).toBe("Series");
    expect(part(container, "info-facts")?.textContent).toBe("2024 · TV-PG");
    expect(part(container, "info-description")?.textContent).toBe("About it.");
    expect(part(container, "info-artwork")?.getAttribute("src")).toBe("/art.jpg");
    const rows = container.querySelectorAll('[data-part="info-credits"] > div');
    expect(rows[1]?.querySelector("dd")?.textContent).toBe("A. Rivera, J. Okafor");
    expect(document.activeElement).toBe(part(container, "info-body"));

    press(document.activeElement as Element, "Escape");
    await settle();
    expect(player.plugin(info).state().open).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("falls back to the current item, and closes when the video changes", async () => {
    const { container, player } = await shown([playlist({ items }), info({ facts: ["2024"] })]);
    act(() => player.plugin(info).commands.open());
    await settle();
    expect(part(container, "info-title")?.textContent).toBe("One");
    expect(part(container, "info-eyebrow")?.textContent).toBe("Episode 1");
    expect(part(container, "info-description")?.textContent).toBe("The first.");
    expect(part(container, "info-facts")?.textContent).toBe("2024");

    act(() => player.plugin(playlist).commands.next());
    await settle();
    expect(player.plugin(info).state().open).toBe(false);

    act(() => player.plugin(info).commands.open());
    await settle();
    expect(part(container, "info-title")?.textContent).toBe("Two");
    expect(part(container, "info-artwork")?.getAttribute("src")).toBe("/two.jpg");
  });

  it("lets its contents be replaced, and leaves out what's missing", async () => {
    const { container, player } = await shown([info({ title: "Old" })], { src: "/video.mp4" });
    act(() => {
      player.plugin(info).commands.setInfo({ title: "New" });
      player.plugin(info).commands.toggle();
    });
    await settle();
    expect(part(container, "info-title")?.textContent).toBe("New");
    for (const name of ["info-eyebrow", "info-facts", "info-description", "info-artwork", "info-credits"]) {
      expect(part(container, name)).toBeNull();
    }
    act(() => player.plugin(info).commands.toggle());
    await settle();
    expect(player.plugin(info).state().open).toBe(false);
  });

  it("keeps hotkeys out, so arrow keys can scroll it", async () => {
    const { container, player } = await shown([info(content), hotkeys()], { src: "/video.mp4" });
    act(() => player.plugin(info).commands.open());
    await settle();
    const body = part(container, "info-body") as HTMLElement;
    const event = fireEvent.keyDown(body, { key: "ArrowDown", bubbles: true, cancelable: true });
    expect(event).toBe(true);
    press(body, "m");
    await settle();
    expect(player.getState().media.muted).toBe(false);
  });
});
