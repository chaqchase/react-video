"use client";

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
  if (!children && player.slot("menu").length === 0) return null;
  return (
    <Menu>
      <MenuTrigger aria-label={label}>
        <SettingsIcon />
      </MenuTrigger>
      <MenuContent {...props}>{children ?? <Slot name="menu" />}</MenuContent>
    </Menu>
  );
}
SettingsMenu.displayName = "Video.SettingsMenu";
