"use client";

import { useEffect, useState } from "react";
import { VideoPlayer } from "react-video-kit/player";
import { thumbnails } from "react-video-kit/thumbnails";

const FILE = "/media/thumbnails.vtt";

const plugins = [thumbnails({ src: FILE })];

export default function Thumbnails() {
  const [fetched, setFetched] = useState(false);

  // Watches the network, to show that nothing loads until the first hover.
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      if (list.getEntries().some(({ name }) => name.endsWith(FILE))) setFetched(true);
    });
    observer.observe({ type: "resource" });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <p className="mt-3 text-sm text-current opacity-80">
        {fetched ? "thumbnails.vtt has been fetched." : "thumbnails.vtt hasn't been fetched. Hover the timeline."}
      </p>
    </>
  );
}
