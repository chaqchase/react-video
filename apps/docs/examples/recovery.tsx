"use client";

import { useEffect, useState } from "react";
import type { Player } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";
import { recovery } from "react-video-kit/recovery";

// This file can't be decoded, which isn't worth retrying, so the plugin wouldn't
// normally touch it. retryOn overrides that, so there's something to watch.
const plugins = [recovery({ retries: 3, delay: 1000, retryOn: () => true })];

export default function Recovery() {
  const [run, setRun] = useState(0);
  const [player, setPlayer] = useState<Player | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    if (!player) return;
    let start: number | undefined;
    let last = "";
    return player.subscribe(() => {
      const { status } = player.getState().media;
      const { attempt, retrying } = player.plugin(recovery).state();
      let line = "";
      if (status === "loading") line = retrying ? `Retry ${attempt} of 3` : "Loading";
      if (status === "error") line = retrying ? "Failed, waiting to retry" : "Failed, out of retries";
      if (!line || line === last) return;
      last = line;
      start ??= performance.now();
      const seconds = (performance.now() - start) / 1000;
      setLog((lines) => [...lines, `${seconds.toFixed(1)}s  ${line}`]);
    });
  }, [player]);

  return (
    <>
      <VideoPlayer
        key={run}
        ref={setPlayer}
        src="/media/broken.mp4"
        poster="/media/poster.jpg"
        plugins={plugins}
        load="visible"
      />
      <div role="log" aria-label="Retries" className="mt-3 min-h-40 font-mono text-sm whitespace-pre text-current">
        {log.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
      <button
        type="button"
        className="mt-3 rounded-md border border-current px-3 py-1.5 text-sm text-current"
        onClick={() => {
          setLog([]);
          setRun(run + 1);
        }}
      >
        Run it again
      </button>
    </>
  );
}
