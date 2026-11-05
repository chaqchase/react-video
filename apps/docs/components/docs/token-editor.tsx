"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { GeneratedCode } from "@/components/site/generated-code";
import { createPlugins } from "@/lib/builder";
import tokens from "@/lib/generated/tokens.json";

const isPixels = (value: string) => /^\d+px$/.test(value);
const isTimed = (value: string) => /^\d+ms$/.test(value);
const isColor = (value: string) => /^(#|rgb)/.test(value);
const toHex = (value: string) => (/^#[0-9a-f]{6}$/i.test(value) ? value : /^#fff$/i.test(value) ? "#ffffff" : null);

/** Every token in the skin, read from its CSS. Edits apply live and produce the CSS for them. */
export function TokenEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [plugins] = useState(() => createPlugins({ source: "mp4", plugins: ["captions", "speed", "quality", "pip", "fullscreen"] }));
  const set = (name: string, value: string) => setValues((current) => ({ ...current, [name]: value }));
  const css = useMemo(() => {
    const changed = Object.entries(values);
    return changed.length
      ? `.rv-root {\n${changed.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}`
      : "/* Change a token to see the CSS for it. */";
  }, [values]);

  return (
    <div className="not-prose my-6 flex flex-col gap-4">
      <div className="lg:sticky lg:top-[calc(var(--fd-nav-height,56px)+12px)] lg:z-20">
        <VideoPlayer
          src="/media/sample-720.mp4"
          poster="/media/poster.jpg"
          plugins={plugins}
          load="visible"
          aria-label="Player showing your tokens"
          style={values as CSSProperties}
        />
      </div>
      <GeneratedCode code={css} label="Copy this CSS" />
      <div className="border-line divide-line divide-y overflow-hidden rounded-2xl border">
        {tokens.map(({ name, value: fallback }) => {
          const value = values[name] ?? fallback;
          return (
            <label key={name} className="hover:bg-sun-soft/40 grid items-center gap-x-3 gap-y-1 px-3.5 py-2 transition-colors duration-150 sm:grid-cols-[190px_minmax(0,1fr)_auto]">
              <code className="font-mono text-[12.5px]">{name}</code>
              {isPixels(fallback) ? (
                <input
                  type="range"
                  min={0}
                  max={Math.max(Number.parseInt(fallback, 10) * 2, 48)}
                  value={Number.parseInt(value, 10)}
                  aria-label={name}
                  onChange={(event) => set(name, `${event.target.value}px`)}
                  className="site-range w-full"
                />
              ) : isTimed(fallback) ? (
                <input
                  type="range"
                  min={0}
                  max={800}
                  step={10}
                  value={Number.parseInt(value, 10)}
                  aria-label={name}
                  onChange={(event) => set(name, `${event.target.value}ms`)}
                  className="site-range w-full"
                />
              ) : (
                <span className="flex min-w-0 items-center gap-2">
                  {isColor(fallback) && toHex(value) ? (
                    <input type="color" aria-label={`${name} colour`} value={toHex(value) as string} onChange={(event) => set(name, event.target.value)} className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
                  ) : isColor(fallback) ? (
                    <span aria-hidden="true" className="border-line size-5 shrink-0 rounded-full border" style={{ background: value }} />
                  ) : null}
                  <input
                    type="text"
                    aria-label={name}
                    value={value}
                    spellCheck={false}
                    onChange={(event) => set(name, event.target.value)}
                    className="text-dim focus:text-text min-w-0 flex-1 truncate bg-transparent font-mono text-[12px] outline-none"
                  />
                </span>
              )}
              <span className="text-dim hidden min-w-[56px] text-right font-mono text-[12px] tabular-nums sm:block">
                {isPixels(fallback) || isTimed(fallback) ? value : ""}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
