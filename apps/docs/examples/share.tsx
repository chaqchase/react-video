"use client";

import { VideoPlayer } from "react-video-kit/player";
import { share } from "react-video-kit/share";

const plugins = [share()];

export default function Share() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
