"use client";

import { ambient } from "react-video-kit/ambient";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [ambient()];

export default function Ambient() {
  return (
    <div className="px-6 py-8 sm:px-12 sm:py-10">
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
    </div>
  );
}
