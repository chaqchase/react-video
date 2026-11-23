"use client";

import { createContext, useContext } from "react";
import { VideoKitError } from "../core/kit-error";
import type { Player } from "../core/types";

export const PlayerContext = createContext<Player | null>(null);

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) {
    throw new VideoKitError("part-outside-root", "react-video-kit: this part must be inside <Video.Root>.");
  }
  return player;
}
