"use client";

import * as Video from "react-video-kit/primitives";

// No skin at all: the primitives bring behaviour and ARIA, and this file brings the look.
export default function ComposeHeadless() {
  return (
    <Video.Root
      src="/media/sample-720.mp4"
      load="visible"
      className="group relative aspect-video w-full overflow-hidden bg-black font-mono text-[#f6efe4]"
    >
      <Video.Media poster="/media/poster.jpg" className="block size-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-5 pt-10 pb-4">
        <Video.PlayPause className="group/play shrink-0 text-[13px] tracking-widest uppercase underline-offset-4 hover:underline">
          <span className="group-data-[state=playing]/play:hidden">Play</span>
          <span className="hidden group-data-[state=playing]/play:inline">Pause</span>
        </Video.PlayPause>
        <Video.Timeline className="relative h-8 flex-1 cursor-pointer">
          <Video.TimelineTrack className="absolute inset-x-0 top-1/2 h-px bg-white/40">
            <Video.TimelineFill className="absolute inset-x-0 -top-px h-[3px] origin-left bg-[#ffb27a]" />
          </Video.TimelineTrack>
        </Video.Timeline>
        <span className="shrink-0 text-[13px] tabular-nums">
          <Video.CurrentTime /> / <Video.Duration />
        </span>
      </div>
    </Video.Root>
  );
}
