"use client";

import { forwardRef } from "react";
import { mergeRefs, useNodeRef } from "./as-child";
import { useTimeline, type TimelinePartProps } from "./timeline-context";

export const TimelineBuffered = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineBuffered(props, ref) {
    const node = useNodeRef<HTMLDivElement>(useTimeline().setBuffered);
    return (
      <div
        ref={mergeRefs(node, ref)}
        data-part="timeline-buffered"
        {...props}
      />
    );
  }
);
TimelineBuffered.displayName = "Video.TimelineBuffered";
