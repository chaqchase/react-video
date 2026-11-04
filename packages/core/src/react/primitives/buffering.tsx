"use client";

import { forwardRef, useEffect, useRef, type HTMLAttributes } from "react";
import type { MediaState } from "../../core/types";
import { usePlayer } from "../context";
import { mergeRefs } from "./as-child";

/** Short stalls resolve on their own, so a spinner would only add flicker. */
const SHOW_DELAY_MS = 400;
/** Once shown, it stays long enough to read as deliberate. */
const MIN_VISIBLE_MS = 300;

const isBuffering = ({ status, paused, waiting, seeking, scrubbing }: MediaState) =>
  status !== "error" &&
  (waiting || (status === "loading" && !paused) || (seeking && !scrubbing));

export type BufferingIndicatorProps = HTMLAttributes<HTMLDivElement>;

/** Sets `data-visible` while stalled. It writes to the DOM directly, with no renders. */
export const BufferingIndicator = forwardRef<HTMLDivElement, BufferingIndicatorProps>(
  function BufferingIndicator(props, ref) {
    const player = usePlayer();
    const element = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const node = element.current;
      if (!node) return;
      let wanted = false;
      let shownAt = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const show = (visible: boolean) => {
        node.toggleAttribute("data-visible", visible);
        if (visible) shownAt = performance.now();
      };
      const update = () => {
        const next = isBuffering(player.getState().media);
        if (next === wanted) return;
        wanted = next;
        clearTimeout(timer);
        const visible = node.hasAttribute("data-visible");
        if (next && !visible) {
          timer = setTimeout(() => show(true), SHOW_DELAY_MS);
        } else if (!next && visible) {
          const left = MIN_VISIBLE_MS - (performance.now() - shownAt);
          timer = setTimeout(() => show(false), Math.max(left, 0));
        }
      };

      const unsubscribe = player.subscribe(update);
      update();
      return () => {
        unsubscribe();
        clearTimeout(timer);
      };
    }, [player]);

    return (
      <div
        ref={mergeRefs(element, ref)}
        data-part="buffering"
        aria-hidden="true"
        {...props}
      />
    );
  }
);
BufferingIndicator.displayName = "Video.BufferingIndicator";
