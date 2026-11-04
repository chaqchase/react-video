"use client";

import { forwardRef, type HTMLAttributes } from "react";

export type ControlsProps = HTMLAttributes<HTMLDivElement>;

/** Holds the controls. Stays mounted while hidden, so Tab can reveal it. */
export const Controls = forwardRef<HTMLDivElement, ControlsProps>(function Controls(
  props,
  ref
) {
  return <div ref={ref} data-part="controls" {...props} />;
});
Controls.displayName = "Video.Controls";
