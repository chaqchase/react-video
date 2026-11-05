"use client";

import { useEffect, useRef } from "react";
import { definePlugin } from "../../core/plugin";
import { usePlayer } from "../../react/context";
import type { fullscreen } from "../fullscreen/index";

const DOUBLE_TAP_MS = 280;
const MOVE_TOLERANCE_PX = 10;
const DOUBLE_TAP_PX = 48;

export interface GesturesOptions {
  /** Seconds moved by a double tap. */
  seekStep?: number;
}

type SeekListener = (direction: -1 | 1, seconds: number) => void;

/**
 * Mouse clicks on the video toggle play and double clicks toggle fullscreen. On
 * touch, the `idle` plugin handles single taps, and a double tap seeks.
 */
export const gestures = definePlugin("gestures", (options: GesturesOptions = {}) => {
  const { seekStep = 10 } = options;
  const listeners = new Set<SeekListener>();

  return {
    commands: () => ({
      /** Listens for double-tap seeks, to show feedback. */
      onSeek(listener: SeekListener) {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    }),
    setup(context, scope) {
      const root = context.root();
      if (!root) return;
      let lastTap = { time: -Infinity, x: 0 };
      let lastPointer = "";
      let clickTimer: ReturnType<typeof setTimeout> | undefined;
      let start: { x: number; y: number } | null = null;

      const onVideo = (event: Event) =>
        (event.target as Element).closest('[data-part="media"]') !== null;

      const togglePlay = () => {
        const { paused, ended } = context.media();
        if (paused || ended) void context.commands.play();
        else context.commands.pause();
      };

      scope.on(root, "pointerdown", ((event: PointerEvent) => {
        start = onVideo(event) ? { x: event.clientX, y: event.clientY } : null;
      }) as EventListener);

      scope.on(root, "pointerup", ((event: PointerEvent) => {
        lastPointer = event.pointerType;
        if (!start || event.button !== 0 || !onVideo(event)) return;
        const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
        start = null;
        if (moved > MOVE_TOLERANCE_PX) return;

        if (event.pointerType === "touch") {
          const now = performance.now();
          const close = Math.abs(event.clientX - lastTap.x) <= DOUBLE_TAP_PX;
          if (close && now - lastTap.time < DOUBLE_TAP_MS) {
            lastTap = { time: -Infinity, x: 0 };
            if (context.isLocked("seek") || !context.media().capabilities.seek) return;
            const { left, width } = root.getBoundingClientRect();
            const direction = event.clientX - left < width / 2 ? -1 : 1;
            context.commands.seek(context.clock.time() + direction * seekStep);
            for (const listener of listeners) listener(direction, seekStep);
          } else {
            lastTap = { time: now, x: event.clientX };
          }
          return;
        }

        // A click waits briefly, so a double click doesn't also flip play twice.
        if (clickTimer === undefined) {
          clickTimer = setTimeout(() => {
            clickTimer = undefined;
            togglePlay();
          }, context.player.has("fullscreen") ? 200 : 0);
        }
      }) as EventListener);

      scope.on(root, "dblclick", (event) => {
        // Browsers also send this for a double tap, which seeks instead.
        if (lastPointer === "touch" || !onVideo(event) || !context.player.has("fullscreen")) return;
        clearTimeout(clickTimer);
        clickTimer = undefined;
        context.find<typeof fullscreen>("fullscreen")?.commands.toggle().catch(() => {});
      });

      scope.add(() => clearTimeout(clickTimer));
    },
    slots: { overlay: SeekFeedback },
  };
});

/** The ripple that confirms a double-tap seek. */
export function SeekFeedback() {
  const player = usePlayer();
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    return player.plugin(gestures).commands.onSeek((direction, seconds) => {
      node.dataset.direction = direction < 0 ? "back" : "forward";
      if (node.firstElementChild) {
        node.firstElementChild.textContent = `${direction < 0 ? "-" : "+"}${seconds}s`;
      }
      // Re-adding the attribute after a reflow restarts the animation on repeat taps.
      node.removeAttribute("data-active");
      void node.offsetWidth;
      node.setAttribute("data-active", "");
    });
  }, [player]);

  return (
    <div
      ref={element}
      data-part="seek-feedback"
      aria-hidden="true"
      onAnimationEnd={(event) => event.currentTarget.removeAttribute("data-active")}
    >
      <span dir="ltr" />
    </div>
  );
}
SeekFeedback.displayName = "Video.SeekFeedback";
