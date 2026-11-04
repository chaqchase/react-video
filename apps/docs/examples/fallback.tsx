"use client";

import * as Video from "react-video-kit";

// Tried in order. The first file is broken, so the player moves on by itself.
const sources = [
  { src: "/media/broken.mp4", type: "video/mp4" },
  { src: "/media/sample-360.mp4", type: "video/mp4" },
  { src: "/media/sample-360.webm", type: "video/webm" },
];

export default function Fallback() {
  return (
    <Video.Root src={sources}>
      <Video.Media width={640} height={360} />
      <Video.PlayPause>
        <span aria-hidden="true">⏯</span>
      </Video.PlayPause>
    </Video.Root>
  );
}
