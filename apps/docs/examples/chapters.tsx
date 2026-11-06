"use client";

import { chapters } from "react-video-kit/chapters";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [chapters({ src: "/media/chapters.vtt" })];

export default function Chapters() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
