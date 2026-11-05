"use client";

import { VideoPlayer } from "react-video-kit/player";

export default function FailedPlayer() {
  return <VideoPlayer src="/media/broken.mp4" poster="/media/poster.jpg" load="visible" />;
}
