"use client";

import { forwardRef } from "react";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";

export type PlayOverlayProps = ButtonProps;

/** The large button over the video, shown before playback starts and after it ends. */
export const PlayOverlay = forwardRef<HTMLButtonElement, PlayOverlayProps>(
  function PlayOverlay({ onClick, ...props }, ref) {
    const state = useVideoState((media) =>
      media.ended ? "ended" : media.started ? "started" : "ready"
    );
    const commands = useCommands();
    const play = useLabel("play", "Play");
    const replay = useLabel("replay", "Replay");

    return (
      <Button
        ref={ref}
        data-part="play-overlay"
        data-state={state}
        aria-label={state === "ended" ? replay : play}
        // Out of the tab order once it's gone, since it only fades visually.
        tabIndex={state === "started" ? -1 : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) void commands.play();
        }}
        {...props}
      />
    );
  }
);
PlayOverlay.displayName = "Video.PlayOverlay";
