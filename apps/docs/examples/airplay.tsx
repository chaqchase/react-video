"use client";

import { useEffect, useRef, useState } from "react";
import { airplay } from "react-video-kit/airplay";
import type { Player } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";

const plugins = [airplay()];

export default function AirPlay() {
  const player = useRef<Player>(null);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const current = player.current;
    if (!current) return;
    return current.subscribe(() => setFound(current.plugin(airplay).state().available));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <VideoPlayer ref={player} src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />
      <div className="flex flex-col gap-1 text-sm text-current opacity-80">
        <p>
          The AirPlay button joins the controls once Safari reports a device it can send to. To see it,
          you need Safari and an AirPlay device nearby. Other browsers never show it.
        </p>
        <p>AirPlay device found: {found ? "yes" : "no"}</p>
      </div>
    </div>
  );
}
