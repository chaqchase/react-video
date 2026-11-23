import type { ComponentType } from "react";
import type { Clock } from "./clock";
import type { Scope } from "./scope";

export interface SourceObject {
  /** URL of the media file or stream. */
  src: string;
  /** MIME type, used instead of the URL's extension to choose a provider. */
  type?: string;
}

export interface Rendition extends SourceObject {
  /** Name in the quality menu, defaulting to the height, such as `720p`. */
  label?: string;
  /** Width in pixels, passed on to the quality level. */
  width?: number;
  /** Height in pixels, which sorts the quality menu. */
  height?: number;
  /** Bits per second, passed on to the quality level. */
  bitrate?: number;
}

/** Selects between progressive files of the same content. */
export interface RenditionSet {
  /** The files to switch between, one for each quality. */
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
  /** Identifies the level to `setQuality` and in `quality.active`. */
  id: string;
  /** Name shown in the quality menu. */
  label?: string;
  /** Width in pixels. */
  width?: number;
  /** Height in pixels, which sorts the quality menu. */
  height?: number;
  /** Bits per second. */
  bitrate?: number;
}

export interface MediaTrackInfo {
  /** Identifies the track to commands that select one. */
  id: string;
  /** Name shown in menus. */
  label?: string;
  /** Language tag, such as `en`. */
  language?: string;
  /** The track's role as its source reports it, such as `main` or `subtitles`. */
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
  /** Earliest position the viewer can seek to, in seconds. */
  start: number;
  /** Latest position the viewer can seek to, in seconds. */
  end: number;
  /** What's playing: on-demand video, a live stream, a live stream with a seek window, or an ad. */
  kind: "vod" | "live" | "dvr" | "ad";
}

/** Every code the library reports. `react-video-kit/errors` lists them with their details. */
export type KnownVideoErrorCode =
  | "media-aborted"
  | "media-network"
  | "media-decode"
  | "media-unsupported"
  | "media-unknown"
  | "source-no-provider"
  | "source-load-failed"
  | "play-blocked"
  | "play-failed"
  | "quality-switch"
  | "hls-engine-load"
  | "hls-manifest"
  | "hls-manifest-invalid"
  | "hls-playlist"
  | "hls-segment"
  | "hls-key"
  | "hls-network"
  | "hls-codecs"
  | "hls-media"
  | "hls-unknown"
  | "dash-engine-load"
  | "dash-manifest"
  | "dash-manifest-invalid"
  | "dash-segment"
  | "dash-network"
  | "dash-unsupported"
  | "dash-media"
  | "dash-captions"
  | "dash-time-sync"
  | "dash-unknown"
  | "drm-unsupported"
  | "drm-config"
  | "drm-certificate"
  | "drm-license"
  | "drm-denied"
  | "drm-session"
  | "drm-output-restricted"
  | "drm-expired"
  | "ads-setup"
  | "ads-request"
  | "ads-timeout"
  | "ads-playback"
  | "cast-sdk"
  | "cast-session"
  | "cast-load";

/** A known code, or a plugin's own. */
export type VideoErrorCode = KnownVideoErrorCode | (string & {});

/** The codes on errors thrown for a mistake in the code using the library. */
export type DeveloperErrorCode =
  | "plugin-reserved-name"
  | "plugin-duplicate"
  | "plugin-no-code"
  | "plugin-cycle"
  | "plugin-missing"
  | "plugin-not-installed"
  | "part-outside-root"
  | "part-outside-menu"
  | "part-outside-radio-group"
  | "part-outside-timeline"
  | "provider-no-element";

export interface MediaErrorInfo {
  /** Says what went wrong, in a form that stays the same between versions. */
  code: VideoErrorCode;
  /** The browser's or engine's own words, for logs. Viewers see translated text instead. */
  message: string;
  /** True when the error stopped playback, false when it can carry on. */
  fatal: boolean;
  /**
   * True when trying again could work, which `recovery` and **Try again** go by. When
   * it's left out, `recovery` doesn't retry and the overlay still offers **Try again**.
   */
  retryable?: boolean;
  /** The browser's or engine's own code, such as `3` from a `MediaError` or `fragLoadError` from hls.js. */
  nativeCode?: number | string;
  /** The original error object or event, for logs. */
  cause?: unknown;
  /** The source that failed, when known. */
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
  /** Names what holds the lock, such as `ads`. */
  id: string;
  /** The commands blocked while the lock is held. */
  commands: readonly LockableCommand[];
}

