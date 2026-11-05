"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { GeneratedCode } from "@/components/site/generated-code";
import { ThemePicker } from "@/components/site/theme-picker";
import { createPlugins } from "@/lib/builder";
import { themeClass, type ThemeId } from "@/lib/themes";

type Tokens = Record<string, string>;

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange(value: number): void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[15px] tracking-[-0.014em]">
        <span>{label}</span>
        <span className="text-dim tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="site-range mt-1.5 w-full"
      />
    </label>
  );
}

export function ThemeLab() {
  const [theme, setTheme] = useState<ThemeId>("default");
  const [overrides, setOverrides] = useState<{ radius?: number; control?: number }>({});
  const [plugins] = useState(() => createPlugins({ source: "mp4", plugins: ["captions", "speed", "quality", "fullscreen", "pip"] }));

  const tokens = useMemo(() => {
    const next: Tokens = {};
    if (overrides.radius !== undefined) next["--rv-radius"] = `${overrides.radius}px`;
    if (overrides.control !== undefined) next["--rv-control-size"] = `${overrides.control}px`;
    return next;
  }, [overrides]);

  const name = themeClass(theme);
  const code = [
    name ? `import "react-video-kit/themes/${theme}.css";\n\n<VideoPlayer className="${name}" src="/video.mp4" />` : null,
    Object.keys(tokens).length
      ? `.${name ?? "rv-root"} {\n${Object.entries(tokens)
          .map(([token, value]) => `  ${token}: ${value};`)
          .join("\n")}\n}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <section id="theming" className="site-section">
      <div className="site-wrap">
        <div className="reveal">
          <Eyebrow>Theming</Eyebrow>
          <SectionTitle>Make it yours, in plain CSS.</SectionTitle>
          <SectionLead>
            Start from a theme inspired by the platforms people already know, or set a few custom properties of your own. Your
            styles always win, and every control keeps working the same way.
          </SectionLead>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <VideoPlayer
            src="/media/sample-720.mp4"
            poster="/media/poster.jpg"
            plugins={plugins}
            load="visible"
            title="View From A Blue Moon"
            eyebrow="Trailer"
            aria-label="Themed player"
            className={`self-start ${name ?? ""}`}
            style={tokens as CSSProperties}
          />
          <div className="flex min-w-0 flex-col gap-4">
            <ThemePicker
              value={theme}
              onChange={(next) => {
                setTheme(next);
                setOverrides({});
              }}
            />
            <div className="bg-raised flex flex-col gap-4 rounded-[20px] p-5">
              <Slider label="Corner radius" value={overrides.radius ?? 20} min={0} max={36} unit="px" onChange={(value) => setOverrides((current) => ({ ...current, radius: value }))} />
              <Slider label="Control size" value={overrides.control ?? 38} min={28} max={48} unit="px" onChange={(value) => setOverrides((current) => ({ ...current, control: value }))} />
            </div>
            <GeneratedCode
              code={code || `/* The default look needs no theme. */\n<VideoPlayer src="/video.mp4" />`}
              label="Copy this code"
              className="min-h-[148px] flex-1 overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
