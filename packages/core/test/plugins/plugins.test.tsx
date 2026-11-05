import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { createPlayer } from "../../src/core/player";
import { fullscreen, Fullscreen } from "../../src/plugins/fullscreen/index";
import { gestures } from "../../src/plugins/gestures/index";
import { idle } from "../../src/plugins/idle/index";
import { pip, Pip } from "../../src/plugins/pip/index";
import { Media } from "../../src/react/media";
import { Controls } from "../../src/react/primitives/controls";
import { Root } from "../../src/react/root";
import { Slot } from "../../src/react/slot";

const settle = async () => {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});

async function mounted(plugins: Parameters<typeof createPlayer>[0]) {
  const player = createPlayer({ src: "/video.mp4", ...plugins });
  const root = document.createElement("div");
  const video = document.createElement("video");
  video.setAttribute("data-part", "media");
  root.append(video);
  document.body.append(root);
  cleanups.push(() => root.remove());
  cleanups.push(player.mount(root));
  cleanups.push(player.attach(video));
  await settle();
  return { player, root, video, media: () => player.getState().media };
}

describe("fullscreen", () => {
  let current: Element | null = null;
  const setCurrent = (element: Element | null) => {
    current = element;
  };

  beforeEach(() => {
    current = null;
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => current,
    });
    document.exitFullscreen = vi.fn(async () => {
      current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    });
    HTMLElement.prototype.requestFullscreen = vi.fn(async function (this: HTMLElement) {
      setCurrent(this);
      document.dispatchEvent(new Event("fullscreenchange"));
    });
  });

  it("enters and exits on the root, reporting state and an attribute", async () => {
    const { player, root } = await mounted({ plugins: [fullscreen()] });
    const handle = player.plugin(fullscreen);
    expect(handle.state().supported).toBe(true);
    await handle.commands.toggle();
    await settle();
    expect(root.requestFullscreen).toHaveBeenCalled();
    expect(handle.state().active).toBe(true);
    expect(player.attributes()["data-fullscreen"]).toBe("");
    await handle.commands.toggle();
    await settle();
    expect(handle.state().active).toBe(false);
  });

  it("tracks exits that the browser performs, like Escape", async () => {
    const { player } = await mounted({ plugins: [fullscreen()] });
    await player.plugin(fullscreen).commands.enter();
    current = null;
    document.dispatchEvent(new Event("fullscreenchange"));
    await settle();
    expect(player.plugin(fullscreen).state().active).toBe(false);
  });

  it("ignores another element going fullscreen", async () => {
    const { player } = await mounted({ plugins: [fullscreen()] });
    current = document.createElement("div");
    document.dispatchEvent(new Event("fullscreenchange"));
    await settle();
    expect(player.plugin(fullscreen).state().active).toBe(false);
  });

  it("falls back to the video element on iPhones", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: undefined });
    const standard = HTMLElement.prototype.requestFullscreen;
    // @ts-expect-error -- iPhones don't have the standard API on elements
    delete HTMLElement.prototype.requestFullscreen;
    const enter = vi.fn();
    Object.assign(HTMLVideoElement.prototype, { webkitEnterFullscreen: enter });
    const { player, video } = await mounted({ plugins: [fullscreen()] });
    const handle = player.plugin(fullscreen);
    expect(handle.state().supported).toBe(true);
    await handle.commands.enter();
    expect(enter).toHaveBeenCalled();
    video.dispatchEvent(new Event("webkitbeginfullscreen"));
    expect(handle.state().active).toBe(true);
    video.dispatchEvent(new Event("webkitendfullscreen"));
    expect(handle.state().active).toBe(false);
    delete (HTMLVideoElement.prototype as { webkitEnterFullscreen?: unknown }).webkitEnterFullscreen;
    HTMLElement.prototype.requestFullscreen = standard;
  });

  it("renders a labelled button only when supported", async () => {
    const plugins = [fullscreen()];
    render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Fullscreen />
      </Root>
    );
    await settle();
    const button = screen.getByRole("button", { name: "Fullscreen" });
    fireEvent.click(button);
    await settle();
    expect(screen.getByRole("button", { name: "Exit fullscreen" }).dataset.state).toBe("active");
  });

  it("hides the button where unsupported", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    const plugins = [fullscreen()];
    render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Fullscreen />
      </Root>
    );
    await settle();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("contributes its button to the controls slot", async () => {
    const plugins = [fullscreen()];
    render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Slot name="controls-end" />
      </Root>
    );
    await settle();
    expect(screen.getByRole("button", { name: "Fullscreen" })).toBeTruthy();
  });

  it("respects a page that has turned fullscreen off, even with the iPhone API", async () => {
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: false });
    Object.assign(HTMLVideoElement.prototype, { webkitEnterFullscreen: vi.fn() });
    const { player } = await mounted({ plugins: [fullscreen()] });
    expect(player.plugin(fullscreen).state().supported).toBe(false);
    delete (HTMLVideoElement.prototype as { webkitEnterFullscreen?: unknown }).webkitEnterFullscreen;
  });

  it("swallows a refusal from the button", async () => {
    HTMLElement.prototype.requestFullscreen = vi.fn(async () => {
      throw new TypeError("Refused");
    });
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const plugins = [fullscreen()];
    render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Fullscreen />
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Fullscreen" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});

describe("pip", () => {
  beforeEach(() => {
    Object.defineProperty(document, "pictureInPictureEnabled", { configurable: true, value: true });
    Object.defineProperty(document, "pictureInPictureElement", { configurable: true, value: null });
    document.exitPictureInPicture = vi.fn(async () => {});
    HTMLVideoElement.prototype.requestPictureInPicture = vi.fn(async function (
      this: HTMLVideoElement
    ) {
      this.dispatchEvent(new Event("enterpictureinpicture"));
      return {} as PictureInPictureWindow;
    });
  });

  it("enters and tracks state from events", async () => {
    const { player, video } = await mounted({ plugins: [pip()] });
    const handle = player.plugin(pip);
    expect(handle.state().supported).toBe(true);
    await handle.commands.toggle();
    expect(video.requestPictureInPicture).toHaveBeenCalled();
    expect(handle.state().active).toBe(true);
    video.dispatchEvent(new Event("leavepictureinpicture"));
    expect(handle.state().active).toBe(false);
  });

  it("respects a video that disables it", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [pip()] });
    const video = document.createElement("video");
    video.disablePictureInPicture = true;
    cleanups.push(player.mount(document.createElement("div")));
    cleanups.push(player.attach(video));
    await settle();
    expect(player.plugin(pip).state().supported).toBe(false);
  });

  it("renders a button only when supported", async () => {
    const plugins = [pip()];
    render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Pip />
      </Root>
    );
    await settle();
    expect(screen.getByRole("button", { name: "Picture in picture" })).toBeTruthy();
  });

  it("respects a video that disables it in Safari too", async () => {
    Object.defineProperty(document, "pictureInPictureEnabled", { configurable: true, value: undefined });
    const player = createPlayer({ src: "/video.mp4", plugins: [pip()] });
    const video = document.createElement("video");
    Object.assign(video, { webkitSupportsPresentationMode: () => true });
    video.disablePictureInPicture = true;
    cleanups.push(player.mount(document.createElement("div")));
    cleanups.push(player.attach(video));
    await settle();
    expect(player.plugin(pip).state().supported).toBe(false);
  });
});

