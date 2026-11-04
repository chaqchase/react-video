"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { useCommands, useLabel, useVideoState } from "../hooks";
import { Button, type ButtonProps } from "./button";

export type ControlsProps = HTMLAttributes<HTMLDivElement>;

/** Holds the controls. Stays mounted while hidden, so Tab can reveal it. */
export const Controls = forwardRef<HTMLDivElement, ControlsProps>(function Controls(
  props,
  ref
) {
  return <div ref={ref} data-part="controls" {...props} />;
});
Controls.displayName = "Video.Controls";

export type ControlGroupProps = HTMLAttributes<HTMLDivElement>;

/** A pill of related controls. */
export const ControlGroup = forwardRef<HTMLDivElement, ControlGroupProps>(
  function ControlGroup(props, ref) {
    return <div ref={ref} data-part="control-group" {...props} />;
  }
);
ControlGroup.displayName = "Video.ControlGroup";

export type ControlRowProps = HTMLAttributes<HTMLDivElement>;

export const ControlRow = forwardRef<HTMLDivElement, ControlRowProps>(
  function ControlRow(props, ref) {
    return <div ref={ref} data-part="control-row" {...props} />;
  }
);
ControlRow.displayName = "Video.ControlRow";

export type PlayOverlayProps = ButtonProps;

/** The large button over the video, shown before playback starts and after it ends. */
export const PlayOverlay = forwardRef<HTMLButtonElement, PlayOverlayProps>(
  function PlayOverlay({ onClick, ...props }, ref) {
    const state = useVideoState((media) =>
      media.ended ? "ended" : media.started ? "started" : "ready"
    );
    const commands = useCommands();
    const play = useLabel("play", "Play");
    const replay = useLabel("replay", "Replay");

    return (
      <Button
        ref={ref}
        data-part="play-overlay"
        data-state={state}
        aria-label={state === "ended" ? replay : play}
        // Out of the tab order once it's gone, since it only fades visually.
        tabIndex={state === "started" ? -1 : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) void commands.play();
        }}
        {...props}
      />
    );
  }
);
PlayOverlay.displayName = "Video.PlayOverlay";

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
