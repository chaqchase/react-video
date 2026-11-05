"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/site/animated-number";
import { BuilderPlayer } from "@/components/site/builder-player";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { GeneratedCode } from "@/components/site/generated-code";
import { ArrowIcon } from "@/components/site/icons";
import { Segmented } from "@/components/site/segmented";
import { Switch } from "@/components/site/switch";
import {
  DEFAULT_TOKENS,
  estimateSize,
  generateCode,
  pluginById,
  SOURCES,
  type SourceId,
} from "@/lib/builder";
import { marginal } from "@/lib/sizes";

const BENCH = ["idle", "gestures", "hotkeys", "fullscreen", "speed", "quality", "captions", "chapters", "thumbnails", "playlist", "ads", "i18n"];
const START = ["idle", "gestures", "hotkeys", "fullscreen", "speed"];
const STREAMS: SourceId[] = ["mp4", "hls", "dash", "live"];

const formatKb = (bytes: number) => `${(bytes / 1000).toFixed(1)}`;

export function Bench() {
  const [plugins, setPlugins] = useState<string[]>(START);
  const [source, setSource] = useState<SourceId>("mp4");
  const config = useMemo(
    () => ({ source, plugins, layout: "complete" as const, tokens: DEFAULT_TOKENS }),
    [plugins, source]
  );
  const toggle = useCallback((id: string, on: boolean) => {
    setPlugins((current) => (on ? [...current, id] : current.filter((value) => value !== id)));
  }, []);

  return (
    <section id="plugins" className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
      <div className="reveal">
        <Eyebrow time="00:14">Plugins</Eyebrow>
        <SectionTitle>Flip a switch. Watch what it costs.</SectionTitle>
        <SectionLead>
          Fullscreen, the keyboard, even hiding the controls: all plugins, all optional. Each switch below rebuilds a
          real player and picks up from the same frame, so what you see is exactly what the code beside it ships.
        </SectionLead>
      </div>

      <div className="mt-12 grid items-start gap-5 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <div className="border-line bg-raised divide-line order-2 divide-y overflow-hidden rounded-2xl border lg:order-1">
          {BENCH.map((id) => {
            const plugin = pluginById(id);
            if (!plugin) return null;
            const on = plugins.includes(id);
            const added = (marginal[id] ?? 0) + (id === "ads" ? (marginal["ads/vast"] ?? 0) : 0);
            return (
              <label
                key={id}
                className="hover:bg-line flex cursor-pointer items-center gap-3 px-4 py-[11px] transition-colors duration-150"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-tight font-medium">{plugin.title}</span>
                  <span className="text-dim mt-0.5 block truncate text-[12.5px]">{plugin.blurb}</span>
                </span>
                <span
                  className={`font-mono text-[11.5px] tabular-nums transition-colors duration-200 ${on ? "text-sun" : "text-faint"}`}
                >
                  +{(added / 1000).toFixed(1)}
                </span>
                <Switch checked={on} label={plugin.title} onChange={(next) => toggle(id, next)} />
              </label>
            );
          })}
        </div>

        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2">
          <BuilderPlayer config={config} className="shadow-raised" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              label="Source"
              options={SOURCES.filter(({ id }) => STREAMS.includes(id)).map(({ id, label }) => ({ value: id, label }))}
              value={source}
              onChange={(next) => setSource(next)}
            />
            <p className="flex items-baseline gap-1.5" aria-live="polite">
              <span className="text-dim text-[13px]">About</span>
              <AnimatedNumber
                value={estimateSize(config)}
                format={formatKb}
                className="font-mono text-[26px] font-medium tracking-tight tabular-nums"
              />
              <span className="text-dim text-[13px]">KB of JavaScript, brotli</span>
            </p>
          </div>
          <GeneratedCode code={generateCode(config)} label="Copy this player" />
          <Link href="/playground" className="text-sun group inline-flex w-fit items-center gap-1.5 text-[14px] font-medium">
            Every plugin, source, and token is in the playground
            <span className="btn-arrow-wrap transition-transform duration-200 ease-rv group-hover:translate-x-0.5">
              <ArrowIcon />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
