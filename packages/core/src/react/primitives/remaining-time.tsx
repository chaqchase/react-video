"use client";

import { forwardRef } from "react";
import { formatTime } from "../../lib/format-time";
import { mergeRefs } from "./as-child";
import { useTimeText, type TimeProps } from "./use-time-text";

const formatRemaining = (time: number, duration: number) =>
  `−${formatTime(Math.max(duration - time, 0), duration)}`;

export type RemainingTimeProps = TimeProps;

/** Time left, written to the DOM directly like `CurrentTime`. */
export const RemainingTime = forwardRef<HTMLSpanElement, RemainingTimeProps>(
  function RemainingTime(props, ref) {
    const element = useTimeText(formatRemaining);
    return (
      <span ref={mergeRefs(element, ref)} data-part="remaining-time" {...props}>
        −0:00
      </span>
    );
  }
);
RemainingTime.displayName = "Video.RemainingTime";
