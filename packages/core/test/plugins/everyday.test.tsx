import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import { analytics, type AnalyticsEvent } from "../../src/plugins/analytics/index";
import { audioTracks, AudioMenu } from "../../src/plugins/audio-tracks/index";
import { autoplay } from "../../src/plugins/autoplay/index";
import { captions, CaptionsToggle } from "../../src/plugins/captions/index";
import { chapters, ChaptersMenu } from "../../src/plugins/chapters/index";
import { fullscreen } from "../../src/plugins/fullscreen/index";
import { hotkeys, HotkeysFeedback } from "../../src/plugins/hotkeys/index";
import { i18n } from "../../src/plugins/i18n/index";
import { mediaSession } from "../../src/plugins/media-session/index";
import { persistence } from "../../src/plugins/persistence/index";
import { quality, QualityMenu } from "../../src/plugins/quality/index";
import { recovery } from "../../src/plugins/recovery/index";
import { speed, SpeedMenu } from "../../src/plugins/speed/index";
import { thumbnails } from "../../src/plugins/thumbnails/index";
import { parseVtt } from "../../src/lib/vtt";
import { Media } from "../../src/react/media";
import { Menu } from "../../src/react/primitives/menu";
import { MenuContent } from "../../src/react/primitives/menu-content";
import { MenuTrigger } from "../../src/react/primitives/menu-trigger";
import { Mute } from "../../src/react/primitives/mute";
import { Timeline } from "../../src/react/primitives/timeline";
import { Root } from "../../src/react/root";
import { advance, fakeBehaviour } from "../helpers/fake-media";

const settle = async () => {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function mounted(
  options: Parameters<typeof createPlayer>[0],
  prepare?: (video: HTMLVideoElement) => void
) {
  const player = createPlayer({ src: "/video.mp4", ...options });
  const root = document.createElement("div");
  const video = document.createElement("video");
  prepare?.(video);
  root.append(video);
  document.body.append(root);
  cleanups.push(() => root.remove());
  cleanups.push(player.mount(root));
  cleanups.push(player.attach(video));
  await settle();
  return { player, root, video, media: () => player.getState().media };
}

const press = (key: string, target: EventTarget = document, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};

function fakeList<Item extends object>(items: Item[]) {
  const list = new EventTarget() as EventTarget & { length: number } & Record<number, Item>;
  const sync = () => {
    list.length = items.length;
    items.forEach((item, index) => {
      list[index] = item;
    });
  };
  sync();
  return Object.assign(list, {
    add(item: Item, type = "addtrack") {
      items.push(item);
      sync();
      list.dispatchEvent(new Event(type));
    },
  });
}

function fakeTextTrack(language: string, mode: TextTrackMode = "disabled") {
  const track = new EventTarget() as EventTarget & Record<string, unknown>;
  return Object.assign(track, {
    id: "",
    kind: "subtitles",
    label: language.toUpperCase(),
    language,
    mode,
    activeCues: [] as { text: string }[],
  });
}

describe("sharing plugin instances", () => {
  it("keeps players separate when they share one plugins array", async () => {
    const plugins = [captions()];
    const firstTrack = fakeTextTrack("en");
    const secondTrack = fakeTextTrack("en");
    const first = await mounted({ plugins }, (video) => {
      Object.defineProperty(video, "textTracks", { value: fakeList([firstTrack]) });
    });
    const second = await mounted({ plugins }, (video) => {
      Object.defineProperty(video, "textTracks", { value: fakeList([secondTrack]) });
    });
    const heard = vi.fn();
    cleanups.push(second.player.plugin(captions).commands.onCues(heard));
    first.player.plugin(captions).commands.select("en");
    second.player.plugin(captions).commands.select("en");
    heard.mockClear();
    firstTrack.dispatchEvent(new Event("cuechange"));
    expect(heard).not.toHaveBeenCalled();
    secondTrack.dispatchEvent(new Event("cuechange"));
    expect(heard).toHaveBeenCalledOnce();
  });
});

describe("speed", () => {
  it("steps through its rates, stopping at the ends", async () => {
    const { player, media } = await mounted({ plugins: [speed({ rates: [0.5, 1, 2] })] });
    const { faster, slower, set } = player.plugin(speed).commands;
    faster();
    await settle();
    expect(media().rate).toBe(2);
    faster();
    await settle();
    expect(media().rate).toBe(2);
    set(1);
    await settle();
    slower();
    await settle();
    expect(media().rate).toBe(0.5);
    slower();
    await settle();
    expect(media().rate).toBe(0.5);
  });

  it("lists rates in the menu, picks one, and returns to the top level", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [speed()] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <SpeedMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    const row = document.querySelector('[data-menu="speed"]') as HTMLElement;
    expect(row.textContent).toContain("Normal");
    fireEvent.click(row);
    await settle();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "1.5×", hidden: true }));
    await settle();
    expect(player.getState().media.rate).toBe(1.5);
    expect(row.textContent).toContain("1.5×");
  });

  it("disappears while something locks the rate", async () => {
    const locker = definePlugin("locker", () => ({
      commands: (context) => ({ lock: () => context.lock("test", ["rate"]) }),
    }));
    const player = createPlayer({ src: "/video.mp4", plugins: [speed(), locker()] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent data-testid="content">
            <SpeedMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    expect(document.querySelector('[data-menu="speed"]')).not.toBeNull();
    act(() => {
      player.plugin(locker).commands.lock();
    });
    await settle();
    expect(document.querySelector('[data-menu="speed"]')).toBeNull();
  });
});

