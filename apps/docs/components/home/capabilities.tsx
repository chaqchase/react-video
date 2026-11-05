"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";
import { Segmented } from "@/components/site/segmented";

function Card({ title, children, art, className = "" }: { title: string; children: ReactNode; art: ReactNode; className?: string }) {
  return (
    <article className={`bento-card border-line bg-raised group flex min-w-0 flex-col justify-between gap-5 overflow-hidden rounded-2xl border p-5 transition-colors duration-200 ease-rv hover:border-[var(--site-line-strong)] ${className}`}>
      <div className="flex min-h-[92px] items-center justify-center">{art}</div>
      <div>
        <h3 className="text-[15.5px] font-semibold tracking-[-0.015em]">{title}</h3>
        <p className="text-dim mt-1.5 text-[13.5px] leading-relaxed text-pretty">{children}</p>
      </div>
    </article>
  );
}

const LADDER = [
  { label: "270p", height: 30 },
  { label: "360p", height: 46 },
  { label: "720p", height: 66 },
  { label: "1080p", height: 88 },
];

function Ladder() {
  return (
    <div className="flex items-end gap-2" aria-hidden="true">
      {LADDER.map(({ label, height }, index) => (
        <div key={label} className="flex w-11 flex-col items-center gap-1.5">
          <span className="abr-bar w-full rounded-md" style={{ height, animationDelay: `${index * 1.1}s` }} />
          <span className="text-faint font-mono text-[10.5px]">{label}</span>
        </div>
      ))}
    </div>
  );
}

function LiveArt() {
  return (
    <div className="flex w-full max-w-[240px] flex-col gap-3" aria-hidden="true">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#cc2f35] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
        <span className="live-dot size-1.5 rounded-full bg-white" />
        LIVE
      </span>
      <div className="bg-line relative h-1.5 overflow-hidden rounded-full">
        <span className="dvr-window absolute inset-y-0 rounded-full" />
      </div>
      <div className="text-faint flex justify-between font-mono text-[10.5px]">
        <span>−1:40:00</span>
        <span>edge</span>
      </div>
    </div>
  );
}

function AdArt() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <span className="border-line-strong rounded-lg border px-2.5 py-1.5 font-mono text-[12px]">Ad · 0:06</span>
      <span className="ad-skip border-line-strong relative grid h-[31px] w-[86px] rounded-lg border text-[12px] font-medium">
        {["Skip in 3", "Skip in 2", "Skip in 1", "Skip ad"].map((label, index) => (
          <span key={label} className="ad-skip-step col-start-1 row-start-1 grid place-items-center" style={{ animationDelay: `${index * 1.2}s` }}>
            {label}
          </span>
        ))}
      </span>
    </div>
  );
}

function DrmArt() {
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <svg viewBox="0 0 32 40" width="34" height="42" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-sun shrink-0">
        <path className="lock-shackle" d="M9 18v-6a7 7 0 0 1 14 0v6" />
        <rect x="4" y="18" width="24" height="18" rx="5" fill="var(--site-sun-soft)" />
        <path d="M16 25v4" />
      </svg>
      <div className="flex flex-col gap-1 font-mono text-[11.5px]">
        {["com.widevine.alpha", "com.apple.fps", "com.microsoft.playready", "org.w3.clearkey"].map((system) => (
          <span key={system} className="text-dim">
            {system}
          </span>
        ))}
      </div>
    </div>
  );
}

function CastArt() {
  return (
    <div className="flex items-center gap-6" aria-hidden="true">
      <svg viewBox="0 0 48 40" width="58" height="48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="text-dim">
        <path d="M6 14V8a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H28" />
        <path className="cast-wave" style={{ animationDelay: "0.3s" }} d="M6 34a4 4 0 0 1 4 4" transform="translate(0 -3)" />
        <path className="cast-wave" style={{ animationDelay: "0.15s" }} d="M6 26a12 12 0 0 1 12 12" transform="translate(0 -3)" />
        <path className="cast-wave" d="M6 19a19 19 0 0 1 19 19" transform="translate(0 -3)" />
      </svg>
      <svg viewBox="0 0 40 36" width="50" height="46" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" className="text-dim">
        <path d="M9 25H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h26a3 3 0 0 1 3 3v15a3 3 0 0 1-3 3h-2" />
        <path className="airplay-triangle" d="M20 20l9 12H11z" fill="var(--site-sun-soft)" />
      </svg>
    </div>
  );
}

