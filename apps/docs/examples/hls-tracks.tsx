"use client";

import { audioTracks } from "react-video-kit/audio-tracks";
import { hls } from "react-video-kit/hls";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const plugins = [hls({ preferEngine: true }), audioTracks(), ...defaultPlugins()];

export default function HlsTracks() {
  return <VideoPlayer src="/media/hls-tracks/master.m3u8" plugins={plugins} load="visible" />;
}
