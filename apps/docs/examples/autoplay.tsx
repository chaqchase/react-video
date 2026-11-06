"use client";

import { autoplay } from "react-video-kit/autoplay";
import { definePlugin } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";

// For this demo only. It refuses the first try with sound, as a browser would, so this
// page never starts with sound. Leave it out of your app, where the browser decides.
const refuseSoundOnce = definePlugin("refuse-sound-once", () => ({
  attach(_context, video, scope) {
    // Viewers who prefer reduced motion aren't started, so their first press must work.
    let asked = matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.play = () => {
      if (asked || video.muted) return HTMLMediaElement.prototype.play.call(video);
      asked = true;
      return Promise.reject(new DOMException("Refused for this demo", "NotAllowedError"));
    };
    scope.add(() => Reflect.deleteProperty(video, "play"));
  },
}));

const plugins = [refuseSoundOnce(), autoplay()];

export default function Autoplay() {
  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <p className="text-sm text-current opacity-80">
        On your site, the browser decides whether sound is allowed. This demo refuses it once, so you
        always see the fallback: the video plays muted and offers Tap to unmute. Reload the page to see
        it again. If your system is set to reduce motion, it waits for you to press Play instead.
      </p>
    </div>
  );
}
