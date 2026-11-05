"use client";

import { useMemo, useState } from "react";
import { definePlugin } from "react-video-kit/core";
import { VideoKitError } from "react-video-kit/errors";
import { VideoPlayer } from "react-video-kit/player";

const POSTER = "/media/poster.jpg";

// Stands in for a lost connection, which is hard to arrange on purpose.
const lostConnection = definePlugin("lostConnection", () => ({
  gates: {
    load(request, next) {
      if (request.source.src !== "/media/connection.mp4") return next(request);
      throw new VideoKitError("media-network", "A network error stopped the download.", { retryable: true });
    },
  },
}));

const FAILURES = [
  { label: "Damaged file", src: "/media/broken.mp4" },
  { label: "Lost connection", src: "/media/connection.mp4" },
  { label: "Nothing can play it", src: { src: "/media/unknown.mxf", type: "application/mxf" } },
];

export default function Errors() {
  const [failure, setFailure] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const plugins = useMemo(() => [lostConnection()], []);
  const current = FAILURES[failure] as (typeof FAILURES)[number];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {FAILURES.map(({ label }, index) => (
          <button key={label} type="button" aria-pressed={index === failure} onClick={() => setFailure(index)}>
            {label}
          </button>
        ))}
      </div>
      <VideoPlayer
        src={current.src}
        poster={POSTER}
        plugins={plugins}
        load="visible"
        onError={({ code, fatal, retryable }) =>
          setLog((lines) => [JSON.stringify({ code, fatal, retryable }), ...lines].slice(0, 5))
        }
      />
      <ol aria-label="What onError received" className="flex min-h-24 flex-col gap-1 font-mono text-xs break-all text-current">
        {log.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
