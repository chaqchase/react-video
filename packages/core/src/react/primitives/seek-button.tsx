"use client";

import { forwardRef } from "react";
import { usePlayer } from "../context";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";
import { canSeek } from "./timeline-controller";

export interface SeekButtonProps extends ButtonProps {
  /** Seconds to move. Negative goes back. */
  seconds: number;
}

/** Jumps by a fixed amount. Disabled wherever seeking is, such as during an ad. */
export const SeekButton = forwardRef<HTMLButtonElement, SeekButtonProps>(function SeekButton(
  { seconds, onClick, ...props },
  ref
) {
  const player = usePlayer();
  const commands = useCommands();
  const enabled = useVideoState(canSeek);
  const back = useLabel("seekBack", "Back {seconds} seconds");
  const forward = useLabel("seekForward", "Forward {seconds} seconds");
  const label = (seconds < 0 ? back : forward).replace("{seconds}", String(Math.abs(seconds)));

  return (
    <Button
      ref={ref}
      data-part="seek-button"
      data-direction={seconds < 0 ? "back" : "forward"}
      aria-label={label}
      aria-disabled={enabled ? undefined : true}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !enabled) return;
        commands.seek(player.clock.time() + seconds);
      }}
      {...props}
    />
  );
});
SeekButton.displayName = "Video.SeekButton";
