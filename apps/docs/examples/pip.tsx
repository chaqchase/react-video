"use client";

import { useVideoState } from "react-video-kit";
import { pip } from "react-video-kit/pip";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [pip()];

function PipLabel() {
  const supported = useVideoState(pip, (state) => state.supported);
  const active = useVideoState(pip, (state) => state.active);
  return (
    <p className="pointer-events-none absolute top-3 left-3 rounded bg-black px-2 py-1 text-xs text-white">
      Supported: {supported ? "yes" : "no"}. Active: {active ? "yes" : "no"}.
    </p>
  );
}

export default function Pip() {
  return (
    <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible">
      <PipLabel />
    </VideoPlayer>
  );
}
