"use client";

import { useState } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { quality } from "react-video-kit/quality";

const plugins = [quality()];

const source = {
  renditions: [
    { src: "/media/sample-720.mp4", type: "video/mp4", label: "720p", height: 720 },
    { src: "/media/sample-360.mp4", type: "video/mp4", label: "360p", height: 360 },
    { src: "/media/sample-270.mp4", type: "video/mp4", label: "270p", height: 270 },
  ],
};

export default function Quality() {
  const [size, setSize] = useState("not loaded yet");
  return (
    <>
      <VideoPlayer
        src={source}
        poster="/media/poster.jpg"
        plugins={plugins}
        load="visible"
        media={{
          onLoadedMetadata: ({ currentTarget: video }) =>
            setSize(`${video.videoWidth}×${video.videoHeight}`),
        }}
      />
      <p className="mt-3 text-sm text-current opacity-80">Picture size: {size}</p>
    </>
  );
}