describe("idle", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const playing = async (options = {}) => {
    const view = await mounted({ plugins: [idle(options)] });
    await act(async () => {
      await view.player.commands.play();
    });
    await settle();
    const controls = document.createElement("div");
    controls.setAttribute("data-part", "controls");
    view.root.append(controls);
    return {
      ...view,
      controls,
      visible: () => view.player.plugin(idle).state().visible,
      wait: (ms: number) =>
        act(() => {
          vi.advanceTimersByTime(ms);
        }),
      move: () =>
        view.root.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse" })),
    };
  };

  it("hides after mouse inactivity and returns on movement", async () => {
    const view = await playing();
    view.move();
    view.wait(2999);
    expect(view.visible()).toBe(true);
    view.wait(1);
    expect(view.visible()).toBe(false);
    expect(view.player.attributes()["data-controls"]).toBe("hidden");
    view.move();
    expect(view.visible()).toBe(true);
  });

  it("each movement extends the time, using one timer", async () => {
    const view = await playing();
    view.move();
    const timers = vi.getTimerCount();
    view.wait(2000);
    view.move();
    expect(vi.getTimerCount()).toBe(timers);
    view.wait(2000);
    expect(view.visible()).toBe(true);
    view.wait(1000);
    expect(view.visible()).toBe(false);
  });

  it("hides sooner when the mouse leaves", async () => {
    const view = await playing();
    view.move();
    view.root.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    view.wait(800);
    expect(view.visible()).toBe(false);
  });

  it("stays up while paused, and returns on pause", async () => {
    const view = await playing();
    view.move();
    view.wait(3000);
    expect(view.visible()).toBe(false);
    view.player.commands.pause();
    await settle();
    expect(view.visible()).toBe(true);
    view.wait(10000);
    expect(view.visible()).toBe(true);
  });

  it("stays up while a menu is open", async () => {
    const view = await playing();
    const menu = document.createElement("div");
    menu.setAttribute("data-part", "menu-content");
    menu.setAttribute("data-state", "open");
    view.root.append(menu);
    view.move();
    view.wait(10000);
    expect(view.visible()).toBe(true);
    menu.remove();
    view.wait(3000);
    expect(view.visible()).toBe(false);
  });

  it("reveals on keyboard use", async () => {
    const view = await playing();
    view.move();
    view.wait(3000);
    view.root.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(view.visible()).toBe(true);
  });

  it("toggles on a touch tap, ignoring swipes and taps on the controls", async () => {
    const view = await playing();
    const tap = (target: Element, from = 10, to = 10) => {
      target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch", pointerId: 1, clientX: from }));
      target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType: "touch", pointerId: 1, clientX: to }));
    };
    tap(view.video);
    expect(view.visible()).toBe(false);
    tap(view.video);
    expect(view.visible()).toBe(true);
    view.wait(3999);
    expect(view.visible()).toBe(true);
    view.wait(1);
    expect(view.visible()).toBe(false);
    tap(view.video, 10, 100);
    expect(view.visible()).toBe(true);
    tap(view.controls);
    expect(view.visible()).toBe(true);
  });

  it("stops its timer on unmount", async () => {
    const player = createPlayer({ src: "/video.mp4", plugins: [idle()] });
    const root = document.createElement("div");
    const unmount = player.mount(root);
    root.dispatchEvent(new PointerEvent("pointermove", { pointerType: "mouse" }));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("renders controls that stay mounted while hidden", async () => {
    const plugins = [idle()];
    const { container } = render(
      <Root src="/video.mp4" plugins={plugins}>
        <Media />
        <Controls />
      </Root>
    );
    await settle();
    expect(container.querySelector('[data-part="root"]')?.getAttribute("data-controls")).toBe("shown");
    expect(container.querySelector('[data-part="controls"]')).not.toBeNull();
  });
});

