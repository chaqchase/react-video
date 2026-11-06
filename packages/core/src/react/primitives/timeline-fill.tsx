"use client";

import { forwardRef } from "react";
import { mergeRefs, useNodeRef } from "./as-child";
import { useTimeline, type TimelinePartProps } from "./timeline-context";

export const TimelineFill = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineFill(props, ref) {
    const node = useNodeRef<HTMLDivElement>(useTimeline().setFill);
    return (
      <div
        ref={mergeRefs(node, ref)}
        data-part="timeline-fill"
        {...props}
      />
    );
  }
);
TimelineFill.displayName = "Video.TimelineFill";
