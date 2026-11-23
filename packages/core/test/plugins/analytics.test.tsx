import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import type { AnyPlugin } from "../../src/core/types";
import { ads } from "../../src/plugins/ads/index";
import type { AdEngine, AdHost } from "../../src/plugins/ads/engine";
import { analytics, type AnalyticsEvent, type AnalyticsOptions } from "../../src/plugins/analytics/index";
import { googleAnalytics, type GoogleAnalyticsParams } from "../../src/plugins/analytics/google";
import { advance, fakeBehaviour, setFakeDuration } from "../helpers/fake-media";

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

// The clock wakes on real frames and timers, so these drive it with fake timers.
async function watch(
  options: Partial<AnalyticsOptions> = {},
  { duration = 100, plugins = [] as readonly AnyPlugin[] } = {}
) {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  const events: AnalyticsEvent[] = [];
  const player = createPlayer({
    src: "/video.mp4",
    plugins: [analytics({ heartbeat: 0, onEvent: (event) => events.push(event), ...options }), ...plugins],
  });
  const video = document.createElement("video");
  setFakeDuration(video, duration);
  cleanups.push(player.mount(document.createElement("div")));
  cleanups.push(player.attach(video));
  await settle();

  /** Plays forward in steps, letting the clock see each one. */
  const play = async (seconds: number, step = 1) => {
    for (let moved = 0; moved < seconds; moved += step) {
      advance(video, step);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }
    await settle();
  };

  return {
    player,
    video,
    events,
    play,
    types: () => events.map(({ type }) => type),
    marks: () => events.filter(({ type }) => type === "progress").map(({ percent }) => percent),
    ended: () => events.find(({ type }) => type === "ended"),
  };
}

const seek = async (player: ReturnType<typeof createPlayer>, time: number) => {
  player.commands.seek(time);
  await settle();
};

