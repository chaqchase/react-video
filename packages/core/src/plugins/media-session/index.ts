import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";

export interface MediaSessionMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

export interface MediaSessionOptions {
  metadata?: MediaSessionMetadata | ((source: SourceObject) => MediaSessionMetadata);
  /** Seconds moved by the system's skip buttons. */
  seekStep?: number;
}

/** A page has one media session, so the player that most recently played owns it. */
let owner: object | null = null;

/** Connects the lock screen, notification, and hardware media keys to the player. */
export const mediaSession = definePlugin("media-session", (options: MediaSessionOptions = {}) => {
  const { seekStep = 10 } = options;
  return {
    setup(context, scope) {
      if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
      const session = navigator.mediaSession;
      const me = context.player;

      const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ["play", () => void context.commands.play()],
        ["pause", () => context.commands.pause()],
        ["seekbackward", (details) =>
          context.commands.seek(context.clock.time() - (details.seekOffset ?? seekStep))],
        ["seekforward", (details) =>
          context.commands.seek(context.clock.time() + (details.seekOffset ?? seekStep))],
        ["seekto", (details) => {
          if (details.seekTime !== undefined && details.seekTime !== null) {
            context.commands.seek(details.seekTime);
          }
        }],
      ];

      const setHandlers = (active: boolean) => {
        for (const [action, handler] of actions) {
          // Browsers throw on actions they don't know.
          try {
            session.setActionHandler(action, active ? handler : null);
          } catch {
            // That action just stays unavailable.
          }
        }
      };

      const writePosition = () => {
        if (owner !== me) return;
        const { duration, rate } = context.media();
        if (!Number.isFinite(duration) || duration <= 0) return;
        try {
          session.setPositionState({
            duration,
            playbackRate: rate,
            position: Math.min(context.clock.time(), duration),
          });
        } catch {
          // Some browsers reject a position that has drifted just past the duration.
        }
      };

      const claim = () => {
        owner = me;
        setHandlers(true);
        const { source } = context.media();
        const { metadata } = options;
        const value = typeof metadata === "function" && source ? metadata(source) : metadata;
        if (value && typeof value !== "function" && typeof MediaMetadata !== "undefined") {
          session.metadata = new MediaMetadata(value);
        }
        writePosition();
      };

      context.watch(scope, (media) => media.paused, (paused) => {
        if (!paused && owner !== me) claim();
        if (owner === me) session.playbackState = paused ? "paused" : "playing";
      });
      context.watch(
        scope,
        ({ duration, rate, seeking }) => `${duration}|${rate}|${seeking}`,
        writePosition
      );
      scope.add(() => {
        if (owner !== me) return;
        owner = null;
        setHandlers(false);
        session.metadata = null;
        session.playbackState = "none";
      });
    },
  };
});
