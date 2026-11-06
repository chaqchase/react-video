import type { Player } from "../core/types";

/** The same lookup as `useLabel`, for plugin code that runs outside of React. */
export function labelFrom(player: Player, key: string, fallback: string): string {
  const slice = player.getState().i18n as { strings?: Record<string, string> } | undefined;
  return slice?.strings?.[key] ?? fallback;
}
