"use client";

import { forwardRef } from "react";
import { usePlayer } from "../context";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";

export type MuteProps = ButtonProps;

export const Mute = forwardRef<HTMLButtonElement, MuteProps>(function Mute(
  { onClick, ...props },
  ref
) {
  const level = useVideoState((media) =>
    media.muted || media.volume === 0 ? "muted" : media.volume < 0.5 ? "low" : "high"
  );
  const commands = useCommands();
  const player = usePlayer();
  const mute = useLabel("mute", "Mute");
  const unmute = useLabel("unmute", "Unmute");

  return (
    <Button
      ref={ref}
      data-part="mute"
      data-level={level}
      aria-label={level === "muted" ? unmute : mute}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const { muted, volume } = player.getState().media;
        // Unmuting at zero volume would otherwise look like nothing happened.
        if (volume === 0) commands.setVolume(0.5);
        commands.setMuted(volume === 0 ? false : !muted);
      }}
      {...props}
    />
  );
});
Mute.displayName = "Video.Mute";
