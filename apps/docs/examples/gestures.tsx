"use client";

import { fullscreen } from "react-video-kit/fullscreen";
import { gestures } from "react-video-kit/gestures";
import { idle } from "react-video-kit/idle";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [idle(), gestures(), fullscreen()];

export default function Gestures() {
  return (
    <>
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <dl className="mt-3 grid gap-3 text-sm text-current opacity-80 sm:grid-cols-2">
        <div>
          <dt className="font-medium">With a mouse</dt>
          <dd>Click the video to play or pause. Double-click it for fullscreen.</dd>
        </div>
        <div>
          <dt className="font-medium">With touch</dt>
          <dd>Tap to show or hide the controls. Double-tap the left or right half to seek 10 seconds.</dd>
        </div>
      </dl>
    </>
  );
}
