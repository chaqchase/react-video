"use client";

import { forwardRef, useState, type ReactNode, type VideoHTMLAttributes } from "react";
import type { Player } from "../core/types";
import { Media } from "../react/media";
import { ControlGroup, ControlRow, Controls, ErrorOverlay } from "../react/primitives/layout";
import { Timeline } from "../react/primitives/timeline";
import { Slot } from "../react/slot";
import {
  BufferingIndicator,
  PlayOverlay,
  PlayPause,
  SettingsMenu,
  Time,
  Volume,
} from "../ui/parts/controls";
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
            <PlayPause />
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
