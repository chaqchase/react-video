"use client";

import { VideoPlayer } from "react-video-kit/player";

const sources = [
  { src: "/media/sample-720.mp4", type: "video/mp4" },
  { src: "/media/sample-360.webm", type: "video/webm" },
];

export default function Player() {
  return <VideoPlayer src={sources} poster="/media/poster.jpg" />;
}
