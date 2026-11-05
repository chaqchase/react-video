import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVideoContext } from "../../src/compat/index";
import { definePlugin } from "../../src/core/plugin";
import type { Scope } from "../../src/core/scope";
import type { Sink } from "../../src/core/types";
import { createPlayer } from "../../src/core/player";
import { ads, AdOverlay, type AdEngine, type AdHost } from "../../src/plugins/ads/index";
import { vast } from "../../src/plugins/ads/vast";
import { ima } from "../../src/plugins/ads/ima";
import { airplay, AirPlayButton } from "../../src/plugins/airplay/index";
import { chromecast, CastButton, CastingOverlay } from "../../src/plugins/chromecast/index";
import { drm } from "../../src/plugins/drm/index";
import { fullscreen } from "../../src/plugins/fullscreen/index";
import { playlist, PlaylistNext, PlaylistPrevious, UpNext } from "../../src/plugins/playlist/index";
import { speed } from "../../src/plugins/speed/index";
import { NativeProvider } from "../../src/providers/native/index";
import { Media } from "../../src/react/media";
import { Root } from "../../src/react/root";
import { advance } from "../helpers/fake-media";

const settle = async () => {
  await act(async () => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mounted(
  options: Parameters<typeof createPlayer>[0],
  prepare?: (video: HTMLVideoElement) => void
) {
  const player = createPlayer(options);
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

describe("playlist", () => {
  const items = [
    { src: "/one.mp4", title: "One", poster: "/one.jpg" },
    { src: "/two.mp4", title: "Two" },
    { src: "/three.mp4", title: "Three" },
  ];

  it("loads the first item, and sets its poster", async () => {
    const { video, media } = await mounted({ plugins: [playlist({ items })] });
    expect(media().source?.src).toBe("/one.mp4");
    expect(video.getAttribute("poster")).toBe("/one.jpg");
  });

  it("respects a given start, and decides what plays over any src", async () => {
    const started = await mounted({ plugins: [playlist({ items, start: 1 })] });
    expect(started.media().source?.src).toBe("/two.mp4");
    const explicit = await mounted({ src: "/own.mp4", plugins: [playlist({ items })] });
    expect(explicit.media().source?.src).toBe("/one.mp4");
  });

  it("moves through the queue on one element, playing straight away", async () => {
    const { player, video, media } = await mounted({ plugins: [playlist({ items })] });
    const { next, previous } = player.plugin(playlist).commands;
    next();
    await settle();
    expect(media().source?.src).toBe("/two.mp4");
    expect(player.video()).toBe(video);
    expect(media().paused).toBe(false);
    expect(video.hasAttribute("poster")).toBe(false);
    previous();
    await settle();
    expect(media().source?.src).toBe("/one.mp4");
    previous();
    await settle();
    expect(media().source?.src).toBe("/one.mp4");
  });

  it("wraps around when looping", async () => {
    const { player, media } = await mounted({ plugins: [playlist({ items, loop: true })] });
    player.plugin(playlist).commands.previous();
    await settle();
    expect(media().source?.src).toBe("/three.mp4");
    player.plugin(playlist).commands.next();
    await settle();
    expect(media().source?.src).toBe("/one.mp4");
  });

  it("counts down at the end of a video, then advances", async () => {
    const { player, video, media } = await mounted({
      plugins: [playlist({ items, countdown: 2 })],
    });
    await player.commands.play();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    advance(video, 60);
    await settle();
    const { state } = player.plugin(playlist);
    expect(state()).toMatchObject({ upNext: true, remaining: 2 });
    expect(player.attributes()["data-up-next"]).toBe("");
    vi.advanceTimersByTime(1000);
    await settle();
    expect(state().remaining).toBe(1);
    vi.advanceTimersByTime(1000);
    await settle();
    expect(state()).toMatchObject({ index: 1, upNext: false, remaining: null });
    expect(media().source?.src).toBe("/two.mp4");
    expect(media().paused).toBe(false);
  });

  it("stays put when cancelled, or at the end of the queue", async () => {
    const { player, video, media } = await mounted({
      plugins: [playlist({ items, countdown: 2 })],
    });
    await player.commands.play();
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    advance(video, 60);
    await settle();
    player.plugin(playlist).commands.cancel();
    vi.advanceTimersByTime(5000);
    await settle();
    expect(media().source?.src).toBe("/one.mp4");
    expect(player.plugin(playlist).state().upNext).toBe(false);

    vi.useRealTimers();
    player.plugin(playlist).commands.select(2);
    await settle();
    advance(video, 60);
    await settle();
    expect(player.plugin(playlist).state().upNext).toBe(false);
  });

  it("moves on at once with no countdown, and waits with a null one", async () => {
    const immediate = await mounted({ plugins: [playlist({ items, countdown: 0 })] });
    await immediate.player.commands.play();
    advance(immediate.video, 60);
    await settle();
    expect(immediate.media().source?.src).toBe("/two.mp4");

    const waiting = await mounted({ plugins: [playlist({ items, countdown: null })] });
    await waiting.player.commands.play();
    advance(waiting.video, 60);
    await settle();
    expect(waiting.media().source?.src).toBe("/one.mp4");
    expect(waiting.player.plugin(playlist).state()).toMatchObject({ upNext: true, remaining: null });
  });

  it("renders buttons, disabled at the ends, and the up-next card", async () => {
    const player = createPlayer({ plugins: [playlist({ items, countdown: null })] });
    render(
      <Root player={player}>
        <Media />
        <PlaylistPrevious />
        <PlaylistNext />
        <UpNext />
      </Root>
    );
    await settle();
    expect(screen.getByRole("button", { name: "Previous" }).getAttribute("aria-disabled")).toBe("true");
    const next = screen.getByRole("button", { name: "Next" });
    expect(next.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.click(next);
    await settle();
    expect(player.plugin(playlist).state().index).toBe(1);
    expect(screen.queryByRole("status")).toBeNull();

    await player.commands.play();
    advance(player.video() as HTMLVideoElement, 60);
    await settle();
    expect(screen.getByRole("status").textContent).toContain("Three");
    fireEvent.click(screen.getByRole("button", { name: "Play now" }));
    await settle();
    expect(player.plugin(playlist).state().index).toBe(2);
  });

  it("hides the buttons for a single item", async () => {
    const player = createPlayer({ plugins: [playlist({ items: [items[0] as (typeof items)[0]] })] });
    render(
      <Root player={player}>
        <Media />
        <PlaylistPrevious />
        <PlaylistNext />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });
});

describe("airplay", () => {
  const appleVideo = (video: HTMLVideoElement) => {
    Object.assign(video, {
      webkitShowPlaybackTargetPicker: vi.fn(),
      webkitCurrentPlaybackTargetIsWireless: false,
    });
  };
  const availability = (value: string) =>
    Object.assign(new Event("webkitplaybacktargetavailabilitychanged"), { availability: value });

  it("does nothing outside Safari", async () => {
    const { player, video } = await mounted({ src: "/a.mp4", plugins: [airplay()] });
    video.dispatchEvent(availability("available"));
    expect(player.plugin(airplay).state().available).toBe(false);
    expect(() => player.plugin(airplay).commands.prompt()).not.toThrow();
  });

  it("tracks devices and connection, and opens the picker", async () => {
    const { player, video } = await mounted({ src: "/a.mp4", plugins: [airplay()] }, appleVideo);
    const { state, commands } = player.plugin(airplay);
    video.dispatchEvent(availability("available"));
    expect(state().available).toBe(true);
    commands.prompt();
    expect((video as unknown as { webkitShowPlaybackTargetPicker: () => void }).webkitShowPlaybackTargetPicker).toHaveBeenCalled();
    Object.assign(video, { webkitCurrentPlaybackTargetIsWireless: true });
    video.dispatchEvent(new Event("webkitcurrentplaybacktargetiswirelesschanged"));
    expect(state().active).toBe(true);
    expect(player.attributes()["data-airplay"]).toBe("");
  });

  it("shows its button only once a device is found", async () => {
    const player = createPlayer({ src: "/a.mp4", plugins: [airplay()] });
    render(
      <Root player={player}>
        <Media ref={(element) => { if (element) appleVideo(element); }} />
        <AirPlayButton />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "AirPlay" })).toBeNull();
    act(() => {
      player.video()?.dispatchEvent(availability("available"));
    });
    await settle();
    expect(screen.getByRole("button", { name: "AirPlay" })).not.toBeNull();
  });
});

describe("chromecast", () => {
  function fakeCast() {
    const contextListeners = new Map<string, (event: object) => void>();
    const remote = {
      currentTime: 0,
      duration: 100,
      isPaused: false,
      isMuted: false,
      volumeLevel: 0.5,
      playerState: "PLAYING" as string | null,
      isMediaLoaded: true,
    };
    const controllerListeners = new Set<() => void>();
    const controller = {
      addEventListener: (_type: string, listener: () => void) => void controllerListeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => void controllerListeners.delete(listener),
      playOrPause: vi.fn(() => {
        remote.isPaused = !remote.isPaused;
      }),
      seek: vi.fn(),
      setVolumeLevel: vi.fn(),
      muteOrUnmute: vi.fn(),
    };
    const session = {
      loadMedia: vi.fn(async () => {}),
      endSession: vi.fn(),
      getCastDevice: () => ({ friendlyName: "Living room" }),
    };
    const castContext = {
      setOptions: vi.fn(),
      addEventListener: (type: string, listener: (event: object) => void) => void contextListeners.set(type, listener),
      removeEventListener: (type: string) => void contextListeners.delete(type),
      requestSession: vi.fn(async () => {}),
      getCurrentSession: vi.fn((): typeof session | null => null),
      getCastState: vi.fn(() => "NO_DEVICES"),
    };
    vi.stubGlobal("cast", {
      framework: {
        CastContext: { getInstance: () => castContext },
        RemotePlayer: function () { return remote; },
        RemotePlayerController: function () { return controller; },
        RemotePlayerEventType: { ANY_CHANGE: "anyChange" },
        CastContextEventType: { CAST_STATE_CHANGED: "castState", SESSION_STATE_CHANGED: "sessionState" },
        CastState: { NO_DEVICES_AVAILABLE: "NO_DEVICES" },
        SessionState: { SESSION_STARTED: "started", SESSION_RESUMED: "resumed", SESSION_ENDED: "ended" },
      },
    });
    vi.stubGlobal("chrome", {
      cast: {
        AutoJoinPolicy: { ORIGIN_SCOPED: "origin" },
        media: {
          DEFAULT_MEDIA_RECEIVER_APP_ID: "default",
          MediaInfo: class { metadata?: unknown; constructor(public src: string, public type: string) {} },
          LoadRequest: class { currentTime?: number; autoplay?: boolean; constructor(public media: { src: string; metadata?: { title?: string } }) {} },
          GenericMediaMetadata: class { title?: string; },
        },
      },
    });
    return {
      remote,
      controller,
      session,
      castContext,
      changed: () => { for (const listener of controllerListeners) listener(); },
      emit: (type: string, event: object) => contextListeners.get(type)?.(event),
      startSession() {
        castContext.getCurrentSession.mockReturnValue(session);
        contextListeners.get("sessionState")?.({ sessionState: "started" });
      },
      endSession() {
        contextListeners.get("sessionState")?.({ sessionState: "ended" });
      },
    };
  }

  it("connects the default receiver, and tracks whether devices exist", async () => {
    const cast = fakeCast();
    const { player } = await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    expect(cast.castContext.setOptions).toHaveBeenCalledWith(
      expect.objectContaining({ receiverApplicationId: "default" })
    );
    expect(player.plugin(chromecast).state().available).toBe(false);
    cast.emit("castState", { castState: "NOT_CONNECTED" });
    expect(player.plugin(chromecast).state().available).toBe(true);
    cast.emit("castState", { castState: "NO_DEVICES" });
    expect(player.plugin(chromecast).state().available).toBe(false);
  });

  it("hands playback over from where it was, and takes it back afterwards", async () => {
    const cast = fakeCast();
    const { player, video, media } = await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    await player.commands.play();
    advance(video, 12);
    cast.startSession();
    await settle();

    expect(video.paused).toBe(true);
    expect(media().provider).toBe("chromecast");
    const [request] = cast.session.loadMedia.mock.calls[0] as unknown as [
      { currentTime: number; media: { src: string } },
    ];
    expect(request.currentTime).toBe(12);
    expect(request.media.src).toContain("/a.mp4");
    expect(player.plugin(chromecast).state()).toMatchObject({ active: true, device: "Living room" });
    expect(player.attributes()["data-casting"]).toBe("");

    cast.remote.currentTime = 40;
    cast.remote.isPaused = true;
    cast.changed();
    await settle();
    expect(player.clock.time()).toBe(40);
    expect(media().paused).toBe(true);

    cast.endSession();
    await settle();
    expect(media().provider).toBe("native");
    expect(video.currentTime).toBe(40);
    expect(player.plugin(chromecast).state().active).toBe(false);
  });

  it("forwards commands to the receiver", async () => {
    const cast = fakeCast();
    const { player } = await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    cast.startSession();
    await settle();
    player.commands.pause();
    expect(cast.controller.playOrPause).toHaveBeenCalledOnce();
    player.commands.seek(33);
    expect(cast.remote.currentTime).toBe(33);
    expect(cast.controller.seek).toHaveBeenCalled();
    player.commands.setMuted(true);
    expect(cast.controller.muteOrUnmute).toHaveBeenCalled();
  });

  it("sends a new source to the receiver and stays connected", async () => {
    const cast = fakeCast();
    const { player, media } = await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    cast.startSession();
    await settle();
    cast.session.loadMedia.mockClear();
    player.commands.setSource("/b.mp4");
    await settle();
    const [request] = cast.session.loadMedia.mock.calls[0] as unknown as [{ media: { src: string } }];
    expect(request.media.src).toContain("/b.mp4");
    expect(media().provider).toBe("chromecast");
    expect(player.plugin(chromecast).state().active).toBe(true);
    cast.remote.currentTime = 7;
    expect(player.clock.time()).toBe(7);
    cast.endSession();
    await settle();
    expect(media().provider).toBe("native");
    expect(media().source?.src).toBe("/b.mp4");
  });

  it("shows the device, and the button once something's available", async () => {
    const cast = fakeCast();
    const player = createPlayer({ src: "/a.mp4", plugins: [chromecast()] });
    render(
      <Root player={player}>
        <Media />
        <CastButton />
        <CastingOverlay />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Cast" })).toBeNull();
    act(() => cast.emit("castState", { castState: "NOT_CONNECTED" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Cast" }));
    expect(cast.castContext.requestSession).toHaveBeenCalled();
    act(() => cast.startSession());
    await settle();
    expect(screen.getByRole("status").textContent).toContain("Living room");
  });

  it("shows the button when devices were found before this player mounted", async () => {
    const cast = fakeCast();
    cast.castContext.getCastState.mockReturnValue("NOT_CONNECTED");
    const { player } = await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    expect(player.plugin(chromecast).state().available).toBe(true);
  });

  it("sends each source's title to the receiver", async () => {
    const cast = fakeCast();
    const { player } = await mounted({
      src: "/a.mp4",
      plugins: [chromecast({ title: ({ src }) => `Title of ${src}` })],
    });
    cast.startSession();
    await settle();
    cast.session.loadMedia.mockClear();
    player.commands.setSource("/b.mp4");
    await settle();
    const [request] = cast.session.loadMedia.mock.calls[0] as unknown as [
      { media: { metadata?: { title?: string } } },
    ];
    expect(request.media.metadata?.title).toBe("Title of /b.mp4");
  });

  it("reports that speed can't change while casting, and restores it after", async () => {
    const cast = fakeCast();
    const { media } = await mounted({ src: "/a.mp4", plugins: [chromecast(), speed()] });
    expect(media().capabilities.rate).toBe(true);
    cast.startSession();
    await settle();
    expect(media().capabilities.rate).toBe(false);
    cast.endSession();
    await settle();
    expect(media().capabilities.rate).toBe(true);
  });

  it("restores speed after casting through a source change too", async () => {
    const cast = fakeCast();
    const { player, media } = await mounted({ src: "/a.mp4", plugins: [chromecast(), speed()] });
    cast.startSession();
    await settle();
    player.commands.setSource("/b.mp4");
    await settle();
    expect(media().capabilities.rate).toBe(false);
    cast.endSession();
    await settle();
    expect(media().capabilities.rate).toBe(true);
  });

  it("requests the SDK only from browsers that can use it", async () => {
    vi.stubGlobal("cast", undefined);
    vi.stubGlobal("chrome", undefined);
    const before = document.querySelectorAll("script").length;
    await mounted({ src: "/a.mp4", plugins: [chromecast()] });
    expect(document.querySelectorAll("script").length).toBe(before);
  });
});

describe("ads", () => {
  function fakeEngine(behaviour: { break?: boolean; fail?: boolean; never?: boolean } = {}) {
    let host: AdHost | null = null;
    const calls: string[] = [];
    const engine: AdEngine & { time: number } = {
      time: 0,
      prepare(next) {
        calls.push("prepare");
        host = next;
      },
      async request() {
        calls.push("request");
        if (behaviour.fail) throw new Error("Blocked");
        if (behaviour.never) await new Promise(() => {});
        if (behaviour.break !== false) {
          host?.breakStart();
          host?.adStart({ duration: 15, skipAfter: 5, position: 1, total: 2, clickThrough: "https://ad.test/" });
        }
      },
      play: vi.fn(),
      pause: vi.fn(),
      skip: vi.fn(),
      setVolume: vi.fn(),
      destroy: vi.fn(),
    };
    return { engine, calls, host: () => host as unknown as AdHost };
  }

  it("prepares inside the gesture, before anything async", async () => {
    const fake = fakeEngine({ break: false });
    const { player } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => fake.engine })],
    });
    expect(fake.calls).toEqual([]);
    void player.commands.play();
    expect(fake.calls).toEqual(["prepare", "request"]);
    await settle();
  });

  it("locks seeking and rate during a break, showing the ad's timeline", async () => {
    const fake = fakeEngine();
    const { player, video, media } = await mounted({
      src: "/a.mp4",
      plugins: [speed(), ads({ engine: () => fake.engine })],
    });
    const started = await player.commands.play();
    await settle();
    expect(started).toBe(false);
    expect(video.paused).toBe(true);
    expect(player.attributes()["data-ad"]).toBe("");
    expect(media().provider).toBe("ad");
    expect(media().timeline).toEqual({ start: 0, end: 15, kind: "ad" });
    expect(media().duration).toBe(15);

    player.commands.seek(3);
    expect(video.currentTime).toBe(0);
    player.commands.setRate(2);
    expect(video.playbackRate).toBe(1);
    fake.engine.time = 4;
    expect(player.clock.time()).toBe(4);
  });

  it("restores the content, its timeline, and playback after the break", async () => {
    const fake = fakeEngine();
    const { player, video, media } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => fake.engine })],
    });
    await player.commands.play();
    await settle();
    act(() => fake.host().breakEnd());
    await settle();
    expect(media().provider).toBe("native");
    expect(media().timeline).toEqual({ start: 0, end: 60, kind: "vod" });
    expect(media().locks).toEqual([]);
    expect(video.paused).toBe(false);
    expect(player.attributes()["data-ad"]).toBeUndefined();
    // Only the first play of a source asks for ads.
    player.commands.pause();
    await settle();
    await player.commands.play();
    await settle();
    expect(fake.calls.filter((call) => call === "request")).toHaveLength(1);
  });

  it("fails open when the engine fails, and reports why", async () => {
    const onError = vi.fn();
    const fake = fakeEngine({ fail: true });
    const { player, video } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => fake.engine, onError })],
    });
    const started = await player.commands.play();
    await settle();
    expect(started).toBe(true);
    expect(video.paused).toBe(false);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Blocked" }));
  });

  it("fails open when an engine can't even start", async () => {
    const engine = fakeEngine().engine;
    engine.prepare = () => {
      throw new Error("No SDK");
    };
    const onError = vi.fn();
    const { player } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => engine, onError })],
    });
    expect(await player.commands.play()).toBe(true);
    expect(onError).toHaveBeenCalled();
  });

  it("gives up waiting for a slow pre-roll, which then can't interrupt", async () => {
    const onError = vi.fn();
    const fake = fakeEngine({ never: true });
    const { player, video } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => fake.engine, timeout: 5, onError })],
    });
    const started = await player.commands.play();
    await settle();
    expect(started).toBe(true);
    expect(video.paused).toBe(false);
    expect(fake.engine.destroy).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("asks again for each source, and allows none for some", async () => {
    const engines = [fakeEngine({ break: false }), fakeEngine({ break: false })];
    const factory = vi.fn((source: { src: string }) =>
      source.src === "/free.mp4" ? null : (engines.shift()?.engine ?? null)
    );
    const { player } = await mounted({ src: "/a.mp4", plugins: [ads({ engine: factory })] });
    expect(factory).toHaveBeenCalledTimes(1);
    player.commands.setSource("/free.mp4");
    await settle();
    expect(factory).toHaveBeenCalledTimes(2);
    expect(await player.commands.play()).toBe(true);
  });

  it("forwards pause and volume to the ad while it plays", async () => {
    const fake = fakeEngine();
    const { player } = await mounted({ src: "/a.mp4", plugins: [ads({ engine: () => fake.engine })] });
    await player.commands.play();
    await settle();
    player.commands.pause();
    expect(fake.engine.pause).toHaveBeenCalled();
    player.commands.setVolume(0.3);
    expect(fake.engine.setVolume).toHaveBeenCalledWith(0.3, false);
  });

  it("shows progress, and only offers skip once allowed", async () => {
    const fake = fakeEngine();
    const player = createPlayer({ src: "/a.mp4", plugins: [ads({ engine: () => fake.engine })] });
    render(
      <Root player={player}>
        <Media />
        <AdOverlay />
      </Root>
    );
    await settle();
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    const skip = screen.getByRole("button", { name: "Skip in 5" }) as HTMLButtonElement;
    expect(skip.disabled).toBe(true);
    expect(document.querySelector('[data-part="ad-label"]')?.textContent).toContain("1 / 2");
    expect(screen.getByRole("link", { name: "Learn more" }).getAttribute("href")).toBe("https://ad.test/");
    await act(async () => {
      fake.engine.time = 6;
      player.clock.sync();
    });
    await settle();
    const ready = screen.getByRole("button", { name: "Skip ad" });
    fireEvent.click(ready);
    expect(fake.engine.skip).toHaveBeenCalled();
  });

  it("leaves the interface to engines that draw their own", async () => {
    const fake = fakeEngine();
    Object.assign(fake.engine, { ownsUi: true });
    const player = createPlayer({ src: "/a.mp4", plugins: [ads({ engine: () => fake.engine })] });
    render(
      <Root player={player}>
        <Media />
        <AdOverlay />
      </Root>
    );
    await settle();
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    expect(document.querySelector('[data-part="ad-overlay"]')).toBeNull();
  });

  it("doesn't show a pre-roll again after reloading the same video", async () => {
    const fake = fakeEngine({ break: false });
    const create = vi.fn(() => fake.engine);
    const { player } = await mounted({ src: "/a.mp4", plugins: [ads({ engine: create })] });
    await act(async () => {
      await player.commands.play();
    });
    expect(fake.calls).toEqual(["prepare", "request"]);
    expect(create).toHaveBeenCalledTimes(1);
    player.commands.reload(10);
    await settle();
    await act(async () => {
      await player.commands.play();
    });
    expect(fake.calls).toEqual(["prepare", "request"]);
    expect(create).toHaveBeenCalledTimes(1);
    player.commands.setSource("/b.mp4");
    await settle();
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("works with a source that only loads on play", async () => {
    const fake = fakeEngine({ break: false });
    const { player, video } = await mounted({
      src: "/a.mp4",
      load: "play",
      plugins: [ads({ engine: () => fake.engine })],
    });
    expect(video.src).toBe("");
    void player.commands.play();
    expect(fake.calls).toEqual(["prepare", "request"]);
    await settle();
    expect(video.src).toContain("/a.mp4");
  });

  it("tells the engine when the viewer follows the link", async () => {
    const fake = fakeEngine();
    const clicked = vi.fn();
    fake.engine.clicked = clicked;
    const plugins = [ads({ engine: () => fake.engine })];
    const player = createPlayer({ src: "/a.mp4", plugins });
    render(
      <Root player={player}>
        <Media />
        <AdOverlay />
      </Root>
    );
    await settle();
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    const link = screen.getByRole("link");
    link.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(link);
    expect(clicked).toHaveBeenCalledOnce();
  });

  it("hears about failures partway through a break", async () => {
    const fake = fakeEngine();
    const onError = vi.fn();
    const { player } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: () => fake.engine, onError })],
    });
    await act(async () => {
      await player.commands.play();
    });
    const failure = new Error("Broken file");
    fake.host().error(failure);
    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe("vast", () => {
  const xml = (inner: string) => `<?xml version="1.0"?><VAST version="3.0">${inner}</VAST>`;
  const inline = `<Ad><InLine>
    <Impression>https://track.test/impression</Impression>
    <Creatives><Creative><Linear skipoffset="00:00:05">
      <Duration>00:00:15</Duration>
      <TrackingEvents>
        <Tracking event="start">https://track.test/start</Tracking>
        <Tracking event="complete">https://track.test/complete</Tracking>
      </TrackingEvents>
      <VideoClicks><ClickThrough>https://advertiser.test/</ClickThrough></VideoClicks>
      <MediaFiles>
        <MediaFile delivery="progressive" type="video/mp4" bitrate="500">https://cdn.test/low.mp4</MediaFile>
        <MediaFile delivery="progressive" type="video/mp4" bitrate="2000">https://cdn.test/high.mp4</MediaFile>
        <MediaFile delivery="streaming" type="video/mp4" bitrate="9000">https://cdn.test/stream.mp4</MediaFile>
      </MediaFiles>
    </Linear></Creative></Creatives>
  </InLine></Ad>`;

  const stubFetch = (responses: Record<string, string | number>) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const response = responses[url];
        if (typeof response === "number" || response === undefined) {
          return { ok: false, status: response ?? 404, text: async () => "" };
        }
        return { ok: true, status: 200, text: async () => response };
      })
    );
  };

  const pings: string[] = [];
  beforeEach(() => {
    pings.length = 0;
    vi.stubGlobal(
      "Image",
      class {
        set src(url: string) {
          pings.push(url);
        }
      }
    );
  });

  const start = async () => {
    const { player, root, media } = await mounted({
      src: "/content.mp4",
      plugins: [ads({ engine: vast({ tag: "/tag.xml" }), timeout: 1000 })],
    });
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    return {
      player,
      root,
      media,
      ad: () => root.querySelector<HTMLVideoElement>('[data-part="ad-media"]'),
    };
  };

  it("plays the largest progressive file, and reports what the tag says", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const { player, ad, media } = await start();
    expect(ad()?.src).toBe("https://cdn.test/high.mp4");
    expect(ad()?.hidden).toBe(false);
    expect(player.plugin(ads).state().ad).toMatchObject({
      duration: 15,
      skipAfter: 5,
      clickThrough: "https://advertiser.test/",
    });
    expect(media().timeline.kind).toBe("ad");
  });

  it("tracks the impression and progress, then returns to the content", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const { player, ad, media } = await start();
    expect(pings).toContain("https://track.test/impression");
    expect(pings).toContain("https://track.test/start");
    advance(ad() as HTMLVideoElement, 60);
    await settle();
    expect(pings).toContain("https://track.test/complete");
    expect(media().provider).toBe("native");
    expect(player.video()?.paused).toBe(false);
    expect(ad()?.hidden).toBe(true);
  });

  it("follows wrappers, adding their tracking", async () => {
    stubFetch({
      "/tag.xml": xml(`<Ad><Wrapper>
        <VASTAdTagURI>/inner.xml</VASTAdTagURI>
        <Impression>https://track.test/wrapper</Impression>
      </Wrapper></Ad>`),
      "/inner.xml": xml(inline),
    });
    const { ad } = await start();
    expect(ad()?.src).toBe("https://cdn.test/high.mp4");
    expect(pings).toContain("https://track.test/wrapper");
    expect(pings).toContain("https://track.test/impression");
  });

  it("plays the content straight away when the tag has no ads", async () => {
    stubFetch({ "/tag.xml": xml("") });
    const { player, media } = await start();
    expect(media().provider).toBe("native");
    expect(player.video()?.paused).toBe(false);
  });

  it("fails open on a dead tag", async () => {
    stubFetch({ "/tag.xml": 500 });
    const { player } = await start();
    expect(player.video()?.paused).toBe(false);
  });

  it("moves past an ad whose file won't play", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const { player, ad, media } = await start();
    (ad() as HTMLVideoElement).dispatchEvent(new Event("error"));
    await settle();
    expect(media().provider).toBe("native");
    expect(player.video()?.paused).toBe(false);
  });

  it("skips on request, tracking that", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const { player, media } = await start();
    player.plugin(ads).commands.skip();
    await settle();
    expect(pings).not.toContain("https://track.test/complete");
    expect(media().provider).toBe("native");
  });

  it("reports a broken ad file, then moves on", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const onError = vi.fn();
    const { player, root, media } = await mounted({
      src: "/content.mp4",
      plugins: [ads({ engine: vast({ tag: "/tag.xml" }), onError })],
    });
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    root.querySelector('[data-part="ad-media"]')?.dispatchEvent(new Event("error"));
    await settle();
    expect(onError).toHaveBeenCalledOnce();
    expect(media().provider).toBe("native");
  });

  it("moves on when the browser refuses to play the ad", async () => {
    stubFetch({ "/tag.xml": xml(inline) });
    const onError = vi.fn();
    const { player, root, media } = await mounted({
      src: "/content.mp4",
      plugins: [ads({ engine: vast({ tag: "/tag.xml" }), onError })],
    });
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (this.getAttribute("data-part") === "ad-media" && this.src) {
        return Promise.reject(Object.assign(new Error("Refused"), { name: "NotAllowedError" }));
      }
      return original.call(this);
    };
    cleanups.push(() => {
      HTMLMediaElement.prototype.play = original;
    });
    await act(async () => {
      await player.commands.play();
    });
    await settle();
    expect(root.querySelector('[data-part="ad-media"]')).toBeTruthy();
    expect(onError).toHaveBeenCalledOnce();
    expect(media().provider).toBe("native");
  });

  it("keeps every wrapper's tracking through nested redirects", async () => {
    const wrapper = (next: string, name: string) => `<Ad><Wrapper>
      <VASTAdTagURI>${next}</VASTAdTagURI>
      <Impression>https://track.test/${name}</Impression>
      <Creatives><Creative><Linear>
        <TrackingEvents><Tracking event="start">https://track.test/${name}-start</Tracking></TrackingEvents>
        <VideoClicks><ClickTracking>https://track.test/${name}-click</ClickTracking></VideoClicks>
      </Linear></Creative></Creatives>
    </Wrapper></Ad>`;
    stubFetch({
      "/tag.xml": xml(wrapper("/middle.xml", "outer")),
      "/middle.xml": xml(wrapper("/inner.xml", "middle")),
      "/inner.xml": xml(inline),
    });
    const { player } = await start();
    for (const url of ["outer", "outer-start", "middle", "middle-start", "impression", "start"]) {
      expect(pings).toContain(`https://track.test/${url}`);
    }
    player.plugin(ads).commands.clicked();
    expect(pings).toContain("https://track.test/outer-click");
    expect(pings).toContain("https://track.test/middle-click");
  });

  it("reads a skip offset given as a percentage", async () => {
    stubFetch({ "/tag.xml": xml(inline.replace('skipoffset="00:00:05"', 'skipoffset="20%"')) });
    const { player } = await start();
    expect(player.plugin(ads).state().ad?.skipAfter).toBe(3);
  });
});

