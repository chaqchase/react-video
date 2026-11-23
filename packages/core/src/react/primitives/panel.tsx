"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type HTMLAttributes,
} from "react";
import { Button } from "./button";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the panel is showing. It mounts the first time this is true. */
  open: boolean;
  /** Called on Escape, on the close button, and on a click outside the sheet. */
  onClose(): void;
  /** The label on the close button. */
  closeLabel: string;
  /** The `data-part` of the button to focus on closing, if where focus was has gone. */
  trigger: string;
}

/**
 * A sheet over the picture. Playback carries on behind it, the idle plugin keeps it up,
 * and the hotkeys plugin leaves keys alone inside it. Focus moves to `[data-autofocus]`.
 */
export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { open, onClose, closeLabel, trigger, children, onClick, onKeyDown, ...props },
  ref
) {
  const element = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => element.current as HTMLDivElement, []);
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = element.current;
    if (!node) return;
    if (open) {
      const focused = document.activeElement as HTMLElement | null;
      opener.current = focused === document.body ? null : focused;
      (node.querySelector<HTMLElement>("[data-autofocus]") ?? node).focus({ preventScroll: true });
    } else if (node.contains(document.activeElement)) {
      // Opened from a menu, the row that had focus has gone along with it.
      opener.current?.focus({ preventScroll: true });
      if (document.activeElement !== opener.current) {
        node.closest('[data-part="root"]')
          ?.querySelector<HTMLElement>(`[data-part="${trigger}"]`)
          ?.focus({ preventScroll: true });
      }
    }
  }, [open, trigger]);

  if (!mounted) return null;
  return (
    <div
      ref={element}
      data-part="panel"
      data-state={open ? "open" : "closed"}
      role="dialog"
      tabIndex={-1}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
      {...props}
    >
      <div data-part="panel-sheet">
        {children}
        <Button data-part="panel-close" aria-label={closeLabel} onClick={onClose}>
          <svg
            viewBox="0 0 24 24"
            width="1em"
            height="1em"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </Button>
      </div>
    </div>
  );
});
Panel.displayName = "Video.Panel";
