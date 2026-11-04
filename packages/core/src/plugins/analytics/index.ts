import { definePlugin } from "../../core/plugin";
import type { MediaState } from "../../core/types";

export type AnalyticsEventType =
  | "load"
  | "ready"
  | "play"
  | "pause"
  | "seek"
  | "rebuffer-start"
  | "rebuffer-end"
  | "quality-change"
  | "ended"
  | "error"
  | "heartbeat";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  /** Playback position when it happened, in seconds. */
  position: number;
  source: string | null;
  /** Milliseconds from load to ready, on `ready`. */
  startupMs?: number;
  /** Milliseconds spent stalled, on `rebuffer-end`. */
  stalledMs?: number;
  quality?: string | null;
  error?: MediaState["error"];
}

export interface AnalyticsOptions {
  onEvent(event: AnalyticsEvent): void;
  /** Seconds of playback between heartbeats. 0 turns them off. */
  heartbeat?: number;
}

/** Reports playback as events, for whatever analytics service you use. */
export const analytics = definePlugin("analytics", (options: AnalyticsOptions) => {
  const { onEvent, heartbeat = 30 } = options;
  return {
    setup(context, scope) {
      let previous = context.media();
      let loadStart = 0;
      let stallStart = 0;
      let stalled = false;

      const send = (type: AnalyticsEventType, extra?: Partial<AnalyticsEvent>) => {
        const media = context.media();
        onEvent({
          type,
          position: context.clock.time(),
          source: media.source?.src ?? null,
          ...extra,
        });
      };

      const unsubscribe = context.player.subscribe(() => {
        const media = context.media();
        const last = previous;
        if (media === last) return;
        previous = media;

        if (media.status === "loading" && last.status !== "loading") {
          loadStart = performance.now();
          send("load");
        }
        if (media.status === "ready" && last.status === "loading") {
          send("ready", { startupMs: performance.now() - loadStart });
        }
        // Scrubbing pauses the element, so `paused` already reflects the viewer here.
        if (!media.paused && last.paused) send("play");
        if (media.paused && !last.paused && !media.ended) send("pause");
        if (!media.seeking && last.seeking) send("seek");
        if (media.ended && !last.ended) send("ended");
        if (media.error && media.error !== last.error) send("error", { error: media.error });
        if (media.quality.active !== last.quality.active && media.quality.active !== null) {
          send("quality-change", { quality: media.quality.active });
        }

        // A stall caused by seeking is expected, so it isn't counted as a rebuffer.
        const stalling = media.waiting && !media.seeking && !media.paused && media.started;
        if (stalling && !stalled) {
          stalled = true;
          stallStart = performance.now();
          send("rebuffer-start");
        } else if (!stalling && stalled) {
          stalled = false;
          send("rebuffer-end", { stalledMs: performance.now() - stallStart });
        }
      });
      scope.add(unsubscribe);

      if (heartbeat > 0) {
        let first = true;
        scope.add(
          context.clock.bind(
            () => {
              // Binding writes once immediately, before any playback.
              if (first) first = false;
              else send("heartbeat");
            },
            () => heartbeat
          )
        );
      }
    },
  };
});
