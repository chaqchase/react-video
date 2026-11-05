"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { VideoKitError } from "../core/kit-error";
import type {
  AnyPluginFactory,
  CommandsOf,
  CoreCommands,
  MediaState,
  Player,
  PlayerState,
  StateOf,
} from "../core/types";
import { usePlayer } from "./context";

type Equality<Value> = (a: Value, b: Value) => boolean;

/** Compares one level deep, for selectors that build arrays or objects. */
export function shallow<Value>(a: Value, b: Value): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is(a[key as keyof typeof a], b[key as keyof typeof b])
  );
}

type Select<Value> = (state: PlayerState) => Value;

/**
 * Remembers the last selection. Selectors are often inline, so each new function
 * must still reuse an equal previous result, or useSyncExternalStore would loop.
 */
function createSelection<Value>() {
  let last: { state: PlayerState; select: Select<Value>; value: Value } | null = null;

  return (state: PlayerState, select: Select<Value>, isEqual: Equality<Value>) => {
    if (last && last.state === state && last.select === select) return last.value;
    const next = select(state);
    const value = last && isEqual(last.value, next) ? last.value : next;
    last = { state, select, value };
    return value;
  };
}

function useSelected<Value>(
  player: Player,
  select: Select<Value>,
  isEqual: Equality<Value>
): Value {
  const [selection] = useState(() => createSelection<Value>());

  return useSyncExternalStore(
    player.subscribe,
    () => selection(player.getState(), select, isEqual),
    () => selection(player.getInitialState(), select, isEqual)
  );
}

// The plugin overload comes first: a factory is also a function, so it would
// otherwise match `select`.
/** Subscribes to a plugin's state, typed from the plugin factory. */
export function useVideoState<Factory extends AnyPluginFactory, Value>(
  plugin: Factory,
  select: (state: StateOf<Factory>, media: MediaState) => Value,
  isEqual?: Equality<Value>
): Value;
/** Subscribes to kernel media state, re-rendering only when the result changes. */
export function useVideoState<Value>(
  select: (media: MediaState) => Value,
  isEqual?: Equality<Value>
): Value;
export function useVideoState(
  first: AnyPluginFactory | ((media: MediaState) => unknown),
  second?: unknown,
  third?: unknown
): unknown {
  const player = usePlayer();
  const name = "pluginName" in first ? first.pluginName : null;
  if (name && !player.has(name)) {
    throw new VideoKitError(
      "plugin-not-installed",
      `react-video-kit: plugin "${name}" isn't installed. Add ${name}() to the plugins prop.`
    );
  }
  const select = (
    name ? second : first
  ) as (state: object, media: MediaState) => unknown;
  const isEqual = ((name ? third : second) ?? Object.is) as Equality<unknown>;

  return useSelected(
    player,
    (state) =>
      name
        ? select(state[name] as object, state.media)
        : (select as unknown as (media: MediaState) => unknown)(state.media),
    isEqual
  );
}

/** A localized string from the i18n plugin when it's installed, else `fallback`. */
export function useLabel(key: string, fallback: string): string {
  const strings = useSelected(
    usePlayer(),
    (state) => (state.i18n as { strings?: Record<string, string> } | undefined)?.strings,
    Object.is
  );
  return strings?.[key] ?? fallback;
}

/** Core commands, or a plugin's commands when given its factory. */
export function useCommands(): CoreCommands;
export function useCommands<Factory extends AnyPluginFactory>(
  plugin: Factory
): CommandsOf<Factory>;
export function useCommands(plugin?: AnyPluginFactory) {
  const player = usePlayer();
  return plugin ? player.plugin(plugin).commands : player.commands;
}

/**
 * Runs `write` as playback advances, without rendering. Use this for anything
 * that follows time: fills, thumbs, and text written straight to the DOM.
 */
export function useClock(
  write: (time: number) => void,
  resolution: () => number
): void {
  const player = usePlayer();
  useEffect(
    () => player.clock.bind(write, resolution),
    [player, write, resolution]
  );
}

/** Time as React state, for text. Renders once per `resolution` seconds. */
export function useCurrentTime(resolution = 1): number {
  const [time, setTime] = useState(0);
  const getResolution = useMemo(() => () => resolution, [resolution]);
  useClock(setTime, getResolution);
  return time;
}
