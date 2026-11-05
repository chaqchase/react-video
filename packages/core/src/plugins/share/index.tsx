"use client";

import { forwardRef } from "react";
import { definePlugin } from "../../core/plugin";
import { createNotice } from "../../lib/notice";
import { useCommands, useLabel, useVideoState } from "../../react/hooks";
import { Button, type ButtonProps } from "../../react/primitives/button";

export interface ShareOptions {
  /** The query parameter that holds the time. */
  param?: string;
  /** The page to link to, instead of the current one. */
  url?: string;
}

/** Reads `90`, `1:30`, or `1m30s` as seconds, or null when it's none of those. */
export function parseShareTime(value: string): number | null {
  if (/^\d+(\.\d+)?$/.test(value)) return Number(value);
  if (/^\d+(:\d{1,2}){1,2}$/.test(value)) {
    return value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  }
  const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!units || !value) return null;
  return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
}

/** Links to a moment in the video: it opens links at their time, and makes new ones. */
export const share = definePlugin("share", (options: ShareOptions = {}) => {
  const { param = "t", url } = options;
  let stopNotice = () => {};
  return {
    after: ["persistence"],
    state: () => ({
      /** The message on show, or null. */
      notice: null as "copied" | "failed" | null,
      /** True until that message starts to fade. */
      noticeVisible: false,
    }),
    commands(context) {
      const notice = createNotice<"copied" | "failed">((state) => context.set(state));
      stopNotice = notice.stop;
      const link = (time = context.clock.time()) => {
        const target = new URL(url ?? window.location.href, window.location.href);
        const whole = Math.floor(time);
        // A live stream has no fixed moments, and the start needs no time at all.
        if (whole > 0 && !context.media().live) target.searchParams.set(param, String(whole));
        else target.searchParams.delete(param);
        return target.href;
      };
      return {
        /** The link to a moment, by default the current one. */
        link,
        /** Opens the system's share sheet on touch devices, and otherwise copies the link. */
        async share(): Promise<"shared" | "copied" | "failed"> {
          const href = link();
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
            try {
              await navigator.share({ url: href });
              return "shared";
            } catch (error) {
              // Dismissing the sheet isn't a failure, so it leaves nothing to report.
              if ((error as Error).name === "AbortError") return "shared";
            }
          }
          try {
            await navigator.clipboard.writeText(href);
            notice.show("copied");
            return "copied";
          } catch {
            notice.show("failed");
            return "failed";
          }
        },
      };
    },
    setup(context, scope) {
      scope.add(() => stopNotice());
      const value = new URLSearchParams(window.location.search).get(param);
      const time = value === null ? null : parseShareTime(value);
      if (time === null) return;
      let done = false;
      const apply = (duration: number) => {
        if (done || !(duration > 0)) return;
        done = true;
        // A link can outlive a longer cut of the video, and shouldn't open on its last frame.
        if (time < duration) context.commands.seek(time);
      };
      context.watch(scope, (media) => media.duration, apply);
      apply(context.media().duration);
    },
    slots: { "controls-end": ShareButton, overlay: ShareNotice },
  };
});

export type ShareButtonProps = ButtonProps;

/** Shares a link to the current moment. */
export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(function ShareButton(
  { onClick, children, ...props },
  ref
) {
  const { share: run } = useCommands(share);
  const label = useLabel("share", "Share");
  return (
    <Button
      ref={ref}
      data-part="share"
      aria-label={label}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) void run();
      }}
      {...props}
    >
      {children ?? (
        <svg
          viewBox="0 0 24 24"
          width="1em"
          height="1em"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 14.500V3M7.800 6.800 12 2.800l4.200 4" />
          <path d="M8 10.500H6.800a2.300 2.300 0 0 0-2.300 2.300v6.400c0 1.300 1 2.300 2.300 2.300h10.400c1.300 0 2.300-1 2.300-2.300v-6.400c0-1.300-1-2.300-2.300-2.300H16" />
        </svg>
      )}
    </Button>
  );
});
ShareButton.displayName = "Video.ShareButton";

/** Says whether the link was copied, also announced to screen readers. */
export function ShareNotice() {
  const notice = useVideoState(share, (state) => state.notice);
  const visible = useVideoState(share, (state) => state.noticeVisible);
  const copied = useLabel("linkCopied", "Link copied");
  const failed = useLabel("linkFailed", "Couldn't copy the link");
  return (
    <div data-part="toast" role="status" data-visible={visible ? "" : undefined}>
      {notice === null ? null : notice === "copied" ? copied : failed}
    </div>
  );
}
ShareNotice.displayName = "Video.ShareNotice";
