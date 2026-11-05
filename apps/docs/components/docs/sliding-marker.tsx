"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Slides to whichever element matches `selector`, inside its positioned parent.
 * The first placement doesn't animate, so it never flies in on load.
 */
export function SlidingMarker({ selector, watch, className }: { selector: string; watch: unknown; className: string }) {
  const marker = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = marker.current;
    const parent = element?.parentElement;
    if (!element || !parent) return;
    const place = () => {
      const target = parent.querySelector<HTMLElement>(selector);
      element.dataset.ready = String(Boolean(target));
      if (!target) return;
      const box = target.getBoundingClientRect();
      element.style.height = `${box.height}px`;
      element.style.transform = `translateY(${box.top - parent.getBoundingClientRect().top}px)`;
    };
    place();
    const frame = requestAnimationFrame(() => {
      element.dataset.moves = "true";
    });
    const observer = new ResizeObserver(place);
    observer.observe(parent);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [selector, watch]);

  return <span ref={marker} aria-hidden="true" className={className} />;
}
