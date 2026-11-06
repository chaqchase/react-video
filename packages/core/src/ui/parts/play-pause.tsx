"use client";

import { forwardRef } from "react";
import { PlayPause as PrimitivePlayPause, type PlayPauseProps } from "../../react/primitives/play-pause";
import { PauseIcon, PlayIcon, ReplayIcon } from "../icons";

/** Icons stack in one grid cell, so the skin can cross-fade between states. */
export const PlayPause = forwardRef<HTMLButtonElement, PlayPauseProps>(function PlayPause(
  { children, ...props },
  ref
) {
  return (
    <PrimitivePlayPause ref={ref} {...props}>
      {children ?? (
        <>
          <PlayIcon data-show="paused" />
          <PauseIcon data-show="playing" />
          <ReplayIcon data-show="ended" />
        </>
      )}
    </PrimitivePlayPause>
  );
});
PlayPause.displayName = "Video.PlayPause";
