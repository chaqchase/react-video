"use client";

import { forwardRef, type HTMLAttributes } from "react";

export type ControlGroupProps = HTMLAttributes<HTMLDivElement>;

/** A pill of related controls. */
export const ControlGroup = forwardRef<HTMLDivElement, ControlGroupProps>(
  function ControlGroup(props, ref) {
    return <div ref={ref} data-part="control-group" {...props} />;
  }
);
ControlGroup.displayName = "Video.ControlGroup";
