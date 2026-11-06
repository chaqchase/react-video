"use client";

import { hls } from "react-video-kit/hls";
import { live } from "react-video-kit/live";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

export default function Live() {
  return <VideoPlayer src="/live/stream.m3u8" plugins={[hls(), live(), ...defaultPlugins()]} load="visible" />;
}
