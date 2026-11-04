export interface Scope {
  readonly signal: AbortSignal;
  /** Adds an event listener that is removed when the scope ends. */
  on<Listener extends EventListenerOrEventListenerObject>(
    target: EventTarget,
    type: string,
    listener: Listener,
    options?: AddEventListenerOptions
  ): void;
  /** Runs `cleanup` when the scope ends, or immediately if it already has. */
  add(cleanup: () => void): void;
}

export interface OwnedScope extends Scope {
  dispose(): void;
}

/** Ownership for everything a lifecycle hook starts. Cleanups run in reverse order. */
export function createScope(): OwnedScope {
  const controller = new AbortController();
  const cleanups: (() => void)[] = [];
  let disposed = false;

  return {
    signal: controller.signal,
    on(target, type, listener, options) {
      if (disposed) return;
      target.addEventListener(type, listener, options);
      cleanups.push(() => target.removeEventListener(type, listener, options));
    },
    add(cleanup) {
      if (disposed) cleanup();
      else cleanups.push(cleanup);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      controller.abort();
      // One failing cleanup must not leak the ones registered before it.
      let failure: unknown;
      let failed = false;
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        try {
          cleanups[index]?.();
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
      cleanups.length = 0;
      if (failed) throw failure;
    },
  };
}
