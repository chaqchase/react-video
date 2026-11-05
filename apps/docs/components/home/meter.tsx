"use client";

import { useEffect, useRef, useState } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { idle } from "react-video-kit/idle";
import { Eyebrow, SectionLead, SectionTitle } from "@/components/site/eyebrow";

declare global {
  interface Window {
    __rvkCommits?: number;
  }
}

const plugins = [idle()];

function Stat({ label, note, statRef, tone }: { label: string; note: string; statRef: React.Ref<HTMLSpanElement>; tone?: string }) {
  return (
    <div className="border-line bg-raised rounded-2xl border p-4 sm:p-5">
      <p className="text-dim text-[13px]">{label}</p>
      <p className={`mt-1 font-mono text-[clamp(1.9rem,4vw,2.75rem)] leading-none font-medium tracking-tight tabular-nums ${tone ?? ""}`}>
        <span ref={statRef}>0</span>
      </p>
      <p className="text-faint mt-2 text-[12.5px] leading-snug">{note}</p>
    </div>
  );
}

/**
 * Counts are written straight to the DOM. If this rendered to show them, it would
 * be measuring itself.
 */
export function Meter() {
  const frame = useRef<HTMLDivElement>(null);
  const commits = useRef<HTMLSpanElement>(null);
  const writes = useRef<HTMLSpanElement>(null);
  const events = useRef<HTMLSpanElement>(null);
  const [attached, setAttached] = useState(false);

  useEffect(() => {
    const root = frame.current;
    if (!root) return;
    let video: HTMLVideoElement | null = null;
    let fill: Element | null = null;
    let started = 0;
    let writeCount = 0;
    let eventCount = 0;
    let settling: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver((records) => {
      writeCount += records.length;
      if (writes.current) writes.current.textContent = String(writeCount);
    });
    const reset = () => {
      // Pressing play itself commits. Counting starts once that has settled.
      clearTimeout(settling);
      settling = setTimeout(() => {
        started = window.__rvkCommits ?? 0;
        writeCount = 0;
        eventCount = 0;
      }, 400);
    };
    const onTime = () => {
      eventCount += 1;
      if (events.current) events.current.textContent = String(eventCount);
    };
    const poll = setInterval(() => {
      if (!video || video.paused) return;
      if (commits.current && window.__rvkCommits !== undefined) {
        commits.current.textContent = String(Math.max(window.__rvkCommits - started, 0));
      }
    }, 250);
    const connect = () => {
      video = root.querySelector("video");
      fill = root.querySelector('[data-part="timeline-fill"]');
      if (!video || !fill) return false;
      video.addEventListener("play", reset);
      video.addEventListener("timeupdate", onTime);
      observer.observe(fill, { attributes: true, attributeFilter: ["style"] });
      setAttached(true);
      return true;
    };
    connect();
    return () => {
      clearInterval(poll);
      clearTimeout(settling);
      observer.disconnect();
      video?.removeEventListener("play", reset);
      video?.removeEventListener("timeupdate", onTime);
    };
  }, []);

  return (
    <section id="performance" className="border-line border-y bg-[color-mix(in_srgb,var(--site-sunken)_70%,transparent)]">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <div className="reveal">
          <Eyebrow time="00:37">Performance</Eyebrow>
          <SectionTitle>Time never touches React.</SectionTitle>
          <SectionLead>
            Browsers report the time about four times a second. Put that in React state and every part renders with
            it, as version 3 of this package did. Now time stays out of state altogether: a shared clock writes
            transforms straight to the DOM, only when a pixel would change, and stops when playback does.
          </SectionLead>
          <p className="text-dim mt-4 max-w-[56ch] text-[15px] leading-relaxed">
            Press play and leave your mouse alone. These counters are live, and the first one watches every React
            commit on this page.
          </p>
        </div>
        <div ref={frame} className="flex min-w-0 flex-col gap-4">
          <VideoPlayer
            src="/media/sample-720.mp4"
            poster="/media/poster.jpg"
            plugins={plugins}
            load="visible"
            className="shadow-raised"
            aria-label="Player being measured"
          />
          <div className="grid grid-cols-3 gap-3" data-attached={attached || undefined}>
            <Stat label="React commits" note="Since you pressed play" statRef={commits} tone="text-sun" />
            <Stat label="Clock writes" note="To the DOM, no render" statRef={writes} />
            <Stat label="timeupdate" note="Fired by the browser" statRef={events} />
          </div>
        </div>
      </div>
    </section>
  );
}
