import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEVELOPER_ERROR_CODES, ERROR_CODES, isRetryable, VideoKitError } from "../../src/core/errors";
import { definePlugin, sortPlugins } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import type { AnyPlugin, MediaErrorInfo, Player } from "../../src/core/types";
import { VideoPlayer } from "../../src/player/video-player";
import { ads } from "../../src/plugins/ads/index";
import type { AdEngine } from "../../src/plugins/ads/engine";
import { vast } from "../../src/plugins/ads/vast";
import { chromecast } from "../../src/plugins/chromecast/index";
import { dash } from "../../src/plugins/dash/index";
import { drm } from "../../src/plugins/drm/index";
import { hls } from "../../src/plugins/hls/index";
import { i18n } from "../../src/plugins/i18n/index";
import { ar } from "../../src/plugins/i18n/ar";
import { es } from "../../src/plugins/i18n/es";
import { fr } from "../../src/plugins/i18n/fr";
import { recovery } from "../../src/plugins/recovery/index";
import { usePlayer } from "../../src/react/context";
import { useVideoState } from "../../src/react/hooks";
import { Media } from "../../src/react/media";
import { ErrorOverlay } from "../../src/react/primitives/error-overlay";
import { Root } from "../../src/react/root";
import { fakeBehaviour } from "../helpers/fake-media";

await Promise.all([
  import("../../src/plugins/hls/provider"),
  import("../../src/plugins/dash/provider"),
]);

const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "../../../../apps/docs/content/docs/v4/concepts/errors.mdx"), "utf8");

const walk = (directory: string): string[] =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

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
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function mounted(
  options: Parameters<typeof createPlayer>[0],
  prepare?: (video: HTMLVideoElement) => void
) {
  const player = createPlayer({ src: "/a.mp4", ...options });
  const errors: MediaErrorInfo[] = [];
  cleanups.push(player.onError((error) => errors.push(error)));
  const video = document.createElement("video");
  prepare?.(video);
  cleanups.push(player.mount(document.createElement("div")));
  cleanups.push(player.attach(video));
  await settle();
  return { player, video, errors, media: () => player.getState().media };
}

const fail = (video: HTMLVideoElement, code: number, message = "") => {
  Object.defineProperty(video, "error", { configurable: true, value: { code, message } });
  video.dispatchEvent(new Event("error"));
  Reflect.deleteProperty(video, "error");
};

/** What the table says about a code is what an error with that code should say. */
const expectAgreesWithTable = ({ code, retryable, fatal }: MediaErrorInfo) => {
  const entry = (ERROR_CODES as Record<string, { fatal: boolean; retryable: boolean }>)[code];
  expect(entry, `${code} is in ERROR_CODES`).toBeDefined();
  expect(retryable, `${code} retryable`).toBe(entry?.retryable);
  expect(fatal, `${code} fatal`).toBe(entry?.fatal);
};

describe("the code table", () => {
  it("documents every code", () => {
    for (const code of [...Object.keys(ERROR_CODES), ...DEVELOPER_ERROR_CODES]) {
      expect(page, `${code} is on the errors page`).toContain(`\`${code}\``);
    }
  });

  it("documents each code's behaviour as the table has it", () => {
    for (const [code, { fatal, retryable }] of Object.entries(ERROR_CODES)) {
      // The tables with a code first and five columns, not the page's other mentions.
      const row = page
        .split("\n")
        .find((line) => line.startsWith(`| \`${code}\` |`) && line.split("|").length === 7);
      expect(row, `${code} has a table row`).toBeDefined();
      const cells = (row as string).split("|").map((cell) => cell.trim());
      expect(cells[3], `${code} fatal column`).toBe(fatal ? "Yes" : "No");
      expect(cells[4], `${code} retried column`).toBe(retryable ? "Yes" : "No");
    }
  });

  it("lists every code the source uses, and nothing it doesn't", () => {
    const source = walk(join(here, "../../src"))
      .filter((path) => /\.tsx?$/.test(path) && !path.endsWith("core/errors.ts") && !path.endsWith("core/types.ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const used = new Set(
      [...source.matchAll(/"((?:media|source|play|hls|dash|drm|ads|cast)-[a-z-]+|quality-switch)"/g)].map(
        (match) => match[1] as string
      )
    );
    // These match the pattern but are about something else.
    for (const other of ["play-pause", "play-overlay", "ads-container", "media-session", "media-image"]) {
      used.delete(other);
    }
    const known = Object.keys(ERROR_CODES);
    expect([...used].filter((code) => !known.includes(code))).toEqual([]);
    // The kernel and overlay name these by building them or through the engines' tables.
    expect(known.filter((code) => !used.has(code))).toEqual([]);
  });

  it("answers isRetryable from an error first, then from its code", () => {
    expect(isRetryable("media-network")).toBe(true);
    expect(isRetryable("media-decode")).toBe(false);
    expect(isRetryable("my-plugin-code")).toBe(false);
    expect(isRetryable({ code: "media-decode", message: "", fatal: true, retryable: true })).toBe(true);
    expect(isRetryable({ code: "media-network", message: "", fatal: true })).toBe(true);
  });
});

describe("browser errors", () => {
  it.each([
    [1, "media-aborted"],
    [2, "media-network"],
    [3, "media-decode"],
    [4, "media-unsupported"],
    [5, "drm-session"],
    [99, "media-unknown"],
  ])("reports MediaError %i as %s", async (nativeCode, code) => {
    const { video, media } = await mounted({});
    fail(video, nativeCode, "Browser words");
    await settle();
    const error = media().error as MediaErrorInfo;
    expect(error).toMatchObject({ code, nativeCode, message: "Browser words", source: { src: "/a.mp4" } });
    expectAgreesWithTable(error);
    expect(error.cause).toMatchObject({ code: nativeCode });
  });

  it("reads a failed download while offline as the connection, not the format", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    cleanups.push(() => vi.restoreAllMocks());
    const { video, media } = await mounted({});
    fail(video, 4);
    await settle();
    expect(media().error).toMatchObject({ code: "media-network", nativeCode: 4, retryable: true });
  });

  it("gives its own words when the browser gives none", async () => {
    const { video, media } = await mounted({});
    fail(video, 3);
    await settle();
    expect(media().error?.message).toBe("The media could not be decoded.");
  });
});

