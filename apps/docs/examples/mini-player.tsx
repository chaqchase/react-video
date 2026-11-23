"use client";

import { miniPlayer } from "react-video-kit/mini-player";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [miniPlayer()];

export default function MiniPlayer() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
