import { afterEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import { renditionProviderEntry } from "../../src/providers/native/renditions";
import type { PlayerOptions, Provider, Sink } from "../../src/core/types";
import { advance, fakeBehaviour } from "../helpers/fake-media";

const settle = async () => {
  for (let index = 0; index < 10; index += 1) await Promise.resolve();
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

async function setup(options: PlayerOptions = {}) {
  const player = createPlayer({ src: "/video.mp4", ...options });
  const video = document.createElement("video");
  cleanups.push(player.mount(document.createElement("div")));
  cleanups.push(player.attach(video));
  await settle();
  return { player, video, media: () => player.getState().media };
}

describe("loading", () => {
  it("does not load until mounted and attached, and only in a microtask", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    const video = document.createElement("video");
    const load = vi.spyOn(video, "load");
    const unmount = player.mount(null);
    const detach = player.attach(video);
    expect(load).not.toHaveBeenCalled();
    await settle();
    expect(load).toHaveBeenCalledOnce();
    detach();
    unmount();
  });

  it("survives a StrictMode double mount with a single load", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    const video = document.createElement("video");
    const srcs: string[] = [];
    const load = vi.spyOn(video, "load").mockImplementation(() => {
      srcs.push(video.src);
    });
    player.attach(video)();
    player.mount(null)();
    cleanups.push(player.attach(video));
    cleanups.push(player.mount(null));
    await settle();
    expect(srcs.filter(Boolean)).toEqual(["/video.mp4"]);
    load.mockRestore();
  });

  it("is ready at metadata, since iOS may hold canplay back until playback", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    const video = document.createElement("video");
    cleanups.push(player.mount(null), player.attach(video));
    vi.spyOn(video, "load").mockImplementation(() => {});
    await settle();
    expect(player.getState().media.status).toBe("loading");
    video.dispatchEvent(new Event("loadedmetadata"));
    await settle();
    expect(player.getState().media.status).toBe("ready");
  });

  it("reaches ready and reports duration and a vod timeline", async () => {
    const { media } = await setup();
    expect(media().status).toBe("ready");
    expect(media().duration).toBe(60);
    expect(media().timeline).toEqual({ start: 0, end: 60, kind: "vod" });
    expect(media().provider).toBe("native");
  });

  it("loads a new source when it changes, resetting per-source state", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    await settle();
    expect(media().started).toBe(true);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(video.src).toBe("/other.mp4");
    expect(media().source?.src).toBe("/other.mp4");
    expect(media().started).toBe(false);
    expect(media().paused).toBe(true);
  });

  it("keeps volume, mute, and rate across sources", async () => {
    const { player, video } = await setup();
    player.commands.setVolume(0.25);
    player.commands.setMuted(true);
    player.commands.setRate(1.5);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(video.volume).toBe(0.25);
    expect(video.muted).toBe(true);
    expect(video.playbackRate).toBe(1.5);
  });

  it("goes idle with no source, and stops the previous one", async () => {
    const { player, video, media } = await setup();
    player.commands.setSource(null);
    await settle();
    expect(media().status).toBe("idle");
    expect(video.src).toBe("");
  });
});

