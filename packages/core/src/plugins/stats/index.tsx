"use client";

import { useEffect, useState } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button } from "../../react/primitives/button";
import { MenuItem } from "../../react/primitives/menu-item";
import { usePanelFocus } from "../../react/primitives/use-panel-focus";
import { usePresence } from "../../react/primitives/use-presence";

const COPIED_MS = 1600;

export interface StatsSnapshot {
  /** The picture's size in pixels. */
  video: string;
  /** The player's size on the page, and the screen's pixel density. */
  viewport: string;
  /** Frames dropped and frames shown so far. */
  frames: string;
  /** Seconds of video downloaded ahead of the current position. */
  buffer: string;
  /** The playback speed. */
  rate: string;
  /** The active provider. */
  engine: string;
  /** The active quality level, when the provider has levels. */
  level: string | null;
  /** Seconds behind the live edge, for a live stream. */
  latency: string | null;
}

const ROWS: readonly (readonly [keyof StatsSnapshot, string, string])[] = [
  ["video", "statsVideo", "Video"],
  ["viewport", "statsViewport", "Viewport"],
  ["frames", "statsFrames", "Dropped frames"],
  ["buffer", "statsBuffer", "Buffer"],
  ["rate", "speed", "Speed"],
  ["engine", "statsEngine", "Engine"],
  ["level", "quality", "Quality"],
  ["latency", "statsLatency", "Latency"],
];

const seconds = (value: number) => `${value.toFixed(1)} s`;

/** A developer's readout of what the player is doing. It only runs while it's open. */
export const stats = definePlugin("stats", () => ({
  state: () => ({
    /** True while the readout is showing. */
    open: false,
  }),
  attrs: { "data-stats": (state) => state.open },
  commands(context) {
    return {
      /** Shows the readout. */
      show: () => context.set({ open: true }),
      /** Closes the readout. */
      hide: () => context.set({ open: false }),
      /** Shows the readout, or closes it if it's showing. */
      toggle: () => context.set({ open: !context.state().open }),
      /** The current figures as text. */
      read(): StatsSnapshot {
        const video = context.video();
        const media = context.media();
        const bounds = context.root()?.getBoundingClientRect();
        const time = context.clock.time();
        const frames = video?.getVideoPlaybackQuality?.();
        const ahead = media.buffered.find(([start, end]) => start <= time && time <= end);
        const level = media.qualities.find(({ id }) => id === media.quality.active);
        const name = level ? (level.label ?? level.id) : null;
        const rate = level?.bitrate ? ` · ${(level.bitrate / 1e6).toFixed(1)} Mbps` : "";
        return {
          video: video?.videoWidth ? `${video.videoWidth}×${video.videoHeight}` : "–",
          viewport: `${Math.round(bounds?.width ?? 0)}×${Math.round(bounds?.height ?? 0)} @${window.devicePixelRatio}x`,
          frames: frames ? `${frames.droppedVideoFrames} / ${frames.totalVideoFrames}` : "–",
          buffer: seconds(ahead ? ahead[1] - time : 0),
          rate: `${media.rate}×`,
          engine: media.provider ?? "–",
          level: name ? `${name}${rate}` : null,
          latency: media.live ? seconds(Math.max(media.live.edge - time, 0)) : null,
        };
      },
    };
  },
  slots: { overlay: StatsPanel, menu: StatsMenu },
}));

function StatsRow({ id, name, fallback }: { id: string; name: string; fallback: string }) {
  const label = useLabel(name, fallback);
  return (
    <div data-part="stats-row" data-stat={id}>
      <dt>{label}</dt>
      <dd />
    </div>
  );
}

/** The readout. Its figures go straight to the DOM once a second, with no renders. */
export function StatsPanel() {
  const open = useVideoState(stats, (state) => state.open);
  const { hide, read } = useCommands(stats);
  const mounted = usePresence(open);
  const { panel, onKeyDown } = usePanelFocus<HTMLDivElement>(open, hide);
  const [justCopied, setJustCopied] = useState(false);
  const title = useLabel("stats", "Stats for nerds");
  const close = useLabel("close", "Close");
  const copy = useLabel("copy", "Copy");
  const copied = useLabel("copied", "Copied");

  useEffect(() => {
    if (!open) return;
    const write = () => {
      const figures = read();
      for (const [key] of ROWS) {
        const row = panel.current?.querySelector<HTMLElement>(`[data-stat="${key}"]`);
        if (!row) continue;
        const value = figures[key];
        row.hidden = value === null;
        const output = row.lastElementChild;
        if (output && value !== null) output.textContent = value;
      }
    };
    write();
    const timer = setInterval(write, 1000);
    return () => clearInterval(timer);
  }, [open, panel, read]);

  useEffect(() => {
    if (!justCopied) return;
    const timer = setTimeout(() => setJustCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [justCopied]);

  const copyFigures = () => {
    const rows = panel.current?.querySelectorAll<HTMLElement>("[data-stat]:not([hidden])") ?? [];
    const text = [...rows]
      .map((row) => `${row.firstElementChild?.textContent}: ${row.lastElementChild?.textContent}`)
      .join("\n");
    void navigator.clipboard?.writeText(text).then(() => setJustCopied(true));
  };

  if (!mounted) return null;
  return (
    <div
      ref={panel}
      data-part="stats"
      data-state={open ? "open" : "closed"}
      role="group"
      aria-label={title}
      onKeyDown={onKeyDown}
    >
      <p data-part="stats-title">{title}</p>
      <dl data-part="stats-list">
        {ROWS.map(([key, name, fallback]) => (
          <StatsRow key={key} id={key} name={name} fallback={fallback} />
        ))}
      </dl>
      <div data-part="stats-actions">
        <Button data-part="stats-action" onClick={copyFigures}>
          {justCopied ? copied : copy}
        </Button>
        <Button data-part="stats-action" onClick={hide}>
          {close}
        </Button>
      </div>
    </div>
  );
}
StatsPanel.displayName = "Video.StatsPanel";

/** The row that opens and closes the readout. */
export function StatsMenu() {
  const open = useVideoState(stats, (state) => state.open);
  const { toggle } = useCommands(stats);
  const title = useLabel("stats", "Stats for nerds");
  return (
    <MenuItem role="menuitemcheckbox" aria-checked={open} data-menu="stats" onSelect={toggle}>
      <span data-part="menu-item-label">{title}</span>
    </MenuItem>
  );
}
StatsMenu.displayName = "Video.StatsMenu";
