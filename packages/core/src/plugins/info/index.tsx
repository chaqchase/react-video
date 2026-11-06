"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import type { StateOf } from "../../core/types";
import { usePlayer } from "../../react/context";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";
import { Panel } from "../../react/primitives/panel";
import type { playlist } from "../playlist/index";

export interface InfoCredit {
  /** What they did, such as `Director`. */
  role: string;
  /** Who did it. */
  names: string | readonly string[];
}

export interface InfoContent {
  /** The video's name. */
  title?: string;
  /** A short line above the title, such as a series or an episode. */
  eyebrow?: string;
  /** What the video is about. It can be as long as it needs to be, because the panel scrolls. */
  description?: string;
  /** An image to show beside the text. */
  artwork?: string;
  /** Short details on one line, such as the year, rating, and running time. */
  facts?: readonly string[];
  /** Who made it. */
  credits?: readonly InfoCredit[];
}

export type InfoOptions = InfoContent;

/**
 * A panel about the video: its artwork, what it's about, and who made it. Whatever
 * isn't given here comes from the current item when there's a playlist.
 */
export const info = definePlugin("info", (options: InfoOptions = {}) => ({
  after: ["playlist"],
  state: () => ({
    /** True while the panel is showing. */
    open: false,
    /** What the panel shows. */
    content: options as InfoContent,
  }),
  attrs: { "data-info-open": (state) => state.open },
  commands: (context) => ({
    /** Opens the panel. */
    open: () => context.set({ open: true }),
    /** Closes the panel, and returns focus to its button. */
    close: () => context.set({ open: false }),
    /** Opens the panel if closed, and closes it if open. */
    toggle: () => context.set({ open: !context.state().open }),
    /** Replaces what the panel shows. */
    setInfo: (content: InfoContent) => context.set({ content }),
  }),
  // What's on it is about the last video, so it shouldn't outlast it.
  source: (context) => context.set({ open: false }),
  slots: { "controls-end": InfoButton, overlay: InfoPanel },
}));

export type InfoButtonProps = ButtonProps;

/** Opens the panel. */
export const InfoButton = forwardRef<HTMLButtonElement, InfoButtonProps>(function InfoButton(
  { onClick, children, ...props },
  ref
) {
  const open = useVideoState(info, (state) => state.open);
  const { toggle } = useCommands(info);
  const label = useLabel("info", "Info");
  return (
    <Button
      ref={ref}
      data-part="info-button"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) toggle();
      }}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          width="1em"
          height="1em"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 11.2v5.3" />
          <circle cx="12" cy="7.6" r="0.4" />
        </svg>
      )}
    </Button>
  );
});
InfoButton.displayName = "Video.InfoButton";

/** The panel. It renders nothing until it first opens. */
export function InfoPanel() {
  const player = usePlayer();
  const open = useVideoState(info, (state) => state.open);
  const content = useVideoState(info, (state) => state.content);
  const { close } = useCommands(info);
  const label = useLabel("info", "Info");
  const closeLabel = useLabel("close", "Close");

  // Read as it opens, and the panel closes when the source changes, so this can't go stale.
  const queue = player.getState().playlist as StateOf<typeof playlist> | undefined;
  const item = queue?.items[queue.index];
  const artwork = content.artwork ?? item?.thumbnail ?? item?.poster;
  const eyebrow = content.eyebrow ?? item?.eyebrow;
  const title = content.title ?? item?.title;
  const description = content.description ?? item?.description;
  const { facts, credits } = content;

  return (
    <Panel
      open={open}
      onClose={close}
      closeLabel={closeLabel}
      trigger="info-button"
      data-panel="info"
      aria-label={title ?? label}
    >
      {artwork ? <img data-part="info-artwork" src={artwork} alt="" draggable={false} /> : null}
      <div data-part="info-body" data-autofocus="" tabIndex={0}>
        {eyebrow ? <p data-part="info-eyebrow">{eyebrow}</p> : null}
        {title ? <p data-part="info-title">{title}</p> : null}
        {facts?.length ? <p data-part="info-facts">{facts.join(" · ")}</p> : null}
        {description ? <p data-part="info-description">{description}</p> : null}
        {credits?.length ? (
          <dl data-part="info-credits">
            {credits.map(({ role, names }) => (
              <div key={role}>
                <dt>{role}</dt>
                <dd>{typeof names === "string" ? names : names.join(", ")}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Panel>
  );
}
InfoPanel.displayName = "Video.InfoPanel";
