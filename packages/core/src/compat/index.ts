"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { VideoKitError } from "../core/kit-error";
import type { AnyPluginFactory, Player } from "../core/types";
import { usePlayer } from "../react/context";
import { useCommands, useCurrentTime, useVideoState } from "../react/hooks";

type TogglePlugin = { toggle(): Promise<void> };

const pluginOf = (player: Player, name: string) =>
  player.has(name)
    ? player.plugin({ pluginName: name } as unknown as AnyPluginFactory)
    : undefined;

function useActive(player: Player, name: string) {
  const read = (state: Record<string, object>) =>
    (state[name] as { active?: boolean } | undefined)?.active ?? false;
  return useSyncExternalStore(
    player.subscribe,
    () => read(player.getState()),
    () => read(player.getInitialState())
  );
}

/**
 * The v3 context, for moving a custom control over without rewriting it. It renders
 * four times a second, which v4's hooks avoid, so prefer `useVideoState` and
 * `useCommands` for new code. This entry goes away in v5.
 *
 * @deprecated Move to `useVideoState` and `useCommands`.
 */
export function useVideoContext() {
  const player = usePlayer();
  const commands = useCommands();
  const media = useVideoState((state) => state);
  const currentTime = useCurrentTime(0.25);
  const isFullscreen = useActive(player, "fullscreen");
  const isPip = useActive(player, "pip");

  const toggle = useCallback(
    (name: string) => {
      const handle = pluginOf(player, name);
      if (!handle) {
        throw new VideoKitError("plugin-not-installed", `react-video-kit: add the ${name} plugin to use this action.`);
      }
      void (handle.commands as TogglePlugin).toggle();
    },
    [player]
  );

  return useMemo(
    () => ({
      videoRef: {
        get current() {
          return player.video();
        },
      },
      wrapperRef: {
        get current() {
          return player.root();
        },
      },
      src: media.source?.src ?? "",
      isPlaying: !media.paused,
      isMuted: media.muted,
      isFullscreen,
      isPip,
      isLoading: media.status === "loading" || media.waiting,
      isLoaded: media.status === "ready",
      duration: media.duration,
      currentTime,
      volume: media.volume,
      remainingTime: Math.max(media.duration - currentTime, 0),
      playbackRate: media.rate,
      handlePlay: () => void commands.play(),
      handlePause: () => commands.pause(),
      handleMute: () => commands.setMuted(true),
      handleUnmute: () => commands.setMuted(false),
      handleVolumeChange: (value: number) => commands.setVolume(value),
      handlePlaybackRateChange: (value: number) => commands.setRate(value),
      handleSeek: (value: number) => commands.seek(value),
      handleFullScreen: () => toggle("fullscreen"),
      handleExitFullScreen: () => toggle("fullscreen"),
      handlePip: () => toggle("pip"),
      handleExitPip: () => toggle("pip"),
      backBy: (seconds: number) => commands.seek(currentTime - seconds),
      forwardBy: (seconds: number) => commands.seek(currentTime + seconds),
    }),
    [commands, currentTime, isFullscreen, isPip, media, player, toggle]
  );
}
