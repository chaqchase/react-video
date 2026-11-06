"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/site/animated-number";
import { BuilderPlayer } from "@/components/site/builder-player";
import { CopyButton } from "@/components/site/copy-button";
import { GeneratedCode } from "@/components/site/generated-code";
import { CheckIcon } from "@/components/site/icons";
import { Install } from "@/components/site/install";
import { Segmented } from "@/components/site/segmented";
import { Switch } from "@/components/site/switch";
import { ThemePicker } from "@/components/site/theme-picker";
import {
  estimateSize,
  generateCode,
  generateCss,
  PLUGINS,
  SOURCES,
  tokenStyle,
  type PluginGroup,
} from "@/lib/builder";
import { marginal, standalone, STYLES } from "@/lib/sizes";
import { isVerticalTheme, themeClass, type ThemeId } from "@/lib/themes";
import { DEFAULTS, serializeConfig, type Aspect, type PlaygroundState, type StageWidth } from "./url-state";

const GROUPS: PluginGroup[] = ["Controls", "Menus", "Timeline", "Streaming", "Viewing", "Revenue and rights", "Casting", "Extras"];
const ACCENTS = ["#ffffff", "#0a84ff", "#ff9f0a", "#30d158", "#ff375f", "#bf5af2"];
const WIDTHS: Record<StageWidth, string> = { phone: "360px", tablet: "640px", full: "100%" };
const ASPECTS: Aspect[] = ["16/9", "4/3", "1/1", "9/16"];
type CodeTab = "player" | "styles" | "install";

const formatKb = (bytes: number) => `${(bytes / 1000).toFixed(1)}`;

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-[15px] font-semibold tracking-[-0.016em]">{children}</h2>;
}

function TokenSlider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange(value: number): void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[13px]">
        <span className="text-dim">{label}</span>
        <span className="tabular-nums">{value}px</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="site-range mt-1 w-full" />
    </label>
  );
}

