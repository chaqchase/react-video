"use client";

import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button } from "../../react/primitives/button";

export interface AutoplayOptions {
  /** Try again muted when the browser refuses sound. Defaults to true. */
  muted?: boolean;
  /** Start even for viewers who prefer reduced motion. Defaults to false. */
  ignoreReducedMotion?: boolean;
}

/**
 * Starts playback on load, with sound if allowed, then muted with a chip offering
 * sound, and otherwise leaves the viewer with the normal play button. Viewers who
 * prefer reduced motion aren't started automatically, unless told otherwise.
 */
export const autoplay = definePlugin("autoplay", (options: AutoplayOptions = {}) => ({
  state: () => ({ mutedFallback: false }),
  attrs: { "data-autoplay-muted": (state) => state.mutedFallback },
  commands: (context) => ({
    unmute() {
      context.commands.setMuted(false);
      context.set({ mutedFallback: false });
    },
  }),
  setup(context, scope) {
    context.watch(scope, (media) => media.muted, (muted) => {
      if (!muted) context.set({ mutedFallback: false });
    });
  },
  source(context, _source, scope) {
    let attempted = false;
    context.watch(
      scope,
      (media) => media.status,
      async (status) => {
        if (status !== "ready" || attempted) return;
        attempted = true;
        const calm =
          !options.ignoreReducedMotion &&
          typeof matchMedia !== "undefined" &&
          matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (calm) return;
        if (await context.commands.play()) return;
        const refused = context.media().playRejected === "NotAllowedError";
        if (scope.signal.aborted || !refused || options.muted === false) return;
        const wasMuted = context.media().muted;
        // Before muting, so that anything watching can tell this isn't the viewer's mute.
        context.set({ mutedFallback: !wasMuted });
        context.commands.setMuted(true);
        if (await context.commands.play()) return;
        context.commands.setMuted(wasMuted);
        context.set({ mutedFallback: false });
      }
    );
  },
  slots: { overlay: UnmuteChip },
}));

/** Offers sound after a muted autoplay, until the viewer unmutes in any way. */
export function UnmuteChip() {
  const visible = useVideoState(
    autoplay,
    (state, media) => state.mutedFallback && media.muted && !media.paused
  );
  const { unmute } = useCommands(autoplay);
  const label = useLabel("tapToUnmute", "Tap to unmute");
  if (!visible) return null;
  return (
    <Button data-part="unmute-chip" onClick={() => unmute()}>
      {label}
    </Button>
  );
}
UnmuteChip.displayName = "Video.UnmuteChip";
