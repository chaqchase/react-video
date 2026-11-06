"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";

/** Takes focus when a panel opens, gives it back when it closes, and closes it on Escape. */
export function usePanelFocus<Panel extends HTMLElement>(open: boolean, close: () => void) {
  const panel = useRef<Panel>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector("button")?.focus({ preventScroll: true });
    return () => {
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };

  return { panel, onKeyDown };
}
