"use client";

import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  format(value: number): string;
  className?: string;
}

/** Counts to a new value by writing text directly, so it never renders mid-tween. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const node = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);

  useEffect(() => {
    const element = node.current;
    if (!element) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shown.current = value;
      element.textContent = format(value);
      return;
    }
    const from = shown.current;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 420, 1);
      const eased = 1 - (1 - progress) ** 3;
      shown.current = from + (value - from) * eased;
      element.textContent = format(shown.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [format, value]);

  return (
    <span ref={node} className={className} suppressHydrationWarning>
      {format(value)}
    </span>
  );
}
