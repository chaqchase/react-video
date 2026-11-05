"use client";

import { useState } from "react";
import * as Video from "react-video-kit";

const clips = {
  Low: [
    { src: "/media/sample-270.mp4", type: "video/mp4" },
    { src: "/media/sample-360.webm", type: "video/webm" },
  ],
  High: [
    { src: "/media/sample-720.mp4", type: "video/mp4" },
    { src: "/media/sample-360.webm", type: "video/webm" },
  ],
};

export default function SourceChange() {
  const [clip, setClip] = useState<keyof typeof clips>("Low");
  return (
    <Video.Root src={clips[clip]} load="visible">
      <Video.Media width={640} height={360} />
      <button type="button" onClick={() => setClip("Low")}>
        Low
      </button>
      <button type="button" onClick={() => setClip("High")}>
        High
      </button>
    </Video.Root>
  );
}
