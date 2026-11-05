"use client";

import { VideoPlayer } from "react-video-kit/player";

// Tried in order. The first file is broken, so the player moves on by itself.
const sources = [
  { src: "/media/broken.mp4", type: "video/mp4" },
  { src: "/media/sample-360.mp4", type: "video/mp4" },
  { src: "/media/sample-360.webm", type: "video/webm" },
];

export default function Fallback() {
  return <VideoPlayer src={sources} poster="/media/poster.jpg" load="visible" />;
}
