"use client";

import { forwardRef } from "react";
import { Mute as PrimitiveMute, type MuteProps } from "../../react/primitives/mute";
import { VolumeIcon } from "../icons";

export const Mute = forwardRef<HTMLButtonElement, MuteProps>(function Mute(
  { children, ...props },
  ref
) {
  return (
    <PrimitiveMute ref={ref} {...props}>
      {children ?? <VolumeIcon />}
    </PrimitiveMute>
  );
});
Mute.displayName = "Video.Mute";