describe("ima", () => {
  function fakeIma() {
    const listeners = new Map<string, (event: unknown) => void>();
    const managerListeners = new Map<string, (event: unknown) => void>();
    const manager = {
      addEventListener: (type: string, listener: (event: unknown) => void) => void managerListeners.set(type, listener),
      init: vi.fn(),
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      skip: vi.fn(),
      setVolume: vi.fn(),
      getRemainingTime: vi.fn(() => 10),
      destroy: vi.fn(),
    };
    const display = { initialize: vi.fn(), destroy: vi.fn() };
    vi.stubGlobal("google", {
      ima: {
        AdDisplayContainer: function () { return display; },
        AdsLoader: function () {
          return {
            addEventListener: (type: string, listener: (event: unknown) => void) => void listeners.set(type, listener),
            requestAds: vi.fn(),
            contentComplete: vi.fn(),
            destroy: vi.fn(),
          };
        },
        AdsRequest: class { adTagUrl = ""; },
        AdsManagerLoadedEvent: { Type: { ADS_MANAGER_LOADED: "loaded" } },
        AdErrorEvent: { Type: { AD_ERROR: "adError" } },
        AdEvent: {
          Type: {
            CONTENT_PAUSE_REQUESTED: "pause",
            CONTENT_RESUME_REQUESTED: "resume",
            STARTED: "started",
            ALL_ADS_COMPLETED: "complete",
          },
        },
        ViewMode: { NORMAL: "normal" },
      },
    });
    return {
      display,
      manager,
      load: () => listeners.get("loaded")?.({ getAdsManager: () => manager }),
      error: () => listeners.get("adError")?.({ getError: () => new Error("No fill") }),
      emit: (type: string, event: unknown = {}) => managerListeners.get(type)?.(event),
    };
  }

  it("initializes in the gesture, and pauses content when told to", async () => {
    const sdk = fakeIma();
    const { player, video, media } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: ima({ tag: "https://ads.test/" }) })],
    });
    const playing = player.commands.play();
    expect(sdk.display.initialize).toHaveBeenCalledOnce();
    await settle();
    sdk.load();
    expect(sdk.manager.start).toHaveBeenCalled();
    sdk.emit("pause");
    await settle();
    expect(await playing).toBe(false);
    expect(media().provider).toBe("ad");

    sdk.emit("started", {
      getAd: () => ({
        getDuration: () => 30,
        getSkipTimeOffset: () => -1,
        getAdPodInfo: () => ({ getAdPosition: () => 1, getTotalAds: () => 1 }),
      }),
    });
    await settle();
    expect(media().timeline.end).toBe(30);
    expect(player.clock.time()).toBe(20);
    expect(player.plugin(ads).state().ownsUi).toBe(true);

    sdk.emit("resume");
    await settle();
    expect(media().provider).toBe("native");
    expect(video.paused).toBe(false);
  });

  it("plays the content when the SDK is blocked", async () => {
    const { player, video } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: ima({ tag: "https://ads.test/", sdkUrl: "data:text/javascript," }) })],
    });
    expect(await player.commands.play()).toBe(true);
    expect(video.paused).toBe(false);
  });

  it("plays the content when there's no ad to show", async () => {
    const sdk = fakeIma();
    const { player, video } = await mounted({
      src: "/a.mp4",
      plugins: [ads({ engine: ima({ tag: "https://ads.test/" }) })],
    });
    const playing = player.commands.play();
    await settle();
    sdk.error();
    expect(await playing).toBe(true);
    expect(video.paused).toBe(false);
  });
});

