"use client";

import Link from "next/link";
import { useState } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { InstallLine } from "@/components/site/install";
import { ArrowIcon } from "@/components/site/icons";
import { createPlugins, SOURCES } from "@/lib/builder";
import { ALPHA_PUBLISHED } from "@/lib/site";

const HERO_PLUGINS = [
  "idle",
  "gestures",
  "hotkeys",
  "recovery",
  "captions",
  "chapters",
  "thumbnails",
  "speed",
  "quality",
  "pip",
  "fullscreen",
  "autoplay",
];

export function Hero({ kernel }: { kernel: string }) {
  const [plugins] = useState(() => createPlugins({ source: "mp4", plugins: HERO_PLUGINS }));
  return (
    <section id="intro" className="relative isolate overflow-x-clip pt-12 pb-20 sm:pt-16">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-[radial-gradient(70%_60%_at_50%_0%,var(--site-dusk-soft),transparent_75%)]"
      />
      <div className="mx-auto flex max-w-[1120px] flex-col items-center px-4 text-center sm:px-6">
        <Link
          href="/docs/v4"
          className="press group border-line-strong text-dim hover:text-text mb-7 inline-flex items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-[13px]"
        >
          <span className="bg-sun-soft text-sun rounded-full px-2 py-0.5 font-mono text-[11.5px] font-medium">
            v4 alpha
          </span>
          Rebuilt so everything is a plugin
          <span className="transition-transform duration-200 ease-rv group-hover:translate-x-0.5" aria-hidden="true">
            →
          </span>
        </Link>
        <h1 className="text-[clamp(2.75rem,8vw,5.75rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
          The video player
          <br />
          <span className="bg-gradient-to-r from-[var(--site-dusk)] via-[#c8689a] to-[var(--site-sun)] bg-clip-text text-transparent">
            you compose.
          </span>
        </h1>
        <p className="text-dim mt-6 max-w-[58ch] text-[clamp(1.05rem,1.7vw,1.25rem)] leading-relaxed text-pretty">
          Start at {kernel}. Add HLS, DASH, live, captions, ads, DRM, or casting as plugins, and ship only what you
          use. While video plays, React doesn&apos;t render at all.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/docs/v4/getting-started" className="btn btn-primary press">
            Get started
            <ArrowIcon />
          </Link>
          <InstallLine />
        </div>
        {ALPHA_PUBLISHED ? null : (
          <p className="text-faint mt-3 text-[13px]">The first alpha isn&apos;t on npm yet, so this won&apos;t install until it is.</p>
        )}
      </div>

      <div className="relative mx-auto mt-12 max-w-[1120px] px-4 sm:mt-14 sm:px-6">
        <div
          aria-hidden="true"
          className="absolute inset-x-[6%] -inset-y-[8%] -z-10 rounded-[48px] bg-[url(/media/poster.jpg)] bg-cover bg-center opacity-30 blur-[88px] saturate-[1.5] dark:opacity-70"
        />
        <div className="shadow-raised overflow-hidden rounded-[20px] ring-1 ring-white/10 sm:rounded-[24px]">
          <VideoPlayer
            src={SOURCES[0]?.input}
            poster="/media/poster.jpg"
            plugins={plugins}
            media={{ loop: true }}
            aria-label="Demo player"
            style={{ "--rv-radius": "0px" } as React.CSSProperties}
          />
        </div>
        <p className="text-faint mt-3 text-center font-mono text-[12px]">
          The real thing, not a recording.{" "}
          <span className="pointer-coarse:hidden">
            Try <kbd className="text-dim">Space</kbd>, <kbd className="text-dim">←</kbd> <kbd className="text-dim">→</kbd>, or the settings menu.{" "}
          </span>
          The film is generated with ffmpeg.
        </p>
      </div>
    </section>
  );
}
