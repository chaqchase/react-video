"use client";

import { useState } from "react";
import { captions } from "react-video-kit/captions";
import { createPlayer } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";
import { transcript, Transcript } from "react-video-kit/transcript";

export default function TranscriptExample() {
  // Made here rather than by the player, so the transcript beside it can follow the same one.
  const [player] = useState(() =>
    createPlayer({
      src: "/media/sample-720.mp4",
      load: "visible",
      plugins: [
        captions({
          tracks: [
            { src: "/captions/nature.en.vtt", language: "en", label: "English" },
            { src: "/captions/nature.ar.vtt", language: "ar", label: "العربية" },
          ],
        }),
        transcript(),
      ],
    })
  );
  return (
    <div className="flex flex-col">
      <VideoPlayer player={player} poster="/media/poster.jpg" />
      <Transcript player={player} className="p-2" />
    </div>
  );
}
