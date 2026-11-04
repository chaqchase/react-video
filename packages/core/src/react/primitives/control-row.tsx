"use client";

import { forwardRef, type HTMLAttributes } from "react";

export type ControlRowProps = HTMLAttributes<HTMLDivElement>;

export const ControlRow = forwardRef<HTMLDivElement, ControlRowProps>(
  function ControlRow(props, ref) {
    return <div ref={ref} data-part="control-row" {...props} />;
  }
);
ControlRow.displayName = "Video.ControlRow";
