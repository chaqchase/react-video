"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface SegmentedOption<Value extends string> {
  value: Value;
  label: ReactNode;
  /** Names the option when its label is only a symbol. */
  title?: string;
}

interface SegmentedProps<Value extends string> {
  options: readonly SegmentedOption<Value>[];
  value: Value;
  onChange(value: Value): void;
  label: string;
  /** Tabs control a panel, and a radio group only sets a value. */
  kind?: "radio" | "tabs";
  /** The id of the panel a tab controls. */
  panelId?: string;
  className?: string;
  size?: "sm" | "md";
}

/** One thumb slides between options, written straight to the DOM as it moves. */
export function Segmented<Value extends string>({
  options,
  value,
  onChange,
  label,
  kind = "radio",
  panelId,
  className = "",
  size = "md",
}: SegmentedProps<Value>) {
  const root = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    const place = () => {
      const active = container.querySelector<HTMLElement>('[data-active="true"]');
      if (!active || !thumb.current) return;
      thumb.current.style.width = `${active.offsetWidth}px`;
      thumb.current.style.transform = `translateX(${active.offsetLeft}px)`;
    };
    place();
    setMeasured(true);
    const observer = new ResizeObserver(place);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    root.current?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  };

  const tabs = kind === "tabs";
  return (
    <div
      ref={root}
      role={tabs ? "tablist" : "radiogroup"}
      aria-label={label}
      className={`relative inline-flex max-w-full rounded-full bg-[var(--site-segment)] p-[2px] ${className}`}
    >
      <span
        ref={thumb}
        aria-hidden="true"
        className={`absolute top-[2px] bottom-[2px] left-0 rounded-full bg-[var(--site-thumb)] shadow-[0_1px_4px_rgb(0_0_0/0.14),0_0_0_0.5px_rgb(0_0_0/0.04)] transition-[transform,width] duration-[280ms] ease-rv motion-reduce:transition-none ${measured ? "" : "opacity-0"}`}
      />
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role={tabs ? "tab" : "radio"}
            {...(tabs
              ? { "aria-selected": active, "aria-controls": active ? panelId : undefined }
              : { "aria-checked": active })}
            aria-label={option.title}
            tabIndex={active ? 0 : -1}
            data-active={active}
            data-value={option.value}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => move(event, index)}
            className={`press relative z-10 rounded-full font-medium whitespace-nowrap transition-colors duration-200 ease-rv ${
              size === "sm" ? "h-7 px-3 text-[12.5px]" : "h-9 px-4 text-[14px]"
            } ${active ? "text-text" : "text-dim hover:text-text"} ${active && !measured ? "bg-[var(--site-thumb)]" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
