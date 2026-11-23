"use client";

import { useEffect, useState } from "react";
import { mediaSession } from "react-video-kit/media-session";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [
  mediaSession({
    metadata: {
      title: "First light",
      artist: "react-video-kit",
      artwork: [{ src: "/media/poster.jpg", sizes: "1280x720", type: "image/jpeg" }],
    },
  }),
];

export default function MediaSessionDemo() {
  const [session, setSession] = useState("not available in this browser");

  // The Media Session API has no change event, so this reads it twice a second.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const read = () => {
      const { metadata, playbackState } = navigator.mediaSession;
      setSession(`${playbackState}, title: ${metadata?.title ?? "none"}`);
    };
    read();
    const timer = setInterval(read, 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <div className="flex flex-col gap-1 text-sm text-current opacity-80">
        <p>
          Press Play, then look at your system&apos;s media controls or lock screen, or press a media key.
          The player tells the browser what&apos;s playing, and the browser decides what to show.
        </p>
        <p>What the browser has been told: {session}</p>
      </div>
    </div>
  );
}
