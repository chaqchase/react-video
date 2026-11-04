"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { Scope } from "../../core/scope";
import type {
  LoadRequest,
  MediaState,
  Provider,
  Sink,
  SourceObject,
} from "../../core/types";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { CastIcon } from "../../ui/icons";

const SDK_URL = "https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1";

interface RemotePlayer {
  currentTime: number;
  duration: number;
  isPaused: boolean;
  isMuted: boolean;
  volumeLevel: number;
  playerState: string | null;
  isMediaLoaded: boolean;
}
interface RemoteController {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
  playOrPause(): void;
  seek(): void;
  setVolumeLevel(): void;
  muteOrUnmute(): void;
}
interface CastSession {
  loadMedia(request: unknown): Promise<unknown>;
  endSession(stopCasting: boolean): void;
  getCastDevice(): { friendlyName?: string };
}
interface CastContext {
  setOptions(options: object): void;
  addEventListener(type: string, listener: (event: { castState?: string; sessionState?: string }) => void): void;
  removeEventListener(type: string, listener: (event: never) => void): void;
  requestSession(): Promise<unknown>;
  getCurrentSession(): CastSession | null;
}
interface CastGlobals {
  cast: {
    framework: {
      CastContext: { getInstance(): CastContext };
      RemotePlayer: new () => RemotePlayer;
      RemotePlayerController: new (player: RemotePlayer) => RemoteController;
      RemotePlayerEventType: { ANY_CHANGE: string };
      CastContextEventType: { CAST_STATE_CHANGED: string; SESSION_STATE_CHANGED: string };
      CastState: { NO_DEVICES_AVAILABLE: string };
      SessionState: { SESSION_STARTED: string; SESSION_RESUMED: string; SESSION_ENDED: string };
    };
  };
  chrome: {
    cast: {
      AutoJoinPolicy: { ORIGIN_SCOPED: string };
      media: {
        DEFAULT_MEDIA_RECEIVER_APP_ID: string;
        MediaInfo: new (src: string, type: string) => { metadata?: unknown };
        LoadRequest: new (media: unknown) => { currentTime?: number; autoplay?: boolean };
        GenericMediaMetadata: new () => { title?: string };
      };
    };
  };
  __onGCastApiAvailable?: (available: boolean) => void;
}

const castGlobals = () => globalThis as unknown as CastGlobals;

/** Resolves when the SDK has loaded. Browsers without Cast support never resolve it. */
function loadSdk(url: string, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const globals = castGlobals();
    if (globals.cast?.framework) {
      resolve();
      return;
    }
    const previous = globals.__onGCastApiAvailable;
    globals.__onGCastApiAvailable = (available) => {
      previous?.(available);
      if (available && !signal.aborted) resolve();
    };
    if (!document.querySelector(`script[src="${url}"]`)) {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      document.head.append(script);
    }
  });
}

