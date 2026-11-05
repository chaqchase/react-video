"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AirPlayIcon, CastIcon } from "react-video-kit";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { CheckIcon } from "@/components/site/icons";
import { Segmented } from "@/components/site/segmented";

function Card({ title, children, art, className = "" }: { title: string; children: ReactNode; art: ReactNode; className?: string }) {
  return (
    <article className={`bento-card bg-raised group flex min-w-0 flex-col gap-7 overflow-hidden rounded-[24px] p-7 ${className}`}>
      <div>
        <h3 className="text-[clamp(1.375rem,2.2vw,1.625rem)] leading-[1.16] font-semibold tracking-[-0.018em]">{title}</h3>
        <p className="text-dim mt-2.5 text-[15px] leading-[1.42] tracking-[-0.012em] text-pretty">{children}</p>
      </div>
      <div className="mt-auto flex min-h-[186px] items-center justify-center">{art}</div>
    </article>
  );
}

/** A small player, drawn with the same glass and the same frame as the real one. */
function Frame({ children, dir }: { children: ReactNode; dir?: "ltr" | "rtl" }) {
  return (
    <div
      dir={dir}
      aria-hidden="true"
      className="relative aspect-video w-full max-w-[330px] overflow-hidden rounded-[14px] bg-[url(/media/poster.jpg)] bg-cover bg-center text-white"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
      {children}
    </div>
  );
}

const glass = "rounded-full bg-black/25 shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.28)] backdrop-blur-md";

const RUNGS = ["1080p", "720p", "480p", "270p"];

