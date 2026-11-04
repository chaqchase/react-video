"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { MediaState, Player } from "../../core/types";
import { formatTime } from "../../lib/format-time";
import { usePlayer } from "../context";
import { useLabel, useVideoState } from "../hooks";
import { mergeRefs, useNodeRef } from "./as-child";
import { useSliderGesture } from "./slider-gesture";

const SEEK_TIMEOUT_MS = 2000;

const clampFraction = (value: number) => Math.min(Math.max(value, 0), 1);
const canSeek = (media: MediaState) =>
  media.capabilities.seek &&
  media.timeline.end > media.timeline.start &&
  !media.locks.some(({ commands }) => commands.includes("seek"));

/** Sends one seek at a time, always ending on the latest position asked for. */
function createSeekQueue(player: Player, onIdle: () => void) {
  let inFlight = false;
  let sawSeeking = false;
  let pending: number | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = () => {
    clearTimeout(timer);
    inFlight = false;
    if (pending === null) {
      onIdle();
      return;
    }
    const next = pending;
    pending = null;
    send(next);
  };
  const send = (time: number) => {
    inFlight = true;
    sawSeeking = false;
    player.commands.seek(time);
    // A gate can swallow a seek, and then no seeked event ever comes.
    timer = setTimeout(finish, SEEK_TIMEOUT_MS);
  };

  return {
    seek(time: number) {
      if (inFlight) pending = time;
      else send(time);
    },
    update() {
      if (!inFlight) return;
      if (player.getState().media.seeking) sawSeeking = true;
      else if (sawSeeking) finish();
    },
    dispose() {
      clearTimeout(timer);
    },
  };
}

type PreviewListener = (time: number | null, fraction: number) => void;

/**
 * Everything that moves as time passes. It writes transforms straight to the DOM,
 * so scrubbing and playback cost no renders.
 */
function createTimelineController(player: Player) {
  const nodes: {
    root?: HTMLElement | null;
    input?: HTMLInputElement | null;
    fill?: HTMLElement | null;
    rail?: HTMLElement | null;
    buffered?: HTMLElement | null;
  } = {};
  const setter =
    <Name extends keyof typeof nodes>(name: Name) =>
    (node: (typeof nodes)[Name]) => {
      nodes[name] = node;
    };
  const previews = new Set<PreviewListener>();
  let width = 0;
  /** The position shown instead of the clock's, while a drag or seek is settling. */
  let held: number | null = null;
  let dragging = false;
  let announced = -Infinity;
  let valueText = (time: number): string => formatTime(time);

  const range = () => player.getState().media.timeline;
  const toTime = (fraction: number) => {
    const { start, end } = range();
    return start + fraction * (end - start);
  };
  const toFraction = (time: number) => {
    const { start, end } = range();
    return end > start ? clampFraction((time - start) / (end - start)) : 0;
  };

  const paint = (time: number) => {
    const fraction = toFraction(time);
    if (nodes.fill) nodes.fill.style.transform = `scaleX(${fraction})`;
    if (nodes.rail) nodes.rail.style.transform = `translateX(${fraction * 100}%)`;
  };

  const announce = (time: number, force = false) => {
    const input = nodes.input;
    if (!input || (!force && Math.abs(time - announced) < 5)) return;
    announced = time;
    input.value = String(time);
    input.setAttribute("aria-valuetext", valueText(time));
  };

  const paintBuffered = (time: number) => {
    if (!nodes.buffered) return;
    const { buffered } = player.getState().media;
    let end = 0;
    for (const [from, to] of buffered) {
      if (from <= time + 0.5 && to > end) end = to;
    }
    nodes.buffered.style.transform = `scaleX(${toFraction(end)})`;
  };

  const preview = (time: number | null, fraction: number) => {
    for (const listener of previews) listener(time, fraction);
  };

  const hold = (time: number) => {
    held = time;
    paint(time);
    announce(time, true);
  };

  const queue = createSeekQueue(player, () => {
    if (dragging) return;
    held = null;
    player.clock.sync();
  });

  const seekTo = (time: number) => {
    hold(time);
    queue.seek(time);
  };

  const position = () => held ?? player.clock.time();

  return {
    setRoot: setter("root"),
    setInput: setter("input"),
    setFill: setter("fill"),
    setRail: setter("rail"),
    setBuffered: setter("buffered"),
    root: () => nodes.root,
    addPreview(listener: PreviewListener) {
      previews.add(listener);
      return () => {
        previews.delete(listener);
      };
    },
    setValueText(format: (time: number) => string) {
      valueText = format;
      announce(position(), true);
    },
    write(time: number) {
      if (held === null) {
        paint(time);
        announce(time);
      }
      paintBuffered(time);
    },
    // One visible pixel of travel, because finer writes couldn't be seen.
    resolution() {
      const { start, end } = range();
      const pixels = width * (typeof devicePixelRatio === "number" ? devicePixelRatio : 1);
      return pixels > 0 && end > start ? Math.max((end - start) / pixels, 1 / 60) : 1;
    },
    setWidth(next: number) {
      width = next;
    },
    update() {
      queue.update();
      paintBuffered(position());
    },
    gesture: {
      current: () => toFraction(position()),
      disabled: () => !canSeek(player.getState().media),
      focus: () => nodes.input?.focus({ preventScroll: true }),
      start(fraction: number) {
        dragging = true;
        nodes.root?.setAttribute("data-dragging", "");
        player.commands.scrub(true);
        seekTo(toTime(fraction));
        preview(toTime(fraction), fraction);
      },
      move(fraction: number) {
        seekTo(toTime(fraction));
        preview(toTime(fraction), fraction);
      },
      end(fraction: number) {
        dragging = false;
        nodes.root?.removeAttribute("data-dragging");
        seekTo(toTime(fraction));
        player.commands.scrub(false);
        preview(null, fraction);
      },
      cancel() {
        dragging = false;
        nodes.root?.removeAttribute("data-dragging");
        player.commands.scrub(false);
        preview(null, 0);
        queue.seek(position());
      },
    },
    hover(fraction: number | null) {
      if (dragging) return;
      preview(fraction === null ? null : toTime(fraction), fraction ?? 0);
    },
    step(delta: number) {
      seekTo(Math.min(Math.max(position() + delta, range().start), range().end));
    },
    seekTo,
    dispose: () => queue.dispose(),
    range,
  };
}

