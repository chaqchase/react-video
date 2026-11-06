"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Menu } from "../../react/primitives/menu";
import { MenuContent, type MenuContentProps } from "../../react/primitives/menu-content";
import { MenuTrigger } from "../../react/primitives/menu-trigger";
import { usePlayer } from "../../react/context";
import { useLabel } from "../../react/hooks";
import { Slot } from "../../react/slot";
import { SettingsIcon } from "../icons";

export type SettingsMenuProps = MenuContentProps;

/** A menu of whatever plugins contribute to the `menu` slot. Hidden when empty. */
export function SettingsMenu({ children, ...props }: SettingsMenuProps) {
  const player = usePlayer();
  const label = useLabel("settings", "Settings");
  const measured = !children && player.slot("menu").length > 0;
  // Any row can hide itself, like speed on a live stream, and the menu only mounts them while
  // it's open. So they also render into an element outside the page, to show if any are left.
  const [rows] = useState(() => (typeof document === "undefined" ? null : document.createElement("div")));
  const subscribe = useCallback(
    (changed: () => void) => {
      const observer = new MutationObserver(changed);
      if (rows) observer.observe(rows, { childList: true });
      return () => observer.disconnect();
    },
    [rows]
  );
  // Null until hydrated, because a portal can't render on the server.
  const count = useSyncExternalStore(subscribe, () => rows?.childElementCount ?? 0, () => null);

  if (!children && !measured) return null;
  return (
    <>
      {measured && count === 0 ? null : (
        <Menu>
          <MenuTrigger aria-label={label}>
            <SettingsIcon />
          </MenuTrigger>
          <MenuContent {...props}>{children ?? <Slot name="menu" />}</MenuContent>
        </Menu>
      )}
      {measured && rows && count !== null
        ? createPortal(
            <Menu>
              <Slot name="menu" />
            </Menu>,
            rows
          )
        : null}
    </>
  );
}
SettingsMenu.displayName = "Video.SettingsMenu";
