"use client";

import { createContext, useContext, useEffect, type HTMLAttributes } from "react";
import { VideoKitError } from "../../core/kit-error";
import type { PreviewListener, TimelineController } from "./timeline-controller";

export const TimelineContext = createContext<TimelineController | null>(null);

export function useTimeline() {
  const controller = useContext(TimelineContext);
  if (!controller) {
    throw new VideoKitError("part-outside-timeline", "react-video-kit: this part must be inside <Video.Timeline>.");
  }
  return controller;
}

export type TimelinePartProps = HTMLAttributes<HTMLDivElement>;

/** Calls `listener` with the time under the pointer, or null when there is none. */
export function useTimelinePreview(listener: PreviewListener) {
  const controller = useTimeline();
  useEffect(() => controller.addPreview(listener), [controller, listener]);
}