function Ladder() {
  return (
    <div className="relative h-[176px] w-full max-w-[330px]" aria-hidden="true">
      <div className="grid h-full grid-rows-4">
        {RUNGS.map((rung) => (
          <div key={rung} className="text-faint flex items-center gap-3 text-[12px] tabular-nums">
            <span className="w-10 shrink-0">{rung}</span>
            <span className="bg-line h-px flex-1" />
          </div>
        ))}
      </div>
      <svg
        className="abr-line absolute inset-y-0 right-0 left-[52px] h-full w-[calc(100%-52px)] overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 87.5H12V62.5H26V37.5H42V12.5H62V37.5H76V12.5H100"
          stroke="var(--site-sun)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function LiveArt() {
  return (
    <Frame>
      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#d70015] px-2.5 py-1 text-[11px] font-semibold tracking-wide">
        <span className="live-dot size-1.5 rounded-full bg-white" />
        LIVE
      </span>
      <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/25 backdrop-blur-md">
          <span className="dvr-window absolute inset-y-0 right-0 rounded-full bg-white" />
        </div>
        <div className="flex justify-between text-[11px] text-white/85 tabular-nums">
          <span>−1:40:00</span>
          <span>Live</span>
        </div>
      </div>
    </Frame>
  );
}

function AdArt() {
  return (
    <Frame>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-[12px]">
        <span className={`${glass} px-3 py-1.5 tabular-nums`}>Ad · 0:06</span>
        <span className="ad-skip relative grid h-[29px] w-[88px] rounded-full bg-white font-semibold text-[#1d1d1f]">
          {["Skip in 3", "Skip in 2", "Skip in 1", "Skip ad"].map((label, index) => (
            <span key={label} className="ad-skip-step col-start-1 row-start-1 grid place-items-center" style={{ animationDelay: `${index * 1.2}s` }}>
              {label}
            </span>
          ))}
        </span>
      </div>
    </Frame>
  );
}

const ENGINES = ["hls.js", "dash.js", "Native"];

function DrmArt() {
  return (
    <div className="flex w-full max-w-[330px] flex-col gap-3" aria-hidden="true">
      <pre className="text-text overflow-hidden font-mono text-[13px] leading-[1.7]">
        <span className="code-tok-fn">drm</span>
        <span className="code-tok-dim">{"({"}</span>
        {"\n  "}
        <span className="code-tok-attr">widevine</span>
        <span className="code-tok-dim">{": { "}</span>
        licenseUrl
        <span className="code-tok-dim">{" },"}</span>
        {"\n  "}
        <span className="code-tok-attr">fairplay</span>
        <span className="code-tok-dim">{": {"}</span>
        {"\n    licenseUrl"}
        <span className="code-tok-dim">,</span> certificateUrl
        <span className="code-tok-dim">,</span>
        {"\n  "}
        <span className="code-tok-dim">{"},"}</span>
        {"\n"}
        <span className="code-tok-dim">{"})"}</span>
      </pre>
      <div className="flex gap-1.5">
        {ENGINES.map((engine) => (
          <span key={engine} className="text-dim flex-1 rounded-full bg-[var(--site-segment)] py-1 text-center text-[12.5px]">
            {engine}
          </span>
        ))}
      </div>
    </div>
  );
}

function CastArt() {
  return (
    <div className="w-full max-w-[330px]" aria-hidden="true">
      <Frame>
        <div className="absolute top-2.5 right-2.5 flex gap-1.5">
          <span className={`${glass} grid size-7 place-items-center`}>
            <AirPlayIcon width={15} height={15} />
          </span>
          <span className={`${glass} grid size-7 place-items-center`}>
            <CastIcon width={15} height={15} />
          </span>
        </div>
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2 text-[11px] text-white/85 tabular-nums">
          <span>0:42</span>
          <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-white" />
          </span>
          <span>−1:38</span>
        </div>
      </Frame>
    </div>
  );
}

const KEYS: { key: string; code: string[]; label: string; action: string; area: string }[] = [
  { key: "M", code: ["m", "M"], label: "M", action: "Mute", area: "1 / 1" },
  { key: "F", code: ["f", "F"], label: "F", action: "Fullscreen", area: "1 / 2" },
  { key: "C", code: ["c", "C"], label: "C", action: "Captions", area: "1 / 3" },
  { key: "↑", code: ["ArrowUp"], label: "↑", action: "Volume up", area: "1 / 6" },
  { key: "Space", code: [" "], label: "Space", action: "Play or pause", area: "2 / 1 / 2 / span 3" },
  { key: "←", code: ["ArrowLeft"], label: "←", action: "Back 5 seconds", area: "2 / 5" },
  { key: "↓", code: ["ArrowDown"], label: "↓", action: "Volume down", area: "2 / 6" },
  { key: "→", code: ["ArrowRight"], label: "→", action: "Forward 5 seconds", area: "2 / 7" },
];

/** Keycaps press when you press the key, anywhere on the page. It only listens. */
function Keyboard() {
  const root = useRef<HTMLDivElement>(null);
  const [action, setAction] = useState("Try pressing one");

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const find = (key: string) => KEYS.find(({ code }) => code.includes(key));
    const cap = (key: string) => {
      const match = find(key);
      return match ? node.querySelector<HTMLElement>(`[data-key="${match.key}"]`) : null;
    };
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches?.("input, textarea, [contenteditable]")) return;
      const match = find(event.key);
      if (!match) return;
      cap(event.key)?.setAttribute("data-down", "");
      setAction(match.action);
    };
    const up = (event: KeyboardEvent) => cap(event.key)?.removeAttribute("data-down");
    const clear = () => node.querySelectorAll("[data-down]").forEach((key) => key.removeAttribute("data-down"));
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", clear);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", clear);
    };
  }, []);

  return (
    <div ref={root} className="flex w-full flex-col items-center gap-4">
      <div className="grid w-full max-w-[330px] grid-cols-[repeat(3,minmax(0,1fr))_8px_repeat(3,minmax(0,1fr))] gap-1.5" aria-hidden="true">
        {KEYS.map(({ key, label, area }) => (
          <kbd key={key} data-key={key} className="keycap" style={{ gridArea: area }}>
            {label}
          </kbd>
        ))}
      </div>
      <p className="text-dim h-4 text-[13px] pointer-coarse:hidden" aria-live="polite">
        {action}
      </p>
    </div>
  );
}

const CUES = {
  en: { label: "English", dir: "ltr", cue: "The sea doesn't wait for anyone.", title: "Subtitles" },
  ar: { label: "العربية", dir: "rtl", cue: "البحر لا ينتظر أحدًا.", title: "الترجمة" },
} as const;
type Language = keyof typeof CUES;

