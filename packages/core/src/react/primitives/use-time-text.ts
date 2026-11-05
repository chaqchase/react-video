"use client";

import { useCallback, useEffect, useRef, type HTMLAttributes } from "react";
import { usePlayer } from "../context";
import { useClock } from "../hooks";

const everySecond = () => 1;

export type TimeProps = HTMLAttributes<HTMLSpanElement>;

export function useTimeText(format: (time: number, duration: number) => string) {
  const player = usePlayer();
  const element = useRef<HTMLSpanElement | null>(null);
  const write = useCallback(
    (time: number) => {
      const node = element.current;
      if (!node) return;
      const text = format(time, player.getState().media.duration);
      if (node.textContent !== text) node.textContent = text;
    },
    [format, player]
  );
  useClock(write, everySecond);
  // The clock is stopped until playback, and the duration usually arrives before that.
  useEffect(() => {
    let known = player.getState().media.duration;
    return player.subscribe(() => {
      const { duration } = player.getState().media;
      if (duration === known) return;
      known = duration;
      player.clock.sync();
    });
  }, [player]);
  return element;
}
