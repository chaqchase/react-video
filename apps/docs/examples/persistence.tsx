"use client";

import { persistence } from "react-video-kit/persistence";
import { VideoPlayer } from "react-video-kit/player";
import { speed } from "react-video-kit/speed";

const plugins = [persistence({ key: "docs-persistence" }), speed()];

export default function Persistence() {
  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <p className="text-sm text-current opacity-80">
        Play past the 5-second mark, change the volume or speed if you like, then reload this page. The
        player comes back at the same time with the same settings, paused until you press Play. Watch
        to the end and it starts from the beginning next time.
      </p>
    </div>
  );
}
