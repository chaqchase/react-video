"use client";

import { VideoPlayer } from "react-video-kit/player";
import { screenshot } from "react-video-kit/screenshot";

const plugins = [screenshot()];

export default function Screenshot() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
