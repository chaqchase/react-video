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

export interface ThumbnailsOptions {
  /** A WebVTT file of thumbnails, or a function that picks one for each source. */
  src: string | ((source: SourceObject) => string | null);
}

function parseThumbnails(text: string, base: string): Thumbnail[] {
  return parseVtt(text).flatMap(({ start, end, text: payload }) => {
    const [path = "", fragment] = payload.split("#");
    const match = fragment?.match(/xywh=(\d+),(\d+),(\d+),(\d+)/);
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
    loading = fetch(base, { signal })
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        cues = parseThumbnails(text, base);
      })
      .catch(() => {
        cues = [];
      });
  };

  return {
    commands: () => ({
      /** The thumbnail for `time`, once loaded. Loads on first use, to save bandwidth. */
      at(time: number): Thumbnail | null {
        load();
        return cues?.find(({ start, end }) => time >= start && time < end) ?? null;
      },
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

  const write = useCallback(
    (time: number | null) => {
      const node = element.current;
      if (!node || time === null) return;
      const { at, prepare } = player.plugin(thumbnails).commands;
      const thumbnail = at(time);
      if (!thumbnail) {
        node.removeAttribute("data-visible");
        return;
      }
      const paint = () => {
        node.style.width = `${thumbnail.width}px`;
        node.style.height = `${thumbnail.height}px`;
        node.style.backgroundImage = `url("${thumbnail.image}")`;
        node.style.backgroundPosition = `-${thumbnail.x}px -${thumbnail.y}px`;
        node.setAttribute("data-visible", "");
      };
      const pending = prepare(thumbnail.image);
      if (pending) void pending.then(paint);
      else paint();
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
