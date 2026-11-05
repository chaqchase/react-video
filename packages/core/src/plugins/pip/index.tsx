"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { PipIcon } from "../../ui/icons";

type WebkitVideo = HTMLVideoElement & {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
};

/** Picture-in-picture, through the standard API or Safari's presentation modes. */
export const pip = definePlugin("pip", () => ({
  state: () => ({ active: false, supported: false }),
  attrs: { "data-pip": (state) => state.active },
  commands(context) {
    const enter = async () => {
      const video = context.video() as WebkitVideo | null;
      if (!video) return;
      if (video.requestPictureInPicture && document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      } else {
        video.webkitSetPresentationMode?.("picture-in-picture");
      }
    };
    const exit = async () => {
      const video = context.video() as WebkitVideo | null;
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else video?.webkitSetPresentationMode?.("inline");
    };
    return {
      enter,
      exit,
      toggle: () => (context.state().active ? exit() : enter()),
    };
  },
  attach(context, element, scope) {
    const video = element as WebkitVideo;
    context.set({
      supported:
        !video.disablePictureInPicture &&
        (Boolean(document.pictureInPictureEnabled) ||
          Boolean(video.webkitSupportsPresentationMode?.("picture-in-picture"))),
    });
    scope.on(element, "enterpictureinpicture", () => context.set({ active: true }));
    scope.on(element, "leavepictureinpicture", () => context.set({ active: false }));
    scope.on(element, "webkitpresentationmodechanged", () =>
      context.set({ active: video.webkitPresentationMode === "picture-in-picture" })
    );
    scope.add(() => {
      if (document.pictureInPictureElement === element) {
        void document.exitPictureInPicture();
      }
    });
  },
  slots: { "controls-end": Pip },
}));

export type PipProps = ButtonProps;

/** Renders nothing where picture-in-picture isn't available. */
export const Pip = forwardRef<HTMLButtonElement, PipProps>(function Pip(
  { onClick, children, ...props },
  ref
) {
  const active = useVideoState(pip, (state) => state.active);
  const supported = useVideoState(pip, (state) => state.supported);
  const { toggle } = useCommands(pip);
  const enter = useLabel("pip", "Picture in picture");
  const exit = useLabel("exitPip", "Exit picture in picture");
  if (!supported) return null;
  return (
    <Button
      ref={ref}
      data-part="pip"
      data-state={active ? "active" : "inactive"}
      aria-label={active ? exit : enter}
      onClick={(event) => {
        onClick?.(event);
        // The browser can refuse, and there's nothing for the viewer to do about it.
        if (!event.defaultPrevented) void toggle().catch(() => {});
      }}
      {...props}
    >
      {children ?? <PipIcon />}
    </Button>
  );
});
Pip.displayName = "Video.Pip";
