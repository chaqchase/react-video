import { afterEach, describe, expect, it, vi } from "vitest";
import { createClock } from "../../src/core/clock";
import { sortPlugins, definePlugin } from "../../src/core/plugin";
import { createScope } from "../../src/core/scope";
import { sourceKey, toLoadRequests } from "../../src/core/source";
import { createStore } from "../../src/core/store";
import { formatTime } from "../../src/lib/format-time";

describe("scope", () => {
  it("runs cleanups in reverse order, once", () => {
    const order: number[] = [];
    const scope = createScope();
    scope.add(() => order.push(1));
    scope.add(() => order.push(2));
    scope.dispose();
    scope.dispose();
    expect(order).toEqual([2, 1]);
    expect(scope.signal.aborted).toBe(true);
  });

  it("runs a cleanup immediately once disposed", () => {
    const scope = createScope();
    scope.dispose();
    const cleanup = vi.fn();
    scope.add(cleanup);
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("still runs other cleanups when one throws", () => {
    const scope = createScope();
    const earlier = vi.fn();
    scope.add(earlier);
    scope.add(() => {
      throw new Error("boom");
    });
    expect(() => scope.dispose()).toThrow("boom");
    expect(earlier).toHaveBeenCalledOnce();
  });

  it("removes event listeners", () => {
    const target = new EventTarget();
    const listener = vi.fn();
    const scope = createScope();
    scope.on(target, "x", listener);
    target.dispatchEvent(new Event("x"));
    scope.dispose();
    target.dispatchEvent(new Event("x"));
    expect(listener).toHaveBeenCalledOnce();
  });
});

describe("store", () => {
  const make = () => createStore({ a: { x: 1, y: 2 } as { x: number; y: number } });

  it("reads the latest value before listeners run", () => {
    const store = make();
    store.set("a", { x: 5 });
    expect(store.get().a.x).toBe(5);
  });

  it("coalesces notifications per microtask", async () => {
    const store = make();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set("a", { x: 2 });
    store.set("a", { x: 3 });
    store.set("a", { y: 9 });
    expect(listener).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(listener).toHaveBeenCalledOnce();
  });

  it("does nothing when values are unchanged", async () => {
    const store = make();
    const before = store.get();
    const listener = vi.fn();
    store.subscribe(listener);
    store.set("a", { x: 1 });
    await Promise.resolve();
    expect(store.get()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps initial state for hydration", () => {
    const store = make();
    store.set("a", { x: 5 });
    expect(store.getInitial().a.x).toBe(1);
  });
});

describe("clock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"],
    });
    let now = 0;
    const clock = createClock();
    clock.setSource({ time: () => now, rate: () => 1 });
    return { clock, move: (value: number) => (now = value) };
  };

  it("writes immediately on bind, then only after the resolution elapses", () => {
    const { clock, move } = setup();
    const write = vi.fn();
    clock.bind(write, () => 1);
    expect(write).toHaveBeenCalledTimes(1);
    clock.setRunning(true);
    move(0.5);
    vi.advanceTimersByTime(500);
    expect(write).toHaveBeenCalledTimes(1);
    move(1.1);
    vi.advanceTimersByTime(1000);
    expect(write).toHaveBeenLastCalledWith(1.1);
    clock.dispose();
  });

  it("does nothing while stopped, and schedules nothing", () => {
    const { clock, move } = setup();
    const write = vi.fn();
    clock.bind(write, () => 0.25);
    write.mockClear();
    move(100);
    vi.advanceTimersByTime(5000);
    expect(write).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    clock.dispose();
  });

  it("sleeps through long resolutions instead of waking every frame", () => {
    const { clock } = setup();
    clock.bind(() => {}, () => 8);
    clock.setRunning(true);
    // A timer is pending, with no animation frame requested each tick.
    expect(vi.getTimerCount()).toBe(1);
    clock.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sync writes every binding regardless of resolution", () => {
    const { clock, move } = setup();
    const write = vi.fn();
    clock.bind(write, () => 100);
    write.mockClear();
    move(3);
    clock.sync();
    expect(write).toHaveBeenCalledWith(3);
    clock.dispose();
  });

  it("stops when the last binding unbinds", () => {
    const { clock } = setup();
    const unbind = clock.bind(() => {}, () => 1);
    clock.setRunning(true);
    unbind();
    expect(vi.getTimerCount()).toBe(0);
    clock.dispose();
  });
});

describe("plugin ordering", () => {
  const plugin = (name: string, spec: { requires?: string[]; after?: string[] } = {}) =>
    definePlugin(name, () => spec)();
  const names = (list: { name: string }[]) => list.map(({ name }) => name);

  it("keeps the given order without dependencies", () => {
    expect(names(sortPlugins([plugin("a"), plugin("b")]))).toEqual(["a", "b"]);
  });

  it("runs required plugins first", () => {
    expect(names(sortPlugins([plugin("a", { requires: ["b"] }), plugin("b")]))).toEqual(["b", "a"]);
  });

  it("honours soft ordering only when the other plugin is present", () => {
    expect(names(sortPlugins([plugin("a", { after: ["b"] }), plugin("b")]))).toEqual(["b", "a"]);
    expect(names(sortPlugins([plugin("a", { after: ["missing"] })]))).toEqual(["a"]);
  });

  it("rejects missing requirements, duplicates, and cycles with clear errors", () => {
    expect(() => sortPlugins([plugin("a", { requires: ["b"] })])).toThrow(/requires "b"/);
    expect(() => sortPlugins([plugin("a"), plugin("a")])).toThrow(/installed twice/);
    expect(() =>
      sortPlugins([plugin("a", { requires: ["b"] }), plugin("b", { requires: ["a"] })])
    ).toThrow(/cycle: a -> b -> a/);
  });
});

describe("sources", () => {
  it("normalizes every accepted shape", () => {
    expect(toLoadRequests("a.mp4")).toEqual([{ source: { src: "a.mp4" } }]);
    expect(toLoadRequests({ src: "a.mp4", type: "video/mp4" })).toEqual([
      { source: { src: "a.mp4", type: "video/mp4" } },
    ]);
    expect(toLoadRequests([{ src: "a" }, { src: "b" }]).map((r) => r.source.src)).toEqual(["a", "b"]);
    expect(toLoadRequests(null)).toEqual([]);
    expect(toLoadRequests("")).toEqual([]);
  });

  it("starts renditions on the requested index", () => {
    const [request] = toLoadRequests({
      renditions: [{ src: "low" }, { src: "high" }],
      initial: 1,
    });
    expect(request?.source.src).toBe("high");
    expect(request?.initialRendition).toBe(1);
  });

  it("treats equal values as the same source", () => {
    expect(sourceKey([{ src: "a" }])).toBe(sourceKey([{ src: "a" }]));
    expect(sourceKey("a")).not.toBe(sourceKey("b"));
  });
});

describe("formatTime", () => {
  it("formats minutes and hours", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3661)).toBe("1:01:01");
  });

  it("uses hours for short times in long videos", () => {
    expect(formatTime(65, 7200)).toBe("0:01:05");
  });

  it("handles unusable values", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(-5)).toBe("0:00");
  });
});
