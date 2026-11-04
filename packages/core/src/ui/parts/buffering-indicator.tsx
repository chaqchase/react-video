"use client";

import { forwardRef } from "react";
import { BufferingIndicator as PrimitiveBuffering, type BufferingIndicatorProps } from "../../react/primitives/buffering";
import { SpinnerIcon } from "../icons";

export const BufferingIndicator = forwardRef<HTMLDivElement, BufferingIndicatorProps>(
  function BufferingIndicator({ children, ...props }, ref) {
    return (
      <PrimitiveBuffering ref={ref} {...props}>
        {children ?? <SpinnerIcon />}
      </PrimitiveBuffering>
    );
  }
);
BufferingIndicator.displayName = "Video.BufferingIndicator";
