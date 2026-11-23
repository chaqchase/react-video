import { definePlugin } from "../../core/plugin";
import type { MediaErrorInfo, MediaState } from "../../core/types";

export type AnalyticsEventType =
  | "load"
  | "ready"
  | "start"
  | "play"
  | "pause"
  | "seek"
  | "progress"
  | "rebuffer-start"
  | "rebuffer-end"
  | "quality-change"
  | "ended"
  | "error"
  | "heartbeat";

export interface AnalyticsEvent {
  /** What happened. */
  type: AnalyticsEventType;
  /** Playback position when it happened, in seconds. */
  position: number;
  /** The video's length in seconds, which is 0 until known and `Infinity` for a live stream. */
  duration: number;
  /** How far through the video that is, from 0 to 100. A `progress` event gives the mark it passed. */
  percent: number;
  /** URL of the current source, or null when there isn't one. */
  source: string | null;
  /** Milliseconds from load to ready, on `ready`. */
  startupMs?: number;
  /** Milliseconds spent stalled, on `rebuffer-end`. */
  stalledMs?: number;
  /** The new level's id, on `quality-change`. */
  quality?: string | null;
  /** True on `ended` when playback, rather than a seek, carried the video past its last mark. */
  complete?: boolean;
  /** What went wrong, on `error`. */
  error?: MediaState["error"];
}

export interface AnalyticsOptions {
  /** Called with each event as it happens. */
  onEvent(event: AnalyticsEvent): void;
  /** Seconds of playback between heartbeats. 0 turns them off. */
  heartbeat?: number;
  /** The percentages that send a `progress` event once each, as playback passes them. */
  progress?: readonly number[];
}

const PROGRESS = [10, 25, 50, 75];

/** Reports playback as events, for whatever analytics service you use. */
export const analytics = definePlugin("analytics", (options: AnalyticsOptions) => {
  const { onEvent, heartbeat = 30, progress = PROGRESS } = options;
  const lastMark = Math.max(...progress, 0);
  // All of this is about one video, so that retrying it doesn't count twice.
  let viewing: string | null = null;
  let started = false;
  let carriedPastLast = false;
  const passed = new Set<number>();

  return {
    source(_context, { src }) {
      if (src === viewing) return;
      viewing = src;
      started = false;
      carriedPastLast = false;
      passed.clear();
    },
    setup(context, scope) {
      let previous = context.media();
      let loadStart = 0;
      let stallStart = 0;
      let stalled = false;
      let seekStall = false;

      const send = (type: AnalyticsEventType, extra?: Partial<AnalyticsEvent>) => {
        const media = context.media();
        const position = context.clock.time();
        const { duration } = media;
        onEvent({
          type,
          position,
          duration,
          percent: duration > 0 && Number.isFinite(duration) ? Math.min(Math.round((position / duration) * 100), 100) : 0,
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
        // An ad reports itself as started too, but it isn't this video.
        if (media.started && !started && media.timeline.kind !== "ad") {
          started = true;
          send("start");
        }
        // Scrubbing pauses the element, so `paused` already reflects the viewer here.
        if (!media.paused && last.paused) send("play");
        if (media.paused && !last.paused && !media.ended) send("pause");
        if (!media.seeking && last.seeking) send("seek");
        if (media.ended && !last.ended) {
          send("ended", { complete: carriedPastLast });
          // Watching it again has to earn this again.
          carriedPastLast = false;
        }
        if (media.quality.active !== last.quality.active && media.quality.active !== null) {
          send("quality-change", { quality: media.quality.active });
        }

        // A stall caused by seeking is expected, so it isn't counted as a rebuffer. It
        // can outlast the seek itself, since `seeked` comes before playback picks up.
        if (media.seeking) seekStall = true;
        else if (!media.waiting) seekStall = false;
        const stalling = media.waiting && !seekStall && !media.paused && media.started;
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
      scope.add(context.player.onError((error: MediaErrorInfo) => send("error", { error })));

      let reached = context.clock.time();
      scope.add(
        context.clock.bind(
          (time, jumped) => {
            const { duration, ended, timeline } = context.media();
            const from = reached;
            reached = time;
            // A seek jumps, and so does the update at the end, which playback did reach.
            if ((jumped && !ended) || timeline.kind !== "vod" || !(duration > 0)) return;
            const lastAt = (lastMark / 100) * duration;
            if (from <= lastAt && time >= lastAt) carriedPastLast = true;
            for (const mark of progress) {
              const at = (mark / 100) * duration;
              if (passed.has(mark) || from >= at || time < at) continue;
              passed.add(mark);
              send("progress", { percent: mark });
            }
          },
          // A short video has to report often enough for its marks to come in order.
          () => {
            const { duration } = context.media();
            return duration > 0 ? Math.max(Math.min(duration / 20, 1), 0.1) : 1;
          }
        )
      );

      if (heartbeat > 0) {
        let played = 0;
        let last = context.clock.time();
        scope.add(
          context.clock.bind(
            (time, jumped) => {
              // A seek isn't playback, but the viewer's time until then still counts.
              if (!jumped) played += Math.abs(time - last);
              last = time;
              if (played < heartbeat) return;
              played -= heartbeat;
              send("heartbeat");
            },
            () => Math.min(heartbeat, 1)
          )
        );
      }
    },
  };
});
