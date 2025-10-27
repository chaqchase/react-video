import { MutableRefObject, useEffect, useRef } from "react";

type HotkeyScope = "focused" | "hovered" | "global";

type UseOnKeyDownOptions = {
  wrapperRef?: MutableRefObject<HTMLElement | null>;
  scope?: HotkeyScope;
  enabled?: boolean;
};

/**
 * Registers a keydown handler with optional scoping.
 * - global: listens on window
 * - focused: triggers only if focus is inside wrapperRef
 * - hovered: triggers only while pointer is over wrapperRef
 */
const useOnKeyDown = (
  key: string,
  callback: () => void,
  { wrapperRef, scope = "focused", enabled = true }: UseOnKeyDownOptions = {}
) => {
  const hoverRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const el = wrapperRef?.current || null;

    const onEnter = () => {
      hoverRef.current = true;
    };
    const onLeave = () => {
      hoverRef.current = false;
    };

    if (el && scope === "hovered") {
      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== key) return;

      // Evaluate scope
      if (scope === "global") {
        // always
      } else if (scope === "focused") {
        const active = document.activeElement;
        if (!el || !active || !el.contains(active)) return;
      } else if (scope === "hovered") {
        if (!hoverRef.current) return;
      }

      event.preventDefault();
      event.stopPropagation();
      callback();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (el && scope === "hovered") {
        el.removeEventListener("pointerenter", onEnter);
        el.removeEventListener("pointerleave", onLeave);
      }
    };
  }, [key, callback, wrapperRef, scope, enabled]);
};

export default useOnKeyDown;
