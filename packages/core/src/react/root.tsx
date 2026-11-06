"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPlayer } from "../core/player";
import { sourceKey } from "../core/source";
import type {
  AnyPlugin,
  LoadStrategy,
  MediaErrorInfo,
  Player,
  PlayerState,
  SourceInput,
} from "../core/types";
import { PlayerContext } from "./context";

export interface RootProps extends Omit<HTMLAttributes<HTMLDivElement>, "onError"> {
  /** The video to play, which loads afresh when its value changes. */
  src?: SourceInput | null;
  /** Set once. Define the array outside the component or memoize it. */
  plugins?: readonly AnyPlugin[];
  /** When the provider and its engine load. Set once. Defaults to `eager`. */
  load?: LoadStrategy;
  /** Bring your own player instead of creating one. */
  player?: Player;
  /** Called with every error, fatal or not, for logging. It can change between renders. */
  onError?: (error: MediaErrorInfo) => void;
  /** Content rendered inside the player's root element. */
  children?: ReactNode;
}

const nameOf = (state: PlayerState) =>
  (state.i18n as { strings?: { player?: string } } | undefined)?.strings?.player ?? "Video player";

/** Provides the player to its parts. Never re-renders because of playback. */
export const Root = forwardRef<Player, RootProps>(function Root(
  { src, plugins, load, player: externalPlayer, onError, children, "aria-label": label, ...props },
  ref
) {
  const [player] = useState(
    () => externalPlayer ?? createPlayer({ plugins, src, load })
  );
  const name = useSyncExternalStore(
    player.subscribe,
    () => nameOf(player.getState()),
    () => nameOf(player.getInitialState())
  );
  const element = useRef<HTMLDivElement>(null);
  // Fixed after the first render, so React never overwrites what the
  // subscription below writes to these attributes.
  const [initialAttributes] = useState(() =>
    player.attributes(player.getInitialState())
  );

  useImperativeHandle(ref, () => player, [player]);

  useEffect(() => player.mount(element.current), [player]);

  const errorHandler = useRef(onError);
  useEffect(() => {
    errorHandler.current = onError;
  });
  useEffect(() => player.onError((error) => errorHandler.current?.(error)), [player]);

  const key = sourceKey(src);
  // A player from outside has its own source, which only a `src` given here replaces.
  const appliedKey = useRef(externalPlayer ? sourceKey(null) : key);
  useEffect(() => {
    if (appliedKey.current === key) return;
    appliedKey.current = key;
    player.commands.setSource(JSON.parse(key));
  }, [key, player]);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    let applied = initialAttributes;
    const write = () => {
      const next = player.attributes();
      for (const name in applied) {
        if (!(name in next)) node.removeAttribute(name);
      }
      for (const name in next) {
        const value = next[name];
        if (value !== undefined && applied[name] !== value) {
          node.setAttribute(name, value);
        }
      }
      applied = next;
    };
    write();
    return player.subscribe(write);
  }, [initialAttributes, player]);

  return (
    <PlayerContext.Provider value={player}>
      <div
        ref={element}
        data-part="root"
        role="group"
        aria-label={label ?? name}
        {...initialAttributes}
        {...props}
      >
        {children}
      </div>
    </PlayerContext.Provider>
  );
});
Root.displayName = "Video.Root";
