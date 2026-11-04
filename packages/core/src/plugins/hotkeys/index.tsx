"use client";

import { useEffect, useRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { Player } from "../../core/types";
import { labelFrom } from "../../lib/labels";
import { usePlayer } from "../../react/context";
import type { captions } from "../captions/index";
import type { fullscreen } from "../fullscreen/index";
import type { pip } from "../pip/index";
import type { speed } from "../speed/index";

const FEEDBACK_MS = 700;

export interface HotkeysOptions {
  /** Seconds moved by the arrow keys. */
  seekStep?: number;
  /** Seconds moved by J and L. */
  largeSeekStep?: number;
  /** Change per Up or Down press, from 0 to 1. */
  volumeStep?: number;
}

/** The player whose keys are live when focus is elsewhere on the page. */
let lastUsed: Player | null = null;

const isTyping = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;
  if (!element?.closest) return false;
  const field = element.closest<HTMLInputElement>(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]'
  );
  return field !== null && field.type !== "range";
};

const activates = (target: EventTarget | null) =>
  (target as HTMLElement | null)?.closest?.("button, a[href], summary") != null;

const SLIDER_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

/**
 * A focused slider owns these keys. Stopping propagation can't express this, since
 * Next renders React at the document, where this listener also runs.
 */
const slides = (target: EventTarget | null, key: string) =>
  SLIDER_KEYS.has(key) && (target as HTMLInputElement | null)?.type === "range";

type FeedbackListener = (message: string) => void;

/**
 * Keyboard shortcuts. They work while focus is inside a player, and afterwards for
 * the player last used, until the viewer clicks somewhere else on the page.
 */
export const hotkeys = definePlugin("hotkeys", (options: HotkeysOptions = {}) => {
  const { seekStep = 5, largeSeekStep = 10, volumeStep = 0.05 } = options;
  const listeners = new Set<FeedbackListener>();

  return {
    commands: () => ({
      /** Listens for the message each shortcut shows. */
      onFeedback(listener: FeedbackListener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    setup(context, scope) {
      const root = context.root();
      if (!root) return;
      const { player, commands } = context;
      const label = (key: string, fallback: string) => labelFrom(player, key, fallback);
      const say = (message: string) => {
        for (const listener of listeners) listener(message);
      };

      const seekBy = (delta: number) => {
        commands.seek(context.clock.time() + delta);
        say(`${delta > 0 ? "+" : ""}${delta}s`);
      };
      const changeVolume = (delta: number) => {
        const { volume, muted } = context.media();
        const next = Math.min(Math.max((muted ? 0 : volume) + delta, 0), 1);
        commands.setVolume(next);
        commands.setMuted(next === 0);
        say(`${label("volume", "Volume")} ${Math.round(next * 100)}%`);
      };
      const togglePlay = () => {
        const { paused, ended } = context.media();
        if (paused || ended) {
          void commands.play();
          say(label("play", "Play"));
        } else {
          commands.pause();
          say(label("pause", "Pause"));
        }
      };
      const changeSpeed = (direction: "faster" | "slower") => {
        const handle = context.find<typeof speed>("speed");
        if (!handle) return false;
        handle.commands[direction]();
        say(`${context.media().rate}×`);
        return true;
      };

      const actions: Record<string, () => unknown> = {
        " ": togglePlay,
        k: togglePlay,
        ArrowLeft: () => seekBy(-seekStep),
        ArrowRight: () => seekBy(seekStep),
        j: () => seekBy(-largeSeekStep),
        l: () => seekBy(largeSeekStep),
        ArrowUp: () => changeVolume(volumeStep),
        ArrowDown: () => changeVolume(-volumeStep),
        m: () => {
          const muted = !context.media().muted;
          commands.setMuted(muted);
          say(muted ? label("muted", "Muted") : label("unmuted", "Unmuted"));
        },
        f: () => context.find<typeof fullscreen>("fullscreen")?.commands.toggle().catch(() => {}),
        p: () => context.find<typeof pip>("pip")?.commands.toggle().catch(() => {}),
        c: () => context.find<typeof captions>("captions")?.commands.toggle(),
        ">": () => changeSpeed("faster"),
        "<": () => changeSpeed("slower"),
        Home: () => commands.seek(context.media().timeline.start),
        End: () => commands.seek(context.media().timeline.end),
      };

      scope.on(root, "pointerdown", () => {
        lastUsed = player;
      });
      scope.on(root, "focusin", () => {
        lastUsed = player;
      });
      scope.on(document, "pointerdown", (event) => {
        if (lastUsed === player && !root.contains(event.target as Node)) lastUsed = null;
      });
      scope.add(() => {
        if (lastUsed === player) lastUsed = null;
      });

      scope.on(document, "keydown", ((event: KeyboardEvent) => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        if (isTyping(event.target)) return;
        if (!root.contains(event.target as Node) && lastUsed !== player) return;
        if ((event.key === " " || event.key === "Enter") && activates(event.target)) return;
        if (slides(event.target, event.key)) return;

        const { key } = event;
        if (/^[0-9]$/.test(key)) {
          const { start, end } = context.media().timeline;
          if (end > start) commands.seek(start + ((end - start) * Number(key)) / 10);
          event.preventDefault();
          return;
        }
        const action = actions[key] ?? actions[key.toLowerCase()];
        if (!action) return;
        event.preventDefault();
        action();
      }) as EventListener);
    },
    slots: { overlay: HotkeysFeedback },
  };
});

/** Confirms each shortcut in a brief message, also announced to screen readers. */
export function HotkeysFeedback() {
  const player = usePlayer();
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = player.plugin(hotkeys).commands.onFeedback((message) => {
      node.textContent = message;
      node.setAttribute("data-visible", "");
      clearTimeout(timer);
      timer = setTimeout(() => node.removeAttribute("data-visible"), FEEDBACK_MS);
    });
    return () => {
      stop();
      clearTimeout(timer);
    };
  }, [player]);

  return <div ref={element} data-part="hotkeys-feedback" role="status" />;
}
HotkeysFeedback.displayName = "Video.HotkeysFeedback";
