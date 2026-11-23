"use client";

import { forwardRef } from "react";
import { mergeRefs } from "./as-child";
import { Button, type ButtonProps } from "./button";
import { useMenu } from "./menu-context";

export type MenuTriggerProps = ButtonProps;

export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(
  function MenuTrigger({ onClick, onKeyDown, ...props }, ref) {
    const menu = useMenu();
    return (
      <Button
        ref={mergeRefs(menu.trigger.set, ref)}
        id={`${menu.id}-trigger`}
        data-part="menu-trigger"
        data-state={menu.open ? "open" : "closed"}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? menu.id : undefined}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) menu.setOpen(!menu.open);
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            event.stopPropagation();
            menu.setOpen(true);
          }
        }}
        {...props}
      />
    );
  }
);
MenuTrigger.displayName = "Video.MenuTrigger";