/** Everything lives in the URL, so a link reproduces exactly this player. */
export function Playground({ initial }: { initial: PlaygroundState }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<CodeTab>("player");
  const [shareLabel, setShareLabel] = useState(false);
  const update = (partial: Partial<PlaygroundState>) => setState((current) => ({ ...current, ...partial }));
  // A theme for vertical video shows with some, and leaving one goes back to where it started.
  const chooseTheme = (theme: ThemeId) =>
    setState((current) => ({
      ...current,
      theme,
      source: isVerticalTheme(theme)
        ? "vertical"
        : isVerticalTheme(current.theme) && current.source === "vertical"
          ? "mp4"
          : current.source,
    }));

  useEffect(() => {
    const timer = setTimeout(() => {
      history.replaceState(null, "", `${location.pathname}${serializeConfig(state)}`);
    }, 200);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!shareLabel) return;
    const timer = setTimeout(() => setShareLabel(false), 1600);
    return () => clearTimeout(timer);
  }, [shareLabel]);

  const needed = SOURCES.find(({ id }) => id === state.source)?.needs ?? [];
  const config = useMemo(
    () => ({ source: state.source, plugins: state.plugins, layout: state.layout, tokens: state.tokens, theme: state.theme }),
    [state.layout, state.plugins, state.source, state.theme, state.tokens]
  );
  // A vertical video sets its own shape, so the aspect ratio control has nothing to do.
  const vertical = state.source === "vertical";
  const style = {
    ...tokenStyle(state.tokens),
    ...(vertical ? { "--rv-max-height": "calc(100dvh - 220px)" } : { aspectRatio: state.aspect }),
  } as React.CSSProperties;

  return (
    <div className="grid flex-1 lg:h-[calc(100dvh-var(--site-nav-height))] lg:flex-none lg:grid-cols-[328px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
      <h1 className="sr-only">Playground</h1>
      <aside
        aria-label="Plugins and options"
        className="border-line order-2 flex flex-col gap-7 overflow-y-auto border-t p-5 lg:order-1 lg:border-t-0 lg:border-r"
      >
        <section>
          <Heading>Theme</Heading>
          <ThemePicker value={state.theme} onChange={chooseTheme} />
        </section>
        <section>
          <Heading>Source</Heading>
          <Segmented
            label="Source"
            size="sm"
            className="w-full [&>button]:flex-1 [&>button]:px-1"
            options={SOURCES.map(({ id, label }) => ({ value: id, label }))}
            value={state.source}
            onChange={(source) => update({ source })}
          />
        </section>
        <section>
          <Heading>Layout</Heading>
          <Segmented
            label="Layout"
            size="sm"
            options={[
              { value: "complete" as const, label: "Complete" },
              { value: "minimal" as const, label: "Minimal" },
            ]}
            value={state.layout}
            onChange={(layout) => update({ layout })}
          />
        </section>
        <section>
          <Heading>Tokens</Heading>
          <div className="flex flex-col gap-3">
            <div role="radiogroup" aria-label="Accent" className="flex items-center gap-2">
              {ACCENTS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={state.tokens.accent === accent}
                  aria-label={`Accent ${accent}`}
                  onClick={() => update({ tokens: { ...state.tokens, accent } })}
                  style={{ background: accent }}
                  className={`press size-6 rounded-full ring-offset-2 ring-offset-[var(--site-bg)] ${
                    state.tokens.accent === accent ? "ring-sun ring-2" : "ring-line-strong ring-1"
                  }`}
                />
              ))}
              <label className="press border-line-strong relative ml-auto grid size-6 cursor-pointer place-items-center overflow-hidden rounded-full border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]">
                <span className="sr-only">Custom accent</span>
                <input
                  type="color"
                  value={state.tokens.accent}
                  onChange={(event) => update({ tokens: { ...state.tokens, accent: event.target.value } })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
            </div>
            <TokenSlider label="Radius" value={state.tokens.radius} min={0} max={36} onChange={(radius) => update({ tokens: { ...state.tokens, radius } })} />
            <TokenSlider label="Blur" value={state.tokens.blur} min={0} max={48} onChange={(blur) => update({ tokens: { ...state.tokens, blur } })} />
            <TokenSlider label="Controls" value={state.tokens.control} min={28} max={48} onChange={(control) => update({ tokens: { ...state.tokens, control } })} />
          </div>
        </section>
        {GROUPS.map((group) => (
          <section key={group}>
            <Heading>{group}</Heading>
            <ul className="-mx-2">
              {PLUGINS.filter((plugin) => plugin.group === group).map((plugin) => {
                const required = needed.includes(plugin.id);
                const on = required || state.plugins.includes(plugin.id);
                const added = (marginal[plugin.id] ?? 0) + (plugin.id === "ads" ? (marginal["ads/vast"] ?? 0) : 0);
                return (
                  <li key={plugin.id}>
                    <label className={`flex items-center gap-2 rounded-[10px] px-2 py-[7px] transition-colors duration-150 ${required ? "" : "hover:bg-hover cursor-pointer"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] leading-tight">{plugin.title}</span>
                        <span className="text-faint block truncate text-[12px]">
                          {required ? "Needed by this source" : plugin.blurb}
                        </span>
                      </span>
                      <span className="text-faint text-[12px] tabular-nums">+{(added / 1000).toFixed(1)}</span>
                      <Switch
                        checked={on}
                        disabled={required}
                        label={plugin.title}
                        onChange={(next) =>
                          update({
                            plugins: next
                              ? [...state.plugins, plugin.id]
                              : state.plugins.filter((id) => id !== plugin.id),
                          })
                        }
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </aside>

      {/* On a phone these two sit either side of the options. On a wide screen they share a column. */}
      <div className="playground-stage min-w-0 max-lg:contents lg:order-2 lg:overflow-y-auto">
      <section aria-label="Preview" className="playground-stage order-1 flex min-w-0 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Segmented
              label="Stage width"
              size="sm"
              className="max-sm:hidden"
              options={[
                { value: "phone" as const, label: "Phone" },
                { value: "tablet" as const, label: "Tablet" },
                { value: "full" as const, label: "Wide" },
              ]}
              value={state.width}
              onChange={(width) => update({ width })}
            />
            {vertical ? null : (
              <Segmented
                label="Aspect ratio"
                size="sm"
                options={ASPECTS.map((value) => ({ value, label: value.replace("/", ":") }))}
                value={state.aspect}
                onChange={(aspect) => update({ aspect })}
              />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setState(DEFAULTS)} className="press text-sun hover:bg-hover h-8 rounded-full px-3 text-[13px]">
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(`${location.origin}${location.pathname}${serializeConfig(state)}`).then(() => setShareLabel(true));
              }}
              className="press bg-[var(--site-segment)] inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px]"
            >
              {shareLabel ? <CheckIcon className="text-sun" width={13} height={13} /> : null}
              {shareLabel ? "Link copied" : "Copy link"}
            </button>
          </div>
        </div>
        <div className="flex justify-center p-4 sm:px-8 sm:pt-6 sm:pb-8">
          <div
            className="transition-[width] duration-[400ms] ease-rv motion-reduce:transition-none"
            style={{ width: WIDTHS[state.width], maxWidth: vertical ? "100%" : `min(100%, calc((100dvh - 220px) * ${state.aspect}))` }}
          >
            <BuilderPlayer config={config} style={style} className={`shadow-raised ${themeClass(state.theme) ?? ""}`} />
          </div>
        </div>
      </section>

      <aside aria-label="Generated code" className="border-line order-3 grid min-w-0 gap-x-8 gap-y-5 border-t p-5 lg:px-8 lg:py-7 xl:grid-cols-[250px_minmax(0,1fr)]">
        <div>
          <p className="flex items-baseline gap-1.5" aria-live="polite">
            <span className="text-dim text-[13px]">About</span>
            <AnimatedNumber value={estimateSize(config)} format={formatKb} className="site-numeral text-[32px]" />
            <span className="text-dim text-[13px]">KB of JavaScript</span>
          </p>
          <p className="text-faint mt-1 text-[12.5px] leading-snug">
            Plus {formatKb(STYLES + (standalone[`themes/${state.theme}.css`] ?? 0))} KB of CSS. Brotli, without React. A real
            bundle is usually a little smaller, because plugins share strings.
            {state.source === "hls" || state.source === "live" || state.source === "dvr" ? " hls.js loads separately, only when needed." : ""}
            {state.source === "dash" || state.source === "drm" ? " dash.js loads separately, only when needed." : ""}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
        <Segmented
          kind="tabs"
          label="Generated files"
          panelId="playground-code"
          size="sm"
          className="self-start"
          options={[
            { value: "player" as const, label: "Player.tsx" },
            { value: "styles" as const, label: "styles.css" },
            { value: "install" as const, label: "Install" },
          ]}
          value={tab}
          onChange={(next) => setTab(next)}
        />
        <div id="playground-code" role="tabpanel" className="min-h-0">
          {tab === "player" ? <GeneratedCode code={generateCode(config)} label="Copy Player.tsx" /> : null}
          {tab === "styles" ? <GeneratedCode code={generateCss(state.tokens)} label="Copy styles" /> : null}
          {tab === "install" ? (
            <div className="flex flex-col gap-3">
              <Install
                extra={
                  state.source === "hls" || state.source === "live" || state.source === "dvr"
                    ? "hls.js"
                    : state.source === "dash" || state.source === "drm"
                      ? "dashjs"
                      : ""
                }
              />
              <div className="bg-code flex items-center justify-between rounded-[20px] py-1.5 pr-1.5 pl-4">
                <code className="truncate font-mono text-[12.5px]">import &quot;react-video-kit/styles.css&quot;;</code>
                <CopyButton text={`import "react-video-kit/styles.css";`} label="Copy the styles import" />
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
