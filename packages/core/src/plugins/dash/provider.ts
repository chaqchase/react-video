import type { MediaInfo, MediaPlayerClass, MediaPlayerSettingClass } from "dashjs";
import type { KnownVideoErrorCode, LoadRequest, Provider } from "../../core/types";
import { mediaErrorInfo, NativeProvider } from "../../providers/native/index";
import { toDashDrm, type DrmConfig } from "../drm/config";

export interface DashLibrary {
  MediaPlayer(): { create(): MediaPlayerClass };
}

/** Shorter live windows aren't worth a scrubber. */
const DVR_MIN_SECONDS = 60;
const LIVE_POLL_MS = 2000;

// dash.js's numbers. Below 6 they're the element's own, which it hands on.
const CODES: Record<number, KnownVideoErrorCode> = {
  10: "dash-manifest-invalid",
  11: "dash-manifest",
  12: "dash-network",
  15: "dash-segment",
  16: "dash-time-sync",
  17: "dash-segment",
  18: "dash-segment",
  19: "dash-network",
  20: "dash-media",
  21: "dash-media",
  22: "dash-media",
  23: "dash-unsupported",
  24: "drm-unsupported",
  25: "dash-manifest",
  26: "dash-segment",
  27: "dash-segment",
  28: "dash-segment",
  29: "dash-network",
  31: "dash-manifest-invalid",
  32: "dash-manifest-invalid",
  33: "dash-captions",
  34: "dash-manifest-invalid",
  35: "dash-unsupported",
  36: "drm-session",
  100: "drm-session",
  101: "drm-session",
  102: "drm-session",
  103: "drm-session",
  104: "drm-output-restricted",
  105: "drm-session",
  106: "drm-session",
  107: "drm-session",
  108: "drm-session",
  109: "drm-certificate",
  110: "drm-expired",
  111: "drm-config",
  112: "drm-unsupported",
  113: "drm-session",
  114: "drm-license",
};

const RETRYABLE = new Set<string>([
  "dash-manifest",
  "dash-segment",
  "dash-network",
  "drm-certificate",
  "drm-license",
]);

// dash.js carries on after these: without captions, or with the manifest's timing.
const NOTICES = new Set<string>(["dash-captions", "dash-time-sync"]);

const trackId = ({ id, index, lang }: MediaInfo) => String(id ?? lang ?? index);
const textTrackId = ({ id, index }: MediaInfo) => String(id ?? index);
const labelOf = ({ labels, lang }: MediaInfo) => labels?.[0]?.text ?? lang ?? undefined;

