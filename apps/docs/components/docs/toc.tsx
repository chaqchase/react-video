"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronIcon } from "@/components/site/icons";
import type { TocItem } from "@/lib/docs/compile";
import { SlidingMarker } from "./sliding-marker";

/** Where a heading counts as being read: under the nav, with a little room. */
const READING_LINE = 112;

function Links({ items, active, onNavigate }: { items: TocItem[]; active?: string; onNavigate?: () => void }) {
  return (
    <ul className="doc-toc-list">
      {items.map(({ id, title, depth }) => (
        <li key={id}>
          <a href={`#${id}`} data-depth={depth} aria-current={id === active ? "location" : undefined} onClick={onNavigate}>
            {title}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Beside the article, following along as it scrolls. */
export function Toc({ items }: { items: TocItem[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current: string | undefined = items[0]?.id;
      for (const { id } of items) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= READING_LINE) current = id;
      }
      // A short last section never reaches the line.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = items.at(-1)?.id;
      setActive(current);
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  useEffect(() => {
    const box = root.current;
    const link = box?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!box || !link) return;
    const offset = link.offsetTop - box.scrollTop;
    if (offset < 48 || offset > box.clientHeight - 48) box.scrollTop = link.offsetTop - box.clientHeight / 2;
  }, [active]);

  if (items.length < 2) return <div className="doc-toc" aria-hidden="true" />;
  return (
    <nav ref={root} aria-label="On this page" className="doc-toc">
      <p className="doc-toc-title">On this page</p>
      <div className="doc-toc-rail">
        <SlidingMarker selector='a[aria-current="location"]' watch={active} className="doc-toc-marker" />
        <Links items={items} active={active} />
      </div>
    </nav>
  );
}

/** Above the article, where there's no room beside it. */
export function TocInline({ items }: { items: TocItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="doc-toc-inline">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        On this page
        <ChevronIcon width={11} height={11} data-open={open} />
      </button>
      {open ? <Links items={items} onNavigate={() => setOpen(false)} /> : null}
    </nav>
  );
}
