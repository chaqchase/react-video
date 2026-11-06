"use client";

import { definePlugin } from "../../core/plugin";
import { createNotice } from "../../lib/notice";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { MenuItem } from "../../react/primitives/menu-item";

export interface ScreenshotOptions {
  /** Names a saved file, given the position of the frame in seconds. */
  filename?(time: number): string;
}

export type ScreenshotError = "unavailable" | "tainted";

const pad = (value: number) => String(Math.floor(value)).padStart(2, "0");

const defaultName = (time: number) =>
  `frame-${pad(time / 3600)}-${pad((time / 60) % 60)}-${pad(time % 60)}.png`;

/** Saves the current frame as a PNG. */
export const screenshot = definePlugin("screenshot", (options: ScreenshotOptions = {}) => {
  let stopNotice = () => {};
  return {
    state: () => ({
      /** Why the last attempt failed, or null. `tainted` means the browser refused to read the video. */
      error: null as ScreenshotError | null,
      /** The message on show, or null. */
      notice: null as "saved" | "failed" | null,
      /** True until that message starts to fade. */
      noticeVisible: false,
    }),
    commands(context) {
      const notice = createNotice<"saved" | "failed">((state) => context.set(state));
      stopNotice = notice.stop;
      const capture = async (): Promise<Blob | null> => {
        const video = context.video();
        const fail = (error: ScreenshotError) => {
          context.set({ error });
          return null;
        };
        if (!video || video.readyState < 2 || !video.videoWidth) return fail("unavailable");
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const drawing = canvas.getContext("2d");
        if (!drawing) return fail("unavailable");
        try {
          drawing.drawImage(video, 0, 0);
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
          if (!blob) return fail("unavailable");
          context.set({ error: null });
          return blob;
        } catch (error) {
          return fail((error as Error).name === "SecurityError" ? "tainted" : "unavailable");
        }
      };
      return {
        /** The current frame as a PNG, or null with `error` set when it can't be read. Never rejects. */
        capture,
        /** Saves the current frame, shows the viewer the outcome, and returns whether it worked. */
        async download() {
          const blob = await capture();
          if (!blob) {
            notice.show("failed");
            return false;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = (options.filename ?? defaultName)(context.clock.time());
          link.click();
          URL.revokeObjectURL(url);
          notice.show("saved");
          return true;
        },
      };
    },
    setup(_context, scope) {
      scope.add(() => stopNotice());
    },
    source(context) {
      context.set({ error: null });
    },
    slots: { overlay: ScreenshotNotice, menu: ScreenshotMenu },
  };
});

/** The row that saves the frame. */
export function ScreenshotMenu() {
  const { download } = useCommands(screenshot);
  const title = useLabel("screenshot", "Save frame");
  return (
    <MenuItem data-menu="screenshot" onSelect={() => void download()}>
      <span data-part="menu-item-label">{title}</span>
    </MenuItem>
  );
}
ScreenshotMenu.displayName = "Video.ScreenshotMenu";

/** Says whether the frame was saved, also announced to screen readers. */
export function ScreenshotNotice() {
  const notice = useVideoState(screenshot, (state) => state.notice);
  const visible = useVideoState(screenshot, (state) => state.noticeVisible);
  const saved = useLabel("screenshotSaved", "Frame saved");
  const failed = useLabel("screenshotFailed", "This video can't be saved as an image");
  return (
    <div data-part="toast" role="status" data-visible={visible ? "" : undefined}>
      {notice === null ? null : notice === "saved" ? saved : failed}
    </div>
  );
}
ScreenshotNotice.displayName = "Video.ScreenshotNotice";
