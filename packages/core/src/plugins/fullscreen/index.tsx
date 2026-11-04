"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { FullscreenEnterIcon, FullscreenExitIcon } from "../../ui/icons";

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};
type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
};
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
};

export interface FullscreenOptions {
  /** Lock phones to landscape while in fullscreen. Defaults to true. */
  lockOrientation?: boolean;
}

const elementIn = () => {
  const page = document as WebkitDocument;
  return page.fullscreenElement ?? page.webkitFullscreenElement ?? null;
};

/** Fullscreen on the player's root, or the video itself on iPhones, which allow only that. */
export const fullscreen = definePlugin("fullscreen", (options: FullscreenOptions = {}) => ({
  state: () => ({ active: false, supported: false }),
  attrs: { "data-fullscreen": (state) => state.active },
  commands(context) {
    const lock = () => {
      if (options.lockOrientation === false) return;
      const video = context.video();
      // Only phones lock, and only videos that fill a landscape screen better.
      if (!matchMedia("(pointer: coarse)").matches) return;
      if (video && video.videoHeight > video.videoWidth) return;
      (screen.orientation as LockableOrientation | undefined)?.lock?.("landscape")?.catch(() => {});
    };
    const enter = async () => {
      const root = context.root() as WebkitElement | null;
      const video = context.video() as WebkitVideo | null;
      if (root?.requestFullscreen) await root.requestFullscreen();
      else if (root?.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      else video?.webkitEnterFullscreen?.();
      lock();
    };
    const exit = async () => {
      const page = document as WebkitDocument;
      if (elementIn()) await (page.exitFullscreen?.() ?? page.webkitExitFullscreen?.());
      else (context.video() as WebkitVideo | null)?.webkitExitFullscreen?.();
      screen.orientation?.unlock?.();
    };
    return {
      enter,
      exit,
      toggle: () => (context.state().active ? exit() : enter()),
    };
  },
  setup(context, scope) {
    const root = context.root();
    if (!root) return;
    const sync = () => {
      const active = elementIn() === root;
      context.set({ active });
      if (!active) screen.orientation?.unlock?.();
    };
    scope.on(document, "fullscreenchange", sync);
    scope.on(document, "webkitfullscreenchange", sync);
    context.set({
      supported: Boolean(
        document.fullscreenEnabled ??
          (root as WebkitElement).webkitRequestFullscreen
      ),
    });
  },
  attach(context, element, scope) {
    const video = element as WebkitVideo;
    if (!context.state().supported && video.webkitEnterFullscreen) {
      context.set({ supported: true });
    }
    scope.on(element, "webkitbeginfullscreen", () => context.set({ active: true }));
    scope.on(element, "webkitendfullscreen", () => context.set({ active: false }));
  },
  slots: { "controls-end": Fullscreen },
}));

export type FullscreenProps = ButtonProps;

/** Renders nothing where fullscreen isn't available. */
export const Fullscreen = forwardRef<HTMLButtonElement, FullscreenProps>(function Fullscreen(
  { onClick, children, ...props },
  ref
) {
  const active = useVideoState(fullscreen, (state) => state.active);
  const supported = useVideoState(fullscreen, (state) => state.supported);
  const { toggle } = useCommands(fullscreen);
  const enter = useLabel("fullscreen", "Fullscreen");
  const exit = useLabel("exitFullscreen", "Exit fullscreen");
  if (!supported) return null;
  return (
    <Button
      ref={ref}
      data-part="fullscreen"
      data-state={active ? "active" : "inactive"}
      aria-label={active ? exit : enter}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void toggle();
      }}
      {...props}
    >
      {children ?? (
        <>
          <FullscreenEnterIcon data-show="inactive" />
          <FullscreenExitIcon data-show="active" />
        </>
      )}
    </Button>
  );
});
Fullscreen.displayName = "Video.Fullscreen";