describe("hotkeys", () => {
  it("toggles playback, seeks, and changes volume while focus is inside", async () => {
    const { player, root, video, media } = await mounted({ plugins: [hotkeys()] });
    const button = document.createElement("div");
    button.tabIndex = 0;
    root.append(button);

    press("k", button);
    await settle();
    expect(media().paused).toBe(false);
    press("k", button);
    await settle();
    expect(media().paused).toBe(true);

    press("ArrowRight", button);
    await settle();
    expect(video.currentTime).toBe(5);
    press("j", button);
    await settle();
    expect(video.currentTime).toBe(0);
    press("l", button);
    await settle();
    expect(video.currentTime).toBe(10);

    press("ArrowDown", button);
    await settle();
    expect(media().volume).toBeCloseTo(0.95);
    press("m", button);
    await settle();
    expect(media().muted).toBe(true);

    press("5", button);
    await settle();
    expect(video.currentTime).toBe(30);
    expect(player.has("hotkeys")).toBe(true);
  });

  it("ignores keys while typing or with modifiers", async () => {
    const { root, video } = await mounted({ plugins: [hotkeys()] });
    const text = document.createElement("input");
    root.append(text);

    expect(press("ArrowRight", text).defaultPrevented).toBe(false);
    await settle();
    expect(video.currentTime).toBe(0);

    expect(press("ArrowRight", root, { metaKey: true }).defaultPrevented).toBe(false);
    expect(press("ArrowRight", root, { ctrlKey: true }).defaultPrevented).toBe(false);
    await settle();
    expect(video.currentTime).toBe(0);
  });

  it("leaves a focused slider its own keys, but still takes the others", async () => {
    const { root, video, media } = await mounted({ plugins: [hotkeys()] });
    const range = document.createElement("input");
    range.type = "range";
    root.append(range);
    for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"]) {
      expect(press(key, range).defaultPrevented).toBe(false);
    }
    await settle();
    expect(video.currentTime).toBe(0);
    expect(press("m", range).defaultPrevented).toBe(true);
    await settle();
    expect(media().muted).toBe(true);
  });

  it("leaves Space alone on a focused button, so it isn't pressed twice", async () => {
    const { root, media } = await mounted({ plugins: [hotkeys()] });
    const button = document.createElement("button");
    root.append(button);
    expect(press(" ", button).defaultPrevented).toBe(false);
    await settle();
    expect(media().paused).toBe(true);
    // A button has no meaning for letter keys.
    expect(press("k", button).defaultPrevented).toBe(true);
    await settle();
    expect(media().paused).toBe(false);
  });

  it("follows the last used player, until the viewer clicks elsewhere", async () => {
    const first = await mounted({ plugins: [hotkeys()] });
    const second = await mounted({ plugins: [hotkeys()] });

    press("ArrowRight", document.body);
    await settle();
    expect(first.video.currentTime).toBe(0);
    expect(second.video.currentTime).toBe(0);

    first.root.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    press("ArrowRight", document.body);
    await settle();
    expect(first.video.currentTime).toBe(5);
    expect(second.video.currentTime).toBe(0);

    second.root.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    press("ArrowRight", document.body);
    await settle();
    expect(first.video.currentTime).toBe(5);
    expect(second.video.currentTime).toBe(5);

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    press("ArrowRight", document.body);
    await settle();
    expect(second.video.currentTime).toBe(5);
  });

  it("doesn't seek twice with a real timeline focused", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [hotkeys()] });
    render(
      <Root player={player}>
        <Media />
        <Timeline />
      </Root>
    );
    await settle();
    const input = screen.getByRole("slider", { name: "Seek" });
    fireEvent.keyDown(input, { key: "ArrowRight" });
    await settle();
    expect(player.video()?.currentTime).toBe(5);
  });

  it("reaches optional plugins only when they're installed", async () => {
    const { root } = await mounted({ plugins: [hotkeys()] });
    // No fullscreen, captions, or speed plugin here, so these must simply do nothing.
    for (const key of ["f", "p", "c", ">", "<"]) {
      expect(() => press(key, root)).not.toThrow();
    }
    await settle();

    const toggle = vi.fn(async () => {});
    HTMLElement.prototype.requestFullscreen = toggle;
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
    const withFullscreen = await mounted({ plugins: [hotkeys(), fullscreen()] });
    press("f", withFullscreen.root);
    await settle();
    expect(toggle).toHaveBeenCalled();
  });

  it("confirms an action in a status message, which then clears", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [hotkeys()] });
    const { container } = render(
      <Root player={player}>
        <Media />
        <HotkeysFeedback />
      </Root>
    );
    await settle();
    vi.useFakeTimers();
    const root = container.querySelector('[data-part="root"]') ?? container.firstElementChild;
    press("m", root as Element);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Muted");
    expect(status.hasAttribute("data-visible")).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(status.hasAttribute("data-visible")).toBe(false);
  });
});