describe("errors", () => {
  it("reports a fatal error instead of spinning forever", async () => {
    const { media } = await setup({ src: "/broken.mp4" });
    expect(media().status).toBe("error");
    expect(media().error).toMatchObject({ code: "media-unsupported", nativeCode: 4, fatal: true });
    expect(media().waiting).toBe(false);
  });

  it("tries fallback sources in order", async () => {
    const { media, video } = await setup({
      src: [{ src: "/broken-a.mp4" }, { src: "/broken-b.mp4" }, { src: "/good.mp4" }],
    });
    expect(media().status).toBe("ready");
    expect(video.src).toBe("/good.mp4");
    expect(media().error).toBeNull();
  });

  it("falls back from a loaded source that fails before playback starts", async () => {
    const { video, media } = await setup({
      src: [{ src: "/first.mp4" }, { src: "/second.mp4" }],
    });
    expect(media().status).toBe("ready");
    video.dispatchEvent(new Event("error"));
    await settle();
    expect(video.src).toBe("/second.mp4");
    expect(media().status).toBe("ready");
  });

  it("reports an error instead of falling back once playback has started", async () => {
    const { player, video, media } = await setup({
      src: [{ src: "/first.mp4" }, { src: "/second.mp4" }],
    });
    await player.commands.play();
    await settle();
    video.dispatchEvent(new Event("error"));
    await settle();
    expect(video.src).toBe("/first.mp4");
    expect(media().status).toBe("error");
  });

  it("reports the last fallback's error when all of them fail", async () => {
    const { media } = await setup({
      src: [{ src: "/broken-a.mp4" }, { src: "/broken-b.mp4" }],
    });
    expect(media().status).toBe("error");
    expect(media().error?.source?.src).toBe("/broken-b.mp4");
  });

  it("skips a type the browser can't play", async () => {
    const { media, video } = await setup({
      src: [
        { src: "/a.m3u8" },
        { src: "/b.mp4", type: "video/mp4" },
      ],
    });
    expect(video.src).toBe("/b.mp4");
    expect(media().status).toBe("ready");
  });

  it("says so when nothing can play the source", async () => {
    const { media } = await setup({ src: "/a.m3u8" });
    expect(media().status).toBe("error");
    expect(media().error).toMatchObject({ code: "source-no-provider", fatal: true, retryable: false });
  });
});

describe("playback commands", () => {
  it("play and pause reflect real element state", async () => {
    const { player, media } = await setup();
    await expect(player.commands.play()).resolves.toBe(true);
    await settle();
    expect(media()).toMatchObject({ paused: false, started: true });
    player.commands.pause();
    await settle();
    expect(media().paused).toBe(true);
  });

  it("rolls back when the browser refuses to play, without rejecting", async () => {
    const { player, media } = await setup();
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    await expect(player.commands.play()).resolves.toBe(false);
    expect(media()).toMatchObject({ paused: true, playRejected: "NotAllowedError" });
  });

  it("play resolves false rather than hanging when there's nothing to play", async () => {
    const { player: empty } = await setup({ src: null });
    await expect(empty.commands.play()).resolves.toBe(false);
    const { player: failed } = await setup({ src: "/broken.mp4" });
    await expect(failed.commands.play()).resolves.toBe(false);
    const unmounted = createPlayer({ src: "/video.mp4" });
    await expect(unmounted.commands.play()).resolves.toBe(false);
  });

  it("clamps seeks to the timeline and ignores non-finite values", async () => {
    const { player, video } = await setup();
    player.commands.seek(1000);
    expect(video.currentTime).toBe(60);
    player.commands.seek(-5);
    expect(video.currentTime).toBe(0);
    player.commands.seek(NaN);
    expect(video.currentTime).toBe(0);
  });

  it("clamps volume, and mirrors changes made outside the player", async () => {
    const { player, video, media } = await setup();
    player.commands.setVolume(5);
    expect(video.volume).toBe(1);
    video.volume = 0.3;
    await settle();
    expect(media().volume).toBe(0.3);
  });

  it("scrubbing holds playback without showing as paused, then resumes", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    await settle();
    player.commands.scrub(true);
    await settle();
    expect(video.paused).toBe(true);
    expect(media()).toMatchObject({ paused: false, scrubbing: true });
    player.commands.scrub(false);
    await settle();
    expect(video.paused).toBe(false);
    expect(media()).toMatchObject({ paused: false, scrubbing: false });
  });

  it("scrubbing while paused stays paused", async () => {
    const { player, video, media } = await setup();
    player.commands.scrub(true);
    player.commands.scrub(false);
    await settle();
    expect(video.paused).toBe(true);
    expect(media().paused).toBe(true);
  });

  it("leaves the ended state when seeking back", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    await settle();
    advance(video, 100);
    await settle();
    expect(media().ended).toBe(true);
    player.commands.seek(5);
    await settle();
    expect(media().ended).toBe(false);
  });

  it("reports ended and pauses", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    await settle();
    advance(video, 100);
    await settle();
    expect(media()).toMatchObject({ ended: true, paused: true });
  });

  it("pauses on detach so hidden trees stop playing", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    const video = document.createElement("video");
    const unmount = player.mount(null);
    const detach = player.attach(video);
    await settle();
    await player.commands.play();
    expect(video.paused).toBe(false);
    detach();
    unmount();
    expect(video.paused).toBe(true);
    expect(video.src).toBe("");
  });
});

