"use client";

import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button } from "../../react/primitives/button";

export interface AutoplayOptions {
  /** Try again muted when the browser refuses sound. Defaults to true. */
  muted?: boolean;
}

/**
 * Starts playback on load, with sound if allowed, then muted with a chip offering
 * sound, and otherwise leaves the viewer with the normal play button.
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
  source(context, _source, scope) {
    let attempted = false;
    context.watch(
      scope,
      (media) => media.status,
      async (status) => {
        if (status !== "ready" || attempted) return;
        attempted = true;
        if (await context.commands.play()) return;
        const refused = context.media().playRejected === "NotAllowedError";
        if (scope.signal.aborted || !refused || options.muted === false) return;
        const wasMuted = context.media().muted;
        context.commands.setMuted(true);
        if (await context.commands.play()) context.set({ mutedFallback: !wasMuted });
        else context.commands.setMuted(wasMuted);
      }
    );
  },
  slots: { overlay: UnmuteChip },
}));

/** Offers sound after a muted autoplay, until the viewer unmutes in any way. */
export function UnmuteChip() {
  const visible = useVideoState(autoplay, (state, media) => state.mutedFallback && media.muted);
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
