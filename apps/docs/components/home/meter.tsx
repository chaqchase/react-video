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
    <div className="bg-raised flex flex-col justify-center rounded-[20px] p-4 sm:px-6">
      <p className="text-[14px] font-semibold tracking-[-0.014em] sm:text-[15px]">{label}</p>
      <p className={`site-numeral mt-2 text-[clamp(2.25rem,5vw,3.25rem)] ${tone ?? ""}`}>
        <span ref={statRef}>0</span>
      </p>
      <p className="text-dim mt-2 text-[13px] leading-[1.35]">{note}</p>
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
    <section id="performance" className="site-section">
      <div className="site-wrap">
        <div className="reveal">
          <Eyebrow>Performance</Eyebrow>
          <SectionTitle>Time never touches React.</SectionTitle>
          <SectionLead>
            A shared clock writes straight to the DOM, only when a pixel would change, and stops when playback does. Press
            play and leave your mouse alone. These counters are live, and the first one watches every React commit on this
            page.
          </SectionLead>
        </div>
        <div ref={frame} className="mt-14 grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <VideoPlayer
            src="/media/sample-720.mp4"
            poster="/media/poster.jpg"
            plugins={plugins}
            load="visible"
            title="View From A Blue Moon"
            eyebrow="Trailer"
            aria-label="Player being measured"
          />
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 xl:h-0 xl:min-h-full xl:grid-cols-1 xl:grid-rows-3" data-attached={attached || undefined}>
            <Stat label="React commits" note="Since you pressed play" statRef={commits} tone="text-sun" />
            <Stat label="Clock writes" note="To the DOM, no render" statRef={writes} />
            <Stat label="timeupdate" note="Fired by the browser" statRef={events} />
          </div>
        </div>
      </div>
    </section>
  );
}
