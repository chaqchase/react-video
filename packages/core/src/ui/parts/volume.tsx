"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { VolumeSlider } from "../../react/primitives/volume-slider";
import { Mute } from "./mute";

export type VolumeProps = HTMLAttributes<HTMLDivElement>;

/** Mute button and slider, with the slider opening as the pointer arrives. */
export const Volume = forwardRef<HTMLDivElement, VolumeProps>(function Volume(props, ref) {
  return (
    <div ref={ref} data-part="volume" {...props}>
      <Mute />
      <VolumeSlider />
    </div>
  );
});
Volume.displayName = "Video.Volume";
