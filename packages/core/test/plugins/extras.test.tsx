import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayer } from "../../src/core/player";
import { ambient } from "../../src/plugins/ambient/index";
import { captions } from "../../src/plugins/captions/index";
import { fit, FitButton } from "../../src/plugins/fit/index";
import { fullscreen } from "../../src/plugins/fullscreen/index";
import { hotkeys } from "../../src/plugins/hotkeys/index";
import { loop } from "../../src/plugins/loop/index";
import { miniPlayer, MiniPlayerClose } from "../../src/plugins/mini-player/index";
import { screenshot } from "../../src/plugins/screenshot/index";
import { parseShareTime, share } from "../../src/plugins/share/index";
import { ShortcutsSheet, shortcuts } from "../../src/plugins/shortcuts/index";
import { stats, StatsPanel } from "../../src/plugins/stats/index";
import { transcript, Transcript } from "../../src/plugins/transcript/index";
import { Media } from "../../src/react/media";
import { Root } from "../../src/react/root";
import { advance } from "../helpers/fake-media";

const settle = async () => {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
  window.history.replaceState(null, "", "/");
});

function fakeTextTrack(language: string) {
  const track = new EventTarget() as EventTarget & Record<string, unknown>;
  return Object.assign(track, {
    id: "",
    kind: "subtitles",
    label: language.toUpperCase(),
    language,
    mode: "disabled",
    activeCues: [],
    cues: [],
  });
}

function fakeList(items: object[]) {
  const list = new EventTarget() as EventTarget & Record<number, object> & { length: number };
  items.forEach((item, index) => {
    list[index] = item;
  });
  list.length = items.length;
  return Object.assign(list, {
    [Symbol.iterator]: () => items[Symbol.iterator](),
  });
}

async function mounted(
  options: Parameters<typeof createPlayer>[0],
  prepare?: (video: HTMLVideoElement) => void
) {
  const player = createPlayer({ src: "/video.mp4", ...options });
  const root = document.createElement("div");
  const video = document.createElement("video");
  video.setAttribute("data-part", "media");
  prepare?.(video);
  root.append(video);
  document.body.append(root);
  cleanups.push(() => root.remove());
  cleanups.push(player.mount(root));
  cleanups.push(player.attach(video));
  await settle();
  return { player, root, video, media: () => player.getState().media };
}

const decoded = (video: HTMLVideoElement, width = 1280, height = 720) => {
  Object.defineProperty(video, "readyState", { configurable: true, value: 4 });
  Object.defineProperty(video, "videoWidth", { configurable: true, value: width });
  Object.defineProperty(video, "videoHeight", { configurable: true, value: height });
};

/** A canvas whose pixels are all `color`, or that refuses to be read like a tainted one. */
const fakeCanvas = (color: readonly number[], refuse = false) => {
  const drawImage = vi.fn();
  const getImageData = vi.fn((_x: number, _y: number, width: number, height: number) => {
    if (refuse) throw new DOMException("tainted", "SecurityError");
    const data = new Uint8ClampedArray(width * height * 4);
    for (let index = 0; index < data.length; index += 4) data.set(color, index);
    return { data };
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
    getImageData,
  } as unknown as RenderingContext);
  return { drawImage, getImageData };
};

