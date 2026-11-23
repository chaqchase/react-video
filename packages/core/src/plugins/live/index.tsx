"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";

export interface LiveOptions {
  /** How many seconds behind the edge still counts as live. */
  edgeTolerance?: number;
}

/** Shorter live windows aren't worth a scrubber. */
const DVR_MIN_SECONDS = 60;

/**
 * The live pill, the jump back to the edge, and a window to scrub through when the
 * stream keeps one. Engines report live state themselves, and this reads it from the
 * element for native HLS on Apple devices.
 */
export const live = definePlugin("live", (options: LiveOptions = {}) => {
  const { edgeTolerance = 6 } = options;
  return {
    state: () => ({
      /** True while the current source is live. */
      active: false,
      /** True when the viewer can seek back through a window of the stream. */
      dvr: false,
      /** True within `edgeTolerance` seconds of the live edge, and when the source isn't live. */
      atEdge: true,
    }),
    attrs: {
      "data-live": (state) => state.active,
      "data-dvr": (state) => state.active && state.dvr,
      "data-live-edge": (state) => state.active && state.atEdge,
    },
    commands: (context) => ({
      /** Jumps to the live edge, and plays if paused. */
      goLive() {
        const edge = context.media().live?.edge;
        if (edge === undefined) return;
        context.commands.seek(edge);
        if (context.media().paused) void context.commands.play();
      },
    }),
    setup(context, scope) {
      const update = (time: number) => {
        const stream = context.media().live;
        context.set({
          active: stream !== null,
          dvr: stream?.dvr ?? false,
          atEdge: stream ? stream.edge - time <= edgeTolerance : true,
        });
      };
      scope.add(context.clock.bind(update, () => 1));
      context.watch(
        scope,
        (media) => media.live,
        () => update(context.clock.time())
      );
    },
    attach(context, element, scope) {
      const read = () => {
        const media = context.media();
        if (media.provider !== "native" || element.duration !== Infinity) return;
        const { seekable } = element;
        if (seekable.length === 0) return;
        const start = seekable.start(0);
        const edge = seekable.end(seekable.length - 1);
        if (media.live?.edge === edge && media.live.start === start) return;
        const dvr = edge - start >= DVR_MIN_SECONDS;
        context.report({
          live: { dvr, start, edge, latency: 0 },
          timeline: { start, end: edge, kind: dvr ? "dvr" : "live" },
          capabilities: { ...media.capabilities, seek: dvr, rate: dvr },
        });
      };
      scope.on(element, "durationchange", read);
      scope.on(element, "progress", read);
      scope.on(element, "timeupdate", read);
    },
    slots: { "controls-start": LiveIndicator },
  };
});

export type LiveIndicatorProps = ButtonProps;

/** Says when playback is live, and returns there when it isn't. Hidden otherwise. */
export const LiveIndicator = forwardRef<HTMLButtonElement, LiveIndicatorProps>(
  function LiveIndicator({ onClick, ...props }, ref) {
    const active = useVideoState(live, (state) => state.active);
    const atEdge = useVideoState(live, (state) => state.atEdge);
    const { goLive } = useCommands(live);
    const text = useLabel("live", "Live");
    const jump = useLabel("goLive", "Go to live");
    const paused = useVideoState((media) => media.paused);
    if (!active) return null;
    const onEdge = atEdge && !paused;
    return (
      <Button
        ref={ref}
        data-part="live"
        data-edge={onEdge ? "" : undefined}
        aria-label={onEdge ? text : jump}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) goLive();
        }}
        {...props}
      >
        <span aria-hidden="true">{text.toUpperCase()}</span>
      </Button>
    );
  }
);
LiveIndicator.displayName = "Video.LiveIndicator";
