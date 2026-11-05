"use client";

import { forwardRef, useEffect, useRef } from "react";
import { usePlayer } from "../context";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { mergeRefs } from "./as-child";
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
    const player = usePlayer();
    const button = useRef<HTMLButtonElement | null>(null);

    // This button and the transport's take turns being hidden, so focus goes between them
    // rather than falling to the top of the page.
    useEffect(() => {
      const focused = document.activeElement;
      if (state === "started") {
        if (focused && focused === button.current) {
          player.root()?.querySelector<HTMLElement>('[data-part="play-pause"]')?.focus({ preventScroll: true });
        }
      } else if (focused?.matches('[data-part="play-pause"]') && player.root()?.contains(focused)) {
        button.current?.focus({ preventScroll: true });
      }
    }, [player, state]);

    return (
      <Button
        ref={mergeRefs(button, ref)}
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
