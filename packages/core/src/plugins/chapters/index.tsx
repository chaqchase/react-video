"use client";

import { useCallback, useEffect, useRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";
import { formatTime } from "../../lib/format-time";
import { parseVtt } from "../../lib/vtt";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";
import { useTimelinePreview } from "../../react/primitives/timeline-context";

export interface Chapter {
  /** Where the chapter starts, in seconds. */
  start: number;
  /** The chapter's name in the menu and the timeline preview. */
  title: string;
}

export interface ChaptersOptions {
  /** A WebVTT file of chapters, or a function that picks one for each source. */
  src?: string | ((source: SourceObject) => string | null);
  /** Chapters to use directly, instead of a file. */
  items?: readonly Chapter[];
}

/** Splits the timeline into sections, and offers a menu to jump between them. */
export const chapters = definePlugin("chapters", (options: ChaptersOptions = {}) => ({
  state: () => ({
    /** The chapters, given directly or read from `src`. */
    items: options.items ?? ([] as readonly Chapter[]),
    /** Index of the chapter at the current position, or -1 when there is none. */
    active: -1,
  }),
  commands(context) {
    const at = (time: number) => {
      const { items } = context.state();
      for (let index = items.length - 1; index >= 0; index -= 1) {
        if (time >= (items[index]?.start ?? Infinity)) return index;
      }
      return -1;
    };
    const go = (index: number) => {
      const chapter = context.state().items[index];
      if (chapter) context.commands.seek(chapter.start);
    };
    return {
      /** Returns the index of the chapter at `time`, or -1 when there is none. */
      at,
      /** Seeks to the start of the chapter at this index. */
      select: go,
      /** Seeks to the start of the chapter after the current one, if there is one. */
      next: () => go(at(context.clock.time()) + 1),
      /** Seeks to the start of the chapter before the current one, if there is one. */
      previous: () => go(at(context.clock.time()) - 1),
    };
  },
  setup(context, scope) {
    // Once a second is enough to notice a new chapter, with a store write only then.
    scope.add(
      context.clock.bind(
        (time) => {
          const active = context.player.plugin(chapters).commands.at(time);
          context.set({ active });
        },
        () => 1
      )
    );
  },
  source(context, source, scope) {
    const { src } = options;
    if (!src) return;
    context.set({ items: [], active: -1 });
    const url = typeof src === "function" ? src(source) : src;
    if (!url) return;
    fetch(url, { signal: scope.signal })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        context.set({
          items: parseVtt(text).map(({ start, text: title }) => ({ start, title })),
        });
      })
      .catch(() => {});
  },
  slots: {
    "timeline-track": ChapterGaps,
    "timeline-preview": ChapterTitle,
    menu: ChaptersMenu,
  },
}));

/**
 * Cuts gaps in the track with a single mask, so the fill and buffered bars stay
 * one element each and playback still needs no renders.
 */
export function ChapterGaps() {
  const items = useVideoState(chapters, (state) => state.items);
  const start = useVideoState((media) => media.timeline.start);
  const end = useVideoState((media) => media.timeline.end);
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const track = marker.current?.parentElement;
    if (!track) return;
    const span = end - start;
    const stops: string[] = [];
    if (span > 0) {
      for (const chapter of items) {
        if (chapter.start <= start || chapter.start >= end) continue;
        const position = ((chapter.start - start) / span) * 100;
        stops.push(
          `#000 calc(${position}% - 1.5px)`,
          `transparent calc(${position}% - 1.5px)`,
          `transparent calc(${position}% + 1.5px)`,
          `#000 calc(${position}% + 1.5px)`
        );
      }
    }
    track.style.maskImage = stops.length
      ? `linear-gradient(to right, #000 0, ${stops.join(",")}, #000 100%)`
      : "";
    return () => {
      track.style.maskImage = "";
    };
  }, [end, items, start]);

  return <span ref={marker} hidden />;
}
ChapterGaps.displayName = "Video.ChapterGaps";

/** The chapter under the pointer, above the time in the timeline preview. */
export function ChapterTitle() {
  const player = usePlayer();
  const element = useRef<HTMLSpanElement>(null);
  const write = useCallback(
    (time: number | null) => {
      const node = element.current;
      if (!node || time === null) return;
      const handle = player.plugin(chapters);
      const chapter = handle.state().items[handle.commands.at(time)];
      node.textContent = chapter?.title ?? "";
    },
    [player]
  );
  useTimelinePreview(write);
  return <span ref={element} data-part="chapter-title" />;
}
ChapterTitle.displayName = "Video.ChapterTitle";

/** Renders nothing without chapters. */
export function ChaptersMenu() {
  const empty = useVideoState(chapters, (state) => state.items.length === 0);
  const title = useLabel("chapters", "Chapters");
  if (empty) return null;

  return (
    <MenuSub title={title} value={<ActiveChapter />} data-menu="chapters">
      <ChapterList />
    </MenuSub>
  );
}
ChaptersMenu.displayName = "Video.ChaptersMenu";

// The active chapter changes during playback, so only an open menu reads it.
function ActiveChapter() {
  return useVideoState(chapters, ({ items, active }) => items[active]?.title);
}

function ChapterList() {
  const items = useVideoState(chapters, (state) => state.items);
  const active = useVideoState(chapters, (state) => state.active);
  const duration = useVideoState((media) => media.duration);
  const { select } = useCommands(chapters);

  return (
    <MenuRadioGroup value={String(active)} onValueChange={(value) => select(Number(value))}>
      {items.map((chapter, index) => (
        <MenuRadioItem key={chapter.start} value={String(index)}>
          <span data-part="menu-item-label">{chapter.title}</span>
          <span data-part="menu-item-value">{formatTime(chapter.start, duration)}</span>
        </MenuRadioItem>
      ))}
    </MenuRadioGroup>
  );
}
