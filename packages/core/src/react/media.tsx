"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type VideoHTMLAttributes,
} from "react";
import { usePlayer } from "./context";

export type MediaProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "src" | "controls"
>;

/**
 * The media element. The active provider owns its source, so this renders no
 * `src` or `<source>` children. Pass `<track>` elements as children.
 */
export const Media = forwardRef<HTMLVideoElement, MediaProps>(function Media(
  { playsInline = true, preload = "metadata", children, ...props },
  forwarded
) {
  const player = usePlayer();
  const element = useRef<HTMLVideoElement>(null);

  useImperativeHandle(forwarded, () => element.current as HTMLVideoElement);

  useEffect(() => {
    const node = element.current;
    return node ? player.attach(node) : undefined;
  }, [player]);

  return (
    <video
      ref={element}
      data-part="media"
      playsInline={playsInline}
      preload={preload}
      {...props}
    >
      {children}
    </video>
  );
});
Media.displayName = "Video.Media";