describe("quality", () => {
  const renditions = {
    renditions: [
      { src: "/low.mp4", label: "480p", height: 480 },
      { src: "/high.mp4", label: "1080p", height: 1080 },
    ],
  };

  it("offers levels only for sources with renditions", async () => {
    const { media } = await mounted({ src: renditions, plugins: [quality()] });
    expect(media().qualities.map(({ label }) => label)).toEqual(["480p", "1080p"]);
    const plain = await mounted({ plugins: [quality()] });
    expect(plain.media().provider).toBe("native");
    expect(plain.media().qualities).toEqual([]);
  });

  it("switches level without losing position", async () => {
    const { player, video, media } = await mounted({ src: renditions, plugins: [quality()] });
    await player.commands.play();
    advance(video, 12);
    await settle();
    player.plugin(quality).commands.select("1080p");
    await settle();
    expect(video.src).toContain("/high.mp4");
    expect(video.currentTime).toBe(12);
    expect(media().paused).toBe(false);
    expect(media().quality.active).toBe("1080p");
  });

  it("offers a menu sorted best first, or nothing with one level", async () => {
    const player = createPlayer({ src: renditions, plugins: [quality()] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <QualityMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    fireEvent.click(document.querySelector('[data-menu="quality"]') as HTMLElement);
    await settle();
    const items = screen.getAllByRole("menuitemradio", { hidden: true });
    expect(items.map((item) => item.textContent)).toEqual(["1080p", "480p"]);
  });

  it("hides the menu when there's nothing to choose between", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [quality()] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <QualityMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    expect(document.querySelector('[data-menu="quality"]')).toBeNull();
  });
});

describe("audio-tracks", () => {
  const tracks = () => [
    { id: "en", label: "English", language: "en", kind: "main", enabled: true },
    { id: "fr", label: "Français", language: "fr", kind: "translation", enabled: false },
  ];
  it("reads native tracks, and selecting one enables only it", async () => {
    const items = tracks();
    const list = fakeList<(typeof items)[number]>([]);
    const { player, media } = await mounted({ plugins: [audioTracks()] }, (video) => {
      Object.defineProperty(video, "audioTracks", { value: list });
    });
    // Browsers add these once the source's metadata has loaded.
    for (const item of items) list.add(item);
    await settle();
    expect(media().audioTracks.map(({ id }) => id)).toEqual(["en", "fr"]);
    expect(media().audioTrack).toBe("en");
    player.plugin(audioTracks).commands.select("fr");
    await settle();
    expect(items.map(({ enabled }) => enabled)).toEqual([false, true]);
    expect(media().audioTrack).toBe("fr");
  });

  it("hides its menu with fewer than two tracks", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [audioTracks()] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <AudioMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    expect(document.querySelector('[data-menu="audio"]')).toBeNull();
  });
});

