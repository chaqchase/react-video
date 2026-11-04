import type { HlsConfig } from "hls.js";
import type Hls from "hls.js";
import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";

const HLS_TYPES = new Set(["application/vnd.apple.mpegurl", "application/x-mpegurl"]);

export interface HlsOptions {
  /** Passed to hls.js. */
  config?: Partial<HlsConfig>;
  /**
   * Use hls.js on Apple devices too. Their native HLS is more efficient and works
   * with AirPlay, but it can't offer a choice of quality.
   */
  preferEngine?: boolean;
  /** Where to get hls.js from. Defaults to importing the `hls.js` package. */
  library?: () => Promise<{ default: typeof Hls }>;
}

const isHls = ({ src, type }: SourceObject) =>
  type ? HLS_TYPES.has(type.toLowerCase()) : (src.split(/[?#]/)[0] ?? "").endsWith(".m3u8");

const hasMediaSource = () =>
  typeof MediaSource !== "undefined" || "ManagedMediaSource" in globalThis;

// Chrome now reports native HLS too, but only Apple's is worth preferring.
const isApple = () => typeof navigator !== "undefined" && navigator.vendor?.startsWith("Apple");

/** Plays HLS through hls.js, which loads only when an HLS source does. */
export const hls = definePlugin("hls", (options: HlsOptions = {}) => ({
  setup(context) {
    context.registerProvider({
      name: "hls",
      canPlay(source, { element }) {
        if (!isHls(source)) return false;
        const native = Boolean(element?.canPlayType("application/vnd.apple.mpegurl"));
        if (native && isApple() && !options.preferEngine) return false;
        return hasMediaSource();
      },
      async load() {
        const [{ createHlsProvider }, library] = await Promise.all([
          import("./provider"),
          options.library?.() ?? import("hls.js"),
        ]);
        return createHlsProvider(library.default, options.config);
      },
    });
  },
}));
