"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useCommands, useVideoState } from "../hooks";

export type PlayPauseProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PlayPause = forwardRef<HTMLButtonElement, PlayPauseProps>(
  function PlayPause({ onClick, children, ...props }, ref) {
    const paused = useVideoState((media) => media.paused);
    const commands = useCommands();

    return (
      <button
        ref={ref}
        type="button"
        data-part="play-pause"
        data-paused={paused ? "" : undefined}
        aria-label={paused ? "Play" : "Pause"}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (paused) void commands.play();
          else commands.pause();
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
PlayPause.displayName = "Video.PlayPause";
