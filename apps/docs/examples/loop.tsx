"use client";

import { loop } from "react-video-kit/loop";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [loop()];

export default function Loop() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
