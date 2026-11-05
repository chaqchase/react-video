"use client";

import { definePlugin } from "../../core/plugin";
import { formatTime } from "../../lib/format-time";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuItem } from "../../react/primitives/menu-item";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";

export interface LoopOptions {
  /** Start with the whole video looping. */
  enabled?: boolean;
}

export interface LoopRange {
  /** Where the section starts, in seconds. */
  start: number;
  /** Where it ends and goes back to the start, in seconds. */
  end: number;
}

/** A shorter section would only stutter. */
const MIN_SECTION = 0.5;
/** How closely the end of a section is watched, in seconds. */
const SECTION_RESOLUTION = 0.05;

/** Repeats the whole video or a section of it. A new source starts without a section. */
export const loop = definePlugin("loop", (options: LoopOptions = {}) => {
  let applyNative = () => {};
  return {
    state: () => ({
      /** True while the whole video repeats. */
      enabled: options.enabled ?? false,
      /** The section that repeats, or null. It takes priority over `enabled`. */
      range: null as LoopRange | null,
    }),
    attrs: {
      "data-loop": (state) => (state.range ? "section" : state.enabled ? "video" : null),
    },
    commands(context) {
      const set = (enabled: boolean) => {
        context.set({ enabled, range: null });
        applyNative();
      };
      const setRange = (start: number, end: number) => {
        const { timeline } = context.media();
        const from = Math.max(start, timeline.start);
        const to = Math.min(end, timeline.end);
        if (!(to - from >= MIN_SECTION)) return false;
        context.set({ range: { start: from, end: to } });
        applyNative();
        // Wakes the clock, which may be asleep for up to a second.
        context.clock.sync();
        return true;
      };
      return {
        /** Repeats the whole video, or stops repeating. Clears any section. */
        set,
        /** Stops repeating, or repeats the whole video. Clears any section. */
        toggle: () => set(!context.state().enabled && !context.state().range),
        /** Repeats a section, in seconds. Returns false if it's too short or outside the video. */
        setRange,
        /** Stops repeating altogether. */
        clear: () => set(false),
        /** Starts a section at the current position, keeping its end if that's still later. */
        markStart() {
          const { range } = context.state();
          return setRange(context.clock.time(), range?.end ?? context.media().timeline.end);
        },
        /** Ends a section at the current position, keeping its start if that's still earlier. */
        markEnd() {
          const { range } = context.state();
          return setRange(range?.start ?? context.media().timeline.start, context.clock.time());
        },
      };
    },
    attach(context, element, scope) {
      applyNative = () => {
        const { enabled, range } = context.state();
        element.loop = enabled && !range;
      };
      applyNative();
      scope.add(() => {
        applyNative = () => {};
        element.loop = false;
      });
    },
    setup(context, scope) {
      const goToStart = () => {
        const { range } = context.state();
        if (!range || context.isLocked("seek")) return;
        context.commands.seek(range.start);
      };
      let last = Number.NaN;
      scope.add(
        context.clock.bind(
          (time, jumped) => {
            const { range } = context.state();
            // Only playback reaching the end counts, so a viewer can seek past a section.
            if (range && !jumped && last < range.end && time >= range.end) goToStart();
            last = time;
          },
          () => (context.state().range ? SECTION_RESOLUTION : Infinity)
        )
      );
      context.watch(
        scope,
        (media) => media.ended,
        (ended) => {
          if (!ended || !context.state().range) return;
          goToStart();
          void context.commands.play();
        }
      );
    },
    source(context) {
      context.set({ range: null });
      applyNative();
    },
    slots: { "timeline-track": LoopRangeMark, menu: LoopMenu },
  };
});

/** Picks out the repeating section on the timeline. Renders nothing without one. */
export function LoopRangeMark() {
  const range = useVideoState(loop, (state) => state.range);
  const start = useVideoState((media) => media.timeline.start);
  const end = useVideoState((media) => media.timeline.end);
  const span = end - start;
  if (!range || !(span > 0)) return null;
  return (
    <span
      data-part="loop-range"
      style={{
        left: `${((range.start - start) / span) * 100}%`,
        width: `${((range.end - range.start) / span) * 100}%`,
      }}
    />
  );
}
LoopRangeMark.displayName = "Video.LoopRangeMark";

const OFF = "off";
const VIDEO = "video";
const SECTION = "section";

/** Renders nothing for a live stream, which has no end to go back from. */
export function LoopMenu() {
  const enabled = useVideoState(loop, (state) => state.enabled);
  const range = useVideoState(loop, (state) => state.range);
  const duration = useVideoState((media) => media.duration);
  const streaming = useVideoState((media) => media.live !== null);
  const { set, clear, markStart, markEnd } = useCommands(loop);
  const title = useLabel("loop", "Loop");
  const off = useLabel("captionsOff", "Off");
  const video = useLabel("loopVideo", "Whole video");
  const startHere = useLabel("loopStart", "Start section here");
  const endHere = useLabel("loopEnd", "End section here");
  if (streaming) return null;

  const section = range
    ? `${formatTime(range.start, duration)} – ${formatTime(range.end, duration)}`
    : null;
  const mode = range ? SECTION : enabled ? VIDEO : OFF;
  return (
    <MenuSub
      title={title}
      value={mode === SECTION ? section : mode === VIDEO ? video : off}
      data-menu="loop"
    >
      <MenuRadioGroup
        value={mode}
        onValueChange={(value) => {
          if (value === VIDEO) set(true);
          else if (value === OFF) clear();
        }}
      >
        <MenuRadioItem value={OFF}>{off}</MenuRadioItem>
        <MenuRadioItem value={VIDEO}>{video}</MenuRadioItem>
        {section ? <MenuRadioItem value={SECTION}>{section}</MenuRadioItem> : null}
      </MenuRadioGroup>
      <div data-part="menu-divider" role="separator" />
      <MenuItem data-inset="" onSelect={markStart}>
        <span data-part="menu-item-label">{startHere}</span>
      </MenuItem>
      <MenuItem data-inset="" onSelect={markEnd}>
        <span data-part="menu-item-label">{endHere}</span>
      </MenuItem>
    </MenuSub>
  );
}
LoopMenu.displayName = "Video.LoopMenu";
