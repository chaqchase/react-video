"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { definePlugin } from "../../core/plugin";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { Panel } from "../../react/primitives/panel";
import { playlist, type PlaylistItem } from "../playlist/index";

export interface EpisodesOptions {
  /**
   * How far through an episode the viewer is, from 0 to 1, for the bar on its thumbnail.
   * The episode that's playing always shows its real position instead.
   */
  progress?: (item: PlaylistItem, index: number) => number | null | undefined;
}

const seasonOf = (item: PlaylistItem | undefined) => item?.season ?? null;

/**
 * A shelf of the queue's episodes, grouped into seasons. The queue itself comes from
 * the playlist plugin, so this adds only what the viewer browses it with.
 */
export const episodes = definePlugin("episodes", (options: EpisodesOptions = {}) => ({
  requires: ["playlist"],
  after: ["playlist"],
  state: () => ({
    /** True while the shelf is showing. */
    open: false,
    /** The season on the shelf, or null when episodes have no seasons. */
    season: null as string | null,
    /** The function that reads an episode's progress. */
    progress: options.progress ?? null,
  }),
  attrs: { "data-episodes-open": (state) => state.open },
  commands(context) {
    const show = (open: boolean) => {
      if (!open) {
        context.set({ open });
        return;
      }
      const queue = context.player.plugin(playlist).state();
      // It opens on what's playing, whichever season was being browsed before.
      context.set({ open, season: seasonOf(queue.items[queue.index]) });
    };
    return {
      /** Opens the shelf on the season that's playing. */
      open: () => show(true),
      /** Closes the shelf, and returns focus to its button. */
      close: () => show(false),
      /** Opens the shelf if closed, and closes it if open. */
      toggle: () => show(!context.state().open),
      /** Shows this season's episodes on the shelf. */
      setSeason: (season: string | null) => context.set({ season }),
    };
  },
  slots: { "controls-end": EpisodesButton, overlay: EpisodesShelf },
}));

const svg = {
  viewBox: "0 0 24 24",
  width: "1em",
  height: "1em",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export type EpisodesButtonProps = ButtonProps;

/** Opens the shelf. Hidden with a single item, since there's nothing to browse. */
export const EpisodesButton = forwardRef<HTMLButtonElement, EpisodesButtonProps>(
  function EpisodesButton({ onClick, children, ...props }, ref) {
    const single = useVideoState(playlist, ({ items }) => items.length < 2);
    const open = useVideoState(episodes, (state) => state.open);
    const { toggle } = useCommands(episodes);
    const label = useLabel("episodes", "Episodes");
    if (single) return null;
    return (
      <Button
        ref={ref}
        data-part="episodes-button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggle();
        }}
        {...props}
      >
        {children ?? (
          <svg {...svg} strokeWidth="2">
            <rect x="3" y="9" width="18" height="12" rx="3" />
            <path d="M6 5.5h12M9 2.2h6" />
          </svg>
        )}
      </Button>
    );
  }
);
EpisodesButton.displayName = "Video.EpisodesButton";

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

