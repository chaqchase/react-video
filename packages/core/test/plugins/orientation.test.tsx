import { act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import type { MediaState } from "../../src/core/types";
import { orientation } from "../../src/plugins/orientation/index";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
  document.body.replaceChildren();
});

let report: (state: Partial<MediaState>) => void = () => {};
const reporter = definePlugin("reporter", () => ({
  setup(context) {
    report = (state) => context.report(state);
  },
}));

async function mounted(options: Parameters<typeof orientation>[0] = {}) {
  const player = createPlayer({ src: "/video.mp4", plugins: [orientation(options), reporter()] });
  const root = document.createElement("div");
  const video = document.createElement("video");
  root.append(video);
  document.body.append(root);
  cleanups.push(() => root.remove());
  cleanups.push(player.mount(root));
  cleanups.push(player.attach(video));
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
  return { player, root, video };
}

const size = (video: HTMLVideoElement, width: number, height: number, event = "loadedmetadata") => {
  Object.defineProperty(video, "videoWidth", { configurable: true, value: width });
  Object.defineProperty(video, "videoHeight", { configurable: true, value: height });
  video.dispatchEvent(new Event(event));
};

describe("orientation", () => {
  it("knows nothing before the video does, and renders no attribute", async () => {
    const { player, root } = await mounted();
    expect(player.plugin(orientation).state()).toEqual({ orientation: null, ratio: null });
    expect(player.attributes()["data-orientation"]).toBeFalsy();
    expect(root.style.getPropertyValue("--rv-aspect")).toBe("");
  });

  it.each([
    [1080, 1920, "portrait"],
    [1080, 1350, "portrait"],
    [1920, 1080, "landscape"],
    [1440, 1080, "landscape"],
    [1080, 1080, "square"],
    [1080, 1100, "square"],
  ])("reads %i by %i as %s", async (width, height, expected) => {
    const { player, root, video } = await mounted();
    size(video, width, height);
    expect(player.plugin(orientation).state().orientation).toBe(expected);
    expect(player.plugin(orientation).state().ratio).toBeCloseTo(width / height);
    expect(player.attributes()["data-orientation"]).toBe(expected);
    expect(root.style.getPropertyValue("--rv-aspect")).toBe(`${width} / ${height}`);
  });

  it("starts from the shape it's told, on the server's render too, until the real one arrives", async () => {
    const server = createPlayer({ src: "/video.mp4", plugins: [orientation({ initial: "portrait" })] });
    expect(server.attributes()["data-orientation"]).toBe("portrait");

    const { player, video } = await mounted({ initial: "portrait" });
    expect(player.attributes()["data-orientation"]).toBe("portrait");
    size(video, 1920, 1080);
    expect(player.attributes()["data-orientation"]).toBe("landscape");
  });

  it("reports the shape without changing the player's when resizing is off", async () => {
    const { player, root, video } = await mounted({ resize: false });
    size(video, 1080, 1920);
    expect(player.attributes()["data-orientation"]).toBe("portrait");
    expect(root.style.getPropertyValue("--rv-aspect")).toBe("");
  });

  it("follows the video when its size changes, and picks up a size it already has", async () => {
    const { player, root, video } = await mounted();
    size(video, 1080, 1920);
    size(video, 1920, 1080, "resize");
    expect(player.attributes()["data-orientation"]).toBe("landscape");
    expect(root.style.getPropertyValue("--rv-aspect")).toBe("1920 / 1080");
  });

  it("ignores a size of zero, which is what a video has between sources", async () => {
    const { player, root, video } = await mounted();
    size(video, 1080, 1920);
    size(video, 0, 0);
    expect(player.attributes()["data-orientation"]).toBe("portrait");
    expect(root.style.getPropertyValue("--rv-aspect")).toBe("1080 / 1920");
  });

  it("doesn't reshape the player around an ad on the shared element", async () => {
    const { player, root, video } = await mounted();
    size(video, 1080, 1920);
    report({ timeline: { start: 0, end: 15, kind: "ad" } });
    size(video, 1920, 1080, "resize");
    expect(player.attributes()["data-orientation"]).toBe("portrait");
    expect(root.style.getPropertyValue("--rv-aspect")).toBe("1080 / 1920");
  });
});