describe("drm", () => {
  const keys = { "000102030405060708090a0b0c0d0e0f": "101112131415161718191a1b1c1d1e1f" };

  function fakeEme(options: { supported?: string[] } = {}) {
    const sessions: (EventTarget & { generateRequest: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; close: () => Promise<void> })[] = [];
    const mediaKeys = {
      setServerCertificate: vi.fn(async () => true),
      createSession: () => {
        const session = Object.assign(new EventTarget(), {
          generateRequest: vi.fn(async () => {}),
          update: vi.fn(async () => {}),
          close: async () => {},
        });
        sessions.push(session);
        return session;
      },
    };
    const request = vi.fn(async (system: string) => {
      if (options.supported && !options.supported.includes(system)) throw new Error("Unsupported");
      return { createMediaKeys: async () => mediaKeys };
    });
    Object.defineProperty(navigator, "requestMediaKeySystemAccess", { configurable: true, value: request });
    cleanups.push(() => Reflect.deleteProperty(navigator, "requestMediaKeySystemAccess"));
    return { sessions, mediaKeys, request };
  }
  const prepareVideo = (video: HTMLVideoElement) => {
    let current: MediaKeys | null = null;
    Object.defineProperty(video, "mediaKeys", { configurable: true, get: () => current });
    Object.assign(video, {
      setMediaKeys: vi.fn(async (value: MediaKeys) => {
        current = value;
      }),
    });
  };
  const encrypted = (video: HTMLVideoElement, data = "init") =>
    video.dispatchEvent(
      Object.assign(new Event("encrypted"), {
        initDataType: "cenc",
        initData: new TextEncoder().encode(data).buffer,
      })
    );

  it("hands config to engines through the load request", async () => {
    const seen: unknown[] = [];
    const config = { widevine: { licenseUrl: "https://license.test/" } };
    const { media } = await mounted({
      src: "/a.mp4",
      plugins: [
        drm(config),
        // Stands in for an engine provider reading the request.
        {
          name: "spy",
          create: () => ({
            gates: {
              load(request, next) {
                seen.push(request.drm);
                return next(request);
              },
            },
          }),
        },
      ],
    });
    expect(seen).toEqual([config]);
    expect(media().source?.src).toBe("/a.mp4");
  });

  it("answers Clear Key from the page, with no server", async () => {
    const eme = fakeEme();
    const { player, video } = await mounted(
      { src: "/a.mp4", plugins: [drm({ clearkey: { keys } })] },
      prepareVideo
    );
    encrypted(video);
    await settle();
    expect(player.plugin(drm).state().system).toBe("org.w3.clearkey");
    expect(video.setMediaKeys).toHaveBeenCalled();
    const session = eme.sessions[0];
    expect(session?.generateRequest).toHaveBeenCalledWith("cenc", expect.anything());

    session?.dispatchEvent(
      Object.assign(new Event("message"), {
        message: new TextEncoder().encode(JSON.stringify({ kids: ["AAECAwQFBgcICQoLDA0ODw"] })).buffer,
      })
    );
    await settle();
    const [license] = session?.update.mock.calls[0] as [Uint8Array];
    expect(JSON.parse(new TextDecoder().decode(license))).toEqual({
      keys: [{ kty: "oct", kid: "AAECAwQFBgcICQoLDA0ODw", k: "EBESExQVFhcYGRobHB0eHw" }],
      type: "temporary",
    });
  });

  it("uses the first supported system, posting to its licence server", async () => {
    const eme = fakeEme({ supported: ["com.apple.fps"] });
    const fetcher = vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      arrayBuffer: async () => new TextEncoder().encode(url).buffer,
    }));
    vi.stubGlobal("fetch", fetcher);
    const { player, video } = await mounted(
      {
        src: "/a.mp4",
        plugins: [
          drm({
            widevine: { licenseUrl: "https://license.test/wv" },
            fairplay: {
              licenseUrl: "https://license.test/fps",
              certificateUrl: "https://license.test/cert",
              headers: { "x-token": "abc" },
            },
          }),
        ],
      },
      prepareVideo
    );
    encrypted(video);
    await settle();
    expect(player.plugin(drm).state().system).toBe("com.apple.fps");
    expect(eme.mediaKeys.setServerCertificate).toHaveBeenCalled();

    eme.sessions[0]?.dispatchEvent(
      Object.assign(new Event("message"), { message: new ArrayBuffer(4) })
    );
    await settle();
    expect(fetcher).toHaveBeenCalledWith(
      "https://license.test/fps",
      expect.objectContaining({ method: "POST", headers: { "x-token": "abc" } })
    );
    expect(eme.sessions[0]?.update).toHaveBeenCalled();
  });

  it("only starts one session per set of init data", async () => {
    const eme = fakeEme();
    const { video } = await mounted(
      { src: "/a.mp4", plugins: [drm({ clearkey: { keys } })] },
      prepareVideo
    );
    encrypted(video);
    encrypted(video);
    encrypted(video, "other");
    await settle();
    expect(eme.sessions).toHaveLength(2);
  });

  it("reports a clear error when no key system works", async () => {
    fakeEme({ supported: [] });
    const { video, media } = await mounted(
      { src: "/a.mp4", plugins: [drm({ clearkey: { keys } })] },
      prepareVideo
    );
    encrypted(video);
    await settle();
    expect(media().error).toMatchObject({ code: "drm", fatal: true });
    expect(media().status).toBe("error");
  });

  it("reports a refused licence", async () => {
    const eme = fakeEme();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 403 })));
    const { video, media } = await mounted(
      { src: "/a.mp4", plugins: [drm({ widevine: { licenseUrl: "https://license.test/" } })] },
      prepareVideo
    );
    encrypted(video);
    await settle();
    eme.sessions[0]?.dispatchEvent(
      Object.assign(new Event("message"), { message: new ArrayBuffer(4) })
    );
    await settle();
    expect(media().error?.message).toContain("403");
  });

  it("leaves encrypted events to engines when one is playing", async () => {
    const eme = fakeEme();
    class EngineProvider extends NativeProvider {
      override readonly name = "engine";
    }
    const engine = definePlugin("engine", () => ({
      setup(context) {
        context.registerProvider({
          name: "engine",
          canPlay: () => true,
          load: async () => EngineProvider,
        });
      },
    }));
    const { video, media } = await mounted(
      { src: "/a.mp4", plugins: [engine(), drm({ clearkey: { keys } })] },
      prepareVideo
    );
    expect(media().provider).toBe("engine");
    encrypted(video);
    await settle();
    expect(eme.request).not.toHaveBeenCalled();
  });

  it("looks config up per source, skipping sources that have none", async () => {
    const eme = fakeEme();
    const { video } = await mounted(
      {
        src: "/open.mp4",
        plugins: [drm((source) => (source.src === "/open.mp4" ? null : { clearkey: { keys } }))],
      },
      prepareVideo
    );
    encrypted(video);
    await settle();
    expect(eme.request).not.toHaveBeenCalled();
  });
});

