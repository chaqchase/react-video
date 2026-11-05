import { act, fireEvent, render, screen } from "@testing-library/react";
import { Profiler, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import type { Player } from "../../src/core/types";
import { defaultPlugins } from "../../src/player/default-plugins";
import { VideoPlayer } from "../../src/player/video-player";
import { Media } from "../../src/react/media";
import { BufferingIndicator } from "../../src/react/primitives/buffering";
import { Button } from "../../src/react/primitives/button";
import { ErrorOverlay } from "../../src/react/primitives/error-overlay";
import { PlayOverlay } from "../../src/react/primitives/play-overlay";
import { Menu } from "../../src/react/primitives/menu";
import { MenuContent } from "../../src/react/primitives/menu-content";
import { MenuItem } from "../../src/react/primitives/menu-item";
import { MenuRadioGroup } from "../../src/react/primitives/menu-radio-group";
import { MenuRadioItem } from "../../src/react/primitives/menu-radio-item";
import { MenuSub } from "../../src/react/primitives/menu-sub";
import { MenuTrigger } from "../../src/react/primitives/menu-trigger";
import { Timeline } from "../../src/react/primitives/timeline";
import { Mute } from "../../src/react/primitives/mute";
import { VolumeSlider } from "../../src/react/primitives/volume-slider";
import { SeekButton } from "../../src/react/primitives/seek-button";
import { Root } from "../../src/react/root";
import { Transport } from "../../src/ui/parts/transport";
import { advance } from "../helpers/fake-media";

const flush = async () => {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
};

const getRoot = (container: HTMLElement) =>
  container.querySelector('[data-part="root"]') as HTMLElement;
const getVideo = (container: HTMLElement) =>
  container.querySelector("video") as HTMLVideoElement;

async function setup(children: ReactNode, src: string | null = "/video.mp4") {
  const ref = { current: null as Player | null };
  const view = render(
    <Root src={src} ref={ref as never}>
      <Media />
      {children}
    </Root>
  );
  await flush();
  return {
    ...view,
    player: () => ref.current as Player,
    media: () => (ref.current as Player).getState().media,
    video: getVideo(view.container),
    root: getRoot(view.container),
  };
}

function mockRect(element: Element, left = 0, width = 100) {
  element.getBoundingClientRect = () =>
    ({ left, width, top: 0, height: 20, right: left + width, bottom: 20, x: left, y: 0 }) as DOMRect;
}

describe("Button", () => {
  it("renders a real button by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("merges behaviour onto the child with asChild", () => {
    const part = vi.fn();
    const child = vi.fn();
    const ref = { current: null as HTMLElement | null };
    render(
      <Button asChild aria-label="Go" className="part" onClick={part} ref={ref as never}>
        <a href="#x" className="child" onClick={child}>
          Link
        </a>
      </Button>
    );
    const link = screen.getByRole("link");
    fireEvent.click(link);
    expect(part).toHaveBeenCalledOnce();
    expect(child).toHaveBeenCalledOnce();
    expect(link.className).toBe("part child");
    expect(link.getAttribute("aria-label")).toBe("Go");
    expect(ref.current).toBe(link);
  });
});