describe("captions", () => {
  const withTracks = (...tracks: ReturnType<typeof fakeTextTrack>[]) => {
    const list = fakeList(tracks);
    return {
      list,
      prepare(video: HTMLVideoElement) {
        Object.defineProperty(video, "textTracks", { value: list });
      },
    };
  };

  it("hides tracks from the browser's renderer, so cues aren't drawn twice", async () => {
    const english = fakeTextTrack("en");
    const french = fakeTextTrack("fr");
    const { prepare } = withTracks(english, french);
    const { player } = await mounted({ plugins: [captions()] }, prepare);
    const handle = player.plugin(captions);
    expect(handle.state().tracks.map(({ language }) => language)).toEqual(["en", "fr"]);

    handle.commands.select("fr");
    expect(french.mode).toBe("hidden");
    expect(english.mode).toBe("disabled");
    expect(handle.state().active).toBe("fr");
    expect(player.attributes()["data-captions"]).toBe("");
  });

  it("delivers active cues to listeners", async () => {
    const english = fakeTextTrack("en");
    const { prepare } = withTracks(english);
    const { player } = await mounted({ plugins: [captions()] }, prepare);
    const listener = vi.fn();
    cleanups.push(player.plugin(captions).commands.onCues(listener));
    player.plugin(captions).commands.select("en");
    listener.mockClear();

    english.activeCues = [{ text: "Hello" }];
    english.dispatchEvent(new Event("cuechange"));
    expect(listener).toHaveBeenCalledWith([{ text: "Hello" }]);
  });

  it("stops listening to a track once another is chosen", async () => {
    const english = fakeTextTrack("en");
    const french = fakeTextTrack("fr");
    const { prepare } = withTracks(english, french);
    const { player } = await mounted({ plugins: [captions()] }, prepare);
    const { select, onCues } = player.plugin(captions).commands;
    const listener = vi.fn();
    cleanups.push(onCues(listener));
    select("en");
    select("fr");
    listener.mockClear();
    english.dispatchEvent(new Event("cuechange"));
    expect(listener).not.toHaveBeenCalled();
    french.dispatchEvent(new Event("cuechange"));
    expect(listener).toHaveBeenCalledOnce();
  });

  it("toggles back to the last track used", async () => {
    const { prepare } = withTracks(fakeTextTrack("en"), fakeTextTrack("fr"));
    const { player } = await mounted({ plugins: [captions()] }, prepare);
    const { select, toggle } = player.plugin(captions).commands;
    const { state } = player.plugin(captions);
    toggle();
    expect(state().active).toBe("en");
    select("fr");
    toggle();
    expect(state().active).toBeNull();
    toggle();
    expect(state().active).toBe("fr");
  });

  it("turns on a wanted language when its track arrives later", async () => {
    const { list, prepare } = withTracks();
    const { player } = await mounted({ plugins: [captions({ language: "fr" })] }, prepare);
    expect(player.plugin(captions).state().active).toBeNull();
    list.add(fakeTextTrack("en"));
    expect(player.plugin(captions).state().active).toBeNull();
    list.add(fakeTextTrack("fr"));
    expect(player.plugin(captions).state().active).toBe("fr");
  });

  it("takes over a track the browser showed by default", async () => {
    const english = fakeTextTrack("en", "showing");
    const { prepare } = withTracks(english);
    const { player } = await mounted({ plugins: [captions()] }, prepare);
    expect(english.mode).toBe("hidden");
    expect(player.plugin(captions).state().active).toBe("en");
  });

  it("lets the browser draw in iOS fullscreen, where nothing else can", async () => {
    const english = fakeTextTrack("en");
    const { prepare } = withTracks(english);
    const { player, video } = await mounted({ plugins: [captions()] }, prepare);
    player.plugin(captions).commands.select("en");
    video.dispatchEvent(new Event("webkitbeginfullscreen"));
    expect(english.mode).toBe("showing");
    video.dispatchEvent(new Event("webkitendfullscreen"));
    expect(english.mode).toBe("hidden");
  });

  it("adds configured tracks to the video, and removes them on detach", async () => {
    const player = createPlayer({
      src: "/video.mp4",
      plugins: [
        captions({ tracks: [{ src: "/en.vtt", language: "en", label: "English" }] }),
      ],
    });
    const video = document.createElement("video");
    const unmount = player.mount(document.createElement("div"));
    const detach = player.attach(video);
    await settle();
    const element = video.querySelector("track");
    expect(element?.getAttribute("srclang")).toBe("en");
    detach();
    unmount();
    expect(video.querySelector("track")).toBeNull();
  });

  it("shows no toggle until there's a track", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [captions()] });
    render(
      <Root player={player}>
        <Media />
        <CaptionsToggle />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Captions" })).toBeNull();
  });
});

