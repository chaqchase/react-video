"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import * as Video from "react-video-kit";
import type { Player } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";
import { createPlugins, playerKey, sourceInput, type BuilderConfig } from "@/lib/builder";

interface BuilderPlayerProps {
  config: BuilderConfig;
  style?: CSSProperties;
  className?: string;
}

/**
 * Plugins are fixed for a player's life, so a change of plugins builds a new one. This
 * picks up from the same place, so toggling a feature feels like it just appeared.
 */
export function BuilderPlayer({ config, style, className }: BuilderPlayerProps) {
  const key = playerKey(config);
  const player = useRef<Player>(null);
  const last = useRef({ time: 0, playing: false, source: config.source });
  const plugins = useMemo(
    () => createPlugins(config),
    // Rebuilding on anything but the key would restart playback for a colour change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );
  const src = sourceInput(config);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    const { time, playing, source } = last.current;
    if (source === config.source && time > 0) current.commands.reload(time);
    if (playing) void current.commands.play();
    last.current = { time: 0, playing: false, source: config.source };
  }, [key, config.source]);

  const media = {
    onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => {
      last.current.time = event.currentTarget.currentTime;
      last.current.playing = !event.currentTarget.paused;
    },
    onPause: () => {
      last.current.playing = false;
    },
    onPlay: () => {
      last.current.playing = true;
    },
  };

  if (config.layout === "minimal") {
    return (
      <Video.Root key={key} ref={player} src={src} plugins={plugins} load="visible" style={style} className={className}>
        <Video.Media poster="/media/poster.jpg" {...media} />
        <Video.Slot name="overlay" />
        <Video.BufferingIndicator />
        <Video.PlayOverlay />
        <Video.ErrorOverlay />
        <Video.Controls>
          <Video.Timeline />
          <Video.ControlRow>
            <Video.ControlGroup>
              <Video.PlayPause />
              <Video.Time />
            </Video.ControlGroup>
            <Video.ControlGroup>
              <Video.Slot name="controls-end" />
              <Video.SettingsMenu />
            </Video.ControlGroup>
          </Video.ControlRow>
        </Video.Controls>
      </Video.Root>
    );
  }
  return (
    <VideoPlayer
      key={key}
      ref={player}
      src={src}
      plugins={plugins}
      load="visible"
      poster="/media/poster.jpg"
      media={media}
      style={style}
      className={className}
    />
  );
}
