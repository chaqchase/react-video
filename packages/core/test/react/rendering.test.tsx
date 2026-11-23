import { act, render, screen } from "@testing-library/react";
import { Profiler, StrictMode, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { definePlugin } from "../../src/core/plugin";
import { useCommands, useCurrentTime, useVideoState } from "../../src/react/hooks";
import { Media } from "../../src/react/media";
import { CurrentTime } from "../../src/react/primitives/current-time";
import { PlayPause } from "../../src/react/primitives/play-pause";
import { Root } from "../../src/react/root";
import { Slot } from "../../src/react/slot";
import { advance } from "../helpers/fake-media";

const flush = async () => {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
};

const getVideo = (container: HTMLElement) =>
  container.querySelector("video") as HTMLVideoElement;
const getRoot = (container: HTMLElement) =>
  container.querySelector('[data-part="root"]') as HTMLElement;

describe("rendering during playback", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("10 seconds of playback commits nothing, while time still updates", async () => {
    const commits: Record<string, number> = {};
    const count = (id: string) => {
      commits[id] = (commits[id] ?? 0) + 1;
    };

    const { container } = render(
      <Root src="/video.mp4">
        <Media />
        <Profiler id="play-pause" onRender={count}>
          <PlayPause />
        </Profiler>
        <Profiler id="time" onRender={count}>
          <CurrentTime />
        </Profiler>
      </Root>
    );
    await flush();

    await act(async () => {
      screen.getByRole("button").click();
    });
    await flush();

    for (const key of Object.keys(commits)) delete commits[key];

    const video = getVideo(container);
    for (let tick = 0; tick < 40; tick += 1) {
      await act(async () => {
        advance(video, 0.25);
        vi.advanceTimersByTime(250);
        await Promise.resolve();
      });
    }

    expect(commits).toEqual({});
    expect(container.querySelector('[data-part="current-time"]')?.textContent).toBe("0:10");
  });

  it("useCurrentTime renders at most once per second", async () => {
    let renders = 0;
    function Text() {
      renders += 1;
      return <span>{useCurrentTime()}</span>;
    }
    const { container } = render(
      <Root src="/video.mp4">
        <Media />
        <PlayPause />
        <Text />
      </Root>
    );
    await flush();
    await act(async () => {
      screen.getByRole("button").click();
    });
    await flush();
    renders = 0;

    const video = getVideo(container);
    for (let tick = 0; tick < 40; tick += 1) {
      await act(async () => {
        advance(video, 0.25);
        vi.advanceTimersByTime(250);
        await Promise.resolve();
      });
    }
    expect(renders).toBeLessThanOrEqual(10);
    expect(renders).toBeGreaterThan(0);
  });
});

describe("Root", () => {
  it("writes state attributes without rendering its children", async () => {
    let renders = 0;
    function Child() {
      renders += 1;
      return null;
    }
    const { container } = render(
      <Root src="/video.mp4">
        <Media />
        <Child />
        <PlayPause />
      </Root>
    );
    await flush();
    const root = getRoot(container);
    expect(root.dataset.status).toBe("ready");
    expect(root.hasAttribute("data-paused")).toBe(true);
    const before = renders;

    await act(async () => {
      screen.getByRole("button").click();
    });
    await flush();
    expect(root.hasAttribute("data-playing")).toBe(true);
    expect(root.hasAttribute("data-paused")).toBe(false);
    expect(renders).toBe(before);
  });

  it("loads once under StrictMode", async () => {
    const load = vi.spyOn(window.HTMLMediaElement.prototype, "load");
    const { container } = render(
      <StrictMode>
        <Root src="/video.mp4">
          <Media />
        </Root>
      </StrictMode>
    );
    await flush();
    expect(getVideo(container).src).toBe("/video.mp4");
    expect(getRoot(container).dataset.status).toBe("ready");
    const withSource = load.mock.contexts.filter(
      (element) => (element as HTMLVideoElement).src !== ""
    );
    expect(withSource.length).toBe(1);
    load.mockRestore();
  });

  it("reloads when src changes, and not when an equal src re-renders", async () => {
    const load = vi.spyOn(window.HTMLMediaElement.prototype, "load");
    let setSrc: (value: { src: string }[]) => void = () => {};
    function App() {
      const [src, set] = useState([{ src: "/a.mp4" }]);
      setSrc = set;
      return (
        <Root src={src}>
          <Media />
        </Root>
      );
    }
    const { container } = render(<App />);
    await flush();
    load.mockClear();

    await act(async () => setSrc([{ src: "/a.mp4" }]));
    await flush();
    expect(load).not.toHaveBeenCalled();

    await act(async () => setSrc([{ src: "/b.mp4" }]));
    await flush();
    expect(getVideo(container).src).toBe("/b.mp4");
    load.mockRestore();
  });

  it("exposes the player through ref", async () => {
    const ref = { current: null as null | { commands: { play: () => unknown } } };
    render(
      <Root src="/video.mp4" ref={ref as never}>
        <Media />
      </Root>
    );
    await flush();
    expect(typeof ref.current?.commands.play).toBe("function");
  });

  it("detaches when Media unmounts, on every React version", async () => {
    const pause = vi.spyOn(window.HTMLMediaElement.prototype, "pause");
    function App({ show }: { show: boolean }) {
      return <Root src="/video.mp4">{show ? <Media /> : null}</Root>;
    }
    const { rerender, container } = render(<App show />);
    await flush();
    const video = getVideo(container);
    rerender(<App show={false} />);
    await flush();
    expect(pause).toHaveBeenCalled();
    expect(video.src).toBe("");
    pause.mockRestore();
  });

  it("throws a clear error for a part outside Root", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PlayPause />)).toThrow(/inside <Video.Root>/);
    error.mockRestore();
  });
});

describe("hooks", () => {
  const counter = definePlugin("counter", () => ({
    state: () => ({ count: 0, other: 0 }),
    commands: (context) => ({
      increment: () => context.set({ count: context.state().count + 1 }),
      bumpOther: () => context.set({ other: context.state().other + 1 }),
    }),
  }));
  const plugins = [counter()];

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Root plugins={plugins}>{children}</Root>
  );

  it("re-renders only when the selected value changes", async () => {
    let renders = 0;
    function Count() {
      renders += 1;
      const count = useVideoState(counter, (state) => state.count);
      const { increment, bumpOther } = useCommands(counter);
      return (
        <>
          <output>{count}</output>
          <button onClick={increment}>inc</button>
          <button onClick={bumpOther}>other</button>
        </>
      );
    }
    render(<Count />, { wrapper: Wrapper });
    await flush();
    const before = renders;

    await act(async () => screen.getByText("other").click());
    await flush();
    expect(renders).toBe(before);

    await act(async () => screen.getByText("inc").click());
    await flush();
    expect(renders).toBe(before + 1);
    expect(screen.getByRole("status").textContent).toBe("1");
  });

  it("throws a helpful error for an uninstalled plugin", () => {
    const missing = definePlugin("missing", () => ({
      state: () => ({ value: 1 }),
    }));
    function Bad() {
      useVideoState(missing, (state) => state.value);
      return null;
    }
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bad />, { wrapper: Wrapper })).toThrow(/Add missing\(\)/);
    error.mockRestore();
  });

  it("renders contributions to a slot", async () => {
    const withSlot = definePlugin("with-slot", () => ({
      slots: { overlay: () => <span>from plugin</span> },
    }));
    render(
      <Root plugins={[withSlot()]}>
        <Slot name="overlay" />
        <Slot name="unknown" />
      </Root>
    );
    await flush();
    expect(screen.getByText("from plugin")).toBeTruthy();
  });
});
