"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A wide block scrolls on its own. Keyboards need a tab stop to do that, but only when it really scrolls. */
export function ScrollArea({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const measure = () => setScrolls(element.scrollWidth > element.clientWidth);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // A font that arrives late can widen the code without resizing this box.
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={area} className={className} {...(scrolls ? { tabIndex: 0, role: "group", "aria-label": label } : {})}>
      {children}
    </div>
  );
}
