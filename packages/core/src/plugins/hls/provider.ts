import type { ErrorData, HlsConfig, LevelDetails } from "hls.js";
import type Hls from "hls.js";
import type { LoadRequest, Provider } from "../../core/types";
import { NativeProvider } from "../../providers/native/index";
import { toHlsDrm, type DrmConfig } from "../drm/config";

/** Shorter live windows aren't worth a scrubber. */
const DVR_MIN_SECONDS = 60;
const MEDIA_RECOVERIES = 2;
const RECOVERY_WINDOW_MS = 30_000;

export function createHlsProvider(
  Engine: typeof Hls,
  config: Partial<HlsConfig> = {}
): new () => Provider {
  return class HlsProvider extends NativeProvider {
    override readonly name = "hls";
    private engine: Hls | null = null;
    private recoveries: number[] = [];

    override async load(request: LoadRequest) {
      const { element, sink } = this;
      if (!element || !sink) return;
      this.source = request.source;
      // hls.js sees these first and may recover, so it decides what's fatal.
      this.ignoreElementErrors = true;

      const { Events } = Engine;
      const engine = new Engine({
        ...config,
        ...(request.startTime !== undefined && { startPosition: request.startTime }),
        ...(request.drm ? toHlsDrm(request.drm as DrmConfig) : {}),
      });
      // The captions plugin draws cues, so hls.js shouldn't have the browser draw too.
      engine.subtitleDisplay = false;
      this.engine = engine;

      engine.on(Events.MANIFEST_PARSED, () => this.publishLevels());
      engine.on(Events.LEVEL_SWITCHED, () => this.publishQuality());
      engine.on(Events.AUDIO_TRACKS_UPDATED, () => this.publishAudio());
      engine.on(Events.AUDIO_TRACK_SWITCHED, () => this.publishAudio());
      engine.on(Events.LEVEL_UPDATED, (_event, { details }) => this.publishLive(details));
      engine.on(Events.ERROR, (_event, data) => this.handleError(data));
      engine.loadSource(request.source.src);
      engine.attachMedia(element);
    }

    setQuality(id: string | "auto") {
      if (!this.engine) return;
      // nextLevel keeps what's buffered, so switching doesn't stall.
      this.engine.nextLevel = id === "auto" ? -1 : Number(id);
      this.publishQuality(id === "auto" ? undefined : id);
    }

    setAudioTrack(id: string) {
      if (this.engine) this.engine.audioTrack = Number(id);
    }

    override destroy() {
      this.engine?.destroy();
      this.engine = null;
      super.destroy();
    }

    private publishLevels() {
      const levels = this.engine?.levels ?? [];
      this.sink?.update({
        qualities: levels.map(({ height, width, bitrate, name }, index) => ({
          id: String(index),
          label: height ? `${height}p` : name || String(index),
          height,
          width,
          bitrate,
        })),
      });
      this.publishQuality();
    }

    private publishQuality(requested?: string) {
      const { engine } = this;
      if (!engine) return;
      const auto = requested === undefined && engine.autoLevelEnabled;
      const active = requested ?? (engine.currentLevel >= 0 ? String(engine.currentLevel) : null);
      this.sink?.update({
        quality: { mode: auto ? "auto" : "manual", active, canAuto: true },
      });
    }

    private publishAudio() {
      const { engine } = this;
      if (!engine) return;
      this.sink?.update({
        audioTracks: engine.audioTracks.map(({ id, name, lang }) => ({
          id: String(id),
          label: name,
          language: lang,
        })),
        audioTrack: engine.audioTrack >= 0 ? String(engine.audioTrack) : null,
      });
    }

    private publishLive(details: LevelDetails) {
      const { engine } = this;
      if (!engine || !details.live) return;
      const start = details.fragmentStart;
      const edge = engine.liveSyncPosition ?? details.edge;
      const dvr = details.totalduration >= DVR_MIN_SECONDS;
      this.sink?.update({
        live: { dvr, start, edge, latency: engine.targetLatency ?? 0 },
        timeline: { start, end: edge, kind: dvr ? "dvr" : "live" },
        capabilities: { ...this.baseCapabilities, seek: dvr, rate: dvr },
      });
    }

    private handleError(data: ErrorData) {
      const { engine } = this;
      if (!engine || !data.fatal) return;
      const { ErrorTypes } = Engine;

      if (data.type === ErrorTypes.MEDIA_ERROR) {
        const now = Date.now();
        this.recoveries = this.recoveries.filter((at) => now - at < RECOVERY_WINDOW_MS);
        if (this.recoveries.length < MEDIA_RECOVERIES) {
          this.recoveries.push(now);
          // The second try is for streams whose audio codec was declared wrongly.
          if (this.recoveries.length === MEDIA_RECOVERIES) engine.swapAudioCodec();
          engine.recoverMediaError();
          return;
        }
      }

      this.sink?.error({
        code:
          data.type === ErrorTypes.NETWORK_ERROR
            ? "network"
            : data.type === ErrorTypes.MEDIA_ERROR
              ? 3
              : data.details,
        message: data.error?.message || data.details,
        fatal: true,
        source: this.source ?? undefined,
      });
    }
  };
}
