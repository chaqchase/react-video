"use client";

import { dash } from "react-video-kit/dash";
import { hls } from "react-video-kit/hls";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

/** Engines are installed but nothing needs them, so neither should download. */
export default function EngineUnused() {
  return (
    <VideoPlayer
      src={[
        { src: "/media/sample-720.mp4", type: "video/mp4" },
        { src: "/media/sample-360.webm", type: "video/webm" },
      ]}
      plugins={[hls(), dash(), ...defaultPlugins()]}
    />
  );
}