describe("play while loading", () => {
  it("carries a play over to the fallback that replaces a failed source", async () => {
    const player = createPlayer({
      src: [{ src: "/broken.mp4" }, { src: "/good.mp4" }],
    });
    const video = document.createElement("video");
    cleanups.push(player.attach(video), player.mount(null));
    const played = player.commands.play();
    await settle();
    await expect(played).resolves.toBe(true);
    expect(video.src).toBe("/good.mp4");
    expect(video.paused).toBe(false);
  });

  it("setSource then play starts the new source", async () => {
    const { player, video, media } = await setup();
    player.commands.setSource("/next.mp4");
    await expect(player.commands.play()).resolves.toBe(true);
    await settle();
    expect(video.src).toBe("/next.mp4");
    expect(media()).toMatchObject({ paused: false, started: true });
  });

  it("a play in the same tick as mounting loads once", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    const video = document.createElement("video");
    const load = vi.spyOn(video, "load");
    cleanups.push(player.attach(video), player.mount(null));
    await expect(player.commands.play()).resolves.toBe(true);
    expect(load.mock.calls.length).toBe(1);
    expect(video.paused).toBe(false);
  });

  it("a play in the same tick as mounting also triggers a deferred load", async () => {
    const player = createPlayer({ src: "/video.mp4", load: "play" });
    const video = document.createElement("video");
    cleanups.push(player.attach(video), player.mount(null));
    await expect(player.commands.play()).resolves.toBe(true);
    expect(video.src).toBe("/video.mp4");
  });

  it("doesn't report a user's pause as a refused play", async () => {
    const { player, media } = await setup();
    fakeBehaviour.rejectPlayWith = "AbortError";
    await expect(player.commands.play()).resolves.toBe(false);
    expect(media().playRejected).toBeNull();
  });
});