describe("ambient", () => {
  it("raises a dark picture's colour, and leaves black alone", async () => {
    const canvas = fakeCanvas([10, 40, 20, 255]);
    const { root, video } = await mounted({ plugins: [ambient()] });
    decoded(video);
    video.dispatchEvent(new Event("loadeddata"));
    expect(root.style.getPropertyValue("--rv-ambient-left")).toBe("rgb(28 110 55)");

    canvas.getImageData.mockImplementation((_x, _y, width, height) => {
      return { data: new Uint8ClampedArray(width * height * 4) };
    });
    video.dispatchEvent(new Event("seeked"));
    expect(root.style.getPropertyValue("--rv-ambient-left")).toBe("rgb(0 0 0)");
  });

  it("writes the picture's edge colours to the root, once per change", async () => {
    const canvas = fakeCanvas([20, 120, 60, 255]);
    const { root, video, player } = await mounted({ plugins: [ambient()] });
    decoded(video);
    canvas.drawImage.mockClear();
    video.dispatchEvent(new Event("loadeddata"));

    expect(player.attributes()["data-ambient"]).toBe("");
    expect(root.style.getPropertyValue("--rv-ambient-left")).toBe("rgb(20 120 60)");
    expect(root.style.getPropertyValue("--rv-ambient-right")).toBe("rgb(20 120 60)");
    // Nothing about time or colour goes through the store.
    expect(Object.keys(player.plugin(ambient).state()).sort()).toEqual(["available", "enabled"]);
    expect(canvas.drawImage).toHaveBeenCalledTimes(1);
  });

  it("samples on a timer only while playing, up to 4 times a second", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const canvas = fakeCanvas([0, 0, 0, 255]);
    const { video, player } = await mounted({ plugins: [ambient({ rate: 50 })] });
    decoded(video);
    canvas.drawImage.mockClear();

    vi.advanceTimersByTime(2000);
    expect(canvas.drawImage).not.toHaveBeenCalled();

    await act(async () => {
      await player.commands.play();
    });
    await settle();
    vi.advanceTimersByTime(1000);
    expect(canvas.drawImage).toHaveBeenCalledTimes(4);

    player.commands.pause();
    await settle();
    vi.advanceTimersByTime(2000);
    expect(canvas.drawImage).toHaveBeenCalledTimes(4);
  });

  it("gives up quietly when the browser refuses to read the video, until the next source", async () => {
    fakeCanvas([0, 0, 0, 255], true);
    const { video, player } = await mounted({ plugins: [ambient()] });
    decoded(video);

    expect(() => video.dispatchEvent(new Event("loadeddata"))).not.toThrow();
    expect(player.plugin(ambient).state().available).toBe(false);
    expect(player.attributes()["data-ambient"]).toBeUndefined();

    fakeCanvas([0, 0, 0, 255]);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(player.plugin(ambient).state().available).toBe(true);
  });

  it("stops sampling when turned off", async () => {
    const canvas = fakeCanvas([10, 10, 10, 255]);
    const { video, player } = await mounted({ plugins: [ambient()] });
    decoded(video);

    player.plugin(ambient).commands.toggle();
    canvas.drawImage.mockClear();
    video.dispatchEvent(new Event("seeked"));
    expect(canvas.drawImage).not.toHaveBeenCalled();
    expect(player.attributes()["data-ambient"]).toBeUndefined();
  });
});

describe("mini player", () => {
  let report: (visible: boolean) => void;
  let observed: Element | null;

  beforeEach(() => {
    observed = null;
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          report = (visible) => callback([{ isIntersecting: visible }]);
        }
        observe(target: Element) {
          observed = target;
        }
        disconnect() {
          observed = null;
        }
      }
    );
  });

  const playing = async () => {
    const parts = await mounted({ plugins: [miniPlayer({ corner: "top-start" })] });
    await act(async () => {
      await parts.player.commands.play();
    });
    await settle();
    return parts;
  };
  const slotBefore = (root: Element) => root.previousElementSibling;

  it("floats while playing out of view, and holds its place in the page", async () => {
    const { root, player } = await playing();
    expect(observed).toBe(root);
    act(() => report(false));

    expect(player.attributes()["data-mini"]).toBe("top-start");
    expect(player.plugin(miniPlayer).state().active).toBe(true);
    expect(slotBefore(root)?.getAttribute("data-part")).toBe("mini-slot");
    expect(observed).toBe(slotBefore(root));

    act(() => report(true));
    expect(player.attributes()["data-mini"]).toBeUndefined();
    expect(slotBefore(root)).toBeNull();
    expect(observed).toBe(root);
  });

  it("keeps the same video element while floating", async () => {
    const { root, video } = await playing();
    act(() => report(false));
    expect(root.querySelector("video")).toBe(video);
    expect(video.isConnected).toBe(true);
  });

  it("stays in the page while paused", async () => {
    const { player } = await mounted({ plugins: [miniPlayer()] });
    act(() => report(false));
    expect(player.attributes()["data-mini"]).toBeUndefined();
  });

  it("closing pauses, and it won't float again until scrolled back to", async () => {
    const { player, media } = await playing();
    const floating = () => player.plugin(miniPlayer).state().active;
    act(() => report(false));
    act(() => player.plugin(miniPlayer).commands.close());
    await settle();
    expect(media().paused).toBe(true);
    expect(floating()).toBe(false);

    await act(async () => {
      await player.commands.play();
    });
    await settle();
    act(() => report(false));
    expect(floating()).toBe(false);

    act(() => report(true));
    act(() => report(false));
    expect(floating()).toBe(true);
  });

  it("returns to the page for fullscreen", async () => {
    const { root, player } = await playing();
    act(() => report(false));
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: root });
    act(() => {
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    expect(player.plugin(miniPlayer).state().active).toBe(false);
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  });

  it("takes its slot away when the player unmounts", async () => {
    const { root } = await playing();
    act(() => report(false));
    const parent = root.parentElement;
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    expect(parent?.querySelector('[data-part="mini-slot"]')).toBeNull();
  });

  it("only shows its buttons while floating", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [miniPlayer()] });
    render(
      <Root player={player}>
        <Media />
        <MiniPlayerClose />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    act(() => report(false));
    await settle();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
  });
});