describe("Timeline", () => {
  const parts = async () => {
    const view = await setup(<Timeline />);
    const timeline = view.container.querySelector('[data-part="timeline"]') as HTMLElement;
    mockRect(timeline);
    return {
      ...view,
      timeline,
      input: view.container.querySelector("input") as HTMLInputElement,
      fill: () =>
        (view.container.querySelector('[data-part="timeline-fill"]') as HTMLElement).style.transform,
    };
  };
  const pointer = (clientX: number, pointerType = "mouse") => ({
    clientX,
    clientY: 5,
    pointerId: 1,
    pointerType,
    button: 0,
  });

  it("exposes a named range input with readable values", async () => {
    const { input } = await parts();
    expect(input.getAttribute("aria-label")).toBe("Seek");
    expect(input.max).toBe("60");
    expect(input.getAttribute("aria-valuetext")).toContain("of 1:00");
  });

  it("follows playback through the clock", async () => {
    const { player, video, fill } = await parts();
    await act(async () => {
      await player().commands.play();
    });
    await flush();
    act(() => {
      video.currentTime = 30;
    });
    await flush();
    expect(fill()).toBe("scaleX(0.5)");
  });

  it("seeks on click, holds the thumb until settled, and marks scrubbing", async () => {
    const { timeline, video, fill, media } = await parts();
    fireEvent.pointerDown(timeline, pointer(50));
    expect(timeline.hasAttribute("data-dragging")).toBe(true);
    expect(media().scrubbing).toBe(true);
    expect(fill()).toBe("scaleX(0.5)");
    fireEvent.pointerUp(timeline, pointer(50));
    await flush();
    expect(timeline.hasAttribute("data-dragging")).toBe(false);
    expect(media().scrubbing).toBe(false);
    expect(video.currentTime).toBe(30);
  });

  it("runs one seek at a time and ends on the latest position", async () => {
    const { timeline, player } = await parts();
    const seek = vi.spyOn(player().commands, "seek");
    fireEvent.pointerDown(timeline, pointer(10));
    fireEvent.pointerMove(timeline, pointer(20));
    fireEvent.pointerMove(timeline, pointer(30));
    fireEvent.pointerMove(timeline, pointer(40));
    expect(seek).toHaveBeenCalledTimes(1);
    await flush();
    fireEvent.pointerUp(timeline, pointer(40));
    await flush();
    expect(seek.mock.lastCall?.[0]).toBe(24);
    expect(seek.mock.calls.length).toBeLessThan(4);
  });

  it("resumes playback after a drag", async () => {
    const { timeline, player, video, media } = await parts();
    await act(async () => {
      await player().commands.play();
    });
    await flush();
    fireEvent.pointerDown(timeline, pointer(50));
    await flush();
    expect(video.paused).toBe(true);
    expect(media().paused).toBe(false);
    fireEvent.pointerUp(timeline, pointer(50));
    await flush();
    expect(video.paused).toBe(false);
  });

  it("doesn't take a touch until it has moved sideways, and tracks from the grab", async () => {
    const { timeline, video, media } = await parts();
    fireEvent.pointerDown(timeline, pointer(50, "touch"));
    expect(media().scrubbing).toBe(false);
    fireEvent.pointerMove(timeline, pointer(55, "touch"));
    expect(media().scrubbing).toBe(false);
    fireEvent.pointerMove(timeline, pointer(70, "touch"));
    expect(media().scrubbing).toBe(true);
    // The drag started at 0 and has since moved 10% of the track, not to 80%.
    fireEvent.pointerMove(timeline, pointer(80, "touch"));
    fireEvent.pointerUp(timeline, pointer(80, "touch"));
    await flush();
    expect(video.currentTime).toBeCloseTo(6, 5);
  });

  it("seeks to a touch tap's position", async () => {
    const { timeline, video } = await parts();
    fireEvent.pointerDown(timeline, pointer(25, "touch"));
    fireEvent.pointerUp(timeline, pointer(25, "touch"));
    await flush();
    expect(video.currentTime).toBe(15);
  });

  it("leaves the position alone when the browser takes a touch for scrolling", async () => {
    const { timeline, video } = await parts();
    fireEvent.pointerDown(timeline, pointer(50, "touch"));
    fireEvent.pointerCancel(timeline, pointer(50, "touch"));
    await flush();
    expect(video.currentTime).toBe(0);
  });

  it("moves by steps with the keyboard, claiming each key", async () => {
    const { input, video } = await parts();
    // fireEvent returns false when the default was prevented.
    expect(fireEvent.keyDown(input, { key: "ArrowRight" })).toBe(false);
    await flush();
    expect(video.currentTime).toBe(5);
    expect(fireEvent.keyDown(input, { key: "PageUp" })).toBe(false);
    await flush();
    expect(video.currentTime).toBe(35);
    fireEvent.keyDown(input, { key: "ArrowLeft" });
    await flush();
    expect(video.currentTime).toBe(30);
    fireEvent.keyDown(input, { key: "End" });
    await flush();
    expect(video.currentTime).toBe(60);
    fireEvent.keyDown(input, { key: "Home" });
    await flush();
    expect(video.currentTime).toBe(0);
  });

  it("accepts changes from assistive tech through the input", async () => {
    const { input, video } = await parts();
    fireEvent.change(input, { target: { value: "20" } });
    await flush();
    expect(video.currentTime).toBe(20);
  });

  it("shows the time under the pointer", async () => {
    const { timeline, container } = await parts();
    const preview = container.querySelector('[data-part="timeline-preview"]') as HTMLElement;
    fireEvent.pointerMove(timeline, pointer(50));
    expect(preview.hasAttribute("data-visible")).toBe(true);
    expect(preview.textContent).toBe("0:30");
    fireEvent.pointerLeave(timeline, pointer(50));
    expect(preview.hasAttribute("data-visible")).toBe(false);
  });

  it("disables itself when seeking is locked", async () => {
    const locker = definePlugin("locker", () => ({
      setup(context) {
        context.lock("ad", ["seek"]);
      },
    }));
    const { container } = render(
      <Root src="/video.mp4" plugins={[locker()]}>
        <Media />
        <Timeline />
      </Root>
    );
    await flush();
    const timeline = container.querySelector('[data-part="timeline"]') as HTMLElement;
    mockRect(timeline);
    expect(timeline.hasAttribute("data-disabled")).toBe(true);
    expect((container.querySelector("input") as HTMLInputElement).disabled).toBe(true);
    fireEvent.pointerDown(timeline, pointer(50));
    expect(timeline.hasAttribute("data-dragging")).toBe(false);
  });

  it("commits nothing in React during playback or scrubbing", async () => {
    const commits = vi.fn();
    const { container, video } = render(
      <Root src="/video.mp4">
        <Media />
        <Profiler id="timeline" onRender={commits}>
          <Timeline />
        </Profiler>
      </Root>
    ) as unknown as { container: HTMLElement; video: HTMLVideoElement };
    await flush();
    const element = getVideo(container);
    const timeline = container.querySelector('[data-part="timeline"]') as HTMLElement;
    mockRect(timeline);
    commits.mockClear();
    expect(video).toBeUndefined();
    await act(async () => {
      await element.play();
    });
    await flush();
    commits.mockClear();
    for (let tick = 0; tick < 20; tick += 1) {
      await act(async () => {
        advance(element, 0.25);
        await Promise.resolve();
      });
    }
    fireEvent.pointerDown(timeline, pointer(10));
    for (let x = 20; x < 90; x += 10) fireEvent.pointerMove(timeline, pointer(x));
    fireEvent.pointerUp(timeline, pointer(90));
    await flush();
    expect(commits).not.toHaveBeenCalled();
  });
});

