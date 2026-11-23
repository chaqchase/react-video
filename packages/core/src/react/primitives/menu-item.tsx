"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { useItemHandlers, useMenu } from "./menu-context";

export interface MenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Stops the item being chosen or reached with the keyboard. */
  disabled?: boolean;
  /** Runs when chosen. The menu closes afterwards unless `keepOpen` is set. */
  onSelect?(): void;
  /** Leaves the menu open after the item is chosen. */
  keepOpen?: boolean;
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { disabled, onSelect, keepOpen, children, ...props },
  ref
) {
  const menu = useMenu();
  const handlers = useItemHandlers(() => {
    if (disabled) return;
    onSelect?.();
    if (!keepOpen) menu.setOpen(false);
  });
  return (
    <div
      ref={ref}
      role="menuitem"
      data-part="menu-item"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      {...handlers}
      {...props}
    >
      {children}
    </div>
  );
});
MenuItem.displayName = "Video.MenuItem";
