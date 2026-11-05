"use client";

import { useEffect, type ReactElement } from "react";
import { definePlugin } from "../../core/plugin";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button } from "../../react/primitives/button";
import { useFocusFallback } from "../../react/primitives/focus-fallback";

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
  state: () => ({
    /** True while playback is muted only because the browser refused sound. */
    mutedFallback: false,
  }),
  attrs: { "data-autoplay-muted": (state) => state.mutedFallback },
  commands: (context) => ({
    /** Turns the sound back on and dismisses the unmute chip. */
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
export function UnmuteChip(): ReactElement | null {
  const visible = useVideoState(
    autoplay,
    (state, media) => state.mutedFallback && media.muted && !media.paused
  );
  return visible ? <ActiveUnmuteChip /> : null;
}
UnmuteChip.displayName = "Video.UnmuteChip";

function ActiveUnmuteChip() {
  const { unmute } = useCommands(autoplay);
  const label = useLabel("tapToUnmute", "Tap to unmute");
  const player = usePlayer();
  const chip = useFocusFallback<HTMLButtonElement>();

  useEffect(() => player.announce(label), [label, player]);

  return (
    <Button ref={chip} data-part="unmute-chip" onClick={() => unmute()}>
      {label}
    </Button>
  );
}
