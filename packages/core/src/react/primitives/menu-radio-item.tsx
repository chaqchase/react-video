"use client";

import { forwardRef, useContext, type HTMLAttributes } from "react";
import { RadioContext, useItemHandlers } from "./menu-context";

export interface MenuRadioItemProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const MenuRadioItem = forwardRef<HTMLDivElement, MenuRadioItemProps>(
  function MenuRadioItem({ value, children, ...props }, ref) {
    const radio = useContext(RadioContext);
    if (!radio) {
      throw new Error("react-video-kit: this part must be inside <Video.MenuRadioGroup>.");
    }
    const handlers = useItemHandlers(() => radio.select(value));
    const checked = radio.value === value;
    return (
      <div
        ref={ref}
        role="menuitemradio"
        data-part="menu-radio-item"
        data-checked={checked ? "" : undefined}
        aria-checked={checked}
        tabIndex={-1}
        {...handlers}
        {...props}
      >
        {children}
      </div>
    );
  }
);
MenuRadioItem.displayName = "Video.MenuRadioItem";
