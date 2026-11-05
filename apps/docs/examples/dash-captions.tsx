"use client";

import { dash } from "react-video-kit/dash";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

export default function DashCaptions() {
  return (
    <VideoPlayer
      src="/media/dash/subtitled.mpd"
      poster="/media/poster.jpg"
      plugins={[dash(), ...defaultPlugins()]}
    />
  );
}
