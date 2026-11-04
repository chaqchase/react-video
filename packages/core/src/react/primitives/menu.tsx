"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { mergeRefs, useNodeRef } from "./as-child";
import { Button, type ButtonProps } from "./button";

/** Keep in step with the exit transition, plus some margin for timer drift. */
const EXIT_MS = 200;
const TYPEAHEAD_RESET_MS = 500;
const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

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

const MenuContext = createContext<MenuContextValue | null>(null);

function createTriggerHandle() {
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

function useMenu() {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("react-video-kit: this part must be inside <Video.Menu>.");
  return menu;
}

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

export type MenuTriggerProps = ButtonProps;

export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(
  function MenuTrigger({ onClick, onKeyDown, ...props }, ref) {
    const menu = useMenu();
    return (
      <Button
        ref={mergeRefs(menu.trigger.set, ref)}
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

/** Keeps a closing element mounted long enough for its exit transition to play. */
function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [mounted, open]);
  return mounted;
}

function itemsIn(panel: Element | null | undefined) {
  return panel ? [...panel.querySelectorAll<HTMLElement>(ITEM_SELECTOR)] : [];
}

export interface MenuContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(
  function MenuContent({ children, onKeyDown, ...props }, ref) {
    const menu = useMenu();
    const mounted = usePresence(menu.open);
    const content = useRef<HTMLDivElement | null>(null);
    const typed = useRef({ text: "", at: 0 });
    const { open, setOpen, view, setView, trigger, setPanelHost } = menu;
    const panelHost = useNodeRef<HTMLElement>(setPanelHost);
    /** The row to refocus when returning from a submenu. */
    const returnTo = useRef<HTMLElement | null>(null);

    const activePanel = useCallback(
      () =>
        content.current?.querySelector<HTMLElement>(
          `[data-part="menu-panel"][data-active]`
        ) ?? null,
      []
    );

    // Size to the active panel so drilling in and out animates, and move focus into it.
    useEffect(() => {
      if (!open) return;
      const panel = activePanel();
      if (!panel) return;
      content.current?.style.setProperty("height", `${panel.offsetHeight}px`);
      const items = itemsIn(panel);
      const row = view === null ? returnTo.current : null;
      const target =
        (row?.isConnected ? row : null) ??
        items.find((item) => item.getAttribute("aria-checked") === "true") ??
        items[0];
      target?.focus({ preventScroll: true });
    }, [activePanel, open, view]);

    useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        if (content.current?.contains(target) || trigger.contains(target)) return;
        setOpen(false, false);
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, setOpen, trigger]);

    const goBack = () => {
      setView(null);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      const items = itemsIn(activePanel());
      const active = document.activeElement as HTMLElement;
      const index = items.indexOf(active);
      const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
      const back = rtl ? "ArrowRight" : "ArrowLeft";
      const forward = rtl ? "ArrowLeft" : "ArrowRight";
      let handled = true;

      if (event.key === "ArrowDown") {
        items[(index + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        items[(index - 1 + items.length) % items.length]?.focus();
      } else if (event.key === "Home") {
        items[0]?.focus();
      } else if (event.key === "End") {
        items[items.length - 1]?.focus();
      } else if (event.key === "Escape") {
        if (view !== null) goBack();
        else setOpen(false);
      } else if (event.key === back) {
        if (view !== null) goBack();
      } else if (event.key === forward) {
        if (active?.getAttribute("aria-haspopup") === "menu") active.click();
      } else if (event.key === "Tab") {
        // Let focus move on naturally, without pulling it back to the trigger.
        setOpen(false, false);
        return;
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== " ") {
        const now = Date.now();
        const text =
          now - typed.current.at > TYPEAHEAD_RESET_MS
            ? event.key
            : typed.current.text + event.key;
        typed.current = { text: text.toLowerCase(), at: now };
        items
          .find((item) =>
            item.textContent?.trim().toLowerCase().startsWith(typed.current.text)
          )
          ?.focus();
      } else {
        handled = false;
      }
      if (handled) {
        event.preventDefault();
        // Hotkeys on the player mustn't also act on keys the menu used.
        event.stopPropagation();
      }
    };

    if (!mounted) return null;

    return (
      <div
        ref={mergeRefs(content, ref)}
        id={menu.id}
        data-part="menu-content"
        data-state={open ? "open" : "closed"}
        data-view={view ?? "root"}
        onKeyDown={handleKeyDown}
        onFocusCapture={(event) => {
          // Remember the row in the top level for when a submenu closes.
          if (view === null) returnTo.current = event.target as HTMLElement;
        }}
        {...props}
      >
        <div
          ref={panelHost}
          data-part="menu-panels"
        >
          <div
            role="menu"
            data-part="menu-panel"
            data-active={view === null ? "" : undefined}
            data-root=""
            aria-hidden={view === null ? undefined : true}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);
MenuContent.displayName = "Video.MenuContent";

export interface MenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  disabled?: boolean;
  /** Runs when chosen. The menu closes afterwards unless `keepOpen` is set. */
  onSelect?(): void;
  keepOpen?: boolean;
}

function useItemHandlers(select: () => void) {
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

interface RadioContextValue {
  value: string | null;
  select(value: string): void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

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
