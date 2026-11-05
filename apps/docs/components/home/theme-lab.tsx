"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { GeneratedCode } from "@/components/site/generated-code";
import { Segmented } from "@/components/site/segmented";
import { createPlugins } from "@/lib/builder";

type Tokens = Record<string, string>;

const PRESETS = {
  glass: { label: "Glass", tokens: {} as Tokens },
  dusk: {
    label: "Dusk",
    tokens: {
      "--rv-accent": "#ffb27a",
      "--rv-glass": "rgb(38 24 56 / 0.58)",
      "--rv-glass-strong": "rgb(38 24 56 / 0.86)",
      "--rv-focus": "#ffb27a",
      "--rv-radius": "24px",
    },
  },
  paper: {
    label: "Paper",
    tokens: {
      "--rv-accent": "#17132b",
      "--rv-foreground": "#17132b",
      "--rv-muted": "rgb(23 19 43 / 0.7)",
      "--rv-glass": "rgb(251 249 246 / 0.82)",
      "--rv-glass-strong": "rgb(251 249 246 / 0.95)",
      "--rv-glass-border": "rgb(23 19 43 / 0.12)",
      "--rv-glass-hover": "rgb(23 19 43 / 0.09)",
      "--rv-track": "rgb(255 255 255 / 0.45)",
      "--rv-focus": "#5a45cf",
      "--rv-radius": "10px",
    },
  },
  terminal: {
    label: "Terminal",
    tokens: {
      "--rv-accent": "#7dff9b",
      "--rv-foreground": "#d7ffe2",
      "--rv-muted": "rgb(215 255 226 / 0.7)",
      "--rv-glass": "rgb(0 10 4 / 0.9)",
      "--rv-glass-strong": "rgb(0 10 4 / 0.96)",
      "--rv-glass-border": "rgb(125 255 155 / 0.35)",
      "--rv-glass-hover": "rgb(125 255 155 / 0.16)",
      "--rv-track": "rgb(125 255 155 / 0.25)",
      "--rv-focus": "#7dff9b",
      "--rv-blur": "0px",
      "--rv-radius": "0px",
      "--rv-pill-radius": "2px",
      "--rv-menu-radius": "2px",
      "--rv-font": "var(--font-geist-mono), monospace",
    },
  },
} satisfies Record<string, { label: string; tokens: Tokens }>;

type Preset = keyof typeof PRESETS;
const PRESET_OPTIONS = (Object.keys(PRESETS) as Preset[]).map((value) => ({ value, label: PRESETS[value].label }));

function Slider({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange(value: number): void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[13px]">
        <span className="text-dim">{label}</span>
        <span className="font-mono tabular-nums">
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
  const [preset, setPreset] = useState<Preset>("dusk");
  const [overrides, setOverrides] = useState<{ radius?: number; control?: number }>({});
  const [plugins] = useState(() => createPlugins({ source: "mp4", plugins: ["captions", "speed", "quality", "fullscreen", "pip"] }));

  const tokens = useMemo(() => {
    const next: Tokens = { ...PRESETS[preset].tokens };
    if (overrides.radius !== undefined) next["--rv-radius"] = `${overrides.radius}px`;
    if (overrides.control !== undefined) next["--rv-control-size"] = `${overrides.control}px`;
    return next;
  }, [overrides, preset]);

  const radius = overrides.radius ?? Number.parseInt(tokens["--rv-radius"] ?? "16", 10);
  const control = overrides.control ?? 36;
  const css = Object.keys(tokens).length
    ? `.rv-root {\n${Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}`
    : "/* The default glass skin, with no overrides. */";

  return (
    <section id="theming" className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
      <div className="reveal">
        <Eyebrow time="01:06">Theming</Eyebrow>
        <SectionTitle>Restyle it in CSS, not in props.</SectionTitle>
        <SectionLead>
          The skin is plain CSS in its own cascade layer, driven by custom properties. It sizes itself by container
          query, so it fits a sidebar as well as a stage. Your styles always win, with no specificity fights.
        </SectionLead>
      </div>
      <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <VideoPlayer
          src="/media/sample-720.mp4"
          poster="/media/poster.jpg"
          plugins={plugins}
          load="visible"
          aria-label="Themed player"
          style={tokens as CSSProperties}
        />
        <div className="flex min-w-0 flex-col gap-4">
          <Segmented
            label="Theme"
            options={PRESET_OPTIONS}
            value={preset}
            size="sm"
            className="self-start"
            onChange={(next) => {
              setPreset(next);
              setOverrides({});
            }}
          />
          <div className="border-line bg-raised flex flex-col gap-4 rounded-2xl border p-4">
            <Slider label="Corner radius" value={radius} min={0} max={36} unit="px" onChange={(value) => setOverrides((current) => ({ ...current, radius: value }))} />
            <Slider label="Control size" value={control} min={28} max={48} unit="px" onChange={(value) => setOverrides((current) => ({ ...current, control: value }))} />
          </div>
          <GeneratedCode code={css} label="Copy these styles" className="max-h-[260px] overflow-y-auto" />
        </div>
      </div>
    </section>
  );
}