describe("SeekButton", () => {
  it("moves by its seconds, and stops at the start", async () => {
    const { video } = await setup(
      <>
        <SeekButton seconds={-10} />
        <SeekButton seconds={10} />
      </>
    );
    const back = screen.getByRole("button", { name: "Back 10 seconds" });
    fireEvent.click(screen.getByRole("button", { name: "Forward 10 seconds" }));
    await flush();
    expect(video.currentTime).toBe(10);
    fireEvent.click(back);
    await flush();
    expect(video.currentTime).toBe(0);
    fireEvent.click(back);
    await flush();
    expect(video.currentTime).toBe(0);
  });

  it("reports its direction, and lets a label be replaced", async () => {
    await setup(<SeekButton seconds={-30} aria-label="Rewind" />);
    const button = screen.getByRole("button", { name: "Rewind" });
    expect(button.getAttribute("data-direction")).toBe("back");
    expect(button.getAttribute("data-part")).toBe("seek-button");
  });

  it("leaves the position alone when a handler prevents it", async () => {
    const { video } = await setup(<SeekButton seconds={10} onClick={(event) => event.preventDefault()} />);
    fireEvent.click(screen.getByRole("button"));
    await flush();
    expect(video.currentTime).toBe(0);
  });

  it("does nothing while seeking is locked", async () => {
    const locker = definePlugin("locker", () => ({
      setup(context) {
        context.lock("ad", ["seek"]);
      },
    }));
    const { container } = render(
      <Root src="/video.mp4" plugins={[locker()]}>
        <Media />
        <SeekButton seconds={10} />
      </Root>
    );
    await flush();
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    await flush();
    expect(getVideo(container).currentTime).toBe(0);
  });
});

