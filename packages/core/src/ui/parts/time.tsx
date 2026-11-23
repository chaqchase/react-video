"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { CurrentTime } from "../../react/primitives/current-time";
import { Duration } from "../../react/primitives/duration";

export type TimeProps = HTMLAttributes<HTMLDivElement>;

/** Current time and duration together. */
export const Time = forwardRef<HTMLDivElement, TimeProps>(function Time(props, ref) {
  return (
    <div ref={ref} data-part="time" {...props}>
      <CurrentTime />
      <span data-part="time-separator" aria-hidden="true">
        /
      </span>
      <Duration />
    </div>
  );
});
Time.displayName = "Video.Time";