export interface Capabilities {
  /** False where seeking isn't possible, such as a live stream with no window. */
  seek: boolean;
  /** False where the rate can't change, such as on a Cast receiver. */
  rate: boolean;
  /** False where the platform owns volume, such as iOS. */
  volume: boolean;
}

export type MediaStatus = "idle" | "loading" | "ready" | "error";

/** Everything the kernel knows about playback. Time is on the clock, not here. */
export interface MediaState {
  /** The load stage, from `idle` through `loading` to `ready`, or `error` after a fatal failure. */
  status: MediaStatus;
  /** The source that was asked for. Switching rendition doesn't change it. */
  source: SourceObject | null;
  /** The name of the active provider, such as `native` or `hls`, or null before one loads. */
  provider: string | null;
  /** True while playback is paused, and left as it was during scrubbing. */
  paused: boolean;
  /** True once playback has reached the end. */
  ended: boolean;
  /** True while playback has stalled, waiting for data. */
  waiting: boolean;
  /** True while a seek is in progress. */
  seeking: boolean;
  /** True while the viewer drags the timeline. `paused` keeps their intent meanwhile. */
  scrubbing: boolean;
  /** True once playback has begun for the current source. */
  started: boolean;
  /** Length in seconds, which is 0 until known and `Infinity` for a stream with no end. */
  duration: number;
  /** The ranges downloaded so far, as start and end pairs in seconds. */
  buffered: readonly (readonly [number, number])[];
  /** The volume, from 0 to 1. */
  volume: number;
  /** True while the sound is muted. */
  muted: boolean;
  /** The playback speed, where 1 is normal. */
  rate: number;
  /** The levels the provider offers. */
  qualities: readonly QualityLevel[];
  /** The active level, and who chose it: the provider or the viewer. */
  quality: {
    mode: "auto" | "manual";
    active: string | null;
    /** Whether the provider can choose levels itself. */
    canAuto?: boolean;
  };
  /** The audio tracks to choose from. */
  audioTracks: readonly MediaTrackInfo[];
  /** The id of the active audio track, or null when there is none. */
  audioTrack: string | null;
  /**
   * Text tracks as an engine names them, for those it adds to the video, whose own
   * `label` it can't set. Empty when the video's list says all there is to know.
   */
  textTracks: readonly MediaTrackInfo[];
  /** Details of the live stream, or null when the source isn't live. */
  live: LiveState | null;
  /** The range the viewer can seek through, and what kind of content it covers. */
  timeline: Timeline;
  /** What the current provider or stream allows. */
  capabilities: Capabilities;
  /** The locks in force, which block commands until released. */
  locks: readonly Lock[];
  /** The latest error, cleared by the next load. Check `fatal`, since playback may be carrying on. */
  error: MediaErrorInfo | null;
  /** The name of the error when the browser refused to start playback, usually autoplay policy. */
  playRejected: string | null;
}

/** The only way a provider reports state. Ignored while the provider is suspended. */
export interface Sink {
  /** Reports changed state, which the player merges into `MediaState`. */
  update(state: Partial<MediaState>): void;
  /** Reports that time moved discontinuously, so the clock must write now. */
  sync(): void;
  /** Reports a failure, which stops playback if it's fatal. */
  error(error: MediaErrorInfo): void;
}

export interface LoadRequest {
  /** The URL and type to load. */
  source: SourceObject;
  /** All the files of this video, for providers that switch between them. */
  renditions?: readonly Rendition[];
  /** Position in `renditions` of the file that `source` points to. */
  initialRendition?: number;
  /** Position to resume from, in seconds. */
  startTime?: number;
  /** Set by the DRM plugin's load gate. Providers translate it for their engine. */
  drm?: unknown;
}