const KEYS: { key: string; code: string[]; label: string; action: string; wide?: boolean }[] = [
  { key: "Space", code: [" "], label: "Space", action: "Play or pause", wide: true },
  { key: "←", code: ["ArrowLeft"], label: "←", action: "Back 5 seconds" },
  { key: "→", code: ["ArrowRight"], label: "→", action: "Forward 5 seconds" },
  { key: "↑", code: ["ArrowUp"], label: "↑", action: "Volume up" },
  { key: "↓", code: ["ArrowDown"], label: "↓", action: "Volume down" },
  { key: "M", code: ["m", "M"], label: "M", action: "Mute" },
  { key: "F", code: ["f", "F"], label: "F", action: "Fullscreen" },
  { key: "C", code: ["c", "C"], label: "C", action: "Captions" },
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
    <div ref={root} className="flex w-full flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-1.5" aria-hidden="true">
        {KEYS.map(({ key, label, wide }) => (
          <kbd key={key} data-key={key} className={`keycap ${wide ? "px-5" : "w-9"}`}>
            {label}
          </kbd>
        ))}
      </div>
      <p className="text-sun h-4 font-mono text-[12px] pointer-coarse:hidden" aria-live="polite">
        {action}
      </p>
    </div>
  );
}

const CUES = {
  en: { label: "English", dir: "ltr", cue: "The ridges take the last of the light.", play: "Play", time: "0:12" },
  ar: { label: "العربية", dir: "rtl", cue: "تأخذ التلال آخر ما تبقى من الضوء.", play: "تشغيل", time: "٠:١٢" },
} as const;
type Language = keyof typeof CUES;

function Languages() {
  const [language, setLanguage] = useState<Language>("ar");
  const { dir, cue, play, time } = CUES[language];
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div dir={dir} className="relative w-full max-w-[280px] overflow-hidden rounded-xl bg-[url(/media/poster.jpg)] bg-cover bg-center">
        <div className="flex aspect-[16/8] flex-col justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2.5 text-white">
          <p key={language} className="caption-in mx-auto rounded bg-black/70 px-2 py-0.5 text-center text-[12px]">
            {cue}
          </p>
          <div className="flex items-center justify-between rounded-full bg-black/40 px-2.5 py-1 text-[10.5px] backdrop-blur-sm">
            <span>{play}</span>
            <span className="font-mono">{time}</span>
          </div>
        </div>
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

export function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-[1120px] px-4 py-20 sm:px-6 sm:py-28">
      <div className="reveal">
        <Eyebrow time="01:19">Everything else</Eyebrow>
        <SectionTitle>The hard parts of video, already done.</SectionTitle>
        <SectionLead>
          The parts that take a team months: adaptive streaming, live edges, ad breaks, and key systems. Each is a plugin
          behind the same small interface.
        </SectionLead>
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <Card title="Every language, either direction" art={<Languages />} className="sm:col-span-2 lg:col-span-1">
          Translated labels, plurals, and captions you can style. The layout mirrors in RTL, except the parts that shouldn&apos;t.
        </Card>
        <Card
          title="Tested the way it's used"
          className="sm:col-span-2"
          art={
            <div className="flex flex-wrap justify-center gap-1.5 font-mono text-[11.5px]" aria-hidden="true">
              {["Chromium", "Firefox", "WebKit", "React 18", "React 19", "App Router", "Pages Router", "axe on every example", "esbuild", "Rollup", "webpack"].map((item) => (
                <span key={item} className="border-line text-dim rounded-md border px-2 py-1">
                  {item}
                </span>
              ))}
            </div>
          }
        >
          Real playback through real engines in three browsers, every example checked for accessibility, server rendering tested from the packed tarball, and tree-shaking proven in three bundlers.
        </Card>
      </div>
      <p className="text-dim mt-6 max-w-[72ch] text-[14px] leading-relaxed">
        iPhone and iPad, AirPlay, Chromecast, Widevine, FairPlay, and the Google IMA SDK are built, but they haven&apos;t run on
        real devices or services yet.{" "}
        <Link href="/docs/v4#whats-been-tested" className="text-text underline underline-offset-2">
          See what&apos;s been tested
        </Link>
        .
      </p>
    </section>
  );
}
