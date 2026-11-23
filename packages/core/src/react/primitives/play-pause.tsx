"use client";

import { forwardRef } from "react";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";

export type PlayPauseProps = ButtonProps;

export const PlayPause = forwardRef<HTMLButtonElement, PlayPauseProps>(
  function PlayPause({ onClick, ...props }, ref) {
    const state = useVideoState((media) =>
      media.ended ? "ended" : media.paused ? "paused" : "playing"
    );
    const commands = useCommands();
    const play = useLabel("play", "Play");
    const pause = useLabel("pause", "Pause");
    const replay = useLabel("replay", "Replay");

    return (
      <Button
        ref={ref}
        data-part="play-pause"
        data-state={state}
        aria-label={state === "playing" ? pause : state === "ended" ? replay : play}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;
          if (state === "playing") commands.pause();
          else void commands.play();
        }}
        {...props}
      />
    );
  }
);
PlayPause.displayName = "Video.PlayPause";