describe("analytics progress", () => {
  it("gives each event the duration and percent", async () => {
    const { player, play, events } = await watch();
    await player.commands.play();
    await settle();
    await play(30);
    player.commands.pause();
    await settle();
    const pause = events.find(({ type }) => type === "pause");
    expect(pause).toMatchObject({ position: 30, duration: 100, percent: 30 });
  });

  it("sends start once, when playback really begins", async () => {
    const { player, play, types } = await watch();
    expect(types()).not.toContain("start");
    await player.commands.play();
    await settle();
    expect(types().filter((type) => type === "start")).toHaveLength(1);
    await play(5);
    player.commands.pause();
    await settle();
    await player.commands.play();
    await settle();
    expect(types().filter((type) => type === "start")).toHaveLength(1);
    expect(types().filter((type) => type === "play")).toHaveLength(2);
  });

  it("passes each mark once, in order, as playback reaches it", async () => {
    const { player, play, marks, events } = await watch();
    await player.commands.play();
    await settle();
    await play(9);
    expect(marks()).toEqual([]);
    await play(2);
    expect(marks()).toEqual([10]);
    await play(70);
    expect(marks()).toEqual([10, 25, 50, 75]);
    const mark = events.find(({ percent, type }) => type === "progress" && percent === 25);
    expect(mark?.position).toBeGreaterThanOrEqual(25);
    expect(mark?.duration).toBe(100);
  });

  it("doesn't count seeking past a mark, but counts playing through it later", async () => {
    const { player, play, marks } = await watch();
    await player.commands.play();
    await settle();
    await seek(player, 60);
    await play(2);
    expect(marks()).toEqual([]);
    await seek(player, 20);
    await play(10);
    expect(marks()).toEqual([25]);
    await seek(player, 20);
    await play(10);
    expect(marks()).toEqual([25]);
  });

  it("reports the mark it passed, however far a coarse update overshot it", async () => {
    const { player, play, events } = await watch();
    await player.commands.play();
    await settle();
    await play(12, 12);
    const mark = events.find(({ type }) => type === "progress");
    expect(mark).toMatchObject({ position: 12, percent: 10 });
  });

  it("counts the last stretch when only the end's own update covers it", async () => {
    const { player, play, marks, ended } = await watch({ progress: [99] });
    await player.commands.play();
    await settle();
    await play(98);
    expect(marks()).toEqual([]);
    await play(2, 2);
    expect(marks()).toEqual([99]);
    expect(ended()?.complete).toBe(true);
  });

  it("calls an end reached by playing complete, and one reached by seeking not", async () => {
    const watched = await watch({}, { duration: 20 });
    await watched.player.commands.play();
    await settle();
    await watched.play(20);
    expect(watched.ended()?.complete).toBe(true);

    const skipped = await watch({}, { duration: 20 });
    await skipped.player.commands.play();
    await settle();
    await skipped.play(2);
    await seek(skipped.player, 19.5);
    await skipped.play(1);
    expect(skipped.types()).toContain("ended");
    expect(skipped.ended()?.complete).toBe(false);
  });

  it("has to earn complete again on a second viewing", async () => {
    const { player, play, events } = await watch({}, { duration: 20 });
    await player.commands.play();
    await settle();
    await play(20);
    await seek(player, 0);
    await player.commands.play();
    await settle();
    await seek(player, 19.5);
    await play(1);
    const endings = events.filter(({ type }) => type === "ended");
    expect(endings.map(({ complete }) => complete)).toEqual([true, false]);
  });

  it("starts over for a new source, but not for a retry of the same one", async () => {
    const { player, play, marks, types, video } = await watch();
    await player.commands.play();
    await settle();
    await play(11);
    expect(marks()).toEqual([10]);

    player.commands.reload(0);
    await settle();
    await player.commands.play();
    await settle();
    await play(11);
    expect(marks()).toEqual([10]);
    expect(types().filter((type) => type === "start")).toHaveLength(1);

    player.commands.setSource("/other.mp4");
    await settle();
    setFakeDuration(video, 100);
    await player.commands.play();
    await settle();
    await play(11);
    expect(marks()).toEqual([10, 10]);
    expect(types().filter((type) => type === "start")).toHaveLength(2);
  });

  it("takes its own marks", async () => {
    const { player, play, marks } = await watch({ progress: [50, 90] });
    await player.commands.play();
    await settle();
    await play(95);
    expect(marks()).toEqual([50, 90]);
  });

  it("can go without marks, and still knows an end reached by playing", async () => {
    const { player, play, marks, ended } = await watch({ progress: [] }, { duration: 10 });
    await player.commands.play();
    await settle();
    await play(10);
    expect(marks()).toEqual([]);
    expect(ended()?.complete).toBe(true);
  });

  it("doesn't count an ad's time as the video's", async () => {
    let host: AdHost | null = null;
    let adTime = 0;
    const engine: AdEngine = {
      get time() {
        return adTime;
      },
      prepare(next) {
        host = next;
      },
      async request() {
        host?.breakStart();
        host?.adStart({ duration: 80, skipAfter: null });
      },
      play() {},
      pause() {},
      skip() {},
      setVolume() {},
      destroy() {},
    };
    const { player, marks, types } = await watch({}, { plugins: [ads({ engine: () => engine })] });
    void player.commands.play();
    await settle();
    adTime = 70;
    player.clock.sync();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(marks()).toEqual([]);
    expect(types()).not.toContain("start");
  });

  it("reports nothing as progress on a stream with no end", async () => {
    const { player, play, marks, video } = await watch();
    Object.defineProperty(video, "duration", { configurable: true, value: Infinity });
    video.dispatchEvent(new Event("durationchange"));
    await settle();
    await player.commands.play();
    await settle();
    await play(5);
    expect(player.getState().media.duration).toBe(Infinity);
    expect(marks()).toEqual([]);
  });

  it("reports nothing as progress on a live stream that gives a finite duration", async () => {
    const goesLive = definePlugin("goes-live", () => ({
      commands: (context) => ({
        goLive() {
          context.report({ timeline: { start: 0, end: 100, kind: "live" } });
        },
      }),
    }));
    const { player, play, marks } = await watch({}, { plugins: [goesLive()] });
    player.plugin(goesLive).commands.goLive();
    await player.commands.play();
    await settle();
    await play(30);
    expect(player.getState().media.duration).toBe(100);
    expect(marks()).toEqual([]);
  });

  it("doesn't let an ad's own clock carry the video past a mark when the ad ends", async () => {
    let host: AdHost | null = null;
    let adTime = 0;
    const engine: AdEngine = {
      get time() {
        return adTime;
      },
      prepare(next) {
        host = next;
      },
      async request() {
        host?.breakStart();
        host?.adStart({ duration: 80, skipAfter: null });
      },
      play() {},
      pause() {},
      skip() {},
      setVolume() {},
      destroy() {},
    };
    const { player, play, marks } = await watch({}, { plugins: [ads({ engine: () => engine })] });
    await seek(player, 30);
    void player.commands.play();
    await settle();
    adTime = 2;
    player.clock.sync();
    expect(player.getState().media.timeline.kind).toBe("ad");
    await act(async () => {
      host?.breakEnd();
      await vi.advanceTimersByTimeAsync(0);
    });
    await settle();
    await play(5);
    expect(player.getState().media.timeline.kind).toBe("vod");
    expect(player.clock.time()).toBeGreaterThanOrEqual(35);
    expect(marks()).toEqual([]);
  });

  it("sends errors, including ones media.error doesn't keep", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const { player, events } = await watch();
    await player.commands.play();
    await settle();
    expect(events.find(({ type }) => type === "error")?.error).toMatchObject({ code: "play-blocked", fatal: false });
  });

  it("never writes time to the store", async () => {
    const { player, play } = await watch();
    await player.commands.play();
    await settle();
    const before = player.getState();
    const updates = vi.fn();
    cleanups.push(player.subscribe(updates));
    await play(30);
    expect(updates).not.toHaveBeenCalled();
    expect(player.getState().analytics).toBe(before.analytics);
    expect(player.getState().media).toBe(before.media);
  });
});