describe("Transport", () => {
  it("puts play between back and forward, and takes the distance as a prop", async () => {
    const { container } = await setup(<Transport seekSeconds={15} />);
    const parts = [...container.querySelectorAll('[data-part="transport"] > button')].map((button) =>
      button.getAttribute("aria-label")
    );
    expect(parts).toEqual(["Back 15 seconds", "Play", "Forward 15 seconds"]);
  });
});

describe("volume", () => {
  it("tells the skin the level, which reads as zero while muted", async () => {
    const { container, player } = await setup(<Mute />);
    const button = container.querySelector('[data-part="mute"]') as HTMLElement;
    expect(button.style.getPropertyValue("--rv-volume")).toBe("1");
    act(() => player().commands.setVolume(0.25));
    await flush();
    expect(button.style.getPropertyValue("--rv-volume")).toBe("0.25");
    act(() => player().commands.setMuted(true));
    await flush();
    expect(button.style.getPropertyValue("--rv-volume")).toBe("0");
    expect(button.dataset.level).toBe("muted");
  });

  it("names the mute button by what it will do, and reports a level", async () => {
    const { container, player } = await setup(<Mute />);
    const button = container.querySelector('[data-part="mute"]') as HTMLElement;
    expect(button.getAttribute("aria-label")).toBe("Mute");
    expect(button.dataset.level).toBe("high");
    act(() => player().commands.setVolume(0.2));
    await flush();
    expect(button.dataset.level).toBe("low");
    fireEvent.click(button);
    await flush();
    expect(button.getAttribute("aria-label")).toBe("Unmute");
    expect(button.dataset.level).toBe("muted");
  });

  it("restores a usable volume when unmuting from zero", async () => {
    const { container, player, video } = await setup(<Mute />);
    act(() => player().commands.setVolume(0));
    await flush();
    fireEvent.click(container.querySelector('[data-part="mute"]') as HTMLElement);
    await flush();
    expect(video.volume).toBe(0.5);
    expect(video.muted).toBe(false);
  });

  it("sets volume from the slider and mutes at zero", async () => {
    const { container, video } = await setup(<VolumeSlider />);
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-valuetext")).toBe("100%");
    fireEvent.change(input, { target: { value: "0.3" } });
    await flush();
    expect(video.volume).toBe(0.3);
    expect(input.getAttribute("aria-valuetext")).toBe("30%");
    fireEvent.change(input, { target: { value: "0" } });
    await flush();
    expect(video.muted).toBe(true);
  });

  it("drags with the pointer", async () => {
    const { container, video } = await setup(<VolumeSlider />);
    const slider = container.querySelector('[data-part="volume-slider"]') as HTMLElement;
    mockRect(slider);
    fireEvent.pointerDown(slider, { clientX: 40, pointerId: 1, pointerType: "mouse", button: 0 });
    await flush();
    expect(video.volume).toBeCloseTo(0.4, 5);
  });

  it("hides the slider where the platform owns volume", async () => {
    const volume = Object.getOwnPropertyDescriptor(window.HTMLMediaElement.prototype, "volume");
    Object.defineProperty(window.HTMLMediaElement.prototype, "volume", {
      configurable: true,
      get: () => 1,
      set: () => {},
    });
    const { container } = await setup(<VolumeSlider />);
    expect(container.querySelector('[data-part="volume-slider"]')).toBeNull();
    Object.defineProperty(window.HTMLMediaElement.prototype, "volume", volume as PropertyDescriptor);
  });
});