describe("chapters", () => {
  const items = [
    { start: 0, title: "Intro" },
    { start: 20, title: "Middle" },
    { start: 40, title: "End" },
  ];

  it("works out the chapter at a time, and moves between them", async () => {
    const { player, video } = await mounted({ plugins: [chapters({ items })] });
    const { at, next, previous, select } = player.plugin(chapters).commands;
    expect(at(0)).toBe(0);
    expect(at(19.9)).toBe(0);
    expect(at(20)).toBe(1);
    expect(at(59)).toBe(2);

    next();
    await settle();
    expect(video.currentTime).toBe(20);
    next();
    await settle();
    expect(video.currentTime).toBe(40);
    // Past the last chapter there's nowhere to go.
    next();
    await settle();
    expect(video.currentTime).toBe(40);
    previous();
    await settle();
    expect(video.currentTime).toBe(20);
    select(0);
    await settle();
    expect(video.currentTime).toBe(0);
  });

  it("loads chapters from a file, ignoring it if the source changes first", async () => {
    const responses: Record<string, string> = {
      "/a.vtt": "WEBVTT\n\n00:00.000 --> 00:10.000\nFirst\n\n00:10.000 --> 00:20.000\nSecond\n",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => ({ ok: true, text: async () => responses[url] ?? "" }))
    );
    const { player } = await mounted({ plugins: [chapters({ src: "/a.vtt" })] });
    await settle();
    expect(player.plugin(chapters).state().items.map(({ title }) => title)).toEqual([
      "First",
      "Second",
    ]);
  });

  it("marks the active chapter in the menu and jumps on selection", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [chapters({ items })] });
    render(
      <Root player={player}>
        <Media />
        <Menu>
          <MenuTrigger>Settings</MenuTrigger>
          <MenuContent>
            <ChaptersMenu />
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByText("Settings"));
    await settle();
    fireEvent.click(document.querySelector('[data-menu="chapters"]') as HTMLElement);
    await settle();
    const radios = screen.getAllByRole("menuitemradio", { hidden: true });
    expect(radios).toHaveLength(3);
    fireEvent.click(radios[1] as HTMLElement);
    await settle();
    expect(player.video()?.currentTime).toBe(20);
  });
});

describe("vtt parsing", () => {
  it("reads timings with and without hours, ignoring cue settings and headers", () => {
    const cues = parseVtt(
      "WEBVTT\nKind: chapters\n\nNOTE a comment\n\n1\r\n00:00:01.500 --> 00:00:03.000 line:0\r\nOne\r\n\r\n01:00.000 --> 01:30.000\nTwo\nlines\n"
    );
    expect(cues).toEqual([
      { start: 1.5, end: 3, text: "One" },
      { start: 60, end: 90, text: "Two\nlines" },
    ]);
  });
});

describe("thumbnails", () => {
  const vtt =
    "WEBVTT\n\n00:00.000 --> 00:10.000\nsprite.jpg#xywh=0,0,160,90\n\n00:10.000 --> 00:20.000\nsprite.jpg#xywh=160,0,160,90\n";

  it("loads only when first needed, then resolves sprites relative to the file", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, text: async () => vtt }));
    vi.stubGlobal("fetch", fetcher);
    const { player } = await mounted({
      plugins: [thumbnails({ src: "/media/thumbs.vtt" })],
    });
    expect(fetcher).not.toHaveBeenCalled();

    const { at } = player.plugin(thumbnails).commands;
    expect(at(5)).toBeNull();
    expect(fetcher).toHaveBeenCalledOnce();
    await settle();
    const thumbnail = at(15);
    expect(thumbnail).toMatchObject({ x: 160, y: 0, width: 160, height: 90 });
    expect(thumbnail?.image).toMatch(/\/media\/sprite\.jpg$/);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("copes with a missing file", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, text: async () => "" })));
    const { player } = await mounted({ plugins: [thumbnails({ src: "/gone.vtt" })] });
    const { at } = player.plugin(thumbnails).commands;
    at(1);
    await settle();
    expect(at(1)).toBeNull();
  });
});

