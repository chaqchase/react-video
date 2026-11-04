import { nativeProviderEntry } from "../providers/native";
import { createClock } from "./clock";
import { sortPlugins } from "./plugin";
import { createScope, type OwnedScope, type Scope } from "./scope";
import { toLoadRequests } from "./source";
import { createStore } from "./store";
import type {
  AnyPlugin,
  AnyPluginFactory,
  CoreCommands,
  Gate,
  Gates,
  LoadRequest,
  Lock,
  LockableCommand,
  MediaErrorInfo,
  MediaState,
  Player,
  PlayerOptions,
  PlayerState,
  PluginContext,
  PluginHandle,
  PluginSpec,
  Provider,
  ProviderEntry,
  Sink,
  SlotName,
  SourceInput,
  SourceObject,
} from "./types";

type AnySpec = PluginSpec<object, object>;
type AnyContext = PluginContext<object>;

interface InstalledPlugin {
  name: string;
  spec: AnySpec;
  context: AnyContext;
  commands: object;
}

interface StackItem {
  provider: Provider;
  scope: OwnedScope;
}

function createInitialMedia(): MediaState {
  return {
    status: "idle",
    source: null,
    provider: null,
    paused: true,
    ended: false,
    waiting: false,
    seeking: false,
    started: false,
    duration: 0,
    buffered: [],
    volume: 1,
    muted: false,
    rate: 1,
    qualities: [],
    quality: { mode: "auto", active: null },
    audioTracks: [],
    audioTrack: null,
    textTracks: [],
    textTrack: null,
    live: null,
    timeline: { start: 0, end: 0, kind: "vod" },
    capabilities: { seek: true, rate: true, volume: true },
    locks: [],
    error: null,
    playRejected: null,
  };
}

