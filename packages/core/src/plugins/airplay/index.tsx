"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { AirPlayIcon } from "../../ui/icons";

type AirPlayVideo = HTMLVideoElement & {
  webkitShowPlaybackTargetPicker?: () => void;
  webkitCurrentPlaybackTargetIsWireless?: boolean;
};
type AvailabilityEvent = Event & { availability?: string };

/**
 * AirPlay through Safari's own picker. Plays natively, so it works with the native
 * HLS that the hls plugin uses on Apple devices but not with `preferEngine`.
 */
export const airplay = definePlugin("airplay", () => ({
  state: () => ({
    /** True when Safari has found a device to send to. */
    available: false,
    /** True while the video is playing on an AirPlay device. */
    active: false,
  }),
  attrs: { "data-airplay": (state) => state.active },
  commands: (context) => ({
    /** Opens the picker. Must run from a click or key press. */
    prompt() {
      (context.video() as AirPlayVideo | null)?.webkitShowPlaybackTargetPicker?.();
    },
  }),
  attach(context, element, scope) {
    const video = element as AirPlayVideo;
    if (!video.webkitShowPlaybackTargetPicker) return;
    scope.on(video, "webkitplaybacktargetavailabilitychanged", ((event: AvailabilityEvent) => {
      context.set({ available: event.availability === "available" });
    }) as EventListener);
    scope.on(video, "webkitcurrentplaybacktargetiswirelesschanged", () => {
      context.set({ active: video.webkitCurrentPlaybackTargetIsWireless === true });
    });
  },
  slots: { "top-start": AirPlayButton },
}));

export type AirPlayButtonProps = ButtonProps;

/** Renders nothing unless Safari has found a device to send to. */
export const AirPlayButton = forwardRef<HTMLButtonElement, AirPlayButtonProps>(
  function AirPlayButton({ onClick, children, ...props }, ref) {
    const available = useVideoState(airplay, (state) => state.available);
    const active = useVideoState(airplay, (state) => state.active);
    const { prompt } = useCommands(airplay);
    const label = useLabel("airplay", "AirPlay");
    if (!available) return null;
    return (
      <Button
        ref={ref}
        data-part="airplay"
        aria-label={label}
        aria-pressed={active}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) prompt();
        }}
        {...props}
      >
        {children ?? <AirPlayIcon />}
      </Button>
    );
  }
);
AirPlayButton.displayName = "Video.AirPlayButton";
