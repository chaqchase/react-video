import { render, screen, waitFor } from "@testing-library/react";
import { version } from "react";
import { describe, expect, it } from "vitest";
import { createPlayer } from "../../src/core/player";
import { Media } from "../../src/react/media";
import { Root } from "../../src/react/root";

describe("Root", () => {
  it("runs on the requested React major", () => {
    expect(version.split(".")[0]).toBe(process.env.REACT_VERSION ?? "19");
  });

  it(`renders its children on React ${version}`, () => {
    render(
      <Root>
        <span>child</span>
      </Root>
    );
    expect(screen.getByText("child").parentElement).toHaveProperty(
      "dataset.part",
      "root"
    );
  });

  it("loads the src it's given, even with a player from outside", async () => {
    const player = createPlayer({});
    const { container } = render(
      <Root player={player} src="/given.mp4">
        <Media />
      </Root>
    );
    await waitFor(() => expect(container.querySelector("video")?.src).toContain("/given.mp4"));
  });

  it("leaves an outside player's own source alone without a src", async () => {
    const player = createPlayer({ src: "/own.mp4" });
    const { container } = render(
      <Root player={player}>
        <Media />
      </Root>
    );
    await waitFor(() => expect(container.querySelector("video")?.src).toContain("/own.mp4"));
  });
});
