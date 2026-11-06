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
  /** Lock touch devices to landscape while in fullscreen. Defaults to true. */
  lockOrientation?: boolean;
}

const elementIn = () => {
  const page = document as WebkitDocument;
  return page.fullscreenElement ?? page.webkitFullscreenElement ?? null;
};

/** Fullscreen on the player's root, or the video itself on iPhones, which allow only that. */
export const fullscreen = definePlugin("fullscreen", (options: FullscreenOptions = {}) => ({
  state: () => ({
    /** True while the player is in fullscreen. */
    active: false,
    /** True when the browser and page allow fullscreen, known once the player mounts. */
    supported: false,
  }),
  attrs: { "data-fullscreen": (state) => state.active },
  commands(context) {
    const lock = () => {
      if (options.lockOrientation === false) return;
      const video = context.video();
      // Only touch devices lock, and they turn to whichever way the video fills the screen.
      if (!matchMedia("(pointer: coarse)").matches) return;
      const tall = video && video.videoHeight > video.videoWidth;
      (screen.orientation as LockableOrientation | undefined)
        ?.lock?.(tall ? "portrait" : "landscape")
        ?.catch(() => {});
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
      /** Puts the player in fullscreen, or just the video on iPhones. */
      enter,
      /** Leaves fullscreen and releases any orientation lock. */
      exit,
      /** Enters fullscreen, or exits it if already active. */
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
    // False means a page or iframe has turned it off, which this mustn't get around.
    if (
      !context.state().supported &&
      document.fullscreenEnabled !== false &&
      video.webkitEnterFullscreen
    ) {
      context.set({ supported: true });
    }
    scope.on(element, "webkitbeginfullscreen", () => context.set({ active: true }));
    scope.on(element, "webkitendfullscreen", () => context.set({ active: false }));
  },
  slots: { "top-start": Fullscreen },
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
        // The browser can refuse, and there's nothing for the viewer to do about it.
        if (!event.defaultPrevented) void toggle().catch(() => {});
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