describe("persistence", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
      removeItem: (key: string) => void values.delete(key),
    };
  };

  it("restores preferences after hydration, not before", async () => {
    const storage = memory();
    storage.values.set(
      "rv:preferences",
      JSON.stringify({ volume: 0.3, muted: true, rate: 1.5, captions: null })
    );
    const player = createPlayer({ src: "/video.mp4", plugins: [persistence({ storage })] });
    // What the server and the first client render see.
    expect(player.getInitialState().media.volume).toBe(1);
    const unmount = player.mount(document.createElement("div"));
    const detach = player.attach(document.createElement("video"));
    await settle();
    expect(player.getState().media).toMatchObject({ volume: 0.3, muted: true, rate: 1.5 });
    detach();
    unmount();
  });

  it("saves preference changes", async () => {
    const storage = memory();
    const { player } = await mounted({ plugins: [persistence({ storage })] });
    player.commands.setVolume(0.4);
    await settle();
    expect(JSON.parse(storage.values.get("rv:preferences") as string)).toMatchObject({
      volume: 0.4,
    });
  });

  it("keeps a restored rate through loading, which resets the element's", async () => {
    const storage = memory();
    storage.values.set("rv:preferences", JSON.stringify({ rate: 1.5 }));
    const { player, video, media } = await mounted({ plugins: [persistence({ storage })] });
    expect(video.playbackRate).toBe(1.5);
    expect(media().rate).toBe(1.5);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(video.playbackRate).toBe(1.5);
    expect(media().rate).toBe(1.5);
  });

  it("resumes from the saved position", async () => {
    const storage = memory();
    storage.values.set("rv:position:/video.mp4", "33");
    const { video } = await mounted({ plugins: [persistence({ storage })] });
    await settle();
    expect(video.currentTime).toBe(33);
  });

  it("saves on pause, and forgets positions near either end", async () => {
    const storage = memory();
    const { player, video } = await mounted({ plugins: [persistence({ storage })] });
    await player.commands.play();
    await settle();
    advance(video, 20);
    player.commands.pause();
    await settle();
    expect(storage.values.get("rv:position:/video.mp4")).toBe("20");

    await player.commands.play();
    await settle();
    advance(video, 38);
    player.commands.pause();
    await settle();
    // 58 of 60 seconds is past the 95% mark.
    expect(storage.values.has("rv:position:/video.mp4")).toBe(false);
  });

  it("keeps working when storage throws", async () => {
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const { player, media } = await mounted({ plugins: [persistence({ storage })] });
    player.commands.setVolume(0.5);
    await settle();
    expect(media().volume).toBe(0.5);
    expect(media().error).toBeNull();
  });

  it("doesn't save a position for live streams", async () => {
    const storage = memory();
    const { player, video } = await mounted(
      { plugins: [persistence({ storage })] },
      (element) => {
        Object.defineProperty(element, "duration", { configurable: true, value: Infinity });
      }
    );
    await player.commands.play();
    await settle();
    video.dispatchEvent(new Event("durationchange"));
    player.commands.pause();
    await settle();
    expect(storage.values.has("rv:position:/video.mp4")).toBe(false);
  });
});

describe("media-session", () => {
  const stub = () => {
    const handlers = new Map<string, ((details: object) => void) | null>();
    const session = {
      metadata: null as unknown,
      playbackState: "none",
      setActionHandler: vi.fn((action: string, handler: ((details: object) => void) | null) => {
        handlers.set(action, handler);
      }),
      setPositionState: vi.fn(),
    };
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: session });
    vi.stubGlobal(
      "MediaMetadata",
      class {
        constructor(value: object) {
          Object.assign(this, value);
        }
      }
    );
    return { session, handlers };
  };

  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaSession");
  });

  it("claims the session on play, with metadata, and the system's buttons work", async () => {
    const { session, handlers } = stub();
    const { player, video, media } = await mounted({
      plugins: [mediaSession({ metadata: { title: "Clip" } })],
    });
    expect(handlers.size).toBe(0);
    await player.commands.play();
    await settle();
    expect(session.metadata).toMatchObject({ title: "Clip" });
    expect(session.playbackState).toBe("playing");

    handlers.get("seekforward")?.({});
    await settle();
    expect(video.currentTime).toBe(10);
    handlers.get("seekto")?.({ seekTime: 42 });
    await settle();
    expect(video.currentTime).toBe(42);
    handlers.get("pause")?.({});
    await settle();
    expect(media().paused).toBe(true);
    expect(session.playbackState).toBe("paused");
  });

  it("gives the session to whichever player played last", async () => {
    const { session, handlers } = stub();
    const first = await mounted({ plugins: [mediaSession({ metadata: { title: "One" } })] });
    const second = await mounted({ plugins: [mediaSession({ metadata: { title: "Two" } })] });
    await first.player.commands.play();
    await settle();
    expect(session.metadata).toMatchObject({ title: "One" });
    await second.player.commands.play();
    await settle();
    expect(session.metadata).toMatchObject({ title: "Two" });
    handlers.get("seekto")?.({ seekTime: 9 });
    await settle();
    expect(second.video.currentTime).toBe(9);
    expect(first.video.currentTime).toBe(0);
  });

  it("does nothing where the API doesn't exist", async () => {
    const { player, media } = await mounted({ plugins: [mediaSession()] });
    await player.commands.play();
    await settle();
    expect(media().paused).toBe(false);
  });
});