describe("screenshot", () => {
  const blob = new Blob(["png"], { type: "image/png" });

  it("captures the current frame at the video's size", async () => {
    const drawing = fakeCanvas([0, 0, 0, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(blob));
    const { video, player } = await mounted({ plugins: [screenshot()] });
    decoded(video, 640, 360);

    await expect(player.plugin(screenshot).commands.capture()).resolves.toBe(blob);
    expect(drawing.drawImage).toHaveBeenCalledWith(video, 0, 0);
    expect(player.plugin(screenshot).state().error).toBeNull();
  });

  it("reports a tainted canvas instead of throwing", async () => {
    fakeCanvas([0, 0, 0, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(() => {
      throw new DOMException("tainted", "SecurityError");
    });
    const { video, player } = await mounted({ plugins: [screenshot()] });
    decoded(video);

    await expect(player.plugin(screenshot).commands.capture()).resolves.toBeNull();
    expect(player.plugin(screenshot).state().error).toBe("tainted");
  });

  it("reports when there's no frame yet", async () => {
    const { player } = await mounted({ plugins: [screenshot()] });
    await expect(player.plugin(screenshot).commands.capture()).resolves.toBeNull();
    expect(player.plugin(screenshot).state().error).toBe("unavailable");
  });

  it("saves a PNG named for its position and says so", async () => {
    fakeCanvas([0, 0, 0, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => callback(blob));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }));
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(this.download);
    });
    const { video, player } = await mounted({ plugins: [screenshot()] });
    decoded(video);
    player.commands.seek(45);
    await settle();

    await expect(player.plugin(screenshot).commands.download()).resolves.toBe(true);
    expect(saved).toEqual(["frame-00-00-45.png"]);
    expect(player.plugin(screenshot).state().notice).toBe("saved");
  });
});

describe("loop", () => {
  it("loops the whole video through the element", async () => {
    const { video, player } = await mounted({ plugins: [loop()] });
    const { toggle, clear } = player.plugin(loop).commands;
    toggle();
    expect(video.loop).toBe(true);
    expect(player.attributes()["data-loop"]).toBe("video");
    clear();
    expect(video.loop).toBe(false);
    expect(player.attributes()["data-loop"]).toBeUndefined();
  });

  it("refuses a section that's too short or backwards", async () => {
    const { player } = await mounted({ plugins: [loop()] });
    const { setRange } = player.plugin(loop).commands;
    expect(setRange(10, 10.2)).toBe(false);
    expect(setRange(20, 10)).toBe(false);
    expect(player.plugin(loop).state().range).toBeNull();
  });

  it("goes back to the start of a section when playback reaches its end", async () => {
    const { video, player } = await mounted({ plugins: [loop()] });
    expect(player.plugin(loop).commands.setRange(10, 20)).toBe(true);
    expect(player.attributes()["data-loop"]).toBe("section");
    expect(video.loop).toBe(false);

    player.commands.seek(19);
    await settle();
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    advance(video, 1.5);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await settle();
    expect(video.currentTime).toBe(10);
  });

  it("lets a viewer seek past the section", async () => {
    const { video, player } = await mounted({ plugins: [loop()] });
    player.plugin(loop).commands.setRange(10, 20);
    player.commands.seek(40);
    await settle();
    expect(video.currentTime).toBe(40);
  });

  it("a new source starts without a section, but keeps looping", async () => {
    const { video, player } = await mounted({ plugins: [loop({ enabled: true })] });
    expect(video.loop).toBe(true);
    player.plugin(loop).commands.setRange(10, 20);
    expect(video.loop).toBe(false);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(player.plugin(loop).state().range).toBeNull();
    expect(video.loop).toBe(true);
  });

  it("removes the element's loop when it detaches", async () => {
    const { video, player } = await mounted({ plugins: [loop({ enabled: true })] });
    expect(player.plugin(loop).state().enabled).toBe(true);
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    expect(video.loop).toBe(false);
  });
});

