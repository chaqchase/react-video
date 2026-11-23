"use client";

import { forwardRef, useEffect, useRef, type ReactElement } from "react";
import { definePlugin } from "../../core/plugin";
import type { SourceInput } from "../../core/types";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { useFocusFallback } from "../../react/primitives/focus-fallback";
import { NextIcon, PreviousIcon } from "../../ui/icons";
import { Title } from "../../ui/parts/title";

export interface PlaylistItem {
  /** The video, in any form the player's `src` accepts. */
  src: SourceInput;
  /** The name shown with the controls and on the up-next card. */
  title?: string;
  /** A short line above the title, such as `Season 1, Episode 2`. */
  eyebrow?: string;
  /** A sentence or two about this item, under the title while it's paused. */
  description?: string;
  /** An image set as the video's poster while this item is current. */
  poster?: string;
  /** A small image of this item, for browsing the queue. */
  thumbnail?: string;
  /** How long this item runs, in seconds, for browsing the queue. */
  duration?: number;
  /** The season this item belongs to, which groups it when browsing the queue. */
  season?: string;
}

export interface PlaylistOptions {
  /** The videos in the queue, in play order. */
  items: readonly PlaylistItem[];
  /** The item to start on. */
  start?: number;
  /** Go back to the first item after the last. */
  loop?: boolean;
  /** Seconds the up-next card counts down. 0 moves on at once, null waits for the viewer. */
  countdown?: number | null;
}

/**
 * A queue of videos. Items share one video element, because a new element wouldn't
 * have permission to autoplay on mobile, and the next one starts in the same tick.
 */
export const playlist = definePlugin("playlist", (options: PlaylistOptions) => {
  const { start = 0, loop = false, countdown = 5 } = options;
  let timer: ReturnType<typeof setInterval> | undefined;

  return {
    state: () => ({
      /** The videos in the queue. */
      items: options.items,
      /** Position of the current item in `items`. */
      index: start,
      /** True when the queue wraps around at both ends. */
      loop,
      /** Seconds until the next item, while counting down. */
      remaining: null as number | null,
      /** Whether the viewer can see what's next, even with no countdown running. */
      upNext: false,
    }),
    attrs: { "data-up-next": (state) => state.upNext },
    commands(context) {
      const stopCountdown = () => {
        clearInterval(timer);
        context.set({ remaining: null, upNext: false });
      };
      const target = (index: number) => {
        const { length } = context.state().items;
        if (index >= 0 && index < length) return index;
        return loop && length > 0 ? (index + length) % length : null;
      };
      const select = (index: number, play = true) => {
        const item = context.state().items[index];
        if (!item) return;
        stopCountdown();
        context.set({ index });
        context.commands.setSource(item.src);
        if (!play) return;
        void context.commands.play();
        if (item.title) context.player.announce(item.title);
      };
      const move = (delta: number) => {
        const index = target(context.state().index + delta);
        if (index !== null) select(index);
      };
      return {
        /** Moves to the item at this index and plays it, unless `play` is false. */
        select,
        /** Moves to the next item and plays it, wrapping around if `loop` is on. */
        next: () => move(1),
        /** Moves to the previous item and plays it, wrapping around if `loop` is on. */
        previous: () => move(-1),
        /** Stays on the finished video. */
        cancel: stopCountdown,
        /** Replaces the queue, starting from `index`. */
        setItems(items: readonly PlaylistItem[], index = 0) {
          context.set({ items });
          select(index, false);
        },
        /** The next item's position, or null at the end. */
        nextIndex: () => target(context.state().index + 1),
      };
    },
    setup(context, scope) {
      const handle = () => context.player.plugin(playlist).commands;
      scope.add(() => clearInterval(timer));

      // The queue decides what plays, so this wins over a `src` on the player.
      const item = context.state().items[context.state().index];
      if (item) context.commands.setSource(item.src);

      context.watch(
        scope,
        (media) => media.ended,
        (ended) => {
          clearInterval(timer);
          const next = handle().nextIndex();
          if (!ended || next === null) {
            context.set({ remaining: null, upNext: false });
            return;
          }
          if (countdown === 0) {
            handle().select(next);
            return;
          }
          context.set({ upNext: true, remaining: countdown });
          if (countdown === null) return;
          timer = setInterval(() => {
            const remaining = (context.state().remaining ?? 1) - 1;
            if (remaining > 0) context.set({ remaining });
            else handle().select(next);
          }, 1000);
        }
      );
    },
    source(context) {
      const video = context.video();
      const { items, index } = context.state();
      const poster = items[index]?.poster;
      if (!video) return;
      if (poster) video.setAttribute("poster", poster);
      else video.removeAttribute("poster");
    },
    slots: {
      "transport-start": PlaylistPrevious,
      "transport-end": PlaylistNext,
      title: PlaylistTitle,
      overlay: UpNext,
    },
  };
});