export function createDashProvider(
  library: DashLibrary,
  settings: MediaPlayerSettingClass = {}
): new () => Provider {
  return class DashProvider extends NativeProvider {
    override readonly name = "dash";
    private engine: MediaPlayerClass | null = null;
    private manual: string | null = null;
    private livePoll: ReturnType<typeof setInterval> | undefined;

    override async load(request: LoadRequest) {
      const { element, sink } = this;
      if (!element || !sink) return;
      this.source = request.source;
      // dash.js sees these first and reports them, so it decides what's fatal.
      this.ignoreElementErrors = true;

      const engine = library.MediaPlayer().create();
      this.engine = engine;
      // Captions stay off until asked for, as they do with every other provider.
      engine.updateSettings({ streaming: { text: { defaultEnabled: false } } });
      engine.updateSettings(settings);
      if (request.drm) engine.setProtectionData(toDashDrm(request.drm as DrmConfig));

      engine.on("streamInitialized", () => {
        this.publishLevels();
        this.publishAudio();
        this.watchLive();
      });
      engine.on("allTextTracksAdded", () => {
        const tracks = engine.getTracksFor("text");
        // It creates these showing, which would have the browser draw them as well.
        const list = element.textTracks;
        for (let index = list.length - tracks.length; index < list.length; index += 1) {
          const track = list[index];
          if (track) track.mode = "disabled";
        }
        sink.update({
          textTracks: tracks.map((track) => ({
            id: textTrackId(track),
            // The element's own label can read "null" when the manifest gives nothing.
            label: labelOf(track) ?? textTrackId(track),
            language: track.lang ?? undefined,
          })),
        });
      });
      engine.on("qualityChangeRendered", (event: { mediaType: string; newRepresentation?: { id: string } }) => {
        if (event.mediaType === "video") this.publishQuality(event.newRepresentation?.id ?? null);
      });
      engine.on("trackChangeRendered", (event: { mediaType: string }) => {
        if (event.mediaType === "audio") this.publishAudio();
      });
      engine.on("error", (event: { error?: { code?: number; message?: string } }) => {
        const nativeCode = event.error?.code ?? 0;
        const message = event.error?.message ?? "The stream could not be played.";
        if (nativeCode > 0 && nativeCode < 6) {
          sink.error(mediaErrorInfo(nativeCode, message, event.error));
          return;
        }
        // Its message is the only place it gives the licence server's response.
        const code = nativeCode === 114 && /\(40[13]\)/.test(message) ? "drm-denied" : (CODES[nativeCode] ?? "dash-unknown");
        sink.error({
          code,
          message,
          fatal: !NOTICES.has(code),
          retryable: RETRYABLE.has(code),
          nativeCode,
          cause: event.error,
        });
      });

      if (request.startTime === undefined) {
        engine.initialize(element, request.source.src, false);
      } else {
        engine.initialize(element, request.source.src, false, request.startTime);
      }
    }

    setQuality(id: string | "auto") {
      const { engine } = this;
      if (!engine) return;
      const auto = id === "auto";
      this.manual = auto ? null : id;
      engine.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: auto } } } });
      // Replacing what's buffered makes a viewer's choice show right away.
      if (!auto) engine.setRepresentationForTypeById("video", id, true);
      this.publishQuality(auto ? engine.getCurrentRepresentationForType("video")?.id ?? null : id);
    }

    setAudioTrack(id: string) {
      const { engine } = this;
      const track = engine?.getTracksFor("audio").find((candidate) => trackId(candidate) === id);
      if (track) engine?.setCurrentTrack(track);
    }

    setTextTrack(id: string | null) {
      const { engine } = this;
      if (!engine) return;
      engine.enableText(id !== null);
      if (id === null) return;
      const index = engine.getTracksFor("text").findIndex((track) => textTrackId(track) === id);
      if (index !== -1) engine.setTextTrack(index);
    }

    override destroy() {
      clearInterval(this.livePoll);
      this.engine?.destroy();
      this.engine = null;
      super.destroy();
    }

    private publishLevels() {
      const { engine } = this;
      if (!engine) return;
      this.sink?.update({
        qualities: engine.getRepresentationsByType("video").map((level) => ({
          id: level.id,
          label: level.height ? `${level.height}p` : level.id,
          height: level.height,
          width: level.width,
          bitrate: level.bandwidth,
        })),
      });
      this.publishQuality(engine.getCurrentRepresentationForType("video")?.id ?? null);
    }

    private publishQuality(active: string | null) {
      this.sink?.update({
        quality: { mode: this.manual === null ? "auto" : "manual", active, canAuto: true },
      });
    }

    private publishAudio() {
      const { engine } = this;
      if (!engine) return;
      const current = engine.getCurrentTrackFor("audio");
      this.sink?.update({
        audioTracks: engine.getTracksFor("audio").map((track) => ({
          id: trackId(track),
          label: labelOf(track),
          language: track.lang ?? undefined,
        })),
        audioTrack: current ? trackId(current) : null,
      });
    }

    private watchLive() {
      const { engine } = this;
      if (!engine?.isDynamic()) return;
      const publish = () => {
        if (!this.engine) return;
        const { start, end, size } = this.engine.getDvrWindow();
        const dvr = size >= DVR_MIN_SECONDS;
        this.sink?.update({
          live: { dvr, start, edge: end, latency: this.engine.getTargetLiveDelay() },
          timeline: { start, end, kind: dvr ? "dvr" : "live" },
          capabilities: { ...this.baseCapabilities, seek: dvr, rate: dvr },
        });
      };
      publish();
      clearInterval(this.livePoll);
      this.livePoll = setInterval(publish, LIVE_POLL_MS);
    }
  };
}
