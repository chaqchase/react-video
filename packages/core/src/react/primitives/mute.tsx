"use client";

import { forwardRef, type CSSProperties } from "react";
import { usePlayer } from "../context";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";

export type MuteProps = ButtonProps;

export const Mute = forwardRef<HTMLButtonElement, MuteProps>(function Mute(
  { onClick, style, ...props },
  ref
) {
  const level = useVideoState((media) =>
    media.muted || media.volume === 0 ? "muted" : media.volume < 0.5 ? "low" : "high"
  );
  // The speaker's waves read this, so a skin can follow the level without any more state.
  const volume = useVideoState((media) => (media.muted ? 0 : media.volume));
  const commands = useCommands();
  const player = usePlayer();
  const mute = useLabel("mute", "Mute");
  const unmute = useLabel("unmute", "Unmute");

  return (
    <Button
      ref={ref}
      data-part="mute"
      data-level={level}
      style={{ "--rv-volume": volume, ...style } as CSSProperties}
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
