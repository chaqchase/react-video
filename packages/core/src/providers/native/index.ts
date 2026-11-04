import type {
  LoadRequest,
  MediaState,
  Provider,
  ProviderEntry,
  Sink,
  SourceObject,
} from "../../core/types";
import type { Scope } from "../../core/scope";

const HLS_MIME = "application/vnd.apple.mpegurl";
const DASH_MIME = "application/dash+xml";

const MEDIA_ERROR_MESSAGES: Record<number, string> = {
  1: "Playback was aborted.",
  2: "A network error stopped the download.",
  3: "The media could not be decoded.",
  4: "The source isn't supported.",
};

function typeOf(source: SourceObject) {
  if (source.type) return source.type;
  const path = source.src.split(/[?#]/)[0] ?? "";
  if (path.endsWith(".m3u8")) return HLS_MIME;
  if (path.endsWith(".mpd")) return DASH_MIME;
  return null;
}

/** Plays whatever the browser supports directly through the media element. */
export class NativeProvider implements Provider {
  readonly name = "native";
  protected element: HTMLVideoElement | null = null;
  protected sink: Sink | null = null;
  protected source: SourceObject | null = null;
  /** Set while a subclass swaps sources, when load errors aren't fatal. */
  protected switching = false;

  get time() {
    return this.element?.currentTime ?? 0;
  }

  attach(element: HTMLVideoElement | null, sink: Sink, scope: Scope) {
    if (!element) throw new Error("NativeProvider needs a media element.");
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
      sink.update({ seeking: true });
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
      if (this.switching) return;
      const error = element.error;
      sink.error({
        code: error?.code ?? "unknown",
        message:
          error?.message ||
          MEDIA_ERROR_MESSAGES[error?.code ?? 0] ||
          "The source could not be played.",
        fatal: true,
        source: this.source ?? undefined,
      });
    });

    const tracks = element.textTracks;
    if (tracks) {
      const publish = () =>
        sink.update({
          textTracks: this.textTracks(),
          textTrack: this.activeTextTrack(),
        });
      scope.on(tracks, "addtrack", publish);
      scope.on(tracks, "removetrack", publish);
      scope.on(tracks, "change", publish);
    }

    sink.update(this.snapshot());
  }

  async load(request: LoadRequest) {
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
        { once: true }
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
    if (this.element) this.element.playbackRate = rate;
  }

  setTextTrack(id: string | null) {
    const tracks = this.element?.textTracks;
    if (!tracks) return;
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      if (!track) continue;
      const active = this.textTrackId(track, index) === id;
      track.mode = active ? "showing" : "disabled";
    }
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
      textTracks: this.textTracks(),
      textTrack: this.activeTextTrack(),
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

  private textTrackId(track: TextTrack, index: number) {
    return track.id || track.language || track.label || String(index);
  }

  private textTracks() {
    const tracks = this.element?.textTracks;
    if (!tracks) return [];
    const result = [];
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      if (!track) continue;
      result.push({
        id: this.textTrackId(track, index),
        label: track.label,
        language: track.language,
        kind: track.kind,
      });
    }
    return result;
  }

  private activeTextTrack() {
    const tracks = this.element?.textTracks;
    if (!tracks) return null;
    for (let index = 0; index < tracks.length; index += 1) {
      const track = tracks[index];
      if (track?.mode === "showing") return this.textTrackId(track, index);
    }
    return null;
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
