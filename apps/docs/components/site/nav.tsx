"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { REPO } from "@/lib/site";
import { CloseIcon, GitHubIcon, MenuIcon } from "./icons";
import { Search } from "./search";
import { ThemeToggle } from "./theme-toggle";

const LINKS = [
  { href: "/docs/v4", label: "Docs", section: "/docs" },
  { href: "/plugins", label: "Plugins", section: "/plugins" },
  { href: "/playground", label: "Playground", section: "/playground" },
];

/** The same bar on every page, so nothing moves on the way into the docs. */
export function SiteNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const links = LINKS.map(({ href, label, section }) => (
    <Link key={href} href={href} aria-current={pathname.startsWith(section) ? "page" : undefined} onClick={() => setMenu(false)}>
      {label}
    </Link>
  ));

  return (
    <header
      className="site-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape") setMenu(false);
      }}
    >
      <div className="site-nav-bar">
        <Link href="/" className="site-nav-name" onClick={() => setMenu(false)}>
          React Video Kit
        </Link>
        <nav aria-label="Main" className="site-nav-links">
          {links}
        </nav>
        <div className="site-nav-end">
          <Search />
          <ThemeToggle />
          <a href={REPO} aria-label="GitHub" className="site-icon-button site-nav-github press">
            <GitHubIcon />
          </a>
          <button
            type="button"
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
            className="site-icon-button site-nav-toggle press"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>
      {menu ? (
        <nav aria-label="Menu" className="site-nav-menu">
          {links}
          <a href={REPO}>GitHub</a>
        </nav>
      ) : null}
    </header>
  );
}
