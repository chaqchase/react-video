import type { ComponentType } from "react";
import type { Clock } from "./clock";
import type { Scope } from "./scope";

export interface SourceObject {
  src: string;
  type?: string;
}

export interface Rendition extends SourceObject {
  label?: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

/** Selects between progressive files of the same content. */
export interface RenditionSet {
  renditions: Rendition[];
  /** Index of the rendition to start with. Defaults to the first. */
  initial?: number;
}

/**
 * A single source, a list of fallbacks tried in order, or the renditions of one
 * video. Fallback lists are not quality levels; use `renditions` for those.
 */
export type SourceInput = string | SourceObject | SourceObject[] | RenditionSet;

export interface QualityLevel {
  id: string;
  label?: string;
  width?: number;
  height?: number;
  bitrate?: number;
}

export interface MediaTrackInfo {
  id: string;
  label?: string;
  language?: string;
  kind?: string;
}

export interface LiveState {
  /** Whether the viewer can seek back through a window. */
  dvr: boolean;
  /** Earliest seekable position. */
  start: number;
  /** Live edge. */
  edge: number;
  /** Distance the engine aims to keep from the edge, in seconds. */
  latency: number;
}

export interface Timeline {
  start: number;
  end: number;
  kind: "vod" | "live" | "dvr" | "ad";
}

export interface MediaErrorInfo {
  code: number | string;
  message: string;
  fatal: boolean;
  source?: SourceObject;
}

export type LockableCommand =
  | "play"
  | "pause"
  | "seek"
  | "rate"
  | "volume"
  | (string & {});

export interface Lock {
  id: string;
  commands: readonly LockableCommand[];
}

export interface Capabilities {
  seek: boolean;
  rate: boolean;
  /** False where the platform owns volume, such as iOS. */
  volume: boolean;
}

export type MediaStatus = "idle" | "loading" | "ready" | "error";

/** Everything the kernel knows about playback. Time is on the clock, not here. */
export interface MediaState {
  status: MediaStatus;
  /** The source that was asked for. Switching rendition doesn't change it. */
  source: SourceObject | null;
  provider: string | null;
  paused: boolean;
  ended: boolean;
  waiting: boolean;
  seeking: boolean;
  /** True while the viewer drags the timeline. `paused` keeps their intent meanwhile. */
  scrubbing: boolean;
  /** True once playback has begun for the current source. */
  started: boolean;
  duration: number;
  buffered: readonly (readonly [number, number])[];
  volume: number;
  muted: boolean;
  rate: number;
  qualities: readonly QualityLevel[];
  quality: {
    mode: "auto" | "manual";
    active: string | null;
    /** Whether the provider can choose levels itself. */
    canAuto?: boolean;
  };
  audioTracks: readonly MediaTrackInfo[];
  audioTrack: string | null;
  /**
   * Text tracks as an engine names them, for those it adds to the video, whose own
   * `label` it can't set. Empty when the video's list says all there is to know.
   */
  textTracks: readonly MediaTrackInfo[];
  live: LiveState | null;
  timeline: Timeline;
  capabilities: Capabilities;
  locks: readonly Lock[];
  error: MediaErrorInfo | null;
  /** Set when the browser refused to start playback, usually autoplay policy. */
  playRejected: string | null;
}

/** The only way a provider reports state. Ignored while the provider is suspended. */
export interface Sink {
  update(state: Partial<MediaState>): void;
  /** Reports that time moved discontinuously, so the clock must write now. */
  sync(): void;
  error(error: MediaErrorInfo): void;
}

export interface LoadRequest {
  source: SourceObject;
  renditions?: readonly Rendition[];
  initialRendition?: number;
  /** Position to resume from, in seconds. */
  startTime?: number;
  /** Set by the DRM plugin's load gate. Providers translate it for their engine. */
  drm?: unknown;
}

/** A media engine behind the normalized player interface. */
export interface Provider {
  readonly name: string;
  /** Called once. `element` is null for remote providers such as Cast. */
  attach(element: HTMLVideoElement | null, sink: Sink, scope: Scope): void;
  load(request: LoadRequest, signal: AbortSignal): Promise<void>;
  play(): Promise<void>;
  pause(): void;
  seek(time: number): void;
  setVolume(volume: number, muted: boolean): void;
  setRate(rate: number): void;
  /** Hot read used by the clock. Must not allocate. */
  readonly time: number;
  setQuality?(id: string | "auto"): void;
  setAudioTrack?(id: string): void;
  setTextTrack?(id: string | null): void;
  /** Current state, re-applied when the provider resumes from suspension. */
  snapshot?(): Partial<MediaState>;
  destroy(): void;
}

export interface ProviderEnvironment {
  element: HTMLVideoElement | null;
}

/** Registered by plugins. `canPlay` must be synchronous and import no engine. */
export interface ProviderEntry {
  name: string;
  canPlay(source: SourceObject, environment: ProviderEnvironment): boolean;
  load(): Promise<new () => Provider>;
}

// Method syntax keeps these bivariant, so a plugin with its own state still fits
// `AnyPlugin` without `any` or casts at the `plugins` prop.
export type Gate<Request, State extends object = object> = {
  run(
    request: Request,
    next: (request: Request) => void | Promise<void>,
    context: PluginContext<State>
  ): void | Promise<void>;
}["run"];

export interface Gates<State extends object = object> {
  load?: Gate<LoadRequest, State>;
  play?: Gate<void, State>;
  seek?: Gate<number, State>;
}

export interface CoreCommands {
  /** Resolves to whether playback started. Never rejects. */
  play(): Promise<boolean>;
  pause(): void;
  seek(time: number): void;
  /** Holds playback while the viewer drags the timeline, then restores it. */
  scrub(active: boolean): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  setQuality(id: string | "auto"): void;
  setAudioTrack(id: string): void;
  setTextTrack(id: string | null): void;
  setSource(source: SourceInput | null): void;
  /**
   * Loads the current source again, optionally resuming from `startTime`. After a
   * failure it picks up where that interrupted, and plays if the viewer was watching.
   */
  reload(startTime?: number): void;
}

export interface PluginContext<State extends object> {
  readonly player: Player;
  readonly clock: Clock;
  readonly commands: CoreCommands;
  state(): State;
  set(state: Partial<State>): void;
  media(): MediaState;
  /** Writes media state, for plugins that normalize something providers can't. */
  report(state: Partial<MediaState>): void;
  video(): HTMLVideoElement | null;
  root(): HTMLElement | null;
  /** Calls `listener` whenever the selected value changes, until `scope` ends. */
  watch<Value>(
    scope: Scope,
    select: (media: MediaState) => Value,
    listener: (value: Value, previous: Value) => void
  ): void;
  /** Blocks commands until the returned function is called. */
  lock(id: string, commands: readonly LockableCommand[]): () => void;
  isLocked(command: LockableCommand): boolean;
  registerProvider(entry: ProviderEntry): void;
  /** Hands playback to `provider` until the returned function is called. */
  pushProvider(provider: Provider): () => void;
  /** Reads an optional dependency without importing its code. */
  find<Factory extends AnyPluginFactory>(
    name: Factory["pluginName"]
  ): PluginHandle<Factory> | undefined;
}

export type SlotName = "controls-start" | "controls-end" | "overlay" | "menu" | (string & {});

type AttributeReader<State extends object> = {
  read(
    state: State,
    media: MediaState
  ): string | number | boolean | null | undefined;
}["read"];

export interface PluginSpec<State extends object, Commands extends object> {
  /** Plugins that must be installed. `createPlayer` throws if one is missing. */
  requires?: readonly string[];
  /** Plugins that should run first when present. */
  after?: readonly string[];
  /** Pure. Also runs on the server. */
  state?(): State;
  /** Pure. Also runs on the server, so touch the DOM only when a command runs. */
  commands?(context: PluginContext<State>): Commands;
  /** Data attributes written to Root as state changes, with no React render. */
  attrs?: Record<string, AttributeReader<State>>;
  /** Runs from mount to unmount. */
  setup?(context: PluginContext<State>, scope: Scope): void;
  /** Runs from media attach to detach. */
  attach?(
    context: PluginContext<State>,
    element: HTMLVideoElement,
    scope: Scope
  ): void;
  /** Runs for each source until the next one. */
  source?(
    context: PluginContext<State>,
    source: SourceObject,
    scope: Scope
  ): void;
  gates?: Gates<State>;
  /** Components rendered by `<Slot name>`. */
  slots?: Partial<Record<SlotName, ComponentType>>;
}

export interface PluginInstance<
  Name extends string = string,
  State extends object = object,
  Commands extends object = object,
> {
  readonly name: Name;
  /** Builds the spec. Each player calls this, so an instance can be shared safely. */
  create(): PluginSpec<State, Commands>;
}

export interface PluginFactory<
  Name extends string,
  Options extends unknown[],
  State extends object,
  Commands extends object,
> {
  (...options: Options): PluginInstance<Name, State, Commands>;
  readonly pluginName: Name;
}

/** A plugin instance with its types erased, as `plugins` accepts them. */
export type AnyPlugin = PluginInstance<string, object, object>;

// Function parameters are contravariant, so `never[]` accepts any options.
export interface AnyPluginFactory {
  (...options: never[]): AnyPlugin;
  readonly pluginName: string;
}

export type StateOf<Factory> = Factory extends (
  ...options: never[]
) => PluginInstance<string, infer State, object>
  ? State
  : never;

export type CommandsOf<Factory> = Factory extends (
  ...options: never[]
) => PluginInstance<string, object, infer Commands>
  ? Commands
  : never;

export interface PluginHandle<Factory> {
  state(): StateOf<Factory>;
  commands: CommandsOf<Factory>;
}

export type PlayerState = { media: MediaState } & Record<string, object>;

export interface PlayerOptions {
  plugins?: readonly AnyPlugin[];
  src?: SourceInput | null;
  /** When the provider and its engine load. Defaults to `eager`. */
  load?: LoadStrategy;
}

export type LoadStrategy = "eager" | "visible" | "play";

export interface Player {
  readonly commands: CoreCommands;
  readonly clock: Clock;
  /** Current state of the whole player. */
  getState(): PlayerState;
  /** State to render on the server and during hydration. */
  getInitialState(): PlayerState;
  subscribe(listener: () => void): () => void;
  /** Typed access to a plugin's state and commands. Throws if it isn't installed. */
  plugin<Factory extends AnyPluginFactory>(
    factory: Factory
  ): PluginHandle<Factory>;
  has(name: string): boolean;
  /** Runs plugin `setup` hooks. Re-entrant: safe to mount, unmount, and mount again. */
  mount(root?: HTMLElement | null): () => void;
  /** Connects the media element and begins loading in a microtask. */
  attach(element: HTMLVideoElement): () => void;
  /** Root data attributes for the given state. */
  attributes(state?: PlayerState): Record<string, string>;
  /** Components that plugins contributed to a slot, in plugin order. */
  slot(name: SlotName): readonly ComponentType[];
  video(): HTMLVideoElement | null;
  root(): HTMLElement | null;
}