describe("gestures", () => {
  const press = (target: Element, pointerType = "mouse", clientX = 10) => {
    target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType, clientX, button: 0 }));
    target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerType, clientX, button: 0 }));
  };
  const wait = (ms: number) =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms));
    });

  it("toggles play on a mouse click on the video", async () => {
    const view = await mounted({ plugins: [gestures()] });
    press(view.video);
    await wait(10);
    expect(view.video.paused).toBe(false);
    press(view.video);
    await wait(10);
    expect(view.video.paused).toBe(true);
  });

  it("ignores clicks elsewhere in the player", async () => {
    const view = await mounted({ plugins: [gestures()] });
    const other = document.createElement("button");
    view.root.append(other);
    press(other);
    await wait(10);
    expect(view.video.paused).toBe(true);
  });

  it("does not toggle play on a single touch tap", async () => {
    const view = await mounted({ plugins: [gestures()] });
    press(view.video, "touch");
    await wait(10);
    expect(view.video.paused).toBe(true);
  });

  it("seeks by side on a double tap and reports it", async () => {
    const view = await mounted({ plugins: [gestures({ seekStep: 7 })] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    const seen: number[] = [];
    view.player.plugin(gestures).commands.onSeek((direction) => seen.push(direction));
    view.player.commands.seek(20);
    await settle();
    press(view.video, "touch", 80);
    press(view.video, "touch", 80);
    await settle();
    expect(view.video.currentTime).toBe(27);
    await wait(300);
    press(view.video, "touch", 10);
    press(view.video, "touch", 10);
    await settle();
    expect(view.video.currentTime).toBe(20);
    expect(seen).toEqual([1, -1]);
  });

  it("uses a double click for fullscreen rather than flipping play twice", async () => {
    const enter = vi.fn(async () => {});
    HTMLElement.prototype.requestFullscreen = enter;
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    const view = await mounted({ plugins: [fullscreen(), gestures()] });
    press(view.video);
    press(view.video);
    view.video.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await wait(250);
    expect(enter).toHaveBeenCalled();
    expect(view.video.paused).toBe(true);
  });

  it("doesn't also go fullscreen on a double tap", async () => {
    const enter = vi.fn(async () => {});
    HTMLElement.prototype.requestFullscreen = enter;
    Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
    const view = await mounted({ plugins: [fullscreen(), gestures()] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    press(view.video, "touch", 80);
    press(view.video, "touch", 80);
    view.video.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    await wait(10);
    expect(enter).not.toHaveBeenCalled();
    expect(view.video.currentTime).toBe(10);
  });

  it("treats two taps far apart as two taps", async () => {
    const view = await mounted({ plugins: [gestures()] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 400 }) as DOMRect;
    press(view.video, "touch", 20);
    press(view.video, "touch", 300);
    await settle();
    expect(view.video.currentTime).toBe(0);
  });

  it("counts a first tap, even right after loading", async () => {
    const realNow = performance.now;
    performance.now = () => 100;
    const view = await mounted({ plugins: [gestures()] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    const seen = vi.fn();
    view.player.plugin(gestures).commands.onSeek(seen);
    press(view.video, "touch", 10);
    expect(seen).not.toHaveBeenCalled();
    performance.now = realNow;
  });

  it("neither seeks nor shows feedback when seeking isn't possible", async () => {
    let unlock = () => {};
    const locker = definePlugin("locker", () => ({
      setup(context) {
        unlock = context.lock("ad", ["seek"]);
      },
    }));
    const view = await mounted({ plugins: [gestures(), locker()] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    const seen = vi.fn();
    view.player.plugin(gestures).commands.onSeek(seen);
    press(view.video, "touch", 80);
    press(view.video, "touch", 80);
    await settle();
    expect(seen).not.toHaveBeenCalled();
    expect(view.video.currentTime).toBe(0);
    unlock();
  });

  it("reports how far a double tap moved, for feedback", async () => {
    const view = await mounted({ plugins: [gestures({ seekStep: 7 })] });
    view.root.getBoundingClientRect = () => ({ left: 0, width: 100 }) as DOMRect;
    const seen = vi.fn();
    view.player.plugin(gestures).commands.onSeek(seen);
    press(view.video, "touch", 80);
    press(view.video, "touch", 80);
    expect(seen).toHaveBeenCalledWith(1, 7);
  });
});
