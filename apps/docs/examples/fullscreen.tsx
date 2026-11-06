"use client";

import { useVideoState } from "react-video-kit";
import { fullscreen } from "react-video-kit/fullscreen";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [fullscreen()];

function FullscreenLabel() {
  const supported = useVideoState(fullscreen, (state) => state.supported);
  const active = useVideoState(fullscreen, (state) => state.active);
  return (
    <p className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs whitespace-nowrap text-white backdrop-blur-md">
      Supported: {supported ? "yes" : "no"}. Active: {active ? "yes" : "no"}.
    </p>
  );
}

export default function Fullscreen() {
  return (
    <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible">
      <FullscreenLabel />
    </VideoPlayer>
  );
}