type TimelineController = ReturnType<typeof createTimelineController>;

const TimelineContext = createContext<TimelineController | null>(null);

function useTimeline() {
  const controller = useContext(TimelineContext);
  if (!controller) {
    throw new Error("react-video-kit: this part must be inside <Video.Timeline>.");
  }
  return controller;
}

export interface TimelineProps extends HTMLAttributes<HTMLDivElement> {
  /** Seconds moved by the arrow keys. */
  step?: number;
  /** Seconds moved by Page Up and Page Down. */
  largeStep?: number;
  children?: ReactNode;
}

/**
 * The seek bar. A real range input provides focus, keyboard, and screen reader
 * support, while the visible track takes pointer input over a larger hit area.
 */
export const Timeline = forwardRef<HTMLDivElement, TimelineProps>(function Timeline(
  {
    step = 5,
    largeStep = 30,
    children,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    ...props
  },
  ref
) {
  const player = usePlayer();
  const [controller] = useState(() => createTimelineController(player));
  const gesture = useSliderGesture(() => controller.gesture);
  const rootRef = useNodeRef<HTMLDivElement>(controller.setRoot);
  const inputRef = useNodeRef<HTMLInputElement>(controller.setInput);
  const start = useVideoState((media) => media.timeline.start);
  const end = useVideoState((media) => media.timeline.end);
  const enabled = useVideoState(canSeek);
  const label = useLabel("seek", "Seek");
  const of = useLabel("of", "of");

  useEffect(() => {
    controller.setValueText((time) => `${formatTime(time)} ${of} ${formatTime(end)}`);
  }, [controller, end, of]);

  useEffect(() => {
    const unbind = player.clock.bind(controller.write, controller.resolution);
    const unsubscribe = player.subscribe(controller.update);
    return () => {
      unbind();
      unsubscribe();
      controller.dispose();
    };
  }, [controller, player]);

  useEffect(() => {
    const root = controller.root();
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) controller.setWidth(entry.contentRect.width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, [controller]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const moves: Record<string, () => void> = {
      ArrowRight: () => controller.step(step),
      ArrowUp: () => controller.step(step),
      ArrowLeft: () => controller.step(-step),
      ArrowDown: () => controller.step(-step),
      PageUp: () => controller.step(largeStep),
      PageDown: () => controller.step(-largeStep),
      Home: () => controller.seekTo(controller.range().start),
      End: () => controller.seekTo(controller.range().end),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    // Hotkeys on the player mustn't also act on this key.
    event.stopPropagation();
    move();
  };

  const handleHover = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if (width > 0) controller.hover(clampFraction((event.clientX - left) / width));
  };

  return (
    <TimelineContext.Provider value={controller}>
      <div
        ref={mergeRefs(rootRef, ref)}
        data-part="timeline"
        data-disabled={enabled ? undefined : ""}
        dir="ltr"
        onPointerDown={(event) => {
          onPointerDown?.(event);
          if (!event.defaultPrevented) gesture.onPointerDown(event);
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          gesture.onPointerMove(event);
          handleHover(event);
        }}
        onPointerUp={(event) => {
          onPointerUp?.(event);
          gesture.onPointerUp(event);
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event);
          gesture.onPointerCancel(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          controller.hover(null);
        }}
        {...props}
      >
        <input
          ref={inputRef}
          type="range"
          data-part="timeline-input"
          aria-label={label}
          min={start}
          max={end}
          step={step}
          defaultValue={0}
          disabled={!enabled}
          onKeyDown={handleKeyDown}
          onChange={(event) => controller.seekTo(Number(event.target.value))}
        />
        {children ?? (
          <>
            <TimelineTrack>
              <TimelineBuffered />
              <TimelineFill />
            </TimelineTrack>
            <TimelineThumb />
            <TimelinePreview />
          </>
        )}
      </div>
    </TimelineContext.Provider>
  );
});
Timeline.displayName = "Video.Timeline";

export type TimelinePartProps = HTMLAttributes<HTMLDivElement>;

export const TimelineTrack = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineTrack(props, ref) {
    return <div ref={ref} data-part="timeline-track" {...props} />;
  }
);
TimelineTrack.displayName = "Video.TimelineTrack";