/** A media engine behind the normalized player interface. */
export interface Provider {
  /** Appears in `MediaState.provider` while this provider is active. */
  readonly name: string;
  /** Called once. `element` is null for remote providers such as Cast. */
  attach(element: HTMLVideoElement | null, sink: Sink, scope: Scope): void;
  /** Loads the request, and should stop if `signal` aborts. */
  load(request: LoadRequest, signal: AbortSignal): Promise<void>;
  /** Starts playback, rejecting if the browser refuses. */
  play(): Promise<void>;
  /** Pauses playback. */
  pause(): void;
  /** Moves to `time`, in seconds. */
  seek(time: number): void;
  /** Applies the volume, from 0 to 1, and the muted setting. */
  setVolume(volume: number, muted: boolean): void;
  /** Applies a playback rate, where 1 is normal speed. */
  setRate(rate: number): void;
  /** Hot read used by the clock. Must not allocate. */
  readonly time: number;
  /** Switches to the level with this id, or to automatic choice with `auto`. */
  setQuality?(id: string | "auto"): void;
  /** Switches to the audio track with this id. */
  setAudioTrack?(id: string): void;
  /** Uses the text track with this id, or none with null. */
  setTextTrack?(id: string | null): void;
  /** Current state, re-applied when the provider resumes from suspension. */
  snapshot?(): Partial<MediaState>;
  /** Releases everything the provider holds, when it's removed. */
  destroy(): void;
}

export interface ProviderEnvironment {
  /** The player's video element, or null if there isn't one yet. */
  element: HTMLVideoElement | null;
}

/** Registered by plugins. `canPlay` must be synchronous and import no engine. */
export interface ProviderEntry {
  /** Identifies the entry, so registering the same name again replaces it. */
  name: string;
  /** Returns true when this provider can play `source`. */
  canPlay(source: SourceObject, environment: ProviderEnvironment): boolean;
  /** Loads the provider's code and resolves to its class. */
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
  /** Runs before a source loads, and can change the request or hold it back. */
  load?: Gate<LoadRequest, State>;
  /** Runs when `play` is called, and can delay or decline it. */
  play?: Gate<void, State>;
  /** Runs before a seek, and can change the position or decline it. */
  seek?: Gate<number, State>;
}

export interface CoreCommands {
  /** Resolves to whether playback started. Never rejects. */
  play(): Promise<boolean>;
  /** Pauses playback, unless a lock blocks it. */
  pause(): void;
  /** Moves to `time` in seconds, kept within the timeline. */
  seek(time: number): void;
  /** Holds playback while the viewer drags the timeline, then restores it. */
  scrub(active: boolean): void;
  /** Sets the volume, keeping it between 0 and 1. */
  setVolume(volume: number): void;
  /** Mutes or unmutes, leaving the volume as it is. */
  setMuted(muted: boolean): void;
  /** Sets the playback speed, ignoring anything that isn't above 0. */
  setRate(rate: number): void;
  /** Switches to this level, or to automatic choice with `auto` if the provider offers it. */
  setQuality(id: string | "auto"): void;
  /** Switches to the audio track with this id. */
  setAudioTrack(id: string): void;
  /** Tells the provider which text track to use, or none with null. */
  setTextTrack(id: string | null): void;
  /** Changes what plays, or clears it with null. */
  setSource(source: SourceInput | null): void;
  /**
   * Loads the current source again, optionally resuming from `startTime`. After a
   * failure it picks up where that interrupted, and plays if the viewer was watching.
   */
  reload(startTime?: number): void;
}

export interface PluginContext<State extends object> {
  /** The player this plugin is installed on. */
  readonly player: Player;
  /** The player's clock, for reading and following playback time. */
  readonly clock: Clock;
  /** The player's core commands. */
  readonly commands: CoreCommands;
  /** Reads this plugin's current state. */
  state(): State;
  /** Merges changes into this plugin's state. */
  set(state: Partial<State>): void;
  /** Reads the current media state. */
  media(): MediaState;
  /** Writes media state, for plugins that normalize something providers can't. */
  report(state: Partial<MediaState>): void;
  /** Reports a failure, the way a provider does. A fatal one stops playback or moves to the next source. */
  error(error: MediaErrorInfo): void;
  /** Returns the video element, or null when none is attached. */
  video(): HTMLVideoElement | null;
  /** Returns the player's root element, or null when it isn't mounted. */
  root(): HTMLElement | null;
  /** Calls `listener` whenever the selected value changes, until `scope` ends. */
  watch<Value>(
    scope: Scope,
    select: (media: MediaState) => Value,
    listener: (value: Value, previous: Value) => void
  ): void;
  /** Blocks commands until the returned function is called. */
  lock(id: string, commands: readonly LockableCommand[]): () => void;
  /** Returns true when a lock blocks `command`. */
  isLocked(command: LockableCommand): boolean;
  /** Adds a provider to choose from for each source, tried before the native one. */
  registerProvider(entry: ProviderEntry): void;
  /** Hands playback to `provider` until the returned function is called. */
  pushProvider(provider: Provider): () => void;
  /** Reads an optional dependency without importing its code. */
  find<Factory extends AnyPluginFactory>(
    name: Factory["pluginName"]
  ): PluginHandle<Factory> | undefined;
}

