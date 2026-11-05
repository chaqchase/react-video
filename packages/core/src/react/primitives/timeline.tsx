"use client";

import {
  forwardRef,
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { formatTime } from "../../lib/format-time";
import { usePlayer } from "../context";
import { useLabel, useVideoState } from "../hooks";
import { Slot } from "../slot";
import { HIDDEN_INPUT, mergeRefs, useNodeRef } from "./as-child";
import { useSliderGesture } from "./slider-gesture";
import { TimelineContext } from "./timeline-context";
import { canSeek, clampFraction, createTimelineController } from "./timeline-controller";
import { TimelineBuffered } from "./timeline-buffered";
import { TimelineFill } from "./timeline-fill";
import { TimelinePreview } from "./timeline-preview";
import { TimelineThumb } from "./timeline-thumb";
import { TimelineTrack } from "./timeline-track";

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  /** Seconds moved by the arrow keys. */
  step?: number;
  /** Seconds moved by Page Up and Page Down. */
  largeStep?: number;
  children?: ReactNode;
}

/**
 * The seek bar. A real range input provides focus, keyboard, and screen reader
 * support, while the visible track takes pointer input over a larger hit area.
 */
export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  {
    step = 5,
    largeStep = 30,
    children,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    ...props
  },
  ref
) {
  const player = usePlayer();
  const [controller] = useState(() => createTimelineController(player));
  const gesture = useSliderGesture(() => controller.gesture);
  const rootRef = useNodeRef<HTMLDivElement>(controller.setRoot);
  const inputRef = useNodeRef<HTMLInputElement>(controller.setInput);
  const start = useVideoState((media) => media.timeline.start);
  const end = useVideoState((media) => media.timeline.end);
  const enabled = useVideoState(canSeek);
  const label = useLabel("seek", "Seek");
  const of = useLabel("of", "of");

  useEffect(() => {
    controller.setValueText((time) => `${formatTime(time)} ${of} ${formatTime(end)}`);
  }, [controller, end, of]);

  useEffect(() => {
    const unbind = player.clock.bind(controller.write, controller.resolution);
    const unsubscribe = player.subscribe(controller.update);
    return () => {
      unbind();
      unsubscribe();
      controller.dispose();
    };
  }, [controller, player]);

  useEffect(() => {
    const root = controller.root();
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) controller.setWidth(entry.contentRect.width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [controller]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => controller.step(step),
      ArrowUp: () => controller.step(step),
      ArrowLeft: () => controller.step(-step),
      ArrowDown: () => controller.step(-step),
      PageUp: () => controller.step(largeStep),
      PageDown: () => controller.step(-largeStep),
      Home: () => controller.seekTo(controller.range().start),
      End: () => controller.seekTo(controller.range().end),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  };

  const handleHover = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (width > 0) controller.hover(clampFraction((event.clientX - left) / width));
  };

  return (
    <TimelineContext.Provider value={controller}>
      <div
        ref={mergeRefs(rootRef, ref)}
        data-part="timeline"
        data-disabled={enabled ? undefined : ""}
        dir="ltr"
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (!event.defaultPrevented) gesture.onPointerDown(event);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          gesture.onPointerMove(event);
          handleHover(event);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          gesture.onPointerUp(event);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          gesture.onPointerCancel(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          controller.hover(null);
        }}
        {...props}
      >
        <input
          ref={inputRef}
          type="range"
          data-part="timeline-input"
          style={HIDDEN_INPUT}
          aria-label={label}
          min={start}
          max={end}
          step={step}
          defaultValue={0}
          disabled={!enabled}
          onKeyDown={handleKeyDown}
          onChange={(event) => controller.seekTo(Number(event.target.value))}
        />
        {children ?? (
          <>
            <TimelineTrack>
              <TimelineBuffered />
              <TimelineFill />
              <Slot name="timeline-track" />
            </TimelineTrack>
            <TimelineThumb />
            <TimelinePreview>
              <Slot name="timeline-preview" />
            </TimelinePreview>
          </>
        )}
      </div>
    </TimelineContext.Provider>
  );
});
Timeline.displayName = "Video.Timeline";