export const TimelineBuffered = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineBuffered(props, ref) {
    const node = useNodeRef<HTMLDivElement>(useTimeline().setBuffered);
    return (
      <div
        ref={mergeRefs(node, ref)}
        data-part="timeline-buffered"
        {...props}
      />
    );
  }
);
TimelineBuffered.displayName = "Video.TimelineBuffered";

export const TimelineFill = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineFill(props, ref) {
    const node = useNodeRef<HTMLDivElement>(useTimeline().setFill);
    return (
      <div
        ref={mergeRefs(node, ref)}
        data-part="timeline-fill"
        {...props}
      />
    );
  }
);
TimelineFill.displayName = "Video.TimelineFill";

/** The rail spans the track and moves as a whole, so percentages need no measuring. */
export const TimelineThumb = forwardRef<HTMLDivElement, TimelinePartProps>(
  function TimelineThumb(props, ref) {
    const rail = useNodeRef<HTMLDivElement>(useTimeline().setRail);
    return (
      <div
        ref={rail}
        data-part="timeline-rail"
      >
        <div ref={ref} data-part="timeline-thumb" {...props} />
      </div>
    );
  }
);
TimelineThumb.displayName = "Video.TimelineThumb";

/** Calls `listener` with the time under the pointer, or null when there is none. */
export function useTimelinePreview(listener: PreviewListener) {
  const controller = useTimeline();
  useEffect(() => controller.addPreview(listener), [controller, listener]);
}

export interface TimelinePreviewProps extends TimelinePartProps {
  /** Shown above the time, such as a thumbnail. */
  children?: ReactNode;
}

/** Follows the pointer with the time under it, staying inside the track. */
export const TimelinePreview = forwardRef<HTMLDivElement, TimelinePreviewProps>(
  function TimelinePreview({ children, ...props }, ref) {
    const controller = useTimeline();
    const duration = useVideoState((media) => media.duration);
    const [state] = useState(() => {
      let box: HTMLElement | null = null;
      let text: HTMLElement | null = null;
      return {
        setBox: (node: HTMLElement | null) => {
          box = node;
        },
        setText: (node: HTMLElement | null) => {
          text = node;
        },
        write(time: number | null, fraction: number, total: number) {
          if (!box) return;
          box.toggleAttribute("data-visible", time !== null);
          if (time === null) return;
          if (text) text.textContent = formatTime(time, total);
          const parent = box.parentElement;
          const trackWidth = parent?.clientWidth ?? 0;
          const half = box.offsetWidth / 2;
          const x = Math.min(
            Math.max(fraction * trackWidth, half),
            Math.max(trackWidth - half, half)
          );
          box.style.transform = `translateX(${x}px) translateX(-50%)`;
        },
      };
    });
    const box = useNodeRef<HTMLDivElement>(state.setBox);
    const text = useNodeRef<HTMLSpanElement>(state.setText);
    useEffect(
      () =>
        controller.addPreview((time, fraction) => state.write(time, fraction, duration)),
      [controller, duration, state]
    );

    return (
      <div
        ref={mergeRefs(box, ref)}
        data-part="timeline-preview"
        aria-hidden="true"
        {...props}
      >
        {children}
        <span ref={text} data-part="timeline-preview-time" />
      </div>
    );
  }
);
TimelinePreview.displayName = "Video.TimelinePreview";