const useMove = (delta: number) =>
  useVideoState(playlist, ({ index, items, loop: wraps }) => {
    const next = index + delta;
    return wraps || (next >= 0 && next < items.length);
  });

export type PlaylistButtonProps = ButtonProps;

/** Hidden with a single item. Disabled at the start, unless looping wraps it around. */
export const PlaylistPrevious = forwardRef<HTMLButtonElement, PlaylistButtonProps>(
  function PlaylistPrevious({ onClick, children, ...props }, ref) {
    const available = useMove(-1);
    const single = useVideoState(playlist, ({ items }) => items.length < 2);
    const { previous } = useCommands(playlist);
    const label = useLabel("previous", "Previous");
    if (single) return null;
    return (
      <Button
        ref={ref}
        data-part="playlist-previous"
        aria-label={label}
        aria-disabled={available ? undefined : true}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) previous();
        }}
        {...props}
      >
        {children ?? <PreviousIcon />}
      </Button>
    );
  }
);
PlaylistPrevious.displayName = "Video.PlaylistPrevious";

/** Hidden with a single item. Disabled at the end, unless looping wraps it around. */
export const PlaylistNext = forwardRef<HTMLButtonElement, PlaylistButtonProps>(
  function PlaylistNext({ onClick, children, ...props }, ref) {
    const available = useMove(1);
    const single = useVideoState(playlist, ({ items }) => items.length < 2);
    const { next } = useCommands(playlist);
    const label = useLabel("next", "Next");
    if (single) return null;
    return (
      <Button
        ref={ref}
        data-part="playlist-next"
        aria-label={label}
        aria-disabled={available ? undefined : true}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) next();
        }}
        {...props}
      >
        {children ?? <NextIcon />}
      </Button>
    );
  }
);
PlaylistNext.displayName = "Video.PlaylistNext";

/** The current item's title, eyebrow, and description. Hidden when it has none of them. */
export function PlaylistTitle() {
  const item = useVideoState(playlist, ({ items, index }) => items[index]);
  if (!item?.title && !item?.eyebrow && !item?.description) return null;
  return <Title title={item.title} eyebrow={item.eyebrow} description={item.description} />;
}
PlaylistTitle.displayName = "Video.PlaylistTitle";

/** Offers the next item when one finishes, counting down if configured to. */
export function UpNext(): ReactElement | null {
  const visible = useVideoState(playlist, (state) => state.upNext);
  return visible ? <UpNextCard /> : null;
}
UpNext.displayName = "Video.UpNext";

function UpNextCard() {
  const player = usePlayer();
  const remaining = useVideoState(playlist, (state) => state.remaining);
  const title = useVideoState(playlist, ({ items, index }) => {
    const next = items[(index + 1) % items.length];
    return next?.title;
  });
  const { next, cancel } = useCommands(playlist);
  const upNext = useLabel("upNext", "Up next");
  const playNow = useLabel("playNow", "Play now");
  const dismiss = useLabel("cancel", "Cancel");
  const card = useFocusFallback<HTMLDivElement>();
  const first = useRef<HTMLButtonElement>(null);
  const spoken = title ? `${upNext}: ${title}` : upNext;

  // Once, rather than a live region on the card, which would speak every second it counts.
  useEffect(() => player.announce(spoken), [player, spoken]);

  // The default look hides the controls behind the card on most players. Focus can't stay on them.
  useEffect(() => {
    const focused = document.activeElement;
    if (focused && player.root()?.contains(focused) && getComputedStyle(focused).visibility === "hidden") {
      first.current?.focus({ preventScroll: true });
    }
  }, [player]);

  return (
    <div ref={card} data-part="up-next" role="group" aria-label={upNext}>
      <p data-part="up-next-label">
        {upNext}
        {remaining !== null ? <span data-part="up-next-count"> · {remaining}</span> : null}
      </p>
      {title ? <p data-part="up-next-title">{title}</p> : null}
      <div data-part="up-next-actions">
        <Button ref={first} data-part="up-next-play" onClick={() => next()}>
          {playNow}
        </Button>
        <Button data-part="up-next-cancel" onClick={() => cancel()}>
          {dismiss}
        </Button>
      </div>
    </div>
  );
}
