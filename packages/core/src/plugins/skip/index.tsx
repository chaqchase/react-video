"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { mergeRefs } from "../../react/primitives/as-child";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { focusPlayButton } from "../../react/primitives/focus-fallback";
import type { playlist } from "../playlist/index";

export interface SkipSegment {
  /** What this part of the video is, which picks the button's label. Defaults to `custom`. */
  kind?: "intro" | "recap" | "credits" | "custom";
  /** Where the button appears, in seconds. */
  start: number;
  /** Where the button skips to, and where it goes away, in seconds. */
  end: number;
  /** The button's text, in place of the one for its `kind`. */
  label?: string;
}

export interface SkipOptions {
  /** The parts that can be skipped, or a function that picks them for each source. */
  segments?:
    | readonly SkipSegment[]
    | ((source: SourceObject) => readonly SkipSegment[] | null | undefined);
  /** Skip each part as playback reaches it, with no button. */
  auto?: boolean;
}

/**
 * A button that skips an intro, a recap, or credits while one is playing. Credits with
 * another item in a playlist move on to it instead.
 */
export const skip = definePlugin("skip", (options: SkipOptions = {}) => {
  const { segments, auto = false } = options;
  // A viewer who seeks back into a part they auto-skipped wants to watch it.
  const skipped = new Set<SkipSegment>();
  return {
    after: ["playlist"],
    state: () => ({
      /** The parts that can be skipped in the current source. */
      segments: typeof segments === "function" ? [] : (segments ?? []) as readonly SkipSegment[],
      /** Index of the part at the current position, or -1 when there is none. */
      active: -1,
      /** True when skipping the active part moves on to the next item in a playlist. */
      next: false,
    }),
    attrs: { "data-skip": (state) => state.active >= 0 },
    commands(context) {
      return {
        /** Skips the active part. Does nothing when there isn't one. */
        skip() {
          const { active, segments: parts, next } = context.state();
          const part = parts[active];
          if (!part) return;
          if (next) context.find<typeof playlist>("playlist")?.commands.next();
          else context.commands.seek(part.end);
        },
        /** Replaces the parts for the current source. */
        setSegments(parts: readonly SkipSegment[]) {
          skipped.clear();
          context.set({ segments: parts, active: -1, next: false });
        },
      };
    },
    setup(context, scope) {
      const update = (time: number) => {
        const { segments: parts, active } = context.state();
        // During an ad the clock reads the ad's time, which isn't this video's.
        const index = context.isLocked("seek")
          ? -1
          : parts.findIndex(({ start, end }) => time >= start && time < end);
        if (index !== active) {
          const queue = context.find<typeof playlist>("playlist");
          context.set({
            active: index,
            next: parts[index]?.kind === "credits" && (queue?.commands.nextIndex() ?? null) !== null,
          });
        }
        const part = parts[index];
        if (auto && part && !skipped.has(part) && !context.media().paused) {
          skipped.add(part);
          context.player.plugin(skip).commands.skip();
        }
      };
      scope.add(context.clock.bind(update, () => 0.25));
      context.watch(scope, (media) => media.locks, () => update(context.clock.time()));
    },
    source(context, source) {
      skipped.clear();
      context.set({
        active: -1,
        next: false,
        ...(typeof segments === "function" ? { segments: segments(source) ?? [] } : {}),
      });
    },
    slots: auto ? {} : { overlay: SkipButton },
  };
});

export type SkipButtonProps = ButtonProps;

/** Shows while a part can be skipped, including while the other controls are hidden. */
export const SkipButton = forwardRef<HTMLButtonElement, SkipButtonProps>(function SkipButton(
  { onClick, children, ...props },
  ref
) {
  const part = useVideoState(skip, ({ segments, active }) => segments[active] ?? null);
  const next = useVideoState(skip, (state) => state.next);
  const { skip: run } = useCommands(skip);
  const labels = {
    intro: useLabel("skipIntro", "Skip Intro"),
    recap: useLabel("skipRecap", "Skip Recap"),
    credits: useLabel("skipCredits", "Skip Credits"),
    custom: useLabel("skip", "Skip"),
  };
  const nextEpisode = useLabel("nextEpisode", "Next Episode");
  const text = part ? (next ? nextEpisode : (part.label ?? labels[part.kind ?? "custom"])) : null;
  const player = usePlayer();
  const button = useRef<HTMLButtonElement | null>(null);

  // The text stays while the button fades out, rather than emptying first.
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (text) {
      setShown(text);
      player.announce(text);
    } else if (button.current && button.current === document.activeElement) {
      focusPlayButton(player.root());
    }
  }, [player, text]);

  if (!text && !shown) return null;
  return (
    <Button
      ref={mergeRefs(button, ref)}
      data-part="skip"
      data-state={text ? "visible" : "hidden"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) run();
      }}
      {...props}
    >
      {children ?? text ?? shown}
    </Button>
  );
});
SkipButton.displayName = "Video.SkipButton";
