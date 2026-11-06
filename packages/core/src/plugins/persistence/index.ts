import { definePlugin } from "../../core/plugin";
import type { autoplay } from "../autoplay/index";
import type { captions } from "../captions/index";

export interface PersistenceOptions {
  /** Prefixes every stored key. Change it to keep separate players apart. */
  key?: string;
  /** Resume each video from where it was left. Defaults to true. */
  resume?: boolean;
  /** Remember volume, mute, speed, and caption language. Defaults to true. */
  preferences?: boolean;
  /** Where to store data. Defaults to localStorage. */
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">;
}

interface Preferences {
  volume: number;
  muted: boolean;
  rate: number;
  captions: string | null;
}

/** Saved positions this close to the start or end aren't worth resuming. */
const MIN_RESUME_SECONDS = 5;
const END_FRACTION = 0.95;
const SAVE_EVERY_SECONDS = 5;

/**
 * Remembers where the viewer was and what they like. Runs only after hydration, so
 * the server and first client render still match.
 */
export const persistence = definePlugin("persistence", (options: PersistenceOptions = {}) => {
  const { key = "rv", resume = true, preferences = true } = options;

  // Storage can throw when blocked, full, or in a private window.
  const read = <Value>(name: string): Value | null => {
    try {
      const store = options.storage ?? localStorage;
      const value = store.getItem(`${key}:${name}`);
      return value === null ? null : (JSON.parse(value) as Value);
    } catch {
      return null;
    }
  };
  const write = (name: string, value: unknown) => {
    try {
      const store = options.storage ?? localStorage;
      if (value === null) store.removeItem(`${key}:${name}`);
      else store.setItem(`${key}:${name}`, JSON.stringify(value));
    } catch {
      // Not remembering is the right failure here.
    }
  };

  return {
    // Captions has to exist first for the saved language to reach it.
    after: ["captions"],
    setup(context, scope) {
      const captionsHandle = context.find<typeof captions>("captions");
      if (preferences) {
        const saved = read<Partial<Preferences>>("preferences");
        if (saved) {
          if (typeof saved.volume === "number") context.commands.setVolume(saved.volume);
          if (typeof saved.muted === "boolean") context.commands.setMuted(saved.muted);
          if (typeof saved.rate === "number") context.commands.setRate(saved.rate);
          if (saved.captions !== undefined) captionsHandle?.commands.prefer(saved.captions);
        }
        const save = () => {
          const { volume, muted, rate } = context.media();
          // Autoplay's fallback mute is the browser's choice, not the viewer's.
          const forced = context.find<typeof autoplay>("autoplay")?.state().mutedFallback;
          write("preferences", {
            volume,
            muted: muted && !forced,
            rate,
            captions: captionsHandle?.state().language ?? null,
          });
        };
        context.watch(
          scope,
          ({ volume, muted, rate }) => `${volume}|${muted}|${rate}`,
          save
        );
        if (captionsHandle) {
          let language = captionsHandle.state().language;
          scope.add(
            context.player.subscribe(() => {
              const next = captionsHandle.state().language;
              if (next === language) return;
              language = next;
              save();
            })
          );
        }
      }

      if (!resume) return;
      const savePosition = () => {
        const { source, duration, timeline, ended } = context.media();
        if (!source || timeline.kind !== "vod" || duration <= 0) return;
        const time = context.clock.time();
        const finished = ended || time / duration >= END_FRACTION;
        const name = `position:${source.src}`;
        if (finished || time < MIN_RESUME_SECONDS) write(name, null);
        else write(name, time);
      };
      scope.add(context.clock.bind(savePosition, () => SAVE_EVERY_SECONDS));
      // The clock stops on pause, and pagehide is the last chance to save.
      context.watch(scope, ({ paused, ended }) => paused || ended, savePosition);
      if (typeof window !== "undefined") scope.on(window, "pagehide", savePosition);
    },
    gates: {
      load(request, next) {
        if (!resume || request.startTime !== undefined) return next(request);
        const time = read<number>(`position:${request.source.src}`);
        return next(typeof time === "number" ? { ...request, startTime: time } : request);
      },
    },
  };
});