describe("googleAnalytics", () => {
  const event = (overrides: Partial<AnalyticsEvent>): AnalyticsEvent => ({
    type: "start",
    position: 12.4,
    duration: 120.2,
    percent: 10,
    source: "https://cdn.test/video.mp4?token=secret#t=1",
    ...overrides,
  });

  const collect = (options: Parameters<typeof googleAnalytics>[0] = {}) => {
    const sent: [string, GoogleAnalyticsParams][] = [];
    const sink = googleAnalytics({ ...options, send: (name, params) => sent.push([name, params]) });
    return { sent, sink, names: () => sent.map(([name]) => name) };
  };

  it("sends Google's names and parameters", () => {
    const { sink, sent } = collect({ title: "A title" });
    sink(event({}));
    expect(sent).toEqual([
      [
        "video_start",
        {
          video_current_time: 12,
          video_duration: 120,
          video_percent: 10,
          video_provider: "react-video-kit",
          video_title: "A title",
          video_url: "https://cdn.test/video.mp4",
          visible: true,
        },
      ],
    ]);
  });

  it("maps progress and a complete ending", () => {
    const { sink, sent } = collect();
    sink(event({ type: "progress", percent: 25 }));
    sink(event({ type: "ended", complete: true, percent: 99, position: 120 }));
    expect(sent.map(([name, { video_percent }]) => [name, video_percent])).toEqual([
      ["video_progress", 25],
      ["video_complete", 100],
    ]);
  });

  it("says nothing about an ending reached by seeking", () => {
    const { sink, sent } = collect();
    sink(event({ type: "ended", complete: false }));
    expect(sent).toEqual([]);
  });

  it("leaves out everything else unless asked", () => {
    const { sink, sent } = collect();
    for (const type of ["load", "ready", "play", "pause", "seek", "rebuffer-start", "rebuffer-end", "quality-change", "error", "heartbeat"] as const) {
      sink(event({ type }));
    }
    expect(sent).toEqual([]);
  });

  it("sends extras when asked", () => {
    const { sink, sent } = collect({ events: ["pause", "seek", "rebuffer", "quality-change", "error"] });
    sink(event({ type: "pause" }));
    sink(event({ type: "seek" }));
    sink(event({ type: "rebuffer-start" }));
    sink(event({ type: "rebuffer-end", stalledMs: 812.6 }));
    sink(event({ type: "quality-change", quality: "720p" }));
    sink(
      event({
        type: "error",
        error: { code: "media-decode", message: "https://secret.test/?token=1", fatal: true },
      })
    );
    expect(sent.map(([name]) => name)).toEqual([
      "video_pause",
      "video_seek",
      "video_rebuffer",
      "video_quality_change",
      "video_error",
    ]);
    expect(sent[2]?.[1].stalled_ms).toBe(813);
    expect(sent[3]?.[1].video_quality).toBe("720p");
    expect(sent[4]?.[1]).toMatchObject({ error_code: "media-decode", error_fatal: true });
    expect(JSON.stringify(sent)).not.toContain("secret");
  });

  it("only turns on what's listed", () => {
    const { sink, names } = collect({ events: ["error"] });
    sink(event({ type: "pause" }));
    sink(event({ type: "error", error: { code: "x", message: "", fatal: false } }));
    expect(names()).toEqual(["video_error"]);
  });

  it("targets a measurement ID when given one", () => {
    const { sink, sent } = collect({ measurementId: "G-ABC" });
    sink(event({}));
    expect(sent[0]?.[1].send_to).toBe("G-ABC");
    const other = collect();
    other.sink(event({}));
    expect(other.sent[0]?.[1]).not.toHaveProperty("send_to");
  });

  it("works out the title from the event", () => {
    const { sink, sent } = collect({ title: ({ source }) => (source ? "Known" : undefined), provider: "my-site" });
    sink(event({}));
    expect(sent[0]?.[1]).toMatchObject({ video_title: "Known", video_provider: "my-site" });
  });

  it("lets the URL be changed or dropped", () => {
    const keep = collect({ url: (source) => source });
    keep.sink(event({}));
    expect(keep.sent[0]?.[1].video_url).toContain("token=secret");
    const drop = collect({ url: () => undefined });
    drop.sink(event({}));
    expect(drop.sent[0]?.[1].video_url).toBeUndefined();
  });

  it("strips query and hash from relative URLs too", () => {
    const { sink, sent } = collect();
    sink(event({ source: "/video.mp4#t=4" }));
    sink(event({ source: "/video.mp4?a=1" }));
    expect(sent.map(([, params]) => params.video_url)).toEqual(["/video.mp4", "/video.mp4"]);
  });

  it("has no duration to give for live", () => {
    const { sink, sent } = collect();
    sink(event({ duration: Infinity, percent: 0 }));
    expect(sent[0]?.[1].video_duration).toBeUndefined();
    expect(JSON.stringify(sent)).not.toContain("Infinity");
  });

  it("says whether the page is showing", () => {
    const { sink, sent } = collect();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    cleanups.push(() => vi.restoreAllMocks());
    sink(event({}));
    expect(sent[0]?.[1].visible).toBe(false);
  });

  it("uses gtag when it's there", () => {
    const gtag = vi.fn();
    const dataLayer: object[] = [];
    vi.stubGlobal("gtag", gtag);
    vi.stubGlobal("dataLayer", dataLayer);
    googleAnalytics({ measurementId: "G-ABC" })(event({}));
    expect(gtag).toHaveBeenCalledWith("event", "video_start", expect.objectContaining({ send_to: "G-ABC", video_percent: 10 }));
    expect(dataLayer).toEqual([]);
  });

  it("pushes to the data layer for Tag Manager otherwise", () => {
    const dataLayer: object[] = [];
    vi.stubGlobal("dataLayer", dataLayer);
    googleAnalytics()(event({ type: "progress", percent: 50 }));
    expect(dataLayer).toEqual([expect.objectContaining({ event: "video_progress", video_percent: 50 })]);
  });

  it("does nothing, quietly, with neither", () => {
    expect(() => googleAnalytics()(event({}))).not.toThrow();
  });

  it("keeps no state, so that players can share it", () => {
    const { sink, sent } = collect();
    sink(event({}));
    sink(event({}));
    expect(sent).toHaveLength(2);
  });

  it("never loads Google's script or touches consent", () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);
    const scripts = document.scripts.length;
    googleAnalytics({ measurementId: "G-ABC" })(event({}));
    expect(document.scripts.length).toBe(scripts);
    expect(gtag).not.toHaveBeenCalledWith("consent", expect.anything(), expect.anything());
    expect(gtag).not.toHaveBeenCalledWith("config", expect.anything());
    expect(gtag).toHaveBeenCalledOnce();
  });

  it("works from the plugin through to the page", async () => {
    const gtag = vi.fn();
    vi.stubGlobal("gtag", gtag);
    const { player, play } = await watch({ onEvent: googleAnalytics({ title: "T" }) }, { duration: 20 });
    await player.commands.play();
    await settle();
    await play(20);
    const calls = gtag.mock.calls.map(([, name, params]) => [name, (params as GoogleAnalyticsParams).video_percent]);
    expect(calls).toEqual([
      ["video_start", 0],
      ["video_progress", 10],
      ["video_progress", 25],
      ["video_progress", 50],
      ["video_progress", 75],
      ["video_complete", 100],
    ]);
  });
});
