"use client";

import { useCommands, useVideoState } from "react-video-kit";
import { definePlugin } from "react-video-kit/core";
import { VideoPlayer } from "react-video-kit/player";

interface SkipIntroOptions {
  /** Where the intro starts, in seconds. */
  start: number;
  /** Where the intro ends, and where the button seeks to. */
  end: number;
}

/** A button that shows during the intro, and a command that jumps past it. */
const skipIntro = definePlugin("skip-intro", ({ start, end }: SkipIntroOptions) => ({
  state: () => ({ inIntro: false }),
  commands: (context) => ({
    skip: () => context.commands.seek(end),
  }),
  setup(context, scope) {
    const check = (time: number) => context.set({ inIntro: time >= start && time < end });
    scope.add(context.clock.bind(check, () => 0.25));
  },
  slots: { overlay: SkipIntroButton },
}));

function SkipIntroButton() {
  const visible = useVideoState(skipIntro, (state, media) => state.inIntro && media.started);
  const { skip } = useCommands(skipIntro);
  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => skip()}
      className="absolute right-4 bottom-24 z-10 rounded-lg bg-black/75 px-4 py-2 text-sm font-medium text-white"
    >
      Skip intro
    </button>
  );
}

const plugins = [skipIntro({ start: 2, end: 12 })];

export default function CustomPlugin() {
  return <VideoPlayer src="/media/sample-720.mp4" poster="/media/poster.jpg" plugins={plugins} load="visible" />;
}
