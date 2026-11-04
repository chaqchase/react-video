"use client";

import * as Video from "react-video-kit";

export default function Home() {
  return (
    <main>
      <Video.Root>
        <Video.PlayPause />
      </Video.Root>
    </main>
  );
}
