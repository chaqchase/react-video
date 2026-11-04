export interface Clock {
  /** Current playback position from the active provider. Doesn't allocate. */
  time(): number;
  /**
   * Calls `write` with the time whenever it has moved by at least `resolution()`
   * seconds, plus once immediately and after every discontinuity. Returns unbind.
   */
  bind(write: (time: number) => void, resolution: () => number): () => void;
}

export interface OwnedClock extends Clock {
  /** Sets where time and rate come from. */
  setSource(source: { time(): number; rate(): number } | null): void;
  /** Starts or stops the loop. Stopped means nothing runs per frame. */
  setRunning(running: boolean): void;
  /** Writes every binding now, for seeks, source changes, and provider swaps. */
  sync(): void;
  dispose(): void;
}

interface Binding {
  write: (time: number) => void;
  resolution: () => number;
  last: number;
}

/** Below this wait, wake on the next frame; above it, a timer is cheaper. */
const FRAME_THRESHOLD_SECONDS = 0.1;
const MAX_SLEEP_MS = 1000;

/**
 * One shared loop for all time-driven writes. Each binding declares how far time
 * must move before a write is visible, so a long video on a short track wakes
 * rarely, and a paused player does no work at all.
 */
export function createClock(): OwnedClock {
  const bindings = new Set<Binding>();
  let source: { time(): number; rate(): number } | null = null;
  let running = false;
  let frame: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const time = () => source?.time() ?? 0;

  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    if (timer !== null) clearTimeout(timer);
    frame = null;
    timer = null;
  };

  const schedule = () => {
    cancel();
    if (!running || bindings.size === 0) return;

    const now = time();
    const rate = source?.rate() || 1;
    let wait = Infinity;
    for (const binding of bindings) {
      const resolution = binding.resolution();
      if (!(resolution > 0) || !Number.isFinite(resolution)) continue;
      const remaining = resolution - Math.abs(now - binding.last);
      wait = Math.min(wait, remaining / Math.abs(rate));
    }

    const hidden = typeof document !== "undefined" && document.hidden;
    if (wait <= FRAME_THRESHOLD_SECONDS && !hidden) {
      frame = requestAnimationFrame(tick);
    } else {
      // Hidden tabs get no animation frames. A capped sleep also picks up rate
      // changes and bindings that were added while waiting.
      const delay = Math.min(Math.max(wait * 1000, 16), MAX_SLEEP_MS);
      timer = setTimeout(tick, delay);
    }
  };

  const tick = () => {
    frame = null;
    timer = null;
    const now = time();
    for (const binding of bindings) {
      const resolution = binding.resolution();
      if (!(resolution > 0)) continue;
      if (Math.abs(now - binding.last) >= resolution) {
        binding.last = now;
        binding.write(now);
      }
    }
    schedule();
  };

  return {
    time,
    bind(write, resolution) {
      const binding: Binding = { write, resolution, last: time() };
      bindings.add(binding);
      write(binding.last);
      schedule();
      return () => {
        bindings.delete(binding);
        if (bindings.size === 0) cancel();
      };
    },
    setSource(next) {
      source = next;
    },
    setRunning(next) {
      if (running === next) return;
      running = next;
      if (running) schedule();
      else cancel();
    },
    sync() {
      const now = time();
      for (const binding of bindings) {
        binding.last = now;
        binding.write(now);
      }
      schedule();
    },
    dispose() {
      running = false;
      cancel();
      bindings.clear();
      source = null;
    },
  };
}
