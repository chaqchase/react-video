import { VideoKitError } from "../../core/kit-error";
import type {
  Capabilities,
  KnownVideoErrorCode,
  LoadRequest,
  MediaErrorInfo,
  MediaState,
  Provider,
  ProviderEntry,
  Sink,
  SourceObject,
} from "../../core/types";
import type { Scope } from "../../core/scope";

const HLS_MIME = "application/vnd.apple.mpegurl";
const DASH_MIME = "application/dash+xml";

const MEDIA_ERRORS: Record<number, [KnownVideoErrorCode, boolean, string]> = {
  1: ["media-aborted", true, "Playback was aborted."],
  2: ["media-network", true, "A network error stopped the download."],
  3: ["media-decode", false, "The media could not be decoded."],
  4: ["media-unsupported", false, "The source isn't supported."],
  // Only some browsers and engines still use this one.
  5: ["drm-session", false, "The media is encrypted and could not be decrypted."],
};

/** Describes a `MediaError`. Engines hand on the same numbers from the element. */
export function mediaErrorInfo(
  nativeCode: number,
  message: string | undefined,
  cause: unknown
): MediaErrorInfo {
  // A download that fails before any data arrives reads as an unsupported source.
  const offline = nativeCode === 4 && typeof navigator !== "undefined" && navigator.onLine === false;
  const [code, retryable, fallback] = MEDIA_ERRORS[offline ? 2 : nativeCode] ?? [
    "media-unknown",
    false,
    "The source could not be played.",
  ];
  return { code, message: message || fallback, fatal: true, retryable, nativeCode, cause };
}

function typeOf(source: SourceObject) {
  if (source.type) return source.type;
  const path = source.src.split(/[?#]/)[0] ?? "";
  if (path.endsWith(".m3u8")) return HLS_MIME;
  if (path.endsWith(".mpd")) return DASH_MIME;
  return null;
}

/** Plays whatever the browser supports directly through the media element. */
export class NativeProvider implements Provider {
  readonly name: string = "native";
  protected element: HTMLVideoElement | null = null;
  protected sink: Sink | null = null;
  protected source: SourceObject | null = null;
  /** Set while something else decides what element errors mean, like an engine. */
  protected ignoreElementErrors = false;
  /** What attach detected, for subclasses that report narrower capabilities. */
  protected baseCapabilities: Capabilities = { seek: true, rate: true, volume: true };

  get time() {
    return this.element?.currentTime ?? 0;
  }

  attach(element: HTMLVideoElement | null, sink: Sink, scope: Scope) {
    if (!element) throw new VideoKitError("provider-no-element", "react-video-kit: NativeProvider needs a media element.");
    this.element = element;
    this.sink = sink;

    const on = (type: string, listener: () => void) =>
      scope.on(element, type, listener);

    on("durationchange", () => sink.update({ duration: this.duration() }));
    // Not canplay: iOS may hold that back until playback starts.
    on("loadedmetadata", () => sink.update({ status: "ready" }));
    on("canplay", () => sink.update({ waiting: false }));
    on("play", () =>
      sink.update({ paused: false, ended: false, playRejected: null })
    );
    on("playing", () =>
      sink.update({ paused: false, waiting: false, started: true })
    );
    on("pause", () => sink.update({ paused: true }));
    on("waiting", () => sink.update({ waiting: true }));
    on("seeking", () => {
      // Seeking back from the end leaves the ended state without a play.
      sink.update({ seeking: true, ended: element.ended });
      sink.sync();
    });
    on("seeked", () => {
      sink.update({ seeking: false });
      sink.sync();
    });
    on("ended", () => {
      sink.update({ ended: true, paused: true, waiting: false });
      sink.sync();
    });
    on("ratechange", () => sink.update({ rate: element.playbackRate }));
    on("volumechange", () =>
      sink.update({ volume: element.volume, muted: element.muted })
    );
    on("progress", () => sink.update({ buffered: this.buffered() }));
    // The clock doesn't run while paused, so paused time changes arrive here.
    on("timeupdate", () => {
      if (element.paused) sink.sync();
    });
    on("error", () => {
      if (this.ignoreElementErrors) return;
      const { error } = element;
      sink.error(mediaErrorInfo(error?.code ?? 0, error?.message, error));
    });

    this.baseCapabilities = this.capabilities(element);
    sink.update({ ...this.snapshot(), capabilities: this.baseCapabilities });
  }

  async load(request: LoadRequest, signal?: AbortSignal) {
    const element = this.element;
    if (!element) return;
    this.source = request.source;
    const { startTime } = request;
    if (startTime !== undefined) {
      element.addEventListener(
        "loadedmetadata",
        () => {
          element.currentTime = startTime;
        },
        // The next source mustn't jump to this one's position.
        { once: true, signal }
      );
    }
    element.src = request.source.src;
    element.load();
  }

  play() {
    return this.element?.play() ?? Promise.resolve();
  }

  pause() {
    this.element?.pause();
  }

  seek(time: number) {
    if (this.element) this.element.currentTime = time;
  }

  setVolume(volume: number, muted: boolean) {
    const element = this.element;
    if (!element) return;
    element.volume = volume;
    element.muted = muted;
  }

  setRate(rate: number) {
    if (!this.element) return;
    // load() resets playbackRate to this, so the rate survives a new source.
    this.element.defaultPlaybackRate = rate;
    this.element.playbackRate = rate;
  }

  snapshot(): Partial<MediaState> {
    const element = this.element;
    if (!element) return {};
    return {
      paused: element.paused,
      ended: element.ended,
      duration: this.duration(),
      buffered: this.buffered(),
      volume: element.volume,
      muted: element.muted,
      rate: element.playbackRate,
    };
  }

  destroy() {
    const element = this.element;
    this.element = null;
    this.sink = null;
    if (!element) return;
    // Clearing the source releases the download and the decoder.
    element.removeAttribute("src");
    element.load();
  }

  private capabilities(element: HTMLVideoElement) {
    // iOS ignores volume writes, because the hardware buttons own volume there.
    const volume = element.volume;
    element.volume = volume === 0.5 ? 0.25 : 0.5;
    const canSetVolume = element.volume !== volume;
    element.volume = volume;
    return { seek: true, rate: true, volume: canSetVolume };
  }

  private duration() {
    const duration = this.element?.duration ?? 0;
    return Number.isNaN(duration) ? 0 : duration;
  }

  private buffered() {
    const ranges = this.element?.buffered;
    if (!ranges) return [];
    const result: (readonly [number, number])[] = [];
    for (let index = 0; index < ranges.length; index += 1) {
      result.push([ranges.start(index), ranges.end(index)]);
    }
    return result;
  }

}

export const nativeProviderEntry: ProviderEntry = {
  name: "native",
  canPlay(source, { element }) {
    const type = typeOf(source);
    if (!type) return true; // Let the browser try, and fall back on error.
    if (!element) return false;
    return element.canPlayType(type) !== "";
  },
  load: () => Promise.resolve(NativeProvider),
};
