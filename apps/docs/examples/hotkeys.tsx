"use client";

import { captions } from "react-video-kit/captions";
import { fullscreen } from "react-video-kit/fullscreen";
import { hotkeys } from "react-video-kit/hotkeys";
import { idle } from "react-video-kit/idle";
import { pip } from "react-video-kit/pip";
import { VideoPlayer } from "react-video-kit/player";
import { speed } from "react-video-kit/speed";

const plugins = [
  hotkeys(),
  idle(),
  speed(),
  captions({ tracks: [{ src: "/media/captions.en.vtt", language: "en", label: "English" }] }),
  pip(),
  fullscreen(),
];

const keys = [
  ["Space", "Play or pause"],
  ["← →", "Seek 5 seconds"],
  ["J L", "Seek 10 seconds"],
  ["↑ ↓", "Volume"],
  ["M", "Mute"],
  ["0–9", "Jump to a tenth of the video"],
  ["Home End", "Jump to the start or end"],
  ["< >", "Slower or faster"],
  ["C", "Captions"],
  ["P", "Picture in picture"],
  ["F", "Fullscreen"],
] as const;

export default function Hotkeys() {
  return (
    <>
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <div className="mt-3 text-sm text-current opacity-80">
        <p className="font-medium">Click the player once, then try a key.</p>
        <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {keys.map(([key, action]) => (
            <div key={key} className="flex items-baseline gap-2">
              <dt>
                <kbd className="rounded border border-current px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