describe("shortcuts", () => {
  it("throws without hotkeys", () => {
    expect(() => createPlayer({ plugins: [shortcuts()] })).toThrow(/hotkeys/);
  });

  it("lists what's installed, and only that", async () => {
    const { player } = await mounted({ plugins: [hotkeys({ seekStep: 7 }), shortcuts(), fullscreen()] });
    const list = player.plugin(shortcuts).commands.bindings();
    const ids = list.map(({ id }) => id);
    expect(ids).toContain("fullscreen");
    expect(ids).not.toContain("pip");
    expect(ids).not.toContain("captions");
    expect(ids).toContain("shortcuts");
    expect(list.find(({ id }) => id === "seekBack")?.seconds).toBe(7);
  });

  it("opens with ? and closes with Escape, in a sheet that shows real keys", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [hotkeys(), shortcuts()] });
    const { container } = render(
      <Root player={player} className="rv-root">
        <Media />
        <ShortcutsSheet />
      </Root>
    );
    await settle();
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    act(() => {
      root?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });

    fireEvent.keyDown(document.body, { key: "?" });
    await settle();
    const sheet = container.querySelector('[data-panel="shortcuts"]');
    expect(sheet?.getAttribute("data-state")).toBe("open");
    expect(sheet?.textContent).toContain("Play or pause");
    expect(sheet?.textContent).toContain("Back 5 seconds");
    expect(sheet?.textContent).toContain("Space");

    fireEvent.keyDown(sheet as Element, { key: "Escape" });
    await settle();
    expect(player.plugin(shortcuts).state().open).toBe(false);
  });

  it("stops listening for ? when unmounted", async () => {
    const { player } = await mounted({ plugins: [hotkeys(), shortcuts()] });
    const keys = player.plugin(hotkeys).commands;
    expect(keys.bindings().some(({ id }) => id === "shortcuts")).toBe(true);
    for (const cleanup of cleanups.splice(0).reverse()) cleanup();
    expect(keys.bindings().some(({ id }) => id === "shortcuts")).toBe(false);
  });
});

describe("stats", () => {
  it("reads the player's figures, leaving out what doesn't apply", async () => {
    const { video, player } = await mounted({ plugins: [stats()] });
    decoded(video, 1280, 720);
    const figures = player.plugin(stats).commands.read();
    expect(figures.video).toBe("1280×720");
    expect(figures.rate).toBe("1×");
    expect(figures.engine).toBe("native");
    expect(figures.level).toBeNull();
    expect(figures.latency).toBeNull();
  });

  it("runs a timer only while open, and writes without rendering", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const player = createPlayer({ src: "/video.mp4", plugins: [stats()] });
    const read = vi.spyOn(player.plugin(stats).commands, "read");
    const { container } = render(
      <Root player={player}>
        <Media />
        <StatsPanel />
      </Root>
    );
    await settle();
    expect(container.querySelector('[data-part="stats"]')).toBeNull();
    vi.advanceTimersByTime(3000);
    expect(read).not.toHaveBeenCalled();

    act(() => player.plugin(stats).commands.show());
    await settle();
    const calls = read.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    const value = container.querySelector('[data-stat="rate"] dd');
    expect(value?.textContent).toBe("1×");
    const hidden = container.querySelector<HTMLElement>('[data-stat="latency"]');
    expect(hidden?.hidden).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(read.mock.calls.length).toBe(calls + 2);

    act(() => player.plugin(stats).commands.hide());
    await settle();
    const closed = read.mock.calls.length;
    vi.advanceTimersByTime(3000);
    expect(read.mock.calls.length).toBe(closed);
  });
});

