"use client";

import { forwardRef, useId, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useItemHandlers, useMenu } from "./menu-context";

export interface MenuSubProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** The row's name, which also titles the submenu. */
  title: ReactNode;
  /** The current value, shown at the end of the row. */
  value?: ReactNode;
  /** Shown before the title. */
  icon?: ReactNode;
  /** Labels the back button. */
  backLabel?: string;
}

/** A row that drills down to a panel of its own. */
export const MenuSub = forwardRef<HTMLDivElement, MenuSubProps>(function MenuSub(
  { title, value, icon, backLabel = "Back", children, ...props },
  ref
) {
  const menu = useMenu();
  const id = useId();
  const active = menu.view === id;
  const handlers = useItemHandlers(() => menu.setView(id));
  const back = useItemHandlers(() => menu.setView(null));

  return (
    <>
      <div
        ref={ref}
        role="menuitem"
        data-part="menu-item"
        data-sub=""
        tabIndex={-1}
        aria-haspopup="menu"
        aria-expanded={active}
        {...handlers}
        {...props}
      >
        {icon}
        <span data-part="menu-item-label">{title}</span>
        {value !== undefined ? <span data-part="menu-item-value">{value}</span> : null}
      </div>
      {menu.panelHost
        ? createPortal(
            <div
              role="menu"
              aria-label={typeof title === "string" ? title : undefined}
              data-part="menu-panel"
              data-active={active ? "" : undefined}
              aria-hidden={active ? undefined : true}
            >
              <div
                role="menuitem"
                data-part="menu-back"
                tabIndex={-1}
                aria-label={backLabel}
                {...back}
              >
                <span data-part="menu-item-label">{title}</span>
              </div>
              {children}
            </div>,
            menu.panelHost
          )
        : null}
    </>
  );
});
MenuSub.displayName = "Video.MenuSub";
