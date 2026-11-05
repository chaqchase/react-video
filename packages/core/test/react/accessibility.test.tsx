import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlayer } from "../../src/core/player";
import { VideoPlayer } from "../../src/player/video-player";
import { autoplay, UnmuteChip } from "../../src/plugins/autoplay/index";
import { i18n } from "../../src/plugins/i18n/index";
import { playlist, UpNext } from "../../src/plugins/playlist/index";
import { skip, SkipButton } from "../../src/plugins/skip/index";
import { Media } from "../../src/react/media";
import { BufferingIndicator } from "../../src/react/primitives/buffering";
import { Menu } from "../../src/react/primitives/menu";
import { MenuContent } from "../../src/react/primitives/menu-content";
import { MenuItem } from "../../src/react/primitives/menu-item";
import { MenuSub } from "../../src/react/primitives/menu-sub";
import { MenuTrigger } from "../../src/react/primitives/menu-trigger";
import { Panel } from "../../src/react/primitives/panel";
import { PlayOverlay } from "../../src/react/primitives/play-overlay";
import { PlayPause } from "../../src/react/primitives/play-pause";
import { Root } from "../../src/react/root";
import { advance, fakeBehaviour, resetFakeBehaviour } from "../helpers/fake-media";

const settle = async () => {
  await act(async () => {
    for (let index = 0; index < 20; index += 1) await Promise.resolve();
  });
};

const regionIn = (root: Element) => root.querySelector('[data-part="announcer"]');

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  resetFakeBehaviour();
  document.body.replaceChildren();
});

describe("player.announce", () => {
  it("speaks through a polite live region that lasts as long as the mount", () => {
    const player = createPlayer();
    const root = document.body.appendChild(document.createElement("div"));
    const unmount = player.mount(root);
    const region = regionIn(root);
    expect(region?.getAttribute("aria-live")).toBe("polite");
    expect(region?.getAttribute("aria-atomic")).toBe("true");

    player.announce("Buffering");
    expect(region?.textContent).toBe("Buffering");

    unmount();
    expect(regionIn(root)).toBeNull();
    expect(() => player.announce("Too late")).not.toThrow();
  });

  it("changes the text for a repeat, which would otherwise go unspoken", () => {
    const player = createPlayer();
    const root = document.body.appendChild(document.createElement("div"));
    const unmount = player.mount(root);
    const region = regionIn(root);

    player.announce("Skip ad");
    const first = region?.textContent;
    player.announce("Skip ad");
    const second = region?.textContent;
    player.announce("Skip ad");

    expect(second).not.toBe(first);
    expect(second?.trim()).toBe("Skip ad");
    expect(region?.textContent).toBe(first);
    unmount();
  });

  it("does nothing before the player mounts", () => {
    expect(() => createPlayer().announce("Early")).not.toThrow();
  });
});

describe("the player's name", () => {
  it("defaults to a group named for what it is", async () => {
    render(<Root />);
    await settle();
    expect(screen.getByRole("group", { name: "Video player" })).toBeTruthy();
  });

  it("gives way to the integrator's label", async () => {
    render(<Root aria-label="Trailer" />);
    await settle();
    expect(screen.getByRole("group", { name: "Trailer" })).toBeTruthy();
  });

  it("follows the language", async () => {
    const player = createPlayer({ plugins: [i18n({ locale: "fr", strings: { player: "Lecteur" } })] });
    render(<Root player={player} />);
    await settle();
    expect(screen.getByRole("group", { name: "Lecteur" })).toBeTruthy();
  });

  it("uses a VideoPlayer's title when it has one", async () => {
    render(<VideoPlayer title="The long coast" />);
    await settle();
    expect(screen.getByRole("group", { name: "The long coast" })).toBeTruthy();
  });
});

describe("menu names", () => {
  it("names the menu after its button, and the back row after both directions", async () => {
    render(
      <Root>
        <Menu>
          <MenuTrigger aria-label="Settings" />
          <MenuContent>
            <MenuSub title="Speed">
              <MenuItem>Normal</MenuItem>
            </MenuSub>
          </MenuContent>
        </Menu>
      </Root>
    );
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await settle();
    expect(screen.getByRole("menu", { name: "Settings" })).toBeTruthy();

    fireEvent.click(screen.getByRole("menuitem", { name: /Speed/ }));
    await settle();
    expect(screen.getByRole("menuitem", { name: "Back: Speed" })).toBeTruthy();
  });
});