describe("onError", () => {
  it("hears fatal errors, once each", async () => {
    const { errors } = await mounted({ src: "/broken.mp4" });
    expect(errors.map(({ code, fatal }) => [code, fatal])).toEqual([["media-unsupported", true]]);
  });

  it("hears a blocked play, which isn't kept as the video's error", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const { player, errors, media } = await mounted({});
    expect(await player.commands.play()).toBe(false);
    await settle();
    expect(errors).toHaveLength(1);
    const [error] = errors as [MediaErrorInfo];
    expect(error).toMatchObject({ code: "play-blocked", fatal: false, nativeCode: "NotAllowedError" });
    expectAgreesWithTable(error);
    expect(media().error).toBeNull();
    expect(media().playRejected).toBe("NotAllowedError");
  });

  it("tells a refused play apart from a blocked one", async () => {
    fakeBehaviour.rejectPlayWith = "NotSupportedError";
    const { player, errors } = await mounted({});
    await player.commands.play();
    await settle();
    expect(errors[0]).toMatchObject({ code: "play-failed", fatal: false });
  });

  it("hears a source that failed before a fallback took over, as not fatal", async () => {
    const { errors, media } = await mounted({ src: [{ src: "/broken.mp4" }, { src: "/b.mp4" }] });
    expect(media().error).toBeNull();
    expect(media().status).toBe("ready");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: "media-unsupported", fatal: false, source: { src: "/broken.mp4" } });
  });

  it("stops when told to", async () => {
    const player = createPlayer({ src: "/broken.mp4" });
    const listener = vi.fn();
    player.onError(listener)();
    cleanups.push(player.mount(document.createElement("div")));
    cleanups.push(player.attach(document.createElement("video")));
    await settle();
    expect(listener).not.toHaveBeenCalled();
  });

  it("can reload from inside a listener without disturbing the failure", async () => {
    const player = createPlayer({ src: "/broken.mp4" });
    let reloaded = false;
    player.onError(() => {
      if (reloaded) return;
      reloaded = true;
      player.commands.setSource("/a.mp4");
    });
    cleanups.push(player.mount(document.createElement("div")));
    cleanups.push(player.attach(document.createElement("video")));
    await settle();
    expect(player.getState().media.status).toBe("ready");
  });

  it("uses the newest handler on Root, without restarting anything", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const ref = { current: null as Player | null };
    const view = render(
      <Root src="/a.mp4" ref={ref as never} onError={first}>
        <Media />
      </Root>
    );
    await settle();
    view.rerender(
      <Root src="/a.mp4" ref={ref as never} onError={second}>
        <Media />
      </Root>
    );
    await settle();
    fail(view.container.querySelector("video") as HTMLVideoElement, 3);
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(expect.objectContaining({ code: "media-decode", fatal: true }));
    expect(ref.current?.getState().media.status).toBe("error");
  });

  it("isn't passed on to the root element", async () => {
    const view = render(
      <Root src="/a.mp4" onError={() => {}}>
        <Media />
      </Root>
    );
    await settle();
    expect(view.container.querySelector("[data-part=root]")?.hasAttribute("onerror")).toBe(false);
  });

  it("keeps a fatal error showing when a later one isn't fatal", async () => {
    const reporter = definePlugin("reporter", () => ({
      commands: (context) => ({
        report(error: MediaErrorInfo) {
          context.error(error);
        },
      }),
    }));
    const { player, video, errors, media } = await mounted({ plugins: [reporter()] });
    fail(video, 3);
    await settle();
    player.plugin(reporter).commands.report({ code: "my-notice", message: "", fatal: false });
    await settle();
    expect(media().error?.code).toBe("media-decode");
    expect(media().status).toBe("error");
    expect(errors.map(({ code }) => code)).toEqual(["media-decode", "my-notice"]);
  });

  it("lets a plugin choose the code by throwing from a load gate", async () => {
    const failing = definePlugin("failing", () => ({
      gates: {
        load() {
          throw new VideoKitError("my-token-failed", "No token.", { retryable: true, nativeCode: 500 });
        },
      },
    }));
    const { media } = await mounted({ plugins: [failing()] });
    expect(media().error).toMatchObject({
      code: "my-token-failed",
      message: "No token.",
      fatal: true,
      retryable: true,
      nativeCode: 500,
    });
  });

  it("calls anything else thrown while loading a load failure", async () => {
    const failing = definePlugin("failing", () => ({
      gates: {
        load() {
          throw new Error("Nope");
        },
      },
    }));
    const { media } = await mounted({ plugins: [failing()] });
    expect(media().error).toMatchObject({ message: "Nope", nativeCode: "Error" });
    expectAgreesWithTable(media().error as MediaErrorInfo);
    expect(media().error?.code).toBe("source-load-failed");
  });

  it("doesn't mistake a browser's numeric code for one of ours", async () => {
    const failing = definePlugin("failing", () => ({
      gates: {
        load() {
          throw Object.assign(new Error("Aborted-ish"), { code: 20 });
        },
      },
    }));
    const { media } = await mounted({ plugins: [failing()] });
    expect(media().error?.code).toBe("source-load-failed");
  });
});