describe("reload", () => {
  it("loads the source again and resumes from the given time", async () => {
    const { player, video, media } = await setup({ src: "/video.mp4" });
    player.commands.seek(20);
    await settle();
    const load = vi.spyOn(video, "load");
    player.commands.reload(20);
    await settle();
    expect(load).toHaveBeenCalled();
    expect(video.src).toBe("/video.mp4");
    expect(video.currentTime).toBe(20);
    expect(media().status).toBe("ready");
  });

  it("recovers from an error", async () => {
    const { player, media } = await setup({ src: "/flaky.mp4" });
    fakeBehaviour.brokenPattern = "flaky";
    player.commands.reload();
    await settle();
    expect(media().status).toBe("error");
    fakeBehaviour.brokenPattern = "never-matches";
    player.commands.reload();
    await settle();
    expect(media()).toMatchObject({ status: "ready", error: null });
  });

  it("doesn't seek the next source to a position meant for the last one", async () => {
    const { player, video } = await setup();
    const load = video.load.bind(video);
    let stalling = true;
    let stalled = false;
    vi.spyOn(video, "load").mockImplementation(() => {
      // The network hasn't answered by the time the viewer moves on. Clearing the old source still runs.
      if (stalling && video.src) stalled = true;
      else load();
    });
    player.commands.reload(30);
    await vi.waitFor(() => expect(stalled).toBe(true));
    stalling = false;
    player.commands.setSource("/next.mp4");
    await vi.waitFor(() => expect(video.src).toContain("/next.mp4"));
    await vi.waitFor(() => expect(video.duration).toBeGreaterThan(0));
    expect(video.currentTime).toBe(0);
  });

  it("clears the resume position when the source changes", async () => {
    const { player, video } = await setup();
    player.commands.reload(30);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(video.currentTime).toBe(0);
  });

  const fail = (video: HTMLVideoElement) => {
    Object.defineProperty(video, "error", {
      configurable: true,
      value: { code: 2, message: "Dropped" },
    });
    video.dispatchEvent(new Event("error"));
    Reflect.deleteProperty(video, "error");
  };

  it("after a failure, picks up where it was and plays again", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    advance(video, 12);
    fail(video);
    await settle();
    expect(media()).toMatchObject({ status: "error", paused: true });
    player.commands.reload();
    await settle();
    expect(video.currentTime).toBe(12);
    expect(media()).toMatchObject({ status: "ready", paused: false });
  });

  it("after a failure while paused, keeps its place but stays paused", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    advance(video, 12);
    player.commands.pause();
    await settle();
    fail(video);
    await settle();
    player.commands.reload();
    await settle();
    expect(video.currentTime).toBe(12);
    expect(media().paused).toBe(true);
  });

  it("plays after a failure that a viewer's play was waiting on", async () => {
    const { player, media } = await setup({ src: "/flaky.mp4", load: "play" });
    fakeBehaviour.brokenPattern = "flaky";
    await player.commands.play();
    await settle();
    expect(media().status).toBe("error");
    fakeBehaviour.brokenPattern = "never-matches";
    player.commands.reload();
    await settle();
    expect(media()).toMatchObject({ status: "ready", paused: false });
  });

  it("keeps its place through a reload that fails before reaching it", async () => {
    const { player, video, media } = await setup({ src: "/flaky.mp4" });
    await player.commands.play();
    advance(video, 12);
    fail(video);
    await settle();
    fakeBehaviour.brokenPattern = "flaky";
    player.commands.reload();
    await settle();
    expect(media().status).toBe("error");
    fakeBehaviour.brokenPattern = "never-matches";
    player.commands.reload();
    await settle();
    expect(video.currentTime).toBe(12);
    expect(media().paused).toBe(false);
  });

  it("forgets a failure when the source changes", async () => {
    const { player, video, media } = await setup();
    await player.commands.play();
    advance(video, 12);
    fail(video);
    await settle();
    player.commands.setSource("/other.mp4");
    await settle();
    expect(video.currentTime).toBe(0);
    expect(media().paused).toBe(true);
  });
});

describe("load strategy", () => {
  it("play waits for the first play, then starts it", async () => {
    const { player, video, media } = await setup({ load: "play" });
    expect(video.src).toBe("");
    expect(media().status).toBe("idle");
    const started = player.commands.play();
    await settle();
    expect(video.src).toBe("/video.mp4");
    await expect(started).resolves.toBe(true);
    await settle();
    expect(media().paused).toBe(false);
  });

  it("falls back to loading when IntersectionObserver is unavailable", async () => {
    const original = globalThis.IntersectionObserver;
    vi.stubGlobal("IntersectionObserver", undefined);
    const { video } = await setup({ load: "visible" });
    expect(video.src).toBe("/video.mp4");
    vi.stubGlobal("IntersectionObserver", original);
  });

  it("runs source hooks before the play gates, so they can use what those set up", async () => {
    const order: string[] = [];
    const plugin = definePlugin("order", () => ({
      source() {
        order.push("source");
      },
      gates: {
        play(request: void, next: (request: void) => void | Promise<void>) {
          order.push("gate");
          return next(request);
        },
      },
    }));
    const { player } = await setup({ load: "play", plugins: [plugin()] });
    expect(order).toEqual([]);
    void player.commands.play();
    expect(order).toEqual(["source", "gate"]);
    await settle();
  });

  it("doesn't load again on becoming visible, once a play has started it", async () => {
    let notify: (visible: boolean) => void = () => {};
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: (records: { isIntersecting: boolean }[]) => void) {
          notify = (isIntersecting) => callback([{ isIntersecting }]);
        }
        observe() {}
        disconnect() {}
      }
    );
    const { player, video } = await setup({ load: "visible" });
    expect(video.src).toBe("");
    await player.commands.play();
    await settle();
    advance(video, 12);
    notify(true);
    await settle();
    expect(video.currentTime).toBe(12);
    vi.unstubAllGlobals();
  });
});