describe("share", () => {
  it("reads times written three ways", () => {
    expect(parseShareTime("90")).toBe(90);
    expect(parseShareTime("1:30")).toBe(90);
    expect(parseShareTime("1:00:05")).toBe(3605);
    expect(parseShareTime("1m30s")).toBe(90);
    expect(parseShareTime("2h")).toBe(7200);
    expect(parseShareTime("soon")).toBeNull();
    expect(parseShareTime("")).toBeNull();
  });

  it("opens a link at its time, once", async () => {
    window.history.replaceState(null, "", "/watch?t=12");
    const { video, player } = await mounted({ plugins: [share()] });
    expect(video.currentTime).toBe(12);
    player.commands.seek(40);
    await settle();
    expect(video.currentTime).toBe(40);
  });

  it("ignores a time past the end of the video", async () => {
    window.history.replaceState(null, "", "/watch?t=9999");
    const { video } = await mounted({ plugins: [share()] });
    expect(video.currentTime).toBe(0);
  });

  it("makes links at the current time, keeping the rest of the address", async () => {
    window.history.replaceState(null, "", "/watch?v=abc&start=9");
    const { player } = await mounted({ plugins: [share({ param: "start" })] });
    const { link } = player.plugin(share).commands;
    expect(new URL(link(61.8)).search).toBe("?v=abc&start=61");
    expect(new URL(link(0)).search).toBe("?v=abc");
  });

  it("links to the page it's told to", async () => {
    const { player } = await mounted({ plugins: [share({ url: "https://example.com/film" })] });
    expect(player.plugin(share).commands.link(5)).toBe("https://example.com/film?t=5");
  });

  it("copies the link and says so, and says when it can't", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { player } = await mounted({ plugins: [share()] });
    const commands = player.plugin(share).commands;
    await act(async () => {
      await expect(commands.share()).resolves.toBe("copied");
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(player.plugin(share).state().notice).toBe("copied");

    writeText.mockRejectedValueOnce(new Error("denied"));
    await act(async () => {
      await expect(commands.share()).resolves.toBe("failed");
    });
    expect(player.plugin(share).state().notice).toBe("failed");
  });

  it("uses the share sheet on touch devices, where dismissing it isn't a failure", async () => {
    const nativeShare = vi.fn(async () => {
      throw new DOMException("dismissed", "AbortError");
    });
    Object.defineProperty(navigator, "share", { configurable: true, value: nativeShare });
    cleanups.push(() => {
      delete (navigator as { share?: unknown }).share;
    });
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const { player } = await mounted({ plugins: [share()] });
    await expect(player.plugin(share).commands.share()).resolves.toBe("shared");
    expect(nativeShare).toHaveBeenCalledTimes(1);
    expect(player.plugin(share).state().notice).toBeNull();
  });
});

describe("fit", () => {
  const frame = (root: HTMLElement, width: number, height: number) => {
    vi.spyOn(root, "getBoundingClientRect").mockReturnValue({ width, height } as DOMRect);
  };

  it("writes the mode to the root and toggles it", async () => {
    const { player } = await mounted({ plugins: [fit()] });
    expect(player.attributes()["data-fit"]).toBe("contain");
    player.plugin(fit).commands.toggle();
    expect(player.attributes()["data-fit"]).toBe("cover");
    player.plugin(fit).commands.set("contain");
    expect(player.attributes()["data-fit"]).toBe("contain");
  });

  it("only offers a change when the picture and frame differ in shape", async () => {
    const { root, video, player } = await mounted({ plugins: [fit()] });
    decoded(video, 1280, 720);
    frame(root, 640, 360);
    video.dispatchEvent(new Event("loadedmetadata"));
    expect(player.plugin(fit).state().available).toBe(false);

    frame(root, 840, 360);
    video.dispatchEvent(new Event("resize"));
    expect(player.plugin(fit).state().available).toBe(true);
  });

  it("hides its button until there's a difference, and names what it will do", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [fit()] });
    const { container } = render(
      <Root player={player}>
        <Media />
        <FitButton />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Fill the frame" })).toBeNull();
    const video = container.querySelector("video") as HTMLVideoElement;
    const root = container.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
    decoded(video, 1280, 720);
    frame(root, 840, 360);
    video.dispatchEvent(new Event("loadedmetadata"));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Fill the frame" }));
    await settle();
    expect(screen.getByRole("button", { name: "Show the whole picture" })).toBeTruthy();
  });
});

