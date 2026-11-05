"use client";

import { useMemo, useState } from "react";
import { analytics } from "react-video-kit/analytics";
import { googleAnalytics } from "react-video-kit/analytics/google";
import { VideoPlayer } from "react-video-kit/player";

export default function GoogleAnalytics() {
  const [log, setLog] = useState<string[]>([]);
  const plugins = useMemo(
    () => [
      analytics({
        heartbeat: 0,
        // `send` takes the place of gtag here, so this demo contacts nobody.
        onEvent: googleAnalytics({
          title: "View From A Blue Moon",
          events: ["pause", "seek"],
          send: (name, params) => setLog((lines) => [`${name} ${JSON.stringify(params)}`, ...lines].slice(0, 6)),
        }),
      }),
    ],
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer src="/media/sample-720.mp4?signed=secret-token" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <ol aria-label="Events for Google Analytics" className="flex min-h-44 flex-col gap-1 font-mono text-xs break-all text-current">
        {log.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