describe("where focus goes", () => {
  it("leaves the video out of the tab order, unless asked", () => {
    const player = createPlayer({ src: "/video.mp4" });
    const { container, rerender } = render(
      <Root player={player}>
        <Media />
      </Root>
    );
    expect(container.querySelector("video")?.getAttribute("tabindex")).toBe("-1");
    rerender(
      <Root player={player}>
        <Media tabIndex={0} />
      </Root>
    );
    expect(container.querySelector("video")?.getAttribute("tabindex")).toBe("0");
  });

  function Sheet({ extra = true }: { extra?: boolean }) {
    const [open, setOpen] = useState(false);
    return (
      <div data-part="root">
        {extra ? <button onClick={() => setOpen(true)}>Opener</button> : null}
        <button data-part="fallback" onClick={() => setOpen(true)}>
          Fallback
        </button>
        <Panel open={open} onClose={() => setOpen(false)} closeLabel="Close" trigger="fallback">
          <button data-autofocus="">Inside</button>
        </Panel>
      </div>
    );
  }

  it("returns from a panel to where it was", async () => {
    render(<Sheet />);
    const opener = screen.getByRole("button", { name: "Opener" });
    opener.focus();
    fireEvent.click(opener);
    await settle();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Inside" }));

    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it("falls back to the panel's trigger when focus was nowhere", async () => {
    render(<Sheet />);
    fireEvent.click(screen.getByRole("button", { name: "Opener" }));
    await settle();
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    await settle();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fallback" }));
  });

  it("moves between the play buttons as they take turns being hidden", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    render(
      <Root player={player}>
        <Media />
        <PlayOverlay data-testid="overlay" />
        <PlayPause data-testid="transport" />
      </Root>
    );
    await settle();
    const overlay = screen.getByTestId("overlay");
    overlay.focus();

    await act(() => player.commands.play());
    await settle();
    expect(document.activeElement).toBe(screen.getByTestId("transport"));

    act(() => advance(player.video() as HTMLVideoElement, 120));
    await settle();
    expect(player.getState().media.ended).toBe(true);
    expect(document.activeElement).toBe(overlay);
  });

  it("leaves focus alone when it's elsewhere on the page", async () => {
    const player = createPlayer({ src: "/video.mp4" });
    render(
      <>
        <button>Outside</button>
        <Root player={player}>
          <Media />
          <PlayOverlay />
          <PlayPause />
        </Root>
      </>
    );
    await settle();
    const outside = screen.getByRole("button", { name: "Outside" });
    outside.focus();
    await act(() => player.commands.play());
    await settle();
    expect(document.activeElement).toBe(outside);
  });
});

describe("announcements", () => {
  const items = [
    { src: "/one.mp4", title: "One" },
    { src: "/two.mp4", title: "Two" },
  ];

  it("offers the next item once, not with every second of its countdown", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const player = createPlayer({ plugins: [playlist({ items, countdown: 5 })] });
    const announce = vi.spyOn(player, "announce");
    render(
      <Root player={player}>
        <Media />
        <UpNext />
      </Root>
    );
    await settle();
    await act(() => player.commands.play());
    act(() => advance(player.video() as HTMLVideoElement, 120));
    await settle();
    expect(screen.getByRole("group", { name: "Up next" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    await settle();
    const calls = announce.mock.calls.filter(([message]) => message === "Up next: Two");
    // React's strict effects don't run here, so each mount is one call.
    expect(calls).toHaveLength(1);
  });

  it("gives focus back and stays quiet on the way out of a skip button", async () => {
    const player = createPlayer({
      src: "/video.mp4",
      plugins: [skip({ segments: [{ start: 5, end: 20, kind: "intro" }] })],
    });
    const announce = vi.spyOn(player, "announce");
    render(
      <Root player={player}>
        <Media />
        <PlayPause data-testid="transport" />
        <SkipButton />
      </Root>
    );
    await settle();
    await act(() => player.commands.play());
    const video = player.video() as HTMLVideoElement;
    const to = async (time: number) => {
      act(() => {
        advance(video, time - video.currentTime);
        player.clock.sync();
      });
      await settle();
    };
    await to(6);
    expect(announce).toHaveBeenCalledWith("Skip Intro");

    screen.getByRole("button", { name: "Skip Intro" }).focus();
    announce.mockClear();
    await to(25);
    expect(document.activeElement).toBe(screen.getByTestId("transport"));
    expect(announce).not.toHaveBeenCalled();
  });

  it("offers the sound once a muted autoplay falls back, and hands focus on after", async () => {
    fakeBehaviour.rejectPlayWith = "NotAllowedError";
    const original = HTMLMediaElement.prototype.play;
    // This browser allows playback only while muted.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
      fakeBehaviour.rejectPlayWith = this.muted ? null : "NotAllowedError";
      return original.call(this);
    });
    const player = createPlayer({ src: "/video.mp4", plugins: [autoplay()] });
    const announce = vi.spyOn(player, "announce");
    render(
      <Root player={player}>
        <Media />
        <PlayPause data-testid="transport" />
        <UnmuteChip />
      </Root>
    );
    await settle();
    await settle();
    expect(announce).toHaveBeenCalledWith("Tap to unmute");

    const chip = screen.getByRole("button", { name: "Tap to unmute" });
    chip.focus();
    fireEvent.click(chip);
    await settle();
    expect(document.activeElement).toBe(screen.getByTestId("transport"));
  });

  describe("buffering", () => {
    const stalled = async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
      const player = createPlayer({ src: "/video.mp4" });
      const announce = vi.spyOn(player, "announce");
      render(
        <Root player={player}>
          <Media />
          <BufferingIndicator />
        </Root>
      );
      await settle();
      await act(() => player.commands.play());
      fireEvent.waiting(player.video() as HTMLVideoElement);
      await settle();
      return { player, announce };
    };

    it("says so when a stall lasts", async () => {
      const { announce } = await stalled();
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(announce).toHaveBeenCalledWith("Buffering");
    });

    it("stays quiet when a stall is short", async () => {
      const { player, announce } = await stalled();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      fireEvent.playing(player.video() as HTMLVideoElement);
      await settle();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(announce).not.toHaveBeenCalledWith("Buffering");
    });
  });
});
