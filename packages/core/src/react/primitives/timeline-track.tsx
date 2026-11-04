"use client";

import { forwardRef } from "react";
import type { TimelinePartProps } from "./timeline-context";

export const TimelineTrack = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineTrack(props, ref) {
    return <div ref={ref} data-part="timeline-track" {...props} />;
  }
);
TimelineTrack.displayName = "Video.TimelineTrack";
