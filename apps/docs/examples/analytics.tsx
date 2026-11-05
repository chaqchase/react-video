"use client";

import { useMemo, useState } from "react";
import { analytics } from "react-video-kit/analytics";
import { VideoPlayer } from "react-video-kit/player";

const oneDecimal = (_key: string, value: unknown) =>
  typeof value === "number" ? Math.round(value * 10) / 10 : value;

export default function Analytics() {
  const [log, setLog] = useState<string[]>([]);
  const plugins = useMemo(
    () => [
      analytics({
        heartbeat: 10,
        onEvent: (event) => setLog((lines) => [JSON.stringify(event, oneDecimal), ...lines].slice(0, 8)),
      }),
    ],
    []
  );

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <p className="text-sm text-current opacity-80">
        Play, seek, and pause. Each event appears here as onEvent receives it, newest first, with a
        heartbeat for every 10 seconds played.
      </p>
      <ol aria-label="Analytics events" className="flex min-h-44 flex-col gap-1 font-mono text-xs break-all text-current">
        {log.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
