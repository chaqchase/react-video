"use client";

import { forwardRef } from "react";
import { PlayOverlay as PrimitivePlayOverlay, type PlayOverlayProps } from "../../react/primitives/play-overlay";
import { PlayIcon, ReplayIcon } from "../icons";

export const PlayOverlay = forwardRef<HTMLButtonElement, PlayOverlayProps>(function PlayOverlay(
  { children, ...props },
  ref
) {
  return (
    <PrimitivePlayOverlay ref={ref} {...props}>
      {children ?? (
        <>
          <PlayIcon data-show="ready" />
          <ReplayIcon data-show="ended" />
        </>
      )}
    </PrimitivePlayOverlay>
  );
});
PlayOverlay.displayName = "Video.PlayOverlay";
