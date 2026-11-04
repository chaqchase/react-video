import type { MediaState, Player } from "../../core/types";
import { formatTime } from "../../lib/format-time";

const SEEK_TIMEOUT_MS = 2000;

export const clampFraction = (value: number) => Math.min(Math.max(value, 0), 1);
export const canSeek = (media: MediaState) =>
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

export type PreviewListener = (time: number | null, fraction: number) => void;

/**
 * Everything that moves as time passes. It writes transforms straight to the DOM,
 * so scrubbing and playback cost no renders.
 */
export function createTimelineController(player: Player) {
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

export type TimelineController = ReturnType<typeof createTimelineController>;
