"use client";

import { forwardRef, useState, type ReactNode, type VideoHTMLAttributes } from "react";
import type { Player } from "../core/types";
import { Media } from "../react/media";
import { ControlGroup } from "../react/primitives/control-group";
import { ControlRow } from "../react/primitives/control-row";
import { Controls } from "../react/primitives/controls";
import { ErrorOverlay } from "../react/primitives/error-overlay";
import { Timeline } from "../react/primitives/timeline";
import { Slot } from "../react/slot";
import { BufferingIndicator } from "../ui/parts/buffering-indicator";
import { PlayOverlay } from "../ui/parts/play-overlay";
import { PlayPause } from "../ui/parts/play-pause";
import { SettingsMenu } from "../ui/parts/settings-menu";
import { Time } from "../ui/parts/time";
import { Volume } from "../ui/parts/volume";
import { Root, type RootProps } from "../ui/parts/root";
import { defaultPlugins } from "./default-plugins";

export interface VideoPlayerProps extends RootProps {
  poster?: string;
  /** Props for the underlying video element. */
  media?: Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "controls" | "poster">;
  /** `<track>` elements for the video. */
  tracks?: ReactNode;
}

/**
 * The complete player: every control, styled, with sensible plugins. Pass
 * `plugins` to change them, or compose your own from the same parts.
 */
export const VideoPlayer = forwardRef<Player, VideoPlayerProps>(function VideoPlayer(
  { plugins, poster, media, tracks, children, ...props },
  ref
) {
  const [installed] = useState(() => plugins ?? defaultPlugins());
  return (
    <Root ref={ref} plugins={installed} {...props}>
      <Media poster={poster} {...media}>
        {tracks}
      </Media>
      <Slot name="overlay" />
      <BufferingIndicator />
      <PlayOverlay />
      <ErrorOverlay />
      {children}
      <Controls>
        <Timeline />
        <ControlRow>
          <ControlGroup>
            <Slot name="transport-start" />
            <PlayPause />
            <Slot name="transport-end" />
            <Volume />
            <Time />
            <Slot name="controls-start" />
          </ControlGroup>
          <ControlGroup>
            <Slot name="controls-end" />
            <SettingsMenu />
          </ControlGroup>
        </ControlRow>
      </Controls>
    </Root>
  );
});
VideoPlayer.displayName = "VideoPlayer";
