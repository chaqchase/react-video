import { afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { installFakeMedia, resetFakeBehaviour } from "./fake-media";

beforeAll(() => {
  // SSR tests run in Node, with no DOM to patch.
  if (typeof window !== "undefined") {
    installFakeMedia(window.HTMLMediaElement.prototype);
  }
});

afterEach(() => {
  cleanup();
  resetFakeBehaviour();
});
