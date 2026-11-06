import type { MediaPlayerSettingClass } from "dashjs";
import { VideoKitError } from "../../core/kit-error";
import { definePlugin } from "../../core/plugin";
import type { SourceObject } from "../../core/types";
import type { DashLibrary } from "./provider";

export interface DashOptions {
  /** Passed to dash.js. */
  settings?: MediaPlayerSettingClass;
  /** Where to get dash.js from. Defaults to importing the `dashjs` package. */
  library?: () => Promise<DashLibrary>;
}

const isDash = ({ src, type }: SourceObject) =>
  type ? type.toLowerCase() === "application/dash+xml" : (src.split(/[?#]/)[0] ?? "").endsWith(".mpd");

const hasMediaSource = () =>
  typeof MediaSource !== "undefined" || "ManagedMediaSource" in globalThis;

/** Plays DASH through dash.js, which loads only when a DASH source does. */
export const dash = definePlugin("dash", (options: DashOptions = {}) => ({
  setup(context) {
    context.registerProvider({
      name: "dash",
      canPlay: (source) => isDash(source) && hasMediaSource(),
      async load() {
        try {
          const [{ createDashProvider }, library] = await Promise.all([
            import("./provider"),
            options.library?.() ?? import("dashjs"),
          ]);
          return createDashProvider(library, options.settings);
        } catch (cause) {
          throw new VideoKitError(
            "dash-engine-load",
            `dash.js didn't load. Check that it's installed, or the library option. ${String(cause)}`,
            { retryable: true, cause }
          );
        }
      },
    });
  },
}));