describe("a failed source", () => {
  it("stays failed through late media events, until the next load", async () => {
    let report: ((state: { status: "ready" }) => void) | undefined;
    let fail: (() => void) | undefined;
    class Failing extends NativeProvider {
      override readonly name = "failing";
      override attach(element: HTMLVideoElement | null, sink: Sink, scope: Scope) {
        super.attach(element, sink, scope);
        report = (state) => sink.update(state);
        fail = () => sink.error({ code: "drm", message: "No key", fatal: true });
      }
    }
    const failing = definePlugin("failing", () => ({
      setup(context) {
        context.registerProvider({
          name: "failing",
          canPlay: ({ src }) => src === "/bad.mp4",
          load: async () => Failing,
        });
      },
    }));
    const { player, media } = await mounted({ src: "/bad.mp4", plugins: [failing()] });
    fail?.();
    report?.({ status: "ready" });
    expect(media().status).toBe("error");
    expect(media().error?.code).toBe("drm");

    player.commands.setSource("/good.mp4");
    await settle();
    expect(media().status).toBe("ready");
    expect(media().error).toBeNull();
  });
});

describe("compat", () => {
  function Probe({ onValue }: { onValue(value: ReturnType<typeof useVideoContext>): void }) {
    onValue(useVideoContext());
    return null;
  }

  it("offers the v3 shape, backed by v4", async () => {
    const player = createPlayer({ src: "/a.mp4", plugins: [fullscreen()] });
    let value: ReturnType<typeof useVideoContext> | undefined;
    render(
      <Root player={player}>
        <Media />
        <Probe onValue={(next) => { value = next; }} />
      </Root>
    );
    await settle();
    expect(value).toMatchObject({ isPlaying: false, isLoaded: true, duration: 60, isFullscreen: false });
    expect(value?.videoRef.current).toBe(player.video());
    await act(async () => {
      value?.handlePlay();
    });
    await settle();
    expect(value?.isPlaying).toBe(true);
    await act(async () => {
      value?.handleVolumeChange(0.2);
      value?.handleSeek(30);
    });
    await settle();
    expect(player.getState().media.volume).toBe(0.2);
    expect(player.video()?.currentTime).toBe(30);
  });

  it("explains what's missing rather than failing silently", async () => {
    const player = createPlayer({ src: "/a.mp4" });
    let value: ReturnType<typeof useVideoContext> | undefined;
    render(
      <Root player={player}>
        <Media />
        <Probe onValue={(next) => { value = next; }} />
      </Root>
    );
    await settle();
    expect(() => value?.handleFullScreen()).toThrow(/fullscreen plugin/);
  });
});
