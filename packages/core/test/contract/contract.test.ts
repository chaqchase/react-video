import { beforeAll, describe, it } from "vitest";
import { advance } from "../helpers/fake-media";

type Scenario = (
  media: HTMLVideoElement,
  options: {
    src: string;
    broken: string;
    finish: (media: HTMLVideoElement) => Promise<void>;
  }
) => Promise<void>;

declare global {
  var __mediaContract: Record<string, Scenario>;
}

beforeAll(async () => {
  // @ts-expect-error: a plain script with no declarations, shared with the browser run.
  await import("./media-element.contract.js");
});

describe("fake media honours the media element contract", () => {
  const names = [
    "load reports metadata, then data, then readiness",
    "play reports play then playing and clears paused",
    "pause reports pause and sets paused",
    "seeking reports seeking then seeked at the new position",
    "volume and muted report volumechange",
    "playbackRate reports ratechange",
    "playing to the end reports ended and pauses",
    "an unusable source reports error with a code",
    "removing the source does not report error",
  ];

  for (const name of names) {
    it(name, async () => {
      const media = document.createElement("video");
      await globalThis.__mediaContract[name]?.(media, {
        src: "/media/sample.mp4",
        broken: "/media/broken.mp4",
        // The fake has no clock of its own, so the scenario drives it to the end.
        finish: async (element) => advance(element, 1),
      });
    });
  }
});
