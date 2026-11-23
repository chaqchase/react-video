"use client";

import { useState } from "react";
import { VideoPlayer } from "react-video-kit/player";

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
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Clip" className="flex gap-2">
        <button type="button" aria-pressed={clip === "Low"} onClick={() => setClip("Low")}>
          Low
        </button>
        <button type="button" aria-pressed={clip === "High"} onClick={() => setClip("High")}>
          High
        </button>
      </div>
      <VideoPlayer src={clips[clip]} poster="/media/poster.jpg" load="visible" />
    </div>
  );
}