const runtime = (seconds: number, locale: string | undefined) => {
  const format = (value: number, unit: string) =>
    new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" }).format(value);
  if (seconds < 60) return format(Math.round(seconds), "second");
  const minutes = Math.round(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return [hours ? format(hours, "hour") : "", minutes % 60 ? format(minutes % 60, "minute") : ""]
    .filter(Boolean)
    .join(" ");
};

/** The shelf of episodes. It renders nothing until it first opens. */
export function EpisodesShelf() {
  const open = useVideoState(episodes, (state) => state.open);
  const { close } = useCommands(episodes);
  const title = useLabel("episodes", "Episodes");
  const closeLabel = useLabel("close", "Close");
  return (
    <Panel
      open={open}
      onClose={close}
      closeLabel={closeLabel}
      trigger="episodes-button"
      data-panel="episodes"
      aria-label={title}
    >
      <ShelfContents open={open} title={title} />
    </Panel>
  );
}
EpisodesShelf.displayName = "Video.EpisodesShelf";

// A component of its own so that none of this, `progress` included, runs before the shelf opens.
function ShelfContents({ open, title }: { open: boolean; title: string }) {
  const player = usePlayer();
  const season = useVideoState(episodes, (state) => state.season);
  const progress = useVideoState(episodes, (state) => state.progress);
  const items = useVideoState(playlist, (state) => state.items);
  const current = useVideoState(playlist, (state) => state.index);
  const { close, setSeason } = useCommands(episodes);
  const { select } = useCommands(playlist);
  const previous = useLabel("previous", "Previous");
  const next = useLabel("next", "Next");
  const nowPlaying = useLabel("nowPlaying", "Now playing");

  const list = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const seasons = useMemo(
    () => [...new Set(items.map(seasonOf))].filter((name): name is string => name !== null),
    [items]
  );
  const shown = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => seasonOf(item) === season),
    [items, season]
  );

  // Edges fade only where there's more to scroll to, and the page buttons follow.
  const edges = useCallback(() => {
    const node = list.current;
    if (!node) return;
    const scrolled = Math.abs(node.scrollLeft);
    const rest = node.scrollWidth - node.clientWidth - scrolled;
    node.toggleAttribute("data-more-before", scrolled > 1);
    node.toggleAttribute("data-more-after", rest > 1);
    node.parentElement?.toggleAttribute("data-overflow", node.scrollWidth > node.clientWidth + 1);
  }, []);

  const center = useCallback((tile: Element | undefined, behavior: ScrollBehavior) => {
    const node = list.current;
    if (!node || !tile) return;
    const box = node.getBoundingClientRect();
    const rect = tile.getBoundingClientRect();
    // scrollLeft is negative in RTL, and the difference between boxes accounts for it.
    node.scrollBy({ left: rect.left + rect.width / 2 - box.left - box.width / 2, behavior });
  }, []);

  useEffect(() => {
    const node = list.current;
    if (!open || !node) return;
    setCursor(null);
    node.scrollTo({ left: 0, behavior: "instant" });
    center(node.querySelector('[aria-current="true"]') ?? undefined, "instant");
    edges();
    const observer = new ResizeObserver(edges);
    observer.observe(node);
    return () => observer.disconnect();
  }, [center, edges, open, season]);

  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const node = list.current;
    if (!node) return;
    const tiles = [...node.querySelectorAll<HTMLElement>('[data-part="episode"]')];
    const from = tiles.indexOf(event.target as HTMLElement);
    const rtl = getComputedStyle(node).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    const to =
      event.key === "Home" ? 0 : event.key === "End" ? tiles.length - 1 : step ? from + step : -1;
    const tile = tiles[to];
    if (from < 0 || !tile) return;
    event.preventDefault();
    tile.focus({ preventScroll: true });
    center(tile, scrollBehavior());
  };

  const page = (direction: 1 | -1) => {
    const node = list.current;
    if (!node) return;
    const rtl = getComputedStyle(node).direction === "rtl";
    node.scrollBy({ left: direction * (rtl ? -1 : 1) * node.clientWidth * 0.8, behavior: scrollBehavior() });
  };

  const locale = player.root()?.lang || undefined;
  const playing = shown.findIndex(({ index }) => index === current);
  const stop = cursor ?? Math.max(playing, 0);

  return (
    <>
      <div data-part="panel-header">
        <p data-part="panel-title">{title}</p>
        {seasons.length > 1 ? (
          <div data-part="episodes-seasons" role="group" aria-label={title}>
            {seasons.map((name) => (
              <button
                key={name}
                type="button"
                data-part="episodes-season"
                aria-pressed={name === season}
                onClick={() => setSeason(name)}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div data-part="episodes-pager">
        <Button data-part="episodes-page" data-direction="back" aria-label={previous} onClick={() => page(-1)}>
          <svg {...svg} strokeWidth="2.4">
            <path d="M14.5 5.5 8 12l6.5 6.5" />
          </svg>
        </Button>
        <Button data-part="episodes-page" data-direction="forward" aria-label={next} onClick={() => page(1)}>
          <svg {...svg} strokeWidth="2.4">
            <path d="M9.5 5.5 16 12l-6.5 6.5" />
          </svg>
        </Button>
        <div ref={list} data-part="episodes-list" onScroll={edges} onKeyDown={move}>
          {shown.map(({ item, index }, position) => {
            const active = index === current;
            // Read as the shelf renders, which is only when it opens or changes season.
            const value = active
              ? player.clock.time() / (player.getState().media.duration || Infinity)
              : progress?.(item, index);
            const image = item.thumbnail ?? item.poster;
            return (
              <button
                key={index}
                type="button"
                data-part="episode"
                data-autofocus={position === stop ? "" : undefined}
                aria-current={active ? "true" : undefined}
                tabIndex={position === stop ? 0 : -1}
                onFocus={() => setCursor(position)}
                onClick={() => {
                  close();
                  if (!active) select(index);
                }}
              >
                <span data-part="episode-thumbnail">
                  {image ? <img src={image} alt="" loading="lazy" decoding="async" draggable={false} /> : null}
                  {active ? (
                    <span data-part="episode-playing" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  ) : null}
                  {value ? (
                    <span data-part="episode-progress">
                      <span style={{ transform: `scaleX(${Math.min(value, 1)})` }} />
                    </span>
                  ) : null}
                </span>
                {item.title ? <span data-part="episode-title">{item.title}</span> : null}
                <span data-part="episode-meta">
                  {active ? nowPlaying : item.duration ? runtime(item.duration, locale) : item.eyebrow}
                </span>
                {item.description ? <span data-part="episode-description">{item.description}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