describe("BufferingIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const parts = async () => {
    const view = await setup(<BufferingIndicator />);
    return {
      ...view,
      indicator: view.container.querySelector('[data-part="buffering"]') as HTMLElement,
      visible() {
        return this.indicator.hasAttribute("data-visible");
      },
    };
  };
  const stall = async (video: HTMLVideoElement, type: string) => {
    await act(async () => {
      video.dispatchEvent(new Event(type));
      await Promise.resolve();
    });
  };

  it("ignores stalls shorter than the delay", async () => {
    const view = await parts();
    await stall(view.video, "waiting");
    act(() => {
      vi.advanceTimersByTime(300);
    });
    await stall(view.video, "playing");
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(view.visible()).toBe(false);
  });

  it("shows after the delay and stays for a minimum time", async () => {
    const view = await parts();
    await stall(view.video, "waiting");
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(view.visible()).toBe(true);
    await stall(view.video, "playing");
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(view.visible()).toBe(true);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(view.visible()).toBe(false);
  });
});

describe("overlays", () => {
  it("play overlay names its action and leaves the tab order once started", async () => {
    const { container, player } = await setup(<PlayOverlay />);
    const button = container.querySelector('[data-part="play-overlay"]') as HTMLElement;
    expect(button.getAttribute("aria-label")).toBe("Play");
    expect(button.dataset.state).toBe("ready");
    await act(async () => {
      await player().commands.play();
    });
    await flush();
    expect(button.dataset.state).toBe("started");
    expect(button.tabIndex).toBe(-1);
  });

  it("explains a failure and retries, if that could work", async () => {
    const { container, video, player } = await setup(<ErrorOverlay />);
    Object.defineProperty(video, "error", { configurable: true, value: { code: 2, message: "Dropped" } });
    video.dispatchEvent(new Event("error"));
    Reflect.deleteProperty(video, "error");
    await flush();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("This video didn't load.");
    expect(player().getState().media.error?.code).toBe("media-network");
    const load = vi.spyOn(video, "load");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await flush();
    expect(load).toHaveBeenCalled();
    expect(container.querySelector("video")).toBe(video);
  });
});

