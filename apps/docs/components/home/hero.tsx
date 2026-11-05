"use client";

import Link from "next/link";
import { useState } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { createPlugins, SOURCES } from "@/lib/builder";

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
  "fullscreen",
  "pip",
];

export function Hero({ kernel }: { kernel: string }) {
  const [plugins] = useState(() => createPlugins({ source: "mp4", plugins: HERO_PLUGINS }));
  return (
    <section id="intro" className="relative isolate overflow-x-clip pt-14 pb-20 text-center sm:pt-20 sm:pb-28">
      <div className="site-wrap flex flex-col items-center">
        <p className="text-[clamp(1.125rem,2vw,1.5rem)] font-semibold tracking-[-0.018em]">
          React Video Kit <span className="text-dim font-normal">4 alpha</span>
        </p>
        <h1 className="site-display mt-2">
          Beautiful video.
          <br />
          Nothing extra.
        </h1>
        <p className="site-lead mt-6 max-w-[32em]">
          A React video player made of plugins. It starts at {kernel}, adds only what you use, and React doesn&apos;t
          render at all while the video plays.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/docs/v4/getting-started" className="btn btn-primary press">
            Get started
          </Link>
          <Link href="/playground" className="btn btn-ghost press">
            Open the playground
          </Link>
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-[1296px] px-4 sm:mt-16 sm:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-[4%] top-[6%] bottom-[-4%] -z-10 bg-[url(/media/poster.jpg)] bg-cover bg-center opacity-35 blur-[90px] saturate-[1.6] dark:opacity-60"
        />
        <div className="hero-stage shadow-raised rounded-[20px] sm:rounded-[28px]">
          <VideoPlayer
            src={SOURCES[0]?.input}
            poster="/media/poster.jpg"
            plugins={plugins}
            title="View From A Blue Moon"
            eyebrow="Trailer"
            aria-label="Demo player"
            className="max-sm:[--rv-radius:20px] sm:[--rv-radius:28px]"
          />
        </div>
      </div>
    </section>
  );
}
