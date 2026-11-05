"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const sources = [
  { src: "/media/sample-720.mp4", type: "video/mp4" },
  { src: "/media/sample-360.webm", type: "video/webm" },
];

const plugins = defaultPlugins();

export default function Player() {
  return <VideoPlayer src={sources} poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
