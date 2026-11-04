"use client";

import { forwardRef, type ReactNode } from "react";

export const Root = forwardRef<HTMLDivElement, { children?: ReactNode }>(
  function Root({ children }, ref) {
    return (
      <div ref={ref} data-part="root">
        {children}
      </div>
    );
  }
);
Root.displayName = "Video.Root";
