"use client";

import { forwardRef, useCallback, useRef, type HTMLAttributes } from "react";
import { formatTime } from "../../lib/format-time";
import { usePlayer } from "../context";
import { useClock, useVideoState } from "../hooks";
import { mergeRefs } from "./as-child";

const everySecond = () => 1;

export type TimeProps = HTMLAttributes<HTMLSpanElement>;

function useTimeText(format: (time: number, duration: number) => string) {
  const player = usePlayer();
  const element = useRef<HTMLSpanElement | null>(null);
  const write = useCallback(
    (time: number) => {
      const node = element.current;
      if (!node) return;
      const text = format(time, player.getState().media.duration);
      if (node.textContent !== text) node.textContent = text;
    },
    [format, player]
  );
  useClock(write, everySecond);
  return element;
}

const formatCurrent = (time: number, duration: number) => formatTime(time, duration);
const formatRemaining = (time: number, duration: number) =>
  `-${formatTime(Math.max(duration - time, 0), duration)}`;

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

export type RemainingTimeProps = TimeProps;

/** Time left, written to the DOM directly like `CurrentTime`. */
export const RemainingTime = forwardRef<HTMLSpanElement, RemainingTimeProps>(
  function RemainingTime(props, ref) {
    const element = useTimeText(formatRemaining);
    return (
      <span ref={mergeRefs(element, ref)} data-part="remaining-time" {...props}>
        -0:00
      </span>
    );
  }
);
RemainingTime.displayName = "Video.RemainingTime";

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
