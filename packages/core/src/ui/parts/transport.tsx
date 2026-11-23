"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { Slot } from "../../react/slot";
import { PlayPause } from "./play-pause";
import { SeekButton } from "./seek-button";

export interface TransportProps extends HTMLAttributes<HTMLDivElement> {
  /** How far the buttons on either side of play jump, in seconds. */
  seekSeconds?: number;
}

/** The buttons in the centre of the picture: seek back, play, and seek forward. */
export const Transport = forwardRef<HTMLDivElement, TransportProps>(function Transport(
  { seekSeconds = 10, ...props },
  ref
) {
  return (
    <div ref={ref} data-part="transport" {...props}>
      <Slot name="transport-start" />
      <SeekButton seconds={-seekSeconds} />
      <PlayPause />
      <SeekButton seconds={seekSeconds} />
      <Slot name="transport-end" />
    </div>
  );
});
Transport.displayName = "Video.Transport";
