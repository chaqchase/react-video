"use client";

import { forwardRef, type HTMLAttributes } from "react";
import type { MediaErrorInfo, VideoErrorCode } from "../../core/types";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button } from "./button";

export interface ErrorMessage {
  /** Replaces the title. */
  title?: string;
  /** Replaces the line under the title. */
  detail?: string;
}

export interface ErrorOverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** Replaces the title, whatever the error. */
  title?: string;
  /** Replaces the text for particular error codes. */
  messages?: Partial<Record<VideoErrorCode, ErrorMessage>>;
}

// A label key and English fallback each for the title and the line under it.
const COPY = {
  connection: [
    "errorConnection",
    "This video didn't load.",
    "errorConnectionDetail",
    "Check your connection and try again.",
  ],
  playback: [
    "error",
    "This video can't be played.",
    "errorDetail",
    "The file may be missing or damaged, or this device can't play its format.",
  ],
  protected: [
    "errorProtected",
    "This protected video can't be played.",
    "errorProtectedDetail",
    "This browser or device may not support its protection.",
  ],
  denied: [
    "errorDenied",
    "You don't have access to this video.",
    "errorDeniedDetail",
    "Your access may have expired, or your account may not include it.",
  ],
  output: [
    "errorOutput",
    "This video can't be shown on this screen.",
    "errorOutputDetail",
    "An external display or screen recording may be blocking it.",
  ],
} as const;

function copyFor({ code, retryable }: MediaErrorInfo) {
  if (retryable) return COPY.connection;
  if (code === "drm-denied" || code === "drm-expired") return COPY.denied;
  if (code === "drm-output-restricted") return COPY.output;
  return String(code).startsWith("drm-") ? COPY.protected : COPY.playback;
}

/**
 * Explains a fatal error in the viewer's language, with a code to quote to support,
 * in place of an endless spinner. It offers a retry unless the error rules that out.
 */
export const ErrorOverlay = forwardRef<HTMLDivElement, ErrorOverlayProps>(
  function ErrorOverlay({ title, messages, children, ...props }, ref) {
    const error = useVideoState((media) => (media.error?.fatal ? media.error : null));
    const commands = useCommands();
    const [titleKey, titleFallback, detailKey, detailFallback] = error ? copyFor(error) : COPY.playback;
    const defaultTitle = useLabel(titleKey, titleFallback);
    const defaultDetail = useLabel(detailKey, detailFallback);
    const codeLabel = useLabel("errorCode", "Error code:");
    const retry = useLabel("retry", "Try again");
    if (!error) return null;
    const custom = messages?.[error.code];

    return (
      <div ref={ref} data-part="error-overlay" role="alert" {...props}>
        <p data-part="error-title">{title ?? custom?.title ?? defaultTitle}</p>
        <p data-part="error-message">{custom?.detail ?? defaultDetail}</p>
        <p data-part="error-code">
          {codeLabel} <bdi>{error.code}</bdi>
        </p>
        {children ??
          (error.retryable === false ? null : (
            <Button data-part="error-retry" onClick={() => commands.reload()}>
              {retry}
            </Button>
          ))}
      </div>
    );
  }
);
ErrorOverlay.displayName = "Video.ErrorOverlay";
