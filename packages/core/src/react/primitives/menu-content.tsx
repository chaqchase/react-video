"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { usePlayer } from "../context";
import { mergeRefs, useNodeRef } from "./as-child";
import { useMenu } from "./menu-context";

/** Keep in step with the exit transition, plus some margin for timer drift. */
const EXIT_MS = 200;
const TYPEAHEAD_RESET_MS = 500;
/** The gap kept above a menu, plus the distance its entrance starts below where it ends. */
const ROOM_MARGIN = 14;
const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

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
    const player = usePlayer();
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
      const element = content.current;
      if (!panel || !element) return;
      const top = player.root()?.getBoundingClientRect().top;
      if (top !== undefined) {
        const room = element.getBoundingClientRect().bottom - top - ROOM_MARGIN;
        element.style.setProperty("--rv-menu-room", `${room}px`);
      }
      element.style.setProperty("height", `${panel.offsetHeight}px`);
      const items = itemsIn(panel);
      const row = view === null ? returnTo.current : null;
      const target =
        (row?.isConnected ? row : null) ??
        items.find((item) => item.getAttribute("aria-checked") === "true") ??
        items[0];
      target?.focus({ preventScroll: true });
      const list = target?.closest<HTMLElement>('[data-part="menu-list"]');
      if (target && list) {
        list.scrollTop +=
          target.getBoundingClientRect().top - list.getBoundingClientRect().top - list.clientHeight / 2;
      }
    }, [activePanel, open, player, view]);

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
            <div data-part="menu-list">{children}</div>
          </div>
        </div>
      </div>
    );
  }
);
MenuContent.displayName = "Video.MenuContent";
