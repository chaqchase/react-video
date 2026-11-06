"use client";

import { defaultPlugins, VideoPlayer } from "react-video-kit/player";

const plugins = defaultPlugins();

export default function PlayerTitle() {
  return (
    <VideoPlayer
      src="/media/sample-720.mp4"
      poster="/media/poster.jpg"
      plugins={plugins}
      load="visible"
      eyebrow="Season 1, Episode 1"
      title="The Green Coast"
      description="The swell arrives after a thousand miles of open ocean, and meets the first land it has seen in days."
    />
  );
}