function Languages() {
  const [language, setLanguage] = useState<Language>("ar");
  const { dir, cue, title } = CUES[language];
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div className="w-full max-w-[270px]">
        <Frame dir={dir}>
          <span className={`${glass} absolute start-2.5 top-2.5 px-2.5 py-1 text-[11px]`}>{title}</span>
          <p key={language} className="caption-in absolute inset-x-3 bottom-3 text-center text-[13px] font-medium [text-shadow:0_1px_3px_rgb(0_0_0/0.7)]">
            {cue}
          </p>
        </Frame>
      </div>
      <Segmented
        size="sm"
        label="Language"
        value={language}
        onChange={(next) => setLanguage(next)}
        options={(Object.keys(CUES) as Language[]).map((value) => ({ value, label: CUES[value].label }))}
      />
    </div>
  );
}

const TESTED = [
  { group: "Browsers", items: ["Chromium", "Firefox", "WebKit"] },
  { group: "React", items: ["18", "19"] },
  { group: "Next.js", items: ["App Router", "Pages Router"] },
  { group: "Bundlers", items: ["esbuild", "Rollup", "webpack"] },
  { group: "Accessibility", items: ["axe on every example"] },
];

function Tested() {
  return (
    <ul className="w-full" aria-hidden="true">
      {TESTED.map(({ group, items }) => (
        <li key={group} className="border-line flex items-baseline gap-4 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0">
          <span className="text-dim w-[92px] shrink-0 text-[13px]">{group}</span>
          <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[14px] tracking-[-0.01em]">
            {items.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckIcon width={12} height={12} strokeWidth={2.2} className="text-sun shrink-0" />
                {item}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="band site-section">
      <div className="site-wrap">
      <div className="reveal">
        <Eyebrow>Take a closer look</Eyebrow>
        <SectionTitle>The hard parts of video,<br />already done.</SectionTitle>
        <SectionLead>
          Adaptive streaming, live edges, ad breaks, and key systems. Each is a plugin behind the same small interface.
        </SectionLead>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="HLS and DASH" art={<Ladder />}>
          hls.js and dash.js load only when a source needs them. Quality menus work the same across both, and on plain MP4s.
        </Card>
        <Card title="Live and DVR" art={<LiveArt />}>
          A LIVE pill that knows when you&apos;ve drifted from the edge, one click back, and a seekable window when the stream has one.
        </Card>
        <Card title="Ads that fail open" art={<AdArt />}>
          VAST with no SDK, or Google IMA. If an ad is blocked, slow, or broken, the content plays anyway.
        </Card>
        <Card title="One DRM config" art={<DrmArt />}>
          Describe your licence servers once. It becomes the right settings for hls.js, dash.js, or native FairPlay.
        </Card>
        <Card title="AirPlay and Chromecast" art={<CastArt />}>
          The timeline, volume, and time all keep working while another screen does the playing.
        </Card>
        <Card title="The keyboard, properly" art={<Keyboard />}>
          Sliders are real range inputs, focus returns where it came from, and no shortcut fires while you&apos;re typing.
        </Card>
        <Card title="Every language, either direction" art={<Languages />}>
          Translated labels, plurals, and captions you can style. The layout mirrors in RTL, except the parts that shouldn&apos;t.
        </Card>
        <article className="bento-card bg-raised grid min-w-0 gap-7 overflow-hidden rounded-[24px] p-7 sm:col-span-2 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-center md:gap-10">
          <div>
            <h3 className="text-[clamp(1.375rem,2.2vw,1.625rem)] leading-[1.16] font-semibold tracking-[-0.018em]">Tested the way it&apos;s used</h3>
            <p className="text-dim mt-2.5 text-[15px] leading-[1.42] tracking-[-0.012em] text-pretty">
              Real playback through real engines, every example checked for accessibility, server rendering run from the packed
              tarball, and tree-shaking proven in three bundlers.
            </p>
          </div>
          <Tested />
        </article>
      </div>
      </div>
    </section>
  );
}
