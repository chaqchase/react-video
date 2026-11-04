export type Slices = Record<string, object>;

export interface Store<State extends Slices> {
  get(): State;
  getInitial(): State;
  /** Merges into a slice. Does nothing when no value changes. */
  set<Name extends keyof State & string>(
    name: Name,
    partial: Partial<State[Name]>
  ): void;
  subscribe(listener: () => void): () => void;
}

/**
 * Holds all low-frequency state, keyed by slice. Readers always see the latest
 * value, and notifications coalesce per microtask so a burst of media events
 * causes one round of subscriber work.
 */
export function createStore<State extends Slices>(initial: State): Store<State> {
  let state = initial;
  let scheduled = false;
  const listeners = new Set<() => void>();

  const notify = () => {
    scheduled = false;
    for (const listener of [...listeners]) listener();
  };

  return {
    get: () => state,
    getInitial: () => initial,
    set(name, partial) {
      const slice = state[name] as Record<string, unknown>;
      const next = partial as Record<string, unknown>;
      let changed = false;
      for (const key in next) {
        if (!Object.is(slice[key], next[key])) {
          changed = true;
          break;
        }
      }
      if (!changed) return;

      state = { ...state, [name]: { ...slice, ...partial } };
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(notify);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
