"use client";

import { hls } from "react-video-kit/hls";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

export default function HlsEngine() {
  return (
    <VideoPlayer
      src="/media/hls/master.m3u8"
      poster="/media/poster.jpg"
      plugins={[hls({ preferEngine: true }), ...defaultPlugins()]}
      load="visible"
    />
  );
}
