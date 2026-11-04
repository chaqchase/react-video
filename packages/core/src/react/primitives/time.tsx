"use client";

import { forwardRef, useCallback, useRef, type HTMLAttributes } from "react";
import { formatTime } from "../../lib/format-time";
import { usePlayer } from "../context";
import { useClock } from "../hooks";

const everySecond = () => 1;

export type CurrentTimeProps = HTMLAttributes<HTMLSpanElement>;

/** Current position. Writes to the DOM directly, so playback causes no renders. */
export const CurrentTime = forwardRef<HTMLSpanElement, CurrentTimeProps>(
  function CurrentTime(props, ref) {
    const player = usePlayer();
    const element = useRef<HTMLSpanElement | null>(null);

    const write = useCallback(
      (time: number) => {
        const node = element.current;
        if (!node) return;
        const text = formatTime(time, player.getState().media.duration);
        if (node.textContent !== text) node.textContent = text;
      },
      [player]
    );
    useClock(write, everySecond);

    return (
      <span
        ref={(node) => {
          element.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        data-part="current-time"
        {...props}
      >
        0:00
      </span>
    );
  }
);
CurrentTime.displayName = "Video.CurrentTime";
