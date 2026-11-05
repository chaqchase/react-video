"use client";

import type { CSSProperties } from "react";
import { orientation } from "react-video-kit/orientation";
import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

// Reserving the shape up front means the page doesn't move when the video loads.
const plugins = [...defaultPlugins().filter(({ name }) => name !== "orientation"), orientation({ initial: "portrait" })];

export default function Vertical() {
  return (
    <VideoPlayer
      src="/media/sample-vertical.mp4"
      poster="/media/sample-vertical.jpg"
      plugins={plugins}
      load="visible"
      eyebrow="Shorts"
      title="First light"
      description="The swell arrives at dawn."
      style={{ "--rv-max-height": "min(620px, 85svh)" } as CSSProperties}
    />
  );
}
