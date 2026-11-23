"use client";

import { VideoPlayer } from "react-video-kit/player";
import { speed } from "react-video-kit/speed";

const plugins = [speed({ rates: [0.5, 1, 1.5, 2, 3] })];

export default function Speed() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
