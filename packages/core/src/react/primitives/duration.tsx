"use client";

import { forwardRef } from "react";
import { formatTime } from "../../lib/format-time";
import { useVideoState } from "../hooks";
import type { TimeProps } from "./use-time-text";

export type DurationProps = TimeProps;

export const Duration = forwardRef<HTMLSpanElement, DurationProps>(function Duration(
  props,
  ref
) {
  const duration = useVideoState((media) => media.duration);
  return (
    <span ref={ref} data-part="duration" {...props}>
      {formatTime(duration)}
    </span>
  );
});
Duration.displayName = "Video.Duration";
