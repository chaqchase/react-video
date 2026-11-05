"use client";

import { useEffect } from "react";

const COLORS = { dark: "#000000", light: "#ffffff" };

/** Keeps the browser's own chrome on the chosen theme, not just the system's. */
export function ThemeColor() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute("content", root.classList.contains("dark") ? COLORS.dark : COLORS.light);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return null;
}
