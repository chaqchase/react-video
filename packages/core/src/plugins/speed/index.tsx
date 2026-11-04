"use client";

import { definePlugin } from "../../core/plugin";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuRadioGroup } from "../../react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../react/primitives/menu-radio-item";
import { MenuSub } from "../../react/primitives/menu-sub";

export interface SpeedOptions {
  /** The rates to offer, in order. */
  rates?: readonly number[];
}

const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

/** Playback rate choices, and the menu to pick from them. */
export const speed = definePlugin("speed", (options: SpeedOptions = {}) => {
  const rates = options.rates ?? DEFAULT_RATES;
  return {
    state: () => ({ rates }),
    commands(context) {
      const step = (direction: 1 | -1) => {
        const { rate } = context.media();
        const sorted = [...rates].sort((a, b) => a - b);
        const next =
          direction > 0
            ? sorted.find((candidate) => candidate > rate)
            : sorted.reverse().find((candidate) => candidate < rate);
        if (next !== undefined) context.commands.setRate(next);
      };
      return {
        set: (rate: number) => context.commands.setRate(rate),
        faster: () => step(1),
        slower: () => step(-1),
      };
    },
    slots: { menu: SpeedMenu },
  };
});

const formatRate = (rate: number, normal: string) => (rate === 1 ? normal : `${rate}×`);

/** Renders nothing while something, like an ad, locks the rate. */
export function SpeedMenu() {
  const rates = useVideoState(speed, (state) => state.rates);
  const rate = useVideoState((media) => media.rate);
  const locked = useVideoState(
    (media) =>
      !media.capabilities.rate ||
      media.locks.some(({ commands }) => commands.includes("rate"))
  );
  const { set } = useCommands(speed);
  const title = useLabel("speed", "Speed");
  const normal = useLabel("normal", "Normal");
  if (locked) return null;

  return (
    <MenuSub title={title} value={formatRate(rate, normal)} data-menu="speed">
      <MenuRadioGroup value={String(rate)} onValueChange={(value) => set(Number(value))}>
        {rates.map((option) => (
          <MenuRadioItem key={option} value={String(option)}>
            {formatRate(option, normal)}
          </MenuRadioItem>
        ))}
      </MenuRadioGroup>
    </MenuSub>
  );
}
SpeedMenu.displayName = "Video.SpeedMenu";