describe("recovery", () => {
  it("goes by retryable", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { player, video } = await act(async () => {
      const result = mounted({ plugins: [recovery()] });
      await vi.advanceTimersByTimeAsync(10);
      return result;
    });
    await act(async () => {
      fail(video, 3);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(player.plugin(recovery).state().retrying).toBe(false);
    await act(async () => {
      player.commands.reload();
      await vi.advanceTimersByTimeAsync(0);
      fail(video, 2);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(player.plugin(recovery).state().retrying).toBe(true);
  });

  it("leaves an error alone when nothing says it can be retried", async () => {
    const reporter = definePlugin("reporter", () => ({
      commands: (context) => ({
        report(error: MediaErrorInfo) {
          context.error(error);
        },
      }),
    }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { player } = await act(async () => {
      const result = mounted({ plugins: [recovery(), reporter()] });
      await vi.advanceTimersByTimeAsync(10);
      return result;
    });
    await act(async () => {
      player.plugin(reporter).commands.report({ code: "my-failure", message: "", fatal: true });
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(player.getState().media.error?.code).toBe("my-failure");
    expect(player.plugin(recovery).state().retrying).toBe(false);
  });

  it("settles when a notice arrives during the retry, before the video is ready", async () => {
    const reporter = definePlugin("reporter", () => ({
      commands: (context) => ({
        report(error: MediaErrorInfo) {
          context.error(error);
        },
      }),
    }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { player, video } = await act(async () => {
      const result = mounted({ plugins: [recovery(), reporter()] });
      await vi.advanceTimersByTimeAsync(10);
      return result;
    });
    let armed = false;
    player.subscribe(() => {
      if (!armed || player.getState().media.status !== "loading") return;
      armed = false;
      player.plugin(reporter).commands.report({ code: "my-notice", message: "", fatal: false });
    });
    await act(async () => {
      fail(video, 2);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(player.plugin(recovery).state().retrying).toBe(true);
    armed = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1100);
    });
    expect(armed).toBe(false);
    expect(player.getState().media).toMatchObject({ status: "ready", error: { code: "my-notice", fatal: false } });
    expect(player.plugin(recovery).state().retrying).toBe(false);
  });

  it("settles when the video is ready, whatever non-fatal error came along", async () => {
    const reporter = definePlugin("reporter", () => ({
      commands: (context) => ({
        report(error: MediaErrorInfo) {
          context.error(error);
        },
      }),
    }));
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { player, video } = await act(async () => {
      const result = mounted({ plugins: [recovery(), reporter()] });
      await vi.advanceTimersByTimeAsync(10);
      return result;
    });
    await act(async () => {
      fail(video, 2);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(player.plugin(recovery).state().retrying).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      player.plugin(reporter).commands.report({ code: "my-notice", message: "", fatal: false });
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(player.plugin(recovery).state().retrying).toBe(false);
  });
});

describe("hls", () => {
  const types = {
    network: "networkError",
    media: "mediaError",
    key: "keySystemError",
    mux: "muxError",
    other: "otherError",
  };

  const load = async () => {
    let emit: (data: object) => void = () => {};
    class FakeHls {
      static Events = {
        MANIFEST_PARSED: "a",
        LEVEL_SWITCHED: "b",
        AUDIO_TRACKS_UPDATED: "c",
        AUDIO_TRACK_SWITCHED: "d",
        LEVEL_UPDATED: "e",
        ERROR: "error",
      };
      static ErrorTypes = {
        NETWORK_ERROR: types.network,
        MEDIA_ERROR: types.media,
        KEY_SYSTEM_ERROR: types.key,
        MUX_ERROR: types.mux,
        OTHER_ERROR: types.other,
      };
      levels = [];
      audioTracks = [];
      audioTrack = -1;
      currentLevel = -1;
      autoLevelEnabled = true;
      subtitleDisplay = true;
      loadSource() {}
      attachMedia() {}
      destroy() {}
      recoverMediaError() {}
      swapAudioCodec() {}
      on(event: string, listener: (event: string, data: never) => void) {
        if (event === "error") emit = (data) => listener(event, data as never);
      }
    }
    vi.stubGlobal("MediaSource", class {});
    const result = await mounted({
      src: "/stream.m3u8",
      plugins: [hls({ library: async () => ({ default: FakeHls as never }) })],
    });
    return { ...result, emit: (data: object) => emit(data) };
  };

  it.each([
    [types.network, "manifestLoadError", "hls-manifest"],
    [types.network, "manifestLoadTimeOut", "hls-manifest"],
    [types.network, "manifestParsingError", "hls-manifest-invalid"],
    [types.network, "levelLoadError", "hls-playlist"],
    [types.network, "audioTrackLoadTimeOut", "hls-playlist"],
    [types.network, "subtitleTrackLoadError", "hls-playlist"],
    [types.network, "fragLoadError", "hls-segment"],
    [types.network, "keyLoadError", "hls-key"],
    [types.network, "assetListLoadError", "hls-network"],
    [types.other, "internalException", "hls-unknown"],
    [types.mux, "remuxAllocError", "hls-media"],
    [types.key, "keySystemNoAccess", "drm-unsupported"],
    [types.key, "keySystemNoConfiguredLicense", "drm-config"],
    [types.key, "keySystemLicenseRequestFailed", "drm-license"],
    [types.key, "keySystemServerCertificateRequestFailed", "drm-certificate"],
    [types.key, "keySystemServerCertificateUpdateFailed", "drm-certificate"],
    [types.key, "keySystemStatusOutputRestricted", "drm-output-restricted"],
    [types.key, "keySystemSessionUpdateFailed", "drm-session"],
    [types.key, "keySystemNoSession", "drm-session"],
  ])("reports a fatal %s of %s as %s", async (type, details, code) => {
    const { emit, media } = await load();
    const data = { type, details, fatal: true };
    emit(data);
    await settle();
    const error = media().error as MediaErrorInfo;
    expect(error).toMatchObject({ code, nativeCode: details, message: details, cause: data });
    expectAgreesWithTable(error);
  });

  it.each([401, 403])("reports a licence refused with %i as denied", async (status) => {
    const { emit, media } = await load();
    emit({
      type: types.key,
      details: "keySystemLicenseRequestFailed",
      fatal: true,
      response: { code: status },
    });
    await settle();
    expect(media().error).toMatchObject({ code: "drm-denied", retryable: false });
  });

  it("reports incompatible codecs once recovering gives up", async () => {
    const { emit, media } = await load();
    const data = { type: types.media, details: "manifestIncompatibleCodecsError", fatal: true };
    emit(data);
    emit(data);
    emit(data);
    await settle();
    expect(media().error).toMatchObject({ code: "hls-codecs", retryable: false });
  });

  it("leaves what hls.js recovers from alone", async () => {
    const { emit, errors } = await load();
    emit({ type: types.network, details: "fragLoadError", fatal: false });
    await settle();
    expect(errors).toEqual([]);
  });
});

describe("dash", () => {
  const load = async () => {
    const listeners = new Map<string, (event: unknown) => void>();
    const engine = {
      updateSettings() {},
      setProtectionData() {},
      initialize() {},
      destroy() {},
      on: (event: string, listener: (event: unknown) => void) => listeners.set(event, listener),
      isDynamic: () => false,
    };
    const library = { MediaPlayer: () => ({ create: () => engine }) };
    vi.stubGlobal("MediaSource", class {});
    const result = await mounted({
      src: "/stream.mpd",
      plugins: [dash({ library: async () => library as never })],
    });
    return {
      ...result,
      emit: (error: object) => listeners.get("error")?.({ error }),
    };
  };

  it.each([
    [10, "dash-manifest-invalid"],
    [11, "dash-manifest"],
    [12, "dash-network"],
    [16, "dash-time-sync"],
    [17, "dash-segment"],
    [19, "dash-network"],
    [20, "dash-media"],
    [23, "dash-unsupported"],
    [24, "drm-unsupported"],
    [25, "dash-manifest"],
    [27, "dash-segment"],
    [29, "dash-network"],
    [31, "dash-manifest-invalid"],
    [33, "dash-captions"],
    [35, "dash-unsupported"],
    [100, "drm-session"],
    [104, "drm-output-restricted"],
    [109, "drm-certificate"],
    [110, "drm-expired"],
    [111, "drm-config"],
    [112, "drm-unsupported"],
    [114, "drm-license"],
    [200, "dash-unknown"],
    [1, "media-aborted"],
    [2, "media-network"],
    [3, "media-decode"],
    [4, "media-unsupported"],
    [5, "drm-session"],
  ])("reports dash.js's %i as %s", async (nativeCode, code) => {
    const { emit, errors } = await load();
    emit({ code: nativeCode, message: "Words" });
    await settle();
    const [error] = errors as [MediaErrorInfo];
    expect(error).toMatchObject({ code, nativeCode, message: "Words" });
    expectAgreesWithTable(error);
  });

  it("keeps playing through the failures dash.js carries on after", async () => {
    const { emit, media } = await load();
    emit({ code: 33, message: "Bad captions" });
    await settle();
    expect(media().status).not.toBe("error");
    expect(media().error).toMatchObject({ code: "dash-captions", fatal: false });
  });

  it("finds a refusal in the licence server's response", async () => {
    const { emit, media } = await load();
    emit({ code: 114, message: 'XHR complete. status is "Forbidden" (403), readyState is 4' });
    await settle();
    expect(media().error).toMatchObject({ code: "drm-denied", retryable: false, nativeCode: 114 });
  });

  it("reports a failed engine download", async () => {
    vi.stubGlobal("MediaSource", class {});
    const { media } = await mounted({
      src: "/stream.mpd",
      plugins: [dash({ library: () => Promise.reject(new Error("CDN down")) })],
    });
    expect(media().error).toMatchObject({ code: "dash-engine-load", retryable: true });
    expect(media().error?.message).toContain("CDN down");
  });
});

describe("drm", () => {
  const keys = { "00": "11" };

  const fakeKeys = (overrides: { createSession?: () => object } = {}) => {
    const session = Object.assign(new EventTarget(), {
      generateRequest: vi.fn(async () => {}),
      update: vi.fn(async () => {}),
      close: async () => {},
      keyStatuses: new Map<string, MediaKeyStatus>(),
    });
    const mediaKeys = {
      setServerCertificate: vi.fn(async () => true),
      createSession: overrides.createSession ?? (() => session),
    };
    Object.defineProperty(navigator, "requestMediaKeySystemAccess", {
      configurable: true,
      value: vi.fn(async () => ({ createMediaKeys: async () => mediaKeys })),
    });
    cleanups.push(() => Reflect.deleteProperty(navigator, "requestMediaKeySystemAccess"));
    return { session, mediaKeys };
  };

  const prepareVideo = (video: HTMLVideoElement) => {
    let current: unknown = null;
    Object.defineProperty(video, "mediaKeys", { configurable: true, get: () => current });
    Object.assign(video, {
      setMediaKeys: vi.fn(async (value: unknown) => {
        current = value;
      }),
    });
  };

  const encrypted = (video: HTMLVideoElement) =>
    video.dispatchEvent(
      Object.assign(new Event("encrypted"), {
        initDataType: "cenc",
        initData: new TextEncoder().encode("init").buffer,
      })
    );

  const message = (session: EventTarget) =>
    session.dispatchEvent(Object.assign(new Event("message"), { message: new ArrayBuffer(1) }));

  it.each([
    [401, "drm-denied"],
    [403, "drm-denied"],
    [500, "drm-license"],
    [404, "drm-license"],
  ])("reports a licence server's %i as %s", async (status, code) => {
    const { session } = fakeKeys();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status })));
    const { video, media } = await mounted(
      { plugins: [drm({ widevine: { licenseUrl: "https://license.test/" } })] },
      prepareVideo
    );
    encrypted(video);
    await settle();
    message(session);
    await settle();
    const error = media().error as MediaErrorInfo;
    expect(error).toMatchObject({ code, nativeCode: status });
    expectAgreesWithTable(error);
    expect(media().status).toBe("error");
  });

  it("calls an unreachable licence server a session failure it can't retry", async () => {
    const { session } = fakeKeys();
    session.generateRequest.mockRejectedValueOnce(new DOMException("No", "NotSupportedError"));
    const { video, media } = await mounted({ plugins: [drm({ clearkey: { keys } })] }, prepareVideo);
    encrypted(video);
    await settle();
    expect(media().error).toMatchObject({ code: "drm-session", retryable: false, nativeCode: "NotSupportedError" });
  });

  it("reports a FairPlay certificate that won't load", async () => {
    fakeKeys();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
    const { video, media } = await mounted(
      {
        plugins: [
          drm({ fairplay: { licenseUrl: "https://license.test/", certificateUrl: "https://cert.test/" } }),
        ],
      },
      prepareVideo
    );
    encrypted(video);
    await settle();
    const error = media().error as MediaErrorInfo;
    expect(error.code).toBe("drm-certificate");
    expectAgreesWithTable(error);
  });

  it.each([
    ["expired", "drm-expired"],
    ["output-restricted", "drm-output-restricted"],
    ["internal-error", "drm-session"],
  ])("reports a key that's %s as %s", async (status, code) => {
    const { session } = fakeKeys();
    const { video, media } = await mounted({ plugins: [drm({ clearkey: { keys } })] }, prepareVideo);
    encrypted(video);
    await settle();
    session.keyStatuses.set("a", status as MediaKeyStatus);
    session.dispatchEvent(new Event("keystatuseschange"));
    await settle();
    const error = media().error as MediaErrorInfo;
    expect(error).toMatchObject({ code, nativeCode: status });
    expectAgreesWithTable(error);
  });

  it("carries on while any key can still play", async () => {
    const { session } = fakeKeys();
    const { video, media } = await mounted({ plugins: [drm({ clearkey: { keys } })] }, prepareVideo);
    encrypted(video);
    await settle();
    session.keyStatuses.set("a", "output-restricted");
    session.keyStatuses.set("b", "usable");
    session.dispatchEvent(new Event("keystatuseschange"));
    await settle();
    expect(media().error).toBeNull();
  });

  it("moves on to a fallback source when protection fails first", async () => {
    Object.defineProperty(navigator, "requestMediaKeySystemAccess", {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error("Unsupported");
      }),
    });
    cleanups.push(() => Reflect.deleteProperty(navigator, "requestMediaKeySystemAccess"));
    const { video, errors, media } = await mounted(
      { src: [{ src: "/a.mp4" }, { src: "/b.mp4" }], plugins: [drm({ clearkey: { keys } })] },
      prepareVideo
    );
    encrypted(video);
    await settle();
    expect(media().status).toBe("ready");
    expect(video.src).toContain("/b.mp4");
    expect(errors[0]).toMatchObject({ code: "drm-unsupported", fatal: false, source: { src: "/a.mp4" } });
  });
});

describe("ads", () => {
  const engine = (overrides: Partial<AdEngine> = {}): AdEngine => ({
    time: 0,
    prepare() {},
    request: async () => {},
    play() {},
    pause() {},
    skip() {},
    setVolume() {},
    destroy() {},
    ...overrides,
  });

  const noAdError = (errors: MediaErrorInfo[], code: string) => {
    expect(errors.map((error) => error.code)).toContain(code);
    const error = errors.find((each) => each.code === code) as MediaErrorInfo;
    expectAgreesWithTable(error);
  };

  it("reports an engine that can't be made, and plays the content", async () => {
    const onError = vi.fn();
    const { player, errors, media } = await mounted({
      plugins: [
        ads({
          engine: () => {
            throw new Error("No engine");
          },
          onError,
        }),
      ],
    });
    expect(await player.commands.play()).toBe(true);
    await settle();
    noAdError(errors, "ads-setup");
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "ads-setup", fatal: false }));
    expect(media().status).toBe("ready");
    expect(media().error?.fatal).toBe(false);
  });

  it("reports an engine that can't prepare", async () => {
    const { player, errors } = await mounted({
      plugins: [
        ads({
          engine: () =>
            engine({
              prepare() {
                throw new Error("No SDK");
              },
            }),
        }),
      ],
    });
    expect(await player.commands.play()).toBe(true);
    await settle();
    noAdError(errors, "ads-setup");
  });

  it("reports a failed request", async () => {
    const { player, errors, media } = await mounted({
      plugins: [ads({ engine: () => engine({ request: () => Promise.reject(new Error("Blocked")) }) })],
    });
    expect(await player.commands.play()).toBe(true);
    await settle();
    noAdError(errors, "ads-request");
    expect(media().paused).toBe(false);
  });

  it("reports a pre-roll that never came", async () => {
    const { player, errors } = await mounted({
      plugins: [ads({ timeout: 5, engine: () => engine({ request: () => new Promise(() => {}) }) })],
    });
    expect(await player.commands.play()).toBe(true);
    await settle();
    noAdError(errors, "ads-timeout");
  });

  it("reports a failure partway through a break", async () => {
    const { player, errors } = await mounted({
      plugins: [
        ads({
          engine: () => {
            let host: Parameters<AdEngine["prepare"]>[0] | null = null;
            return engine({
              prepare(next) {
                host = next;
              },
              request: async () => {
                host?.error(new Error("Broken file"));
              },
            });
          },
        }),
      ],
    });
    await player.commands.play();
    await settle();
    noAdError(errors, "ads-playback");
  });

  it("keeps a VAST tag's status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    const { player, errors } = await mounted({
      plugins: [ads({ engine: vast({ tag: "/tag.xml" }) })],
    });
    await player.commands.play();
    await settle();
    expect(errors[0]).toMatchObject({ code: "ads-request", nativeCode: 503, fatal: false });
  });
});

