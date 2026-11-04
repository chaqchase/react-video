"use client";

import { forwardRef } from "react";
import type { Player } from "../../core/types";
import { Root as PrimitiveRoot, type RootProps } from "../../react/root";

export type { RootProps };

/** The player root with the default skin. Import `react-video-kit/styles.css` for it. */
export const Root = forwardRef<Player, RootProps>(function Root(
  { className, ...props },
  ref
) {
  return (
    <PrimitiveRoot
      ref={ref}
      className={className ? `rv-root ${className}` : "rv-root"}
      {...props}
    />
  );
});
Root.displayName = "Video.Root";
