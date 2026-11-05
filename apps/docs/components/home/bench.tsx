"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/site/animated-number";
import { BuilderPlayer } from "@/components/site/builder-player";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { GeneratedCode } from "@/components/site/generated-code";
import { ChevronIcon } from "@/components/site/icons";
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
    <section id="plugins" className="band site-section">
      <div className="site-wrap">
        <div className="reveal">
          <Eyebrow>Plugins</Eyebrow>
          <SectionTitle>Flip a switch.<br />See what it costs.</SectionTitle>
          <SectionLead>
            Each switch rebuilds a real player and picks up from the same frame, so what you see is exactly what the code
            beside it ships.
          </SectionLead>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="ios-list order-2 lg:sticky lg:top-[68px] lg:order-1">
            {BENCH.map((id) => {
              const plugin = pluginById(id);
              if (!plugin) return null;
              const on = plugins.includes(id);
              const added = (marginal[id] ?? 0) + (id === "ads" ? (marginal["ads/vast"] ?? 0) : 0);
              return (
                <label key={id} className="ios-row cursor-pointer">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-tight tracking-[-0.014em]">{plugin.title}</span>
                    <span className="text-dim mt-0.5 block truncate text-[13px]">{plugin.blurb}</span>
                  </span>
                  <span
                    className={`text-[13px] tabular-nums transition-colors duration-200 ${on ? "text-sun" : "text-faint"}`}
                  >
                    +{(added / 1000).toFixed(1)}
                  </span>
                  <Switch checked={on} label={plugin.title} onChange={(next) => toggle(id, next)} />
                </label>
              );
            })}
          </div>

          <div className="order-1 flex min-w-0 flex-col gap-5 lg:order-2">
            <BuilderPlayer config={config} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                label="Source"
                options={SOURCES.filter(({ id }) => STREAMS.includes(id)).map(({ id, label }) => ({ value: id, label }))}
                value={source}
                onChange={(next) => setSource(next)}
              />
              <p className="flex items-baseline gap-1.5" aria-live="polite">
                <span className="text-dim text-[14px]">About</span>
                <AnimatedNumber value={estimateSize(config)} format={formatKb} className="site-numeral text-[32px]" />
                <span className="text-dim text-[14px]">KB of JavaScript, brotli</span>
              </p>
            </div>
            <GeneratedCode code={generateCode(config)} label="Copy this player" />
            <Link href="/playground" className="more w-fit">
              Every plugin, source, and token is in the playground
              <ChevronIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