describe("chromecast", () => {
  const fakeCast = () => {
    const context = {
      setOptions() {},
      addEventListener() {},
      removeEventListener() {},
      requestSession: vi.fn(async (): Promise<unknown> => undefined),
      getCurrentSession: () => null,
      getCastState: () => "NO_DEVICES",
    };
    vi.stubGlobal("cast", {
      framework: {
        CastContext: { getInstance: () => context },
        CastContextEventType: { CAST_STATE_CHANGED: "a", SESSION_STATE_CHANGED: "b" },
        CastState: { NO_DEVICES_AVAILABLE: "NO_DEVICES" },
        SessionState: { SESSION_STARTED: "c", SESSION_RESUMED: "d", SESSION_ENDED: "e" },
      },
    });
    vi.stubGlobal("chrome", {
      cast: { AutoJoinPolicy: { ORIGIN_SCOPED: "o" }, media: { DEFAULT_MEDIA_RECEIVER_APP_ID: "x" } },
    });
    return context;
  };

  it("reports a session that didn't start", async () => {
    const context = fakeCast();
    context.requestSession.mockRejectedValueOnce("receiver_unavailable");
    const { player, errors } = await mounted({ plugins: [chromecast()] });
    player.plugin(chromecast).commands.toggle();
    await settle();
    expect(errors[0]).toMatchObject({ code: "cast-session", nativeCode: "receiver_unavailable" });
    expectAgreesWithTable(errors[0] as MediaErrorInfo);
  });

  it("stays quiet when the viewer closes the picker", async () => {
    const context = fakeCast();
    context.requestSession.mockRejectedValueOnce("cancel");
    const { player, errors } = await mounted({ plugins: [chromecast()] });
    player.plugin(chromecast).commands.toggle();
    await settle();
    expect(errors).toEqual([]);
  });

  it("reports an SDK that doesn't load", async () => {
    vi.stubGlobal("cast", undefined);
    vi.stubGlobal("chrome", {});
    const url = "https://cast.test/sdk.js";
    const { errors } = await mounted({ plugins: [chromecast({ sdkUrl: url })] });
    const script = document.querySelector(`script[src="${url}"]`);
    cleanups.push(() => script?.remove());
    script?.dispatchEvent(new Event("error"));
    await settle();
    expect(errors[0]).toMatchObject({ code: "cast-sdk", fatal: false });
  });
});

