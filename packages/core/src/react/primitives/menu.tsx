"use client";

import { useCallback, useId, useState, type ReactNode } from "react";
import { createTriggerHandle, MenuContext } from "./menu-context";

export interface MenuProps {
  children?: ReactNode;
  /** Called as the menu opens and closes. */
  onOpenChange?(open: boolean): void;
}

/**
 * A menu that renders inside the player, so it keeps working in fullscreen.
 * Submenus drill down in place rather than opening beside it.
 */
export function Menu({ children, onOpenChange }: MenuProps) {
  const [open, setOpenState] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const [panelHost, setPanelHost] = useState<HTMLElement | null>(null);
  const [trigger] = useState(createTriggerHandle);
  const id = useId();

  const setOpen = useCallback(
    (next: boolean, restoreFocus = true) => {
      setOpenState(next);
      onOpenChange?.(next);
      if (next) return;
      setView(null);
      if (restoreFocus) trigger.focus();
    },
    [onOpenChange, trigger]
  );

  return (
    <MenuContext.Provider
      value={{ open, setOpen, id, trigger, view, setView, panelHost, setPanelHost }}
    >
      {children}
    </MenuContext.Provider>
  );
}
Menu.displayName = "Video.Menu";