describe("i18n", () => {
  it("writes direction and language to the server's HTML attributes", () => {
    const player = createPlayer({ plugins: [i18n({ locale: "ar" })] });
    expect(player.attributes(player.getInitialState())).toMatchObject({ dir: "rtl", lang: "ar" });
    const regional = createPlayer({ plugins: [i18n({ locale: "pt-BR" })] });
    expect(regional.attributes(regional.getInitialState())).toMatchObject({
      dir: "ltr",
      lang: "pt-BR",
    });
  });

  it("translates parts, falling back to English for missing strings", async () => {
    const player = createPlayer({
      src: "/video.mp4",
      plugins: [i18n({ locale: "fr", strings: { mute: "Couper le son" } })],
    });
    render(
      <Root player={player}>
        <Media />
        <Mute />
      </Root>
    );
    await settle();
    expect(screen.getByRole("button", { name: "Couper le son" })).not.toBeNull();
    act(() => player.commands.setMuted(true));
    await settle();
    // No translation was given for "unmute".
    expect(screen.getByRole("button", { name: "Unmute" })).not.toBeNull();
  });

  it("switches language while playing", async () => {
    const player = createPlayer({
      src: "/video.mp4",
      plugins: [i18n({ locale: "en" })],
    });
    render(
      <Root player={player}>
        <Media />
        <Mute />
      </Root>
    );
    await settle();
    act(() => player.plugin(i18n).commands.setLocale("ar", { mute: "كتم الصوت" }));
    await settle();
    expect(screen.getByRole("button", { name: "كتم الصوت" })).not.toBeNull();
    expect(player.attributes().dir).toBe("rtl");
  });
});

describe("autoplay", () => {
  it("plays with sound when allowed", async () => {
    const { player, media } = await mounted({ plugins: [autoplay()] });
    await settle();
    expect(media().paused).toBe(false);
    expect(media().muted).toBe(false);
    expect(player.plugin(autoplay).state().mutedFallback).toBe(false);
  });

  it("falls back to muted, and offers sound until the viewer unmutes", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const player = createPlayer({ src: "/video.mp4", plugins: [autoplay()] });
    const original = HTMLMediaElement.prototype.play;
    // This browser allows playback only while muted.
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      fakeBehaviour.rejectPlayWith = this.muted ? null : "NotAllowedError";
      return original.call(this);
    };
    cleanups.push(() => {
      HTMLMediaElement.prototype.play = original;
    });
    const { state, commands } = player.plugin(autoplay);
    const unmount = player.mount(document.createElement("div"));
    const detach = player.attach(document.createElement("video"));
    cleanups.push(detach, unmount);
    await settle();
    await settle();
    expect(player.getState().media).toMatchObject({ paused: false, muted: true });
    expect(state().mutedFallback).toBe(true);
    expect(player.attributes()["data-autoplay-muted"]).toBe("");
    commands.unmute();
    await settle();
    expect(player.getState().media.muted).toBe(false);
    expect(state().mutedFallback).toBe(false);
  });

  it("leaves the normal play button if muted playback is refused too", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const { player, media } = await mounted({ plugins: [autoplay()] });
    await settle();
    await settle();
    expect(media().paused).toBe(true);
    expect(media().muted).toBe(false);
    expect(player.plugin(autoplay).state().mutedFallback).toBe(false);
  });

  it("can be told never to mute", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const { media } = await mounted({ plugins: [autoplay({ muted: false })] });
    await settle();
    expect(media().muted).toBe(false);
  });
});

