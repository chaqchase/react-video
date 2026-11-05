"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const plugins = defaultPlugins();

export default function ComposeReady() {
  return (
    <VideoPlayer
      src="/media/sample-720.mp4"
      poster="/media/poster.jpg"
      plugins={plugins}
      load="visible"
    />
  );
}
