// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createPlayer } from "../../src/core/player";
import { definePlugin } from "../../src/core/plugin";
import { Media } from "../../src/react/media";
import { CurrentTime } from "../../src/react/primitives/current-time";
import { PlayPause } from "../../src/react/primitives/play-pause";
import { Root } from "../../src/react/root";

describe("on the server", () => {
  it("runs only pure plugin hooks", () => {
    const setup = vi.fn();
    const attach = vi.fn();
    const spy = definePlugin("spy", () => ({
      state: () => ({ ready: true }),
      commands: () => ({ noop() {} }),
      setup,
      attach,
    }));
    const player = createPlayer({ plugins: [spy()], src: "/a.mp4" });
    expect(player.plugin(spy).state().ready).toBe(true);
    expect(setup).not.toHaveBeenCalled();
    expect(attach).not.toHaveBeenCalled();
  });

  it("renders HTML with no DOM globals", () => {
    expect(typeof document).toBe("undefined");
    const html = renderToString(
      createElement(
        Root,
        { src: "/a.mp4" },
        createElement(Media, { poster: "/poster.jpg" }),
        createElement(PlayPause),
        createElement(CurrentTime)
      )
    );
    expect(html).toContain('data-part="root"');
    expect(html).toContain('data-status="idle"');
    expect(html).toContain('poster="/poster.jpg"');
    expect(html).toContain('aria-label="Play"');
    expect(html).toContain("0:00");
    expect(html).not.toContain("src=");
  });
});
