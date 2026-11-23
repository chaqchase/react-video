"use client";

import { fit } from "react-video-kit/fit";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [fit()];

// A wide frame, so the picture has something to fill.
export default function Fit() {
  return (
    <VideoPlayer
      src="/media/sample-720.mp4"
      poster="/media/poster.jpg"
      plugins={plugins}
      load="visible"
      style={{ aspectRatio: "21 / 9" }}
    />
  );
}
