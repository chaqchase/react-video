"use client";

import { captions } from "react-video-kit/captions";
import { fullscreen } from "react-video-kit/fullscreen";
import { hotkeys } from "react-video-kit/hotkeys";
import { pip } from "react-video-kit/pip";
import { VideoPlayer } from "react-video-kit/player";
import { shortcuts } from "react-video-kit/shortcuts";
import { speed } from "react-video-kit/speed";

const plugins = [
  hotkeys(),
  shortcuts(),
  fullscreen(),
  pip(),
  speed(),
  captions({ tracks: [{ src: "/media/captions.en.vtt", language: "en", label: "English" }] }),
];

export default function Shortcuts() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
