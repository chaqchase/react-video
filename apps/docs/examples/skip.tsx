"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";
import { skip } from "react-video-kit/skip";

const plugins = [
  skip({
    segments: [
      { kind: "intro", start: 3, end: 12 },
      { kind: "credits", start: 24, end: 30 },
    ],
  }),
  ...defaultPlugins(),
];

export default function Skip() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
