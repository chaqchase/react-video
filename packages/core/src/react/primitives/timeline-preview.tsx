"use client";

import { forwardRef, useEffect, useState, type ReactNode } from "react";
import { formatTime } from "../../lib/format-time";
import { useVideoState } from "../hooks";
import { mergeRefs, useNodeRef } from "./as-child";
import { useTimeline, type TimelinePartProps } from "./timeline-context";

export interface TimelinePreviewProps extends TimelinePartProps {
  /** Shown above the time, such as a thumbnail. */
  children?: ReactNode;
}

/** Follows the pointer with the time under it, staying inside the track. */
export const TimelinePreview = forwardRef<HTMLDivElement, TimelinePreviewProps>(
  function TimelinePreview({ children, ...props }, ref) {
    const controller = useTimeline();
    const duration = useVideoState((media) => media.duration);
    const [state] = useState(() => {
      let box: HTMLElement | null = null;
      let text: HTMLElement | null = null;
      return {
        setBox: (node: HTMLElement | null) => {
          box = node;
        },
        setText: (node: HTMLElement | null) => {
          text = node;
        },
        write(time: number | null, fraction: number, total: number) {
          if (!box) return;
          box.toggleAttribute("data-visible", time !== null);
          if (time === null) return;
          if (text) text.textContent = formatTime(time, total);
          const parent = box.parentElement;
          const trackWidth = parent?.clientWidth ?? 0;
          const half = box.offsetWidth / 2;
          const x = Math.min(
            Math.max(fraction * trackWidth, half),
            Math.max(trackWidth - half, half)
          );
          box.style.transform = `translateX(${x}px) translateX(-50%)`;
        },
      };
    });
    const box = useNodeRef<HTMLDivElement>(state.setBox);
    const text = useNodeRef<HTMLSpanElement>(state.setText);
    useEffect(
      () =>
        controller.addPreview((time, fraction) => state.write(time, fraction, duration)),
      [controller, duration, state]
    );

    return (
      <div
        ref={mergeRefs(box, ref)}
        data-part="timeline-preview"
        aria-hidden="true"
        {...props}
      >
        {children}
        <span ref={text} data-part="timeline-preview-time" />
      </div>
    );
  }
);
TimelinePreview.displayName = "Video.TimelinePreview";
