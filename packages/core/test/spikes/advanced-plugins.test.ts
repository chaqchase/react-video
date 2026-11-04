// Throwaway spikes: ads, DRM, and Chromecast sketched against the plugin API, so
// it can change before it freezes. They use fakes for the SDKs and are replaced
// by the real plugins and their tests in later phases.
import { afterEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import type {
  LoadRequest,
  MediaState,
  Player,
  Provider,
  ProviderEntry,
  Sink,
} from "../../src/core/types";

const settle = async () => {
  for (let index = 0; index < 20; index += 1) await Promise.resolve();
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

async function start(player: Player) {
  const video = document.createElement("video");
  cleanups.push(player.mount(document.createElement("div")));
  cleanups.push(player.attach(video));
  await settle();
  return video;
}

describe("spike: ads", () => {
  class FakeAdProvider implements Provider {
    readonly name = "ima";
    time = 0;
    sink: Sink | null = null;
    finish: () => void = () => {};
    finished = new Promise<void>((done) => (this.finish = done));
    attach(_element: HTMLVideoElement | null, sink: Sink) {
      this.sink = sink;
    }
    async load() {}
    async play() {}
    pause() {}
    seek() {}
    setVolume() {}
    setRate() {}
    snapshot(): Partial<MediaState> {
      return { duration: 15, paused: false };
    }
    destroy() {}
  }

  const makeAds = (sdk: {
    initialize: () => void;
    requestAds: () => Promise<FakeAdProvider | null>;
  }) =>
    definePlugin("ads", () => ({
      state: () => ({ phase: "idle" as "idle" | "ad" | "done" }),
      gates: {
        play: async (_request, next, context) => {
          // Must run inside the gesture, before any await.
          sdk.initialize();
          if (context.state().phase === "done") {
            await next(undefined);
            return;
          }
          let ad: FakeAdProvider | null = null;
          try {
            ad = await Promise.race([
              sdk.requestAds(),
              new Promise<null>((done) => setTimeout(() => done(null), 5000)),
            ]);
          } catch {
            ad = null; // Fail open: content plays if ads fail or are blocked.
          }
          if (ad) {
            context.set({ phase: "ad" });
            const release = context.lock("ad", ["seek", "rate"]);
            const pop = context.pushProvider(ad);
            await ad.play();
            await ad.finished;
            pop();
            release();
          }
          context.set({ phase: "done" });
          await next(undefined);
        },
      },
    }));

  it("initializes in the gesture, locks during the break, then plays content", async () => {
    const ad = new FakeAdProvider();
    const order: string[] = [];
    const ads = makeAds({
      initialize: () => order.push("initialize"),
      requestAds: async () => ad,
    });
    const player = createPlayer({ src: "/content.mp4", plugins: [ads()] });
    const video = await start(player);

    const played = player.commands.play();
    order.push("after-play-call");
    expect(order).toEqual(["initialize", "after-play-call"]);

    await settle();
    const media = () => player.getState().media;
    expect(media().provider).toBe("ima");
    expect(media().duration).toBe(15);
    expect(video.paused).toBe(true);

    player.commands.seek(10);
    expect(video.currentTime).toBe(0);
    ad.time = 7;
    expect(player.clock.time()).toBe(7);

    ad.finish();
    await expect(played).resolves.toBe(true);
    expect(media().provider).toBe("native");
    expect(media().locks).toEqual([]);
    expect(media().duration).toBe(60);
    expect(video.paused).toBe(false);
  });

  it("fails open: content plays when ads are blocked", async () => {
    const ads = makeAds({
      initialize: () => {},
      requestAds: () => Promise.reject(new Error("blocked")),
    });
    const player = createPlayer({ src: "/content.mp4", plugins: [ads()] });
    const video = await start(player);
    await expect(player.commands.play()).resolves.toBe(true);
    expect(video.paused).toBe(false);
  });
});

describe("spike: drm", () => {
  it("probes key systems in a load gate and hands config to the engine", async () => {
    const received: LoadRequest[] = [];
    class FakeEngine implements Provider {
      readonly name = "fake-engine";
      time = 0;
      attach() {}
      async load(request: LoadRequest) {
        received.push(request);
      }
      async play() {}
      pause() {}
      seek() {}
      setVolume() {}
      setRate() {}
      destroy() {}
    }
    const engine: ProviderEntry = {
      name: "fake-engine",
      canPlay: (source) => source.src.endsWith(".mpd"),
      load: async () => FakeEngine,
    };
    const requestAccess = vi.fn(async (system: string) => {
      if (system !== "com.widevine.alpha") throw new Error("unsupported");
      return { keySystem: system };
    });
    const drm = definePlugin(
      "drm",
      (config: { systems: Record<string, { license: string }> }) => ({
        state: () => ({ keySystem: null as string | null }),
        setup(context) {
          context.registerProvider(engine);
        },
        gates: {
          load: async (request, next, context) => {
            for (const [system, settings] of Object.entries(config.systems)) {
              try {
                await requestAccess(system);
                context.set({ keySystem: system });
                await next({ ...request, drm: { system, ...settings } });
                return;
              } catch {
                continue;
              }
            }
            throw new Error("No supported key system");
          },
        },
      })
    );
    const player = createPlayer({
      src: "/protected.mpd",
      plugins: [
        drm({
          systems: {
            "com.apple.fps": { license: "/fps" },
            "com.widevine.alpha": { license: "/wv" },
          },
        }),
      ],
    });
    await start(player);
    expect(received[0]?.drm).toEqual({
      system: "com.widevine.alpha",
      license: "/wv",
    });
    expect(player.plugin(drm).state().keySystem).toBe("com.widevine.alpha");
  });

  it("surfaces a useful error when no key system works", async () => {
    const drm = definePlugin("drm", () => ({
      gates: {
        load: async () => {
          throw new Error("No supported key system");
        },
      },
    }));
    const player = createPlayer({ src: "/protected.mp4", plugins: [drm()] });
    await start(player);
    expect(player.getState().media).toMatchObject({
      status: "error",
      error: { message: "No supported key system", fatal: true },
    });
  });
});

describe("spike: chromecast", () => {
  class CastProvider implements Provider {
    readonly name = "cast";
    remoteTime: number;
    sink: Sink | null = null;
    commands: string[] = [];
    element: HTMLVideoElement | null | undefined;
    constructor(start: number) {
      this.remoteTime = start;
    }
    get time() {
      return this.remoteTime;
    }
    attach(_element: HTMLVideoElement | null, sink: Sink) {
      this.sink = sink;
    }
    async load() {}
    async play() {
      this.commands.push("play");
    }
    pause() {
      this.commands.push("pause");
    }
    seek(time: number) {
      this.commands.push(`seek:${time}`);
      this.remoteTime = time;
      this.sink?.sync();
    }
    setVolume(volume: number) {
      this.commands.push(`volume:${volume}`);
    }
    setRate() {}
    snapshot(): Partial<MediaState> {
      return { paused: false, duration: 60 };
    }
    destroy() {}
  }

  const cast = definePlugin("cast", () => {
    let provider: CastProvider | null = null;
    let disconnectStack: (() => void) | null = null;
    return {
      state: () => ({ connected: false }),
      attrs: { "data-casting": (state: { connected: boolean }) => state.connected },
      commands: (context) => ({
        connect() {
          const element = context.video();
          const from = element?.currentTime ?? 0;
          element?.pause();
          provider = new CastProvider(from);
          disconnectStack = context.pushProvider(provider);
          context.set({ connected: true });
          return provider;
        },
        disconnect() {
          const at = provider?.remoteTime ?? 0;
          disconnectStack?.();
          provider = null;
          context.commands.seek(at);
          context.set({ connected: false });
        },
      }),
    };
  });

  it("hands playback to the receiver and back, keeping position", async () => {
    const player = createPlayer({ src: "/content.mp4", plugins: [cast()] });
    const video = await start(player);
    await player.commands.play();
    player.commands.seek(20);
    await settle();

    const handle = player.plugin(cast);
    const remote = handle.commands.connect();
    await settle();
    const media = () => player.getState().media;
    expect(media().provider).toBe("cast");
    expect(video.paused).toBe(true);
    expect(player.attributes()["data-casting"]).toBe("");

    player.commands.seek(30);
    player.commands.setVolume(0.5);
    await player.commands.play();
    expect(remote.commands).toEqual(["seek:30", "volume:0.5", "play"]);
    expect(video.currentTime).toBe(20);
    expect(player.clock.time()).toBe(30);

    remote.remoteTime = 45;
    handle.commands.disconnect();
    await settle();
    expect(media().provider).toBe("native");
    expect(video.currentTime).toBe(45);
    expect(player.attributes()["data-casting"]).toBeUndefined();
  });
});
