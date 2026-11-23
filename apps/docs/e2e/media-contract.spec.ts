import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";
import { expect, test } from "./test";

// The scenarios the fake media element also runs in unit tests. Passing here, in
// every browser, is what makes the fake a fair stand-in.
const CONTRACT = fileURLToPath(
  new URL(
    "../../../packages/core/test/contract/media-element.contract.js",
    import.meta.url
  )
);

type Scenario = (
  media: HTMLVideoElement,
  options: { src: string; broken: string }
) => Promise<void>;

declare global {
  var __mediaContract: Record<string, Scenario>;
}

function scenarioNames() {
  const sandbox = createContext({}) as { __mediaContract?: object };
  runInContext(readFileSync(CONTRACT, "utf8"), sandbox);
  return Object.keys(sandbox.__mediaContract ?? {});
}

for (const name of scenarioNames()) {
  test(`real <video>: ${name}`, async ({ page }) => {
    test.slow();
    await page.goto("/examples/basic");
    await page.addScriptTag({ path: CONTRACT });

    const failure = await page.evaluate(async (scenario) => {
      const media = document.createElement("video");
      media.muted = true;
      media.playsInline = true;
      document.body.append(media);
      const h264 = media.canPlayType('video/mp4; codecs="avc1.42E01E"') !== "";
      try {
        await globalThis.__mediaContract[scenario]?.(media, {
          src: h264 ? "/media/sample-360.mp4" : "/media/sample-360.webm",
          broken: "/media/broken.mp4",
        });
        return null;
      } catch (error) {
        return String(error);
      } finally {
        media.pause();
        media.remove();
      }
    }, name);

    expect(failure).toBeNull();
  });
}
