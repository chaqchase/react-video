"use client";

import { forwardRef } from "react";
import { formatTime } from "../../lib/format-time";
import { mergeRefs } from "./as-child";
import { useTimeText, type TimeProps } from "./use-time-text";

const formatCurrent = (time: number, duration: number) => formatTime(time, duration);

export type CurrentTimeProps = TimeProps;

/** Current position. Writes to the DOM directly, so playback causes no renders. */
export const CurrentTime = forwardRef<HTMLSpanElement, CurrentTimeProps>(
  function CurrentTime(props, ref) {
    const element = useTimeText(formatCurrent);
    return (
      <span ref={mergeRefs(element, ref)} data-part="current-time" {...props}>
        0:00
      </span>
    );
  }
);
CurrentTime.displayName = "Video.CurrentTime";
