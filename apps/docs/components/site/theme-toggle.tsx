"use client";

import { MoonIcon, SunIcon } from "./icons";

function switchTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  // Everything changes at once. Each control's own transition would otherwise run at its own speed.
  root.classList.add("theme-switching");
  root.classList.replace(next === "dark" ? "light" : "dark", next);
  root.style.colorScheme = next;
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private windows can refuse storage, and the theme still applies to this page.
  }
}

/** Both icons render, and CSS picks one, because the server can't know the theme. */
export function ThemeToggle() {
  return (
    <button type="button" aria-label="Switch between dark and light" className="site-icon-button theme-toggle press" onClick={switchTheme}>
      <SunIcon className="site-only-dark" />
      <MoonIcon className="site-only-light" />
    </button>
  );
}