const typeFor = ({ src, type }: SourceObject) => {
  if (type) return type;
  const path = src.split(/[?#]/)[0] ?? "";
  if (path.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (path.endsWith(".mpd")) return "application/dash+xml";
  return "video/mp4";
};

/** Playback on the receiver, reported through the store like any other provider. */
class CastProvider implements Provider {
  readonly name = "chromecast";
  private readonly player: RemotePlayer;
  private readonly controller: RemoteController;
  private sink: Sink | null = null;

  constructor(
    private readonly session: CastSession,
    private readonly title: string | undefined
  ) {
    const { framework } = castGlobals().cast;
    this.player = new framework.RemotePlayer();
    this.controller = new framework.RemotePlayerController(this.player);
  }

  get time() {
    return this.player.currentTime;
  }

  attach(_element: HTMLVideoElement | null, sink: Sink, scope: Scope) {
    this.sink = sink;
    const { ANY_CHANGE } = castGlobals().cast.framework.RemotePlayerEventType;
    const publish = () => {
      sink.update(this.snapshot());
      sink.sync();
    };
    this.controller.addEventListener(ANY_CHANGE, publish);
    scope.add(() => this.controller.removeEventListener(ANY_CHANGE, publish));
  }

  async load({ source, startTime }: LoadRequest) {
    const { media } = castGlobals().chrome.cast;
    const info = new media.MediaInfo(new URL(source.src, location.href).href, typeFor(source));
    if (this.title) {
      const metadata = new media.GenericMediaMetadata();
      metadata.title = this.title;
      info.metadata = metadata;
    }
    const request = new media.LoadRequest(info);
    if (startTime !== undefined) request.currentTime = startTime;
    request.autoplay = true;
    await this.session.loadMedia(request);
  }

  async play() {
    if (this.player.isPaused) this.controller.playOrPause();
  }

  pause() {
    if (!this.player.isPaused) this.controller.playOrPause();
  }

  seek(time: number) {
    this.player.currentTime = time;
    this.controller.seek();
  }

  setVolume(volume: number, muted: boolean) {
    this.player.volumeLevel = volume;
    this.controller.setVolumeLevel();
    if (muted !== this.player.isMuted) this.controller.muteOrUnmute();
  }

  // The default receiver has no way to change rate.
  setRate() {}

  snapshot(): Partial<MediaState> {
    const { duration, isPaused, isMuted, volumeLevel, playerState, isMediaLoaded } = this.player;
    return {
      duration,
      timeline: { start: 0, end: duration, kind: "vod" },
      paused: isPaused,
      muted: isMuted,
      volume: volumeLevel,
      waiting: playerState === "BUFFERING",
      ...(isMediaLoaded && { status: "ready" as const, started: true }),
    };
  }

  destroy() {
    this.sink = null;
  }
}

export interface ChromecastOptions {
  /** A custom receiver's ID. Defaults to Google's default receiver. */
  receiverId?: string;
  /** Where to load the Cast SDK from. */
  sdkUrl?: string;
  /** The title the receiver shows. */
  title?: string | ((source: SourceObject) => string | undefined);
}

/**
 * Sends playback to a Chromecast. The Cast SDK loads at runtime, only in browsers
 * that support it, and the receiver then acts as the top provider. The default
 * receiver can't play DRM content.
 */
export const chromecast = definePlugin("chromecast", (options: ChromecastOptions = {}) => {
  let release: (() => void) | null = null;
  let session: CastSession | null = null;

  return {
    state: () => ({
      available: false,
      active: false,
      device: null as string | null,
    }),
    attrs: { "data-casting": (state) => state.active },
    commands: () => ({
      /** Opens the device picker. Must run from a click or key press. */
      toggle() {
        const context = castGlobals().cast?.framework.CastContext.getInstance();
        const current = context?.getCurrentSession();
        if (current) current.endSession(true);
        else context?.requestSession().catch(() => {});
      },
    }),
    setup(context, scope) {
      if (typeof document === "undefined") return;

      const titleOf = (source: SourceObject | null) => {
        const { title } = options;
        return typeof title === "function" && source ? title(source) : (title as string | undefined);
      };

      /** Hands the current source to the receiver, from where local playback is. */
      const start = (current: CastSession) => {
        session = current;
        const { source } = context.media();
        const startTime = context.clock.time();
        context.commands.pause();
        const provider = new CastProvider(current, titleOf(source));
        release = context.pushProvider(provider);
        context.set({ active: true, device: current.getCastDevice().friendlyName ?? null });
        if (source) {
          provider.load({ source, startTime }).catch(() => {
            context.player.plugin(chromecast).commands.toggle();
          });
        }
      };

      /** Back to the local element, from where the receiver got to. */
      const stop = () => {
        if (!release) return;
        const time = context.clock.time();
        release();
        release = null;
        session = null;
        context.set({ active: false, device: null });
        context.commands.seek(time);
      };
      scope.add(stop);

      void loadSdk(options.sdkUrl ?? SDK_URL, scope.signal).then(() => {
        if (scope.signal.aborted) return;
        const { cast, chrome } = castGlobals();
        const { CastContext, CastContextEventType, CastState, SessionState } = cast.framework;
        const castContext = CastContext.getInstance();
        castContext.setOptions({
          receiverApplicationId:
            options.receiverId ?? chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
          autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
        });

        const onCastState = (event: { castState?: string }) => {
          context.set({ available: event.castState !== CastState.NO_DEVICES_AVAILABLE });
        };
        const onSessionState = (event: { sessionState?: string }) => {
          const { sessionState } = event;
          if (sessionState === SessionState.SESSION_ENDED) stop();
          else if (
            sessionState === SessionState.SESSION_STARTED ||
            sessionState === SessionState.SESSION_RESUMED
          ) {
            const current = castContext.getCurrentSession();
            if (current) start(current);
          }
        };
        castContext.addEventListener(CastContextEventType.CAST_STATE_CHANGED, onCastState);
        castContext.addEventListener(CastContextEventType.SESSION_STATE_CHANGED, onSessionState);
        scope.add(() => {
          castContext.removeEventListener(CastContextEventType.CAST_STATE_CHANGED, onCastState);
          castContext.removeEventListener(CastContextEventType.SESSION_STATE_CHANGED, onSessionState);
        });
      });
    },
    // A new source while casting goes to the receiver too. Changing source already
    // removed the last provider, so this adds a fresh one.
    gates: {
      load(request, next, context) {
        if (!session) return next(request);
        const current = session;
        const provider = new CastProvider(current, undefined);
        release = context.pushProvider(provider);
        void provider.load(request).catch(() => {});
        return next(request);
      },
    },
    slots: { "controls-end": CastButton, overlay: CastingOverlay },
  };
});

export type CastButtonProps = ButtonProps;

/** Renders nothing until a device is available. */
export const CastButton = forwardRef<HTMLButtonElement, CastButtonProps>(function CastButton(
  { onClick, children, ...props },
  ref
) {
  const available = useVideoState(chromecast, (state) => state.available);
  const active = useVideoState(chromecast, (state) => state.active);
  const { toggle } = useCommands(chromecast);
  const label = useLabel("cast", "Cast");
  if (!available && !active) return null;
  return (
    <Button
      ref={ref}
      data-part="cast"
      aria-label={label}
      aria-pressed={active}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      }}
      {...props}
    >
      {children ?? <CastIcon />}
    </Button>
  );
});
CastButton.displayName = "Video.CastButton";

/** Says where playback went, over the video that's no longer playing. */
export function CastingOverlay() {
  const active = useVideoState(chromecast, (state) => state.active);
  const device = useVideoState(chromecast, (state) => state.device);
  const castingTo = useLabel("castingTo", "Casting to");
  if (!active) return null;
  return (
    <div data-part="casting" role="status">
      <CastIcon />
      <p>
        {castingTo} {device ?? "Chromecast"}
      </p>
    </div>
  );
}
CastingOverlay.displayName = "Video.CastingOverlay";
