import { render, screen } from "@testing-library/react";
import { version } from "react";
import { describe, expect, it } from "vitest";
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
});
