"use client";

import { useEffect, useRef, useState } from "react";

export interface PageChapter {
  id: string;
  title: string;
}

// A notional runtime for the page, so its timecodes read like the player's.
const RUNTIME = 108;
const timecode = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * The page is a video, and this is its seek bar. Scrolling writes straight to the DOM
 * as the player's clock does, and it hides when idle as the player's controls do.
 */
export function PageTimeline({ chapters }: { chapters: readonly PageChapter[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [weights, setWeights] = useState<number[]>(() => chapters.map(() => 1));

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const fills = [...element.querySelectorAll<HTMLElement>("[data-fill]")];
    const clock = element.querySelector<HTMLElement>("[data-clock]");
    const sections = chapters.flatMap(({ id }) => document.getElementById(id) ?? []);
    let frame = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let tops: number[] = [];
    let end = 1;

    const measure = () => {
      tops = sections.map((section) => section.getBoundingClientRect().top + scrollY);
      end = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      const reach = tops.map((top, index) => (tops[index + 1] ?? end + innerHeight) - top);
      setWeights(reach.map((value) => Math.max(value, 1)));
    };

    const write = () => {
      frame = 0;
      const y = scrollY;
      const probe = y + innerHeight * 0.35;
      let current = 0;
      tops.forEach((top, index) => {
        if (probe >= top) current = index;
      });
      setActive(current);
      fills.forEach((fill, index) => {
        const top = tops[index] ?? 0;
        const next = tops[index + 1] ?? end + innerHeight * 0.35;
        const amount = Math.min(Math.max((probe - top) / Math.max(next - top, 1), 0), 1);
        fill.style.transform = `scaleX(${amount})`;
      });
      if (clock) clock.textContent = timecode((y / end) * RUNTIME);
      // At the very end it would only cover the footer.
      element.toggleAttribute("data-past-hero", y > innerHeight * 0.65 && y < end - 72);
    };

    const onScroll = () => {
      frame ||= requestAnimationFrame(write);
      element.setAttribute("data-awake", "");
      clearTimeout(idle);
      idle = setTimeout(() => element.removeAttribute("data-awake"), 1800);
    };

    const refresh = () => {
      measure();
      write();
    };
    refresh();
    const observer = new ResizeObserver(refresh);
    observer.observe(document.body);
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
      clearTimeout(idle);
    };
  }, [chapters]);

  return (
    <nav
      ref={root}
      aria-label="Page chapters"
      className="page-timeline fixed inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-40 mx-auto w-[min(620px,calc(100vw-32px))]"
    >
      <div className="page-timeline-glass flex items-center gap-3 rounded-full px-4 py-2.5">
        <span data-clock aria-hidden="true" className="w-[38px] shrink-0 font-mono text-[12px] text-white/90">
          00:00
        </span>
        <ol className="flex min-w-0 flex-1 items-center gap-[3px]">
          {chapters.map(({ id, title }, index) => (
            <li key={id} style={{ flexGrow: weights[index], flexBasis: 0 }} className="group relative min-w-0">
              <a
                href={`#${id}`}
                aria-label={title}
                aria-current={index === active ? "true" : undefined}
                className="block py-2.5"
              >
                <span className="block h-[3px] overflow-hidden rounded-full bg-white/25 transition-transform duration-200 ease-rv group-hover:scale-y-[1.8]">
                  <span
                    data-fill
                    style={{ transform: "scaleX(0)" }}
                    className="block h-full origin-left bg-[#ffb27a] will-change-transform"
                  />
                </span>
              </a>
              <span
                aria-hidden="true"
                className="page-timeline-tip pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 rounded-lg px-2 py-1 text-[12px] font-medium whitespace-nowrap text-white opacity-0 transition duration-150 ease-rv group-hover:opacity-100"
              >
                {title}
              </span>
            </li>
          ))}
        </ol>
        <span aria-hidden="true" className="hidden w-[92px] shrink-0 truncate text-right text-[12px] font-medium text-white/80 sm:block">
          {chapters[active]?.title}
        </span>
      </div>
    </nav>
  );
}
