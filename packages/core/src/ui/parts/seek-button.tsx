"use client";

import { forwardRef } from "react";
import { SeekButton as PrimitiveSeekButton, type SeekButtonProps } from "../../react/primitives/seek-button";
import { SeekIcon } from "../icons";

export type { SeekButtonProps };

export const SeekButton = forwardRef<HTMLButtonElement, SeekButtonProps>(function SeekButton(
  { children, ...props },
  ref
) {
  return (
    <PrimitiveSeekButton ref={ref} {...props}>
      {children ?? <SeekIcon seconds={props.seconds} />}
    </PrimitiveSeekButton>
  );
});
SeekButton.displayName = "Video.SeekButton";
