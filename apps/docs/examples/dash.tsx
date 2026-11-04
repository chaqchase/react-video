"use client";

import { dash } from "react-video-kit/dash";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

export default function Dash() {
  return (
    <VideoPlayer
      src="/media/dash/manifest.mpd"
      poster="/media/poster.jpg"
      plugins={[dash(), ...defaultPlugins()]}
    />
  );
}
