"use client";

import type { CSSProperties } from "react";
import { captions } from "react-video-kit/captions";
import { idle } from "react-video-kit/idle";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [
  idle(),
  captions({
    tracks: [
      { src: "/media/captions.en.vtt", language: "en", label: "English" },
      { src: "/media/captions.ar.vtt", language: "ar", label: "العربية" },
    ],
    language: "en",
  }),
];

const captionStyle = {
  "--rv-caption-color": "#fde68a",
  "--rv-caption-background": "rgb(0 0 0 / 0.85)",
} as CSSProperties;

export default function Captions() {
  return (
    <VideoPlayer
      src="/media/sample-720.mp4"
      poster="/media/poster.jpg"
      plugins={plugins}
      load="visible"
      style={captionStyle}
    />
  );
}
