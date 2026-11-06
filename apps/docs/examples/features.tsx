"use client";

import { captions } from "react-video-kit/captions";
import { chapters } from "react-video-kit/chapters";
import { fullscreen } from "react-video-kit/fullscreen";
import { gestures } from "react-video-kit/gestures";
import { hotkeys } from "react-video-kit/hotkeys";
import { idle } from "react-video-kit/idle";
import { pip } from "react-video-kit/pip";
import { VideoPlayer } from "react-video-kit/player";
import { quality } from "react-video-kit/quality";
import { speed } from "react-video-kit/speed";
import { thumbnails } from "react-video-kit/thumbnails";

const plugins = [
  idle(),
  gestures(),
  hotkeys(),
  captions({
    tracks: [
      { src: "/media/captions.en.vtt", language: "en", label: "English" },
      { src: "/media/captions.ar.vtt", language: "ar", label: "العربية" },
    ],
  }),
  chapters({ src: "/media/chapters.vtt" }),
  thumbnails({ src: "/media/thumbnails.vtt" }),
  speed(),
  quality(),
  pip(),
  fullscreen(),
];

const source = {
  renditions: [
    { src: "/media/sample-720.mp4", type: "video/mp4", label: "720p", height: 720 },
    { src: "/media/sample-360.mp4", type: "video/mp4", label: "360p", height: 360 },
  ],
};

export default function Features() {
  return <VideoPlayer src={source} poster="/media/poster.jpg" plugins={plugins} />;
}
