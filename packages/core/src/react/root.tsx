"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPlayer } from "../core/player";
import { sourceKey } from "../core/source";
import type {
  AnyPlugin,
  LoadStrategy,
  Player,
  SourceInput,
} from "../core/types";
import { PlayerContext } from "./context";

export interface RootProps extends HTMLAttributes<HTMLDivElement> {
  src?: SourceInput | null;
  /** Set once. Define the array outside the component or memoize it. */
  plugins?: readonly AnyPlugin[];
  /** When the provider and its engine load. Set once. Defaults to `eager`. */
  load?: LoadStrategy;
  /** Bring your own player instead of creating one. */
  player?: Player;
  children?: ReactNode;
}

/** Provides the player to its parts. Never re-renders because of playback. */
export const Root = forwardRef<Player, RootProps>(function Root(
  { src, plugins, load, player: externalPlayer, children, ...props },
  ref
) {
  const [player] = useState(
    () => externalPlayer ?? createPlayer({ plugins, src, load })
  );
  const element = useRef<HTMLDivElement>(null);
  // Fixed after the first render, so React never overwrites what the
  // subscription below writes to these attributes.
  const [initialAttributes] = useState(() =>
    player.attributes(player.getInitialState())
  );

  useImperativeHandle(ref, () => player, [player]);

  useEffect(() => player.mount(element.current), [player]);

  const key = sourceKey(src);
  const appliedKey = useRef(key);
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
      <div ref={element} data-part="root" {...initialAttributes} {...props}>
        {children}
      </div>
    </PlayerContext.Provider>
  );
});
Root.displayName = "Video.Root";