describe("renditions", () => {
  const renditions = {
    renditions: [
      { src: "/low.mp4", label: "360p", height: 360 },
      { src: "/high.mp4", label: "720p", height: 720 },
    ],
  };

  // What the quality plugin will do: claim only the sources that have renditions.
  const quality = definePlugin("quality", () => {
    let hasRenditions = false;
    return {
      setup(context) {
        context.registerProvider(renditionProviderEntry(() => hasRenditions));
      },
      gates: {
        load: (request, next) => {
          hasRenditions = Boolean(request.renditions?.length);
          return next(request);
        },
      },
    };
  });
  const plugins = [quality()];

  it("plays the initial rendition without the plugin, offering no switching", async () => {
    const { player, video, media } = await setup({ src: renditions });
    expect(video.src).toBe("/low.mp4");
    expect(media().qualities).toEqual([]);
    player.commands.setQuality("720p");
    await settle();
    expect(video.src).toBe("/low.mp4");
  });

  it("leaves sources without renditions to the native provider", async () => {
    const { video, media } = await setup({ src: "/plain.mp4", plugins });
    expect(video.src).toBe("/plain.mp4");
    expect(media().qualities).toEqual([]);
  });

  it("publishes levels and starts on the initial rendition", async () => {
    const { video, media } = await setup({ src: { ...renditions, initial: 1 }, plugins });
    expect(video.src).toBe("/high.mp4");
    expect(media().quality.active).toBe("720p");
    expect(media().qualities.map(({ id }) => id)).toEqual(["360p", "720p"]);
  });

  it("switches while keeping position and playing state", async () => {
    const { player, video, media } = await setup({ src: renditions, plugins });
    await player.commands.play();
    await settle();
    player.commands.seek(20);
    await settle();
    player.commands.setQuality("720p");
    await settle();
    expect(video.src).toBe("/high.mp4");
    expect(video.currentTime).toBe(20);
    expect(video.paused).toBe(false);
    expect(media().quality).toEqual({ mode: "manual", active: "720p" });
  });

  it("does not restart a paused video after switching or a later canplay", async () => {
    const { player, video } = await setup({ src: renditions, plugins });
    player.commands.setQuality("720p");
    await settle();
    expect(video.paused).toBe(true);
    video.dispatchEvent(new Event("canplay"));
    await settle();
    expect(video.paused).toBe(true);
  });

  it("returns to the working rendition when a switch fails", async () => {
    const { player, video, media } = await setup({
      plugins,
      src: {
        renditions: [
          { src: "/low.mp4", label: "360p" },
          { src: "/broken.mp4", label: "720p" },
        ],
      },
    });
    player.commands.seek(15);
    await settle();
    player.commands.setQuality("720p");
    await settle();
    expect(video.src).toBe("/low.mp4");
    expect(video.currentTime).toBe(15);
    expect(media().status).toBe("ready");
    expect(media().quality.active).toBe("360p");
    expect(media().error).toMatchObject({ code: "quality-switch", fatal: false });
  });
});