export type SlotName =
  | "top-start"
  | "top-end"
  | "transport-start"
  | "transport-end"
  | "controls-start"
  | "controls-end"
  | "title"
  | "overlay"
  | "menu"
  | (string & {});

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
  /** Hooks that can change or hold back a load, play, or seek. */
  gates?: Gates<State>;
  /** Components rendered by `<Slot name>`. */
  slots?: Partial<Record<SlotName, ComponentType>>;
}

export interface PluginInstance<
  Name extends string = string,
  State extends object = object,
  Commands extends object = object,
> {
  /** The plugin's name, which must be unique within a player. */
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
  /** The plugin's name, as given to `definePlugin`. */
  readonly pluginName: Name;
}

/** A plugin instance with its types erased, as `plugins` accepts them. */
export type AnyPlugin = PluginInstance<string, object, object>;

// Function parameters are contravariant, so `never[]` accepts any options.
export interface AnyPluginFactory {
  (...options: never[]): AnyPlugin;
  /** The name of the plugin this factory creates. */
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
  /** Reads the plugin's current state. */
  state(): StateOf<Factory>;
  /** The commands the plugin offers. */
  commands: CommandsOf<Factory>;
}

export type PlayerState = {
  /** The kernel's playback state, with each plugin's state beside it under the plugin's name. */
  media: MediaState;
} & Record<string, object>;

export interface PlayerOptions {
  /** The plugins to install, fixed once the player is created. */
  plugins?: readonly AnyPlugin[];
  /** The first source to play, which `commands.setSource` can replace. */
  src?: SourceInput | null;
  /** When the provider and its engine load. Defaults to `eager`. */
  load?: LoadStrategy;
}

export type LoadStrategy = "eager" | "visible" | "play";

export interface Player {
  /** Core commands, such as `play` and `seek`. */
  readonly commands: CoreCommands;
  /** The clock, for reading and following playback time. */
  readonly clock: Clock;
  /** Current state of the whole player. */
  getState(): PlayerState;
  /** State to render on the server and during hydration. */
  getInitialState(): PlayerState;
  /** Calls `listener` after state changes, and returns a function that stops it. */
  subscribe(listener: () => void): () => void;
  /**
   * Calls `listener` with every error, fatal or not, and returns a function that stops
   * it. That includes what `media.error` doesn't keep: blocked plays, and a source that
   * failed when another one took over, which arrives with `fatal: false`.
   */
  onError(listener: (error: MediaErrorInfo) => void): () => void;
  /** Typed access to a plugin's state and commands. Throws if it isn't installed. */
  plugin<Factory extends AnyPluginFactory>(
    factory: Factory
  ): PluginHandle<Factory>;
  /** Returns true when a plugin with this name is installed. */
  has(name: string): boolean;
  /**
   * Tells screen readers about a change the viewer's focus isn't on, politely, through
   * a hidden live region. It does nothing until the player mounts. Don't call it on a
   * timer or with the time, since every call is spoken.
   */
  announce(message: string): void;
  /** Runs plugin `setup` hooks. Re-entrant: safe to mount, unmount, and mount again. */
  mount(root?: HTMLElement | null): () => void;
  /** Connects the media element and begins loading in a microtask. */
  attach(element: HTMLVideoElement): () => void;
  /** Root data attributes for the given state. */
  attributes(state?: PlayerState): Record<string, string>;
  /** Components that plugins contributed to a slot, in plugin order. */
  slot(name: SlotName): readonly ComponentType[];
  /** Returns the video element, or null when none is attached. */
  video(): HTMLVideoElement | null;
  /** Returns the root element, or null when the player isn't mounted. */
  root(): HTMLElement | null;
}
