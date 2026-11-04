"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button } from "./button";

export interface ErrorOverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** Replaces the default message, with access to the error. */
  title?: string;
}

/** Explains a fatal error and offers a retry, in place of an endless spinner. */
export const ErrorOverlay = forwardRef<HTMLDivElement, ErrorOverlayProps>(
  function ErrorOverlay({ title, children, ...props }, ref) {
    const error = useVideoState((media) => (media.error?.fatal ? media.error : null));
    const commands = useCommands();
    const fallback = useLabel("error", "This video can't be played.");
    const retry = useLabel("retry", "Try again");
    if (!error) return null;

    return (
      <div ref={ref} data-part="error-overlay" role="alert" {...props}>
        <p data-part="error-title">{title ?? fallback}</p>
        <p data-part="error-message">{error.message}</p>
        {children ?? (
          <Button data-part="error-retry" onClick={() => commands.reload()}>
            {retry}
          </Button>
        )}
      </div>
    );
  }
);
ErrorOverlay.displayName = "Video.ErrorOverlay";
