"use client";

import { definePlugin } from "../../core/plugin";
import type { Scope } from "../../core/scope";
import type { ReactElement } from "react";
import type { MediaState, Provider, Sink, SourceObject } from "../../core/types";
import { formatTime } from "../../lib/format-time";
import { useCommands, useCurrentTime, useLabel, useVideoState } from "../../react/hooks";
import { Button } from "../../react/primitives/button";
import type { AdEngine, AdHost, AdInfo } from "./engine";

export type { AdEngine, AdHost, AdInfo } from "./engine";

export interface AdsOptions {
  /** Creates an engine for each source, or returns null for no ads on that one. */
  engine: (source: SourceObject) => AdEngine | null;
  /** Milliseconds to wait for a pre-roll before playing the content instead. */
  timeout?: number;
  /** Told about every failure, since the viewer never sees them. */
  onError?: (error: unknown) => void;
}

/** Puts an ad on the timeline, so `Timeline` and `Time` need no special cases. */
class AdProvider implements Provider {
  readonly name = "ad";
  private sink: Sink | null = null;

  constructor(private readonly engine: AdEngine) {}

  get time() {
    return this.engine.time;
  }

  attach(_element: HTMLVideoElement | null, sink: Sink, _scope: Scope) {
    this.sink = sink;
  }

  /** Called as each ad in a break begins. */
  show(duration: number) {
    this.sink?.update({
      duration,
      timeline: { start: 0, end: duration, kind: "ad" },
      paused: false,
      started: true,
      status: "ready",
    });
    this.sink?.sync();
  }

  async load() {}

  async play() {
    await this.engine.play();
    this.sink?.update({ paused: false });
  }

  pause() {
    this.engine.pause();
    this.sink?.update({ paused: true });
  }

  seek() {}

  setVolume(volume: number, muted: boolean) {
    this.engine.setVolume(volume, muted);
  }

  setRate() {}

  snapshot(): Partial<MediaState> {
    return { paused: false, waiting: false, seeking: false, ended: false };
  }

  destroy() {
    this.sink = null;
  }
}

/**
 * Ad breaks through a pluggable engine. Failing open is the rule: if an ad is blocked,
 * slow, or broken, the content plays and `onError` hears about it.
 */
export const ads = definePlugin("ads", (options: AdsOptions) => {
  const { timeout = 3000, onError } = options;
  let engine: AdEngine | null = null;
  let requested = false;
  // Reloading a video mustn't show its pre-roll again.
  let requestedFor: string | null = null;
  let inBreak = false;
  let endBreak: () => void = () => {};
  let adProvider: AdProvider | null = null;

  return {
    state: () => ({ active: false, ad: null as AdInfo | null, ownsUi: false }),
    attrs: { "data-ad": (state) => state.active },
    commands: () => ({
      skip() {
        engine?.skip();
      },
      /** Tells the engine the viewer followed the ad's link, for its tracking. */
      clicked() {
        engine?.clicked?.();
      },
    }),
    source(context, source, scope) {
      requested = false;
      if (source.src === requestedFor) return;
      requestedFor = null;
      try {
        engine = options.engine(source);
      } catch (error) {
        onError?.(error);
        engine = null;
      }
      const current = engine;
      scope.add(() => {
        endBreak();
        current?.destroy();
        if (engine === current) engine = null;
      });
      if (!current) return;
      context.set({ ownsUi: current.ownsUi ?? false });
      context.watch(
        scope,
        (media) => media.ended,
        (ended) => {
          if (ended) current.contentEnded?.();
        }
      );
    },
    gates: {
      play(request, next, context) {
        const current = engine;
        const video = context.video();
        const root = context.root();
        if (!current || requested || !video || !root) return next(request);
        requested = true;
        requestedFor = context.media().source?.src ?? null;

        // Unlocks this element for later, since it'll resume after the break, without
        // a gesture. Pausing in the same tick means no sound can play.
        video.play().catch(() => {});
        video.pause();

        const container = document.createElement("div");
        container.setAttribute("data-part", "ad-container");
        root.append(container);

        const host: AdHost = {
          video,
          container,
          breakStart() {
            if (inBreak) return;
            inBreak = true;
            context.commands.pause();
            const unlock = context.lock("ads", ["seek", "rate"]);
            const provider = new AdProvider(current);
            adProvider = provider;
            const release = context.pushProvider(provider);
            context.set({ active: true });
            endBreak = () => {
              if (!inBreak) return;
              inBreak = false;
              endBreak = () => {};
              adProvider = null;
              release();
              unlock();
              context.set({ active: false, ad: null });
            };
          },
          adStart(ad) {
            adProvider?.show(ad.duration);
            context.set({ ad });
          },
          error(error) {
            onError?.(error);
          },
          breakEnd() {
            if (!inBreak) return;
            endBreak();
            void context.commands.play();
          },
        };

        const failOpen = (error: unknown) => {
          onError?.(error);
          if (inBreak) host.breakEnd();
        };

        try {
          current.prepare(host);
        } catch (error) {
          onError?.(error);
          container.remove();
          return next(request);
        }

        let timer: ReturnType<typeof setTimeout> | undefined;
        const expiry = new Promise<"expired">((resolve) => {
          timer = setTimeout(() => resolve("expired"), timeout);
        });
        return Promise.race([current.request(), expiry])
          .catch(failOpen)
          .then((outcome) => {
            clearTimeout(timer);
            // The content starts now, so a pre-roll arriving late mustn't interrupt it.
            if (outcome === "expired" && !inBreak) {
              onError?.(new Error("Timed out waiting for a pre-roll."));
              current.destroy();
              engine = null;
              container.remove();
            }
            // The break's end starts the content, unless there wasn't a break.
            return inBreak ? undefined : next(request);
          });
      },
    },
    slots: { overlay: AdOverlay },
  };
});

/** Says it's an ad and how long is left, and offers skip when allowed. */
export function AdOverlay(): ReactElement | null {
  const ad = useVideoState(ads, (state) => state.ad);
  const ownsUi = useVideoState(ads, (state) => state.ownsUi);
  // Mounted only during ads, since following time renders once a second.
  return ad && !ownsUi ? <ActiveAd ad={ad} /> : null;
}
AdOverlay.displayName = "Video.AdOverlay";

function ActiveAd({ ad }: { ad: AdInfo }) {
  const time = useCurrentTime();
  const { skip, clicked } = useCommands(ads);
  const label = useLabel("ad", "Ad");
  const skipAd = useLabel("skipAd", "Skip ad");
  const skipIn = useLabel("skipAdIn", "Skip in");
  const learnMore = useLabel("learnMore", "Learn more");

  const wait = ad.skipAfter === null ? null : Math.max(Math.ceil(ad.skipAfter - time), 0);
  const remaining = formatTime(Math.max(ad.duration - time, 0));
  const count = (ad.total ?? 1) > 1 ? ` ${ad.position} / ${ad.total}` : "";

  return (
    <div data-part="ad-overlay">
      <span data-part="ad-label">
        {label}
        {count} · {remaining}
      </span>
      {ad.clickThrough ? (
        <a
          data-part="ad-link"
          href={ad.clickThrough}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => clicked()}
        >
          {learnMore}
        </a>
      ) : null}
      {wait !== null ? (
        <Button data-part="ad-skip" disabled={wait > 0} onClick={() => skip()}>
          {wait > 0 ? `${skipIn} ${wait}` : skipAd}
        </Button>
      ) : null}
    </div>
  );
}
