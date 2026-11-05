"use client";

import { useEffect, useRef, useState } from "react";
import { chromecast } from "react-video-kit/chromecast";
import type { Player } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [chromecast({ title: "First light" })];

export default function Chromecast() {
  const player = useRef<Player>(null);
  const [status, setStatus] = useState("no device found");

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    return current.subscribe(() => {
      const { available, active, device } = current.plugin(chromecast).state();
      setStatus(active ? `casting to ${device ?? "a device"}` : available ? "device found" : "no device found");
    });
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer ref={player} src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <div className="flex flex-col gap-1 text-sm text-current opacity-80">
        <p>
          The Cast button joins the controls once the Cast SDK reports a device. To see it, you need a
          browser the SDK supports, such as Chrome, and a Cast device on the same network. This hasn&apos;t
          been run on a real device yet.
        </p>
        <p>Cast status: {status}</p>
      </div>
    </div>
  );
}
