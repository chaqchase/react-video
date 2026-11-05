"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** A wide block scrolls on its own. Keyboards need a tab stop to do that, but only when it really scrolls. */
export function ScrollArea({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setScrolls(element.scrollWidth > element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={area} className={className} {...(scrolls ? { tabIndex: 0, role: "group", "aria-label": label } : {})}>
      {children}
    </div>
  );
}
