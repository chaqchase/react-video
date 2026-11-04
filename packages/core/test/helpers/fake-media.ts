// A scripted HTMLMediaElement. Patches the prototype so real elements, including
// those React renders, behave like media. contract.test.ts holds it to the same
// scenarios as a real <video>, so its behaviour stays honest.

interface FakeState {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  ended: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  error: { code: number; message: string } | null;
  buffered: [number, number][];
  metadataDuration: number;
}

const states = new WeakMap<object, FakeState>();

function stateOf(element: object): FakeState {
  let state = states.get(element);
  if (!state) {
    state = {
      src: "",
      currentTime: 0,
      duration: NaN,
      paused: true,
      ended: false,
      volume: 1,
      muted: false,
      playbackRate: 1,
      error: null,
      buffered: [],
      metadataDuration: 60,
    };
    states.set(element, state);
  }
  return state;
}

const emit = (element: EventTarget, ...types: string[]) => {
  for (const type of types) element.dispatchEvent(new Event(type));
};

export const fakeBehaviour = {
  /** Sources containing this text fail to load. */
  brokenPattern: "broken",
  /** When set, play() rejects with this error name. */
  rejectPlayWith: null as string | null,
  /** MIME types the fake can't play directly. */
  unsupportedTypes: ["application/vnd.apple.mpegurl", "application/dash+xml"],
};

/** Moves playback forward, firing the same events a real element would. */
export function advance(element: HTMLMediaElement, seconds: number) {
  const state = stateOf(element);
  if (state.paused) return;
  state.currentTime = Math.min(state.currentTime + seconds, state.duration);
  emit(element, "timeupdate");
  if (state.currentTime >= state.duration) {
    state.ended = true;
    state.paused = true;
    emit(element, "pause", "ended");
  }
}

export function setFakeDuration(element: HTMLMediaElement, seconds: number) {
  stateOf(element).metadataDuration = seconds;
}

export function resetFakeBehaviour() {
  fakeBehaviour.brokenPattern = "broken";
  fakeBehaviour.rejectPlayWith = null;
}

export function installFakeMedia(prototype: HTMLMediaElement) {
  const accessor = <Key extends keyof FakeState>(
    key: Key,
    onSet?: (element: HTMLMediaElement, value: FakeState[Key]) => void
  ): PropertyDescriptor => ({
    configurable: true,
    get(this: HTMLMediaElement) {
      return stateOf(this)[key];
    },
    set(this: HTMLMediaElement, value: FakeState[Key]) {
      const state = stateOf(this);
      if (Object.is(state[key], value)) return;
      state[key] = value;
      onSet?.(this, value);
    },
  });

  Object.defineProperties(prototype, {
    src: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return stateOf(this).src;
      },
      set(this: HTMLMediaElement, value: string) {
        stateOf(this).src = value;
      },
    },
    currentTime: {
      configurable: true,
      get(this: HTMLMediaElement) {
        return stateOf(this).currentTime;
      },
      set(this: HTMLMediaElement, value: number) {
        const state = stateOf(this);
        state.currentTime = Number.isFinite(state.duration)
          ? Math.min(value, state.duration)
          : value;
        state.ended = false;
        emit(this, "seeking");
        queueMicrotask(() => emit(this, "timeupdate", "seeked"));
      },
    },
    duration: { configurable: true, get(this: HTMLMediaElement) { return stateOf(this).duration; } },
    paused: { configurable: true, get(this: HTMLMediaElement) { return stateOf(this).paused; } },
    ended: { configurable: true, get(this: HTMLMediaElement) { return stateOf(this).ended; } },
    readyState: { configurable: true, get(this: HTMLMediaElement) { return Number.isNaN(stateOf(this).duration) ? 0 : 4; } },
    error: { configurable: true, get(this: HTMLMediaElement) { return stateOf(this).error; } },
    volume: accessor("volume", (element) => emit(element, "volumechange")),
    muted: accessor("muted", (element) => emit(element, "volumechange")),
    playbackRate: accessor("playbackRate", (element) => emit(element, "ratechange")),
    buffered: {
      configurable: true,
      get(this: HTMLMediaElement) {
        const ranges = stateOf(this).buffered;
        return {
          length: ranges.length,
          start: (index: number) => ranges[index]?.[0] ?? 0,
          end: (index: number) => ranges[index]?.[1] ?? 0,
        };
      },
    },
    textTracks: {
      configurable: true,
      get: () => undefined,
    },
  });

  prototype.removeAttribute = function (this: HTMLMediaElement, name: string) {
    if (name === "src") stateOf(this).src = "";
    Element.prototype.removeAttribute.call(this, name);
  };

  prototype.canPlayType = (type: string) =>
    fakeBehaviour.unsupportedTypes.includes(type) ? "" : "maybe";

  prototype.load = function (this: HTMLMediaElement) {
    const state = stateOf(this);
    state.currentTime = 0;
    state.duration = NaN;
    state.paused = true;
    state.ended = false;
    state.error = null;
    state.buffered = [];
    emit(this, "emptied");
    const src = state.src;
    if (!src) return;
    queueMicrotask(() => {
      if (stateOf(this).src !== src) return;
      emit(this, "loadstart");
      if (src.includes(fakeBehaviour.brokenPattern)) {
        state.error = { code: 4, message: "Unsupported source" };
        emit(this, "error");
        return;
      }
      state.duration = state.metadataDuration;
      state.buffered = [[0, state.metadataDuration / 2]];
      emit(this, "durationchange", "loadedmetadata", "loadeddata", "progress", "canplay", "canplaythrough");
    });
  };

  prototype.play = function (this: HTMLMediaElement) {
    const state = stateOf(this);
    if (fakeBehaviour.rejectPlayWith) {
      const error = new Error("play() was rejected");
      error.name = fakeBehaviour.rejectPlayWith;
      return Promise.reject(error);
    }
    if (state.ended) state.currentTime = 0;
    state.ended = false;
    if (!state.paused) return Promise.resolve();
    state.paused = false;
    emit(this, "play");
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        emit(this, "playing");
        resolve();
      });
    });
  };

  prototype.pause = function (this: HTMLMediaElement) {
    const state = stateOf(this);
    if (state.paused) return;
    state.paused = true;
    emit(this, "timeupdate", "pause");
  };
}