describe("Menu", () => {
  const Example = ({ onSelect }: { onSelect?: () => void }) => (
    <Menu>
      <MenuTrigger aria-label="Settings">Open</MenuTrigger>
      <MenuContent>
        <MenuItem onSelect={onSelect}>Alpha</MenuItem>
        <MenuItem disabled>Disabled</MenuItem>
        <MenuSub title="Speed" value="1x">
          <MenuRadioGroup value="1" onValueChange={onSelect ?? (() => {})}>
            <MenuRadioItem value="0.5">Slow</MenuRadioItem>
            <MenuRadioItem value="1">Normal</MenuRadioItem>
          </MenuRadioGroup>
        </MenuSub>
        <MenuItem>Beta</MenuItem>
      </MenuContent>
    </Menu>
  );
  const open = async (onSelect?: () => void) => {
    render(
      <Root>
        <Example onSelect={onSelect} />
      </Root>
    );
    const trigger = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(trigger);
    await flush();
    return trigger;
  };
  const focused = () => document.activeElement?.textContent;
  const press = (key: string) => fireEvent.keyDown(document.activeElement as Element, { key });

  it("wires the trigger and focuses the first item", async () => {
    const trigger = await open();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getAllByRole("menu", { hidden: true }).length).toBeGreaterThan(0);
    expect(focused()).toBe("Alpha");
  });

  it("moves with arrows, wraps, skips disabled items, and supports Home and End", async () => {
    await open();
    press("ArrowDown");
    expect(focused()).toContain("Speed");
    press("ArrowDown");
    expect(focused()).toBe("Beta");
    press("ArrowDown");
    expect(focused()).toBe("Alpha");
    press("ArrowUp");
    expect(focused()).toBe("Beta");
    press("Home");
    expect(focused()).toBe("Alpha");
    press("End");
    expect(focused()).toBe("Beta");
  });

  it("finds items by typing", async () => {
    await open();
    press("b");
    expect(focused()).toBe("Beta");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const trigger = await open();
    press("Escape");
    await flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it("selects and closes", async () => {
    const select = vi.fn();
    const trigger = await open(select);
    press("Enter");
    await flush();
    expect(select).toHaveBeenCalledOnce();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("drills into a submenu, focusing the checked item, and comes back", async () => {
    await open();
    press("ArrowDown");
    press("ArrowRight");
    await flush();
    expect(focused()).toBe("Normal");
    expect(document.activeElement?.getAttribute("aria-checked")).toBe("true");
    press("Escape");
    await flush();
    expect(focused()).toContain("Speed");
    expect(screen.getByRole("button", { name: "Settings" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("goes back after choosing a radio item", async () => {
    const select = vi.fn();
    await open(select);
    press("ArrowDown");
    press("Enter");
    await flush();
    press("ArrowUp");
    expect(focused()).toBe("Slow");
    press("Enter");
    await flush();
    expect(select).toHaveBeenCalledWith("0.5");
    expect(focused()).toContain("Speed");
  });

  it("closes on an outside press without taking focus", async () => {
    const trigger = await open();
    fireEvent.pointerDown(document.body);
    await flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).not.toBe(trigger);
  });

  it("removes the content after the exit transition", async () => {
    await open();
    press("Escape");
    await flush();
    expect(document.querySelector('[data-part="menu-content"]')?.getAttribute("data-state")).toBe("closed");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 220));
    });
    expect(document.querySelector('[data-part="menu-content"]')).toBeNull();
  });
});

describe("VideoPlayer", () => {
  it("shows the time left as soon as the duration is known, before playback", async () => {
    const { container } = render(<VideoPlayer src="/video.mp4" plugins={[]} />);
    await flush();
    expect(getVideo(container).paused).toBe(true);
    expect(container.querySelector('[data-part="remaining-time"]')?.textContent).toBe("−1:00");
  });

  it("puts the track on a row of its own, with no pill around it", async () => {
    const { container } = render(<VideoPlayer src="/video.mp4" plugins={[]} />);
    await flush();
    const row = container.querySelector('[data-position="scrubber"]') as HTMLElement;
    expect(row.querySelector(':scope > [data-part="timeline"]')).not.toBeNull();
    expect(container.querySelector('[data-part="control-group"] [data-part="timeline"]')).toBeNull();
  });

  it("renders a complete, working player", async () => {
    const { container } = render(<VideoPlayer src="/video.mp4" poster="/poster.jpg" plugins={defaultPlugins()} />);
    await flush();
    expect(getRoot(container).className).toContain("rv-root");
    expect(getRoot(container).dataset.controls).toBe("shown");
    expect(getVideo(container).getAttribute("poster")).toBe("/poster.jpg");
    for (const part of ["timeline", "play-pause", "seek-button", "mute", "current-time", "remaining-time", "play-overlay", "buffering"]) {
      expect(container.querySelector(`[data-part="${part}"]`), part).not.toBeNull();
    }
    expect(container.querySelector('[data-part="seek-feedback"]')).not.toBeNull();
  });

  it("shows a title and eyebrow only when they're given", async () => {
    const { container, rerender } = render(<VideoPlayer src="/video.mp4" plugins={[]} />);
    await flush();
    expect(container.querySelector('[data-part="title"]')).toBeNull();
    rerender(<VideoPlayer src="/video.mp4" plugins={[]} title="Blue Moon" eyebrow="Trailer" />);
    await flush();
    expect(container.querySelector('[data-part="title-text"]')?.textContent).toBe("Blue Moon");
    expect(container.querySelector('[data-part="title-eyebrow"]')?.textContent).toBe("Trailer");
    expect(getRoot(container).hasAttribute("title")).toBe(false);
  });

  it("keeps the given plugins only", async () => {
    const { container } = render(<VideoPlayer src="/video.mp4" plugins={[]} />);
    await flush();
    expect(getRoot(container).hasAttribute("data-controls")).toBe(false);
    expect(container.querySelector('[data-part="seek-feedback"]')).toBeNull();
  });
});
