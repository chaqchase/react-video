"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { RadioContext, useMenu } from "./menu-context";

export interface MenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  value: string | null;
  onValueChange(value: string): void;
}

export const MenuRadioGroup = forwardRef<HTMLDivElement, MenuRadioGroupProps>(
  function MenuRadioGroup({ value, onValueChange, children, ...props }, ref) {
    const menu = useMenu();
    return (
      <RadioContext.Provider
        value={{
          value,
          select(next) {
            onValueChange(next);
            // Back to the top level, where the row now shows the new value.
            if (menu.view !== null) menu.setView(null);
          },
        }}
      >
        <div ref={ref} role="group" data-part="menu-radio-group" {...props}>
          {children}
        </div>
      </RadioContext.Provider>
    );
  }
);
MenuRadioGroup.displayName = "Video.MenuRadioGroup";