describe("the overlay", () => {
  const overlay = async (
    report: MediaErrorInfo,
    {
      plugins = [],
      ...props
    }: {
      plugins?: readonly AnyPlugin[];
      title?: string;
      messages?: Record<string, { title?: string; detail?: string }>;
    } = {}
  ) => {
    const reporter = definePlugin("reporter", () => ({
      commands: (context) => ({
        report(error: MediaErrorInfo) {
          context.error(error);
        },
      }),
    }));
    const ref = { current: null as Player | null };
    const view = render(
      <Root src="/a.mp4" ref={ref as never} plugins={[reporter(), ...plugins]}>
        <Media />
        <ErrorOverlay {...props} />
      </Root>
    );
    await settle();
    await act(async () => {
      ref.current?.plugin(reporter).commands.report(report);
    });
    await settle();
    return view;
  };

  const text = (part: string) => document.querySelector(`[data-part="${part}"]`)?.textContent;

  it.each([
    [{ code: "media-network", retryable: true }, "This video didn't load.", true],
    [{ code: "drm-license", retryable: true }, "This video didn't load.", true],
    [{ code: "media-decode", retryable: false }, "This video can't be played.", false],
    [{ code: "source-no-provider", retryable: false }, "This video can't be played.", false],
    [{ code: "drm-unsupported", retryable: false }, "This protected video can't be played.", false],
    [{ code: "drm-denied", retryable: false }, "You don't have access to this video.", false],
    [{ code: "drm-expired", retryable: false }, "You don't have access to this video.", false],
    [{ code: "drm-output-restricted", retryable: false }, "This video can't be shown on this screen.", false],
    // Without a verdict, retrying costs the viewer nothing.
    [{ code: "my-plugin-code" }, "This video can't be played.", true],
  ])("explains %o", async (error, title, retry) => {
    await overlay({ message: "PIPELINE_ERROR_DECODE: raw", fatal: true, ...error });
    expect(text("error-title")).toBe(title);
    expect(text("error-message")).toBeTruthy();
    expect(text("error-code")).toBe(`Error code: ${error.code}`);
    expect(screen.queryByRole("button", { name: "Try again" }) !== null).toBe(retry);
    expect(document.body.textContent).not.toContain("PIPELINE_ERROR_DECODE");
  });

  it("stays out of the way of errors that aren't fatal", async () => {
    await overlay({ code: "quality-switch", message: "", fatal: false, retryable: false });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("takes other text by code, and a title for everything", async () => {
    await overlay(
      { code: "drm-denied", message: "", fatal: true, retryable: false },
      { messages: { "drm-denied": { title: "Subscribe to watch", detail: "Plans start at $5." } } }
    );
    expect(text("error-title")).toBe("Subscribe to watch");
    expect(text("error-message")).toBe("Plans start at $5.");
    expect(text("error-code")).toContain("drm-denied");
  });

  it("prefers title to messages", async () => {
    await overlay(
      { code: "drm-denied", message: "", fatal: true, retryable: false },
      { title: "Nope", messages: { "drm-denied": { title: "Subscribe" } } }
    );
    expect(text("error-title")).toBe("Nope");
  });

  it("copes with a plugin that reports a number", async () => {
    await overlay({ code: 42 as unknown as string, message: "", fatal: true });
    expect(text("error-code")).toContain("42");
  });

  it("is translated, with every key in every language", async () => {
    const keys = [
      "error",
      "errorDetail",
      "errorConnection",
      "errorConnectionDetail",
      "errorProtected",
      "errorProtectedDetail",
      "errorDenied",
      "errorDeniedDetail",
      "errorOutput",
      "errorOutputDetail",
      "errorCode",
      "retry",
    ] as const;
    for (const strings of [ar, es, fr]) {
      for (const key of keys) expect(strings[key], key).toBeTruthy();
    }
    await overlay(
      { code: "media-network", message: "", fatal: true, retryable: true },
      { plugins: [i18n({ locale: "ar", strings: ar })] }
    );
    expect(text("error-title")).toBe(ar.errorConnection);
    expect(text("error-message")).toBe(ar.errorConnectionDetail);
    expect(text("error-code")).toBe(`${ar.errorCode} media-network`);
    // The code keeps its own reading order inside the sentence.
    expect(document.querySelector('[data-part="error-code"] bdi')?.textContent).toBe("media-network");
  });

  it("takes messages through VideoPlayer too", async () => {
    render(
      <VideoPlayer
        src="/broken.mp4"
        errorMessages={{ "media-unsupported": { detail: "Ask the owner to upload it again." } }}
      />
    );
    await settle();
    expect(text("error-message")).toBe("Ask the owner to upload it again.");
  });
});

describe("developer errors", () => {
  const instance = (name: string) => ({ name, create: () => ({}) });

  const codeOf = (run: () => unknown) => {
    try {
      run();
    } catch (error) {
      expect(error).toBeInstanceOf(VideoKitError);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("VideoKitError");
      return (error as VideoKitError).code;
    }
    return null;
  };

  it("names each mistake", () => {
    expect(codeOf(() => createPlayer({ plugins: [instance("media")] }))).toBe("plugin-reserved-name");
    expect(codeOf(() => sortPlugins([instance("a"), instance("a")]))).toBe("plugin-duplicate");
    expect(codeOf(() => sortPlugins([{ name: "a", create: undefined as never }]))).toBe("plugin-no-code");
    expect(
      codeOf(() =>
        sortPlugins([
          { name: "a", create: () => ({ requires: ["b"] }) },
          { name: "b", create: () => ({ requires: ["a"] }) },
        ])
      )
    ).toBe("plugin-cycle");
    expect(codeOf(() => sortPlugins([{ name: "a", create: () => ({ requires: ["b"] }) }]))).toBe("plugin-missing");
    const other = definePlugin("other", () => ({}));
    expect(codeOf(() => createPlayer().plugin(other))).toBe("plugin-not-installed");
  });

  it("names a part outside its parent", () => {
    const Part = () => {
      usePlayer();
      return null;
    };
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(codeOf(() => render(<Part />))).toBe("part-outside-root");
    const Reader = () => {
      useVideoState(definePlugin("missing", () => ({})), () => 1);
      return null;
    };
    expect(
      codeOf(() =>
        render(
          <Root>
            <Reader />
          </Root>
        )
      )
    ).toBe("plugin-not-installed");
    quiet.mockRestore();
  });
});