/** Everything that belongs to one source, reset when the source changes. */
function perSourceMedia(): Partial<MediaState> {
  // Viewer preferences, capabilities, and plugin locks outlive a source.
  const {
    volume: _volume,
    muted: _muted,
    rate: _rate,
    capabilities: _capabilities,
    locks: _locks,
    ...perSource
  } = createInitialMedia();
  return perSource;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Builds a player. Pure: it touches no DOM until `mount` and `attach`. */
export function createPlayer(options: PlayerOptions = {}): Player {
  const sorted: AnyPlugin[] = sortPlugins(options.plugins ?? []);

  const slices: Record<string, object> = {};
  for (const { name, spec } of sorted) {
    if (name === "media") {
      throw new Error('react-video-kit: "media" is a reserved plugin name.');
    }
    slices[name] = spec.state?.() ?? {};
  }

  const store = createStore<PlayerState>({
    media: createInitialMedia(),
    ...slices,
  } as PlayerState);
  const clock = createClock();
  const media = () => store.get().media;
  const setMedia = (partial: Partial<MediaState>) => store.set("media", partial);

  const entries = new Map<string, ProviderEntry>();
  const stack: StackItem[] = [];
  const loadStrategy = options.load ?? "eager";

  let input: SourceInput | null | undefined = options.src;
  let root: HTMLElement | null = null;
  let element: HTMLVideoElement | null = null;
  let mountScope: OwnedScope | null = null;
  let attachScope: OwnedScope | null = null;
  let sourceScope: OwnedScope | null = null;
  let loadScheduled = false;
  let loadTriggered = false;
  let loadGeneration = 0;
  let resumeAt: number | undefined;
  let pendingPlays: ((started: boolean) => void)[] = [];

  const top = () => stack[stack.length - 1]?.provider ?? null;

  const isLocked = (command: LockableCommand) =>
    media().locks.some((lock) => lock.commands.includes(command));

  const setClockSource = (provider: Provider | null) => {
    clock.setSource(
      provider && { time: () => provider.time, rate: () => media().rate }
    );
  };

  const applyProviderState = (state: Partial<MediaState>) => {
    // A provider reporting duration without a timeline is on-demand content.
    if (
      state.duration !== undefined &&
      state.timeline === undefined &&
      media().timeline.kind === "vod"
    ) {
      setMedia({
        ...state,
        timeline: { start: 0, end: state.duration, kind: "vod" },
      });
    } else {
      setMedia(state);
    }
  };

  const sinkFor = (provider: Provider): Sink => ({
    update(state) {
      if (top() === provider) applyProviderState(state);
    },
    sync() {
      if (top() === provider) clock.sync();
    },
    error(error) {
      if (top() === provider) handleError(error);
    },
  });

  let failover: (() => boolean) | null = null;

  const handleError = (error: MediaErrorInfo) => {
    if (error.fatal && failover?.()) return;
    if (!error.fatal) {
      setMedia({ error });
      return;
    }
    settlePendingPlays(false);
    setMedia({ error, status: "error", waiting: false, paused: true });
    clock.sync();
  };

  const settlePendingPlays = (started: boolean) => {
    const plays = pendingPlays;
    pendingPlays = [];
    for (const settle of plays) settle(started);
  };

  const gatesOf = <Kind extends keyof Gates>(kind: Kind) =>
    installed.flatMap(({ spec, context }) => {
      const gate = spec.gates?.[kind];
      return gate ? [{ gate, context }] : [];
    });

  /** Runs synchronously up to the first `await`, preserving user activation. */
  const runGates = <Request>(
    gates: { gate: Gate<Request>; context: AnyContext }[],
    request: Request,
    final: (request: Request) => void | Promise<void>
  ): void | Promise<void> => {
    const dispatch = (index: number, current: Request): void | Promise<void> => {
      const link = gates[index];
      if (!link) return final(current);
      return link.gate(current, (next) => dispatch(index + 1, next), link.context);
    };
    return dispatch(0, request);
  };

  const resolveEntry = (source: SourceObject): ProviderEntry | undefined => {
    const environment = { element };
    for (const entry of entries.values()) {
      if (entry.canPlay(source, environment)) return entry;
    }
    return nativeProviderEntry.canPlay(source, environment)
      ? nativeProviderEntry
      : undefined;
  };

  const installBase = (provider: Provider, scope: Scope) => {
    stack.length = 0;
    const itemScope = createScope();
    stack.push({ provider, scope: itemScope });
    scope.add(() => {
      if (stack[0]?.provider === provider) stack.length = 0;
      itemScope.dispose();
      provider.destroy();
    });
    setClockSource(provider);
    provider.attach(element, sinkFor(provider), itemScope);
    const { volume, muted, rate } = media();
    provider.setVolume(volume, muted);
    if (rate !== 1) provider.setRate(rate);
    setMedia({ provider: provider.name });
  };

  const endSource = () => {
    failover = null;
    for (const item of stack.splice(1).reverse()) {
      item.scope.dispose();
      item.provider.destroy();
    }
    const scope = sourceScope;
    sourceScope = null;
    scope?.dispose();
    setClockSource(null);
  };

  const beginLoad = () => {
    endSource();
    loadGeneration += 1;
    const requests = toLoadRequests(input);
    const startTime = resumeAt;
    resumeAt = undefined;
    setMedia(perSourceMedia());
    clock.sync();
    if (requests.length === 0) {
      settlePendingPlays(false);
      return;
    }
    void loadRequest(requests, 0, startTime);
  };

  const loadRequest = async (
    requests: LoadRequest[],
    index: number,
    startTime: number | undefined
  ): Promise<void> => {
    const request = requests[index];
    if (!request) return;
    const scope = createScope();
    sourceScope = scope;
    const { signal } = scope;

    const tryNext = () => {
      if (signal.aborted) return true;
      // Once playback has begun, changing source would lose the viewer's place.
      if (index + 1 >= requests.length || media().started) return false;
      sourceScope = null;
      failover = null;
      scope.dispose();
      void loadRequest(requests, index + 1, startTime);
      return true;
    };
    failover = tryNext;

    const fail = (message: string, code: number | string) => {
      handleError({ code, message, fatal: true, source: request.source });
    };

    setMedia({ status: "loading", source: request.source, error: null });
    for (const { spec, context } of installed) {
      spec.source?.(context, request.source, scope);
    }

    try {
      await runGates(
        gatesOf("load"),
        startTime === undefined ? request : { ...request, startTime },
        async (final) => {
          const entry = resolveEntry(final.source);
          if (!entry) {
            fail(`No provider can play ${final.source.src}`, "no-provider");
            return;
          }
          const ProviderClass = await entry.load();
          if (signal.aborted) return;
          installBase(new ProviderClass(), scope);
          await top()?.load(final, signal);
          if (signal.aborted) return;
          flushPendingPlays();
        }
      );
    } catch (error) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      fail(message, "load-failed");
    }
  };

  const flushPendingPlays = () => {
    if (pendingPlays.length === 0) return;
    const provider = top();
    if (!provider) return;
    const plays = pendingPlays;
    pendingPlays = [];
    void startPlayback(provider).then((started) => {
      for (const settle of plays) settle(started);
    });
  };

  const startPlayback = async (provider: Provider): Promise<boolean> => {
    const generation = loadGeneration;
    try {
      await provider.play();
      return true;
    } catch (error) {
      const current = top();
      if (current !== provider) {
        // A new source interrupted this play, so the viewer no longer wants it.
        if (generation !== loadGeneration) return false;
        // A fallback replaced the failed provider, so the play carries over to it.
        if (current) return startPlayback(current);
        return failover
          ? new Promise((settle) => pendingPlays.push(settle))
          : false;
      }
      const name = error instanceof Error ? error.name : "Error";
      // AbortError means pause() or load() interrupted it, not that it was refused.
      // A failed source already reports itself through `error`.
      const refused = name !== "AbortError" && media().status !== "error";
      setMedia({ paused: true, ...(refused && { playRejected: name }) });
      return false;
    }
  };

  const scheduleLoad = () => {
    if (loadScheduled) return;
    loadScheduled = true;
    // A microtask lets StrictMode's synchronous unmount cancel before any request.
    queueMicrotask(() => {
      loadScheduled = false;
      if (!element || !mountScope) return;
      if (loadTriggered || loadStrategy === "eager" || pendingPlays.length > 0) {
        loadTriggered = true;
        beginLoad();
      } else if (loadStrategy === "visible") {
        waitUntilVisible(mountScope);
      }
    });
  };

  const waitUntilVisible = (scope: Scope) => {
    if (!root || typeof IntersectionObserver === "undefined") {
      loadTriggered = true;
      beginLoad();
      return;
    }
    const observer = new IntersectionObserver((records) => {
      if (records.some((record) => record.isIntersecting)) {
        observer.disconnect();
        loadTriggered = true;
        beginLoad();
      }
    });
    observer.observe(root);
    scope.add(() => observer.disconnect());
  };

  const commands: CoreCommands = {
    play() {
      if (isLocked("play")) return Promise.resolve(false);
      return new Promise((settle) => {
        let reached = false;
        const outcome = runGates(gatesOf("play"), undefined, () => {
          reached = true;
          if (!mountScope) {
            settle(false);
            return;
          }
          if (element && loadScheduled) {
            // Inside the gesture: unlock the element, since the load that's about
            // to start may finish after activation has expired.
            element.play().catch(() => {});
            pendingPlays.push(settle);
            return;
          }
          if (media().status === "error") {
            settle(false);
            return;
          }
          const provider = top();
          if (provider) {
            return startPlayback(provider).then(settle);
          }
          if (!element) {
            settle(false);
            return;
          }
          if (!loadTriggered) {
            element.play().catch(() => {});
            loadTriggered = true;
            beginLoad();
          }
          if (media().status === "idle") {
            settle(false);
            return;
          }
          pendingPlays.push(settle);
        });
        // A gate can decline by never calling next, which must not hang the caller.
        Promise.resolve(outcome).then(
          () => {
            if (!reached) settle(false);
          },
          () => settle(false)
        );
      });
    },
    pause() {
      if (isLocked("pause")) return;
      settlePendingPlays(false);
      top()?.pause();
    },
    seek(time) {
      if (isLocked("seek") || !Number.isFinite(time)) return;
      const { timeline } = media();
      const end = Number.isFinite(timeline.end) ? timeline.end : time;
      const target = clamp(time, timeline.start, Math.max(end, timeline.start));
      void runGates(gatesOf("seek"), target, (final) => {
        top()?.seek(final);
        clock.sync();
      });
    },
    setVolume(volume) {
      if (isLocked("volume") || !Number.isFinite(volume)) return;
      const next = clamp(volume, 0, 1);
      setMedia({ volume: next });
      top()?.setVolume(next, media().muted);
    },
    setMuted(muted) {
      if (isLocked("volume")) return;
      setMedia({ muted });
      top()?.setVolume(media().volume, muted);
    },
    setRate(rate) {
      if (isLocked("rate") || !(rate > 0)) return;
      setMedia({ rate });
      top()?.setRate(rate);
    },
    setQuality(id) {
      top()?.setQuality?.(id);
    },
    setAudioTrack(id) {
      top()?.setAudioTrack?.(id);
    },
    setTextTrack(id) {
      top()?.setTextTrack?.(id);
    },
    setSource(source) {
      input = source;
      resumeAt = undefined;
      if (element && mountScope) {
        loadTriggered = loadTriggered || loadStrategy === "eager";
        if (loadTriggered) scheduleLoad();
      }
    },
    reload(startTime) {
      resumeAt = startTime;
      if (element && mountScope) {
        loadTriggered = true;
        scheduleLoad();
      }
    },
  };

  const pushProvider = (provider: Provider) => {
    const scope = createScope();
    stack.push({ provider, scope });
    setClockSource(provider);
    provider.attach(element, sinkFor(provider), scope);
    applyProviderState({ provider: provider.name, ...provider.snapshot?.() });
    clock.sync();

    return () => {
      const index = stack.findIndex((item) => item.provider === provider);
      if (index === -1) return;
      stack.splice(index, 1);
      scope.dispose();
      provider.destroy();
      const current = top();
      setClockSource(current);
      if (current) {
        applyProviderState({ provider: current.name, ...current.snapshot?.() });
      }
      clock.sync();
    };
  };

  const installed: InstalledPlugin[] = sorted.map(({ name, spec }) => {
    const context: AnyContext = {
      get player() {
        return player;
      },
      clock,
      commands,
      state: () => store.get()[name] as object,
      set: (partial) => store.set(name, partial),
      media,
      video: () => element,
      root: () => root,
      watch(scope, select, listener) {
        let previous = select(media());
        scope.add(
          store.subscribe(() => {
            const value = select(media());
            if (Object.is(value, previous)) return;
            const last = previous;
            previous = value;
            listener(value, last);
          })
        );
      },
      lock(id, locked) {
        const lock: Lock = { id, commands: locked };
        setMedia({ locks: [...media().locks, lock] });
        return () => {
          setMedia({ locks: media().locks.filter((item) => item !== lock) });
        };
      },
      isLocked,
      registerProvider(entry) {
        entries.set(entry.name, entry);
      },
      pushProvider,
      find(pluginName) {
        const plugin = byName.get(pluginName);
        return plugin ? (handleOf(plugin) as never) : undefined;
      },
    };
    return { name, spec, context, commands: {} };
  });

  const byName = new Map(installed.map((plugin) => [plugin.name, plugin]));

  for (const plugin of installed) {
    plugin.commands = plugin.spec.commands?.(plugin.context) ?? {};
  }

  const handleOf = (plugin: InstalledPlugin) => ({
    state: () => store.get()[plugin.name],
    commands: plugin.commands,
  });

  const activateAttach = () => {
    if (!element || !mountScope || attachScope) return;
    const scope = createScope();
    attachScope = scope;
    for (const { spec, context } of installed) {
      spec.attach?.(context, element, scope);
    }
  };

  const deactivateAttach = () => {
    const scope = attachScope;
    attachScope = null;
    scope?.dispose();
  };

  const coreAttributes = (state: MediaState): Record<string, boolean | string> => ({
    "data-status": state.status,
    "data-playing": !state.paused,
    "data-paused": state.paused,
    "data-started": state.started,
    "data-ended": state.ended,
    "data-waiting": state.waiting,
    "data-seeking": state.seeking,
    "data-muted": state.muted,
    "data-live": state.live !== null,
    "data-error": state.error?.fatal === true,
  });

  const player: Player = {
    commands,
    clock,
    getState: () => store.get(),
    getInitialState: () => store.getInitial(),
    subscribe: store.subscribe,
    plugin<Factory extends AnyPluginFactory>(factory: Factory) {
      const plugin = byName.get(factory.pluginName);
      if (!plugin) {
        throw new Error(
          `react-video-kit: plugin "${factory.pluginName}" isn't installed. Add ${factory.pluginName}() to the plugins prop.`
        );
      }
      return handleOf(plugin) as unknown as PluginHandle<Factory>;
    },
    has: (name) => byName.has(name),
    mount(nextRoot) {
      root = nextRoot ?? null;
      const scope = createScope();
      mountScope = scope;
      scope.add(
        store.subscribe(() => {
          const { paused, ended } = media();
          clock.setRunning(!paused && !ended);
        })
      );
      for (const { spec, context } of installed) {
        spec.setup?.(context, scope);
      }
      activateAttach();
      if (element) scheduleLoad();

      return () => {
        settlePendingPlays(false);
        deactivateAttach();
        endSource();
        mountScope = null;
        loadTriggered = false;
        clock.setRunning(false);
        scope.dispose();
        root = null;
      };
    },
    attach(next) {
      element = next;
      activateAttach();
      if (mountScope) scheduleLoad();

      return () => {
        if (element !== next) return;
        settlePendingPlays(false);
        deactivateAttach();
        endSource();
        loadTriggered = false;
        clock.setRunning(false);
        element = null;
        // Hidden <Activity> trees keep their DOM, so stop the audio explicitly.
        next.pause();
      };
    },
    attributes(state = store.get()) {
      const values: Record<string, unknown> = coreAttributes(state.media);
      for (const { name, spec } of installed) {
        for (const [attribute, read] of Object.entries(spec.attrs ?? {})) {
          values[attribute] = read(state[name] as object, state.media);
        }
      }
      const attributes: Record<string, string> = {};
      for (const [attribute, value] of Object.entries(values)) {
        if (value === false || value === null || value === undefined) continue;
        attributes[attribute] = value === true ? "" : String(value);
      }
      return attributes;
    },
    slot: (name: SlotName) =>
      installed.flatMap(({ spec }) => spec.slots?.[name] ?? []),
    video: () => element,
    root: () => root,
  };

  return player;
}
