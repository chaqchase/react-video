"use client";

import { useLayoutEffect, useRef } from "react";

const PLAY_BUTTONS = '[data-part="play-overlay"]:not([data-state="started"]), [data-part="play-pause"]';

/** Focuses the play button showing now, the one control a player can be relied on to have. */
export function focusPlayButton(root: Element | null | undefined) {
  for (const button of root?.querySelectorAll<HTMLElement>(PLAY_BUTTONS) ?? []) {
    button.focus({ preventScroll: true });
    if (document.activeElement === button) return;
  }
}

/**
 * For a part that goes away by itself: keeps focus in the player if it was inside, rather
 * than dropping it to the top of the page. Only for parts that never render on the server.
 */
export function useFocusFallback<Part extends HTMLElement>() {
  const part = useRef<Part>(null);
  useLayoutEffect(() => {
    const node = part.current;
    return () => {
      if (node?.contains(document.activeElement)) focusPlayButton(node.closest('[data-part="root"]'));
    };
  }, []);
  return part;
}
