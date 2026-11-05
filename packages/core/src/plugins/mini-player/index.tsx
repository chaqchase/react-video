"use client";

import { forwardRef, type SVGProps } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";

export interface MiniPlayerOptions {
  /** The corner to float in, where `start` and `end` follow the text direction. */
  corner?: "top-start" | "top-end" | "bottom-start" | "bottom-end";
}

/**
 * Floats a playing video in a corner once it scrolls out of view. The same element
 * moves, so playback never restarts, and an empty slot holds its place in the page.
 */
export const miniPlayer = definePlugin("mini-player", (options: MiniPlayerOptions = {}) => {
  const { corner = "bottom-end" } = options;
  let close = () => {};
  let back = () => {};
  return {
    state: () => ({
      /** True while the video is floating. */
      active: false,
      /** The corner it floats in. */
      corner,
    }),
    attrs: { "data-mini": (state) => (state.active ? state.corner : null) },
    commands: () => ({
      /** Pauses and returns the video to the page. It won't float again until scrolled back to. */
      close: () => close(),
      /** Scrolls back to the video's place in the page, which ends the floating. */
      back: () => back(),
    }),
    setup(context, scope) {
      const root = context.root();
      if (!root || typeof IntersectionObserver === "undefined") return;
      let inView = true;
      let dismissed = false;
      let slot: HTMLElement | null = null;

      const observer = new IntersectionObserver((entries) => {
        inView = entries[entries.length - 1]?.isIntersecting ?? inView;
        update();
      });
      const observe = (target: Element) => {
        observer.disconnect();
        observer.observe(target);
      };

      const enter = () => {
        const { width, height } = root.getBoundingClientRect();
        slot = document.createElement("div");
        slot.setAttribute("data-part", "mini-slot");
        slot.setAttribute("aria-hidden", "true");
        slot.style.width = `${width}px`;
        slot.style.maxWidth = "100%";
        slot.style.aspectRatio = `${width} / ${height}`;
        slot.style.margin = getComputedStyle(root).margin;
        root.before(slot);
        context.set({ active: true });
        observe(slot);
      };
      const exit = () => {
        slot?.remove();
        slot = null;
        context.set({ active: false });
        observe(root);
      };
      const update = () => {
        const { active } = context.state();
        const elsewhere = document.fullscreenElement || document.pictureInPictureElement;
        if (active && elsewhere) {
          exit();
          return;
        }
        if (inView) {
          dismissed = false;
          if (active) exit();
          return;
        }
        const { paused, ended } = context.media();
        if (!active && !dismissed && !elsewhere && !paused && !ended) enter();
      };

      close = () => {
        dismissed = true;
        context.commands.pause();
        if (context.state().active) exit();
      };
      back = () => {
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        slot?.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
      };

      observe(root);
      context.watch(scope, (media) => media.paused, update);
      scope.on(document, "fullscreenchange", update);
      scope.add(() => {
        observer.disconnect();
        close = () => {};
        back = () => {};
        slot?.remove();
        slot = null;
        context.set({ active: false });
      });
    },
    slots: { "top-start": MiniPlayerBack, "top-end": MiniPlayerClose },
  };
});

const glyph = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} satisfies SVGProps<SVGSVGElement>;

export type MiniPlayerButtonProps = ButtonProps;

/** Renders nothing unless the video is floating. */
export const MiniPlayerClose = forwardRef<HTMLButtonElement, MiniPlayerButtonProps>(
  function MiniPlayerClose({ onClick, children, ...props }, ref) {
    const active = useVideoState(miniPlayer, (state) => state.active);
    const { close } = useCommands(miniPlayer);
    const label = useLabel("close", "Close");
    if (!active) return null;
    return (
      <Button
        ref={ref}
        data-part="mini-close"
        aria-label={label}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) close();
        }}
        {...props}
      >
        {children ?? (
          <svg {...glyph}>
            <path d="m6.5 6.500 11 11M17.500 6.500l-11 11" />
          </svg>
        )}
      </Button>
    );
  }
);
MiniPlayerClose.displayName = "Video.MiniPlayerClose";

/** Renders nothing unless the video is floating. */
export const MiniPlayerBack = forwardRef<HTMLButtonElement, MiniPlayerButtonProps>(
  function MiniPlayerBack({ onClick, children, ...props }, ref) {
    const active = useVideoState(miniPlayer, (state) => state.active);
    const { back } = useCommands(miniPlayer);
    const label = useLabel("backToVideo", "Back to video");
    if (!active) return null;
    return (
      <Button
        ref={ref}
        data-part="mini-back"
        aria-label={label}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) back();
        }}
        {...props}
      >
        {children ?? (
          <svg {...glyph}>
            <path d="M9.500 4.500H6.700a2.200 2.200 0 0 0-2.200 2.200v10.600c0 1.200 1 2.200 2.200 2.200h10.600c1.200 0 2.200-1 2.200-2.200v-2.800" />
            <path d="M13.500 4.500h6v6M19.500 4.500l-8 8" />
          </svg>
        )}
      </Button>
    );
  }
);
MiniPlayerBack.displayName = "Video.MiniPlayerBack";