describe("transcript", () => {
  const VTT = `WEBVTT

00:00:00.000 --> 00:00:04.000
<v Ana>First &amp; foremost</v>

00:00:04.000 --> 00:00:08.000
Second line
of text

00:00:08.000 --> 00:00:12.000
Third`;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, text: async () => VTT }))
    );
    Element.prototype.scrollTo = vi.fn();
  });

  const setup = async (language?: string) => {
    const tracks = [fakeTextTrack("en"), fakeTextTrack("fr")];
    const { player, video } = await mounted(
      {
        plugins: [
          captions({
            tracks: [
              { src: "/en.vtt", language: "en", label: "English" },
              { src: "/fr.vtt", language: "fr", label: "Français" },
            ],
          }),
          transcript({ language }),
        ],
      },
      (element) => {
        Object.defineProperty(element, "textTracks", { value: fakeList(tracks) });
      }
    );
    const view = render(<Transcript player={player} />);
    await settle();
    const rows = () => [...view.container.querySelectorAll('[data-part="transcript-cue"]')];
    return { player, video, rows, ...view };
  };

  it("needs a player outside the root", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Transcript />)).toThrow(/player/);
  });

  it("names its list", async () => {
    await setup();
    expect(screen.getByRole("list", { name: "Transcript" })).toBeTruthy();
  });

  it("lists the first track's lines as plain text, outside the root", async () => {
    const { rows } = await setup();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/en.vtt"), expect.anything());
    expect(rows().map((row) => row.querySelector('[data-part="transcript-text"]')?.textContent)).toEqual([
      "First & foremost",
      "Second line of text",
      "Third",
    ]);
    expect(rows()[1]?.querySelector("time")?.textContent).toBe("0:04");
  });

  it("uses the language it's given while captions are off", async () => {
    await setup("fr");
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/fr.vtt"), expect.anything());
  });

  it("follows the captions track that's on", async () => {
    const { player } = await setup();
    const { tracks } = player.plugin(captions).state();
    vi.mocked(fetch).mockClear();
    act(() => player.plugin(captions).commands.select(tracks[1]?.id ?? null));
    await settle();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/fr.vtt"), expect.anything());
    expect(player.plugin(transcript).state().language).toBe("fr");
  });

  it("marks the current line as playback moves, without rendering, and seeks on click", async () => {
    const { rows, video, player } = await setup();
    expect(rows()[0]?.getAttribute("aria-current")).toBe("true");

    fireEvent.click(rows()[2] as Element);
    await settle();
    expect(video.currentTime).toBe(8);
    expect(rows()[2]?.getAttribute("aria-current")).toBe("true");
    expect(rows()[0]?.hasAttribute("aria-current")).toBe(false);
    expect(Object.keys(player.plugin(transcript).state()).sort()).toEqual(["cues", "language"]);
  });

  it("stops following when the viewer scrolls away, until asked to return", async () => {
    const { rows, player, container } = await setup();
    const list = container.querySelector('[data-part="transcript-list"]') as HTMLElement;
    vi.mocked(Element.prototype.scrollTo).mockClear();

    fireEvent.wheel(list);
    const resume = screen.getByRole("button", { name: "Back to the current line" });
    act(() => player.commands.seek(9));
    await settle();
    expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    expect(rows()[2]?.getAttribute("aria-current")).toBe("true");

    fireEvent.click(resume);
    expect(Element.prototype.scrollTo).toHaveBeenCalled();
    // The button is about to go, so focus moves to the line it returned to.
    expect(document.activeElement).toBe(rows()[2]);
    expect(screen.queryByRole("button", { name: "Back to the current line" })).toBeNull();
  });
});
