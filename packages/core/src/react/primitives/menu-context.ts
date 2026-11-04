"use client";

import { createContext, useContext, type KeyboardEvent } from "react";

interface MenuContextValue {
  open: boolean;
  setOpen(open: boolean, restoreFocus?: boolean): void;
  id: string;
  trigger: ReturnType<typeof createTriggerHandle>;
  /** The submenu being shown, or null for the top level. */
  view: string | null;
  setView(view: string | null): void;
  panelHost: HTMLElement | null;
  setPanelHost(host: HTMLElement | null): void;
}

export const MenuContext = createContext<MenuContextValue | null>(null);

export function createTriggerHandle() {
  let node: HTMLButtonElement | null = null;
  return {
    set(next: HTMLButtonElement | null) {
      node = next;
    },
    focus() {
      node?.focus({ preventScroll: true });
    },
    contains: (target: Node) => node?.contains(target) ?? false,
  };
}

export function useMenu() {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("react-video-kit: this part must be inside <Video.Menu>.");
  return menu;
}

export function useItemHandlers(select: () => void) {
  return {
    onClick: select,
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        select();
      }
    },
  };
}

interface RadioContextValue {
  value: string | null;
  select(value: string): void;
}

export const RadioContext = createContext<RadioContextValue | null>(null);