describe("recovery", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  /** Releasing the old source also calls load(), so count sources really loading. */
  const countLoads = (video: HTMLVideoElement) => {
    let count = 0;
    video.addEventListener("loadstart", () => {
      count += 1;
    });
    return () => count;
  };

  const fail = (video: HTMLVideoElement, code = 2) => {
    Object.defineProperty(video, "error", {
      configurable: true,
      value: { code, message: "Dropped" },
    });
    video.dispatchEvent(new Event("error"));
    Reflect.deleteProperty(video, "error");
  };

  it("retries a network failure with growing delays, from the same position", async () => {
    const { player, video } = await mounted({ plugins: [recovery()] });
    await player.commands.play();
    advance(video, 12);
    player.clock.sync();
    const loads = countLoads(video);

    fail(video);
    await settle();
    expect(player.plugin(recovery).state()).toMatchObject({ attempt: 1, retrying: true });
    await vi.advanceTimersByTimeAsync(999);
    await settle();
    expect(loads()).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    await settle();
    expect(loads()).toBe(1);
    expect(video.currentTime).toBe(12);
    expect(player.plugin(recovery).state()).toMatchObject({ attempt: 1, retrying: false });
  });

  it("gives up after its retries, leaving the error showing", async () => {
    const { player, video, media } = await mounted({ plugins: [recovery({ retries: 1 })] });
    const loads = countLoads(video);
    fail(video);
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    await settle();
    expect(loads()).toBe(1);
    fail(video);
    await settle();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(loads()).toBe(1);
    expect(player.plugin(recovery).state().retrying).toBe(false);
    expect(media().error?.fatal).toBe(true);
  });

  it("won't loop forever on a failure that returns right after reloading", async () => {
    const { player, video } = await mounted({ plugins: [recovery({ retries: 2 })] });
    const loads = countLoads(video);
    for (let round = 0; round < 5; round += 1) {
      fail(video);
      await settle();
      await vi.advanceTimersByTimeAsync(10_000);
      await settle();
    }
    // Reloading reaches "ready" each time, but that alone isn't recovering.
    expect(loads()).toBe(2);
    expect(player.plugin(recovery).state().attempt).toBe(2);
  });

  it("earns its retries back after playing well past the failure", async () => {
    const { player, video } = await mounted({ plugins: [recovery({ retries: 1 })] });
    await player.commands.play();
    fail(video);
    await settle();
    await vi.advanceTimersByTimeAsync(1000);
    await settle();
    expect(player.plugin(recovery).state().attempt).toBe(1);
    await player.commands.play();
    advance(video, 6);
    player.clock.sync();
    expect(player.plugin(recovery).state().attempt).toBe(0);
  });

  it("forgets the position and any pending retry when the source changes", async () => {
    const { player, video } = await mounted({ plugins: [recovery()] });
    await player.commands.play();
    advance(video, 12);
    player.clock.sync();
    fail(video);
    await settle();
    player.commands.setSource("/other.mp4");
    await settle();
    expect(player.plugin(recovery).state()).toMatchObject({ attempt: 0, retrying: false });
    const loads = countLoads(video);
    await vi.advanceTimersByTimeAsync(10_000);
    await settle();
    expect(loads()).toBe(0);
    expect(video.currentTime).toBe(0);
  });

  it("doesn't retry errors that can't pass", async () => {
    const { player, video } = await mounted({ plugins: [recovery()] });
    const loads = countLoads(video);
    fail(video, 3);
    await settle();
    await vi.advanceTimersByTimeAsync(10_000);
    await settle();
    expect(loads()).toBe(0);
    expect(player.plugin(recovery).state().retrying).toBe(false);
  });

  it("waits for the connection instead of spending retries while offline", async () => {
    const { video } = await mounted({ plugins: [recovery()] });
    const loads = countLoads(video);
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    cleanups.push(() => online.mockRestore());
    fail(video);
    await settle();
    await vi.advanceTimersByTimeAsync(60_000);
    await settle();
    expect(loads()).toBe(0);
    online.mockReturnValue(true);
    window.dispatchEvent(new Event("online"));
    await settle();
    expect(loads()).toBe(1);
  });
});

describe("analytics", () => {
  const collect = async () => {
    const events: AnalyticsEvent[] = [];
    const mountedPlayer = await mounted({
      plugins: [analytics({ onEvent: (event) => events.push(event), heartbeat: 0 })],
    });
    return { ...mountedPlayer, events, types: () => events.map(({ type }) => type) };
  };

  it("reports the playback lifecycle, with position", async () => {
    const { player, video, types, events } = await collect();
    expect(types()).toContain("ready");
    await player.commands.play();
    await settle();
    advance(video, 7);
    player.commands.pause();
    await settle();
    expect(types()).toContain("play");
    const pause = events.find(({ type }) => type === "pause");
    expect(pause?.position).toBe(7);
    expect(pause?.source).toBe("/video.mp4");
  });

  it("counts a stall as a rebuffer, but not one caused by seeking", async () => {
    const { player, video, types, events } = await collect();
    await player.commands.play();
    await settle();

    video.dispatchEvent(new Event("seeking"));
    video.dispatchEvent(new Event("waiting"));
    await settle();
    expect(types()).not.toContain("rebuffer-start");
    video.dispatchEvent(new Event("seeked"));
    video.dispatchEvent(new Event("playing"));
    await settle();

    video.dispatchEvent(new Event("waiting"));
    await settle();
    expect(types()).toContain("rebuffer-start");
    video.dispatchEvent(new Event("playing"));
    await settle();
    const end = events.find(({ type }) => type === "rebuffer-end");
    expect(end?.stalledMs).toBeGreaterThanOrEqual(0);
  });

  it("reports the end and fatal errors", async () => {
    const { player, video, types, events } = await collect();
    await player.commands.play();
    await settle();
    advance(video, 60);
    await settle();
    expect(types()).toContain("ended");
    expect(types()).not.toContain("pause");
    player.commands.setSource("/broken.mp4");
    await settle();
    expect(events.find(({ type }) => type === "error")?.error?.code).toBe(4);
  });
});