describe("plugins", () => {
  it("rejects the reserved name", () => {
    const media = definePlugin("media", () => ({}));
    expect(() => createPlayer({ plugins: [media()] })).toThrow(/reserved/);
  });

  it("gives plugins state, commands, and typed access", async () => {
    const counter = definePlugin("counter", (start: number = 0) => ({
      state: () => ({ count: start }),
      commands: (context) => ({
        increment() {
          context.set({ count: context.state().count + 1 });
        },
      }),
    }));
    const player = createPlayer({ plugins: [counter(5)] });
    const handle = player.plugin(counter);
    handle.commands.increment();
    expect(handle.state().count).toBe(6);
  });

  it("throws a helpful error for an uninstalled plugin", () => {
    const missing = definePlugin("missing", () => ({}));
    expect(() => createPlayer().plugin(missing)).toThrow(/Add missing\(\)/);
  });

  it("runs hooks in lifecycle order and cleans up through scopes", async () => {
    const log: string[] = [];
    const tracker = definePlugin("tracker", () => ({
      setup(_context, scope) {
        log.push("setup");
        scope.add(() => log.push("setup:end"));
      },
      attach(_context, _element, scope) {
        log.push("attach");
        scope.add(() => log.push("attach:end"));
      },
      source(_context, source, scope) {
        log.push(`source:${source.src}`);
        scope.add(() => log.push(`source:end:${source.src}`));
      },
    }));
    const player = createPlayer({ src: "/a.mp4", plugins: [tracker()] });
    expect(log).toEqual([]);
    const video = document.createElement("video");
    const detach = player.attach(video);
    const unmount = player.mount(null);
    await settle();
    expect(log).toEqual(["setup", "attach", "source:/a.mp4"]);
    player.commands.setSource("/b.mp4");
    await settle();
    expect(log).toContain("source:end:/a.mp4");
    expect(log).toContain("source:/b.mp4");
    detach();
    unmount();
    expect(log.slice(-3)).toEqual(["attach:end", "source:end:/b.mp4", "setup:end"]);
  });

  it("writes plugin attributes, omitting false values", () => {
    const flag = definePlugin("flag", () => ({
      state: () => ({ on: false, mode: "x" }),
      attrs: {
        "data-flag": (state) => state.on,
        "data-mode": (state) => state.mode,
      },
    }));
    const attributes = createPlayer({ plugins: [flag()] }).attributes();
    expect(attributes["data-flag"]).toBeUndefined();
    expect(attributes["data-mode"]).toBe("x");
    expect(attributes["data-paused"]).toBe("");
    expect(attributes["data-playing"]).toBeUndefined();
  });
});

describe("gates", () => {
  it("runs play gates synchronously, before any await, to keep user activation", async () => {
    const order: string[] = [];
    const gated = definePlugin("gated", () => ({
      gates: {
        play: (_request, next) => {
          order.push("gate");
          return next(undefined);
        },
      },
    }));
    const { player } = await setup({ plugins: [gated()] });
    void player.commands.play();
    order.push("after-call");
    expect(order).toEqual(["gate", "after-call"]);
  });

  it("a gate can decline, and the caller doesn't hang", async () => {
    const blocker = definePlugin("blocker", () => ({
      gates: { play: () => {} },
    }));
    const { player, video } = await setup({ plugins: [blocker()] });
    await expect(player.commands.play()).resolves.toBe(false);
    expect(video.paused).toBe(true);
  });

  it("a rejecting gate resolves false", async () => {
    const failing = definePlugin("failing", () => ({
      gates: { play: () => Promise.reject(new Error("nope")) },
    }));
    const { player } = await setup({ plugins: [failing()] });
    await expect(player.commands.play()).resolves.toBe(false);
  });

  it("load gates can rewrite the request", async () => {
    const rewriter = definePlugin("rewriter", () => ({
      gates: {
        load: (request, next) =>
          next({ ...request, source: { src: "/signed.mp4" } }),
      },
    }));
    const { video } = await setup({ plugins: [rewriter()] });
    expect(video.src).toBe("/signed.mp4");
  });

  it("seek gates can redirect a seek", async () => {
    const snap = definePlugin("snap", () => ({
      gates: { seek: (_time, next) => next(10) },
    }));
    const { player, video } = await setup({ plugins: [snap()] });
    player.commands.seek(40);
    expect(video.currentTime).toBe(10);
  });

  it("a source change during a slow load gate discards the stale load", async () => {
    let release: () => void = () => {};
    const slow = definePlugin("slow", () => ({
      gates: {
        load: async (request, next) => {
          if (request.source.src === "/slow.mp4") {
            await new Promise<void>((done) => (release = done));
          }
          await next(request);
        },
      },
    }));
    const { player, video } = await setup({
      src: "/slow.mp4",
      plugins: [slow()],
    });
    player.commands.setSource("/fast.mp4");
    await settle();
    expect(video.src).toBe("/fast.mp4");
    release();
    await settle();
    expect(video.src).toBe("/fast.mp4");
  });
});

