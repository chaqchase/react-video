import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPlayer } from "../../src/core/player";
import { dash } from "../../src/plugins/dash/index";
import { clearKeyLicense, toDashDrm, toHlsDrm } from "../../src/plugins/drm/config";
import { hls } from "../../src/plugins/hls/index";
import { live, LiveIndicator } from "../../src/plugins/live/index";
import { recovery } from "../../src/plugins/recovery/index";
import { Media } from "../../src/react/media";
import { Root } from "../../src/react/root";
import { fakeBehaviour } from "../helpers/fake-media";

// The plugins import these lazily. Loading them now keeps that import from taking
// real time during a test.
await Promise.all([
  import("../../src/plugins/hls/provider"),
  import("../../src/plugins/dash/provider"),
]);

const settle = async () => {
  await act(async () => {
    for (let round = 0; round < 3; round += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

const cleanups: (() => void)[] = [];
beforeEach(() => {
  // Engines need Media Source, which the test DOM doesn't have.
  vi.stubGlobal("MediaSource", class {});
});
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function mounted(options: Parameters<typeof createPlayer>[0]) {
  const player = createPlayer(options);
  const video = document.createElement("video");
  cleanups.push(player.mount(document.createElement("div")));
  cleanups.push(player.attach(video));
  await settle();
  return { player, video, media: () => player.getState().media };
}

/** Records what the provider asks of hls.js, and lets a test emit its events. */
function fakeHls() {
  const instances: FakeHls[] = [];
  const Events = {
    MANIFEST_PARSED: "manifestParsed",
    LEVEL_SWITCHED: "levelSwitched",
    AUDIO_TRACKS_UPDATED: "audioTracksUpdated",
    AUDIO_TRACK_SWITCHED: "audioTrackSwitched",
    LEVEL_UPDATED: "levelUpdated",
    ERROR: "error",
  };
  const ErrorTypes = { NETWORK_ERROR: "networkError", MEDIA_ERROR: "mediaError", OTHER_ERROR: "otherError" };

  class FakeHls {
    static Events = Events;
    static ErrorTypes = ErrorTypes;
    listeners = new Map<string, (event: string, data: never) => void>();
    levels = [
      { height: 360, width: 640, bitrate: 800, name: "" },
      { height: 720, width: 1280, bitrate: 2000, name: "" },
    ];
    audioTracks = [
      { id: 0, name: "English", lang: "en" },
      { id: 1, name: "French", lang: "fr" },
    ];
    audioTrack = 0;
    autoLevelEnabled = true;
    currentLevel = 0;
    nextLevel = -1;
    subtitleDisplay = true;
    liveSyncPosition: number | null = null;
    targetLatency: number | null = null;
    loadSource = vi.fn();
    attachMedia = vi.fn();
    destroy = vi.fn();
    recoverMediaError = vi.fn();
    swapAudioCodec = vi.fn();
    constructor(public config: Record<string, unknown>) {
      instances.push(this);
    }
    on(event: string, listener: (event: string, data: never) => void) {
      this.listeners.set(event, listener);
    }
    emit(event: string, data?: unknown) {
      this.listeners.get(event)?.(event, data as never);
    }
  }

  return {
    Events,
    ErrorTypes,
    instances,
    current: () => instances[instances.length - 1] as FakeHls,
    library: async () => ({ default: FakeHls as never }),
  };
}

const hlsSource = "/stream.m3u8";

describe("hls", () => {
  const load = async (engine = fakeHls(), extra: Parameters<typeof createPlayer>[0] = {}) => ({
    engine,
    ...(await mounted({
      src: hlsSource,
      ...extra,
      plugins: [hls({ library: engine.library }), ...(extra.plugins ?? [])],
    })),
  });

  it("claims only HLS sources, leaving the rest to the native provider", async () => {
    const engine = fakeHls();
    const { media } = await mounted({
      src: "/video.mp4",
      plugins: [hls({ library: engine.library })],
    });
    expect(engine.instances).toHaveLength(0);
    expect(media().provider).toBe("native");
    const byType = await load(fakeHls(), { src: { src: "/no-extension", type: "application/x-mpegURL" } });
    expect(byType.media().provider).toBe("hls");
  });

  it("uses native HLS on Apple devices, unless told to prefer the engine", async () => {
    const vendor = vi.spyOn(navigator, "vendor", "get").mockReturnValue("Apple Computer, Inc.");
    const types = fakeBehaviour.unsupportedTypes;
    fakeBehaviour.unsupportedTypes = ["application/dash+xml"];
    cleanups.push(() => {
      vendor.mockRestore();
      fakeBehaviour.unsupportedTypes = types;
    });
    const apple = await load();
    expect(apple.media().provider).toBe("native");
    expect(apple.engine.instances).toHaveLength(0);

    const engine = fakeHls();
    const preferring = await mounted({
      src: hlsSource,
      plugins: [hls({ library: engine.library, preferEngine: true })],
    });
    expect(preferring.media().provider).toBe("hls");
  });

  it("doesn't take Chrome's native HLS over the engine", async () => {
    const types = fakeBehaviour.unsupportedTypes;
    fakeBehaviour.unsupportedTypes = ["application/dash+xml"];
    cleanups.push(() => {
      fakeBehaviour.unsupportedTypes = types;
    });
    const { media } = await load();
    expect(media().provider).toBe("hls");
  });

  it("loads the source, resumes from startTime, and destroys the engine after", async () => {
    const engine = fakeHls();
    const { player, video } = await load(engine);
    const first = engine.current();
    expect(first.loadSource).toHaveBeenCalledWith(hlsSource);
    expect(first.attachMedia).toHaveBeenCalledWith(video);
    expect(first.subtitleDisplay).toBe(false);
    player.commands.reload(42);
    await settle();
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(engine.current().config.startPosition).toBe(42);
  });

  it("reports levels, and passes manual and automatic choices to the engine", async () => {
    const { engine, player, media } = await load();
    engine.current().emit(engine.Events.MANIFEST_PARSED);
    await settle();
    expect(media().qualities.map(({ label }) => label)).toEqual(["360p", "720p"]);
    expect(media().quality).toMatchObject({ mode: "auto", canAuto: true });

    player.commands.setQuality("1");
    await settle();
    expect(engine.current().nextLevel).toBe(1);
    expect(media().quality).toMatchObject({ mode: "manual", active: "1" });

    player.commands.setQuality("auto");
    await settle();
    expect(engine.current().nextLevel).toBe(-1);
    expect(media().quality.mode).toBe("auto");
  });

  it("reports audio tracks and switches them", async () => {
    const { engine, player, media } = await load();
    engine.current().emit(engine.Events.AUDIO_TRACKS_UPDATED);
    await settle();
    expect(media().audioTracks.map(({ language }) => language)).toEqual(["en", "fr"]);
    expect(media().audioTrack).toBe("0");
    player.commands.setAudioTrack("1");
    expect(engine.current().audioTrack).toBe(1);
    engine.current().emit(engine.Events.AUDIO_TRACK_SWITCHED);
    await settle();
    expect(media().audioTrack).toBe("1");
  });

  describe("live", () => {
    const details = (totalduration: number) => ({
      live: true,
      fragmentStart: 100,
      edge: 100 + totalduration,
      totalduration,
    });

    it("gives short windows no scrubber or speed control", async () => {
      const { engine, media } = await load();
      const instance = engine.current();
      instance.liveSyncPosition = 118;
      instance.emit(engine.Events.LEVEL_UPDATED, { details: details(20) });
      await settle();
      expect(media().timeline).toEqual({ start: 100, end: 118, kind: "live" });
      expect(media().capabilities).toMatchObject({ seek: false, rate: false });
    });

    it("gives long windows a DVR timeline that follows the edge", async () => {
      const { engine, media } = await load();
      engine.current().emit(engine.Events.LEVEL_UPDATED, { details: details(120) });
      await settle();
      expect(media().timeline).toEqual({ start: 100, end: 220, kind: "dvr" });
      expect(media().capabilities.seek).toBe(true);
      expect(media().live?.dvr).toBe(true);
    });

    it("leaves on-demand playlists alone", async () => {
      const { engine, media } = await load();
      engine.current().emit(engine.Events.LEVEL_UPDATED, { details: { live: false } });
      await settle();
      expect(media().live).toBeNull();
    });
  });

  describe("errors", () => {
    const failure = (type: string, details = "someError") => ({
      fatal: true,
      type,
      details,
      error: new Error("Boom"),
    });

    it("ignores errors the engine recovers from itself", async () => {
      const { engine, media } = await load();
      engine.current().emit(engine.Events.ERROR, { ...failure("networkError"), fatal: false });
      await settle();
      expect(media().error).toBeNull();
    });

    it("reports fatal network errors in the form the recovery plugin retries", async () => {
      const { engine, player, media } = await load(fakeHls(), { plugins: [recovery()] });
      engine.current().emit(engine.Events.ERROR, failure(engine.ErrorTypes.NETWORK_ERROR));
      await settle();
      expect(media().error).toMatchObject({ code: "network", fatal: true });
      expect(player.plugin(recovery).state().retrying).toBe(true);
    });

    it("tries recovering a media error, then swaps codecs, then gives up", async () => {
      const { engine, media } = await load();
      const instance = engine.current();
      const fail = () => instance.emit(engine.Events.ERROR, failure(engine.ErrorTypes.MEDIA_ERROR));
      fail();
      await settle();
      expect(instance.recoverMediaError).toHaveBeenCalledOnce();
      expect(instance.swapAudioCodec).not.toHaveBeenCalled();
      expect(media().error).toBeNull();
      fail();
      await settle();
      expect(instance.recoverMediaError).toHaveBeenCalledTimes(2);
      expect(instance.swapAudioCodec).toHaveBeenCalledOnce();
      expect(media().error).toBeNull();
      fail();
      await settle();
      expect(instance.recoverMediaError).toHaveBeenCalledTimes(2);
      expect(media().error).toMatchObject({ code: 3, fatal: true });
    });

    it("leaves element errors to the engine, which may recover from them", async () => {
      const { video, media } = await load();
      Object.defineProperty(video, "error", { configurable: true, value: { code: 3, message: "" } });
      video.dispatchEvent(new Event("error"));
      Reflect.deleteProperty(video, "error");
      await settle();
      expect(media().error).toBeNull();
    });

    it("reports a failed engine download rather than hanging", async () => {
      const { media } = await mounted({
        src: hlsSource,
        plugins: [hls({ library: () => Promise.reject(new Error("CDN down")) })],
      });
      expect(media().error).toMatchObject({ code: "load-failed", message: "CDN down", fatal: true });
    });
  });
});

function createFakeDashEngine() {
  const listeners = new Map<string, (event: never) => void>();
  const engine = {
    listeners,
    emit: (type: string, event: unknown = {}) => listeners.get(type)?.(event as never),
    on: (type: string, listener: (event: never) => void) => void listeners.set(type, listener),
    updateSettings: vi.fn(),
    setProtectionData: vi.fn(),
    initialize: vi.fn(),
    destroy: vi.fn(),
    setRepresentationForTypeById: vi.fn(),
    setCurrentTrack: vi.fn(),
    enableText: vi.fn(),
    setTextTrack: vi.fn(),
    isDynamic: vi.fn(() => false),
    getDvrWindow: vi.fn(() => ({ start: 50, end: 170, size: 120 })),
    getTargetLiveDelay: vi.fn(() => 12),
    getRepresentationsByType: () => [
      { id: "low", height: 360, width: 640, bandwidth: 800 },
      { id: "high", height: 720, width: 1280, bandwidth: 2000 },
    ],
    getCurrentRepresentationForType: () => ({ id: "low" }),
    getTracksFor: (type: string) =>
      type === "audio"
        ? [
            { id: "a", lang: "en", index: 0, labels: [{ text: "English" }] },
            { id: "b", lang: "fr", index: 1, labels: [] },
          ]
        : [{ id: "subs", lang: "en", index: 0, labels: [] }],
    getCurrentTrackFor: () => ({ id: "a", lang: "en", index: 0, labels: [] }),
  };
  return engine;
}

function fakeDash() {
  const engines: ReturnType<typeof createFakeDashEngine>[] = [];
  const create = () => {
    const engine = createFakeDashEngine();
    engines.push(engine);
    return engine;
  };
  return {
    engines,
    current: () => engines[engines.length - 1] as ReturnType<typeof createFakeDashEngine>,
    library: async () => ({ MediaPlayer: () => ({ create }) }) as never,
  };
}

describe("dash", () => {
  const load = async (engine = fakeDash(), extra: Parameters<typeof createPlayer>[0] = {}) => ({
    engine,
    ...(await mounted({
      src: "/stream.mpd",
      ...extra,
      plugins: [dash({ library: engine.library }), ...(extra.plugins ?? [])],
    })),
  });

  it("claims only DASH sources", async () => {
    const engine = fakeDash();
    await mounted({ src: "/video.mp4", plugins: [dash({ library: engine.library })] });
    expect(engine.engines).toHaveLength(0);
    const { media } = await load();
    expect(media().provider).toBe("dash");
  });

  it("initializes without autoplay, resuming from startTime when given", async () => {
    const { engine, player, video } = await load();
    expect(engine.current().initialize).toHaveBeenCalledWith(video, "/stream.mpd", false);
    const first = engine.current();
    player.commands.reload(30);
    await settle();
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(engine.current().initialize).toHaveBeenCalledWith(video, "/stream.mpd", false, 30);
  });

  it("reports levels, and a manual choice stops adapting and replaces the buffer", async () => {
    const { engine, player, media } = await load();
    engine.current().emit("streamInitialized");
    await settle();
    expect(media().qualities.map(({ id }) => id)).toEqual(["low", "high"]);
    expect(media().quality).toEqual({ mode: "auto", active: "low", canAuto: true });

    player.commands.setQuality("high");
    await settle();
    expect(engine.current().updateSettings).toHaveBeenLastCalledWith({
      streaming: { abr: { autoSwitchBitrate: { video: false } } },
    });
    expect(engine.current().setRepresentationForTypeById).toHaveBeenCalledWith("video", "high", true);
    expect(media().quality).toMatchObject({ mode: "manual", active: "high" });

    engine.current().emit("qualityChangeRendered", { mediaType: "audio", newRepresentation: { id: "x" } });
    await settle();
    expect(media().quality.active).toBe("high");

    player.commands.setQuality("auto");
    await settle();
    expect(engine.current().updateSettings).toHaveBeenLastCalledWith({
      streaming: { abr: { autoSwitchBitrate: { video: true } } },
    });
    expect(media().quality.mode).toBe("auto");
  });

  it("reports audio tracks and switches them", async () => {
    const { engine, player, media } = await load();
    engine.current().emit("streamInitialized");
    await settle();
    expect(media().audioTracks).toEqual([
      { id: "a", label: "English", language: "en" },
      { id: "b", label: "fr", language: "fr" },
    ]);
    player.commands.setAudioTrack("b");
    expect(engine.current().setCurrentTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b" })
    );
  });

  it("forwards text track choices", async () => {
    const { engine, player } = await load();
    player.commands.setTextTrack("subs");
    expect(engine.current().enableText).toHaveBeenLastCalledWith(true);
    expect(engine.current().setTextTrack).toHaveBeenCalledWith(0);
    player.commands.setTextTrack(null);
    expect(engine.current().enableText).toHaveBeenLastCalledWith(false);
  });

  it("follows live streams until destroyed", async () => {
    const engine = fakeDash();
    const { player, media } = await load(engine);
    const instance = engine.current();
    instance.isDynamic.mockReturnValue(true);
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    instance.emit("streamInitialized");
    await settle();
    expect(media().timeline).toEqual({ start: 50, end: 170, kind: "dvr" });
    instance.getDvrWindow.mockReturnValue({ start: 52, end: 172, size: 120 });
    vi.advanceTimersByTime(2000);
    await settle();
    expect(media().timeline.end).toBe(172);

    player.commands.setSource(null);
    await settle();
    instance.getDvrWindow.mockClear();
    vi.advanceTimersByTime(10_000);
    expect(instance.getDvrWindow).not.toHaveBeenCalled();
  });

  it("marks failed downloads as network errors, and others by their code", async () => {
    const network = await load();
    network.engine.current().emit("error", { error: { code: 27, message: "Download failed" } });
    await settle();
    expect(network.media().error).toMatchObject({ code: "network", fatal: true });
    const decode = await load();
    decode.engine.current().emit("error", { error: { code: 54, message: "Bad" } });
    await settle();
    expect(decode.media().error).toMatchObject({ code: 54, message: "Bad" });
  });
});

describe("DRM config translation", () => {
  const license = { licenseUrl: "https://license.test/", headers: { "x-token": "abc" } };

  it("describes hls.js's key systems, sending headers with licence requests", () => {
    const config = toHlsDrm({
      widevine: license,
      fairplay: { ...license, certificateUrl: "https://license.test/cert" },
    });
    expect(config.emeEnabled).toBe(true);
    expect(config.drmSystems).toEqual({
      "com.widevine.alpha": { licenseUrl: license.licenseUrl },
      "com.apple.fps": {
        licenseUrl: license.licenseUrl,
        serverCertificateUrl: "https://license.test/cert",
      },
    });
    const xhr = { setRequestHeader: vi.fn(), withCredentials: false };
    config.licenseXhrSetup?.call({} as never, xhr as never, "", {} as never, new Uint8Array());
    expect(xhr.setRequestHeader).toHaveBeenCalledWith("x-token", "abc");
  });

  it("describes dash.js's protection data", () => {
    expect(toDashDrm({ widevine: license })).toEqual({
      "com.widevine.alpha": {
        serverURL: license.licenseUrl,
        httpRequestHeaders: license.headers,
      },
    });
  });

  it("encodes Clear Key keys as base64url", () => {
    const keys = { "000102030405060708090a0b0c0d0e0f": "101112131415161718191a1b1c1d1e1f" };
    expect(toDashDrm({ clearkey: { keys } })).toEqual({
      "org.w3.clearkey": {
        clearkeys: { "AAECAwQFBgcICQoLDA0ODw": "EBESExQVFhcYGRobHB0eHw" },
      },
    });
    expect(clearKeyLicense(keys, ["missing"]).keys).toEqual([]);
    expect(clearKeyLicense(keys, ["AAECAwQFBgcICQoLDA0ODw"]).keys).toHaveLength(1);
  });
});

describe("live", () => {
  const nativeLive = (video: HTMLVideoElement, start: number, edge: number) => {
    Object.defineProperty(video, "duration", { configurable: true, value: Infinity });
    Object.defineProperty(video, "seekable", {
      configurable: true,
      value: { length: 1, start: () => start, end: () => edge },
    });
    video.dispatchEvent(new Event("durationchange"));
  };

  it("works out live state from the element for native streams", async () => {
    const { player, video, media } = await mounted({ src: "/video.mp4", plugins: [live()] });
    expect(player.attributes()["data-live"]).toBeUndefined();
    nativeLive(video, 10, 40);
    await settle();
    expect(media().timeline).toEqual({ start: 10, end: 40, kind: "live" });
    expect(media().capabilities.seek).toBe(false);
    expect(player.attributes()["data-live"]).toBe("");
    expect(player.attributes()["data-dvr"]).toBeUndefined();

    nativeLive(video, 10, 130);
    await settle();
    expect(media().timeline.kind).toBe("dvr");
    expect(media().capabilities.seek).toBe(true);
    expect(player.attributes()["data-dvr"]).toBe("");
  });

  it("tracks falling behind the edge, and returns there on request", async () => {
    const { player, video } = await mounted({ src: "/video.mp4", plugins: [live()] });
    nativeLive(video, 0, 60);
    await settle();
    video.currentTime = 58;
    player.clock.sync();
    await settle();
    expect(player.plugin(live).state().atEdge).toBe(true);
    video.currentTime = 30;
    player.clock.sync();
    await settle();
    expect(player.plugin(live).state().atEdge).toBe(false);
    expect(player.attributes()["data-live-edge"]).toBeUndefined();

    player.plugin(live).commands.goLive();
    await settle();
    expect(video.currentTime).toBe(60);
    expect(player.getState().media.paused).toBe(false);
  });

  it("offers the jump only when behind, and nothing for on-demand video", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [live()] });
    render(
      <Root player={player}>
        <Media />
        <LiveIndicator />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button", { name: "Go to live" })).toBeNull();
    const video = player.video() as HTMLVideoElement;
    nativeLive(video, 0, 60);
    await settle();
    await act(async () => {
      video.currentTime = 10;
      player.clock.sync();
    });
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Go to live" }));
    await settle();
    expect(video.currentTime).toBe(60);
  });
});
