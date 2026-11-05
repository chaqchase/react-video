"use client";

import { useVideoState } from "react-video-kit";
import { idle } from "react-video-kit/idle";
import { VideoPlayer } from "react-video-kit/player";
import { speed } from "react-video-kit/speed";

// Speed is here so there's a settings menu to open.
const plugins = [idle(), speed()];

function ControlsLabel() {
  const visible = useVideoState(idle, (state) => state.visible);
  const paused = useVideoState((media) => media.paused);
  return (
    <p className="pointer-events-none absolute top-3 left-3 rounded bg-black px-2 py-1 text-xs text-white">
      Controls: {visible ? "shown" : "hidden"}. Video: {paused ? "paused" : "playing"}.
    </p>
  );
}

export default function Idle() {
  return (
    <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible">
      <ControlsLabel />
    </VideoPlayer>
  );
}