describe("plugins passed from the server", () => {
  it("explains what happened to one that lost its code", () => {
    const serialized = { name: "hls", create: null } as never;
    expect(() => createPlayer({ plugins: [serialized] })).toThrow(/Create plugins on the client/);
  });
});

describe("locks", () => {
  it("blocks every input until released", async () => {
    let release: () => void = () => {};
    const locker = definePlugin("locker", () => ({
      setup(context) {
        release = context.lock("ad", ["seek", "rate", "volume", "play", "pause"]);
      },
    }));
    const { player, video, media } = await setup({ plugins: [locker()] });
    player.commands.seek(30);
    player.commands.setRate(2);
    player.commands.setVolume(0.1);
    await expect(player.commands.play()).resolves.toBe(false);
    expect(video.currentTime).toBe(0);
    expect(video.playbackRate).toBe(1);
    expect(video.volume).toBe(1);
    release();
    expect(media().locks).toEqual([]);
    player.commands.seek(30);
    expect(video.currentTime).toBe(30);
  });
});

describe("provider stack", () => {
  class RemoteProvider implements Provider {
    readonly name = "remote";
    time = 42;
    sink: Sink | null = null;
    destroyed = false;
    seeks: number[] = [];
    attach(_element: HTMLVideoElement | null, sink: Sink) {
      this.sink = sink;
    }
    async load() {}
    play = vi.fn(async () => {});
    pause = vi.fn();
    seek(time: number) {
      this.seeks.push(time);
    }
    setVolume = vi.fn();
    setRate = vi.fn();
    snapshot() {
      return { duration: 500, paused: false };
    }
    destroy() {
      this.destroyed = true;
    }
  }

  const setupStack = async () => {
    let push: (provider: Provider) => () => void = () => () => {};
    const host = definePlugin("host", () => ({
      setup(context) {
        push = (provider) => context.pushProvider(provider);
      },
    }));
    const result = await setup({ plugins: [host()] });
    return { ...result, push: (provider: Provider) => push(provider) };
  };

  it("routes commands and time to the top provider", async () => {
    const { player, video, media, push } = await setupStack();
    const remote = new RemoteProvider();
    push(remote);
    expect(media().provider).toBe("remote");
    expect(media().duration).toBe(500);
    expect(media().timeline.end).toBe(500);
    expect(player.clock.time()).toBe(42);
    await player.commands.play();
    expect(remote.play).toHaveBeenCalled();
    expect(video.paused).toBe(true);
  });

  it("ignores state from a suspended provider", async () => {
    const { video, media, push } = await setupStack();
    push(new RemoteProvider());
    video.dispatchEvent(new Event("pause"));
    video.volume = 0.2;
    await settle();
    expect(media().paused).toBe(false);
    expect(media().volume).toBe(1);
  });

  it("restores the provider below when popped, destroying the top", async () => {
    const { video, media, push, player } = await setupStack();
    const remote = new RemoteProvider();
    const pop = push(remote);
    pop();
    pop();
    expect(remote.destroyed).toBe(true);
    expect(media().provider).toBe("native");
    expect(media().duration).toBe(60);
    expect(media().timeline.end).toBe(60);
    expect(player.clock.time()).toBe(video.currentTime);
  });

  it("destroys pushed providers when the source changes", async () => {
    const { player, push } = await setupStack();
    const remote = new RemoteProvider();
    push(remote);
    player.commands.setSource("/other.mp4");
    await settle();
    expect(remote.destroyed).toBe(true);
    expect(player.getState().media.provider).toBe("native");
  });
});
