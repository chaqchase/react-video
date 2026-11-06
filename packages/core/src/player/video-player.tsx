"use client";

import { forwardRef, type ReactNode, type VideoHTMLAttributes } from "react";
import type { Player } from "../core/types";
import { Media } from "../react/media";
import { ControlGroup } from "../react/primitives/control-group";
import { ControlRow } from "../react/primitives/control-row";
import { Controls } from "../react/primitives/controls";
import { CurrentTime } from "../react/primitives/current-time";
import { Duration } from "../react/primitives/duration";
import { ErrorOverlay, type ErrorOverlayProps } from "../react/primitives/error-overlay";
import { RemainingTime } from "../react/primitives/remaining-time";
import { Timeline } from "../react/primitives/timeline";
import { Slot } from "../react/slot";
import { BufferingIndicator } from "../ui/parts/buffering-indicator";
import { PlayOverlay } from "../ui/parts/play-overlay";
import { SettingsMenu } from "../ui/parts/settings-menu";
import { Title } from "../ui/parts/title";
import { Transport } from "../ui/parts/transport";
import { Volume } from "../ui/parts/volume";
import { Root, type RootProps } from "../ui/parts/root";

export interface VideoPlayerProps extends Omit<RootProps, "title"> {
  /** An image for the video element to show before playback starts. */
  poster?: string;
  /** Props for the underlying video element. */
  media?: Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "controls" | "poster">;
  /** `<track>` elements for the video. */
  tracks?: ReactNode;
  /** The video's name, shown above the timeline with the controls. */
  title?: ReactNode;
  /** A short line above the title, such as a series or an episode. */
  eyebrow?: ReactNode;
  /** A sentence or two about the video, under the title while it's paused. */
  description?: ReactNode;
  /** Replaces the error overlay's text for particular error codes. */
  errorMessages?: ErrorOverlayProps["messages"];
}

/**
 * The complete player layout: every control, styled. Features come from `plugins`,
 * and `defaultPlugins()` is a sensible set. Leaving it out keeps it out of the bundle.
 */
export const VideoPlayer = forwardRef<Player, VideoPlayerProps>(function VideoPlayer(
  { poster, media, tracks, title, eyebrow, description, errorMessages, children, ...props },
  ref
) {
  return (
    <Root ref={ref} aria-label={typeof title === "string" ? title : undefined} {...props}>
      <Media poster={poster} {...media}>
        {tracks}
      </Media>
      <Slot name="overlay" />
      <BufferingIndicator />
      <PlayOverlay />
      <ErrorOverlay messages={errorMessages} />
      {children}
      <Controls>
        <ControlRow data-position="top">
          <ControlGroup>
            <Slot name="top-start" />
          </ControlGroup>
          <ControlGroup>
            <Slot name="top-end" />
            <Volume />
          </ControlGroup>
        </ControlRow>
        <Transport />
        <ControlRow data-position="details">
          <ControlGroup>
            <Slot name="controls-start" />
          </ControlGroup>
          {title || eyebrow || description ? (
            <Title title={title} eyebrow={eyebrow} description={description} />
          ) : (
            <Slot name="title" />
          )}
          <ControlGroup>
            <Slot name="controls-end" />
            <SettingsMenu />
          </ControlGroup>
        </ControlRow>
        <ControlRow data-position="scrubber">
          <Timeline />
          <CurrentTime />
          <RemainingTime />
          <Duration />
        </ControlRow>
      </Controls>
    </Root>
  );
});
VideoPlayer.displayName = "VideoPlayer";
