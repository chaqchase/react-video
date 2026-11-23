"use client";

import { forwardRef } from "react";
import { useNodeRef } from "./as-child";
import { useTimeline, type TimelinePartProps } from "./timeline-context";

/** The rail spans the track and moves as a whole, so percentages need no measuring. */
export const TimelineThumb = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineThumb(props, ref) {
    const rail = useNodeRef<HTMLDivElement>(useTimeline().setRail);
    return (
      <div
        ref={rail}
        data-part="timeline-rail"
      >
        <div ref={ref} data-part="timeline-thumb" {...props} />
      </div>
    );
  }
);
TimelineThumb.displayName = "Video.TimelineThumb";
