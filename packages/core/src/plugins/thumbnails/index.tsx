"use client";

import { useCallback, useEffect, useRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";
import { parseVtt } from "../../lib/vtt";
import { usePlayer } from "../../react/context";
import { useTimelinePreview } from "../../react/primitives/timeline-context";

interface Thumbnail {
  start: number;
  end: number;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const WHOLE_WIDTH = 160;
const WHOLE_HEIGHT = 90;

export interface ThumbnailsOptions {
  /** A WebVTT file of thumbnails, or a function that picks one for each source. */
  src: string | ((source: SourceObject) => string | null);
}

function parseThumbnails(text: string, base: string): Thumbnail[] {
  return parseVtt(text).flatMap(({ start, end, text: payload }) => {
    const [path = "", fragment] = payload.split("#");
    const match = fragment?.match(/xywh=(?:pixel:)?(\d+),(\d+),(\d+),(\d+)/);
    if (!path) return [];
    return [
      {
        start,
        end,
        image: new URL(path, base).href,
        x: Number(match?.[1] ?? 0),
        y: Number(match?.[2] ?? 0),
        width: Number(match?.[3] ?? 0),
        height: Number(match?.[4] ?? 0),
      },
    ];
  });
}

/** Shows a frame above the timeline as the pointer moves along it. */
export const thumbnails = definePlugin("thumbnails", (options: ThumbnailsOptions) => {
  let url: string | null = null;
  let cues: Thumbnail[] | null = null;
  let loading: Promise<void> | null = null;
  let signal: AbortSignal | undefined;
  const decoded = new Set<string>();

  const load = () => {
    if (loading || !url || typeof fetch === "undefined") return;
    const base = new URL(url, location.href).href;
    // A new source can start before an old response lands, and that one's are stale.
    const current = signal;
    loading = fetch(base, { signal: current })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        if (!current?.aborted) cues = parseThumbnails(text, base);
      })
      .catch(() => {
        if (!current?.aborted) cues = [];
      });
  };

  return {
    commands: () => ({
      /** The thumbnail for `time`, once loaded. Loads on first use, to save bandwidth. */
      at(time: number): Thumbnail | null {
        load();
        return cues?.find(({ start, end }) => time >= start && time < end) ?? null;
      },
      /** Resolves when a load in progress finishes, or null when there's nothing to wait for. */
      whenLoaded: (): Promise<void> | null => (cues ? null : loading),
      /** Resolves once the image can paint without a flash. */
      prepare(image: string): Promise<void> | null {
        if (decoded.has(image)) return null;
        const element = new Image();
        element.src = image;
        return element
          .decode()
          .then(() => {
            decoded.add(image);
          })
          .catch(() => {});
      },
    }),
    source(_context, source, scope) {
      url = typeof options.src === "function" ? options.src(source) : options.src;
      cues = null;
      loading = null;
      signal = scope.signal;
    },
    slots: { "timeline-preview": ThumbnailPreview },
  };
});

export function ThumbnailPreview() {
  const player = usePlayer();
  const element = useRef<HTMLDivElement>(null);
  const latest = useRef<number | null>(null);

  const write = useCallback(
    (time: number | null) => {
      latest.current = time;
      const node = element.current;
      if (!node || time === null) return;
      const { at, prepare, whenLoaded } = player.plugin(thumbnails).commands;
      const show = () => {
        const thumbnail = at(time);
        if (!thumbnail) {
          node.removeAttribute("data-visible");
          // The first hover starts the load, and the pointer may never move again.
          void whenLoaded()?.then(() => {
            if (latest.current === time) show();
          });
          return;
        }
        const paint = () => {
          if (latest.current !== time) return;
          // A cue with no `#xywh` is one image per frame rather than part of a sprite.
          const sprite = thumbnail.width > 0;
          node.style.width = `${sprite ? thumbnail.width : WHOLE_WIDTH}px`;
          node.style.height = `${sprite ? thumbnail.height : WHOLE_HEIGHT}px`;
          node.style.backgroundImage = `url("${thumbnail.image}")`;
          node.style.backgroundSize = sprite ? "" : "cover";
          node.style.backgroundPosition = sprite ? `-${thumbnail.x}px -${thumbnail.y}px` : "center";
          node.setAttribute("data-visible", "");
        };
        const pending = prepare(thumbnail.image);
        if (pending) void pending.then(paint);
        else paint();
      };
      show();
    },
    [player]
  );
  useTimelinePreview(write);

  useEffect(() => {
    element.current?.removeAttribute("data-visible");
  }, []);

  return <div ref={element} data-part="thumbnail" aria-hidden="true" />;
}
ThumbnailPreview.displayName = "Video.ThumbnailPreview";
